import type { BlogPost } from './index';

import { articleFactoryAuthEmailPosts } from './_article-factory-auth-email-batch-2026-07-25';
import { articleFactoryCliBatch20260725Posts } from './_article-factory-cli-batch-2026-07-25';
import { articleFactoryDataArtifactPosts } from './_article-factory-data-artifact-batch-2026-07-25';
import { articleFactoryMarkdownValidatorPosts } from './_article-factory-markdown-validator-batch-2026-07-25';
import { articleFactoryMcpCatalogPosts20260725 } from './_article-factory-mcp-catalog-batch-2026-07-25';

export interface ArticleFactoryPost20260725 {
  slug: string;
  post: BlogPost;
}

export const articleFactoryBatch20260725Posts: ArticleFactoryPost20260725[] = [
  ...articleFactoryCliBatch20260725Posts,
  ...articleFactoryAuthEmailPosts,
  ...articleFactoryDataArtifactPosts,
  ...articleFactoryMarkdownValidatorPosts,
  ...articleFactoryMcpCatalogPosts20260725,
];
