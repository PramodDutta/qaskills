import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas dataset schema validation',
  description:
    'Ragas dataset schema validation: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Ragas dataset schema validation',
  keywords: [
    'Ragas dataset schema validation',
    'how to ragas dataset schema validation',
    'ragas dataset schema validation example',
    'Ragas EvaluationDataset validation',
    'SingleTurnSample schema test',
    'retrieved contexts list validation',
  ],
  relatedSlugs: [
    'ragas-rag-evaluation-metrics-complete-guide',
    'rag-regression-testing-guide-2026',
    'rag-retrieval-testing-best-practices-2026',
    'ragas-rag-evaluation-guide',
  ],
  sources: [
    'https://docs.ragas.io/en/stable/getstarted/evals/',
    'https://docs.ragas.io/en/latest/references/evaluate/',
    'https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/',
  ],
  repoEvidence: [
    'seed-skills/rag-regression-testing/SKILL.md',
    'seed-skills/rag-evaluation-metrics/SKILL.md',
  ],
  content: `Ragas dataset schema validation checks each sample before any paid judge call: required text fields are present, retrieved contexts are lists of strings, references use the pinned schema, IDs are unique, and row counts align. The test must reject bad input locally and prove that the evaluator spy received no call.

## What must Ragas dataset schema validation prove?

Ragas dataset schema validation must prove that each row describes one intact test case. A question, answer, context list, reference, and case ID must stay linked from source data through dataset creation.

The first rule is type safety. Text fields need strings, context fields need lists of strings, and an ID must be a nonempty stable value that is unique within the file.

The second rule is shape safety. A single context string is not the same as a list with one context, while a list of lists can add one level that changes the sample meaning.

The third rule is alignment. When code builds column arrays, all arrays must have the same size and preserve the same source order before any zip or dataset call.

The Ragas [evaluation quick start](https://docs.ragas.io/en/stable/getstarted/evals/) shows \`SingleTurnSample\` items collected into an \`EvaluationDataset\`. That object path gives the test a clear build point before metric work starts.

Reject null, absent, and blank values according to the local metric contract. Some Ragas fields may be optional in a general schema, but a chosen metric can still require them for a useful score.

Set the planned row count before data load begins, and compare it again after each build step. This simple count catches quiet drops long before a score file can hide them.

Keep the raw source rows unchanged while checks run on copies. A validator that edits its input can make the second test pass for the wrong reason.

Keep schema failure separate from a low metric score. Bad source data should stop before an LLM, embedding model, or network callback can charge money or return a misleading result.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains score meaning after a dataset is valid. This gate owns only the records and their links before evaluation.

Use the [QA skills directory](/skills) when the pipeline also needs retrieval, answer, and release checks. A pass here means the paid run receives the exact planned samples, not that those samples will earn good scores.

## Which repository behavior defines the test contract?

\`seed-skills/rag-regression-testing/SKILL.md\` loads a golden sample list, runs the RAG app for each question, and appends values into four columns. Those columns are \`question\`, \`answer\`, \`contexts\`, and \`ground_truth\`.

The same example builds a dataset from that column map, then calls Ragas with chosen metrics, judge, and embeddings. Therefore, a local validator can inspect all four arrays just before dataset creation.

\`seed-skills/rag-evaluation-metrics/SKILL.md\` defines a golden sample with a question, ideal answer, and a list of reference contexts. It also states that the live RAG path produces the answer and retrieved contexts used for scoring.

These repository files use a column-oriented adapter and older field names. The test should pin that local adapter and then map it to the Ragas version installed by the project.

The current [evaluate reference](https://docs.ragas.io/en/latest/references/evaluate/) accepts a dataset or \`EvaluationDataset\` plus metrics and model services. Place the spy at that function edge to prove bad rows never cross it.

Write the mapping in one visible function. For example, map \`question\` to \`user_input\`, \`answer\` to \`response\`, \`contexts\` to \`retrieved_contexts\`, and the chosen truth field to \`reference\`.

Test the map in both ways with one safe row. The mapped sample should hold each source value, and a debug view should still show the same case ID.

Keep old field names in a rejected migration fixture, not in a second live map. Two accepted maps make it hard to know which schema reached a paid run.

Do not let a helper infer a missing list from another row. Defaults can make object creation succeed while moving evidence from one sample to the next.

Save the source index and case ID through validation. An error such as \`row 7 contexts[1] is not text\` gives an owner a direct fix without starting the evaluator.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) covers baseline scores and release floors. Schema checks run first so a data shift cannot look like a model-quality regression.

## How to ragas dataset schema validation?

To learn how to ragas dataset schema validation, validate source records before converting them into parallel arrays. Record all row errors in one pass, sort them by row and field, and raise one typed failure.

Use a fixed small set with two valid rows. Distinct questions, answers, contexts, references, and IDs make cross-row swaps easy to spot.

Then create one malformed fixture per rule. Include an absent field, null text, blank ID, duplicate ID, scalar context, nested context, nonstring context item, and unequal column size.

The first example validates records and builds the current object model. It keeps the repository's four data concepts while naming the field map at one edge.

\`\`\`python
from ragas import EvaluationDataset
from ragas.dataset_schema import SingleTurnSample


def build_dataset(rows: list[dict]) -> EvaluationDataset:
    errors: list[str] = []
    seen_ids: set[str] = set()

    for index, row in enumerate(rows):
        case_id = row.get("id")
        if not isinstance(case_id, str) or not case_id.strip():
            errors.append(f"row {index}: id must be nonempty text")
        elif case_id in seen_ids:
            errors.append(f"row {index}: duplicate id {case_id}")
        else:
            seen_ids.add(case_id)

        for field in ("question", "answer", "ground_truth"):
            if not isinstance(row.get(field), str) or not row[field].strip():
                errors.append(f"row {index}: {field} must be nonempty text")

        contexts = row.get("contexts")
        if not isinstance(contexts, list) or not all(
            isinstance(item, str) and item.strip() for item in contexts
        ):
            errors.append(f"row {index}: contexts must be a list of nonempty text")

    if errors:
        raise DatasetSchemaError(errors)

    return EvaluationDataset(
        samples=[
            SingleTurnSample(
                user_input=row["question"],
                response=row["answer"],
                retrieved_contexts=row["contexts"],
                reference=row["ground_truth"],
            )
            for row in rows
        ]
    )
\`\`\`

Validate before list comprehension so one bad row cannot create a partial dataset. The code returns only after every source record passes the same fixed rules.

If empty context lists are valid for one test, state that rule by metric group. Do not treat an empty list, missing field, and list containing an empty string as one condition.

Spy on the evaluator and embedding client during this suite. A rejected fixture should leave both call counts at zero and should not create cache or result files.

Also spy on any lazy client factory used by the app. A client made before local checks can open a network path even when its main method is never called.

Run all bad rows in one collected-error test and in small single-rule tests. The first checks full coverage, while the small tests keep each message and owner clear.

Use the [retrieval testing guide](/blog/rag-retrieval-testing-best-practices-2026) after input shape passes. Retrieval relevance cannot repair a context value linked to the wrong question.

## Ragas dataset schema validation example: scenario and assertion matrix

This ragas dataset schema validation example pairs each fixture with one exact local result. The table separates build errors from score failures and keeps paid services outside all negative cases.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline | Two complete rows with distinct IDs | Two ordered samples with exact mapped values | Any value, type, order, or count differs | \`seed-skills/rag-regression-testing/SKILL.md\` |
| Context boundary | Empty list, scalar, nested list, and blank item | Only the allowed list shape passes | Coercion, dropped item, or hidden nesting | Ragas sample schema |
| Column mismatch | Answer array has one fewer item | Local alignment error before dataset build | Zip truncates or another row supplies data | Repository column adapter |
| Schema migration | Old and current reference names | Pinned adapter accepts one named contract | Silent rename or mixed fields | Ragas migration guide |
| Service guard | Any invalid row with evaluator spy | Zero judge, embedding, and evaluator calls | Paid or network call starts before rejection | Test call ledger |

The baseline should compare each sample field by case ID, not just dataset length. Equal counts cannot detect two answers swapped between rows.

The context boundary needs separate errors for the list itself and each bad member. A scalar string is iterable in Python, which can hide a bug if code only loops without checking the outer type.

For column mismatch, test the adapter directly even if new code now uses row objects. The repository example shows parallel arrays, and an older import path may still build them.

The [Ragas evaluation guide](/blog/ragas-rag-evaluation-guide) can guide later metric calls. This matrix stops at the last safe point before those calls start.

## What failures expose Ragas EvaluationDataset validation?

Ragas EvaluationDataset validation should expose silent data repair. Reject code that fills a missing answer with an empty string, wraps every context in a list, or drops an invalid row without a named policy.

Implicit \`zip\` is a key risk for column data. Python stops at the shortest input, so one lost answer can remove a later question without raising an error.

Duplicate IDs can also hide shifts. If reports join scores by ID, a duplicate may overwrite one row or make the wrong sample appear to pass.

The second example injects focused bad rows and proves that no paid edge ran. It also checks the ordered error text so CI can assign the source field.

\`\`\`python
import pytest


@pytest.mark.parametrize(
    ("change", "expected"),
    [
        ({"contexts": "one chunk"}, "contexts must be a list"),
        ({"contexts": [["nested chunk"]]}, "contexts must be a list"),
        ({"answer": None}, "answer must be nonempty text"),
        ({"id": ""}, "id must be nonempty text"),
    ],
)
def test_bad_rows_stop_before_evaluation(valid_row, change, expected, evaluator):
    row = {**valid_row, **change}

    with pytest.raises(DatasetSchemaError, match=expected):
        build_and_evaluate([row], evaluator=evaluator)

    evaluator.assert_not_called()
    assert list_result_files() == []
\`\`\`

Add a separate duplicate-ID test with two otherwise valid records. The error should name the second row and repeated ID while preserving the first row as the source owner.

Add one column-based test where list lengths differ by one. Assert an alignment error before any call to \`Dataset.from_dict\`, \`EvaluationDataset\`, or \`evaluate\`.

Run the same valid records twice and compare the ordered plain data form. Stable order proves that set or map use did not rearrange cases before scoring.

Use the [retrieval testing article](/blog/rag-retrieval-testing-best-practices-2026) for score drift after this check. A schema suite should never consume tokens merely to show that malformed data scores poorly.

## How should SingleTurnSample schema test run in CI?

A SingleTurnSample schema test should run without network keys, judge clients, or vector services. It needs only the pinned Ragas package, fixture data, adapter code, and spies at paid edges.

The Ragas [migration guide](https://docs.ragas.io/en/stable/howtos/migrations/migrate_from_v03_to_v04/) documents a change from \`ground_truths\` to \`reference\` and shows the current sample fields. Pin the package and adapter together so that change cannot pass unnoticed.

Split fast schema tests from metric tests. The schema group runs for every data and adapter change, while the paid group starts only after the local group is green.

Make the paid job depend on a named schema result rather than mere job order. This link stops a skipped fast job from opening the service gate.

Run the schema job with model keys unset and outbound calls denied. The valid control still builds local data, while any hidden service use fails at once.

Keep a fixture for the exact supported version. If the project upgrades Ragas, change the fixture, mapper, and expected migration failure in one reviewed update.

Disable retries around schema errors. A second attempt cannot turn a wrong type or unequal row count into valid input, and retries can hide duplicate service calls.

Write a small JSON error artifact containing fixture name, row, field, rule, and safe value type. Do not copy full customer questions or context text into CI when the shape alone explains the fault.

Set the release gate to block missing fields, wrong types, duplicate IDs, mixed schema versions, row shifts, and any paid call on rejected input. Use the [skills directory](/skills) to place this check beside wider RAG tests.

## Which assertions verify retrieved contexts list validation?

Retrieved contexts list validation starts with the outer value. It must be a list for every sample and must not be a string, tuple, mapping, generator, or nested list unless local policy says otherwise.

Then check each member. Every item should be text, and blank items should fail when metrics depend on actual retrieved evidence.

Decide whether an empty list is allowed per fixture group. A no-hit retrieval case may need an empty list, while a golden baseline can require at least one chunk.

Preserve member order because rank-aware metrics and debug output may use it. Compare the full list for each case ID instead of sorting contexts during validation.

Check that contexts belong to the right row. Give each fixture a unique marker, then assert that no marker appears under another case ID after adapter conversion.

Compare source row count, built sample count, and planned ID count. All three must match before the evaluator can start.

For column adapters, compare every list length before zipping or building a dataset. Then rebuild row records by index and compare them with the original source records.

The [retrieval best-practices guide](/blog/rag-retrieval-testing-best-practices-2026) covers rank, recall, and chunk quality. This assertion set proves only that the right list reaches the right sample in a valid shape.

## Step-by-step test implementation

Build the schema gate beside the code that loads golden data. It should return a valid dataset or one complete ordered error list, with no partial service work.

1. Read \`seed-skills/rag-regression-testing/SKILL.md\` and record the question, answer, contexts, ground-truth columns, build order, metric edge, and expected sample count.
2. Read \`seed-skills/rag-evaluation-metrics/SKILL.md\`, then define required golden fields, case-ID rules, context-list rules, blank-value policy, and the pinned Ragas field map.
3. Create two valid distinct rows plus isolated fixtures for absent, null, blank, scalar, nested, duplicate, mixed-version, and unequal-length data.
4. Validate records before conversion, build the dataset through the supported object path, and compare every mapped value, order, ID, and total count.
5. Run each bad fixture with evaluator and embedding spies, then require an ordered local error, zero service calls, and no cache or result file.
6. Run the fast suite in CI before paid metrics, save a safe shape-only error artifact, and assign source, adapter, or version faults to the right owner.

Keep fixture names tied to one rule, such as \`contexts-scalar\` or \`duplicate-id\`. A broad \`bad-data\` name slows review and encourages weak message checks.

Test the validator itself with a known valid row before testing its rejection paths. This green control proves the spies and dataset build path are wired as planned.

If errors are collected, sort them by source row and field. Stable ordering makes CI diffs clear and avoids failures caused only by map iteration.

The [blog index](/blog) offers further RAG test patterns. Keep this six-step gate local, quick, and free of model variance so it can guard every data change.

## Failure triage and regression ownership

Start with the first failing layer. A malformed source file belongs to data owners, while a valid source record mapped to the wrong Ragas field belongs to adapter owners.

A package error after an unreviewed upgrade belongs to version management. Compare the installed schema with the pinned mapper and migration fixture before changing data.

An evaluator spy call on invalid input belongs to orchestration. The validator either ran too late, its error was caught and ignored, or a background task started before validation ended.

Wrong row count with no local error often points to zip truncation, filtering, or a swallowed parse failure. Compare source IDs, built IDs, and result IDs as sets and ordered lists.

Correct counts with wrong pairings point to sorting or shared list state. Use unique field markers to find the first index where one row gained another row's answer or contexts.

A failure after only some rows were checked points to early exit in the validator. The complete error list should cover each bad source row in stable order.

A failure that changes between runs points to shared fixture data or unstable sorting. Recreate records per test and compare the same safe shape report twice.

A context error should name outer type or member index. Generic messages such as \`invalid dataset\` send reviewers toward Ragas when the source field is already known.

The triage path is direct: check source shape, field map, version, row links, service ledger, and result files. The [Ragas metrics article](/blog/ragas-rag-evaluation-guide) becomes relevant only after all six checks pass.

Keep the first bad row and the total error count in the CI summary. These two facts show both the next fix and whether more source work remains.

Use the [Ragas evaluation guide](/blog/ragas-rag-evaluation-guide) once source and map owners close every schema fault. Score work should begin from the same case IDs that passed this local gate.

## Frequently Asked Questions

### How do you validate Ragas single-turn dataset fields, list nesting, nullability, and row alignment before paid evaluator calls begin?

Validate each source row and case ID before dataset creation, then compare all column lengths and mapped sample values. Require context lists with valid text members and apply explicit null rules. Place spies on evaluation, judge, and embedding edges, and assert zero calls plus zero result files for every rejected fixture.

### What fixture best tests how to ragas dataset schema validation?

Use two valid rows with unique markers in every field, then derive one bad fixture per rule. Include missing text, null answer, blank ID, duplicate ID, scalar contexts, nested contexts, blank members, old field names, and unequal columns. Distinct markers make any cross-row shift visible after conversion.

### Which failure signal proves ragas dataset schema validation example?

A useful signal names the source row, case ID when available, field, expected shape, and actual type. It should occur before dataset evaluation and leave all service spies untouched. Count mismatches must show each column size, while pairing failures should show the first index with moved evidence.

### How should CI report Ragas EvaluationDataset validation?

CI should save a small shape report with fixture name, row, field, rule, safe type, package version, adapter version, and service-call counts. Avoid storing full private questions or contexts. The gate should publish this report for local schema failures without creating model outputs, embeddings, scores, or partial result files.

### When should SingleTurnSample schema test block a release?

Block on missing required fields, wrong text types, invalid context nesting, duplicate IDs, mixed schema names, row count drift, or changed field mapping. Also block when rejected data reaches an evaluator, judge, embedding client, cache, or result writer. These defects can make later scores costly and misleading.

### How can teams keep retrieved contexts list validation repeatable?

Pin the Ragas version, commit small fixed fixtures, state empty-list policy by test group, and compare ordered lists by case ID. Check outer type, each member, row count, and unique markers. Run without network keys and keep one migration fixture that fails clearly when the supported field contract changes.

## Conclusion

Ragas dataset schema validation gives paid evaluation a clean start by proving field types, context shape, IDs, row counts, and source links before service work. It should fail locally with precise evidence and leave evaluators, embeddings, caches, and result files untouched.

Open the [QA skills directory](/skills) to choose a RAG testing skill, then read the [Ragas metrics complete guide](/blog/ragas-rag-evaluation-metrics-complete-guide) before placing this schema gate ahead of each evaluation run. Require its named pass result before any paid metric job can start.`,
};
