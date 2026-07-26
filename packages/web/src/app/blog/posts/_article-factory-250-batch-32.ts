import type { BlogPost } from './index';

import { post as playwrightCliConsoleWarningFilter } from './playwright-cli-console-warning-filter';
import { post as playwrightFixtureTimeoutIsolation } from './playwright-fixture-timeout-isolation';
import { post as playwrightListTestsCommand } from './playwright-list-tests-command';
import { post as playwrightMaxFailuresCi } from './playwright-max-failures-ci';
import { post as playwrightRequestfailedErrorDiagnostics } from './playwright-requestfailed-error-diagnostics';

export const articleFactory250Batch32Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-requestfailed-error-diagnostics',
    post: playwrightRequestfailedErrorDiagnostics,
  },
  {
    slug: 'playwright-max-failures-ci',
    post: playwrightMaxFailuresCi,
  },
  {
    slug: 'playwright-cli-console-warning-filter',
    post: playwrightCliConsoleWarningFilter,
  },
  {
    slug: 'playwright-fixture-timeout-isolation',
    post: playwrightFixtureTimeoutIsolation,
  },
  {
    slug: 'playwright-list-tests-command',
    post: playwrightListTestsCommand,
  },
];
