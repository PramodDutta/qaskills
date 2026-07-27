import type { BlogPost } from './index';

import { post as kotestSoftAssertionClues } from './kotest-soft-assertion-clues';
import { post as apiMultipartDuplicateFieldTesting } from './api-multipart-duplicate-field-testing';
import { post as localeDependentSnapshotStabilization } from './locale-dependent-snapshot-stabilization';
import { post as metamorphicRelationOracleDesign } from './metamorphic-relation-oracle-design';
import { post as minitestMockVerificationLifecycle } from './minitest-mock-verification-lifecycle';

export const articleFactory1000Batch139Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'kotest-soft-assertion-clues',
    post: kotestSoftAssertionClues,
  },
  {
    slug: 'api-multipart-duplicate-field-testing',
    post: apiMultipartDuplicateFieldTesting,
  },
  {
    slug: 'locale-dependent-snapshot-stabilization',
    post: localeDependentSnapshotStabilization,
  },
  {
    slug: 'metamorphic-relation-oracle-design',
    post: metamorphicRelationOracleDesign,
  },
  {
    slug: 'minitest-mock-verification-lifecycle',
    post: minitestMockVerificationLifecycle,
  },
];
