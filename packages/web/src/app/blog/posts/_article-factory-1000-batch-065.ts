import type { BlogPost } from './index';

import { post as playwrightHarUrlFilterMatching } from './playwright-har-url-filter-matching';
import { post as testcafeSelectorPropertySerialization } from './testcafe-selector-property-serialization';
import { post as playwrightHttpCredentialsOriginScoping } from './playwright-http-credentials-origin-scoping';
import { post as testcafeRolePreserveurlRedirects } from './testcafe-role-preserveurl-redirects';
import { post as seleniumClickInterceptedScrollRecovery } from './selenium-click-intercepted-scroll-recovery';

export const articleFactory1000Batch065Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-har-url-filter-matching',
    post: playwrightHarUrlFilterMatching,
  },
  {
    slug: 'testcafe-selector-property-serialization',
    post: testcafeSelectorPropertySerialization,
  },
  {
    slug: 'playwright-http-credentials-origin-scoping',
    post: playwrightHttpCredentialsOriginScoping,
  },
  {
    slug: 'testcafe-role-preserveurl-redirects',
    post: testcafeRolePreserveurlRedirects,
  },
  {
    slug: 'selenium-click-intercepted-scroll-recovery',
    post: seleniumClickInterceptedScrollRecovery,
  },
];
