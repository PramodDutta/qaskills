import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "G-Eval Explained: Chain-of-Thought LLM-as-Judge Scoring (2026)",
  description: "G-Eval explained for 2026: how this chain-of-thought LLM-as-judge metric scores text, why it beats raw rubric prompts, and how to run G-Eval in DeepEval.",
  date: "2026-06-26",
  category: "AI Evals",
  content: `# G-Eval Explained: Chain-of-Thought LLM-as-Judge Scoring (2026)

**G-Eval is an LLM-as-a-judge metric that scores text by first asking a strong model to generate chain-of-thought evaluation steps from your criteria, then using those steps to fill in a numeric score.** From the 2023 paper *"G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment"* by Liu et al., it turns a one-line criterion like "is the summary coherent?" into an explicit rubric the judge reasons through, correlating with human ratings far better than a bare "rate this 1-5" prompt. It is DeepEval's default custom metric, defined in a few lines: \`GEval(name="Coherence", criteria="...", evaluation_params=[...])\`.

This guide explains how G-Eval works under the hood — the auto chain-of-thought, the form-filling paradigm, and the probability-weighted score — then shows how to run it in DeepEval, when to use it over alternatives, and how to keep its scores stable in CI.

## What G-Eval Actually Is

Most automatic NLG metrics (BLEU, ROUGE, BERTScore) compare a candidate against a reference string. They fail on open-ended generation — summaries, chatbot replies, RAG answers — where many phrasings are equally good and no single reference exists. **G-Eval is reference-free**: instead of string overlap, it asks a capable LLM to *judge* the output against a natural-language criterion, the way a human annotator would.

What makes G-Eval more than "just prompt GPT-4 to rate it" are three deliberate design choices from the paper:

1. **Auto chain-of-thought (CoT).** You give a short task and criteria; G-Eval first prompts the LLM to *generate the detailed evaluation steps itself*, then reuses that rubric for every example so the judge reasons consistently instead of improvising per call.
2. **Form-filling paradigm.** The prompt presents the task, the generated steps, and the input/output, then asks the model to "fill in" a score on a defined scale (e.g., 1-5). Framing it as form completion rather than free chat keeps the output parseable and on-scale.
3. **Probability-weighted scoring.** Rather than taking the single integer the model emits, the original method reads token probabilities for each possible score and computes a *weighted average* — a smooth, fine-grained number (like 4.18) that reduces the ties and jitter of discrete 1-5 outputs.

The result aligns with human judgment markedly better than reference-based or naive direct scoring on summarization and dialogue benchmarks — which is why "G-Eval" became shorthand for criteria-driven LLM judging.

## The Three-Stage Pipeline

G-Eval runs the same three stages every time, regardless of the criterion you supply:

| Stage | Input | Output | Who does it |
|---|---|---|---|
| 1. Generate steps | Task + your criteria | Numbered chain-of-thought evaluation steps | The judge LLM (once, then reused) |
| 2. Score | Steps + the actual input/output | A raw verdict on the scale (e.g., 1-5) | The judge LLM (per test case) |
| 3. Normalize | Token logprobs over score values | Weighted, normalized final score (0-1 in DeepEval) | The metric code |

Stage 1 separates G-Eval from a hand-written rubric: you state the goal and the model expands it into checkable steps instead of you enumerating "check tense, check pronouns, check ordering." Stage 3 is the statistical trick — weighting each candidate score by its probability yields a continuous value instead of a coarse integer, which matters when ranking near-equal outputs.

A common point of confusion: the original paper scores on a 1-5 (or 1-10) scale, but DeepEval rescales the final \`score\` to **0-1**, so a passing threshold of \`0.5\` is typical. The mechanism is identical; only the reported range differs.

## Running G-Eval in DeepEval

[DeepEval](/blog/deepeval-metrics-complete-guide-2026) ships G-Eval as a first-class metric, and it is the most common way teams use it in 2026. You define the criterion, declare which fields the judge may read, and run it against a test case.

Install and set a judge key first:

\`\`\`bash
pip install -U deepeval
export OPENAI_API_KEY="sk-..."
\`\`\`

A minimal coherence metric:

\`\`\`python
from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

coherence = GEval(
    name="Coherence",
    criteria=(
        "Assess whether the actual output is well-structured, logically "
        "ordered, and easy to follow given the input."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
    ],
    model="gpt-4o",
    threshold=0.5,
)

test_case = LLMTestCase(
    input="Summarize the benefits of property-based testing.",
    actual_output=(
        "Property-based testing generates many inputs from a spec, so it "
        "finds edge cases example tests miss, then shrinks failures to a "
        "minimal repro."
    ),
)

coherence.measure(test_case)
print(coherence.score)   # e.g. 0.86  (0-1 scale)
print(coherence.reason)  # natural-language justification
\`\`\`

Two parameters do the heavy lifting:

- **\`criteria\`** — a short description of *what good looks like*, fed into Stage-1 step generation. Keep it focused on one quality dimension per metric.
- **\`evaluation_params\`** — the whitelist of \`LLMTestCaseParams\` the judge may read (\`INPUT\`, \`ACTUAL_OUTPUT\`, \`EXPECTED_OUTPUT\`, \`CONTEXT\`, \`RETRIEVAL_CONTEXT\`). The judge only sees fields you list, so a "faithfulness" metric needs \`RETRIEVAL_CONTEXT\` while a "tone" metric needs only \`ACTUAL_OUTPUT\`.

### \`criteria\` vs \`evaluation_steps\`

You can let G-Eval generate the steps (pass \`criteria\`) **or** supply the rubric yourself (pass \`evaluation_steps\`). Hand-writing steps removes Stage-1 variability and is recommended once a metric goes into CI:

\`\`\`python
correctness = GEval(
    name="Correctness",
    evaluation_steps=[
        "Check whether facts in 'actual output' contradict 'expected output'.",
        "Penalize omission of any key fact present in 'expected output'.",
        "Vague or hedged language is acceptable; only factual errors count.",
    ],
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    model="gpt-4o",
)
\`\`\`

Pass \`criteria\` *or* \`evaluation_steps\`, not both — explicit steps make the rubric deterministic and far easier to audit when a reviewer asks "why did this score 0.4?".

### Wiring it into pytest

Because G-Eval is just a metric, it drops into a normal pytest suite via \`assert_test\`, which fails the test when the score falls below \`threshold\`:

\`\`\`python
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

def test_summary_is_coherent():
    case = LLMTestCase(
        input="Explain test doubles in one sentence.",
        actual_output="A test double stands in for a real dependency.",
    )
    assert_test(case, [coherence])
\`\`\`

Run it with the DeepEval runner so results stream to the dashboard and the gate is enforced:

\`\`\`bash
deepeval test run test_summary.py
\`\`\`

This is the pattern that makes G-Eval useful for regression testing: every pull request re-scores your generations and the build goes red when quality drops. For the broader family of judge designs G-Eval belongs to, see the [LLM-as-a-judge evaluation guide](/blog/llm-as-a-judge-evaluation-guide-2026).

## How G-Eval Compares to Other Judge Approaches

G-Eval is one point on a spectrum of LLM-judging techniques. The right choice depends on whether you need a custom dimension, a reference comparison, or a binary policy check.

| Approach | How it scores | Best for | Weakness |
|---|---|---|---|
| **G-Eval** | Auto/explicit CoT steps → weighted numeric score | Custom subjective dimensions (coherence, tone, helpfulness) | Score drifts if you don't pin steps + temperature |
| **DAG / decision tree** | Deterministic branching questions | Pass/fail policy & format checks | Verbose to author; not for nuanced quality |
| **Direct rating prompt** | "Rate 1-5" with no generated rubric | Quick throwaway checks | Poor human alignment; jittery |
| **Reference metrics (BLEU/ROUGE)** | n-gram overlap vs reference | Translation, extractive tasks with golden refs | Useless on open-ended generation |
| **Pairwise (A/B) judging** | Judge picks the better of two outputs | Ranking model versions head-to-head | No absolute score; needs a baseline |

**When to pick G-Eval:** reach for it when you need a *numeric, criteria-driven score on a subjective quality* that no off-the-shelf metric captures — "does this reply match our brand voice?", "is this medical summary appropriately cautious?", "is the explanation pedagogically clear?". The generated chain-of-thought is precisely what gives you human-correlated numbers on fuzzy dimensions.

**When to pick something else:** if the check is a hard rule ("must be valid JSON", "must not mention a competitor"), use a deterministic DAG metric or a plain assertion — burning a judge LLM on a regex-able rule is slow and adds variance. If you only need to know *which of two prompts is better*, pairwise judging is cheaper and more reliable. For RAG dimensions like faithfulness or context relevancy, the purpose-built metrics in DeepEval and Ragas already encode the right rubric — see how those stack up in [promptfoo vs OpenAI evals](/compare/promptfoo-vs-openai-evals).

**Verdict:** G-Eval is the best default for *custom subjective scoring*, and a poor default for *deterministic policy checks*. Most mature eval suites use both — G-Eval for the "is it good?" dimensions and decision-tree or assertion metrics for the "is it allowed?" dimensions.

## Choosing a Judge Model

G-Eval inherits the biases of its judge LLM, so the model is not a detail — the paper used GPT-4 because weaker models scored poorly. Use a frontier judge (GPT-4o, Claude, or comparable); it can and often should differ from the model under test, but watch for self-preference bias, where a model rates its own family slightly higher. DeepEval accepts a model string (\`model="gpt-4o"\`) or a custom \`DeepEvalBaseLLM\` wrapper, so you can route the judge through any provider — only alignment quality changes.

## Keeping G-Eval Scores Stable

The honest weakness of any LLM-as-judge metric is non-determinism: the same input can score 0.82 then 0.79 next run. G-Eval mitigates this with the probability-weighted average, but you still need discipline to make it CI-safe.

\`\`\`python
# Pin the rubric, the model, and (effectively) the sampling.
stable_metric = GEval(
    name="Helpfulness",
    evaluation_steps=[          # explicit steps = no Stage-1 drift
        "Does the output directly address the user's request?",
        "Are the steps actionable rather than vague?",
        "Penalize hallucinated facts not supported by the input.",
    ],
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
    ],
    model="gpt-4o-2024-08-06",  # pin a dated snapshot, not a moving alias
    threshold=0.5,
)
\`\`\`

Practical rules that keep the numbers reproducible:

- **Pin the steps.** Supply \`evaluation_steps\` rather than \`criteria\` so the rubric never regenerates.
- **Pin a dated model snapshot** (e.g., \`gpt-4o-2024-08-06\`) instead of a floating alias that silently upgrades your baseline.
- **Use a band, not an exact value.** Gate on \`score >= 0.5\`, never assert \`score == 0.86\` — treat it as a flaky-tolerant threshold.
- **Average over runs for benchmarking.** Comparing two prompts, score each on the full dataset and compare means — a single example is noise.

For a deeper treatment of why judge scores wobble and how to budget for it, see the [LLM non-determinism and flaky eval guide](/blog/llm-non-determinism-flaky-eval-guide-2026). You can also find install-ready evaluation skills for AI coding agents in the [QA skills directory](/skills).

## Common Pitfalls

- **Overloaded criteria.** Cramming "coherent, factual, concise, and on-brand" into one metric produces a muddy score. Split each quality into its own metric so failures are diagnosable.
- **Wrong \`evaluation_params\`.** Mention "the source document" but forget \`RETRIEVAL_CONTEXT\`, and the judge invents one — it only sees fields you whitelist.
- **Reading \`score\` without \`reason\`.** DeepEval returns a \`reason\` string for every verdict. Log it to turn an opaque number into an auditable judgment, and never read a 0-1 score as a percentage — it's a position on your rubric's scale, not "70% correct".

## When to Reach for G-Eval

Use G-Eval when you are evaluating **open-ended generation on a subjective quality dimension** and want a numeric, human-aligned score you can threshold in CI — summaries, chatbot turns, RAG answers, rewrites, or any "is this *good*?" judgment that string-overlap metrics can't express. Its chain-of-thought lets you define a brand-new criterion in one sentence and get a defensible number out. It is *not* the tool for deterministic policy checks, exact-match correctness, or head-to-head ranking, where DAG metrics, assertions, and pairwise judging do a cleaner, cheaper job. Most production suites combine G-Eval for the fuzzy dimensions with deterministic checks for the hard rules — browse [/skills](/skills) for setups that wire both into an agent's test loop.

## Frequently Asked Questions

### What does G-Eval stand for and where did it come from?

G-Eval comes from the 2023 paper "G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment" by Liu et al. The "G" reflects its use of GPT-4 as the judge model. It introduced the combination of auto-generated chain-of-thought evaluation steps, a form-filling scoring prompt, and probability-weighted score aggregation, and it demonstrated substantially higher correlation with human ratings than reference-based metrics on summarization and dialogue tasks.

### How is G-Eval different from just prompting GPT-4 to rate my text?

A naive "rate this 1-5" prompt gives the judge no consistent rubric and reads only the single integer it emits, which is jittery and weakly aligned with humans. G-Eval first has the model generate detailed evaluation steps from your criteria, reuses those steps for every example, and then computes a probability-weighted average over the possible scores instead of taking one number. Those three additions are what lift its human alignment well above direct rating.

### What scale does G-Eval use — 1 to 5 or 0 to 1?

Both, depending on implementation. The original paper scores on a 1-5 (or 1-10) scale and reports the probability-weighted average within that range. DeepEval, the most common implementation, rescales the final \`score\` to 0-1, so a threshold of 0.5 is typical. The underlying mechanism is the same; only the reported range differs, so always check which convention a given tool uses before setting a pass threshold.

### Should I use \`criteria\` or \`evaluation_steps\` in DeepEval's GEval?

Use \`criteria\` (let G-Eval auto-generate the steps) while you're exploring a new metric, then switch to \`evaluation_steps\` once it goes into CI. Supplying explicit steps pins the rubric so it never regenerates between runs, which removes a major source of score drift and makes every verdict auditable. Pass one or the other, not both.

### Is G-Eval reliable enough for CI gates?

Yes, if you control its variance. Pin \`evaluation_steps\`, pin a dated judge-model snapshot, gate on a threshold band (\`score >= 0.5\`) rather than an exact value, and for benchmarking compare means across a full dataset instead of single examples. Treated this way it behaves like a flaky-tolerant quality gate; treated naively, as an exact equality assertion, it will produce false failures.

### Does the judge model affect G-Eval's accuracy?

Significantly. G-Eval's human alignment depends heavily on using a strong judge — the paper used GPT-4 because weaker models scored poorly. Use a frontier model as the judge even when the model under test is small, and be aware of self-preference bias, where a judge slightly favors outputs from its own model family. Pinning a dated snapshot of the judge also keeps your baseline from shifting when the provider updates a floating alias.
`,
};
