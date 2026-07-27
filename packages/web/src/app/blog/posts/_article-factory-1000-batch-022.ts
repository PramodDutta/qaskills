import type { BlogPost } from './index';

import { post as qaskillsInitDefaultAgentsContract } from './qaskills-init-default-agents-contract';
import { post as qaskillsListNestedSkillExclusion } from './qaskills-list-nested-skill-exclusion';
import { post as qaskillsInstallMethodContractDrift } from './qaskills-install-method-contract-drift';
import { post as qaskillsLongPathInstallTesting } from './qaskills-long-path-install-testing';
import { post as qaskillsK6ProjectDetection } from './qaskills-k6-project-detection';

export const articleFactory1000Batch022Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-init-default-agents-contract',
    post: qaskillsInitDefaultAgentsContract,
  },
  {
    slug: 'qaskills-list-nested-skill-exclusion',
    post: qaskillsListNestedSkillExclusion,
  },
  {
    slug: 'qaskills-install-method-contract-drift',
    post: qaskillsInstallMethodContractDrift,
  },
  {
    slug: 'qaskills-long-path-install-testing',
    post: qaskillsLongPathInstallTesting,
  },
  {
    slug: 'qaskills-k6-project-detection',
    post: qaskillsK6ProjectDetection,
  },
];
