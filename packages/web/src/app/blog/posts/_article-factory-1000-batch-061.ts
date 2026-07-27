import type { BlogPost } from './index';

import { post as webdriverioBailHookExecutionTesting } from './webdriverio-bail-hook-execution-testing';
import { post as playwrightCliRemoveRequestHeaders } from './playwright-cli-remove-request-headers';
import { post as webdriverioOverwriteSubjectPropagation } from './webdriverio-overwrite-subject-propagation';
import { post as webdriverioReloadsessionStateCleanup } from './webdriverio-reloadsession-state-cleanup';
import { post as webdriverioReporterOutputCollisions } from './webdriverio-reporter-output-collisions';

export const articleFactory1000Batch061Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'webdriverio-bail-hook-execution-testing',
    post: webdriverioBailHookExecutionTesting,
  },
  {
    slug: 'playwright-cli-remove-request-headers',
    post: playwrightCliRemoveRequestHeaders,
  },
  {
    slug: 'webdriverio-overwrite-subject-propagation',
    post: webdriverioOverwriteSubjectPropagation,
  },
  {
    slug: 'webdriverio-reloadsession-state-cleanup',
    post: webdriverioReloadsessionStateCleanup,
  },
  {
    slug: 'webdriverio-reporter-output-collisions',
    post: webdriverioReporterOutputCollisions,
  },
];
