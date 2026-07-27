import type { BlogPost } from './index';

import { post as ragCitationRankBiasTesting } from './rag-citation-rank-bias-testing';
import { post as ragFollowUpGroundingTesting } from './rag-follow-up-grounding-testing';
import { post as ragMultiQueryResultDeduplication } from './rag-multi-query-result-deduplication';
import { post as ragEmbeddingDimensionMismatchTesting } from './rag-embedding-dimension-mismatch-testing';
import { post as ragasExecutorCancellationTesting } from './ragas-executor-cancellation-testing';

export const articleFactory1000Batch084Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'rag-citation-rank-bias-testing',
    post: ragCitationRankBiasTesting,
  },
  {
    slug: 'rag-follow-up-grounding-testing',
    post: ragFollowUpGroundingTesting,
  },
  {
    slug: 'rag-multi-query-result-deduplication',
    post: ragMultiQueryResultDeduplication,
  },
  {
    slug: 'rag-embedding-dimension-mismatch-testing',
    post: ragEmbeddingDimensionMismatchTesting,
  },
  {
    slug: 'ragas-executor-cancellation-testing',
    post: ragasExecutorCancellationTesting,
  },
];
