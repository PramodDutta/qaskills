import type { BlogPost } from './index';

import { post as pytestCaplogClearPhaseAssertions } from './pytest-caplog-clear-phase-assertions';
import { post as pytestCollectionModifyitemsOrdering } from './pytest-collection-modifyitems-ordering';
import { post as pytestCustomAssertionFailureExplanations } from './pytest-custom-assertion-failure-explanations';
import { post as pytestDoctestNamespaceFixtures } from './pytest-doctest-namespace-fixtures';
import { post as oauthStateReplayRejectionTesting } from './oauth-state-replay-rejection-testing';

export const articleFactory1000Batch148Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'pytest-caplog-clear-phase-assertions',
    post: pytestCaplogClearPhaseAssertions,
  },
  {
    slug: 'pytest-collection-modifyitems-ordering',
    post: pytestCollectionModifyitemsOrdering,
  },
  {
    slug: 'pytest-custom-assertion-failure-explanations',
    post: pytestCustomAssertionFailureExplanations,
  },
  {
    slug: 'pytest-doctest-namespace-fixtures',
    post: pytestDoctestNamespaceFixtures,
  },
  {
    slug: 'oauth-state-replay-rejection-testing',
    post: oauthStateReplayRejectionTesting,
  },
];
