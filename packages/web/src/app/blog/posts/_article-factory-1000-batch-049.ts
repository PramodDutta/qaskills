import type { BlogPost } from './index';

import { post as sitemapArticleUpdatedDatePrecedence } from './sitemap-article-updated-date-precedence';
import { post as sitemapCanonicalAliasExclusionTests } from './sitemap-canonical-alias-exclusion-tests';
import { post as sitemapSkillAuthorUrlTests } from './sitemap-skill-author-url-tests';
import { post as sitemapUserProfileUrlTests } from './sitemap-user-profile-url-tests';
import { post as skillDetailCanonicalAuthorTests } from './skill-detail-canonical-author-tests';

export const articleFactory1000Batch049Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'sitemap-article-updated-date-precedence',
    post: sitemapArticleUpdatedDatePrecedence,
  },
  {
    slug: 'sitemap-canonical-alias-exclusion-tests',
    post: sitemapCanonicalAliasExclusionTests,
  },
  {
    slug: 'sitemap-skill-author-url-tests',
    post: sitemapSkillAuthorUrlTests,
  },
  {
    slug: 'sitemap-user-profile-url-tests',
    post: sitemapUserProfileUrlTests,
  },
  {
    slug: 'skill-detail-canonical-author-tests',
    post: skillDetailCanonicalAuthorTests,
  },
];
