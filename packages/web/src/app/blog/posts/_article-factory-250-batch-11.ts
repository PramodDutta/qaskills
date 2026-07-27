import type { BlogPost } from './index';

import { post as accessibleEmailPreferenceSwitchTests } from './accessible-email-preference-switch-tests';
import { post as emailFooterPreferenceRouteTests } from './email-footer-preference-route-tests';
import { post as emailPreferencePayloadValidationTests } from './email-preference-payload-validation-tests';
import { post as nextjsStaticAssetMatcherTests } from './nextjs-static-asset-matcher-tests';
import { post as weeklyDigestRankingQueryTests } from './weekly-digest-ranking-query-tests';

export const articleFactory250Batch11Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'accessible-email-preference-switch-tests',
    post: accessibleEmailPreferenceSwitchTests,
  },
  {
    slug: 'email-footer-preference-route-tests',
    post: emailFooterPreferenceRouteTests,
  },
  {
    slug: 'weekly-digest-ranking-query-tests',
    post: weeklyDigestRankingQueryTests,
  },
  {
    slug: 'nextjs-static-asset-matcher-tests',
    post: nextjsStaticAssetMatcherTests,
  },
  {
    slug: 'email-preference-payload-validation-tests',
    post: emailPreferencePayloadValidationTests,
  },
];
