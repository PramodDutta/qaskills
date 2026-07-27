import type { BlogPost } from './index';

import { post as ragSynonymRecallSliceTesting } from './rag-synonym-recall-slice-testing';
import { post as ragCorpusFreshnessWatermarkTesting } from './rag-corpus-freshness-watermark-testing';
import { post as ragMultiSourceSynthesisTesting } from './rag-multi-source-synthesis-testing';
import { post as ragParentChildRetrievalIntegrity } from './rag-parent-child-retrieval-integrity';
import { post as ragUncitedClaimDetectionTesting } from './rag-uncited-claim-detection-testing';

export const articleFactory1000Batch093Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'rag-synonym-recall-slice-testing',
    post: ragSynonymRecallSliceTesting,
  },
  {
    slug: 'rag-corpus-freshness-watermark-testing',
    post: ragCorpusFreshnessWatermarkTesting,
  },
  {
    slug: 'rag-multi-source-synthesis-testing',
    post: ragMultiSourceSynthesisTesting,
  },
  {
    slug: 'rag-parent-child-retrieval-integrity',
    post: ragParentChildRetrievalIntegrity,
  },
  {
    slug: 'rag-uncited-claim-detection-testing',
    post: ragUncitedClaimDetectionTesting,
  },
];
