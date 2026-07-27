import type { BlogPost } from './index';

import { post as rspecCompoundChangeMatcherTesting } from './rspec-compound-change-matcher-testing';
import { post as rspecSharedContextMetadataMatching } from './rspec-shared-context-metadata-matching';
import { post as rustCompileFailDoctestTesting } from './rust-compile-fail-doctest-testing';
import { post as rustTestThreadStateIsolation } from './rust-test-thread-state-isolation';
import { post as goTestShuffleSeedReplay } from './go-test-shuffle-seed-replay';

export const articleFactory1000Batch131Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'rspec-compound-change-matcher-testing',
    post: rspecCompoundChangeMatcherTesting,
  },
  {
    slug: 'rspec-shared-context-metadata-matching',
    post: rspecSharedContextMetadataMatching,
  },
  {
    slug: 'rust-compile-fail-doctest-testing',
    post: rustCompileFailDoctestTesting,
  },
  {
    slug: 'rust-test-thread-state-isolation',
    post: rustTestThreadStateIsolation,
  },
  {
    slug: 'go-test-shuffle-seed-replay',
    post: goTestShuffleSeedReplay,
  },
];
