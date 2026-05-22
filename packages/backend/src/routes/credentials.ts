import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { ClientCredential } from '../models/ClientCredential';
import { encrypt } from '../crypto/aes';

const router = Router();

const CreateCredentialSchema = z.object({
  label: z.string().min(1).max(100),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().min(1).max(65535),
  smtpUser: z.string().email(),
  smtpPassword: z.string().min(1),
  smtpSecure: z.boolean().default(true),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  groqApiKey: z.string().min(1),
});

// GET /api/credentials
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  // toJSON transformer strips all ciphertext fields
  const creds = await ClientCredential.find().sort({ createdAt: -1 }).lean();
  // Manually strip encrypted fields from lean results
  const safe = creds.map(({ smtpPasswordCiphertext, smtpPasswordIv, smtpPasswordAuthTag,
    groqApiKeyCiphertext, groqApiKeyIv, groqApiKeyAuthTag, ...rest }) => rest);
  res.json({ success: true, data: safe });
});

// POST /api/credentials
router.post('/', requireAuth, validate(CreateCredentialSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof CreateCredentialSchema>;

  const encryptedPassword = encrypt(body.smtpPassword);
  const encryptedGroqKey = encrypt(body.groqApiKey);

  const credential = await ClientCredential.create({
    label: body.label,
    smtpHost: body.smtpHost,
    smtpPort: body.smtpPort,
    smtpUser: body.smtpUser,
    smtpSecure: body.smtpSecure,
    fromName: body.fromName,
    fromEmail: body.fromEmail,
    smtpPasswordCiphertext: encryptedPassword.ciphertext,
    smtpPasswordIv: encryptedPassword.iv,
    smtpPasswordAuthTag: encryptedPassword.authTag,
    groqApiKeyCiphertext: encryptedGroqKey.ciphertext,
    groqApiKeyIv: encryptedGroqKey.iv,
    groqApiKeyAuthTag: encryptedGroqKey.authTag,
  });

  const safe = credential.toJSON();
  res.status(201).json({ success: true, data: safe });
});

// DELETE /api/credentials/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const deleted = await ClientCredential.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Credential not found' });
    return;
  }
  res.json({ success: true, message: 'Credential deleted' });
});

export default router;
