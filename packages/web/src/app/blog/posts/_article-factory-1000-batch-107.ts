import type { BlogPost } from './index';

import { post as killSwitchActivationLatencyTesting } from './kill-switch-activation-latency-testing';
import { post as kubernetesDisruptionBudgetEvictionTesting } from './kubernetes-disruption-budget-eviction-testing';
import { post as openapiCallbackUrlContractTesting } from './openapi-callback-url-contract-testing';
import { post as pciLogMaskingVerificationTesting } from './pci-log-masking-verification-testing';
import { post as redisEvictionPolicyDataLossTesting } from './redis-eviction-policy-data-loss-testing';

export const articleFactory1000Batch107Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'kill-switch-activation-latency-testing',
    post: killSwitchActivationLatencyTesting,
  },
  {
    slug: 'kubernetes-disruption-budget-eviction-testing',
    post: kubernetesDisruptionBudgetEvictionTesting,
  },
  {
    slug: 'openapi-callback-url-contract-testing',
    post: openapiCallbackUrlContractTesting,
  },
  {
    slug: 'pci-log-masking-verification-testing',
    post: pciLogMaskingVerificationTesting,
  },
  {
    slug: 'redis-eviction-policy-data-loss-testing',
    post: redisEvictionPolicyDataLossTesting,
  },
];
