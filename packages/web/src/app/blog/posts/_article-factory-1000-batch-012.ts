import type { BlogPost } from './index';

import { post as qaskillsTildeUsernamePathHandling } from './qaskills-tilde-username-path-handling';
import { post as qaskillsBrokenConfigSymlinkDetection } from './qaskills-broken-config-symlink-detection';
import { post as qaskillsUncPathSourceClassification } from './qaskills-unc-path-source-classification';
import { post as qaskillsUnknownTemplateFallback } from './qaskills-unknown-template-fallback';
import { post as qaskillsCliCiPathFilters } from './qaskills-cli-ci-path-filters';

export const articleFactory1000Batch012Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-tilde-username-path-handling',
    post: qaskillsTildeUsernamePathHandling,
  },
  {
    slug: 'qaskills-broken-config-symlink-detection',
    post: qaskillsBrokenConfigSymlinkDetection,
  },
  {
    slug: 'qaskills-unc-path-source-classification',
    post: qaskillsUncPathSourceClassification,
  },
  {
    slug: 'qaskills-unknown-template-fallback',
    post: qaskillsUnknownTemplateFallback,
  },
  {
    slug: 'qaskills-cli-ci-path-filters',
    post: qaskillsCliCiPathFilters,
  },
];
