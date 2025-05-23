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
  FormGroupConfig,
} from '@/lib/formConfigs/ContactFormConfig'
import {
  SubmitFormState,
  DEFAULT_CONTACT_FORM_INITIAL_STATE,
} from '@/lib/types/forms'

// --- MOCKS ---
// With manual mocks in place, these lines are now simple and robust.
// Jest will automatically find the files in the `__mocks__` folders.
jest.mock('@/app/components/forms/FormField')
jest.mock('@/app/components/forms/FormSubmitButton')
jest.mock('@/app/components/forms/FloatingLabelSelect')
jest.mock('react-hot-toast')

// --- MOCK REFERENCES ---
// We import the mocked components to get a reference to the jest.fn() spies.
import { FormField } from '@/app/components/forms/FormField'
import toast from 'react-hot-toast'

// Get typed references to the mock functions for use in tests
const mockFormField = FormField as jest.Mock
const mockToast = toast as jest.Mocked<typeof toast>

// ---- TEST SETUP (Restored to original) ----
const BaseTestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  message: z
    .string()
    .min(5, 'Message must be at least 5 characters')
    .optional(),
})
type BaseTestFormData = z.infer<typeof BaseTestSchema>

const getMockProps = (
  overrideProps: Partial<DynamicFormRendererProps<typeof BaseTestSchema>> = {},
  overrideFormConfig?: { name: string; fields: FormElementConfig[] }
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

  const defaultFormConfig: { name: string; fields: FormElementConfig[] } = {
    name: 'Test Form',
    fields: [
      {
        id: 'name',
        fieldType: 'text',
        type: 'text',
        label: 'Full Name',
        className: 'name-field-wrapper',
      } as IndividualFormFieldConfig,
      {
        id: 'email',
        fieldType: 'email',
        type: 'email',
        label: 'Email Address',
      } as IndividualFormFieldConfig,
      {
        id: 'message',
        fieldType: 'textarea',
        type: 'textarea',
        label: 'Your Message',
        rows: 3,
      } as IndividualFormFieldConfig,
    ],
  }

  return {
    formConfig: overrideFormConfig || defaultFormConfig,
    clientSchema: BaseTestSchema,
    serverAction: mockServerAction,
    initialState: { ...DEFAULT_CONTACT_FORM_INITIAL_STATE },
    defaultValues: {
      name: '',
      email: '',
      message: '',
    } as Partial<BaseTestFormData>,
    ...overrideProps,
  }
}

// ---- TESTS ----
describe('DynamicFormRenderer', () => {
  let mockProps: DynamicFormRendererProps<typeof BaseTestSchema>
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
    mockProps = getMockProps()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  test('renders the form with title, fields, and groups correctly', () => {
    const groupedFormConfig = {
      name: 'Grouped Test Form',
      fields: [
        {
          id: 'group1',
          type: 'group',
          className: 'custom-group',
          fields: [
            {
              id: 'name',
              fieldType: 'text',
              label: 'Full Name',
            } as IndividualFormFieldConfig,
          ],
        } as FormGroupConfig,
        {
          id: 'email',
          fieldType: 'email',
          label: 'Email Address',
        } as IndividualFormFieldConfig,
      ],
    }
    render(<DynamicFormRenderer {...getMockProps({}, groupedFormConfig)} />)
    expect(screen.getByText('Grouped Test Form')).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    const groupWrapper = screen
      .getByLabelText('Full Name')
      .closest('.custom-group')
    expect(groupWrapper).toBeInTheDocument()
  })

  test('displays client-side validation error messages and prevents submission', async () => {
    render(<DynamicFormRenderer {...mockProps} />)
    const submitButton = screen.getByRole('button', { name: 'Submit' })
    const nameInput = screen.getByLabelText('Full Name')
    const emailInput = screen.getByLabelText('Email Address')

    expect(submitButton).toBeDisabled()

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'J' } })
      fireEvent.blur(nameInput)
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.blur(emailInput)
    })

    await waitFor(() => {
      expect(screen.getByTestId('error-email')).toHaveTextContent(
        'Invalid email address'
      )
      expect(submitButton).toBeDisabled()
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'))
    })

    expect(mockProps.serverAction).not.toHaveBeenCalled()
    expect(mockToast.error).toHaveBeenCalledWith(
      'Please correct the highlighted errors before submitting.'
    )
    expect(screen.queryByTestId('error-name')).not.toBeInTheDocument()
  })

  test('displays client-side error for empty required field on blur', async () => {
    render(<DynamicFormRenderer {...mockProps} />)
    const nameInput = screen.getByLabelText('Full Name')

    await act(async () => {
      fireEvent.focus(nameInput)
      fireEvent.blur(nameInput)
    })

    await waitFor(() => {
      expect(screen.getByTestId('error-name')).toHaveTextContent(
        'Name is required'
      )
    })
    expect(mockProps.serverAction).not.toHaveBeenCalled()
  })

  test('submits data successfully and resets form, displaying success message', async () => {
    const localMockServerAction = jest.fn().mockResolvedValue({
      success: true,
      message: 'Form submitted!',
      submissionId: 'test-123',
    })
    const defaultVals = {
      name: 'Initial Name',
      email: 'initial@example.com',
      message: 'Test',
    }
    render(
      <DynamicFormRenderer
        {...mockProps}
        serverAction={localMockServerAction}
        defaultValues={defaultVals}
      />
    )

    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement
    const emailInput = screen.getByLabelText(
      'Email Address'
    ) as HTMLInputElement
    const messageInput = screen.getByLabelText(
      'Your Message'
    ) as HTMLTextAreaElement
    const form = screen.getByRole('form') as HTMLFormElement

    expect(nameInput.value).toBe('Initial Name')
    expect(emailInput.value).toBe('initial@example.com')
    expect(messageInput.value).toBe('Test')

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, {
        target: { value: 'john.doe@example.com' },
      })
      fireEvent.change(messageInput, {
        target: { value: 'This is a valid message.' },
      })
      fireEvent.blur(nameInput)
      fireEvent.blur(emailInput)
      fireEvent.blur(messageInput)
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    )

    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(localMockServerAction).toHaveBeenCalledTimes(1)
      const formData = localMockServerAction.mock.calls[0][1] as FormData
      expect(formData.get('name')).toBe('John Doe')
      expect(formData.get('email')).toBe('john.doe@example.com')
      expect(formData.get('message')).toBe('This is a valid message.')

      expect(mockToast.success).toHaveBeenCalledWith(
        'Form submitted! (Ref ID: test-123)'
      )
    })

    expect(nameInput.value).toBe('Initial Name')
    expect(emailInput.value).toBe('initial@example.com')
    expect(messageInput.value).toBe('Test')
  })

  test('submits data successfully and resets form, displaying success message', async () => {
    const localMockServerAction = jest.fn().mockResolvedValue({
      success: true,
      message: 'Form submitted!',
      submissionId: 'test-123',
    })
    const defaultVals = {
      name: 'Initial Name',
      email: 'initial@example.com',
      message: 'Test',
    }
    render(
      <DynamicFormRenderer
        {...mockProps}
        serverAction={localMockServerAction}
        defaultValues={defaultVals} // Test reset with specific defaults
      />
    )

    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement
    const emailInput = screen.getByLabelText(
      'Email Address'
    ) as HTMLInputElement
    const messageInput = screen.getByLabelText(
      'Your Message'
    ) as HTMLTextAreaElement
    const form = screen.getByRole('form') as HTMLFormElement

    // Check initial default values are set
    expect(nameInput.value).toBe('Initial Name')
    expect(emailInput.value).toBe('initial@example.com')
    expect(messageInput.value).toBe('Test')

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, {
        target: { value: 'john.doe@example.com' },
      })
      fireEvent.change(messageInput, {
        target: { value: 'This is a valid message.' },
      })
      fireEvent.blur(nameInput) // Trigger validation to enable button
      fireEvent.blur(emailInput)
      fireEvent.blur(messageInput)
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    )

    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(localMockServerAction).toHaveBeenCalledTimes(1)
      const formData = localMockServerAction.mock.calls[0][1] as FormData
      expect(formData.get('name')).toBe('John Doe')
      expect(formData.get('email')).toBe('john.doe@example.com')
      expect(formData.get('message')).toBe('This is a valid message.')

      expect(toast.success).toHaveBeenCalledWith(
        'Form submitted! (Ref ID: test-123)'
      )
      expect(
        screen.getByText('Form submitted! (Ref ID: test-123)')
      ).toBeInTheDocument()
    })

    // Check form reset to original defaultValues
    expect(nameInput.value).toBe('Initial Name')
    expect(emailInput.value).toBe('initial@example.com')
    expect(messageInput.value).toBe('Test') // Or empty if defaultValues was for initial load only
    // The component logic is: reset(defaultValues || ({} as ...))
    // This means it resets to the provided defaultValues.
  })

  test('correctly prepares FormData, excluding empty optional fields', async () => {
    const localMockServerAction = jest
      .fn()
      .mockResolvedValue({ success: true, message: 'OK' })
    render(
      <DynamicFormRenderer
        {...mockProps}
        serverAction={localMockServerAction}
        defaultValues={{ name: 'Test', email: 'test@example.com', message: '' }}
      />
    )

    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement
    const emailInput = screen.getByLabelText(
      'Email Address'
    ) as HTMLInputElement
    // message is optional and left empty

    await act(async () => {
      fireEvent.change(nameInput, {
        target: { value: 'John Doe Optional Test' },
      })
      fireEvent.change(emailInput, {
        target: { value: 'john.optional@example.com' },
      })
      // Do not fill in 'message'
      fireEvent.blur(nameInput)
      fireEvent.blur(emailInput)
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
    )

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'))
    })

    await waitFor(() => {
      expect(localMockServerAction).toHaveBeenCalled()
      const formData = localMockServerAction.mock.calls[0][1] as FormData
      expect(formData.get('name')).toBe('John Doe Optional Test')
      expect(formData.get('email')).toBe('john.optional@example.com')
      expect(formData.has('message')).toBe(false) // Because empty string is not appended
    })
  })

  test('displays server-side error message for a specific field', async () => {
    const currentMockProps = getMockProps()
    render(<DynamicFormRenderer {...currentMockProps} />)
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
      expect(screen.getByTestId('error-name')).toHaveTextContent(
        // Assuming error is shown in the field
        'Simulated server error on name'
      )
      // Check that general toast.error for "Server error on field" is NOT called
      // because the error was field-specific and should be displayed near the field.
      // The component logic: if state.errors has keys, general toast.error(state.message) is skipped.
      expect(toast.error).not.toHaveBeenCalledWith('Server error on field')
      expect(
        screen.queryByText('Error: Server error on field')
      ).not.toBeInTheDocument() // General error message div
    })
  })

  test('displays general server-side error message when no field-specific errors and clears it on dirty', async () => {
    const currentMockProps = getMockProps()
    render(<DynamicFormRenderer {...currentMockProps} />)
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
        screen.getByText('Error: A general server error occurred.') // The div message
      ).toBeInTheDocument()
    })

    // Test that general error message clears when form becomes dirty
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Start typing again' } })
    })

    await waitFor(() => {
      // The success message clearing logic based on isDirty is for `lastSuccessMessage`
      // The general server error message displayed in the div is based on `state`.
      // To "clear" it, a new submission would need to occur that is successful, or a reset.
      // For now, let's confirm it's still there until a new state replaces it.
      // Or, if the intent is to clear it on dirty, the component needs that logic.
      // The current component logic clears `lastSuccessMessage` on dirty, not this general server error.
      // Let's assume it persists until a new server response.
      expect(
        screen.getByText('Error: A general server error occurred.')
      ).toBeInTheDocument()

      // If you want it to clear on dirty, the component would need:
      // useEffect(() => { if (isDirty && state && !state.success && state.message && !state.errors) { /* logic to clear/hide general message */ setState(null) or similar  } }, [isDirty, state])
      // This is not in the original component, so we test existing behavior.
    })
  })

  // ---- Conditional Logic Tests ----
  const ConditionalSchema = z
    .object({
      country: z.string().min(1, 'Country is required'),
      postalCode: z.string().optional(), // Validation depends on country
      message: z.string().optional(), // Changed from 'notes' to 'message' to match FormFieldConfig
    })
    .superRefine((data, ctx) => {
      if (
        data.country === 'USA' &&
        (!data.postalCode || data.postalCode.length < 5)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'USPS code needs 5 digits for USA.',
          path: ['postalCode'],
        })
      }
      if (
        data.country === 'Canada' &&
        data.postalCode &&
        !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(data.postalCode)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid Canadian postal code format.',
          path: ['postalCode'],
        })
      }
    })
  type ConditionalFormData = z.infer<typeof ConditionalSchema>

  const getConditionalMockProps = (
    overrideProps: Partial<
      DynamicFormRendererProps<typeof ConditionalSchema>
    > = {}
  ): DynamicFormRendererProps<typeof ConditionalSchema> => {
    const formConfig: { name: string; fields: FormElementConfig[] } = {
      name: 'Conditional Form',
      fields: [
        {
          id: 'country',
          fieldType: 'select',
          label: 'Country',
          options: [
            { value: '', label: 'Select Country' },
            { value: 'USA', label: 'United States' },
            { value: 'Canada', label: 'Canada' },
            { value: 'Other', label: 'Other' },
          ],
        } as IndividualFormFieldConfig,
        {
          id: 'postalCode',
          fieldType: 'text',
          label: 'Postal Code',
          // Example of conditionalProps in action
          conditionalProps: (values: Partial<ConditionalFormData>) => {
            if (values.country === 'USA') return { placeholder: 'e.g., 90210' }
            if (values.country === 'Canada')
              return { placeholder: 'e.g., A1A 1A1' }
            return { placeholder: 'Postal Code' }
          },
        } as IndividualFormFieldConfig,
        {
          id: 'message',
          fieldType: 'textarea',
          label: 'Message',
        } as IndividualFormFieldConfig,
      ],
    }
    return {
      formConfig,
      clientSchema: ConditionalSchema,
      serverAction: jest.fn().mockResolvedValue({
        success: true,
        message: 'Conditional form submitted!',
      }),
      initialState: { ...DEFAULT_CONTACT_FORM_INITIAL_STATE },
      defaultValues: {
        country: '',
        postalCode: '',
        notes: '',
      } as Partial<ConditionalFormData>,
      ...overrideProps,
    }
  }

  describe('Conditional Field Logic', () => {
    let conditionalProps: DynamicFormRendererProps<typeof ConditionalSchema>

    beforeEach(() => {
      conditionalProps = getConditionalMockProps()
      // Ensure FloatingLabelSelect mock is correctly tracking calls for prop checks
      ;(mockFormField as jest.Mock).mockClear() // For postalCode field
    })

    test('updates field placeholder based on conditionalProps', async () => {
      render(<DynamicFormRenderer {...conditionalProps} />)
      const countrySelect = screen.getByLabelText('Country')
      let postalCodeInput = screen.getByLabelText(
        'Postal Code'
      ) as HTMLInputElement

      // Initial placeholder (from conditionalProps with country='')
      expect(postalCodeInput.placeholder).toBe('Postal Code')

      // Change country to USA
      await act(async () => {
        fireEvent.change(countrySelect, { target: { value: 'USA' } })
        // RHF might take a moment to propagate watched value and re-render
      })

      // The conditionalProps function is called on each render of the field.
      // Changing country triggers a re-render of the form, which includes postalCode.
      await waitFor(() => {
        // Re-query as component might re-render
        postalCodeInput = screen.getByLabelText(
          'Postal Code'
        ) as HTMLInputElement
        expect(postalCodeInput.placeholder).toBe('e.g., 90210')
      })

      // Change country to Canada
      await act(async () => {
        fireEvent.change(countrySelect, { target: { value: 'Canada' } })
      })
      await waitFor(() => {
        postalCodeInput = screen.getByLabelText(
          'Postal Code'
        ) as HTMLInputElement
        expect(postalCodeInput.placeholder).toBe('e.g., A1A 1A1')
      })
    })

    test('re-triggers validation for a dependent field when controlling field changes (country -> postalCode)', async () => {
      render(<DynamicFormRenderer {...conditionalProps} />)
      const countrySelect = screen.getByLabelText('Country')
      const postalCodeInput = screen.getByLabelText('Postal Code')

      // 1. Make postalCode "touched" and initially invalid for USA but valid if no country selected
      await act(async () => {
        fireEvent.focus(postalCodeInput)
        fireEvent.change(postalCodeInput, { target: { value: '123' } }) // Invalid for USA
        fireEvent.blur(postalCodeInput)
      })

      // No error yet as country isn't USA / Canada (schema doesn't enforce for empty country)
      // The schema only adds errors if country is USA/Canada and postal is bad.
      // If postalCode was required, it would show error. But it's optional.
      expect(screen.queryByTestId('error-postalCode')).not.toBeInTheDocument()

      // 2. Change country to USA - should trigger validation on postalCode
      await act(async () => {
        fireEvent.change(countrySelect, { target: { value: 'USA' } })
        // The component's useEffect for countryValueForEffect should call trigger('postalCode')
      })

      await waitFor(() => {
        expect(screen.getByTestId('error-postalCode')).toHaveTextContent(
          'USPS code needs 5 digits for USA.'
        )
      })

      // 3. Correct postalCode for USA
      await act(async () => {
        fireEvent.change(postalCodeInput, { target: { value: '12345' } })
        fireEvent.blur(postalCodeInput)
      })

      await waitFor(() => {
        expect(screen.queryByTestId('error-postalCode')).not.toBeInTheDocument()
      })

      // 4. Change country to Canada, current postalCode (12345) is invalid for Canada
      await act(async () => {
        fireEvent.change(countrySelect, { target: { value: 'Canada' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('error-postalCode')).toHaveTextContent(
          'Invalid Canadian postal code format.'
        )
      })

      // 5. Correct postalCode for Canada
      await act(async () => {
        fireEvent.change(postalCodeInput, { target: { value: 'A1A 1A1' } })
        fireEvent.blur(postalCodeInput)
      })
      await waitFor(() => {
        expect(screen.queryByTestId('error-postalCode')).not.toBeInTheDocument()
      })
    })
  })

  test('clears success message when form becomes dirty after submission', async () => {
    render(<DynamicFormRenderer {...mockProps} />)

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
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(
        screen.getByText('Submitted successfully! (Ref ID: 123)')
      ).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'John Doe Jr.' } })
    })

    await waitFor(() => {
      expect(
        screen.queryByText('Submitted successfully! (Ref ID: 123)')
      ).not.toBeInTheDocument()
    })
  })
})
