import type { BlogPost } from './index';

import { post as qaskillsSdkRuntimeResponseValidation } from './qaskills-sdk-runtime-response-validation';
import { post as qaskillsSdkSkillPathEncoding } from './qaskills-sdk-skill-path-encoding';
import { post as qaskillsSdkTrailingSlashJoining } from './qaskills-sdk-trailing-slash-joining';
import { post as mcpServerInstructionDiscoveryTests } from './mcp-server-instruction-discovery-tests';
import { post as qaskillsSdkUnicodeQueryEncoding } from './qaskills-sdk-unicode-query-encoding';

export const articleFactory1000Batch007Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-sdk-runtime-response-validation',
    post: qaskillsSdkRuntimeResponseValidation,
  },
  {
    slug: 'qaskills-sdk-skill-path-encoding',
    post: qaskillsSdkSkillPathEncoding,
  },
  {
    slug: 'qaskills-sdk-trailing-slash-joining',
    post: qaskillsSdkTrailingSlashJoining,
  },
  {
    slug: 'mcp-server-instruction-discovery-tests',
    post: mcpServerInstructionDiscoveryTests,
  },
  {
    slug: 'qaskills-sdk-unicode-query-encoding',
    post: qaskillsSdkUnicodeQueryEncoding,
  },
];
