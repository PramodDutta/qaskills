import type { BlogPost } from './index';

import { post as playwrightBrowsercontextCloseReason } from './playwright-browsercontext-close-reason';
import { post as playwrightCliCookieCommands } from './playwright-cli-cookie-commands';
import { post as playwrightContextInitScriptOrdering } from './playwright-context-init-script-ordering';
import { post as playwrightPassWithNoTests } from './playwright-pass-with-no-tests';
import { post as playwrightResponseSecurityDetails } from './playwright-response-security-details';

export const articleFactory250Batch36Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-response-security-details',
    post: playwrightResponseSecurityDetails,
  },
  {
    slug: 'playwright-pass-with-no-tests',
    post: playwrightPassWithNoTests,
  },
  {
    slug: 'playwright-cli-cookie-commands',
    post: playwrightCliCookieCommands,
  },
  {
    slug: 'playwright-browsercontext-close-reason',
    post: playwrightBrowsercontextCloseReason,
  },
  {
    slug: 'playwright-context-init-script-ordering',
    post: playwrightContextInitScriptOrdering,
  },
];
