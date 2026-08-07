import type { BlogPost } from './index';

import { post as lazyNeonDatabaseBuildTesting } from './testing-lazy-neon-database-initialization-nextjs-build';
import { post as typesenseFacetFilterTesting } from './testing-typesense-multiselect-facet-filter-queries';
import { post as postgresqlJsonbFilterTesting } from './testing-postgresql-jsonb-multiselect-filters-drizzle';
import { post as leaderboardCacheConsistencyTesting } from './testing-leaderboard-cache-filter-isolation-ranking-consistency';
import { post as zipArtifactChecksumTesting } from './testing-versioned-zip-artifact-sha256-etag';

export const articleFactoryDataArtifactPosts: Array<{ slug: string; post: BlogPost }> = [
  {
    slug: 'testing-lazy-neon-database-initialization-nextjs-build',
    post: lazyNeonDatabaseBuildTesting,
  },
  {
    slug: 'testing-typesense-multiselect-facet-filter-queries',
    post: typesenseFacetFilterTesting,
  },
  {
    slug: 'testing-postgresql-jsonb-multiselect-filters-drizzle',
    post: postgresqlJsonbFilterTesting,
  },
  {
    slug: 'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    post: leaderboardCacheConsistencyTesting,
  },
  {
    slug: 'testing-versioned-zip-artifact-sha256-etag',
    post: zipArtifactChecksumTesting,
  },
];
