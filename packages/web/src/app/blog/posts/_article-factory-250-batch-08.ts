import type { BlogPost } from './index';

import { post as emailMasterToggleDeliveryTests } from './email-master-toggle-delivery-tests';
import { post as concurrentPreferenceBootstrapTests } from './concurrent-preference-bootstrap-tests';
import { post as skillSlugCollisionResponseTests } from './skill-slug-collision-response-tests';
import { post as taxonomyCacheTtlGroupingTests } from './taxonomy-cache-ttl-grouping-tests';
import { post as unsubscribeNetworkFailureUiTests } from './unsubscribe-network-failure-ui-tests';

export const articleFactory250Batch08Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'email-master-toggle-delivery-tests',
    post: emailMasterToggleDeliveryTests,
  },
  {
    slug: 'concurrent-preference-bootstrap-tests',
    post: concurrentPreferenceBootstrapTests,
  },
  {
    slug: 'skill-slug-collision-response-tests',
    post: skillSlugCollisionResponseTests,
  },
  {
    slug: 'taxonomy-cache-ttl-grouping-tests',
    post: taxonomyCacheTtlGroupingTests,
  },
  {
    slug: 'unsubscribe-network-failure-ui-tests',
    post: unsubscribeNetworkFailureUiTests,
  },
];
