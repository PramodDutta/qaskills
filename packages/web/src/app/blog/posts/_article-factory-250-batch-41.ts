import type { BlogPost } from './index';

import { post as agentStaleToolResultTesting } from './agent-stale-tool-result-testing';
import { post as deepevalMetricScoreDirectionTesting } from './deepeval-metric-score-direction-testing';
import { post as evaluationLabelTaxonomyDriftTesting } from './evaluation-label-taxonomy-drift-testing';
import { post as llmTraceSamplingBiasTesting } from './llm-trace-sampling-bias-testing';
import { post as modelParameterDefaultDriftTesting } from './model-parameter-default-drift-testing';

export const articleFactory250Batch41Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-stale-tool-result-testing',
    post: agentStaleToolResultTesting,
  },
  {
    slug: 'deepeval-metric-score-direction-testing',
    post: deepevalMetricScoreDirectionTesting,
  },
  {
    slug: 'evaluation-label-taxonomy-drift-testing',
    post: evaluationLabelTaxonomyDriftTesting,
  },
  {
    slug: 'llm-trace-sampling-bias-testing',
    post: llmTraceSamplingBiasTesting,
  },
  {
    slug: 'model-parameter-default-drift-testing',
    post: modelParameterDefaultDriftTesting,
  },
];
