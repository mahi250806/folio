import { z } from 'zod';
import mongoose from 'mongoose';
import {
  READING_STATUSES,
  PRIORITIES,
  PAPER_TYPES,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  NOTE_KINDS,
} from '../models/constants.js';
import { normalizeDoi } from '../utils/crossref.js';

// Optional form fields arrive as "" when left empty; these helpers turn "" into null.
const emptyToNull = (v) => (v === '' || v === undefined ? null : v);

const optionalText = (max) => z.string().trim().max(max, `Must be ${max} characters or fewer`).optional().default('');

const optionalDate = z.preprocess(
  emptyToNull,
  z.coerce.date({ invalid_type_error: 'Enter a valid date' }).nullable()
);

const optionalInt = (min, max, label) =>
  z.preprocess(
    emptyToNull,
    z.coerce
      .number({ invalid_type_error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`)
      .nullable()
  );

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'URL must start with http:// or https://')
  .optional()
  .default('');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer');

/* ---------- Auth ---------- */

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be 60 characters or fewer'),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email,
  institution: optionalText(120),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'Choose a password different from the current one' });

/* ---------- Papers ---------- */

const currentYear = new Date().getFullYear();

const listOf = (item, maxItems, label) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.split(/[,;\n]/) : v ?? []),
    z.array(item).max(maxItems, `At most ${maxItems} ${label}`)
  );

export const paperSchema = z
  .object({
    title: z.string().trim().min(2, 'Title is required').max(300, 'Title must be 300 characters or fewer'),
    authors: z.preprocess(
      (v) => (typeof v === 'string' ? v.split(/;|\n/) : v ?? []),
      z
        .array(z.string().trim().max(100, 'Author names must be 100 characters or fewer'))
        .transform((a) => a.filter(Boolean))
        .pipe(z.array(z.string()).min(1, 'Add at least one author').max(50, 'At most 50 authors'))
    ),
    year: optionalInt(1800, currentYear + 1, 'Year'),
    venue: optionalText(200),
    paperType: z.enum(PAPER_TYPES, { errorMap: () => ({ message: 'Choose a paper type' }) }).default('Journal article'),
    volume: optionalText(20),
    issue: optionalText(20),
    pages: optionalText(30),
    doi: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((v, ctx) => {
        if (!v) return '';
        const doi = normalizeDoi(v);
        if (!doi) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'DOI must look like 10.1234/abc' });
          return z.NEVER;
        }
        return doi;
      }),
    url: httpUrl,
    abstract: optionalText(5000),
    tags: listOf(z.string().trim().toLowerCase().max(30, 'Tags must be 30 characters or fewer'), 30, 'tags').transform(
      (t) => [...new Set(t.filter(Boolean))].slice(0, 15)
    ),
    status: z.enum(READING_STATUSES, { errorMap: () => ({ message: 'Choose a reading status' }) }).default('To Read'),
    priority: z.enum(PRIORITIES, { errorMap: () => ({ message: 'Choose a priority' }) }).default('Medium'),
    rating: optionalInt(1, 5, 'Rating'),
    readBy: optionalDate,
    projectIds: z.preprocess((v) => v ?? [], z.array(objectId).max(20)).transform((a) => [...new Set(a)]),
  })
  .refine((d) => d.status !== 'Cited' || d.projectIds.length > 0, {
    path: ['status'],
    message: 'Link the paper to a project before marking it Cited',
  });

export const paperStatusSchema = z.object({
  status: z.enum(READING_STATUSES, { errorMap: () => ({ message: 'Choose a reading status' }) }),
});

export const paperQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(READING_STATUSES).optional().or(z.literal('').transform(() => undefined)),
  priority: z.enum(PRIORITIES).optional().or(z.literal('').transform(() => undefined)),
  projectId: objectId.optional().or(z.literal('').transform(() => undefined)),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  hasPdf: z.enum(['yes', 'no']).optional().or(z.literal('').transform(() => undefined)),
  sort: z.enum(['newest', 'oldest', 'title', 'year', 'readBy', 'priority']).optional().default('newest'),
});

/* ---------- Projects ---------- */

export const projectSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(150, 'Title must be 150 characters or fewer'),
  description: optionalText(2000),
  type: z.enum(PROJECT_TYPES, { errorMap: () => ({ message: 'Choose a project type' }) }),
  status: z.enum(PROJECT_STATUSES, { errorMap: () => ({ message: 'Choose a status' }) }).default('Planning'),
  deadline: optionalDate,
});

export const linkPapersSchema = z.object({
  paperIds: z.array(objectId).min(1, 'Choose at least one paper').max(100).transform((a) => [...new Set(a)]),
});

/* ---------- Notes ---------- */

export const noteSchema = z.object({
  paperId: objectId,
  kind: z.enum(NOTE_KINDS, { errorMap: () => ({ message: 'Choose a note type' }) }),
  content: z.string().trim().min(1, 'Write the note').max(5000, 'Notes must be 5000 characters or fewer'),
  page: optionalInt(1, 10000, 'Page'),
});

export const noteQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  kind: z.enum(NOTE_KINDS).optional().or(z.literal('').transform(() => undefined)),
  paperId: objectId.optional().or(z.literal('').transform(() => undefined)),
});
