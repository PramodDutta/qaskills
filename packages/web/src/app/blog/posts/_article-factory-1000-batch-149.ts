import type { BlogPost } from './index';

import { post as pytestFixtureParameterIdStability } from './pytest-fixture-parameter-id-stability';
import { post as pytestGenerateTestsMetafuncPatterns } from './pytest-generate-tests-metafunc-patterns';
import { post as pytestGetfixturevalueDynamicFixtures } from './pytest-getfixturevalue-dynamic-fixtures';
import { post as postmanSandboxAsyncRequestOrdering } from './postman-sandbox-async-request-ordering';
import { post as pytestLastfailedCacheSelection } from './pytest-lastfailed-cache-selection';

export const articleFactory1000Batch149Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'pytest-fixture-parameter-id-stability',
    post: pytestFixtureParameterIdStability,
  },
  {
    slug: 'pytest-generate-tests-metafunc-patterns',
    post: pytestGenerateTestsMetafuncPatterns,
  },
  {
    slug: 'pytest-getfixturevalue-dynamic-fixtures',
    post: pytestGetfixturevalueDynamicFixtures,
  },
  {
    slug: 'postman-sandbox-async-request-ordering',
    post: postmanSandboxAsyncRequestOrdering,
  },
  {
    slug: 'pytest-lastfailed-cache-selection',
    post: pytestLastfailedCacheSelection,
  },
];
