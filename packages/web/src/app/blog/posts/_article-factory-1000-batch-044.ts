import type { BlogPost } from './index';

import { post as reviewFormCancelCleanupTests } from './review-form-cancel-cleanup-tests';
import { post as reviewFetchErrorMessageTests } from './review-fetch-error-message-tests';
import { post as reviewImageAlternativeTextTests } from './review-image-alternative-text-tests';
import { post as reviewInitialsAvatarGenerationTests } from './review-initials-avatar-generation-tests';
import { post as reviewLoadingEmptyStateTests } from './review-loading-empty-state-tests';

export const articleFactory1000Batch044Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'review-form-cancel-cleanup-tests',
    post: reviewFormCancelCleanupTests,
  },
  {
    slug: 'review-fetch-error-message-tests',
    post: reviewFetchErrorMessageTests,
  },
  {
    slug: 'review-image-alternative-text-tests',
    post: reviewImageAlternativeTextTests,
  },
  {
    slug: 'review-initials-avatar-generation-tests',
    post: reviewInitialsAvatarGenerationTests,
  },
  {
    slug: 'review-loading-empty-state-tests',
    post: reviewLoadingEmptyStateTests,
  },
];
