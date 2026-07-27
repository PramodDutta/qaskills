import type { BlogPost } from './index';

import { post as cloneAuthorAttributionTests } from './clone-author-attribution-tests';
import { post as cloneForkSuffixIdempotencyTests } from './clone-fork-suffix-idempotency-tests';
import { post as cloneRouteParameterEncodingTests } from './clone-route-parameter-encoding-tests';
import { post as cloneSignedOutModalTests } from './clone-signed-out-modal-tests';
import { post as topicHubSitemapEnumerationTests } from './topic-hub-sitemap-enumeration-tests';

export const articleFactory1000Batch029Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'clone-author-attribution-tests',
    post: cloneAuthorAttributionTests,
  },
  {
    slug: 'clone-fork-suffix-idempotency-tests',
    post: cloneForkSuffixIdempotencyTests,
  },
  {
    slug: 'clone-route-parameter-encoding-tests',
    post: cloneRouteParameterEncodingTests,
  },
  {
    slug: 'clone-signed-out-modal-tests',
    post: cloneSignedOutModalTests,
  },
  {
    slug: 'topic-hub-sitemap-enumeration-tests',
    post: topicHubSitemapEnumerationTests,
  },
];
