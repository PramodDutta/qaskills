import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Eval Cost Budget CI Gate Without Sacrificing Quality',
  description: 'Build an LLM eval cost budget CI gate that measures candidate and judge usage, blocks runaway spend, and preserves quality with auditable thresholds.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# LLM Eval Cost Budget CI Gate Without Sacrificing Quality

An LLM eval cost budget CI gate should fail a change when its measured or conservatively estimated evaluation cost exceeds an approved ceiling, while also failing when quality drops below required thresholds. Capture input and output tokens for candidate calls, evaluator calls, retries, and repeated samples; price them through a versioned catalog; aggregate them by scenario and suite; and publish the calculation as a CI artifact.

Cost cannot be the only gate. A prompt that returns empty strings is cheap, and a suite that silently skips difficult cases costs less. Pair the spending ceiling with dataset completeness, validity, and quality assertions. For pull requests, compare the candidate against a pinned baseline under equivalent conditions, then apply both absolute limits and regression limits.

This guide gives QA and test-automation engineers a concrete implementation pattern that works around promptfoo, DeepEval, Ragas, or a custom evaluator. Tool adapters may differ, but the gate's evidence remains the same: planned cases, executed calls, usage records, pricing provenance, quality results, and one reproducible decision.

## Start with a budget boundary the team can explain

“Keep evals cheap” is not a testable requirement. Define which execution the budget covers and what unit is constrained. A pull-request smoke suite, nightly regression, release candidate, and experiment may have different ceilings because they answer different questions.

| Gate scope | Primary purpose | Useful cost boundary | Quality boundary |
|---|---|---|---|
| Pull request | Fast regression feedback | Per run and per case | Critical-case pass plus aggregate floor |
| Nightly suite | Broader model and prompt coverage | Daily suite ceiling | Segment floors and trend comparison |
| Release candidate | Production readiness | Approved release evaluation envelope | No critical failures and strict quality floor |
| Prompt experiment | Compare variants | Per variant and total experiment | Statistical or practical improvement rule |
| Monitoring sample | Detect deployed drift | Hourly or daily evaluation spend | Alert threshold, not necessarily merge block |

Express budgets in at least two units. Currency maps to finance, while tokens or model calls help engineering diagnose the source of a change. A provider price change can alter currency without changing workload. A prompt expansion can alter tokens even if a temporary discount hides the financial impact.

An example policy could say:

- The PR suite must execute all 80 planned cases.
- Every critical safety and tool-selection case must pass.
- Aggregate task quality must not fall below the approved floor.
- Candidate-model input and output tokens each have a ceiling.
- Judge-model tokens and total calculated cost have separate ceilings.
- Missing usage for a billable call fails closed.
- The candidate must not exceed the baseline's cost by more than the reviewed tolerance.

The numbers belong in repository configuration reviewed by the owning team, not buried in a script. The [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) explains how broader agent behaviors fit together; the cost gate here controls one evaluation run without reducing the agent to a single score.

## Inventory every call that belongs in the calculation

LLM evaluation pipelines often make more calls than the number of dataset rows. One case can invoke the candidate multiple times, trigger tools, retry transport failures, and call one or more judge models. Ragas-style or custom RAG metrics may use evaluator models and embeddings. A self-correction loop can add calls that are part of candidate behavior rather than test infrastructure.

Build a call taxonomy:

| Call class | Include in spend? | Report separately? | Common source of surprise |
|---|---:|---:|---|
| Candidate generation | Yes | Yes | Multi-turn steps and long system prompt |
| Candidate retry | Yes if billable | Yes | Timeout policy hides repeated calls |
| LLM judge | Yes | Yes | Several criteria each call a judge |
| Reference-answer generation | Yes when generated during run | Yes | Gold data is not actually precomputed |
| Embedding for evaluation | Yes when billable | Yes | Per-document or per-context expansion |
| Tool API unrelated to model billing | Track by its own policy | Yes | Search or browser services have separate quotas |
| Cached model result | Zero incremental provider cost, if truly reused | Yes | Cache accounting mistaken for fresh usage |
| Local deterministic assertion | No model cost | Count | Cheap checks accidentally omitted from completeness |

The gate should record attempts, not only successful final answers. If a provider accepts and bills a request but the client loses the response, exact usage may be unavailable. Policy must say whether to use provider-reported usage later, a conservative estimate, or a maximum reservation. Treating it as zero rewards unreliable behavior and understates budget.

For agent evaluations, include tool-induced model turns. A task that calls an MCP tool, reads the result, and synthesizes an answer may involve several inference calls. The [MCP servers test automation guide](/blog/mcp-servers-test-automation-2026) is useful for testing the tool boundary itself. In this gate, attribute all candidate turns required to complete the eval case.

## Define a normalized usage ledger

Different providers and frameworks expose usage in different result shapes. Normalize them into an append-only ledger before calculating the gate. Preserve raw provider usage in a protected artifact when policy allows, but make the decision from one reviewed schema.

\`\`\`ts
export type UsageRecord = {
  runId: string;
  caseId: string;
  sample: number;
  role: 'candidate' | 'judge' | 'embedding' | 'reference';
  provider: string;
  model: string;
  attempt: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  status: 'completed' | 'failed' | 'estimated';
  source: 'provider' | 'framework' | 'estimate';
};

export type QualityRecord = {
  caseId: string;
  sample: number;
  metric: string;
  score: number;
  passed: boolean;
  critical: boolean;
};
\`\`\`

The schema separates role and source. \`role\` explains why the call happened. \`source\` explains how trustworthy the usage number is. Keep model and provider because prices can differ even for similarly named models.

Do not silently coerce missing values to zero. Validate each record before aggregation:

\`\`\`ts
export function validateUsage(record: UsageRecord): string[] {
  const errors: string[] = [];
  if (!record.caseId) errors.push('caseId is required');
  if (!record.model) errors.push('model is required');
  if (!Number.isInteger(record.inputTokens) || record.inputTokens < 0) {
    errors.push('inputTokens must be a non-negative integer');
  }
  if (!Number.isInteger(record.outputTokens) || record.outputTokens < 0) {
    errors.push('outputTokens must be a non-negative integer');
  }
  if (record.status === 'completed' && record.source === 'estimate') {
    errors.push('completed usage cannot be labeled only as an estimate');
  }
  return errors;
}
\`\`\`

The final rule about estimates is an example governance choice. Some providers may not return usage in a synchronous response, so your organization might permit reconciled estimates. If so, represent that policy explicitly rather than pretending the provider supplied exact data.

Store dataset version, prompt or agent revision, evaluator configuration hash, and pricing-catalog revision at run level. A ledger without provenance can calculate a number but cannot make a later comparison fair.

## Price usage through a pinned catalog

Never scatter model prices across test code. Maintain a small catalog with effective date, currency, units, and source URL or internal approval reference. Update it in a dedicated review. Prices change, providers may distinguish input, output, cached input, or other categories, and some hosting arrangements use negotiated rates.

\`\`\`json
{
  "catalogRevision": "2026-08-07-reviewed",
  "currency": "USD",
  "models": {
    "provider-a/model-candidate": {
      "inputPerMillion": 1.25,
      "outputPerMillion": 5.0,
      "cachedInputPerMillion": 0.25,
      "source": "approved-finance-reference"
    },
    "provider-b/model-judge": {
      "inputPerMillion": 2.0,
      "outputPerMillion": 8.0,
      "source": "approved-finance-reference"
    }
  }
}
\`\`\`

Those names and rates are intentionally fictional examples, not current provider facts. Populate the real catalog from official pricing documentation or the organization's contract on the day it is reviewed. Do not copy sample values into a production gate.

Calculate with integer-friendly care. Floating-point arithmetic is usually adequate for a CI estimate when rounding happens only for display, but keep unrounded values for comparison and state the rounding rule.

\`\`\`ts
type Price = {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
};

export function costOf(record: UsageRecord, price: Price): number {
  const cached = record.cachedInputTokens ?? 0;
  const uncachedInput = Math.max(0, record.inputTokens - cached);
  const cachedRate = price.cachedInputPerMillion ?? price.inputPerMillion;

  return (
    (uncachedInput * price.inputPerMillion) / 1_000_000 +
    (cached * cachedRate) / 1_000_000 +
    (record.outputTokens * price.outputPerMillion) / 1_000_000
  );
}
\`\`\`

Confirm whether a provider's reported input total already includes cached tokens before subtracting. Normalization adapters should encode that documented meaning and carry adapter tests with representative provider fixtures. Getting cached-token semantics wrong can double count or undercount a large prompt.

## Gate tokens, calls, and currency independently

A single dollar ceiling loses diagnostic power. Use multiple related limits so the failure points to its source. Candidate output growth suggests termination or verbosity issues. Judge growth suggests evaluator changes. Call-count growth suggests retries, extra samples, or agent loops. Currency growth with flat tokens suggests price or model-routing changes.

\`\`\`yaml
schemaVersion: 1
suite: pr-agent-smoke
completeness:
  plannedCases: 80
  requiredCriticalCases: 12
quality:
  minimumAggregateScore: 0.82
  allowCriticalFailures: 0
cost:
  maximumTotalUsd: 4.50
  maximumCandidateInputTokens: 1200000
  maximumCandidateOutputTokens: 180000
  maximumJudgeTokens: 500000
  maximumBillableCalls: 500
regression:
  maximumCostIncreaseRatio: 0.15
\`\`\`

This YAML is an illustrative project policy, not configuration for promptfoo, DeepEval, Ragas, GitHub Actions, or another external tool. Parse it in your gate script and validate it with a schema. Choose real values from measured runs and business constraints.

Absolute and relative limits answer different questions. An absolute ceiling prevents unacceptable total spend. A regression ratio catches a smaller suite suddenly becoming less efficient. Use both, but handle tiny baselines carefully because a few cents can create a huge percentage. A minimum absolute delta before ratio enforcement can make the rule more meaningful if it is documented.

| Limit | Detects | Can miss |
|---|---|---|
| Maximum total currency | Finance envelope breach | Which stage caused it |
| Candidate input tokens | Prompt/context expansion | Provider price change |
| Candidate output tokens | Runaway generation | Expensive fixed input |
| Judge tokens | Evaluator overhead | Candidate inefficiency |
| Billable calls | Retry or loop explosion | One enormous call |
| Cost increase from baseline | Regression relative to known state | Both baseline and candidate being too costly |

Report all limits even if the first one fails. Engineers should see that a change exceeded output tokens and judge cost, not fix one only to discover the next on a second CI run.

## Pair cost ceilings with quality and completeness floors

Cost optimization creates a dangerous incentive if quality is outside the gate. The decision should fail when any critical quality rule fails, aggregate performance drops too far, or planned cases do not execute.

A straightforward evaluator produces a list of violations:

\`\`\`ts
type GateInput = {
  plannedCaseIds: string[];
  usage: UsageRecord[];
  quality: QualityRecord[];
  totalUsd: number;
  baselineUsd: number;
};

export function evaluateGate(input: GateInput, policy: Policy): string[] {
  const failures: string[] = [];
  const executed = new Set(input.quality.map((item) => item.caseId));
  const missing = input.plannedCaseIds.filter((id) => !executed.has(id));

  if (missing.length > 0) failures.push(\`Missing eval cases: \${missing.join(', ')}\`);
  if (input.quality.some((item) => item.critical && !item.passed)) {
    failures.push('At least one critical quality assertion failed');
  }
  if (input.totalUsd > policy.cost.maximumTotalUsd) {
    failures.push('Total calculated cost exceeded the absolute budget');
  }

  const increase = (input.totalUsd - input.baselineUsd) / input.baselineUsd;
  if (increase > policy.regression.maximumCostIncreaseRatio) {
    failures.push('Calculated cost regressed beyond the allowed ratio');
  }
  return failures;
}
\`\`\`

Notice the escaped interpolation in the template-literal source above. In your implementation, also guard against a zero baseline and validate that every case has all required metrics, not just any quality record.

Completeness needs segment coverage. If the suite planned 80 rows but accidentally executed only the 60 easy FAQ cases, an aggregate score might improve and cost might fall. Compare executed case IDs and required metric names against the versioned manifest.

Quality aggregation should not let a large easy segment overwhelm a small critical one. Use per-segment floors for tool selection, refusal, retrieval, calculation, or whatever capabilities matter. Preserve case-level failures for diagnosis.

## Compare candidate and baseline under equivalent conditions

A relative gate is fair only when candidate and baseline are evaluated on the same dataset, sample count, model routing, tools, judge configuration, and caching policy. If the baseline artifact came from last month with different prices or a different judge, reprice its usage through the current catalog and clearly identify which dimensions remain comparable.

There are two common baseline strategies:

| Strategy | Advantage | Risk | Control |
|---|---|---|---|
| Run baseline and candidate in the same CI job | Strong environmental parity | Roughly doubles evaluation spend | Use on high-risk changes or sampled cases |
| Compare candidate to approved historical ledger | Lower incremental cost | Drift in dataset, judge, or provider | Require matching provenance and reprice usage |
| Hybrid periodic refresh | Balances spend and confidence | Baseline can age between refreshes | Set maximum baseline age and refresh triggers |

Keep baseline results immutable. A pull request should not overwrite the reference it is judged against. Promotion to baseline is a separate reviewed action after quality and cost approval.

Model nondeterminism complicates comparisons. Multiple samples can estimate variance but increase spend. Choose sample count from observed instability and risk, then include every sample in both completeness and cost. Do not keep the best answer but charge only one sample, or keep one answer while ignoring the others in quality aggregation.

For high-variance metrics, define a review band rather than repeatedly rerunning until green. Automatic reruns consume more money and bias the result toward a lucky pass. A result within the band can require human review while hard quality or cost breaches remain blocking.

## Integrate framework output through adapters, not assumptions

promptfoo, DeepEval, and Ragas have different execution models and result objects. Use their documented outputs and extension points, then translate them into the normalized ledger and quality records. Do not make the gate scrape colorized terminal text when structured results or programmatic hooks are available in the version your repository pins.

A framework adapter has four responsibilities:

1. Map a framework case to the versioned dataset case ID.
2. Extract candidate, judge, embedding, and retry usage without double counting.
3. Convert framework metrics into named quality records with preserved raw evidence.
4. Mark absent or estimated usage explicitly.

Contract-test the adapter with checked-in fixtures that contain completed calls, failed calls, cached calls, missing usage, multiple judge metrics, and multiple samples.

\`\`\`ts
describe('evaluation result adapter', () => {
  it('keeps candidate and judge usage separate', () => {
    const result = loadFixture('candidate-with-two-judges.json');
    const normalized = adaptEvaluationResult(result);

    expect(normalized.usage.filter((item) => item.role === 'candidate'))
      .toHaveLength(1);
    expect(normalized.usage.filter((item) => item.role === 'judge'))
      .toHaveLength(2);
    expect(normalized.quality.map((item) => item.metric)).toEqual(
      expect.arrayContaining(['task_success', 'groundedness']),
    );
  });

  it('rejects a billable result with missing usage', () => {
    const result = loadFixture('completed-without-usage.json');
    expect(() => adaptEvaluationResult(result)).toThrow(
      'Missing usage for completed billable call',
    );
  });
});
\`\`\`

Pinning a framework version does not justify undocumented assumptions. When upgrading, regenerate fixture examples from documented output, review the adapter diff, and run a shadow calculation before allowing the new adapter to block merges.

## Make the GitHub Actions job auditable

A CI job should separate evaluation from gate calculation. The evaluator writes raw or normalized results. The gate validates policy, calculates totals, prints a concise summary, uploads protected artifacts, and exits nonzero on failure. This makes a cost bug diagnosable without rerunning expensive model calls.

\`\`\`yaml
name: llm-evaluation

on:
  pull_request:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Run the repository evaluation adapter
        run: npm run eval:pr
        env:
          MODEL_API_KEY: \${{ secrets.MODEL_API_KEY }}
      - name: Calculate quality and cost gate
        run: npm run eval:gate -- --policy eval/policy/pr.yaml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: llm-eval-report
          path: artifacts/llm-eval/
          retention-days: 14
\`\`\`

The npm scripts belong to the repository, so their arguments are under your control. The action names and core inputs shown are standard GitHub Actions usage, but pinning policy may require immutable commit references in security-sensitive repositories.

Artifacts should include the normalized ledger, policy revision, price revision, case results, adapter version, and gate summary. Sanitize model inputs and outputs according to data policy. A full prompt may contain proprietary or personal data and should not automatically become a broadly downloadable CI artifact.

Use least-privilege workflow permissions and prevent untrusted pull-request code from receiving production model secrets. The exact workflow design depends on repository trust and GitHub's event security model. Cost control is irrelevant if a workflow exposes credentials.

## Produce a failure report that identifies the lever

The gate output should let a reviewer decide whether to shorten context, cap output, reduce judge calls, fix retries, change sampling, or approve a new budget. A bare “cost exceeded” message creates churn.

Include this summary:

| Report field | Why it matters |
|---|---|
| Planned, executed, skipped, and failed cases | Detects cheap incomplete runs |
| Candidate input and output tokens | Separates context from generation growth |
| Judge and embedding usage | Exposes evaluation overhead |
| Calls and attempts by role | Reveals loops and transport retries |
| Total using catalog revision | Makes currency calculation reproducible |
| Baseline delta in units and percent | Quantifies regression |
| Top cases by cost and cost increase | Points to actionable scenarios |
| Quality by critical segment | Prevents savings from hiding regressions |
| Missing or estimated usage count | Communicates accounting confidence |

Print more decimal precision for calculation than display. If the display rounds both 4.499 and 4.501 to 4.50, the pass/fail line still needs to explain which side of the exact threshold the run landed on.

Keep case-level token deltas. A prompt template change may add 500 tokens to all cases, while a retrieval defect may add 50,000 tokens to one case. Both can breach the same total but require different fixes.

## Diagnose a sudden cost spike before raising the budget

A realistic failure looks like this: quality remains stable, but the PR gate reports 38 percent more cost. Reviewers are tempted to approve a larger ceiling because the prompt changed intentionally. First decompose the increase.

Use this sequence:

1. Confirm the planned and executed case counts match the baseline.
2. Compare candidate call counts and attempts.
3. Compare input tokens per case, then output tokens per case.
4. Separate candidate usage from judge and embedding usage.
5. Confirm candidate, judge, and routing model identifiers are unchanged.
6. Recalculate both runs with the same price catalog.
7. Inspect cache hits and misses under the declared cache policy.
8. Check whether retries or tool loops concentrated in a few cases.

If input tokens rose uniformly, inspect system prompt, tool schemas, retrieved context, conversation history, and repeated boilerplate. If output rose, inspect stop conditions, output schema enforcement, and agent step budget. If judge cost rose, a new metric may have introduced another LLM call per case.

If calls rose only on failures, the transport layer may be retrying requests that actually completed. Track attempt status and provider request identifiers where safe. Do not automatically remove retries, but make their spend and reliability impact visible.

What people get wrong is treating a currency delta as a prompt-only regression. Routing changes, updated prices, cache behavior, judge configuration, and repeated samples can all move it. The ledger exists to separate these causes.

## Treat cache policy as part of test reproducibility

Caching can reduce CI spend substantially, but it changes the evidence. A cached candidate response proves deterministic assertions against an old output, not that the current provider and model produce it now. Decide which suites allow cache and record cache status for every call.

Use caches for evaluator-development loops, deterministic re-scoring, or unchanged cases when the goal permits it. Require fresh calls for release confidence, model-drift detection, or provider integration checks. Key the cache with every input that affects output: model identity, relevant generation settings, system and user content, tool schemas, retrieved context, and framework transformation.

Never count a cache hit as fresh provider spend. Also never discard it from completeness without explanation. Report “executed from cache” as its own category and enforce a maximum cache age or allowed suite purpose.

Judge caching needs the same rigor. If only the scoring prompt changed, reusing an old judge result would invalidate the experiment. If candidate output is cached but judge output is fresh, the ledger should show zero incremental candidate cost and current judge cost while retaining historical usage metadata separately.

## Add controls for runaway agents before post-run accounting

A post-run ceiling tells you spending exceeded the budget after calls have already happened. Add preflight and runtime controls to limit exposure. Calculate an upper-bound plan from case count, sample count, configured step limits, and maximum token settings where those are documented. Refuse obviously oversized runs before sending requests.

Runtime tracking can stop scheduling new cases when the conservative remaining budget is exhausted. Preserve already-started calls and produce an incomplete-run failure, not a misleading cheap pass. For concurrent execution, reserve expected or worst-case cost before dispatch so many workers cannot all cross the ceiling simultaneously.

| Control stage | Mechanism | Result when triggered |
|---|---|---|
| Preflight | Estimate maximum planned calls and tokens | Fail before provider traffic |
| Dispatch | Reserve budget for each new case | Stop scheduling further cases |
| Agent execution | Enforce documented step and output limits | End runaway case with explicit failure |
| Post-run | Reconcile actual or estimated usage | Produce final gate decision |
| Later billing reconciliation | Compare provider records where available | Alert on accounting discrepancy |

Do not invent a universal token ceiling for every case. Retrieval-heavy analysis and short classification have different legitimate profiles. Use per-segment or per-case allowances when one global limit would either waste money or reject valid work.

## Evolve the budget through measured review

Budgets are engineering controls, not immutable laws. Raise a ceiling when added coverage or higher quality creates reviewed value, and lower it when optimization proves the suite can sustain a tighter bound. Require the policy change to show recent distributions, candidate-baseline comparison, and the cases driving the new envelope.

Track median and upper-percentile cost per segment over time, but do not use an aggregate trend as a substitute for hard critical checks. Annotate model changes, prompt migrations, dataset expansions, judge changes, and price-catalog revisions so charts remain interpretable.

When a price changes, update the catalog and reprice stored usage ledgers to see pure financial impact. This separates workload regression from market pricing. When a model changes tokenization or stops returning comparable usage fields, version the adapter and run non-blocking shadow reports before switching the gate.

The mature outcome is not the cheapest possible suite. It is a suite whose cost, coverage, and decision quality are understood well enough that a pull request cannot quietly multiply spend or buy savings by deleting evidence.

## Frequently Asked Questions

### Should the CI gate use estimated cost or provider billing data?

Use provider-reported usage when it is available and well defined, normalized through tested adapters and a reviewed price catalog. A CI gate usually cannot wait for a final invoice, so it calculates a near-real-time amount. For calls with missing usage, fail closed or apply a documented conservative estimate. Later reconciliation against provider records can detect systematic differences. Always label the source and catalog revision so reviewers know whether a number is measured, derived, or estimated.

### How do I budget LLM judges separately from candidate models?

Tag every usage record with a role such as candidate, judge, embedding, or reference. Apply model-specific prices, then aggregate judge input, output, calls, and currency independently. Set a judge ceiling as well as a total ceiling because adding one scoring metric can multiply evaluator calls without changing candidate usage. Preserve metric names in quality records so reviewers can see which judge criteria produced value and which added cost without improving the release decision.

### Can cached eval results count toward a pull-request gate?

They can when the gate's purpose and policy permit it, but report them as cached rather than fresh. A cache hit can prove that deterministic assertions or a new scoring function behave against a known output. It cannot prove current model behavior or provider availability. Include all output-affecting inputs in the cache key, enforce suitable age limits, and require fresh execution for model-drift, release, and provider-integration suites. Charge zero incremental provider cost only when reuse truly avoided a billable call.

### What should happen when the budget stops a suite halfway?

Mark the run incomplete and fail the gate. Report which cases finished, which were never scheduled, the spend consumed, and the reservation rule that stopped dispatch. Do not calculate a passing aggregate from the cheaper partial dataset. Preserve completed quality and usage records for diagnosis, then reduce workload, fix the runaway segment, or approve a reviewed policy change. With concurrent workers, reserve budget before dispatch so already-started calls cannot collectively overshoot far beyond the intended ceiling.
`,
};
