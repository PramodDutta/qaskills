import type { BlogPost } from './index';

import { post as reactEmailUserContentEscaping } from './react-email-user-content-escaping';
import { post as skillPackEmptyCatalogState } from './skill-pack-empty-catalog-state';
import { post as cloneFetchOutageFallbackTests } from './clone-fetch-outage-fallback-tests';
import { post as relatedArticleCategoryWeightTests } from './related-article-category-weight-tests';
import { post as relatedArticleCurrentPostExclusionTests } from './related-article-current-post-exclusion-tests';

export const articleFactory1000Batch042Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'react-email-user-content-escaping',
    post: reactEmailUserContentEscaping,
  },
  {
    slug: 'skill-pack-empty-catalog-state',
    post: skillPackEmptyCatalogState,
  },
  {
    slug: 'clone-fetch-outage-fallback-tests',
    post: cloneFetchOutageFallbackTests,
  },
  {
    slug: 'related-article-category-weight-tests',
    post: relatedArticleCategoryWeightTests,
  },
  {
    slug: 'related-article-current-post-exclusion-tests',
    post: relatedArticleCurrentPostExclusionTests,
  },
];
