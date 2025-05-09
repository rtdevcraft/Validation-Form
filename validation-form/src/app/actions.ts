'use server'

import { PrismaClient, Prisma } from '@prisma/client'
import { z } from 'zod'
import { refinedFormSchema } from '@/lib/schemas'

// --- Prisma Client Initialization ---
let prisma: PrismaClient
const prismaLogPrefix = '[Server Action Prisma]'

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
  console.log(
    `${prismaLogPrefix} Initialized new Prisma Client for production.`
  )
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient()
    console.log(
      `${prismaLogPrefix} Initialized new global Prisma Client for development.`
    )
  }
  prisma = global.prisma
}

// Define a state type for the Server Action's response
export interface SubmitFormState {
  message: string
  errors?: Partial<Record<keyof z.infer<typeof refinedFormSchema>, string[]>>
  submissionId?: string
  success: boolean
  errorDetail?: string
}

export async function submitContactForm(
  prevState: SubmitFormState | undefined,
  formData: FormData
): Promise<SubmitFormState> {
  const logPrefix = '[Server Action submitContactForm]'
  console.log(`${logPrefix} Action invoked.`)
  console.time(`${logPrefix} Total Execution Time`) // <--- START Total Timer

  const rawData: { [key: string]: string } = {}
  console.time(`${logPrefix} FormData Processing`) // <--- START FormData Processing Timer
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      rawData[key] = value
    } else {
      console.warn(
        `${logPrefix} Value for key "${key}" from FormData was not a string (it was type: ${typeof value}). ` +
          `It will be treated as missing by Zod if the field is required, or undefined if optional.`
      )
    }
  }
  console.timeEnd(`${logPrefix} FormData Processing`) // <--- END FormData Processing Timer
  console.log(`${logPrefix} Raw data prepared for Zod validation:`, rawData)

  try {
    console.time(`${logPrefix} Zod Validation`) // <--- START Zod Validation Timer
    const validatedData = refinedFormSchema.parse(rawData)
    console.timeEnd(`${logPrefix} Zod Validation`) // <--- END Zod Validation Timer
    console.log(`${logPrefix} Data validated successfully by Zod.`)

    console.time(`${logPrefix} Prisma Create`) // <--- START Prisma Create Timer
    const submission = await prisma.contactSubmission.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        streetAddress: validatedData.streetAddress,
        city: validatedData.city,
        stateProvince: validatedData.stateProvince,
        country: validatedData.country,
        postalCode: validatedData.postalCode,
        message: validatedData.message,
      },
    })
    console.timeEnd(`${logPrefix} Prisma Create`) // <--- END Prisma Create Timer
    console.log(
      // You mentioned Supabase here, but your client is Prisma. Assuming Prisma is interacting with your DB (which could be hosted on Supabase).
      `${logPrefix} Submission saved to Database. ID: ${submission.id}`
    )

    console.timeEnd(`${logPrefix} Total Execution Time`) // <--- END Total Timer for success path
    return {
      message: 'Submission successful!',
      submissionId: submission.id.toString(),
      success: true,
    }
  } catch (error: unknown) {
    console.error(`${logPrefix} ERROR during processing:`, error)
    console.timeEnd(`${logPrefix} Total Execution Time`) // <--- END Total Timer for error path

    if (error instanceof z.ZodError) {
      console.error(
        `${logPrefix} Zod Validation Error details:`,
        error.flatten().fieldErrors
      )
      return {
        message: 'Validation failed. Please check the highlighted fields.',
        errors: error.flatten().fieldErrors as SubmitFormState['errors'],
        success: false,
      }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        `${logPrefix} Prisma Error Code: ${error.code}. Message: ${error.message}`
      )
      return {
        message: 'Database error occurred. Could not save submission.',
        success: false,
      }
    }

    const derivedErrorMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected server error occurred.'
    console.error(
      `${logPrefix} Generic Unhandled Error. Derived message: ${derivedErrorMessage}`
    )

    return {
      message: 'An unexpected error occurred. Please try again later.',
      errorDetail: derivedErrorMessage,
      success: false,
    }
  }
}
