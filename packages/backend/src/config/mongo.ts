import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) return;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
    isConnected = true;
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected — retrying...');
    isConnected = false;
    setTimeout(() => connectMongo(), 5000);
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
}

export function disconnectMongo(): Promise<void> {
  return mongoose.disconnect();
}
