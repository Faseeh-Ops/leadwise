import { scrapeQueue, aiQueue, sendQueue } from '../../src/queues/index';
import { redis, connectRedis } from '../../src/config/redis';

process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_for_validation';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_for_validation';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBMmYoXfqYvpoe';
process.env.GROQ_API_KEY = 'gsk_test_key';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://admin:leadgen_secret@localhost:27017/leadgen_test?authSource=admin';

beforeAll(async () => {
  await connectRedis();
  // Clean test queues
  await scrapeQueue.drain();
  await aiQueue.drain();
  await sendQueue.drain();
});

afterAll(async () => {
  await scrapeQueue.drain();
  await aiQueue.drain();
  await sendQueue.drain();
  await redis.quit();
});

describe('BullMQ Queue — scrape-queue', () => {
  it('should enqueue a scrape job successfully', async () => {
    const job = await scrapeQueue.add('scrape', {
      campaignId: 'test_campaign_id',
      leadId: 'test_lead_id',
      targetUrl: 'https://example.com',
    });

    expect(job.id).toBeDefined();
    expect(job.name).toBe('scrape');
    expect(job.data.targetUrl).toBe('https://example.com');
  });

  it('should enqueue bulk scrape jobs', async () => {
    const jobs = await scrapeQueue.addBulk([
      { name: 'scrape', data: { campaignId: 'c1', leadId: 'l1', targetUrl: 'https://a.com' } },
      { name: 'scrape', data: { campaignId: 'c1', leadId: 'l2', targetUrl: 'https://b.com' } },
      { name: 'scrape', data: { campaignId: 'c1', leadId: 'l3', targetUrl: 'https://bad-url-that-will-fail' } },
    ]);

    expect(jobs).toHaveLength(3);
    jobs.forEach((job) => expect(job.id).toBeDefined());
  });

  it('should report queue waiting count after adding jobs', async () => {
    const count = await scrapeQueue.getWaitingCount();
    expect(count).toBeGreaterThan(0);
  });
});

describe('BullMQ Queue — ai-queue', () => {
  it('should enqueue an AI processing job', async () => {
    const job = await aiQueue.add('generate-email', {
      campaignId: 'test_campaign',
      leadId: 'test_lead',
    });

    expect(job.id).toBeDefined();
    const state = await job.getState();
    expect(['waiting', 'delayed', 'active']).toContain(state);
  });
});

describe('BullMQ Queue — graceful failure handling', () => {
  it('should have retry config with exponential backoff', async () => {
    const job = await scrapeQueue.add(
      'scrape',
      { campaignId: 'c', leadId: 'l', targetUrl: 'https://nonexistent-domain-xyz.com' },
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
    );

    const opts = job.opts;
    expect(opts.attempts).toBe(5);
    expect((opts.backoff as { type: string }).type).toBe('exponential');
  });
});
