import type { BlogPost } from './index';

import { post as seleniumQuitOrphanProcessTesting } from './selenium-quit-orphan-process-testing';
import { post as seleniumStrictFileInteractabilityTesting } from './selenium-strict-file-interactability-testing';
import { post as seleniumUnhandledPromptCapabilityTesting } from './selenium-unhandled-prompt-capability-testing';
import { post as playwrightPersistentContextProfileLocking } from './playwright-persistent-context-profile-locking';
import { post as playwrightPopupFirstRequestInterception } from './playwright-popup-first-request-interception';

export const articleFactory1000Batch067Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-quit-orphan-process-testing',
    post: seleniumQuitOrphanProcessTesting,
  },
  {
    slug: 'selenium-strict-file-interactability-testing',
    post: seleniumStrictFileInteractabilityTesting,
  },
  {
    slug: 'selenium-unhandled-prompt-capability-testing',
    post: seleniumUnhandledPromptCapabilityTesting,
  },
  {
    slug: 'playwright-persistent-context-profile-locking',
    post: playwrightPersistentContextProfileLocking,
  },
  {
    slug: 'playwright-popup-first-request-interception',
    post: playwrightPopupFirstRequestInterception,
  },
];
