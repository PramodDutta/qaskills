import type { BlogPost } from './index';

import { post as skillMdCommentPreservationPolicy } from './skill-md-comment-preservation-policy';
import { post as skillMdDescriptionLimitPortability } from './skill-md-description-limit-portability';
import { post as skillMdDocumentationScoreBoundaries } from './skill-md-documentation-score-boundaries';
import { post as skillMdInvalidUtf8Validation } from './skill-md-invalid-utf8-validation';
import { post as skillMdRawSourcePreservation } from './skill-md-raw-source-preservation';

export const articleFactory250Batch24Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-invalid-utf8-validation',
    post: skillMdInvalidUtf8Validation,
  },
  {
    slug: 'skill-md-raw-source-preservation',
    post: skillMdRawSourcePreservation,
  },
  {
    slug: 'skill-md-documentation-score-boundaries',
    post: skillMdDocumentationScoreBoundaries,
  },
  {
    slug: 'skill-md-description-limit-portability',
    post: skillMdDescriptionLimitPortability,
  },
  {
    slug: 'skill-md-comment-preservation-policy',
    post: skillMdCommentPreservationPolicy,
  },
];
