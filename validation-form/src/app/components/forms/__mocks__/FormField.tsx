import React from 'react'

const FormFieldMock = (
  // We use `any` here because this is a mock and we don't need strict prop typing.
  { id, label, register, hasError, errorMessage, type, ...rest }: any // eslint-disable-line @typescript-eslint/no-explicit-any
) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      data-testid={`input-${id}`} // data-testid is useful for selecting elements in tests
      name={id}
      type={type || 'text'}
      aria-invalid={hasError ? 'true' : 'false'}
      // This correctly simulates passing the necessary props to the input
      {...(register ? register(id) : { name: id })}
      {...rest}
    />
    {/* This ensures error messages are displayed when they should be */}
    {hasError && errorMessage && (
      <p role='alert' data-testid={`error-${id}`}>
        {String(errorMessage.message || errorMessage)}
      </p>
    )}
  </div>
)

// We export a jest.fn() that wraps our mock. This allows us to inspect
// its usage (e.g., how many times it was called) in our tests.
export const FormField = jest.fn(FormFieldMock)
