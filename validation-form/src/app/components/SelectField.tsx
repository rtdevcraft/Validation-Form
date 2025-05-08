import React from 'react'
import { UseFormRegister, Path, FieldValues } from 'react-hook-form'

interface SelectFieldProps<TFieldValues extends FieldValues> {
  id: Path<TFieldValues>
  label: string
  options: { value: string; label: string }[]
  register: UseFormRegister<TFieldValues>
  hasError?: boolean
  errorMessage?: string | null | undefined
  placeholderText?: string
  className?: string
  selectClassName?: string
  [key: string]: unknown
}

export const SelectField = <TFieldValues extends FieldValues>({
  id,
  label,
  options,
  register,
  hasError,
  errorMessage,
  placeholderText,
  className = '',
  selectClassName = '',
  ...rest
}: SelectFieldProps<TFieldValues>) => {
  const effectivePlaceholderText =
    placeholderText || `Select a ${label.toLowerCase()}`

  // Base Tailwind classes for the select element
  const baseSelectStyles =
    'block w-full px-3 py-3 border bg-white text-black rounded-md shadow-sm hover:cursor-pointer focus:outline-none sm:text-sm'

  // Conditional Tailwind classes for error and normal states
  const statefulSelectStyles = hasError
    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
    : 'border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

  // Combine all classes for the <select> element
  const combinedSelectClasses = `
    ${baseSelectStyles}
    ${statefulSelectStyles}
    ${selectClassName}
  `
    .trim()
    .replace(/\s+/g, ' ')

  const labelClasses = `block mb-1 text-sm font-medium ${
    hasError ? 'text-red-300' : 'text-gray-200'
  }`

  // Error message styling
  const errorMessageClasses = 'mt-1 text-sm text-red-300'
  return (
    <div className={`form-item ${className}`}>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      <select
        id={id}
        {...register(id)}
        className={combinedSelectClasses}
        {...rest}
      >
        <option value='' disabled>
          {effectivePlaceholderText}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage && <p className={errorMessageClasses}>{errorMessage}</p>}
    </div>
  )
}
