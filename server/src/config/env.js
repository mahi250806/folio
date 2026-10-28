// Central place for environment variables, with a clear error when one is missing.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

export const env = {
  get MONGODB_URI() {
    return required('MONGODB_URI');
  },
  get JWT_SECRET() {
    return required('JWT_SECRET');
  },
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  get isProd() {
    return this.NODE_ENV === 'production';
  },
};
