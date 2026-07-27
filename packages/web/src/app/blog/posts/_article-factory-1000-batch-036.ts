import type { BlogPost } from './index';

import { post as skillPackInstallCommandTests } from './skill-pack-install-command-tests';
import { post as ga4PackDynamicEventNames } from './ga4-pack-dynamic-event-names';
import { post as typesenseWildcardQueryDefaultTests } from './typesense-wildcard-query-default-tests';
import { post as skillPackAuthSkeletonParity } from './skill-pack-auth-skeleton-parity';
import { post as ga4SkillEventPayloadMatrix } from './ga4-skill-event-payload-matrix';

export const articleFactory1000Batch036Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'skill-pack-install-command-tests',
    post: skillPackInstallCommandTests,
  },
  {
    slug: 'ga4-pack-dynamic-event-names',
    post: ga4PackDynamicEventNames,
  },
  {
    slug: 'typesense-wildcard-query-default-tests',
    post: typesenseWildcardQueryDefaultTests,
  },
  {
    slug: 'skill-pack-auth-skeleton-parity',
    post: skillPackAuthSkeletonParity,
  },
  {
    slug: 'ga4-skill-event-payload-matrix',
    post: ga4SkillEventPayloadMatrix,
  },
];
