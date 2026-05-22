import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { scrapeQueue, aiQueue, sendQueue } from '../queues/index';

let ioInstance: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Send initial queue metrics on connection
    sendQueueMetrics(socket);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // Broadcast queue metrics every 5 seconds
  setInterval(() => {
    sendQueueMetrics(io);
  }, 5000);

  return io;
}

async function sendQueueMetrics(target: Server | Socket): Promise<void> {
  try {
    const [scrapeWaiting, scrapeActive, scrapeFailed] = await Promise.all([
      scrapeQueue.getWaitingCount(),
      scrapeQueue.getActiveCount(),
      scrapeQueue.getFailedCount(),
    ]);

    const [aiWaiting, aiActive, aiFailed] = await Promise.all([
      aiQueue.getWaitingCount(),
      aiQueue.getActiveCount(),
      aiQueue.getFailedCount(),
    ]);

    const [sendWaiting, sendActive, sendFailed] = await Promise.all([
      sendQueue.getWaitingCount(),
      sendQueue.getActiveCount(),
      sendQueue.getFailedCount(),
    ]);

    target.emit('queue:metrics', {
      scrape: { waiting: scrapeWaiting, active: scrapeActive, failed: scrapeFailed },
      ai: { waiting: aiWaiting, active: aiActive, failed: aiFailed },
      send: { waiting: sendWaiting, active: sendActive, failed: sendFailed },
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Non-critical — metrics emit failure shouldn't crash the server
  }
}

export function getSocketServer(): Server | null {
  return ioInstance;
}
