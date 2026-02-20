---
name: Dead Link Detector
description: Automated detection and reporting of broken links, missing resources, and orphaned pages across web applications using crawl-based and DOM-based strategies
version: 1.0.0
author: Pramod
license: MIT
tags: [dead-links, broken-links, link-checker, web-crawling, http-status, 404-detection, site-health]
testingTypes: [e2e, code-quality]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Dead Link Detector Skill

You are an expert QA automation engineer specializing in broken link detection and web crawling strategies. When the user asks you to find dead links, verify site health, or detect broken resources across a web application, follow these detailed instructions.

## Core Principles

1. **Crawl exhaustively, report precisely** -- Every link on a site must be discovered and verified. A dead link detector is only as good as its coverage. Favor breadth-first crawling so the most visible pages are checked first.
2. **Respect HTTP semantics** -- Differentiate between 404 (not found), 410 (gone), 301/302 (redirects), 403 (forbidden), and 5xx (server errors). Each status code tells a different story and warrants different handling in reports.
3. **Check all resource types** -- Links are not just anchor tags. Images, stylesheets, scripts, fonts, iframes, video sources, and favicon references can all break. A thorough detector covers every resource type embedded in the DOM.
4. **Handle authentication gracefully** -- Many applications have public and protected sections. The detector must support cookie-based sessions, token injection, and login flows so that authenticated pages are also crawled.
5. **Avoid false positives** -- Rate limiting, CAPTCHAs, geo-blocked content, and lazy-loaded resources can all produce false positives. Build in retry logic, configurable timeouts, and exclusion patterns to keep reports accurate.
6. **Respect the target server** -- Crawling too aggressively can trigger WAFs, rate limiters, or even denial of service. Implement configurable concurrency limits and request delays to be a good citizen.
7. **Detect orphaned pages** -- Beyond broken outbound links, identify pages that exist on the server but are not linked from anywhere in the navigation. These orphaned pages are invisible to users and search engines alike.

## Project Structure

Organize your dead link detection suite with this structure:

```
tests/
  link-checker/
    crawl-all-links.spec.ts
    check-images.spec.ts
    check-external-links.spec.ts
    check-anchor-links.spec.ts
    orphaned-pages.spec.ts
  fixtures/
    crawler.fixture.ts
    auth.fixture.ts
  helpers/
    link-extractor.ts
    url-resolver.ts
    report-generator.ts
    link-classifier.ts
  reports/
    broken-links.json
    broken-links.html
playwright.config.ts
```

## How It Works: Crawl-Based Link Checking

The fundamental approach uses Playwright to visit pages, extract all links from the DOM, resolve them to absolute URLs, and then verify each one. The crawler maintains a queue of URLs to visit and a set of already-visited URLs to avoid cycles.

### The Link Extractor

The link extractor is the core utility that parses a page and returns every resource URL present in the DOM.

```typescript
import { Page } from '@playwright/test';

export interface ExtractedLink {
  url: string;
  sourceUrl: string;
  element: string;
  attribute: string;
  text: string;
  line?: number;
}

export async function extractAllLinks(page: Page, sourceUrl: string): Promise<ExtractedLink[]> {
  return await page.evaluate((source) => {
    const links: Array<{
      url: string;
      sourceUrl: string;
      element: string;
      attribute: string;
      text: string;
    }> = [];

    // Anchor tags
    document.querySelectorAll('a[href]').forEach((el) => {
      const anchor = el as HTMLAnchorElement;
      links.push({
        url: anchor.href,
        sourceUrl: source,
        element: 'a',
        attribute: 'href',
        text: anchor.textContent?.trim().substring(0, 100) || '',
      });
    });

    // Images
    document.querySelectorAll('img[src]').forEach((el) => {
      const img = el as HTMLImageElement;
      links.push({
        url: img.src,
        sourceUrl: source,
        element: 'img',
        attribute: 'src',
        text: img.alt || '',
      });
    });

    // Stylesheets
    document.querySelectorAll('link[href]').forEach((el) => {
      const link = el as HTMLLinkElement;
      links.push({
        url: link.href,
        sourceUrl: source,
        element: 'link',
        attribute: 'href',
        text: link.rel || '',
      });
    });

    // Scripts
    document.querySelectorAll('script[src]').forEach((el) => {
      const script = el as HTMLScriptElement;
      links.push({
        url: script.src,
        sourceUrl: source,
        element: 'script',
        attribute: 'src',
        text: '',
      });
    });

    // Iframes
    document.querySelectorAll('iframe[src]').forEach((el) => {
      const iframe = el as HTMLIFrameElement;
      links.push({
        url: iframe.src,
        sourceUrl: source,
        element: 'iframe',
        attribute: 'src',
        text: '',
      });
    });

    // Video and audio sources
    document.querySelectorAll('source[src]').forEach((el) => {
      const source_el = el as HTMLSourceElement;
      links.push({
        url: source_el.src,
        sourceUrl: source,
        element: 'source',
        attribute: 'src',
        text: '',
      });
    });

    // Background images in inline styles
    document.querySelectorAll('[style*="url("]').forEach((el) => {
      const style = (el as HTMLElement).style.cssText;
      const urlMatch = style.match(/url\(["']?([^"')]+)["']?\)/);
      if (urlMatch) {
        links.push({
          url: new URL(urlMatch[1], window.location.href).href,
          sourceUrl: source,
          element: el.tagName.toLowerCase(),
          attribute: 'style',
          text: '',
        });
      }
    });

    return links;
  }, sourceUrl);
}
```

### URL Resolver and Classifier

Not all extracted URLs are equal. Some are internal, some external. Some are page links, others are resource links. The classifier helps route each URL to the appropriate verification strategy.

```typescript
export interface ClassifiedUrl {
  original: string;
  resolved: string;
  isInternal: boolean;
  isAnchor: boolean;
  isMailto: boolean;
  isTel: boolean;
  isJavascript: boolean;
  isDataUri: boolean;
  protocol: string;
}

export function classifyUrl(url: string, baseUrl: string): ClassifiedUrl {
  const base = new URL(baseUrl);

  const isMailto = url.startsWith('mailto:');
  const isTel = url.startsWith('tel:');
  const isJavascript = url.startsWith('javascript:');
  const isDataUri = url.startsWith('data:');
  const isAnchor = url.startsWith('#');

  let resolved = url;
  let protocol = '';
  let isInternal = false;

  if (!isMailto && !isTel && !isJavascript && !isDataUri) {
    try {
      const parsed = new URL(url, baseUrl);
      resolved = parsed.href;
      protocol = parsed.protocol;
      isInternal = parsed.hostname === base.hostname;
    } catch {
      resolved = url;
    }
  }

  return {
    original: url,
    resolved,
    isInternal,
    isAnchor,
    isMailto,
    isTel,
    isJavascript,
    isDataUri,
    protocol,
  };
}

export function shouldCrawl(classified: ClassifiedUrl): boolean {
  if (classified.isMailto || classified.isTel || classified.isJavascript || classified.isDataUri) {
    return false;
  }
  if (!classified.isInternal) {
    return false;
  }
  const skipExtensions = ['.pdf', '.zip', '.png', '.jpg', '.gif', '.svg', '.css', '.js', '.woff'];
  if (skipExtensions.some((ext) => classified.resolved.toLowerCase().endsWith(ext))) {
    return false;
  }
  return true;
}
```

### The Crawler Fixture

Use a Playwright fixture to encapsulate the crawling logic so that test files remain clean and focused on assertions.

```typescript
import { test as base, Page, APIRequestContext } from '@playwright/test';
import { extractAllLinks, ExtractedLink } from '../helpers/link-extractor';
import { classifyUrl, shouldCrawl, ClassifiedUrl } from '../helpers/url-resolver';

export interface LinkCheckResult {
  url: string;
  statusCode: number;
  statusText: string;
  responseTime: number;
  sourceUrl: string;
  element: string;
  attribute: string;
  linkText: string;
  error?: string;
  redirectChain?: string[];
}

export interface CrawlerOptions {
  maxPages: number;
  maxConcurrency: number;
  timeout: number;
  retries: number;
  excludePatterns: RegExp[];
  includeExternal: boolean;
  delayBetweenRequests: number;
}

const defaultOptions: CrawlerOptions = {
  maxPages: 500,
  maxConcurrency: 5,
  timeout: 30000,
  retries: 2,
  excludePatterns: [],
  includeExternal: true,
  delayBetweenRequests: 100,
};

export class LinkCrawler {
  private visited = new Set<string>();
  private queue: string[] = [];
  private results: LinkCheckResult[] = [];
  private allLinks: ExtractedLink[] = [];
  private options: CrawlerOptions;

  constructor(
    private page: Page,
    private request: APIRequestContext,
    private baseUrl: string,
    options: Partial<CrawlerOptions> = {}
  ) {
    this.options = { ...defaultOptions, ...options };
  }

  async crawl(startUrl?: string): Promise<LinkCheckResult[]> {
    const start = startUrl || this.baseUrl;
    this.queue.push(start);

    while (this.queue.length > 0 && this.visited.size < this.options.maxPages) {
      const url = this.queue.shift()!;
      if (this.visited.has(url)) continue;
      if (this.options.excludePatterns.some((p) => p.test(url))) continue;

      this.visited.add(url);

      try {
        await this.page.goto(url, {
          waitUntil: 'networkidle',
          timeout: this.options.timeout,
        });

        const links = await extractAllLinks(this.page, url);
        this.allLinks.push(...links);

        for (const link of links) {
          const classified = classifyUrl(link.url, this.baseUrl);

          if (shouldCrawl(classified) && !this.visited.has(classified.resolved)) {
            this.queue.push(classified.resolved);
          }
        }

        if (this.options.delayBetweenRequests > 0) {
          await this.page.waitForTimeout(this.options.delayBetweenRequests);
        }
      } catch (error) {
        this.results.push({
          url,
          statusCode: 0,
          statusText: 'Navigation Error',
          responseTime: 0,
          sourceUrl: 'crawler',
          element: 'page',
          attribute: 'navigation',
          linkText: '',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await this.verifyAllLinks();
    return this.results;
  }

  private async verifyAllLinks(): Promise<void> {
    const uniqueLinks = new Map<string, ExtractedLink>();
    for (const link of this.allLinks) {
      const classified = classifyUrl(link.url, this.baseUrl);
      if (classified.isMailto || classified.isTel || classified.isJavascript || classified.isDataUri) {
        continue;
      }
      if (!this.options.includeExternal && !classified.isInternal) {
        continue;
      }
      if (!uniqueLinks.has(classified.resolved)) {
        uniqueLinks.set(classified.resolved, link);
      }
    }

    const entries = Array.from(uniqueLinks.entries());
    for (let i = 0; i < entries.length; i += this.options.maxConcurrency) {
      const batch = entries.slice(i, i + this.options.maxConcurrency);
      const results = await Promise.allSettled(
        batch.map(([url, link]) => this.checkLink(url, link))
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        }
      }
    }
  }

  private async checkLink(url: string, link: ExtractedLink): Promise<LinkCheckResult> {
    const start = Date.now();
    let lastError = '';

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const response = await this.request.head(url, {
          timeout: this.options.timeout,
          ignoreHTTPSErrors: true,
        });

        return {
          url,
          statusCode: response.status(),
          statusText: response.statusText(),
          responseTime: Date.now() - start,
          sourceUrl: link.sourceUrl,
          element: link.element,
          attribute: link.attribute,
          linkText: link.text,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < this.options.retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    // Fallback to GET if HEAD fails
    try {
      const response = await this.request.get(url, {
        timeout: this.options.timeout,
        ignoreHTTPSErrors: true,
      });
      return {
        url,
        statusCode: response.status(),
        statusText: response.statusText(),
        responseTime: Date.now() - start,
        sourceUrl: link.sourceUrl,
        element: link.element,
        attribute: link.attribute,
        linkText: link.text,
      };
    } catch {
      return {
        url,
        statusCode: 0,
        statusText: 'Request Failed',
        responseTime: Date.now() - start,
        sourceUrl: link.sourceUrl,
        element: link.element,
        attribute: link.attribute,
        linkText: link.text,
        error: lastError,
      };
    }
  }

  getResults(): LinkCheckResult[] {
    return this.results;
  }

  getBrokenLinks(): LinkCheckResult[] {
    return this.results.filter(
      (r) => r.statusCode === 0 || r.statusCode >= 400
    );
  }

  getRedirects(): LinkCheckResult[] {
    return this.results.filter(
      (r) => r.statusCode >= 300 && r.statusCode < 400
    );
  }
}

export const test = base.extend<{ crawler: LinkCrawler }>({
  crawler: async ({ page, request }, use) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const crawler = new LinkCrawler(page, request, baseUrl);
    await use(crawler);
  },
});

export { expect } from '@playwright/test';
```

### Writing the Tests

With the fixture and helpers in place, the actual test files are concise and declarative.

```typescript
// tests/link-checker/crawl-all-links.spec.ts
import { test, expect } from '../fixtures/crawler.fixture';

test.describe('Dead Link Detection - Full Site Crawl', () => {
  test('should have zero broken internal links', async ({ crawler }) => {
    const results = await crawler.crawl();
    const broken = results.filter(
      (r) => (r.statusCode === 0 || r.statusCode >= 400) && r.url.includes('localhost')
    );

    if (broken.length > 0) {
      const report = broken.map(
        (b) =>
          `  [${b.statusCode}] ${b.url}\n    Found on: ${b.sourceUrl}\n    Element: <${b.element} ${b.attribute}="${b.url}">\n    Text: "${b.linkText}"\n    Error: ${b.error || 'HTTP ' + b.statusCode}`
      );
      console.error(`Found ${broken.length} broken internal links:\n${report.join('\n')}`);
    }

    expect(broken).toHaveLength(0);
  });

  test('should have no server errors (5xx) on any page', async ({ crawler }) => {
    const results = await crawler.crawl();
    const serverErrors = results.filter(
      (r) => r.statusCode >= 500 && r.statusCode < 600
    );

    expect(serverErrors).toHaveLength(0);
  });

  test('should not have excessive redirects', async ({ crawler }) => {
    const results = await crawler.crawl();
    const redirects = crawler.getRedirects();

    // Redirects are not errors but excessive redirects indicate problems
    const redirectRatio = redirects.length / results.length;
    expect(redirectRatio).toBeLessThan(0.3); // Less than 30% of links redirect
  });
});
```

## Handling Anchor Links and Hash Fragments

Anchor links (hash fragments) require special treatment because they reference elements within a page rather than separate resources. The server returns 200 for the page, but the target element might not exist.

```typescript
// tests/link-checker/check-anchor-links.spec.ts
import { test, expect } from '@playwright/test';
import { extractAllLinks } from '../helpers/link-extractor';

test.describe('Anchor Link Validation', () => {
  test('all hash links should reference existing elements', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const pagesToCheck = ['/', '/docs', '/about', '/faq'];
    const brokenAnchors: Array<{ page: string; hash: string }> = [];

    for (const path of pagesToCheck) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });

      const anchorLinks = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll('a[href*="#"]').forEach((el) => {
          const href = (el as HTMLAnchorElement).getAttribute('href');
          if (href && href.includes('#')) {
            const hash = href.split('#')[1];
            if (hash) links.push(hash);
          }
        });
        return links;
      });

      for (const hash of anchorLinks) {
        const exists = await page.evaluate((id) => {
          return !!(document.getElementById(id) || document.querySelector(`[name="${id}"]`));
        }, hash);

        if (!exists) {
          brokenAnchors.push({ page: path, hash });
        }
      }
    }

    if (brokenAnchors.length > 0) {
      console.error(
        'Broken anchor links:\n' +
          brokenAnchors.map((a) => `  ${a.page}#${a.hash}`).join('\n')
      );
    }

    expect(brokenAnchors).toHaveLength(0);
  });
});
```

## Checking Images and Media Resources

Broken images degrade user experience significantly. This test specifically validates all image sources, including srcset attributes for responsive images, open graph images, and favicon references.

```typescript
// tests/link-checker/check-images.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Image and Media Resource Validation', () => {
  test('all images should load successfully', async ({ page, request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const imageUrls = await page.evaluate(() => {
      const urls: string[] = [];

      // Standard img src
      document.querySelectorAll('img[src]').forEach((el) => {
        urls.push((el as HTMLImageElement).src);
      });

      // srcset for responsive images
      document.querySelectorAll('img[srcset], source[srcset]').forEach((el) => {
        const srcset = el.getAttribute('srcset') || '';
        srcset.split(',').forEach((entry) => {
          const url = entry.trim().split(/\s+/)[0];
          if (url) {
            try {
              urls.push(new URL(url, window.location.href).href);
            } catch {
              // skip invalid URLs
            }
          }
        });
      });

      // Open Graph and meta images
      document
        .querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')
        .forEach((el) => {
          const content = el.getAttribute('content');
          if (content) {
            try {
              urls.push(new URL(content, window.location.href).href);
            } catch {
              // skip
            }
          }
        });

      // Favicon
      document.querySelectorAll('link[rel*="icon"]').forEach((el) => {
        const href = (el as HTMLLinkElement).href;
        if (href) urls.push(href);
      });

      return [...new Set(urls)];
    });

    const brokenImages: Array<{ url: string; status: number }> = [];

    for (const url of imageUrls) {
      try {
        const response = await request.head(url, { timeout: 15000 });
        if (response.status() >= 400) {
          brokenImages.push({ url, status: response.status() });
        }
      } catch {
        brokenImages.push({ url, status: 0 });
      }
    }

    if (brokenImages.length > 0) {
      console.error(
        `Found ${brokenImages.length} broken images:\n` +
          brokenImages.map((b) => `  [${b.status}] ${b.url}`).join('\n')
      );
    }

    expect(brokenImages).toHaveLength(0);
  });
});
```

## Report Generation

Generating structured reports is essential for CI integration and historical tracking. Below is a report generator that produces both JSON and HTML output.

```typescript
// tests/helpers/report-generator.ts
import * as fs from 'fs';
import * as path from 'path';
import { LinkCheckResult } from '../fixtures/crawler.fixture';

export interface LinkReport {
  timestamp: string;
  baseUrl: string;
  totalLinksChecked: number;
  brokenLinks: number;
  redirects: number;
  healthyLinks: number;
  results: LinkCheckResult[];
  summary: {
    byStatusCode: Record<number, number>;
    byElement: Record<string, number>;
    bySourcePage: Record<string, number>;
    averageResponseTime: number;
    slowestLinks: LinkCheckResult[];
  };
}

export function generateReport(
  results: LinkCheckResult[],
  baseUrl: string
): LinkReport {
  const byStatusCode: Record<number, number> = {};
  const byElement: Record<string, number> = {};
  const bySourcePage: Record<string, number> = {};
  let totalResponseTime = 0;

  for (const r of results) {
    byStatusCode[r.statusCode] = (byStatusCode[r.statusCode] || 0) + 1;
    byElement[r.element] = (byElement[r.element] || 0) + 1;

    const brokenOnly = r.statusCode === 0 || r.statusCode >= 400;
    if (brokenOnly) {
      bySourcePage[r.sourceUrl] = (bySourcePage[r.sourceUrl] || 0) + 1;
    }
    totalResponseTime += r.responseTime;
  }

  const broken = results.filter((r) => r.statusCode === 0 || r.statusCode >= 400);
  const redirects = results.filter((r) => r.statusCode >= 300 && r.statusCode < 400);
  const slowest = [...results].sort((a, b) => b.responseTime - a.responseTime).slice(0, 10);

  return {
    timestamp: new Date().toISOString(),
    baseUrl,
    totalLinksChecked: results.length,
    brokenLinks: broken.length,
    redirects: redirects.length,
    healthyLinks: results.length - broken.length - redirects.length,
    results,
    summary: {
      byStatusCode,
      byElement,
      bySourcePage,
      averageResponseTime: results.length > 0 ? totalResponseTime / results.length : 0,
      slowestLinks: slowest,
    },
  };
}

export function saveReport(report: LinkReport, outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });

  // JSON report
  const jsonPath = path.join(outputDir, 'broken-links.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // HTML report
  const htmlPath = path.join(outputDir, 'broken-links.html');
  const html = buildHtmlReport(report);
  fs.writeFileSync(htmlPath, html);

  console.log(`Reports saved to:\n  JSON: ${jsonPath}\n  HTML: ${htmlPath}`);
}

function buildHtmlReport(report: LinkReport): string {
  const brokenRows = report.results
    .filter((r) => r.statusCode === 0 || r.statusCode >= 400)
    .map(
      (r) => `
      <tr>
        <td>${r.statusCode}</td>
        <td><a href="${r.url}">${r.url}</a></td>
        <td>${r.sourceUrl}</td>
        <td>&lt;${r.element}&gt;</td>
        <td>${r.linkText}</td>
        <td>${r.error || ''}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Dead Link Report - ${report.timestamp}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
    th { background: #f5f5f5; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .stat { background: #f9f9f9; padding: 16px; border-radius: 8px; text-align: center; }
    .stat h3 { margin: 0; font-size: 32px; }
    .stat p { margin: 4px 0 0; color: #666; }
    .broken { color: #dc2626; }
    .healthy { color: #16a34a; }
  </style>
</head>
<body>
  <h1>Dead Link Report</h1>
  <p>Generated: ${report.timestamp} | Base URL: ${report.baseUrl}</p>
  <div class="summary">
    <div class="stat"><h3>${report.totalLinksChecked}</h3><p>Total Links</p></div>
    <div class="stat"><h3 class="healthy">${report.healthyLinks}</h3><p>Healthy</p></div>
    <div class="stat"><h3 class="broken">${report.brokenLinks}</h3><p>Broken</p></div>
    <div class="stat"><h3>${report.redirects}</h3><p>Redirects</p></div>
  </div>
  <h2>Broken Links</h2>
  <table>
    <thead><tr><th>Status</th><th>URL</th><th>Found On</th><th>Element</th><th>Text</th><th>Error</th></tr></thead>
    <tbody>${brokenRows || '<tr><td colspan="6">No broken links found</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}
```

## Handling Auth-Protected Pages

Many web applications have sections behind authentication. The crawler must log in before crawling those areas.

```typescript
// tests/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';

export async function loginAndGetCookies(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || 'testpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard**');
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await loginAndGetCookies(page, baseUrl);
    await use(page);
  },
});
```

## Checking External Links

External links require a different strategy: you cannot crawl them (robots.txt, rate limits), but you must verify they resolve. Use HEAD requests with appropriate timeouts and user-agent strings.

```typescript
// tests/link-checker/check-external-links.spec.ts
import { test, expect } from '@playwright/test';
import { extractAllLinks } from '../helpers/link-extractor';
import { classifyUrl } from '../helpers/url-resolver';

test.describe('External Link Validation', () => {
  test('all external links should be reachable', async ({ page, request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const allLinks = await extractAllLinks(page, baseUrl);
    const externalLinks = allLinks
      .map((l) => ({ ...l, classified: classifyUrl(l.url, baseUrl) }))
      .filter((l) => !l.classified.isInternal && !l.classified.isMailto && !l.classified.isTel);

    const uniqueExternal = [...new Map(externalLinks.map((l) => [l.classified.resolved, l])).values()];

    const broken: Array<{ url: string; status: number; source: string }> = [];

    for (const link of uniqueExternal) {
      try {
        const response = await request.head(link.classified.resolved, {
          timeout: 20000,
          headers: {
            'User-Agent': 'QASkills-LinkChecker/1.0 (automated testing)',
          },
        });

        // Some servers block HEAD requests; retry with GET
        if (response.status() === 405 || response.status() === 403) {
          const getResponse = await request.get(link.classified.resolved, {
            timeout: 20000,
          });
          if (getResponse.status() >= 400) {
            broken.push({
              url: link.classified.resolved,
              status: getResponse.status(),
              source: link.sourceUrl,
            });
          }
        } else if (response.status() >= 400) {
          broken.push({
            url: link.classified.resolved,
            status: response.status(),
            source: link.sourceUrl,
          });
        }
      } catch {
        broken.push({
          url: link.classified.resolved,
          status: 0,
          source: link.sourceUrl,
        });
      }
    }

    expect(broken).toHaveLength(0);
  });
});
```

## Configuration

Configure the dead link detector through the Playwright config and environment variables.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/link-checker',
  timeout: 120_000,
  retries: 1,
  workers: 1, // Crawling is sequential by nature
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'User-Agent': 'QASkills-LinkChecker/1.0',
    },
  },
  projects: [
    {
      name: 'internal-links',
      testMatch: /crawl-all-links|check-anchor-links/,
    },
    {
      name: 'external-links',
      testMatch: /check-external-links/,
    },
    {
      name: 'media-resources',
      testMatch: /check-images/,
    },
  ],
});
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `BASE_URL` | Target application URL | `http://localhost:3000` |
| `MAX_PAGES` | Maximum pages to crawl | `500` |
| `MAX_CONCURRENCY` | Parallel link checks | `5` |
| `LINK_TIMEOUT` | Request timeout in ms | `30000` |
| `INCLUDE_EXTERNAL` | Check external links | `true` |
| `TEST_USER_EMAIL` | Auth email for protected pages | -- |
| `TEST_USER_PASSWORD` | Auth password for protected pages | -- |

## CI Integration

Add the dead link detector to your CI pipeline to catch broken links before they reach production.

```yaml
# .github/workflows/link-check.yml
name: Dead Link Check
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Start application
        run: npm run start &
        env:
          NODE_ENV: production
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000
      - name: Run link checker
        run: npx playwright test --project=internal-links
        env:
          BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: link-check-report
          path: reports/
```

## Best Practices

1. **Run link checks on a schedule, not just on push** -- Links break when external sites change, certificates expire, or CDNs go down. A weekly scheduled run catches drift.
2. **Separate internal and external link checks** -- Internal links should never break and warrant a hard failure. External links are outside your control and might benefit from a warning threshold instead.
3. **Use HEAD requests before GET** -- HEAD requests are faster and use less bandwidth. Only fall back to GET when the server returns 405 Method Not Allowed.
4. **Implement exponential backoff on retries** -- Transient network failures happen. Retry with increasing delays (1s, 2s, 4s) before marking a link as broken.
5. **Maintain an exclusion list** -- Some URLs will always fail in CI (localhost links in documentation, example.com references, intentionally broken test URLs). Keep a maintained exclusion list rather than ignoring failures.
6. **Track broken link trends over time** -- Store historical reports and track whether the broken link count is increasing or decreasing. A spike indicates a deployment issue.
7. **Verify redirects resolve to valid destinations** -- A 301 redirect is not inherently a problem, but a redirect chain that ends in a 404 is. Follow the chain to its terminus.
8. **Set realistic timeouts for external links** -- External sites in different regions may respond slowly. Use 20-30 second timeouts for external links, but 5-10 seconds for internal ones.
9. **Check links after deployment, not just in staging** -- Production CDN configuration, DNS, and TLS certificates differ from staging. Run a post-deploy link check.
10. **Include link context in reports** -- A broken link URL alone is not actionable. Always include the source page, the element type, and the link text so developers can find and fix it quickly.
11. **Handle single-page applications correctly** -- SPAs load content dynamically. Wait for `networkidle` or specific selectors before extracting links, and handle client-side routing.
12. **Test with and without authentication** -- Public and authenticated views often have different navigation. Crawl both to get full coverage.

## Anti-Patterns to Avoid

1. **Checking only the homepage** -- Most broken links are buried deep in the site. Checking only the homepage misses 90% of issues. Always crawl recursively.
2. **Treating all non-200 responses as broken** -- 301 redirects, 204 No Content, and 206 Partial Content are all valid responses. Only 4xx and 5xx codes (and connection failures) indicate problems.
3. **Crawling without a visited-URL set** -- Without cycle detection, the crawler will loop infinitely on sites with circular navigation links. Always maintain a set of visited URLs.
4. **Ignoring rate limits on external sites** -- Hammering an external site with hundreds of concurrent HEAD requests will get your CI server IP blocked. Limit concurrency and add delays.
5. **Hardcoding URLs instead of crawling** -- Maintaining a static list of URLs to check becomes stale immediately. Let the crawler discover links dynamically from the DOM.
6. **Not handling JavaScript-rendered content** -- Many modern sites render links via JavaScript. Using a simple HTTP client without a browser engine will miss dynamically generated links. Always use a real browser (Playwright) for extraction.
7. **Failing the entire CI build on external link breakage** -- External link failures are outside your control. Warn on external breakage, fail on internal breakage.

## Debugging Tips

- **Use Playwright trace viewer for failed crawls** -- Enable tracing with `trace: 'on-first-retry'` in your config to get a step-by-step visual replay of what happened before a navigation failure.
- **Log the full redirect chain** -- When a link fails after redirects, log each hop in the chain. The problem might be an intermediate redirect, not the final destination.
- **Check for lazy-loaded content** -- If links are missing from extraction, they may be below the fold and not yet rendered. Scroll the page before extracting links, or use `page.evaluate` to check the full DOM including off-screen elements.
- **Verify DNS resolution** -- A common cause of false positives is DNS resolution failure in CI environments. Use `nslookup` or `dig` to verify that the target domain resolves from your CI runner.
- **Inspect response headers on 403 errors** -- A 403 might indicate a WAF blocking your user-agent or IP, not an actually forbidden resource. Check for `X-Robots-Tag`, `Retry-After`, or challenge headers.
- **Test with `--headed` mode locally** -- Running Playwright in headed mode lets you visually confirm that pages load correctly and see any popup dialogs, cookie banners, or interstitials that might block crawling.
- **Check for meta refresh redirects** -- Some pages use `<meta http-equiv="refresh">` instead of HTTP 3xx redirects. These will not appear in the response status code but will cause the page to navigate away. Parse meta tags explicitly.
- **Monitor response times alongside status codes** -- A link that returns 200 but takes 30 seconds to respond is effectively broken for users. Flag links with response times above a threshold as slow links in your report.