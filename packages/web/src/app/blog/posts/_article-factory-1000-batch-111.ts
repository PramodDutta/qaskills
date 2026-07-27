import type { BlogPost } from './index';

import { post as liveCaptionAccuracyQaTesting } from './live-caption-accuracy-qa-testing';
import { post as hipaaEmergencyAccessAuditTesting } from './hipaa-emergency-access-audit-testing';
import { post as kafkaTransactionFencingTesting } from './kafka-transaction-fencing-testing';
import { post as kubernetesGracefulTerminationDrainTesting } from './kubernetes-graceful-termination-drain-testing';
import { post as locustWaitTimeDistributionValidation } from './locust-wait-time-distribution-validation';

export const articleFactory1000Batch111Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'live-caption-accuracy-qa-testing',
    post: liveCaptionAccuracyQaTesting,
  },
  {
    slug: 'hipaa-emergency-access-audit-testing',
    post: hipaaEmergencyAccessAuditTesting,
  },
  {
    slug: 'kafka-transaction-fencing-testing',
    post: kafkaTransactionFencingTesting,
  },
  {
    slug: 'kubernetes-graceful-termination-drain-testing',
    post: kubernetesGracefulTerminationDrainTesting,
  },
  {
    slug: 'locust-wait-time-distribution-validation',
    post: locustWaitTimeDistributionValidation,
  },
];
