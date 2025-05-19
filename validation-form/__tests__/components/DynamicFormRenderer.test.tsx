import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

import { z } from 'zod'

import { DynamicFormRenderer } from '@/app/components/forms/DynamicFormRenderer'
import type { DynamicFormRendererProps } from '@/app/components/forms/DynamicFormRenderer'
import { contactFormConfiguration } from '@/lib/formConfigs/ContactFormConfig'
import { refinedFormSchema } from '@/lib/schemas'
import {
  DEFAULT_CONTACT_FORM_INITIAL_STATE,
  SubmitFormState,
} from '@/app/actions'

// --- Mock react-hot-toast ---
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))
import toast from 'react-hot-toast'

// --- Mock Child Components ---
jest.mock('@/app/components/forms/FormField', () => ({
  FormField: jest.fn((props) => {
    const {
      id,
      label,
      register,
      hasError,
      errorMessage,
      type,
      inputClassName,
      readOnly,
      onClick,
      ...rest
    } = props
    // UNCOMMENT FOR DEBUGGING 'name-error'
    if (id === 'name' || id === 'email') {
      // Log for relevant fields
      console.log(`FormField (id: ${id}) received props:`, {
        hasError,
        errorMessage,
        label,
      })
    }
    return (
      <div data-testid={`formfield-${id}`}>
        <label htmlFor={id}>{label}</label>
        {type === 'textarea' ? (
          <textarea
            data-testid={id}
            id={id}
            {...(register ? register(id) : { name: id })}
            aria-invalid={hasError}
            className={inputClassName}
            readOnly={readOnly}
            onClick={onClick}
            placeholder=' '
            {...rest}
          />
        ) : (
          <input
            data-testid={id}
            id={id}
            type={type || 'text'}
            {...(register ? register(id) : { name: id })}
            aria-invalid={hasError}
            className={inputClassName}
            readOnly={readOnly}
            onClick={onClick}
            placeholder=' '
            {...rest}
          />
        )}
        {hasError && errorMessage && (
          <span data-testid={`${id}-error`}>{errorMessage}</span>
        )}
      </div>
    )
  }),
}))
jest.mock('@/app/components/forms/FloatingLabelSelect', () => ({
  FloatingLabelSelect: jest.fn(
    ({
      id,
      label,
      options,
      onChange,
      onBlur,
      value,
      hasError,
      errorMessage,
      placeholder,
    }) => (
      <div data-testid={`select-${id}`}>
        <label htmlFor={`select-input-${id}`}>{label}</label>
        <select
          data-testid={id}
          id={`select-input-${id}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={hasError}
        >
          <option value=''>{placeholder || 'Select...'}</option>
          {options.map((opt: { value: string; label: string }) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasError && errorMessage && (
          <span data-testid={`${id}-error`}>{errorMessage}</span>
        )}
      </div>
    )
  ),
}))
jest.mock('@/app/components/forms/FormSubmitButton', () => ({
  FormSubmitButton: jest.fn(
    ({ isSubmitting, isFormValid, buttonText, submittingText }) => (
      <button
        type='submit'
        disabled={isSubmitting || !isFormValid}
        data-testid='submit-button'
      >
        {isSubmitting
          ? submittingText || 'Submitting...'
          : buttonText || 'Submit'}
      </button>
    )
  ),
}))

import { FormField as MockedFormField } from '@/app/components/forms/FormField'

let mockServerActionState: SubmitFormState = {
  ...DEFAULT_CONTACT_FORM_INITIAL_STATE,
}
const mockServerAction = jest.fn(
  async (
    _prevState: SubmitFormState,
    _formData: FormData
  ): Promise<SubmitFormState> => mockServerActionState
)

describe('DynamicFormRenderer', () => {
  const getProps = (
    overrides: Partial<DynamicFormRendererProps<typeof refinedFormSchema>> = {}
  ) =>
    ({
      formConfig: contactFormConfiguration,
      clientSchema: refinedFormSchema,
      serverAction: mockServerAction,
      initialState: { ...DEFAULT_CONTACT_FORM_INITIAL_STATE },
      defaultValues: {},
      ...overrides,
    } as DynamicFormRendererProps<typeof refinedFormSchema>)

  beforeEach(() => {
    jest.clearAllMocks()
    mockServerActionState = { ...DEFAULT_CONTACT_FORM_INITIAL_STATE }
    jest
      .spyOn(React, 'useActionState')
      .mockImplementation(
        (
          action: (
            state: SubmitFormState,
            payload: FormData
          ) => Promise<SubmitFormState>,
          initialStateFromHook: SubmitFormState,
          _permalink?: string
        ) => {
          const [state, setState] = React.useState<SubmitFormState>(
            initialStateFromHook || DEFAULT_CONTACT_FORM_INITIAL_STATE
          )
          const dispatch = async (payload: FormData) => {
            const result = await action(state, payload)
            setState(result)
          }
          return [state, dispatch as any, false]
        }
      )
  })

  it('should render all form fields as per configuration', () => {
    render(<DynamicFormRenderer {...getProps()} />)
    expect(screen.getByText(contactFormConfiguration.name)).toBeInTheDocument()
    expect(screen.getByTestId('name')).toBeInTheDocument()
    // ... other getByTestId checks
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('should display client-side validation error for required field (e.g., name)', async () => {
    const { debug } = render(<DynamicFormRenderer {...getProps()} />)
    const nameInput = screen.getByTestId('name')

    fireEvent.focus(nameInput)
    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.blur(nameInput)

    await waitFor(() => {
      screen.debug(nameInput.parentElement, 30000)
      expect(screen.queryByTestId('name-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('name-error')).toHaveTextContent(
      'Name must be at least 2 characters.'
    )
  })

  describe('Conditional Postal Code Field', () => {
    it('should initially have postalCode read-only and show toast on click if country is not selected', async () => {
      render(<DynamicFormRenderer {...getProps()} />)
      const postalCodeInput = screen.getByTestId('postalCode')
      const initialPostalCodeFieldProps = MockedFormField.mock.calls.find(
        (call: any[]) => call[0].id === 'postalCode'
      )![0]
      expect(initialPostalCodeFieldProps.readOnly).toBe(true)
      expect(initialPostalCodeFieldProps.inputClassName).toContain(
        'cursor-not-allowed'
      )
      await act(async () => {
        fireEvent.click(postalCodeInput)
      })
      expect(toast.error).toHaveBeenCalledWith(
        'Please select your country first before entering a postal code.'
      )
    })
  })

  it('should call serverAction with FormData, show success toast, and reset form on valid submission', async () => {
    mockServerActionState = {
      message: 'Submission successful!',
      submissionId: 'mock-id-123',
      success: true,
    }
    render(<DynamicFormRenderer {...getProps()} />)
    // Fill form
    fireEvent.change(screen.getByTestId('name'), {
      target: { value: 'Valid User' },
    })
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'valid@example.com' },
    })
    fireEvent.change(screen.getByTestId('phone'), {
      target: { value: '+12345678900' },
    })
    fireEvent.change(screen.getByTestId('streetAddress'), {
      target: { value: '123 Valid St' },
    })
    fireEvent.change(screen.getByTestId('city'), {
      target: { value: 'Validville' },
    })
    fireEvent.change(screen.getByTestId('stateProvince'), {
      target: { value: 'VL' },
    })
    fireEvent.change(screen.getByTestId('country'), { target: { value: 'US' } })
    await waitFor(() => {})
    fireEvent.change(screen.getByTestId('postalCode'), {
      target: { value: '12345' },
    })

    await waitFor(() =>
      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    )

    // screen.debug(undefined, 300000); // DEBUG: Check if form is here
    const formElement = screen.getByRole('form') // This line might fail
    await act(async () => fireEvent.submit(formElement))

    await waitFor(() => expect(mockServerAction).toHaveBeenCalledTimes(1))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Submission successful! (Ref ID: mock-id-123)'
      )
      expect(
        screen.getByText('Submission successful! (Ref ID: mock-id-123)')
      ).toBeInTheDocument()
      expect(screen.getByTestId('name')).toHaveValue('')
    })
  })

  it('should display server-side general error message from action', async () => {
    mockServerActionState = {
      message: 'A general server error occurred.',
      success: false,
    }
    render(<DynamicFormRenderer {...getProps()} />)
    // Fill form
    fireEvent.change(screen.getByTestId('name'), {
      target: { value: 'Error User' },
    })
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'error@example.com' },
    })
    fireEvent.change(screen.getByTestId('phone'), {
      target: { value: '12345678900' },
    })
    fireEvent.change(screen.getByTestId('streetAddress'), {
      target: { value: '123 Error St' },
    })
    fireEvent.change(screen.getByTestId('city'), {
      target: { value: 'Errorville' },
    })
    fireEvent.change(screen.getByTestId('stateProvince'), {
      target: { value: 'ER' },
    })
    fireEvent.change(screen.getByTestId('country'), { target: { value: 'CA' } })
    await waitFor(() => {})
    fireEvent.change(screen.getByTestId('postalCode'), {
      target: { value: 'K1A0B1' },
    })

    await waitFor(() =>
      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    )

    screen.debug(undefined, 300000) // DEBUG: Check if form is here
    const formElement = screen.getByRole('form') // This line might fail
    await act(async () => fireEvent.submit(formElement))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'A general server error occurred.'
      )
      expect(
        screen.getByText('Error: A general server error occurred.')
      ).toBeInTheDocument()
    })
  })

  it('should display server-side field-specific errors from action', async () => {
    mockServerActionState = {
      message: 'Validation failed on server.',
      errors: { email: ['This email is already taken on the server.'] },
      success: false,
    }
    render(<DynamicFormRenderer {...getProps()} />)
    // Fill form
    fireEvent.change(screen.getByTestId('name'), {
      target: { value: 'Server Error User' },
    })
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'exists@example.com' },
    })
    // ... (fill other fields)

    await waitFor(() =>
      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    )

    // DEBUG HERE if it fails on getByRole('form')
    screen.debug(undefined, 300000)
    const formElement = screen.getByRole('form') // This line is failing
    await act(async () => {
      fireEvent.submit(formElement)
    })

    await waitFor(() => {
      const emailFieldProps = MockedFormField.mock.calls.findLast(
        (call: any[]) => call[0].id === 'email'
      )![0]
      expect(emailFieldProps.hasError).toBe(true)
      // ... other assertions
    })
  })

  it('should clear lastSuccessMessage when form becomes dirty after a successful submission', async () => {
    mockServerActionState = {
      message: 'Initial Success!',
      submissionId: 'id-success',
      success: true,
    }
    render(<DynamicFormRenderer {...getProps()} />)
    // Fill form & submit
    fireEvent.change(screen.getByTestId('name'), {
      target: { value: 'Success User' },
    })
    // ... (fill other fields) ...
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'success@example.com' },
    })
    fireEvent.change(screen.getByTestId('phone'), {
      target: { value: '12345678900' },
    })
    fireEvent.change(screen.getByTestId('streetAddress'), {
      target: { value: '123 Success St' },
    })
    fireEvent.change(screen.getByTestId('city'), {
      target: { value: 'Successville' },
    })
    fireEvent.change(screen.getByTestId('stateProvince'), {
      target: { value: 'SC' },
    })
    fireEvent.change(screen.getByTestId('country'), { target: { value: 'US' } })
    await waitFor(() => {})
    fireEvent.change(screen.getByTestId('postalCode'), {
      target: { value: '12345' },
    })

    await waitFor(() =>
      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    )
    // ADD DEBUG HERE if it fails on getByRole('form')
    screen.debug(undefined, 300000)
    const formElement = screen.getByRole('form') // This line is failing
    await act(async () => {
      fireEvent.submit(formElement)
    })

    await waitFor(() =>
      expect(
        screen.getByText('Initial Success! (Ref ID: id-success)')
      ).toBeInTheDocument()
    )

    fireEvent.change(screen.getByTestId('name'), { target: { value: 'D' } })
    await waitFor(() =>
      expect(
        screen.queryByText('Initial Success! (Ref ID: id-success)')
      ).not.toBeInTheDocument()
    )
  })
})
