import type { BlogPost } from './index';

import { post as mcpCapabilityNegotiationContractTests } from './mcp-capability-negotiation-contract-tests';
import { post as mcpInitializationOrderingContractTests } from './mcp-initialization-ordering-contract-tests';
import { post as mcpInstallDirectoryPrecedenceTests } from './mcp-install-directory-precedence-tests';
import { post as mcpMissingSkillErrorMapping } from './mcp-missing-skill-error-mapping';
import { post as mcpProtocolVersionNegotiationTests } from './mcp-protocol-version-negotiation-tests';

export const articleFactory250Batch30Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-missing-skill-error-mapping',
    post: mcpMissingSkillErrorMapping,
  },
  {
    slug: 'mcp-install-directory-precedence-tests',
    post: mcpInstallDirectoryPrecedenceTests,
  },
  {
    slug: 'mcp-initialization-ordering-contract-tests',
    post: mcpInitializationOrderingContractTests,
  },
  {
    slug: 'mcp-protocol-version-negotiation-tests',
    post: mcpProtocolVersionNegotiationTests,
  },
  {
    slug: 'mcp-capability-negotiation-contract-tests',
    post: mcpCapabilityNegotiationContractTests,
  },
];
