import type { BlogPost } from './index';

import { post as agentDeterministicTraceReplayTesting } from './agent-deterministic-trace-replay-testing';
import { post as promptfooHttpProviderContractTesting } from './promptfoo-http-provider-contract-testing';
import { post as promptfooReportSecretRedactionTesting } from './promptfoo-report-secret-redaction-testing';
import { post as ragasDatasetSchemaValidation } from './ragas-dataset-schema-validation';
import { post as toolCallCancellationPropagationTesting } from './tool-call-cancellation-propagation-testing';

export const articleFactory250Batch42Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'promptfoo-http-provider-contract-testing',
    post: promptfooHttpProviderContractTesting,
  },
  {
    slug: 'promptfoo-report-secret-redaction-testing',
    post: promptfooReportSecretRedactionTesting,
  },
  {
    slug: 'ragas-dataset-schema-validation',
    post: ragasDatasetSchemaValidation,
  },
  {
    slug: 'tool-call-cancellation-propagation-testing',
    post: toolCallCancellationPropagationTesting,
  },
  {
    slug: 'agent-deterministic-trace-replay-testing',
    post: agentDeterministicTraceReplayTesting,
  },
];
