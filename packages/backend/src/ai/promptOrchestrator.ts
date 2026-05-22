import { getGroqClient, getGroqClientWithKey } from './groqClient';

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional:
    'Use a formal, polished, and executive-level tone. Avoid contractions. Be concise and data-driven.',
  conversational:
    'Use a friendly, warm, and approachable tone. Use contractions. Sound like a real human, not a salesperson.',
  urgent:
    'Use a direct, high-urgency tone that creates FOMO. Lead with the problem and its cost. Make the CTA feel time-sensitive.',
};

function buildSystemPrompt(tone: string): string {
  const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.professional;
  return `You are an elite B2B cold email copywriter with 15+ years of experience converting 
cold prospects into warm leads for SaaS, agencies, and consulting firms.

Tone of voice for this campaign: ${tone.toUpperCase()}
${toneInstruction}

Given raw company data, your job is to:
1. Identify 2-3 SPECIFIC business pain points this company likely faces based on their industry, size, and description.
2. Write a hyper-personalized cold outreach email that references their specific situation.
3. The email should feel like it was written by a human who deeply researched the company — not a template.
4. Keep the subject line under 60 characters. Keep body under 200 words.
5. End with a specific, low-commitment CTA (e.g., "Would a 15-minute call this week make sense?").

CRITICAL: Output ONLY valid JSON matching this exact schema — no markdown, no extra text:
{
  "subject": "string (under 60 chars)",
  "body": "string (plain text, newlines as \\n, under 200 words)",
  "painPoints": ["string", "string", "string"],
  "tone": "${tone}"
}`;
}

const SEQUENCE_SYSTEM_PROMPT = `You are an elite B2B cold email copywriter. Generate a 3-email drip sequence.

Email 1 (Initial Pitch): The main personalized pitch, 150-200 words, ends with CTA.
Email 2 (Follow-up, Day 3): Very short 3-4 sentence follow-up referencing Email 1, different angle.
Email 3 (Break-up, Day 7): Final "closing the loop" email, 2-3 sentences, honest and direct.

CRITICAL: Output ONLY valid JSON matching this exact schema — no markdown:
{
  "emails": [
    {
      "subject": "string (under 60 chars)",
      "body": "string (plain text, newlines as \\n)",
      "painPoints": ["string", "string"],
      "tone": "professional" | "conversational" | "urgent",
      "stepIndex": 0,
      "sendDelay": 0
    },
    {
      "subject": "string",
      "body": "string",
      "painPoints": [],
      "tone": "professional",
      "stepIndex": 1,
      "sendDelay": 259200000
    },
    {
      "subject": "string",
      "body": "string",
      "painPoints": [],
      "tone": "professional",
      "stepIndex": 2,
      "sendDelay": 604800000
    }
  ]
}`;

export interface AiEmailOutput {
  subject: string;
  body: string;
  painPoints: string[];
  tone: 'professional' | 'conversational' | 'urgent';
  stepIndex: number;
  sendDelay: number;
}

export interface CompanyContext {
  companyName?: string;
  website?: string;
  industry?: string;
  employeeRange?: string;
  location?: string;
  description?: string;
  contactEmails?: string[];
}

function buildUserPrompt(company: CompanyContext): string {
  return `Generate a personalized B2B cold outreach email for this company:

Company Name: ${company.companyName ?? 'Unknown'}
Website: ${company.website ?? 'N/A'}
Industry: ${company.industry ?? 'Unknown'}
Employee Range: ${company.employeeRange ?? 'Unknown'}
Location: ${company.location ?? 'Unknown'}
Description: ${company.description?.slice(0, 600) ?? 'No description available'}

Output the JSON object now:`;
}

function buildSequenceUserPrompt(company: CompanyContext, tone: string): string {
  const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.professional;
  return `Generate a 3-email drip sequence for this company.

Tone: ${tone.toUpperCase()} — ${toneInstruction}

Company Name: ${company.companyName ?? 'Unknown'}
Website: ${company.website ?? 'N/A'}
Industry: ${company.industry ?? 'Unknown'}
Employee Range: ${company.employeeRange ?? 'Unknown'}
Location: ${company.location ?? 'Unknown'}
Description: ${company.description?.slice(0, 600) ?? 'No description available'}

For testing, keep sendDelay values at: 0, 120000, 300000 (0, 2 minutes, 5 minutes).

Output the JSON now:`;
}

export async function generateOutreachEmail(
  company: CompanyContext,
  groqApiKey?: string,
  tone = 'professional',
): Promise<AiEmailOutput> {
  const client = groqApiKey ? getGroqClientWithKey(groqApiKey) : getGroqClient();

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: buildSystemPrompt(tone) },
      { role: 'user', content: buildUserPrompt(company) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.75,
    max_tokens: 1024,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Groq API returned empty response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Groq response was not valid JSON: ${content.slice(0, 200)}`);
  }

  const result = parsed as Record<string, unknown>;

  if (
    typeof result.subject !== 'string' ||
    typeof result.body !== 'string' ||
    !Array.isArray(result.painPoints)
  ) {
    throw new Error(`Groq response missing required fields: ${JSON.stringify(result)}`);
  }

  return {
    subject: result.subject,
    body: result.body,
    painPoints: result.painPoints as string[],
    tone: (result.tone as 'professional' | 'conversational' | 'urgent') ?? 'professional',
    stepIndex: 0,
    sendDelay: 0,
  };
}

export async function generateEmailSequence(
  company: CompanyContext,
  groqApiKey?: string,
  tone = 'professional',
): Promise<AiEmailOutput[]> {
  const client = groqApiKey ? getGroqClientWithKey(groqApiKey) : getGroqClient();

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SEQUENCE_SYSTEM_PROMPT },
      { role: 'user', content: buildSequenceUserPrompt(company, tone) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.75,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Groq API returned empty response for sequence');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Groq sequence response was not valid JSON: ${content.slice(0, 200)}`);
  }

  const result = parsed as Record<string, unknown>;
  if (!Array.isArray(result.emails) || result.emails.length === 0) {
    throw new Error(`Groq sequence response missing "emails" array`);
  }

  return (result.emails as Record<string, unknown>[]).map((e, i) => ({
    subject: String(e.subject ?? ''),
    body: String(e.body ?? ''),
    painPoints: Array.isArray(e.painPoints) ? (e.painPoints as string[]) : [],
    tone: (e.tone as 'professional' | 'conversational' | 'urgent') ?? 'professional',
    stepIndex: typeof e.stepIndex === 'number' ? e.stepIndex : i,
    sendDelay: typeof e.sendDelay === 'number' ? e.sendDelay : 0,
  }));
}
