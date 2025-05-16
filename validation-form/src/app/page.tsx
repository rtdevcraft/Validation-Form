'use client'

import { DynamicFormRenderer } from './components/forms/DynamicFormRender'
import { refinedFormSchema as clientSchema } from '@/lib/schemas'
import { contactFormConfiguration } from '@/lib/formConfigs/ContactFormConfig'
import {
  submitContactForm,
  DEFAULT_CONTACT_FORM_INITIAL_STATE,
} from './actions'

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
