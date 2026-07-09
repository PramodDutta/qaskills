---
name: Pa11y Accessibility CI
description: Teach agents to automate accessibility testing in CI with pa11y and pa11y-ci, including thresholds, sitemap crawling, GitHub Actions gating, and WCAG rule tuning.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [pa11y, accessibility, ci, wcag, regression, github-actions]
testingTypes: [accessibility, regression]
frameworks: []
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Pa11y Accessibility CI Skill

You are an accessibility automation engineer who adds reliable pa11y and pa11y-ci checks to web delivery pipelines without treating scanners as a replacement for manual WCAG review.

## Core Principles

1. **Gate on real user impact**: Fail builds on violations that block keyboard, screen reader, contrast, form, landmark, or document structure usage.
2. **Keep the scan target stable**: Run pa11y against a deterministic preview environment, not a developer laptop with unknown data.
3. **Start narrow, then expand**: Begin with smoke URLs, add sitemap discovery, then add authenticated flows when the signal is clean.
4. **Use thresholds intentionally**: A threshold is temporary debt tracking, not a permanent permission to ship inaccessible pages.
5. **Pin WCAG standard explicitly**: Use `WCAG2AA` or stricter rules in config so upgrades do not silently change expectations.
6. **Record evidence**: Save pa11y output as CI artifacts so failures can be triaged without rerunning the job.
7. **Separate scanner limits from product bugs**: Document rules that require manual verification and never claim total accessibility compliance from pa11y alone.
8. **Review ignored selectors**: Every ignore must include a reason, owner, and expiry date in a nearby comment or issue.

## Setup

Install pa11y-ci into the web project.

```bash
npm install --save-dev pa11y pa11y-ci start-server-and-test
npm pkg set scripts.a11y='pa11y-ci --config .pa11yci.cjs'
npm pkg set scripts.preview='vite --host 127.0.0.1'
npm pkg set scripts.a11y:local='start-server-and-test preview http://127.0.0.1:5173 a11y'
```

Use a dedicated config file instead of long CLI flags.

```javascript
// .pa11yci.cjs
const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';

module.exports = {
  defaults: {
    standard: 'WCAG2AA',
    timeout: 30000,
    wait: 500,
    chromeLaunchConfig: {
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    hideElements: '.third-party-chat, .cookie-banner-test-only',
  },
  urls: [
    `${baseUrl}/`,
    `${baseUrl}/pricing`,
    `${baseUrl}/login`,
    `${baseUrl}/dashboard`,
  ],
  threshold: 0,
  reporters: ['cli', 'json'],
};
```

## Recommended Project Structure

Create a small accessibility automation area that the whole team can understand.

```text
.
  .github/
    workflows/
      accessibility.yml
  accessibility/
    urls.json
    crawl-sitemap.mjs
    known-issues.md
  .pa11yci.cjs
  package.json
```

## Sitemap Crawling Workflow

Use sitemap crawling when the product has many public pages.

1. Fetch `sitemap.xml` from the preview deployment.
2. Keep only HTML routes that are safe for unauthenticated scanning.
3. Exclude logout, destructive, or parameterized pages.
4. Write a URL list that pa11y-ci can consume.
5. Keep a hard maximum for CI time.

```javascript
// accessibility/crawl-sitemap.mjs
import { writeFile } from 'node:fs/promises';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const sitemapUrl = `${origin}/sitemap.xml`;
const response = await fetch(sitemapUrl);

if (!response.ok) {
  throw new Error(`Could not fetch sitemap: ${response.status}`);
}

const xml = await response.text();
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => url.startsWith(origin))
  .filter((url) => !url.includes('/logout'))
  .slice(0, Number(process.env.PA11Y_MAX_URLS || 50));

await writeFile('accessibility/urls.json', `${JSON.stringify(urls, null, 2)}\n`);
console.log(`Wrote ${urls.length} URLs for pa11y-ci`);
```

Point the config at the generated list when required.

```javascript
// .pa11yci.cjs
const urls = require('./accessibility/urls.json');

module.exports = {
  defaults: {
    standard: 'WCAG2AA',
    timeout: 30000,
  },
  urls,
  threshold: Number(process.env.PA11Y_THRESHOLD || 0),
};
```

## GitHub Actions Gate

Run the accessibility gate after the app builds and the preview server starts.

```yaml
name: accessibility
on:
  pull_request:
  push:
    branches: [main]
jobs:
  pa11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run a11y:local
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pa11y-results
          path: pa11y-ci-results.json
```

## Rule Tuning

Use `ignore` only when there is a documented reason.

```javascript
module.exports = {
  defaults: {
    standard: 'WCAG2AA',
    ignore: [
      // Temporary until design system token QA-1284 is fixed.
      'color-contrast',
    ],
  },
  urls: ['http://127.0.0.1:5173/'],
  threshold: 0,
};
```

## CI Failure Triage

When pa11y fails, inspect the page, selector, context, and rule.

1. Reproduce locally with `npm run a11y:local`.
2. Open the failing route in a browser.
3. Inspect the reported selector.
4. Confirm whether the violation is visible to users.
5. Fix markup first, then test config.
6. Add a regression URL for the page if it was not already covered.

## Reference Table

| Need | Pa11y Choice | Agent Action |
|---|---|---|
| Small public site | Static `urls` list | Keep direct route coverage explicit |
| Large marketing site | Sitemap crawler | Cap URL count and exclude unsafe paths |
| Pull request gate | `threshold: 0` | Fail new violations immediately |
| Legacy app | Temporary threshold | Track debt and lower threshold over time |
| Third-party widget noise | `hideElements` | Hide only non-product widgets |
| Rule exception | `ignore` | Require issue link and expiry |

## Common Mistakes

1. Treating pa11y as proof of WCAG compliance.
2. Scanning only the home page.
3. Leaving `threshold` high forever.
4. Ignoring color contrast globally for one design bug.
5. Running against production when the pull request preview exists.
6. Forgetting authenticated routes that customers actually use.
7. Hiding product UI with `hideElements`.
8. Failing to upload JSON reports from CI.
9. Mixing flaky server startup with accessibility failures.
10. Not pinning Node and browser versions in CI.

## Checklist

- [ ] The config uses inline URL lists or a generated sitemap list.
- [ ] The standard is explicitly set to `WCAG2AA` or stricter.
- [ ] CI fails on new violations with a clear threshold.
- [ ] Reports are uploaded as artifacts.
- [ ] Ignored rules have owners and expiry dates.
- [ ] Destructive routes are excluded from crawls.
- [ ] Authenticated routes have a separate plan.
- [ ] The team knows scanner results do not replace manual audits.
- [ ] Local reproduction commands are documented.
- [ ] The gate runs before merge.
