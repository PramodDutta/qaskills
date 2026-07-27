import type { BlogPost } from './index';

import { post as aiReleaseBaselineApprovalTesting } from './ai-release-baseline-approval-testing';
import { post as aiReleaseRollbackTriggerTesting } from './ai-release-rollback-trigger-testing';
import { post as deepevalAsyncMetricConcurrencyTesting } from './deepeval-async-metric-concurrency-testing';
import { post as ragasBatchResultOrderingTesting } from './ragas-batch-result-ordering-testing';
import { post as deepevalGoldenPromotionWorkflowTesting } from './deepeval-golden-promotion-workflow-testing';

export const articleFactory1000Batch098Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'ai-release-baseline-approval-testing',
    post: aiReleaseBaselineApprovalTesting,
  },
  {
    slug: 'ai-release-rollback-trigger-testing',
    post: aiReleaseRollbackTriggerTesting,
  },
  {
    slug: 'deepeval-async-metric-concurrency-testing',
    post: deepevalAsyncMetricConcurrencyTesting,
  },
  {
    slug: 'ragas-batch-result-ordering-testing',
    post: ragasBatchResultOrderingTesting,
  },
  {
    slug: 'deepeval-golden-promotion-workflow-testing',
    post: deepevalGoldenPromotionWorkflowTesting,
  },
];
