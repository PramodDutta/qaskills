import type { BlogPost } from './index';

import { post as idempotentConsumerDuplicateTesting } from './idempotent-consumer-duplicate-testing';
import { post as gracefulDegradationStaleDataTesting } from './graceful-degradation-stale-data-testing';
import { post as jwtAudienceConfusionTesting } from './jwt-audience-confusion-testing';
import { post as iosBackgroundTaskExpirationTesting } from './ios-background-task-expiration-testing';
import { post as iosUniversalLinkFallbackTesting } from './ios-universal-link-fallback-testing';

export const articleFactory1000Batch101Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'idempotent-consumer-duplicate-testing',
    post: idempotentConsumerDuplicateTesting,
  },
  {
    slug: 'graceful-degradation-stale-data-testing',
    post: gracefulDegradationStaleDataTesting,
  },
  {
    slug: 'jwt-audience-confusion-testing',
    post: jwtAudienceConfusionTesting,
  },
  {
    slug: 'ios-background-task-expiration-testing',
    post: iosBackgroundTaskExpirationTesting,
  },
  {
    slug: 'ios-universal-link-fallback-testing',
    post: iosUniversalLinkFallbackTesting,
  },
];
