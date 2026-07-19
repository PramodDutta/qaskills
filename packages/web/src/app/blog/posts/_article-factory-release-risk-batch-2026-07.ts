import type { BlogPost } from './index';

import { post as changedLineCoverageDiffHunksGate } from './changed-line-coverage-diff-hunks-gate';
import { post as deletedTestsWeakenedAssertionsReleaseRisk } from './deleted-tests-weakened-assertions-release-risk';
import { post as emptyRelatedTestSetReleaseBlocker } from './empty-related-test-set-release-blocker';
import { post as gitDiffBehaviorRiskBlastRadiusMap } from './git-diff-behavior-risk-blast-radius-map';
import { post as uncoveredChangedLinesBlockerWaiverDebt } from './uncovered-changed-lines-blocker-waiver-debt';

export const articleFactoryReleaseRiskPosts: Array<{ slug: string; post: BlogPost }> = [
  {
    slug: 'empty-related-test-set-release-blocker',
    post: emptyRelatedTestSetReleaseBlocker,
  },
  {
    slug: 'changed-line-coverage-diff-hunks-gate',
    post: changedLineCoverageDiffHunksGate,
  },
  {
    slug: 'uncovered-changed-lines-blocker-waiver-debt',
    post: uncoveredChangedLinesBlockerWaiverDebt,
  },
  {
    slug: 'git-diff-behavior-risk-blast-radius-map',
    post: gitDiffBehaviorRiskBlastRadiusMap,
  },
  {
    slug: 'deleted-tests-weakened-assertions-release-risk',
    post: deletedTestsWeakenedAssertionsReleaseRisk,
  },
];
