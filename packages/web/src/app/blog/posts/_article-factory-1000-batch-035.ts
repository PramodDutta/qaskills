import type { BlogPost } from './index';

import { post as skillMdMarkdownMediaTypeTests } from './skill-md-markdown-media-type-tests';
import { post as featuredPackCardIndicatorTests } from './featured-pack-card-indicator-tests';
import { post as ga4BrowserGuardContractTests } from './ga4-browser-guard-contract-tests';
import { post as ga4CommandCopyOptionalFields } from './ga4-command-copy-optional-fields';
import { post as skillPackViewAnalyticsTests } from './skill-pack-view-analytics-tests';

export const articleFactory1000Batch035Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-markdown-media-type-tests',
    post: skillMdMarkdownMediaTypeTests,
  },
  {
    slug: 'featured-pack-card-indicator-tests',
    post: featuredPackCardIndicatorTests,
  },
  {
    slug: 'ga4-browser-guard-contract-tests',
    post: ga4BrowserGuardContractTests,
  },
  {
    slug: 'ga4-command-copy-optional-fields',
    post: ga4CommandCopyOptionalFields,
  },
  {
    slug: 'skill-pack-view-analytics-tests',
    post: skillPackViewAnalyticsTests,
  },
];
