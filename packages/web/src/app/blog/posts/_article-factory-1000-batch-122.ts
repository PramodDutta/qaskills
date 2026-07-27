import type { BlogPost } from './index';

import { post as ciPartialCacheRestoreTesting } from './ci-partial-cache-restore-testing';
import { post as redisClusterSlotMigrationTesting } from './redis-cluster-slot-migration-testing';
import { post as ciReusableWorkflowInputTesting } from './ci-reusable-workflow-input-testing';
import { post as shadowTrafficSideEffectIsolation } from './shadow-traffic-side-effect-isolation';
import { post as cloudRegionFailoverConsistencyTesting } from './cloud-region-failover-consistency-testing';

export const articleFactory1000Batch122Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'ci-partial-cache-restore-testing',
    post: ciPartialCacheRestoreTesting,
  },
  {
    slug: 'redis-cluster-slot-migration-testing',
    post: redisClusterSlotMigrationTesting,
  },
  {
    slug: 'ci-reusable-workflow-input-testing',
    post: ciReusableWorkflowInputTesting,
  },
  {
    slug: 'shadow-traffic-side-effect-isolation',
    post: shadowTrafficSideEffectIsolation,
  },
  {
    slug: 'cloud-region-failover-consistency-testing',
    post: cloudRegionFailoverConsistencyTesting,
  },
];
