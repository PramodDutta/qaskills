import type { BlogPost } from './index';

import { post as puppeteerPreciseCoverageCallCounts } from './puppeteer-precise-coverage-call-counts';
import { post as puppeteerRedirectResponseBodyAvailability } from './puppeteer-redirect-response-body-availability';
import { post as seleniumActionsInputStateReset } from './selenium-actions-input-state-reset';
import { post as seleniumAsyncScriptCallbackTimeout } from './selenium-async-script-callback-timeout';
import { post as seleniumBidiAuthChallengeHandling } from './selenium-bidi-auth-challenge-handling';

export const articleFactory1000Batch072Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'puppeteer-precise-coverage-call-counts',
    post: puppeteerPreciseCoverageCallCounts,
  },
  {
    slug: 'puppeteer-redirect-response-body-availability',
    post: puppeteerRedirectResponseBodyAvailability,
  },
  {
    slug: 'selenium-actions-input-state-reset',
    post: seleniumActionsInputStateReset,
  },
  {
    slug: 'selenium-async-script-callback-timeout',
    post: seleniumAsyncScriptCallbackTimeout,
  },
  {
    slug: 'selenium-bidi-auth-challenge-handling',
    post: seleniumBidiAuthChallengeHandling,
  },
];
