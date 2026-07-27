import type { BlogPost } from './index';

import { post as agentDelegatedTaskTimeoutTesting } from './agent-delegated-task-timeout-testing';
import { post as agentToolArgumentInjectionTesting } from './agent-tool-argument-injection-testing';
import { post as llmHedgedRequestCancellationTesting } from './llm-hedged-request-cancellation-testing';
import { post as deepevalSkippedCaseAccountingTesting } from './deepeval-skipped-case-accounting-testing';
import { post as evalDatasetAnnotationDisagreementTesting } from './eval-dataset-annotation-disagreement-testing';

export const articleFactory1000Batch076Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-delegated-task-timeout-testing',
    post: agentDelegatedTaskTimeoutTesting,
  },
  {
    slug: 'agent-tool-argument-injection-testing',
    post: agentToolArgumentInjectionTesting,
  },
  {
    slug: 'llm-hedged-request-cancellation-testing',
    post: llmHedgedRequestCancellationTesting,
  },
  {
    slug: 'deepeval-skipped-case-accounting-testing',
    post: deepevalSkippedCaseAccountingTesting,
  },
  {
    slug: 'eval-dataset-annotation-disagreement-testing',
    post: evalDatasetAnnotationDisagreementTesting,
  },
];
