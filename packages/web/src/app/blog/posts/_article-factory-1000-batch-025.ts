import type { BlogPost } from './index';

import { post as qaskillsTelemetryTimeoutEventLoss } from './qaskills-telemetry-timeout-event-loss';
import { post as qaskillsVitestProjectDetection } from './qaskills-vitest-project-detection';
import { post as qaskillsPackageTarballSmokeTests } from './qaskills-package-tarball-smoke-tests';
import { post as mcpRequestIdCorrelationTests } from './mcp-request-id-correlation-tests';
import { post as qaskillsPartialUpdateFailureTesting } from './qaskills-partial-update-failure-testing';

export const articleFactory1000Batch025Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-telemetry-timeout-event-loss',
    post: qaskillsTelemetryTimeoutEventLoss,
  },
  {
    slug: 'qaskills-vitest-project-detection',
    post: qaskillsVitestProjectDetection,
  },
  {
    slug: 'qaskills-package-tarball-smoke-tests',
    post: qaskillsPackageTarballSmokeTests,
  },
  {
    slug: 'mcp-request-id-correlation-tests',
    post: mcpRequestIdCorrelationTests,
  },
  {
    slug: 'qaskills-partial-update-failure-testing',
    post: qaskillsPartialUpdateFailureTesting,
  },
];
