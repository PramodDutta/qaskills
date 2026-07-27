import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 588,
  slug: 'puppeteer-cooperative-intercept-priority',
  campaignCluster: 'browser-e2e',
  title: 'Puppeteer Cooperative Intercept Priority',
  description:
    'puppeteer cooperative intercept priority: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'puppeteer cooperative intercept priority',
  intent: 'how-to',
  coreQuestion:
    'How do QA teams verify cooperative request-interception priorities across multiple handlers with deterministic browser automation and useful failure evidence?',
  intentBoundary:
    'Owns cooperative request-interception priorities across multiple handlers. It excludes single-handler request interception.',
  secondaryKeywords: [
    'puppeteer cooperative intercept priority example',
    'debug puppeteer cooperative intercept priority',
    'Puppeteer intercept priority',
    'Puppeteer continue resolution',
    'handler ordering browser test',
    'puppeteer cooperative intercept priority CI checks',
  ],
  repoEvidence: [
    'seed-skills/puppeteer-testing/SKILL.md',
    'packages/web/src/app/blog/posts/puppeteer-request-interception-testing-guide.ts',
    'packages/web/src/app/blog/posts/puppeteer-performance-tracing-guide.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/e2e-testing',
    '/blog/puppeteer-request-interception-testing-guide',
    '/blog/puppeteer-performance-tracing-guide',
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
  ],
  relatedSlugs: [
    'puppeteer-request-interception-testing-guide',
    'puppeteer-performance-tracing-guide',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://pptr.dev/guides/network-interception',
    'https://pptr.dev/api/puppeteer.httprequest',
    'https://pptr.dev/api/puppeteer.page.waitfornetworkidle',
  ],
  codeExamples: [
    {
      title: 'Build the puppeteer cooperative intercept priority baseline',
      language: 'text',
      path: 'seed-skills/puppeteer-testing/SKILL.md',
      snippet:
        'project-root/\n puppeteer.config.ts             # Shared Puppeteer configuration\n tests/\n    e2e/                        # End-to-end test specs\n       auth.test.ts\n       checkout.test.ts\n       navigation.test.ts\n    pages/                      # Page Object classes\n       base.page.ts\n       login.page.ts\n       dashboard.page.ts\n    helpers/                    # Utility functions\n       browser-factory.ts\n       screenshot-helper.ts\n       network-mock.ts\n    fixtures/                   # Test data\n        test-users.json\n scripts/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/puppeteer-request-interception-testing-guide.ts',
      snippet:
        'This guide treats request interception as a test boundary for real user flows. It assumes you already know Puppeteer basics and want a senior SDET approach to network mocking, request blocking, and response stubbing. If you are choosing the browser automation engine itself, read the related [Puppeteer and Playwright comparison](/blog/puppeteer-vs-playwright-testing). For teams comparing current automation strategy, the [Playwright versus Puppeteer 2026 guide](/blog/playwright-vs-puppeteer-2026) is the broader architecture view.\n\n## The interception switch that changes page loading\n\nPuppeteer interception starts with one explicit call: \\`page.setRequestInterception(true)\\`. After that, every request pauses until your handler calls \\`request.continue()\\`, \\`request.abort()\\`, or \\`request.respond()\\`. That includes the initial document request, scripts, stylesheets, fonts, images, XHR, fetch calls, and navigation redirects.\n\nThe main rule is simple: every intercepted request must be resolved exactly once. In small tests that is easy to see. In a framework helper with conditional routing, metrics, and async file reads, it becomes the part that deserves discipline. Prefer one request listener per page. Put routing decisions in a single ordered list. Return immediately after resolving a request. Keep asynchronous stubs short enough that they do not become their own test server.\n\n| Interception action | What Puppeteer does | Good testing use | Risk if overused |\n|---|---|---|---|\n| \\`continue()\\` | Lets Chrome send the original request | Real navigation, local app assets, smoke coverage | Accidentally reaches systems the suite should isolate |\n| \\`continue({ headers })\\` | Sends a modified outbound request | Injecting test headers, tenant IDs, or auth hints | Can diverge from production browser behavior |\n| \\`abort()\\` | Fails the request in the browser | Blocking trackers, fonts, ads, or image CDNs | App code may behave differently if it expects graceful 404s |\n| \\`respond()\\` | Fulfills the request from the test process | Stable API stubs and edge-case payloads | Wrong status, MIME type, or shape can create false confidence |\n\nA common mistake is enabling interception before \\`page.goto()\\` and then only handling API calls. The document request also pauses, so navigation never completes. Another mistake is treating interception as a replacement for backend contract tests. A Puppeteer stub is excellent for testing front-end handling of a server response. It is not evidence that the server can produce that response in production.',
    },
  ],
});
