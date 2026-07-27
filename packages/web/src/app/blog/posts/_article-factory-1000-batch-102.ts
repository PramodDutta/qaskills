import type { BlogPost } from './index';

import { post as canaryMetricSampleSizeTesting } from './canary-metric-sample-size-testing';
import { post as ciCancellationCleanupTesting } from './ci-cancellation-cleanup-testing';
import { post as ipv6DualStackFallbackTesting } from './ipv6-dual-stack-fallback-testing';
import { post as jmeterConnectionPoolSaturationTesting } from './jmeter-connection-pool-saturation-testing';
import { post as jsonSchemaConditionalDependencyTesting } from './json-schema-conditional-dependency-testing';

export const articleFactory1000Batch102Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'canary-metric-sample-size-testing',
    post: canaryMetricSampleSizeTesting,
  },
  {
    slug: 'ci-cancellation-cleanup-testing',
    post: ciCancellationCleanupTesting,
  },
  {
    slug: 'ipv6-dual-stack-fallback-testing',
    post: ipv6DualStackFallbackTesting,
  },
  {
    slug: 'jmeter-connection-pool-saturation-testing',
    post: jmeterConnectionPoolSaturationTesting,
  },
  {
    slug: 'json-schema-conditional-dependency-testing',
    post: jsonSchemaConditionalDependencyTesting,
  },
];
