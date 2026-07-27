import type { BlogPost } from './index';

import { post as minitestParallelExecutorStateIsolation } from './minitest-parallel-executor-state-isolation';
import { post as appiumPluginDriverCompatibilityTesting } from './appium-plugin-driver-compatibility-testing';
import { post as mockCallOrderWithoutOverspecification } from './mock-call-order-without-overspecification';
import { post as mockContractDriftDetection } from './mock-contract-drift-detection';
import { post as mockExceptionTypeFidelity } from './mock-exception-type-fidelity';

export const articleFactory1000Batch140Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'minitest-parallel-executor-state-isolation',
    post: minitestParallelExecutorStateIsolation,
  },
  {
    slug: 'appium-plugin-driver-compatibility-testing',
    post: appiumPluginDriverCompatibilityTesting,
  },
  {
    slug: 'mock-call-order-without-overspecification',
    post: mockCallOrderWithoutOverspecification,
  },
  {
    slug: 'mock-contract-drift-detection',
    post: mockContractDriftDetection,
  },
  {
    slug: 'mock-exception-type-fidelity',
    post: mockExceptionTypeFidelity,
  },
];
