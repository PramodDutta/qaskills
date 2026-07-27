import type { BlogPost } from './index';

import { post as directoryRepeatedFacetParameterTests } from './directory-repeated-facet-parameter-tests';
import { post as directorySearchFormFilterPersistence } from './directory-search-form-filter-persistence';
import { post as directorySortQueryPreservationTests } from './directory-sort-query-preservation-tests';
import { post as downloadObjectUrlCleanupTests } from './download-object-url-cleanup-tests';
import { post as duplicateReviewSubmissionCopyTests } from './duplicate-review-submission-copy-tests';

export const articleFactory1000Batch033Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'directory-repeated-facet-parameter-tests',
    post: directoryRepeatedFacetParameterTests,
  },
  {
    slug: 'directory-search-form-filter-persistence',
    post: directorySearchFormFilterPersistence,
  },
  {
    slug: 'directory-sort-query-preservation-tests',
    post: directorySortQueryPreservationTests,
  },
  {
    slug: 'download-object-url-cleanup-tests',
    post: downloadObjectUrlCleanupTests,
  },
  {
    slug: 'duplicate-review-submission-copy-tests',
    post: duplicateReviewSubmissionCopyTests,
  },
];
