import React, { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { FieldError } from 'react-hook-form' // For more specific errorMessage type

export interface SelectOption {
  value: string // Assuming value is always string, adjust if it can be other types
  label: string
}

export interface FloatingLabelSelectProps {
  id: string
  label: string
  options: SelectOption[]
  value: string | undefined | null // Current selected value from RHF
  onChange: (value: string | undefined) => void // RHF's onChange
  onBlur?: () => void // RHF's onBlur
  hasError?: boolean
  errorMessage?: string | null | undefined | FieldError
  name?: string
  className?: string // For the outermost div
  buttonClassName?: string // Extra classes for the Listbox.Button
  placeholder?: string // Text to display in button when no value selected
  // Allow other valid Listbox props via ...rest
  [key: string]:
    | string
    | number
    | boolean
    | undefined
    | null
    | ((value?: string | undefined) => void)
    | SelectOption[]
    | FieldError
}

export const FloatingLabelSelect: React.FC<FloatingLabelSelectProps> = ({
  id,
  label,
  options,
  value, // Current value from RHF. Could be '', undefined, or null for "empty"
  onChange,
  onBlur,
  hasError,
  errorMessage,
  name,
  className = '',
  buttonClassName = '', // User-provided classes for the button
  placeholder: propPlaceholder, // Placeholder text from config
  ...rest // Spreads to Listbox itself
}) => {
  const selectedOption = options.find((option) => option.value === value)

  // Determine the text to display inside the Listbox.Button
  const buttonDisplayText = selectedOption
    ? selectedOption.label
    : propPlaceholder === undefined
    ? `Select ${label.toLowerCase()}`
    : propPlaceholder
  // If propPlaceholder is ' ', it will display a space.

  return (
    <div className={`form-item relative ${className}`}>
      <Listbox
        value={value ?? ''} // Ensure Listbox always gets a string or a defined "empty" value
        onChange={(selectedValue) => {
          // RHF typically expects undefined to clear a field, or an empty string.
          // Adjust if your RHF setup expects null or something else for empty.
          onChange(selectedValue === '' ? undefined : selectedValue)
        }}
        name={name}
        {...rest} // Spread other Listbox props (e.g., disabled)
      >
        {({ open }) => {
          // Determine if the label should be in the "up" (floated) state:
          // - If the Listbox is open (acting like focus)
          // - OR if there's a distinct selected value (not empty string, null, or undefined)
          const hasValue = value !== undefined && value !== null && value !== ''
          const isLabelUp = open || hasValue

          // --- Listbox.Button Styling ---
          const baseButtonStyles =
            'block w-full appearance-none flex items-center h-[53px] rounded-lg border px-4 py-3 text-sm focus:outline-none hover:cursor-pointer focus:ring-0 text-left'
          const buttonBgColor = 'bg-white'
          // Text color of the button: dimmed if showing placeholder, normal if showing selected value
          const buttonTextColor = hasValue ? 'text-black' : 'text-gray-500'

          const errorBorderClasses =
            'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
          const normalBorderClasses =
            'border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

          const combinedButtonClasses = `
            ${baseButtonStyles}
            ${buttonBgColor}
            ${buttonTextColor}
            ${hasError ? errorBorderClasses : normalBorderClasses}
            ${buttonClassName} 
          `
            .trim()
            .replace(/\s+/g, ' ')

          // --- Floating Label Styling (Consistent with FormField) ---
          const labelBaseStyles =
            'absolute z-10 origin-[0] transform duration-200 ease-in-out bg-transparent px-1 pointer-events-none left-4'

          const labelDownStyles = 'top-1/2 -translate-y-1/2' // Centered, normal size
          const labelUpStyles = 'top-[-1rem] -translate-y-2 text-sm' // Floated up, smaller size

          const labelDownColor = hasError ? 'text-red-500' : 'text-black' // Color when label is "down"
          const labelUpColor = hasError ? 'text-red-600' : 'text-white' // Color when label is "up" or input focused

          const finalLabelClasses = `
            ${labelBaseStyles}
            ${
              isLabelUp
                ? `${labelUpStyles} ${labelUpColor}`
                : `${labelDownStyles} ${labelDownColor}`
            }
          `
            .trim()
            .replace(/\s+/g, ' ')

          const displayErrorMessage =
            typeof errorMessage === 'object' && errorMessage?.message
              ? errorMessage.message
              : errorMessage

          return (
            <div className='relative'>
              {' '}
              {/* Using React.Fragment to group elements for Headless UI render prop */}
              {/* The actual Listbox.Button that user interacts with */}
              <Listbox.Button
                id={id}
                className={combinedButtonClasses}
                onBlur={onBlur} // Pass RHF's onBlur to the button
              >
                <span className='block truncate'>{buttonDisplayText}</span>
                <span className='absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none'>
                  <ChevronUpDownIcon
                    className='w-5 h-5 text-gray-400'
                    aria-hidden='true'
                  />
                </span>
              </Listbox.Button>
              {/* The Floating Label: Positioned relative to the parent div.
                  It's visually separate but associated via htmlFor={id}.
                  Clicking it should ideally focus the Listbox.Button.
                  Headless UI's Listbox often manages focus well once the button is focused.
              */}
              <label htmlFor={id} className={finalLabelClasses}>
                {label}
              </label>
              {/* Dropdown Options Panel */}
              <Transition
                as={Fragment}
                show={open} // Controlled by Listbox's internal state
                leave='transition ease-in duration-100'
                leaveFrom='opacity-100'
                leaveTo='opacity-0'
              >
                <Listbox.Options className='absolute z-20 w-full mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm'>
                  {/* Optional: You might want an explicit "empty" or "placeholder" option if clearable */}
                  {/*
                  <Listbox.Option value="">
                    {({ selected, active }) => (
                      <div className={`relative select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}`}>
                        <span className={`block truncate ${selected ? 'font-medium text-indigo-600' : 'font-normal'}`}>
                          {displayPlaceholder}
                        </span>
                      </div>
                    )}
                  </Listbox.Option>
                  */}
                  {options.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      className={({ active }) =>
                        `relative select-none py-2 pl-10 pr-4 ${
                          active
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'text-gray-900'
                        }`
                      }
                      value={option.value} // This is what onChange receives
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected
                                ? 'font-medium text-indigo-600'
                                : 'font-normal'
                            }`}
                          >
                            {option.label}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? 'text-indigo-900' : 'text-indigo-600'
                              }`}
                            >
                              <CheckIcon
                                className='w-5 h-5'
                                aria-hidden='true'
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
              {/* Error Message Display */}
              {hasError && displayErrorMessage && (
                <p className='mt-1 text-xs text-red-600'>
                  {String(displayErrorMessage)}
                </p>
              )}
            </div>
          )
        }}
      </Listbox>
    </div>
  )
}
