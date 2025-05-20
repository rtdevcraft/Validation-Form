import { z } from 'zod'
import { refinedFormSchema } from '@/lib/schemas'

// Define a state type for the Server Action's response
export interface SubmitFormState {
  message: string
  errors?: Partial<Record<keyof z.infer<typeof refinedFormSchema>, string[]>>
  submissionId?: string
  success: boolean
  errorDetail?: string // Optional error detail for debugging
}

// Define the initial default state here
export const DEFAULT_CONTACT_FORM_INITIAL_STATE: SubmitFormState = {
  message: '',
  success: false,
  errors: undefined,
  submissionId: undefined,
}
