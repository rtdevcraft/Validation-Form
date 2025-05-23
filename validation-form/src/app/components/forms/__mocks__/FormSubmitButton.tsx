import React from 'react'

interface ButtonMockProps {
  isSubmitting: boolean
  isFormValid: boolean
}

const ButtonMock = ({ isSubmitting, isFormValid }: ButtonMockProps) => (
  <button type='submit' disabled={isSubmitting || !isFormValid}>
    {isSubmitting ? 'Submitting...' : 'Submit'}
  </button>
)

export const FormSubmitButton = jest.fn(ButtonMock)
