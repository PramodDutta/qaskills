import type { BlogPost } from './index';

import { post as playwrightCliNetworkLogInspection } from './playwright-cli-network-log-inspection';
import { post as playwrightMcpActionAuditLogging } from './playwright-mcp-action-audit-logging';
import { post as playwrightOutputDirectoryCleanup } from './playwright-output-directory-cleanup';
import { post as playwrightPresssequentiallyInputEvents } from './playwright-presssequentially-input-events';
import { post as playwrightUpdateSnapshotsModes } from './playwright-update-snapshots-modes';

export const articleFactory250Batch33Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'playwright-presssequentially-input-events',
    post: playwrightPresssequentiallyInputEvents,
  },
  {
    slug: 'playwright-update-snapshots-modes',
    post: playwrightUpdateSnapshotsModes,
  },
  {
    slug: 'playwright-cli-network-log-inspection',
    post: playwrightCliNetworkLogInspection,
  },
  {
    slug: 'playwright-mcp-action-audit-logging',
    post: playwrightMcpActionAuditLogging,
  },
  {
    slug: 'playwright-output-directory-cleanup',
    post: playwrightOutputDirectoryCleanup,
  },
];
