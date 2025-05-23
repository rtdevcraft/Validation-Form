import {
  refinedFormSchema,
  baseFormSchema,
  ContactFormData,
} from '@/lib/schemas'

describe('Contact Form Schemas', () => {
  const createValidData = (
    overrides: Partial<ContactFormData> = {}
  ): ContactFormData => ({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+11234567890', // Already transformed format
    streetAddress: '123 Main St',
    city: 'Anytown',
    stateProvince: 'CA', // California for US, or any province for CA
    country: 'US',
    postalCode: '90210', // US ZIP
    message: 'This is a test message.',
    ...overrides,
  })

  describe('baseFormSchema individual fields', () => {
    // --- Name ---
    describe('name', () => {
      it('should validate a valid name', () => {
        expect(baseFormSchema.shape.name.safeParse('Valid Name').success).toBe(
          true
        )
      })
      it('should invalidate a name that is too short', () => {
        const result = baseFormSchema.shape.name.safeParse('A')
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Name must be at least 2 characters.'
          )
      })
      it('should invalidate a name that is too long', () => {
        const result = baseFormSchema.shape.name.safeParse('A'.repeat(101))
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Name must be 100 characters or less.'
          )
      })
      it('should trim the name', () => {
        expect(baseFormSchema.shape.name.parse('  John Doe  ')).toBe('John Doe')
      })
    })

    // --- Email ---
    describe('email', () => {
      it('should validate a valid email and transform to lowercase', () => {
        expect(
          baseFormSchema.shape.email.parse('VALID.EMAIL@EXAMPLE.COM')
        ).toBe('valid.email@example.com')
      })
      it('should invalidate an invalid email format', () => {
        const result = baseFormSchema.shape.email.safeParse('invalid')
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe('Invalid email address.')
      })
      it('should invalidate an email that is too long', () => {
        const longEmail = `${'a'.repeat(245)}@example.com` // 245 + @example.com (11) = 256
        const result = baseFormSchema.shape.email.safeParse(longEmail)
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Email address seems too long.'
          )
      })
      it('should trim the email', () => {
        expect(baseFormSchema.shape.email.parse('  test@example.com  ')).toBe(
          'test@example.com'
        )
      })
    })

    // --- Phone ---
    describe('phone', () => {
      it('should validate and transform a valid phone number', () => {
        expect(baseFormSchema.shape.phone.parse('(123) 456-7890')).toBe(
          '1234567890'
        )
        expect(baseFormSchema.shape.phone.parse('+1 123 456 7890')).toBe(
          '+11234567890'
        )
      })
      it('should invalidate a phone number that is too short after transform', () => {
        const result = baseFormSchema.shape.phone.safeParse('12345')
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Phone number must be at least 10 digits.'
          )
      })
      it('should invalidate a phone number that is too long after transform', () => {
        const result = baseFormSchema.shape.phone.safeParse('1'.repeat(20))
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Phone number seems too long.'
          )
      })
      it('should invalidate phone with invalid characters after transform', () => {
        const result = baseFormSchema.shape.phone.safeParse('123-ABC-7890') // Transforms to 123ABC7890
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Invalid phone number format (digits and optional + only).'
          )
      })
    })

    // --- Street Address ---
    describe('streetAddress', () => {
      it('should validate a valid street address', () => {
        expect(
          baseFormSchema.shape.streetAddress.safeParse('123 Main Street')
            .success
        ).toBe(true)
      })
      it('should invalidate if too short', () => {
        const result = baseFormSchema.shape.streetAddress.safeParse('123')
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Street address seems too short.'
          )
      })
      it('should trim streetAddress', () => {
        expect(
          baseFormSchema.shape.streetAddress.parse('  123 Main St  ')
        ).toBe('123 Main St')
      })
    })

    // --- City ---
    describe('city', () => {
      it('should validate valid city', () => {
        expect(baseFormSchema.shape.city.safeParse('New York').success).toBe(
          true
        )
      })
      it('should invalidate if too short', () => {
        const result = baseFormSchema.shape.city.safeParse('A')
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'City name seems too short.'
          )
      })
      it('should trim city', () => {
        expect(baseFormSchema.shape.city.parse('  My City  ')).toBe('My City')
      })
    })

    // --- State/Province ---
    describe('stateProvince', () => {
      it('should validate valid state/province', () => {
        expect(
          baseFormSchema.shape.stateProvince.safeParse('California').success
        ).toBe(true)
      })
      it('should invalidate if too short', () => {
        const result = baseFormSchema.shape.stateProvince.safeParse('C')
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'State/Province seems too short.'
          )
      })
      it('should trim stateProvince', () => {
        expect(baseFormSchema.shape.stateProvince.parse('  My State  ')).toBe(
          'My State'
        )
      })
    })

    // --- Country ---
    describe('country', () => {
      it('should validate US or CA', () => {
        expect(baseFormSchema.shape.country.safeParse('US').success).toBe(true)
        expect(baseFormSchema.shape.country.safeParse('CA').success).toBe(true)
      })
      it('should validate empty string as a valid enum value (though UI might prevent it)', () => {
        // Zod considers '' valid as it's in the enum. UI validation should catch "required".
        expect(baseFormSchema.shape.country.safeParse('').success).toBe(true)
      })
      it('should invalidate an unknown country code', () => {
        const result = baseFormSchema.shape.country.safeParse('XX')
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toContain(
            "Invalid enum value. Expected 'US' | 'CA' | '', received 'XX'"
          )
      })
      it('should error if country is undefined and field is required', () => {
        // This test is tricky because `parse(undefined)` on an object field usually
        // means the field is missing, not that its value is `undefined`.
        // The `required_error` applies if the key isn't in the object for Zod objects.
        // To test `required_error` for a specific field like this, you typically parse an object
        // where the 'country' key is missing.
        const dataWithoutCountry = { ...createValidData(), country: undefined }
        delete dataWithoutCountry.country // Make the key actually missing
        const result = baseFormSchema.safeParse(dataWithoutCountry)
        expect(result.success).toBe(false)
        const countryError =
          !result.success &&
          result.error.issues.find((i) => i.path.includes('country'))
        expect(countryError && countryError.message).toBe(
          'Country is required.'
        )
      })
    })

    // --- Postal Code ---
    describe('postalCode (base transformations and pipe)', () => {
      it('should transform postal code (trim, remove spaces/hyphens, uppercase)', () => {
        expect(baseFormSchema.shape.postalCode.parse(' k1a-0b1 ')).toBe(
          'K1A0B1'
        )
        expect(baseFormSchema.shape.postalCode.parse(' 90210 - 1234 ')).toBe(
          '902101234'
        )
      })
      it('should require postal code after transformations (pipe check)', () => {
        const result = baseFormSchema.shape.postalCode.safeParse('   ') // Becomes empty after trim
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Postal code is required.'
          )
      })
    })

    // --- Message ---
    describe('message', () => {
      it('should be optional', () => {
        expect(baseFormSchema.shape.message.safeParse(undefined).success).toBe(
          true
        )
        expect(baseFormSchema.shape.message.safeParse('').success).toBe(true) // Empty string is also valid
      })
      it('should invalidate if too long', () => {
        const result = baseFormSchema.shape.message.safeParse('A'.repeat(5001))
        expect(result.success).toBe(false)
        if (!result.success)
          expect(result.error.issues[0].message).toBe(
            'Message must be 5000 characters or less.'
          )
      })
      it('should trim the message', () => {
        expect(baseFormSchema.shape.message.parse('  Hello  ')).toBe('Hello')
      })
    })
  })

  describe('refinedFormSchema (cross-field refinement for postalCode)', () => {
    it('should validate correct US postal code when country is US', () => {
      const data = createValidData({ country: 'US', postalCode: '90210' })
      expect(refinedFormSchema.safeParse(data).success).toBe(true)
      const data2 = createValidData({ country: 'US', postalCode: '90210-1234' }) // 902101234 after transform
      const parsedData = refinedFormSchema.parse(data2)
      expect(parsedData.postalCode).toBe('902101234') // Check transformed value
      expect(refinedFormSchema.safeParse(parsedData).success).toBe(true) // Validate already transformed
    })

    it('should invalidate incorrect US postal code when country is US', () => {
      const data = createValidData({ country: 'US', postalCode: 'ABCDE' })
      const result = refinedFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const postalError = result.error.issues.find((i) =>
          i.path.includes('postalCode')
        )
        expect(postalError?.message).toBe(
          'Invalid postal code format for the selected country.'
        )
      }
    })

    it('should validate correct CA postal code when country is CA', () => {
      const data = createValidData({ country: 'CA', postalCode: 'K1A0B1' }) // Already transformed format
      expect(refinedFormSchema.safeParse(data).success).toBe(true)
      const data2 = createValidData({ country: 'CA', postalCode: 'K1A 0B1' }) // k1a0b1 after transform
      const parsedData = refinedFormSchema.parse(data2)
      expect(parsedData.postalCode).toBe('K1A0B1')
      expect(refinedFormSchema.safeParse(parsedData).success).toBe(true)
    })

    it('should invalidate incorrect CA postal code when country is CA', () => {
      const data = createValidData({ country: 'CA', postalCode: '123456' })
      const result = refinedFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const postalError = result.error.issues.find((i) =>
          i.path.includes('postalCode')
        )
        expect(postalError?.message).toBe(
          'Invalid postal code format for the selected country.'
        )
      }
    })

    it('should allow submission if country is empty string and postal code is present (refine passes, other rules apply)', () => {
      // The refine logic passes if !data.country. `baseFormSchema`'s `postalCode.pipe` still applies.
      const data = createValidData({ country: '', postalCode: 'ANYCODE' })
      const result = refinedFormSchema.safeParse(data)
      expect(result.success).toBe(true) // Because country is '' the refine logic doesn't enforce US/CA format
    })

    it('should still require postalCode if country is empty string (base rule)', () => {
      const data = createValidData({ country: '', postalCode: '' })
      const result = refinedFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        // This error comes from postalCode.pipe(z.string().min(1, ...))
        const postalError = result.error.issues.find((i) =>
          i.path.includes('postalCode')
        )
        expect(postalError?.message).toBe('Postal code is required.')
      }
    })

    it('should let other validations catch missing fields if postal code is present but country is missing for refine', () => {
      const data = { ...createValidData(), postalCode: '12345' }
      delete (data as Partial<ContactFormData>).country // country is undefined
      const dataWithoutCountry: Omit<ContactFormData, 'country'> = data
      const result = refinedFormSchema.safeParse(dataWithoutCountry)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) =>
              i.path.includes('country') && i.message === 'Country is required.'
          )
        ).toBe(true)
      }
    })
  })
})
