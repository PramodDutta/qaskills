import type { BlogPost } from './index';

import { post as aggregateDrivenSyntheticTestData } from './aggregate-driven-synthetic-test-data-without-production-rows';
import { post as foreignKeyGraphRelationalTestData } from './foreign-key-graph-relational-test-data-builder';
import { post as negativeApiTestsNoPartialWrite } from './negative-api-tests-no-partial-write-row-count';
import { post as reservedNamespacesPiiSafeSyntheticData } from './reserved-namespaces-pii-safe-synthetic-test-data';
import { post as testDataCleanupResidueAssertion } from './test-data-cleanup-residue-assertion-run-tag';

export const articleFactorySecureDataPosts: Array<{ slug: string; post: BlogPost }> = [
  {
    slug: 'foreign-key-graph-relational-test-data-builder',
    post: foreignKeyGraphRelationalTestData,
  },
  {
    slug: 'negative-api-tests-no-partial-write-row-count',
    post: negativeApiTestsNoPartialWrite,
  },
  {
    slug: 'test-data-cleanup-residue-assertion-run-tag',
    post: testDataCleanupResidueAssertion,
  },
  {
    slug: 'reserved-namespaces-pii-safe-synthetic-test-data',
    post: reservedNamespacesPiiSafeSyntheticData,
  },
  {
    slug: 'aggregate-driven-synthetic-test-data-without-production-rows',
    post: aggregateDrivenSyntheticTestData,
  },
];
