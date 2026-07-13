import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Set Golden-Set Difference Thresholds for Prompt Regression",
  description:
    "Set golden-set difference thresholds for prompt regression using labeled change severity, slice budgets, deterministic checks, and reviewable release gates.",
  date: "2026-07-13",
  category: "AI Testing",
  content: `
# Set Golden-Set Difference Thresholds for Prompt Regression

Prompt B changes 41 of 200 golden answers. That number sounds alarming until the changes are opened: 29 are punctuation or formatting, seven are clearer paraphrases, three omit required facts, and two violate a refusal rule. A raw changed-output percentage collapses all of those outcomes into one bit. The useful threshold is not “how much text moved,” but “how much unacceptable behavior entered each risk slice.”

A golden set gives prompt versions a shared examination. A difference threshold turns the comparison into a release decision. Setting it well requires several measures, because exact text equality is suitable for JSON keys and fixed labels but hostile to legitimate natural-language variation. This guide develops a severity-aware diff, calibrates budgets from human judgments, and shows how to keep the gate honest as prompts and models evolve.

## Define what “different” means before choosing a number

Every golden item should state which parts of the response are invariant and which may vary. For an extraction prompt, field names, types, and required values may be strict while object key order is irrelevant. For a support answer, cited policy IDs and the recommended action may be invariant while wording is flexible. For a safety refusal, the refusal decision may be strict while the explanation can change.

Separate checks by contract:

| Difference channel | Example | Suitable comparison | Typical severity |
| --- | --- | --- | --- |
| Schema | Required \`risk_level\` missing | Parse and validate structure | Blocking |
| Decision | “Approve” changes to “Reject” | Exact normalized label | Blocking or high |
| Grounded facts | Warranty changes from 24 to 12 months | Claim or field comparison | High |
| Citation set | Policy P-14 disappears | Set inclusion or precision/recall | High |
| Instruction coverage | Troubleshooting step omitted | Rubric labels | Medium to high |
| Style | Bullets become prose | Style classifier or reviewer | Usually low |
| Surface text | Punctuation and synonym changes | Normalized or semantic similarity | Informational |

This decomposition prevents semantic similarity from excusing a wrong number and prevents exact-match checks from rejecting a harmless rewrite. It also produces failure messages an engineer can act on. “Citation recall fell below the billing slice budget” is more useful than “42 percent different.”

The [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) covers construction and curation. Threshold work begins after each item has a stable input, expected contract, risk label, and enough metadata to form meaningful slices.

## Store judgments, not a single canonical paragraph

A canonical response is useful evidence, but it is rarely the complete oracle. Add fields that express allowed variation and required behavior. A JSONL item for an account-policy assistant might look like this:

\`\`\`json
{"id":"refund-017","slice":"refunds","risk":"high","input":"Can I refund an annual plan after 45 days?","required_facts":["30-day refund window","contact support for exceptions"],"forbidden_claims":["automatic refund is guaranteed"],"required_citations":["POL-REFUND-2"],"reference":"The standard refund window is 30 days. Contact support to ask whether an exception applies. [POL-REFUND-2]"}
\`\`\`

The generated output belongs in a separate run record keyed by item ID, prompt version, model identifier, decoding settings, retrieval snapshot, and timestamp. Do not overwrite the golden data with the latest answer. The point is to compare a candidate against an agreed contract and a baseline, not to make the oracle follow every candidate.

For genuinely open-ended tasks, keep multiple acceptable examples or a rubric. Human-reviewed “acceptable but different” outputs are particularly valuable because they reveal where an exact or lexical threshold would create noise.

## Build a severity-aware diff locally

Start with deterministic checks that are cheap, reproducible, and easy to audit. The following Python program compares baseline and candidate JSONL files. Each run row contains \`id\`, \`decision\`, \`facts\`, \`citations\`, and \`text\`. It treats decision changes and lost facts as severe, citation loss as major, and normalized text-only movement as cosmetic.

\`\`\`python
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path


def load_jsonl(path: str) -> dict[str, dict]:
    rows = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            rows[row["id"]] = row
    return rows


def normalized(text: str) -> str:
    return re.sub(r"\\s+", " ", text.strip().lower())


def classify(before: dict, after: dict) -> tuple[str, list[str]]:
    reasons: list[str] = []
    if before["decision"] != after["decision"]:
        reasons.append("decision changed")
    missing_facts = set(before["facts"]) - set(after["facts"])
    if missing_facts:
        reasons.append(f"facts lost: {sorted(missing_facts)}")
    if reasons:
        return "severe", reasons

    missing_citations = set(before["citations"]) - set(after["citations"])
    if missing_citations:
        return "major", [f"citations lost: {sorted(missing_citations)}"]

    if normalized(before["text"]) != normalized(after["text"]):
        return "cosmetic", ["normalized text changed"]
    return "same", []


baseline = load_jsonl(sys.argv[1])
candidate = load_jsonl(sys.argv[2])
if baseline.keys() != candidate.keys():
    raise SystemExit("Run files must contain exactly the same item IDs")

counts: Counter[str] = Counter()
for item_id in sorted(baseline):
    severity, reasons = classify(baseline[item_id], candidate[item_id])
    counts[severity] += 1
    if severity in {"severe", "major"}:
        print(item_id, severity, "; ".join(reasons))

total = len(baseline)
print({name: round(count / total, 4) for name, count in counts.items()})
if counts["severe"] > 0 or counts["major"] / total > 0.01:
    raise SystemExit(1)
\`\`\`

The one-percent number is only an example policy, not a universal recommendation. On a 50-item set it is effectively zero because one item equals two percent. That illustrates why count budgets and rate budgets both matter. A team might allow at most two major regressions overall but zero in a high-risk slice.

The program assumes baseline facts are expected in the candidate run record. In production, derive candidate facts with a tested extractor or compare generated text directly against golden required facts. Do not let the same unreviewed LLM generate the answer and certify its own facts without calibration.

## Calibrate against human acceptability

Threshold selection is a classification problem. For each historical comparison, reviewers label the candidate acceptable or unacceptable under a written rubric. The automated metric then predicts that label. Test several threshold values and calculate false-accept and false-reject counts.

Suppose a composite severity score ranges from 0 (no harmful difference) to 1 (maximum harm), and the gate fails at or above threshold \`t\`. The following script reads reviewed examples and prints confusion data for candidate thresholds:

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class Review:
    score: float
    unacceptable: bool


reviews = [
    Review(0.02, False),
    Review(0.08, False),
    Review(0.17, False),
    Review(0.24, True),
    Review(0.31, False),
    Review(0.44, True),
    Review(0.68, True),
    Review(0.91, True),
]

for threshold in (0.15, 0.20, 0.25, 0.30, 0.40):
    tp = fp = tn = fn = 0
    for review in reviews:
        predicted_failure = review.score >= threshold
        if predicted_failure and review.unacceptable:
            tp += 1
        elif predicted_failure and not review.unacceptable:
            fp += 1
        elif not predicted_failure and review.unacceptable:
            fn += 1
        else:
            tn += 1
    print(threshold, {"tp": tp, "fp": fp, "tn": tn, "fn": fn})
\`\`\`

The tiny list is pedagogical. Real calibration needs enough reviewed cases across each important slice. The decision should reflect cost: a false accept in medical instructions may be far more expensive than a false reject that sends a candidate to manual review. In a low-risk copywriting prompt, the balance can reverse.

Do not select the threshold on the same examples used to design the metric and report it as validated. Hold out reviewed comparisons or use time-based validation. Otherwise the team tunes to known cases and discovers poor generalization during the next prompt change.

## Give risky slices their own budgets

Aggregate gates can hide concentrated damage. If a golden set contains 900 marketing items and 100 billing items, nine billing regressions produce a one-percent overall rate but a nine-percent billing rate. Release decisions should see both.

Define slices from product risk, language, intent, tool usage, answer length, customer tier, and known failure modes. Keep the number manageable. A slice with three items cannot support a stable percentage threshold, although it can support a zero-tolerance rule for explicit invariants.

| Slice | Example invariant | Recommended gate shape | Why aggregate is insufficient |
| --- | --- | --- | --- |
| Safety refusal | Allowed request must not be refused | Zero severe label flips | Overall quality can hide one harmful refusal |
| Billing policy | Amount and eligibility remain correct | Zero fact loss, citation budget near zero | Wrong values carry direct customer impact |
| Tool calling | Function and required arguments valid | Schema pass plus exact tool-name check | Fluent text cannot compensate for invalid calls |
| Multilingual | Meaning preserved per supported locale | Per-locale reviewed metric | English volume can dominate the mean |
| Creative copy | Brand constraints honored | Rubric score with review band | Exact wording should vary |

Thresholds can have three states rather than pass and fail. A clean region auto-passes, a clearly harmful region blocks, and a narrow gray band requires review. This is often better than pretending evaluator noise disappears at one decimal place.

## Keep baseline drift separate from candidate drift

There are two comparisons in prompt regression. Candidate versus golden contract asks whether the new system is acceptable. Candidate versus current production asks what changed operationally. A candidate can differ greatly from production and still be a major improvement. It can also resemble production while both violate a newly added golden rule.

Store both results:

1. Contract evaluation against required fields, facts, citations, and rubrics.
2. Paired change analysis against the currently deployed prompt and model.
3. Human review for disagreements, novel behavior, and threshold-border cases.

Never silently replace the baseline after deployment. Baseline promotion should be a reviewed event with prompt version, model version, dataset version, evaluator version, and approver. Otherwise next week’s diff cannot explain whether behavior moved because of the candidate or because the reference was edited.

The broader [prompt regression testing guide](/blog/prompt-regression-testing-guide-2026) shows how these comparisons fit into CI and release workflows.

## Account for evaluator and sampling variance

Natural-language outputs can vary even with stable prompts. Model graders can vary too. A threshold built from a single generation and a single grading pass may flap near its boundary. Reduce avoidable variance by pinning the evaluated model version where possible, recording decoding parameters, freezing retrieval inputs, and making deterministic checks first.

For stochastic use cases, run repeated samples on a targeted subset and summarize the distribution. Do not average away a rare catastrophic failure. Track worst case or exceedance probability for critical invariants. For lower-risk style scores, a mean and confidence interval may be appropriate.

If an LLM judge supplies a score, preserve its rubric label and rationale for review, but do not assume numeric distances are calibrated. A move from 0.79 to 0.81 is not necessarily a meaningful quality jump. Compare judge labels to human labels, inspect disagreements, and version the judge prompt like production code.

## Write a gate that explains itself

A release gate should output item IDs, slice, failed invariant, baseline value, candidate value, severity, and links to full responses. A single percentage in a CI log forces engineers to rerun locally and encourages blind retries.

The policy can be explicit:

\`\`\`yaml
policy_version: 3
global:
  severe_count_max: 0
  major_rate_max: 0.01
  review_band:
    composite_difference: [0.18, 0.25]
slices:
  billing:
    lost_required_fact_max: 0
    lost_required_citation_max: 0
  creative-copy:
    severe_count_max: 0
    major_rate_max: 0.05
minimum_items:
  rate_gate: 100
\`\`\`

This YAML is a proposed team-owned policy format, not a library API. Validate it with your own schema and keep it beside the evaluator. The \`minimum_items\` rule prevents a percentage from conveying false precision on tiny slices. When the sample is smaller, use count gates and manual review.

Report improvements as well as regressions. A prompt change that fixes eight known failures while introducing one low-risk style issue deserves a different discussion from a change that only introduces the issue. The release rule may still block the severe case, but the report should represent the whole paired result.

## Recalibrate when the system changes shape

Revisit thresholds when the model family changes, retrieval is introduced, output schema changes, new locales launch, or human reviewers revise the rubric. Monitor the post-release false-alarm rate and escaped regression rate. Add escaped cases to the golden set only after deduplication and root-cause analysis.

Do not tighten a threshold simply because the current candidate happens to pass. Do not loosen it in the same pull request that it blocks without independent evidence. Either action can be valid, but it requires reviewed calibration data and a policy change separated from the prompt change where feasible.

A healthy gate is deliberately boring: stable item set, versioned measurements, explainable failures, and occasional evidence-based recalibration. Its purpose is not to freeze prose. It is to make behavioral change visible at the level customers and systems care about.

## Use change budgets to control the review queue

Even acceptable output movement consumes reviewer attention. A prompt refactor that changes 80 percent of surface text may preserve every invariant, yet manually confirming that result is harder than reviewing a five-percent change. Track review workload as an operational budget separate from the defect budget.

Stratify changed items by deterministic outcome. Items with identical structured decisions, complete required facts, unchanged citations, and only normalized prose movement can receive sampled review. Items with evaluator disagreement, new claims, or scores near a boundary receive full review. Severe deterministic changes always block. This allocation makes a large benign rewrite inspectable without pretending it is risk-free.

Sampling must be reproducible and risk-aware. Seed selection from the candidate version, include every high-risk slice, and record the chosen item IDs. A random sample drawn only from the dominant intent can miss the one locale or tool path that changed. If review finds a defect, expand to the related cluster rather than treating the sampled error as an isolated percentage.

Maintain a ceiling on “unclassified change.” When a response differs but none of the known comparators can explain why, route it to review. Do not place it automatically in the cosmetic bucket. That bucket should mean measured surface variation after invariant checks, not absence of an implemented detector.

The review budget can influence rollout without redefining correctness. A candidate with no detected regressions but unusually broad movement might ship to a small canary while review continues. Record that as a rollout decision, not a lower test threshold. Keeping those concepts separate prevents delivery pressure from rewriting the definition of an acceptable answer.

## Frequently Asked Questions

### Is exact match ever appropriate for prompt regression?

Yes, for canonical labels, tool names, identifiers, schema fields, and other tokens whose variation is not acceptable. It is usually too strict for explanatory prose. Apply exact match to the invariant field rather than the entire response.

### How large should a golden set be before using percentage thresholds?

There is no universal size. Percentages become misleading when one item moves the rate by several points. Define a minimum sample count for rate-based gates, then use absolute counts or mandatory review for smaller high-risk slices.

### Should cosmetic differences count toward the release limit?

Track them, but give them a separate budget from factual, decision, citation, or safety regressions. A surge in cosmetic movement can reveal prompt instability, yet it should not carry the same severity as a wrong policy answer.

### Can an LLM judge choose the threshold automatically?

It can provide a signal, not an accountable policy. Calibrate judge outputs against human decisions, inspect slice-specific errors, and choose the gate based on false-accept and false-reject costs. Version the judge and rubric so the measurement itself does not drift silently.

### When may the production baseline be updated?

Promote it after the candidate is approved and deployed, with the prompt, model, dataset, evaluator, and review decision recorded. Keep the immutable golden contract separate, because production behavior is a comparison point, not automatically the correct answer.
`,
};
