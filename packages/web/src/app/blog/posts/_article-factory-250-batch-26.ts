import type { BlogPost } from './index';

import { post as mcpInstallTelemetryPayloadTesting } from './mcp-install-telemetry-payload-testing';
import { post as mcpLeaderboardTruncationContractTesting } from './mcp-leaderboard-truncation-contract-testing';
import { post as mcpMalformedJsonRpcMessageTesting } from './mcp-malformed-json-rpc-message-testing';
import { post as mcpPartialInstallFailureTesting } from './mcp-partial-install-failure-testing';
import { post as mcpServerManifestSchemaTesting } from './mcp-server-manifest-schema-testing';

export const articleFactory250Batch26Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-malformed-json-rpc-message-testing',
    post: mcpMalformedJsonRpcMessageTesting,
  },
  {
    slug: 'mcp-partial-install-failure-testing',
    post: mcpPartialInstallFailureTesting,
  },
  {
    slug: 'mcp-install-telemetry-payload-testing',
    post: mcpInstallTelemetryPayloadTesting,
  },
  {
    slug: 'mcp-leaderboard-truncation-contract-testing',
    post: mcpLeaderboardTruncationContractTesting,
  },
  {
    slug: 'mcp-server-manifest-schema-testing',
    post: mcpServerManifestSchemaTesting,
  },
];
