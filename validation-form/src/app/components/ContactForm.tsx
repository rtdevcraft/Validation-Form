'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useActionState } from 'react'
import { useForm, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  refinedFormSchema as clientSchema,
  ContactFormData,
} from '@/lib/schemas'
import { submitContactForm, SubmitFormState } from '@/app/actions'

// --- Toast Placeholder ---
interface ToastArgs {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}
const toast = ({ title, description, variant }: ToastArgs) =>
  console.log(`Toast (${variant || 'default'}):`, title, description)

// --- Submit Button Component ---
function FormSubmitButton({ isFormValid }: { isFormValid: boolean }) {
  const [pending, setPending] = useState(false) // Local pending state

  const isDisabled = pending || !isFormValid

  // Simulate pending state for demonstration purposes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (pending) {
      timeoutId = setTimeout(() => setPending(false), 2000)
    }
    return () => clearTimeout(timeoutId)
  }, [pending])

  return (
    <button
      type='submit'
      disabled={isDisabled}
      onClick={() => {
        if (!isDisabled) setPending(true)
      }}
      className='inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white transition duration-150 ease-in-out bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed'
    >
      {pending ? (
        <>
          <svg
            className='w-5 h-5 mr-3 -ml-1 text-white animate-spin'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            ></path>
          </svg>
          Submitting...
        </>
      ) : (
        'Submit Contact Request'
      )}
    </button>
  )
}

// --- Form Field Component ---
function FormField({
  id,
  label,
  hasError,
  errorMessage,
  register,
  type = 'text',
  disabled = false,
  rows,
}: {
  id: keyof ContactFormData
  label: string
  hasError: boolean
  errorMessage: string | undefined | null
  register: UseFormRegister<ContactFormData>
  type?: string
  disabled?: boolean
  rows?: number
}) {
  return (
    <div className='relative form-item'>
      {type === 'textarea' ? (
        <textarea
          id={id}
          rows={rows || 4}
          className={`peer block w-full appearance-none rounded-lg border bg-white px-4 py-3 text-sm text-white focus:outline-none focus:ring-0 ${
            hasError
              ? 'border-red-500 border-8 focus:border-red-600'
              : 'border-indigo-400 focus:border-indigo-600'
          }`}
          placeholder=' '
          aria-invalid={hasError}
          disabled={disabled}
          {...register(id)}
        />
      ) : (
        <input
          type={type}
          id={id}
          className={`peer block w-full appearance-none rounded-lg border bg-white px-4 py-3 text-sm text-black focus:outline-none focus:ring-0  ${
            hasError
              ? 'border-red-500 border-4 focus:border-red-600'
              : 'border-indigo-400 focus:border-indigo-600'
          }`}
          placeholder=' '
          aria-invalid={hasError}
          disabled={disabled}
          {...register(id)}
        />
      )}
      <label
        htmlFor={id}
        className={`absolute z-10 origin-[0] transform duration-200 ease-in-out bg-transparent px-1 pointer-events-none left-4 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-[-1rem] peer-focus:-translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-[-1rem] peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs ${
          hasError
            ? 'text-white peer-focus:text-white'
            : 'text-black peer-focus:text-white'
        }`}
      >
        {label}
      </label>
      {errorMessage && (
        <p className='mt-1 text-sm text-white'>{errorMessage}</p>
      )}
    </div>
  )
}

// --- Select Field Component ---
function SelectField({
  id,
  label,
  hasError,
  errorMessage,
  register,
  options,
  defaultValue = '',
}: {
  id: keyof ContactFormData
  label: string
  hasError: boolean
  errorMessage: string | undefined | null
  register: UseFormRegister<ContactFormData>
  options: { value: string; label: string }[]
  defaultValue?: string
}) {
  return (
    <div className='form-item'>
      <label
        htmlFor={id}
        className={`block mb-1 text-sm font-medium ${
          hasError ? 'text-red-600' : 'text-white'
        }`}
      >
        {label}
      </label>
      <select
        id={id}
        {...register(id)}
        defaultValue={defaultValue}
        className={`block w-full px-3 py-3 border bg-white rounded-md shadow-sm hover:cursor-pointer focus:outline-none sm:text-sm ${
          hasError
            ? 'border-red-500 focus:border-red-600'
            : 'border-indigo-400 focus:ring-indigo-500 focus:border-indigo-600'
        }`}
        aria-invalid={hasError}
      >
        <option value='' disabled>
          Select a {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage && (
        <p className='mt-1 text-sm text-red-600'>{errorMessage}</p>
      )}
    </div>
  )
}

// --- Main Form Component ---
export default function ContactForm() {
  const [state, formAction] = useActionState<
    SubmitFormState | undefined,
    FormData
  >(submitContactForm, undefined)
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null
  )

  const {
    register,
    formState: { errors: clientSideErrors, isDirty, isValid },
    watch,
    trigger,
    getFieldState,
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(clientSchema),
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

  // Effect for dynamic postal code validation
  useEffect(() => {
    const postalCodeState = getFieldState('postalCode')
    if (
      watchedCountry &&
      (postalCodeState.isTouched || postalCodeState.isDirty)
    ) {
      trigger('postalCode')
    }
  }, [watchedCountry, trigger, getFieldState, isDirty])

  // Effect to handle Server Action response
  useEffect(() => {
    if (state?.success) {
      const successMsg = state.message || 'Form submitted successfully.'
      toast({ title: 'Success!', description: successMsg })
      setLastSuccessMessage(
        successMsg +
          (state.submissionId ? ` (Ref ID: ${state.submissionId})` : '')
      )
      reset() // Reset form fields
      formRef.current?.reset()
    } else if (state && !state.success) {
      setLastSuccessMessage(null) // Clear any previous success message
      if (state.message && !state.errors) {
        // General error message not tied to specific fields
        toast({
          title: 'Error',
          description: state.message,
          variant: 'destructive',
        })
      }
      // Field-specific errors are handled below
    }
  }, [state, reset])

  // Effect to clear the persistent success message when user starts editing again
  useEffect(() => {
    if (isDirty && lastSuccessMessage) {
      setLastSuccessMessage(null)
    }
  }, [isDirty, lastSuccessMessage])

  const fieldHasError = (fieldName: keyof ContactFormData): boolean =>
    !!state?.errors?.[fieldName] || !!clientSideErrors[fieldName]

  const getErrorMessage = (
    fieldName: keyof ContactFormData
  ): string | undefined | null => {
    return (
      state?.errors?.[fieldName]?.join(', ') ||
      clientSideErrors[fieldName]?.message
    )
  }

  const countryOptions = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
  ]

  const handlePostalCodeInteractionAttempt = () => {
    if (!watchedCountry) {
      console.log('Postal code field clicked without country selected.')
      toast({
        title: 'Select Country Required',
        description:
          'Please select your country first before entering a postal code.',
        variant: 'default', // or 'destructive'
      })
    }
  }

  return (
    <div className='w-3/4 p-6 mx-auto my-10 font-sans bg-gradient-to-b from-indigo-900 to-indigo-600 rounded-lg shadow-xl md:p-8 lg:p-10'>
      <h2 className='mb-8 text-3xl font-semibold text-center text-white text-shadow-md text-shadow-black/20'>
        Contact Us
      </h2>

      {lastSuccessMessage && (
        <div
          className='p-3 mb-6 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md'
          role='alert'
        >
          {lastSuccessMessage}
        </div>
      )}

      {state && !state.success && !state.errors && state.message && (
        <div
          className='p-3 mb-6 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md'
          role='alert'
        >
          Error: {state.message}
        </div>
      )}

      <form ref={formRef} action={formAction} className='space-y-8'>
        {/* Name Field */}
        <FormField
          id='name'
          label='Full Name'
          hasError={fieldHasError('name')}
          errorMessage={getErrorMessage('name')}
          register={register}
        />

        {/* Email Field */}
        <FormField
          id='email'
          label='Email Address'
          type='email'
          hasError={fieldHasError('email')}
          errorMessage={getErrorMessage('email')}
          register={register}
        />

        {/* Phone Field */}
        <FormField
          id='phone'
          label='Phone Number (e.g., (123) 456-7890)'
          type='tel'
          hasError={fieldHasError('phone')}
          errorMessage={getErrorMessage('phone')}
          register={register}
        />

        <div className='grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
          {/* Street Address Field */}
          <div className='sm:col-span-6'>
            <FormField
              id='streetAddress'
              label='Street Address'
              hasError={fieldHasError('streetAddress')}
              errorMessage={getErrorMessage('streetAddress')}
              register={register}
            />
          </div>

          {/* City Field */}
          <div className='sm:col-span-3'>
            <FormField
              id='city'
              label='City'
              hasError={fieldHasError('city')}
              errorMessage={getErrorMessage('city')}
              register={register}
            />
          </div>

          {/* State/Province Field */}
          <div className='sm:col-span-3'>
            <FormField
              id='stateProvince'
              label='State / Province'
              hasError={fieldHasError('stateProvince')}
              errorMessage={getErrorMessage('stateProvince')}
              register={register}
            />
          </div>

          {/* Country Select */}
          <div className='sm:col-span-3'>
            <SelectField
              id='country'
              label='Country'
              hasError={fieldHasError('country')}
              errorMessage={getErrorMessage('country')}
              register={register}
              options={countryOptions}
            />
          </div>

          {/* Postal Code Field */}
          <div
            className='sm:col-span-3'
            onClick={handlePostalCodeInteractionAttempt}
          >
            <FormField
              id='postalCode'
              label={
                watchedCountry === 'US'
                  ? 'ZIP Code'
                  : watchedCountry === 'CA'
                  ? 'Postal Code'
                  : 'Postal Code'
              }
              hasError={fieldHasError('postalCode')}
              errorMessage={getErrorMessage('postalCode')}
              register={register}
              disabled={!watchedCountry}
            />
          </div>
        </div>

        {/* Message Field */}
        <FormField
          id='message'
          label='Message (Optional)'
          hasError={fieldHasError('message')}
          errorMessage={getErrorMessage('message')}
          register={register}
          type='textarea'
          rows={3}
        />

        {/* Submit Button */}
        <FormSubmitButton isFormValid={isValid} />
      </form>
    </div>
  )
}
