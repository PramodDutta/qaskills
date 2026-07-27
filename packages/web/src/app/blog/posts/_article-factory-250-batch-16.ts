import type { BlogPost } from './index';

import { post as categoryResponseGroupingContractTesting } from './category-response-grouping-contract-testing';
import { post as drizzleSortAliasContractTesting } from './drizzle-sort-alias-contract-testing';
import { post as topFiftyRankingBoundaryTesting } from './top-fifty-ranking-boundary-testing';
import { post as typesenseConnectionTimeoutTesting } from './typesense-connection-timeout-testing';
import { post as typesenseQueryFieldCoverageTesting } from './typesense-query-field-coverage-testing';

export const articleFactory250Batch16Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'typesense-query-field-coverage-testing',
    post: typesenseQueryFieldCoverageTesting,
  },
  {
    slug: 'typesense-connection-timeout-testing',
    post: typesenseConnectionTimeoutTesting,
  },
  {
    slug: 'top-fifty-ranking-boundary-testing',
    post: topFiftyRankingBoundaryTesting,
  },
  {
    slug: 'category-response-grouping-contract-testing',
    post: categoryResponseGroupingContractTesting,
  },
  {
    slug: 'drizzle-sort-alias-contract-testing',
    post: drizzleSortAliasContractTesting,
  },
];
