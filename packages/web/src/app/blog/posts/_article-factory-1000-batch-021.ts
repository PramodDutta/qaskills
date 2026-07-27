import type { BlogPost } from './index';

import { post as qaskillsInitValidationErrorAggregation } from './qaskills-init-validation-error-aggregation';
import { post as qaskillsCatalogSlugCollisionAudit } from './qaskills-catalog-slug-collision-audit';
import { post as qaskillsClientUserAgentParity } from './qaskills-client-user-agent-parity';
import { post as qaskillsDuplicatedCatalogIds } from './qaskills-duplicated-catalog-ids';
import { post as qaskillsGithubInstallAttributionFields } from './qaskills-github-install-attribution-fields';

export const articleFactory1000Batch021Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'qaskills-init-validation-error-aggregation',
    post: qaskillsInitValidationErrorAggregation,
  },
  {
    slug: 'qaskills-catalog-slug-collision-audit',
    post: qaskillsCatalogSlugCollisionAudit,
  },
  {
    slug: 'qaskills-client-user-agent-parity',
    post: qaskillsClientUserAgentParity,
  },
  {
    slug: 'qaskills-duplicated-catalog-ids',
    post: qaskillsDuplicatedCatalogIds,
  },
  {
    slug: 'qaskills-github-install-attribution-fields',
    post: qaskillsGithubInstallAttributionFields,
  },
];
