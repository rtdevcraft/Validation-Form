'use client'

import { DynamicFormRenderer } from './components/forms/DynamicFormRenderer'
import { refinedFormSchema as clientSchema } from '@/lib/schemas'
import { contactFormConfiguration } from '@/lib/formConfigs/ContactFormConfig'
import { submitContactForm } from './actions'
import { DEFAULT_CONTACT_FORM_INITIAL_STATE } from '@/lib/types/forms'

export default function Home() {
  return (
    <main className='flex flex-col items-center justify-between p-24'>
      <DynamicFormRenderer
        formConfig={contactFormConfiguration}
        clientSchema={clientSchema}
        serverAction={submitContactForm}
        initialState={DEFAULT_CONTACT_FORM_INITIAL_STATE}
      />
    </main>
  )
}
