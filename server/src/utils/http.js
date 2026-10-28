import mongoose from 'mongoose';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors; // optional { field: message } map for forms
  }
}

export const ok = (res, data, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

/** Throws 404 instead of a CastError when an :id is not a valid ObjectId. */
export function assertObjectId(id, label = 'Record') {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, `${label} not found`);
}

/** Escapes user text before it is used inside a RegExp. */
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
