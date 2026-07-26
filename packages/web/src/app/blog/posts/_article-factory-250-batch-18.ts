import type { BlogPost } from './index';

import { post as categoryResponseOrderingTesting } from './category-response-ordering-testing';
import { post as reviewAverageRoundingContractTesting } from './review-average-rounding-contract-testing';
import { post as skillPublishPartialFailureTesting } from './skill-publish-partial-failure-testing';
import { post as typesensePublishIndexFreshnessTesting } from './typesense-publish-index-freshness-testing';
import { post as upstashRedisReadOutageTesting } from './upstash-redis-read-outage-testing';

export const articleFactory250Batch18Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-publish-partial-failure-testing',
    post: skillPublishPartialFailureTesting,
  },
  {
    slug: 'typesense-publish-index-freshness-testing',
    post: typesensePublishIndexFreshnessTesting,
  },
  {
    slug: 'upstash-redis-read-outage-testing',
    post: upstashRedisReadOutageTesting,
  },
  {
    slug: 'review-average-rounding-contract-testing',
    post: reviewAverageRoundingContractTesting,
  },
  {
    slug: 'category-response-ordering-testing',
    post: categoryResponseOrderingTesting,
  },
];
