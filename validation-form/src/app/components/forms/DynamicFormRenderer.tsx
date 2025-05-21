'use client'

import * as React from 'react'
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useTransition,
  useActionState,
} from 'react'
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
import {
  SubmitFormState,
  DEFAULT_CONTACT_FORM_INITIAL_STATE,
} from '@/lib/types/forms'

export interface DynamicFormRendererProps<Schema extends ZodTypeAny> {
  formConfig: { name: string; fields: FormElementConfig[] }
  clientSchema: Schema
  serverAction: (
    prevState: SubmitFormState,
    formData: FormData
  ) => Promise<SubmitFormState>
  initialState?: SubmitFormState
  defaultValues?: Partial<z.infer<Schema>>
}

type TFormValues<Schema extends ZodTypeAny> = z.infer<Schema>

export function DynamicFormRenderer<Schema extends ZodTypeAny>({
  formConfig,
  clientSchema,
  serverAction,
  initialState,
  defaultValues,
}: DynamicFormRendererProps<Schema>) {
  const [state, formAction, isPendingFromActionState] = useActionState(
    serverAction,
    initialState || DEFAULT_CONTACT_FORM_INITIAL_STATE
  )

  const [, startTransition] = useTransition()

  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null
  )
  console.log('Initial defaultValues for useForm:', defaultValues)
  const methods = useForm<TFormValues<Schema>>({
    resolver: zodResolver(clientSchema),
    mode: 'onChange', // Good for responsive validation
    defaultValues: defaultValues as DefaultValues<TFormValues<Schema>>,
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

  // watchedValues can be useful for debugging or complex conditional logic
  // const watchedValues = watch()
  const formRef = useRef<HTMLFormElement>(null)

  // Watching a specific field for effects (e.g., conditional validation)
  const countryValueForEffect = watch('country' as Path<TFormValues<Schema>>)

  const onValidSubmit = useCallback(
    (data: TFormValues<Schema>) => {
      const formData = new FormData()
      Object.entries(data as Record<string, unknown>).forEach(
        ([key, value]) => {
          // Ensure value is not undefined, null, or an empty string before appending
          if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
          ) {
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

  const onInvalidSubmit = useCallback(
    (errors: FieldErrors<TFormValues<Schema>>) => {
      console.error(
        '[DynamicFormRenderer] Client-side validation failed on submit:',
        errors
      )
      toast.error('Please correct the highlighted errors before submitting.')
    },
    []
  )

  // Effect for conditional validation based on country change (e.g., for postalCode)
  useEffect(() => {
    const fieldsToPotentiallyTrigger: Path<TFormValues<Schema>>[] = []

    // Recursive function to find fields that might need re-validation
    function findFields(elements: FormElementConfig[]): void {
      elements.forEach((element) => {
        if (element.type === 'group' && 'fields' in element) {
          findFields(element.fields)
        } else if (element.type !== 'group') {
          const field = element as IndividualFormFieldConfig
          // This logic is specific to postalCode; make it more generic
          // if your config supports defining such dependencies.
          if (
            field.conditionalProps && // Assumes conditionalProps implies potential re-validation needs
            field.id === 'postalCode' // Example: specific field check
          ) {
            const fieldState = getFieldState(
              'postalCode' as Path<TFormValues<Schema>>
            )
            // Only trigger validation if the field has been interacted with
            if (fieldState.isTouched || fieldState.isDirty) {
              fieldsToPotentiallyTrigger.push(
                'postalCode' as Path<TFormValues<Schema>>
              )
            }
          }
          // Add other field-specific conditional triggers if necessary
        }
      })
    }

    findFields(formConfig.fields)

    if (fieldsToPotentiallyTrigger.length > 0) {
      // Ensure unique fields if multiple conditions could add the same field
      const uniqueFields = Array.from(new Set(fieldsToPotentiallyTrigger))
      trigger(uniqueFields)
    }
  }, [
    countryValueForEffect,
    getFieldState,
    trigger,
    formConfig.fields, // If formConfig.fields can change, this is needed.
    // If static for the lifetime of this component instance, can be removed
    // if the field IDs (like 'postalCode') are constant.
  ])

  // Effect to handle server action responses (success/error messages, form reset)
  useEffect(() => {
    if (!state) return

    if (state.success) {
      const successMsg = state.message || 'Form submitted successfully.'
      const fullSuccessMsg =
        successMsg +
        (state.submissionId ? ` (Ref ID: ${state.submissionId})` : '')
      toast.success(fullSuccessMsg)
      setLastSuccessMessage(fullSuccessMsg)
      reset(defaultValues || ({} as DefaultValues<TFormValues<Schema>>)) // Reset with new defaults or empty
    } else {
      setLastSuccessMessage(null) // Clear any previous success message
      // Handle server-side errors
      if (state.message) {
        // Current logic: Toasts general error if no field errors from server.
        // Field-specific errors are expected to be shown by the fields themselves.
        const hasFieldErrors =
          state.errors && Object.keys(state.errors).length > 0
        if (!hasFieldErrors) {
          toast.error(state.message)
        } else if (
          state.message &&
          !(
            state.errors &&
            Object.values(state.errors).some((arr) => arr && arr.length > 0)
          )
        ) {
          // Case where state.errors object might exist but be empty arrays
          toast.error(state.message)
        }
      }
    }
  }, [state, reset, defaultValues])

  // Effect to clear success message when user starts editing the form again
  useEffect(() => {
    if (isDirty && lastSuccessMessage) {
      setLastSuccessMessage(null)
    }
  }, [isDirty, lastSuccessMessage])

  const fieldHasError = useCallback(
    (fieldName: Path<TFormValues<Schema>>): boolean => {
      const serverFieldErrors =
        state?.errors?.[fieldName as keyof NonNullable<typeof state.errors>]
      return (
        (!!serverFieldErrors && serverFieldErrors.length > 0) ||
        !!clientSideErrors[fieldName]
      )
    },
    [clientSideErrors, state] // Include full state object
  )

  const getErrorMessage = useCallback(
    (fieldName: Path<TFormValues<Schema>>): string | undefined => {
      const serverErrorArray =
        state?.errors?.[fieldName as keyof NonNullable<typeof state.errors>]
      if (serverErrorArray?.length) {
        return serverErrorArray.join(', ') // Show all server errors for the field
      }
      const clientError = clientSideErrors[fieldName]
      // RHF error messages can be strings or other types, ensure it's a string.
      return clientError?.message ? String(clientError.message) : undefined
    },
    [clientSideErrors, state] // Include full state object
  )

  const renderField = (fieldConfig: IndividualFormFieldConfig) => {
    const fieldName = fieldConfig.id as Path<TFormValues<Schema>>

    // Watched values are needed here if conditionalProps depend on them
    const watchedValuesForConditionalProps = watch()
    const currentConditionalProps = fieldConfig.conditionalProps
      ? fieldConfig.conditionalProps(watchedValuesForConditionalProps) // Pass watched values
      : {}

    const commonProps = {
      id: fieldName,
      label: fieldConfig.label,
      hasError: fieldHasError(fieldName),
      errorMessage: getErrorMessage(fieldName),
      placeholder: fieldConfig.placeholder, // Base placeholder
      ...currentConditionalProps, // Conditional props can override base placeholder
      ...(fieldConfig.componentProps || {}), // Other specific component props
    }

    // No need for the explicit cast if FormField props are typed correctly.
    // const rhfRegister = register as import('react-hook-form').UseFormRegister<TFormValues<Schema>>;
    // `register` from `useForm` is already correctly typed.

    switch (fieldConfig.fieldType) {
      case 'select':
        return (
          <Controller
            name={fieldName}
            control={control}
            render={({ field, fieldState: { error: controllerError } }) => (
              <FloatingLabelSelect
                {...commonProps} // Spread commonProps first
                options={fieldConfig.options || []}
                value={(field.value as string | undefined | null) ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                // Placeholder logic: commonProps.placeholder already considers overrides.
                // If still undefined, use default.
                placeholder={
                  commonProps.placeholder ||
                  `Select ${fieldConfig.label.toLowerCase()}`
                }
                // Prioritize controller error, then commonProps error status/message
                hasError={!!controllerError || commonProps.hasError}
                errorMessage={
                  controllerError?.message || commonProps.errorMessage
                }
                label={commonProps.label} // Explicitly pass label if not in commonProps or needs override
              />
            )}
          />
        )
      case 'textarea':
        return (
          <FormField
            {...commonProps}
            type='textarea' // fieldType is 'textarea'
            rows={fieldConfig.rows || 4}
            register={register} // Pass register directly
          />
        )
      // Assuming 'email', 'tel', 'text' in fieldType are valid HTML input types
      case 'email':
      case 'tel':
      case 'text':
      default: // Handles any other fieldType that FormField can render
        return (
          <FormField
            {...commonProps}
            // Use fieldConfig.fieldType as the primary source for input type
            // if it's meant to be an HTML input type.
            // The original `fieldConfig.type || fieldConfig.fieldType` might be due to
            // how FormElementConfig `type` vs IndividualFormFieldConfig `fieldType` are structured.
            // Assuming `fieldType` is the definitive rendering type for these cases:
            type={fieldConfig.fieldType as string}
            register={register}
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
            className={groupConfig.className || ''} // Provide default for className
          >
            {renderElements(groupConfig.fields)}
          </div>
        )
      }
      // Individual field
      const fieldConfig = element as IndividualFormFieldConfig
      // The key for individual fields is better placed directly on the component returned by renderField
      // or on this wrapping div.
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

        {/* Success Message Display */}
        {lastSuccessMessage && (
          <div
            className='p-4 mb-6 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg'
            role='alert'
          >
            {lastSuccessMessage}
          </div>
        )}

        {/* General Server Error Message Display (non-field specific) */}
        {state &&
          !state.success &&
          state.message &&
          (!state.errors ||
            Object.keys(state.errors).length === 0 ||
            !Object.values(state.errors).some(
              (arr) => arr && arr.length > 0
            )) && (
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
          aria-label={formConfig.name}
          noValidate // Recommended with RHF client-side validation
        >
          {renderElements(formConfig.fields)}
          <FormSubmitButton
            isFormValid={isValid} // RHF's isValid reflects client-side status
            isSubmitting={isPendingFromActionState} // From useActionState
          />
        </form>
      </div>
    </FormProvider>
  )
}
