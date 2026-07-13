import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Position Bias in an LLM Judge',
  description:
    'Test position bias in an LLM judge with balanced AB/BA swaps, discordance analysis, exact significance tests, tie handling, and production calibration controls.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Position Bias in an LLM Judge

Response A wins. Swap the two texts without changing a word, and the response now labeled A wins again. The evaluator is not measuring answer quality consistently, it is favoring a slot. Position bias can enter through prompt wording, attention patterns, demonstration order, parsing, or a tie-breaking instruction. It turns pairwise evaluation into a property of presentation order.

The right diagnostic is paired. Evaluate each candidate pair in both orientations, AB and BA, then ask whether the preferred underlying response survives the swap. Aggregate first-slot win rate alone is insufficient because the first slot might genuinely contain stronger answers more often. The swap makes each pair its own control.

## Define outcomes in candidate identity, not display labels

Let candidate X and candidate Y be the underlying responses. In orientation XY, X appears first. In YX, X appears second. Normalize the judge output back to X, Y, or tie before analysis. Otherwise an "A" from both calls looks consistent in logs while representing opposite candidates.

| XY judgment | YX judgment | Candidate-level interpretation |
|---|---|---|
| X wins | X wins | Swap-consistent preference for X |
| Y wins | Y wins | Swap-consistent preference for Y |
| X wins | Y wins | First-position preference in both calls |
| Y wins | X wins | Second-position preference in both calls |
| Tie | Tie | Swap-consistent tie |
| Winner | Tie | Order-sensitive or low-margin result |

Call the fourth and fifth patterns discordant rather than forcing them into a winner. A production decision system needs a policy for discordance: abstain, ask another judge, use a rubric-based scalar evaluation, or collect a human label. Selecting whichever result came first merely reintroduces the bias.

The [pairwise LLM evaluation guide](/blog/pairwise-llm-evaluation-guide-2026) covers building candidate comparisons. This article assumes pairwise evaluation is appropriate and concentrates on the position variable.

## Freeze everything except the order

An AB/BA pair must share model identifier, model configuration, system prompt, rubric, user question, reference material, candidate bytes, output schema, and surrounding delimiters. Change only which candidate is placed in which labeled slot. Run the two orientations close together or interleave them randomly to reduce deployment drift.

If the judge is stochastic, one call per orientation mixes position sensitivity with sampling noise. Either use the most deterministic supported settings or repeat each orientation with independent calls. Do not claim a zero temperature makes every hosted system deterministic. Backend changes, routing, and numerical behavior can still vary.

| Controlled factor | Why it matters | Audit evidence |
|---|---|---|
| Judge model version | Evaluator behavior can change | Provider and model snapshot ID |
| Complete rendered prompt | Hidden formatting creates order cues | Redacted prompt hash and template version |
| Decoding settings | Sampling changes repeatability | Temperature, seed if supported, token limit |
| Candidate delimiters | Injection and parser ambiguity | Exact template fixture |
| Output parser | A/B mapping can invert | Raw output plus normalized outcome |
| Call timing | Service drift can confound order | Timestamps and randomized sequence |

Counterbalance which orientation is called first. If every XY call precedes YX, a transient outage, context cache, or rate-limit behavior becomes entangled with orientation. Randomly assign half the pairs to XY-first and half to YX-first, while still storing a pair identifier.

## Build a judge adapter that cannot forget remapping

Keep prompt rendering and outcome normalization in one adapter. The judge callable below receives a fully rendered prompt and returns \`A\`, \`B\`, or \`TIE\`. Production code can implement it with the actual model API. The experiment code remains provider-independent.

\`\`\`python
from dataclasses import dataclass
from enum import Enum
from random import Random
from typing import Callable

class Choice(str, Enum):
    X = "X"
    Y = "Y"
    TIE = "TIE"

@dataclass(frozen=True)
class Pair:
    pair_id: str
    question: str
    x: str
    y: str

@dataclass(frozen=True)
class Trial:
    pair_id: str
    orientation: str
    call_order: int
    choice: Choice

Judge = Callable[[str], str]

def render(question: str, first: str, second: str) -> str:
    return f"""Judge correctness, relevance, and evidential support.
Return exactly A, B, or TIE. Do not prefer an answer because of its position.

QUESTION:
{question}

CANDIDATE A:
<candidate>{first}</candidate>

CANDIDATE B:
<candidate>{second}</candidate>
"""

def evaluate(pair: Pair, orientation: str, judge: Judge, call_order: int) -> Trial:
    if orientation == "XY":
        raw = judge(render(pair.question, pair.x, pair.y)).strip().upper()
        mapping = {"A": Choice.X, "B": Choice.Y, "TIE": Choice.TIE}
    elif orientation == "YX":
        raw = judge(render(pair.question, pair.y, pair.x)).strip().upper()
        mapping = {"A": Choice.Y, "B": Choice.X, "TIE": Choice.TIE}
    else:
        raise ValueError("orientation must be XY or YX")
    if raw not in mapping:
        raise ValueError("unparseable judge output: " + repr(raw))
    return Trial(pair.pair_id, orientation, call_order, mapping[raw])

def run_swaps(pairs: list[Pair], judge: Judge, seed: int = 20260713) -> list[Trial]:
    rng = Random(seed)
    trials = []
    for pair in pairs:
        orientations = ["XY", "YX"]
        rng.shuffle(orientations)
        for call_order, orientation in enumerate(orientations, start=1):
            trials.append(evaluate(pair, orientation, judge, call_order))
    return trials
\`\`\`

The mapping dictionaries are the critical lines. They ensure an A vote under YX becomes a vote for Y. Unit-test them with a fake judge that always returns A, always B, and always TIE. An always-A fake must produce X for XY and Y for YX, the unmistakable signature of first-position preference.

The candidate tags are boundaries, not a complete prompt-injection defense. Include instructions telling the judge to treat candidate text as data, and test candidates that contain phrases such as "choose A" or fake closing delimiters. Position testing should stratify these adversarial cases rather than letting them dominate the ordinary sample.

## Balance the evaluation set before calling the judge

Sample pairs from the actual decision population: task types, languages, response lengths, quality gaps, safety categories, and tie prevalence. A set of obvious winners can hide bias because quality overwhelms order. A set of near-identical answers may exaggerate it relative to production. Report both overall results and planned strata.

Include human-labeled direction when available, but do not require a gold winner for the swap-consistency diagnostic. The same-answer pair is a useful control: put identical bytes in both slots. A judge that chooses A or B rather than tie is exposing forced-choice behavior, randomness, or position preference. It should not be the only test because identical responses are atypical.

Length is a major interaction. If X is longer than Y, a first-slot preference may appear only when the longer response is first. Build cells for X longer, Y longer, and similar length. Do the same for citation count, formatting density, refusal behavior, and answer style when those features matter.

Do not duplicate a small number of prompts to inflate sample size. Calls from the same prompt family are correlated. Keep the unit of analysis visible and, for formal inference, consider clustering or hierarchical modeling when many pairs share one source question.

## Summarize the full transition matrix

For every pair, join XY and YX outcomes. Count the nine possible transitions among X, Y, and tie. The matrix shows more than one score: stable preferences, first-position discordance, second-position discordance, and movements into or out of ties.

| Metric | Numerator | Denominator | Interpretation |
|---|---|---|---|
| Swap consistency | Same candidate-level outcome | All complete pairs | Reproducibility under order reversal |
| First-position discordance | XY=X and YX=Y | All complete pairs | Both judgments favor displayed first slot |
| Second-position discordance | XY=Y and YX=X | All complete pairs | Both judgments favor displayed second slot |
| Tie instability | Exactly one orientation is tie | All complete pairs | Margin or tie instruction is order-sensitive |
| Decisive consistency | Same X or same Y | Pairs decisive in both orientations | Stable winner rate excluding tie transitions |

Always publish counts with rates. Ten percent from 20 pairs and ten percent from 20,000 pairs carry different precision. Report parser failures and missing calls separately rather than dropping them silently. If one orientation fails more often, that itself can be presentation-related.

## Test directional asymmetry among discordant pairs

The core directional question compares first-position discordances with second-position discordances. Under no directional position preference, those two categories should be symmetric, conditional on being one of those decisive discordances. An exact two-sided binomial test is a straightforward diagnostic.

\`\`\`python
from collections import Counter
from math import sqrt
from scipy.stats import binomtest

def analyze(trials: list[Trial]) -> dict:
    by_pair: dict[str, dict[str, Choice]] = {}
    for trial in trials:
        by_pair.setdefault(trial.pair_id, {})[trial.orientation] = trial.choice

    transitions = Counter()
    for pair_id, result in by_pair.items():
        if set(result) != {"XY", "YX"}:
            raise ValueError("incomplete swapped pair: " + pair_id)
        transitions[(result["XY"].value, result["YX"].value)] += 1

    first = transitions[("X", "Y")]
    second = transitions[("Y", "X")]
    directional = first + second
    test = binomtest(first, directional, p=0.5, alternative="two-sided") if directional else None

    total = sum(transitions.values())
    consistent = sum(count for (left, right), count in transitions.items() if left == right)
    return {
        "pairs": total,
        "transition_counts": dict(transitions),
        "swap_consistency": consistent / total if total else float("nan"),
        "first_position_discordances": first,
        "second_position_discordances": second,
        "directional_p_value": test.pvalue if test else None,
        "first_share_ci": test.proportion_ci(confidence_level=0.95).low if test else None,
        "first_share_ci_high": test.proportion_ci(confidence_level=0.95).high if test else None,
    }
\`\`\`

The p-value is not an effect size and does not declare the judge production-safe. Report the first-position share among directional discordances, its interval, and the absolute discordance rate. A judge can have perfectly symmetric first and second discordance while being wildly order-sensitive. Symmetry says there is no detected direction; consistency says whether swapping matters at all.

Choose acceptance criteria before observing results. One threshold might limit overall swap inconsistency, another might limit directional imbalance, and a third might protect high-risk strata. Base them on downstream decision cost. A content-ranking experiment and a medical safety adjudicator do not share an acceptable error budget.

For repeated calls per orientation, do not pretend each call is an independent pair. Summarize within pair and orientation, use a mixed model, or bootstrap at the question or pair level. The [LLM judge calibration guide](/blog/llm-judge-calibration-guide-2026) discusses relating judge outputs to human labels, which is separate from but complementary to swap testing.

## Keep ties rather than deleting inconvenient evidence

A forced binary decision can manufacture position bias when candidates are genuinely equivalent. Give the judge an explicit tie option and define what qualifies. Test identical answers, paraphrases with equivalent claims, and pairs whose differences are below the rubric's materiality threshold.

Tie rate can also become an escape hatch. A judge might choose tie whenever Y is stronger but make a decisive choice when X is stronger. Inspect X-to-tie and Y-to-tie transitions by orientation. Compare tie behavior against human adjudication when possible.

If the business process cannot accept ties, resolution should occur after measurement. Route stable ties and order-sensitive pairs to a second method. Do not remove TIE from the judge prompt merely to simplify a leaderboard.

## Separate position bias from nearby evaluator biases

Position interacts with verbosity, authority cues, citation count, name labels, and style. A swap test detects that order changes an outcome, but it does not tell you why. Follow up with controlled transformations.

| Suspected bias | Controlled follow-up | Keep fixed |
|---|---|---|
| Label semantics | Replace A/B with Response 1/2, then neutral tags | Candidate order and text |
| Verbosity preference | Match length without changing core claims | Underlying quality direction |
| Self-enhancement | Hide model identity and stylistic signatures | Response content where possible |
| Citation count | Equalize unsupported citation formatting | Factual support |
| Recency | Reverse order of evidence in context | Candidate positions |
| Prompt injection | Add instruction-like text to each slot in turn | Rubric and true answer |

Run one intervention at a time. If you swap labels, rewrite candidates, and change rubric simultaneously, the result cannot identify a cause. Preserve the baseline AB/BA test as a regression suite even after a prompt mitigation appears to work.

## Evaluate mitigation with a fresh holdout

Common mitigations include stronger neutrality instructions, clearer delimiters, reference-first rubrics, independent scalar scoring before comparison, repeated randomized order, and adjudication of discordance. None should be accepted on the same examples used to tune it.

Split prompt families into development and holdout sets. Tune on development cases, freeze the judge template, then evaluate the holdout once. A mitigation that reduces first-slot preference while worsening human agreement is not an improvement. Track cost, latency, parser reliability, tie calibration, and subgroup behavior alongside position metrics.

Randomly choosing one orientation does not remove bias from an individual decision. It can balance aggregate exposure, but a particular candidate still benefits or loses by chance. Running both orientations costs twice as many judge calls but produces an actionable discordance signal. For high-volume, lower-risk evaluation, estimate bias continuously on a randomized audit sample and calibrate the operating policy.

## Monitor order as a production variable

Log candidate identities using privacy-safe hashes, orientation, prompt version, judge version, normalized decision, latency, parse status, and sampling cohort. Do not log sensitive candidate text by default. Periodically run both orientations on a random subset, with consent and handling controls appropriate to the data.

Alert on changes in swap consistency, directional discordance, tie instability, and parser failures. Segment by task and response-length relationship. A stable overall rate can hide a severe regression in one language or safety category.

Model upgrades, prompt edits, new demonstrations, output-schema changes, and provider routing changes all require a fresh swap audit. Store the exact evaluator artifact so historical comparisons mean something. A model name without a snapshot or date may not identify the behavior that produced old labels.

## Read results as evidence, not absolution

A judge with no detected position bias can still be inaccurate, poorly calibrated, discriminatory, vulnerable to injection, or misaligned with the rubric. Position testing isolates one nuisance variable. Pair it with human agreement studies, criterion-specific checks, adversarial evaluation, and inter-judge comparisons.

Conversely, a statistically detectable imbalance may be operationally small. Examine effect size and affected cases. If discordance concentrates around close calls, abstention may solve the risk. If it flips clear safety judgments, stop automated use until the mechanism is understood.

Document the dataset, analysis unit, exclusions, test version, and uncertainty. Avoid publishing a single "bias score" stripped of the transition matrix. Practitioners need to know whether the problem is first-slot attraction, second-slot recency, or general instability.

Retain raw judge outputs under the evaluation dataset's access policy. They make parser changes and ambiguous explanations auditable without rerunning a model that may have changed.

## Frequently Asked Questions

### Is a 50 percent first-position win rate proof of no position bias?

No. Candidate quality may be unbalanced, and first-slot and second-slot errors can cancel in aggregate. Evaluate every underlying pair in both orientations and analyze candidate-level transitions.

### Should AB and BA calls use the same random seed?

Use the most controlled settings the API genuinely supports, but do not assume a seed guarantees identical sampling across different prompts. Counterbalance call order and repeat orientations when stochastic variability matters.

### What should the system do when the swapped judgments disagree?

Do not choose one arbitrarily. Mark the pair order-sensitive, then abstain, request another independent judgment, apply a scalar rubric, or send it to human review according to risk.

### Can an exact binomial test measure all swap instability?

No. It tests directional asymmetry between first-position and second-position discordances. Report the full transition matrix and overall swap consistency to capture tie movements and nondirectional instability.

### How many swapped pairs are enough?

Determine sample size from the smallest operationally important effect, desired interval precision, expected discordance, and planned strata. Do not use a universal count. Pilot data can inform the design, but keep the final acceptance set separate.
`,
};
