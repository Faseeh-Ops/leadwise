import http from 'http';
import { createApp } from './app';
import { connectMongo } from './config/mongo';
import { connectRedis } from './config/redis';
import { initSocketServer } from './socket/socketServer';
import { createScrapeWorker } from './workers/scrapeWorker';
import { createAiWorker } from './workers/aiWorker';
import { createSendWorker } from './workers/sendWorker';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  // Connect to external services first
  await connectRedis();
  await connectMongo();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Attach Socket.io
  initSocketServer(httpServer);

  // Start BullMQ workers
  const scrapeWorker = createScrapeWorker();
  const aiWorker = createAiWorker();
  const sendWorker = createSendWorker();

  console.log('🚀 Workers started: scrape, ai, send');

  httpServer.listen(env.PORT, () => {
    console.log(`✅ Server running on http://localhost:${env.PORT}`);
    console.log(`🔌 Socket.io ready`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
    httpServer.close(async () => {
      await Promise.all([
        scrapeWorker.close(),
        aiWorker.close(),
        sendWorker.close(),
      ]);
      console.log('✅ Workers closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('❌ Force shutdown after timeout');
      process.exit(1);
    }, 15000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
