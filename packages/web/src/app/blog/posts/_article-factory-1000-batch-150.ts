import type { BlogPost } from './index';

import { post as restAssuredFilterSecretRedaction } from './rest-assured-filter-secret-redaction';
import { post as pytestStashPluginStateIsolation } from './pytest-stash-plugin-state-isolation';
import { post as pytestSubtestsFailureIsolation } from './pytest-subtests-failure-isolation';
import { post as pytestTmpPathRetentionPolicy } from './pytest-tmp-path-retention-policy';
import { post as pytestWarnsMatchMessageTesting } from './pytest-warns-match-message-testing';

export const articleFactory1000Batch150Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'rest-assured-filter-secret-redaction',
    post: restAssuredFilterSecretRedaction,
  },
  {
    slug: 'pytest-stash-plugin-state-isolation',
    post: pytestStashPluginStateIsolation,
  },
  {
    slug: 'pytest-subtests-failure-isolation',
    post: pytestSubtestsFailureIsolation,
  },
  {
    slug: 'pytest-tmp-path-retention-policy',
    post: pytestTmpPathRetentionPolicy,
  },
  {
    slug: 'pytest-warns-match-message-testing',
    post: pytestWarnsMatchMessageTesting,
  },
];
