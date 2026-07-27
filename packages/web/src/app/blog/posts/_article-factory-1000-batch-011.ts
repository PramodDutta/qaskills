import type { BlogPost } from './index';

import { post as qaskillsTelemetryInsertCounterConsistency } from './qaskills-telemetry-insert-counter-consistency';
import { post as qaskillsTelemetryProcessShutdownDelivery } from './qaskills-telemetry-process-shutdown-delivery';
import { post as qaskillsAtomicSkillReplacementTesting } from './qaskills-atomic-skill-replacement-testing';
import { post as qaskillsTelemetryRetryPolicyTesting } from './qaskills-telemetry-retry-policy-testing';
import { post as qaskillsBinaryAssetFidelityTesting } from './qaskills-binary-asset-fidelity-testing';

export const articleFactory1000Batch011Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-telemetry-insert-counter-consistency',
    post: qaskillsTelemetryInsertCounterConsistency,
  },
  {
    slug: 'qaskills-telemetry-process-shutdown-delivery',
    post: qaskillsTelemetryProcessShutdownDelivery,
  },
  {
    slug: 'qaskills-atomic-skill-replacement-testing',
    post: qaskillsAtomicSkillReplacementTesting,
  },
  {
    slug: 'qaskills-telemetry-retry-policy-testing',
    post: qaskillsTelemetryRetryPolicyTesting,
  },
  {
    slug: 'qaskills-binary-asset-fidelity-testing',
    post: qaskillsBinaryAssetFidelityTesting,
  },
];
