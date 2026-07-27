import type { BlogPost } from './index';

import { post as deepevalCachedResponseRegrading } from './deepeval-cached-response-regrading';
import { post as modelAliasUpdateDetectionTesting } from './model-alias-update-detection-testing';
import { post as multiTurnJailbreakPersistenceTesting } from './multi-turn-jailbreak-persistence-testing';
import { post as parallelToolCallOrderingTests } from './parallel-tool-call-ordering-tests';
import { post as promptRoleSpoofingDetectionTesting } from './prompt-role-spoofing-detection-testing';

export const articleFactory250Batch39Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'model-alias-update-detection-testing',
    post: modelAliasUpdateDetectionTesting,
  },
  {
    slug: 'multi-turn-jailbreak-persistence-testing',
    post: multiTurnJailbreakPersistenceTesting,
  },
  {
    slug: 'parallel-tool-call-ordering-tests',
    post: parallelToolCallOrderingTests,
  },
  {
    slug: 'prompt-role-spoofing-detection-testing',
    post: promptRoleSpoofingDetectionTesting,
  },
  {
    slug: 'deepeval-cached-response-regrading',
    post: deepevalCachedResponseRegrading,
  },
];
