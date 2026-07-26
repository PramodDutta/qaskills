import type { BlogPost } from './index';

import { post as cliGitTagPublishing } from './qaskills-cli-git-tag-publishing';
import { post as cliHttpErrorBodies } from './qaskills-cli-http-error-bodies';
import { post as sdkCustomBaseUrl } from './qaskills-sdk-custom-base-url';
import { post as searchOfflineErrorHandling } from './qaskills-search-offline-error-handling';
import { post as yesFlagAgentSelection } from './qaskills-yes-flag-agent-selection';

export interface ArticleFactory250Batch02Post {
  slug: string;
  post: BlogPost;
}

export const articleFactory250Batch02Posts: ArticleFactory250Batch02Post[] = [
  {
    slug: 'qaskills-cli-git-tag-publishing',
    post: cliGitTagPublishing,
  },
  {
    slug: 'qaskills-sdk-custom-base-url',
    post: sdkCustomBaseUrl,
  },
  {
    slug: 'qaskills-yes-flag-agent-selection',
    post: yesFlagAgentSelection,
  },
  {
    slug: 'qaskills-cli-http-error-bodies',
    post: cliHttpErrorBodies,
  },
  {
    slug: 'qaskills-search-offline-error-handling',
    post: searchOfflineErrorHandling,
  },
];
