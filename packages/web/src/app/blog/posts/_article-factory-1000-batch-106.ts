import type { BlogPost } from './index';

import { post as kubernetesDefaultDenyPolicyTesting } from './kubernetes-default-deny-policy-testing';
import { post as chaosSystemClockSkewTesting } from './chaos-system-clock-skew-testing';
import { post as kubernetesHpaMetricStalenessTesting } from './kubernetes-hpa-metric-staleness-testing';
import { post as kubernetesJobBackoffLimitTesting } from './kubernetes-job-backoff-limit-testing';
import { post as jmeterTransactionControllerTimingTesting } from './jmeter-transaction-controller-timing-testing';

export const articleFactory1000Batch106Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'kubernetes-default-deny-policy-testing',
    post: kubernetesDefaultDenyPolicyTesting,
  },
  {
    slug: 'chaos-system-clock-skew-testing',
    post: chaosSystemClockSkewTesting,
  },
  {
    slug: 'kubernetes-hpa-metric-staleness-testing',
    post: kubernetesHpaMetricStalenessTesting,
  },
  {
    slug: 'kubernetes-job-backoff-limit-testing',
    post: kubernetesJobBackoffLimitTesting,
  },
  {
    slug: 'jmeter-transaction-controller-timing-testing',
    post: jmeterTransactionControllerTimingTesting,
  },
];
