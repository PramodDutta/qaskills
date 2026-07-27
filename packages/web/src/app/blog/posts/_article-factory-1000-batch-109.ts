import type { BlogPost } from './index';

import { post as loadBalancerSessionDrainingTesting } from './load-balancer-session-draining-testing';
import { post as bulkheadQueueIsolationTesting } from './bulkhead-queue-isolation-testing';
import { post as chaosDiskLatencyInjectionTesting } from './chaos-disk-latency-injection-testing';
import { post as containerImageSignatureVerificationTesting } from './container-image-signature-verification-testing';
import { post as dataPipelineWatermarkBoundaryTesting } from './data-pipeline-watermark-boundary-testing';

export const articleFactory1000Batch109Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'load-balancer-session-draining-testing',
    post: loadBalancerSessionDrainingTesting,
  },
  {
    slug: 'bulkhead-queue-isolation-testing',
    post: bulkheadQueueIsolationTesting,
  },
  {
    slug: 'chaos-disk-latency-injection-testing',
    post: chaosDiskLatencyInjectionTesting,
  },
  {
    slug: 'container-image-signature-verification-testing',
    post: containerImageSignatureVerificationTesting,
  },
  {
    slug: 'data-pipeline-watermark-boundary-testing',
    post: dataPipelineWatermarkBoundaryTesting,
  },
];
