import mongoose, { Document, Schema, Types } from 'mongoose';

export type LeadStatus =
  | 'queued'
  | 'scraping'
  | 'ai_processing'
  | 'pending_review'
  | 'approved'
  | 'sent'
  | 'replied'
  | 'failed';

export interface IErrorLog {
  timestamp: Date;
  message: string;
  stack: string;
  jobId?: string;
  queue?: string;
}

export interface IAiGeneratedEmail {
  subject: string;
  body: string;
  painPoints: string[];
  tone: 'professional' | 'conversational' | 'urgent';
  approved: boolean;
  approvedAt?: Date;
  editedSubject?: string;
  editedBody?: string;
  stepIndex: number;      // 0 = initial, 1 = follow-up, 2 = break-up
  sendDelay: number;      // ms delay from campaign start (0 for first email)
  sentAt?: Date;
}

export interface ILead extends Document {
  campaignId: Types.ObjectId;
  targetUrl: string;
  companyName?: string;
  website?: string;
  industry?: string;
  employeeRange?: string;
  location?: string;
  description?: string;
  contactEmails: string[];
  rawScrapedData?: Record<string, unknown>;
  emailSequence: IAiGeneratedEmail[];   // full drip sequence
  aiGeneratedEmail?: IAiGeneratedEmail; // kept for backward compat (= emailSequence[0])
  sequenceStep: number;                 // last sent step index
  status: LeadStatus;
  errorLog: IErrorLog[];
  retryCount: number;
  sentAt?: Date;
  repliedAt?: Date;
  replySnippet?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    timestamp: { type: Date, default: Date.now },
    message: { type: String, required: true },
    stack: { type: String, required: true },
    jobId: String,
    queue: String,
  },
  { _id: false },
);

const AiEmailSchema = new Schema<IAiGeneratedEmail>(
  {
    subject: { type: String, required: true },
    body: { type: String, required: true },
    painPoints: [{ type: String }],
    tone: {
      type: String,
      enum: ['professional', 'conversational', 'urgent'],
      default: 'professional',
    },
    approved: { type: Boolean, default: false },
    approvedAt: Date,
    editedSubject: String,
    editedBody: String,
    stepIndex: { type: Number, default: 0 },
    sendDelay: { type: Number, default: 0 },
    sentAt: Date,
  },
  { _id: false },
);

const LeadSchema = new Schema<ILead>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    targetUrl: { type: String, required: true },
    companyName: String,
    website: String,
    industry: String,
    employeeRange: String,
    location: String,
    description: String,
    contactEmails: [{ type: String }],
    rawScrapedData: { type: Schema.Types.Mixed },
    emailSequence: { type: [AiEmailSchema], default: [] },
    aiGeneratedEmail: AiEmailSchema,  // backward compat
    sequenceStep: { type: Number, default: -1 },
    status: {
      type: String,
      enum: ['queued', 'scraping', 'ai_processing', 'pending_review', 'approved', 'sent', 'replied', 'failed'],
      default: 'queued',
      index: true,
    },
    errorLog: [ErrorLogSchema],
    retryCount: { type: Number, default: 0 },
    sentAt: Date,
    repliedAt: Date,
    replySnippet: String,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

LeadSchema.index({ campaignId: 1, status: 1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
