import type { BlogPost } from './index';

import { post as qaskillsCliApiUrlOverride } from './qaskills-cli-api-url-override';
import { post as qaskillsMultiFrameworkDetectionOrder } from './qaskills-multi-framework-detection-order';
import { post as qaskillsSdkNonJsonErrors } from './qaskills-sdk-non-json-errors';
import { post as qaskillsSearchFilterFlagTesting } from './qaskills-search-filter-flag-testing';
import { post as qaskillsUndetectedKnownAgentInstall } from './qaskills-undetected-known-agent-install';

export interface ArticleFactory250Batch01Post {
  slug: string;
  post: BlogPost;
}

export const articleFactory250Batch01Posts: ArticleFactory250Batch01Post[] = [
  {
    slug: 'qaskills-undetected-known-agent-install',
    post: qaskillsUndetectedKnownAgentInstall,
  },
  {
    slug: 'qaskills-cli-api-url-override',
    post: qaskillsCliApiUrlOverride,
  },
  {
    slug: 'qaskills-search-filter-flag-testing',
    post: qaskillsSearchFilterFlagTesting,
  },
  {
    slug: 'qaskills-multi-framework-detection-order',
    post: qaskillsMultiFrameworkDetectionOrder,
  },
  {
    slug: 'qaskills-sdk-non-json-errors',
    post: qaskillsSdkNonJsonErrors,
  },
];
