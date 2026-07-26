import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval judge version pinning',
  description:
    'DeepEval judge version pinning: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'DeepEval judge version pinning',
  keywords: [
    'DeepEval judge version pinning',
    'how to deepeval judge version pinning',
    'deepeval judge version pinning example',
    'DeepEval evaluator model pinning',
    'LLM judge version regression',
    'record judge model in eval report',
  ],
  relatedSlugs: [
    'deepeval-pytest-llm-testing-guide',
    'testing-llm-applications-guide',
    'llm-evaluation-ci-cd-quality-gates',
    'llm-judge-calibration-guide-2026',
  ],
  sources: [
    'https://deepeval.com/docs/introduction',
    'https://deepeval.com/docs/evaluation-end-to-end-single-turn',
    'https://www.nist.gov/itl/ai-risk-management-framework',
  ],
  repoEvidence: [
    'seed-skills/deepeval-llm-evaluation/SKILL.md',
    'seed-skills/rag-regression-testing/SKILL.md',
  ],
  content: `DeepEval judge version pinning records both requested and resolved judge IDs before score checks. CI rejects a run when an alias resolves to another model, host facts are missing, or the report retains an old name. Only matching IDs may compare new metric scores with a stored baseline.

## What must DeepEval judge version pinning prove?

DeepEval judge version pinning must prove that the judge requested by setup is the judge that graded every planned case. The run file must preserve requested and resolved IDs, and CI must stop before baseline checks when either ID is missing or unexpected.

A metric score has meaning only within its test conditions. Changing the judge can move scores while the app, dataset, prompt, retrieval results, and thresholds remain exactly the same.

Define judge ID before running the suite. Include the provider, endpoint or deployment, requested model ID, resolved version when available, temperature, metric class, prompt or rubric revision, and client package version.

Do not claim stronger ID than the host exposes. If an endpoint reports only a moving alias, mark the resolved version as unverifiable and keep that run outside a strict historical check.

The [DeepEval introduction](https://deepeval.com/docs/introduction) explains its role as a test framework and its integration with testing workflows. The harness around DeepEval must add the ID proof required by the local release rule.

The [single-turn evaluation guide](https://deepeval.com/docs/evaluation-end-to-end-single-turn) documents test cases, metrics, thresholds, and test execution. Those objects establish what was graded, while the run file establishes which judge performed that grading.

Separate ID from calibration. The [judge calibration guide](/blog/llm-judge-calibration-guide-2026) asks whether a judge agrees with reviewed labels, but this test asks whether CI ran the intended judge at all.

The [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) provides a broader structure for managing and measuring AI risk. Version proof supports that work by making a test change visible and reviewable rather than silently mixing conditions.

Use the [LLM testing guide](/blog/testing-llm-applications-guide) for the surrounding test strategy. Keep this gate narrow: ID is a prerequisite for score check, not proof that the selected judge is accurate.

Browse the [QA skills directory](/skills) when a suite also needs dataset, prompt, safety, or retrieval checks. DeepEval judge version pinning should remain a small preflight that fails before costly score analysis begins.

## Which repository behavior defines the test contract?

The first repo anchor is \`seed-skills/deepeval-llm-evaluation/SKILL.md\`. Lines 147-155 warn against a floating judge version, require deliberate bumps and re-baselining, and call for a pinned judge plus recurring human spot checks.

Those statements create two separate controls. The build verifies ID on every run, while reviewers on a set schedule check whether the pinned judge still makes sound decisions on labeled examples.

The second anchor, \`seed-skills/rag-regression-testing/SKILL.md\`, defines a frozen \`EvalConfig\` at lines 48-68. Its data shape includes \`judge_model\`, \`judge_temperature\`, \`embedding_model\`, \`top_k\`, prompt and retriever versions, dataset path, and base path.

Preserve that setup as plain report data. A run file should not store only a hash because reviewers need readable fields, but it can add a canonical hash to detect an altered or omitted value.

Read setup before constructing metrics, then ask the judge client for its actual endpoint facts. Write both views before test so a mismatch cannot be hidden by a later successful score file.

Assign every case the same run ID and judge run file hash. A result lacking those fields is not fit for aggregation because it cannot prove membership in the pinned run.

The repo's base path also matters. A base must carry the judge run file used to create it, or the current job cannot know whether two numeric scores share comparable conditions.

The [DeepEval pytest guide](/blog/deepeval-llm-testing-guide) covers test execution and metric use. Add ID checks before those tests consume a host, rather than inferring the judge from a filename after the run.

The [CI quality gate guide](/blog/llm-evaluation-ci-cd-quality-gates) explains wider threshold rules. This contract should fail earlier than threshold checks whenever the current and base judge IDs differ.

## How to deepeval judge version pinning?

To learn how to deepeval judge version pinning, wrap judge construction in a small factory that accepts frozen setup and returns inspected facts. Build a run file, compare it with the rule and baseline files, then pass the same client into each metric.

Use a fake judge client for the contract suite. It should expose requested and live IDs, return fixed scores for named cases, count calls, and simulate a changed alias without contacting a hosted model.

The positive fixture follows the pinned setup shape from \`seed-skills/rag-regression-testing/SKILL.md\`. It proves ID agreement, a valid score check, complete case accounting, and an unchanged baseline file.

\`\`\`python
from dataclasses import asdict

def test_matching_judge_identity_allows_score_comparison(tmp_path):
    config = EvalConfig(
        judge_model="judge-2026-06-18",
        judge_temperature=0.0,
        embedding_model="text-embedding-3-small",
        top_k=5,
        prompt_version="answer-v4",
        retriever_version="hybrid-bm25+dense-v2",
        dataset_path="rag-evals/golden/dataset.v3.json",
        baseline_path="rag-evals/baseline/baseline_metrics.json",
    )
    judge = FakeJudge(
        requested_model=config.judge_model,
        resolved_model="judge-2026-06-18",
        scores={"case-1": 0.91, "case-2": 0.88},
    )

    report = run_eval(config=config, judge=judge, case_ids=["case-1", "case-2"])

    assert report["judge"]["configured"] == "judge-2026-06-18"
    assert report["judge"]["resolved"] == "judge-2026-06-18"
    assert report["config"] == asdict(config)
    assert report["comparison_eligible"] is True
    assert [row["case_id"] for row in report["results"]] == ["case-1", "case-2"]
    assert judge.calls == ["case-1", "case-2"]
\`\`\`

Keep score values fixed in this fixture because score quality is not under test. ID failure should remain visible even when old and new fake judges return equal numbers.

Build the base run file on its own from the current run file. Reusing one object for both sides can make an accidental setup change appear equal by construction.

Require a live ID only when the client contract promises one. For an opaque hosted alias, the safe rule may require a versioned host name, a host snapshot field, or a reviewed base reset.

Write the run file before the first judge call and finalize it after the last call. The final record should add call count, case count, start time from a fixed clock, completion status, and file checksums.

Do not let individual tests construct ad hoc judges. A shared factory makes the requested model and rule check visible in one code path while still giving each case isolated inputs.

The [DeepEval guide](/blog/deepeval-llm-testing-guide) can supply metric patterns after the preflight passes. This fixture deliberately avoids model quality claims and tests only the ID boundary.

## Deepeval judge version pinning example: scenario and assertion matrix

This deepeval judge version pinning example uses controlled client facts instead of variable model output. Each row has a binary pass state decision that precedes any check with stored scores.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Matching version | Requested and resolved IDs match baseline | Eligible report with two complete cases | Any missing identity or case record | \`seed-skills/deepeval-llm-evaluation/SKILL.md\` |
| Alias boundary | Requested alias has no version metadata | Run marked unverifiable and not compared | Scores presented against old baseline | DeepEval introduction |
| Silent change | Alias resolves to a new dated version | Identity mismatch before metric thresholds | Application regression reported from mixed judges | \`seed-skills/rag-regression-testing/SKILL.md\` |
| Repeated execution | Two runs use one frozen manifest | Equal identity hashes and separate run IDs | Manifest drift or shared mutable report | Fake judge ledger |
| Metadata outage | Judge scores but inspection fails | Bounded setup failure with no eligible results | Empty identity accepted as current | NIST AI RMF |

The alias boundary is not automatically a host defect. It is a rule choice that strict baseline checks need enough facts to show equal test conditions.

The silent-change row should return familiar scores on purpose. This proves the gate watches ID directly instead of noticing a change only after a score moves.

For repeated runs, compare canonical run file fields and preserve different run IDs. ID should match, while timestamps, case files, and attempt records remain separate.

The facts-outage case must stop before aggregation. A score file without judge proof is an incomplete file, not a reason to reuse yesterday's ID.

Add one deliberate approved bump with a new base fixture. It should pass only when the setup, reviewed change record, and base judge run file all name the same new version.

The [quality gates article](/blog/llm-evaluation-ci-cd-quality-gates) can define approval workflow and score thresholds. The table here decides whether those later checks are valid.

## What failures expose DeepEval evaluator model pinning?

DeepEval judge model pinning fails when setup, live facts, case records, or base ID disagree. The error should name each ID and state that score check was skipped, rather than labeling the app as better or worse.

Inject failures through the fake judge factory, not through production host settings. Return another version for the same alias, omit the facts field, switch endpoints, or change temperature while keeping fake scores stable.

The negative contract below rejects a changed live model before base metrics are read. It also proves that no case was judged and that the failure report retains both IDs.

\`\`\`python
def test_changed_resolved_judge_blocks_comparison(baseline_manifest):
    judge = FakeJudge(
        requested_model="judge-stable",
        resolved_model="judge-2026-07-20",
        scores={"case-1": 0.91},
    )
    policy = JudgePolicy(
        expected_requested="judge-stable",
        expected_resolved="judge-2026-06-18",
    )

    outcome = prepare_eval(judge=judge, policy=policy, baseline=baseline_manifest)

    assert outcome.comparison_eligible is False
    assert outcome.failure_code == "JUDGE_IDENTITY_MISMATCH"
    assert outcome.configured_judge == "judge-stable"
    assert outcome.resolved_judge == "judge-2026-07-20"
    assert outcome.baseline_judge == "judge-2026-06-18"
    assert judge.calls == []
    assert outcome.results == []
\`\`\`

Add a stale-report case where the client resolves the new version but the file writer writes the old value. Compare in-memory facts with the persisted report after a fresh read from disk.

Add a partial-run case where one result lacks the run file hash. The whole check should fail complete accounting because averaging only linked rows can hide a mixed or retried judge.

Change just one behavior-setting field per test. Model ID, temperature, metric prompt, endpoint, and client version need separate errors so an owner knows which base condition moved.

Test the approved-change path with a new base file and review token. It must not overwrite the old file, because historical results still need their original judge ID.

Do not compare only friendly display names. Normalize whitespace for report formatting, but keep model IDs, host IDs, revisions, and endpoint scopes as exact values.

The [calibration guide](/blog/llm-judge-calibration-guide-2026) should run after an approved judge change. It determines whether the new judge remains suitable, while this test prevents an unreviewed change from entering score history.

## How should LLM judge version regression run in CI?

An LLM judge version regression job should inspect ID before test, then seal one immutable run file for the run. Pin package locks, setup, dataset revision, metric prompt revision, host endpoint, and base file.

Use a preflight stage that creates the judge client and reads its available facts. Fail with a dedicated setup code when the host cannot establish the ID required by rule.

After preflight, pass the sealed run file hash into every worker. Parallel workers may process separate cases, but none may replace the judge, temperature, rubric, or base path.

Set explicit deadlines for facts inspection, each judge call, and the full suite. A timeout should preserve the run file and finished case IDs while marking the run incomplete and unfit.

Upload the setup run file, host facts, base run file, case ledger, raw metric outputs allowed by rule, package lock checksum, and final pass state decision. Keep secrets and sensitive prompts out of public logs.

Fail release on ID mismatch, unverifiable required ID, mixed run file hashes, missing cases, stale report fields, or incomplete cleanup. Score thresholds run only after these structural checks pass.

Keep PR fixtures small and fixed, then run the full labeled suite on the approved schedule. The repo explicitly supports a smoke slice plus a larger recurring run, but both need the same ID controls.

Use [DeepEval pytest guidance](/blog/deepeval-llm-testing-guide) for command integration and the [skills directory](/skills) for adjacent test checks. Preserve machine-readable failure codes so CI can distinguish ID drift from app score drift.

## Which assertions verify record judge model in eval report?

To record judge model in eval report correctly, assert exact fields at setup, client, case, and base levels. A report that merely contains a model-like string can retain an old alias while another host grades the cases.

Assert set host and model ID first. Then assert live version, host, or endpoint ID according to the client contract, with an explicit \`unverifiable\` state rather than an empty string.

Compare the current run file with the base run file before reading score deltas. Equality should cover every field that can affect grading, including temperature, metric prompt revision, and relevant client behavior.

Assert one run file hash on every result row and one result row for every planned case. Reject duplicates, unlinked rows, skipped cases, and rows from another run ID.

Read the persisted report back from its file path. In-memory checks cannot detect a file writer that drops the live version or writes stale facts from a prior run.

Assert ordering only where the report promises ordering. For parallel work, compare case IDs as sets and keep a separate event sequence for start, completion, retry, and cancellation.

Check that an ID failure leaves base files unchanged and produces no score check. These negative assertions prevent a failed run from corrupting the reference it was meant to protect.

The [CI quality gate article](/blog/llm-evaluation-ci-cd-quality-gates) can consume the pass state field before applying metric thresholds. This order keeps judge drift from being misreported as product drift.

## Step-by-step test implementation

Build the ID gate around a small data contract that reviewers can inspect without invoking a model. The six steps below keep set intent, live proof, check rule, and cleanup in one easy to rerun path.

1. Read \`seed-skills/deepeval-llm-evaluation/SKILL.md\` lines 147-155 and \`seed-skills/rag-regression-testing/SKILL.md\` lines 48-68, then list every pinned evaluation input and baseline field.
2. Create isolated fixtures for how to deepeval judge version pinning and its example matrix, using fake adapter metadata, fixed scores, sealed manifests, and disposable report paths.
3. Build a judge factory that records configured identity, inspects resolved identity, canonicalizes the run manifest, and returns a comparison-eligibility decision before metric execution.
4. Run the matching path and assert manifest fields, case links, adapter calls, report persistence, baseline identity, score shape, and absence of unrelated file changes.
5. Inject changed, missing, stale, mixed, and timed-out identity evidence, then require stable failure codes, zero invalid comparisons, complete accounting, and unchanged baselines.
6. Run the focused pytest suite in CI, retain sanitized manifests and ledgers, verify temporary cleanup, and route provider, configuration, serializer, baseline, or harness failures.

Keep expected run files in plain fixtures rather than regenerating them from current settings. Reviewers should see the exact ID transition when a deliberate judge update changes that data.

Test the same matching fixture before and after all mutations. Equal run files and case rows demonstrate that fake facts, report files, and worker state were reset.

The [blog index](/blog) contains related test practices. This implementation should stay independent of live judge quality so ID defects remain quick, cheap, and repeatable.

## Failure triage and regression ownership

Start with the set and live ID fields. A wrong set ID belongs to test setup, while a correct request that resolves elsewhere belongs to host routing, host rule, or the client.

If in-memory ID is correct but the saved report is wrong, assign the defect to file write or stale file reuse. Compare file creation time, run ID, run file hash, and output path.

If only some rows use another run file hash, inspect worker startup and retry construction. A process may have loaded different environment settings or rebuilt its own judge instead of using the sealed factory result.

If the current and base IDs differ after an approved update, inspect base selection. The change workflow may have generated a new base but pointed CI toward the previous file.

If ID matches and scores change, this gate has passed. Route the score movement to dataset, app, calibration, metric, or host-behavior analysis rather than weakening the ID assertion.

If host facts are unavailable, check the client contract and rule. Teams can add a versioned host or accept an explicit noncomparable run, but they should not invent a resolved version from an alias.

For CI-only drift, retain dependency locks, environment key names, endpoint scope, worker image, and run file source. These facts often expose a fallback host or an unpinned client package.

Use the [testing guide](/blog/testing-llm-applications-guide) for broader ownership across the stack. A compact rule works here: setup owners choose the judge, clients prove the live ID, report owners preserve it, and CI blocks mixed proof.

## Frequently Asked Questions

### How can a QA team prove that a DeepEval run used the intended judge model and reject silent judge-version changes in CI?

Record the requested judge and the host-reported judge ID in a sealed run file. Check that file against the rule and baseline before grading. CI must reject missing, changed, or mixed ID proof and must not present the resulting score shift as an app regression.

### What fixture best tests how to deepeval judge version pinning?

Use a fake judge client that reports requested and live IDs, returns fixed scores, counts case calls, and can simulate alias drift or missing facts. Pair it with independent current and base run files. This fixture isolates ID handling without host cost, changing model output, or shared report files.

### Which failure signal proves deepeval judge version pinning example?

Use a stable ID-mismatch code with set, live, expected, and base values. The outcome should mark check as unfit, contain no metric deltas, and show zero judge calls when preflight fails. That record proves the gate found test drift before it could be confused with product behavior.

### How should CI report DeepEval evaluator model pinning?

CI should retain sanitized setup and base run files, inspected client facts, run file hashes, package lock checksum, case ledger, persisted report, and pass state decision. Every case row needs a run ID and run file hash. Reports should distinguish ID failure, incomplete execution, and later metric-threshold failure with separate codes.

### When should LLM judge version regression block a release?

Block when required judge ID is missing, changed, stale in the report, mixed across workers, or incompatible with the selected base. Also block when cases lack run file links or a failed run alters base files. An approved judge upgrade needs a reviewed setup change, recalibration, and a new base.

### How can teams keep record judge model in eval report repeatable?

Centralize judge construction, freeze all grading inputs, canonicalize readable run files, and read saved reports back during tests. Use fixed fake facts for contract cases and exact IDs for deployed judges. Keep old base files immutable, assign unique run IDs, and verify that retries and parallel workers share one sealed run file.

## Conclusion

DeepEval judge version pinning makes score check conditional on exact, preserved test ID. The gate rejects aliases that drift, missing host proof, mixed workers, stale reports, incomplete cases, and base files created under different judge conditions.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [DeepEval pytest guide](/blog/deepeval-llm-testing-guide) before implementing this regression gate. Establish the run file preflight first, and apply score thresholds only to fit runs.`,
};
