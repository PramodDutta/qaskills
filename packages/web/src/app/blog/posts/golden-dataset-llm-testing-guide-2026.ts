import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Golden Dataset for LLM Testing: Curate, Label, Version (2026)",
  description: "Build a golden dataset for LLM testing in 2026: sourcing real cases, labeling expected outputs, versioning, detecting drift, and sizing your eval set.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Golden Dataset for LLM Testing: Curate, Label, Version (2026)

**A golden dataset is a curated, labeled collection of inputs and their expected outputs (or grading criteria) that you run your LLM or agent against repeatedly to measure quality and catch regressions.** It is the single most important artifact in LLM evaluation: without one, every prompt or model change is a guess. A good golden dataset is sourced from real usage, labeled with clear expectations, version-controlled so results stay comparable, and refreshed over time so it does not drift away from how users actually behave. This guide covers sourcing, labeling, versioning, drift, and sizing — everything you need to build one that earns its keep.

## What "golden" actually means

The "gold" in golden dataset refers to the labels: each case carries a trusted, agreed-upon expectation that defines what a correct (or acceptable) output looks like. Those labels are your ground truth. The dataset is the fixed yardstick you measure against, so that when you change a prompt, swap models, or tune a retrieval pipeline, you can re-run the same cases and get directly comparable scores.

Three properties separate a useful golden dataset from a pile of examples:

- **Representative** — the cases reflect the real distribution of what users do, including the hard and rare ones, not just the happy path you imagined.
- **Labeled** — every case has an expected output or explicit grading criteria a scorer can apply.
- **Stable and versioned** — the set changes only deliberately, and every change is tracked, so a score drop means the model regressed, not that the test set moved under you.

This is the LLM analog of a regression test suite. The same discipline that makes conventional [test doubles and assertions](/blog) trustworthy — fixed inputs, known expected results, change tracking — is what makes an eval dataset trustworthy.

## Sourcing cases: where good data comes from

The biggest mistake is inventing every case from imagination. Synthetic-only datasets test what you *think* users do, which is exactly the blind spot production exposes. Draw from multiple sources and weight toward real signal:

**Production traffic (highest value).** Real user inputs — sampled, anonymized, and PII-scrubbed — are the gold standard for representativeness. Pull a stratified sample across intents so common and rare cases are both present. When production surfaces a failure, capture it; those failures are the most valuable cases you will ever add.

**Historical support / logs.** Past tickets, chat transcripts, and query logs are a rich source of phrasings and edge cases real people produce. They also come with implicit outcomes (was the issue resolved?) you can turn into labels.

**Hand-written cases for coverage gaps.** Use these deliberately to cover categories production has not yet exercised: a new feature, a known-risky input class, adversarial prompts. Mark them as synthetic so you know which part of your set is real.

**Synthetic generation, carefully.** You can use an LLM to generate variations (paraphrases of a real case, edge values, adversarial twists) to expand coverage cheaply. Treat machine-generated cases as drafts that still need human-checked labels — never trust an unreviewed model both to write the case and to grade it.

A healthy set blends them: a representative core mined from production, plus deliberate hand-written and synthetic cases that fill coverage gaps the real traffic has not yet hit.

| Source | Strength | Watch out for |
|---|---|---|
| Production traffic | Most representative | PII, must sample/anonymize |
| Support logs / transcripts | Real phrasings, implicit outcomes | Noisy, needs cleaning |
| Hand-written | Targeted coverage | Reflects your assumptions only |
| Synthetic (LLM-generated) | Cheap volume, edge cases | Needs human-verified labels |

## Labeling: turning cases into ground truth

A case without a label is just an input. The label defines what "correct" means, and the right form of label depends on the task.

**Closed-form tasks** (classification, extraction, yes/no) get exact labels: the expected class, the expected field values, the expected boolean. Scoring is deterministic — exact match or field-level comparison.

**Open-ended tasks** (summaries, explanations, generated text) rarely have one right answer. For these, use one of:

- **Reference answers** plus a semantic scorer (embedding similarity) — useful when there is a canonical good output.
- **Grading criteria / rubrics** — a checklist of properties the output must satisfy ("mentions the 30-day window," "does not invent a policy," "stays under 100 words"), scored by an LLM-as-judge or by heuristics. This is often more robust than a single reference, because it grades the *properties* you care about rather than demanding one phrasing.

**Agent tasks** get success criteria: the end state or outputs that count as task completion, plus optionally the expected tool calls or trajectory.

Labeling discipline that pays off:

- **Write a labeling guideline.** Ambiguous labels produce noisy scores. A short doc defining what each label means keeps multiple labelers consistent.
- **Measure inter-annotator agreement** on a sample. If two humans disagree on the label, your scorer will be unreliable too — fix the guideline before scaling.
- **Store the rubric with the case**, not in someone's head, so the grading is reproducible.

A labeled case in a simple JSONL format:

\`\`\`jsonl
{"id": "refund-001", "input": "Can I return a damaged item after 3 weeks?", "expected": {"type": "criteria", "must_include": ["30 day", "damaged items eligible"], "must_not": ["restocking fee"]}, "source": "production", "labeled_by": "human", "version_added": "2026-06"}
{"id": "ship-014", "input": "Do you deliver to Canada?", "expected": {"type": "exact_contains", "value": "yes"}, "source": "production", "labeled_by": "human", "version_added": "2026-06"}
\`\`\`

Capturing \`source\`, \`labeled_by\`, and \`version_added\` per case is not bureaucracy — it lets you slice scores by real-vs-synthetic, audit label provenance, and know when each case entered the set.

## Versioning: keeping scores comparable over time

If the dataset changes silently between runs, score comparisons are meaningless — you cannot tell a model regression from a dataset edit. Treat the golden dataset like code:

- **Store it in version control** (or a dataset registry that tracks versions). Commit the cases and the labels together.
- **Tag every evaluation run with the dataset version** it used. A score is only interpretable relative to a specific dataset version.
- **Make changes deliberate and reviewed.** Adding, removing, or relabeling a case is a pull request, not an ad-hoc edit. Reviewers catch labels that drifted or cases that no longer represent reality.
- **Separate "fix a wrong label" from "add new coverage."** Both are valid changes, but they affect score interpretation differently — a relabel can move the score on an unchanged model, so call it out explicitly.

A practical convention is to date or semver your dataset (\`v2026-06\`, \`v1.4.0\`) and record, in each eval run's metadata, both the model version and the dataset version. When a score moves, you can immediately ask: did the model change, or did the set?

## Drift: when a golden dataset goes stale

A golden dataset is a snapshot of reality at the moment you built it. Reality moves. Two kinds of drift erode its value:

**Distribution drift.** Users start asking about new features, phrasing requests differently, or shifting which intents dominate. A set assembled six months ago may over-weight intents that have faded and miss ones that now dominate. Symptom: your offline scores stay high while production quality signals (thumbs-down, retries) worsen — the set is no longer testing what users actually do.

**Label drift.** Your product changes — the refund window moves from 30 to 45 days, a policy is rewritten — and now the *expected* answers in your set are wrong. The model could be perfectly correct and still "fail" against a stale label. Symptom: scores drop after a product change with no model change.

Defenses against drift:

- **Refresh from production on a cadence.** Periodically pull a fresh production sample and reconcile it against the set: add newly common intents, retire cases that no longer occur.
- **Mine production failures continuously.** When online monitoring catches a new failure mode, label those real cases and promote them into the golden set so the regression is guarded forever. This is the hybrid loop that keeps the set honest.
- **Re-validate labels after product changes.** Any change to policies, prices, or features should trigger a label audit of affected cases.
- **Track set age.** Record when each case was added and flag stale slices for review.

Browse runnable evaluation skills in the [skills directory](/skills) and compare evaluation tooling on the [comparison hub](/compare) to find frameworks that manage dataset versions and drift for you.

## Sizing: how big should it be?

There is no universal number, but useful guidance:

- **Start small and real.** 30–50 carefully chosen, well-labeled cases covering your top intents beat 1,000 sloppy synthetic ones. A small high-quality set you trust is more useful than a large one you do not.
- **Grow toward coverage, not volume.** Add cases to cover gaps — new intents, edge cases, discovered failures — rather than padding with near-duplicates that add cost without adding signal.
- **Size per category.** Aim for enough cases in each important intent or failure category that a per-category score is meaningful (a handful at minimum; more for high-risk categories).
- **Balance cost.** Every case costs tokens (and judge tokens, if you use an LLM grader) on every run. A 5,000-case set run on every pull request can get expensive — keep a fast core for CI and a larger comprehensive set for periodic deep runs.

A common, effective structure is a **tiered set**: a small fast tier (top intents, runs on every change as a regression gate) plus a larger comprehensive tier (full coverage, runs nightly or pre-release). For more on the cost side, see our guide on measuring LLM cost and latency; for how offline sets feed from production, see our offline-vs-online evaluation guide on the [blog](/blog).

## A starter workflow

Putting it together, a pragmatic path to a working golden dataset:

1. **Seed (week 1).** Hand-write 30–50 cases across your top user intents with clear labels and a short labeling guideline. This is your first regression gate.
2. **Enrich with production (ongoing).** Sample real, anonymized traffic; add representative cases; mark them \`source: production\`.
3. **Mine failures (ongoing).** Every production quality failure becomes a labeled case. This is where the set gets its real value.
4. **Version (from day one).** Commit cases + labels to version control; tag every eval run with the dataset version.
5. **Refresh (on a cadence).** Reconcile against fresh production samples; re-validate labels after product changes; retire stale cases.

The dataset is never "done." A golden dataset that is actively curated becomes, over months, a distilled record of exactly what your users do and where you fail — which is worth far more than any one-time snapshot.

## Frequently Asked Questions

### How is a golden dataset different from a regular test set?

The defining feature is the labels: a golden dataset carries trusted, agreed-upon expected outputs (or grading criteria) that serve as ground truth, curated for representativeness and quality. A "regular" test set might be any collection of inputs; a golden set is the deliberately maintained, version-controlled yardstick you measure quality against. In practice the term emphasizes that the labels are reliable enough to gate releases on.

### Can I use an LLM to generate my golden dataset?

You can use an LLM to expand coverage — paraphrasing real cases, generating edge values, creating adversarial variations — but treat generated cases as drafts that still need human-verified labels. The risk is letting the same model both write the case and grade it, which bakes the model's blind spots into your "ground truth." Always anchor the set in real production cases and keep humans in the labeling loop for anything you gate on.

### How large should my golden dataset be?

Start with 30–50 high-quality, well-labeled cases covering your top intents — a small set you trust beats a large one you do not. Grow toward coverage rather than volume, adding cases for new intents, edge cases, and discovered failures, with enough cases per important category that per-category scores are meaningful. Mind the cost: every case spends tokens on every run, so keep a fast core for CI and a larger set for periodic deep runs.

### How do I know if my dataset has drifted?

Watch for divergence between offline scores and production signals: if your golden-set scores stay high while thumbs-down rates or retries climb in production, the set no longer reflects real usage (distribution drift). A sudden score drop right after a product change with no model change usually means stale labels (label drift) — the expected answers reference an old policy or price. Refresh from production on a cadence and re-validate labels after any product change.

### Should the golden dataset live in version control?

Yes. Storing cases and labels in version control (or a dataset registry that tracks versions) is what keeps scores comparable over time — without it you cannot tell a model regression from a silent dataset edit. Tag every evaluation run with the dataset version it used, and treat additions, removals, and relabels as reviewed changes, since a relabel alone can move the score on an unchanged model.

### How do I label open-ended outputs that have no single right answer?

Use grading criteria or rubrics instead of demanding one exact reference: a checklist of properties the output must satisfy (must mention X, must not invent Y, stay under Z words), scored by an LLM-as-judge or heuristics. This grades the qualities you actually care about rather than penalizing valid alternative phrasings. Where a canonical good answer does exist, a reference answer plus an embedding-similarity scorer is a reasonable alternative.
`,
};
