import type { BlogPost } from './index';

import { post as swiftTestingKnownIssueMatching } from './swift-testing-known-issue-matching';
import { post as swiftTestingSerializedTraitScope } from './swift-testing-serialized-trait-scope';
import { post as goldenFileLineEndingPortability } from './golden-file-line-ending-portability';
import { post as hipaaAuditLogEvidenceTesting } from './hipaa-audit-log-evidence-testing';
import { post as idempotencyPropertyTestDesign } from './idempotency-property-test-design';

export const articleFactory1000Batch132Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'swift-testing-known-issue-matching',
    post: swiftTestingKnownIssueMatching,
  },
  {
    slug: 'swift-testing-serialized-trait-scope',
    post: swiftTestingSerializedTraitScope,
  },
  {
    slug: 'golden-file-line-ending-portability',
    post: goldenFileLineEndingPortability,
  },
  {
    slug: 'hipaa-audit-log-evidence-testing',
    post: hipaaAuditLogEvidenceTesting,
  },
  {
    slug: 'idempotency-property-test-design',
    post: idempotencyPropertyTestDesign,
  },
];
