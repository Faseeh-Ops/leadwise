import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { Campaign } from '../models/Campaign';
import { Lead } from '../models/Lead';
import { scrapeQueue, ScrapeJobData } from '../queues/index';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetUrls: z.array(z.string().url()).min(1).max(500),
  credentialId: z.string().optional(),
  tone: z.enum(['professional', 'conversational', 'urgent']).default('professional'),
});

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  credentialId: z.string().optional(),
  tone: z.enum(['professional', 'conversational', 'urgent']).optional(),
});

// GET /api/campaigns
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: campaigns });
});

// POST /api/campaigns
router.post('/', requireAuth, validate(CreateCampaignSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof CreateCampaignSchema>;

  const campaign = await Campaign.create({
    name: body.name,
    description: body.description,
    targetUrls: body.targetUrls,
    credentialId: body.credentialId ? new Types.ObjectId(body.credentialId) : undefined,
    tone: body.tone ?? 'professional',
    stats: {
      total: body.targetUrls.length,
      scraped: 0,
      processed: 0,
      sent: 0,
      failed: 0,
    },
  });

  res.status(201).json({ success: true, data: campaign });
});

// GET /api/campaigns/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const campaign = await Campaign.findById(req.params.id).lean();
  if (!campaign) {
    res.status(404).json({ success: false, message: 'Campaign not found' });
    return;
  }
  res.json({ success: true, data: campaign });
});

// PATCH /api/campaigns/:id
router.patch('/:id', requireAuth, validate(UpdateCampaignSchema), async (req: Request, res: Response) => {
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!campaign) {
    res.status(404).json({ success: false, message: 'Campaign not found' });
    return;
  }
  res.json({ success: true, data: campaign });
});

// DELETE /api/campaigns/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    res.status(404).json({ success: false, message: 'Campaign not found' });
    return;
  }
  if (campaign.status === 'running') {
    res.status(400).json({ success: false, message: 'Cannot delete a running campaign. Pause it first.' });
    return;
  }
  await Campaign.findByIdAndDelete(req.params.id);
  await Lead.deleteMany({ campaignId: req.params.id });
  res.json({ success: true, message: 'Campaign and all associated leads deleted' });
});

// POST /api/campaigns/:id/start
router.post('/:id/start', requireAuth, async (req: Request, res: Response) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    res.status(404).json({ success: false, message: 'Campaign not found' });
    return;
  }
  if (campaign.status === 'running') {
    res.status(400).json({ success: false, message: 'Campaign already running' });
    return;
  }

  await Campaign.findByIdAndUpdate(req.params.id, { status: 'running' });

  const jobs: Array<{ data: ScrapeJobData; opts: { jobId: string } }> = [];

  for (const url of campaign.targetUrls) {
    const lead = await Lead.create({
      campaignId: campaign._id,
      targetUrl: url,
      status: 'queued',
    });

    jobs.push({
      data: {
        campaignId: campaign._id.toString(),
        leadId: lead._id.toString(),
        targetUrl: url,
      },
      opts: { jobId: `scrape-${lead._id.toString()}` },
    });
  }

  await scrapeQueue.addBulk(jobs.map((j) => ({ name: 'scrape', data: j.data, opts: j.opts })));

  res.json({
    success: true,
    message: `Campaign started — ${jobs.length} scrape jobs enqueued`,
    jobsEnqueued: jobs.length,
  });
});

// POST /api/campaigns/:id/pause
router.post('/:id/pause', requireAuth, async (req: Request, res: Response) => {
  await Campaign.findByIdAndUpdate(req.params.id, { status: 'paused' });
  res.json({ success: true, message: 'Campaign paused' });
});

// POST /api/campaigns/:id/upload-csv
router.post(
  '/:id/upload-csv',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    let rows: Record<string, string>[];
    try {
      rows = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch {
      res.status(400).json({ success: false, message: 'Invalid CSV format' });
      return;
    }

    // Accept columns: url, website, URL, Website, link, Link
    const urlColumns = ['url', 'URL', 'website', 'Website', 'link', 'Link'];
    const urls: string[] = [];
    for (const row of rows) {
      const col = urlColumns.find((c) => row[c]);
      if (col && row[col]) {
        try {
          new URL(row[col]);
          urls.push(row[col]);
        } catch {
          // skip invalid URLs
        }
      }
    }

    if (urls.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid URLs found. Ensure your CSV has a "url", "website", or "link" column.',
      });
      return;
    }

    // Add URLs to campaign and enqueue scrape jobs
    await Campaign.findByIdAndUpdate(req.params.id, {
      $addToSet: { targetUrls: { $each: urls } },
      $inc: { 'stats.total': urls.length },
      status: 'running',
    });

    const jobs: Array<{ data: ScrapeJobData; opts: { jobId: string } }> = [];
    for (const url of urls) {
      const lead = await Lead.create({
        campaignId: campaign._id,
        targetUrl: url,
        status: 'queued',
      });
      jobs.push({
        data: {
          campaignId: campaign._id.toString(),
          leadId: lead._id.toString(),
          targetUrl: url,
        },
        opts: { jobId: `scrape-${lead._id.toString()}` },
      });
    }

    await scrapeQueue.addBulk(jobs.map((j) => ({ name: 'scrape', data: j.data, opts: j.opts })));

    res.json({
      success: true,
      message: `${urls.length} URLs imported from CSV and queued`,
      urlsImported: urls.length,
    });
  },
);

export default router;
