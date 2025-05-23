import { FloatingLabelSelectProps } from '../FloatingLabelSelect'
import React from 'react'

const SelectMock = ({
  id,
  label,
  options,
  hasError,
  errorMessage,
  placeholder,
  ...rest
}: FloatingLabelSelectProps) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <select {...rest} id={id} data-testid={`select-${id}`}>
      {placeholder && <option value=''>{placeholder}</option>}
      {(options || []).map((opt: { value: string; label: string }) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {hasError && <p role='alert'>{errorMessage}</p>}
  </div>
)

export const FloatingLabelSelect = jest.fn(SelectMock)
