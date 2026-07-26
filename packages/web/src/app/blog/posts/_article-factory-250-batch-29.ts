import type { BlogPost } from './index';

import { post as mcpClientEnvironmentPropagationTesting } from './mcp-client-environment-propagation-testing';
import { post as mcpClientWorkingDirectoryIsolation } from './mcp-client-working-directory-isolation';
import { post as mcpSearchFallbackBehaviorTesting } from './mcp-search-fallback-behavior-testing';
import { post as mcpSkillMetadataRedactionTesting } from './mcp-skill-metadata-redaction-testing';
import { post as mcpSkillSlugEncodingTests } from './mcp-skill-slug-encoding-tests';

export const articleFactory250Batch29Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-client-working-directory-isolation',
    post: mcpClientWorkingDirectoryIsolation,
  },
  {
    slug: 'mcp-client-environment-propagation-testing',
    post: mcpClientEnvironmentPropagationTesting,
  },
  {
    slug: 'mcp-search-fallback-behavior-testing',
    post: mcpSearchFallbackBehaviorTesting,
  },
  {
    slug: 'mcp-skill-slug-encoding-tests',
    post: mcpSkillSlugEncodingTests,
  },
  {
    slug: 'mcp-skill-metadata-redaction-testing',
    post: mcpSkillMetadataRedactionTesting,
  },
];
