import type { BlogPost } from './index';

import { post as skillMdEditorEmptyStateTests } from './skill-md-editor-empty-state-tests';
import { post as comparisonSitemapDynamicEntryTests } from './comparison-sitemap-dynamic-entry-tests';
import { post as comparisonStaticSlugGenerationTests } from './comparison-static-slug-generation-tests';
import { post as skillPublishSuccessRouteTests } from './skill-publish-success-route-tests';
import { post as typesenseClientSingletonReuseTests } from './typesense-client-singleton-reuse-tests';

export const articleFactory1000Batch030Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-editor-empty-state-tests',
    post: skillMdEditorEmptyStateTests,
  },
  {
    slug: 'comparison-sitemap-dynamic-entry-tests',
    post: comparisonSitemapDynamicEntryTests,
  },
  {
    slug: 'comparison-static-slug-generation-tests',
    post: comparisonStaticSlugGenerationTests,
  },
  {
    slug: 'skill-publish-success-route-tests',
    post: skillPublishSuccessRouteTests,
  },
  {
    slug: 'typesense-client-singleton-reuse-tests',
    post: typesenseClientSingletonReuseTests,
  },
];
