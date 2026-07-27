import type { BlogPost } from './index';

import { post as playwrightRouteFetchRetryPolicy } from './playwright-route-fetch-retry-policy';
import { post as puppeteerNetworkIdleConcurrency } from './puppeteer-network-idle-concurrency';
import { post as playwrightSerialModeSkipCascade } from './playwright-serial-mode-skip-cascade';
import { post as seleniumBidiUnsubscribeCleanupTesting } from './selenium-bidi-unsubscribe-cleanup-testing';
import { post as playwrightTestinfoAttachmentStreamTesting } from './playwright-testinfo-attachment-stream-testing';

export const articleFactory1000Batch069Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-route-fetch-retry-policy',
    post: playwrightRouteFetchRetryPolicy,
  },
  {
    slug: 'puppeteer-network-idle-concurrency',
    post: puppeteerNetworkIdleConcurrency,
  },
  {
    slug: 'playwright-serial-mode-skip-cascade',
    post: playwrightSerialModeSkipCascade,
  },
  {
    slug: 'selenium-bidi-unsubscribe-cleanup-testing',
    post: seleniumBidiUnsubscribeCleanupTesting,
  },
  {
    slug: 'playwright-testinfo-attachment-stream-testing',
    post: playwrightTestinfoAttachmentStreamTesting,
  },
];
