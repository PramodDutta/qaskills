import type { BlogPost } from './index';

import { post as testcafeRequestMockPredicateMatching } from './testcafe-request-mock-predicate-matching';
import { post as playwrightExpectTimeoutConfiguration } from './playwright-expect-timeout-configuration';
import { post as testcafeClientfunctionDependencyCloning } from './testcafe-clientfunction-dependency-cloning';
import { post as playwrightGeneratorLocatorPolicyChecks } from './playwright-generator-locator-policy-checks';
import { post as playwrightHarContentStorageModes } from './playwright-har-content-storage-modes';

export const articleFactory1000Batch064Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'testcafe-request-mock-predicate-matching',
    post: testcafeRequestMockPredicateMatching,
  },
  {
    slug: 'playwright-expect-timeout-configuration',
    post: playwrightExpectTimeoutConfiguration,
  },
  {
    slug: 'testcafe-clientfunction-dependency-cloning',
    post: testcafeClientfunctionDependencyCloning,
  },
  {
    slug: 'playwright-generator-locator-policy-checks',
    post: playwrightGeneratorLocatorPolicyChecks,
  },
  {
    slug: 'playwright-har-content-storage-modes',
    post: playwrightHarContentStorageModes,
  },
];
