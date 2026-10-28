// Browser-side validation. The server checks everything again with its own Zod schemas.
import { z } from 'zod';
import { READING_STATUSES, PRIORITIES, PAPER_TYPES, PROJECT_TYPES, PROJECT_STATUSES, NOTE_KINDS } from './constants.js';

const email = z.string().trim().min(1, 'Enter your email').email('Enter a valid email address');
const password = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be 72 characters or fewer');
const optional = (max, label) => z.string().trim().max(max, `${label} must be ${max} characters or fewer`);
const pick = (values, msg) => z.string().refine((v) => values.includes(v), msg);

const currentYear = new Date().getFullYear();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be 60 characters or fewer'),
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be 60 characters or fewer'),
  email,
  institution: optional(120, 'Institution'),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'Choose a password different from the current one' });

export const paperSchema = z
  .object({
    doi: z
      .string()
      .trim()
      .refine((v) => v === '' || /^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\/\S+$/i.test(v), 'DOI must look like 10.1234/abc'),
    title: z.string().trim().min(2, 'Title is required').max(300, 'Title must be 300 characters or fewer'),
    authors: z
      .string()
      .refine((v) => v.split('\n').some((a) => a.trim()), 'Add at least one author')
      .refine((v) => v.split('\n').every((a) => a.trim().length <= 100), 'Author names must be 100 characters or fewer'),
    year: z
      .string()
      .trim()
      .refine((v) => v === '' || (/^\d{4}$/.test(v) && +v >= 1800 && +v <= currentYear + 1), `Year must be between 1800 and ${currentYear + 1}`),
    paperType: pick(PAPER_TYPES, 'Choose a paper type'),
    venue: optional(200, 'Journal or venue'),
    volume: optional(20, 'Volume'),
    issue: optional(20, 'Issue'),
    pages: optional(30, 'Pages'),
    url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'URL must start with http:// or https://'),
    abstract: optional(5000, 'Abstract'),
    tags: z.string().refine((v) => v.split(',').every((t) => t.trim().length <= 30), 'Tags must be 30 characters or fewer each'),
    status: pick(READING_STATUSES, 'Choose a reading status'),
    priority: pick(PRIORITIES, 'Choose a priority'),
    rating: z.string(),
    readBy: z.string(),
    projectIds: z.array(z.string()),
  })
  .refine((d) => d.status !== 'Cited' || d.projectIds.length > 0, {
    path: ['status'],
    message: 'Link the paper to a project before marking it Cited',
  });

export const projectSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(150, 'Title must be 150 characters or fewer'),
  description: optional(2000, 'Description'),
  type: pick(PROJECT_TYPES, 'Choose a project type'),
  status: pick(PROJECT_STATUSES, 'Choose a status'),
  deadline: z.string(),
});

export const noteSchema = z.object({
  paperId: z.string().min(1, 'Choose a paper'),
  kind: pick(NOTE_KINDS, 'Choose a note type'),
  content: z.string().trim().min(1, 'Write the note').max(5000, 'Notes must be 5000 characters or fewer'),
  page: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && +v >= 1 && +v <= 10000), 'Page must be a number from 1 to 10000'),
});
