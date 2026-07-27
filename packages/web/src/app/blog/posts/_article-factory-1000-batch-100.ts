import type { BlogPost } from './index';

import { post as evalDatasetTemporalSplitTesting } from './eval-dataset-temporal-split-testing';
import { post as evalDatasetTrainTestOverlap } from './eval-dataset-train-test-overlap';
import { post as graderHumanDisagreementTriage } from './grader-human-disagreement-triage';
import { post as guardrailDisagreementAdjudicationTesting } from './guardrail-disagreement-adjudication-testing';
import { post as indirectPromptInjectionPdfTesting } from './indirect-prompt-injection-pdf-testing';

export const articleFactory1000Batch100Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'eval-dataset-temporal-split-testing',
    post: evalDatasetTemporalSplitTesting,
  },
  {
    slug: 'eval-dataset-train-test-overlap',
    post: evalDatasetTrainTestOverlap,
  },
  {
    slug: 'grader-human-disagreement-triage',
    post: graderHumanDisagreementTriage,
  },
  {
    slug: 'guardrail-disagreement-adjudication-testing',
    post: guardrailDisagreementAdjudicationTesting,
  },
  {
    slug: 'indirect-prompt-injection-pdf-testing',
    post: indirectPromptInjectionPdfTesting,
  },
];
