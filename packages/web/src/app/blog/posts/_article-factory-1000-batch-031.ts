import type { BlogPost } from './index';

import { post as denormalizedSkillAuthorSnapshotTests } from './denormalized-skill-author-snapshot-tests';
import { post as directoryActiveFacetRemovalTests } from './directory-active-facet-removal-tests';
import { post as directoryCardAccentFallbackTests } from './directory-card-accent-fallback-tests';
import { post as directoryCardTaxonomyTruncationTests } from './directory-card-taxonomy-truncation-tests';
import { post as directoryEmptyResultRecoveryTests } from './directory-empty-result-recovery-tests';

export const articleFactory1000Batch031Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'denormalized-skill-author-snapshot-tests',
    post: denormalizedSkillAuthorSnapshotTests,
  },
  {
    slug: 'directory-active-facet-removal-tests',
    post: directoryActiveFacetRemovalTests,
  },
  {
    slug: 'directory-card-accent-fallback-tests',
    post: directoryCardAccentFallbackTests,
  },
  {
    slug: 'directory-card-taxonomy-truncation-tests',
    post: directoryCardTaxonomyTruncationTests,
  },
  {
    slug: 'directory-empty-result-recovery-tests',
    post: directoryEmptyResultRecoveryTests,
  },
];
