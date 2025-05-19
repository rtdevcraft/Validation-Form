import {
  submitContactForm,
  DEFAULT_CONTACT_FORM_INITIAL_STATE,
} from '@/app/actions'
import { Prisma as RealPrismaNamespace } from '@prisma/client' // For error types
import { jest } from '@jest/globals'

// --- Mocking '@/lib/prisma' ---

jest.mock('@/lib/prisma', () => {
  // Create the mock function instance INSIDE the factory
  const mockCreateFn = jest.fn()
  return {
    __esModule: true,
    default: {
      contactSubmission: {
        create: mockCreateFn,
      },
      // Expose the mock function itself on the default export if needed for direct access after requireMock

      mockedCreateForTests: mockCreateFn,
    },
  }
})
// --- End of Mocking '@/lib/prisma' ---

// Helper function
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

describe('submitContactForm Server Action (with lib/prisma mocked reliably)', () => {
  let prismaCreateMock: jest.Mock // This will hold our mock function

  beforeEach(() => {
    // Get the mocked default export of '@/lib/prisma'
    // jest.requireMock ensures we get the version from our jest.mock factory
    const mockedPrismaLib = jest.requireMock('@/lib/prisma').default

    // Access the exposed mock function
    prismaCreateMock = mockedPrismaLib.mockedCreateForTests as jest.Mock

    // Sanity check: Ensure it's a mock function
    if (typeof prismaCreateMock?.mockClear !== 'function') {
      throw new Error(
        "Failed to retrieve 'mockedCreateForTests' as a mock function from the mocked '@/lib/prisma' module. Check the jest.mock() setup."
      )
    }
    prismaCreateMock.mockClear()
  })

  it('should successfully process and save valid data', async () => {
    const mockSubmission: ContactSubmissionReturnType = {
      id: BigInt(1),
      ...validRawData,
      message: validRawData.message || null,
      createdAt: new Date(),
    }
    prismaCreateMock.mockResolvedValue(mockSubmission)

    const formData = createFormData(validRawData)
    const result = await submitContactForm(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(prismaCreateMock).toHaveBeenCalledWith({
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

  it('should handle PrismaClientKnownRequestError during database operation', async () => {
    const prismaError = new RealPrismaNamespace.PrismaClientKnownRequestError(
      'Test Prisma Error: Unique constraint failed',
      { code: 'P2002', clientVersion: 'x.y.z', meta: { target: ['email'] } }
    )
    prismaCreateMock.mockRejectedValue(prismaError)

    const formData = createFormData(validRawData)
    const result = await submitContactForm(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(prismaCreateMock).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(false)
    expect(result.message).toBe(
      'Database error occurred. Could not save submission.'
    )
    expect(result.errors).toBeUndefined()
  })

  it('should return Zod validation errors for invalid data', async () => {
    const invalidData = { ...validRawData, email: 'not-an-email' }
    const formData = createFormData(invalidData)
    const result = await submitContactForm(
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      'Validation failed. Please check the highlighted fields.'
    )
    expect(result.errors?.email).toContain('Invalid email address.')
    expect(prismaCreateMock).not.toHaveBeenCalled()
  })
})
