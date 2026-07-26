import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval cached response regrading',
  description:
    'DeepEval cached response regrading: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'DeepEval cached response regrading',
  keywords: [
    'DeepEval cached response regrading',
    'how to deepeval cached response regrading',
    'deepeval cached response regrading example',
    'DeepEval response cache test',
    'regrade LLM outputs without recall',
    'separate generation and evaluation cache',
  ],
  relatedSlugs: [
    'deepeval-pytest-llm-testing-guide',
    'testing-llm-applications-guide',
    'llm-evaluation-ci-cd-quality-gates',
    'llm-eval-cost-latency-testing-guide-2026',
  ],
  sources: [
    'https://deepeval.com/docs/evaluation-datasets',
    'https://deepeval.com/docs/evaluation-end-to-end-single-turn',
    'https://deepeval.com/docs/introduction',
  ],
  repoEvidence: [
    'seed-skills/deepeval-llm-evaluation/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
  ],
  content: `DeepEval cached response regrading stores one application output with immutable input and generation provenance, then evaluates that same record under each pinned judge configuration. A rubric, threshold, or judge change creates a new grade record, not a new response. Generator call counts and response checksums prove that regrading never recalled the application.

## What must DeepEval cached response regrading prove?

DeepEval cached response regrading must prove that app run and grade have split identities, caches, and lifecycle rules. The app response stays fixed while a changed rubric, threshold, metric, or judge creates a new grade linked to the same response ID.

The response record should contain case ID, normalized input, actual output, expected output when used, search context, app run model, prompt version, settings, creation time, and content checksum. These fields explain what the app produced.

The grade record should contain response ID, judge key, metric setup, rubric version, judge model, threshold, score, reason, and grade time. These fields explain how one fixed output was judged.

A cache hit is not enough proof because one cache can mix both layers. If the grade cache key ignores rubric or judge changes, a regrade may return a stale score without calling either app or judge.

The [DeepEval introduction](https://deepeval.com/docs/introduction) describes test cases and metrics as central grade concepts. This design stores the test case inputs separately from the metric result that can change later.

Checksums protect proof from accidental change. Compute the response checksum from canonical case fields and verify it before and after each judge call.

The app count provides a second, direct oracle. A regrade run should make zero app-app run calls when each requested response ID is present and valid.

Missing or corrupt response data must fail closed. The runner should not silently regenerate because a new output would break match with earlier grade records.

The [LLM evaluation cost guide](/blog/llm-eval-cost-latency-testing-guide-2026) addresses wider budget controls. DeepEval cached response regrading owns cache-key split and fixed proof during judge changes.

Use the [QA skills directory](/skills) for broader grade patterns, but keep this contract exact. A pass means one response checksum, zero recall, and distinct judge records for each requested grade key.

## Which repository behavior defines the test contract?

The repository explicitly recommends response reuse and pinned judge ID. Those controls combine into a local contract for safe recheck.

\`seed-skills/deepeval-llm-evaluation/SKILL.md\` lines 140 through 148 defines CI gate rule and common mistakes. It recommends caching app responses so reruns only rejudge, while also requiring deliberate judge version pinning and rebaselining.

That guidance distinguishes the expensive system output from the judge result. It does not support overwriting the first response when a threshold or rubric changes.

\`seed-skills/prompt-testing/SKILL.md\` lines 739 through 741 lists response caching and pinned model versions as split controls. This split matters because cached output can remain valid while the judge setup changes.

The repository proof does not prescribe a storage product. A file fixture, object store, database, or test artifact can satisfy the contract when ID, immutability, checksums, and access rules are explicit.

The [DeepEval dataset documentation](https://deepeval.com/docs/evaluation-datasets) treats datasets as collections used for grade work. Stable case ID is therefore useful when converting cached records into grade test cases.

Read the process in execution order. The runner loads a response by app run key, validates its checksum, creates a DeepEval test case, builds the requested pinned metric, evaluates, and appends one grade record.

Observable outputs include app count, response checksum, judge key, score, reason, threshold result, case counts, and cache status. Observable errors include missing data, change, stale grade reuse, crossed response IDs, and skipped judge work.

The [testing LLM applications guide](/blog/testing-llm-applications-guide) covers the wider test style. Here, pytest also verifies the storage flow surrounding those metrics.

## How to DeepEval cached response regrading?

How to DeepEval cached response regrading begins by defining two keys. The app run key identifies app inputs, while the judge key identifies each fact that can change a grade.

A app run key can hash case ID, input, expected output, search context, system prompt version, app model, settings, and tool or retriever versions. Do not include the judge setup because it does not create the app output.

An judge key can hash metric name, rubric text, threshold, judge model, judge settings, tool version, and scoring rule. Changing any grading influence should create a cache miss for grade only.

Store the response under the app run key and assign a stable response ID. Build each DeepEval \`LLMTestCase\` from that fixed record rather than calling the app inside the test body.

Before grading, recalculate the content checksum and compare it with the stored value. After grading, repeat that check so an judge wrapper cannot mutate lists or fields by reference.

Count both app and judge calls. The expected positive path for a rubric change is zero app calls, one judge call, one new grade record, and the first response checksum.

The first pytest example follows the caching recommendation in \`seed-skills/deepeval-llm-evaluation/SKILL.md\`. It uses DeepEval's test-case shape while injecting a deterministic grader at the external judge boundary.

\`\`\`python
from dataclasses import dataclass
from hashlib import sha256
from unittest.mock import Mock

from deepeval.test_case import LLMTestCase


@dataclass(frozen=True)
class CachedResponse:
    response_id: str
    case_id: str
    prompt: str
    actual_output: str
    expected_output: str
    checksum: str


def response_checksum(prompt: str, actual_output: str) -> str:
    return sha256(f"{prompt}\\0{actual_output}".encode()).hexdigest()


def regrade(record: CachedResponse, evaluator_key: str, grader):
    assert response_checksum(record.prompt, record.actual_output) == record.checksum
    test_case = LLMTestCase(
        input=record.prompt,
        actual_output=record.actual_output,
        expected_output=record.expected_output,
    )
    score = grader(test_case)
    assert response_checksum(record.prompt, record.actual_output) == record.checksum
    return {"response_id": record.response_id, "evaluator_key": evaluator_key, "score": score}


def test_regrades_one_immutable_response_without_generation():
    app = Mock()
    grader = Mock(return_value=0.86)
    record = CachedResponse(
        response_id="response-17",
        case_id="refund-17",
        prompt="What is the refund window?",
        actual_output="The rule allows 14 days.",
        expected_output="14 days",
        checksum=response_checksum(
            "What is the refund window?",
            "The rule allows 14 days.",
        ),
    )

    result = regrade(record, "correctness:v2:judge-pinned:0.80", grader)
    assert result == {
        "response_id": "response-17",
        "evaluator_key": "correctness:v2:judge-pinned:0.80",
        "score": 0.86,
    }
    app.assert_not_called()
    grader.assert_called_once()
\`\`\`

The injected grader can wrap a real DeepEval metric in integration tests. Unit tests keep it deterministic so storage and key flow fail for one clear reason.

Use the [testing LLM applications guide](/blog/testing-llm-applications-guide) for the surrounding score strategy. Preserve the response record as the common proof for each regrade.

## DeepEval cached response regrading example: scenario and assertion matrix

A DeepEval cached response regrading example should test stable reuse, intentional judge changes, corruption, concurrency, and missing proof. Each row below names the calls and records expected from the runner.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Stable response | Valid cached record and one pinned metric | Zero generator calls and one grade linked to response ID | Application runs during grading | \`seed-skills/deepeval-llm-evaluation/SKILL.md\` |
| Rubric boundary | Same response with rubric versions one and two | Two evaluator keys share one checksum | New rubric reuses a stale grade | [DeepEval single-turn evaluation](https://deepeval.com/docs/evaluation-end-to-end-single-turn) |
| Corrupt record | Stored output no longer matches checksum | Regrade stops before judge invocation | Runner regenerates or grades changed output | \`seed-skills/prompt-testing/SKILL.md\` |
| Concurrent regrade | Two judges grade one response together | Distinct grade IDs and unchanged response | Grade writes overwrite each other | [DeepEval datasets](https://deepeval.com/docs/evaluation-datasets) |
| Missing response | Requested response ID is absent | Case is incomplete and blocks the run | Generator silently fills the gap | \`seed-skills/deepeval-llm-evaluation/SKILL.md\` |

The stable row proves the common path with exact call counts. It should also compare checksum, response ID, judge key, score type, and grade cardinality.

The rubric row changes grade only. Both grades must point to the same response ID, while their judge keys and rubric versions remain distinct.

The corrupt row protects immutability. Recomputing output would create new proof, so the runner should report a cache-hash failure and request an explicit app run job.

The concurrent row tests write split. A unique constraint on response ID plus judge key can prevent duplicate grade records while allowing new judges.

The missing row stops automatic recall. DeepEval cached response regrading cannot make a historical match if some app outputs were regenerated under new conditions.

## What failures expose DeepEval response cache test?

A DeepEval response cache test fails when recheck calls the app, mutates cached proof, changes sample ID, returns a stale judge result, or compares grades from new response IDs. Capture keys, checksums, and call counts before inspecting scores.

Inject a missing response and configure a tempting app fallback. The regrade command should raise a missing-proof error and leave the app count at zero.

Mutate \`retrieval_context\` through a shared list passed into a metric wrapper. Freeze or deep-copy the stored record, then verify the full checksum after grade.

Change only the rubric version while keeping a grade-cache key that omits it. The test should detect that the returned grade has the wrong judge key even if its numeric score seems plausible.

Change the threshold without changing rubric text. The score may remain same, yet the pass result and judge key must reflect the new threshold.

Return grades in a new order from the requested cases. Join by response ID and case ID, because positional joins can compare one sample's old grade with another sample's new grade.

The negative example applies the split caching and model-pinning controls in \`seed-skills/prompt-testing/SKILL.md\`. It rejects a common defect where the grade key excludes judge setup.

\`\`\`python
from dataclasses import dataclass

import pytest


@dataclass(frozen=True)
class EvaluatorConfig:
    metric: str
    rubric_version: str
    threshold: float
    judge_model: str


def evaluator_key(config: EvaluatorConfig) -> str:
    return (
        f"{config.metric}:{config.rubric_version}:"
        f"{config.threshold:.2f}:{config.judge_model}"
    )


def load_grade(cache: dict, response_id: str, config: EvaluatorConfig):
    key = (response_id, evaluator_key(config))
    if key not in cache:
        raise KeyError("grade cache miss")
    return cache[key]


def test_judge_change_cannot_reuse_an_old_grade():
    old = EvaluatorConfig("correctness", "v1", 0.75, "judge-pinned-a")
    new = EvaluatorConfig("correctness", "v1", 0.75, "judge-pinned-b")
    cache = {
        ("response-17", evaluator_key(old)): {
            "score": 0.82,
            "judge_model": "judge-pinned-a",
        }
    }

    with pytest.raises(KeyError, match="grade cache miss"):
        load_grade(cache, "response-17", new)
    assert len(cache) == 1
\`\`\`

Also test an empty batch and a partially graded batch. Both should fail expected-count checks instead of reporting an average over whichever records happened to finish.

The [evaluation CI/CD guide](/blog/llm-evaluation-ci-cd-quality-gates) can define threshold rule. This cache test first proves that the threshold applied to the intended fixed response.

## How should regrade LLM outputs without recall run in CI?

Regrade LLM outputs without recall in a dedicated CI mode that has read access to response artifacts and no path to the app app. Architectural denial is stronger proof than relying only on a mock assertion.

Pin dataset version, response artifact log, DeepEval version, metric setup, rubric text, threshold, and judge ID. Record checksums for each input in the run summary.

Split app run and grade into split commands or jobs. The regrade job should accept response log and judge setup, then reject any missing or invalid record.

Use a pinned judge fake for pull-request contract tests and the configured judge for approved integration runs. Both modes should produce the same grade-record schema and cache-key rules.

Run focused storage tests with \`pytest -q tests/test_cached_regrading.py\`. Run the tool grade command only when credentials and approved response artifacts are available.

Retain response log, judge log, grade records, call counts, hash failures, and complete-case totals. Do not duplicate full sensitive outputs when a restricted response ID and checksum provide sufficient shared proof.

Block release on app access, checksum mismatch, response-ID drift, stale judge cache, missing grades, duplicate grade ID, crossed case joins, or partial batches. Score threshold failures then follow the configured score rule.

The [evaluation CI/CD guide](/blog/llm-evaluation-ci-cd-quality-gates) explains normal gate execution. This regrade mode adds storage permissions and call-count proof around it.

Make temporary grade writes atomic and clean abandoned files after failure. Never remove the source response artifact as part of judge cleanup.

If judge calls fail, preserve completed grade records with terminal status and report the missing cases. A rerun may resume absent judge keys without regenerating app output.

## Which assertions verify separate generation and evaluation cache?

Separate generation and evaluation cache assertions must prove key composition, storage split, call boundaries, and fixed joins. Merely checking that two cache directories exist does not prove correct flow.

Assert each field included in the app run key and judge key. Unit tests should change one field at a time and require only the appropriate key to change.

A rubric, threshold, judge model, judge parameter, metric version, or tool version should change the judge key. None should change the app run key or response checksum.

An input, prompt version, app model, app parameter, search context, or tool version should change the app run key. Existing grade records must remain attached to their first response ID.

Assert app call count equals zero for regrade mode. Also prevent app construction or credentials in that job when the architecture permits.

Assert one valid checksum before and after each metric call. Include mutable fields such as search context and expected output in the canonical digest.

Check grade uniqueness by response ID and judge key. Repeating the same regrade can return the existing exact grade, while a changed judge key creates a distinct record.

Assert all requested response IDs receive terminal grade states. Success, threshold failure, judge error, and skipped-by-rule should be explicit, with no silent omissions.

The [LLM evaluation cost guide](/blog/llm-eval-cost-latency-testing-guide-2026) offers wider cost controls. DeepEval cached response regrading uses these checks to ensure savings never weaken record links.

## Step-by-step test implementation

Implement rechecking as a proof step from cached responses to versioned grade records. This order keeps app calls out of reach and each match repeatable.

1. Read \`seed-skills/deepeval-llm-evaluation/SKILL.md\` lines 140 through 148 and \`seed-skills/prompt-testing/SKILL.md\` lines 739 through 741, then define immutable response and evaluator record schemas with version, case, response, checksum, metric, judge, and threshold fields.
2. Create valid, corrupt, missing, shared-list, changed-rubric, changed-threshold, changed-judge, concurrent, and partial-batch fixtures with stable case and response IDs, known outputs, fixed hashes, and exact expected call counts.
3. Build generation and evaluator keys from separate field lists, compute canonical response checksums, and construct DeepEval test cases only from validated cached records after every requested ID and schema version passes.
4. Run two pinned evaluator configurations against one response, then assert zero generator calls, stable checksum, distinct evaluator keys, and exact response joins, score shapes, reasons, thresholds, and grade counts.
5. Inject regeneration fallback, mutation, stale grade reuse, crossed IDs, duplicate writes, and judge failure, then assert integrity errors, unchanged source records, zero app calls, and complete terminal counts.
6. Run focused pytest checks in CI, retain response and evaluator manifests, clean temporary grade writes, and route storage, key, judge, policy, or harness failures separately with both keys and call counts attached.

Start with one cached response and two judge keys. This small case makes it obvious whether a rubric change calls the app or overwrites the first grade.

Add a base grade with a known score, reason, and pass flag before testing new judge keys. This base proves that the stored response can be read as-is, and its checksum gives each later grade a fixed point for ID and content checks, with the prior byte count saved for review.

Canonicalize response data in one tested function. Sort mapping keys, preserve list order where meaningful, and define how line endings or absent optional fields affect the digest.

Keep stored records fixed in code as well as rule. Frozen data classes and read-only storage permissions reduce accidental change, while checksums detect what still changes.

Test cache keys through parameterized field mutations. A table of input field, expected app run-key change, and expected judge-key change makes omissions easy to review.

Add concurrent writes after single-threaded flow passes. Use atomic create or a uniqueness rule so two same regrades do not produce conflicting records.

Use the [testing LLM applications guide](/blog/testing-llm-applications-guide) when selecting metrics and cases. Preserve this procedure's strict split between producing an answer and judging it.

## Failure triage and regression ownership

Triage begins with response hash and app count. Any changed checksum or nonzero app call belongs to response storage, job permissions, or fallback logic before judge scores receive attention.

If the response is stable but the wrong grade returns, compare judge-key fields. Missing rubric, threshold, judge, metric, or tool versions belong to cache-key ownership.

If the correct judge runs against the wrong response, inspect case and response joins. Position-based joins and reused sample IDs can cross records even when both caches are internally valid.

If keys and joins pass but scores change, inspect judge ID, metric setup, and rubric first. A deliberate judge change may require rebaselining rather than an app fix.

If repeated same judge keys create conflicting grades, inspect uniqueness, nondeterministic judge rule, and write split. Preserve both attempted results until the cause is known.

If a batch is partial after a judge outage, assign the missing grade records to judge operations. Do not route them to app run or refill them with new app responses.

The [blog index](/blog) includes related grade design and CI topics. Attach response checksum, judge key, app count, judge count, expected cases, observed states, and the first invalid join.

The result path is direct: changed proof goes to storage, app calls go to mode controls, and stale grades go to key design. Crossed samples go to joins, judge errors go to grade operations, and true threshold failures go to score owners.

## Frequently Asked Questions

### How do you cache application responses while forcing DeepEval to regrade them after a rubric, threshold, or judge version changes?

Store each app output under an app-run key with response ID and checksum. Build a distinct judge key containing metric, rubric, threshold, judge, and tool versions. A changed judge key must invoke grading against the same response while app calls remain zero and the checksum stays equal.

### What fixture best tests how to DeepEval cached response regrading?

Use one frozen response record and two judge configurations that differ only by rubric or judge version. Assert one response ID, one checksum, zero app calls, two judge calls, and two distinct grade records. Add a corrupt record to prove recheck fails instead of regenerating.

### Which failure signal proves DeepEval cached response regrading example?

The clearest failure is any app call during regrade mode, followed by checksum change, stale judge-key reuse, or a grade linked to another response ID. Preserve call counts and both manifests. A changed numeric score is expected when the judge changes and is not itself a cache defect.

### How should CI report DeepEval response cache test?

CI should publish response and judge manifests, checksums, app and judge call counts, grade identities, hash failures, and complete-case totals. The report should reference restricted outputs by ID rather than copying sensitive text. Missing responses or grades must fail instead of shrinking the evaluated set.

### When should regrade LLM outputs without recall block a release?

Block release when regrade mode can access app run, a response checksum fails, judge keys omit grading inputs, cases cross IDs, grade writes collide, or the batch is partial. After those checks pass, metric thresholds can block under the team's normal score rule.

### How can teams keep separate generation and evaluation cache repeatable?

Version both schemas, canonicalize response checksums, enumerate key fields, pin judge inputs, and make response artifacts read-only. Parameterize tests that change one field at a time. Repeat same grades under isolated writes, while changed judge keys create new records for the same fixed response.

## Conclusion

DeepEval cached response regrading is trustworthy when fixed response proof feeds independently versioned judge records, app access stays at zero, and each grade joins to one verified response ID. Regeneration, change, stale keys, crossed cases, or partial grades must block release.

Open the [AI testing skills directory](/skills) to choose a grading workflow. Then read \`/blog/deepeval-pytest-llm-testing-guide\` before implementing this regression gate.`,
};
