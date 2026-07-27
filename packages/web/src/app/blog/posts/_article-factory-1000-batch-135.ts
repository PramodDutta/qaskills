import type { BlogPost } from './index';

import { post as testngListenerCallbackOrdering } from './testng-listener-callback-ordering';
import { post as testngPriorityPreserveOrderInteraction } from './testng-priority-preserve-order-interaction';
import { post as testngRetryAnalyzerStateIsolation } from './testng-retry-analyzer-state-isolation';
import { post as junitAssertallFailureAggregation } from './junit-assertall-failure-aggregation';
import { post as junitAssertthrowsexactlySubtypeTesting } from './junit-assertthrowsexactly-subtype-testing';

export const articleFactory1000Batch135Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'testng-listener-callback-ordering',
    post: testngListenerCallbackOrdering,
  },
  {
    slug: 'testng-priority-preserve-order-interaction',
    post: testngPriorityPreserveOrderInteraction,
  },
  {
    slug: 'testng-retry-analyzer-state-isolation',
    post: testngRetryAnalyzerStateIsolation,
  },
  {
    slug: 'junit-assertall-failure-aggregation',
    post: junitAssertallFailureAggregation,
  },
  {
    slug: 'junit-assertthrowsexactly-subtype-testing',
    post: junitAssertthrowsexactlySubtypeTesting,
  },
];
