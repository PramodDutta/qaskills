import type { BlogPost } from './index';

import { post as seleniumGridHeartbeatTimeoutTesting } from './selenium-grid-heartbeat-timeout-testing';
import { post as cypressCustomQueryRetryContract } from './cypress-custom-query-retry-contract';
import { post as cypressInterceptCacheHeaderRemoval } from './cypress-intercept-cache-header-removal';
import { post as seleniumGridNodeDrainSessions } from './selenium-grid-node-drain-sessions';
import { post as cypressInterceptLifecycleEventOrdering } from './cypress-intercept-lifecycle-event-ordering';

export const articleFactory1000Batch055Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-grid-heartbeat-timeout-testing',
    post: seleniumGridHeartbeatTimeoutTesting,
  },
  {
    slug: 'cypress-custom-query-retry-contract',
    post: cypressCustomQueryRetryContract,
  },
  {
    slug: 'cypress-intercept-cache-header-removal',
    post: cypressInterceptCacheHeaderRemoval,
  },
  {
    slug: 'selenium-grid-node-drain-sessions',
    post: seleniumGridNodeDrainSessions,
  },
  {
    slug: 'cypress-intercept-lifecycle-event-ordering',
    post: cypressInterceptLifecycleEventOrdering,
  },
];
