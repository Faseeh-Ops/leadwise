import Groq from 'groq-sdk';
import { env } from '../config/env';

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return groqInstance;
}

export function getGroqClientWithKey(apiKey: string): Groq {
  return new Groq({ apiKey });
}
