import type { BlogPost } from './index';

import { post as agentMemoryDeletionVerification } from './agent-memory-deletion-verification';
import { post as agentMemoryExpirationTesting } from './agent-memory-expiration-testing';
import { post as agentToolAuthenticationRefreshTesting } from './agent-tool-authentication-refresh-testing';
import { post as llmAdditionalPropertiesRejectionTesting } from './llm-additional-properties-rejection-testing';
import { post as aiModelPromotionEvidenceTesting } from './ai-model-promotion-evidence-testing';

export const articleFactory1000Batch086Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-memory-deletion-verification',
    post: agentMemoryDeletionVerification,
  },
  {
    slug: 'agent-memory-expiration-testing',
    post: agentMemoryExpirationTesting,
  },
  {
    slug: 'agent-tool-authentication-refresh-testing',
    post: agentToolAuthenticationRefreshTesting,
  },
  {
    slug: 'llm-additional-properties-rejection-testing',
    post: llmAdditionalPropertiesRejectionTesting,
  },
  {
    slug: 'ai-model-promotion-evidence-testing',
    post: aiModelPromotionEvidenceTesting,
  },
];
