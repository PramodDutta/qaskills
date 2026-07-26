import type { BlogPost } from './index';

import { post as skillMdNameCharacterRules } from './skill-md-name-character-rules';
import { post as skillMdNameDirectoryMatching } from './skill-md-name-directory-matching';
import { post as skillMdSpdxLicenseValidation } from './skill-md-spdx-license-validation';
import { post as skillMdTokenRangeInvariants } from './skill-md-token-range-invariants';
import { post as skillMdUnicodeNormalizationCollisions } from './skill-md-unicode-normalization-collisions';

export const articleFactory250Batch20Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-name-directory-matching',
    post: skillMdNameDirectoryMatching,
  },
  {
    slug: 'skill-md-spdx-license-validation',
    post: skillMdSpdxLicenseValidation,
  },
  {
    slug: 'skill-md-unicode-normalization-collisions',
    post: skillMdUnicodeNormalizationCollisions,
  },
  {
    slug: 'skill-md-name-character-rules',
    post: skillMdNameCharacterRules,
  },
  {
    slug: 'skill-md-token-range-invariants',
    post: skillMdTokenRangeInvariants,
  },
];
