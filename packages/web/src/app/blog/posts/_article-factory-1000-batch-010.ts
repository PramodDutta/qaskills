import type { BlogPost } from './index';

import { post as qaskillsSourcePrefixPrecedenceTests } from './qaskills-source-prefix-precedence-tests';
import { post as qaskillsStagingDirectoryLeakTesting } from './qaskills-staging-directory-leak-testing';
import { post as qaskillsSymbolicLinkCopyFidelity } from './qaskills-symbolic-link-copy-fidelity';
import { post as qaskillsSymlinkInstallMethodTesting } from './qaskills-symlink-install-method-testing';
import { post as qaskillsTelemetryAgentAttributionFidelity } from './qaskills-telemetry-agent-attribution-fidelity';

export const articleFactory1000Batch010Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-source-prefix-precedence-tests',
    post: qaskillsSourcePrefixPrecedenceTests,
  },
  {
    slug: 'qaskills-staging-directory-leak-testing',
    post: qaskillsStagingDirectoryLeakTesting,
  },
  {
    slug: 'qaskills-symbolic-link-copy-fidelity',
    post: qaskillsSymbolicLinkCopyFidelity,
  },
  {
    slug: 'qaskills-symlink-install-method-testing',
    post: qaskillsSymlinkInstallMethodTesting,
  },
  {
    slug: 'qaskills-telemetry-agent-attribution-fidelity',
    post: qaskillsTelemetryAgentAttributionFidelity,
  },
];
