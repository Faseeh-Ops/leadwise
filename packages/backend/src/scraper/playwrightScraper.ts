import { chromium, Browser, Page } from 'playwright';
import { randomUserAgent, randomViewport, randomDelay } from './userAgents';

export interface ScrapedCompanyData {
  companyName?: string;
  website?: string;
  industry?: string;
  employeeRange?: string;
  location?: string;
  description?: string;
  contactEmails: string[];
  phoneNumbers: string[];
  socialLinks: Record<string, string>;
  rawText?: string;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
    });
  }
  return browserInstance;
}

async function createStealthPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: randomUserAgent(),
    viewport: randomViewport(),
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Accept: 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  });

  const page = await context.newPage();

  // Override webdriver detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  return page;
}

/**
 * Extracts email addresses from text using regex.
 */
function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) ?? [];
  // Filter out common false positives
  return [...new Set(matches)].filter(
    (e) => !e.includes('example.com') && !e.includes('test.com'),
  );
}

/**
 * Extracts phone numbers from text.
 */
function extractPhones(text: string): string[] {
  const phoneRegex = /(\+?\d[\d\s\-().]{7,}\d)/g;
  const matches = text.match(phoneRegex) ?? [];
  return [...new Set(matches.map((p) => p.trim()))].slice(0, 5);
}

/**
 * Generic scraper that works on any public business URL.
 * Attempts to extract company info using common HTML patterns.
 */
export async function scrapeUrl(url: string): Promise<ScrapedCompanyData> {
  const browser = await getBrowser();
  const page = await createStealthPage(browser);

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Random human-like delay
    await page.waitForTimeout(randomDelay(1500, 3500));

    const data = await page.evaluate(() => {
      const getText = (sel: string): string =>
        (document.querySelector(sel) as HTMLElement)?.innerText?.trim() ?? '';

      const getAttr = (sel: string, attr: string): string =>
        document.querySelector(sel)?.getAttribute(attr)?.trim() ?? '';

      const getMeta = (name: string): string =>
        document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ??
        document.querySelector(`meta[property="og:${name}"]`)?.getAttribute('content')?.trim() ??
        '';

      // Extract social links
      const socialLinks: Record<string, string> = {};
      const socialPatterns: Record<string, RegExp> = {
        linkedin: /linkedin\.com/i,
        twitter: /twitter\.com|x\.com/i,
        facebook: /facebook\.com/i,
        instagram: /instagram\.com/i,
      };

      document.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href') ?? '';
        for (const [platform, regex] of Object.entries(socialPatterns)) {
          if (regex.test(href) && !socialLinks[platform]) {
            socialLinks[platform] = href;
          }
        }
      });

      const bodyText = document.body?.innerText ?? '';
      const title = document.title;
      const description =
        getMeta('description') ||
        getText('[class*="about"]') ||
        getText('[class*="description"]') ||
        getText('[id*="about"]') ||
        bodyText.slice(0, 800);

      return {
        title,
        description,
        bodyText: bodyText.slice(0, 5000),
        socialLinks,
        ogSiteName: getMeta('site_name'),
        canonical: getAttr('link[rel="canonical"]', 'href'),
      };
    });

    const contactEmails = extractEmails(data.bodyText);
    const phoneNumbers = extractPhones(data.bodyText);

    // Attempt to visit /contact page for more emails
    if (contactEmails.length === 0) {
      try {
        const contactUrl = new URL('/contact', url).toString();
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(randomDelay(800, 1500));
        const contactText = await page.evaluate(() => document.body?.innerText ?? '');
        contactEmails.push(...extractEmails(contactText));
      } catch {
        // Contact page not found — not critical
      }
    }

    const companyName =
      data.ogSiteName ||
      data.title.split(/[|\-–—]/)[0]?.trim() ||
      new URL(url).hostname.replace(/^www\./, '');

    return {
      companyName,
      website: data.canonical || url,
      description: data.description?.slice(0, 1000),
      contactEmails: [...new Set(contactEmails)].slice(0, 10),
      phoneNumbers: phoneNumbers.slice(0, 5),
      socialLinks: data.socialLinks,
      rawText: data.bodyText,
    };
  } finally {
    await page.context().close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
