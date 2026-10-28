import mongoose from 'mongoose';
import { ApiError } from '../utils/http.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `No API route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = Object.values(errors)[0];
  } else if (err instanceof mongoose.Error.CastError) {
    status = 404;
    message = 'Record not found';
  } else if (err?.code === 11000) {
    status = 409;
    message = 'That email is already registered';
    errors = { email: message };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (!(err instanceof ApiError) && status >= 500) {
    console.error(err);
    message = env.isProd ? 'Something went wrong on the server' : message;
  }

  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}
