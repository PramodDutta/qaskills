import type { BlogPost } from './index';

import { post as playwrightReuseExistingServerSafety } from './playwright-reuse-existing-server-safety';
import { post as playwrightSnapshotPathTemplate } from './playwright-snapshot-path-template';
import { post as playwrightWorkerIndexTestData } from './playwright-worker-index-test-data';
import { post as playwrightScreenshotStylesheetInjection } from './playwright-screenshot-stylesheet-injection';
import { post as playwrightTransparentScreenshotBackgrounds } from './playwright-transparent-screenshot-backgrounds';

export const articleFactory1000Batch052Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-reuse-existing-server-safety',
    post: playwrightReuseExistingServerSafety,
  },
  {
    slug: 'playwright-snapshot-path-template',
    post: playwrightSnapshotPathTemplate,
  },
  {
    slug: 'playwright-worker-index-test-data',
    post: playwrightWorkerIndexTestData,
  },
  {
    slug: 'playwright-screenshot-stylesheet-injection',
    post: playwrightScreenshotStylesheetInjection,
  },
  {
    slug: 'playwright-transparent-screenshot-backgrounds',
    post: playwrightTransparentScreenshotBackgrounds,
  },
];
