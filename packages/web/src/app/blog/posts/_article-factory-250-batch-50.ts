import type { BlogPost } from './index';

import { post as jmeterTimerScopeExecutionTesting } from './jmeter-timer-scope-execution-testing';
import { post as samesiteCookieNavigationMatrixTesting } from './samesite-cookie-navigation-matrix-testing';
import { post as seleniumBidiEventOrderingTests } from './selenium-bidi-event-ordering-tests';
import { post as skipLinkTargetFocusTesting } from './skip-link-target-focus-testing';
import { post as thirdPartyPerformanceBudgetTesting } from './third-party-performance-budget-testing';

export const articleFactory250Batch50Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'samesite-cookie-navigation-matrix-testing',
    post: samesiteCookieNavigationMatrixTesting,
  },
  {
    slug: 'jmeter-timer-scope-execution-testing',
    post: jmeterTimerScopeExecutionTesting,
  },
  {
    slug: 'selenium-bidi-event-ordering-tests',
    post: seleniumBidiEventOrderingTests,
  },
  {
    slug: 'skip-link-target-focus-testing',
    post: skipLinkTargetFocusTesting,
  },
  {
    slug: 'third-party-performance-budget-testing',
    post: thirdPartyPerformanceBudgetTesting,
  },
];
