import type { BlogPost } from './index';

import { post as playwrightBrowserDisconnectCleanupTesting } from './playwright-browser-disconnect-cleanup-testing';
import { post as webdriverioMaxinstancesCapabilityPrecedence } from './webdriverio-maxinstances-capability-precedence';
import { post as webdriverioMockRequestFiltering } from './webdriverio-mock-request-filtering';
import { post as webdriverioMockResponseRestoration } from './webdriverio-mock-response-restoration';
import { post as webdriverioMultiremotePartialFailure } from './webdriverio-multiremote-partial-failure';

export const articleFactory1000Batch060Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-browser-disconnect-cleanup-testing',
    post: playwrightBrowserDisconnectCleanupTesting,
  },
  {
    slug: 'webdriverio-maxinstances-capability-precedence',
    post: webdriverioMaxinstancesCapabilityPrecedence,
  },
  {
    slug: 'webdriverio-mock-request-filtering',
    post: webdriverioMockRequestFiltering,
  },
  {
    slug: 'webdriverio-mock-response-restoration',
    post: webdriverioMockResponseRestoration,
  },
  {
    slug: 'webdriverio-multiremote-partial-failure',
    post: webdriverioMultiremotePartialFailure,
  },
];
