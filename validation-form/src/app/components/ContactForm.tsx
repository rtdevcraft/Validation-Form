'use client'
import React, {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  FormHTMLAttributes,
  useEffect,
} from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// --- Zod Schema Definition ---

const usPostalCodeRegex = /^\d{5}(\d{4})?$/
const caPostalCodeRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/

const baseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(100, { message: 'Name must be 100 characters or less.' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email address.' })
    .max(254, { message: 'Email address seems too long.' }),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s\-()]/g, ''))
    .pipe(
      z
        .string()
        .min(10, { message: 'Phone number must be at least 10 digits.' })
        .max(15, { message: 'Phone number seems too long.' })
        .regex(/^[+]?\d+$/, {
          message: 'Invalid phone number format (digits and optional + only).',
        })
    ),
  streetAddress: z
    .string()
    .trim()
    .min(5, { message: 'Street address seems too short.' })
    .max(255, { message: 'Street address must be 255 characters or less.' }),
  city: z
    .string()
    .trim()
    .min(2, { message: 'City name seems too short.' })
    .max(100, { message: 'City name must be 100 characters or less.' }),
  stateProvince: z
    .string()
    .trim()
    .min(2, { message: 'State/Province seems too short.' })
    .max(100, { message: 'State/Province must be 100 characters or less.' }),
  country: z.enum(['US', 'CA'], {
    required_error: 'Country is required.',
    invalid_type_error: 'Invalid country selected.',
  }),
  postalCode: z
    .string()
    .trim()
    .transform((val) => val.replace(/[ -]/g, '').toUpperCase())
    .pipe(z.string().min(1, { message: 'Postal code is required.' })),
  message: z
    .string()
    .trim()
    .max(5000, { message: 'Message must be 5000 characters or less.' })
    .optional(),
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

type ContactFormData = z.infer<typeof refinedFormSchema>

// --- Interface Definitions---

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

interface FormItemProps {
  children: React.ReactNode
}
interface FormLabelProps {
  children: React.ReactNode
  htmlFor?: string
}
interface FormControlProps {
  children: React.ReactNode
}
interface FormMessageProps {
  children: React.ReactNode
}
interface FormDescriptionProps {
  children: React.ReactNode
}

interface ToastArgs {
  title: string
  description: string
  // variant?: 'default' | 'destructive';
}

// --- Shadcn UI Component Placeholders (Using Interfaces or Base Types) ---

const Button = ({ children, ...props }: ButtonProps) => (
  <button
    className='px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50'
    {...props}
  >
    {children}
  </button>
)

const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className='block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100'
    {...props}
  />
)

const Select = ({ children, ...props }: SelectProps) => (
  <select
    className='block w-full py-2 pl-3 pr-10 mt-1 text-base bg-white border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
    {...props}
  >
    {children}
  </select>
)

const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className='block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
    rows={4}
    {...props}
  />
)

const Form = ({ children, ...props }: FormProps) => (
  <form {...props}>{children}</form>
)

const FormItem = ({ children }: FormItemProps) => (
  <div className='mb-4'>{children}</div>
)
const FormLabel = ({ children, htmlFor }: FormLabelProps) => (
  <label
    htmlFor={htmlFor}
    className='block mb-1 text-sm font-medium text-gray-700'
  >
    {children}
  </label>
)
const FormControl = ({ children }: FormControlProps) => <div>{children}</div>
const FormMessage = ({ children }: FormMessageProps) => (
  <p className='mt-1 text-sm text-red-600'>{children}</p>
)
const FormDescription = ({ children }: FormDescriptionProps) => (
  <p className='mt-1 text-sm text-gray-500'>{children}</p>
)

// Placeholder toast function using its interface
const toast = ({ title, description }: ToastArgs) =>
  console.log('Toast:', title, description)

// --- React Component ---

function ContactForm() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(refinedFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      streetAddress: '',
      city: '',
      stateProvince: '',
      country: undefined,
      postalCode: '',
      message: '',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    trigger,
    getFieldState,
  } = form
  const watchedCountry = watch('country')

  useEffect(() => {
    const postalCodeState = getFieldState('postalCode')
    if (
      watchedCountry &&
      (postalCodeState.isTouched || postalCodeState.isDirty)
    ) {
      trigger('postalCode')
    }
  }, [watchedCountry, trigger, getFieldState]) // Added getFieldState to dependency array

  const processForm = async (data: ContactFormData) => {
    console.log('Validated & Transformed Data:', data)
    toast({ title: 'Submitting...', description: 'Sending data to the API.' })

    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        let errorResult: { message?: string } = {}
        try {
          errorResult = await response.json()
        } catch (jsonError) {
          // Log the specific JSON parsing error
          console.error(
            'Failed to parse API error response as JSON:',
            jsonError
          )
          // Fallback message
          errorResult = {
            message:
              response.statusText ||
              'API request failed with non-JSON response',
          }
        }
        throw new Error(
          errorResult.message ||
            `API request failed with status ${response.status}`
        )
      }

      const result: { message?: string } = await response.json()
      console.log('API Success:', result)
      toast({
        title: 'Success!',
        description: result.message || 'Form submitted successfully.',
      })
      // form.reset();
    } catch (error) {
      console.error('Submission Error:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
        // variant: "destructive",
      })
    }
  }

  return (
    <div className='max-w-lg p-6 mx-auto font-sans bg-white rounded-lg shadow-md'>
      <h2 className='mb-6 text-2xl font-semibold text-gray-800'>Contact Us</h2>
      <Form onSubmit={handleSubmit(processForm)} className='space-y-4'>
        {/* --- Form Fields --- */}
        <FormItem>
          <FormLabel htmlFor='name'>Full Name</FormLabel>
          <FormControl>
            <Input id='name' placeholder='John Doe' {...register('name')} />
          </FormControl>
          {errors.name && <FormMessage>{errors.name.message}</FormMessage>}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='email'>Email Address</FormLabel>
          <FormControl>
            <Input
              id='email'
              type='email'
              placeholder='you@example.com'
              {...register('email')}
            />
          </FormControl>
          {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='phone'>Phone Number</FormLabel>
          <FormControl>
            <Input
              id='phone'
              type='tel'
              placeholder='(123) 456-7890'
              {...register('phone')}
            />
          </FormControl>
          <FormDescription>Enter a valid phone number.</FormDescription>
          {errors.phone && <FormMessage>{errors.phone.message}</FormMessage>}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='streetAddress'>Street Address</FormLabel>
          <FormControl>
            <Input
              id='streetAddress'
              placeholder='123 Main St'
              {...register('streetAddress')}
            />
          </FormControl>
          {errors.streetAddress && (
            <FormMessage>{errors.streetAddress.message}</FormMessage>
          )}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='city'>City</FormLabel>
          <FormControl>
            <Input id='city' placeholder='Anytown' {...register('city')} />
          </FormControl>
          {errors.city && <FormMessage>{errors.city.message}</FormMessage>}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='stateProvince'>State / Province</FormLabel>
          <FormControl>
            <Input
              id='stateProvince'
              placeholder='CA / Ontario'
              {...register('stateProvince')}
            />
          </FormControl>
          {errors.stateProvince && (
            <FormMessage>{errors.stateProvince.message}</FormMessage>
          )}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='country'>Country</FormLabel>
          <FormControl>
            <Select id='country' {...register('country')}>
              <option value='' disabled>
                Select a country
              </option>
              <option value='US'>United States</option>
              <option value='CA'>Canada</option>
            </Select>
          </FormControl>
          {errors.country && (
            <FormMessage>{errors.country.message}</FormMessage>
          )}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='postalCode'>Postal Code</FormLabel>
          <FormControl>
            <Input
              id='postalCode'
              placeholder={
                watchedCountry === 'US'
                  ? 'e.g., 90210 or 90210-1234'
                  : watchedCountry === 'CA'
                  ? 'e.g., A1A 1A1'
                  : 'Select country first'
              }
              {...register('postalCode')}
              disabled={!watchedCountry}
            />
          </FormControl>
          <FormDescription>
            Postal code format depends on the selected country.
          </FormDescription>
          {errors.postalCode && (
            <FormMessage>{errors.postalCode.message}</FormMessage>
          )}
        </FormItem>

        <FormItem>
          <FormLabel htmlFor='message'>Message (Optional)</FormLabel>
          <FormControl>
            <Textarea
              id='message'
              placeholder='Your message here...'
              {...register('message')}
            />
          </FormControl>
          {errors.message && (
            <FormMessage>{errors.message.message}</FormMessage>
          )}
        </FormItem>

        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </Form>
    </div>
  )
}

export default ContactForm
