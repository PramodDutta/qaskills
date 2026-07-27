import type { BlogPost } from './index';

import { post as preferencePatchUpsertApiTests } from './preference-patch-upsert-api-tests';
import { post as reviewApiValidationMatrixTests } from './review-api-validation-matrix-tests';
import { post as skillListDatabaseFailureTests } from './skill-list-database-failure-tests';
import { post as skillPublishValidationResponseTests } from './skill-publish-validation-response-tests';
import { post as weeklyDigestGetPostParity } from './weekly-digest-get-post-parity';

export const articleFactory250Batch09Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-publish-validation-response-tests',
    post: skillPublishValidationResponseTests,
  },
  {
    slug: 'review-api-validation-matrix-tests',
    post: reviewApiValidationMatrixTests,
  },
  {
    slug: 'preference-patch-upsert-api-tests',
    post: preferencePatchUpsertApiTests,
  },
  {
    slug: 'weekly-digest-get-post-parity',
    post: weeklyDigestGetPostParity,
  },
  {
    slug: 'skill-list-database-failure-tests',
    post: skillListDatabaseFailureTests,
  },
];
