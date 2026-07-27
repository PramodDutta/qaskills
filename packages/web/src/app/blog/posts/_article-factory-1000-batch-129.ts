import type { BlogPost } from './index';

import { post as testDataTemporalValidityWindows } from './test-data-temporal-validity-windows';
import { post as testFactorySequenceResetDeterminism } from './test-factory-sequence-reset-determinism';
import { post as flakyTestRateDenominator } from './flaky-test-rate-denominator';
import { post as skillReferenceDepthValidation } from './skill-reference-depth-validation';
import { post as statefulPropertyCommandPreconditions } from './stateful-property-command-preconditions';

export const articleFactory1000Batch129Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'test-data-temporal-validity-windows',
    post: testDataTemporalValidityWindows,
  },
  {
    slug: 'test-factory-sequence-reset-determinism',
    post: testFactorySequenceResetDeterminism,
  },
  {
    slug: 'flaky-test-rate-denominator',
    post: flakyTestRateDenominator,
  },
  {
    slug: 'skill-reference-depth-validation',
    post: skillReferenceDepthValidation,
  },
  {
    slug: 'stateful-property-command-preconditions',
    post: statefulPropertyCommandPreconditions,
  },
];
