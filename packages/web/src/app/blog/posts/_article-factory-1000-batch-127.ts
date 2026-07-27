import type { BlogPost } from './index';

import { post as repositoryMockTransactionBoundaries } from './repository-mock-transaction-boundaries';
import { post as boundaryMutantSurvivalAnalysis } from './boundary-mutant-survival-analysis';
import { post as cargoTestNameFilterSemantics } from './cargo-test-name-filter-semantics';
import { post as requirementsCoverageTraceabilityAudit } from './requirements-coverage-traceability-audit';
import { post as defectReopenRateDenominator } from './defect-reopen-rate-denominator';

export const articleFactory1000Batch127Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'repository-mock-transaction-boundaries',
    post: repositoryMockTransactionBoundaries,
  },
  {
    slug: 'boundary-mutant-survival-analysis',
    post: boundaryMutantSurvivalAnalysis,
  },
  {
    slug: 'cargo-test-name-filter-semantics',
    post: cargoTestNameFilterSemantics,
  },
  {
    slug: 'requirements-coverage-traceability-audit',
    post: requirementsCoverageTraceabilityAudit,
  },
  {
    slug: 'defect-reopen-rate-denominator',
    post: defectReopenRateDenominator,
  },
];
