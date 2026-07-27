import type { BlogPost } from './index';

import { post as artilleryPhaseTransitionLoadTesting } from './artillery-phase-transition-load-testing';
import { post as openapiAdditionalpropertiesPolicyTesting } from './openapi-additionalproperties-policy-testing';
import { post as openapiDiscriminatorMappingValidation } from './openapi-discriminator-mapping-validation';
import { post as circuitBreakerHalfOpenTesting } from './circuit-breaker-half-open-testing';
import { post as openapiReadonlyWriteonlyContractTesting } from './openapi-readonly-writeonly-contract-testing';

export const articleFactory1000Batch114Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'artillery-phase-transition-load-testing',
    post: artilleryPhaseTransitionLoadTesting,
  },
  {
    slug: 'openapi-additionalproperties-policy-testing',
    post: openapiAdditionalpropertiesPolicyTesting,
  },
  {
    slug: 'openapi-discriminator-mapping-validation',
    post: openapiDiscriminatorMappingValidation,
  },
  {
    slug: 'circuit-breaker-half-open-testing',
    post: circuitBreakerHalfOpenTesting,
  },
  {
    slug: 'openapi-readonly-writeonly-contract-testing',
    post: openapiReadonlyWriteonlyContractTesting,
  },
];
