import type { BlogPost } from './index';

import { post as directoryFeaturedBadgeRenderingTests } from './directory-featured-badge-rendering-tests';
import { post as directoryFilterPageResetTests } from './directory-filter-page-reset-tests';
import { post as directoryHubEmptyCatalogCta } from './directory-hub-empty-catalog-cta';
import { post as directoryHubSlugRegistryTests } from './directory-hub-slug-registry-tests';
import { post as directoryPaginationFilterPreservationTests } from './directory-pagination-filter-preservation-tests';

export const articleFactory1000Batch032Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'directory-featured-badge-rendering-tests',
    post: directoryFeaturedBadgeRenderingTests,
  },
  {
    slug: 'directory-filter-page-reset-tests',
    post: directoryFilterPageResetTests,
  },
  {
    slug: 'directory-hub-empty-catalog-cta',
    post: directoryHubEmptyCatalogCta,
  },
  {
    slug: 'directory-hub-slug-registry-tests',
    post: directoryHubSlugRegistryTests,
  },
  {
    slug: 'directory-pagination-filter-preservation-tests',
    post: directoryPaginationFilterPreservationTests,
  },
];
