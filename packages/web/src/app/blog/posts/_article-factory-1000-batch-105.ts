import type { BlogPost } from './index';

import { post as kafkaTombstoneCompactionTesting } from './kafka-tombstone-compaction-testing';
import { post as jmeterBackendListenerBackpressureTesting } from './jmeter-backend-listener-backpressure-testing';
import { post as kafkaTransitiveSchemaCompatibilityTesting } from './kafka-transitive-schema-compatibility-testing';
import { post as accessibleAuthenticationCognitiveTesting } from './accessible-authentication-cognitive-testing';
import { post as androidForegroundServiceTimeoutTesting } from './android-foreground-service-timeout-testing';

export const articleFactory1000Batch105Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'kafka-tombstone-compaction-testing',
    post: kafkaTombstoneCompactionTesting,
  },
  {
    slug: 'jmeter-backend-listener-backpressure-testing',
    post: jmeterBackendListenerBackpressureTesting,
  },
  {
    slug: 'kafka-transitive-schema-compatibility-testing',
    post: kafkaTransitiveSchemaCompatibilityTesting,
  },
  {
    slug: 'accessible-authentication-cognitive-testing',
    post: accessibleAuthenticationCognitiveTesting,
  },
  {
    slug: 'android-foreground-service-timeout-testing',
    post: androidForegroundServiceTimeoutTesting,
  },
];
