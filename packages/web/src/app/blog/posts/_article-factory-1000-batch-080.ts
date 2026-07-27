import type { BlogPost } from './index';

import { post as promptfooRepeatAggregationTesting } from './promptfoo-repeat-aggregation-testing';
import { post as graderScoreDistributionCollapse } from './grader-score-distribution-collapse';
import { post as redTeamSeverityNormalizationTesting } from './red-team-severity-normalization-testing';
import { post as llmBatchPartialFailureTesting } from './llm-batch-partial-failure-testing';
import { post as llmCodeSymbolHallucinationTesting } from './llm-code-symbol-hallucination-testing';

export const articleFactory1000Batch080Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'promptfoo-repeat-aggregation-testing',
    post: promptfooRepeatAggregationTesting,
  },
  {
    slug: 'grader-score-distribution-collapse',
    post: graderScoreDistributionCollapse,
  },
  {
    slug: 'red-team-severity-normalization-testing',
    post: redTeamSeverityNormalizationTesting,
  },
  {
    slug: 'llm-batch-partial-failure-testing',
    post: llmBatchPartialFailureTesting,
  },
  {
    slug: 'llm-code-symbol-hallucination-testing',
    post: llmCodeSymbolHallucinationTesting,
  },
];
