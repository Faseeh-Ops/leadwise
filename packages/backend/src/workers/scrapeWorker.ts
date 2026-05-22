import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { Lead } from '../models/Lead';
import { Campaign } from '../models/Campaign';
import { scrapeUrl } from '../scraper/playwrightScraper';
import { aiQueue, ScrapeJobData } from '../queues/index';
import { getSocketServer } from '../socket/socketServer';

export function createScrapeWorker(): Worker<ScrapeJobData> {
  const worker = new Worker<ScrapeJobData>(
    'scrape-queue',
    async (job: Job<ScrapeJobData>) => {
      const { campaignId, leadId, targetUrl } = job.data;
      const io = getSocketServer();

      await Lead.findByIdAndUpdate(leadId, { status: 'scraping' });
      io?.emit('lead:updated', { leadId, status: 'scraping' });

      await job.updateProgress(10);

      let scraped;
      try {
        scraped = await scrapeUrl(targetUrl);
      } catch (err) {
        const error = err as Error;
        await Lead.findByIdAndUpdate(leadId, {
          $push: {
            errorLog: {
              timestamp: new Date(),
              message: error.message,
              stack: error.stack ?? '',
              jobId: job.id,
              queue: 'scrape-queue',
            },
          },
          $inc: { retryCount: 1 },
        });
        throw error; // BullMQ will schedule exponential backoff retry
      }

      await job.updateProgress(70);

      await Lead.findByIdAndUpdate(leadId, {
        status: 'ai_processing',
        companyName: scraped.companyName,
        website: scraped.website,
        description: scraped.description,
        contactEmails: scraped.contactEmails,
        rawScrapedData: {
          phoneNumbers: scraped.phoneNumbers,
          socialLinks: scraped.socialLinks,
          rawText: scraped.rawText?.slice(0, 2000),
        },
      });

      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'stats.scraped': 1 },
      });

      io?.emit('lead:updated', { leadId, status: 'ai_processing' });
      io?.emit('job:completed', { jobId: job.id, queue: 'scrape-queue', leadId });

      await job.updateProgress(90);

      // Enqueue AI processing job
      await aiQueue.add('generate-email', { campaignId, leadId }, { jobId: `ai-${leadId}` });

      await job.updateProgress(100);
      return { leadId, companyName: scraped.companyName };
    },
    {
      connection: redis,
      concurrency: 3,
    },
  );

  worker.on('active', (job) => {
    const io = getSocketServer();
    io?.emit('job:active', { jobId: job.id, queue: 'scrape-queue', data: job.data });
    console.log(`[scrape-worker] Active: ${job.id} → ${job.data.targetUrl}`);
  });

  worker.on('failed', (job, err) => {
    const io = getSocketServer();
    io?.emit('job:failed', { jobId: job?.id, queue: 'scrape-queue', error: err.message });
    console.error(`[scrape-worker] Failed: ${job?.id}`, err.message);
  });

  return worker;
}
