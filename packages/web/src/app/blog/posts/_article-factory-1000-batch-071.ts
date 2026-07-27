import type { BlogPost } from './index';

import { post as playwrightWorkerEventLifecycleTesting } from './playwright-worker-event-lifecycle-testing';
import { post as puppeteerCdpSessionDetachCleanup } from './puppeteer-cdp-session-detach-cleanup';
import { post as nightwatchAssertionTimeoutPrecedence } from './nightwatch-assertion-timeout-precedence';
import { post as puppeteerPdfHeaderFooterTemplates } from './puppeteer-pdf-header-footer-templates';
import { post as puppeteerPdfTaggedOutlineTesting } from './puppeteer-pdf-tagged-outline-testing';

export const articleFactory1000Batch071Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-worker-event-lifecycle-testing',
    post: playwrightWorkerEventLifecycleTesting,
  },
  {
    slug: 'puppeteer-cdp-session-detach-cleanup',
    post: puppeteerCdpSessionDetachCleanup,
  },
  {
    slug: 'nightwatch-assertion-timeout-precedence',
    post: nightwatchAssertionTimeoutPrecedence,
  },
  {
    slug: 'puppeteer-pdf-header-footer-templates',
    post: puppeteerPdfHeaderFooterTemplates,
  },
  {
    slug: 'puppeteer-pdf-tagged-outline-testing',
    post: puppeteerPdfTaggedOutlineTesting,
  },
];
