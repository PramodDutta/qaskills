import type { BlogPost } from './index';

import { post as postgresPaginationCountConsistency } from './postgres-pagination-count-consistency';
import { post as reviewListAggregateConsistencyTesting } from './review-list-aggregate-consistency-testing';
import { post as skillContentFallbackOutageTesting } from './skill-content-fallback-outage-testing';
import { post as trendingRecencyTieTesting } from './trending-recency-tie-testing';
import { post as unknownCategoryTypeHandlingTesting } from './unknown-category-type-handling-testing';

export const articleFactory250Batch15Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'review-list-aggregate-consistency-testing',
    post: reviewListAggregateConsistencyTesting,
  },
  {
    slug: 'skill-content-fallback-outage-testing',
    post: skillContentFallbackOutageTesting,
  },
  {
    slug: 'trending-recency-tie-testing',
    post: trendingRecencyTieTesting,
  },
  {
    slug: 'postgres-pagination-count-consistency',
    post: postgresPaginationCountConsistency,
  },
  {
    slug: 'unknown-category-type-handling-testing',
    post: unknownCategoryTypeHandlingTesting,
  },
];
