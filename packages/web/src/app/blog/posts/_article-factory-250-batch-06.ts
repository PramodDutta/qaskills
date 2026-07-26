import type { BlogPost } from './index';

import { post as qaskillsCliBundledSharedDependency } from './qaskills-cli-bundled-shared-dependency';
import { post as qaskillsCliRequestHeaderTests } from './qaskills-cli-request-header-tests';
import { post as qaskillsRemoveMissingSkillSafely } from './qaskills-remove-missing-skill-safely';
import { post as qaskillsSdkCreateRequestContract } from './qaskills-sdk-create-request-contract';
import { post as qaskillsUniversalSkillsDirectory } from './qaskills-universal-skills-directory';

interface ArticleFactory250BatchPost {
  slug: string;
  post: BlogPost;
}

export const articleFactory250Batch06Posts: ArticleFactory250BatchPost[] = [
  {
    slug: 'qaskills-cli-bundled-shared-dependency',
    post: qaskillsCliBundledSharedDependency,
  },
  {
    slug: 'qaskills-sdk-create-request-contract',
    post: qaskillsSdkCreateRequestContract,
  },
  {
    slug: 'qaskills-universal-skills-directory',
    post: qaskillsUniversalSkillsDirectory,
  },
  {
    slug: 'qaskills-cli-request-header-tests',
    post: qaskillsCliRequestHeaderTests,
  },
  {
    slug: 'qaskills-remove-missing-skill-safely',
    post: qaskillsRemoveMissingSkillSafely,
  },
];
