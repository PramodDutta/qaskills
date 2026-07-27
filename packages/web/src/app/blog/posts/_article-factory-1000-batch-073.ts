import type { BlogPost } from './index';

import { post as seleniumBidiCacheBehaviorTesting } from './selenium-bidi-cache-behavior-testing';
import { post as seleniumBidiConnectionLossRecovery } from './selenium-bidi-connection-loss-recovery';
import { post as seleniumBidiConsoleSourceMapping } from './selenium-bidi-console-source-mapping';
import { post as seleniumBidiContextTreeAssertions } from './selenium-bidi-context-tree-assertions';
import { post as seleniumBidiCookiePartitionTesting } from './selenium-bidi-cookie-partition-testing';

export const articleFactory1000Batch073Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-bidi-cache-behavior-testing',
    post: seleniumBidiCacheBehaviorTesting,
  },
  {
    slug: 'selenium-bidi-connection-loss-recovery',
    post: seleniumBidiConnectionLossRecovery,
  },
  {
    slug: 'selenium-bidi-console-source-mapping',
    post: seleniumBidiConsoleSourceMapping,
  },
  {
    slug: 'selenium-bidi-context-tree-assertions',
    post: seleniumBidiContextTreeAssertions,
  },
  {
    slug: 'selenium-bidi-cookie-partition-testing',
    post: seleniumBidiCookiePartitionTesting,
  },
];
