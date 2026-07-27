import type { BlogPost } from './index';

import { post as mobileDatabaseUpgradeRollbackTesting } from './mobile-database-upgrade-rollback-testing';
import { post as mobileDynamicTypeTruncationTesting } from './mobile-dynamic-type-truncation-testing';
import { post as openapiDefaultValueDriftTesting } from './openapi-default-value-drift-testing';
import { post as locustWorkerRebalanceLoadTesting } from './locust-worker-rebalance-load-testing';
import { post as productionSmokeAccountPermissionTesting } from './production-smoke-account-permission-testing';

export const articleFactory1000Batch112Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mobile-database-upgrade-rollback-testing',
    post: mobileDatabaseUpgradeRollbackTesting,
  },
  {
    slug: 'mobile-dynamic-type-truncation-testing',
    post: mobileDynamicTypeTruncationTesting,
  },
  {
    slug: 'openapi-default-value-drift-testing',
    post: openapiDefaultValueDriftTesting,
  },
  {
    slug: 'locust-worker-rebalance-load-testing',
    post: locustWorkerRebalanceLoadTesting,
  },
  {
    slug: 'production-smoke-account-permission-testing',
    post: productionSmokeAccountPermissionTesting,
  },
];
