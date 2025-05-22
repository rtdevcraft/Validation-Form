// src/app/components/forms/FormField.tsx
import React from 'react'
import { UseFormRegister, Path, FieldValues, FieldError } from 'react-hook-form'

interface FormFieldProps<TFieldValues extends FieldValues>
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement> &
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'id'
  > {
  id: Path<TFieldValues>
  label: string
  register: UseFormRegister<TFieldValues>
  type?: string // e.g., 'text', 'email', 'tel', 'textarea'
  rows?: number // For textarea
  readOnly?: boolean
  inputClassName?: string // Custom classes for the input/textarea itself
  hasError?: boolean
  errorMessage?: string | null | undefined | FieldError // Can also be FieldError from RHF
  placeholder?: string // Placeholder from config, passed via commonProps
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
  placeholder, // This is the placeholder from the config (via commonProps)
  ...rest // Other HTML attributes
}: FormFieldProps<TFieldValues>) => {
  const isTextarea = type === 'textarea'

  const baseInputAndTextareaClasses =
    'peer block w-full appearance-none rounded-lg border px-4 py-3 text-lg focus:outline-none focus:ring-0'
  const textColor = 'text-black'
  const bgColor = 'bg-white'

  const errorBorderClasses = 'border-red-500 border-[4px] focus:border-red-500'
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

  // --- Label Styling ---
  // Base styles for the label, always absolute positioned.
  // `origin-[0]` ensures scaling transforms originate from the top-left.
  const baseLabelClasses =
    'absolute z-10 origin-[0] transform duration-200 ease-in-out bg-transparent px-1 pointer-events-none left-4'

  // Styles for the label when it's "down" (acting as a placeholder inside the input area)
  const placeholderStateLabelStyles = 'top-1/2 -translate-y-1/2 text-md'
  // Styles for the label when it's "up" (floated above the input)
  const floatedStateLabelStyles = 'top-[-1rem] -translate-y-1'

  // Text color when the label is "down" and acting as a placeholder
  const placeholderStateLabelColor = hasError ? 'text-white' : 'text-black'
  // Text color when the label is "up" (floated) OR when the input is focused
  const floatedOrFocusedLabelColor = hasError ? 'text-black' : 'text-white'
  // If you want the "up" (due to value) and "up" (due to focus) to have different colors,
  // you'd need to be more specific, e.g., peer-focus:text-indigo-600 and peer-[:not(:placeholder-shown)]:text-some-other-color

  const finalLabelClasses = `
    ${baseLabelClasses}
    ${placeholderStateLabelColor} /* Default color when it might be acting as placeholder */
    
    peer-placeholder-shown:${placeholderStateLabelStyles}
    /* Retain placeholderStateLabelColor if placeholder is shown and input not focused */
    peer-placeholder-shown:peer-not-focus:${placeholderStateLabelColor} 

    peer-focus:${floatedStateLabelStyles}
    peer-focus:${floatedOrFocusedLabelColor}
    
    peer-[:not(:placeholder-shown)]:${floatedStateLabelStyles}
    peer-[:not(:placeholder-shown)]:${floatedOrFocusedLabelColor}
  `
    .trim()
    .replace(/\s+/g, ' ')

  // Determine the effective placeholder for the input DOM element.
  // If a placeholder is explicitly passed from config, use it.
  // Otherwise, for text-like inputs where we want the label to act as placeholder,
  // we use a single space. This space is what :placeholder-shown reacts to.
  let effectiveDOMPlaceholder: string | undefined = placeholder
  if (placeholder === undefined && !isTextarea) {
    // For non-textarea fields, if no placeholder is given,
    // use a single space to enable the :placeholder-shown CSS pseudo-class.
    // This helps the label behave as a placeholder.
    effectiveDOMPlaceholder = ' '
  }
  // For textareas, if placeholder is undefined, it will render without a placeholder attribute.
  // This means its label will float up by default (due to peer-[:not(:placeholder-shown)]).
  // If you want textareas to also have the "label down" effect, apply ' ' or pass it in config.

  const inputElementProps = {
    id,
    className: combinedInputClasses,
    readOnly,
    placeholder: effectiveDOMPlaceholder,
    ...register(id), // Spread RHF props (name, onChange, onBlur, ref)
    ...rest, // Spread other native HTML attributes
  }

  // Get the actual error message string if errorMessage is a FieldError object
  const displayErrorMessage =
    typeof errorMessage === 'object' && errorMessage?.message
      ? errorMessage.message
      : errorMessage

  return (
    <div className='relative form-item'>
      {isTextarea ? (
        <textarea
          {...inputElementProps}
          // Textareas typically use the explicitly provided placeholder, not the space trick.
          // If 'placeholder' prop is undefined, 'effectiveDOMPlaceholder' for textarea will also be undefined.
          placeholder={placeholder}
          rows={rows || 4}
        />
      ) : (
        <input type={type} {...inputElementProps} />
      )}
      <label htmlFor={id} className={finalLabelClasses}>
        {label}
      </label>
      {hasError && displayErrorMessage && (
        <p className='mt-1 text-xs text-white'>{String(displayErrorMessage)}</p>
      )}
    </div>
  )
}
