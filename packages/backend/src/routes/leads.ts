import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { Lead } from '../models/Lead';
import { Campaign } from '../models/Campaign';
import { sendQueue } from '../queues/index';

const router = Router();

const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  campaignId: z.string().optional(),
  search: z.string().optional(),
});

const UpdateLeadEmailSchema = z.object({
  editedSubject: z.string().min(1).max(200).optional(),
  editedBody: z.string().min(1).max(5000).optional(),
  contactEmails: z.array(z.string().email()).optional(),
  stepIndex: z.number().min(0).max(10).optional(),
});

// GET /api/leads
router.get('/', requireAuth, validate(PaginationSchema, 'query'), async (req: Request, res: Response) => {
  const { page, limit, status, campaignId, search } = req.query as unknown as z.infer<typeof PaginationSchema>;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (campaignId) filter.campaignId = campaignId;
  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { targetUrl: { $regex: search, $options: 'i' } },
    ];
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .select('-rawScrapedData -errorLog')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: leads,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/leads/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  res.json({ success: true, data: lead });
});

// PATCH /api/leads/:id/email
router.patch('/:id/email', requireAuth, validate(UpdateLeadEmailSchema), async (req: Request, res: Response) => {
  const { editedSubject, editedBody, contactEmails, stepIndex } = req.body as z.infer<typeof UpdateLeadEmailSchema>;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  if (lead.emailSequence.length === 0 && !lead.aiGeneratedEmail) {
    res.status(400).json({ success: false, message: 'Lead has no AI-generated email to edit' });
    return;
  }

  // Update specific sequence step if it exists
  if (stepIndex !== undefined && lead.emailSequence.length > stepIndex) {
    if (editedSubject !== undefined) lead.emailSequence[stepIndex].editedSubject = editedSubject;
    if (editedBody !== undefined) lead.emailSequence[stepIndex].editedBody = editedBody;
  } else if (lead.aiGeneratedEmail) {
    // Fallback to legacy single email
    if (editedSubject !== undefined) lead.aiGeneratedEmail.editedSubject = editedSubject;
    if (editedBody !== undefined) lead.aiGeneratedEmail.editedBody = editedBody;
  }

  if (contactEmails !== undefined) lead.contactEmails = contactEmails;
  await lead.save();

  res.json({ success: true, data: lead });
});

// POST /api/leads/:id/approve
router.post('/:id/approve', requireAuth, async (req: Request, res: Response) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  if (lead.emailSequence.length === 0 && !lead.aiGeneratedEmail) {
    res.status(400).json({ success: false, message: 'Lead has no AI-generated email' });
    return;
  }
  if (lead.contactEmails.length === 0) {
    res.status(400).json({ success: false, message: 'Lead has no contact emails — cannot send' });
    return;
  }

  // Approve the whole sequence
  if (lead.emailSequence.length > 0) {
    lead.emailSequence.forEach((e) => { e.approved = true; e.approvedAt = new Date(); });
  }
  if (lead.aiGeneratedEmail) {
    lead.aiGeneratedEmail.approved = true;
    lead.aiGeneratedEmail.approvedAt = new Date();
  }
  lead.status = 'approved';
  await lead.save();

  // Get campaign's credentialId
  const campaign = await Campaign.findById(lead.campaignId);
  if (!campaign?.credentialId) {
    res.status(400).json({ success: false, message: 'Campaign has no SMTP credential configured' });
    return;
  }

  // Enqueue only step 0; the send worker will schedule subsequent steps automatically
  await sendQueue.add(
    'send-email',
    {
      campaignId: lead.campaignId.toString(),
      leadId: lead._id.toString(),
      credentialId: campaign.credentialId.toString(),
      stepIndex: 0,
    },
    { jobId: `send-${lead._id.toString()}-step0` },
  );

  res.json({ success: true, message: 'Email sequence approved and queued for sending', data: lead });
});

// POST /api/leads/:id/mark-replied
router.post('/:id/mark-replied', requireAuth, async (req: Request, res: Response) => {
  const { replySnippet } = req.body as { replySnippet?: string };
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  lead.status = 'replied';
  lead.repliedAt = new Date();
  if (replySnippet) lead.replySnippet = replySnippet;
  await lead.save();

  const { getSocketServer } = await import('../socket/socketServer');
  const io = getSocketServer();
  io?.emit('lead:updated', { leadId: lead._id.toString(), status: 'replied' });

  res.json({ success: true, data: lead });
});

// DELETE /api/leads/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const deleted = await Lead.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }
  res.json({ success: true, message: 'Lead deleted' });
});

export default router;

