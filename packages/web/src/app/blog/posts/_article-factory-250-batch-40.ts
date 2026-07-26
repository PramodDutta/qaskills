import type { BlogPost } from './index';

import { post as promptfooProviderRateLimitRecovery } from './promptfoo-provider-rate-limit-recovery';
import { post as ragHardNegativeRetrievalTesting } from './rag-hard-negative-retrieval-testing';
import { post as ragasNanScoreHandling } from './ragas-nan-score-handling';
import { post as tokenizerVersionDriftTesting } from './tokenizer-version-drift-testing';
import { post as unicodePromptInjectionNormalizationTesting } from './unicode-prompt-injection-normalization-testing';

export const articleFactory250Batch40Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'rag-hard-negative-retrieval-testing',
    post: ragHardNegativeRetrievalTesting,
  },
  {
    slug: 'ragas-nan-score-handling',
    post: ragasNanScoreHandling,
  },
  {
    slug: 'tokenizer-version-drift-testing',
    post: tokenizerVersionDriftTesting,
  },
  {
    slug: 'promptfoo-provider-rate-limit-recovery',
    post: promptfooProviderRateLimitRecovery,
  },
  {
    slug: 'unicode-prompt-injection-normalization-testing',
    post: unicodePromptInjectionNormalizationTesting,
  },
];
