import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { Lead } from '../models/Lead';
import { Campaign } from '../models/Campaign';
import { ClientCredential } from '../models/ClientCredential';
import { generateEmailSequence } from '../ai/promptOrchestrator';
import { decrypt } from '../crypto/aes';
import { AiJobData } from '../queues/index';
import { getSocketServer } from '../socket/socketServer';

export function createAiWorker(): Worker<AiJobData> {
  const worker = new Worker<AiJobData>(
    'ai-queue',
    async (job: Job<AiJobData>) => {
      const { campaignId, leadId, credentialId } = job.data;
      const io = getSocketServer();

      await Lead.findByIdAndUpdate(leadId, { status: 'ai_processing' });
      await job.updateProgress(10);

      const lead = await Lead.findById(leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found`);

      // Fetch campaign for tone setting
      const campaign = await Campaign.findById(campaignId);
      const tone = campaign?.tone ?? 'professional';

      // Resolve Groq API key — prefer credential-level key, fallback to global env key
      let groqApiKey: string | undefined;
      if (credentialId) {
        const cred = await ClientCredential.findById(credentialId);
        if (cred) {
          groqApiKey = decrypt({
            ciphertext: cred.groqApiKeyCiphertext,
            iv: cred.groqApiKeyIv,
            authTag: cred.groqApiKeyAuthTag,
          });
        }
      }

      await job.updateProgress(20);

      let emailSequence;
      try {
        emailSequence = await generateEmailSequence(
          {
            companyName: lead.companyName,
            website: lead.website,
            industry: lead.industry,
            employeeRange: lead.employeeRange,
            location: lead.location,
            description: lead.description,
            contactEmails: lead.contactEmails,
          },
          groqApiKey,
          tone,
        );
      } catch (err) {
        const error = err as Error;
        await Lead.findByIdAndUpdate(leadId, {
          status: 'failed',
          $push: {
            errorLog: {
              timestamp: new Date(),
              message: error.message,
              stack: error.stack ?? '',
              jobId: job.id,
              queue: 'ai-queue',
            },
          },
        });
        throw error;
      }

      await job.updateProgress(80);

      // Store full sequence + keep aiGeneratedEmail pointing at step 0 for backward compat
      const firstEmail = emailSequence[0];
      await Lead.findByIdAndUpdate(leadId, {
        status: 'pending_review',
        emailSequence,
        aiGeneratedEmail: {
          ...firstEmail,
          approved: false,
        },
      });

      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'stats.processed': 1 },
      });

      io?.emit('lead:updated', { leadId, status: 'pending_review' });
      io?.emit('job:completed', { jobId: job.id, queue: 'ai-queue', leadId });

      await job.updateProgress(100);
      return { leadId, subject: firstEmail.subject, sequenceLength: emailSequence.length };
    },
    {
      connection: redis,
      concurrency: 2,
    },
  );

  worker.on('active', (job) => {
    const io = getSocketServer();
    io?.emit('job:active', { jobId: job.id, queue: 'ai-queue', data: job.data });
    console.log(`[ai-worker] Active: ${job.id} → lead ${job.data.leadId}`);
  });

  worker.on('failed', (job, err) => {
    const io = getSocketServer();
    io?.emit('job:failed', { jobId: job?.id, queue: 'ai-queue', error: err.message });
    console.error(`[ai-worker] Failed: ${job?.id}`, err.message);
  });

  return worker;
}
