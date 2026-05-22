import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { Lead } from '../models/Lead';
import { Campaign } from '../models/Campaign';
import { sendEmail } from '../mailer/smtpSender';
import { sendQueue, SendJobData } from '../queues/index';
import { getSocketServer } from '../socket/socketServer';

export function createSendWorker(): Worker<SendJobData> {
  const worker = new Worker<SendJobData>(
    'send-queue',
    async (job: Job<SendJobData>) => {
      const { campaignId, leadId, credentialId, stepIndex = 0 } = job.data;
      const io = getSocketServer();

      const lead = await Lead.findById(leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found`);
      if (lead.contactEmails.length === 0) throw new Error(`Lead ${leadId} has no contact emails`);

      // Get the correct email step from the sequence (or fall back to legacy aiGeneratedEmail)
      const emailStep = lead.emailSequence?.[stepIndex] ?? lead.aiGeneratedEmail;
      if (!emailStep) throw new Error(`Lead ${leadId} has no email at step ${stepIndex}`);

      const subject = emailStep.editedSubject ?? emailStep.subject;
      const body    = emailStep.editedBody   ?? emailStep.body;

      await job.updateProgress(20);

      try {
        const result = await sendEmail(credentialId, {
          to: lead.contactEmails[0],
          subject,
          body,
          fromName: 'Lead Gen Engine',
          fromEmail: '',
        });

        await job.updateProgress(70);

        // Mark this step as sent
        const isLastStep = stepIndex >= (lead.emailSequence.length - 1);

        await Lead.findByIdAndUpdate(leadId, {
          // Only set overall status to 'sent' after the last step
          ...(isLastStep ? { status: 'sent', sentAt: new Date() } : {}),
          sequenceStep: stepIndex,
          [`emailSequence.${stepIndex}.sentAt`]: new Date(),
        });

        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { 'stats.sent': isLastStep ? 1 : 0 },
        });

        // Schedule the next step in the sequence if there is one
        if (!isLastStep) {
          const nextStep = lead.emailSequence[stepIndex + 1];
          if (nextStep) {
            const delay = nextStep.sendDelay ?? 0;
            await sendQueue.add(
              'send-email',
              {
                campaignId,
                leadId,
                credentialId,
                stepIndex: stepIndex + 1,
              },
              {
                jobId: `send-${leadId}-step${stepIndex + 1}`,
                delay,
              },
            );
            console.log(
              `[send-worker] Scheduled step ${stepIndex + 1} for lead ${leadId} with delay ${delay}ms`,
            );
          }
        }

        io?.emit('lead:updated', { leadId, status: isLastStep ? 'sent' : 'approved', stepIndex });
        io?.emit('job:completed', { jobId: job.id, queue: 'send-queue', leadId, stepIndex });

        await job.updateProgress(100);
        return { leadId, stepIndex, messageId: result.messageId };
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
              queue: 'send-queue',
            },
          },
        });
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { 'stats.failed': 1 },
        });
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1, // Rate limit sending
    },
  );

  worker.on('active', (job) => {
    const io = getSocketServer();
    io?.emit('job:active', { jobId: job.id, queue: 'send-queue', data: job.data });
    console.log(`[send-worker] Sending step ${job.data.stepIndex ?? 0} for lead ${job.data.leadId}`);
  });

  worker.on('failed', (job, err) => {
    const io = getSocketServer();
    io?.emit('job:failed', { jobId: job?.id, queue: 'send-queue', error: err.message });
    console.error(`[send-worker] Failed: ${job?.id}`, err.message);
  });

  return worker;
}
