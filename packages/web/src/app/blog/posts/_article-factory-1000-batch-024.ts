import type { BlogPost } from './index';

import { post as qaskillsSdkFactoryExportParity } from './qaskills-sdk-factory-export-parity';
import { post as qaskillsSdkRequestTimeoutPolicy } from './qaskills-sdk-request-timeout-policy';
import { post as qaskillsSdkSourcemapPublishing } from './qaskills-sdk-sourcemap-publishing';
import { post as qaskillsTelemetryClientVersionLabels } from './qaskills-telemetry-client-version-labels';
import { post as qaskillsNpmTokenPermissionAudit } from './qaskills-npm-token-permission-audit';

export const articleFactory1000Batch024Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-sdk-factory-export-parity',
    post: qaskillsSdkFactoryExportParity,
  },
  {
    slug: 'qaskills-sdk-request-timeout-policy',
    post: qaskillsSdkRequestTimeoutPolicy,
  },
  {
    slug: 'qaskills-sdk-sourcemap-publishing',
    post: qaskillsSdkSourcemapPublishing,
  },
  {
    slug: 'qaskills-telemetry-client-version-labels',
    post: qaskillsTelemetryClientVersionLabels,
  },
  {
    slug: 'qaskills-npm-token-permission-audit',
    post: qaskillsNpmTokenPermissionAudit,
  },
];
