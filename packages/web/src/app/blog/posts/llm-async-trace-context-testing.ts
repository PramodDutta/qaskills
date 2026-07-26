import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM async trace context testing',
  description:
    'LLM async trace context testing: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'LLM async trace context testing',
  keywords: [
    'LLM async trace context testing',
    'how to llm async trace context testing',
    'llm async trace context testing example',
    'LLM trace context propagation',
    'async span parent test',
    'agent trace cross request isolation',
  ],
  relatedSlugs: [
    'langfuse-llm-observability-guide-2026',
    'langfuse-trace-quality-testing-guide',
    'llm-observability-vs-evaluation-2026',
    'trace-based-testing-opentelemetry-2026',
  ],
  sources: [
    'https://opentelemetry.io/docs/concepts/signals/traces/',
    'https://opentelemetry.io/docs/specs/semconv/general/trace/',
    'https://langfuse.com/docs/observability/best-practices',
  ],
  repoEvidence: [
    'seed-skills/langfuse-llm-observability/SKILL.md',
    'packages/web/src/app/blog/posts/trace-based-testing-opentelemetry-2026.ts',
  ],
  content: `LLM async trace context testing runs interleaved workflows through a local span store and compares every span with its planned trace, parent, request, and case ID. It proves promises, queues, callbacks, and tools that run at once retain context. The suite fails on orphaned spans, foreign parents, lost fields, missing work, or cross-request contamination.

## What must LLM async trace context testing prove?

LLM async trace context testing must prove that each async step remains inside the trace and parent span assigned to its request. Concurrent requests must never share trace ID, baggage, user scope, session scope, or tool spans, even when their callbacks finish in another order.

A successful HTTP response cannot prove this contract. Retrieval, reply, and tool spans may be attached to the wrong trace while both users still receive plausible answers.

Define the set span tree as data before running the workflow. Record span names, parent names, request IDs, case IDs, required fields, allowed links, and the number of spans set from each branch.

Trace ID connects all work for one request, while span ID connects one unit of work to its parent. Request metadata gives the test an independent owner key that can expose a technically valid but foreign trace.

The [OpenTelemetry trace concepts](https://opentelemetry.io/docs/concepts/signals/traces/) describe traces as paths through a system composed of spans. They also define parent and child links, which gives the fixture a structural graph to inspect.

The [trace semantic conventions](https://opentelemetry.io/docs/specs/semconv/general/trace/) define common naming and field guidance. Pin the conventions and local field contract used by the app instead of accepting any field that looks similar.

The [Langfuse trace guidance](https://langfuse.com/docs/observability/best-practices) explains useful trace structure and context. A focused test should preserve the small set of IDs and nested spans needed to assign one failed branch.

Keep trace views distinct from output scoring. The [observability versus evaluation article](/blog/llm-observability-vs-evaluation-2026) explains the broader boundary, while this test checks whether recorded lineage represents the actual async workflow.

Use the [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) for wider setup. The release signal here is exact owner links and parentage across interleaved work, not the visual appearance of a trace screen.

Browse the [QA skills directory](/skills) when the system also needs model, protocol, or data checks. Trace context should have its own fixed gate because missing lineage can weaken every later diagnosis.

## Which repository behavior defines the test contract?

The first repo anchor is \`seed-skills/langfuse-llm-observability/SKILL.md\`. Lines 37-53 create one traced answer step and place retrieval and reply spans beneath it, with user, session, and tag data on the current trace.

That example exposes a planned span tree and request-owner fields. A fixture can assert one answer root, nested retrieval and reply work, one user ID, one session ID, and the tags assigned to that request.

The same proof warns that a flat trace cannot localize failures. Therefore, the test must reject a set of spans that all share a trace ID but lose their set parent-child structure.

The second anchor is \`packages/web/src/app/blog/posts/trace-based-testing-opentelemetry-2026.ts\`. Lines 12-20 treat span names, fields, timing, and parent-child links as behavior that tests can inspect beyond a final response.

Convert that concept into a case graph. The root represents the agent request, direct children represent retrieval and tool planning, and nested children represent provider, database, queue, or tool execution where the app creates them.

Record the graph before async work starts. If the planned graph is built from saved spans after the run, missing branches can disappear from both the actual and planned views.

Use a local span store and a fixture clock so tests avoid collector delay. The production exporter remains outside this contract; transport to a backend deserves a split integration check.

The [trace-based testing guide](/blog/trace-based-testing-opentelemetry-2026) covers assertions across a wider system. This module narrows the problem to context loss and request mixing inside async LLM work.

The [Langfuse trace quality guide](/blog/langfuse-trace-quality-testing-guide) can add completeness and field policy later. First prove that each span belongs to the correct request and parent.

## How to llm async trace context testing?

To learn how to llm async trace context testing, run two workflows with controlled interleaving and capture finished spans in RAM. Give each request distinct IDs, force their tools to complete out of order, then compare saved trees with hand-authored planned graphs.

Start with one workflow that awaits retrieval and reply in sequence. This small pass proves trace code and export before race introduces more possible ordering.

Next add two at once tool calls under one planning span. Assert shared trace ID, the same set parent, unique span IDs, exact tool names, and complete call count without requiring sibling end order.

Finally run two requests together and coordinate their promises with deferred gates. Request A should pause while request B starts, then B should pause while A finishes a child step.

The positive fixture uses a local span store and request-scoped fields. It checks request ownership as sets because sibling tools that run at once have no fixed finish order in the app contract.

\`\`\`typescript
import { expect, test } from 'vitest';

test('keeps parallel tool spans inside their request context', async () => {
  const exporter = createMemoryExporter();
  const gates = createWorkflowGates(['a-retrieved', 'b-started']);

  await Promise.all([
    runAgentWorkflow({
      caseId: 'case-a',
      requestId: 'request-a',
      sessionId: 'session-a',
      exporter,
      gates,
    }),
    runAgentWorkflow({
      caseId: 'case-b',
      requestId: 'request-b',
      sessionId: 'session-b',
      exporter,
      gates,
    }),
  ]);

  const graphs = buildTraceGraphs(exporter.finishedSpans());
  expect(graphs).toHaveLength(2);
  expect(graphs.map((graph) => graph.requestId).sort()).toEqual([
    'request-a',
    'request-b',
  ]);
  expect(graphs[0].foreignRequestIds).toEqual([]);
  expect(graphs[1].foreignRequestIds).toEqual([]);
  expect(graphs.flatMap((graph) => graph.orphanSpanIds)).toEqual([]);
  expect(exporter.pendingSpans()).toEqual([]);
});
\`\`\`

Do not assert generated trace or span ID values because SDKs create them. Assert equality links, uniqueness, valid format, and links to independent case fields instead.

Keep explicit request fields on every span in the test fixture. This double owner key helps catch a child carrying request B's active context while its manually copied field still says request A.

Test callbacks registered inside and outside an active context. The outside case should require explicit context binding, while the inside case should inherit according to the trace code contract.

For queues, capture context at enqueue time and restore it for the consumer step. A queue message should carry only the flow fields allowed by policy, plus a synthetic case key for the fixture.

The [trace quality guide](/blog/langfuse-trace-quality-testing-guide) can extend the graph with required input and output fields. Keep the first fixture focused enough that a parent defect yields one short graph diff.

## Llm async trace context testing example: scenario and assertion matrix

This llm async trace context testing example covers inheritance, explicit restoration, race, and missing export proof. Each row controls scheduling so the same structural failure repeats without network timing.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Awaited baseline | Retrieval then generation under one root | One trace with exact parent graph and owner fields | Orphan, wrong parent, or missing child | \`seed-skills/langfuse-llm-observability/SKILL.md\` |
| Parallel boundary | Two tools finish in reverse order | Two sibling spans with one parent and unique IDs | Sibling becomes root or child of another sibling | OpenTelemetry trace concepts |
| Queue handoff | Captured context restored in a consumer | Consumer span belongs to producer trace by contract | New trace or lost request ownership | OpenTelemetry semantic conventions |
| Cross-request race | Two requests alternate deferred gates | Two isolated graphs with no foreign owner values | Shared trace, session, baggage, or parent | \`trace-based-testing-opentelemetry-2026.ts\` |
| Export failure | One child ends after forced exporter close | Incomplete case with named missing span | Empty graph accepted or case silently skipped | In-memory exporter ledger |

The baseline row should pass before any race test runs. A broken span store or flawed planned graph can otherwise make every race mutation look useful when the harness never saw a valid tree.

Reverse only sibling end order for the at once boundary. The test should accept both end sequences while requiring the same parentage and exact sibling set.

The queue row needs a documented flow boundary. If the architecture intentionally starts a new trace and links it to the producer, assert that link instead of forcing a parent link.

For the cross-request race, use distinct user, session, request, and case values. A defect may leak only one field, so compare every request-owner field rather than only trace IDs.

The export-failure row must retain planned and observed span counts. A missing child should mark the case incomplete instead of making the smaller observed tree look valid on its own.

Use the [trace-based guide](/blog/trace-based-testing-opentelemetry-2026) for service-level variants. This matrix remains process-local so async context defects do not get mixed with collector or network failures.

## What failures expose LLM trace context propagation?

LLM trace context flow fails when a child becomes a root, inherits another request's parent, loses required baggage, or appears under the wrong trace. The report should show the set edge, observed edge, case owner, and run plan checkpoint nearest the mismatch.

Inject loss by wrapping one callback without captured context. Inject contamination by deliberately reusing a mutable context holder across two interleaved requests in the fixture-only adapter.

The negative example grades a saved span set after all planned work settles. It detects orphans, foreign owners, duplicate span IDs, missing names, and unfinished work without reading human-formatted logs.

\`\`\`typescript
function gradeTrace(spans: FinishedSpan[], expected: ExpectedGraph): TraceGrade {
  const reasons: string[] = [];
  const ids = new Set(spans.map((span) => span.spanId));
  const owned = spans.filter((span) => span.caseId === expected.caseId);

  if (owned.length !== expected.spanNames.length) {
    reasons.push('span count mismatch');
  }
  if (ids.size !== spans.length) {
    reasons.push('duplicate span identity');
  }
  for (const span of owned) {
    const expectedParent = expected.parentByName[span.name];
    if (span.parentName !== expectedParent) reasons.push('parent mismatch');
    if (span.requestId !== expected.requestId) reasons.push('foreign request owner');
    if (span.traceId !== expected.traceId) reasons.push('trace identity mismatch');
  }

  return {
    passed: reasons.length === 0,
    reason: [...new Set(reasons)].join('; '),
    observedSpanIds: owned.map((span) => span.spanId),
  };
}
\`\`\`

Test an empty export against a nonempty planned graph. It must fail span count and case end instead of reporting that no invalid parent link was found.

Test a child with a valid parent ID from request B. Basic format checks pass, but the set edge and owner fields expose the cross-request attachment.

Test baggage loss separately from parent loss. A span can retain trace lineage while dropping tenant, experiment, or session context needed by later policy and analysis.

Test a late callback after the root ends. The policy should state whether it becomes a linked background span or a rejected orphan, then assert that exact representation.

Test double trace code where two wrappers create spans for one tool call. Compare planned step IDs and cardinality before accepting that both spans have correct parents.

The [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) explains broader trace fields. Route context ownership defects to trace code rather than to the model whose output happened to trigger them.

## How should async span parent test run in CI?

An async span parent test should use a pinned tracing SDK, fixed schedule gates, planned graphs, and a local span store. It should not wait for a hosted trace backend or depend on natural promise timing.

Run a sequential smoke case first, then parallel siblings, queue restoration, callback binding, cross-request races, cancellation, and exporter shutdown. Each case receives a new provider, span store, context manager, and synthetic ID set.

Set a deadline for every deferred gate and a larger deadline for the full case. On timeout, release all gates, flush the exporter, and retain the schedule event ledger before teardown.

Artifact records should include the planned graph, observed spans, graph diff, request-owner fields, schedule checkpoints, SDK versions, case end, flush result, and cleanup status. Hide prompt text or user data not needed for lineage.

Fail release on orphaned required spans, foreign parentage, mixed request fields, duplicate IDs, missing planned work, leaked active context, or unfinished export records. Allow sibling order differences only where the contract declares parallel work.

Repeat the race cases several times with the same planned schedules, not random sleeps. A small set of named interleavings is easier to reproduce and can target boundaries found in production.

After each case, assert no active root, pending span, deferred promise, or span-store item remains. Teardown leakage can attach the next case to an old context and create misleading failures.

Use the [observability versus evaluation article](/blog/llm-observability-vs-evaluation-2026) to place this job in the pipeline and the [skills directory](/skills) for adjacent checks. Keep the focused command fast enough to run on every trace code change.

## Which assertions verify agent trace cross request isolation?

Agent trace cross request isolation requires graph, count, ID, provenance, and cleanup assertions. Checking that each request produced at least one trace misses a child attached to another valid trace and misses leaked baggage with correct lineage.

Compare the number of planned roots with unique observed trace IDs. Then require one request owner per graph and reject any graph containing foreign request, user, session, tenant, or case values.

For every set edge, compare child and parent span IDs through a name-to-ID map. A name-only tree can pass when double names hide an extra or missing step.

Assert exact child sets for fixed branches and set minimum or allowed sets only where optional work is documented. Do not weaken all branches because one cache span is conditional.

Join each tool span to its fixture step ID and one trace owner. This provenance catches double trace code, a missing tool span, and a span created for another case.

Compare baggage and selected context fields at the points that consume them. An field copied manually at the root cannot prove the active context reached a nested provider callback.

Assert root end state, exporter flush, and empty active context after all workflows settle. A structurally correct saved graph can still leave context that contaminates later requests.

The [trace quality guide](/blog/langfuse-trace-quality-testing-guide) can add content and score checks after isolation passes. Exact request ownership remains the first gate because mixed traces make every downstream metric suspect.

## Step-by-step test implementation

Implement the suite from a small planned graph and a controlled schedule rather than from screenshots. These six steps preserve repo intent while making every async boundary observable and repeatable.

1. Read \`seed-skills/langfuse-llm-observability/SKILL.md\` lines 37-53 and \`packages/web/src/app/blog/posts/trace-based-testing-opentelemetry-2026.ts\` lines 12-20, then record expected spans, edges, and owner fields.
2. Create isolated fixtures for how to llm async trace context testing and its example cases, using synthetic identities, fixed clocks, new exporters, and named deferred gates.
3. Instrument sequential, parallel, callback, and queue branches, then export plain finished-span records with trace, parent, operation, request, session, and case identities.
4. Run the expected interleavings and assert exact graph edges, complete span sets, unique IDs, correct owner fields, allowed sibling ordering, flush success, and empty pending work.
5. Inject orphaning, foreign parents, lost baggage, duplicate spans, late callbacks, and exporter loss, then require stable graph diffs and complete case accounting.
6. Run the focused Vitest suite in CI, retain sanitized graphs and scheduler ledgers, verify teardown, and route workflow, instrumentation, exporter, or harness failures.

Keep one planned graph fixture per workflow shape. A single broad graph with many optional edges can let a missing critical child pass under an unrelated branch allowance.

Run the baseline again after the mutation suite. Matching span sets and empty context state demonstrate that failure injection did not leave an active parent behind.

The [blog index](/blog) lists related trace view patterns. This test should remain local and fixed before a split job verifies export through the deployed collector.

## Failure triage and regression ownership

Begin with planned and observed span counts. A missing step event belongs to workflow or fixture code, while a recorded step without a span belongs to trace code or context binding.

If a child becomes a root, inspect where its callback was registered and invoked. Context may have been captured too late, restored around the wrong function, or ended before async work began.

If a child joins another request, compare mutable context holders and worker reuse. Shared module state, queue consumers, or callback registries can retain whichever request wrote last.

If parentage is correct but baggage is wrong, inspect flow and manual field copying separately. The active context may be correct while an field mapper reads stale request data.

If local tests pass but backend traces differ, this contract has reached its boundary. Route the issue to batch processing, exporter, collector, sampling, or backend ingestion checks with the local span ledger attached.

If only CI fails, compare tracing package versions, context-manager selection, runtime version, fake timer settings, worker race, and test isolation. Keep run plan checkpoints so owners can replay the same interleaving.

If the planned graph rejects an intentional new span, update it only after verifying the new step and parent contract. Do not mark every child optional to avoid maintaining proof.

The [trace-based testing article](/blog/trace-based-testing-opentelemetry-2026) helps extend trace ownership across services. Within this gate, workflow owners schedule steps, trace code owners preserve context, exporter owners retain records, and test owners define planned graphs.

## Frequently Asked Questions

### How do you prove trace and span context survives promises, queues, background callbacks, and parallel tool calls without cross-request contamination?

Run named interleavings through a fresh context manager and local span store, then compare exported graphs with hand-authored edges and owner fields. Assert unique traces per request, planned parents, complete steps, preserved baggage, and empty context after teardown. Any foreign owner or orphaned required span fails the case.

### What fixture best tests how to llm async trace context testing?

Use two synthetic workflows, distinct request and session IDs, deferred gates, parallel tools, a queue handoff, and a local span store. The fixture should control finish order without random sleeps. New tracing providers and context managers per case prevent earlier runs from supplying parents or pending spans.

### Which failure signal proves llm async trace context testing example?

Use a graph diff that names the case, span, planned parent, observed parent, planned trace owner, and observed owner. Include planned and exported counts plus schedule checkpoints. This signal distinguishes missing trace code, context loss, cross-request attachment, duplicate spans, and export loss without relying on formatted backend views.

### How should CI report LLM trace context propagation?

CI should retain the planned graph, sanitized finished-span records, graph diff, schedule event ledger, tracing package versions, flush result, case end, and teardown status. Stable step and case IDs must join these records. Prompt content and real user data should be excluded unless a split policy requires them.

### When should async span parent test block a release?

Block when required spans are orphaned, attached to foreign parents, assigned mixed request fields, duplicated, missing, or left pending. Also block on lost required baggage, incomplete cases, failed flushes, or leaked active context. Accept sibling end changes only when the written contract explicitly permits at once ordering.

### How can teams keep agent trace cross request isolation repeatable?

Pin tracing packages, use fresh providers per case, inject fixed clocks, and coordinate work with named deferred gates rather than sleeps. Store plain planned graphs and synthetic owner values. Re-run the sequential baseline after race mutations, then verify that span stores, promises, roots, and active context are completely empty.

## Conclusion

LLM async trace context testing makes lineage a release contract across promises, queues, callbacks, and parallel tools. It rejects orphaned work, foreign parents, mixed owner fields, missing spans, duplicate spans, and teardown leaks before those defects weaken production diagnosis.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) before implementing this regression gate. Start with two controlled requests and one local graph comparison.`,
};
