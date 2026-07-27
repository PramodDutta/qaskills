import type { BlogPost } from './index';

import { post as playwrightCliConditionalApiMocking } from './playwright-cli-conditional-api-mocking';
import { post as playwrightContextIndexeddbStorageState } from './playwright-context-indexeddb-storage-state';
import { post as playwrightGlobalTimeoutCi } from './playwright-global-timeout-ci';
import { post as playwrightMcpEvidenceManifestTesting } from './playwright-mcp-evidence-manifest-testing';
import { post as playwrightWaitforfunctionCustomPolling } from './playwright-waitforfunction-custom-polling';

export const articleFactory250Batch34Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-context-indexeddb-storage-state',
    post: playwrightContextIndexeddbStorageState,
  },
  {
    slug: 'playwright-global-timeout-ci',
    post: playwrightGlobalTimeoutCi,
  },
  {
    slug: 'playwright-cli-conditional-api-mocking',
    post: playwrightCliConditionalApiMocking,
  },
  {
    slug: 'playwright-mcp-evidence-manifest-testing',
    post: playwrightMcpEvidenceManifestTesting,
  },
  {
    slug: 'playwright-waitforfunction-custom-polling',
    post: playwrightWaitforfunctionCustomPolling,
  },
];
