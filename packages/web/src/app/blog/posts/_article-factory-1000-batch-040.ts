import type { BlogPost } from './index';

import { post as rankingsUnavailableResponseContract } from './rankings-unavailable-response-contract';
import { post as rankingClearSearchFilterPreservation } from './ranking-clear-search-filter-preservation';
import { post as publishWizardNetworkRecoveryTests } from './publish-wizard-network-recovery-tests';
import { post as rankingNewBadgeVisibilityTests } from './ranking-new-badge-visibility-tests';
import { post as typesensePaginationDefaultSizeTests } from './typesense-pagination-default-size-tests';

export const articleFactory1000Batch040Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'rankings-unavailable-response-contract',
    post: rankingsUnavailableResponseContract,
  },
  {
    slug: 'ranking-clear-search-filter-preservation',
    post: rankingClearSearchFilterPreservation,
  },
  {
    slug: 'publish-wizard-network-recovery-tests',
    post: publishWizardNetworkRecoveryTests,
  },
  {
    slug: 'ranking-new-badge-visibility-tests',
    post: rankingNewBadgeVisibilityTests,
  },
  {
    slug: 'typesense-pagination-default-size-tests',
    post: typesensePaginationDefaultSizeTests,
  },
];
