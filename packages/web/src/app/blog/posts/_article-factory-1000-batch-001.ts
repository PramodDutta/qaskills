import type { BlogPost } from './index';

import { post as qaskillsPasswithnotestsReleaseRisk } from './qaskills-passwithnotests-release-risk';
import { post as qaskillsPermissionDeniedAgentDetection } from './qaskills-permission-denied-agent-detection';
import { post as mcpIdempotentReinstallBehaviorTesting } from './mcp-idempotent-reinstall-behavior-testing';
import { post as mcpInstallPathTraversalTesting } from './mcp-install-path-traversal-testing';
import { post as qaskillsProjectCwdPathIsolation } from './qaskills-project-cwd-path-isolation';

export const articleFactory1000Batch001Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-passwithnotests-release-risk',
    post: qaskillsPasswithnotestsReleaseRisk,
  },
  {
    slug: 'qaskills-permission-denied-agent-detection',
    post: qaskillsPermissionDeniedAgentDetection,
  },
  {
    slug: 'mcp-idempotent-reinstall-behavior-testing',
    post: mcpIdempotentReinstallBehaviorTesting,
  },
  {
    slug: 'mcp-install-path-traversal-testing',
    post: mcpInstallPathTraversalTesting,
  },
  {
    slug: 'qaskills-project-cwd-path-isolation',
    post: qaskillsProjectCwdPathIsolation,
  },
];
