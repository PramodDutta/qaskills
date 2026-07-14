import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Needle in a Haystack: Testing Long-Context LLM Recall (2026)',
  description:
    'A needle in a haystack guide for 2026: how the long-context LLM recall test works, why position matters, and how to run NIAH and RULER on your own model.',
  date: '2026-06-26',
  category: 'AI Evals',
  content: `# Needle in a Haystack: Testing Long-Context LLM Recall (2026)

**Needle in a Haystack (NIAH) is a long-context evaluation that hides one fact — the "needle" — inside a large block of filler text — the "haystack" — then asks the model to retrieve it.** Popularized by Greg Kamradt in late 2023, you run it across a grid of context lengths and needle depths to map where a model's recall holds and where it fails. The output is a heatmap: green where the fact was recovered, red where it was lost. It is the standard first probe for any model advertising a long context window.

This guide explains how NIAH works, why a needle's *position* changes the result, the "lost in the middle" effect it exposes, and how to run both classic NIAH and the harder RULER benchmark against your own model in CI.

## What the Needle in a Haystack Test Actually Measures

A long context window on the spec sheet — 128K, 200K, a million tokens — tells you what the model *accepts*, not what it *uses*. NIAH measures the second thing: given a context of length *N*, can the model reliably find a fact placed at depth *D*? The construction is deliberately simple so the result is unambiguous:

- **The haystack** is filler — long, semantically uniform text (Paul Graham's essays are canonical) that contains nothing the model needs.
- **The needle** is a planted sentence the haystack would never otherwise contain, e.g. *"The best thing to do in San Francisco is eat a sandwich and sit in Dolores Park on a sunny day."*
- **The question** asks only for the needle: *"What is the best thing to do in San Francisco?"*
- **The grader** checks whether the answer contains the planted fact.

Because the needle is the only retrievable signal in an ocean of noise, a wrong answer can't be blamed on ambiguity — the model either attended to that token range or it didn't. That clean signal is why NIAH became the default check for long-context claims.

## Why Position Matters: The Two Axes

NIAH is not one test but a sweep over two variables, and the interaction between them is the whole point.

| Axis | What it varies | What it reveals |
|---|---|---|
| **Context length** | Total tokens in the prompt (e.g. 1K → 128K) | At what window size recall starts to degrade |
| **Needle depth** | Where the needle sits, as a % of context (0% = top, 100% = bottom) | Whether the model attends evenly across position |

You evaluate every (length, depth) pair and plot the pass rate as a heatmap. A model with perfect recall is solid green; a real model usually is not — it recovers needles at the very start and end while missing ones buried in the middle of a long document. A single "passed at 128K" number hides this, and the depth axis is exactly what catches the failure.

### Lost in the Middle

The most important phenomenon NIAH exposes has a name. The 2023 paper *"Lost in the Middle: How Language Models Use Long Contexts"* by Liu et al. showed performance is highest when relevant information sits at the **beginning or end** of the input and **degrades significantly in the middle** — a U-shaped accuracy curve. NIAH's depth axis is the instrument that measures this on your own model, so always test the middle depths (40–60%) rather than assuming a long window is uniformly usable.

## Running Classic NIAH Yourself

The original implementation is Greg Kamradt's [\`LLMTest_NeedleInAHaystack\`](https://github.com/gkamradt/LLMTest_NeedleInAHaystack) repo, which sweeps the grid and emits the heatmap data. Install it and point it at a model:

\`\`\`bash
pip install needlehaystack
export OPENAI_API_KEY="sk-..."
\`\`\`

\`\`\`bash
# Sweep 1K → 128K across 10 depths, OpenAI provider
needlehaystack.run_test \\
  --provider openai \\
  --model_name "gpt-4o" \\
  --document_depth_percents "[0, 25, 50, 75, 100]" \\
  --context_lengths "[1000, 8000, 32000, 128000]"
\`\`\`

That writes per-(length, depth) results you can render as a heatmap. To see the mechanics, here is a minimal hand-rolled version — the entire test is just *insert, ask, grade*:

\`\`\`python
import os
from openai import OpenAI

client = OpenAI()

NEEDLE = ("The best thing to do in San Francisco is eat a sandwich "
          "and sit in Dolores Park on a sunny day.")
QUESTION = "What is the best thing to do in San Francisco?"

def build_prompt(haystack: str, depth_pct: float) -> str:
    """Insert the needle at a depth, measured as a % of the haystack."""
    cut = int(len(haystack) * depth_pct / 100)
    return haystack[:cut] + " " + NEEDLE + " " + haystack[cut:]

def run_case(haystack: str, depth_pct: float) -> bool:
    context = build_prompt(haystack, depth_pct)
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system",
             "content": "Answer using only the provided context."},
            {"role": "user",
             "content": f"{context}\\n\\nQuestion: {QUESTION}"},
        ],
        temperature=0,
    )
    answer = resp.choices[0].message.content.lower()
    return "sandwich" in answer and "dolores park" in answer

# Sweep depths for one context length
haystack = open("paul_graham_essays.txt").read()[:120_000]
for depth in (0, 25, 50, 75, 100):
    print(depth, "->", run_case(haystack, depth))
\`\`\`

Two details make or break the result. First, **\`temperature=0\`** so a red cell means a real miss, not sampling noise. Second, the **grader**: a naive substring match is brittle, so production NIAH uses an LLM-as-judge to score whether the needle's *meaning* was recovered — see the [LLM-as-a-judge guide](/blog/llm-as-a-judge-evaluation-guide).

## The Grader Problem

Whether a cell is green depends entirely on how you check the answer — and this is where naive setups go wrong.

| Grader | How it works | Failure mode |
|---|---|---|
| **Exact substring** | \`needle in answer\` | False reds when the model paraphrases |
| **Keyword overlap** | All key tokens present | Misses synonyms; gameable by verbosity |
| **LLM-as-judge** | A model scores semantic recall 1–10 | Adds cost + its own variance |
| **Embedding similarity** | Cosine vs the needle | Threshold tuning; weak on short needles |

The original NIAH project uses an LLM scorer that rates the response 1–10 for how completely it reproduced the needle, then thresholds. That is the right default: it tolerates paraphrase while still penalizing a genuine miss. The judge is itself an LLM call, so pin its model and temperature — judge drift moves your heatmap as much as the model under test. See the [LLM non-determinism and flaky eval guide](/blog/llm-non-determinism-flaky-eval-guide-2026) for keeping graded scores stable.

## Beyond Single Needles: RULER and Multi-Hop

Classic NIAH has a known weakness: retrieving one verbatim fact from filler is *easy*, and frontier models pass it at long lengths while still failing on real long-context tasks. The literature responded with harder synthetic benchmarks, the most cited being **RULER** from NVIDIA (Hsieh et al., 2024). RULER keeps NIAH's synthetic, length-controllable design but adds task categories single-needle retrieval misses:

- **Multi-key / multi-value NIAH** — several needles, some of them distractors, so the model must find the *right* one.
- **Multi-hop tracing** — chains of references to follow (variable A points to B points to the answer).
- **Aggregation** — collect and summarize many planted items, not just locate one.
- **Question answering** — needles framed as QA pairs in the haystack, closer to real RAG.

The headline RULER finding is the gap between *claimed* and *effective* context length: many models that advertise large windows hold quality only up to a fraction of it on these harder tasks. Report that number — the length at which your model *still passes the hard tasks*, not the length it accepts.

\`\`\`bash
# RULER is run from its repo; it generates synthetic data then evaluates
git clone https://github.com/NVIDIA/RULER.git
cd RULER
# configure model + tokenizer in the provided scripts, then:
bash run.sh "your-model" synthetic
\`\`\`

Run classic NIAH first as a cheap smoke test; promote to RULER when you need a defensible "effective context length" for a model card or build decision.

## Wiring NIAH into an Eval Framework

You rarely want a bespoke script in CI — you want NIAH as one case in a suite you already gate on. Both [promptfoo](/compare/promptfoo-vs-openai-evals) and DeepEval express it cleanly. In promptfoo, the haystack-with-needle is a templated prompt and the check is an assertion:

\`\`\`yaml
# promptfooconfig.yaml — needle recall as a graded assertion
prompts:
  - |
    {{haystack}}

    Question: What is the best thing to do in San Francisco?
providers:
  - openai:gpt-4o
tests:
  - vars:
      haystack: file://haystacks/needle_at_50pct_128k.txt
    assert:
      - type: contains
        value: 'Dolores Park'
      - type: llm-rubric
        value: >
          The answer states that the best thing to do is eat a
          sandwich and sit in Dolores Park. Score 0 if the fact is
          missing or wrong.
\`\`\`

\`\`\`bash
npx promptfoo@latest eval
\`\`\`

Generate one haystack file per (length, depth) cell, parameterize the test rows over them, and a single \`promptfoo eval\` reproduces the whole grid with a graded assertion per cell — exactly what you want a pull request to re-run. For DeepEval users, the same idea becomes an \`LLMTestCase\` whose \`retrieval_context\` is the haystack and whose metric is a contextual-recall or G-Eval check; the [DeepEval metrics guide](/blog/deepeval-metrics-complete-guide-2026) covers those. Install-ready long-context recall eval skills for AI agents live in the [QA skills directory](/skills).

## Choosing Lengths, Depths, and Filler

The grid you pick determines what you learn. A few practical defaults:

- **Lengths**: don't only test the maximum. Step geometrically — \`1K, 4K, 16K, 64K, 128K\` — so you see *where* the cliff is, not just whether the top passes.
- **Depths**: include \`0%\` and \`100%\` (the easy anchors) plus at least \`25/50/75%\`. The middle band is where "lost in the middle" lives; skipping it hides the real weakness.
- **Filler choice**: use semantically uniform, in-distribution prose. Out-of-distribution filler lets the needle stand out by topic rather than position and inflates your scores.
- **Needle wording**: pick a fact the haystack could never contain by coincidence, and avoid one the model could guess from world knowledge — else you measure priors, not retrieval.
- **Repeat per cell**: run each cell a few times even at \`temperature=0\` (providers aren't perfectly deterministic) and report a pass *rate*.

## Limitations: What a Green Heatmap Does Not Prove

NIAH is a necessary check, not a sufficient one. A perfect single-needle heatmap means the model can *locate a verbatim fact* — it does **not** prove it can reason over the whole document, synthesize scattered facts, or resist distractors. This is precisely why RULER, multi-hop variants, and realistic long-context QA sets exist. Treat NIAH as the *floor*: a model that fails it has a real retrieval problem, but one that aces it has only earned the right to face harder tests. Pair the synthetic grid with real long-document tasks from your domain before trusting a long window in production.

## When to Use the Needle in a Haystack Test

Reach for NIAH whenever you are about to **rely on a long context window** — evaluating a new model release, choosing a provider for a long-document RAG or agent system, or guarding against a regression where an update silently shrinks effective recall. It is fast, cheap, and gives an unambiguous map of where retrieval holds. Run it first as a smoke test, escalate to RULER and multi-hop tasks for a defensible effective-context number, and validate against real documents from your use case. Browse [/skills](/skills) for setups that wire long-context recall checks into an AI agent's test loop.

## Frequently Asked Questions

### What is the needle in a haystack test for LLMs?

It is a long-context evaluation that plants a single specific fact (the needle) inside a large body of unrelated filler text (the haystack), then asks the model to retrieve it. You repeat it across many context lengths and insertion depths and plot the pass rate as a heatmap. It measures whether a model can actually use its advertised context window, not merely accept that many tokens. Greg Kamradt's open-source implementation from late 2023 is the canonical version.

### Why does the needle's position in the context matter?

Because models do not attend evenly across a long input. The 2023 "Lost in the Middle" paper showed a U-shaped curve: recall is highest when the relevant information sits at the very beginning or very end of the context and drops significantly when it is buried in the middle. NIAH's depth axis is the instrument that measures this on your own model, which is why you must test middle depths (around 40–60%) and not just the top and bottom.

### What is the difference between NIAH and RULER?

Classic NIAH retrieves one verbatim needle from filler, which frontier models pass easily even at long lengths. RULER (NVIDIA, 2024) keeps the synthetic, length-controllable design but adds harder categories — multiple needles with distractors, multi-hop reference tracing, aggregation, and embedded QA. RULER reveals the gap between a model's *claimed* context length and its *effective* one on realistic tasks, so it is the better benchmark when you need a defensible number, while NIAH is the cheaper first smoke test.

### How should I grade whether the model found the needle?

A plain substring match is brittle because the model often paraphrases the needle, producing false failures. The robust default — used by the original NIAH project — is an LLM-as-judge that scores how completely the answer reproduces the needle's meaning on a scale, then thresholds. Whichever grader you choose, pin the judge model and use \`temperature=0\` so a red cell reflects a real miss rather than grading noise.

### Can I run the needle in a haystack test in CI?

Yes. Generate one haystack file per (length, depth) cell, then express each as a test case with a graded assertion in promptfoo or DeepEval, and a single \`promptfoo eval\` (or \`deepeval test run\`) reproduces the whole grid on every pull request. Keep the grid small and the temperature at zero so runs are comparable, and gate on the pass rate per cell so a model update that shrinks effective recall fails the build.

### Does passing NIAH mean a model has good long-context understanding?

No. A green heatmap proves only that the model can locate a single verbatim fact; it says nothing about reasoning over the whole document, combining scattered facts, or ignoring distractors. That limitation is exactly why multi-hop and aggregation benchmarks like RULER exist. Treat NIAH as a floor — failing it is disqualifying, but passing it only earns the model a chance at the harder, more realistic long-context tasks you should also run.
`,
};
