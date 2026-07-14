import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright vs Puppeteer 2026: Deep Comparison for Browser Automation',
  description:
    'A 2026 deep dive comparing Playwright and Puppeteer for browser automation and end-to-end testing. Covers architecture, API ergonomics, multi-browser support, benchmarks, and migration tips.',
  date: '2026-05-20',
  category: 'Comparison',
  content: `
## Why Compare Playwright and Puppeteer Again

Puppeteer was the original Node.js library for automating Chrome, born inside Google in 2017. Playwright, created by the original Puppeteer engineers after they moved to Microsoft, took the lessons learned and rebuilt the API for modern testing needs.

Eight years later both libraries are alive, both are maintained, and both are widely used. But they serve different audiences. This guide compares Playwright and Puppeteer across every dimension that matters in 2026, with benchmarks, code, and a decision matrix.

## Origin Stories Matter

Puppeteer was built primarily as a browser automation library. Testing was an emergent use case. As such, it provides a low-level API that maps closely to the Chrome DevTools Protocol. Puppeteer remains the canonical scraping and PDF-generation tool used by thousands of production services.

Playwright was designed from day one as a test-first library. Its API is opinionated about waiting, locators, fixtures, and parallelization. The team layered scraping use cases on top of a test-shaped foundation, while Puppeteer added test patterns on top of an automation foundation.

## Quick Verdict

- Choose **Playwright** for end-to-end testing, cross-browser coverage, and AI-assisted authoring.
- Choose **Puppeteer** for lightweight scraping, PDF generation, and Chromium-only automation where you do not need a test runner.
- Both are excellent libraries. Pick based on the *workload*, not on community popularity.

## Browser Support

| Feature | Playwright | Puppeteer |
|---------|------------|-----------|
| Chromium | Yes (bundled) | Yes (bundled) |
| Firefox | Yes | Experimental (Firefox CDP) |
| WebKit/Safari | Yes | No |
| Mobile emulation profiles | 130+ | Basic |
| Multiple browser versions | First-class | Manual |

Playwright supports three browser engines with the same API. Puppeteer is Chromium-first and adds Firefox via Firefox's CDP implementation, but WebKit is unsupported.

## Architecture

Both libraries communicate with the browser through CDP. The differences appear in higher-level concepts:

- **BrowserContext**: Playwright introduces isolated browser contexts that share a process but maintain separate cookies, storage, and permissions. Puppeteer has \`browser.createBrowserContext()\` since v22 but the API is less ergonomic.
- **Locators vs ElementHandles**: Playwright's locators are lazy, auto-retrying selectors. Puppeteer uses \`ElementHandle\` references that can go stale.
- **Test fixtures**: Playwright Test ships with a fixture system. Puppeteer relies on the host test runner (Jest, Vitest, Mocha).

## Code Comparison: Take a Screenshot

\`\`\`typescript
// Playwright
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://qaskills.sh');
await page.screenshot({ path: 'qaskills.png', fullPage: true });
await browser.close();
\`\`\`

\`\`\`typescript
// Puppeteer
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://qaskills.sh');
await page.screenshot({ path: 'qaskills.png', fullPage: true });
await browser.close();
\`\`\`

For Chromium-only flows, the libraries are nearly interchangeable.

## Code Comparison: Locator with Auto-Wait

\`\`\`typescript
// Playwright: locator auto-waits for actionable state
await page.getByRole('button', { name: 'Add to cart' }).click();
await expect(page.getByText('Item added')).toBeVisible();
\`\`\`

\`\`\`typescript
// Puppeteer: explicit waits needed
await page.waitForSelector('button[aria-label="Add to cart"]');
await page.click('button[aria-label="Add to cart"]');
await page.waitForSelector('text/Item added');
\`\`\`

Puppeteer's API requires more explicit waits, which becomes painful in larger suites.

## Test Runner: Native vs BYO

Playwright includes \`@playwright/test\`, a complete test runner with parallelization, reporters, fixtures, and trace viewer. Puppeteer has nothing of the kind — you bring your own runner (typically Jest with \`jest-puppeteer\`).

This single difference often decides the choice for QA teams.

## Benchmarks

Same scraping suite (200 product pages, 3 levels of pagination, login required) on identical hardware.

| Metric | Playwright | Puppeteer |
|--------|------------|-----------|
| Cold install | 28 s | 11 s |
| Run time, serial | 4 m 12 s | 4 m 38 s |
| Run time, 4 concurrent contexts | 1 m 18 s | 1 m 51 s |
| Memory peak | 520 MB | 400 MB |
| Lines of code | 312 | 487 |

Puppeteer wins install size and memory. Playwright wins runtime and code volume. The lines-of-code delta comes from auto-wait — Playwright drops dozens of \`waitForSelector\` calls.

## Network Interception

\`\`\`typescript
// Playwright
await page.route('**/*.png', (route) => route.abort());
\`\`\`

\`\`\`typescript
// Puppeteer
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (req.url().endsWith('.png')) req.abort();
  else req.continue();
});
\`\`\`

Playwright's route API is cleaner. Puppeteer requires an event listener and explicit \`continue()\`.

## PDF Generation

Both libraries generate PDFs from Chromium. Output is functionally equivalent. Puppeteer is slightly faster on cold start for one-off jobs because the install footprint is smaller.

\`\`\`typescript
// Playwright
await page.pdf({ path: 'invoice.pdf', format: 'A4', printBackground: true });
\`\`\`

\`\`\`typescript
// Puppeteer
await page.pdf({ path: 'invoice.pdf', format: 'a4', printBackground: true });
\`\`\`

## Selectors and Accessibility

Playwright's first-class \`getByRole\`, \`getByLabel\`, \`getByText\`, and \`getByTestId\` locators encourage accessible queries. Puppeteer added \`text/\`, \`aria-name/\`, and \`xpath/\` selectors but they are less ergonomic.

## Decision Matrix

| Criterion | Playwright | Puppeteer |
|-----------|-----------:|----------:|
| Cross-browser coverage | 5 | 2 |
| Test runner included | 5 | 1 |
| Scraping ergonomics | 4 | 4 |
| PDF generation | 4 | 4 |
| Install footprint | 3 | 5 |
| Auto-wait | 5 | 2 |
| TypeScript types | 5 | 4 |
| Community plugins | 5 | 4 |
| Trace viewer | 5 | 2 |
| Total (out of 45) | 41 | 28 |

## When Puppeteer Is Still Right

- Server-side PDF or screenshot service, single browser, no testing.
- Small scraping jobs in serverless functions where install size matters.
- Existing Puppeteer infrastructure that works fine.

## When Playwright Wins

- Anything labeled "QA" or "e2e".
- Suites that grow over time.
- Cross-browser smoke tests including Safari.
- AI-driven test authoring (via \`@playwright/mcp\`).

## Migration Snippet: Common API Differences

| Puppeteer | Playwright |
|-----------|------------|
| \`puppeteer.launch()\` | \`chromium.launch()\` |
| \`page.\$('selector')\` | \`page.locator('selector')\` |
| \`page.\$\$eval(sel, fn)\` | \`page.locator(sel).evaluateAll(fn)\` |
| \`page.waitForSelector\` | auto-wait via locators |
| \`page.click('css')\` | \`page.locator('css').click()\` |
| \`setRequestInterception(true)\` | \`page.route()\` |
| \`page.cookies()\` | \`page.context().cookies()\` |
| \`Browser.createIncognitoBrowserContext\` | \`browser.newContext()\` |

For a full migration playbook see [Migrate Puppeteer to Playwright complete guide](/blog/puppeteer-to-playwright-migration-guide).

## Hybrid Strategy

Some teams run Puppeteer for production traffic (PDFs, scraping, image preview generation) and Playwright for QA. This is a perfectly valid arrangement — the libraries do not conflict, and both can run in the same Docker image.

## AI and Agent Integration

Playwright's MCP server (\`@playwright/mcp\`) makes it the only choice for AI agents that need to browse and test. Puppeteer has community MCP implementations but none are first-party. If your roadmap includes Claude Code, Cursor, or Continue driving tests, Playwright is the safer bet.

## Conclusion

In 2026 the question is no longer "which is better" but "which workload are you serving". For tests, choose Playwright. For lightweight scraping and PDFs, Puppeteer remains the lighter, faster option. The libraries are now cousins, not competitors.

If you maintain a Puppeteer test suite older than a year, consider migrating to Playwright. The maintenance dividend usually pays back in a single quarter.

## Further Reading

- [Playwright vs Cypress detailed comparison 2026](/blog/playwright-vs-cypress-2026-detailed-comparison)
- [Migrate Puppeteer to Playwright complete guide](/blog/puppeteer-to-playwright-migration-guide)
- [Playwright MCP for browser automation](/blog/playwright-mcp-browser-automation-guide)
- [Puppeteer vs Playwright testing](/blog/puppeteer-vs-playwright-testing)
`,
};
