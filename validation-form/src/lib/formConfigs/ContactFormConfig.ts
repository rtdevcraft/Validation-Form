import { toast } from 'react-hot-toast'
import type { ContactFormData } from '@/lib/schemas'

export interface FormFieldConfig {
  id: keyof ContactFormData
  fieldType: 'text' | 'email' | 'tel' | 'textarea' | 'select'
  label: string
  placeholder?: string
  type?: string
  rows?: number
  options?: Array<{ value: string; label: string }>
  defaultValue?: string | number | boolean
  className?: string
  validation?: {
    required?: boolean | string
    // ... other validation hints
  }
  conditionalProps?: (
    watchedValues: Record<string, unknown>
  ) => Record<string, unknown>
  componentProps?: Record<string, unknown>
}

export interface FormGroupConfig {
  id: string
  type: 'group'
  className?: string
  fields: FormFieldConfig[]
}

export type FormElementConfig = FormFieldConfig | FormGroupConfig

export const contactFormConfiguration: {
  name: string
  fields: FormElementConfig[]
} = {
  name: 'Contact Us',
  fields: [
    {
      id: 'name',
      fieldType: 'text',
      label: 'Full Name',
      validation: { required: 'Full Name is required' },
    },
    {
      id: 'email',
      fieldType: 'email',
      type: 'email',
      label: 'Email Address',
      validation: { required: 'Email Address is required' },
    },
    {
      id: 'phone',
      fieldType: 'tel',
      type: 'tel',
      label: 'Phone Number (e.g., +11234567890)',
      validation: { required: 'Phone Number is required' },
    },
    {
      id: 'addressGroup',
      type: 'group',
      className: 'grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6',
      fields: [
        {
          id: 'streetAddress',
          fieldType: 'text',
          label: 'Street Address',
          className: 'sm:col-span-6',
          validation: { required: 'Street Address is required' },
        },
        {
          id: 'city',
          fieldType: 'text',
          label: 'City',
          className: 'sm:col-span-3',
          validation: { required: 'City is required' },
        },
        {
          id: 'stateProvince',
          fieldType: 'text',
          label: 'State / Province',
          className: 'sm:col-span-3',
          validation: { required: 'State / Province is required' },
        },
        {
          id: 'country',
          fieldType: 'select',
          label: 'Country',
          className: 'sm:col-span-3',
          options: [
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' },
          ],
          validation: { required: 'Country is required' },
          defaultValue: '',
          placeholder: ' ',
        },
        {
          id: 'postalCode',
          fieldType: 'text',
          label: 'Zip Code', // Default label
          className: 'sm:col-span-3',
          validation: { required: 'Postal Code is required' },
          conditionalProps: (watchedValues) => {
            const country = watchedValues.country
            const props: Record<string, unknown> = {
              label:
                country === 'US'
                  ? 'ZIP Code'
                  : country === 'CA'
                  ? 'Postal Code (Canada)'
                  : 'Postal Code (Select Country)',
              readOnly: !country,
              inputClassName: !country ? 'bg-gray-100 cursor-not-allowed' : '',
            }

            if (!country) {
              props.onClick = () => {
                toast.error(
                  'Please select your country first before entering a postal code.'
                )
              }
            }
            return props
          },
        },
      ],
    },
    {
      id: 'message',
      fieldType: 'textarea',
      label: 'Message (Optional)',
      rows: 4,
    },
  ],
}
