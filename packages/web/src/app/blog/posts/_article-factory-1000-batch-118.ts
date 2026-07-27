import type { BlogPost } from './index';

import { post as prometheusCounterResetAlertTesting } from './prometheus-counter-reset-alert-testing';
import { post as opentelemetrySpanLinkCausalityTesting } from './opentelemetry-span-link-causality-testing';
import { post as soc2ChangeApprovalEvidenceTesting } from './soc2-change-approval-evidence-testing';
import { post as accountLockoutRaceConditionTesting } from './account-lockout-race-condition-testing';
import { post as passwordResetTokenSingleUseTesting } from './password-reset-token-single-use-testing';

export const articleFactory1000Batch118Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'prometheus-counter-reset-alert-testing',
    post: prometheusCounterResetAlertTesting,
  },
  {
    slug: 'opentelemetry-span-link-causality-testing',
    post: opentelemetrySpanLinkCausalityTesting,
  },
  {
    slug: 'soc2-change-approval-evidence-testing',
    post: soc2ChangeApprovalEvidenceTesting,
  },
  {
    slug: 'account-lockout-race-condition-testing',
    post: accountLockoutRaceConditionTesting,
  },
  {
    slug: 'password-reset-token-single-use-testing',
    post: passwordResetTokenSingleUseTesting,
  },
];
