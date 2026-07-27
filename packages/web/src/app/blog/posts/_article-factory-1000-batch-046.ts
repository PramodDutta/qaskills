import type { BlogPost } from './index';

import { post as roadmapAccessibleCheckboxStateTests } from './roadmap-accessible-checkbox-state-tests';
import { post as sitemapDatabaseOutageFallbackTests } from './sitemap-database-outage-fallback-tests';
import { post as roadmapDefaultProgressResetTests } from './roadmap-default-progress-reset-tests';
import { post as roadmapMalformedStorageRecoveryTests } from './roadmap-malformed-storage-recovery-tests';
import { post as roadmapProgressWriteGatingTests } from './roadmap-progress-write-gating-tests';

export const articleFactory1000Batch046Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'roadmap-accessible-checkbox-state-tests',
    post: roadmapAccessibleCheckboxStateTests,
  },
  {
    slug: 'sitemap-database-outage-fallback-tests',
    post: sitemapDatabaseOutageFallbackTests,
  },
  {
    slug: 'roadmap-default-progress-reset-tests',
    post: roadmapDefaultProgressResetTests,
  },
  {
    slug: 'roadmap-malformed-storage-recovery-tests',
    post: roadmapMalformedStorageRecoveryTests,
  },
  {
    slug: 'roadmap-progress-write-gating-tests',
    post: roadmapProgressWriteGatingTests,
  },
];
