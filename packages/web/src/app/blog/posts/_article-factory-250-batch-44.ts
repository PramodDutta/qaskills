import type { BlogPost } from './index';

import { post as agentFinalStateVerificationTesting } from './agent-final-state-verification-testing';
import { post as deepevalJudgeVersionPinning } from './deepeval-judge-version-pinning';
import { post as llmAsyncTraceContextTesting } from './llm-async-trace-context-testing';
import { post as promptfooEvalCacheInvalidationTesting } from './promptfoo-eval-cache-invalidation-testing';
import { post as ragQueryRewriteRegressionTesting } from './rag-query-rewrite-regression-testing';

export const articleFactory250Batch44Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-final-state-verification-testing',
    post: agentFinalStateVerificationTesting,
  },
  {
    slug: 'deepeval-judge-version-pinning',
    post: deepevalJudgeVersionPinning,
  },
  {
    slug: 'llm-async-trace-context-testing',
    post: llmAsyncTraceContextTesting,
  },
  {
    slug: 'promptfoo-eval-cache-invalidation-testing',
    post: promptfooEvalCacheInvalidationTesting,
  },
  {
    slug: 'rag-query-rewrite-regression-testing',
    post: ragQueryRewriteRegressionTesting,
  },
];
