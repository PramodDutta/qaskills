import type { BlogPost } from './index';

import { post as agentRequiredToolChoiceTesting } from './agent-required-tool-choice-testing';
import { post as agentUnexpectedToolResponseTesting } from './agent-unexpected-tool-response-testing';
import { post as llmProviderHealthRoutingTesting } from './llm-provider-health-routing-testing';
import { post as aiEvalFailureClassificationTesting } from './ai-eval-failure-classification-testing';
import { post as aiPostReleaseRegressionReplay } from './ai-post-release-regression-replay';

export const articleFactory1000Batch097Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-required-tool-choice-testing',
    post: agentRequiredToolChoiceTesting,
  },
  {
    slug: 'agent-unexpected-tool-response-testing',
    post: agentUnexpectedToolResponseTesting,
  },
  {
    slug: 'llm-provider-health-routing-testing',
    post: llmProviderHealthRoutingTesting,
  },
  {
    slug: 'ai-eval-failure-classification-testing',
    post: aiEvalFailureClassificationTesting,
  },
  {
    slug: 'ai-post-release-regression-replay',
    post: aiPostReleaseRegressionReplay,
  },
];
