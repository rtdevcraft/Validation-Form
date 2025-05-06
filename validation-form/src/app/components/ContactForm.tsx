'use client'

import React, { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  refinedFormSchema as clientSchema,
  ContactFormData,
} from '@/lib/schemas'
import { submitContactForm, SubmitFormState } from '@/app/actions'

// --- Shadcn UI Component Placeholders or your actual UI library components ---
// (Button, Input, Select, Textarea, Form, FormItem, FormLabel, FormControl, FormMessage, FormDescription)
const Button = ({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props}>{children}</button>
)
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} />
)
const Select = ({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props}>{children}</select>
)
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} />
)
const Form = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ children, ...props }, ref) => (
  <form ref={ref} {...props}>
    {children}
  </form>
))
Form.displayName = 'Form'
const FormItem = ({ children }: { children: React.ReactNode }) => (
  <div className='mb-4'>{children}</div>
)
const FormLabel = ({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) => (
  <label
    htmlFor={htmlFor}
    className='block mb-1 text-sm font-medium text-gray-700'
  >
    {children}
  </label>
)
const FormControl = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
)
const FormMessage = ({ children }: { children: React.ReactNode }) => (
  <p className='mt-1 text-sm text-red-600'>{children}</p>
)
interface ToastArgs {
  title: string
  description: string
}
const toast = ({ title, description }: ToastArgs) =>
  console.log('Toast:', title, description)

// Separate SubmitButton component to use useFormStatus
function FormSubmitButton() {
  const { pending } = useFormStatus() // Gets pending state from the <form>
  return (
    <Button
      type='submit'
      disabled={pending}
      className='px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50'
    >
      {pending ? 'Submitting...' : 'Submit Form'}
    </Button>
  )
}

export default function ContactForm() {
  // useFormState for Server Action state management
  const [state, formAction] = useFormState<
    SubmitFormState | undefined,
    FormData
  >(
    submitContactForm, // The server action
    undefined // Initial state
  )

  // react-hook-form for client-side validation and field management
  const {
    register,
    formState: { errors: clientSideErrors, isDirty },
    watch,
    trigger,
    getFieldState,
    reset, // To reset form fields
  } = useForm<ContactFormData>({
    resolver: zodResolver(clientSchema), // Use the same Zod schema for client-side validation
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      streetAddress: '',
      city: '',
      stateProvince: '',
      country: undefined,
      postalCode: '',
      message: '',
    },
  })

  const watchedCountry = watch('country')
  const formRef = useRef<HTMLFormElement>(null)

  // Effect for dynamic postal code validation based on country
  useEffect(() => {
    const postalCodeState = getFieldState('postalCode')
    if (
      watchedCountry &&
      (postalCodeState.isTouched || postalCodeState.isDirty)
    ) {
      trigger('postalCode')
    }
  }, [watchedCountry, trigger, getFieldState, isDirty])

  // Effect to handle Server Action response (success/error messages, form reset)
  useEffect(() => {
    if (state?.success) {
      toast({ title: 'Success!', description: state.message })
      reset() // Reset react-hook-form fields
    } else if (state && !state.success && state.message && !state.errors) {
      // General error message from server action (not field-specific)
      toast({ title: 'Error', description: state.message })
    }
    // Field-specific errors from `state.errors` will be handled directly in the JSX below
  }, [state, reset])

  return (
    <div className='max-w-lg p-6 mx-auto font-sans bg-white rounded-lg shadow-md'>
      <h2 className='mb-6 text-2xl font-semibold text-gray-800'>Contact Us</h2>
      {/*
        The form `action` prop now directly calls the server action via `formAction` from `useFormState`.
        react-hook-form's `handleSubmit` is NOT used directly on the <form onSubmit={...}> here.
        Client-side validation still runs due to `zodResolver` in `useForm`.
        If client-side validation fails, react-hook-form prevents form submission.
        If client-side validation passes, the form submits, and `formAction` (the server action) is invoked.
      */}
      <Form ref={formRef} action={formAction} className='space-y-4'>
        {/* Name Field */}
        <FormItem>
          <FormLabel htmlFor='name'>Full Name</FormLabel>
          <FormControl>
            <Input id='name' placeholder='John Doe' {...register('name')} />
          </FormControl>
          {clientSideErrors.name && (
            <FormMessage>{clientSideErrors.name.message}</FormMessage>
          )}
          {state?.errors?.name && (
            <FormMessage>{state.errors.name.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* Email Field */}
        <FormItem>
          <FormLabel htmlFor='email'>Email Address</FormLabel>
          <FormControl>
            <Input
              id='email'
              type='email'
              placeholder='you@example.com'
              {...register('email')}
            />
          </FormControl>
          {clientSideErrors.email && (
            <FormMessage>{clientSideErrors.email.message}</FormMessage>
          )}
          {state?.errors?.email && (
            <FormMessage>{state.errors.email.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* Phone Field - Add other fields similarly, showing both client and server errors */}
        <FormItem>
          <FormLabel htmlFor='phone'>Phone Number</FormLabel>
          <FormControl>
            <Input
              id='phone'
              type='tel'
              placeholder='(123) 456-7890'
              {...register('phone')}
            />
          </FormControl>
          {clientSideErrors.phone && (
            <FormMessage>{clientSideErrors.phone.message}</FormMessage>
          )}
          {state?.errors?.phone && (
            <FormMessage>{state.errors.phone.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* Street Address */}
        <FormItem>
          <FormLabel htmlFor='streetAddress'>Street Address</FormLabel>
          <FormControl>
            <Input
              id='streetAddress'
              placeholder='123 Main St'
              {...register('streetAddress')}
            />
          </FormControl>
          {clientSideErrors.streetAddress && (
            <FormMessage>{clientSideErrors.streetAddress.message}</FormMessage>
          )}
          {state?.errors?.streetAddress && (
            <FormMessage>{state.errors.streetAddress.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* City */}
        <FormItem>
          <FormLabel htmlFor='city'>City</FormLabel>
          <FormControl>
            <Input id='city' placeholder='Anytown' {...register('city')} />
          </FormControl>
          {clientSideErrors.city && (
            <FormMessage>{clientSideErrors.city.message}</FormMessage>
          )}
          {state?.errors?.city && (
            <FormMessage>{state.errors.city.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* State/Province */}
        <FormItem>
          <FormLabel htmlFor='stateProvince'>State / Province</FormLabel>
          <FormControl>
            <Input
              id='stateProvince'
              placeholder='CA / Ontario'
              {...register('stateProvince')}
            />
          </FormControl>
          {clientSideErrors.stateProvince && (
            <FormMessage>{clientSideErrors.stateProvince.message}</FormMessage>
          )}
          {state?.errors?.stateProvince && (
            <FormMessage>{state.errors.stateProvince.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* Country */}
        <FormItem>
          <FormLabel htmlFor='country'>Country</FormLabel>
          <FormControl>
            <Select id='country' {...register('country')} defaultValue=''>
              <option value='' disabled>
                Select a country
              </option>
              <option value='US'>United States</option>
              <option value='CA'>Canada</option>
            </Select>
          </FormControl>
          {clientSideErrors.country && (
            <FormMessage>{clientSideErrors.country.message}</FormMessage>
          )}
          {state?.errors?.country && (
            <FormMessage>{state.errors.country.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* Postal Code */}
        <FormItem>
          <FormLabel htmlFor='postalCode'>Postal Code</FormLabel>
          <FormControl>
            <Input
              id='postalCode'
              placeholder={
                watchedCountry === 'US'
                  ? 'e.g., 90210 or 90210-1234'
                  : watchedCountry === 'CA'
                  ? 'e.g., A1A 1A1'
                  : 'Select country first'
              }
              {...register('postalCode')}
              disabled={!watchedCountry}
            />
          </FormControl>
          {clientSideErrors.postalCode && (
            <FormMessage>{clientSideErrors.postalCode.message}</FormMessage>
          )}
          {state?.errors?.postalCode && (
            <FormMessage>{state.errors.postalCode.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* Message */}
        <FormItem>
          <FormLabel htmlFor='message'>Message (Optional)</FormLabel>
          <FormControl>
            <Textarea
              id='message'
              placeholder='Your message here...'
              {...register('message')}
            />
          </FormControl>
          {clientSideErrors.message && (
            <FormMessage>{clientSideErrors.message?.message}</FormMessage>
          )}
          {state?.errors?.message && (
            <FormMessage>{state.errors.message.join(', ')}</FormMessage>
          )}
        </FormItem>

        {/* Display general (non-field) error messages from server state */}
        {state && !state.success && !state.errors && state.message && (
          <FormItem>
            <FormMessage>{state.message}</FormMessage>
          </FormItem>
        )}

        <FormSubmitButton />
      </Form>
    </div>
  )
}
