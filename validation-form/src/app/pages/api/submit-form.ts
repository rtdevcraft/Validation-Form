import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client'; // Prisma namespace for error types
import * as z from 'zod';

// --- Zod Schema Definition (Should match the frontend exactly) ---
const usPostalCodeRegex = /^\d{5}(\d{4})?<span class="math-inline">/;
const caPostalCodeRegex = /^\[A\-Z\]\\d\[A\-Z\]\\d\[A\-Z\]\\d</span>/;

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
});

const refinedFormSchema = baseFormSchema.refine(
  (data) => {
    if (!data.country || !data.postalCode) return true;
    if (data.country === 'US') return usPostalCodeRegex.