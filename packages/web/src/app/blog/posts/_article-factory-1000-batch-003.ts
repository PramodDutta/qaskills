import type { BlogPost } from './index';

import { post as qaskillsRemovalEventCompletionGate } from './qaskills-removal-event-completion-gate';
import { post as qaskillsRemoveCancellationFilesystemSafety } from './qaskills-remove-cancellation-filesystem-safety';
import { post as qaskillsReservedFilenameInstallTesting } from './qaskills-reserved-filename-install-testing';
import { post as qaskillsSdkAuthorizationOverrideOrder } from './qaskills-sdk-authorization-override-order';
import { post as qaskillsSdkBasePathPreservation } from './qaskills-sdk-base-path-preservation';

export const articleFactory1000Batch003Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-removal-event-completion-gate',
    post: qaskillsRemovalEventCompletionGate,
  },
  {
    slug: 'qaskills-remove-cancellation-filesystem-safety',
    post: qaskillsRemoveCancellationFilesystemSafety,
  },
  {
    slug: 'qaskills-reserved-filename-install-testing',
    post: qaskillsReservedFilenameInstallTesting,
  },
  {
    slug: 'qaskills-sdk-authorization-override-order',
    post: qaskillsSdkAuthorizationOverrideOrder,
  },
  {
    slug: 'qaskills-sdk-base-path-preservation',
    post: qaskillsSdkBasePathPreservation,
  },
];
