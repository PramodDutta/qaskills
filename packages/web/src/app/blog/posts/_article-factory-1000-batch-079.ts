import type { BlogPost } from './index';

import { post as agentDynamicToolAvailabilityTesting } from './agent-dynamic-tool-availability-testing';
import { post as aiGateComparatorVersionTesting } from './ai-gate-comparator-version-testing';
import { post as aiReleaseSliceOwnershipTesting } from './ai-release-slice-ownership-testing';
import { post as deepevalConversationalTurnOrderTesting } from './deepeval-conversational-turn-order-testing';
import { post as deepevalMetricInitializationFailureTesting } from './deepeval-metric-initialization-failure-testing';

export const articleFactory1000Batch079Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-dynamic-tool-availability-testing',
    post: agentDynamicToolAvailabilityTesting,
  },
  {
    slug: 'ai-gate-comparator-version-testing',
    post: aiGateComparatorVersionTesting,
  },
  {
    slug: 'ai-release-slice-ownership-testing',
    post: aiReleaseSliceOwnershipTesting,
  },
  {
    slug: 'deepeval-conversational-turn-order-testing',
    post: deepevalConversationalTurnOrderTesting,
  },
  {
    slug: 'deepeval-metric-initialization-failure-testing',
    post: deepevalMetricInitializationFailureTesting,
  },
];
