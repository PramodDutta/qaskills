import type { BlogPost } from './index';

import { post as agentCompatibilityCascadeTests } from './agent-compatibility-cascade-tests';
import { post as agentVersionDefaultValueTests } from './agent-version-default-value-tests';
import { post as articleListAliasRedirectRegistryTests } from './article-list-alias-redirect-registry-tests';
import { post as articleListNumericPaginationWindowTests } from './article-list-numeric-pagination-window-tests';
import { post as articleListPaginationCanonicalUrlTests } from './article-list-pagination-canonical-url-tests';

export const articleFactory1000Batch026Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'agent-compatibility-cascade-tests',
    post: agentCompatibilityCascadeTests,
  },
  {
    slug: 'agent-version-default-value-tests',
    post: agentVersionDefaultValueTests,
  },
  {
    slug: 'article-list-alias-redirect-registry-tests',
    post: articleListAliasRedirectRegistryTests,
  },
  {
    slug: 'article-list-numeric-pagination-window-tests',
    post: articleListNumericPaginationWindowTests,
  },
  {
    slug: 'article-list-pagination-canonical-url-tests',
    post: articleListPaginationCanonicalUrlTests,
  },
];
