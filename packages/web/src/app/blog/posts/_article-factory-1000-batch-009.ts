import type { BlogPost } from './index';

import { post as qaskillsAddFailureExitCode } from './qaskills-add-failure-exit-code';
import { post as qaskillsAddSpinnerLifecycleTesting } from './qaskills-add-spinner-lifecycle-testing';
import { post as qaskillsSkillsummaryFieldParity } from './qaskills-skillsummary-field-parity';
import { post as qaskillsAgentRegistryChangeDetection } from './qaskills-agent-registry-change-detection';
import { post as qaskillsSlashSlugSourceAmbiguity } from './qaskills-slash-slug-source-ambiguity';

export const articleFactory1000Batch009Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-add-failure-exit-code',
    post: qaskillsAddFailureExitCode,
  },
  {
    slug: 'qaskills-add-spinner-lifecycle-testing',
    post: qaskillsAddSpinnerLifecycleTesting,
  },
  {
    slug: 'qaskills-skillsummary-field-parity',
    post: qaskillsSkillsummaryFieldParity,
  },
  {
    slug: 'qaskills-agent-registry-change-detection',
    post: qaskillsAgentRegistryChangeDetection,
  },
  {
    slug: 'qaskills-slash-slug-source-ambiguity',
    post: qaskillsSlashSlugSourceAmbiguity,
  },
];
