import 'dotenv/config';
import 'express-async-errors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import sessionRoutes from './routes/sessions.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import progressRoutes from './routes/progress.js';
import discoverRoutes from './routes/discover.js';
import studyRoutes from './routes/study.js';
import configRoutes from './routes/config.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import User from './models/User.js';
import { getConfig, adminEmails } from './utils/config.js';

const isProd = process.env.NODE_ENV === 'production';
const here = path.dirname(fileURLToPath(import.meta.url));

// ---- fail fast on bad configuration, with a clear message ----
function fail(message) {
  console.error(`\nConfiguration error: ${message}\n`);
  process.exit(1);
}
const { MONGO_URI, JWT_SECRET } = process.env;
if (!MONGO_URI) fail('MONGO_URI is not set. Use a local MongoDB URL or a MongoDB Atlas connection string.');
if (!JWT_SECRET) fail('JWT_SECRET is not set.');
if (isProd && (JWT_SECRET.length < 16 || /change-this|replace-with/i.test(JWT_SECRET))) {
  fail('JWT_SECRET is too weak for production. Use at least 16 random characters.');
}

export const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render, Railway, Fly, Nginx...
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
// The frontend is served by this same server in production, so CORS is only needed in development
// or when the frontend lives on another domain (set CORS_ORIGIN).
if (!isProd || process.env.CORS_ORIGIN) {
  app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) } : undefined));
}
app.use(express.json({ limit: '100kb' }));

// ---- abuse protection (on in production) ----
const limiter = (opts) =>
  isProd && !process.env.DISABLE_RATE_LIMIT
    ? rateLimit({ standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again in a few minutes.' }, ...opts })
    : (req, res, next) => next();
// Only failed logins count, so a shared campus IP is not locked out by successful sign-ins.
app.use('/api/auth/login', limiter({ windowMs: 15 * 60 * 1000, max: 30, skipSuccessfulRequests: true }));
app.use('/api/auth/register', limiter({ windowMs: 60 * 60 * 1000, max: 40 }));

app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ ok: dbUp, db: dbUp ? 'connected' : 'disconnected' });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sessions/:id/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/config', configRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

// ---- serve the built React app (client/dist) from the same server ----
const dist = path.resolve(here, '../../client/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(
    express.static(dist, {
      index: false,
      maxAge: '1y', // build files are content-hashed
    })
  );
  // Any other GET is a client-side route (/explore, /u/123, ...)
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  console.log('client/dist not found: serving the API only. Run "npm run build" to include the website.');
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large' });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ message: 'Invalid JSON' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
try {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
} catch (e) {
  const m = String(e.message);
  let hint = 'Check MONGO_URI and, on Atlas, the Network Access allow-list.';
  if (/bad auth|Authentication failed/i.test(m)) {
    hint = 'The database username or password in MONGO_URI is wrong. On Atlas open Database Access, check the username (it is case-sensitive), set a new password, then update MONGO_URI.';
  } else if (/ENOTFOUND|querySrv|EBADNAME/i.test(m)) {
    hint = 'The cluster address in MONGO_URI was not found. Copy the connection string again from Atlas (Connect, then Drivers).';
  } else if (/timed out|ReplicaSetNoPrimary|Server selection/i.test(m)) {
    hint = 'The database could not be reached. On Atlas open Network Access and allow 0.0.0.0/0.';
  }
  fail(`Could not connect to MongoDB (${m}). ${hint}`);
}
console.log('MongoDB connected');

// Settings live in the database: create them from the defaults on first start.
await getConfig();
// Accounts listed in ADMIN_EMAILS become administrators.
if (adminEmails().length) {
  const r = await User.updateMany({ email: { $in: adminEmails() }, role: { $ne: 'admin' } }, { role: 'admin' });
  if (r.modifiedCount) console.log(`Promoted ${r.modifiedCount} account(s) listed in ADMIN_EMAILS to administrator`);
}
const server = app.listen(PORT, () => console.log(`SkillSwap running on port ${PORT} (${isProd ? 'production' : 'development'})`));

// Let the host stop the container cleanly.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 8000).unref();
  });
}
