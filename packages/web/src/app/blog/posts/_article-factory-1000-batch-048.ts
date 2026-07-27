import type { BlogPost } from './index';

import { post as robotsDashboardApiExclusionTests } from './robots-dashboard-api-exclusion-tests';
import { post as signupGateAnalyticsEmissionTests } from './signup-gate-analytics-emission-tests';
import { post as signupGateCustomFallbackTests } from './signup-gate-custom-fallback-tests';
import { post as signupGateLoadingSkeletonTests } from './signup-gate-loading-skeleton-tests';
import { post as cloneInvalidSlugTemplateTests } from './clone-invalid-slug-template-tests';

export const articleFactory1000Batch048Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'robots-dashboard-api-exclusion-tests',
    post: robotsDashboardApiExclusionTests,
  },
  {
    slug: 'signup-gate-analytics-emission-tests',
    post: signupGateAnalyticsEmissionTests,
  },
  {
    slug: 'signup-gate-custom-fallback-tests',
    post: signupGateCustomFallbackTests,
  },
  {
    slug: 'signup-gate-loading-skeleton-tests',
    post: signupGateLoadingSkeletonTests,
  },
  {
    slug: 'clone-invalid-slug-template-tests',
    post: cloneInvalidSlugTemplateTests,
  },
];
