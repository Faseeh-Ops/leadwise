import request from 'supertest';
import mongoose from 'mongoose';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { Lead } from '../../src/models/Lead';
import { Campaign } from '../../src/models/Campaign';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://admin:leadgen_secret@localhost:27017/leadgen_test?authSource=admin';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_for_validation';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_for_validation';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBMmYoXfqYvpoe';
process.env.GROQ_API_KEY = 'gsk_test_key_not_real';
process.env.FRONTEND_URL = 'http://localhost:5173';

let app: Express;
let authCookie: string;
let testCampaignId: string;
let testLeadId: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  app = createApp();

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'password123' });
  authCookie = loginRes.headers['set-cookie']?.[0] ?? '';

  const campaign = await Campaign.create({
    name: 'Test Campaign',
    targetUrls: ['https://example.com'],
    stats: { total: 1, scraped: 0, processed: 0, sent: 0, failed: 0 },
  });
  testCampaignId = campaign._id.toString();

  const lead = await Lead.create({
    campaignId: campaign._id,
    targetUrl: 'https://example.com',
    companyName: 'Example Corp',
    status: 'pending_review',
    contactEmails: ['contact@example.com'],
    aiGeneratedEmail: {
      subject: 'Quick question for Example Corp',
      body: 'Hi there,\n\nI noticed your company...',
      painPoints: ['Scaling operations', 'Customer acquisition'],
      tone: 'professional',
      approved: false,
    },
  });
  testLeadId = lead._id.toString();
});

afterAll(async () => {
  await Lead.deleteMany({});
  await Campaign.deleteMany({});
  await mongoose.disconnect();
});

describe('GET /api/leads', () => {
  it('should return paginated leads', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Cookie', authCookie)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
  });

  it('should filter leads by status', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Cookie', authCookie)
      .query({ status: 'pending_review' });

    expect(res.status).toBe(200);
    expect(res.body.data.every((l: { status: string }) => l.status === 'pending_review')).toBe(true);
  });

  it('should reject invalid pagination params with 422', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Cookie', authCookie)
      .query({ page: 'abc', limit: 200 });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/leads/:id', () => {
  it('should return full lead with AI email data', async () => {
    const res = await request(app)
      .get(`/api/leads/${testLeadId}`)
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.aiGeneratedEmail).toBeDefined();
    expect(res.body.data.aiGeneratedEmail.subject).toBe('Quick question for Example Corp');
  });
});

describe('PATCH /api/leads/:id/email', () => {
  it('should update edited email body', async () => {
    const res = await request(app)
      .patch(`/api/leads/${testLeadId}/email`)
      .set('Cookie', authCookie)
      .send({ editedBody: 'Updated email body content here.' });

    expect(res.status).toBe(200);
    expect(res.body.data.aiGeneratedEmail.editedBody).toBe('Updated email body content here.');
  });
});
