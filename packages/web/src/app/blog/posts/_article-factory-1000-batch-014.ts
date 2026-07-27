import type { BlogPost } from './index';

import { post as qaskillsConfigPathTypeValidation } from './qaskills-config-path-type-validation';
import { post as mcpLargeSkillContentHandling } from './mcp-large-skill-content-handling';
import { post as mcpStdioGracefulShutdownTesting } from './mcp-stdio-graceful-shutdown-testing';
import { post as mcpStdioNewlineFramingTests } from './mcp-stdio-newline-framing-tests';
import { post as qaskillsCrossCommandEventSequencing } from './qaskills-cross-command-event-sequencing';

export const articleFactory1000Batch014Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-config-path-type-validation',
    post: qaskillsConfigPathTypeValidation,
  },
  {
    slug: 'mcp-large-skill-content-handling',
    post: mcpLargeSkillContentHandling,
  },
  {
    slug: 'mcp-stdio-graceful-shutdown-testing',
    post: mcpStdioGracefulShutdownTesting,
  },
  {
    slug: 'mcp-stdio-newline-framing-tests',
    post: mcpStdioNewlineFramingTests,
  },
  {
    slug: 'qaskills-cross-command-event-sequencing',
    post: qaskillsCrossCommandEventSequencing,
  },
];
