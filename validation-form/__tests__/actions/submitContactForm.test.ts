import { jest } from '@jest/globals'
import { DEFAULT_CONTACT_FORM_INITIAL_STATE } from '@/lib/types/forms'
import { z } from 'zod'
import { refinedFormSchema } from '@/lib/schemas'
// import type { SubmitFormState } from '@/lib/types/forms';

// Define the return type for the mocked database call
interface ContactSubmissionReturnType {
  id: bigint
  name: string
  email: string
  phone: string
  streetAddress: string
  city: string
  stateProvince: string
  country: string
  postalCode: string
  message: string | null
  createdAt: Date
}

const mockCreateDatabaseFn =
  jest.fn<
    (args: {
      data: z.infer<typeof refinedFormSchema>
    }) => Promise<ContactSubmissionReturnType>
  >()

jest.mock('@/lib/prisma', () => {
  return {
    __esModule: true,
    default: {
      contactSubmission: {
        create: mockCreateDatabaseFn,
      },
    },
  }
})

const createFormData = (data: Record<string, string | undefined>): FormData => {
  const formData = new FormData()
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key]
      if (value !== undefined) {
        formData.append(key, value)
      }
    }
  }
  return formData
}

const validRawData = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+12345678910',
  streetAddress: '123 Test St',
  city: 'Testville',
  stateProvince: 'TS',
  country: 'US',
  postalCode: '12345',
  message: 'Hello server action',
}

describe('submitContactForm Server Action (with DYNAMIC action import)', () => {
  let submitContactFormActual: typeof import('@/app/actions').submitContactForm

  beforeEach(async () => {
    mockCreateDatabaseFn.mockClear()
    jest.resetModules() // Important for re-importing the action with fresh mocks

    const actionsModule = await import('@/app/actions')
    submitContactFormActual = actionsModule.submitContactForm

    // Verify the mock is correctly applied (optional, can be removed if confident)
    const mockedPrismaDefault = (
      jest.requireMock('@/lib/prisma') as {
        default: { contactSubmission: { create: jest.Mock } }
      }
    ).default
    expect(mockedPrismaDefault.contactSubmission.create).toBe(
      mockCreateDatabaseFn
    )
  })

  it('should successfully process and save valid data', async () => {
    const mockSubmission: ContactSubmissionReturnType = {
      id: BigInt(1),
      ...validRawData,
      message: validRawData.message || null,
      createdAt: new Date(),
    }
    mockCreateDatabaseFn.mockResolvedValue(mockSubmission)

    const formData = createFormData(validRawData)
    const result = await submitContactFormActual(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(mockCreateDatabaseFn).toHaveBeenCalledTimes(1)
    expect(mockCreateDatabaseFn).toHaveBeenCalledWith({
      data: {
        name: validRawData.name,
        email: validRawData.email,
        phone: validRawData.phone,
        streetAddress: validRawData.streetAddress,
        city: validRawData.city,
        stateProvince: validRawData.stateProvince,
        country: validRawData.country,
        postalCode: validRawData.postalCode,
        message: validRawData.message || null,
      },
    })
    expect(result.success).toBe(true)
    expect(result.message).toBe('Submission successful!')
    expect(result.submissionId).toBe('1')
    expect(result.errors).toBeUndefined()
  })

  it('should handle PrismaClientKnownRequestError when create rejects', async () => {
    const prismaError = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      clientVersion: 'test-client-version-in-test',
      meta: { target: ['email'] },
      message: 'Mocked P2002 Error (simulated for test)',
    }
    mockCreateDatabaseFn.mockRejectedValue(prismaError)

    const formData = createFormData(validRawData)
    const result = await submitContactFormActual(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(mockCreateDatabaseFn).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(false)
    // This relies on your action's duck-typing or instanceof check (if it were to work with a more complex mock)
    expect(result.message).toBe(
      'Database error occurred. Could not save submission.'
    )
    expect(result.errors).toBeUndefined()
  })

  it('should return Zod validation errors and not call create', async () => {
    const invalidData = { ...validRawData, email: 'not-a-valid-email' }
    const formData = createFormData(invalidData)

    const result = await submitContactFormActual(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(result.success).toBe(false)
    expect(result.errors?.email).toBeDefined()
    expect(mockCreateDatabaseFn).not.toHaveBeenCalled()
  })

  // Add more tests as needed, for example, for other Prisma error codes if handled differently,
  // or for generic errors.
  it('should handle a generic error when create rejects with an unknown error', async () => {
    const genericError = new Error('Something unexpected went wrong')
    mockCreateDatabaseFn.mockRejectedValue(genericError)

    const formData = createFormData(validRawData)
    const result = await submitContactFormActual(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(mockCreateDatabaseFn).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(false)
    expect(result.message).toBe(
      'An unexpected server error occurred. Please try again later.'
    )
    expect(result.errors).toBeUndefined()
  })

  it('should handle PrismaClientKnownRequestError when create rejects', async () => {
    const prismaErrorObject = {
      // Use a plain object for the mock error
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      clientVersion: 'test-client-version-in-test',
      meta: { target: ['email'] },
      message: 'Mocked P2002 Error (simulated for test)',
    }
    mockCreateDatabaseFn.mockRejectedValue(prismaErrorObject)

    const formData = createFormData(validRawData)
    // The action should internally handle the instanceof TypeError and proceed
    const result = await submitContactFormActual(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(mockCreateDatabaseFn).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(false)
    expect(result.message).toBe(
      'Database error occurred. Could not save submission.'
    )
    expect(result.errors).toBeUndefined()
  })

  it('should handle a generic error when create rejects with an unknown error', async () => {
    const genericError = new Error('Something unexpected went wrong')
    mockCreateDatabaseFn.mockRejectedValue(genericError)

    const formData = createFormData(validRawData)
    const result = await submitContactFormActual(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(mockCreateDatabaseFn).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(false)
    // This was the message your action was returning based on previous logs
    expect(result.message).toBe(
      'An unexpected server error occurred. Please try again later.'
    )
    expect(result.errors).toBeUndefined()
  })
})
