import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { logger } from './utils/logger';
import uploadRouter from './api/routes/upload';
import jobsRouter from './api/routes/jobs';
import downloadRouter from './api/routes/download';
import formatsRouter from './api/routes/formats';
import healthRouter from './api/routes/health';
import analyzerRouter from './api/routes/analyzer';
import { errorHandler, notFoundHandler, requestIdMiddleware } from './api/middleware/errorHandler';

const app = express();

// ─── Security Headers ──────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
    credentials: true,
  })
);

// ─── Compression ────────────────────────────────────────────────────────────
app.use(compression());

// ─── Request ID ─────────────────────────────────────────────────────────────
app.use(requestIdMiddleware);

// ─── Logging ────────────────────────────────────────────────────────────────
app.use(
  morgan(':method :url :status :response-time ms - :res[content-length]', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/health' || req.path === '/ready',
  })
);

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait a moment before trying again.',
  },
  skip: (req) =>
    req.path === '/health' ||
    req.path === '/ready' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === '::ffff:127.0.0.1' ||
    process.env.NODE_ENV === 'test',
});

app.use('/api', limiter);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/upload', uploadRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/download', downloadRouter);
app.use('/api/formats', formatsRouter);
app.use('/api/analyze', analyzerRouter);
app.use('/health', healthRouter);
app.use('/ready', healthRouter);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

export default app;
