import type { BlogPost } from './index';

import { post as playwrightCliBrowserSelectionFlags } from './playwright-cli-browser-selection-flags';
import { post as playwrightCliCloseVersusKill } from './playwright-cli-close-versus-kill';
import { post as playwrightLastFailedCommand } from './playwright-last-failed-command';
import { post as playwrightMcpDeterministicToolSequences } from './playwright-mcp-deterministic-tool-sequences';
import { post as playwrightPageerrorFailureGate } from './playwright-pageerror-failure-gate';

export const articleFactory250Batch31Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-pageerror-failure-gate',
    post: playwrightPageerrorFailureGate,
  },
  {
    slug: 'playwright-last-failed-command',
    post: playwrightLastFailedCommand,
  },
  {
    slug: 'playwright-cli-close-versus-kill',
    post: playwrightCliCloseVersusKill,
  },
  {
    slug: 'playwright-mcp-deterministic-tool-sequences',
    post: playwrightMcpDeterministicToolSequences,
  },
  {
    slug: 'playwright-cli-browser-selection-flags',
    post: playwrightCliBrowserSelectionFlags,
  },
];
