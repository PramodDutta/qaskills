import type { BlogPost } from './index';

import { post as oauthPkceVerifierDowngradeTesting } from './oauth-pkce-verifier-downgrade-testing';
import { post as openapiParameterSerializationTesting } from './openapi-parameter-serialization-testing';
import { post as pdfTaggedHeadingStructureTesting } from './pdf-tagged-heading-structure-testing';
import { post as opentelemetryMetricTemporalityTesting } from './opentelemetry-metric-temporality-testing';
import { post as postgresqlSerializableRetryTesting } from './postgresql-serializable-retry-testing';

export const articleFactory1000Batch117Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'oauth-pkce-verifier-downgrade-testing',
    post: oauthPkceVerifierDowngradeTesting,
  },
  {
    slug: 'openapi-parameter-serialization-testing',
    post: openapiParameterSerializationTesting,
  },
  {
    slug: 'pdf-tagged-heading-structure-testing',
    post: pdfTaggedHeadingStructureTesting,
  },
  {
    slug: 'opentelemetry-metric-temporality-testing',
    post: opentelemetryMetricTemporalityTesting,
  },
  {
    slug: 'postgresql-serializable-retry-testing',
    post: postgresqlSerializableRetryTesting,
  },
];
