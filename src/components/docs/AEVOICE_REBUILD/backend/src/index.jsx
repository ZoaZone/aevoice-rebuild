import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import entityRoutes from './routes/entities.js';
import proxyRoutes from './routes/proxy.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & Middleware ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:1420',   // Tauri dev server
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Session ────────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'aevoice-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24h
  },
}));

// ── Rate Limiting ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/apps', entityRoutes);
app.use('/proxy', proxyRoutes);

// ── Error Handler ──────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[AEVOICE Backend] Running on http://localhost:${PORT}`);
  console.log(`[AEVOICE Backend] NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`[AEVOICE Backend] BASE44_APP_ID=${process.env.BASE44_APP_ID}`);
});

export default app;