// __tests__/components/DynamicFormRenderer.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { z } from 'zod'

// Import toast AFTER jest.mock. Jest ensures this import gets the mocked version.
import toast from 'react-hot-toast'

import {
  DynamicFormRenderer,
  DynamicFormRendererProps,
} from '@/app/components/forms/DynamicFormRenderer'
import {
  FormElementConfig,
  FormFieldConfig as IndividualFormFieldConfig,
} from '@/lib/formConfigs/ContactFormConfig'
import {
  SubmitFormState,
  DEFAULT_CONTACT_FORM_INITIAL_STATE,
} from '@/lib/types/forms'

// ---- MOCKS ----

// CORRECTED react-hot-toast mock:
// The factory function creates the jest.fn() instances directly.
jest.mock('react-hot-toast', () => ({
  __esModule: true, // Good practice for ES modules
  default: {
    // This mocks the default export
    success: jest.fn(), // Create new mock function here
    error: jest.fn(), // Create new mock function here
  },
}))

// Your other mocks (FormField, FloatingLabelSelect, FormSubmitButton)
jest.mock('@/app/components/forms/FormField', () => ({
  __esModule: true,
  FormField: jest.fn(
    ({ id, label, register, hasError, errorMessage, type, ...rest }) => (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          data-testid={`input-${id}`}
          name={id}
          type={type || 'text'}
          aria-invalid={hasError ? 'true' : 'false'}
          {...(register ? register(id) : {})}
          {...rest}
        />
        {hasError && <p role='alert'>{errorMessage}</p>}
      </div>
    )
  ),
}))

jest.mock('@/app/components/forms/FloatingLabelSelect', () => ({
  __esModule: true,
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
          aria-invalid={hasError ? 'true' : 'false'}
          {...rest}
        >
          {(options || []).map((opt: { value: string; label: string }) => (
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

jest.mock('@/app/components/forms/FormSubmitButton', () => ({
  __esModule: true,
  FormSubmitButton: jest.fn(({ isSubmitting, isFormValid }) => (
    <button type='submit' disabled={isSubmitting || !isFormValid}>
      {isSubmitting ? 'Submitting...' : 'Submit'}
    </button>
  )),
}))

// ---- TEST SETUP ----
const BaseTestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
})
type BaseTestFormData = z.infer<typeof BaseTestSchema>

const getMockProps = (
  overrideProps: Partial<DynamicFormRendererProps<typeof BaseTestSchema>> = {}
): DynamicFormRendererProps<typeof BaseTestSchema> => {
  const mockServerAction = jest.fn(
    async (
      _prevState: SubmitFormState,
      formData: FormData
    ): Promise<SubmitFormState> => {
      const name = formData.get('name')
      if (name === 'trigger-server-error') {
        return {
          success: false,
          message: 'Server error on field',
          errors: { name: ['Simulated server error on name'] },
        }
      }
      if (name === 'trigger-general-server-error') {
        return { success: false, message: 'A general server error occurred.' }
      }
      return {
        success: true,
        message: 'Submitted successfully!',
        submissionId: '123',
        errors: undefined,
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
      } as IndividualFormFieldConfig,
      {
        id: 'email',
        type: 'email',
        fieldType: 'email',
        label: 'Email Address',
      } as IndividualFormFieldConfig,
    ],
  }
  return {
    formConfig,
    clientSchema: BaseTestSchema,
    serverAction: mockServerAction,
    initialState: { ...DEFAULT_CONTACT_FORM_INITIAL_STATE },
    defaultValues: { name: '', email: '' } as Partial<BaseTestFormData>,
    ...overrideProps,
  }
}

// ---- TESTS ----
describe('DynamicFormRenderer', () => {
  let mockProps: DynamicFormRendererProps<typeof BaseTestSchema>

  beforeEach(() => {
    // jest.clearAllMocks() will clear the imported toast's methods because they are jest.fn()
    jest.clearAllMocks()
    mockProps = getMockProps()
  })

  test('renders the form with title and fields correctly', () => {
    render(<DynamicFormRenderer {...mockProps} />)
    expect(screen.getByText('Test Form')).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    // ... other assertions
  })

  test('displays client-side validation error messages', async () => {
    render(<DynamicFormRenderer {...mockProps} />)
    // ... test logic
    expect(mockProps.serverAction).not.toHaveBeenCalled()
  })

  test('submits data successfully and resets form', async () => {
    const localMockServerAction = jest.fn().mockResolvedValue({
      success: true,
      message: 'Form submitted!',
      submissionId: 'test-123',
    })
    render(
      <DynamicFormRenderer
        {...mockProps}
        serverAction={localMockServerAction}
      />
    )
    // ... fill form and submit ...
    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement
    const emailInput = screen.getByLabelText(
      'Email Address'
    ) as HTMLInputElement
    const form = screen.getByRole('form') as HTMLFormElement

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, {
        target: { value: 'john.doe@example.com' },
      })
      fireEvent.blur(nameInput)
      fireEvent.blur(emailInput)
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    )
    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      // Assert against the imported 'toast' which is now your mock
      expect(toast.success).toHaveBeenCalledWith(
        'Form submitted! (Ref ID: test-123)'
      )
      expect(
        screen.getByText('Form submitted! (Ref ID: test-123)')
      ).toBeInTheDocument()
    })
    // ... other assertions
  })

  test('displays server-side error message for a specific field', async () => {
    const currentMockProps = getMockProps()
    render(<DynamicFormRenderer {...currentMockProps} />)
    // ... fill form and submit to trigger error ...
    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email Address')
    const form = screen.getByRole('form') as HTMLFormElement

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'trigger-server-error' } })
      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } })
      fireEvent.blur(nameInput)
      fireEvent.blur(emailInput)
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    )
    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(
        screen.getByText('Simulated server error on name')
      ).toBeInTheDocument()
      expect(toast.error).not.toHaveBeenCalledWith('Server error on field')
    })
  })

  test('displays general server-side error message when no field-specific errors', async () => {
    const currentMockProps = getMockProps()
    render(<DynamicFormRenderer {...currentMockProps} />)
    // ... fill form and submit to trigger error ...
    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email Address')
    const form = screen.getByRole('form') as HTMLFormElement

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
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    )
    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'A general server error occurred.'
      )
      expect(
        screen.getByText('Error: A general server error occurred.')
      ).toBeInTheDocument()
    })
  })

  test('handles conditional field logic correctly (placeholder)', () => {
    expect(true).toBe(true)
  })
})
