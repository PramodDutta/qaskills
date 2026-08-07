import type { BlogPost } from './index';

import { post as mcpApiTimeoutAbortcontrollerTesting } from './mcp-api-timeout-abortcontroller-testing';
import { post as mcpPackageRegistryVersionDriftTests } from './mcp-package-registry-version-drift-tests';
import { post as mcpSearchFilterSchemaDriftContractTests } from './mcp-search-filter-schema-drift-contract-tests';
import { post as mcpSearchResponseNormalizationContractTests } from './mcp-search-response-normalization-contract-tests';
import { post as seedSkillCatalogParserRegressionTests } from './seed-skill-catalog-parser-regression-tests';

export const articleFactoryMcpCatalogPosts20260725: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mcp-api-timeout-abortcontroller-testing',
    post: mcpApiTimeoutAbortcontrollerTesting,
  },
  {
    slug: 'mcp-search-filter-schema-drift-contract-tests',
    post: mcpSearchFilterSchemaDriftContractTests,
  },
  {
    slug: 'mcp-search-response-normalization-contract-tests',
    post: mcpSearchResponseNormalizationContractTests,
  },
  {
    slug: 'mcp-package-registry-version-drift-tests',
    post: mcpPackageRegistryVersionDriftTests,
  },
  {
    slug: 'seed-skill-catalog-parser-regression-tests',
    post: seedSkillCatalogParserRegressionTests,
  },
];
