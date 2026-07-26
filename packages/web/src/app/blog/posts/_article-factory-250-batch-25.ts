import type { BlogPost } from './index';

import { post as mcpHttpErrorDetailTesting } from './mcp-http-error-detail-testing';
import { post as mcpMalformedJsonResponseTesting } from './mcp-malformed-json-response-testing';
import { post as mcpSkillContentFidelityTesting } from './mcp-skill-content-fidelity-testing';
import { post as mcpTelemetryPrivacyControlTesting } from './mcp-telemetry-privacy-control-testing';
import { post as mcpToolAnnotationTruthfulnessTests } from './mcp-tool-annotation-truthfulness-tests';

export const articleFactory250Batch25Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-tool-annotation-truthfulness-tests',
    post: mcpToolAnnotationTruthfulnessTests,
  },
  {
    slug: 'mcp-telemetry-privacy-control-testing',
    post: mcpTelemetryPrivacyControlTesting,
  },
  {
    slug: 'mcp-http-error-detail-testing',
    post: mcpHttpErrorDetailTesting,
  },
  {
    slug: 'mcp-skill-content-fidelity-testing',
    post: mcpSkillContentFidelityTesting,
  },
  {
    slug: 'mcp-malformed-json-response-testing',
    post: mcpMalformedJsonResponseTesting,
  },
];
