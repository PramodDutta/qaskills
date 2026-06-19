import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Taming LLM Non-Determinism & Flaky Evals (2026 Guide)",
  description: "Fix flaky LLM evals in 2026: why outputs vary, temperature and seeds, tolerance bands, semantic assertions, and majority-vote scoring for stable results.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Taming LLM Non-Determinism & Flaky Evals (2026 Guide)

**LLM non-determinism means the same prompt can produce different outputs on different runs, which makes naive evaluations flaky — a test passes one run and fails the next with no code change.** The fix is not to chase perfect reproducibility (you usually cannot get it) but to write evaluations that are robust to acceptable variation: lower or remove sampling randomness where you can, assert on meaning rather than exact strings, allow tolerance bands on metrics, and run each case multiple times so you score a distribution instead of a single noisy sample. This guide explains the sources of variation and the concrete techniques to stop them from making your eval suite untrustworthy.

## Why LLM outputs vary

Several independent sources of variation stack up, and understanding which is which tells you which lever to pull.

**Sampling randomness.** Most generation samples the next token from a probability distribution. A \`temperature\` above 0 deliberately injects randomness so outputs differ run to run. Setting \`temperature=0\` (greedy decoding) makes the model pick the highest-probability token each step — far more repeatable, but, importantly, **still not a hard guarantee of identical output**. On newer reasoning-first models the sampling parameters may be removed entirely (the API rejects \`temperature\`/\`top_p\`), so you cannot dial determinism this way at all and must design the eval to tolerate variation.

**Floating-point and infrastructure non-determinism.** Even with greedy decoding, the exact numbers can differ across hardware, batch sizes, and kernel implementations. Tiny floating-point differences occasionally flip which token is "highest probability," producing a different completion. This is why \`temperature=0\` reduces but does not eliminate variation.

**Reasoning / thinking variation.** Models that reason before answering can take different internal paths and arrive at the same answer phrased differently — or occasionally a different answer. The visible output varies even when the conclusion is stable.

**Provider-side changes.** The model behind an API alias can be updated, and routing, caching, or load can subtly change behavior over time. An eval that "suddenly" regresses with no change on your side may reflect a change on theirs.

The practical takeaway: **plan for variation rather than assuming you can eliminate it.** Reproducibility is a spectrum, and a robust eval works across the whole spectrum.

## Technique 1: reduce randomness where you can

The first lever is to remove the variation you control.

- **Use \`temperature=0\` for evaluation runs** on models that accept it. Greedy decoding is the most repeatable setting and is almost always what you want when measuring quality (you are testing the model's best answer, not its creativity). Note this does not guarantee bit-identical output, but it dramatically narrows the spread.
- **Pin the model version, not just the alias.** Aliases can move to newer model versions; pinning a specific version keeps the model under test constant between runs so a score change reflects *your* change, not a silent upgrade.
- **Freeze the prompt and inputs.** A golden dataset with fixed inputs is half the battle — see our golden dataset guide on the [blog](/blog).
- **Where sampling params are unavailable** (reasoning-first models that reject \`temperature\`), you cannot force determinism — go straight to the robustness techniques below.

Reducing randomness shrinks the problem but rarely solves it completely. The remaining variation has to be absorbed by how you *assert*.

## Technique 2: assert on meaning, not exact strings

The single biggest cause of flaky LLM evals is exact-string matching on open-ended outputs. Two answers can be equally correct and share almost no characters:

\`\`\`text
"Yes, damaged items can be returned within 30 days."
"You have a 30-day window to return items that arrived damaged."
\`\`\`

An \`==\` check fails the second; a human marks both correct. Replace brittle equality with assertions that tolerate valid variation:

- **Substring / keyword presence** for closed-form facts: does the output contain "30" and "day"? Robust to phrasing, good for extraction and yes/no.
- **Semantic (embedding) similarity** to a reference: encode both, compare cosine similarity, pass above a threshold. Robust to paraphrase; good when a canonical good answer exists.
- **LLM-as-judge against a rubric:** ask a grader model whether the output satisfies the criteria ("states the 30-day window," "does not invent a fee"). Most robust for open-ended outputs because it grades *properties* rather than wording.
- **Structured-output validation:** if you constrain the model to a JSON schema, you can assert on parsed fields exactly while the surrounding prose varies freely.

A small Python sketch of a tolerant assertion:

\`\`\`python
# tolerant_assert.py — meaning-based checks instead of ==
def passes(output: str, case: dict, embed, judge) -> bool:
    exp = case["expected"]
    if exp["type"] == "contains":
        return all(k.lower() in output.lower() for k in exp["keywords"])
    if exp["type"] == "semantic":
        sim = cosine(embed(output), embed(exp["reference"]))
        return sim >= exp.get("threshold", 0.80)
    if exp["type"] == "rubric":
        # judge returns True/False against criteria; robust to phrasing
        return judge(output, exp["criteria"])
    raise ValueError(exp["type"])
\`\`\`

The rule of thumb: **match the assertion to the task.** Deterministic facts can use keyword checks; open-ended generation needs semantic similarity or a rubric judge. Reserve exact equality for genuinely closed-form fields (often inside structured output).

## Technique 3: tolerance bands on metrics

When you aggregate scores across a dataset, the aggregate itself varies run to run because individual cases vary. A hard equality gate (\`accuracy == 0.94\`) will flap. Use bands instead:

- **Gate on "not worse than baseline minus tolerance."** Allow a small margin: \`assert accuracy >= baseline - 0.02\`. This catches real regressions while ignoring run-to-run noise.
- **Size the tolerance to the observed noise.** Run the suite several times on an unchanged model to measure the natural spread of the score, then set the tolerance a bit wider than that spread. A tolerance smaller than your noise floor guarantees flaky gates.
- **Be tighter on deterministic metrics, looser on judge-based ones.** Exact-match accuracy on closed tasks is more stable than LLM-judge scores, which themselves vary because the judge is an LLM.

\`\`\`python
# regression_gate.py — band, not equality
BASELINE = 0.94
TOLERANCE = 0.02           # set just above measured run-to-run noise
assert accuracy >= BASELINE - TOLERANCE, (
    f"Regression: {accuracy:.3f} < {BASELINE - TOLERANCE:.3f}"
)
\`\`\`

The same logic applies to cost and latency gates — never gate on an exact number when the underlying quantity is noisy.

## Technique 4: run multiple times, score the distribution

The most reliable defense against per-case flakiness is to stop trusting a single sample. Run each case N times and aggregate:

- **Majority vote / consensus** for closed-form answers: run 3–5 times, take the most common answer, score that. This smooths out the occasional off-sample and reflects the model's typical behavior rather than a one-off.
- **Mean and variance per case:** for scored outputs, report the average score across repeats and flag cases with high variance — those are the genuinely unstable ones worth investigating, not the whole suite.
- **Pass@k vs pass^k, chosen deliberately.** \`pass@k\` (did at least one of k attempts succeed?) suits use cases where you can retry or pick the best (code generation with tests). \`pass^k\` / consistency (did *all* k attempts succeed?) suits use cases that demand reliability every time. Pick the one that matches how the feature is actually used.

\`\`\`python
# repeat_score.py — majority vote over repeats
from collections import Counter

def majority_answer(prompt, n=5):
    answers = [run_model(prompt) for _ in range(n)]
    # normalize before counting so trivial variation collapses
    norm = [a.strip().lower() for a in answers]
    winner, count = Counter(norm).most_common(1)[0]
    return winner, count / n   # answer + its consistency fraction
\`\`\`

Repeating costs more tokens, so balance N against budget: use a small N on every CI run for the fast core of your dataset, and a larger N for periodic deep runs or for high-risk cases. The consistency fraction itself is a useful metric — a case that only agrees 3/5 of the time is telling you the model is unsure there.

## Technique 5: stabilize the LLM judge

If you use LLM-as-judge, the judge is itself non-deterministic and can be a hidden source of flakiness. Steady it:

- **Run the judge at \`temperature=0\`** (where supported) so grading is as repeatable as possible.
- **Use a clear, structured rubric** with explicit pass/fail criteria rather than a vague "rate 1–10." Specific criteria reduce judge variance dramatically.
- **Constrain the judge to structured output** (a boolean per criterion, or a fixed enum score) so its verdict is unambiguous and parseable.
- **Pin the judge model version** and treat judge changes as carefully as model changes — a new judge can shift all your scores.
- **Spot-check the judge against human labels** periodically; a drifting judge silently corrupts every result.

A well-specified rubric judge run at low temperature is far more stable than a free-form one, and the difference often turns a flaky suite into a reliable one.

## Putting it together: a robust eval recipe

Combine the techniques in layers, cheapest first:

1. **Reduce randomness:** \`temperature=0\` where available, pin model + judge versions, freeze inputs.
2. **Assert on meaning:** keyword/semantic/rubric checks matched to each task type; exact match only for closed-form fields.
3. **Band your gates:** regress against \`baseline − tolerance\`, with tolerance sized above measured noise.
4. **Repeat and aggregate:** majority vote or mean-over-N for unstable cases; report consistency, not just pass/fail.
5. **Stabilize the judge:** low temperature, structured rubric, pinned version, periodic human spot-check.

Layered this way, acceptable variation is absorbed and only real regressions trip the gate. Browse runnable evaluation skills in the [skills directory](/skills) and compare evaluation frameworks on the [comparison hub](/compare) — many handle repeats, semantic scorers, and judge management for you.

## When flakiness is the signal, not the noise

One caveat worth stating: sometimes high variance on a case is the finding, not a nuisance to suppress. If the model answers a question correctly 3/5 times, that 60% consistency is real information — the feature is unreliable there, and hiding it behind a majority vote that "passes" can mask a genuine problem. Track per-case consistency as a metric in its own right. Use repeats to *measure* stability, not just to manufacture a green checkmark, and treat persistently low-consistency cases as bugs to fix in the prompt, the retrieval, or the model choice.

## Frequently Asked Questions

### Does setting temperature to 0 make LLM output fully deterministic?

It makes output far more repeatable but does not guarantee bit-identical results. Greedy decoding picks the highest-probability token each step, but floating-point differences across hardware, batch sizes, and kernel implementations can occasionally flip which token wins, producing a different completion. Use \`temperature=0\` for evaluation to narrow the spread, then still design assertions and gates to tolerate the residual variation.

### Why does my LLM eval pass one run and fail the next?

Almost always because the eval uses exact-string matching against an output that is correct but phrased differently, or because it gates on an exact aggregate score that naturally varies run to run. Replace equality with meaning-based assertions (keyword, semantic similarity, or a rubric judge) and gate on a tolerance band (\`baseline − margin\`) rather than an exact number. For unstable cases, run multiple times and score the distribution.

### How many times should I repeat each evaluation case?

Balance signal against cost. A small N (often 3–5) is enough for majority-vote stability on a fast CI core, while a larger N is worth it for periodic deep runs or high-risk cases where you want a confident consistency estimate. Repeating costs proportional tokens, so reserve large N for where stability matters most, and use the consistency fraction itself as a metric.

### What is the difference between pass@k and pass^k?

\`pass@k\` measures whether at least one of k attempts succeeds — appropriate when you can retry or pick the best result, such as code generation validated by tests. \`pass^k\` (consistency) measures whether all k attempts succeed — appropriate when the feature must be reliable every single time. Choose the metric that matches how the output is actually used, because they reward very different behaviors.

### Is LLM-as-judge itself non-deterministic?

Yes — the judge is an LLM, so its verdicts vary unless you stabilize it. Run the judge at \`temperature=0\` where supported, give it a clear structured rubric with explicit pass/fail criteria rather than a vague rating, constrain it to structured output, and pin its model version. Spot-check it against human labels periodically, since a drifting judge silently corrupts every downstream score.

### Should I always suppress variance in evals?

No. Sometimes high per-case variance is the finding: if the model answers correctly only 3 of 5 times, that 60% consistency tells you the feature is unreliable there, and a majority vote that "passes" can hide a real problem. Use repeats to *measure* stability and track per-case consistency as a metric, treating persistently low-consistency cases as bugs to fix rather than noise to average away.
`,
};
