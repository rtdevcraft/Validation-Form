import React from 'react'

interface FormSubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isFormValid: boolean
  isSubmitting: boolean
  buttonText?: string
  submittingText?: string
}

export function FormSubmitButton({
  isFormValid,
  isSubmitting,
  buttonText = 'Submit Contact Request',
  submittingText = 'Submitting...',
  className,
  ...rest
}: FormSubmitButtonProps) {
  const isDisabled = isSubmitting || !isFormValid

  const defaultButtonStyles =
    'inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white transition duration-150 ease-in-out bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed'

  const combinedClassName = `${defaultButtonStyles} ${className || ''}`
    .trim()
    .replace(/\s+/g, ' ')

  return (
    <button
      type='submit'
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={combinedClassName}
      {...rest}
    >
      {isSubmitting ? (
        <>
          <svg
            className='w-5 h-5 mr-3 -ml-1 text-white animate-spin'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            aria-hidden='true'
            role='status'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            ></path>
          </svg>
          {submittingText}
        </>
      ) : (
        buttonText
      )}
    </button>
  )
}
