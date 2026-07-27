import type { BlogPost } from './index';

import { post as reviewLocaleDateRenderingTests } from './review-locale-date-rendering-tests';
import { post as directoryFallbackOutagePaginationTests } from './directory-fallback-outage-pagination-tests';
import { post as reviewStarDisabledSemanticsTests } from './review-star-disabled-semantics-tests';
import { post as reviewSuccessFormResetTests } from './review-success-form-reset-tests';
import { post as skillMdDownloadRetryStateTests } from './skill-md-download-retry-state-tests';

export const articleFactory1000Batch045Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'review-locale-date-rendering-tests',
    post: reviewLocaleDateRenderingTests,
  },
  {
    slug: 'directory-fallback-outage-pagination-tests',
    post: directoryFallbackOutagePaginationTests,
  },
  {
    slug: 'review-star-disabled-semantics-tests',
    post: reviewStarDisabledSemanticsTests,
  },
  {
    slug: 'review-success-form-reset-tests',
    post: reviewSuccessFormResetTests,
  },
  {
    slug: 'skill-md-download-retry-state-tests',
    post: skillMdDownloadRetryStateTests,
  },
];
