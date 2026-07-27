import type { BlogPost } from './index';

import { post as clerkAuthRequestContextTests } from './clerk-auth-request-context-tests';
import { post as nonblockingSkillAlertDispatchTests } from './nonblocking-skill-alert-dispatch-tests';
import { post as partialEmailPreferencePatchTests } from './partial-email-preference-patch-tests';
import { post as telemetryUnknownSkillResponseTests } from './telemetry-unknown-skill-response-tests';
import { post as weeklyDigestRankingLinkTests } from './weekly-digest-ranking-link-tests';

export const articleFactory250Batch10Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'weekly-digest-ranking-link-tests',
    post: weeklyDigestRankingLinkTests,
  },
  {
    slug: 'nonblocking-skill-alert-dispatch-tests',
    post: nonblockingSkillAlertDispatchTests,
  },
  {
    slug: 'clerk-auth-request-context-tests',
    post: clerkAuthRequestContextTests,
  },
  {
    slug: 'partial-email-preference-patch-tests',
    post: partialEmailPreferencePatchTests,
  },
  {
    slug: 'telemetry-unknown-skill-response-tests',
    post: telemetryUnknownSkillResponseTests,
  },
];
