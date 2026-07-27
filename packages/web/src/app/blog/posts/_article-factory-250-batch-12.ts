import type { BlogPost } from './index';

import { post as clerkProtectedRouteMatrixTests } from './clerk-protected-route-matrix-tests';
import { post as preferenceFetchFailureUiTests } from './preference-fetch-failure-ui-tests';
import { post as preferenceSaveStatusLifecycleTests } from './preference-save-status-lifecycle-tests';
import { post as reactEmailUtmLinkTests } from './react-email-utm-link-tests';
import { post as skillDetailUuidSlugTests } from './skill-detail-uuid-slug-tests';

export const articleFactory250Batch12Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'preference-fetch-failure-ui-tests',
    post: preferenceFetchFailureUiTests,
  },
  {
    slug: 'skill-detail-uuid-slug-tests',
    post: skillDetailUuidSlugTests,
  },
  {
    slug: 'preference-save-status-lifecycle-tests',
    post: preferenceSaveStatusLifecycleTests,
  },
  {
    slug: 'react-email-utm-link-tests',
    post: reactEmailUtmLinkTests,
  },
  {
    slug: 'clerk-protected-route-matrix-tests',
    post: clerkProtectedRouteMatrixTests,
  },
];
