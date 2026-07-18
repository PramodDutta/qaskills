import type { BlogPost } from './index';

import { post as databaseMigrationRollingDeployCompatibilityGate } from './database-migration-rolling-deploy-compatibility-gate';
import { post as dependencyUpgradeChangelogApiUsageReleaseReview } from './dependency-upgrade-changelog-api-usage-release-review';
import { post as machineVerifiableNoGoReleaseReportJson } from './machine-verifiable-no-go-release-report-json';
import { post as releaseGatesYamlTeamPolicySchema } from './release-gates-yaml-team-policy-schema';
import { post as releaseWaiverOwnershipAcceptanceContract } from './release-waiver-ownership-acceptance-contract';

export const articleFactoryReleasePolicyPosts: Array<{ slug: string; post: BlogPost }> = [
  {
    slug: 'database-migration-rolling-deploy-compatibility-gate',
    post: databaseMigrationRollingDeployCompatibilityGate,
  },
  {
    slug: 'dependency-upgrade-changelog-api-usage-release-review',
    post: dependencyUpgradeChangelogApiUsageReleaseReview,
  },
  {
    slug: 'release-gates-yaml-team-policy-schema',
    post: releaseGatesYamlTeamPolicySchema,
  },
  {
    slug: 'machine-verifiable-no-go-release-report-json',
    post: machineVerifiableNoGoReleaseReportJson,
  },
  {
    slug: 'release-waiver-ownership-acceptance-contract',
    post: releaseWaiverOwnershipAcceptanceContract,
  },
];
