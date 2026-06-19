import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "How to Build a Custom LLM Benchmark: A 2026 Guide",
  description: "Build a custom LLM benchmark in 2026: design a dataset, define tasks, write scorers, set baselines, and run it in CI. Practical steps with real code.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# How to Build a Custom LLM Benchmark: A 2026 Guide

A **custom LLM benchmark** is a dataset of inputs paired with a scoring method that measures how well a model performs on *your* task — not a generic capability like MMLU. To build one you do four things: (1) collect a representative, labeled dataset of real inputs; (2) define the task (the prompt and the expected output shape); (3) write a scorer that turns each output into a number — exact match, a regex check, an embedding-similarity threshold, or an LLM-as-judge; and (4) establish baselines so a score has meaning. Public benchmarks tell you which model is generally smart; a custom benchmark tells you which model is good at *the thing you ship*.

This guide takes you from an empty folder to a benchmark you can run in CI on every prompt change.

## Why public benchmarks are not enough

Public benchmarks (MMLU, GSM8K, HellaSwag) measure broad knowledge and reasoning on academic tasks. They are saturated, leaked into training data, and — most importantly — they do not measure your use case. If you are building a support-ticket classifier, a SQL generator, or a contract-clause extractor, a model's MMLU score is nearly uninformative. Two models a few points apart on a leaderboard can differ enormously on your data.

A custom benchmark fixes this by encoding *your* definition of "correct." It catches regressions when you change a prompt, swap a model, or tune retrieval. It turns "the new prompt feels better" into "the new prompt scored 84% vs 79% on 200 held-out examples." That is the difference between vibes and engineering.

If you would rather adopt an existing eval framework than hand-roll one, browse the [eval and QA skills directory](/skills) — but the design principles below apply to any framework you choose.

## Step 1: Design the dataset

The dataset is the benchmark. A great scorer on a bad dataset is worthless. Aim for these properties:

- **Representative**: sample from real production inputs, not invented examples. If 30% of real queries are ambiguous, 30% of your dataset should be ambiguous.
- **Labeled with a clear ground truth**: each input has a known correct output (or a rubric, for open-ended tasks).
- **Covers edge cases**: include the hard cases — empty inputs, adversarial prompts, multilingual text, the long tail that breaks naive solutions.
- **Big enough to be statistically meaningful, small enough to run cheaply**: 100–500 examples is a sensible starting range. Below ~50, the standard error swamps real differences; thousands gets expensive to run on every commit.

Store it as JSONL — one example per line, easy to diff in git and stream in code:

\`\`\`jsonl
{"id": "t001", "input": "I was double charged for my subscription", "expected": "billing"}
{"id": "t002", "input": "How do I reset my password?", "expected": "account"}
{"id": "t003", "input": "The app crashes when I open settings", "expected": "bug"}
\`\`\`

Split into a **dev set** (for iterating on prompts) and a **held-out test set** (touched rarely, to detect overfitting to the dev set). Overfitting to your own eval is real: if you tune a prompt 40 times against the same 100 examples, you have leaked information and the score is optimistic.

## Step 2: Define the task

The task specifies how an input becomes a prompt and what output shape you expect. Keep this in code so it is versioned alongside everything else:

\`\`\`python
SYSTEM_PROMPT = """You are a support-ticket classifier.
Classify each ticket into exactly one category:
billing, account, bug, feature_request, other.
Respond with only the category name, lowercase, no punctuation."""

def build_messages(example: dict) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": example["input"]},
    ]
\`\`\`

Constraining the output shape ("only the category name, lowercase") makes scoring tractable. The looser the output, the harder and more expensive the scorer. For classification, force a closed set of labels. For extraction, force JSON. For free-form generation, you will need a rubric or a judge (Step 3).

## Step 3: Write the scorer

The scorer maps (output, expected) to a score, usually in [0, 1]. Pick the simplest scorer that captures correctness — complexity in the scorer is its own source of bugs.

**Exact / normalized match** — for closed-label classification:

\`\`\`python
def exact_match(output: str, expected: str) -> float:
    return 1.0 if output.strip().lower() == expected.strip().lower() else 0.0
\`\`\`

**Structured match** — for JSON extraction, parse and compare fields, not strings:

\`\`\`python
import json

def json_field_match(output: str, expected: dict, fields: list[str]) -> float:
    try:
        parsed = json.loads(output)
    except json.JSONDecodeError:
        return 0.0
    hits = sum(1 for f in fields if parsed.get(f) == expected.get(f))
    return hits / len(fields)
\`\`\`

**Semantic similarity** — for paraphrase-tolerant answers, embed both and threshold cosine similarity. This forgives wording differences but can mark a confidently-wrong-but-on-topic answer as correct, so calibrate the threshold against human labels.

**LLM-as-judge** — for open-ended generation (summaries, explanations, chat replies) where no deterministic check works. You prompt a strong model with the input, the candidate output, and explicit criteria, and ask for a score:

\`\`\`python
JUDGE_PROMPT = """Score the ASSISTANT ANSWER from 1 to 5 on these criteria:
- Factual accuracy vs the REFERENCE
- Completeness
- No hallucinated details

QUESTION: {question}
REFERENCE: {reference}
ASSISTANT ANSWER: {answer}

Return JSON: {{"score": <1-5>, "reasoning": "<one sentence>"}}"""
\`\`\`

Judges are powerful but have failure modes: position bias, verbosity bias (longer answers score higher), and self-preference. Mitigate by pinning a fixed judge model, using a tight rubric with a reference answer, and spot-checking judge scores against human labels on a sample. For deciding *which* scorer fits your task, our [comparison guides](/compare) lay out the trade-offs between deterministic and model-based scoring.

## Step 4: Build the runner

The runner ties dataset, task, and scorer together, calls the model on every example, and aggregates. A minimal version:

\`\`\`python
import json, statistics
from openai import OpenAI  # any client works

client = OpenAI()

def run_benchmark(dataset_path: str, model: str) -> dict:
    scores, failures = [], []
    with open(dataset_path) as f:
        for line in f:
            ex = json.loads(line)
            resp = client.chat.completions.create(
                model=model,
                messages=build_messages(ex),
                temperature=0,  # deterministic for benchmarking
            )
            output = resp.choices[0].message.content
            s = exact_match(output, ex["expected"])
            scores.append(s)
            if s < 1.0:
                failures.append({"id": ex["id"], "expected": ex["expected"], "got": output})
    return {
        "model": model,
        "n": len(scores),
        "accuracy": statistics.mean(scores),
        "failures": failures,
    }
\`\`\`

Set \`temperature=0\` so the benchmark is reproducible. Always capture **failures** — the aggregate score tells you *whether* you regressed; the failure list tells you *why*, and it is where all the learning is.

## Step 5: Establish baselines

A score is meaningless without something to compare against. Establish at least these:

| Baseline | What it tells you |
|---|---|
| Random / majority-class | The floor — a model below this is worse than guessing |
| A small/cheap model | The cost-performance trade-off |
| Your current production model | The bar any change must clear |
| Human performance (sampled) | The ceiling — how much headroom remains |

The majority-class baseline is especially clarifying: if 70% of your tickets are "billing," a model that always answers "billing" scores 70%. Your real model needs to beat *that*, not zero.

## Step 6: Run it in CI

The payoff of a custom benchmark is automated regression detection. Add a script that runs the benchmark and fails the build if accuracy drops below a threshold:

\`\`\`python
import sys

THRESHOLD = 0.80

result = run_benchmark("data/test.jsonl", model="gpt-4o-mini")
print(f"accuracy={result['accuracy']:.3f} (n={result['n']})")

if result["accuracy"] < THRESHOLD:
    print(f"FAIL: below threshold {THRESHOLD}")
    for fail in result["failures"][:10]:
        print(f"  {fail['id']}: expected {fail['expected']!r}, got {fail['got']!r}")
    sys.exit(1)
\`\`\`

Wire it into GitHub Actions so every prompt or model change gets scored automatically:

\`\`\`yaml
name: eval
on:
  pull_request:
    paths:
      - "prompts/**"
      - "src/**"
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: python run_eval.py
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Now a PR that quietly degrades the prompt cannot merge without the score dropping in front of a reviewer. This is the core of eval-driven development: treat eval scores like test coverage — a gate, not an afterthought.

## Common pitfalls

- **Tiny datasets.** With 20 examples, one flipped answer moves the score 5 points; you cannot tell signal from noise. Compute the standard error and size the dataset accordingly.
- **Overfitting to the dev set.** Tuning prompts repeatedly against the same examples leaks information. Keep a held-out test set you rarely look at.
- **A scorer more complex than the task.** Every line of scorer logic is a place for bugs. Start with exact match; escalate to similarity or a judge only when the task genuinely needs it.
- **Trusting the judge blindly.** LLM judges drift, show position and verbosity bias, and favor their own outputs. Pin the judge model and validate its scores against humans on a sample.
- **No baseline.** "82%" means nothing until you know random is 20%, majority-class is 70%, and production is 80%.
- **Non-deterministic runs.** Set \`temperature=0\` and a fixed seed where supported, or the same model scores differently every run and CI flakes.

## Frequently Asked Questions

### How many examples does a custom LLM benchmark need?
Start with 100–500 labeled examples. Below about 50 the standard error is so large that real differences between models or prompts vanish into noise. Thousands of examples give tighter confidence intervals but cost more to run on every commit, so balance statistical power against per-run cost and split into a dev set and a held-out test set.

### What is the best scorer for an LLM benchmark?
The simplest one that captures correctness. Use exact or normalized match for closed-label classification, structured field comparison for JSON extraction, embedding similarity for paraphrase-tolerant answers, and an LLM-as-judge only for open-ended generation where no deterministic check works. Complex scorers introduce their own bugs, so escalate only when the task demands it.

### How is a custom benchmark different from public benchmarks like MMLU?
Public benchmarks measure broad, general capability on academic tasks and are often saturated or leaked into training data. A custom benchmark encodes your specific definition of correctness on real production inputs, so it actually predicts how a model performs on the task you ship. It also catches regressions when you change prompts, models, or retrieval — something a generic leaderboard score cannot do.

### Should I use an LLM as a judge for my benchmark?
Use an LLM judge only when the output is open-ended and deterministic scoring is impossible, such as summaries or chat replies. Judges have known biases — position bias, a preference for longer answers, and self-preference — so pin a fixed judge model, give it a tight rubric with a reference answer, and validate its scores against human labels on a sample before trusting it.

### How do I run a custom benchmark in CI?
Write a script that runs the benchmark, prints the aggregate score, and exits with a non-zero status when accuracy falls below a threshold. Trigger it in GitHub Actions on pull requests that touch your prompts or source code, passing the model API key as a secret. This blocks any change that silently degrades quality from merging, turning your eval into a regression gate like test coverage.

### What baselines should I compare my benchmark scores against?
At minimum, compare against a random or majority-class baseline (the floor), a small cheap model (cost-performance), your current production model (the bar to beat), and a sampled human score (the ceiling). The majority-class baseline is critical for imbalanced tasks: if 70% of inputs share one label, a model must beat 70%, not zero, to be useful.
`,
};
