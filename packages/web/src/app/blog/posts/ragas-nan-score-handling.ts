import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas NaN score handling',
  description:
    'Ragas NaN score handling: build focused fixtures, code examples, and CI checks from repo evidence to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Ragas NaN score handling',
  keywords: [
    'Ragas NaN score handling',
    'how to ragas nan score handling',
    'ragas nan score handling example',
    'Ragas missing metric score',
    'Ragas NaN pandas mean',
    'fail CI on invalid eval score',
  ],
  relatedSlugs: [
    'ragas-rag-evaluation-metrics-complete-guide',
    'rag-regression-testing-guide-2026',
    'rag-retrieval-testing-best-practices-2026',
    'rag-regression-testing-cicd-2026',
  ],
  sources: [
    'https://docs.ragas.io/en/latest/references/evaluate/',
    'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/',
    'https://docs.ragas.io/en/stable/getstarted/evals/',
  ],
  repoEvidence: [
    'seed-skills/rag-regression-testing/SKILL.md',
    'seed-skills/rag-evaluation-metrics/SKILL.md',
  ],
  content: `Ragas NaN score handling must inspect every sample value before any mean is formed, name each non-finite row, and mark the run incomplete. A release gate may fail or quarantine those rows by written policy, but it must never let NaN, null, or infinity vanish while a smaller set produces a passing mean.

## What must Ragas NaN score handling prove?

Ragas NaN score handling must prove that every planned metric value reaches a clear state. A finite score may enter a mean, while any other value must stay named in the report.

NaN is not a low score and should not be changed to zero without a policy choice. It often means that a metric could not score one row, so the run lacks expected evidence.

The official [Ragas evaluate reference](https://docs.ragas.io/en/latest/references/evaluate/) says failed metric rows can return \`np.nan\` when exceptions are not raised. That behavior makes a pre-mean value check part of the gate, not an optional report detail.

The gate should know how many rows and metrics were planned before work begins. It then checks that the result has exactly that product of sample and metric cells.

Each bad cell needs a sample ID, metric name, raw value type, and error detail when available. A count without row IDs slows triage and makes quarantine hard to review.

The policy can fail the whole run on the first bad cell or quarantine named samples. Either path must keep the full denominator and show which scores were left out of any valid mean.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) explains how to read sound scores. This article owns the earlier question of whether each score is even valid.

Do not set a quality floor until the valid cell check has passed. A mean of three good rows says nothing about the fourth row that failed to produce a number.

The [Ragas metric list](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/) shows that metrics grade different parts of an LLM app. Keep invalid counts per metric because one scorer can fail while the rest remain finite.

Use the [AI testing skills directory](/skills) for wider gate patterns, but keep this rule plain. No run can pass unless every cell is finite or covered by an approved quarantine record.

## Which repository behavior defines the test contract?

The repo first creates row-level Ragas output, turns it into a data frame, and then computes means. That order shows exactly where a finite-value guard belongs.

Lines 133 through 150 of \`seed-skills/rag-regression-testing/SKILL.md\` call \`result.to_pandas()\` and take each metric column mean. The report then stores means, sample count, low-score counts, and version fields.

A pandas mean can skip NaN by default, so a valid-looking number may use fewer rows than \`n_samples\`. The fix is to check every raw cell and save valid counts before calculating a mean.

The repo report shape is useful and should remain stable. Add \`expected_score_count\`, \`valid_score_count\`, \`invalid_scores\`, and \`gate_status\` rather than replacing its metric keys.

Lines 25 through 28 of \`seed-skills/rag-evaluation-metrics/SKILL.md\` require a floor, a golden set, and score distributions. A distribution is incomplete when some planned rows have no finite score.

Inputs are the sample IDs, metric names, raw score columns, and the release policy. Outputs are guarded means, row counts, bad-cell details, and one final status.

The test can also observe prompt, retriever, judge, and data versions already present in the report. Those fields help explain whether a bad value began after a scorer or input change.

The [RAG retrieval practices guide](/blog/rag-retrieval-testing-best-practices-2026) covers floor and drift checks after scoring. Ragas NaN score handling must pass before either check may decide release.

Treat a Python \`None\`, IEEE infinity, negative infinity, and a numeric NaN as invalid. Also reject strings such as \`"nan"\` because they are not score values at all.

Save the row order from the source data, but key the report by stable sample ID. A shifted frame index should not make a bad score look like it belongs to another case.

## How to ragas nan score handling?

For how to ragas nan score handling, build a small frame with finite values, NaN, null, and infinity. Test the validator apart from any model, network, or Ragas run.

Use two or more metrics so the fixture can show a partial row. One metric may be finite while another fails, and the report must keep both facts.

Define policy after value checks, not inside the mean function. A strict policy fails any invalid cell, while a quarantine policy accepts only pre-named sample and metric pairs.

The first example keeps the report shape from \`seed-skills/rag-regression-testing/SKILL.md\`. It uses plain Python data, which makes every branch fast and fixed.

\`\`\`python
from math import fsum, isfinite


def summarize_scores(rows: list[dict], metrics: list[str]) -> dict:
    invalid = []
    means = {}
    valid_counts = {}

    for metric in metrics:
        valid = []
        for row in rows:
            value = row.get(metric)
            if not isinstance(value, (int, float)) or not isfinite(value):
                invalid.append(
                    {
                        "sample_id": row["sample_id"],
                        "metric": metric,
                        "value": repr(value),
                    }
                )
            else:
                valid.append(float(value))
        valid_counts[metric] = len(valid)
        means[metric] = round(fsum(valid) / len(valid), 4) if valid else None

    return {
        "n_samples": len(rows),
        "expected_score_count": len(rows) * len(metrics),
        "valid_score_count": sum(valid_counts.values()),
        "valid_counts": valid_counts,
        "metrics": means,
        "invalid_scores": invalid,
        "gate_status": "fail" if invalid else "pass",
    }
\`\`\`

Keep a guarded mean in the report even on failure if at least one finite value exists. Label it as partial so a reader can debug trends without mistaking it for release proof.

Assert the exact list of invalid cells rather than only its length. This catches a validator that finds one bad row yet links it to the wrong metric.

Use the [RAG retrieval practices guide](/blog/rag-retrieval-testing-best-practices-2026) when wiring the exit code. The unit test itself should remain a pure data check with no shared files.

Add a clean fixture where every value is finite and all valid counts equal \`n_samples\`. That control proves the guard does not reject ordinary zero or one boundary scores.

## Ragas nan score handling example: scenario and assertion matrix

A ragas nan score handling example should cover clean values, score boundaries, bad types, repeat runs, and scorer faults. Each row below has one stable result that CI can check.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline | Four finite rows for two metrics | Eight valid cells and a passing status | Count differs from eight | \`seed-skills/rag-regression-testing/SKILL.md\` |
| Score boundary | Values are exactly zero and one | Both values remain finite and enter the mean | Boundary value is dropped | [Ragas metric list](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/) |
| Invalid cells | NaN, null, infinity, and a text value | Four named bad cells and a failing status | A bad cell is absent from the report | [Ragas evaluate reference](https://docs.ragas.io/en/latest/references/evaluate/) |
| Repeated run | Same rows are checked three times | IDs, counts, means, and status match | Row order changes the result | \`seed-skills/rag-evaluation-metrics/SKILL.md\` |
| Scorer fault | One metric raises for one sample | Row is errored or becomes a named NaN | Partial mean is marked complete | [Ragas eval workflow](https://docs.ragas.io/en/stable/getstarted/evals/) |

Zero is a valid score even when it fails a quality floor. Mixing validity with quality would mislabel a real result as missing evidence.

One is also valid, but it should not erase a bad cell from the same row. The report needs cell-level state before it rolls data up by sample or metric.

Run repeated cases with stable sample IDs and a fixed metric list. Sort only the final bad-cell view so parallel completion cannot change the artifact diff.

The [RAG retrieval practices guide](/blog/rag-retrieval-testing-best-practices-2026) offers wider checks. This matrix stays focused on whether the score grid is whole and finite.

## What failures expose Ragas missing metric score?

A Ragas missing metric score is exposed when planned cells and valid cells do not match. The gate must fail before a partial mean can be compared with its floor.

Inject one NaN into an otherwise strong column. If the code uses a default pandas mean, the number may stay high because the bad row is silently skipped.

Inject a null into a second metric on the same sample. The report must list two cell states, not collapse the row into one vague failure.

Inject positive and negative infinity because both satisfy some basic numeric type checks. \`math.isfinite\` rejects them while preserving valid zero and one.

Inject the string \`"0.8"\` to prove that type coercion is not hiding schema drift. Parse at the input edge only if the published result contract allows text numbers.

The second example asserts the rejected path described by \`seed-skills/rag-evaluation-metrics/SKILL.md\`. It proves that one skipped value cannot produce a passing run.

\`\`\`python
from math import nan


def test_nan_cannot_hide_behind_a_passing_mean() -> None:
    rows = [
        {"sample_id": "case-a", "faithfulness": 0.91},
        {"sample_id": "case-b", "faithfulness": nan},
        {"sample_id": "case-c", "faithfulness": 0.89},
    ]

    report = summarize_scores(rows, ["faithfulness"])

    assert report["n_samples"] == 3
    assert report["expected_score_count"] == 3
    assert report["valid_score_count"] == 2
    assert report["metrics"]["faithfulness"] == 0.9
    assert report["invalid_scores"] == [
        {"sample_id": "case-b", "metric": "faithfulness", "value": "nan"}
    ]
    assert report["gate_status"] == "fail"
\`\`\`

Also test an empty frame and a missing metric column. Both should return a clear data error rather than a pass based on zero bad values.

Do not delete a bad sample and rerun the mean as an automatic fix. The denominator change must appear as a reviewed data or quarantine change.

The [retrieval relevance guide](/blog/retrieval-relevance-testing-guide-2026) explains why hard cases stay in view. Here, every invalid cell remains tied to its sample even when a team allows short-term quarantine.

## How should Ragas NaN pandas mean run in CI?

Ragas NaN pandas mean checks should run after result creation and before any floor or drift test. CI must retain the raw frame and guarded report on both pass and failure.

Pin the golden data, metric set, judge setup, and package lock used by the job. Save those IDs beside the score grid so a changed scorer is easy to spot.

Use one output folder per job and write through a temporary file before rename. A stopped process should not leave half a JSON file that later steps accept.

Set time limits for each score task and the whole run. A timed-out cell should become a named error or NaN, then fail the complete-grid check.

When Ragas runs with exceptions disabled, its docs state that a failed metric may return NaN. CI should test this path with a stub scorer and confirm the row remains in the report.

When exceptions are enabled, catch the terminal run error at the job edge. Save the sample and metric in flight, then stop before quality comparisons.

Parallel scoring may finish out of order, so merge by sample ID and metric name. Compare exact sets rather than relying on frame index or callback order.

Retain raw score cells, bad-cell details, valid counts, means, and gate status. Redact prompts when they contain private data, but do not strip case identity needed for triage.

The [blog index](/blog) links broader CI advice. The focused command should return nonzero for any unapproved bad cell, count mismatch, parse error, or missing artifact.

Cleanup can remove temporary frames after the final artifact is stored. It must not erase the only copy of a failing row before the report upload completes.

## Which assertions verify fail CI on invalid eval score?

To fail CI on invalid eval score, assert shape before value, then value before quality. This order gives each failure one clear owner and avoids misleading floor errors.

First, assert the sample ID set equals the planned golden set. Missing, unknown, or duplicate IDs should stop the gate before metric math.

Second, assert each row has every planned metric key. A missing key and a key with NaN are distinct faults, even though neither may enter a mean.

Third, assert every raw value is numeric and finite. Keep exact bad cells with their Python representation, because JSON cannot safely encode NaN as a normal number.

Fourth, assert \`valid_score_count\` equals \`expected_score_count\` after approved quarantine rules are applied. Show both pre-policy and post-policy counts in the artifact.

Fifth, assert each metric valid count equals the active sample count. A total count alone can hide one metric with extra rows and another with missing rows.

Sixth, assert means are finite and use the same active IDs recorded by the gate. A second filter inside aggregation can create a new silent omission.

Seventh, assert quality floors only after the prior checks pass. A score below a floor is a product quality result, while a bad value is missing test proof.

Eighth, assert the run status cannot be \`pass\` when errors, bad cells, pending work, or expired quarantine exist. This state rule catches report code that formats facts correctly yet chooses the wrong release result.

Use the [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) to set metric floors. Keep those floor values outside the finite-value helper so policy remains easy to review.

Keep separate states for transport, scorer, value checks, and quality policy so one failing layer cannot be recast as another; a timed-out judge is not a low metric, and a low finite score is not missing data, even though both must block the same release job. This layered record also makes reruns safer because an owner can repeat only the failed scorer while preserving the original sample ID, raw result, attempt count, package versions, and first gate decision instead of replacing a failed run with a cleaner second artifact.

The failure text should name sample ID, metric, raw value, and source error when known. A generic invalid mean message is not enough for fast repair.

## Step-by-step test implementation

Implement Ragas NaN score handling in six steps that preserve row facts from input through CI. Keep each step small enough to test with plain Python data.

1. Read \`seed-skills/rag-regression-testing/SKILL.md\` and \`seed-skills/rag-evaluation-metrics/SKILL.md\`, then record the report shape, score floors, and planned golden sample IDs.
2. Create finite, NaN, null, infinity, text, empty-frame, and missing-column fixtures without calling a model, judge, network, or shared data source.
3. Build a pure guard that checks shape, type, and finiteness, then returns exact bad cells, valid counts, guarded means, and one gate status.
4. Run the all-finite path and assert that every planned cell enters its metric mean while zero and one remain valid score boundaries.
5. Inject each bad value and a scorer error, then assert complete row accounting, stable IDs, failing state, and no silent change to the denominator.
6. Run the focused suite in CI, keep raw and guarded artifacts, remove temporary files, and assign faults to data, scorer, gate, or platform owners.

Test the helper before connecting it to a Ragas result. A pure function makes policy bugs easy to reproduce without judge cost or network noise.

Then add one adapter that reads the actual result frame and emits plain rows. Keep all release rules in the tested helper instead of spreading them through report code.

Use the [QA skills directory](/skills) to find related RAG checks. Keep this suite as the single place that decides whether a metric grid is complete.

Run one known failure in CI before trusting the gate. Confirm that the nonzero status and bad-cell artifact both survive the job's failure path.

## Failure triage and regression ownership

Begin triage with counts and IDs. If planned and returned sample sets differ, the data loader or runner owns the first fault.

If a metric key is missing from every row, inspect metric setup and result mapping. That pattern differs from one sample where a scorer could not return a value.

If one value is NaN and the Ragas error says a metric failed, route it to the scorer owner. Keep the sample text and judge trace under the project's data rules.

If infinity appears after custom math, inspect division, scaling, and type conversion. Ragas output should reach the gate before any local transform can hide the raw cause.

If the raw frame is complete but the guarded report loses a row, the adapter or merge code owns the issue. Compare sorted sample and metric pairs on both sides.

If a partial mean passes a floor, the release gate owns the defect. The mean may stay useful for debug, but the status must remain failed or approved quarantine.

If failures appear only under parallel work, check callback IDs and result merge keys. Completion order must not decide which value maps to which sample.

If a quarantine record has no owner or has expired, treat its bad cell as unapproved. Data teams can renew it through review rather than changing the CI result by hand.

The [Ragas metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) helps place these owners in a wider pipeline. This check should still emit one direct cause before later jobs run.

Close the issue only when the repaired row is finite or the reviewed policy names it. Deleting the row does not repair the missing proof.

## Frequently Asked Questions

### How should a Ragas quality gate detect, report, and fail on NaN metric values instead of dropping them from an aggregate mean?

Check each raw cell with a finite-number test before calculating any mean. Report the sample ID, metric, raw value, and error for every bad cell. Compare valid and planned counts, then fail or apply a reviewed quarantine policy before quality floors can run.

### What fixture best tests how to ragas nan score handling?

Use a plain row set with two metrics and values covering zero, one, NaN, null, both infinities, and text. Include stable sample IDs and one partly valid row. This fixture proves type checks, cell counts, guarded means, and policy state without a model or network call.

### Which failure signal proves ragas nan score handling example?

A run fails when valid cells differ from planned cells or any unapproved bad-cell record exists. The report should still show a partial mean for diagnosis, but its status cannot pass. Missing sample IDs, duplicate rows, absent metric keys, and non-finite means are equal release blockers.

### How should CI report Ragas missing metric score?

CI should publish planned samples, metric names, expected cells, valid cells, and exact bad-cell records. It should also keep raw results, scorer versions, and one gate state. Sort by sample ID and metric so parallel work produces a stable diff across repeated runs.

### When should Ragas NaN pandas mean block a release?

Block whenever pandas would omit an unapproved NaN, when any value is null or infinite, or when a metric column is incomplete. Also block empty runs, duplicate sample IDs, and lost rows. A quarantine may change active counts only through a named, reviewed, time-bound rule.

### How can teams keep fail CI on invalid eval score repeatable?

Pin data and scorer setup, test a pure finite-value guard, and merge results by stable sample ID. Save raw cells before aggregation and sort bad-cell output. Use fixed error fixtures for NaN and exceptions, then verify that artifact upload completes before temporary files are removed.

## Conclusion

Ragas NaN score handling is fit for release gating when every planned cell is present, numeric, finite, and tied to a stable sample. Guarded means can aid review, but no partial set may pass a floor while missing evidence remains unapproved.

Open the [AI testing skills directory](/skills) to choose a RAG test workflow. Then read the [Ragas evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) before placing this finite-score gate ahead of quality checks.`,
};
