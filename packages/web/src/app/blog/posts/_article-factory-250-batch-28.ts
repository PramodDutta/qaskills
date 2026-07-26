import type { BlogPost } from './index';

import { post as mcpNodeEngineCompatibilityTesting } from './mcp-node-engine-compatibility-testing';
import { post as mcpNpmPublishIdempotencyTesting } from './mcp-npm-publish-idempotency-testing';
import { post as mcpStdioStdoutContaminationTesting } from './mcp-stdio-stdout-contamination-testing';
import { post as mcpSubprocessLaunchSmokeTesting } from './mcp-subprocess-launch-smoke-testing';
import { post as mcpWorkspaceDependencyIsolationTesting } from './mcp-workspace-dependency-isolation-testing';

export const articleFactory250Batch28Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-subprocess-launch-smoke-testing',
    post: mcpSubprocessLaunchSmokeTesting,
  },
  {
    slug: 'mcp-node-engine-compatibility-testing',
    post: mcpNodeEngineCompatibilityTesting,
  },
  {
    slug: 'mcp-stdio-stdout-contamination-testing',
    post: mcpStdioStdoutContaminationTesting,
  },
  {
    slug: 'mcp-workspace-dependency-isolation-testing',
    post: mcpWorkspaceDependencyIsolationTesting,
  },
  {
    slug: 'mcp-npm-publish-idempotency-testing',
    post: mcpNpmPublishIdempotencyTesting,
  },
];
