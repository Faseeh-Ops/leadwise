import mongoose, { Document, Schema, Types } from 'mongoose';

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed';
export type CampaignTone = 'professional' | 'conversational' | 'urgent';

export interface ICampaignStats {
  total: number;
  scraped: number;
  processed: number;
  sent: number;
  failed: number;
}

export interface ICampaign extends Document {
  name: string;
  description?: string;
  targetUrls: string[];
  credentialId?: Types.ObjectId;
  status: CampaignStatus;
  tone: CampaignTone;
  stats: ICampaignStats;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    targetUrls: [{ type: String, required: true }],
    credentialId: { type: Schema.Types.ObjectId, ref: 'ClientCredential' },
    tone: {
      type: String,
      enum: ['professional', 'conversational', 'urgent'],
      default: 'professional',
    },
    status: {
      type: String,
      enum: ['draft', 'running', 'paused', 'completed'],
      default: 'draft',
      index: true,
    },
    stats: {
      total: { type: Number, default: 0 },
      scraped: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
