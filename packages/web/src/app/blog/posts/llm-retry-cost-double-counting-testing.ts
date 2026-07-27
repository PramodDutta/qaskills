import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM retry cost double counting testing',
  description:
    'LLM retry cost double counting testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'LLM retry cost double counting testing',
  keywords: [
    'LLM retry cost double counting testing',
    'how to llm retry cost double counting testing',
    'llm retry cost double counting testing example',
    'Langfuse retry cost attribution',
    'LLM attempt versus request cost',
    'deduplicate token usage retries',
  ],
  relatedSlugs: [
    'langfuse-llm-observability-guide-2026',
    'langfuse-trace-quality-testing-guide',
    'llm-observability-vs-evaluation-2026',
    'llm-cost-budget-ci-guide',
  ],
  sources: [
    'https://langfuse.com/docs/metrics/overview',
    'https://langfuse.com/docs/api-and-data-platform/features/observations-api',
    'https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/',
  ],
  repoEvidence: [
    'seed-skills/langfuse-llm-observability/SKILL.md',
    'packages/web/src/app/blog/posts/pillar-llm-agent-testing-2026.ts',
  ],
  content: `LLM retry cost double counting testing reconciles one logical request with every provider attempt before summing any charge. Each attempt contributes cost once, cache hits follow an explicit billing policy, and only successful logical requests enter cost-per-success. The test fails when parent totals and child attempts count the same usage twice.

## What must LLM retry cost double counting testing prove?

This test must prove two facts at the same time. Each model call has one attempt ID, and each attempt belongs to one user request. The request sum uses each attempt once, even when a failed call leads to a new try.

- The first invariant is structural: every provider attempt has one attempt ID and one logical request ID. Retries share the request ID, while their attempt IDs remain distinct and ordered.

- The second invariant is monetary: the request cost equals the sum of accepted attempt costs. A stored parent total may be compared with that sum, but it must never be added to the same ledger.

- The third invariant concerns outcomes. Cost per successful task divides all policy-approved attempt cost by successful logical requests, not by provider attempts or all requests.

- Cache behavior needs a written rule because providers expose cached usage in different fields and products price it differently. The test fixture should state whether cached input is billed, discounted, or recorded only for usage analysis.

- The repository skill at seed-skills/langfuse-llm-observability/SKILL.md treats cost and latency per trace as quality metrics. That makes a stable request-to-attempt link part of the release evidence, not merely a finance report.

- The cost section in packages/web/src/app/blog/posts/pillar-llm-agent-testing-2026.ts separates retry cost from cost per successful task. This distinction supplies the local contract for the numerator and denominator used by the test.

- The [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) covers instrumentation across an LLM system. This focused check owns attempt correlation, deduplication, cache policy, and reconciliation.

- A green result must include complete case counts and an unchanged input ledger. Mutating source observations during aggregation can make a second calculation produce a different and misleading total.

## Which repository behavior defines the test contract?

The repo starts with one trace for each user task. Child rows hold model calls, while a later rule sums their cost and marks the task result. The test links those rows first, so a retry cannot look like a new task.

- In seed-skills/langfuse-llm-observability/SKILL.md, every request receives a trace containing generations and other spans. The test can therefore observe trace identity, child observation identity, model usage, cost, status, and timing.

- The official [Langfuse metrics overview](https://langfuse.com/docs/metrics/overview) says cost and latency can be broken down by dimensions such as user, session, feature, model, and prompt version. It does not choose the application's retry ownership rule, so that rule must remain explicit in the fixture.

- The [Langfuse Observations API](https://langfuse.com/docs/api-and-data-platform/features/observations-api) exposes core fields including observation ID, trace ID, and parent observation ID. Its usage field group includes token details and input, output, and total cost fields.

- Those fields allow a test to reconstruct a tree without trusting a precomputed dashboard total. Exported observations become the controlled input, while a normalized request ledger becomes the output.

- The repository pillar lists retry cost beside cost per successful task. That wording prevents a common denominator defect where each retry is treated as a new user outcome.

- It also states that cached and uncached paths should be separated. A test should preserve cache status in every attempt row even when the billing policy assigns zero incremental cost.

- The [trace quality testing guide](/blog/langfuse-trace-quality-testing-guide) explains wider trace assertions. Here, a trace passes only when its attempt IDs, costs, statuses, and request result reconcile exactly.

- Keep source facts apart from local policy. Langfuse provides observation and cost fields, while this application decides which observations are provider attempts and how cache charges enter task economics.

## How to llm retry cost double counting testing?

Make a small ledger with two request IDs and three attempt IDs. Store cost as whole units, group rows by request, and reject an ID seen twice. Then sum only the child rows and keep the source list unchanged.

- Avoid floating-point currency in the fixture because representation noise can hide an attribution defect. Store micro-units or another smallest supported unit, then format currency after reconciliation.

- Give every attempt a sequence, status, cache flag, and billable amount. A failed attempt can still cost money, while a cache hit can still consume tracked tokens under the selected policy.

- The first code example follows the per-trace cost rule in seed-skills/langfuse-llm-observability/SKILL.md. It creates two requests, one retry, and one cache hit without sending data to Langfuse.

\`\`\`typescript
import { expect, test } from 'vitest';

type Attempt = Readonly<{
  requestId: string;
  attemptId: string;
  sequence: number;
  status: 'failed' | 'succeeded';
  cached: boolean;
  costMicros: number;
}>;

function reconcile(attempts: readonly Attempt[]) {
  const ids = new Set<string>();
  const requests = new Map<string, Attempt[]>();

  for (const attempt of attempts) {
    if (ids.has(attempt.attemptId)) throw new Error('duplicate-attempt');
    ids.add(attempt.attemptId);
    requests.set(attempt.requestId, [...(requests.get(attempt.requestId) ?? []), attempt]);
  }

  return [...requests.entries()].map(([requestId, rows]) => ({
    requestId,
    attemptIds: rows.sort((a, b) => a.sequence - b.sequence).map((row) => row.attemptId),
    totalMicros: rows.reduce((sum, row) => sum + row.costMicros, 0),
    succeeded: rows.some((row) => row.status === 'succeeded'),
  }));
}

test('reconciles attempts once per logical request', () => {
  const report = reconcile([
    { requestId: 'r1', attemptId: 'a1', sequence: 1, status: 'failed', cached: false, costMicros: 40 },
    { requestId: 'r1', attemptId: 'a2', sequence: 2, status: 'succeeded', cached: false, costMicros: 60 },
    { requestId: 'r2', attemptId: 'a3', sequence: 1, status: 'succeeded', cached: true, costMicros: 10 },
  ]);

  expect(report).toEqual([
    { requestId: 'r1', attemptIds: ['a1', 'a2'], totalMicros: 100, succeeded: true },
    { requestId: 'r2', attemptIds: ['a3'], totalMicros: 10, succeeded: true },
  ]);
});
\`\`\`

- The cache row has a cost because this fixture's policy says its exported billable amount is authoritative. A different product can set that amount to zero while keeping the same identity and usage checks.

- Next, compare computed request totals with any parent total field without adding both. The [LLM cost budget guide](/blog/llm-cost-budget-ci-guide) can consume the reconciled result after this contract is proven.

- Use synthetic observations rather than production exports containing prompts or user data. The [observability versus evaluation guide](/blog/llm-observability-vs-evaluation-2026) helps keep cost telemetry separate from quality scoring.

## Llm retry cost double counting testing example: scenario and assertion matrix

The case grid should use sums that a reader can check by sight. It needs a one-call win, a retry win, a failed task, a cache hit, and a row seen twice. Each row names its IDs and exact sum.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Single success | One request with one successful attempt costing 70 | Request and ledger both total 70 | Parent and child sum to 140 | seed-skills/langfuse-llm-observability/SKILL.md |
| Retry success | One failed attempt costing 40, then success costing 60 | One request, two attempts, total 100 | Two logical requests are reported | packages/web/src/app/blog/posts/pillar-llm-agent-testing-2026.ts |
| Duplicate export | Same attempt ID appears on two pages | Duplicate is rejected before totals | Ledger silently totals both rows | [Langfuse Observations API](https://langfuse.com/docs/api-and-data-platform/features/observations-api) |
| Cached call | Cache flag, input usage, and policy cost are explicit | Usage remains visible and cost follows policy | Cached attempt vanishes from evidence | [OpenTelemetry GenAI attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) |
| Failed task | Two failed attempts with nonzero cost | Cost enters ledger, success count stays zero | Failed cost disappears or task passes | packages/web/src/app/blog/posts/pillar-llm-agent-testing-2026.ts |

- The single-success row catches parent-plus-child addition with the smallest possible graph. A dashboard can display one correct parent total while an export pipeline still doubles it downstream.

- The retry row proves the request denominator. Two provider calls belong to one task because the application issued them to complete the same logical request.

- The duplicate-export row covers cursor retries and overlapping query windows. Deduplication should use the stable attempt or observation ID, not an approximate timestamp or equal cost value.

- The OpenTelemetry registry lists input, output, cache-read, and cache-creation token attributes. Preserve those dimensions, but let a versioned billing policy translate them into cost.

- The failed-task row matters because attempts can incur charges without yielding a usable outcome. Cost per successful task must retain that spend in its numerator while excluding the failed request from its denominator.

- Use the [Langfuse trace guide](/blog/langfuse-trace-quality-testing-guide) for adjacent status checks. Keep this table centered on countable attempts and reconciled money.

## What failures expose Langfuse retry cost attribution?

Good fault tests break one link or sum at a time. Add a parent sum to its child rows, copy one attempt, split one retry into a new request, or hide failed spend. Each fault should raise a clear ID or amount.

- Inject a parent record with total cost 100 beside two child rows costing 40 and 60. A broken aggregator returns 200, while a correct one treats the parent as a reconciliation check.

- Inject the same attempt ID twice with different export page markers. The test should stop with a duplicate identity error before any currency total is produced.

- Inject two retry attempts that share a request ID, then alter the second row to a new request ID. Request count should change unexpectedly, which reveals a broken correlation field.

- Inject a cache hit with nonzero token usage and zero policy cost. The ledger should preserve usage and cache status instead of dropping the row because its money value is zero.

- Inject a failed request whose attempts cost money. If the implementation filters failed attempts before summing, total spend becomes too low and cost per success looks better than reality.

- The second code example tests duplicate identity, failed spend, and the outcome denominator. It follows the repository pillar's separation between retry cost and successful task cost.

\`\`\`typescript
import { expect, test } from 'vitest';

function summarize(requests: ReturnType<typeof reconcile>) {
  const totalMicros = requests.reduce((sum, request) => sum + request.totalMicros, 0);
  const successCount = requests.filter((request) => request.succeeded).length;
  return {
    totalMicros,
    successCount,
    costPerSuccessMicros: successCount === 0 ? null : totalMicros / successCount,
  };
}

test('rejects duplicate attempts before aggregation', () => {
  const duplicate = {
    requestId: 'r1',
    attemptId: 'a1',
    sequence: 1,
    status: 'failed' as const,
    cached: false,
    costMicros: 40,
  };
  expect(() => reconcile([duplicate, duplicate])).toThrow('duplicate-attempt');
});

test('includes failed spend but counts only successful requests', () => {
  const report = reconcile([
    { requestId: 'r1', attemptId: 'a1', sequence: 1, status: 'failed', cached: false, costMicros: 40 },
    { requestId: 'r2', attemptId: 'a2', sequence: 1, status: 'succeeded', cached: false, costMicros: 60 },
  ]);
  expect(summarize(report)).toEqual({
    totalMicros: 100,
    successCount: 1,
    costPerSuccessMicros: 100,
  });
});
\`\`\`

- Also compare source input before and after reconciliation. A sort performed in place can alter shared fixtures and create order-sensitive results on a later assertion.

- The [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) can help locate missing spans. This gate should reject incomplete attempt data rather than estimate costs from unrelated averages.

## How should LLM attempt versus request cost run in CI?

Run the fixed ledger on each trace or bill code change. The job needs no model key, cloud call, or live user data. It should save row counts, unique IDs, request sums, task states, and cost per good task.

- Pin the schema version for source observations and normalized requests. A field rename should produce a clear validation error rather than a set of zero-valued costs.

- Include fixtures for one-shot success, retry success, all-attempt failure, cached success, duplicate attempt, missing request ID, and parent total mismatch. These cases cover identity before they cover arithmetic.

- Write a reconciliation artifact with request IDs, ordered attempt IDs, source row count, unique row count, total cost, success count, and cost per success. Omit prompt and response bodies because they are not required for this contract.

- Fail when source and unique counts differ without an approved duplicate policy. A retried export query may legally return overlap, but the artifact should still state which IDs were discarded.

- Fail when any attempt lacks a request owner or billing policy version. Defaulting missing identity to a shared bucket can hide cross-request contamination.

- Run the focused job before the wider [LLM cost budget guide](/blog/llm-cost-budget-ci-guide) gate. A budget comparison is meaningful only after the input total has reconciled.

- Retain the source fixture hash and result artifact on every run. This allows a reviewer to distinguish a code change from a fixture change during cost drift triage.

- Use integer units in CI output and format currency only in a presentation field. Locale, decimal display, and rounding should never alter the value used by the release assertion.

## Which assertions verify deduplicate token usage retries?

Check IDs and row counts before tokens or cash. The same final sum can hide one lost row and one copied row, so a total alone is weak proof. Keep input, output, cache, and bill fields in their own checks.

- Assert that every attempt ID is unique across the entire export window. Request-local uniqueness is insufficient because the same observation might appear under two traces after a bad join.

- Assert that each attempt maps to exactly one logical request. Keep retry sequence and parent observation ID as supporting evidence, but designate one owned request key as authoritative.

- Assert source count, unique count, duplicate count, and rejected row IDs. These cardinality checks expose silent filtering that an aggregate total cannot explain.

- Assert input, output, cached input, and total token fields independently where they exist. The OpenTelemetry GenAI registry notes that cached input can be included in total input usage, so summing both blindly can duplicate tokens.

- Assert billable cost from a versioned policy rather than inferring it from token totals during the test. Provider pricing and cache discounts are outside this fixture unless the policy under test supplies them.

- Assert request cost as the sum of accepted child attempts, then compare any parent total for equality. Never add the parent value to the ledger after it passes that check.

- Assert the unchanged order and values of the source array after reconciliation. Immutable input makes repeated execution and concurrent consumers easier to reason about.

- The [observability versus evaluation guide](/blog/llm-observability-vs-evaluation-2026) distinguishes operational facts from quality scores. Keep token and cost assertions factual even when the same trace later receives evaluator scores.

## Step-by-step test implementation

Build from stable IDs out to the final task sum. First prove each attempt has one owner, then check cache and task state. Only after all rows pass those checks should the code make a cost per good task.

1. Read seed-skills/langfuse-llm-observability/SKILL.md and packages/web/src/app/blog/posts/pillar-llm-agent-testing-2026.ts, then define request, attempt, retry, cache, cost, and success terms.
2. Create an immutable ledger covering direct success, retry success, failed task, cached call, duplicate export, missing owner, and inconsistent parent total.
3. Normalize all money into integer micro-units, validate unique attempt IDs, and group each accepted attempt under one logical request ID.
4. Compute request totals from child attempts once, retain failed spend, apply the cache policy, and calculate cost per successful logical request.
5. Inject parent-plus-child addition, duplicate rows, split request IDs, dropped failures, and cache omission, then assert one clear failure for each defect.
6. Run Vitest in CI, round-trip the reconciliation artifact, retain fixture and policy versions, and feed only the proven total into budget reporting.

- Start with a hand-checkable fixture whose total is 110 micro-units. Small values make review fast and expose an accidental 220 without a calculator.

- Add production-shaped field names only after the pure ledger works. An adapter can map Langfuse observations to the internal attempt type while keeping the aggregation logic independent.

- Test overlapping pages by concatenating two controlled API responses with one shared observation ID. The expected duplicate record should identify both page markers and the accepted source.

- Use the [QA skills directory](/skills) to find observability test patterns, then retain this local request definition in code. A generic tracing skill cannot know which application action represents one paid task.

- Run the same fixture twice and compare byte-stable JSON after sorting copies, not source rows. Repeatability catches mutation and nondeterministic map traversal before dashboards consume the report.

- The [blog index](/blog) contains related CI and telemetry guides. This procedure should stay narrow enough that every failed amount maps to one identity or policy rule.

## Failure triage and regression ownership

Start with six counts: source rows, unique attempts, copied rows, requests, wins, and fails. If a count is wrong, fix the ID path before the cash math. A right sum from the wrong rows is still a bad result.

- A duplicate attempt ID belongs to export pagination, ingestion replay, or storage uniqueness. Preserve both source markers so the owning team can find where the repeated record entered.

- A missing request ID belongs to instrumentation or the adapter that maps trace fields. Do not create a fallback request from timestamps because concurrent calls can share similar times.

- A parent total mismatch belongs either to partial child data or a different parent calculation scope. Record both values and child IDs instead of choosing whichever number is lower.

- Unexpected cached cost belongs to the billing policy adapter. Keep raw cache token fields and exported cost so finance and platform owners can review the translation.

- Missing failed spend belongs to outcome filtering. The aggregator should total accepted attempts before it limits the denominator to successful logical requests.

- If local fixtures pass but production exports do not, inspect schema versions, field selection, cursor overlap, and delayed observations. The [Langfuse trace guide](/blog/langfuse-trace-quality-testing-guide) can help verify trace completeness.

- If totals change between repeated runs, inspect input mutation and ordering. Cost aggregation should be commutative, while attempt sequences remain a separate diagnostic property.

- Any billing policy change needs a named owner and version. Updating expected totals without a policy diff turns a useful regression into an unexplained accounting adjustment.

## Frequently Asked Questions

### How do you reconcile logical requests, provider attempts, retries, cached calls, and successful outcomes so LLM observability does not double-count cost?

Assign every provider attempt a unique attempt ID and one logical request ID, then total accepted child attempts once. Preserve cache and failure status under a versioned billing policy. Compute cost per success from all approved spend divided by successful logical requests, never by provider attempt count.

### What fixture best tests how to llm retry cost double counting testing?

Use a small immutable ledger with direct success, retry success, all-attempt failure, cached success, duplicate export, missing request ownership, and parent mismatch. Store costs in integer units. Each row should carry stable IDs, sequence, status, cache fields, and an expected request-level reconciliation record.

### Which failure signal proves llm retry cost double counting testing example?

A useful signal names the violated identity or arithmetic rule, such as duplicate attempt a1 or parent total 100 versus child sum 200. Report source and unique counts beside totals. A generic cost increase does not prove double counting because pricing, traffic, or model choice may have changed.

### How should CI report Langfuse retry cost attribution?

CI should publish request IDs, ordered attempt IDs, source and unique row counts, duplicate IDs, child totals, parent comparisons, success count, and cost per success. Include schema and billing policy versions. Exclude prompts and response bodies because this focused report needs identity, usage, status, and money only.

### When should LLM attempt versus request cost block a release?

Block when attempts lack owners, IDs repeat without an explicit replay rule, parent and child totals disagree, failed spend disappears, cache policy is unknown, or cost per success uses attempt count. Also block empty or partial fixtures. Each condition makes the reported task economics untrustworthy.

### How can teams keep deduplicate token usage retries repeatable?

Use stable observation IDs, immutable fixtures, fixed export pages, and explicit token field semantics. Assert source, unique, and duplicate counts before summing usage. Pin the adapter schema, then compare byte-stable artifacts across repeated runs. Never deduplicate by equal timestamps, token counts, or approximate text.

## Conclusion

LLM retry cost double counting testing is reliable when unique attempts map to one request, child costs sum once, cache policy stays visible, and failed spend remains in task economics. The release gate should reject missing identity, replayed observations, parent-plus-child addition, and an incorrect success denominator.

Open the [AI observability skills directory](/skills) to choose a focused tracing skill, then read the [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) before implementing this regression gate. Keep the small ledger as a checked base for each new trace field.`,
};
