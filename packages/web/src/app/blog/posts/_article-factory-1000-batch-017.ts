import type { BlogPost } from './index';

import { post as mcpUtf8SkillInstallationTests } from './mcp-utf8-skill-installation-tests';
import { post as qaskillsAgentConfigFileDetection } from './qaskills-agent-config-file-detection';
import { post as qaskillsEqualDepthSkillSelection } from './qaskills-equal-depth-skill-selection';
import { post as qaskillsEmptySearchResultBehavior } from './qaskills-empty-search-result-behavior';
import { post as qaskillsExecutableBitCopyTesting } from './qaskills-executable-bit-copy-testing';

export const articleFactory1000Batch017Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-utf8-skill-installation-tests',
    post: mcpUtf8SkillInstallationTests,
  },
  {
    slug: 'qaskills-agent-config-file-detection',
    post: qaskillsAgentConfigFileDetection,
  },
  {
    slug: 'qaskills-equal-depth-skill-selection',
    post: qaskillsEqualDepthSkillSelection,
  },
  {
    slug: 'qaskills-empty-search-result-behavior',
    post: qaskillsEmptySearchResultBehavior,
  },
  {
    slug: 'qaskills-executable-bit-copy-testing',
    post: qaskillsExecutableBitCopyTesting,
  },
];
