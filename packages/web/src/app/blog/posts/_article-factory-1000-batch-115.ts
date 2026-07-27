import type { BlogPost } from './index';

import { post as featureFlagRollbackPropagationTesting } from './feature-flag-rollback-propagation-testing';
import { post as gdprConsentVersionAuditTesting } from './gdpr-consent-version-audit-testing';
import { post as iosRequiredReasonManifestTesting } from './ios-required-reason-manifest-testing';
import { post as jsonSchemaUnevaluatedpropertiesTesting } from './json-schema-unevaluatedproperties-testing';
import { post as openapiWebhookSchemaEvolutionTesting } from './openapi-webhook-schema-evolution-testing';

export const articleFactory1000Batch115Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'feature-flag-rollback-propagation-testing',
    post: featureFlagRollbackPropagationTesting,
  },
  {
    slug: 'gdpr-consent-version-audit-testing',
    post: gdprConsentVersionAuditTesting,
  },
  {
    slug: 'ios-required-reason-manifest-testing',
    post: iosRequiredReasonManifestTesting,
  },
  {
    slug: 'json-schema-unevaluatedproperties-testing',
    post: jsonSchemaUnevaluatedpropertiesTesting,
  },
  {
    slug: 'openapi-webhook-schema-evolution-testing',
    post: openapiWebhookSchemaEvolutionTesting,
  },
];
