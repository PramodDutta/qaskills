import type { BlogPost } from './index';

import { post as junitTimeoutPreemptionSideEffects } from './junit-timeout-preemption-side-effects';
import { post as vitestFixtureCleanupWithTestExtend } from './vitest-fixture-cleanup-with-test-extend';
import { post as visualRegressionFontLoadingStability } from './visual-regression-font-loading-stability';
import { post as databaseDeferrableConstraintTesting } from './database-deferrable-constraint-testing';
import { post as kotestIsolationModeStateLeakage } from './kotest-isolation-mode-state-leakage';

export const articleFactory1000Batch138Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'junit-timeout-preemption-side-effects',
    post: junitTimeoutPreemptionSideEffects,
  },
  {
    slug: 'vitest-fixture-cleanup-with-test-extend',
    post: vitestFixtureCleanupWithTestExtend,
  },
  {
    slug: 'visual-regression-font-loading-stability',
    post: visualRegressionFontLoadingStability,
  },
  {
    slug: 'database-deferrable-constraint-testing',
    post: databaseDeferrableConstraintTesting,
  },
  {
    slug: 'kotest-isolation-mode-state-leakage',
    post: kotestIsolationModeStateLeakage,
  },
];
