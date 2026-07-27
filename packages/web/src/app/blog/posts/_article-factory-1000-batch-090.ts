import type { BlogPost } from './index';

import { post as llmJudgeScoreScaleAnchoring } from './llm-judge-score-scale-anchoring';
import { post as llmNestedArrayCardinalityTesting } from './llm-nested-array-cardinality-testing';
import { post as llmRateLimitQueueFairness } from './llm-rate-limit-queue-fairness';
import { post as llmRetryJitterBoundaryTesting } from './llm-retry-jitter-boundary-testing';
import { post as llmStopSequenceDriftTesting } from './llm-stop-sequence-drift-testing';

export const articleFactory1000Batch090Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'llm-judge-score-scale-anchoring',
    post: llmJudgeScoreScaleAnchoring,
  },
  {
    slug: 'llm-nested-array-cardinality-testing',
    post: llmNestedArrayCardinalityTesting,
  },
  {
    slug: 'llm-rate-limit-queue-fairness',
    post: llmRateLimitQueueFairness,
  },
  {
    slug: 'llm-retry-jitter-boundary-testing',
    post: llmRetryJitterBoundaryTesting,
  },
  {
    slug: 'llm-stop-sequence-drift-testing',
    post: llmStopSequenceDriftTesting,
  },
];
