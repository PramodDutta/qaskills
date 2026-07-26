import type { BlogPost } from './index';

import { post as clerkUserUpdatedWebhookTests } from './clerk-user-updated-webhook-tests';
import { post as installTelemetryCompatibilityTests } from './install-telemetry-compatibility-tests';
import { post as newSkillEmailRouteTests } from './new-skill-email-route-tests';
import { post as preferenceApiAuthStatusTests } from './preference-api-auth-status-tests';
import { post as upstashCacheConfigurationFallbackTests } from './upstash-cache-configuration-fallback-tests';

export const articleFactory250Batch07Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'install-telemetry-compatibility-tests',
    post: installTelemetryCompatibilityTests,
  },
  {
    slug: 'upstash-cache-configuration-fallback-tests',
    post: upstashCacheConfigurationFallbackTests,
  },
  {
    slug: 'clerk-user-updated-webhook-tests',
    post: clerkUserUpdatedWebhookTests,
  },
  {
    slug: 'new-skill-email-route-tests',
    post: newSkillEmailRouteTests,
  },
  {
    slug: 'preference-api-auth-status-tests',
    post: preferenceApiAuthStatusTests,
  },
];
