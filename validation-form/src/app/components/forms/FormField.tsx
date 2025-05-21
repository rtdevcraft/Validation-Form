import React from 'react'
import { UseFormRegister, Path, FieldValues } from 'react-hook-form'

interface FormFieldProps<TFieldValues extends FieldValues> {
  id: Path<TFieldValues>
  label: string
  register: UseFormRegister<TFieldValues> // The register function from RHF
  type?: string
  rows?: number
  readOnly?: boolean
  inputClassName?: string
  hasError?: boolean
  errorMessage?: string | null | undefined
  placeholder?: string | undefined // Accept the placeholder prop
  [key: string]: unknown // For other HTML attributes passed via ...rest
}

export const FormField = <TFieldValues extends FieldValues>({
  id,
  label,
  register, // Destructure register here
  type = 'text',
  rows,
  readOnly,
  inputClassName = '',
  hasError,
  errorMessage,
  placeholder, // Destructure placeholder here
  ...rest // 'rest' will now contain other valid HTML attributes
}: FormFieldProps<TFieldValues>) => {
  const baseInputAndTextareaClasses =
    'peer block w-full appearance-none rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-0'
  const textColor = 'text-black'
  const bgColor = 'bg-white'
  const errorBorderClasses = 'border-red-500 border-5 focus:border-red-600' // Note: border-5 might be very thick, usually it's border-2, border-4
  const normalBorderClasses = 'border-indigo-400 focus:border-indigo-600'

  const combinedInputClasses = `
    ${baseInputAndTextareaClasses}
    ${bgColor}
    ${textColor}
    ${hasError ? errorBorderClasses : normalBorderClasses}
    ${inputClassName}
  `
    .trim()
    .replace(/\s+/g, ' ')

  const baseLabelClasses =
    'absolute z-10 origin-[0] transform duration-200 ease-in-out bg-transparent px-1 pointer-events-none left-4 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-[-1rem] peer-focus:-translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-[-1rem] peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs'
  const initialLabelTextColorInsideInput = hasError
    ? 'text-red-500 pb-[20px]'
    : 'text-black'
  const topStateLabelTextColor = 'text-white' // Or another color for floated state

  const finalLabelClasses = `
    ${baseLabelClasses}
    ${initialLabelTextColorInsideInput} 
    peer-focus:${topStateLabelTextColor}
    peer-[:not(:placeholder-shown)]:${topStateLabelTextColor}
  `
    .trim()
    .replace(/\s+/g, ' ')

  // Props for the actual input/textarea DOM element
  const inputElementProps = {
    id,
    className: combinedInputClasses,
    readOnly: readOnly,
    placeholder: placeholder, // Use the destructured placeholder
    ...register(id), // Correctly CALL register and spread its props
    ...rest, // Spread any other valid HTML attributes
  }

  return (
    <div className='relative form-item'>
      {type === 'textarea' ? (
        <textarea {...inputElementProps} rows={rows || 4} />
      ) : (
        <input type={type} {...inputElementProps} />
      )}
      <label htmlFor={id} className={finalLabelClasses}>
        {label}
      </label>
      {errorMessage && (
        <p className='mt-1 text-sm text-white'>{errorMessage}</p>
      )}
    </div>
  )
}
