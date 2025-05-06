import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, Prisma } from '@prisma/client' // Prisma Client

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
const prismaLogPrefix = '[API Prisma Client]'

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

// --- API Handler Function ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const logPrefix = '[Vercel /api/submit-form]' // For easy filtering in Vercel logs

  console.log(`${logPrefix} Request received. Method: ${req.method}`)
  // For deeper debugging, you can uncomment the headers log:
  // console.log(`${logPrefix} Request headers:`, JSON.stringify(req.headers, null, 2));

  // 1. Handle non-POST requests
  if (req.method !== 'POST') {
    console.warn(
      `${logPrefix} Method is ${req.method}, which is not 'POST'. Sending 405.`
    )
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({
      message: `Method ${req.method} Not Allowed. This endpoint only accepts POST requests.`,
      receivedMethod: req.method, // Include what method was received
    })
  }

  // At this point, method should be POST
  console.log(`${logPrefix} Processing POST request.`)

  try {
    // 2. Validate request body with Zod schema
    console.log(`${logPrefix} Validating request body...`)
    // If you need to see the raw body for debugging (be cautious with sensitive data):
    // console.log(`${logPrefix} Raw request body:`, req.body);
    const validatedData = refinedFormSchema.parse(req.body)
    console.log(`${logPrefix} Request body validated successfully.`)
    // If you need to see the validated data:
    // console.log(`${logPrefix} Validated data:`, validatedData);

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
        message: validatedData.message, // Will be undefined if optional field is empty and not provided
      },
    })
    console.log(
      `${logPrefix} Submission saved successfully to database. ID: ${submission.id}`
    )

    // 4. Send successful response
    return res
      .status(201)
      .json({ message: 'Submission successful!', submissionId: submission.id })
  } catch (error: unknown) {
    console.error(`${logPrefix} ERROR during POST request processing:`, error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error(
        `${logPrefix} Zod Validation Error details:`,
        error.flatten().fieldErrors
      )
      return res.status(400).json({
        message: 'Invalid form data. Please check your input.',
        errors: error.flatten().fieldErrors,
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        `${logPrefix} Prisma Error Code: ${error.code}. Message: ${error.message}`
      )
      // You could log error.meta here for more details, but be cautious with sensitive info.
      // console.error(`${logPrefix} Prisma Error Meta:`, error.meta);
      return res.status(500).json({
        message: 'Database operation failed. Could not save submission.',
        errorCode: error.code, // Optionally send the error code
      })
    }

    // It's good practice to check for other specific Prisma error types if needed, e.g.,
    // if (error instanceof Prisma.PrismaClientInitializationError) { ... }
    // if (error instanceof Prisma.PrismaClientValidationError) { ... }

    // Handle other unexpected errors
    const derivedErrorMessage =
      error instanceof Error
        ? error.message
        : 'An unknown server error occurred.'

    console.error(
      `${logPrefix} Generic Unhandled Error. Derived message: ${derivedErrorMessage}`
    )
    // If the error object isn't a standard Error instance, log its stringified version for more info
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

    return res.status(500).json({
      message: 'Internal Server Error. Please try again later.',
      errorDetail: derivedErrorMessage, // Send the derived message
    })
  }
  // Note: Explicit prisma.$disconnect() is generally not needed in serverless functions
  // as Prisma's Data Proxy (if used with Vercel) or connection management handles this.
  // If not using the Data Proxy, Prisma client tries to manage connections efficiently.
}
