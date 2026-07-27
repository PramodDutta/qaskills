import type { BlogPost } from './index';

import { post as puppeteerContextPermissionReset } from './puppeteer-context-permission-reset';
import { post as nightwatchAbortonfailureCommandBehavior } from './nightwatch-abortonfailure-command-behavior';
import { post as playwrightVideoSaveasDeletionLifecycle } from './playwright-video-saveas-deletion-lifecycle';
import { post as playwrightWebsocketCloseCodeTesting } from './playwright-websocket-close-code-testing';
import { post as playwrightWebsocketFramePayloadAssertions } from './playwright-websocket-frame-payload-assertions';

export const articleFactory1000Batch070Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'puppeteer-context-permission-reset',
    post: puppeteerContextPermissionReset,
  },
  {
    slug: 'nightwatch-abortonfailure-command-behavior',
    post: nightwatchAbortonfailureCommandBehavior,
  },
  {
    slug: 'playwright-video-saveas-deletion-lifecycle',
    post: playwrightVideoSaveasDeletionLifecycle,
  },
  {
    slug: 'playwright-websocket-close-code-testing',
    post: playwrightWebsocketCloseCodeTesting,
  },
  {
    slug: 'playwright-websocket-frame-payload-assertions',
    post: playwrightWebsocketFramePayloadAssertions,
  },
];
