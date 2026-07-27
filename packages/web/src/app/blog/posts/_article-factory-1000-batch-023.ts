import type { BlogPost } from './index';

import { post as qaskillsManualReleaseDispatchParity } from './qaskills-manual-release-dispatch-parity';
import { post as qaskillsMcpDualRegistryOrdering } from './qaskills-mcp-dual-registry-ordering';
import { post as qaskillsNpmPublicScopeAccess } from './qaskills-npm-public-scope-access';
import { post as qaskillsRandomSampleBiasTesting } from './qaskills-random-sample-bias-testing';
import { post as qaskillsMcpPublisherBinaryPinning } from './qaskills-mcp-publisher-binary-pinning';

export const articleFactory1000Batch023Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-manual-release-dispatch-parity',
    post: qaskillsManualReleaseDispatchParity,
  },
  {
    slug: 'qaskills-mcp-dual-registry-ordering',
    post: qaskillsMcpDualRegistryOrdering,
  },
  {
    slug: 'qaskills-npm-public-scope-access',
    post: qaskillsNpmPublicScopeAccess,
  },
  {
    slug: 'qaskills-random-sample-bias-testing',
    post: qaskillsRandomSampleBiasTesting,
  },
  {
    slug: 'qaskills-mcp-publisher-binary-pinning',
    post: qaskillsMcpPublisherBinaryPinning,
  },
];
