import type { BlogPost } from './index';

import { post as llmStreamingJsonAssemblyTesting } from './llm-streaming-json-assembly-testing';
import { post as llmToolChoiceDistributionDrift } from './llm-tool-choice-distribution-drift';
import { post as llmUnitConversionHallucinationTesting } from './llm-unit-conversion-hallucination-testing';
import { post as openaiEvalItemSchemaValidation } from './openai-eval-item-schema-validation';
import { post as openaiEvalResultPaginationTesting } from './openai-eval-result-pagination-testing';

export const articleFactory1000Batch091Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'llm-streaming-json-assembly-testing',
    post: llmStreamingJsonAssemblyTesting,
  },
  {
    slug: 'llm-tool-choice-distribution-drift',
    post: llmToolChoiceDistributionDrift,
  },
  {
    slug: 'llm-unit-conversion-hallucination-testing',
    post: llmUnitConversionHallucinationTesting,
  },
  {
    slug: 'openai-eval-item-schema-validation',
    post: openaiEvalItemSchemaValidation,
  },
  {
    slug: 'openai-eval-result-pagination-testing',
    post: openaiEvalResultPaginationTesting,
  },
];
