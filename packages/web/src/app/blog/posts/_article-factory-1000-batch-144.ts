import type { BlogPost } from './index';

import { post as nunitOnetimesetupInheritanceOrder } from './nunit-onetimesetup-inheritance-order';
import { post as nunitSetupfixtureNamespaceScope } from './nunit-setupfixture-namespace-scope';
import { post as jestRandomizeSeedReplayTesting } from './jest-randomize-seed-replay-testing';
import { post as jmeterCookieManagerThreadIsolation } from './jmeter-cookie-manager-thread-isolation';
import { post as partialMockSideEffectLeakage } from './partial-mock-side-effect-leakage';

export const articleFactory1000Batch144Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'nunit-onetimesetup-inheritance-order',
    post: nunitOnetimesetupInheritanceOrder,
  },
  {
    slug: 'nunit-setupfixture-namespace-scope',
    post: nunitSetupfixtureNamespaceScope,
  },
  {
    slug: 'jest-randomize-seed-replay-testing',
    post: jestRandomizeSeedReplayTesting,
  },
  {
    slug: 'jmeter-cookie-manager-thread-isolation',
    post: jmeterCookieManagerThreadIsolation,
  },
  {
    slug: 'partial-mock-side-effect-leakage',
    post: partialMockSideEffectLeakage,
  },
];
