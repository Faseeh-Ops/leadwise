import request from 'supertest';
import mongoose from 'mongoose';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { Campaign } from '../../src/models/Campaign';

// Set test env vars before importing config
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.MONGODB_URI = 'mongodb://admin:leadgen_secret@localhost:27017/leadgen_test?authSource=admin';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_for_validation';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_for_validation';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBMmYoXfqYvpoe'; // 'password123'
process.env.GROQ_API_KEY = 'gsk_test_key_not_real';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX = '100';

let app: Express;
let authCookie: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  app = createApp();

  // Login to get auth cookie
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'password123' });

  authCookie = loginRes.headers['set-cookie']?.[0] ?? '';
  if (!authCookie) {
    console.log('Login failed:', loginRes.body);
  }
});

afterAll(async () => {
  await Campaign.deleteMany({});
  await mongoose.disconnect();
});

describe('POST /api/campaigns', () => {
  it('should reject missing name with 422', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', authCookie)
      .send({ targetUrls: ['https://example.com'] });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject invalid URLs with 422', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', authCookie)
      .send({ name: 'Test', targetUrls: ['not-a-url', 'also-bad'] });

    expect(res.status).toBe(422);
  });

  it('should reject empty targetUrls with 422', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', authCookie)
      .send({ name: 'Test', targetUrls: [] });

    expect(res.status).toBe(422);
  });

  it('should create a campaign with valid data', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', authCookie)
      .send({
        name: 'Integration Test Campaign',
        description: 'Created by Jest',
        targetUrls: ['https://example.com', 'https://stripe.com'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Integration Test Campaign');
    expect(res.body.data.stats.total).toBe(2);
  });

  it('should reject unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .send({ name: 'X', targetUrls: ['https://example.com'] });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/campaigns', () => {
  it('should list campaigns', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 404 for unknown campaign', async () => {
    const res = await request(app)
      .get('/api/campaigns/000000000000000000000000')
      .set('Cookie', authCookie);

    expect(res.status).toBe(404);
  });
});
