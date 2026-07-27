import type { BlogPost } from './index';

import { post as mockResetClearRestoreMatrix } from './mock-reset-clear-restore-matrix';
import { post as cypressRetrySubjectStabilityTesting } from './cypress-retry-subject-stability-testing';
import { post as cypressTestIsolationCookieLeakage } from './cypress-test-isolation-cookie-leakage';
import { post as mstestClassinitializeInheritanceOrder } from './mstest-classinitialize-inheritance-order';
import { post as mstestCleanupBehaviorBoundaries } from './mstest-cleanup-behavior-boundaries';

export const articleFactory1000Batch141Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mock-reset-clear-restore-matrix',
    post: mockResetClearRestoreMatrix,
  },
  {
    slug: 'cypress-retry-subject-stability-testing',
    post: cypressRetrySubjectStabilityTesting,
  },
  {
    slug: 'cypress-test-isolation-cookie-leakage',
    post: cypressTestIsolationCookieLeakage,
  },
  {
    slug: 'mstest-classinitialize-inheritance-order',
    post: mstestClassinitializeInheritanceOrder,
  },
  {
    slug: 'mstest-cleanup-behavior-boundaries',
    post: mstestCleanupBehaviorBoundaries,
  },
];
