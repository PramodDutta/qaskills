import type { BlogPost } from './index';

import { post as residualTestRiskReporting } from './residual-test-risk-reporting';
import { post as syntheticDataUniquenessExhaustion } from './synthetic-data-uniqueness-exhaustion';
import { post as testCaseEffectivenessInvalidation } from './test-case-effectiveness-invalidation';
import { post as equivalentMutantReviewWorkflow } from './equivalent-mutant-review-workflow';
import { post as escapedDefectSeverityWeighting } from './escaped-defect-severity-weighting';

export const articleFactory1000Batch128Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'residual-test-risk-reporting',
    post: residualTestRiskReporting,
  },
  {
    slug: 'synthetic-data-uniqueness-exhaustion',
    post: syntheticDataUniquenessExhaustion,
  },
  {
    slug: 'test-case-effectiveness-invalidation',
    post: testCaseEffectivenessInvalidation,
  },
  {
    slug: 'equivalent-mutant-review-workflow',
    post: equivalentMutantReviewWorkflow,
  },
  {
    slug: 'escaped-defect-severity-weighting',
    post: escapedDefectSeverityWeighting,
  },
];
