import type { BlogPost } from './index';

import { post as skillMdBodyWhitespaceTrimming } from './skill-md-body-whitespace-trimming';
import { post as skillMdCustomYamlTagRejection } from './skill-md-custom-yaml-tag-rejection';
import { post as skillMdDuplicateYamlKeyPolicy } from './skill-md-duplicate-yaml-key-policy';
import { post as skillMdPublishSchemaDrift } from './skill-md-publish-schema-drift';
import { post as skillMdTokenLimitsRoundTrip } from './skill-md-token-limits-round-trip';

export const articleFactory250Batch22Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-md-duplicate-yaml-key-policy',
    post: skillMdDuplicateYamlKeyPolicy,
  },
  {
    slug: 'skill-md-custom-yaml-tag-rejection',
    post: skillMdCustomYamlTagRejection,
  },
  {
    slug: 'skill-md-body-whitespace-trimming',
    post: skillMdBodyWhitespaceTrimming,
  },
  {
    slug: 'skill-md-publish-schema-drift',
    post: skillMdPublishSchemaDrift,
  },
  {
    slug: 'skill-md-token-limits-round-trip',
    post: skillMdTokenLimitsRoundTrip,
  },
];
