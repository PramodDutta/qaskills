import type { BlogPost } from './index';

import { post as evalDatasetLabelLeakageTesting } from './eval-dataset-label-leakage-testing';
import { post as systemPromptCanaryLeakTesting } from './system-prompt-canary-leak-testing';
import { post as guardrailFailOpenOutageTesting } from './guardrail-fail-open-outage-testing';
import { post as guardrailPolicyVersionRegressionTesting } from './guardrail-policy-version-regression-testing';
import { post as llmAnswerCompletenessOmissionTesting } from './llm-answer-completeness-omission-testing';

export const articleFactory1000Batch088Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'eval-dataset-label-leakage-testing',
    post: evalDatasetLabelLeakageTesting,
  },
  {
    slug: 'system-prompt-canary-leak-testing',
    post: systemPromptCanaryLeakTesting,
  },
  {
    slug: 'guardrail-fail-open-outage-testing',
    post: guardrailFailOpenOutageTesting,
  },
  {
    slug: 'guardrail-policy-version-regression-testing',
    post: guardrailPolicyVersionRegressionTesting,
  },
  {
    slug: 'llm-answer-completeness-omission-testing',
    post: llmAnswerCompletenessOmissionTesting,
  },
];
