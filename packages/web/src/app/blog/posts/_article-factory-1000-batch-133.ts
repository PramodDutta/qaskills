import type { BlogPost } from './index';

import { post as incrementalMutationChangedCodeSelection } from './incremental-mutation-changed-code-selection';
import { post as k6CustomSummaryArtifactTesting } from './k6-custom-summary-artifact-testing';
import { post as xctestAsyncFulfillmentOrdering } from './xctest-async-fulfillment-ordering';
import { post as xctestExpectedFailureStrictness } from './xctest-expected-failure-strictness';
import { post as xunitTheorydataCompileTimeSafety } from './xunit-theorydata-compile-time-safety';

export const articleFactory1000Batch133Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'incremental-mutation-changed-code-selection',
    post: incrementalMutationChangedCodeSelection,
  },
  {
    slug: 'k6-custom-summary-artifact-testing',
    post: k6CustomSummaryArtifactTesting,
  },
  {
    slug: 'xctest-async-fulfillment-ordering',
    post: xctestAsyncFulfillmentOrdering,
  },
  {
    slug: 'xctest-expected-failure-strictness',
    post: xctestExpectedFailureStrictness,
  },
  {
    slug: 'xunit-theorydata-compile-time-safety',
    post: xunitTheorydataCompileTimeSafety,
  },
];
