import { Prisma as RealPrismaNamespace } from '@prisma/client'
import { jest } from '@jest/globals'
import { DEFAULT_CONTACT_FORM_INITIAL_STATE } from '@/lib/types/forms'

import { z } from 'zod'
import { refinedFormSchema } from '@/lib/schemas'

const mockCreateDatabaseFn =
  jest.fn<
    (args: {
      data: z.infer<typeof refinedFormSchema>
    }) => Promise<ContactSubmissionReturnType>
  >()

jest.mock('@/lib/prisma', () => {
  console.log('MOCKING @/lib/prisma (Attempt 5 - with dynamic action import)')
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

describe('submitContactForm Server Action (with DYNAMIC action import)', () => {
  let submitContactFormActual: typeof import('@/app/actions').submitContactForm

  beforeEach(async () => {
    // Clear the mock before each test
    mockCreateDatabaseFn.mockClear()

    jest.resetModules()
    const actionsModule = await import('@/app/actions')
    submitContactFormActual = actionsModule.submitContactForm

    const mockedPrismaDefault = (
      jest.requireMock('@/lib/prisma') as {
        default: { contactSubmission: { create: jest.Mock } }
      }
    ).default
    expect(mockedPrismaDefault.contactSubmission.create).toBe(
      mockCreateDatabaseFn
    )
    console.log('VERIFY MOCK (v5 in beforeEach) passed.')
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
      // Use the dynamically imported action
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
    let prismaError
    try {
      prismaError = new RealPrismaNamespace.PrismaClientKnownRequestError(
        'Mocked P2002 Error',
        {
          code: 'P2002',
          clientVersion: 'test-client-version-v5',
          meta: { target: ['email'] },
        }
      )
    } catch (e: unknown) {
      console.error(
        'Error constructing RealPrismaNamespace.PrismaClientKnownRequestError (v5):',
        e instanceof Error ? e.message : String(e)
      )
      prismaError = {
        // Fallback
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        clientVersion: 'test-client-version-v5-fallback',
        meta: { target: ['email'] },
        message: 'Mocked P2002 Error (fallback object)',
      }
    }
    mockCreateDatabaseFn.mockRejectedValue(prismaError)

    const formData = createFormData(validRawData)
    const result = await submitContactFormActual(
      // Use the dynamically imported action
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(mockCreateDatabaseFn).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(false)
    // This part needs your actions.ts to correctly identify the error.
    // If the RealPrismaNamespace.PrismaClientKnownRequestError constructor still fails,
    // and you rely on the fallback, actions.ts must handle errors by checking properties like 'code'.
    expect(result.message).toBe(
      'Database error occurred. Could not save submission.'
    )
    expect(result.errors).toBeUndefined()
  })

  it('should return Zod validation errors and not call create', async () => {
    const invalidData = { ...validRawData, email: 'not-a-valid-email' }
    const formData = createFormData(invalidData)

    const result = await submitContactFormActual(
      // Use the dynamically imported action
      DEFAULT_CONTACT_FORM_INITIAL_STATE,
      formData
    )

    expect(result.success).toBe(false)
    expect(result.errors?.email).toBeDefined()
    expect(mockCreateDatabaseFn).not.toHaveBeenCalled()
  })
})
