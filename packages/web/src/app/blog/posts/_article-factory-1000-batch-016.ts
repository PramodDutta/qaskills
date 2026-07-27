import type { BlogPost } from './index';

import { post as qaskillsPytestProjectDetection } from './qaskills-pytest-project-detection';
import { post as qaskillsTypescriptDeclarationPublishing } from './qaskills-typescript-declaration-publishing';
import { post as mcpApiTrailingSlashNormalization } from './mcp-api-trailing-slash-normalization';
import { post as mcpConditionalContentTypeTesting } from './mcp-conditional-content-type-testing';
import { post as mcpUnknownToolRejectionTesting } from './mcp-unknown-tool-rejection-testing';

export const articleFactory1000Batch016Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-pytest-project-detection',
    post: qaskillsPytestProjectDetection,
  },
  {
    slug: 'qaskills-typescript-declaration-publishing',
    post: qaskillsTypescriptDeclarationPublishing,
  },
  {
    slug: 'mcp-api-trailing-slash-normalization',
    post: mcpApiTrailingSlashNormalization,
  },
  {
    slug: 'mcp-conditional-content-type-testing',
    post: mcpConditionalContentTypeTesting,
  },
  {
    slug: 'mcp-unknown-tool-rejection-testing',
    post: mcpUnknownToolRejectionTesting,
  },
];
