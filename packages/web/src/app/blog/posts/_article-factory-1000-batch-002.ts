import type { BlogPost } from './index';

import { post as qaskillsReadOnlyInstallDestination } from './qaskills-read-only-install-destination';
import { post as qaskillsRecursiveCopyErrorRecovery } from './qaskills-recursive-copy-error-recovery';
import { post as qaskillsRegistryResponseShapeCompatibility } from './qaskills-registry-response-shape-compatibility';
import { post as mcpInstallSlugValidationTests } from './mcp-install-slug-validation-tests';
import { post as qaskillsReleaseProvenanceAttestation } from './qaskills-release-provenance-attestation';

export const articleFactory1000Batch002Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-read-only-install-destination',
    post: qaskillsReadOnlyInstallDestination,
  },
  {
    slug: 'qaskills-recursive-copy-error-recovery',
    post: qaskillsRecursiveCopyErrorRecovery,
  },
  {
    slug: 'qaskills-registry-response-shape-compatibility',
    post: qaskillsRegistryResponseShapeCompatibility,
  },
  {
    slug: 'mcp-install-slug-validation-tests',
    post: mcpInstallSlugValidationTests,
  },
  {
    slug: 'qaskills-release-provenance-attestation',
    post: qaskillsReleaseProvenanceAttestation,
  },
];
