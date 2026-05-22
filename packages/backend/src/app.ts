import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { applySecurityMiddleware } from './middleware/security';
import { env } from './config/env';
import authRouter from './routes/auth';
import campaignsRouter from './routes/campaigns';
import leadsRouter from './routes/leads';
import credentialsRouter from './routes/credentials';

export function createApp(): Express {
  const app = express();

  // Trust proxy (needed for rate-limiter behind Azure / nginx)
  app.set('trust proxy', 1);

  // CORS — allow frontend with credentials
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Security middleware (Helmet, rate-limit, mongo-sanitize)
  applySecurityMiddleware(app);

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Health check — excluded from auth
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/credentials', credentialsRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Express Error]', err.message, err.stack);
    const status = (err as NodeJS.ErrnoException & { status?: number }).status ?? 500;
    res.status(status).json({
      success: false,
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return app;
}
