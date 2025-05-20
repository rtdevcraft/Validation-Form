'use client'

import * as React from 'react'
import { useEffect, useRef, useState, useCallback, useActionState } from 'react'
import {
  useForm,
  FormProvider,
  Controller,
  FieldErrors,
  Path,
  DefaultValues,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z, ZodTypeAny } from 'zod'
import toast from 'react-hot-toast'

import { FormField } from './FormField'
import { FloatingLabelSelect } from './FloatingLabelSelect'
import { FormSubmitButton } from './FormSubmitButton'
import {
  FormElementConfig,
  FormFieldConfig as IndividualFormFieldConfig,
  FormGroupConfig,
} from '@/lib/formConfigs/ContactFormConfig'
import { SubmitFormState } from '@/lib/types/forms'

export interface DynamicFormRendererProps<T extends ZodTypeAny> {
  formConfig: { name: string; fields: FormElementConfig[] }
  clientSchema: T
  serverAction: (
    prevState: SubmitFormState,
    formData: FormData
  ) => Promise<SubmitFormState>
  initialState?: SubmitFormState
  defaultValues?: Partial<z.infer<T>>
}

export function DynamicFormRenderer<T extends ZodTypeAny>({
  formConfig,
  clientSchema,
  serverAction,
  initialState,
  defaultValues,
}: DynamicFormRendererProps<T>) {
  const [state, formAction, isPendingTransition] = useActionState(
    serverAction,
    initialState || {
      message: '',
      success: false,
      errors: undefined,
      submissionId: undefined,
    }
  )

  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null
  )

  const methods = useForm<z.infer<T>>({
    resolver: zodResolver(clientSchema),
    mode: 'onChange', // Validate on change, blur, and submit
    defaultValues: defaultValues as DefaultValues<z.infer<T>>,
  })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors: clientSideErrors, isDirty, isValid },
    watch,
    trigger,
    getFieldState,
    reset,
  } = methods

  const watchedValues = watch()
  const formRef = useRef<HTMLFormElement>(null)

  const onValidSubmit = useCallback(
    (data: z.infer<T>) => {
      const formData = new FormData()
      Object.entries(data as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
          ) {
            formData.append(key, String(value))
          }
        }
      )
      // formAction is already wrapped with startTransition by useActionState
      formAction(formData)
    },
    [formAction] // Removed startTransition as it's handled by useActionState
  )

  const onInvalidSubmit = useCallback((errors: FieldErrors<z.infer<T>>) => {
    console.error(
      'RHF_HANDLE_SUBMIT: Client-side validation failed on submit attempt:',
      errors
    )

    toast.error('Please correct the highlighted errors.')
  }, [])

  const countryValueForEffect = watch('country' as Path<z.infer<T>>)

  useEffect(() => {
    const fieldsToTrigger: Path<z.infer<T>>[] = []

    formConfig.fields.forEach((element) => {
      const processField = (field: IndividualFormFieldConfig) => {
        if (field.conditionalProps) {
          // Example for postalCode:
          if (field.id === 'postalCode') {
            const fieldState = getFieldState('postalCode' as Path<z.infer<T>>)
            if (fieldState.isTouched || fieldState.isDirty) {
              fieldsToTrigger.push('postalCode' as Path<z.infer<T>>)
            }
          }
        }
      }

      if (element.type === 'group' && 'fields' in element) {
        element.fields.forEach(processField)
      } else if (element.type !== 'group') {
        processField(element as IndividualFormFieldConfig)
      }
    })
  }, [countryValueForEffect, getFieldState, trigger, formConfig.fields])

  useEffect(() => {
    if (!state) return // state can be null initially from useActionState

    if (state.success) {
      const successMsg = state.message || 'Form submitted successfully.'
      toast.success(
        successMsg +
          (state.submissionId ? ` (Ref ID: ${state.submissionId})` : '')
      )
      setLastSuccessMessage(
        successMsg +
          (state.submissionId ? ` (Ref ID: ${state.submissionId})` : '')
      )
      reset(defaultValues || ({} as z.infer<T>)) // Reset form to default or empty
    } else {
      setLastSuccessMessage(null) // Clear any previous success message
      // Handle server-side errors
      if (state.errors) {
        // RHF doesn't automatically set server errors.
        // For now, individual field errors are handled by getErrorMessage.
        // If there's a general error message from the server AND field errors,
        // the field errors take precedence in display via FormField.
        // If only a general message (no field errors), show it.
        if (
          state.message &&
          !(state.errors && Object.keys(state.errors).length)
        ) {
          toast.error(state.message)
        }
      } else if (state.message) {
        // No field errors, but a general error message
        toast.error(state.message)
      }
    }
  }, [state, reset, defaultValues])

  useEffect(() => {
    if (isDirty && lastSuccessMessage) {
      setLastSuccessMessage(null)
    }
  }, [isDirty, lastSuccessMessage])

  const fieldHasError = useCallback(
    (
      fieldName: Path<z.infer<T>>
    ): boolean => // Use Path type
      !!state?.errors?.[fieldName as keyof NonNullable<typeof state.errors>]
        ?.length || // Check server errors
      !!clientSideErrors[fieldName], // Check RHF client-side errors
    [clientSideErrors, state]
  )

  const getErrorMessage = useCallback(
    (fieldName: Path<z.infer<T>>): string | undefined => {
      // Use Path type
      const serverErrorArray =
        state?.errors?.[fieldName as keyof NonNullable<typeof state.errors>]
      if (serverErrorArray?.length) {
        return serverErrorArray.join(', ')
      }
      const clientError = clientSideErrors[fieldName]
      if (clientError?.message) {
        return clientError.message as string
      }
      return undefined
    },
    [clientSideErrors, state]
  )

  const renderField = (fieldConfig: IndividualFormFieldConfig) => {
    const fieldName = fieldConfig.id as Path<z.infer<T>>
    const currentConditionalProps = fieldConfig.conditionalProps
      ? fieldConfig.conditionalProps(watchedValues)
      : {}

    const commonProps = {
      id: fieldName,
      label: fieldConfig.label,
      hasError: fieldHasError(fieldName),
      errorMessage: getErrorMessage(fieldName),
      placeholder: fieldConfig.placeholder,
      ...currentConditionalProps,
      ...(fieldConfig.componentProps || {}),
    }

    // Ensure register is correctly typed for RHF
    const rhfRegister = register as import('react-hook-form').UseFormRegister<
      z.infer<T>
    >

    switch (fieldConfig.fieldType) {
      case 'select':
        return (
          <Controller
            name={fieldName}
            control={control}
            render={({ field, fieldState: { error: controllerError } }) => (
              <FloatingLabelSelect
                {...commonProps} // Common props first
                options={fieldConfig.options || []}
                value={(field.value as string | undefined | null) ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={
                  commonProps.placeholder ||
                  fieldConfig.placeholder ||
                  `Select ${fieldConfig.label.toLowerCase()}`
                }
                // Override error state from controller if more specific
                hasError={!!controllerError || commonProps.hasError}
                errorMessage={
                  controllerError?.message || commonProps.errorMessage
                }
                // Pass through other commonProps again in case controller needs them
                // or they were overridden by conditionalProps
                label={commonProps.label}
              />
            )}
          />
        )
      case 'textarea':
        return (
          <FormField
            {...commonProps}
            type='textarea'
            rows={fieldConfig.rows || 4}
            register={rhfRegister}
          />
        )
      case 'email':
      case 'tel':
      case 'text':
      default:
        return (
          <FormField
            {...commonProps}
            type={fieldConfig.type || 'text'}
            register={rhfRegister}
          />
        )
    }
  }

  const renderElements = (elements: FormElementConfig[]) => {
    return elements.map((element, index) => {
      if (element.type === 'group') {
        const groupConfig = element as FormGroupConfig
        return (
          <div
            key={groupConfig.id || `group-${index}`}
            className={groupConfig.className}
          >
            {renderElements(groupConfig.fields)}
          </div>
        )
      }
      // It's a field
      const fieldConfig = element as IndividualFormFieldConfig
      return (
        <div key={fieldConfig.id} className={fieldConfig.className || ''}>
          {renderField(fieldConfig)}
        </div>
      )
    })
  }

  return (
    <FormProvider {...methods}>
      <div className='w-full max-w-2xl p-6 mx-auto my-10 font-sans rounded-lg shadow-2xl bg-gradient-to-b from-indigo-900 to-indigo-600 md:p-8 lg:p-10'>
        <h2 className='mb-8 text-3xl font-semibold text-center text-white text-shadow-md text-shadow-black/20'>
          {formConfig.name}
        </h2>

        {lastSuccessMessage && (
          <div
            className='p-4 mb-6 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg'
            role='alert'
          >
            {lastSuccessMessage}
          </div>
        )}
        {state &&
          !state.success &&
          state.message &&
          (!state.errors || Object.keys(state.errors).length === 0) && ( // Only show if no field-specific errors
            <div
              className='p-4 mb-6 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg'
              role='alert'
            >
              Error: {state.message}
            </div>
          )}

        <form
          ref={formRef}
          onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}
          className='space-y-8'
          aria-label={formConfig.name} // Added aria-label
        >
          {renderElements(formConfig.fields)}
          <FormSubmitButton
            isFormValid={isValid}
            isSubmitting={isPendingTransition}
          />
        </form>
      </div>
    </FormProvider>
  )
}
