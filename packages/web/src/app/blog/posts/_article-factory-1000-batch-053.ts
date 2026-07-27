import type { BlogPost } from './index';

import { post as playwrightUnrouteallWaitBehavior } from './playwright-unrouteall-wait-behavior';
import { post as playwrightResponseServerAddress } from './playwright-response-server-address';
import { post as playwrightWaitforurlHashNavigation } from './playwright-waitforurl-hash-navigation';
import { post as playwrightWebserverGracefulShutdown } from './playwright-webserver-graceful-shutdown';
import { post as playwrightGrepInvertTags } from './playwright-grep-invert-tags';

export const articleFactory1000Batch053Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-unrouteall-wait-behavior',
    post: playwrightUnrouteallWaitBehavior,
  },
  {
    slug: 'playwright-response-server-address',
    post: playwrightResponseServerAddress,
  },
  {
    slug: 'playwright-waitforurl-hash-navigation',
    post: playwrightWaitforurlHashNavigation,
  },
  {
    slug: 'playwright-webserver-graceful-shutdown',
    post: playwrightWebserverGracefulShutdown,
  },
  {
    slug: 'playwright-grep-invert-tags',
    post: playwrightGrepInvertTags,
  },
];
