'use client'

import * as React from 'react'
import { useEffect, useRef, useState, useTransition, useCallback } from 'react'
import { useActionState } from 'react'
import {
  useForm,
  FormProvider,
  Controller,
  FieldErrors,
  Path,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z, ZodTypeAny } from 'zod' // Import z
import toast from 'react-hot-toast'

import { FormField } from './FormField'
import { FloatingLabelSelect } from './FloatingLabelSelect'
import { FormSubmitButton } from './FormSubmitButton'
import {
  FormElementConfig,
  FormFieldConfig as IndividualFormFieldConfig,
  FormGroupConfig,
} from '@/lib/formConfigs/ContactFormConfig'

// Generic type for form data based on schema
// type GenericFormData = z.infer<typeof clientSchema>

interface DynamicFormRendererProps<T extends ZodTypeAny> {
  formConfig: { name: string; fields: FormElementConfig[] }
  clientSchema: T // Pass the Zod schema
  serverAction: (
    prevState: unknown,
    formData: FormData
  ) => Promise<{
    message: string
    errors?: Record<string, string[]>
    success: boolean
    submissionId?: string
  }>
  initialState?: {
    message: string
    errors?: Record<string, string[]>
    success: boolean
    submissionId?: string
  }
  defaultValues?: Partial<z.infer<T>>
}

export function DynamicFormRenderer<T extends ZodTypeAny>({
  formConfig,
  clientSchema,
  serverAction,
  initialState,
  defaultValues,
}: DynamicFormRendererProps<T>) {
  const [state, formAction] = useActionState(serverAction, initialState)
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null
  )
  const [isPendingTransition, startTransition] = useTransition()

  const methods = useForm<z.infer<T>>({
    resolver: zodResolver(clientSchema),
    mode: 'onChange',
    defaultValues: defaultValues as import('react-hook-form').DefaultValues<
      z.infer<T>
    >,
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

  const watchedValues = watch() // Watch all fields for conditional logic

  const formRef = useRef<HTMLFormElement>(null)

  const onValidSubmit = useCallback(
    (data: z.infer<T>) => {
      const formData = new FormData()
      Object.entries(data as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            formData.append(key, String(value))
          }
        }
      )
      startTransition(() => {
        formAction(formData)
      })
    },
    [formAction, startTransition]
  )

  const onInvalidSubmit = useCallback((errors: FieldErrors<z.infer<T>>) => {
    console.error(
      'RHF_HANDLE_SUBMIT: Validation failed on submit attempt:',
      errors
    )
  }, [])

  useEffect(() => {
    // Trigger validation for fields that depend on others
    formConfig.fields.forEach((element) => {
      const processField = (field: IndividualFormFieldConfig) => {
        if (field.conditionalProps) {
          field.conditionalProps(watchedValues)
          // If any prop relevant to validation changes, re-trigger
          // Example: if 'readOnly' status changes and it affects validation, trigger

          const { isTouched, isDirty: isFieldDirtyVal } = getFieldState(
            field.id as Path<z.infer<T>>
          )
          if (isTouched || isFieldDirtyVal) {
            trigger(field.id as Path<z.infer<T>>)
          }
        }
      }
      if (element.type === 'group' && 'fields' in element) {
        element.fields.forEach(processField)
      } else {
        processField(element as IndividualFormFieldConfig)
      }
    })
  }, [watchedValues, getFieldState, trigger, formConfig.fields])

  useEffect(() => {
    if (!state) return
    if (state.success) {
      const successMsg = state.message || 'Form submitted successfully.'
      toast.success(successMsg)
      setLastSuccessMessage(
        successMsg +
          (state.submissionId ? ` (Ref ID: ${state.submissionId})` : '')
      )
      reset(defaultValues || ({} as z.infer<T>)) // Reset to provided defaults or empty
    } else {
      setLastSuccessMessage(null)
      if (state.message && !state.errors) {
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
    (fieldName: keyof z.infer<T>): boolean =>
      !!state?.errors?.[fieldName as string] ||
      !!clientSideErrors[fieldName as string],
    [state, clientSideErrors]
  )

  const getErrorMessage = useCallback(
    (fieldName: keyof z.infer<T>): string | undefined | null => {
      const serverError = state?.errors?.[fieldName as string]?.join(', ')
      const clientError = clientSideErrors[fieldName as string]
      const clientErrorMsg =
        typeof clientError === 'object' &&
        clientError !== null &&
        'message' in clientError
          ? clientError.message
          : typeof clientError === 'string'
          ? clientError
          : undefined
      return (
        serverError ||
        (typeof clientErrorMsg === 'string' ? clientErrorMsg : undefined)
      )
    },
    [state, clientSideErrors]
  )

  const renderField = (fieldConfig: IndividualFormFieldConfig) => {
    const commonProps = {
      id: fieldConfig.id as Path<z.infer<T>>, // Cast for RHF
      label: fieldConfig.label,
      hasError: fieldHasError(fieldConfig.id as keyof z.infer<T>),
      errorMessage: getErrorMessage(fieldConfig.id as keyof z.infer<T>),
      // Apply conditional props
      ...(fieldConfig.conditionalProps
        ? fieldConfig.conditionalProps(watchedValues)
        : {}),
      // Apply any other component-specific props from config
      ...(fieldConfig.componentProps || {}),
    }

    switch (fieldConfig.fieldType) {
      case 'select':
        return (
          <Controller
            name={fieldConfig.id as Path<z.infer<T>>}
            control={control}
            // rules can be derived from fieldConfig.validation if needed for Controller-specific rules
            render={({ field, fieldState: { error: controllerError } }) => (
              <FloatingLabelSelect
                {...commonProps}
                options={fieldConfig.options || []}
                value={field.value as string | undefined | null}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={
                  fieldConfig.placeholder ||
                  `Select ${fieldConfig.label.toLowerCase()}`
                }
                // Override hasError/errorMessage if controller provides more specific ones
                hasError={!!controllerError || commonProps.hasError}
                errorMessage={
                  controllerError?.message || commonProps.errorMessage
                }
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
            register={
              register as import('react-hook-form').UseFormRegister<z.infer<T>>
            }
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
            register={
              register as import('react-hook-form').UseFormRegister<z.infer<T>>
            }
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
      <div className='w-3/4 p-6 mx-auto my-10 font-sans rounded-lg shadow-2xl bg-gradient-to-b from-indigo-900 to-indigo-600 md:p-8 lg:p-10'>
        <h2 className='mb-8 text-3xl font-semibold text-center text-white text-shadow-md text-shadow-black/20'>
          {formConfig.name}
        </h2>

        {lastSuccessMessage && (
          <div
            className='p-3 mb-6 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md'
            role='alert'
          >
            {lastSuccessMessage}
          </div>
        )}
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
