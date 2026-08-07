import type { BlogPost } from './index';

import { post as clerkWebhookIdempotency } from './testing-clerk-user-created-webhook-idempotency';
import { post as missedClerkWebhookRecovery } from './testing-missed-clerk-webhook-user-recovery';
import { post as hmacUnsubscribeTokenTesting } from './testing-hmac-unsubscribe-token-tampering-expiration';
import { post as batchEmailFailureTesting } from './testing-batch-email-partial-failures-promise-allsettled';
import { post as lazyResendInitializationTesting } from './testing-lazy-resend-initialization-nextjs-build';

export const articleFactoryAuthEmailPosts: Array<{ slug: string; post: BlogPost }> = [
  {
    slug: 'testing-clerk-user-created-webhook-idempotency',
    post: clerkWebhookIdempotency,
  },
  {
    slug: 'testing-missed-clerk-webhook-user-recovery',
    post: missedClerkWebhookRecovery,
  },
  {
    slug: 'testing-hmac-unsubscribe-token-tampering-expiration',
    post: hmacUnsubscribeTokenTesting,
  },
  {
    slug: 'testing-batch-email-partial-failures-promise-allsettled',
    post: batchEmailFailureTesting,
  },
  {
    slug: 'testing-lazy-resend-initialization-nextjs-build',
    post: lazyResendInitializationTesting,
  },
];
