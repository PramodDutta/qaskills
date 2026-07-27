import type { BlogPost } from './index';

import { post as seleniumBidiRequestHeaderMutation } from './selenium-bidi-request-header-mutation';
import { post as seleniumBidiResponseBodyEncoding } from './selenium-bidi-response-body-encoding';
import { post as nightwatchWorkerEnvironmentIsolation } from './nightwatch-worker-environment-isolation';
import { post as seleniumBidiScriptRealmLifecycle } from './selenium-bidi-script-realm-lifecycle';
import { post as seleniumBidiSubscriptionContextScoping } from './selenium-bidi-subscription-context-scoping';

export const articleFactory1000Batch075Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-bidi-request-header-mutation',
    post: seleniumBidiRequestHeaderMutation,
  },
  {
    slug: 'selenium-bidi-response-body-encoding',
    post: seleniumBidiResponseBodyEncoding,
  },
  {
    slug: 'nightwatch-worker-environment-isolation',
    post: nightwatchWorkerEnvironmentIsolation,
  },
  {
    slug: 'selenium-bidi-script-realm-lifecycle',
    post: seleniumBidiScriptRealmLifecycle,
  },
  {
    slug: 'selenium-bidi-subscription-context-scoping',
    post: seleniumBidiSubscriptionContextScoping,
  },
];
