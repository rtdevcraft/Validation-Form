'use client'

import React, {
  useEffect,
  useRef,
  useState,
  useTransition,
  useCallback,
} from 'react'
import { useActionState } from 'react'
import { useForm, FieldErrors, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  refinedFormSchema as clientSchema,
  ContactFormData,
} from '@/lib/schemas'
import { submitContactForm, SubmitFormState } from '@/app/actions'
import { FormField } from './FormField'
import { FloatingLabelSelect } from './FloatingLabelSelect'
import { FormSubmitButton } from './FormSubmitButton'
import toast from 'react-hot-toast'

type SelectOption = {
  value: string
  label: string
}

const COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  // Add an explicit placeholder option for the list if you want user to be able to re-select "empty"
  //{ value: '', label: 'Select your country' }, // Typically not needed if button shows placeholder
]

export default function ContactForm() {
  const [state, formAction] = useActionState<
    SubmitFormState | undefined,
    FormData
  >(submitContactForm, undefined)
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null
  )
  const [isPendingTransition, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors: clientSideErrors, isDirty, isValid },
    watch,
    trigger,
    getFieldState,
    reset,
    control,
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
      country: '',
      postalCode: '',
      message: '',
    },
  })

  const watchedCountry = watch('country')
  const formRef = useRef<HTMLFormElement>(null)

  const handlePostalCodeInteractionAttempt = useCallback(() => {
    if (!watchedCountry) {
      toast.error(
        'Please select your country first before entering a postal code.'
      )
    }
  }, [watchedCountry])

  const onValidSubmit = useCallback(
    (data: ContactFormData) => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value))
        }
      })

      startTransition(() => {
        formAction(formData)
      })
    },
    [formAction, startTransition]
  )

  const onInvalidSubmit = useCallback(
    (errors: FieldErrors<ContactFormData>) => {
      console.error(
        'RHF_HANDLE_SUBMIT: Validation failed on submit attempt:',
        errors
      )
    },
    []
  )

  // Effect for dynamic postal code validation
  useEffect(() => {
    const { isTouched, isDirty: isFieldDirty } = getFieldState('postalCode')
    if (watchedCountry && (isTouched || isFieldDirty)) {
      trigger('postalCode')
    }
  }, [watchedCountry, getFieldState, trigger])

  // Effect to handle Server Action response
  useEffect(() => {
    if (!state) return
    if (state.success) {
      const successMsg = state.message || 'Form submitted successfully.'
      toast.success(successMsg)

      setLastSuccessMessage(
        successMsg +
          (state.submissionId ? ` (Ref ID: ${state.submissionId})` : '')
      )
      reset()
    } else {
      setLastSuccessMessage(null)
      if (state.message && !state.errors) {
        // Only show general error toast if no field-specific errors
        toast.error(state.message)
      }
      // Field-specific errors from state.errors are handled by getErrorMessage
    }
  }, [state, reset]) // Dependencies

  // Effect to clear the persistent success message when user starts editing again
  useEffect(() => {
    if (isDirty && lastSuccessMessage) {
      setLastSuccessMessage(null)
    }
  }, [isDirty, lastSuccessMessage])

  const fieldHasError = useCallback(
    (fieldName: keyof ContactFormData): boolean =>
      !!state?.errors?.[fieldName] || !!clientSideErrors[fieldName],
    [state, clientSideErrors] // Dependencies
  )

  const getErrorMessage = useCallback(
    (fieldName: keyof ContactFormData): string | undefined | null =>
      state?.errors?.[fieldName]?.join(', ') ||
      clientSideErrors[fieldName]?.message,
    [state, clientSideErrors] // Dependencies
  )

  return (
    <div className='w-3/4 p-6 mx-auto my-10 font-sans bg-gradient-to-b from-indigo-900 to-indigo-600 rounded-lg shadow-2xl md:p-8 lg:p-10'>
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

      {/* Display general server errors (not field-specific) */}
      {state && !state.success && state.message && !state.errors && (
        <div
          className='p-3 mb-6 text-sm text-red-800 bg-red-100 border border-red-200 rounded-md'
          role='alert'
        >
          Error: {state.message}
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}
        className='space-y-8'
      >
        {/* Name Field */}
        <FormField
          id='name'
          label='Full Name'
          register={register}
          hasError={fieldHasError('name')}
          errorMessage={getErrorMessage('name')}
        />

        {/* Email Field */}
        <FormField
          id='email'
          label='Email Address'
          type='email'
          register={register}
          hasError={fieldHasError('email')}
          errorMessage={getErrorMessage('email')}
        />

        {/* Phone Field */}
        <FormField
          id='phone'
          label='Phone Number (e.g., +11234567890)'
          type='tel'
          register={register}
          hasError={fieldHasError('phone')}
          errorMessage={getErrorMessage('phone')}
        />

        {/* Address Grid */}
        <div className='grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
          {/* Street Address Field */}
          <div className='sm:col-span-6'>
            <FormField
              id='streetAddress'
              label='Street Address'
              register={register}
              hasError={fieldHasError('streetAddress')}
              errorMessage={getErrorMessage('streetAddress')}
            />
          </div>

          {/* City Field */}
          <div className='sm:col-span-3'>
            <FormField
              id='city'
              label='City'
              register={register}
              hasError={fieldHasError('city')}
              errorMessage={getErrorMessage('city')}
            />
          </div>

          {/* State/Province Field */}
          <div className='sm:col-span-3'>
            <FormField
              id='stateProvince'
              label='State / Province'
              register={register}
              hasError={fieldHasError('stateProvince')}
              errorMessage={getErrorMessage('stateProvince')}
            />
          </div>

          {/* Country Select - Using Controller with FloatingLabelSelect */}
          <div className='sm:col-span-3'>
            <Controller
              name='country'
              control={control}
              rules={{ required: 'Country is required' }}
              render={({ field, fieldState: { error } }) => (
                <FloatingLabelSelect
                  id='country'
                  label='Country'
                  options={COUNTRY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  hasError={!!error}
                  errorMessage={error?.message}
                  placeholder='' // This text appears in the button if value is empty
                  // To match the width of the ZIP Code field if they are in the same grid row:
                  // className="h-full" // If FormField has a specific height wrapper
                  // buttonClassName="h-full" // If the button needs to fill height
                />
              )}
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
              register={register}
              readOnly={!watchedCountry}
              inputClassName={!watchedCountry ? 'cursor-not-allowed' : ''}
              hasError={fieldHasError('postalCode')}
              errorMessage={getErrorMessage('postalCode')}
            />
          </div>
        </div>

        {/* Message Field */}
        <FormField
          id='message'
          label='Message (Optional)'
          type='textarea'
          rows={4}
          register={register}
          hasError={fieldHasError('message')}
          errorMessage={getErrorMessage('message')}
        />

        <FormSubmitButton
          isFormValid={isValid} //
          isSubmitting={isPendingTransition}
        />
      </form>
    </div>
  )
}
