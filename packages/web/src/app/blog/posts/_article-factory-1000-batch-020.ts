import type { BlogPost } from './index';

import { post as qaskillsDuplicateSkillInstallCounts } from './qaskills-duplicate-skill-install-counts';
import { post as qaskillsInfoSlugEncodingTests } from './qaskills-info-slug-encoding-tests';
import { post as qaskillsInfoOptionalMetadataOutput } from './qaskills-info-optional-metadata-output';
import { post as qaskillsInitExistingFileOverwrite } from './qaskills-init-existing-file-overwrite';
import { post as qaskillsAgentCatalogOrderContract } from './qaskills-agent-catalog-order-contract';

export const articleFactory1000Batch020Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-duplicate-skill-install-counts',
    post: qaskillsDuplicateSkillInstallCounts,
  },
  {
    slug: 'qaskills-info-slug-encoding-tests',
    post: qaskillsInfoSlugEncodingTests,
  },
  {
    slug: 'qaskills-info-optional-metadata-output',
    post: qaskillsInfoOptionalMetadataOutput,
  },
  {
    slug: 'qaskills-init-existing-file-overwrite',
    post: qaskillsInitExistingFileOverwrite,
  },
  {
    slug: 'qaskills-agent-catalog-order-contract',
    post: qaskillsAgentCatalogOrderContract,
  },
];
