import type { BlogPost } from './index';

import { post as qaskillsListMissingDirectoryHandling } from './qaskills-list-missing-directory-handling';
import { post as qaskillsExtractionStagingRaceTesting } from './qaskills-extraction-staging-race-testing';
import { post as qaskillsExtractionSymlinkEscapeTesting } from './qaskills-extraction-symlink-escape-testing';
import { post as mcpPreInitializationRequestRejection } from './mcp-pre-initialization-request-rejection';
import { post as qaskillsFrozenLockfileReleaseParity } from './qaskills-frozen-lockfile-release-parity';

export const articleFactory1000Batch018Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-list-missing-directory-handling',
    post: qaskillsListMissingDirectoryHandling,
  },
  {
    slug: 'qaskills-extraction-staging-race-testing',
    post: qaskillsExtractionStagingRaceTesting,
  },
  {
    slug: 'qaskills-extraction-symlink-escape-testing',
    post: qaskillsExtractionSymlinkEscapeTesting,
  },
  {
    slug: 'mcp-pre-initialization-request-rejection',
    post: mcpPreInitializationRequestRejection,
  },
  {
    slug: 'qaskills-frozen-lockfile-release-parity',
    post: qaskillsFrozenLockfileReleaseParity,
  },
];
