import type { BlogPost } from './index';

import { post as llmProviderFailoverProvenance } from './llm-provider-failover-provenance';
import { post as llmRefusalSchemaBranchTesting } from './llm-refusal-schema-branch-testing';
import { post as llmSelfContradictionDetectionTesting } from './llm-self-contradiction-detection-testing';
import { post as llmTraceExportRetryIdempotency } from './llm-trace-export-retry-idempotency';
import { post as multiAgentDuplicateWorkTesting } from './multi-agent-duplicate-work-testing';

export const articleFactory1000Batch082Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'llm-provider-failover-provenance',
    post: llmProviderFailoverProvenance,
  },
  {
    slug: 'llm-refusal-schema-branch-testing',
    post: llmRefusalSchemaBranchTesting,
  },
  {
    slug: 'llm-self-contradiction-detection-testing',
    post: llmSelfContradictionDetectionTesting,
  },
  {
    slug: 'llm-trace-export-retry-idempotency',
    post: llmTraceExportRetryIdempotency,
  },
  {
    slug: 'multi-agent-duplicate-work-testing',
    post: multiAgentDuplicateWorkTesting,
  },
];
