import mongoose from 'mongoose';
import { env } from './env.js';

// Serverless functions are re-used between requests, so the connection is
// cached on globalThis instead of being opened on every call.
const cache = globalThis.__folioMongo ?? (globalThis.__folioMongo = { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then((m) => m.connection);
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
