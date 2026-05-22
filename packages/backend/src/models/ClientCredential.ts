import mongoose, { Document, Schema } from 'mongoose';

/**
 * SECURITY: All sensitive fields (SMTP password, Groq API key) are stored
 * AES-256-GCM encrypted. Never store plaintext secrets.
 * Decryption is ONLY performed in worker service contexts.
 */
export interface IClientCredential extends Document {
  label: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  fromName: string;
  fromEmail: string;

  // AES-256-GCM encrypted fields
  smtpPasswordCiphertext: string;
  smtpPasswordIv: string;
  smtpPasswordAuthTag: string;

  groqApiKeyCiphertext: string;
  groqApiKeyIv: string;
  groqApiKeyAuthTag: string;

  createdAt: Date;
  updatedAt: Date;
}

const ClientCredentialSchema = new Schema<IClientCredential>(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    smtpHost: { type: String, required: true, trim: true },
    smtpPort: { type: Number, required: true, min: 1, max: 65535 },
    smtpUser: { type: String, required: true, trim: true },
    smtpSecure: { type: Boolean, default: true },
    fromName: { type: String, required: true, trim: true },
    fromEmail: { type: String, required: true, trim: true },

    smtpPasswordCiphertext: { type: String, required: true },
    smtpPasswordIv: { type: String, required: true },
    smtpPasswordAuthTag: { type: String, required: true },

    groqApiKeyCiphertext: { type: String, required: true },
    groqApiKeyIv: { type: String, required: true },
    groqApiKeyAuthTag: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Never return encrypted raw fields in JSON responses
ClientCredentialSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as any).smtpPasswordCiphertext;
    delete (ret as any).smtpPasswordIv;
    delete (ret as any).smtpPasswordAuthTag;
    delete (ret as any).groqApiKeyCiphertext;
    delete (ret as any).groqApiKeyIv;
    delete (ret as any).groqApiKeyAuthTag;
    return ret;
  },
});

export const ClientCredential = mongoose.model<IClientCredential>(
  'ClientCredential',
  ClientCredentialSchema,
);
