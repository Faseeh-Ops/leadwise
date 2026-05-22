import { Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from '../config/env';

export function applySecurityMiddleware(app: Express): void {
  // Helmet: sets secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global rate limiter
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please slow down.' },
      skip: (req) => env.NODE_ENV === 'test' || env.NODE_ENV === 'development',
    }),
  );

  // Stricter rate limit for auth endpoints
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: { success: false, message: 'Too many auth attempts. Try again later.' },
      skip: () => env.NODE_ENV === 'test' || env.NODE_ENV === 'development',
    }),
  );

  // Sanitize MongoDB query injection via req.body, req.query, req.params
  app.use(
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`⚠️  Sanitized key "${key}" from ${req.ip}`);
      },
    }),
  );
}
