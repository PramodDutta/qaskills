import type { BlogPost } from './index';

import { post as playwrightConnectovercdpContextLimitations } from './playwright-connectovercdp-context-limitations';
import { post as playwrightFailOnFlakyTests } from './playwright-fail-on-flaky-tests';
import { post as playwrightMcpCapabilityDriftTests } from './playwright-mcp-capability-drift-tests';
import { post as playwrightMultipleWebServers } from './playwright-multiple-web-servers';
import { post as seleniumBidiUserPromptEvents } from './selenium-bidi-user-prompt-events';

export const articleFactory1000Batch051Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-connectovercdp-context-limitations',
    post: playwrightConnectovercdpContextLimitations,
  },
  {
    slug: 'playwright-fail-on-flaky-tests',
    post: playwrightFailOnFlakyTests,
  },
  {
    slug: 'playwright-mcp-capability-drift-tests',
    post: playwrightMcpCapabilityDriftTests,
  },
  {
    slug: 'playwright-multiple-web-servers',
    post: playwrightMultipleWebServers,
  },
  {
    slug: 'selenium-bidi-user-prompt-events',
    post: seleniumBidiUserPromptEvents,
  },
];
