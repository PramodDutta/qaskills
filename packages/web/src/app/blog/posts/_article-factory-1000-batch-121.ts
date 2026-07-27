import type { BlogPost } from './index';

import { post as cdcOutOfOrderEventTesting } from './cdc-out-of-order-event-testing';
import { post as chaosDependencyBrownoutTesting } from './chaos-dependency-brownout-testing';
import { post as chaosPacketCorruptionRecoveryTesting } from './chaos-packet-corruption-recovery-testing';
import { post as ciArtifactProvenanceVerificationTesting } from './ci-artifact-provenance-verification-testing';
import { post as quicVersionNegotiationTesting } from './quic-version-negotiation-testing';

export const articleFactory1000Batch121Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'cdc-out-of-order-event-testing',
    post: cdcOutOfOrderEventTesting,
  },
  {
    slug: 'chaos-dependency-brownout-testing',
    post: chaosDependencyBrownoutTesting,
  },
  {
    slug: 'chaos-packet-corruption-recovery-testing',
    post: chaosPacketCorruptionRecoveryTesting,
  },
  {
    slug: 'ci-artifact-provenance-verification-testing',
    post: ciArtifactProvenanceVerificationTesting,
  },
  {
    slug: 'quic-version-negotiation-testing',
    post: quicVersionNegotiationTesting,
  },
];
