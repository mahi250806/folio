import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError, ok } from '../utils/http.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

const SALT_ROUNDS = 12;

export async function register(req, res) {
  const { name, email, password } = req.valid;
  if (await User.exists({ email })) {
    throw new ApiError(409, 'That email is already registered', { email: 'That email is already registered' });
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });
  setAuthCookie(res, user._id);
  ok(res, { user }, 'Account created', 201);
}

export async function login(req, res) {
  const { email, password } = req.valid;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so accounts cannot be probed.
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!valid) throw new ApiError(401, 'Email or password is incorrect', { password: 'Email or password is incorrect' });
  setAuthCookie(res, user._id);
  ok(res, { user: user.toJSON() }, 'Logged in');
}

export function logout(_req, res) {
  clearAuthCookie(res);
  ok(res, null, 'Logged out');
}

export async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(401, 'Account not found');
  ok(res, { user });
}

export async function updateMe(req, res) {
  const { name, email, institution } = req.valid;
  const taken = await User.exists({ email, _id: { $ne: req.userId } });
  if (taken) throw new ApiError(409, 'That email is already registered', { email: 'That email is already registered' });
  const user = await User.findByIdAndUpdate(req.userId, { name, email, institution }, { new: true, runValidators: true });
  ok(res, { user }, 'Profile saved');
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid;
  const user = await User.findById(req.userId).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'Current password is incorrect', { currentPassword: 'Current password is incorrect' });
  }
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  ok(res, null, 'Password changed');
}
