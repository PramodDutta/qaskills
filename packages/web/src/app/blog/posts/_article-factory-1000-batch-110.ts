import type { BlogPost } from './index';

import { post as dnsNegativeCacheTtlTesting } from './dns-negative-cache-ttl-testing';
import { post as gdprErasureBackupPropagationTesting } from './gdpr-erasure-backup-propagation-testing';
import { post as githubActionsOidcClaimTesting } from './github-actions-oidc-claim-testing';
import { post as grpcHealthTransitionTesting } from './grpc-health-transition-testing';
import { post as kubernetesTopologySpreadTesting } from './kubernetes-topology-spread-testing';

export const articleFactory1000Batch110Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'dns-negative-cache-ttl-testing',
    post: dnsNegativeCacheTtlTesting,
  },
  {
    slug: 'gdpr-erasure-backup-propagation-testing',
    post: gdprErasureBackupPropagationTesting,
  },
  {
    slug: 'github-actions-oidc-claim-testing',
    post: githubActionsOidcClaimTesting,
  },
  {
    slug: 'grpc-health-transition-testing',
    post: grpcHealthTransitionTesting,
  },
  {
    slug: 'kubernetes-topology-spread-testing',
    post: kubernetesTopologySpreadTesting,
  },
];
