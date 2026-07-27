import type { BlogPost } from './index';

import { post as accessibleNameComputationRegressionTests } from './accessible-name-computation-regression-tests';
import { post as apiDuplicateHeaderNormalizationTesting } from './api-duplicate-header-normalization-testing';
import { post as appiumContextSwitchTimeoutTesting } from './appium-context-switch-timeout-testing';
import { post as backForwardCacheEligibilityTesting } from './back-forward-cache-eligibility-testing';
import { post as ciArtifactRetentionExpirationTesting } from './ci-artifact-retention-expiration-testing';

export const articleFactory250Batch45Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'accessible-name-computation-regression-tests',
    post: accessibleNameComputationRegressionTests,
  },
  {
    slug: 'api-duplicate-header-normalization-testing',
    post: apiDuplicateHeaderNormalizationTesting,
  },
  {
    slug: 'appium-context-switch-timeout-testing',
    post: appiumContextSwitchTimeoutTesting,
  },
  {
    slug: 'back-forward-cache-eligibility-testing',
    post: backForwardCacheEligibilityTesting,
  },
  {
    slug: 'ci-artifact-retention-expiration-testing',
    post: ciArtifactRetentionExpirationTesting,
  },
];
