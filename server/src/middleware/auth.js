import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/http.js';
import { User } from '../models/User.js';

export const COOKIE_NAME = 'folio_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // page scripts cannot read it
    secure: env.isProd, // HTTPS only in production
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/' });
}

/** Rejects the request unless it carries a valid login cookie for an existing user. */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new ApiError(401, 'Please log in to continue'));
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return next(new ApiError(401, 'Your session has expired. Log in again.'));
  }
  const exists = await User.exists({ _id: payload.sub });
  if (!exists) return next(new ApiError(401, 'Account not found. Log in again.'));
  req.userId = payload.sub;
  next();
}
