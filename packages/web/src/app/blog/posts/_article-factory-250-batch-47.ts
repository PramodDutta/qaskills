import type { BlogPost } from './index';

import { post as forcedColorsVisualAccessibilityTesting } from './forced-colors-visual-accessibility-testing';
import { post as hermeticTestRandomSeedControl } from './hermetic-test-random-seed-control';
import { post as jestBailExitCodeTesting } from './jest-bail-exit-code-testing';
import { post as jmeterCorrelationExtractorFailureTesting } from './jmeter-correlation-extractor-failure-testing';
import { post as k6ScenarioGracefulStopTesting } from './k6-scenario-graceful-stop-testing';

export const articleFactory250Batch47Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'forced-colors-visual-accessibility-testing',
    post: forcedColorsVisualAccessibilityTesting,
  },
  {
    slug: 'hermetic-test-random-seed-control',
    post: hermeticTestRandomSeedControl,
  },
  {
    slug: 'jest-bail-exit-code-testing',
    post: jestBailExitCodeTesting,
  },
  {
    slug: 'jmeter-correlation-extractor-failure-testing',
    post: jmeterCorrelationExtractorFailureTesting,
  },
  {
    slug: 'k6-scenario-graceful-stop-testing',
    post: k6ScenarioGracefulStopTesting,
  },
];
