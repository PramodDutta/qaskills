import type { BlogPost } from './index';

import { post as pdfFormFieldAccessibilityTesting } from './pdf-form-field-accessibility-testing';
import { post as poisonMessageQuarantineTesting } from './poison-message-quarantine-testing';
import { post as protobufUnknownFieldPreservationTesting } from './protobuf-unknown-field-preservation-testing';
import { post as apiPropertyAuthorizationTesting } from './api-property-authorization-testing';
import { post as artilleryArrivalRateOverloadTesting } from './artillery-arrival-rate-overload-testing';

export const articleFactory1000Batch120Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'pdf-form-field-accessibility-testing',
    post: pdfFormFieldAccessibilityTesting,
  },
  {
    slug: 'poison-message-quarantine-testing',
    post: poisonMessageQuarantineTesting,
  },
  {
    slug: 'protobuf-unknown-field-preservation-testing',
    post: protobufUnknownFieldPreservationTesting,
  },
  {
    slug: 'api-property-authorization-testing',
    post: apiPropertyAuthorizationTesting,
  },
  {
    slug: 'artillery-arrival-rate-overload-testing',
    post: artilleryArrivalRateOverloadTesting,
  },
];
