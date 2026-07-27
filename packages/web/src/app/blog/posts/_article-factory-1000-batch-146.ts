import type { BlogPost } from './index';

import { post as phpunitIncompleteVersusSkippedTests } from './phpunit-incomplete-versus-skipped-tests';
import { post as phpunitOnlymethodsMockBoundaries } from './phpunit-onlymethods-mock-boundaries';
import { post as phpunitProcessIsolationSerialization } from './phpunit-process-isolation-serialization';
import { post as phpunitRiskyOutputDetection } from './phpunit-risky-output-detection';
import { post as phpunitStaticDataProviderRequirements } from './phpunit-static-data-provider-requirements';

export const articleFactory1000Batch146Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'phpunit-incomplete-versus-skipped-tests',
    post: phpunitIncompleteVersusSkippedTests,
  },
  {
    slug: 'phpunit-onlymethods-mock-boundaries',
    post: phpunitOnlymethodsMockBoundaries,
  },
  {
    slug: 'phpunit-process-isolation-serialization',
    post: phpunitProcessIsolationSerialization,
  },
  {
    slug: 'phpunit-risky-output-detection',
    post: phpunitRiskyOutputDetection,
  },
  {
    slug: 'phpunit-static-data-provider-requirements',
    post: phpunitStaticDataProviderRequirements,
  },
];
