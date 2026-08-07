import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Contract Testing Schema Evolution Compatibility Across Releases',
  description: 'Apply contract testing schema evolution compat rules to requests, responses, events, and Pact pipelines so teams can change APIs without breaking deployed consumers.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# Contract Testing Schema Evolution Compatibility Across Releases

Contract testing schema evolution compatibility is the discipline of proving that a changed API or event schema still works with the consumer and provider versions that can meet in real environments. The key is directional: adding a response field is often safe for tolerant consumers, while adding a required request field usually breaks existing callers. A passing schema validator alone cannot establish that deployed applications remain compatible.

A dependable workflow combines explicit evolution rules, consumer examples, provider verification, version and environment metadata, negative tests, and a deployment gate based on versions that actually interact. This article shows how to classify changes, encode contracts, verify both sides, diagnose a realistic break, and retire fields without guessing whether an old consumer still depends on them.

## Compatibility is a relationship between two versioned behaviors

An API schema describes allowed messages. A contract test describes an interaction a consumer relies on and a provider promises to satisfy. Compatibility exists between specific consumer and provider versions, not as a permanent label attached to a schema file.

For request and response interactions, responsibility changes direction:

| Message part | Sender | Receiver | Conservative compatibility rule |
|---|---|---|---|
| HTTP request body | Consumer | Provider | Old requests must remain accepted during the support window |
| HTTP request header | Consumer | Provider | Newly required headers break old consumers |
| HTTP response body | Provider | Consumer | Old consumers must tolerate permitted additions or provider must avoid them |
| HTTP response status | Provider | Consumer | New status paths require consumer handling |
| Event payload | Producer | Consumer | Existing consumers must process or safely ignore changed payloads |
| Event metadata | Producer or platform | Consumer | Required metadata needs coordinated rollout |

This directionality explains why "we only added a field" is not enough. Adding an optional response property can be backward compatible, but adding a required request property asks every existing caller to send something it does not know about. Adding an enum response value can break a consumer with an exhaustive switch, even if the schema change looks like widening.

## Build a release matrix before classifying a change

List versions that can interact in development, staging, production, long-lived mobile releases, and delayed asynchronous processing. A web client deployed atomically may have a short overlap. A mobile client can remain active for months. An event stored in a queue can outlive both the producer deployment and an immediate rollback.

Suppose consumer C1 is deployed, consumer C2 is being released, provider P1 is deployed, and provider P2 is the candidate. The verification matrix must answer at least these cells:

| Consumer version | Provider P1 | Provider P2 | Why it matters |
|---|---:|---:|---|
| C1 deployed | Known production state | Required before P2 deploys | Provider rollout must not break current traffic |
| C2 candidate | Required if consumer rolls out first | Target pair | Determines safe deployment order |
| C0 still supported mobile | Known supported state | Required while C0 is active | Long-lived compatibility obligation |
| C3 experimental | Optional or pending evidence | Feedback, not necessarily provider gate | New demand should not misrepresent deployed safety |

The matrix prevents two misleading tests: verifying only newest against newest, and verifying every historical version forever. Support policy determines relevant versions. Deployment and release records should tell the broker or pipeline which versions are active.

## Classify request changes separately from response changes

A useful review starts with a change ledger. Each row states direction, optionality, interpretation, and support-window effect.

| Schema change | Request compatibility | Response compatibility | Hidden condition |
|---|---|---|---|
| Add optional property | Usually compatible | Usually compatible | Receiver must ignore unknown fields where promised |
| Add required property | Breaking for old senders | Can break consumers validating exact shape | Defaults do not help if validation occurs first |
| Remove optional property | Provider may accept less input | Breaking if a consumer reads it | Usage evidence is required |
| Widen accepted input | Compatible for existing callers | Not applicable | Provider behavior for new inputs must be defined |
| Add emitted enum value | Not applicable | Potentially breaking | Consumer may use exhaustive handling |
| Narrow numeric range | Breaking for senders using removed range | Potentially breaking | Existing stored values can reappear |
| Change null to absent | Interpretation-dependent | Potentially breaking | Consumers often distinguish both states |
| Change format only | Depends on enforcement | Depends on parser | Schema annotations and runtime behavior may differ |

Do not automate this table into a universal verdict without context. JSON Schema keywords, OpenAPI descriptions, application validators, serializers, and consumer code can interpret the same apparent change differently. Use static schema diffing to focus review, then prove relevant behavior with contracts.

## Write schemas that expose evolution intent

Overly loose schemas fail to protect behavior. Overly exact schemas block harmless additions. Define required fields, types, meaningful constraints, and documented extension behavior deliberately.

Here is an OpenAPI fragment for a customer response:

\`\`\`yaml
components:
  schemas:
    Customer:
      type: object
      required:
        - id
        - displayName
        - status
      properties:
        id:
          type: string
        displayName:
          type: string
        status:
          type: string
          enum:
            - active
            - suspended
        loyaltyTier:
          type: string
          nullable: true
\`\`\`

Whether unknown properties are accepted or rejected depends on the schema vocabulary and validator configuration. State the intended behavior explicitly in API governance and exercise the actual runtime serializer and parser. Never assume a documentation schema automatically configures application validation.

Schema evolution should also document semantics. If \`loyaltyTier: null\` means "evaluated and no tier" while absence means "not evaluated," replacing one with the other changes behavior even though both can be modeled as optional.

## Encode what each consumer actually uses

Consumer-driven contracts should describe interactions needed by a consumer, not copy the provider's entire response model. If checkout reads \`id\`, \`status\`, and \`balanceCents\`, its contract should make those dependencies visible. That helps the provider understand what cannot be removed.

A language-neutral interaction representation makes the intent clear:

\`\`\`json
{
  "description": "active customer balance is available at checkout",
  "providerState": "customer 101 is active with a positive balance",
  "request": {
    "method": "GET",
    "path": "/customers/101"
  },
  "response": {
    "status": 200,
    "body": {
      "id": "101",
      "status": "active",
      "balanceCents": 4200
    }
  }
}
\`\`\`

This is illustrative JSON, not a claim that every contract tool consumes this exact shape. Pact implementations generate Pact documents through language-specific libraries. The important design is that the consumer test uses values and matching rules appropriate to its behavior, then publishes a versioned contract.

Avoid examples so specific that they require one accidental literal when the consumer accepts a class of values. Also avoid matchers so broad that a wrong semantic value passes. If checkout behaves differently for \`active\` and \`suspended\`, the state value matters and deserves separate interactions.

## Verify contracts against a controllable provider

Provider verification replays contract requests against a running provider and compares actual responses with expectations. Run it in CI against the candidate provider, with downstream systems stubbed beneath the layer that parses and validates the request. The real routing, authentication interpretation, request parsing, response serialization, and domain behavior under test should remain active.

Provider states prepare deterministic conditions such as "customer 101 is suspended." State setup must be idempotent because verifiers may run interactions in different orders or concurrently. Use synthetic identifiers and reset only data owned by the test.

An application-specific state handler might look like this:

\`\`\`ts
type StateName =
  | 'customer 101 is active with a positive balance'
  | 'customer 404 does not exist';

export async function prepareProviderState(name: StateName, repository: Repository) {
  if (name === 'customer 101 is active with a positive balance') {
    await repository.upsertCustomer({
      id: '101',
      status: 'active',
      balanceCents: 4200,
    });
    return;
  }

  if (name === 'customer 404 does not exist') {
    await repository.deleteCustomer('404');
    return;
  }
}
\`\`\`

The handler is ordinary test-support code. Bind it through the documented provider-state mechanism for the Pact implementation your repository uses. Do not publish verification results from a developer laptop as if they belong to a CI-built provider version. Version provenance is part of the evidence.

The [complete Pact contract testing guide](/blog/contract-testing-pact-complete-guide) covers broader setup. Here the focus is how those contracts control schema evolution.

## Treat provider and consumer tests as complementary evidence

Consumer tests prove that the consumer can formulate requests and interpret representative responses. Provider verification proves that the provider candidate satisfies published expectations. Neither replaces API integration tests that cover authentication, middleware, storage, and multi-step workflows.

For a Node service, use behavior-level API tests to check provider-specific edges around the shared contract. The [SuperTest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) shows request-oriented coverage that can sit beside contract verification.

The layers answer different questions:

| Test layer | Primary question | Schema evolution defect it catches |
|---|---|---|
| Schema compatibility analysis | Does the formal shape change look risky? | Required field, type, or constraint changes |
| Consumer contract test | What does this consumer send and rely on? | Undocumented dependency and parsing assumptions |
| Provider verification | Can this provider version satisfy that contract? | Serialization and behavior mismatch |
| Provider API integration | Does the service work through real middleware and storage? | Validation, auth, persistence, and error mapping |
| End-to-end journey | Do deployed components accomplish the user goal? | Environment and orchestration failures |

Duplicating every assertion at every layer wastes time. Preserve the distinct decision each layer supports.

## Handle enum growth as a protocol decision

Teams frequently call adding an enum value backward compatible because the schema accepts a larger set. The provider is now capable of emitting a value old consumers may not handle. In TypeScript, a default branch may show the difference:

\`\`\`ts
type KnownStatus = 'active' | 'suspended';

export function statusLabel(status: string): string {
  if (status === 'active') return 'Ready';
  if (status === 'suspended') return 'Contact support';
  return 'Status unavailable';
}
\`\`\`

A tolerant consumer preserves function for unknown future values. But tolerance is a product choice. For payment status, silently mapping an unknown value could be unsafe. The protocol may require a hard failure, a refresh, or a specific degraded state.

Before a provider emits \`pending_review\`, add consumer behavior for it or confirm a documented unknown-value path. Contract examples should exercise both the new value and, where promised, an unknown placeholder. Roll out consumers first, observe adoption, then enable provider emission.

For events, enum risk is amplified because stored messages can be replayed. A consumer downgrade may encounter a value produced before rollback. Include retained-event age in the compatibility window.

## Evolve required fields with expand, migrate, contract

Suppose the order creation request needs a new \`salesChannel\`. Making it required immediately breaks old consumers. Use a staged transition:

1. Provider accepts the field but does not require it. Missing values receive explicitly defined legacy behavior.
2. Consumers begin sending the field and publish updated contracts.
3. Provider records or measures requests still missing the field.
4. Active consumer versions are verified as migrated.
5. Only after the support window closes does the provider consider enforcing the requirement.

The first provider shape might be:

\`\`\`yaml
CreateOrder:
  type: object
  required:
    - customerId
    - items
  properties:
    customerId:
      type: string
    items:
      type: array
      minItems: 1
      items:
        $ref: '#/components/schemas/OrderItem'
    salesChannel:
      type: string
      enum:
        - web
        - mobile
        - assisted
\`\`\`

Do not use a server default without testing its semantics. Analytics, tax, fraud, or routing logic may interpret channel, so "legacy unknown" can be more honest than guessing \`web\`.

The contract phase is an operational decision, not just a pull request. Confirm no supported consumer contract omits the field, traffic measurements cover the required window, delayed jobs are drained, and rollback documentation no longer depends on the older request.

## Version events for slower, asynchronous evolution

An event contract includes payload, key, ordering expectations, metadata, delivery semantics, and meaning. A compatible JSON shape can still break a consumer if partition key or event timing changes.

Prefer additive evolution within a clearly defined event type when semantics remain stable. Introduce a new event type or version when meaning changes incompatibly. Keep both available during migration when consumers upgrade independently.

An event envelope can make revision and identity explicit:

\`\`\`json
{
  "eventId": "evt-test-2109",
  "eventType": "customer.status.changed",
  "schemaRevision": 2,
  "occurredAt": "2026-08-07T10:30:00Z",
  "data": {
    "customerId": "customer-test-101",
    "previousStatus": "active",
    "currentStatus": "suspended",
    "reasonCode": "manual_review"
  }
}
\`\`\`

Contract tests should validate producer output and consumer processing. Include duplicate delivery if the platform can redeliver, out-of-order events if ordering is not guaranteed, and replay from the oldest retained schema revision still supported.

Do not mutate an event in storage to look like a new version unless that transformation is a governed, tested part of the platform. Consumers need evidence about what they will actually receive.

## Use broker evidence to gate the version being deployed

With Pact, consumer contracts and provider verification results can form a compatibility matrix. The deployment check must name the application version and target environment so the broker can evaluate it against relevant deployed or released dependencies.

The official Pact Broker CLI documents this pattern:

\`\`\`bash
pact-broker can-i-deploy \\
  --pacticipant customer-provider \\
  --version "$GIT_SHA" \\
  --to-environment production
\`\`\`

In the rendered shell, it is a normal line continuation.

A deployment record after success allows later checks to understand environment state. Keep names and version identifiers consistent across contract publication, verification publication, deployment checks, and deployment records. If one job uses a package version and another uses a Git SHA, the matrix can contain valid evidence that never joins.

Pending contract behavior helps prevent a new consumer demand from incorrectly blocking the provider's main build before support exists, while still reporting the verification failure. It does not make the new consumer safe to deploy. The consumer remains blocked until a compatible provider result exists.

## Diagnose a break that schema diffing called safe

Imagine a provider adds \`archived\` to a response status enum. The OpenAPI diff labels it non-breaking because the allowed response set expanded. Provider unit tests pass. After deployment, the admin consumer crashes when its exhaustive mapping indexes a label table and receives no entry.

Start with the failed production pair: consumer version, provider version, exact response, and route. Confirm whether the consumer contract included status matching that accepted only known values or used an overly broad string matcher. Check whether provider verification ran against the deployed consumer's contract, not merely the newest branch contract. Inspect broker version metadata and the deployment record.

Then reproduce in the consumer test by returning \`archived\`. Decide the correct fallback behavior. Publish the new consumer contract and implementation, deploy it, verify adoption, then allow provider emission. If immediate containment is needed, disable emission of the new value through a controlled provider behavior while keeping storage semantics intact.

| Evidence gap | Observable clue | Repair |
|---|---|---|
| Diff tool ignores consumer exhaustiveness | Formal schema says additive, runtime crashes | Add consumer behavior contract for enum evolution |
| Wrong consumer contract selected | Broker shows only main branch evidence | Record deployed versions and select them for verification |
| Verification result has mismatched version | Candidate SHA has no matrix row | Unify version identifiers across jobs |
| Provider state never emits new value | Verification covers only \`active\` | Add a state and interaction for \`archived\` |
| Unknown-value policy is undefined | Teams disagree about fallback | Make protocol behavior explicit and test it |

What people get wrong is treating compatibility as a property a diff tool can decide without observing consumer behavior. Static analysis is valuable triage, but executable dependencies and real deployment versions settle the release question.

## Retire fields using evidence, not age

Deprecation documentation starts a process; it does not prove that removal is safe. A removal candidate needs an owner, announcement date, replacement, supported-consumer inventory, telemetry where appropriate, and a final verification plan.

For response fields, consumer contracts can show declared reliance, but absence from contracts is not absolute proof that no unregistered caller uses the field. Combine the broker inventory with API client registration, access logs designed with privacy in mind, and support policy. Unknown public consumers may require a versioned API rather than in-place removal.

For request fields, measure whether supported senders still transmit the old form. For events, account for retained messages, replay jobs, data-lake readers, and disaster-recovery consumers. Remove compatibility code only after the longest relevant lifecycle has ended.

Run a deletion rehearsal in CI: remove the field on a branch, verify all relevant contracts, run API integration tests, and inspect which tests fail. This produces stronger evidence than searching source code for the field name because consumers may live in other repositories or build dynamic requests.

## Make evolution review a repeatable pull-request gate

Every schema-changing pull request should answer a concise set of questions:

- Is the changed data sent in a request, response, event, callback, or persisted message?
- Which active sender and receiver versions can meet after deployment or rollback?
- Are requiredness, nullability, enum, range, format, and unknown-field behavior changing?
- Which consumer contracts express the affected behavior?
- Has the provider candidate verified relevant deployed and released consumer versions?
- Does the rollout require consumer-first, provider-first, dual behavior, or a new protocol version?
- What evidence permits later contraction or removal?

Store the classification beside the schema diff and contract results. If the pipeline cannot find a relevant contract for an externally consumed operation, fail or require an explicit reviewed waiver. Silence is not compatibility evidence.

The goal is not to forbid breaking changes. It is to make them intentional, versioned, migratable, and observable. Sometimes a new endpoint, media type, event name, or major API version is the cleanest contract.

## Frequently Asked Questions

### Is adding an optional JSON response field always backward compatible?

No. It is compatible only if existing consumers tolerate unknown fields and the addition does not change semantics, signatures, sizes, or validation behavior they rely on. A consumer may reject exact shapes, deserialize into a strict model, compute a signature over raw payloads, or fail when a response exceeds a limit. Verify the addition against contracts from deployed consumers and test representative parsers. If tolerance is part of the protocol, state and test it explicitly rather than assuming every JSON client ignores additions.

### Do consumer-driven contracts replace an OpenAPI schema?

They serve different purposes. OpenAPI can describe the provider's broader interface, support documentation, generate tooling, and enable static change analysis. Consumer contracts show concrete interactions and dependencies for participating consumers. Use both: analyze the formal schema for suspicious changes, verify executable contracts against the provider, and retain provider integration tests for behavior outside published consumer examples. A contract set is not necessarily a complete API specification, while a schema does not prove that a particular deployed consumer can process a response.

### How should a provider support long-lived mobile clients during schema evolution?

Track released mobile versions and their support window, verify the provider against contracts for versions still active, and prefer additive changes with explicit unknown-value behavior. Roll out consumer tolerance before the provider emits new enum values or semantics. When an incompatible change is unavoidable, introduce a versioned protocol and operate both paths through the migration window. App-store publication does not mean adoption, so use privacy-conscious version telemetry and support policy rather than assuming every user upgrades immediately.

### What should block deployment when a Pact verification result is missing?

If the missing result belongs to a relevant deployed or released integration, deployment should normally stop because compatibility is unknown. First verify that consumer and provider names, version identifiers, branches, and environment records are consistent. Run provider verification for the candidate and publish its result from CI. A new experimental contract may be treated as pending according to the team's Pact workflow, but that does not authorize the new consumer to deploy. Waivers should be explicit, time-bounded, owned, and reserved for understood exceptional conditions.
`,
};
