import type { BlogPost } from './index';

import { post as installCounterConcurrencyTesting } from './install-counter-concurrency-testing';
import { post as postgresIlikeWildcardEscaping } from './postgres-ilike-wildcard-escaping';
import { post as redisCachedNullAmbiguityTesting } from './redis-cached-null-ambiguity-testing';
import { post as reviewApiPaginationLoadTesting } from './review-api-pagination-load-testing';
import { post as reviewCommentLengthValidationTesting } from './review-comment-length-validation-testing';

export const articleFactory250Batch17Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'install-counter-concurrency-testing',
    post: installCounterConcurrencyTesting,
  },
  {
    slug: 'review-comment-length-validation-testing',
    post: reviewCommentLengthValidationTesting,
  },
  {
    slug: 'postgres-ilike-wildcard-escaping',
    post: postgresIlikeWildcardEscaping,
  },
  {
    slug: 'redis-cached-null-ambiguity-testing',
    post: redisCachedNullAmbiguityTesting,
  },
  {
    slug: 'review-api-pagination-load-testing',
    post: reviewApiPaginationLoadTesting,
  },
];
