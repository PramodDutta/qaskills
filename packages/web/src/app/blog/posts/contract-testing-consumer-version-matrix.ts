import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Contract Testing Consumer Version Matrix: A Release-Safe Workflow',
  description: 'Build a contract testing consumer version matrix that maps active releases, verification results, and deployment risk so API changes ship without surprises.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# Contract Testing Consumer Version Matrix: A Release-Safe Workflow

A contract testing consumer version matrix is a release decision table that connects consumer versions, provider versions, environments, and contract verification results. Its purpose is not to prove that every version ever built works with every other version. Its purpose is to answer a narrower, operational question: can this specific application version be deployed without breaking consumers that are currently active or about to become active?

The useful matrix is assembled from published contracts, provider verification results, version-control identifiers, deployment records, and a support policy. When those inputs are trustworthy, a team can change an API without relying on a synchronized release or an optimistic newest-versus-newest test. This guide builds that workflow with Pact concepts, but the reasoning applies to any consumer-driven contract system.

## Model the matrix as evidence, not a spreadsheet of guesses

The rows of the matrix represent consumer application versions. The columns represent provider application versions or provider candidates. Each cell contains evidence that the provider satisfied the contract published by that consumer version. A green cell without a traceable contract revision and verification run is only decoration.

Start with four identities that teams often collapse into one:

| Identity | Example | What it tells the release gate |
|---|---|---|
| Consumer application | checkout-web | Who expresses the expectation |
| Consumer version | Git commit 8f31c2a | Which code produced the contract |
| Provider application | customer-api | Who must satisfy the expectation |
| Provider version | Git commit 1d9b740 | Which implementation was verified |

A branch name is useful metadata, but it is a poor immutable version. A branch moves. A build number may be immutable within one CI system but meaningless in another. A full commit SHA, release artifact digest, or another organization-wide immutable identifier gives verification results a stable subject.

The matrix also needs lifecycle state. A consumer version can be built but never deployed, deployed to test, active in production, superseded, or still supported on long-lived mobile devices. Those states determine whether its contract should block a provider release.

| Consumer state | Include in provider gate? | Reason |
|---|---:|---|
| Current production deployment | Yes | It can send traffic immediately after provider rollout |
| Pending production release | Usually | Either side may deploy first |
| Staging only | Policy-dependent | It may represent near-term demand, not current production risk |
| Abandoned feature branch | No | Experimental expectations should not freeze the provider |
| Supported mobile release | Yes | Installed clients remain active beyond server release cycles |
| Retired version with no traffic | No | Historical evidence should not become permanent baggage |

This is the first thing people get wrong: they turn contract testing into all-pairs compatibility. That creates an ever-growing grid, discourages contract publication, and eventually teaches teams to ignore red cells. The correct scope is versions with a plausible interaction during the release and rollback window.

## Define the deployment question before collecting results

Write the release question in concrete terms. For example: “Can customer-api version P42 deploy to production while checkout-web C17 and mobile-checkout C9 are active, and while checkout-web C18 may deploy next?” That sentence determines the rows that matter.

For a rolling provider release, both the old and new provider can serve requests for a period. For an independently deployed consumer, either old or new consumer can call either provider replica during its rollout. The minimum overlap matrix is therefore often two by two:

| Consumer | Provider P41, current | Provider P42, candidate | Required conclusion |
|---|---:|---:|---|
| C17, current | Previously known | Verify now | Existing consumer survives provider rollout |
| C18, candidate | Verify if C18 can ship first | Verify now | Both deployment orders remain safe |

If the provider deployment can be rolled back after a new consumer is live, C18 against P41 is not optional. A team that verifies only C17 against P42 proves forward rollout but not rollback. The rollback path is part of the compatibility surface.

Create a small policy document in the repository so the gate is reproducible:

\`\`\`yaml
releasePolicy:
  provider: customer-api
  environments:
    - production
  includeConsumers:
    - currentlyDeployed
    - pendingProduction
    - supportedMobile
  rollbackWindowHours: 24
  versionIdentity: gitCommit
\`\`\`

This YAML is an illustrative team policy, not a Pact configuration file. Its value is the explicit decision rule. Your CI code or release service can translate the policy into broker queries and deployment checks supported by your chosen tooling.

## Publish contracts with immutable versions and useful branch context

A consumer pipeline should generate its contract from executable tests, publish it under an immutable consumer version, and attach branch context when the broker supports it. Do not publish every run as \`latest\`. That loses the link between a contract and the code that generated it.

The consumer test itself should capture behavior the consumer truly depends on. This simplified TypeScript example uses Pact-style interaction concepts without assuming a particular package release:

\`\`\`ts
const interaction = {
  state: 'customer 101 has an active account',
  uponReceiving: 'a request for the checkout customer summary',
  withRequest: {
    method: 'GET',
    path: '/customers/101/summary'
  },
  willRespondWith: {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: '101',
      status: 'active',
      creditLimitCents: 50000
    }
  }
};
\`\`\`

The consumer version should come from CI's checked-out revision, not from the current wall-clock time. In a portable shell step, validate that the value exists before publication:

\`\`\`bash
set -eu

consumer_version="$(git rev-parse HEAD)"
test -n "$consumer_version"

echo "Publishing checkout-web contract for $consumer_version"
# Invoke the documented publish command for your Pact client or broker here.
\`\`\`

Avoid copying credentials into the script or printing them during debugging. Provide broker authentication through the CI secret mechanism and keep command logging from exposing secret values.

Branch metadata and tags answer different questions from versions. The immutable version says which artifact produced the contract. A branch says where development occurred. An environment or deployment record says whether that application version is actually running. Treating a \`prod\` label as if it were a verification result mixes facts and makes stale labels dangerous.

## Verify the provider against the contracts that can affect deployment

Provider verification replays consumer expectations against the provider implementation. Each provider state must establish deterministic data, the request must reach production-representative routing and validation, and the response must be compared using the contract rules.

Provider state setup should be explicit and idempotent. A state handler can insert a known record, call an internal fixture API, or configure a test double for a downstream dependency. It should not depend on whatever data a shared environment happens to contain.

\`\`\`ts
type CustomerFixture = {
  id: string;
  status: 'active' | 'suspended';
  creditLimitCents: number;
};

async function establishActiveCustomer(): Promise<void> {
  const fixture: CustomerFixture = {
    id: '101',
    status: 'active',
    creditLimitCents: 50000
  };

  await customerRepository.upsert(fixture);
}
\`\`\`

Keep setup separate from the endpoint under verification. Calling the public endpoint to create the same state can entangle two contracts and produce misleading failures. After verification, publish the result against both immutable application versions. A result tied only to a provider branch cannot prove that the production artifact was tested.

| Verification input | Weak form | Release-grade form |
|---|---|---|
| Consumer identity | File name from workspace | Published consumer application and immutable version |
| Provider identity | Branch name | Immutable provider artifact revision |
| State | Shared test data | Deterministic state handler |
| Endpoint | Mocked controller method | Running provider boundary with real serialization |
| Result | CI job passed | Result published and linked to exact contract revision |
| Selection | Every historical contract | Deployed, pending, and policy-relevant contracts |

For teams new to consumer contract creation, the broader [contract testing with Pact guide](/blog/contract-testing-pact-complete-guide) explains interaction design and provider states. The version matrix discussed here begins where basic contract authoring ends: deciding which verified relationships make a deployment safe.

## Compute a deployability decision from active relationships

The deployability check should query facts rather than recalculate a matrix from filenames in a repository. At decision time, gather:

1. The exact candidate application version.
2. Consumer versions recorded as deployed in the target environment.
3. Pending versions covered by the release policy.
4. The latest relevant contract revision for each consumer version.
5. A successful provider verification for that exact contract content and provider version.

Represent the normalized evidence as data that a release job can explain:

\`\`\`ts
type MatrixCell = {
  consumer: string;
  consumerVersion: string;
  provider: string;
  providerVersion: string;
  contractRevision: string;
  verified: boolean;
  relevantBecause: 'deployed' | 'pending' | 'supported-mobile';
};

function deploymentAllowed(cells: MatrixCell[]): boolean {
  return cells.length > 0 && cells.every((cell) => cell.verified);
}
\`\`\`

The \`cells.length > 0\` guard matters. An empty selection is not proof of compatibility. It usually means metadata is missing, the query is wrong, or no consumer deployments have been recorded. Fail closed for a mature service unless the provider is explicitly classified as having no consumers.

The release output should show the selected cells. A bare “cannot deploy” message sends engineers hunting through broker pages. A useful report identifies consumer, version, contract revision, missing or failed verification, and why that row was considered active.

\`\`\`json
{
  "candidate": "customer-api@1d9b740",
  "environment": "production",
  "decision": "blocked",
  "blockingCells": [
    {
      "consumer": "mobile-checkout",
      "consumerVersion": "release-9-artifact-digest",
      "contractRevision": "contract-content-digest",
      "reason": "no successful verification for candidate provider"
    }
  ]
}
\`\`\`

This explanation is also valuable to an AI coding agent. Give the agent the normalized evidence and relevant source files, not only a screenshot of a red UI cell. It can then locate the interaction, provider state, and response mapper without hallucinating which consumer failed.

## Distinguish four release patterns that change the matrix

The same API can require a different matrix depending on deployment topology. A single generic “compatibility check” hides these operational differences.

| Release pattern | Versions that overlap | Matrix implication |
|---|---|---|
| Atomic web deployment | Current and candidate briefly | Usually current/candidate pairs plus rollback |
| Rolling provider deployment | Old and new provider replicas | Candidate consumers may encounter both providers |
| Mobile consumer | Many installed consumer releases | Gate against supported or observed-active releases |
| Event-driven integration | Producers, consumers, queued messages | Include message age and replay window in relevance |

For mobile applications, “currently deployed” is not one version in an app store. It is the set of versions that devices still run. Analytics can inform support policy, but avoid sending personal device identifiers to the contract broker. Publish or record aggregate version activity and define an explicit minimum supported release.

Event contracts add time. A consumer deployed today may read an event produced days ago. A provider or producer rollback can also reintroduce old payloads. The matrix must cover versions that can be connected through retained messages, not just simultaneous deployments.

An API gateway can further complicate identity. If transformation, defaulting, or field removal occurs at the gateway, verification that bypasses it may prove the wrong system. Decide whether the provider boundary includes the gateway and keep the verified topology aligned with production.

## Diagnose a green matrix that still breaks production

Consider a failure: customer-api P42 passes all displayed contracts, deploys, and mobile-checkout C9 begins rejecting responses because \`status: pending_review\` is unknown. The matrix appeared green.

Work through the evidence in this order:

1. Confirm C9 is actually active and included by policy.
2. Find the exact contract content published by C9's artifact.
3. Determine whether its interaction constrained \`status\` or merely used one example.
4. Confirm P42 verification ran after the contract revision and against the deployed artifact.
5. Inspect whether matching rules permitted any string while consumer code used an exhaustive enum.
6. Reproduce the consumer parser with the production response.

The likely issue is not “Pact missed a bug.” The contract did not express the consumer's closed set assumption. A matcher that accepts any string can be correct for an open string field but wrong for consumer code that crashes on an unfamiliar value.

Add a focused consumer test for the parser:

\`\`\`ts
type KnownStatus = 'active' | 'suspended';

function parseStatus(value: string): KnownStatus {
  if (value === 'active' || value === 'suspended') return value;
  throw new Error(\`Unsupported customer status: \${value}\`);
}

expect(() => parseStatus('pending_review')).toThrow(
  'Unsupported customer status: pending_review'
);
\`\`\`

Now make a product decision. Either the field is a closed enum that the provider must not extend without coordination, or the consumer must implement an unknown fallback. Update the contract to reflect that decision. Do not simply broaden the matcher to make verification green.

Another common cause is stale verification. Contract C9-R2 may have passed against P42, then C9-R3 was published with a new required field. If the UI rolls results up only by consumer and provider application name, the old success can look current. The gate must bind success to contract content or revision, not only application versions.

## Keep endpoint tests beside the matrix, not inside it

Contract verification proves expectations at an integration boundary. It does not replace authorization testing, malformed-input coverage, race-condition testing, or an endpoint's internal business rules. Keep a smaller API test layer for behavior owned by the provider.

For example, a Supertest test can prove that an unauthorized request remains rejected independently of any particular consumer expectation:

\`\`\`ts
import request from 'supertest';
import { app } from '../src/app';

it('rejects a customer summary request without credentials', async () => {
  await request(app)
    .get('/customers/101/summary')
    .expect(401);
});
\`\`\`

The [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) covers this provider-owned test layer in detail. Use endpoint tests to establish local correctness and contracts to establish cross-team compatibility. Duplicating every endpoint assertion into every consumer contract produces brittle contracts and unclear ownership.

## Make the release gate observable and resistant to metadata drift

Matrix failures are often metadata failures. The code can be compatible while deployment recording points to the wrong version, a verification job publishes under a shortened commit, or a rebuilt artifact reuses a human release label.

Add invariants to CI:

| Invariant | Detection | Response |
|---|---|---|
| Build and verification use the same provider revision | Compare checked-out SHA and artifact metadata | Stop before publishing result |
| Contract publication has a nonempty immutable version | Validate CI revision input | Fail consumer job |
| Production deployment records exact artifact | Compare deploy manifest and record | Mark deployment only after rollout succeeds |
| Result refers to current contract revision | Query by contract content/revision | Reverify instead of trusting old green state |
| Active consumer set is nonempty when expected | Monitor selection count | Treat sudden zero as metadata incident |

A scheduled reconciliation job can compare deployment records with the platform actually serving traffic. This is especially important when emergency changes bypass the standard pipeline. Reconciliation should report drift, not silently rewrite history without audit information.

Record timing metrics such as contract publication to verification latency, number of active consumer versions, and blocked deployment age. These help distinguish a real compatibility negotiation from a slow or broken pipeline. Avoid rewarding teams for “green percentage,” which encourages weak contracts and excluded consumers.

## Give AI coding agents a bounded matrix task

An AI agent can help update state handlers, add consumer parser cases, summarize failed cells, or propose a compatibility-preserving rollout. It should not decide which production consumers are supported without policy input.

A strong task packet includes:

\`\`\`text
Goal: make customer-api P42 satisfy mobile-checkout C9 contract revision R3.
Evidence: response field status received pending_review; C9 accepts active or suspended.
Constraints: do not weaken unrelated matchers; keep P41 rollback possible for 24 hours.
Files: failing interaction, consumer parser, provider response mapper, state handler.
Acceptance: consumer test passes, provider verification passes, matrix shows the exact revisions.
\`\`\`

Ask the agent to explain whether the proposed change belongs to the consumer, provider, or rollout sequence. Review generated contract changes carefully. Agents often optimize for a passing test by widening a matcher, removing an assertion, or mocking the behavior under test. A green matrix is valuable only if its contracts continue to represent real dependencies.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a team wants a repeatable agent workflow, but the skill should consume your release policy and broker evidence rather than inventing them.

## Roll out the matrix without freezing delivery

Introduce the system in stages. First, choose one consumer-provider pair and establish immutable identities. Second, publish consumer contracts and deterministic provider results without blocking releases. Third, compare matrix decisions with human release decisions for several cycles. Fourth, fix missing metadata and flaky states. Only then enable a production gate.

Use a time-bounded exception process for an unavailable broker or a proven metadata incident. An exception should name the candidate artifact, affected consumers, compensating evidence, approver, and expiration. “Skip contracts” is not an auditable release strategy.

The finished workflow should make these questions cheap to answer:

- Which consumer versions can call this provider candidate?
- Why is each version relevant to production right now?
- Which exact contract and provider artifact were verified?
- Can the candidate be rolled back after the next consumer ships?
- Is a red cell a behavior mismatch, missing verification, or metadata drift?
- When may an old consumer contract stop blocking releases?

If any answer requires searching multiple CI systems and asking three teams, the matrix is not yet release-grade. The technical verification may work, but its operational evidence is incomplete.

## Retire matrix rows with evidence instead of age alone

Old consumer rows should leave the release gate when they can no longer participate in a supported interaction. Age is only a clue. A web consumer may disappear minutes after a completed rollout, while an older mobile build can remain active for months. An event consumer can stop deploying yet still process retained messages. Define retirement evidence for each delivery model.

For server-rendered and web applications, reconcile deployment history with live routing and the rollback window. For mobile clients, combine the declared minimum supported release with privacy-safe aggregate activity. For event integrations, consider the maximum retention and replay period. Record the retirement decision and its source so a later incident can explain why a contract stopped blocking.

Do not delete historical contracts merely to simplify the active view. Historical evidence is useful for audits and regression analysis. Remove a version from the deployability selection while preserving its published contract and results according to retention policy. This distinction keeps operational queries focused without erasing the record of what the systems once promised.

## Frequently Asked Questions

### Does a contract testing consumer version matrix require every historical version?

No. It should include versions that can plausibly interact during the target deployment, rollout, support, and rollback windows. Current production consumers, pending releases, supported mobile versions, and consumers of retained events are common candidates. Abandoned branches and retired versions should not block indefinitely. The inclusion rule belongs in an explicit support and release policy, backed by deployment or usage evidence, so the matrix stays small enough to trust while still representing real production risk.

### What should be used as the consumer version in contract publication?

Use an immutable identifier that maps to the built consumer artifact, commonly a full Git commit SHA or an artifact digest. A branch name alone is insufficient because it moves, and a timestamp does not identify source. Attach branch and environment information as separate metadata. Most importantly, use the same version identity consistently across contract publication, deployment recording, and release diagnostics, otherwise a valid verification result cannot be connected reliably to the code serving users.

### Why can a provider verification pass while the real consumer still fails?

The contract may omit a consumer assumption, use a matcher broader than the consumer parser, bypass a production transformation layer, or establish unrealistic provider state. The displayed success may also belong to an older contract revision or a different provider artifact. Diagnose by retrieving exact contract content and verification identities, then replay the production response through consumer parsing code. Correct the missing behavioral expectation or consumer tolerance instead of weakening the assertion merely to restore a green result.

### How should teams handle a broker outage during a production release?

Prefer cached, cryptographically identifiable evidence only if your release policy explicitly permits it and the candidate, contracts, and active consumer set are unchanged. Otherwise pause the release or use a documented, time-limited exception with named approvers and compensating test evidence. Do not convert an unavailable query into an empty successful matrix. After service returns, reconcile deployment records and publish any missing results so the next decision is based on complete current evidence.
`,
};
