import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM trace sampling bias testing',
  description:
    'LLM trace sampling bias testing: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'LLM trace sampling bias testing',
  keywords: [
    'LLM trace sampling bias testing',
    'how to llm trace sampling bias testing',
    'llm trace sampling bias testing example',
    'Langfuse production trace sampling',
    'LLM observability cohort bias',
    'stratified online eval sample',
  ],
  relatedSlugs: [
    'langfuse-llm-observability-guide-2026',
    'langfuse-trace-quality-testing-guide',
    'llm-observability-vs-evaluation-2026',
    'llm-cost-budget-ci-guide',
  ],
  sources: [
    'https://langfuse.com/docs/observability/overview',
    'https://langfuse.com/docs/metrics/overview',
    'https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html',
  ],
  repoEvidence: [
    'seed-skills/langfuse-llm-observability/SKILL.md',
    'seed-skills/ai-agent-eval/SKILL.md',
  ],
  content: `LLM trace sampling bias testing builds a production-like trace population with known model, tenant, language, latency, error, and safety strata, then runs the real selector repeatedly. A passing cohort preserves required groups or records inclusion probabilities for valid weighting. Missing rare failures, unexplained distribution gaps, and untraceable exclusions must block online quality claims.

## What must LLM trace sampling bias testing prove?

LLM trace sampling bias testing must prove that a test cohort represents the full set named by its score report for that exact time window. The sample either preserves required strata directly or supplies valid pick rates for weighted results.

Live traces are not interchangeable. Model versions, tenant plans, languages, response times, error outcomes, and risk events can have different rates and different day-to-day importance.

A simple random percentage can miss rare but high-risk groups in a small window. A convenience filter can be worse by selecting only successful, short, cheap, recent, or easily judged traces.

The observable contract begins with a defined target full set. Name its time range, environment, scope rules, fields, left-out rows, and expected trace count before testing the pick rule.

Then compare full set and sample mixes across each required field and each risk-based cross-group. Use approved tolerances based on sample design and risk, not a universal percentage presented as statistical law.

The test also needs trace-level pick facts. For each selected trace, record its stratum, pick rule, pick rate, sampler version, cohort ID, and selection outcome.

Rare risk failures may require guaranteed picks rather than proportional sampling. The report should disclose those extra picks and apply weights when estimating full-set rates.

An empty cohort cannot pass merely because no sampled trace failed. Full case accounting must compare in-scope, selected, excluded, scored, and failed counts.

This scope differs from general tracing setup. The [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) covers capture and analysis, while this gate tests the cohort entering online evaluation.

The [observability versus evaluation guide](/blog/llm-observability-vs-evaluation-2026) explains the broader boundary. Here, the pass signal is cohort mix and source proof, not whether individual trace scores look high.

## Which repository behavior defines the test contract?

Lines 55 through 71 of \`seed-skills/langfuse-llm-observability/SKILL.md\` show user feedback, automated judging on sampled traces, human annotation, and score trends. The sample call makes the chosen cohort a direct input to score monitoring.

That repo example does not claim that a ten-percent sample is true to the full set for each system. It establishes that sampled live traces feed scores, so sample quality must be tested separately.

Lines 869 through 876 of \`seed-skills/ai-agent-eval/SKILL.md\` require versioned datasets, calibrated judges, stratified sampling, CI gates, adversarial cases, and many judge models. Stratification directly supports keeping each category in the sample.

Read the data flow in order. The full-set query creates in-scope trace IDs, the sampler assigns pick outcomes, the judge scores selected traces, and the report combines those scores.

Observable inputs include model, tenant, language, speed band, outcome, risk flag, timestamp, and any sampling weight. Observable outputs include counts, mixes, selected IDs, pick rates, weighted rates, and left-out rows.

The [Langfuse observability overview](https://langfuse.com/docs/observability/overview) describes traces, sessions, observations, attributes, costs, and token use. Attach the fields needed for sampling before the pick so later filters do not infer them from incomplete output text.

The [Langfuse metrics overview](https://langfuse.com/docs/metrics/overview) describes score across users, models, and time, plus cost, speed, and volume fields. A cohort test should cover the same fields claimed by its dashboard.

The [scikit-learn split reference](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html) documents stratified splitting by class labels and a fixed random state. It provides a useful model for fixed-seed fixtures, although live samplers may require many combined strata.

Separate repo proof from local rules in the report. The repo supports sampling and stratification, while gap limits, minimum counts, and forced picks remain reviewed app choices.

Use the [trace quality guide](/blog/langfuse-trace-quality-testing-guide) for trace-field checks. Sampling tests assume those fields are accurate, then verify which valid traces enter the eval run.

## How to llm trace sampling bias testing?

How to llm trace sampling bias testing starts with a fake full set whose mix is known exactly. Generate stable IDs and fixed fields so each run begins with the same trace set.

Include common and rare groups intentionally. For example, make one language uncommon, place failures in the slowest speed band, and include a few risk events across two model versions.

Run the same pick rule used for live traffic, but inject a seeded random function or fixed hash. A test that rewrites the sampler cannot expose the filters or ordering defects in real code.

Capture a pick record for each in-scope trace, not only selected ones. Excluded records need a stated reason, rule, and pick rate so investigators can tell random omission from rule filtering.

For direct sample fit checks, compute counts and shares by each field. Also inspect selected IDs because equal marginal shares can hide the wrong cross-groups of model and language.

The TypeScript helper below reports absolute share gaps for one categorical field. It is a building block, not a universal statistical test, and its allowed gap must come from the fixture rule.

\`\`\`typescript
type Trace = {
  id: string;
  model: string;
  language: string;
  outcome: 'success' | 'error';
  safetyFailure: boolean;
};

function proportions(rows: Trace[], key: keyof Trace) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key]);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Map(
    [...counts].map(([value, count]) => [value, count / rows.length]),
  );
}

function representationGaps(
  population: Trace[],
  sample: Trace[],
  key: keyof Trace,
) {
  const expected = proportions(population, key);
  const actual = proportions(sample, key);
  return [...expected].map(([value, share]) => ({
    value,
    populationShare: share,
    sampleShare: actual.get(value) ?? 0,
    absoluteGap: Math.abs((actual.get(value) ?? 0) - share),
  }));
}
\`\`\`

Test each declared field and important cross-groups. A sample can match model share and language share independently while omitting all traces for one model-language pair.

If the design oversamples rare failures, do not require raw sample shares to match. Instead assert the recorded pick rate and verify a known weighted metric returns the full set value.

Create a fixture where all failures have score zero and all successes score one. Unweighted extra picks should change the mean, while the right inverse-pick weights recover the known fixture mean within the set numeric limit.

Run the pick rule over several fixed seeds when randomness is part of design. Store expected bounds for this fake full set rather than accepting any result because one seed happened to look balanced.

The [Langfuse guide](/blog/langfuse-llm-observability-guide-2026) helps establish trace tags. Keep sampler proof in its own file so score changes can be separated from changes in cohort mix.

## LLM trace sampling bias testing example: scenario and assertion matrix

An llm trace sampling bias testing example must include balanced success, rare strata, biased filters, weighted extra picks, and missing tags. The matrix below ties each case to a stable observation.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline sample | Fixed population and seeded stratified selector | Required strata meet approved count and gap rules | Unexplained distribution gap | Stratified repository guidance |
| Rare safety events | Four flagged traces across two models | All four included with recorded probabilities | One rare failure disappears | Adversarial coverage principle |
| Biased success filter | Selector silently excludes \`outcome=error\` | Error-share assertion fails and IDs are listed | Cohort claims production quality | Complete inclusion ledger |
| Weighted oversample | Errors sampled more often than successes | Weighted fixture mean matches population mean | Raw mean is reported as population rate | Sampling design manifest |
| Missing dimension | Language is absent on eligible records | Cohort creation stops with field error | Unknown values enter a default stratum | Trace metadata contract |

The baseline should exercise the actual pick rule with a fixed seed. Its expected output can use per-stratum ranges when random choices differ, but IDs and counts must remain fixed for that seed.

The rare risk case uses forced picks because proportional sampling could omit all four. Its report must state that risk examples received extra picks rather than present the raw sample rate as normal.

The biased filter is a deliberate bad change. Removing failed traces often improves apparent score and speed, so both mix and selected-ID assertions should catch it.

The weighted case proves more than tag presence. Use a fake score with a known full-set average, apply stored pick rates, and compare the weighted rate with that exact target.

Missing fields should fail before the pick. Assigning unknown language or tenant records to a common bucket can hide a trace-hook defect and alter cohort shares.

Add a recent-only bad change if the intended window covers older traces. Ordering by newest before taking a limit can bias model versions, deployments, and incident periods.

Add a cost ceiling bad change that excludes long prompts. If cost-aware pick is required, its pick rate and target estimand must be clear rather than hidden in the query.

Retain full set and sample summaries beside the pick ledger. Reviewers need both aggregate gaps and exact trace IDs to diagnose a changed cohort across runs.

Use the [observability versus evaluation guide](/blog/llm-observability-vs-evaluation-2026) when defining report language. A sampled rate should never be labeled as all live traffic without the design proof that supports that claim.

## What failures expose Langfuse production trace sampling?

Langfuse production trace sampling is biased when pick depends on a field tied to score and the report ignores that dependency. Common examples include success-only filters, short-trace limits, recent-first caps, and missing rare risk events.

Inject one filter at a time into the test pick rule. Keep the fake full set unchanged so the failed field points directly to the introduced pick rule.

The strongest negative fixture hides each error while preserving total sample size. A count-only test stays green, but outcome mix and selected-ID checks must fail.

Another bad change oversamples one model without recording pick rates. Raw scores then describe the sample, not the named live full set, so the weighting check must block reports.

The Vitest example below builds a known full set and deliberately selects only successful traces. It requires both error and risk strata, which exposes the biased cohort with exact gaps.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

describe('trace cohort representation', () => {
  const population: Trace[] = [
    { id: 't1', model: 'm1', language: 'en', outcome: 'success', safetyFailure: false },
    { id: 't2', model: 'm1', language: 'es', outcome: 'error', safetyFailure: true },
    { id: 't3', model: 'm2', language: 'en', outcome: 'success', safetyFailure: false },
    { id: 't4', model: 'm2', language: 'es', outcome: 'error', safetyFailure: false },
  ];

  it('detects a success-only cohort', () => {
    const biasedSample = population.filter((trace) => trace.outcome === 'success');
    const outcomeGaps = representationGaps(population, biasedSample, 'outcome');
    const safetyGaps = representationGaps(
      population,
      biasedSample,
      'safetyFailure',
    );

    expect(outcomeGaps).toContainEqual({
      value: 'error',
      populationShare: 0.5,
      sampleShare: 0,
      absoluteGap: 0.5,
    });
    expect(safetyGaps.find(({ value }) => value === 'true')?.sampleShare).toBe(0);
    expect(biasedSample.map(({ id }) => id)).toEqual(['t1', 't3']);
  });
});
\`\`\`

Add a test where the cohort query returns zero traces after a schema change. The gate must compare in-scope counts and fail before a judge reports a perfect empty result.

Add repeat trace IDs from paginated retrieval. Count and mix checks can look valid while the cohort scores one trace twice, so unique IDs are mandatory.

Add delayed pages arriving in a different order. A hash-based or seeded pick rule should produce the same picked set if page order is not part of the declared design.

Add judge failures after the pick. The final report must distinguish selected traces from successfully scored traces, because judge errors can create a second biased subset.

## How should LLM observability cohort bias run in CI?

LLM observability cohort bias should run against fixed fake traces on each sampler, query, schema, or rollup change. It should not fetch live data during the release gate.

Use a focused command such as \`pnpm vitest run tests/observability/trace-sampling.test.ts\`. Inject fixed seeds, clocks, page order, and judge outcomes through the same boundaries live code uses.

Version a sampling-design plan with target full set, scope rules, fields, minimum counts, gap rules, forced strata, pick-rate formula, and weighting rule. Tests should fail if code and the plan diverge.

Run schema check first, then full set query tests, pick rule tests, pick rate tests, and rollup tests. This order identifies whether bias enters before or after pick.

Retain full set summary, sample summary, gap table, pick ledger, selected IDs, weights, and final weighted rate. Do not retain sensitive prompts when fields and stable fake IDs provide enough proof.

Block release for hidden left-out rows, missing required strata, invalid pick rates, repeat IDs, empty cohorts, unscored selected traces, or weighting errors. Review gap-only changes as rule changes, not snapshot noise.

Use many fixed seeds for stochastic pick rules and one fixed hash case. Each seed has approved fixture bounds, while the hash case proves stable picked set under page reordering.

Keep test timeouts around page fetches and judge stubs. An incomplete fetch must produce a typed partial-set error rather than passing with whatever rows arrived first.

Reset seed state and caches between cases. Leaked pick state can create order-dependent memberships that appear statistical but are ordinary test contamination.

The [LLM cost budget guide](/blog/llm-cost-budget-ci-guide) can control live test spend. Cost limits must not silently remove expensive traces from a report that still claims to represent all in-scope live requests.

## Which assertions verify stratified online eval sample?

Assertions for a stratified online eval sample must cover full set, picked set, sample fit, pick rate, test completion, and math rule output. Each stage can create a different bias.

Assert the in-scope full-set count and unique ID set before sampling. A flawed source query cannot be repaired by a sound pick rule.

Assert that required tags exist for each in-scope trace. Unknown model, tenant, language, speed, outcome, or risk values need a clear stratum or a blocking schema error.

Assert selected IDs are unique and belong to the in-scope set. This catches page-fetch duplicates, stale cache entries, and cross-window leakage.

Assert minimum counts for high-risk strata. A gap limit on shares may still allow zero examples from a small but important group.

Assert marginal mixes for each required field and joint mixes for specified cross-groups. Choose cross-groups from product risk, since testing each combination may create unusably small cells.

Assert each pick rate lies above zero and no higher than one. Recompute expected values for known fixture strata and compare them at the full stored value.

Assert forced-pick rows carry pick rate one or the exact rate defined by the plan. Their extra-pick status must remain visible to downstream weighting rules.

Assert scored IDs equal selected IDs unless failures are explicitly reported. A judge timeout that removes difficult traces can bias the scored cohort after a sound sample.

Assert a known weighted fixture metric returns its full-set target. Also show that the unweighted value differs, proving the test would catch a math rule that ignores weights.

Assert report labels name the target full set, window, sampler version, and weighted or unweighted method. Correct math with misleading scope is still a report failure.

Use the [trace quality guide](/blog/langfuse-trace-quality-testing-guide) for checking trace contents before the pick. This gate then proves that valid records reach the judge in a defensible cohort.

## Step-by-step test implementation

Implement the sampling gate from the full-set definition through the final weighting rule. Each stage should leave a file that the next stage can check without guessing hidden query behavior.

1. Read \`seed-skills/langfuse-llm-observability/SKILL.md\` lines 55 through 71 and \`seed-skills/ai-agent-eval/SKILL.md\` lines 869 through 876, then record sampling and stratification requirements.
2. Create a fixed synthetic trace population spanning model, tenant, language, latency, outcome, safety, time, and score dimensions with stable unique IDs.
3. Run the production population query and sampler with injected clocks, seeds, pages, and probabilities, then retain inclusion records for selected and excluded traces.
4. Compare required marginal and joint distributions, minimum counts, unique membership, probabilities, and a known weighted estimate against approved fixture expectations.
5. Inject success-only, short-only, cheap-only, recent-only, missing-field, duplicate-page, evaluator-failure, and empty-cohort cases.
6. Run the focused suite in CI, attach summaries and the inclusion ledger, clear deterministic state, and assign query, sampler, evaluator, estimator, or reporting failures.

Start with the full-set query against an in-memory dataset. Assert exact in-scope IDs before randomness enters the path.

Then exercise stratum assignment. Each fixture trace should receive the expected labels, especially values on speed edges and records with risk failures.

Next, run the pick under fixed seeds and page orders. The picked set should follow the declared rule, while required groups satisfy their minimums.

Validate weights before evaluating scores. Incorrect pick rates can make each later calculation internally consistent yet wrong for the target full set.

Simulate judge success and failure separately. The final file should show in-scope, selected, scored, and failed counts without collapsing them into one total.

Compute one known weighted score and compare it exactly within the fixture's numeric rule. Store raw sums and base count so reviewers can reproduce the rate.

Finally, connect the fixed suite ahead of any live sample job. A failed design contract should stop score reports before it spends provider budget on a biased cohort.

## Failure triage and regression ownership

Triage starts by comparing target-full-set rules with in-scope IDs. If the wrong traces enter before sampling, the query or tag contract owns the defect.

If tags are missing or wrong, trace hooks own the defect. Preserve trace ID and raw field values without copying sensitive prompt content into the CI file.

If in-scope IDs are correct but selected shares are wrong, inspect stratum assignment, random seed use, ordering, quotas, and forced-pick logic. The sampler owns this stage.

If picked set is right but pick rates are wrong, the sampling-design implementation owns the failure. Compare each fixture stratum with its reviewed formula.

If pick is sound but scored IDs differ, judge orchestration owns the second-stage bias. Timeouts and unsupported cases must remain in failure counts rather than disappear.

If weighted rates are wrong, rollup owns the defect. Recompute top sum and base count from the retained pick ledger and fixed scores.

If only dashboard labels are wrong, report code owns a trust failure. It must name sample scope, time window, design version, and weighting method accurately.

If CI alone changes picked set, inspect seed reset, input ordering, page fetch, locale, and caches. A fixed fake full set should never drift with worker scheduling.

Use the [observability versus evaluation guide](/blog/llm-observability-vs-evaluation-2026) to clarify cross-team ownership. Keep the first incorrect set of IDs or pick rates at the center of triage rather than debating score prose.

## Frequently Asked Questions

### How do you test whether sampled production traces preserve model, tenant, language, latency, error, and safety-failure distributions?

Build a fixed full set with known strata, run the real pick rule under controlled seeds, and compare in-scope and selected IDs, counts, group shares, and key cross-groups. If rare groups get extra picks, assert pick rates and a known weighted rate. Missing tags, empty cohorts, and unreported left-out rows must fail.

### What fixture best tests how to llm trace sampling bias testing?

Use stable fake traces where score correlates with pick fields. Include rare risk failures, slow errors, many models, tenants, and languages, then assign known scores. A success-only bad change should improve the raw mean while mix checks and the weighted full set target expose the biased cohort immediately.

### Which failure signal proves llm trace sampling bias testing example?

The clearest signal is an in-scope stratum with zero selected traces despite a required minimum, especially errors or risk failures. Also fail on unexplained share gaps, repeat IDs, invalid pick rates, selected traces missing from scored results, or a weighted fixture rate that misses its known full-set value.

### How should CI report Langfuse production trace sampling?

Report the target window, in-scope and selected counts, sampler version, selected IDs, mixes, required cross-groups, pick rates, and left-out rows. Add scored and failed counts plus weighted top sum and base count. This proof separates tag, query, sampler, judge, math, and report faults without exposing full live prompts.

### When should LLM observability cohort bias block a release?

Block when hidden filters remove score-related groups, high-risk strata miss minimum counts, pick rates are absent or invalid, selected cases vanish during tests, or reports overstate full-set scope. A reviewed oversample can pass when its design and weights are clear, tested, and retained with the result.

### How can teams keep stratified online eval sample repeatable?

Use fake full sets, stable IDs, fixed clocks, fixed page order, injected seeds, and versioned sampling rules. Reset state between cases and store pick ledgers. Repeated runs should produce approved picked set or bounds, identical pick rate formulas, complete scored counts, and the same known weighted rate for each fixture.

## Conclusion

LLM trace sampling bias testing makes online score claims traceable to a defined live full set. A trustworthy gate checks in-scope IDs, required strata, pick rates, test completion, and weighted rates before a sampled score can represent users, models, errors, or safety risk.

Open the [AI testing skills directory](/skills) to choose an observability workflow, then read the [Langfuse LLM observability guide](/blog/langfuse-llm-observability-guide-2026) before implementing this regression gate. Keep the cohort plan and pick ledger beside each trend so future changes remain explainable.`,
};
