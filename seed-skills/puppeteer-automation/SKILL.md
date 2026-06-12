---
name: Puppeteer Browser Automation
description: Automate Chrome with Puppeteer for scraping, screenshots, PDF generation, and E2E checks — correct launch options, reliable waiting with locators and waitForSelector, request interception, and headless CI execution.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [puppeteer, browser-automation, headless-chrome, scraping, screenshots, pdf, e2e, devtools, ci]
testingTypes: [e2e]
frameworks: [puppeteer, jest]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Puppeteer Browser Automation

This skill makes an AI agent write reliable Puppeteer scripts: launching Chrome with the right flags, navigating and interacting without race conditions, capturing screenshots and PDFs, and intercepting network requests to mock or block traffic. Trigger it when a project uses `puppeteer` or `puppeteer-core`, or when the user asks to scrape a page, generate a PDF from HTML, screenshot a site, or automate Chrome without a full test framework.

## Core Principles

1. **Every action must wait for its precondition.** `page.click()` immediately after `page.goto()` races against rendering. Use `page.locator()` (auto-waiting, Puppeteer 21+) or explicit `waitForSelector` before every interaction.
2. **Never use fixed sleeps.** `await new Promise(r => setTimeout(r, 3000))` is either too short (flaky) or too long (slow). Wait on selectors, network idle, or response predicates instead.
3. **Always close the browser in `finally`.** A script that throws before `browser.close()` leaks a Chrome process. In CI those zombies accumulate until the runner dies.
4. **Set `waitUntil` deliberately.** `load` waits for every image and font; `domcontentloaded` is enough for interaction; `networkidle2` is for SPAs that fetch after load. Pick per page, do not cargo-cult `networkidle0`.
5. **Combine navigation-triggering actions with `Promise.all`.** Clicking a link then awaiting `waitForNavigation` separately misses fast navigations. Start the wait before the click.
6. **Request interception is your mock layer.** Block analytics and images for speed, stub API responses for determinism — no proxy server needed.

## Setup

```bash
npm install --save-dev puppeteer typescript tsx
```

```typescript
// src/browser.ts
import puppeteer, { Browser } from 'puppeteer';

export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', // required in most Docker/CI containers
      '--disable-dev-shm-usage', // /dev/shm is 64MB in Docker; avoids renderer crashes
      '--disable-gpu',
      '--window-size=1366,768',
    ],
    defaultViewport: { width: 1366, height: 768 },
  });
}
```

A complete script with correct lifecycle handling:

```typescript
// src/check-login.ts
import { launchBrowser } from './browser';

async function main(): Promise<void> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15_000);

    await page.goto('https://practice.expandtesting.com/login', {
      waitUntil: 'domcontentloaded',
    });

    // locator() auto-waits for visibility and stability before acting
    await page.locator('#username').fill('practice');
    await page.locator('#password').fill('SuperSecretPassword!');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.locator('button[type="submit"]').click(),
    ]);

    const flash = await page.locator('#flash').waitHandle();
    const text = await flash.evaluate((el) => el.textContent?.trim());
    if (!text?.includes('You logged into a secure area')) {
      throw new Error(`Login failed, flash message: ${text}`);
    }
    console.log('Login OK');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

```bash
npx tsx src/check-login.ts
```

## Patterns

### Screenshots and PDF Generation

```typescript
import { launchBrowser } from './browser';

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto('https://qaskills.sh', { waitUntil: 'networkidle2' });

  // Full-page screenshot
  await page.screenshot({ path: 'homepage.png', fullPage: true });

  // Screenshot of one element only
  const hero = await page.waitForSelector('main section:first-of-type');
  await hero!.screenshot({ path: 'hero.png' });

  // PDF requires headless mode; emulate print CSS first
  await page.emulateMediaType('print');
  await page.pdf({
    path: 'homepage.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  });
} finally {
  await browser.close();
}
```

### Request Interception: Block Noise, Stub APIs

```typescript
const page = await browser.newPage();
await page.setRequestInterception(true);

page.on('request', (request) => {
  const url = request.url();
  const type = request.resourceType();

  // Block images, fonts, and trackers for a 3-5x speedup on content scraping
  if (type === 'image' || type === 'font' || url.includes('google-analytics')) {
    return request.abort();
  }

  // Stub a backend endpoint with deterministic data
  if (url.endsWith('/api/feature-flags')) {
    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ newCheckout: true, darkMode: false }),
    });
  }

  return request.continue();
});

await page.goto('https://app.example.com/dashboard', { waitUntil: 'networkidle2' });
```

### Waiting on Responses and Extracting Data

```typescript
// Wait for the specific XHR the page fires, then read its JSON
const [response] = await Promise.all([
  page.waitForResponse(
    (res) => res.url().includes('/api/search') && res.status() === 200,
  ),
  page.locator('input[name="q"]').fill('playwright'),
]);
const results = (await response.json()) as { items: { title: string }[] };

// Extract structured data from the DOM in one evaluate call
const rows = await page.$$eval('table#skills tbody tr', (trs) =>
  trs.map((tr) => ({
    name: tr.querySelector('td:nth-child(1)')?.textContent?.trim() ?? '',
    installs: Number(tr.querySelector('td:nth-child(2)')?.textContent ?? 0),
  })),
);
console.log(rows.filter((r) => r.installs > 100));
```

### Reusable Page Helper for Flaky-Free Typing

```typescript
import type { Page } from 'puppeteer';

export async function clearAndType(page: Page, selector: string, value: string): Promise<void> {
  const input = await page.waitForSelector(selector, { visible: true });
  await input!.click({ clickCount: 3 }); // select existing text
  await input!.press('Backspace');
  await input!.type(value, { delay: 20 });
}
```

## Best Practices

- Pin the Puppeteer version; each release bundles a specific Chrome. Mismatched `puppeteer-core` + system Chrome is the top source of "works on my machine".
- Set `page.setDefaultTimeout()` once per page instead of passing `{ timeout }` everywhere.
- In Docker, use the official `ghcr.io/puppeteer/puppeteer` image or install the documented dependency list — a bare `node:20-slim` will fail with cryptic shared-library errors.
- Reuse one `Browser` across many pages; launching Chrome costs 1-2 seconds, `browser.newPage()` costs milliseconds.
- Capture a screenshot in your `catch` block before rethrowing — `page.screenshot({ path: 'failure.png' })` turns a CI mystery into a one-look diagnosis.
- For E2E test suites with assertions, fixtures, and retries, prefer Playwright; keep Puppeteer for scraping, PDF/screenshot services, and Chrome-extension automation where it excels.

## Anti-Patterns

- **`page.waitForTimeout(3000)` / sleep-based waits.** Replace with `waitForSelector`, `waitForResponse`, or `waitForFunction`.
- **`headless: false` committed to CI scripts.** Headful Chrome needs a display server; CI dies with "Missing X server". Gate it behind an env var for local debugging only.
- **Scraping inside `page.evaluate` with variables captured from Node scope.** The callback serializes to the browser; closures over Node objects throw. Pass data as arguments: `page.evaluate((sel) => ..., selector)`.
- **One giant try/catch around the whole script with no `finally` close.** Zombie Chrome processes exhaust CI memory.
- **Enabling request interception and forgetting `request.continue()`** in the default branch — every request hangs and the page never loads.
- **Selectors built from generated class names** like `.css-1q2w3e`. Use IDs, `data-testid`, ARIA roles, or stable attribute selectors.

## When to Trigger This Skill

- The repo depends on `puppeteer` or `puppeteer-core`, or has scripts importing them.
- The user asks to scrape a website, generate PDFs from HTML, or capture screenshots programmatically.
- A headless-Chrome task in Docker/CI is failing with sandbox, `/dev/shm`, or missing-library errors.
- Automating Chrome-specific surfaces: extensions, DevTools protocol features, performance traces.
- Existing Puppeteer code is flaky and needs waits, interception, or lifecycle fixes.
