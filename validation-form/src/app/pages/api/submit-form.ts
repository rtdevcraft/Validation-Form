import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime'
import * as z from 'zod'

// --- Zod Schema Definition (Should match the frontend exactly) ---

const usPostalCodeRegex = /^\d{5}(\d{4})?$/
const caPostalCodeRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/

const baseFormSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s\-()]/g, ''))
    .pipe(
      z
        .string()
        .min(10)
        .max(15)
        .regex(/^[+]?\d+$/)
    ),
  streetAddress: z.string().trim().min(5).max(255),
  city: z.string().trim().min(2).max(100),
  stateProvince: z.string().trim().min(2).max(100),
  country: z.enum(['US', 'CA']),
  postalCode: z
    .string()
    .trim()
    .transform((val) => val.replace(/[ -]/g, '').toUpperCase())
    .pipe(z.string().min(1)),
  message: z.string().trim().max(5000).optional(),
})

const refinedFormSchema = baseFormSchema.refine(
  (data) => {
    if (!data.country || !data.postalCode) return true
    if (data.country === 'US') return usPostalCodeRegex.test(data.postalCode)
    if (data.country === 'CA') return caPostalCodeRegex.test(data.postalCode)
    return false
  },
  {
    message: 'Invalid postal code format for the selected country.',
    path: ['postalCode'],
  }
)

// --- Prisma Client Initialization ---
// (Using the recommended pattern for Next.js/serverless)
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient()
  }
  prisma = global.prisma
}

// --- API Handler Function ---

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Handle non-POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
  }

  try {
    // 2. Validate request body with Zod schema
    // This also applies the transformations (trim, lowercase, etc.)
    const validatedData = refinedFormSchema.parse(req.body)

    // 3. Save data to database using Prisma
    // Ensure your Prisma model is named 'contactSubmission' or update the name here
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
        message: validatedData.message, // Will be null if optional field is empty
      },
    })

    // 4. Send successful response
    return res
      .status(201)
      .json({ message: 'Submission successful!', submissionId: submission.id })
  } catch (error: unknown) {
    // 5. Handle errors

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation Error:', error.flatten().fieldErrors)
      return res.status(400).json({
        message: 'Invalid form data.',
        errors: error.flatten().fieldErrors, // Provide specific field errors
      })
    }

    if (error instanceof PrismaClientKnownRequestError) {
      {
        console.error('Prisma Error:', error.code, error.message)
        // Provide a generic database error message
        return res
          .status(500)
          .json({
            message: 'Could not save submission due to a database error.',
          })
      }
    }

    // Handle other unexpected errors
    const derivedErrorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.'

    console.error('API Error (derived message):', derivedErrorMessage)
    // You might still want to log the raw error object for more debugging details,
    // as console.error can handle it.
    if (!(error instanceof Error)) {
      // If it wasn't a standard error, log the raw thing too
      console.error('API Error (raw non-Error object):', error)
    }

    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: derivedErrorMessage })
    // Note: Explicit prisma.$disconnect() is generally not needed here
    // due to Prisma's connection management and the global instance pattern.
  }
}
