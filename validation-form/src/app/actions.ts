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
  submissionId?: bigint
  success: boolean
  errorDetail?: string
}

export async function submitContactForm(
  prevState: SubmitFormState | undefined,
  formData: FormData
): Promise<SubmitFormState> {
  const logPrefix = '[Server Action submitContactForm]'
  console.log(`${logPrefix} Action invoked.`)

  // Convert FormData to a plain object suitable for Zod schema.
  const rawData: { [key: string]: string } = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      // Your current form doesn't have fields that would submit multiple values for the same name.
      // If a key were to appear multiple times with string values, this would take the last one.
      rawData[key] = value
    } else {
      // FormData values can also be File objects. Since your Zod schema expects strings
      // for all defined fields, we will ignore non-string values here.
      // If a required field in your Zod schema doesn't get a string value from FormData,
      // Zod's `parse` method will correctly identify it as a missing/invalid field.
      // For optional fields, not adding it here means Zod will see it as undefined, which is correct.
      console.warn(
        `${logPrefix} Value for key "${key}" from FormData was not a string (it was type: ${typeof value}). ` +
          `It will be treated as missing by Zod if the field is required, or undefined if optional.`
      )
    }
  }

  console.log(`${logPrefix} Raw data prepared for Zod validation:`, rawData) // Be mindful of logging sensitive data

  try {
    // 2. Validate request body with Zod schema
    console.log(`${logPrefix} Validating request body...`)
    const validatedData = refinedFormSchema.parse(rawData)
    console.log(`${logPrefix} Data validated successfully by Zod.`)

    // 3. Save data to database using Prisma
    console.log(`${logPrefix} Attempting to save submission to database...`)
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
        message: validatedData.message, // Will be undefined if not provided and optional
      },
    })
    console.log(
      `${logPrefix} Submission saved to Supabase. ID: ${submission.id}`
    )

    // 4. Send successful response
    return {
      message: 'Submission successful!',
      submissionId: submission.id,
      success: true,
    }
  } catch (error: unknown) {
    console.error(`${logPrefix} ERROR during POST request processing:`, error)

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
    if (!(error instanceof Error) && error) {
      try {
        console.error(
          `${logPrefix} Raw non-Error object stringified:`,
          JSON.stringify(error, null, 2)
        )
      } catch {
        console.error(`${logPrefix} Could not stringify raw non-Error object.`)
      }
    }

    return {
      message: 'An unexpected error occurred. Please try again later.',
      errorDetail: derivedErrorMessage,
      success: false,
    }
  }
}
