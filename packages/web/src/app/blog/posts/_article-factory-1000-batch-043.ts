import type { BlogPost } from './index';

import { post as relatedArticleDeterministicRankingTests } from './related-article-deterministic-ranking-tests';
import { post as publisherProfileOrphanAuthorRecovery } from './publisher-profile-orphan-author-recovery';
import { post as skillPackPublicSliceTests } from './skill-pack-public-slice-tests';
import { post as skillPublishBearerHeaderTests } from './skill-publish-bearer-header-tests';
import { post as unauthorizedReviewFormCopyTests } from './unauthorized-review-form-copy-tests';

export const articleFactory1000Batch043Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'related-article-deterministic-ranking-tests',
    post: relatedArticleDeterministicRankingTests,
  },
  {
    slug: 'publisher-profile-orphan-author-recovery',
    post: publisherProfileOrphanAuthorRecovery,
  },
  {
    slug: 'skill-pack-public-slice-tests',
    post: skillPackPublicSliceTests,
  },
  {
    slug: 'skill-publish-bearer-header-tests',
    post: skillPublishBearerHeaderTests,
  },
  {
    slug: 'unauthorized-review-form-copy-tests',
    post: unauthorizedReviewFormCopyTests,
  },
];
