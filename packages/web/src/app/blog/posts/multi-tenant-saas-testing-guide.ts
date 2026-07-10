import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Multi-Tenant SaaS Testing Guide',
  description:
    'Design multi-tenant SaaS testing for tenant isolation, org switching, permissions, data leakage checks, and safer shared-platform releases at scale.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Multi-Tenant SaaS Testing Guide

The most expensive SaaS bug is often a quiet one: a user changes the organization switcher, the page refreshes correctly, but a background request still uses the previous tenant id and returns another customer's data. No crash, no obvious UI failure, just a broken trust boundary. Multi-tenant testing has to treat tenant context as a security and correctness primitive, not as another filter on a list page.

This guide covers tenant isolation, organization switching, permissions, data setup, cross-tenant negative checks, and release gates for shared SaaS platforms. It is written for teams with real roles, shared services, background jobs, search indexes, and billing integrations. For service-level strategy that overlaps with tenant boundaries, read [microservices testing strategies](/blog/microservices-testing-strategies). For the data side of isolation, seed design, and cleanup, pair this with [test data management strategies](/blog/test-data-management-strategies).

## Tenant Context Is a Test Fixture, Not a Header

Most SaaS stacks carry tenant context through several layers: authentication claims, organization membership, URL segments, request headers, database rows, object storage paths, cache keys, search filters, and audit events. A test that only adds \`X-Tenant-Id\` to an API call does not represent the real risk. The risk is disagreement between layers.

A useful fixture creates at least two tenants with similar data shapes. If tenant A has invoices and tenant B has no invoices, a leak may look like an empty state bug. Make the data intentionally confusable: same project names, similar user names, adjacent dates, and different internal ids.

| Layer | Tenant-specific signal | Leak pattern to test |
|---|---|---|
| Auth | User belongs to org A, not org B | Token can request org B by changing a parameter |
| API | Route or header contains tenant id | Handler trusts client tenant over membership |
| Database | Rows include \`tenant_id\` or org id | Query misses tenant predicate |
| Cache | Key includes tenant id | Cached response from org A served in org B |
| Search | Index filter includes tenant | Global search result crosses org boundary |
| Files | Object path or metadata includes tenant | Signed URL exposes another tenant's file |

Treat tenant fixture construction as production code. A sloppy fixture gives false confidence because it cannot reveal the bug you care about.

## API Isolation Tests With Real Memberships

Start at the API layer because it is where tenant violations are easiest to assert precisely. The example below uses Playwright's APIRequestContext to create two authenticated contexts. The first user belongs to Acme only. The second tenant, Beta, owns a project with the same visible name.

\`\`\`typescript
import { test, expect, request } from '@playwright/test';

test('an Acme member cannot read a Beta project by id', async () => {
  const acmeUser = await request.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      Authorization: 'Bearer ' + process.env.ACME_MEMBER_TOKEN,
    },
  });

  const betaProjectId = process.env.BETA_PROJECT_ID;

  const response = await acmeUser.get('/api/orgs/beta/projects/' + betaProjectId);

  expect(response.status()).toBe(403);
  await expect(response).not.toBeOK();
});

test('project search returns only the active organization results', async () => {
  const acmeUser = await request.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      Authorization: 'Bearer ' + process.env.ACME_MEMBER_TOKEN,
    },
  });

  const response = await acmeUser.get('/api/orgs/acme/projects', {
    params: { q: 'Roadmap' },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();

  expect(body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ tenantSlug: 'acme', name: 'Roadmap' }),
    ])
  );
  expect(body.items).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ tenantSlug: 'beta' }),
    ])
  );
});
\`\`\`

The negative test is more important than the happy path. A user who can read their own tenant data tells you little. A user who cannot read another tenant's record by id tells you the boundary held at least once. Repeat this pattern for update, delete, export, search, and file download endpoints.

## Organization Switching Is a State Machine

The org switcher looks like a small UI feature, but it is a state machine with security consequences. Switching tenants should update route state, server session context, client cache scope, feature flags, permissions, analytics context, and any open real-time subscriptions. Testing only the visible dropdown misses the hidden state.

The most common org-switching bugs:

| Transition | Hidden failure | Test observation |
|---|---|---|
| Org A -> Org B | Client cache still shows A records | Network response or UI contains A ids |
| Org with admin role -> org with viewer role | Privileged action remains enabled | Button exists or API permits mutation |
| Trial tenant -> paid tenant | Billing banner persists incorrectly | Billing component uses old tenant state |
| Tenant with feature flag -> tenant without flag | Flagged navigation remains visible | Route can be opened after switch |
| Open WebSocket in A -> switch to B | Events from A continue updating UI | Live update inserts wrong tenant item |

Use a UI test when the risk involves browser state. The test below checks both visible data and network calls after a tenant switch.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('switching organizations clears tenant-scoped project data', async ({ page }) => {
  await page.goto('/login/test-user-with-two-orgs');
  await page.goto('/app/acme/projects');

  await expect(page.getByTestId('project-row')).toContainText('Acme Roadmap');

  const projectResponses: string[] = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/orgs/') && response.url().includes('/projects')) {
      projectResponses.push(response.url());
    }
  });

  await page.getByRole('button', { name: 'Switch organization' }).click();
  await page.getByRole('menuitem', { name: 'Beta Labs' }).click();

  await expect(page).toHaveURL(/\\/app\\/beta\\/projects/);
  await expect(page.getByTestId('project-row')).toContainText('Beta Roadmap');
  await expect(page.getByText('Acme Roadmap')).toHaveCount(0);

  expect(projectResponses.every((url) => url.includes('/api/orgs/beta/'))).toBe(true);
});
\`\`\`

If your client uses React Query, Apollo, SWR, or another cache, include tests that inspect cache invalidation indirectly through UI and network behavior. The exact cache library is less important than proving tenant-scoped data cannot survive a context switch.

## Database Isolation and Row-Level Security

Application checks are necessary, but database constraints give you another layer. Some SaaS systems use separate databases per tenant, some use separate schemas, and many use shared tables with a tenant column. Shared tables are efficient, but every query must honor the tenant predicate. PostgreSQL row-level security can make that predicate harder to forget.

\`\`\`sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_invoice_isolation ON invoices
USING (tenant_id = current_setting('app.current_tenant')::uuid);

BEGIN;
SET LOCAL app.current_tenant = '11111111-1111-1111-1111-111111111111';

SELECT id, tenant_id, total_cents
FROM invoices
WHERE id = '22222222-2222-2222-2222-222222222222';

ROLLBACK;
\`\`\`

That query should return no rows when the invoice belongs to another tenant. Add migration tests for policies, not only application tests. A new table that stores tenant-owned data should fail review if it lacks a tenant column or a policy strategy.

RLS is not free. It requires careful connection handling because session settings can leak through pooled connections if you set them incorrectly. Tests should verify that the tenant setting is applied per transaction or request and reset when the connection returns to the pool.

## Permissions Across Tenants

Roles are tenant-scoped in most serious SaaS products. A user can be an admin in one organization and a viewer in another. Tests need to cover that matrix. Avoid a single "admin user" fixture because it hides cross-tenant permission errors.

Design a compact permission matrix:

| User | Tenant | Role | Should be able to | Should be denied |
|---|---|---|---|---|
| Priya | Acme | Owner | Billing changes, user invites | None within Acme owner scope |
| Priya | Beta | Viewer | Read dashboards | Invite user, delete project |
| Mateo | Acme | Support agent | Read support-safe fields | Export billing data |
| External auditor | Acme | Auditor | Download compliance report | Create project |

Then test the transitions. Logging in as Priya and switching from Acme to Beta should reduce permissions immediately. If the UI hides a delete button but the API still accepts the delete, the boundary is not enforced. Permission tests must hit the API directly as well as the UI.

## Background Jobs and Async Leaks

Tenant bugs are not limited to request-response paths. Background jobs process emails, exports, billing syncs, webhooks, and search indexing. These jobs often run outside the user's session, so they must carry tenant context explicitly.

Test async boundaries with correlation ids and tenant ids. When an export job is queued for Acme, the worker should read Acme records only, write the export under an Acme storage prefix, and send the notification to Acme members. A leak in any of those steps may not show up in the initiating API response.

Good async assertions include:

| Job type | Isolation check |
|---|---|
| CSV export | File contains only tenant rows and signed URL path includes tenant scope |
| Email digest | Recipient list comes from the same tenant as the digest data |
| Search indexing | Indexed documents include tenant filter and cannot be searched globally |
| Billing sync | External customer id maps to one tenant and cannot be reused silently |
| Webhook processor | Incoming event is matched to tenant before mutation |

When possible, assert the worker's output, not just that the job completed. A completed job that wrote the wrong tenant's file is worse than a failed job.

## Release Gates for Tenant Safety

Multi-tenant testing should have explicit release gates. At minimum, keep a small set of isolation tests in the pull request pipeline: direct object access, org switching, permission downgrade, tenant-scoped search, and one async job. Run broader matrix tests nightly with more roles and data shapes.

The release checklist should ask whether a change introduced any new tenant-owned table, cache key, index, storage path, webhook mapping, or background job. If yes, require a test that proves tenant context is carried through that surface. This is not bureaucracy. It is how you keep multi-tenant risk visible when product work moves fast.

## Observability for Tenant Boundary Failures

Tenant isolation tests become easier to debug when every request carries tenant context in logs and traces. The application should log authenticated user id, active tenant id, route tenant id, authorization decision, and request id for sensitive operations. Do not log secret data, but do log enough context to explain why access was allowed or denied.

For denied cross-tenant attempts, tests can assert both the response and the security event. That event should not include the forbidden object's contents. It should include the actor, requested tenant, resolved memberships, endpoint, and reason. This gives security teams useful evidence without creating another leakage path.

Observability also catches mismatched context. If a request route says \`/orgs/beta\` but the auth session says active tenant Acme, the application should either reject the request or perform a deliberate switch flow. Tests can look for a clear error code and a log event. Silent correction is risky because it can hide confused deputy bugs.

For background jobs, include tenant id in job payloads, worker logs, and output metadata. A failed export should say which tenant it belonged to. A successful digest should record which tenant's users received it. Without those traces, async tenant bugs are painful to investigate because the initiating request has already ended.

Make these fields searchable in staging. During a failed isolation test, the fastest path to root cause is usually a request id that shows route tenant, auth tenant, and database tenant side by side. If the logs require manual stitching across three tools, engineers will debug by guesswork.

Dashboards can reinforce the same habit. Track denied cross-tenant attempts, tenant context mismatches, and missing tenant ids in background jobs. These are not vanity metrics. They show whether the platform is preserving context consistently as new teams add endpoints and workers.

## Caches, Search, and Files Need Separate Proof

Many tenant leaks do not come from the primary database query. They come from secondary systems that were added for speed or convenience. Cache keys miss the tenant id. Search indexes store tenant id but one endpoint forgets to apply the filter. File previews are protected in the UI but signed URLs remain valid across organizations. These surfaces need their own tests because the failure mode is different from a SQL predicate.

For caches, test same-key collisions. Create the same dashboard name in two tenants, request tenant A first, then request tenant B with the same user session after switching. If tenant B receives tenant A's cached payload, the UI may look plausible because the names match. Include hidden identifiers in test assertions, not only visible labels. An internal project id or tenant slug in the API body can reveal the leak.

For search, test both positive and negative results. A query for \`Roadmap\` should find Acme's Roadmap when the active tenant is Acme and should not include Beta's Roadmap even if the index ranks it higher. If the search service supports filters, assert the outgoing filter in integration tests or capture it through a test double around the search client. Search bugs are common after teams add global command palettes because product wants "search everything" and engineers forget that "everything" still means "everything this user can access."

For files, test the URL lifecycle. A user in tenant A should not be able to download a tenant B file by guessing the id, reusing a signed URL from another session, or opening a preview after losing membership. If signed URLs are intentionally bearer-style links, shorten their lifetime and make sure the issuing endpoint enforces tenant access before creating them. The test should call the issuing endpoint and the final storage URL if the architecture allows it.

Audit logs deserve attention too. A leaked read may not mutate data, but the audit trail should still show who accessed sensitive resources. Tests can verify that denied cross-tenant attempts create security events without exposing the forbidden object. That gives support and security teams evidence when a real incident is investigated.

The pattern across these systems is the same: create two tenants with confusable assets, exercise the secondary path, and assert both returned data and denied access. Do not assume that passing API controller tests proves cache, search, and file safety. They are separate boundaries.

## Frequently Asked Questions

### Is separate database per tenant easier to test than shared tables?

It simplifies some query isolation checks, but it adds provisioning, migration, backup, and cross-tenant operations complexity. You still need tests for auth membership, org switching, permissions, caches, files, and jobs. The database model changes the risk, not the need for tenant tests.

### Should tenant ids be accepted from request headers?

Only when the server verifies the authenticated user belongs to that tenant and the route design intentionally uses a header. Never trust a client-supplied tenant id as authorization. Tests should mutate the tenant id and expect denial.

### How do I make tenant leak tests reliable?

Use two tenants with deliberately similar data, fixed ids, and known memberships. Avoid random empty tenants. Leaks are easiest to catch when the wrong data would be visible and recognizable.

### Do UI tests add value if API isolation tests already exist?

Yes. UI tests catch client cache, org switcher, route, and real-time subscription bugs that API tests do not see. Keep them fewer and focused on browser state transitions rather than repeating every API permission case.

### What is the first tenant test to add to an existing SaaS product?

Add a direct object access test: authenticate as a user in tenant A and request a known object id from tenant B. Run it against read and update endpoints. That single pattern catches many missing tenant predicates and broken membership checks.
`,
};
