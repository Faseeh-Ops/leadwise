import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../config/redis';

const connection = redis;

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

export const scrapeQueue = new Queue('scrape-queue', {
  connection,
  defaultJobOptions,
});

export const aiQueue = new Queue('ai-queue', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 8000 },
  },
});

export const sendQueue = new Queue('send-queue', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 10000 },
  },
});

export const scrapeQueueEvents = new QueueEvents('scrape-queue', { connection });
export const aiQueueEvents = new QueueEvents('ai-queue', { connection });
export const sendQueueEvents = new QueueEvents('send-queue', { connection });

export type ScrapeJobData = {
  campaignId: string;
  leadId: string;
  targetUrl: string;
};

export type AiJobData = {
  campaignId: string;
  leadId: string;
  credentialId?: string;
};

export type SendJobData = {
  campaignId: string;
  leadId: string;
  credentialId: string;
  stepIndex?: number;   // which email in the sequence to send (default 0)
};
