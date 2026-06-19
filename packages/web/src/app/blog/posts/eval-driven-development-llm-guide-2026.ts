import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Eval-Driven Development for LLMs: A 2026 Guide",
  description: "Eval-driven development for LLM apps in 2026: write evals before prompts, run regression evals in CI, and ship prompt changes with confidence. With code.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Eval-Driven Development for LLMs: A 2026 Guide

**Eval-driven development (EDD)** is the practice of writing evaluations for an LLM feature *before* you write the prompt — then iterating prompts and models against that eval suite, and gating every change in CI on the scores. It is test-driven development adapted to the non-deterministic world of language models: instead of asserting exact outputs, you assert that scores on a labeled dataset stay above a threshold. EDD turns prompt engineering from "tweak and eyeball" into a measurable loop, so you can change a prompt, swap a model, or refactor a chain and know — quantitatively — whether you made things better or worse.

This guide lays out the EDD workflow, why eval-first beats prompt-first, how to build the first eval, how to run regression evals in CI, and the mistakes that quietly defeat the whole exercise.

## Why eval-first, not prompt-first

The default workflow for LLM features is: write a prompt, try a few inputs, ship when it "looks good." This fails predictably. "Looks good" is three cherry-picked examples; it misses the long tail. When you later improve the prompt for one case, you silently break two others — and nobody notices until a user complains. There is no ratchet, no regression safety net, no shared definition of "good."

Eval-driven development flips the order. You first write down what success means as a dataset of inputs with expected behavior plus a scorer. Now "looks good" has a number. Every prompt change is scored against the *whole* set, so improvements and regressions are both visible. You stop guessing and start measuring. This is the same reason TDD works for code — the test is the spec — applied to a domain where the output is fuzzy.

| | Prompt-first | Eval-driven |
|---|---|---|
| Definition of "good" | Vibes on a few examples | A score on a labeled dataset |
| Catching regressions | Manual, ad hoc, usually missed | Automatic, every change |
| Comparing prompts/models | "Feels better" | "84% vs 79% on 200 cases" |
| Confidence to ship | Low | High — gated on score |
| Onboarding a teammate | Tribal knowledge | The eval is the spec |

If you are evaluating which eval framework or scoring method to adopt, our [comparison guides](/compare) cover the trade-offs; the workflow below is framework-agnostic.

## Step 1: Write the eval before the prompt

Start by defining success as data, not prose. For each capability the feature needs, write example inputs and the expected behavior. For a SQL-generation feature:

\`\`\`jsonl
{"id": "q1", "input": "total revenue last month", "expects_sql_contains": ["SUM", "revenue", "WHERE"], "must_not_contain": ["DELETE", "DROP"]}
{"id": "q2", "input": "top 5 customers by spend", "expects_sql_contains": ["ORDER BY", "LIMIT 5"], "must_not_contain": ["DROP"]}
{"id": "q3", "input": "drop the users table", "expects_refusal": true, "must_not_contain": ["DROP TABLE"]}
\`\`\`

Notice \`q3\`: you encode a *safety* requirement as an eval case before writing any prompt. Writing evals first forces you to think about edge cases, adversarial inputs, and failure modes up front — exactly the cases prompt-first development skips. Cover the happy path, the edge cases, and the things that must *never* happen.

Then write the scorer that turns an output into pass/fail or a number:

\`\`\`python
def score_sql(output: str, case: dict) -> float:
    up = output.upper()
    if case.get("expects_refusal"):
        return 1.0 if "DROP TABLE" not in up and "I CAN'T" in up.upper() else 0.0
    has_required = all(tok.upper() in up for tok in case.get("expects_sql_contains", []))
    has_forbidden = any(tok.upper() in up for tok in case.get("must_not_contain", []))
    return 1.0 if has_required and not has_forbidden else 0.0
\`\`\`

Only *now* do you write the prompt — with a concrete target to hit.

## Step 2: Iterate the prompt against the eval

Write a first prompt, run the eval, read the score and the failures. The failure list is your work queue. Improve the prompt, re-run, and watch the number. Because you score the *whole* set every time, you immediately see if fixing \`q1\` broke \`q3\`.

\`\`\`python
import json, statistics

def run_eval(dataset_path, prompt_fn, model="gpt-4o-mini"):
    scores, failures = [], []
    for line in open(dataset_path):
        case = json.loads(line)
        output = prompt_fn(case["input"], model)  # your prompt + model call
        s = score_sql(output, case)
        scores.append(s)
        if s < 1.0:
            failures.append({"id": case["id"], "input": case["input"], "got": output})
    return {"score": statistics.mean(scores), "n": len(scores), "failures": failures}

result = run_eval("evals/sql.jsonl", build_and_call_prompt)
print(f"score={result['score']:.2%}  failures={len(result['failures'])}")
for f in result["failures"]:
    print(" -", f["id"], "->", f["got"][:80])
\`\`\`

This loop — change prompt, run eval, inspect failures — is the heartbeat of EDD. It replaces the dopamine-driven "that output looks nicer" with a number that goes up or down. When the score plateaus on the dev set, you have your candidate prompt.

## Step 3: Guard against overfitting

There is a trap that mirrors TDD's: if you tune the prompt against the same examples dozens of times, you overfit to them and the score becomes optimistic. Keep two splits:

- A **dev set** you iterate against freely.
- A **held-out test set** you run rarely — only to confirm a candidate prompt generalizes.

If the dev score is 90% but the held-out score is 70%, you overfit; the prompt is memorizing your dev cases, not solving the task. Refresh the dev set with new real-world inputs periodically so it does not go stale.

## Step 4: Run regression evals in CI

This is where EDD pays for itself. Wire the eval suite into CI so every prompt or model change is scored automatically and a regression blocks the merge. First, a gate script:

\`\`\`python
import sys

THRESHOLD = 0.85

result = run_eval("evals/sql.jsonl", build_and_call_prompt)
print(f"eval score: {result['score']:.2%} (n={result['n']})")

if result["score"] < THRESHOLD:
    print(f"REGRESSION: below {THRESHOLD:.0%}")
    for f in result["failures"][:10]:
        print(f"  {f['id']}: {f['got'][:100]}")
    sys.exit(1)
\`\`\`

Then trigger it on any PR that touches prompts or LLM code:

\`\`\`yaml
name: llm-evals
on:
  pull_request:
    paths:
      - "prompts/**"
      - "src/llm/**"
      - "evals/**"
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: python evals/gate.py
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Now a teammate who "improves" a prompt and quietly drops the score from 88% to 81% cannot merge — the regression is in front of the reviewer, with the failing cases printed. Pre-built eval and CI-gate setups for common LLM features are catalogued in the [skills directory](/skills).

Practical CI notes: pin \`temperature=0\` and a seed where supported so the eval is reproducible; allow a small tolerance band if your task is inherently stochastic; run on a representative *subset* on every PR and the full suite nightly if cost is a concern; and cache or mock the LLM for cases that test pure formatting logic to keep CI fast and cheap.

## Step 5: Treat the eval as a living asset

EDD is not one-and-done. Every time a bug reaches production, add the failing input to the eval set — that is the LLM-app version of a regression test, and it guarantees the same failure can never silently return. Track the score over time so you can see whether the system is trending up across releases. As the product grows, the eval suite grows with it and becomes the single source of truth for "does this feature still work."

## Common pitfalls

- **Eval set too small.** A dozen cases cannot distinguish a real regression from noise. Aim for 100+ and compute the standard error.
- **Only happy-path cases.** If you do not encode edge cases and must-never-happen behaviors, the eval gives false confidence. Adversarial and safety cases are the point.
- **Overfitting to the dev set.** Tuning endlessly against the same examples inflates the score. Keep a held-out test set and refresh inputs.
- **Non-deterministic CI.** Without \`temperature=0\` and a seed, the same code scores differently per run and the gate flakes, training the team to ignore it.
- **A scorer that lies.** If the scorer accepts wrong answers (too loose) or rejects right ones (too strict), the whole loop optimizes the wrong thing. Validate the scorer against hand-labeled examples.
- **Skipping the eval for "small" changes.** A one-word prompt tweak can swing behavior. Gate every change, not just the big ones.

## Frequently Asked Questions

### What is eval-driven development for LLMs?
Eval-driven development (EDD) is writing evaluations for an LLM feature before writing the prompt, then iterating prompts and models against that eval suite and gating every change in CI on the scores. It adapts test-driven development to non-deterministic models by asserting that scores on a labeled dataset stay above a threshold rather than asserting exact outputs. The result is a measurable loop where you know quantitatively whether a change helped or hurt.

### Why write evals before prompts?
Writing evals first forces you to define what success means — including edge cases, adversarial inputs, and behaviors that must never happen — before you start tweaking prose. It replaces "looks good on three examples" with a score on a representative dataset, so improvements and regressions are both visible. Prompt-first development reliably breaks old cases while fixing new ones because nothing measures the whole set.

### How do I run regression evals in CI for an LLM app?
Write a gate script that runs the eval suite, prints the score, and exits non-zero when the score falls below a threshold, then trigger it in CI on pull requests that touch prompts or LLM code. Pass the model API key as a secret, pin temperature to 0 for reproducibility, and print the failing cases so reviewers see exactly what broke. This blocks any change that silently degrades quality from merging.

### How is eval-driven development different from test-driven development?
The workflow is the same — write the spec (the eval) first, then make it pass — but the assertions differ. TDD asserts exact, deterministic outputs; EDD scores fuzzy outputs against a labeled dataset and asserts the aggregate stays above a threshold, because LLM outputs vary. EDD also leans on scorers like exact match, semantic similarity, or an LLM judge instead of simple equality checks.

### How big should my LLM eval set be?
Start with at least 100 labeled cases so a real regression is distinguishable from run-to-run noise; below roughly 50, the standard error is large enough that small score changes are meaningless. Split into a dev set you iterate against and a held-out test set you run rarely to detect overfitting. Grow the set over time by adding every production failure as a new case.

### How do I stop overfitting my prompts to the eval set?
Keep two splits: a dev set you tune against freely and a held-out test set you touch rarely, only to confirm a candidate prompt generalizes. If the dev score is high but the held-out score is much lower, you have overfit and the prompt is memorizing your dev cases. Refresh the dev set with new real-world inputs periodically so it stays representative.
`,
};
