import type { BlogPost } from './index';

import { post as seleniumGridTraceIdCorrelation } from './selenium-grid-trace-id-correlation';
import { post as cypressReadfileRetryMutationTesting } from './cypress-readfile-retry-mutation-testing';
import { post as cypressRequestBinaryEncodingIntegrity } from './cypress-request-binary-encoding-integrity';
import { post as cypressRequestNetworkRetryBoundaries } from './cypress-request-network-retry-boundaries';
import { post as cypressRequestRedirectControlTesting } from './cypress-request-redirect-control-testing';

export const articleFactory1000Batch057Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-grid-trace-id-correlation',
    post: seleniumGridTraceIdCorrelation,
  },
  {
    slug: 'cypress-readfile-retry-mutation-testing',
    post: cypressReadfileRetryMutationTesting,
  },
  {
    slug: 'cypress-request-binary-encoding-integrity',
    post: cypressRequestBinaryEncodingIntegrity,
  },
  {
    slug: 'cypress-request-network-retry-boundaries',
    post: cypressRequestNetworkRetryBoundaries,
  },
  {
    slug: 'cypress-request-redirect-control-testing',
    post: cypressRequestRedirectControlTesting,
  },
];
