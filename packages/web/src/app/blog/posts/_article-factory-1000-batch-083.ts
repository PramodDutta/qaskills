import type { BlogPost } from './index';

import { post as multiAgentRoleBoundaryTesting } from './multi-agent-role-boundary-testing';
import { post as openaiEvalCancellationAccounting } from './openai-eval-cancellation-accounting';
import { post as openaiEvalDataSourceFiltering } from './openai-eval-data-source-filtering';
import { post as promptInjectionMetadataFieldTesting } from './prompt-injection-metadata-field-testing';
import { post as promptfooScenarioVariablePrecedence } from './promptfoo-scenario-variable-precedence';

export const articleFactory1000Batch083Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'multi-agent-role-boundary-testing',
    post: multiAgentRoleBoundaryTesting,
  },
  {
    slug: 'openai-eval-cancellation-accounting',
    post: openaiEvalCancellationAccounting,
  },
  {
    slug: 'openai-eval-data-source-filtering',
    post: openaiEvalDataSourceFiltering,
  },
  {
    slug: 'prompt-injection-metadata-field-testing',
    post: promptInjectionMetadataFieldTesting,
  },
  {
    slug: 'promptfoo-scenario-variable-precedence',
    post: promptfooScenarioVariablePrecedence,
  },
];
