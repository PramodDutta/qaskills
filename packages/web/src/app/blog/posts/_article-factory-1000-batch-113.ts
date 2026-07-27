import type { BlogPost } from './index';

import { post as mobileClockChangeSyncTesting } from './mobile-clock-change-sync-testing';
import { post as mtlsClientCertificateRevocationTesting } from './mtls-client-certificate-revocation-testing';
import { post as androidProcessDeathRestorationTesting } from './android-process-death-restoration-testing';
import { post as apiMassAssignmentAllowlistTesting } from './api-mass-assignment-allowlist-testing';
import { post as oauthDeviceCodePollingAbuseTesting } from './oauth-device-code-polling-abuse-testing';

export const articleFactory1000Batch113Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'mobile-clock-change-sync-testing',
    post: mobileClockChangeSyncTesting,
  },
  {
    slug: 'mtls-client-certificate-revocation-testing',
    post: mtlsClientCertificateRevocationTesting,
  },
  {
    slug: 'android-process-death-restoration-testing',
    post: androidProcessDeathRestorationTesting,
  },
  {
    slug: 'api-mass-assignment-allowlist-testing',
    post: apiMassAssignmentAllowlistTesting,
  },
  {
    slug: 'oauth-device-code-polling-abuse-testing',
    post: oauthDeviceCodePollingAbuseTesting,
  },
];
