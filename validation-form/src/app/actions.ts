'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { refinedFormSchema } from '@/lib/schemas'
import { SubmitFormState } from '@/lib/types/forms'

export async function submitContactForm(
  prevState: unknown,
  formData: FormData
): Promise<{
  message: string
  errors?: Record<string, string[]> | undefined
  success: boolean
  submissionId?: string | undefined
  // Consider if errorDetail should be part of this return type if used in catch blocks
}> {
  const logPrefix = '[Server Action submitContactForm]' // Re-added for logging context

  const rawData: { [key: string]: string } = {}

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      rawData[key] = value
    } else {
      // Log a warning for non-string form data values, as this can affect validation
      console.warn(
        `${logPrefix} Value for key "${key}" from FormData was not a string (it was type: ${typeof value}). ` +
          `It will be treated as missing by Zod if the field is required, or undefined if optional.`
      )
    }
  }

  try {
    const validatedData = refinedFormSchema.parse(rawData)

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

    return {
      message: 'Submission successful!',
      submissionId: submission.id.toString(),
      success: true,
    }
  } catch (error: unknown) {
    // Log the overarching error first
    console.error(`${logPrefix} ERROR during processing:`, error)

    if (error instanceof z.ZodError) {
      // Log Zod validation error details for server-side debugging
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

    let isEssentiallyPrismaKnownError = false
    try {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        isEssentiallyPrismaKnownError = true
      }
    } catch (instanceofError) {
      // Log if the instanceof check itself fails (e.g., environment issues)
      console.warn(
        `${logPrefix} instanceof Prisma.PrismaClientKnownRequestError failed:`,
        instanceofError
      )
    }

    if (
      !isEssentiallyPrismaKnownError &&
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'clientVersion' in error
    ) {
      isEssentiallyPrismaKnownError = true
    }

    if (isEssentiallyPrismaKnownError) {
      const knownError = error as Prisma.PrismaClientKnownRequestError
      // Log Prisma error details for server-side debugging
      console.error(
        `${logPrefix} Prisma Error Code: ${knownError.code}. Message: ${
          knownError.message || '(No message property)'
        }`
      )
      return {
        message: 'Database error occurred. Could not save submission.',
        success: false,

        // errorDetail: `Prisma Error Code: ${knownError.code}`
      }
    }

    // Generic fallback for any other type of error
    const derivedErrorMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected server error occurred, and the error type is unknown.'

    // Log the generic error details for server-side debugging
    console.error(
      `${logPrefix} Generic Unhandled Error. Original Error:`,
      error,
      `Derived message: ${derivedErrorMessage}`
    )

    return {
      message: 'An unexpected error occurred. Please try again later.',
      success: false,
      // errorDetail: derivedErrorMessage // Optionally provide more detail
    }
  }
}
