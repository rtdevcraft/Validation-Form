import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { z } from 'zod'
import {
  DynamicFormRenderer,
  DynamicFormRendererProps,
} from '@/app/components/forms/DynamicFormRenderer'

import {
  FormElementConfig,
  FormFieldConfig as IndividualFormFieldConfig,
} from '@/lib/formConfigs/ContactFormConfig'

// Mock child components and external libraries
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
}

jest.mock('react-hot-toast', () => mockToast)

// Mock FormField
jest.mock('@/app/components/forms/FormField', () => ({
  FormField: jest.fn(
    ({ id, label, register, hasError, errorMessage, type, ...rest }) => (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          data-testid={`input-${id}`}
          name={id}
          type={type || 'text'}
          aria-invalid={hasError}
          {...(register ? register(id) : {})} // Ensure register is called if provided
          {...rest}
        />
        {hasError && <p role='alert'>{errorMessage}</p>}
      </div>
    )
  ),
}))

// Mock FloatingLabelSelect
jest.mock('@/app/components/forms/FloatingLabelSelect', () => ({
  FloatingLabelSelect: jest.fn(
    ({
      id,
      label,
      options,
      value,
      onChange,
      onBlur,
      hasError,
      errorMessage,
      ...rest
    }) => (
      <div>
        <label htmlFor={id}>{label}</label>
        <select
          id={id}
          data-testid={`select-${id}`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={hasError}
          {...rest}
        >
          {options.map((opt: { value: string; label: string }) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasError && <p role='alert'>{errorMessage}</p>}
      </div>
    )
  ),
}))

// Mock FormSubmitButton
jest.mock('@/app/components/forms/FormSubmitButton', () => ({
  FormSubmitButton: jest.fn(({ isSubmitting, isFormValid }) => (
    <button type='submit' disabled={isSubmitting || !isFormValid}>
      {isSubmitting ? 'Submitting...' : 'Submit'}
    </button>
  )),
}))

// Define a basic SubmitFormState for testing purposes
interface SubmitFormState {
  message: string
  errors?: Record<string, string[]>
  success: boolean
  submissionId?: string
}

const mockInitialState: SubmitFormState = {
  message: '',
  success: false,
}

// Basic Zod schema for testing (name and email)
const BaseTestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
})

// type BaseTestFormData = z.infer<typeof BaseTestSchema>

// Props for the DynamicFormRenderer
const getMockProps = (
  overrideProps: Partial<DynamicFormRendererProps<typeof BaseTestSchema>> = {}
): DynamicFormRendererProps<typeof BaseTestSchema> => {
  const mockServerAction = jest.fn(
    async (
      prevState: SubmitFormState,
      formData: FormData
    ): Promise<SubmitFormState> => {
      const name = formData.get('name')
      if (name === 'trigger-server-error') {
        // Specific value to trigger server field error
        return {
          success: false,
          message: 'Server error occurred',
          errors: { name: ['Simulated server error on name'] },
        }
      }
      if (name === 'trigger-general-server-error') {
        // Specific value for general error
        return { success: false, message: 'A general server error occurred.' }
      }
      return {
        success: true,
        message: 'Submitted successfully!',
        submissionId: '123',
      }
    }
  )

  const formConfig: { name: string; fields: FormElementConfig[] } = {
    name: 'Test Form',
    fields: [
      {
        id: 'name',
        type: 'text',
        fieldType: 'text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        className: 'mb-4',
        componentProps: {},
      } as IndividualFormFieldConfig,
      {
        id: 'email',
        type: 'email',
        fieldType: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email',
        className: 'mb-4',
        componentProps: {},
      } as IndividualFormFieldConfig,
    ],
  }

  return {
    formConfig,
    clientSchema: BaseTestSchema,
    serverAction: mockServerAction,
    initialState: { ...mockInitialState },
    defaultValues: { name: '', email: '' },
    ...overrideProps,
  }
}

describe('DynamicFormRenderer', () => {
  let mockProps: DynamicFormRendererProps<typeof BaseTestSchema>

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    mockProps = getMockProps()
  })

  test('renders the form with title and fields correctly', () => {
    render(<DynamicFormRenderer {...mockProps} />)

    expect(screen.getByText('Test Form')).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByTestId('input-name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByTestId('input-email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  test('displays client-side validation error messages', async () => {
    render(<DynamicFormRenderer {...mockProps} />)

    // const nameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText(
      'Email Address'
    ) as HTMLInputElement

    await act(async () => {
      // Leave name empty to trigger "Name is required"
      // Provide an invalid email to trigger "Invalid email address"
      fireEvent.change(emailInput, { target: { value: 'notanemail' } })
      fireEvent.blur(emailInput) // Trigger RHF validation for email
      fireEvent.submit(screen.getByRole('form'))
    })

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      // With 'notanemail' as input, the error should be "Invalid email address"
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })

    expect(mockProps.serverAction).not.toHaveBeenCalled()
  })

  test('submits data successfully and resets form', async () => {
    const localMockServerAction = jest.fn().mockResolvedValue({
      // Use a local mock for this test
      success: true,
      message: 'Form submitted!',
      submissionId: 'test-123',
    })
    // Override serverAction for this specific test
    render(
      <DynamicFormRenderer
        {...mockProps}
        serverAction={localMockServerAction}
      />
    )

    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement
    const emailInput = screen.getByLabelText(
      'Email Address'
    ) as HTMLInputElement
    const form = screen.getByRole('form')

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, {
        target: { value: 'john.doe@example.com' },
      })
      fireEvent.blur(nameInput)
      fireEvent.blur(emailInput)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(localMockServerAction).toHaveBeenCalledTimes(1)
      const formData = localMockServerAction.mock.calls[0][1] as FormData
      expect(formData.get('name')).toBe('John Doe')
      expect(formData.get('email')).toBe('john.doe@example.com')
    })

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        'Form submitted! (Ref ID: test-123)'
      )
      // Check for inline success message
      expect(
        screen.getByText('Form submitted! (Ref ID: test-123)')
      ).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(nameInput.value).toBe('')
      expect(emailInput.value).toBe('')
    })
  })

  test('displays server-side error message for a specific field', async () => {
    // Use the name 'trigger-server-error' to activate the specific error in mockServerAction
    const propsForServerError = getMockProps() // Gets the default mockServerAction
    render(<DynamicFormRenderer {...propsForServerError} />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email Address')
    const form = screen.getByRole('form')

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'trigger-server-error' } })
      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } })
      fireEvent.blur(nameInput)
      fireEvent.blur(emailInput)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(propsForServerError.serverAction).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(
        screen.getByText('Simulated server error on name')
      ).toBeInTheDocument()

      expect(mockToast.error).not.toHaveBeenCalledWith('Server error occurred')
    })
  })

  test('displays general server-side error message when no field-specific errors', async () => {
    // Use the name 'trigger-general-server-error' for this test
    const propsForGeneralError = getMockProps()
    render(<DynamicFormRenderer {...propsForGeneralError} />)

    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email Address')
    const form = screen.getByRole('form')

    await act(async () => {
      fireEvent.change(nameInput, {
        target: { value: 'trigger-general-server-error' },
      })
      fireEvent.change(emailInput, {
        target: { value: 'another.valid@example.com' },
      })
      fireEvent.blur(nameInput)
      fireEvent.blur(emailInput)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(propsForGeneralError.serverAction).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      // Check for the general server-side error toast
      expect(mockToast.error).toHaveBeenCalledWith(
        'A general server error occurred.'
      )
      // Also check the inline error message block
      expect(
        screen.getByText('Error: A general server error occurred.')
      ).toBeInTheDocument()
    })
  })

  // Placeholder for future tests
  test('handles conditional field logic correctly (placeholder)', () => {
    expect(true).toBe(true)
  })
})
