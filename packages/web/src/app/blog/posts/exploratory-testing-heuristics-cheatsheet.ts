import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Exploratory Testing Heuristics Cheatsheet for High-Value Test Sessions',
  description: 'Use this exploratory testing heuristics cheatsheet to design focused charters, expose hidden risks, capture evidence, and turn discoveries into durable tests.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Exploratory Testing Heuristics Cheatsheet for High-Value Test Sessions

An exploratory testing heuristics cheatsheet is a set of prompts that helps a tester generate valuable questions while learning a product. Use it to choose inputs, transitions, environments, user behaviors, and failure conditions that a scripted happy path rarely covers. A heuristic suggests where to look. It does not predict the correct outcome and it does not replace observation or product knowledge.

For an effective session, pick one risk-focused charter, select two or three relevant heuristic families, time-box the work, and capture a reproducible trail. When a discovery matters, turn it into a bug report, an automated check, a monitoring requirement, or a product question. QA engineers working with AI coding agents can use the same structure to constrain generated ideas and keep the agent from producing a huge, shallow checklist.

The cheatsheet below is organized around actions you can perform against a real system. It includes browser and API workflows, evidence templates, a detailed diagnosis, and guidance for moving from a surprising observation to a stable regression test.

## The working cheatsheet: prompt, action, evidence

Keep this table beside the product during a session. Do not attempt every row. Select the rows that intersect the charter's risk.

| Heuristic | Prompt | Concrete action | Evidence to capture |
|---|---|---|---|
| Boundaries | What happens just below, at, and above a limit? | Try 0, 1, maximum, and maximum plus 1 items | Input, response, displayed limit, server decision |
| States | Which transitions are legal, repeated, or reversible? | Repeat submit, go back, refresh, restore a saved URL | Before state, action, after state, identifiers |
| Roles | Does authority change across views and APIs? | Compare owner, member, invited, suspended, anonymous | Account role, request, visible controls, status |
| Data shape | Which forms of valid data are unusual? | Use Unicode, long names, empty optional fields, time zones | Exact encoded request and rendered output |
| Sequence | Does order matter unexpectedly? | Perform B then A, skip A, repeat B, open two tabs | Ordered timeline and server responses |
| Interruption | What if the operation loses time or connectivity? | Throttle, go offline, close tab, expire session | Timing, retry behavior, persisted state |
| Concurrency | What if two actors change the same thing? | Edit from two sessions, submit twice, cancel while processing | Actor, revision, request IDs, final state |
| Claims | Which words in UI or docs make a promise? | Challenge \`instant\`, \`all\`, \`private\`, or \`undo\` | Claim, observed exception, user consequence |
| Observability | Can a user or operator explain failure? | Trigger a safe error and follow its correlation ID | UI message, log trace, redaction, support path |
| Dependencies | What degrades when a peer is slow or absent? | Use a supported stub or fault switch | Dependency mode, fallback, recovery behavior |
| Platforms | Which environment differences matter? | Change viewport, locale, browser, keyboard, clock zone | Exact platform matrix and divergence |
| History | Which old defects or changes can recur? | Revisit recent fixes with adjacent inputs | Fix reference, changed assumption, result |

The rows combine well. A billing session could pair boundaries, concurrency, and claims. An account-recovery session might combine roles, interruptions, and observability. Pairing is valuable because serious defects often live at intersections, such as a boundary reached during a concurrent state transition.

## Choose a charter before choosing test ideas

Without a charter, exploratory work tends to drift toward whatever is easiest to click. A charter states the target, risk, approach, and stopping condition in one or two sentences.

Use this form:

\`\`\`text
Explore [target]
with [resources, data, and heuristics]
to discover [risk or information]
for [users or release decision].

Stop after [time box] or when [specific condition] is met.
\`\`\`

A concrete example is stronger than \`test checkout\`:

\`\`\`text
Explore checkout recovery after payment interruption
with two browser contexts, network throttling, and state-transition heuristics
to discover duplicate charges, lost carts, and misleading confirmation states
for returning customers on the release candidate.

Stop after 60 minutes or after every observed payment state has a recorded recovery path.
\`\`\`

The duration is illustrative. A short reconnaissance session may last twenty minutes, while a complex workflow can justify longer. The charter should still be narrow enough that the tester can explain what was and was not explored.

Use a mission matrix when selecting charters:

| Change signal | Likely risk | Strong heuristic pair | Suitable target |
|---|---|---|---|
| New validation rule | Valid users rejected or malformed data accepted | Boundaries + data shape | Form and underlying API |
| Async workflow added | Contradictory or stuck status | States + interruption | Job creation through completion |
| Role model changed | Unauthorized read or hidden required action | Roles + sequence | UI and direct endpoint |
| Provider migration | Partial failure and duplicate work | Dependencies + concurrency | Adapter and user recovery |
| UI redesign | Lost affordance and accessibility regression | Claims + platforms | Critical page and keyboard flow |
| Cache introduced | Stale or cross-user content | History + states | Read-after-write and logout/login |

Charters are also useful inputs for AI coding agents. Provide the charter, product model, known constraints, and existing coverage. Ask for a small ranked set of test ideas with the risk each idea targets. Reject output that simply paraphrases every control on the page.

## Apply product-element prompts with SFDPOT

SFDPOT is a compact mnemonic for Structure, Function, Data, Platform, Operations, and Time. It helps you inspect different dimensions of a product without prescribing a script.

### Structure

Identify components and relationships: frontend, API gateway, services, stores, queues, browser storage, third-party integrations, and deployment regions. Look for boundaries where data changes representation or ownership. A displayed timestamp may pass through a database, API serialization, browser parsing, locale formatting, and screen-reader text. Each boundary can introduce a different defect.

Ask what happens when a structural element is missing, duplicated, replaced, or reached directly. Deep-link into a nested route. Remove optional client state. Follow redirects. Compare public UI behavior with the underlying API response.

### Function

List what the product is supposed to do, then vary completion, cancellation, repetition, and reversal. Does Save remain safe after a double click? Can a cancelled export later appear as completed? Does Undo restore permissions as well as visible content? Challenge silent secondary effects such as emails, analytics events, audit records, and queue messages.

### Data

Vary size, type, encoding, relationships, lifecycle, sensitivity, and freshness. Useful data is not merely random. A carefully chosen name with combining characters can expose normalization bugs. Two objects with the same display name can expose code that relies on labels instead of IDs. A record created before a schema migration can reveal compatibility issues a new fixture cannot.

### Platform

Platform includes browser engine, operating system, viewport, input mode, locale, time zone, network, storage settings, and assistive technology. Select differences connected to product risk. A keyboard-only pass matters for a custom combobox. A time-zone pass matters for scheduling. Running ten browsers against a server-side calculation adds little if the client does not participate.

### Operations

Explore install, configuration, backup, restore, monitoring, support, migration, and incident recovery. Can an operator distinguish a rejected request from provider downtime? Does a feature flag rollback require a restart? Can support find the user's transaction without seeing sensitive content? Operational quality is part of the product.

### Time

Vary duration, order, scheduling, expiry, clock boundaries, delay, and repetition. Cross midnight, month end, daylight-saving changes, token expiry, lease renewal, and delayed messages when relevant. Avoid casually changing shared system clocks. Prefer injectable clocks, isolated environments, or documented browser time-zone configuration.

## Tour the product from different perspectives

Tours are purposeful routes through a system. They are especially effective during reconnaissance, when you need a map before focusing deeply.

| Tour | Route through the product | Questions to ask |
|---|---|---|
| Landmark tour | Visit prominent and high-traffic areas | What must always work? Which area attracts risky changes? |
| Money tour | Follow billing, quotas, credits, and refunds | Where can value be duplicated, lost, or misrepresented? |
| Data tour | Trace one entity across create, update, export, delete | Where does representation, ownership, or retention change? |
| Bad-neighborhood tour | Revisit fragile, complex, or frequently fixed areas | Which assumptions remain coupled to old behavior? |
| Back-alley tour | Use less visible settings, shortcuts, and direct URLs | Which paths receive little routine traffic? |
| Accessibility tour | Navigate through keyboard and semantic structure | Can every action be found, named, and completed? |
| Support tour | Reproduce the steps a support engineer can observe | Are messages, IDs, and audit events actionable? |

Do not present tour names as proof of coverage. A money tour through a pricing page is different from one through proration, payment authorization, invoices, refunds, and ledger reconciliation. Write down the actual path and observations.

A lightweight URL inventory can support a landmark or back-alley tour. This script reads a sitemap and prints URLs using documented Web APIs available in current Node environments:

\`\`\`ts
const sitemapUrl = process.argv[2];

if (!sitemapUrl) {
  console.error('Usage: node list-sitemap.mjs <sitemap-url>');
  process.exit(1);
}

const response = await fetch(sitemapUrl, {
  signal: AbortSignal.timeout(5_000),
});

if (!response.ok) {
  throw new Error('Sitemap returned HTTP ' + response.status);
}

const xml = await response.text();
const matches = xml.matchAll(/<loc>([^<]+)<\\/loc>/g);

for (const match of matches) {
  console.log(match[1]);
}
\`\`\`

This is a reconnaissance helper, not a general XML parser. It expects ordinary \`loc\` elements without embedded markup. For a complex feed, use the project's existing XML tooling. The list can reveal forgotten routes, but a URL alone does not tell you whether a feature is accessible or important.

## Generate inputs with boundaries, categories, and relationships

Exploration improves when inputs express a hypothesis. Instead of spraying random strings, partition the domain into meaningful categories and then choose representatives around boundaries.

For a team-name field that allows 1 through 50 Unicode characters, investigate:

- Empty input, one character, 49, 50, and 51 characters.
- Leading or trailing spaces and a name made only of spaces.
- Composed and decomposed visually equivalent characters.
- Right-to-left text mixed with numbers.
- Duplicate names under the same owner and under different owners.
- Characters that are special in HTML, URLs, CSV, shells, or regular expressions.
- A value created through the API and edited through the UI.

The expected behavior comes from the product contract, not from the heuristic. If the requirement says 50 characters, clarify whether it means bytes, Unicode code points, or user-perceived characters. A tester's surprise can reveal an ambiguous requirement even when the implementation is internally consistent.

This runnable TypeScript helper creates boundary strings without external packages:

\`\`\`ts
export function boundaryStrings(maxLength: number): string[] {
  if (!Number.isInteger(maxLength) || maxLength < 1) {
    throw new RangeError('maxLength must be a positive integer');
  }

  return [
    '',
    'a',
    'a'.repeat(maxLength - 1),
    'a'.repeat(maxLength),
    'a'.repeat(maxLength + 1),
    ' leading',
    'trailing ',
    '東京',
    'é',
    '<team&name>',
  ];
}

console.log(boundaryStrings(50));
\`\`\`

Notice that \`é\` can contain more than one code point even though it looks like one character. The helper exposes candidates. It does not assert that all applications must count them a particular way.

## Explore state machines, not isolated screens

Many costly defects arise between valid-looking screens. Model the states and transitions of the domain object. For an order, states might include draft, awaiting payment, authorized, fulfilled, cancelled, and refunded. Then ask:

- Which transitions are allowed from each state?
- What happens if the same command is repeated?
- Which actor can trigger the transition?
- What if two commands race?
- Is the UI state derived from the authoritative server state?
- What evidence remains after failure or cancellation?
- Can a delayed event move the object backward?

A transition table turns observations into a shared model:

| Current state | Action | Expected next state | Exploratory variation |
|---|---|---|---|
| Draft | Submit | Awaiting payment | Submit from two tabs |
| Awaiting payment | Provider approves | Authorized | Approval arrives after user cancels |
| Authorized | Fulfill | Fulfilled | Worker processes event twice |
| Authorized | Cancel | Cancelled | Fulfillment starts concurrently |
| Fulfilled | Refund | Refunded | Partial refund, then remaining amount |

Use model language in notes. \`Button did nothing\` is weak. \`Second Submit returned 409, but the page remained in Draft until refresh while the order was Awaiting payment\` identifies command, protocol result, UI divergence, and authoritative state.

A minimal API sequence can be captured with curl. The exact endpoints are illustrative, so adapt them to the documented API under test:

\`\`\`bash
set -euo pipefail

: "\${API_BASE_URL:?API_BASE_URL is required}"
: "\${EXPLORATORY_TOKEN:?EXPLORATORY_TOKEN is required}"

curl --fail-with-body --silent --show-error \\
  --request POST \\
  --header "Authorization: Bearer \${EXPLORATORY_TOKEN}" \\
  --header "Content-Type: application/json" \\
  --data '{"sku":"synthetic-item","quantity":1}' \\
  "\${API_BASE_URL}/test-support/carts"
\`\`\`

Use test-support endpoints only when the product deliberately provides them in an authorized environment. Save the response identifier and continue with documented commands. Do not let an AI agent infer production mutation endpoints from names.

## Introduce interruption at observable checkpoints

\`Go offline and click around\` is too vague. Identify checkpoints where responsibility changes: before a request is sent, after the server accepts it, after a provider authorizes it, before a queue consumer commits, or after the UI receives a result.

For each checkpoint, define what the user should see and how you will determine authoritative state. Playwright can create a controlled browser context that starts online, loads a page, then goes offline using the documented context method:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('draft text survives a temporary offline save failure', async ({
  context,
  page,
}) => {
  await page.goto('/notes/new');
  await page.getByLabel('Note').fill('Investigate retry behavior');

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page.getByLabel('Note')).toHaveValue(
    'Investigate retry behavior',
  );

  await context.setOffline(false);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
});
\`\`\`

This is an automated example of one discovery, not a replacement for exploration. During a session, vary the timing, navigate away, open another tab, or restore connectivity after the token expires. Once the failure mode and desired behavior are understood, preserve a representative case as regression coverage.

Use locators that describe how users perceive controls. The [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) gives concrete patterns for roles, labels, and stable test contracts. A discovery loses value if its reproduction depends on a brittle selector tied to one CSS class.

## Capture notes as a timeline, not a polished story

Exploratory notes should preserve enough context to reconstruct thought and action. A simple timestamped structure works:

\`\`\`text
Charter: Checkout recovery after payment interruption
Build: web 8f31c2a, API 2a910dd
Environment: staging-eu, Chromium, Europe/London
Account: synthetic returning customer, no stored payment method

10:05 Observation: order shows Awaiting payment after first submit
10:07 Variation: clicked Back, reopened cart, submitted again
10:07 Result: second order ID returned for the same cart ID
10:09 Evidence: request IDs req-182 and req-199, screenshot checkout-duplicate.png
10:12 Question: should cart ID be an idempotency boundary?
10:18 Follow-up: first provider callback completed both visible confirmations
\`\`\`

Record build identifiers, account role, locale, time zone, browser, feature flags, and test data when they influence behavior. Screenshots support a timeline but rarely replace it. Network traces, console output, and request IDs often explain more than a static image.

Differentiate three note types:

- Observation: what the system visibly or measurably did.
- Inference: your current explanation of why it happened.
- Question: a contract or product decision that remains unresolved.

This separation is especially important when using an AI agent to summarize a session. Agents can turn a tentative theory into a confident statement. Labeling the evidence prevents that compression from rewriting history.

## Diagnose a duplicate order found through a state heuristic

Imagine the charter above exposes two orders from one cart. The first submission times out in the browser after the server creates order A. The customer goes back, sees the cart still populated, and submits again. The server creates order B. Seconds later, the payment provider callback authorizes both.

The visible symptom is duplicate confirmation. The diagnosis proceeds through evidence:

1. The browser trace shows two POST requests with the same cart ID and different request IDs.
2. The first response never reached the browser because the connection was interrupted.
3. Server logs show both requests completed successfully.
4. The requests contain no idempotency key, and the server has no uniqueness constraint linking an active checkout attempt to the cart.
5. The UI clears the cart only after receiving a successful response, so timeout leaves it actionable.
6. Provider callbacks correctly reference their separate order IDs. The provider did not duplicate one request.

The state and interruption heuristics revealed a distributed-systems contract gap. The fix is not merely disabling the button after one click. That control does not survive refresh, multiple tabs, or a lost response. The product needs a server-side idempotency design, a defined recovery lookup, and clear UI behavior for an outcome that is unknown to the client.

After the contract is agreed, preserve several layers of checks: a service integration test that repeats the command with one idempotency key, a browser test for timeout recovery, and monitoring for multiple active orders per cart. Exploration found the risk. Automation and observability make the learning durable.

## Convert discoveries into the right durable artifact

Not every observation should become an end-to-end test. Choose the artifact that catches recurrence at the cheapest reliable layer.

| Discovery | Durable artifact | Reason |
|---|---|---|
| Parser accepts invalid quantity | Unit or property-based test | Fast, deterministic input rule |
| API permits repeated state transition | Service integration test | Requires persistence and command semantics |
| UI loses a draft while offline | Focused browser test | Browser state and user feedback matter |
| Requirement is ambiguous | Product decision and acceptance example | No valid oracle exists yet |
| Failure cannot be diagnosed | Logging or tracing requirement | Testing alone cannot create operability |
| Rare provider delay causes stale state | Contract test plus production monitor | Lab check and field detection complement each other |

When choosing JavaScript tooling for the resulting check, align the runner with the layer. Component behavior, pure functions, service integration, and full browser journeys have different needs. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides a practical comparison.

A Vitest regression for an idempotent domain function can be concise:

\`\`\`ts
import { describe, expect, it } from 'vitest';

type Order = { id: string; idempotencyKey: string };

function createOnce(existing: Order[], idempotencyKey: string): Order[] {
  if (existing.some((order) => order.idempotencyKey === idempotencyKey)) {
    return existing;
  }

  return [
    ...existing,
    { id: 'order-' + (existing.length + 1), idempotencyKey },
  ];
}

describe('createOnce', () => {
  it('does not create another order for the same key', () => {
    const first = createOnce([], 'checkout-17');
    const repeated = createOnce(first, 'checkout-17');

    expect(repeated).toEqual(first);
    expect(repeated).toHaveLength(1);
  });
});
\`\`\`

This function is deliberately small enough to run as written. A real implementation must enforce idempotency atomically in storage. The unit test records a rule, while database and API tests prove its concurrent implementation.

## What people get wrong about heuristic exploration

The central mistake is turning the cheatsheet into a mandatory checklist. Once every heuristic becomes a box to tick, the tester optimizes for completion instead of learning. Heuristics are fallible prompts. Skip irrelevant ones, combine productive ones, and change direction when evidence reveals a stronger risk.

Several other traps reduce value:

- Calling unstructured clicking exploration. Freedom without a charter, notes, or learning loop produces anecdotes.
- Treating unexpected as defective. First establish the relevant claim, model, or stakeholder expectation.
- Generating hundreds of test ideas with an agent. Ranking and execution evidence matter more than volume.
- Starting with unusual strings before learning the ordinary workflow. Without a model, odd inputs produce hard-to-interpret results.
- Exploring only through the UI. APIs, logs, database state, events, and configuration can reveal the true transition.
- Automating the exact exploratory path too early. Stabilize the oracle and choose the cheapest layer first.
- Reporting only screenshots. Preserve actions, data, build, time, request identifiers, and authoritative state.
- Measuring sessions by defect count. A session that resolves a major uncertainty can be valuable without filing a bug.

Exploration is also not a competition with scripted testing. Scripts protect known expectations. Exploration learns about unknown behavior and weak models. Mature teams move information between them continuously.

## Run a disciplined session from setup to debrief

Use this compact operating loop:

1. Review the change, user impact, architecture, recent incidents, and existing coverage.
2. Write one charter and define the test accounts, environment, and safety limits.
3. Select two or three heuristic families relevant to the risk.
4. Perform a short reconnaissance pass to confirm the environment and ordinary path.
5. Vary data, state, sequence, or platform while maintaining timestamped notes.
6. Follow surprising evidence with focused experiments rather than immediately switching topics.
7. Reproduce significant observations from a clean state.
8. Classify each outcome as defect, question, coverage gap, monitoring gap, or useful confirmation.
9. Debrief with the product and engineering stakeholders who can resolve the findings.
10. Add durable artifacts and update the product model.

During debrief, report the charter, coverage achieved, important observations, unanswered questions, and confidence limits. \`Checkout tested\` is not meaningful. \`Explored interrupted authorization from awaiting payment across two tabs; did not cover stored cards or partial capture\` gives a decision-maker usable scope.

When an agent assists, assign it bounded work such as producing data variations from a documented schema, diffing two traces, or converting an agreed example into a test. Keep the tester responsible for charter changes, safety, oracle selection, and interpretation. The agent accelerates mechanics, while the human maintains the evolving product model.

## Frequently Asked Questions

### Which exploratory heuristic should I start with on an unfamiliar product?

Begin with a landmark or data tour to learn the ordinary workflow and important entities, then add SFDPOT prompts around the area most connected to the release risk. State and sequence questions are especially productive once you understand the main lifecycle. Avoid starting with a giant catalog of edge cases because you will lack context for interpreting results. A twenty-minute reconnaissance charter, with the duration treated as illustrative, should end with a rough product map and a narrower follow-up charter.

### How do I know whether a surprising result is actually a bug?

Compare the observation with a credible oracle: an explicit requirement, user promise, domain invariant, prior behavior, accessibility standard, security policy, or stakeholder decision. If those sources disagree or remain silent, record a product question rather than inventing an expected result. State the user consequence and attach reproducible evidence. Exploratory testing often discovers ambiguity, and resolving that ambiguity is valuable even before code changes. Once the decision is made, turn it into a concrete acceptance example or automated check.

### Can AI coding agents conduct exploratory testing independently?

Agents can generate hypotheses, operate supported tools, vary structured inputs, compare traces, and draft regression tests. They are less reliable at judging unclear product intent, noticing subtle experiential problems, and respecting unstated safety boundaries. Give an agent a narrow charter, authorized accounts, allowed operations, relevant architecture, and a required evidence format. Review its actions and conclusions. Let it report unknown rather than forcing a verdict. Human-led debrief and oracle decisions remain important, especially for financial, privacy, and destructive workflows.

### What should a session report contain besides discovered defects?

Include the charter, build and environment, duration, accounts and data used, heuristic areas covered, observations, unresolved questions, coverage limits, and follow-up artifacts. Note significant confirmations, such as successful recovery across a previously risky transition. Preserve request IDs or traces needed for diagnosis, with sensitive material removed. A useful report helps a release decision even when no bugs were filed. It explains what was learned, which risks remain, and where automation, monitoring, documentation, or another focused session should follow.
`,
};
