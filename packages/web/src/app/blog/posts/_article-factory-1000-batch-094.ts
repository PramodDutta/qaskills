import type { BlogPost } from './index';

import { post as ragasEvaluationCallbackIsolation } from './ragas-evaluation-callback-isolation';
import { post as ragasTokenUsageParserTesting } from './ragas-token-usage-parser-testing';
import { post as redTeamAttackDeduplicationTesting } from './red-team-attack-deduplication-testing';
import { post as visionLlmCropSensitivityTesting } from './vision-llm-crop-sensitivity-testing';
import { post as visionLlmOcrFidelityTesting } from './vision-llm-ocr-fidelity-testing';

export const articleFactory1000Batch094Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'ragas-evaluation-callback-isolation',
    post: ragasEvaluationCallbackIsolation,
  },
  {
    slug: 'ragas-token-usage-parser-testing',
    post: ragasTokenUsageParserTesting,
  },
  {
    slug: 'red-team-attack-deduplication-testing',
    post: redTeamAttackDeduplicationTesting,
  },
  {
    slug: 'vision-llm-crop-sensitivity-testing',
    post: visionLlmCropSensitivityTesting,
  },
  {
    slug: 'vision-llm-ocr-fidelity-testing',
    post: visionLlmOcrFidelityTesting,
  },
];
