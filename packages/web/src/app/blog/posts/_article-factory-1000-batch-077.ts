import type { BlogPost } from './index';

import { post as llmFallbackModelEquivalenceTesting } from './llm-fallback-model-equivalence-testing';
import { post as llmGenerationSpanNamingTesting } from './llm-generation-span-naming-testing';
import { post as llmJudgePromptInjectionResistance } from './llm-judge-prompt-injection-resistance';
import { post as llmNumericClaimConsistencyTesting } from './llm-numeric-claim-consistency-testing';
import { post as multimodalImageOrderSensitivity } from './multimodal-image-order-sensitivity';

export const articleFactory1000Batch077Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'llm-fallback-model-equivalence-testing',
    post: llmFallbackModelEquivalenceTesting,
  },
  {
    slug: 'llm-generation-span-naming-testing',
    post: llmGenerationSpanNamingTesting,
  },
  {
    slug: 'llm-judge-prompt-injection-resistance',
    post: llmJudgePromptInjectionResistance,
  },
  {
    slug: 'llm-numeric-claim-consistency-testing',
    post: llmNumericClaimConsistencyTesting,
  },
  {
    slug: 'multimodal-image-order-sensitivity',
    post: multimodalImageOrderSensitivity,
  },
];
