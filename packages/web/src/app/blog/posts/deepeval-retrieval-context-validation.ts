import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval retrieval context validation',
  description:
    'DeepEval retrieval context validation: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'DeepEval retrieval context validation',
  keywords: [
    'DeepEval retrieval context validation',
    'how to deepeval retrieval context validation',
    'deepeval retrieval context validation example',
    'DeepEval faithfulness missing context',
    'LLMTestCase retrieval_context test',
    'validate RAG context before eval',
  ],
  relatedSlugs: [
    'deepeval-pytest-llm-testing-guide',
    'testing-llm-applications-guide',
    'llm-evaluation-ci-cd-quality-gates',
    'deepeval-metrics-complete-guide-2026',
  ],
  sources: [
    'https://deepeval.com/docs/evaluation-test-cases',
    'https://deepeval.com/docs/evaluation-end-to-end-single-turn',
    'https://deepeval.com/docs/evaluation-datasets',
  ],
  repoEvidence: [
    'seed-skills/deepeval-llm-evaluation/SKILL.md',
    'seed-skills/rag-regression-testing/SKILL.md',
  ],
  content: `DeepEval retrieval context validation should run before any metric reads a case. A passing first check accepts a useful, nonempty list of found text and rejects missing, empty, malformed, or known-unrelated context with a clear case reason, while it proves the score step was never called for bad input.

## What must DeepEval retrieval context validation prove?

DeepEval retrieval context validation must prove each faithfulness case sent for a score has useful search proof. The test should tell a valid context list from a case that has the right field name but the wrong data, using deterministic preflight rules instead of evaluator interpretation.

The pass rule has two clear parts that CI can check with no live model. Good cases reach the metric once, while bad cases stop at the first check with a stable reason and no change to saved results, preserving exact cardinality across acceptance and rejection reports.

Missing means the app never set \`retrieval_context\`. Empty means it sent no chunks, malformed means the value or list items have the wrong shape, and unrelated means the chunks do not fit the case's reviewed source rule, so each classification requires separate diagnostic evidence.

DeepEval's [single-turn test case documentation](https://deepeval.com/docs/evaluation-test-cases) says \`retrieval_context\` holds search results from the app run and can take strings or found-context objects. It also splits real search results from the ideal \`context\` used as a base, making field provenance essential for reliable metric configuration.

The [end-to-end evaluation guide](https://deepeval.com/docs/evaluation-end-to-end-single-turn) shows apps adding made answers and found chunks to \`LLMTestCase\`. It says filled fields must match metric needs, with \`retrieval_context\` needed for faithfulness, which supports validation before evaluator initialization.

The local repo proof backs that narrow rule. \`seed-skills/deepeval-llm-evaluation/SKILL.md\` builds faithfulness cases with found chunks and names lost context as a common test mistake, establishing repository evidence for mandatory context preparation.

This guide does not change DeepEval's broad case rules. It sets a stricter first check for one metric suite and one saved RAG data set, where all scored cases need search proof, explicit source attribution, and reproducible relevance criteria.

Use the [DeepEval pytest guide](/blog/deepeval-llm-testing-guide) for test setup and metric basics. Use this rule when bad search proof must never enter a score run or spend judge cost.

The [QA skills directory](/skills) has more RAG and test flows for the next stage. Pick one only after the case shape, block reasons, and score gate are clear to the whole team.

## Which repository behavior defines the test contract?

Start with \`seed-skills/deepeval-llm-evaluation/SKILL.md\` because it shows the data flow nearest the score call. Its sample makes an app answer, saves found chunks, and sends them as \`retrieval_context\`, defining the serialization boundary that preflight must inspect.

The same file uses a faithfulness metric with a clear score floor. Its common-mistakes part warns that faithfulness needs the chunks, so the first check should run before the metric is built or run, preventing invalid input from consuming evaluation resources.

The repo does not give a ready-made function for this check. The test rig below is new test code that turns the stated data need into a local rule with results the team can see, without implying an undocumented framework capability.

Next, \`seed-skills/rag-regression-testing/SKILL.md\` treats a saved golden set as the drift rule. It also pins the judge, vector model, prompt, search tool, and \`top_k\`, so a score shift has a known source, configuration history, and regression owner.

That second file saves known inputs and expected test facts in checked-in files. For off-topic cases, add reviewed source IDs or key proof terms to the case instead of asking a loose model to judge fit, keeping relevance classification deterministic and reviewable.

The first-check input is a case ID, question, made answer, context list, and reviewed fit rule. Its output is either a checked case or a typed block with one stable reason that CI can group, aggregate, and route without parsing prose.

The test can see whether the score call ran, how many chunks passed, which source IDs were used, and whether a report row was saved. Those facts are stronger than a later metric score on its own, because they preserve execution order, provenance, and side-effect isolation.

Use the [LLM CI quality gate guide](/blog/llm-evaluation-ci-cd-quality-gates) to join this first check with score floors. A low score and a bad case are not the same fault, so they need distinct owners and logs, independent failure classifications, and separate remediation paths.

DeepEval retrieval context validation should fail closed only for the chosen suite. A metric that does not use found context can set a different first check without making this faithfulness rule weak.

## How to deepeval retrieval context validation?

How to deepeval retrieval context validation begins with cases stored in a small table. Each row changes one context trait while it keeps the question, answer, case ID, search build, and planned score flow fixed.

Model the accepted context as a nonempty list of nonblank strings or reviewed objects. Normalize only harmless whitespace, and never convert a wrong type into a value that happens to pass, since coercion destroys the original serialization fault.

Fit needs a clear oracle because valid syntax cannot prove that a chunk backs the answer. A small drift case can require one of a few reviewed source IDs and one key proof term for its known question, providing transparent relevance criteria without another model call.

Do not use the faithfulness score to decide if the input may get that same score. Such a loop lets bad proof spend judge time and may yield a number that looks sound but tests the wrong data, creating circular validation and ambiguous failure ownership.

The first Python and pytest sample adds a small first check around a case data class. It reflects the repo's need for context without a false claim that this helper is already in the code.

\`\`\`python
from dataclasses import dataclass
from typing import Callable

import pytest


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    question: str
    answer: str
    retrieval_context: object
    allowed_sources: frozenset[str]


def validate_context(case: EvalCase) -> list[dict[str, str]]:
    chunks = case.retrieval_context
    if not isinstance(chunks, list) or not chunks:
        raise ValueError("context-missing-or-empty")
    if any(not isinstance(chunk, dict) for chunk in chunks):
        raise ValueError("context-member-type")
    if any(not chunk.get("text", "").strip() for chunk in chunks):
        raise ValueError("context-blank-text")
    if not any(chunk.get("source") in case.allowed_sources for chunk in chunks):
        raise ValueError("context-unrelated-source")
    return chunks


def evaluate_after_preflight(
    case: EvalCase, scorer: Callable[[EvalCase], float]
) -> float:
    validate_context(case)
    return scorer(case)


def test_valid_context_reaches_scoring_once(mocker):
    scorer = mocker.Mock(return_value=0.94)
    case = EvalCase(
        case_id="shipping-de-01",
        question="How long does shipping take?",
        answer="Shipping takes three days.",
        retrieval_context=[
            {"source": "shipping-policy", "text": "Germany: three days"}
        ],
        allowed_sources=frozenset({"shipping-policy"}),
    )

    assert evaluate_after_preflight(case, scorer) == pytest.approx(0.94)
    scorer.assert_called_once_with(case)
\`\`\`

The pass case checks score shape and call count, but the first check does not judge score quality. The metric tests still own score floors after the case has proved that it is fit to run, maintaining architectural separation between input validation and evaluation.

Add good cases with more than one chunk in a fixed order. The check may allow several sources, while the score case should keep the search order that the app sent in the real flow.

Keep raw found text in the local test unless team rules allow it in build files. Case reports can keep source IDs, counts, hashes, and block reasons without showing all private text.

The [testing LLM applications guide](/blog/testing-llm-applications-guide) covers wider answer checks. DeepEval retrieval context validation should stay focused on whether the score call gets the proof shape and source fit it needs.

## Deepeval retrieval context validation example: scenario and assertion matrix

A deepeval retrieval context validation example should have one pass control for each block group. This stops a broken score spy from making all fail cases look safe when no case can reach it.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Valid baseline | One reviewed source and nonblank chunk | Scorer called once with unchanged order | Preflight rejects valid evidence | DeepEval test case docs |
| Missing value | \`retrieval_context\` is \`None\` | Stable missing reason, zero score calls | Case reaches metric scoring | Repository common mistake |
| Empty list | No runtime retrieval chunks | Stable empty reason, zero report rows | Empty context receives a score | DeepEval end-to-end guide |
| Wrong member type | List contains a number or plain object without text | Type reason identifies member index | Coercion creates false evidence | Application case schema |
| Blank chunk | String is only whitespace | Blank-text reason, no scoring | Whitespace passes as context | Application preflight |
| Unrelated source | Valid chunk from another reviewed topic | Relevance reason names source rule | Misleading faithfulness score exists | Versioned golden contract |

Run the valid baseline first and assert that chunk order remains unchanged. A validator that sorts or deduplicates context silently changes the evaluated retrieval behavior, invalidating position-sensitive diagnostics and provenance comparison.

For missing and empty values, keep distinct reason codes in the saved report. Missing may show a broken app hook, while empty may be a real search result that this faithfulness suite cannot score, so classification preserves separate application and retrieval ownership.

For wrong item types, report the first bad index and real type. Do not dump the whole chunk into CI, since its shape is enough to find a case or bridge-code fault.

For off-topic proof, use a reviewed map tied to the golden case. Source ID is more stable than a broad word match, while key terms can still catch a source with the wrong label.

The [DeepEval metrics guide](/blog/deepeval-metrics-complete-guide-2026) explains where fields for each metric differ. Keep this first check linked only to metrics that state they read found context as proof.

Store the grid as data and run each row as a named case. DeepEval retrieval context validation is easier to review when a new block needs a named row, not a hidden code branch, with deterministic reconciliation across discovered, accepted, and rejected cases.

## What failures expose DeepEval faithfulness missing context?

DeepEval faithfulness missing context is clear when a faithfulness case reaches the score step with \`None\`, an empty list, or a bad item. The best oracle is zero judge calls for each blocked case.

A case object that can be built does not prove it is fit for this metric. DeepEval has many optional fields because each metric needs distinct data, so the app must check the metric set it chose.

An empty list is not the same as failed test search. Check the case count before the run and keep one report row for each blocked case, with no score value in that row.

Malformed values often enter through JSON or database adapters. Test a string, object, number, nested list, blank string, and object missing its text or source field.

Off-topic context can still have a valid shape, which makes it hard to spot. A metric could score how well the answer follows those wrong chunks, though the real search rule has already failed.

The fail test below proves the first check blocks bad rows before any judge side effect. It also checks that each input case stays the same after the run attempt ends.

\`\`\`python
from copy import deepcopy
from unittest.mock import Mock

import pytest


@pytest.mark.parametrize(
    ("context", "reason"),
    [
        (None, "context-missing-or-empty"),
        ([], "context-missing-or-empty"),
        ([42], "context-member-type"),
        ([{"source": "shipping-policy", "text": "   "}], "context-blank-text"),
        (
            [{"source": "returns-policy", "text": "Returns close after 30 days"}],
            "context-unrelated-source",
        ),
    ],
)
def test_invalid_context_never_reaches_scorer(context, reason):
    scorer = Mock(return_value=1.0)
    case = EvalCase(
        case_id="shipping-de-01",
        question="How long does shipping take?",
        answer="Shipping takes three days.",
        retrieval_context=context,
        allowed_sources=frozenset({"shipping-policy"}),
    )
    before = deepcopy(case)

    with pytest.raises(ValueError, match=reason):
        evaluate_after_preflight(case, scorer)

    scorer.assert_not_called()
    assert case == before
\`\`\`

This sample blocks both absent and empty values with one reason, though a live report may split them. The key rule is that neither one makes a score or changes the case data.

Add a fake judge that would write to a result log if called. Check that the log stays blank, which catches wrappers that call the judge before they check its return value.

Also test good context with a judge that fails on purpose. That fault should be marked as a score-run failure, not given the wrong label as a context check failure.

The [DeepEval pytest guide](/blog/deepeval-llm-testing-guide) can cover metric calls and run commands. This gate ends when a checked case crosses the score gate and starts the metric work.

## How should LLMTestCase retrieval_context test run in CI?

An LLMTestCase retrieval_context test should run in a fast first-check job before API-backed metrics. It needs no judge key when each score call is a spy or local fake.

Commit the cases, allowed source map, search build, and schema build. A reviewer should see when a fit rule changes and why a source that once failed may now pass.

Run all bad rows from the same case table and check the found case count. CI must fail when the table yields zero cases, since an empty check job gives no proof.

Use stable reason codes in machine-readable output. Human messages may add context, but dashboards and ownership rules should not depend on changing prose.

Keep case ID, context count, source IDs, item types, first-check result, judge call count, and run time. Hash private text if a short mark helps match two runs without showing the text.

Keep the fixed local job apart from the night judge run. A lost network link must not stop local schema and source-fit faults from reaching the build report.

DeepEval's [dataset documentation](https://deepeval.com/docs/evaluation-datasets) treats goldens as cases that wait for run-time fields from the app. That makes missing search proof a useful sign before scores, rather than a golden field that tests should hardcode.

Run the small job when the search tool, prompt, case bridge, metric setup, or golden set changes. A wider night suite can then track score drift after all cases pass the first check.

Use the [LLM CI quality gate guide](/blog/llm-evaluation-ci-cd-quality-gates) to link the two jobs without mixing their reports. DeepEval retrieval context validation should block bad input even when past score trends looked sound.

## Which assertions verify validate RAG context before eval?

To validate RAG context before eval, check shape, text, source fit, order, count, call flow, and unchanged state. Each check should name the rule it guards and show both planned and real values.

Assert that \`retrieval_context\` is a list before measuring its length. A string is iterable and nonempty, so a weak length check can accept one text value as many characters.

Assert at least one member and an explicit maximum chosen by the suite. The upper bound catches adapter loops or accidental corpus dumps before an evaluator consumes them.

Assert each member's exact supported shape. If strings and retrieved context objects are both allowed, test both branches and reject mixed undocumented forms.

Check nonblank clean text without changing the source case. The metric should get the same chunk text and order that the app returned, with no quiet sort or trim beyond the stated rule.

Check source ID against a reviewed allowlist for the case. Add key proof terms only where reviewers can keep them current without putting a whole answer in the test.

Check that each blocked case has no score, zero judge calls, and one block log. This stops hidden judge cost and lost case counts, while it gives the owner one clear reason.

Check that each good case reaches the metric once with the same object or a stated copy. More than one call can double cost and make two report rows fight for the same case ID.

Assert result cardinality after the run. Accepted cases plus rejected cases must equal discovered cases, with no duplicate case IDs.

The [testing LLM applications guide](/blog/testing-llm-applications-guide) can add answer quality and safety checks later. Keep these first checks fixed, so they stay useful when model output shifts from run to run.

DeepEval retrieval context validation gains trust from exact checks for missing state. A score that just exists cannot prove the search proof was full, on topic, or even sent to the metric.

## Step-by-step test implementation

Build the gate from documented metric needs, then prove accepted and rejected paths before connecting a real evaluator. This order keeps debugging local and inexpensive.

1. Read \`seed-skills/deepeval-llm-evaluation/SKILL.md\` and record where the case receives \`retrieval_context\`, which metric consumes it, and which omission the file warns against.
2. Read \`seed-skills/rag-regression-testing/SKILL.md\`, then version the golden IDs, retriever settings, allowed sources, and relevance rules used by preflight.
3. Create valid, missing, empty, wrong-type, blank, and unrelated fixtures while preserving the same question, answer, case ID, and scoring spy.
4. Implement a validator that returns unchanged accepted chunks or raises one typed reason before any metric or result-writer call.
5. Run positive and negative parameterized tests, then assert case accounting, source provenance, chunk order, scorer calls, and unchanged state.
6. Execute the focused suite in CI, publish a compact rejection report, clean temporary output, and route each reason to its owning layer.

Begin with one case whose expected source is obvious to reviewers. Expand coverage only after the relevance mapping has a clear update process.

Keep app answer creation out of these cases. The answer should stay fixed because this test asks if search proof may be scored, not whether the model made a good answer.

Add a code change that removes the first check. Each bad row should then reach the judge spy and fail, which proves the test can find the exact drift it claims to guard.

Add a second mutation that coerces non-list values into a list. The wrong-type cases should fail because silent repair hides an adapter contract break.

Write down one small command for local and CI use. Make sure it exits nonzero for check faults, repeat IDs, unmatched cases, or zero cases found by the test run.

Use the [QA skills directory](/skills) to find more RAG drift test plans. Keep this module's release sign limited to context fit before scores and clear fault logs after a block.

## Failure triage and regression ownership

Triage starts with the block reason and judge call count in the case log. Those two fields show whether the fault took place before the metric, as the design requires.

A missing value often belongs to the app hook or bridge that builds \`LLMTestCase\`. Trace the app reply and prove found chunks were saved before you change metric rules.

An empty list can come from search flow or case data. Check if the search tool found no match on purpose and whether this metric suite defines a safe stop in place of a score.

A wrong member type belongs to serialization or schema mapping. Preserve the member index and actual type, then compare it with the supported DeepEval case shape.

A blank chunk may come from file load, text pull, or a filter step. Fix the source instead of letting the first check invent text or drop rows without a case log.

An off-topic source can show a stale golden map, wrong query route, mixed index, or search drift. Match source IDs and the search build before you tune a judge prompt.

If good cases never reach the metric, inspect the check code and allowed source rules. A strict gate that blocks sound proof is still a release bug and needs its own owner.

If blocked cases make score rows, inspect wrapper order and task start time. The first check must end before metric work is queued, not just before its result is read.

Use the [DeepEval metrics guide](/blog/deepeval-metrics-complete-guide-2026) when a checked case later fails a score floor. Do not give that score fault to the first-check owner without proof in the trace.

DeepEval retrieval context validation makes these owner gates clear. The report should show case fit first, then leave score quality to the next stage with a distinct state and owner.

## Frequently Asked Questions

### How do you fail a DeepEval test before scoring when retrieval_context is missing, empty, malformed, or unrelated to the evaluated answer?

Wrap the metric call with a fixed first check for list shape, nonblank chunks, allowed item types, and reviewed source fit. Spy on the score step. Blocked cases must give one stable reason, zero score calls, no number, and one case report row.

### What fixture best tests how to deepeval retrieval context validation?

Use one fixed question and answer with an allowed source map, then change only \`retrieval_context\`. Include good, absent, empty, wrong-type, blank, and off-topic rows. A score spy and fixed case make call count, input order, block reason, and unchanged state easy to see.

### Which failure signal proves deepeval retrieval context validation example?

The clearest fault is any blocked case that reaches the judge or gets a score number. Other stable signs include a coerced wrong type, blank text that passes, changed chunk order, or an unreviewed source. Report each sign with its case ID and reason code.

### How should CI report DeepEval faithfulness missing context?

Report the case ID, metric set, search build, context state, chunk count, source IDs, block reason, judge call count, and row state. Avoid raw private chunks unless needed. The log should split missing app hooks, empty search, bad maps, and off-topic proof without a model diagnosis.

### When should LLMTestCase retrieval_context test block a release?

Block release when a faithfulness case lacks fit search proof, a bad case reaches the metric, case counts are not full, IDs repeat, or the check runs zero cases. A low metric score belongs to the next gate, but it also blocks under that suite's reviewed score rule.

### How can teams keep validate RAG context before eval repeatable?

Commit saved cases, allowed source rules, search settings, schema builds, and fixed judge spies. Review source-map changes with golden updates. Run the first check with no live API, then run model metrics only when pass plus block counts match all found cases.

## Conclusion

DeepEval retrieval context validation makes a clear release gate before faithfulness scores. It accepts useful nonempty proof, blocks missing or bad input with stable reasons, and proves blocked cases never call the metric or make false score rows.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [DeepEval pytest guide](/blog/deepeval-llm-testing-guide) before you build this gate. This order keeps the first run small and makes each block reason easy to own.`,
};
