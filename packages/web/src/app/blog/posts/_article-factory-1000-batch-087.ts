import type { BlogPost } from './index';

import { post as aiQualityGateMissingDataTesting } from './ai-quality-gate-missing-data-testing';
import { post as llmSchemaVersionCompatibilityTesting } from './llm-schema-version-compatibility-testing';
import { post as ragasTestsetPersonaCoverage } from './ragas-testset-persona-coverage';
import { post as llmEvaluatorSpanSeparationTesting } from './llm-evaluator-span-separation-testing';
import { post as evalDatasetHardCaseRetention } from './eval-dataset-hard-case-retention';

export const articleFactory1000Batch087Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'ai-quality-gate-missing-data-testing',
    post: aiQualityGateMissingDataTesting,
  },
  {
    slug: 'llm-schema-version-compatibility-testing',
    post: llmSchemaVersionCompatibilityTesting,
  },
  {
    slug: 'ragas-testset-persona-coverage',
    post: ragasTestsetPersonaCoverage,
  },
  {
    slug: 'llm-evaluator-span-separation-testing',
    post: llmEvaluatorSpanSeparationTesting,
  },
  {
    slug: 'eval-dataset-hard-case-retention',
    post: evalDatasetHardCaseRetention,
  },
];
