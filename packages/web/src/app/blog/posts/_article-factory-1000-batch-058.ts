import type { BlogPost } from './index';

import { post as cypressRetryModeArtifactRetention } from './cypress-retry-mode-artifact-retention';
import { post as cypressScreenshotBlackoutSelectorTesting } from './cypress-screenshot-blackout-selector-testing';
import { post as seleniumGridUnsupportedCapabilityRejection } from './selenium-grid-unsupported-capability-rejection';
import { post as cypressTaskJsonBoundaryTesting } from './cypress-task-json-boundary-testing';
import { post as cypressTaskTimeoutCleanupTesting } from './cypress-task-timeout-cleanup-testing';

export const articleFactory1000Batch058Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'cypress-retry-mode-artifact-retention',
    post: cypressRetryModeArtifactRetention,
  },
  {
    slug: 'cypress-screenshot-blackout-selector-testing',
    post: cypressScreenshotBlackoutSelectorTesting,
  },
  {
    slug: 'selenium-grid-unsupported-capability-rejection',
    post: seleniumGridUnsupportedCapabilityRejection,
  },
  {
    slug: 'cypress-task-json-boundary-testing',
    post: cypressTaskJsonBoundaryTesting,
  },
  {
    slug: 'cypress-task-timeout-cleanup-testing',
    post: cypressTaskTimeoutCleanupTesting,
  },
];
