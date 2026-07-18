import type { BlogPost } from './index';

import { articleFactoryReleasePolicyPosts } from './_article-factory-release-policy-batch-2026-07';
import { articleFactoryReleaseRiskPosts } from './_article-factory-release-risk-batch-2026-07';
import { articleFactorySchemaBoundariesPosts } from './_article-factory-schema-boundaries-batch-2026-07';
import { articleFactorySecureDataPosts } from './_article-factory-secure-data-batch-2026-07';
import { articleFactoryTrustSchemaPosts } from './_article-factory-trust-schema-batch-2026-07';

export interface ArticleFactoryPost {
  slug: string;
  post: BlogPost;
}

export const articleFactoryBatch20260718Posts: ArticleFactoryPost[] = [
  ...articleFactoryReleaseRiskPosts,
  ...articleFactoryReleasePolicyPosts,
  ...articleFactoryTrustSchemaPosts,
  ...articleFactorySchemaBoundariesPosts,
  ...articleFactorySecureDataPosts,
];
