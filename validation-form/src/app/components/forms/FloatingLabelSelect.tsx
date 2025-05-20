import React, { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'

export interface SelectOption {
  value: string
  label: string
}

interface FloatingLabelSelectProps {
  id: string
  label: string
  options: SelectOption[]
  value: string | undefined | null
  onChange: (value: string | undefined) => void
  onBlur?: () => void
  hasError?: boolean
  errorMessage?: string | null | undefined
  name?: string
  className?: string
  buttonClassName?: string
  placeholder?: string
}

export const FloatingLabelSelect: React.FC<FloatingLabelSelectProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  onBlur,
  hasError,
  errorMessage,
  name,
  className = '',
  buttonClassName = '',
  placeholder = `Select your ${label.toLowerCase()}`,
  ...rest
}) => {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <div className={`form-item relative ${className}`}>
      <Listbox value={value} onChange={onChange} name={name} {...rest}>
        {({ open }) => {
          // 'open' state indicates if the Listbox is open (focused)
          const isLabelUp = open || !!value // Label is up if open/focused OR a value is selected

          // --- Listbox.Button Styling (acts as the input field and peer) ---

          const baseButtonStyles =
            'peer block w-full appearance-none flex items-center h-[45px] pl-[20px] rounded-lg border focus:outline-none hover: cursor-pointer focus:ring-0 text-left'
          const buttonBgColor = 'bg-white'
          const buttonTextColor = 'text-black'

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

          // --- Floating Label Styling ---
          const labelBasePositionAndTransition =
            'absolute z-10 origin-[0] transform duration-200 ease-in-out bg-transparent px-1 hover: cursor-pointer left-4'

          const labelDownStyles = 'top-3 text-base left-4 hover:cursor-pointer'
          const labelDownColor = hasError ? 'text-red-500' : 'text-black'

          const labelUpStyles = 'top-[-1rem] -translate-y-0 text-xs' // "Up" position and size
          const labelUpColor = 'text-white' // "Up" color

          const finalLabelClasses = `
            ${labelBasePositionAndTransition}
            ${
              isLabelUp
                ? `${labelUpStyles} ${labelUpColor}`
                : `${labelDownStyles} ${labelDownColor}`
            }
          `
            .trim()
            .replace(/\s+/g, ' ')

          const errorMessageClasses = `mt-1 text-sm ${
            hasError ? 'text-red-300' : 'text-gray-400'
          }`

          return (
            <div>
              <Listbox.Button
                id={id}
                className={combinedButtonClasses}
                onBlur={onBlur} // Attach onBlur here
              >
                <span className='block truncate'>
                  {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className='absolute inset-y-0 right-0 flex items-center pr-2'>
                  <ChevronUpDownIcon
                    className='w-5 h-5 text-gray-400'
                    aria-hidden='true'
                  />
                </span>
              </Listbox.Button>

              <Transition
                as={Fragment}
                show={open} // Control visibility based on 'open' state
                leave='transition ease-in duration-100'
                leaveFrom='opacity-100'
                leaveTo='opacity-0'
              >
                <Listbox.Options className='absolute z-20 w-full mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 hover:cursor-pointer focus:outline-none sm:text-sm'>
                  {options.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      className={({ active }) =>
                        `relative hover:cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'text-gray-900'
                        }`
                      }
                      value={option.value} // onChange will receive this value
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`block truncate pl-3 ${
                              selected
                                ? 'font-medium text-indigo-600'
                                : 'font-normal'
                            }`}
                          >
                            {option.label}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center ${
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

              {/* The Floating Label: Positioned relative to the parent div */}
              <label htmlFor={id} className={finalLabelClasses}>
                {label}
              </label>

              {errorMessage && (
                <p className={errorMessageClasses}>{errorMessage}</p>
              )}
            </div>
          )
        }}
      </Listbox>
    </div>
  )
}
