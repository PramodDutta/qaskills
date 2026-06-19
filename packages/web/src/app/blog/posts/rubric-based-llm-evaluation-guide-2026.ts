import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Rubric-Based LLM Evaluation Guide: G-Eval (2026)",
  description: "Rubric-based LLM evaluation in 2026: design scoring criteria, use G-Eval and an LLM judge, write custom rubrics, and avoid judge bias. With code.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Rubric-Based LLM Evaluation Guide: G-Eval (2026)

**Rubric-based LLM evaluation** scores a model's output against an explicit set of criteria — like accuracy, completeness, tone, and safety — instead of comparing it to a single reference answer. You define a rubric (the criteria plus a scale and what each level means), then have an LLM judge read the output and score each criterion. **G-Eval** is the best-known method: it uses a strong model with chain-of-thought reasoning and probability-weighted scores to grade open-ended text, and it correlates with human judgment far better than lexical metrics like BLEU or ROUGE. This is the go-to approach when there is no one correct answer — summaries, chatbot replies, generated emails, RAG answers.

This guide covers how to design a rubric that actually discriminates, how G-Eval works, how to implement custom criteria with an LLM judge, and how to keep the judge honest.

## Why rubric scoring beats reference metrics

For open-ended generation, there is rarely a single gold answer. A good summary can be phrased a hundred ways; a helpful chatbot reply has no canonical text. Reference-based metrics (BLEU, ROUGE, even BERTScore) all compare against one reference and penalize legitimate variation — and none of them measure whether the output is *correct*, *complete*, or *appropriately toned*. A rubric encodes the dimensions you actually care about and scores each one explicitly, which is both more meaningful and more interpretable: instead of "0.74 ROUGE-L," you get "accuracy 5/5, completeness 3/5, tone 4/5" plus the judge's reasoning for the 3.

Rubric scoring also produces *actionable* output. The per-criterion breakdown tells you exactly where the model fails — if completeness is the weak axis across your test set, you know to fix the prompt's coverage instructions. For how rubric scoring stacks up against pairwise and reference-based methods, see our [comparison guides](/compare).

## Step 1: Design the rubric

The rubric is the whole ballgame — a vague rubric produces noisy, useless scores. Good criteria are:

- **Specific and independent.** "Quality" is useless; "factual accuracy," "completeness," and "conciseness" are scorable and largely orthogonal. Avoid criteria that overlap (they double-count) or that bundle multiple ideas.
- **Anchored.** Define what each score *means*. A 1–5 scale needs a description per level, or at least for the endpoints and the midpoint, so two judges (or two runs) interpret "3" the same way.
- **Weighted to your priorities.** If accuracy matters ten times more than tone for your use case, weight the aggregate accordingly — do not average a critical and a cosmetic criterion equally.
- **Few.** Three to five criteria is the sweet spot. More dilutes attention and inflates cost without adding signal.

A worked rubric for evaluating support-bot answers:

| Criterion | 1 | 3 | 5 | Weight |
|---|---|---|---|---|
| Accuracy | Contains false info | Mostly correct, minor error | Fully correct | 0.4 |
| Completeness | Misses the core ask | Partial answer | Fully addresses the question | 0.3 |
| Tone | Rude or robotic | Neutral | Warm and professional | 0.15 |
| Safety | Unsafe/harmful advice | Borderline | Safe, adds caveats where needed | 0.15 |

Write the level descriptions in plain, behavioral language ("contains false info," not "low quality") so the judge has concrete anchors.

## Step 2: Understand G-Eval

**G-Eval** is a framework for using an LLM as a rubric judge that improves reliability with two ideas:

1. **Chain-of-thought evaluation steps.** Rather than asking "rate this 1–5," G-Eval first asks the model to generate (or is given) explicit evaluation steps derived from the criteria, then has it reason through them before scoring. The reasoning grounds the score and improves consistency.
2. **Probability-weighted scoring.** Instead of taking the single integer the model emits, G-Eval reads the probabilities the model assigns to each possible score and computes the expected value. So if the model is 60% on "4" and 40% on "5," the score is 4.4 — a finer-grained, less jumpy number than a raw integer. (When token logprobs are unavailable, implementations approximate this by sampling the judge multiple times and averaging.)

The headline result from the G-Eval work is that this approach correlates with human ratings substantially better than BLEU, ROUGE, and earlier model-based metrics on summarization and dialogue. It is implemented in popular eval libraries (for example DeepEval ships a G-Eval metric), so you usually do not write it from scratch.

## Step 3: Implement a custom-criteria judge

Whether you use a library's G-Eval or roll your own, the core is a well-structured judge prompt. Give the judge the criteria, anchored levels, the input, the output, and a strict output format:

\`\`\`python
import json
from openai import OpenAI

client = OpenAI()

RUBRIC = """Evaluate the ASSISTANT ANSWER on each criterion (1-5).

Accuracy: 5 = fully correct; 3 = minor error; 1 = contains false info.
Completeness: 5 = fully addresses the question; 3 = partial; 1 = misses the core ask.
Tone: 5 = warm and professional; 3 = neutral; 1 = rude or robotic.

First reason briefly about each criterion, then output scores.
Return strict JSON:
{"reasoning": "<2-3 sentences>", "accuracy": <1-5>, "completeness": <1-5>, "tone": <1-5>}"""

def judge(question: str, answer: str) -> dict:
    resp = client.chat.completions.create(
        model="gpt-4o",  # use a strong judge model
        messages=[
            {"role": "system", "content": RUBRIC},
            {"role": "user", "content": f"QUESTION:\\n{question}\\n\\nASSISTANT ANSWER:\\n{answer}"},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)
\`\`\`

Then aggregate with your weights:

\`\`\`python
WEIGHTS = {"accuracy": 0.5, "completeness": 0.3, "tone": 0.2}

def weighted_score(scores: dict) -> float:
    return sum(scores[k] * w for k, w in WEIGHTS.items())

result = judge("How do I get a refund?", "Email support and we'll process it in 3-5 days.")
print(result, "->", round(weighted_score(result), 2))
\`\`\`

Key implementation choices that matter:

- **\`temperature=0\`** for reproducibility — you want the same output scored the same way across runs.
- **Force structured output** (\`response_format\` / JSON mode) so parsing never breaks.
- **Ask for reasoning *before* the score** — chain-of-thought, the G-Eval insight, measurably improves quality. Putting the score first and reasoning second wastes the reasoning.
- **Use a strong judge model.** A weak judge produces a weak rubric; the judge should be at least as capable as the system under test, ideally stronger.

Pre-built rubric-judge configurations for common tasks are catalogued in the [skills directory](/skills) if you would rather not start from a blank prompt.

## Step 4: Add a reference (when you have one)

Pure criteria-only judging works without any gold answer. But if you *do* have a reference — say, an expert-written ideal summary — feed it to the judge to anchor accuracy and completeness:

\`\`\`python
RUBRIC_WITH_REF = RUBRIC + "\\nUse the REFERENCE as the source of truth for Accuracy and Completeness."
# ...include REFERENCE: {reference} in the user message
\`\`\`

This is a hybrid: the criteria define *what* to measure, the reference defines the *correct content*. It tightens accuracy scoring considerably and reduces the judge's chance to hallucinate that a wrong answer is right.

## Step 5: Keep the judge honest

LLM judges are powerful but biased. Rubric scoring is more robust than open-ended scoring, but you still control for:

- **Verbosity bias** — judges reward longer answers. Anchor your levels to *content*, not length, and inspect whether high scores correlate with word count.
- **Self-preference bias** — a judge favors its own model family's outputs. Use a judge from a different family than the system under test.
- **Position / formatting bias** — judges over-reward confident tone and markdown. Tighten anchors to the substance you care about.
- **Drift** — the same judge model can score differently across API versions. Pin the model version and re-validate when it changes.
- **The fundamental check** — validate judge scores against human ratings on a sample. Compute agreement (e.g. correlation or exact-match rate). If agreement is low, fix the rubric or change the judge before trusting it at scale.

A practical loop: score 30–50 examples by hand, run the judge on the same set, compare. Disagreements almost always reveal a vague rubric level — sharpen the anchor and re-test. Treat the rubric as code you iterate on, not a one-shot artifact.

## End-to-end workflow

1. Define 3–5 anchored, weighted criteria for your task.
2. Build a judge prompt that requests reasoning-then-scores in strict JSON, at \`temperature=0\`.
3. Validate the judge against a hand-labeled sample; refine anchors until agreement is acceptable.
4. Run the judge across your full eval set; aggregate weighted scores and keep per-criterion breakdowns.
5. Wire it into CI so prompt or model changes are graded automatically and regressions on any criterion fail the build.
6. Periodically re-validate against humans and re-pin the judge model version.

The per-criterion breakdown is the payoff — it does not just tell you the model got worse, it tells you *which dimension* got worse, which is what you act on.

## Frequently Asked Questions

### What is rubric-based LLM evaluation?
Rubric-based LLM evaluation scores an output against explicit criteria — such as accuracy, completeness, tone, and safety — rather than comparing it to a single reference answer. An LLM judge reads the output and assigns a score per criterion, often with reasoning. It is the standard approach for open-ended tasks like summaries, chatbot replies, and RAG answers where no single correct text exists.

### What is G-Eval and how does it work?
G-Eval is a framework for using an LLM as a rubric judge that improves reliability with two techniques: chain-of-thought evaluation steps, where the model reasons through the criteria before scoring, and probability-weighted scoring, where the score is the expected value over the probabilities the model assigns to each possible rating. It correlates with human judgment substantially better than lexical metrics like BLEU and ROUGE and is implemented in libraries such as DeepEval.

### How do I design a good evaluation rubric?
Use three to five criteria that are specific, independent, and anchored with a description of what each score level means in behavioral terms. Weight the criteria by your real priorities — if accuracy matters far more than tone, do not average them equally. Avoid vague catch-alls like "quality" and overlapping criteria that double-count the same dimension.

### Should I use a reference answer with rubric scoring?
You do not need one — criteria-only judging works without any gold answer, which is its main advantage for open-ended tasks. But if you have an expert-written reference, feed it to the judge to anchor the accuracy and completeness criteria. This hybrid tightens scoring and reduces the chance the judge marks a wrong answer as correct.

### How do I prevent bias in an LLM judge?
Control for verbosity bias by anchoring score levels to content rather than length, avoid self-preference by using a judge from a different model family than the system under test, and tighten rubric anchors so the judge does not over-reward confident tone or formatting. Most importantly, validate the judge's scores against human ratings on a hand-labeled sample and refine the rubric until agreement is acceptable before trusting it at scale.

### Is rubric scoring better than pairwise comparison?
They solve different problems. Rubric scoring gives an absolute, per-criterion breakdown that tells you exactly which dimension is weak, which is ideal for diagnosing and gating individual outputs. Pairwise comparison gives a more reliable relative ranking between systems but no absolute diagnosis. Many teams use both — rubric scores for regression gates and pairwise comparisons for model selection.
`,
};
