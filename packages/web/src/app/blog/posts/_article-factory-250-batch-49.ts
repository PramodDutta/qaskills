import type { BlogPost } from './index';

import { post as performanceObserverBufferOverflowTesting } from './performanceobserver-buffer-overflow-testing';
import { post as postmanSetNextRequestLoopGuardTesting } from './postman-setnextrequest-loop-guard-testing';
import { post as redirectChainSecurityHeaderTesting } from './redirect-chain-security-header-testing';
import { post as resourceTimingCacheAttributionTesting } from './resource-timing-cache-attribution-testing';
import { post as restAssuredMultipartBoundaryTesting } from './rest-assured-multipart-boundary-testing';

export const articleFactory250Batch49Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'performanceobserver-buffer-overflow-testing',
    post: performanceObserverBufferOverflowTesting,
  },
  {
    slug: 'postman-setnextrequest-loop-guard-testing',
    post: postmanSetNextRequestLoopGuardTesting,
  },
  {
    slug: 'redirect-chain-security-header-testing',
    post: redirectChainSecurityHeaderTesting,
  },
  {
    slug: 'resource-timing-cache-attribution-testing',
    post: resourceTimingCacheAttributionTesting,
  },
  {
    slug: 'rest-assured-multipart-boundary-testing',
    post: restAssuredMultipartBoundaryTesting,
  },
];
