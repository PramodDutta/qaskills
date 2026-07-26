import type { BlogPost } from './index';

import { post as agentToolResultTruncationTesting } from './agent-tool-result-truncation-testing';
import { post as deepevalParallelProviderBackoffTesting } from './deepeval-parallel-provider-backoff-testing';
import { post as deepevalRetrievalContextValidation } from './deepeval-retrieval-context-validation';
import { post as destructiveToolConfirmationTesting } from './destructive-tool-confirmation-testing';
import { post as llmProviderSchemaDriftTesting } from './llm-provider-schema-drift-testing';

export const articleFactory250Batch38Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-tool-result-truncation-testing',
    post: agentToolResultTruncationTesting,
  },
  {
    slug: 'deepeval-retrieval-context-validation',
    post: deepevalRetrievalContextValidation,
  },
  {
    slug: 'destructive-tool-confirmation-testing',
    post: destructiveToolConfirmationTesting,
  },
  {
    slug: 'deepeval-parallel-provider-backoff-testing',
    post: deepevalParallelProviderBackoffTesting,
  },
  {
    slug: 'llm-provider-schema-drift-testing',
    post: llmProviderSchemaDriftTesting,
  },
];
