import type { BlogPost } from './index';

import { post as playwrightActionNavigationTimeout } from './playwright-action-navigation-timeout';
import { post as playwrightCliLocalstorageCommands } from './playwright-cli-localstorage-commands';
import { post as playwrightConsoleMessageLocation } from './playwright-console-message-location';
import { post as playwrightOnlyChangedTests } from './playwright-only-changed-tests';
import { post as playwrightWorkersPercentageSetting } from './playwright-workers-percentage-setting';

export const articleFactory250Batch37Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-only-changed-tests',
    post: playwrightOnlyChangedTests,
  },
  {
    slug: 'playwright-cli-localstorage-commands',
    post: playwrightCliLocalstorageCommands,
  },
  {
    slug: 'playwright-action-navigation-timeout',
    post: playwrightActionNavigationTimeout,
  },
  {
    slug: 'playwright-console-message-location',
    post: playwrightConsoleMessageLocation,
  },
  {
    slug: 'playwright-workers-percentage-setting',
    post: playwrightWorkersPercentageSetting,
  },
];
