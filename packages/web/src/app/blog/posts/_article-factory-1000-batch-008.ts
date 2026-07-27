import type { BlogPost } from './index';

import { post as qaskillsSdkWorkspaceDependencyPackaging } from './qaskills-sdk-workspace-dependency-packaging';
import { post as qaskillsSearchLimitValidation } from './qaskills-search-limit-validation';
import { post as qaskillsSearchPromptCancellation } from './qaskills-search-prompt-cancellation';
import { post as qaskillsSkillsPathOverlapDetection } from './qaskills-skills-path-overlap-detection';
import { post as qaskillsAddCancellationExitSemantics } from './qaskills-add-cancellation-exit-semantics';

export const articleFactory1000Batch008Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-sdk-workspace-dependency-packaging',
    post: qaskillsSdkWorkspaceDependencyPackaging,
  },
  {
    slug: 'qaskills-search-limit-validation',
    post: qaskillsSearchLimitValidation,
  },
  {
    slug: 'qaskills-search-prompt-cancellation',
    post: qaskillsSearchPromptCancellation,
  },
  {
    slug: 'qaskills-skills-path-overlap-detection',
    post: qaskillsSkillsPathOverlapDetection,
  },
  {
    slug: 'qaskills-add-cancellation-exit-semantics',
    post: qaskillsAddCancellationExitSemantics,
  },
];
