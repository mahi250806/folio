import { ApiError } from '../utils/http.js';

/** Turns a ZodError into { field: firstMessage } for the client's form fields. */
export function zodErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Validates the request body (or query) and puts the clean result on req.valid.
 * Multipart forms send their fields as a JSON string in a "data" field, which is unpacked first.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  let input = source === 'query' ? req.query : req.body;
  if (source === 'body' && typeof input?.data === 'string') {
    try {
      input = JSON.parse(input.data);
    } catch {
      return next(new ApiError(400, 'Form data could not be read'));
    }
  }
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const errors = zodErrors(result.error);
    return next(new ApiError(400, Object.values(errors)[0] || 'Please fix the highlighted fields', errors));
  }
  req.valid = result.data;
  next();
};
