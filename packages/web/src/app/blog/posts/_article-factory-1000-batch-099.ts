import type { BlogPost } from './index';

import { post as deepevalMultimodalTestCaseValidation } from './deepeval-multimodal-test-case-validation';
import { post as promptfooDerivedMetricFormulaTesting } from './promptfoo-derived-metric-formula-testing';
import { post as evalDatasetAmbiguousCaseQuarantine } from './eval-dataset-ambiguous-case-quarantine';
import { post as evalDatasetCaseIdStability } from './eval-dataset-case-id-stability';
import { post as evalDatasetSliceBalanceTesting } from './eval-dataset-slice-balance-testing';

export const articleFactory1000Batch099Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'deepeval-multimodal-test-case-validation',
    post: deepevalMultimodalTestCaseValidation,
  },
  {
    slug: 'promptfoo-derived-metric-formula-testing',
    post: promptfooDerivedMetricFormulaTesting,
  },
  {
    slug: 'eval-dataset-ambiguous-case-quarantine',
    post: evalDatasetAmbiguousCaseQuarantine,
  },
  {
    slug: 'eval-dataset-case-id-stability',
    post: evalDatasetCaseIdStability,
  },
  {
    slug: 'eval-dataset-slice-balance-testing',
    post: evalDatasetSliceBalanceTesting,
  },
];
