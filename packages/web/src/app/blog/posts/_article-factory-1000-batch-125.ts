import type { BlogPost } from './index';

import { post as graphqlSchemaDeprecationUsageTesting } from './graphql-schema-deprecation-usage-testing';
import { post as grpcMetadataPropagationTesting } from './grpc-metadata-propagation-testing';
import { post as tlsSessionResumptionPolicyTesting } from './tls-session-resumption-policy-testing';
import { post as grpcServerReflectionAccessTesting } from './grpc-server-reflection-access-testing';
import { post as hipaaMinimumNecessaryAccessTesting } from './hipaa-minimum-necessary-access-testing';

export const articleFactory1000Batch125Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'graphql-schema-deprecation-usage-testing',
    post: graphqlSchemaDeprecationUsageTesting,
  },
  {
    slug: 'grpc-metadata-propagation-testing',
    post: grpcMetadataPropagationTesting,
  },
  {
    slug: 'tls-session-resumption-policy-testing',
    post: tlsSessionResumptionPolicyTesting,
  },
  {
    slug: 'grpc-server-reflection-access-testing',
    post: grpcServerReflectionAccessTesting,
  },
  {
    slug: 'hipaa-minimum-necessary-access-testing',
    post: hipaaMinimumNecessaryAccessTesting,
  },
];
