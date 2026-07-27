import type { BlogPost } from './index';

import { post as qaskillsFullGithubUrlClassification } from './qaskills-full-github-url-classification';
import { post as mcpStdioUtf8InteroperabilityTests } from './mcp-stdio-utf8-interoperability-tests';
import { post as qaskillsGlobalConfigFileFallback } from './qaskills-global-config-file-fallback';
import { post as qaskillsHiddenFileCopyTesting } from './qaskills-hidden-file-copy-testing';
import { post as qaskillsHomeExpansionEdgeCases } from './qaskills-home-expansion-edge-cases';

export const articleFactory1000Batch019Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-full-github-url-classification',
    post: qaskillsFullGithubUrlClassification,
  },
  {
    slug: 'mcp-stdio-utf8-interoperability-tests',
    post: mcpStdioUtf8InteroperabilityTests,
  },
  {
    slug: 'qaskills-global-config-file-fallback',
    post: qaskillsGlobalConfigFileFallback,
  },
  {
    slug: 'qaskills-hidden-file-copy-testing',
    post: qaskillsHiddenFileCopyTesting,
  },
  {
    slug: 'qaskills-home-expansion-edge-cases',
    post: qaskillsHomeExpansionEdgeCases,
  },
];
