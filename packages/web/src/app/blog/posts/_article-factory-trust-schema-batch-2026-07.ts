import type { BlogPost } from './index';

import { post as bindReleaseEvidenceToHeadSha } from './bind-release-evidence-to-head-sha';
import { post as maxDiffLinesReleaseAnalysisGate } from './max-diff-lines-release-analysis-gate';
import { post as aiReleaseGuardianHumanControlBoundary } from './ai-release-guardian-human-control-boundary';
import { post as schemaAuthorityDdlOrmOpenapiTypesTestData } from './schema-authority-ddl-orm-openapi-types-test-data';
import { post as constraintFieldMapBeforeTestDataGeneration } from './constraint-field-map-before-test-data-generation';

export const articleFactoryTrustSchemaPosts: Array<{ slug: string; post: BlogPost }> = [
  { slug: 'bind-release-evidence-to-head-sha', post: bindReleaseEvidenceToHeadSha },
  {
    slug: 'max-diff-lines-release-analysis-gate',
    post: maxDiffLinesReleaseAnalysisGate,
  },
  {
    slug: 'ai-release-guardian-human-control-boundary',
    post: aiReleaseGuardianHumanControlBoundary,
  },
  {
    slug: 'schema-authority-ddl-orm-openapi-types-test-data',
    post: schemaAuthorityDdlOrmOpenapiTypesTestData,
  },
  {
    slug: 'constraint-field-map-before-test-data-generation',
    post: constraintFieldMapBeforeTestDataGeneration,
  },
];
