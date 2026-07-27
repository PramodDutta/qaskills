import type { BlogPost } from './index';

import { post as webdriverioServiceHookOrdering } from './webdriverio-service-hook-ordering';
import { post as playwrightCliSessionstorageCommands } from './playwright-cli-sessionstorage-commands';
import { post as playwrightCliTabSwitchVerification } from './playwright-cli-tab-switch-verification';
import { post as webdriverioSwitchwindowMatcherAmbiguity } from './webdriverio-switchwindow-matcher-ambiguity';
import { post as playwrightCliUploadMimeVerification } from './playwright-cli-upload-mime-verification';

export const articleFactory1000Batch062Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'webdriverio-service-hook-ordering',
    post: webdriverioServiceHookOrdering,
  },
  {
    slug: 'playwright-cli-sessionstorage-commands',
    post: playwrightCliSessionstorageCommands,
  },
  {
    slug: 'playwright-cli-tab-switch-verification',
    post: playwrightCliTabSwitchVerification,
  },
  {
    slug: 'webdriverio-switchwindow-matcher-ambiguity',
    post: webdriverioSwitchwindowMatcherAmbiguity,
  },
  {
    slug: 'playwright-cli-upload-mime-verification',
    post: playwrightCliUploadMimeVerification,
  },
];
