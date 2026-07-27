import type { BlogPost } from './index';

import { post as qaskillsSdkHeadersObjectCompatibility } from './qaskills-sdk-headers-object-compatibility';
import { post as qaskillsSdkMalformedSuccessJson } from './qaskills-sdk-malformed-success-json';
import { post as qaskillsSdkNetworkErrorPropagation } from './qaskills-sdk-network-error-propagation';
import { post as qaskillsSdkNoContentResponses } from './qaskills-sdk-no-content-responses';
import { post as qaskillsSdkReviewSubmissionContract } from './qaskills-sdk-review-submission-contract';

export const articleFactory1000Batch006Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-sdk-headers-object-compatibility',
    post: qaskillsSdkHeadersObjectCompatibility,
  },
  {
    slug: 'qaskills-sdk-malformed-success-json',
    post: qaskillsSdkMalformedSuccessJson,
  },
  {
    slug: 'qaskills-sdk-network-error-propagation',
    post: qaskillsSdkNetworkErrorPropagation,
  },
  {
    slug: 'qaskills-sdk-no-content-responses',
    post: qaskillsSdkNoContentResponses,
  },
  {
    slug: 'qaskills-sdk-review-submission-contract',
    post: qaskillsSdkReviewSubmissionContract,
  },
];
