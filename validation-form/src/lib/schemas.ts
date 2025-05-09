import { z } from 'zod'

const usPostalCodeRegex = /^\d{5}(\d{4})?$/
const caPostalCodeRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/

const baseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(100, 'Name must be 100 characters or less.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address.')
    .max(254, 'Email address seems too long.'),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s\-()]/g, ''))
    .pipe(
      z
        .string()
        .min(10, 'Phone number must be at least 10 digits.')
        .max(15, 'Phone number seems too long.')
        .regex(
          /^[+]?\d+$/,
          'Invalid phone number format (digits and optional + only).'
        )
    ),
  streetAddress: z
    .string()
    .trim()
    .min(5, 'Street address seems too short.')
    .max(255, 'Street address must be 255 characters or less.'),
  city: z
    .string()
    .trim()
    .min(2, 'City name seems too short.')
    .max(100, 'City name must be 100 characters or less.'),
  stateProvince: z
    .string()
    .trim()
    .min(2, 'State/Province seems too short.')
    .max(100, 'State/Province must be 100 characters or less.'),
  country: z.enum(['US', 'CA', ''], { required_error: 'Country is required.' }),
  postalCode: z
    .string()
    .trim()
    .transform((val) => val.replace(/[ -]/g, '').toUpperCase())
    .pipe(z.string().min(1, 'Postal code is required.')),
  message: z
    .string()
    .trim()
    .max(5000, 'Message must be 5000 characters or less.')
    .optional(),
})

export const refinedFormSchema = baseFormSchema.refine(
  (data) => {
    if (!data.country || !data.postalCode) return true // Let other validations catch missing fields
    if (data.country === 'US') return usPostalCodeRegex.test(data.postalCode)
    if (data.country === 'CA') return caPostalCodeRegex.test(data.postalCode)
    return false // Should not happen if country is one of the enum
  },
  {
    message: 'Invalid postal code format for the selected country.',
    path: ['postalCode'], // Apply error to postalCode field
  }
)

// Type for client-side form data
export type ContactFormData = z.infer<typeof refinedFormSchema>
