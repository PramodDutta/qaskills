import type { BlogPost } from './index';

import { post as skillDetailNullableFieldSerialization } from './skill-detail-nullable-field-serialization';
import { post as skillDetailSocialParameterEncoding } from './skill-detail-social-parameter-encoding';
import { post as skillJsonbEmptyDefaultTests } from './skill-jsonb-empty-default-tests';
import { post as reviewAuthenticationAuthorityTesting } from './review-authentication-authority-testing';
import { post as skillMarkdownGfmRenderingTests } from './skill-markdown-gfm-rendering-tests';

export const articleFactory1000Batch050Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-detail-nullable-field-serialization',
    post: skillDetailNullableFieldSerialization,
  },
  {
    slug: 'skill-detail-social-parameter-encoding',
    post: skillDetailSocialParameterEncoding,
  },
  {
    slug: 'skill-jsonb-empty-default-tests',
    post: skillJsonbEmptyDefaultTests,
  },
  {
    slug: 'review-authentication-authority-testing',
    post: reviewAuthenticationAuthorityTesting,
  },
  {
    slug: 'skill-markdown-gfm-rendering-tests',
    post: skillMarkdownGfmRenderingTests,
  },
];
