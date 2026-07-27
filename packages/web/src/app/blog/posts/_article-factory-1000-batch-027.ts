import type { BlogPost } from './index';

import { post as articleListPaginationSocialImageTests } from './article-list-pagination-social-image-tests';
import { post as dynamicHubNotfoundTesting } from './dynamic-hub-notfound-testing';
import { post as utf8PreservationInsideSkillArchives } from './utf-8-preservation-inside-skill-archives';
import { post as clerkWrapperMissingKeyTests } from './clerk-wrapper-missing-key-tests';
import { post as articleListInvalidPageFallbackTests } from './article-list-invalid-page-fallback-tests';

export const articleFactory1000Batch027Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'article-list-pagination-social-image-tests',
    post: articleListPaginationSocialImageTests,
  },
  {
    slug: 'dynamic-hub-notfound-testing',
    post: dynamicHubNotfoundTesting,
  },
  {
    slug: 'utf-8-preservation-inside-skill-archives',
    post: utf8PreservationInsideSkillArchives,
  },
  {
    slug: 'clerk-wrapper-missing-key-tests',
    post: clerkWrapperMissingKeyTests,
  },
  {
    slug: 'article-list-invalid-page-fallback-tests',
    post: articleListInvalidPageFallbackTests,
  },
];
