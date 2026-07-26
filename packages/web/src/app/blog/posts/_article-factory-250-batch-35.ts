import type { BlogPost } from './index';

import { post as playwrightCliDelayedResponseMocking } from './playwright-cli-delayed-response-mocking';
import { post as playwrightContextClearcookiesFilters } from './playwright-context-clearcookies-filters';
import { post as playwrightLocatorCountRaceCondition } from './playwright-locator-count-race-condition';
import { post as playwrightMcpSessionReplayValidation } from './playwright-mcp-session-replay-validation';
import { post as playwrightRepeatEachFlakeDetection } from './playwright-repeat-each-flake-detection';

export const articleFactory250Batch35Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-locator-count-race-condition',
    post: playwrightLocatorCountRaceCondition,
  },
  {
    slug: 'playwright-repeat-each-flake-detection',
    post: playwrightRepeatEachFlakeDetection,
  },
  {
    slug: 'playwright-cli-delayed-response-mocking',
    post: playwrightCliDelayedResponseMocking,
  },
  {
    slug: 'playwright-mcp-session-replay-validation',
    post: playwrightMcpSessionReplayValidation,
  },
  {
    slug: 'playwright-context-clearcookies-filters',
    post: playwrightContextClearcookiesFilters,
  },
];
