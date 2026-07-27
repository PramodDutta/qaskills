import type { BlogPost } from './index';

import { post as kubernetesAdmissionPolicyBypassTesting } from './kubernetes-admission-policy-bypass-testing';
import { post as kubernetesProbeOrderingTesting } from './kubernetes-probe-ordering-testing';
import { post as kubernetesResourceQuotaRejectionTesting } from './kubernetes-resource-quota-rejection-testing';
import { post as kubernetesSecretMountRotationTesting } from './kubernetes-secret-mount-rotation-testing';
import { post as natPortExhaustionResilienceTesting } from './nat-port-exhaustion-resilience-testing';

export const articleFactory1000Batch116Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'kubernetes-admission-policy-bypass-testing',
    post: kubernetesAdmissionPolicyBypassTesting,
  },
  {
    slug: 'kubernetes-probe-ordering-testing',
    post: kubernetesProbeOrderingTesting,
  },
  {
    slug: 'kubernetes-resource-quota-rejection-testing',
    post: kubernetesResourceQuotaRejectionTesting,
  },
  {
    slug: 'kubernetes-secret-mount-rotation-testing',
    post: kubernetesSecretMountRotationTesting,
  },
  {
    slug: 'nat-port-exhaustion-resilience-testing',
    post: natPortExhaustionResilienceTesting,
  },
];
