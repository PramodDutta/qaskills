import type { BlogPost } from './index';

import { post as mcpClaudeCursorParityTesting } from './mcp-claude-cursor-parity-testing';
import { post as mcpColdNpxStartupTesting } from './mcp-cold-npx-startup-testing';
import { post as mcpNpmFilesAllowlistTesting } from './mcp-npm-files-allowlist-testing';
import { post as mcpRegistryOidcPublishingTests } from './mcp-registry-oidc-publishing-tests';
import { post as mcpRegistryPackageIdentityTesting } from './mcp-registry-package-identity-testing';

export const articleFactory250Batch27Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-registry-package-identity-testing',
    post: mcpRegistryPackageIdentityTesting,
  },
  {
    slug: 'mcp-npm-files-allowlist-testing',
    post: mcpNpmFilesAllowlistTesting,
  },
  {
    slug: 'mcp-cold-npx-startup-testing',
    post: mcpColdNpxStartupTesting,
  },
  {
    slug: 'mcp-registry-oidc-publishing-tests',
    post: mcpRegistryOidcPublishingTests,
  },
  {
    slug: 'mcp-claude-cursor-parity-testing',
    post: mcpClaudeCursorParityTesting,
  },
];
