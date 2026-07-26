import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Evaluation label taxonomy drift testing',
  description:
    'Evaluation label taxonomy drift testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'Evaluation label taxonomy drift testing',
  keywords: [
    'Evaluation label taxonomy drift testing',
    'how to evaluation label taxonomy drift testing',
    'evaluation label taxonomy drift testing example',
    'LLM eval category schema drift',
    'golden dataset label migration',
    'evaluation slice coverage contract',
  ],
  relatedSlugs: [
    'golden-dataset-llm-evaluation-guide',
    'eval-dataset-versioning-guide-2026',
    'testing-llm-applications-guide',
    'llm-non-determinism-flaky-eval-guide-2026',
  ],
  sources: [
    'https://huggingface.co/docs/datasets/v3.6.0/about_dataset_features',
    'https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html',
    'https://deepeval.com/docs/evaluation-datasets',
  ],
  repoEvidence: ['seed-skills/ai-agent-eval/SKILL.md', 'seed-skills/prompt-testing/SKILL.md'],
  content: `Evaluation label taxonomy drift testing versions every allowed label, applies only reviewed one-to-one mappings, and compares slice counts before historical scores are joined. A passing migration preserves each case's meaning and coverage. Renamed, merged, split, missing, or unknown labels must either follow an explicit policy or stop the evaluation with a precise diagnostic.

## What must Evaluation label taxonomy drift testing prove?

Evaluation label taxonomy drift testing must prove that group changes do not silently rewrite test set meaning across all tracked test runs. Each record needs a label map version, an allowed label, and a fixed path into the version used by the current report.

Labels often drive slice scores, group-based samples, ownership, and release thresholds across both fast checks and long trend reports. A harmless-looking rename can remove past rows from a join or combine distinct risks under one new heading.

The central success condition has three parts. Tracked labels must pass checks, approved mappings must preserve intended meaning, and unknown or unclear labels must fail before scoring.

This scope differs from file version rules. The [evaluation test-set versioning guide](/blog/eval-dataset-versioning-guide-2026) covers snapshots and splits, while this contract checks the semantic enum carried by each case.

Create a base snapshot with known counts for each required group and stable case IDs that reviewers can trace by hand. Then move the same records through the proposed label map and compare IDs, totals, labels, and slice membership.

A rename can map one old label to one new label without changing record ID. A merge needs a documented check rule because old per-label trends cannot by default become one equivalent past series.

A split is more dangerous because one source label cannot choose among two targets without extra case data. Treat that mapping as unclear until a reviewed rule examines a stable attribute on each record.

New labels also need a rule. They may be valid for new cases, but past reports should show that the slice lacks prior test scope rather than filling it with unrelated examples.

The gate must reject an empty or partial move before any score job starts or any new chart is saved. Matching total counts alone is weak because two missing labels can be offset by repeated rows elsewhere.

Use the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) for broader curation. Keep this gate centered on label meaning, slice ID, and safe matching across label-map versions.

## Which repository behavior defines the test contract?

Lines 21 through 27 of \`seed-skills/ai-agent-eval/SKILL.md\` require fixed pipelines and tracked golden data. They also call for tags covering difficulty, group, and edge-case classification.

Those tags are the exact fields that label map drift can corrupt. The repo does not define a project-specific label enum, so the article supplies fixtures without presenting invented names as repo facts.

Lines 867 through 890 of the same file require test-set version rules, group-based sampling, CI tests, and past result tracking. Together, these practices make label moves part of the test contract rather than a report cleanup.

\`seed-skills/prompt-testing/SKILL.md\` adds golden dataset, edge-case, multilingual, and adversarial test-scope guidance. It supports checking many slices while leaving their exact label map to the owning team.

Read the test flow from stored case to report. Inputs are case ID, source label map version, source label, and move rule; outputs are target label, move status, slice counts, and check eligibility.

Each case should retain its original label beside the moved label, along with both label-map versions and the rule that changed it. Overwriting the source value destroys the proof needed to audit a disputed rename or repair a faulty move.

The [Hugging Face dataset features reference](https://huggingface.co/docs/datasets/v3.6.0/about_dataset_features) explains that dataset features include column types and \`ClassLabel\` names. That clear schema is a useful boundary for checking allowed labels before an eval run.

The [scikit-learn train-test split reference](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html) documents group-based splitting through class labels and a fixed random state. A renamed label can therefore change the sample mix unless the move happens before the split.

The [DeepEval datasets guide](https://deepeval.com/docs/evaluation-datasets) describes goldens as reusable inputs and expected results for checks across app versions. Preserve stable case IDs and label-map tags when those goldens become current test cases.

The [LLM app testing guide](/blog/testing-llm-applications-guide) covers full behavior tests. Label-map checks should run first because a misclassified case can make each later slice score misleading.

## How to evaluation label taxonomy drift testing?

How to evaluation label taxonomy drift testing begins with immutable label map rule files. Each rule file should contain a version, allowed labels, required slices, and a checksum or reviewed source revision.

Define move rules separately from the target enum. A rule needs source version, target version, source label, target label, kind, rationale, and owner.

Allow direct retention and reviewed one-to-one renames in an automated move. Route merges, splits, and deleted labels through a clear rule because their past meaning may not remain the same.

Create fixtures with stable case IDs and counts large enough to reveal each slice. Include one record for each allowed label plus repeats that make count changes easy to see.

The TypeScript example below validates each row and preserves source proof. It accepts only unchanged labels or approved renames, then returns exact diagnostics for everything else.

\`\`\`typescript
type EvalRow = {
  id: string;
  taxonomyVersion: string;
  label: string;
};

type Rename = {
  from: string;
  to: string;
  kind: 'rename';
};

function migrateLabels(
  rows: EvalRow[],
  targetVersion: string,
  allowed: Set<string>,
  renames: Rename[],
) {
  const renameBySource = new Map(renames.map((rule) => [rule.from, rule]));

  return rows.map((row) => {
    const nextLabel = allowed.has(row.label)
      ? row.label
      : renameBySource.get(row.label)?.to;

    if (!nextLabel || !allowed.has(nextLabel)) {
      throw new Error('unmapped_label:' + row.id + ':' + row.label);
    }

    return {
      ...row,
      sourceTaxonomyVersion: row.taxonomyVersion,
      sourceLabel: row.label,
      taxonomyVersion: targetVersion,
      label: nextLabel,
    };
  });
}
\`\`\`

Keep the function narrow and pure. A separate rule stage can decide whether a merge remains safe to match, while this stage proves that each record has one valid destination.

After the move, group source and target rows by label. Compare total row count, unique case IDs, per-label counts, required-slice presence, and any declared past match.

Run the move before creating a group-based sample. Otherwise, old and new label strings may enter separate strata even when the team intended a simple rename.

Persist the move rule file with the test result. A chart should identify both test set version and label map version so viewers can reproduce its slice rules.

Use the [dataset versioning guide](/blog/eval-dataset-versioning-guide-2026) for snapshot storage and split controls. Add the label rule file as a separate reviewed file rather than hiding it inside a generated report.

## Evaluation label taxonomy drift testing example: scenario and assertion matrix

An evaluation label taxonomy drift testing example needs cases for unchanged, renamed, merged, split, and new labels. Each row below names the stable proof that prevents silent reinterpretation.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Unchanged baseline | Version v1 and v2 both allow \`retrieval\` | Same IDs and count remain comparable | Dropped or duplicated cases | Deterministic repository principle |
| Approved rename | \`tool_error\` maps once to \`tool_failure\` | Source retained, target valid, count unchanged | Old rows vanish from target slice | Versioned migration manifest |
| Merge request | Two old labels target one new label | Comparison policy marks combined history | Scores are joined as if definitions matched | Historical tracking requirement |
| Split request | One old label has two possible targets | Migration stops pending case-level rule | Arbitrary first target receives every row | Complete case accounting |
| New target label | New cases use \`policy_conflict\` only in v2 | Coverage gap is explicit for v1 | Unrelated history fills the new slice | Required-slice manifest |

The unchanged base proves the harness can preserve records without manufacturing changes. Compare exact IDs as well as count because replacement rows can keep row count stable.

The rename fixture should alter only the label and label map metadata. Prompt text, expected output, difficulty, and case ID must remain byte-for-byte unchanged.

The merge fixture needs a check flag such as \`combined_only\`. It can aggregate old slices for a new report, but should not claim the merged definition existed in earlier runs.

The split fixture must stop unless another stable field decides the target. A free-text model judgment would make move nonrepeatable and weaken past audits.

The new-label fixture should pass the schema check for v2 while reporting no v1 baseline. Zero prior test scope is meaningful proof, not a value to backfill by default.

Add deleted-label behavior outside the table. The rule may archive cases or reclassify them, but silent deletion must fail unique-ID and total-count checks.

Add casing, whitespace, and Unicode-normalization cases only if the production parser permits them. Prefer exact enum values because automatic cleanup can merge labels that owners intended to keep distinct.

Retain the matrix beside per-slice counts and move errors. A reviewer should be able to trace each changed count to one reviewed rule and set of case IDs.

The [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) helps select durable cases. This matrix tests the labels attached to those cases rather than judging their prompts or expected answers.

## What failures expose LLM eval category schema drift?

LLM eval category schema drift appears when renamed labels disappear, merged groups inherit false past, split labels choose arbitrary targets, or new labels bypass required test scope. Inject each failure without changing scoring code.

First remove one rename rule while keeping the target enum valid. The move must return an unmapped-label error with case ID, source label, and source label map version.

Next repeat a rename with two targets. The rule-file check should stop before rows move, because file order must not decide which group receives proof.

Then map two labels into one target and mark them fully safe to match. A rule assertion should reject that claim unless the rule file explicitly defines how prior slice scores combine.

For a split, add a rule that chooses the first target for each row. The negative test should compare expected target counts and reveal that one required slice received zero examples.

The Vitest example below verifies an approved rename and an unmapped failure. It also confirms original rows remain unchanged after the thrown move.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

describe('label taxonomy migration', () => {
  const source = [
    { id: 'case-1', taxonomyVersion: 'v1', label: 'tool_error' },
    { id: 'case-2', taxonomyVersion: 'v1', label: 'retrieval' },
  ];
  const allowed = new Set(['tool_failure', 'retrieval']);
  const renames = [{ from: 'tool_error', to: 'tool_failure', kind: 'rename' as const }];

  it('preserves identity through an approved rename', () => {
    const migrated = migrateLabels(source, 'v2', allowed, renames);

    expect(migrated.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'case-1', label: 'tool_failure' },
      { id: 'case-2', label: 'retrieval' },
    ]);
    expect(migrated[0].sourceLabel).toBe('tool_error');
  });

  it('rejects an unknown label without mutating source rows', () => {
    const unknown = [...source, { id: 'case-3', taxonomyVersion: 'v1', label: 'new_risk' }];

    expect(() => migrateLabels(unknown, 'v2', allowed, renames)).toThrow(
      'unmapped_label:case-3:new_risk',
    );
    expect(source[0]).toEqual({
      id: 'case-1',
      taxonomyVersion: 'v1',
      label: 'tool_error',
    });
  });
});
\`\`\`

Add a past-join mutation that uses current labels against old reports without the move. It should produce missing keys, and the test must reject the partial join rather than average available slices.

Add a repeat case ID under two target labels. Unique-ID check should fail even if both labels are allowed and total row count matches expectations.

Add an empty target slice required by rule. The suite should name that slice and its expected minimum before any aggregate score can pass.

Finally, serialize and reload migrated rows. Source label, source version, target label, target version, and case ID must survive the artifact round-trip exactly.

## How should golden dataset label migration run in CI?

A golden dataset label migration should run whenever a label map rule file, move map, test set record, split rule, or slice report changes. Keep it ahead of model calls so schema defects fail without test cost.

Use a focused command such as \`pnpm vitest run tests/evals/label-taxonomy.test.ts\`. Load real rule files but operate on isolated fixture snapshots, never shared live test sets.

Validate rule files first. Require unique labels, one target per rename, valid source and target versions, reviewed move kinds, and owners for nontrivial changes.

Move the full candidate snapshot next. Assert input and output counts, unique IDs, source proof, target validity, and zero unknown or unclear rows.

Then recompute slice counts and group-based sample mix. Compare them with an approved expectation file rather than accepting a newly generated snapshot without review.

Retain a machine-readable diff that lists added labels, removed labels, mappings, count changes, uncovered slices, and past-check status. Summary prose alone cannot identify each affected case.

Block release on unmapped labels, unclear splits, repeat IDs, silent deletions, invalid versions, missing required slices, or partial past joins. A reviewed new group may pass with a clear no-base status.

Use fixed ordering and a fixed random seed for any split test. Label-map checks should not fluctuate because object keys or input files arrived in a different order.

Clean temporary move output after attaching the diff. Tests should never overwrite the approved base or update snapshots merely because the candidate failed.

The [non-fixed eval guide](/blog/llm-non-determinism-flaky-eval-guide-2026) covers variable model results. Label move itself should remain fully fixed, which makes any changing count a direct data or code defect.

## Which assertions verify evaluation slice coverage contract?

An evaluation slice coverage contract needs exact schema, ID, count, mapping, source proof, and check assertions. A single aggregate row count cannot prove that meaningful slices survived.

Assert each source record has one known label map version and one allowed source label. Reject values that require trimming or case folding unless the rule file explicitly declares that normalization.

Assert each source ID appears exactly once after move. Compare sorted ID sets plus row count to catch deletion, duplication, and replacement at once.

Assert each target label belongs to the target rule file. Also require each rule-mandated slice to meet its minimum case count before scoring starts.

Assert all changed labels reference one reviewed move rule. Unchanged labels should not need mappings, while any unlisted change must remain a blocking error.

Assert that source label and version remain attached to moved rows. Source proof makes rollback and past debugging possible after the target label becomes current.

Assert per-label counts against an expected diff. Approved renames keep counts, merges explain combined totals, splits explain distribution, and new labels disclose missing past.

Assert past joins are complete for slices marked safe to match. Report clear statuses for \`comparable\`, \`combined_only\`, \`new_slice\`, or \`not_comparable\`.

Assert group-based samples preserve intended proportions after move. Compare selected case IDs and slice counts using one fixed seed and one declared label map version.

Assert move errors include case ID, source value, versions, and reason. Generic schema errors force reviewers to rerun tooling before they can assign ownership.

Assert artifacts round-trip without losing source proof or changing order-dependent hashes. A report that cannot reproduce its label map should not become a past base.

Use the [LLM app testing guide](/blog/testing-llm-applications-guide) after these checks pass. Slice-level model scores are trustworthy only when the cases behind each label are stable and known.

## Step-by-step test implementation

Implement label-map checks before test-set sampling or model tests. This sequence protects source facts, checks the rules, moves records, and proves safe slice matching before costly work begins.

1. Read \`seed-skills/ai-agent-eval/SKILL.md\` lines 21 through 27 and 867 through 890, then record the required versioning, category tags, stratification, and historical tracking.
2. Create immutable source and target taxonomy manifests plus reviewed rules for unchanged labels, renames, merges, splits, deletions, and newly introduced categories.
3. Build isolated fixtures with stable case IDs, known per-label counts, required slices, and enough records to expose every mapping branch.
4. Run schema validation and migration, then assert identity sets, total counts, target labels, source provenance, slice counts, and comparison status.
5. Inject unmapped labels, duplicate rules, ambiguous splits, silent deletions, duplicate IDs, partial joins, and empty required slices.
6. Run the focused suite in CI, retain a case-level migration diff, remove temporary output, and assign failed schema, data, policy, or reporting checks.

Start with rule file unit tests because a broken mapping should never touch records. These tests also make code review easier by producing one failure per invalid rule.

Next, migrate a small hand-reviewed fixture. Exact expected rows show whether the code preserves fields unrelated to label map.

Then migrate a representative snapshot and compare generated counts with an approved expectation. Review the diff rather than updating it by default.

Run sample-mix checks after move. The same fixed seed should select the expected IDs when labels and input order remain unchanged.

Run past joins last because they depend on each earlier stage. Require complete status for each requested slice instead of discarding unmatched rows.

Attach the rule file versions and move checksum to test reports. Those identifiers connect any later score change with the precise label rules used.

Finally, make label map approval an owned release step. Data curators approve meaning, engineers approve fixed execution, and test owners approve check status.

## Failure triage and regression ownership

Triage begins with the earliest changed fact: rule file, source row, move decision, slice count, sample membership, past join, or report. The first wrong layer owns the initial investigation.

If a source row contains an unknown label, assign it to data creation or intake. Preserve the case ID and raw value instead of cleaning it during the test.

If a valid rule loads incorrectly, configuration parsing owns the defect. Compare the rule file text, parsed object, version identifiers, and check output.

If move changes unrelated fields or repeats records, move code owns the failure. The source and target row diff should show exactly what moved.

If counts match but IDs differ, do not accept the result. Test-set curation or move code replaced proof, and the past match is broken despite an equal row count.

If a split lacks a stable discriminator, label map rule owns the blocking decision. Engineering should not invent a heuristic merely to make the move complete.

If group-based samples shift after an approved rename, inspect move timing and split inputs. Sampling should consume target labels consistently, not a mix of old and new values.

If past joins are partial, report code owns the immediate failure while label-map owners review the match rule. Never average the remaining slices and call the trend complete.

If only CI fails, compare file ordering, parser version, fixed seed, line endings, and leaked generated state. None of these should alter a fixed target count.

Use the [dataset versioning guide](/blog/eval-dataset-versioning-guide-2026) for nearby file ownership. Keep label-map failures attached to exact labels and case IDs so teams can repair meaning without rerunning model tests.

## Frequently Asked Questions

### How do you detect renamed, merged, missing, or newly introduced eval labels that break slice coverage and historical score comparisons?

Version the allowed-label rule file, preserve stable case IDs, and move rows through reviewed rules before sampling or reports. Compare ID sets, total and per-slice counts, required test scope, source proof, and past-join status. Unknown labels, unclear splits, silent deletions, repeat IDs, or partial joins should stop the test with exact details.

### What fixture best tests how to evaluation label taxonomy drift testing?

Use two small label map rule files and records with known IDs and per-label counts. Include an unchanged label, approved rename, proposed merge, unclear split, removed label, and new target label. Expected output should specify migrated rows, source proof, slice counts, required gaps, and which past checks remain valid.

### Which failure signal proves evaluation label taxonomy drift testing example?

The strongest signal is a mismatch between source and target ID sets or an unexplained per-slice count change. Also fail on unmapped values, repeat mappings, target labels outside the rule file, empty required slices, lost source proof, arbitrary split targets, and past joins that silently drop unmatched groups.

### How should CI report LLM eval category schema drift?

CI should report source and target label map versions, changed labels, mapping kinds, affected case IDs, count differences, missing slices, and past-check status. Retain the rule file checksum and move errors. This proof separates invalid source data, rule ambiguity, move code, sampling changes, and incomplete reports without model reruns.

### When should golden dataset label migration block a release?

Block when any record lacks one valid target, stable IDs change, required test scope disappears, a split has no fixed rule, or past data is marked safe to match without proof. A reviewed new slice may proceed with a clear no-base status, but its missing past must remain visible in each report.

### How can teams keep evaluation slice coverage contract repeatable?

Store immutable rule files and move rules, use fixed fixtures and sample seeds, preserve source labels, and compare exact IDs plus counts. Validate before model calls, never update approved snapshots by default, and round-trip artifacts. Repeated runs should yield identical migrated rows, test scope gaps, check statuses, and move checksums.

## Conclusion

Evaluation label taxonomy drift testing protects the meaning behind slice scores. A trustworthy gate versions label schemas, preserves case ID and source proof, rejects unclear mappings, verifies required test scope, and marks past checks honestly before any aggregate result can influence release.

Open the [AI testing skills directory](/skills) to choose an eval workflow, then read the [golden dataset LLM evaluation guide](/blog/golden-dataset-llm-evaluation-guide) before implementing this regression gate. Keep label-map proof beside each report so future score changes remain tied to stable group rules.`,
};
