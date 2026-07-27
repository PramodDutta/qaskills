import type { BlogPost } from './index';

import { post as junitParameterResolverConflictTesting } from './junit-parameter-resolver-conflict-testing';
import { post as junitPerClassTestInstanceState } from './junit-per-class-test-instance-state';
import { post as junitRepeatedTestFailureThreshold } from './junit-repeated-test-failure-threshold';
import { post as junitTempdirCleanupModes } from './junit-tempdir-cleanup-modes';
import { post as vitestConcurrentExpectContextTesting } from './vitest-concurrent-expect-context-testing';

export const articleFactory1000Batch137Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'junit-parameter-resolver-conflict-testing',
    post: junitParameterResolverConflictTesting,
  },
  {
    slug: 'junit-per-class-test-instance-state',
    post: junitPerClassTestInstanceState,
  },
  {
    slug: 'junit-repeated-test-failure-threshold',
    post: junitRepeatedTestFailureThreshold,
  },
  {
    slug: 'junit-tempdir-cleanup-modes',
    post: junitTempdirCleanupModes,
  },
  {
    slug: 'vitest-concurrent-expect-context-testing',
    post: vitestConcurrentExpectContextTesting,
  },
];
