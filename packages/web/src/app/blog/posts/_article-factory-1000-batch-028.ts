import type { BlogPost } from './index';

import { post as canonicalSkillMetadataSerializationTests } from './canonical-skill-metadata-serialization-tests';
import { post as userIdentityUniquenessMigrationTests } from './user-identity-uniqueness-migration-tests';
import { post as clerkHeaderLazyImportStateTests } from './clerk-header-lazy-import-state-tests';
import { post as clerkHeaderSignedOutLinkTests } from './clerk-header-signed-out-link-tests';
import { post as cloneAuthDisabledLinkTests } from './clone-auth-disabled-link-tests';

export const articleFactory1000Batch028Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'canonical-skill-metadata-serialization-tests',
    post: canonicalSkillMetadataSerializationTests,
  },
  {
    slug: 'user-identity-uniqueness-migration-tests',
    post: userIdentityUniquenessMigrationTests,
  },
  {
    slug: 'clerk-header-lazy-import-state-tests',
    post: clerkHeaderLazyImportStateTests,
  },
  {
    slug: 'clerk-header-signed-out-link-tests',
    post: clerkHeaderSignedOutLinkTests,
  },
  {
    slug: 'clone-auth-disabled-link-tests',
    post: cloneAuthDisabledLinkTests,
  },
];
