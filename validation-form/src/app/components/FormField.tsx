import React from 'react'
import { UseFormRegister, Path, FieldValues } from 'react-hook-form'

interface FormFieldProps<TFieldValues extends FieldValues> {
  id: Path<TFieldValues>
  label: string
  register: UseFormRegister<TFieldValues>
  type?: string
  rows?: number
  readOnly?: boolean
  inputClassName?: string
  hasError?: boolean
  errorMessage?: string | null | undefined
  [key: string]: unknown
}

export const FormField = <TFieldValues extends FieldValues>({
  id,
  label,
  register,
  type = 'text',
  rows,
  readOnly,
  inputClassName = '',
  hasError,
  errorMessage,
  ...rest
}: FormFieldProps<TFieldValues>) => {
  const baseInputAndTextareaClasses =
    'peer block w-full appearance-none rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-0'

  const textColor = 'text-black'
  const bgColor = 'bg-white'

  const errorBorderClasses = 'border-red-500 border-5 focus:border-red-600'
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

  const topStateLabelTextColor = 'text-white'

  const finalLabelClasses = `
    ${baseLabelClasses}
    ${initialLabelTextColorInsideInput} 
    peer-focus:${topStateLabelTextColor}
    peer-[:not(:placeholder-shown)]:${topStateLabelTextColor}
  `
    .trim()
    .replace(/\s+/g, ' ')

  const fieldProps = {
    id,
    placeholder: ' ',
    className: combinedInputClasses,
    readOnly: readOnly,

    ...register(id),
    ...rest,
  }

  return (
    <div className='relative form-item'>
      {type === 'textarea' ? (
        <textarea {...fieldProps} rows={rows || 4} />
      ) : (
        <input type={type} {...fieldProps} />
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
