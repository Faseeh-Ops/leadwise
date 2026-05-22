import nodemailer from 'nodemailer';
import { decrypt } from '../crypto/aes';
import { ClientCredential, IClientCredential } from '../models/ClientCredential';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
}

async function createTransporter(credential: IClientCredential): Promise<nodemailer.Transporter> {
  const smtpPassword = decrypt({
    ciphertext: credential.smtpPasswordCiphertext,
    iv: credential.smtpPasswordIv,
    authTag: credential.smtpPasswordAuthTag,
  });

  const transporter = nodemailer.createTransport({
    host: credential.smtpHost,
    port: credential.smtpPort,
    secure: credential.smtpSecure,
    auth: {
      user: credential.smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.verify();
  return transporter;
}

export async function sendEmail(
  credentialId: string,
  payload: EmailPayload,
): Promise<{ messageId: string }> {
  const credential = await ClientCredential.findById(credentialId);
  if (!credential) throw new Error(`Credential ${credentialId} not found`);

  const transporter = await createTransporter(credential);

  const info = await transporter.sendMail({
    from: `"${payload.fromName}" <${payload.fromEmail}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
    html: payload.body.replace(/\n/g, '<br>'),
  });

  return { messageId: info.messageId as string };
}
