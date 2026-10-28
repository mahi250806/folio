// Local development entry point. On Vercel, api/index.js is used instead.
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

try {
  await connectDB();
  console.log('Connected to MongoDB');
} catch (err) {
  console.error('Could not connect to MongoDB:', err.message);
  console.error('Check MONGODB_URI in server/.env and that your IP is allowed in Atlas Network Access.');
}

app.listen(env.PORT, () => {
  console.log(`FOLIO API listening on http://localhost:${env.PORT}`);
});
