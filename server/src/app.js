import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Vercel's proxy, so secure cookies work
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));

// In production the site and API share one domain, so CORS is only needed
// for local development, where Vite runs on a different port.
if (!env.isProd) app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Connect lazily so a cold serverless start opens the connection once.
app.use('/api', async (req, _res, next) => {
  if (req.path === '/health') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    next(Object.assign(new Error('Database is unavailable. Try again shortly.'), { status: 503 }));
  }
});

app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
