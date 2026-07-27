import type { BlogPost } from './index';

import { post as darkLaunchTrafficSegregationTesting } from './dark-launch-traffic-segregation-testing';
import { post as dbtIncrementalLateDataTesting } from './dbt-incremental-late-data-testing';
import { post as sloBurnRateWindowTesting } from './slo-burn-rate-window-testing';
import { post as telemetryCardinalityBudgetTesting } from './telemetry-cardinality-budget-testing';
import { post as terraformStateLockRecoveryTesting } from './terraform-state-lock-recovery-testing';

export const articleFactory1000Batch123Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'dark-launch-traffic-segregation-testing',
    post: darkLaunchTrafficSegregationTesting,
  },
  {
    slug: 'dbt-incremental-late-data-testing',
    post: dbtIncrementalLateDataTesting,
  },
  {
    slug: 'slo-burn-rate-window-testing',
    post: sloBurnRateWindowTesting,
  },
  {
    slug: 'telemetry-cardinality-budget-testing',
    post: telemetryCardinalityBudgetTesting,
  },
  {
    slug: 'terraform-state-lock-recovery-testing',
    post: terraformStateLockRecoveryTesting,
  },
];
