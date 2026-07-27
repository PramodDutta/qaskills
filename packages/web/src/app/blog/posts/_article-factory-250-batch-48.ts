import type { BlogPost } from './index';

import { post as apiHeadGetMetadataParity } from './api-head-get-metadata-parity';
import { post as appiumW3cGestureCoordinateTesting } from './appium-w3c-gesture-coordinate-testing';
import { post as mobilePermissionStateMatrixTesting } from './mobile-permission-state-matrix-testing';
import { post as newmanBailPartialReportTesting } from './newman-bail-partial-report-testing';
import { post as pactMatchingRuleOverbreadthTesting } from './pact-matching-rule-overbreadth-testing';

export const articleFactory250Batch48Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mobile-permission-state-matrix-testing',
    post: mobilePermissionStateMatrixTesting,
  },
  {
    slug: 'appium-w3c-gesture-coordinate-testing',
    post: appiumW3cGestureCoordinateTesting,
  },
  {
    slug: 'newman-bail-partial-report-testing',
    post: newmanBailPartialReportTesting,
  },
  {
    slug: 'api-head-get-metadata-parity',
    post: apiHeadGetMetadataParity,
  },
  {
    slug: 'pact-matching-rule-overbreadth-testing',
    post: pactMatchingRuleOverbreadthTesting,
  },
];
