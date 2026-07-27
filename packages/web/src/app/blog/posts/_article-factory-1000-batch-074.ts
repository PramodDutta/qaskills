import type { BlogPost } from './index';

import { post as seleniumBidiFetchErrorEvents } from './selenium-bidi-fetch-error-events';
import { post as seleniumBidiHistoryTraversalEvents } from './selenium-bidi-history-traversal-events';
import { post as seleniumBidiNavigationReadinessStates } from './selenium-bidi-navigation-readiness-states';
import { post as seleniumBidiPreloadSandboxIsolation } from './selenium-bidi-preload-sandbox-isolation';
import { post as seleniumBidiRedirectCountTesting } from './selenium-bidi-redirect-count-testing';

export const articleFactory1000Batch074Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-bidi-fetch-error-events',
    post: seleniumBidiFetchErrorEvents,
  },
  {
    slug: 'selenium-bidi-history-traversal-events',
    post: seleniumBidiHistoryTraversalEvents,
  },
  {
    slug: 'selenium-bidi-navigation-readiness-states',
    post: seleniumBidiNavigationReadinessStates,
  },
  {
    slug: 'selenium-bidi-preload-sandbox-isolation',
    post: seleniumBidiPreloadSandboxIsolation,
  },
  {
    slug: 'selenium-bidi-redirect-count-testing',
    post: seleniumBidiRedirectCountTesting,
  },
];
