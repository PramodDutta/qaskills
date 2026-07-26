import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas evaluator timeout recovery',
  description:
    'Ragas evaluator timeout recovery: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'Ragas evaluator timeout recovery',
  keywords: [
    'Ragas evaluator timeout recovery',
    'how to ragas evaluator timeout recovery',
    'ragas evaluator timeout recovery example',
    'Ragas RunConfig timeout test',
    'Ragas evaluator retry limit',
    'LLM metric timeout recovery',
  ],
  relatedSlugs: [
    'ragas-rag-evaluation-metrics-complete-guide',
    'rag-regression-testing-guide-2026',
    'rag-retrieval-testing-best-practices-2026',
    'rag-regression-testing-cicd-2026',
  ],
  sources: [
    'https://docs.ragas.io/en/stable/howtos/customizations/run_config/',
    'https://docs.ragas.io/en/latest/references/evaluate/',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'seed-skills/rag-regression-testing/SKILL.md',
    'seed-skills/rag-evaluation-metrics/SKILL.md',
  ],
  content: `Ragas evaluator timeout recovery uses a fake evaluator that times out for named sample IDs, then succeeds or exhausts a fixed retry budget. The test passes only when attempt counts stay bounded, sample IDs remain complete, partial scores survive, diagnostics upload, and any incomplete evaluation returns a nonzero CI result.

## What must Ragas evaluator timeout recovery prove?

This test must show that each item stops after a known count of tries. A late item may pass on its next try, but a timed-out item must stay in the report. Any lost or unfinished item must fail the job.

- Every input sample needs one stable ID before evaluation starts. The report must contain one terminal record for each expected ID, including scored, timed out, cancelled, and never-started states, with the metric name and run ID kept beside each state for a direct review.

- The retry rule should state attempts rather than vague retries because teams often count them differently. This article uses one initial attempt plus a fixed number of additional attempts, and the saved rule must name both values so no layer can count them another way.

- A timeout must not duplicate a sample or erase scores already completed by other workers. The partial artifact should remain useful even when the full metric aggregate cannot be trusted.

- The CI result must be nonzero when expected samples lack terminal scores. Uploading a partial report and then returning success would preserve evidence while still allowing an incomplete release.

- Seed-skills/rag-regression-testing/SKILL.md gives its RAG evaluation job a workflow timeout and uploads the report regardless of the prior step outcome. It also requires deterministic gate failures when evidence is missing.

- Seed-skills/rag-evaluation-metrics/SKILL.md separates retrieval and generation metrics and expects a complete golden set. Timeout handling must preserve that sample-to-metric identity before any mean is accepted.

- The [RAG regression CI guide](/blog/rag-regression-testing-guide) covers the wider workflow. This article owns injected evaluator timeouts, retry bounds, partial-result integrity, and final process status.

- A passing recovery test therefore shows exact attempts, sample order, report completeness, artifact status, and exit code. A log line saying retrying does not prove any of those outcomes.

## Which repository behavior defines the test contract?

The repo puts a top time bound on the full job and saves its report even when a step fails. The gate then reads that file and returns a bad status for weak proof. The test must keep both acts.

- In seed-skills/rag-regression-testing/SKILL.md, the CI job has a bounded runtime rather than an unlimited provider wait. The test should keep an inner per-attempt timeout below that outer job limit.

- The same workflow uploads report.json even after evaluation or gating fails. A timeout harness should create its partial report atomically before it returns a nonzero status, with a temp path and final hash saved so the upload step can prove it read the full file.

- The gate code in that file collects failures and exits with one when any required rule fails. Add missing sample IDs, exhausted timeouts, and duplicate terminal records to that deterministic failure list.

- The official [Ragas Run Config guide](https://docs.ragas.io/en/stable/howtos/customizations/run_config/) documents timeout and maximum retry controls. It also describes client-level timeout and retry settings for current integrations.

- The [Ragas evaluate reference](https://docs.ragas.io/en/latest/references/evaluate/) accepts runtime configuration and a raise-exceptions choice. It can return evaluation results through a configurable execution path, but the application still owns final completeness policy.

- The [HTTP Semantics reference](https://www.rfc-editor.org/info/rfc9110) gives a standard meaning for request timeout behavior. A fake provider can return a controlled timeout class without depending on a real network delay.

- Seed-skills/rag-evaluation-metrics/SKILL.md expects means and counts over known samples. An aggregate from four of five samples is not comparable with a five-sample baseline unless policy marks it incomplete.

- The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains metric selection and golden data. Timeout recovery should preserve those fields instead of replacing them with a generic provider error.

## How to ragas evaluator timeout recovery?

Use a fake score tool with a short plan for each item ID. One plan can score now, one can time out then score, and one can keep timing out. Raise the fault at once, so the test stays fast.

- Define an outcome plan for every sample. One sample can score immediately, one can time out once then score, and one can time out until its attempt budget is exhausted.

- Keep retry scheduling in owned code or an adapter that exposes attempt callbacks. If the provider SDK retries internally, configure it explicitly and capture enough evidence to avoid multiplying outer and inner retries.

- Record started and finished attempts with sample ID, metric, attempt number, outcome, duration bucket, and error class. Do not store prompts or private context in this focused diagnostic, while fixed start slots make two workers easy to sort after they finish out of order.

- The first code example uses a fake evaluator and fixed plans. Its result shape follows the case accounting and report discipline in seed-skills/rag-regression-testing/SKILL.md.

\`\`\`python
from collections import Counter
from dataclasses import dataclass

import pytest


class EvaluatorTimeout(TimeoutError):
    pass


@dataclass(frozen=True)
class SampleResult:
    sample_id: str
    state: str
    score: float | None
    attempts: int


class FakeEvaluator:
    def __init__(self, plans: dict[str, list[object]]) -> None:
        self.plans = plans
        self.calls: Counter[str] = Counter()

    def score(self, sample_id: str) -> float:
        attempt = self.calls[sample_id]
        self.calls[sample_id] += 1
        outcome = self.plans[sample_id][attempt]
        if outcome == "timeout":
            raise EvaluatorTimeout(sample_id)
        return float(outcome)


def evaluate_one(fake: FakeEvaluator, sample_id: str, max_attempts: int) -> SampleResult:
    for attempt in range(1, max_attempts + 1):
        try:
            return SampleResult(sample_id, "scored", fake.score(sample_id), attempt)
        except EvaluatorTimeout:
            if attempt == max_attempts:
                return SampleResult(sample_id, "timed_out", None, attempt)
    raise AssertionError("unreachable")


def test_timeout_recovers_within_attempt_budget() -> None:
    fake = FakeEvaluator({"s-17": ["timeout", 0.84]})
    result = evaluate_one(fake, "s-17", max_attempts=2)
    assert result == SampleResult("s-17", "scored", 0.84, 2)
    assert fake.calls == Counter({"s-17": 2})
\`\`\`

- Ragas evaluator timeout recovery proves exactly one saved retry in this case. Add a no-timeout control to ensure the runner does not retry successful samples out of habit.

- Then add an exhausted case and run both through the actual report writer. Ragas evaluator timeout recovery is complete only when the stored record and process status agree.

- Use the [RAG retrieval testing guide](/blog/rag-retrieval-testing-best-practices-2026) for upstream data checks. Keep this fake at the evaluator boundary so a retriever defect cannot appear as a timeout.

- The [AI testing skills directory](/skills) can provide metric harness patterns. Retain local sample IDs and exit policy because those are release contracts specific to the suite.

## Ragas evaluator timeout recovery example: scenario and assertion matrix

The case grid needs a clean score, a saved retry, a spent limit, mixed finish order, and a failed file write. Each row names its ID, try count, end state, saved score, and job status. No vague log can pass.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Immediate score | Sample s1 returns 0.82 on attempt one | One scored record and one attempt | Successful sample runs again | seed-skills/rag-evaluation-metrics/SKILL.md |
| Recovered timeout | Sample s2 times out once, then returns 0.79 | Scored record with two attempts | ID changes or extra retry occurs | [Ragas Run Config](https://docs.ragas.io/en/stable/howtos/customizations/run_config/) |
| Exhausted timeout | Sample s3 times out for every allowed attempt | Timed-out record and nonzero gate | Partial mean reports success | seed-skills/rag-regression-testing/SKILL.md |
| Concurrent mix | Three IDs finish in a different order | Report returns canonical sample order | Completion order drops or duplicates IDs | [Ragas evaluate reference](https://docs.ragas.io/en/latest/references/evaluate/) |
| Upload path | Report write succeeds after evaluator failure | Complete partial artifact remains available | Job exits before artifact creation | seed-skills/rag-regression-testing/SKILL.md |

- The immediate row catches unnecessary retries and repeated billing. A success must terminate that sample's attempt loop even while other workers continue.

- The recovered row proves stable identity across attempts. Attempt two belongs to the same golden sample and metric rather than becoming a new row in aggregate counts.

- The exhausted row is the decisive negative case. Preserve the sample and error evidence, exclude its missing score from means, mark the aggregate incomplete, and fail the release.

- The concurrent row separates report order from worker completion order. Sort by the committed sample order or a stable ID before writing evidence and comparing baselines.

- The upload row should use a temporary file followed by an atomic rename. This limits the chance that CI uploads a half-written JSON document after cancellation or process failure.

- Use the [RAG regression guide](/blog/rag-regression-testing-guide) for broader drift cases. Keep this table focused on evaluator availability and evidence integrity.

## What failures expose Ragas RunConfig timeout test?

Fault tests should add one extra try, drop one item, copy one end row, or let a short report pass. Another case should retry the wrong kind of fault. Each change must cause a clear item ID and state.

- Inject three timeout outcomes while allowing two attempts. The fake should record exactly two calls and one timed-out terminal row, leaving the unused third outcome untouched.

- Inject a timeout after several other samples have scored. Their records must remain present and unchanged when the failing sample reaches its limit.

- Shuffle worker completion order to expose report races. The final result should contain each expected sample exactly once in canonical order.

- Raise an unexpected error class for one sample. Policy should distinguish timeout recovery from malformed input or authentication failure rather than retrying every exception.

- Force the report writer to a controlled temporary directory and confirm it saves partial evidence before the gate returns. Then inject a write failure and ensure the job reports missing diagnostics separately.

- The second code example builds a complete report and derives exit status from sample accounting. It mirrors the repository rule that incomplete evidence cannot pass.

\`\`\`python
import json
from pathlib import Path


def build_report(expected_ids: list[str], results: list[SampleResult]) -> dict[str, object]:
    by_id = {result.sample_id: result for result in results}
    missing = [sample_id for sample_id in expected_ids if sample_id not in by_id]
    duplicates = len(results) - len(by_id)
    ordered = [by_id[sample_id] for sample_id in expected_ids if sample_id in by_id]
    incomplete = bool(missing or duplicates or any(row.state != "scored" for row in ordered))
    return {
        "expected_ids": expected_ids,
        "results": [row.__dict__ for row in ordered],
        "missing_ids": missing,
        "duplicate_count": duplicates,
        "complete": not incomplete,
        "exit_code": 1 if incomplete else 0,
    }


def test_exhausted_timeout_preserves_partial_report(tmp_path: Path) -> None:
    fake = FakeEvaluator({"s1": [0.91], "s2": ["timeout", "timeout"]})
    results = [
        evaluate_one(fake, "s1", 2),
        evaluate_one(fake, "s2", 2),
    ]
    report = build_report(["s1", "s2"], results)
    path = tmp_path / "report.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    assert report["complete"] is False
    assert report["exit_code"] == 1
    assert report["missing_ids"] == []
    assert json.loads(path.read_text(encoding="utf-8"))["results"][1]["state"] == "timed_out"
\`\`\`

- Add a duplicate-record mutation because a dictionary alone can hide repeated sample IDs. Compare source result count with unique ID count before constructing the ordered report.

- The [RAG CI guide](/blog/rag-regression-testing-guide) can place artifact upload after a failing command. The application test should still verify report creation without relying on workflow syntax alone.

## How should Ragas evaluator retry limit run in CI?

Use three time bounds with room between them. A web call ends first, the item loop ends next, and the full job ends last. Leave enough time after the loop to write and send the report.

- Do not set every limit to the same duration. The inner request should expire first, the sample loop should finish next, and the workflow should retain time for report writing and upload.

- Pin evaluator, provider client, retry adapter, and Ragas versions. A dependency change can shift which layer owns retries and accidentally multiply attempts.

- Run the deterministic fake suite without credentials on each pull request. Provider-backed timeout smoke tests can run in a controlled job, but they should not replace exact immediate failures.

- Require expected sample count, terminal record count, unique ID count, scored count, exhausted count, and total attempt count. These fields reveal work that a mean score cannot show, and the report should name any gap before it computes a mean from the rows that remain.

- Write the partial artifact before evaluating release status. Upload it under an always-run CI step, then keep the nonzero gate status rather than masking it to make upload continue.

- Fail on missing IDs, duplicate IDs, exhausted samples, unexpected exceptions, report-write failure, or attempt overflow. Decide separately whether a recovered timeout produces a warning or simply detailed evidence.

- The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) can consume complete results. Do not compare an incomplete mean with a full baseline because the missing cases may be the hardest ones.

- Add one test where all samples time out. The job should still write a valid zero-score partial report with a nonzero result, not divide by zero or claim no regression.

## Which assertions verify LLM metric timeout recovery?

Check the due ID list, each try, one end state per ID, saved scores, file hash, and job status. Also prove that a score saved before another item fails does not change. One retry count is not enough.

- Assert the exact expected sample ID list before execution. Compare it with source results, unique terminal IDs, and report order after execution.

- Assert one terminal state per sample. Attempt events can repeat, but scored, timed out, cancelled, or failed terminal records must not.

- Assert attempt numbers start at one, increase without gaps, and never exceed the configured maximum. Preserve error class and retry decision for each failed attempt.

- Assert that an immediate success has one attempt and a recovered sample stops after scoring. These controls catch retry loops that continue after a valid response.

- Assert scores completed before another sample times out remain byte-for-byte unchanged. Shared mutable report objects can otherwise lose or overwrite concurrent results.

- Assert incomplete aggregates carry no passing release decision. You may report means over available scores for diagnosis, but label their sample counts and keep the gate nonzero.

- Assert the artifact parses, lists policy and tool versions, and matches the in-memory report. Write through a temporary path so readers never see partial JSON, with the temp and final paths checked to ensure no reader saw a half-written row set.

- Use the [RAG regression guide](/blog/rag-regression-testing-guide) for metric thresholds after completeness passes. A threshold assertion cannot compensate for a lost sample or unbounded evaluator call.

## Step-by-step test implementation

Build the small state flow before you add real web calls or many workers. Each item moves from due to running, then to scored or failed. Save every move, build the file, and set job status from that file.

1. Read seed-skills/rag-regression-testing/SKILL.md and seed-skills/rag-evaluation-metrics/SKILL.md, then define expected IDs, terminal states, attempt semantics, artifact fields, and nonzero gate rules.
2. Create fake plans for immediate score, one-time recovery, exhaustion, unexpected error, duplicate result, shuffled completion, all-timeout, and report-write failure.
3. Add an evaluator adapter with explicit per-attempt timeout, maximum attempts, retryable error classes, attempt events, and stable sample IDs.
4. Execute expected cases, preserve completed scores, build canonical terminal records, and calculate aggregates only when completeness policy allows them.
5. Inject attempt overflow, dropped IDs, duplicate IDs, partial success, report corruption, and masked exit status, then require one clear failure per defect.
6. Run pytest in CI, retain atomic partial reports through an always-run upload step, clean owned files, and release broader scoring only after completeness passes.

- Start with serial execution because state transitions are easier to review. Add controlled concurrent completion after each sample already produces a correct terminal record.

- Keep the fake outcome list longer than the allowed attempts in one case. The unused outcome proves the runner stopped because of policy rather than because the fake ran out of events.

- Test exceptions by class, not message text. Provider clients may alter wording while preserving a stable timeout or authentication category.

- Use the [AI testing skills directory](/skills) for evaluator patterns, then keep retry ownership explicit in the adapter. Hidden retries at several layers can turn two configured attempts into many calls.

- Round-trip JSON and compare expected IDs after parsing. This catches tuple, enum, decimal, or exception serialization choices before CI uploads the file.

- The [RAG retrieval guide](/blog/rag-retrieval-testing-best-practices-2026) can validate inputs before evaluation. This procedure begins once the evaluator receives a named sample and should not mutate retrieval data.

## Failure triage and regression ownership

Start with six counts: due, started, ended, unique, scored, and timed out. If they do not match, check the task loop and report map first. If counts match but time grows, check the web client and retry owner.

- If attempts exceed policy, inspect nested SDK, Ragas, and application retries. Choose one owning layer or calculate a deliberate combined maximum and test it.

- If a sample ID changes between attempts, the adapter or task scheduler owns the defect. Retries must reuse the original golden identity and metric name.

- If completed scores disappear after another timeout, report state or worker coordination owns the issue. Preserve immutable per-sample records before updating shared progress.

- If a partial report exists but CI passes, the gate or workflow command handling owns the failure. Check shell status propagation and avoid commands that intentionally swallow the evaluator exit code.

- If CI fails before the report exists, inspect atomic write order and remaining outer timeout. Reserve enough time after inner retries for serialization and upload.

- If only real-provider tests fail, inspect provider status, credentials, network limits, and client configuration. Use the [blog index](/blog) to check wider service faults, while the fixed fake suite stays green and keeps the same try rule for all known item IDs.

- If aggregate scores change only when a sample times out, confirm the report labels its smaller denominator. The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) can help assess metrics once the dataset is complete.

- Any retry or timeout policy change needs platform and evaluation owners. Increasing limits may raise cost and duration while hiding a provider reliability regression.

## Frequently Asked Questions

### How do you simulate Ragas evaluator timeouts and verify bounded retries, preserved sample IDs, partial reports, and a nonzero CI result?

Drive a fake evaluator with outcome lists keyed by stable sample ID, and raise immediate timeout exceptions for selected attempts. Assert exact attempt counts and terminal states. Build an atomic report containing every expected ID, then derive a nonzero exit code whenever any sample remains unscored or duplicated.

### What fixture best tests how to ragas evaluator timeout recovery?

Use plans for immediate success, one-time recovery, exhausted timeout, unexpected error, duplicate terminal result, shuffled completion, all-timeout, and report-write failure. Keep expected IDs and attempt budgets fixed. This fixture exercises retry control, identity, concurrency, partial evidence, artifact integrity, and final process status.

### Which failure signal proves ragas evaluator timeout recovery example?

The best signal names sample ID, metric, expected maximum attempts, observed attempts, terminal state, and report completeness. For example, s3 timed out after two attempts and gate returned one. A generic low mean cannot prove timeout recovery because normal quality failures can also reduce scores.

### How should CI report Ragas RunConfig timeout test?

CI should publish configured time budgets, retryable classes, expected IDs, attempt events, terminal records, scored and exhausted counts, aggregate sample count, report hash, and exit code. Upload partial evidence even when the gate fails. Never print prompts, private contexts, credentials, or raw provider payloads.

### When should Ragas evaluator retry limit block a release?

Block when attempts exceed policy, IDs disappear or duplicate, exhausted samples remain, unexpected errors are retried, partial means pass, artifacts are missing, or the workflow masks a nonzero result. Also block an all-timeout run. None of these states proves the complete golden set was evaluated.

### How can teams keep LLM metric timeout recovery repeatable?

Use immediate fake exceptions, fixed outcome plans, pinned versions, explicit attempt semantics, canonical result order, and atomic report writes. Run serial and controlled concurrent cases. Keep inner limits below the workflow timeout, preserve every sample ID, and compare parsed artifacts with in-memory terminal records on every change.

## Conclusion

Ragas evaluator timeout recovery is dependable when retries stop at a known bound, identities survive every attempt, completed scores remain intact, and incomplete work produces both diagnostics and failure. The gate should reject attempt overflow, lost or duplicate samples, partial success, missing artifacts, and masked exit codes.

Keep one tiny set with a fast score, a late score, and a full time loss. Those three paths make each retry rule easy to see. Save that set with the report so each tool change uses the same base.

The last check should force every item to time out. It must still write a sound file and return a bad job status. This keeps a total service loss from looking like an empty but clean run.

Open the [RAG evaluation skills directory](/skills) to choose a focused metric skill, then read the [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) before implementing this regression gate. Keep the first partial report as the base for later retry changes.`,
};
