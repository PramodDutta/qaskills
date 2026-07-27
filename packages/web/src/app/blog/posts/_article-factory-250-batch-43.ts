import type { BlogPost } from './index';

import { post as deepevalThresholdBoundaryTesting } from './deepeval-threshold-boundary-testing';
import { post as llmRetryCostDoubleCountingTesting } from './llm-retry-cost-double-counting-testing';
import { post as promptfooEnvironmentIsolationTesting } from './promptfoo-environment-isolation-testing';
import { post as ragDocumentVersionPrecedenceTesting } from './rag-document-version-precedence-testing';
import { post as ragasEvaluatorTimeoutRecovery } from './ragas-evaluator-timeout-recovery';

export const articleFactory250Batch43Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'deepeval-threshold-boundary-testing',
    post: deepevalThresholdBoundaryTesting,
  },
  {
    slug: 'llm-retry-cost-double-counting-testing',
    post: llmRetryCostDoubleCountingTesting,
  },
  {
    slug: 'promptfoo-environment-isolation-testing',
    post: promptfooEnvironmentIsolationTesting,
  },
  {
    slug: 'rag-document-version-precedence-testing',
    post: ragDocumentVersionPrecedenceTesting,
  },
  {
    slug: 'ragas-evaluator-timeout-recovery',
    post: ragasEvaluatorTimeoutRecovery,
  },
];
