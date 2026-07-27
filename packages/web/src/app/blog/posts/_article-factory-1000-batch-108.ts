import type { BlogPost } from './index';

import { post as retryBudgetExhaustionTesting } from './retry-budget-exhaustion-testing';
import { post as serverlessColdStartBudgetTesting } from './serverless-cold-start-budget-testing';
import { post as alertmanagerDeduplicationFingerprintTesting } from './alertmanager-deduplication-fingerprint-testing';
import { post as androidWorkmanagerRetryBackoffTesting } from './android-workmanager-retry-backoff-testing';
import { post as apiExcessiveDataExposureTesting } from './api-excessive-data-exposure-testing';

export const articleFactory1000Batch108Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'retry-budget-exhaustion-testing',
    post: retryBudgetExhaustionTesting,
  },
  {
    slug: 'serverless-cold-start-budget-testing',
    post: serverlessColdStartBudgetTesting,
  },
  {
    slug: 'alertmanager-deduplication-fingerprint-testing',
    post: alertmanagerDeduplicationFingerprintTesting,
  },
  {
    slug: 'android-workmanager-retry-backoff-testing',
    post: androidWorkmanagerRetryBackoffTesting,
  },
  {
    slug: 'api-excessive-data-exposure-testing',
    post: apiExcessiveDataExposureTesting,
  },
];
