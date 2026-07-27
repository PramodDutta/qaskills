import type { BlogPost } from './index';

import { post as k6ArrivalRateDroppedIterations } from './k6-arrival-rate-dropped-iterations';
import { post as propertyGeneratorDistributionBias } from './property-generator-distribution-bias';
import { post as propertyShrinkingPreconditionPreservation } from './property-shrinking-precondition-preservation';
import { post as propertyTestDiscardLimitTuning } from './property-test-discard-limit-tuning';
import { post as pytestAddoptionTypeValidation } from './pytest-addoption-type-validation';

export const articleFactory1000Batch147Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'k6-arrival-rate-dropped-iterations',
    post: k6ArrivalRateDroppedIterations,
  },
  {
    slug: 'property-generator-distribution-bias',
    post: propertyGeneratorDistributionBias,
  },
  {
    slug: 'property-shrinking-precondition-preservation',
    post: propertyShrinkingPreconditionPreservation,
  },
  {
    slug: 'property-test-discard-limit-tuning',
    post: propertyTestDiscardLimitTuning,
  },
  {
    slug: 'pytest-addoption-type-validation',
    post: pytestAddoptionTypeValidation,
  },
];
