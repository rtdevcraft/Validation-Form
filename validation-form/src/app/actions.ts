// src/app/actions.ts
'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client' // Ensure Prisma is imported for type checking
import { z } from 'zod'
import { refinedFormSchema } from '@/lib/schemas'
import type { SubmitFormState } from '@/lib/types/forms'

export async function submitContactForm(
  prevState: SubmitFormState, // Or unknown, if you prefer for initial state
  formData: FormData
): Promise<SubmitFormState> {
  const rawData: { [key: string]: unknown } = {}
  for (const [key, value] of formData.entries()) {
    rawData[key] = value
  }

  try {
    // 1. Validate data
    const validatedData = refinedFormSchema.parse(rawData)

    // 2. Perform database operation
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
      submissionId: submission.id.toString(), // Ensure ID is converted to string if necessary
      success: true,
      errors: undefined,
    }
  } catch (error: unknown) {
    // --- Main Error Handling Block ---

    // A. Handle Zod Validation Errors
    if (error instanceof z.ZodError) {
      return {
        message: 'Validation failed. Please check the highlighted fields.',
        errors: error.flatten().fieldErrors as SubmitFormState['errors'],
        success: false,
      }
    }

    // B. Handle Prisma Errors (and other potential database errors)
    let isEssentiallyPrismaKnownError = false

    // B.1. Attempt instanceof check for PrismaClientKnownRequestError defensively
    try {
      if (
        Prisma && // Check if Prisma namespace itself is defined
        typeof Prisma.PrismaClientKnownRequestError === 'function' && // Check if the constructor is a function
        error instanceof Prisma.PrismaClientKnownRequestError
      ) {
        isEssentiallyPrismaKnownError = true
      }
    } catch (_instanceofCheckError) {
      // This catch is specifically for TypeErrors or other issues
      // if the 'instanceof' check itself fails (common in test environments).
      // We can log this for server-side debugging if needed, but avoid crashing.
      // console.warn('[submitContactForm] The `instanceof Prisma.PrismaClientKnownRequestError` check itself caused an error:', _instanceofCheckError);
      // Continue to duck-typing
    }

    // B.2. Duck-typing as a fallback or primary check if instanceof is unreliable
    if (
      !isEssentiallyPrismaKnownError &&
      typeof error === 'object' &&
      error !== null &&
      'code' in error && // Prisma errors have a 'code'
      'clientVersion' in error && // Prisma errors usually have a 'clientVersion'
      ('message' in error || 'meta' in error) // And a message or meta object
      // Optionally, check for name if it's consistently present on your mocked errors too:
      // && (error as { name?: string }).name === 'PrismaClientKnownRequestError'
    ) {
      isEssentiallyPrismaKnownError = true
    }

    if (isEssentiallyPrismaKnownError) {
      // const knownError = error as Prisma.PrismaClientKnownRequestError; // For typed access if needed
      // You might log specific details of knownError to a dedicated logging service here.
      // e.g., logErrorToService('PrismaKnownError', { code: knownError.code, meta: knownError.meta });
      return {
        message: 'Database error occurred. Could not save submission.',
        success: false,
        errors: undefined, // No specific field errors for this general DB error by default
        // errorDetail: `Code: ${knownError.code}` // Be cautious about exposing error codes
      }
    }

    // C. Handle other generic errors
    // Log the full error to your server logs or an error tracking service for investigation
    // console.error('[submitContactForm] An unexpected error occurred:', error);
    const errorMessage =
      'An unexpected server error occurred. Please try again later.'
    if (error instanceof Error && error.message) {
      // You might choose to use error.message if it's deemed safe and informative,
      // but often a generic message is better for the client.
      // errorMessage = error.message; // Use with caution
    }

    return {
      message: errorMessage,
      success: false,
      errors: undefined,
    }
  }
}
