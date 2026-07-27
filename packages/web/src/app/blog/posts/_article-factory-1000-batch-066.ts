import type { BlogPost } from './index';

import { post as seleniumElementScreenshotScrollBehavior } from './selenium-element-screenshot-scroll-behavior';
import { post as seleniumFrameStaleRecoveryTesting } from './selenium-frame-stale-recovery-testing';
import { post as webdriverioMatcherAutoWaitBoundaries } from './webdriverio-matcher-auto-wait-boundaries';
import { post as seleniumMixedWaitBudgetTesting } from './selenium-mixed-wait-budget-testing';
import { post as seleniumNewWindowHandleRace } from './selenium-new-window-handle-race';

export const articleFactory1000Batch066Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-element-screenshot-scroll-behavior',
    post: seleniumElementScreenshotScrollBehavior,
  },
  {
    slug: 'selenium-frame-stale-recovery-testing',
    post: seleniumFrameStaleRecoveryTesting,
  },
  {
    slug: 'webdriverio-matcher-auto-wait-boundaries',
    post: webdriverioMatcherAutoWaitBoundaries,
  },
  {
    slug: 'selenium-mixed-wait-budget-testing',
    post: seleniumMixedWaitBudgetTesting,
  },
  {
    slug: 'selenium-new-window-handle-race',
    post: seleniumNewWindowHandleRace,
  },
];
