import type { BlogPost } from './index';

import { post as agentIdempotencyKeyPropagationTesting } from './agent-idempotency-key-propagation-testing';
import { post as agentMemoryConflictResolutionTesting } from './agent-memory-conflict-resolution-testing';
import { post as agentPartialBatchActionTesting } from './agent-partial-batch-action-testing';
import { post as agentPlanRevisionAuditTesting } from './agent-plan-revision-audit-testing';
import { post as promptfooCsvMetadataParsingTesting } from './promptfoo-csv-metadata-parsing-testing';

export const articleFactory1000Batch096Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-idempotency-key-propagation-testing',
    post: agentIdempotencyKeyPropagationTesting,
  },
  {
    slug: 'agent-memory-conflict-resolution-testing',
    post: agentMemoryConflictResolutionTesting,
  },
  {
    slug: 'agent-partial-batch-action-testing',
    post: agentPartialBatchActionTesting,
  },
  {
    slug: 'agent-plan-revision-audit-testing',
    post: agentPlanRevisionAuditTesting,
  },
  {
    slug: 'promptfoo-csv-metadata-parsing-testing',
    post: promptfooCsvMetadataParsingTesting,
  },
];
