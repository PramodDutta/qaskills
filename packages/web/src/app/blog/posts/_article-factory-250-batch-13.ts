import type { BlogPost } from './index';

import { post as artifactContentEndpointParityTesting } from './artifact-content-endpoint-parity-testing';
import { post as installTelemetryActionMappingTesting } from './install-telemetry-action-mapping-testing';
import { post as installTelemetryReferenceResolutionTesting } from './install-telemetry-reference-resolution-testing';
import { post as installTelemetryReplayProtectionTesting } from './install-telemetry-replay-protection-testing';
import { post as typesenseTimestampMappingContractTests } from './typesense-timestamp-mapping-contract-tests';

export const articleFactory250Batch13Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'artifact-content-endpoint-parity-testing',
    post: artifactContentEndpointParityTesting,
  },
  {
    slug: 'install-telemetry-replay-protection-testing',
    post: installTelemetryReplayProtectionTesting,
  },
  {
    slug: 'install-telemetry-reference-resolution-testing',
    post: installTelemetryReferenceResolutionTesting,
  },
  {
    slug: 'install-telemetry-action-mapping-testing',
    post: installTelemetryActionMappingTesting,
  },
  {
    slug: 'typesense-timestamp-mapping-contract-tests',
    post: typesenseTimestampMappingContractTests,
  },
];
