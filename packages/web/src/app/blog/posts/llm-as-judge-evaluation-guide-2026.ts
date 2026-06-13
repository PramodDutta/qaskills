import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM as a Judge: The Complete Evaluation Guide (2026)',
  description:
    'Learn LLM-as-a-judge evaluation with runnable Python: scoring rubrics, G-Eval, pairwise comparison, judge-bias mitigation, and DeepEval GEval.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# LLM as a Judge: The Complete Evaluation Guide (2026)

LLM as a judge has become the default way to evaluate the open-ended outputs of language models, RAG pipelines, and AI agents at scale. When the thing you are testing produces free-form text -- a summary, a chatbot reply, a generated code snippet, a RAG answer -- there is rarely a single correct string to assert against. Exact-match and BLEU-style metrics break down immediately. Human review is accurate but slow and expensive, and it does not run in your CI pipeline at 3 a.m. on every pull request. The practical middle ground is to use a capable LLM as the grader: you give a strong model a rubric, the input, and the candidate output, and you ask it to return a score and a justification.

This guide is a hands-on, code-first walkthrough of LLM-as-judge evaluation as practiced in 2026. We will build a direct scoring judge with a real rubric prompt, implement G-Eval style chain-of-thought scoring, run pairwise LLM evaluation between two model responses, and then confront the elephant in the room: LLM judge bias. Position bias, verbosity bias, self-preference bias, and rubric drift are real, measurable failure modes, and we will write code to detect and mitigate each one. Finally we will wire everything into DeepEval's GEval metric so your judges run as ordinary pytest tests. Every Python example uses current model identifiers -- Anthropic's \`claude-opus-4-8\` and \`claude-sonnet-4-6\`, plus a generic OpenAI model name -- and every snippet is runnable with minor key substitutions. By the end you will be able to stand up a reliable LLM evaluation judge, calibrate it against human labels, and trust the numbers it produces.

## What "LLM as a Judge" Actually Means

An LLM judge is a separate model invocation whose only job is to assess the quality of another model's output. The model under test (the "candidate" or "system under test") produces an answer. The judge model receives that answer along with the original input, any reference material, and a scoring rubric, and it returns a structured verdict -- typically a numeric score plus a textual reason. The judge never sees the ground-truth label as the answer; it reasons about quality the way a human grader would.

There are three dominant judging modes, and choosing the right one is the most important design decision you will make:

- **Direct scoring (pointwise):** the judge rates a single output on an absolute scale, e.g. 1 to 5 for relevance or a 0.0 to 1.0 faithfulness score. Best for tracking quality over time and gating CI.
- **Pairwise comparison:** the judge sees two outputs for the same input and picks the better one (or declares a tie). Best for comparing two models, two prompts, or two retrieval strategies. More robust than direct scoring because relative judgments are easier than absolute ones.
- **Reference-guided scoring:** the judge compares the candidate against a gold reference answer and scores agreement. Best when you have curated golden answers.

If you are building a broader evaluation strategy, this judge fits inside the layered approach we describe in our [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026) and complements the metric definitions in the [DeepEval metrics complete guide](/blog/deepeval-metrics-complete-guide-2026).

## Judge Methods Compared

The table below summarizes when to reach for each judging strategy.

| Method | What it returns | Best for | Bias exposure | Cost |
|---|---|---|---|---|
| Direct scoring (pointwise) | Absolute score (1-5 or 0-1) | CI gating, trend tracking | Verbosity, leniency | Low (1 call) |
| Pairwise comparison | Winner / tie | Model & prompt A/B tests | Position bias (strong) | Medium (1-2 calls) |
| Reference-guided | Agreement score vs gold | Datasets with golden answers | Reference leakage | Low (1 call) |
| G-Eval (CoT + form-filling) | Weighted CoT score | Nuanced criteria (coherence) | Lower, but slower | Medium |
| Ensemble of judges | Aggregated verdict | High-stakes evaluation | Reduced via averaging | High (N calls) |

## A Minimal Direct-Scoring Judge in Python

Let us start with the simplest useful judge: a relevance scorer using the Anthropic Python SDK. The pattern is always the same -- build a rubric prompt, call the judge model with a low temperature, and parse a structured JSON verdict.

\`\`\`python
import json
from anthropic import Anthropic

client = Anthropic()  # reads ANTHROPIC_API_KEY from env

JUDGE_MODEL = "claude-opus-4-8"

RELEVANCE_RUBRIC = """You are a strict, fair evaluation judge.
Score how well the RESPONSE answers the USER QUERY on a 1-5 scale.

Scoring rubric:
1 = Completely irrelevant or off-topic.
2 = Touches the topic but misses the user's actual question.
3 = Partially answers; important gaps remain.
4 = Answers the question well with minor omissions.
5 = Fully and accurately answers the question.

Judge only relevance and correctness, NOT writing style or length.
Return ONLY valid JSON: {"score": <int 1-5>, "reason": "<one sentence>"}"""


def judge_relevance(query: str, response: str) -> dict:
    message = client.messages.create(
        model=JUDGE_MODEL,
        max_tokens=300,
        temperature=0.0,
        system=RELEVANCE_RUBRIC,
        messages=[
            {
                "role": "user",
                "content": f"USER QUERY:\\n{query}\\n\\nRESPONSE:\\n{response}",
            }
        ],
    )
    raw = message.content[0].text.strip()
    verdict = json.loads(raw)
    verdict["normalized"] = (verdict["score"] - 1) / 4  # map 1-5 -> 0-1
    return verdict


if __name__ == "__main__":
    result = judge_relevance(
        query="What is the capital of Australia?",
        response="The capital of Australia is Canberra, not Sydney.",
    )
    print(result)  # {"score": 5, "reason": "...", "normalized": 1.0}
\`\`\`

Three design choices matter here. First, **temperature is 0.0** so the judge is as deterministic as possible -- you want repeatable scores, not creative ones. Second, the rubric explicitly tells the judge what to ignore ("NOT writing style or length") to suppress verbosity bias. Third, the judge returns a **reason**, which is non-negotiable: a score without a justification is impossible to debug or trust.

## The Same Judge with the OpenAI SDK

The pattern ports directly to other providers. Here is the identical judge using the OpenAI Python SDK with a generic current model name. Keeping a provider-agnostic judge interface lets you run an ensemble across vendors, which is one of the strongest bias-mitigation techniques.

\`\`\`python
import json
from openai import OpenAI

oai = OpenAI()  # reads OPENAI_API_KEY from env
OAI_JUDGE_MODEL = "gpt-current-large"  # use your provider's current model id


def judge_relevance_openai(query: str, response: str) -> dict:
    completion = oai.chat.completions.create(
        model=OAI_JUDGE_MODEL,
        temperature=0.0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": RELEVANCE_RUBRIC},
            {
                "role": "user",
                "content": f"USER QUERY:\\n{query}\\n\\nRESPONSE:\\n{response}",
            },
        ],
    )
    verdict = json.loads(completion.choices[0].message.content)
    verdict["normalized"] = (verdict["score"] - 1) / 4
    return verdict
\`\`\`

Note \`response_format={"type": "json_object"}\` which forces structured output and removes a whole class of parsing failures. When you build a cross-provider ensemble, average the normalized scores from two or three different judge models; disagreement between judges is itself a signal that a sample needs human review.

## Writing a Good Rubric Prompt

The rubric is where most LLM evaluation projects succeed or fail. A vague rubric produces noisy, uncalibrated scores. A good rubric has four properties: it defines each scale point concretely, it isolates a single dimension, it tells the judge what to ignore, and it demands a justification. Here is a reusable template you can adapt for any criterion.

\`\`\`python
RUBRIC_TEMPLATE = """You are an expert evaluation judge for {dimension}.

Definition of {dimension}: {definition}

Score the RESPONSE from 1 to 5 using these anchors:
1 - {anchor_1}
2 - {anchor_2}
3 - {anchor_3}
4 - {anchor_4}
5 - {anchor_5}

Rules:
- Evaluate ONLY {dimension}. Ignore: {ignore_list}.
- Penalize hallucinated facts not supported by the provided context.
- Be consistent: the same quality must always get the same score.

Output ONLY JSON: {{"score": <int>, "reason": "<=25 words"}}"""

faithfulness_rubric = RUBRIC_TEMPLATE.format(
    dimension="faithfulness",
    definition="whether every claim in the response is supported by the context",
    anchor_1="multiple unsupported or contradicted claims",
    anchor_2="one major unsupported claim",
    anchor_3="mostly supported, one minor unsupported detail",
    anchor_4="fully supported, phrasing slightly overreaches",
    anchor_5="every claim is directly grounded in the context",
    ignore_list="fluency, tone, length, formatting",
)
\`\`\`

Notice the doubled braces \`{{"score": ...}}\` -- inside a Python \`.format()\` call you escape literal braces by doubling them, otherwise \`format\` tries to interpret them as fields. For grounded criteria like faithfulness, also pass the retrieved context into the user message so the judge can check each claim. This is exactly the faithfulness signal covered in depth in our [RAGAS faithfulness and answer relevancy reference](/blog/ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026).

## G-Eval: Chain-of-Thought Scoring

G-Eval is a now-standard technique that improves judge reliability by asking the model to reason through explicit evaluation steps before producing a score -- a chain-of-thought form-filling paradigm. Instead of jumping straight to a number, the judge first generates or follows a sequence of evaluation steps, then fills in the score. This consistently correlates better with human judgments than naive direct scoring, especially for subtle criteria like coherence and helpfulness.

\`\`\`python
import json
import re
from anthropic import Anthropic

client = Anthropic()
JUDGE_MODEL = "claude-sonnet-4-6"

GEVAL_PROMPT = """You will evaluate the COHERENCE of a summary.

Coherence: the summary should be well-structured and well-organized,
building from sentence to sentence into a coherent body of information,
not just a heap of related facts.

Evaluation steps:
1. Read the SOURCE document carefully.
2. Read the SUMMARY and compare it to the source.
3. Assess whether the summary presents information in a logical order
   with clear transitions and no abrupt topic jumps.
4. Assign a coherence score from 1 (incoherent) to 5 (perfectly coherent).

First write your reasoning for each step. Then on the FINAL line output
exactly: SCORE: <int 1-5>"""


def g_eval_coherence(source: str, summary: str) -> dict:
    msg = client.messages.create(
        model=JUDGE_MODEL,
        max_tokens=800,
        temperature=0.0,
        system=GEVAL_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"SOURCE:\\n{source}\\n\\nSUMMARY:\\n{summary}",
            }
        ],
    )
    text = msg.content[0].text
    match = re.search(r"SCORE:\\s*([1-5])", text)
    score = int(match.group(1)) if match else None
    return {"score": score, "reasoning": text}
\`\`\`

The key difference from direct scoring is the explicit **evaluation steps** and the instruction to reason *before* emitting the score. A refinement of G-Eval weights the final score by the token probabilities of each candidate score, producing a smooth continuous value instead of a coarse integer; libraries like DeepEval implement this for you, which we cover below.

## Pairwise LLM Evaluation

Humans and models alike are far better at relative judgments than absolute ones. "Is this a 3 or a 4?" is hard; "Is A better than B?" is easy. Pairwise LLM evaluation exploits this. You show the judge two candidate responses for the same input and ask which is better. This is the backbone of model arenas and prompt A/B tests.

\`\`\`python
import json
from anthropic import Anthropic

client = Anthropic()
JUDGE_MODEL = "claude-opus-4-8"

PAIRWISE_PROMPT = """You are comparing two assistant responses to the same query.
Decide which response is better overall: more accurate, more relevant,
and more helpful. Length and style do not matter unless they affect clarity.

Output ONLY JSON: {"winner": "A" | "B" | "tie", "reason": "<one sentence>"}"""


def judge_pairwise(query: str, response_a: str, response_b: str) -> dict:
    user = (
        f"QUERY:\\n{query}\\n\\n"
        f"RESPONSE A:\\n{response_a}\\n\\n"
        f"RESPONSE B:\\n{response_b}"
    )
    msg = client.messages.create(
        model=JUDGE_MODEL,
        max_tokens=300,
        temperature=0.0,
        system=PAIRWISE_PROMPT,
        messages=[{"role": "user", "content": user}],
    )
    return json.loads(msg.content[0].text)
\`\`\`

This single call is convenient but dangerous, because it is wide open to position bias -- the judge often prefers whichever answer it sees first regardless of quality. The next section fixes that.

## LLM Judge Bias and How to Measure It

LLM judges are not neutral instruments. They carry systematic biases that, if unmeasured, silently corrupt your evaluation. The four you must care about:

| Bias | Symptom | Detection | Mitigation |
|---|---|---|---|
| Position bias | Prefers answer in slot A (or B) | Swap order, measure flip rate | Average both orderings |
| Verbosity bias | Prefers longer answers | Correlate score with length | Add "ignore length" to rubric; control length |
| Self-preference bias | Judge favors its own model family | Cross-judge with another vendor | Use a different judge model than the candidate |
| Leniency / drift | Scores creep up over time | Re-score a fixed gold set periodically | Anchor with calibration examples |

The single most important mitigation for pairwise judging is **position-bias swapping**: run the comparison twice, once with order (A, B) and once with (B, A), and only declare a winner if both orderings agree. Disagreement means the judge is position-biased on that sample and the result is a tie.

\`\`\`python
def judge_pairwise_debiased(query: str, resp_a: str, resp_b: str) -> dict:
    # First ordering: a in slot A, b in slot B
    v1 = judge_pairwise(query, resp_a, resp_b)
    # Second ordering: swap, so b is in slot A, a in slot B
    v2 = judge_pairwise(query, resp_b, resp_a)

    # Translate v2 back to original labels (its "A" is our b, its "B" is our a)
    v2_translated = {"A": "B", "B": "A", "tie": "tie"}[v2["winner"]]

    if v1["winner"] == v2_translated:
        return {"winner": v1["winner"], "consistent": True, "reason": v1["reason"]}
    # Judge flipped when order changed -> position bias -> call it a tie
    return {"winner": "tie", "consistent": False, "reason": "position-bias detected"}
\`\`\`

Tracking the **flip rate** across your whole evaluation set is a direct, quantitative measure of how much position bias your judge exhibits. A flip rate above roughly 20 percent means your raw pairwise numbers are not trustworthy and you should switch judge models or add more calibration.

## Detecting Verbosity Bias

Verbosity bias is sneaky: judges tend to reward longer answers even when the extra words add nothing. You can measure it directly by correlating judge scores with response length across your dataset.

\`\`\`python
from statistics import correlation


def measure_verbosity_bias(samples: list[dict]) -> float:
    """Each sample: {"score": int, "response": str}. Returns Pearson r."""
    lengths = [len(s["response"].split()) for s in samples]
    scores = [s["score"] for s in samples]
    r = correlation(lengths, scores)
    return r  # |r| > 0.3 suggests meaningful length-driven scoring


# Mitigation: when comparing two answers, normalize or truncate them to a
# similar length before judging, OR explicitly instruct the judge to ignore length.
\`\`\`

If the correlation is strong and positive, your judge is paying off length, not quality. The fix is partly in the rubric ("Ignore length") and partly procedural -- truncate both candidates to a comparable token budget before a pairwise comparison.

## Calibrating Against Human Labels

A judge is only useful if it agrees with humans. Before you trust a judge in CI, validate it against a small set of human-labeled examples and compute agreement. Cohen's kappa and simple accuracy are both useful.

\`\`\`python
def calibrate_judge(gold: list[dict], judge_fn) -> dict:
    """gold: [{"query":..., "response":..., "human_score": int}, ...]"""
    exact = 0
    within_one = 0
    for g in gold:
        v = judge_fn(g["query"], g["response"])
        diff = abs(v["score"] - g["human_score"])
        exact += diff == 0
        within_one += diff <= 1
    n = len(gold)
    return {
        "exact_agreement": exact / n,
        "within_one_agreement": within_one / n,
    }


# Rule of thumb: within_one_agreement >= 0.9 before you gate CI on this judge.
\`\`\`

Calibration is not a one-time event. Re-run it whenever you change the judge model, change the rubric, or change the model under test. Drift in any of those three invalidates the previous calibration.

## Using DeepEval's GEval Metric

You do not have to hand-roll all of this. DeepEval ships a production-grade \`GEval\` metric that implements the chain-of-thought form-filling approach, runs as a pytest test, and integrates with CI. You define the criteria in natural language and DeepEval handles the prompt construction, score extraction, and probability weighting.

\`\`\`python
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams


def test_answer_correctness():
    correctness = GEval(
        name="Correctness",
        criteria=(
            "Determine whether the actual output is factually correct "
            "and fully addresses the input, based on the expected output."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        model="gpt-current-large",  # the judge model DeepEval will use
        threshold=0.7,
    )

    case = LLMTestCase(
        input="Who wrote the novel 'Frankenstein'?",
        actual_output="Mary Shelley wrote Frankenstein, published in 1818.",
        expected_output="Mary Shelley",
    )
    assert_test(case, [correctness])
\`\`\`

Run it with \`deepeval test run test_correctness.py\` and it behaves like any other test in your suite -- green when the judge score clears the threshold, red otherwise. You can define a custom \`evaluation_steps\` list instead of free-form \`criteria\` for tighter control, which gives you the same explicit-steps benefit we built by hand in the G-Eval section. For a full tour of DeepEval's metric catalog, see the [DeepEval metrics complete guide](/blog/deepeval-metrics-complete-guide-2026), and if you prefer OpenAI's native harness, the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) covers the equivalent grader setup.

## A Custom Judge as a DeepEval Metric

When the built-in metrics do not fit, you can wrap any custom judge -- including the bias-mitigated pairwise judge from earlier -- as a DeepEval \`BaseMetric\`. This keeps your bespoke logic while still getting pytest integration and reporting.

\`\`\`python
from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase


class CustomRelevanceJudge(BaseMetric):
    def __init__(self, threshold: float = 0.75):
        self.threshold = threshold

    def measure(self, test_case: LLMTestCase) -> float:
        verdict = judge_relevance(test_case.input, test_case.actual_output)
        self.score = verdict["normalized"]
        self.reason = verdict["reason"]
        self.success = self.score >= self.threshold
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success

    @property
    def __name__(self):
        return "CustomRelevanceJudge"
\`\`\`

## Scoring Scale Reference

Keep your scales consistent across judges so dashboards and thresholds stay comparable. This reference table maps common scale points to a normalized 0-1 value and a typical CI gate.

| Raw score (1-5) | Normalized (0-1) | Meaning | CI gate |
|---|---|---|---|
| 1 | 0.00 | Unacceptable / wrong | Fail |
| 2 | 0.25 | Major problems | Fail |
| 3 | 0.50 | Borderline / incomplete | Warn |
| 4 | 0.75 | Good, minor gaps | Pass |
| 5 | 1.00 | Excellent / fully correct | Pass |

## Production Patterns and Cost Control

Running an LLM judge on every request in production is expensive, so most teams sample. Score 100 percent of traffic in CI against a fixed eval set, but in production score a random 1 to 5 percent sample plus 100 percent of flagged or low-confidence responses. Cache judge verdicts keyed on a hash of (input, output, rubric version) so identical re-runs are free. Always version your rubric: a rubric change is a measurement change, and comparing scores across rubric versions is meaningless. When a high-stakes decision rides on the score, escalate to a multi-judge ensemble and route disagreements to humans. These judges pair naturally with adversarial testing -- once you can score quality, you can also score how a model holds up under attack, which is exactly what we cover in the [prompt injection testing guide](/blog/prompt-injection-testing-guide-2026). Explore ready-made evaluation skills in the [QA skills directory](/skills) to drop these judges straight into your agent workflow.

## Frequently Asked Questions

### What is LLM as a judge?

LLM as a judge is an evaluation technique where a capable language model grades the output of another model. The judge receives the input, the candidate output, and a scoring rubric, then returns a numeric score and a justification. It scales open-ended evaluation that exact-match metrics and human review cannot handle cheaply.

### How accurate is LLM as a judge compared to human evaluation?

A well-calibrated LLM judge typically reaches 80 to 90 percent within-one-point agreement with human labels on clear rubrics, and even higher for pairwise comparisons. Accuracy depends heavily on rubric quality, judge model strength, and bias mitigation. Always validate a judge against a human-labeled gold set before trusting it in CI.

### What is G-Eval and how does it improve scoring?

G-Eval is an LLM-as-judge method that asks the model to reason through explicit evaluation steps before emitting a score, using a chain-of-thought form-filling approach. A refinement weights the final score by the token probabilities of each candidate score to produce a smooth continuous value. It correlates better with human judgment than naive direct scoring.

### What is pairwise LLM evaluation?

Pairwise LLM evaluation shows the judge two candidate outputs for the same input and asks which is better, or whether they tie. Relative judgments are easier and more reliable than absolute scores, making pairwise ideal for comparing two models, prompts, or retrieval strategies. It powers model arenas and prompt A/B tests.

### How do I reduce position bias in an LLM judge?

Run each pairwise comparison twice with the answer order swapped, and only declare a winner if both orderings agree; otherwise call it a tie. Track the flip rate across your dataset as a quantitative position-bias measure. A flip rate above roughly 20 percent means you should change judge models or add calibration.

### Is LLM judge bias a real problem?

Yes. Judges exhibit position bias (favoring the first option), verbosity bias (rewarding longer answers), self-preference bias (favoring their own model family), and leniency drift over time. Each is measurable: swap order to detect position bias, correlate score with length for verbosity, and cross-judge with another vendor to detect self-preference. Mitigate before trusting scores.

### Can I use DeepEval for LLM-as-judge evaluation?

Yes. DeepEval's GEval metric implements chain-of-thought form-filling scoring and runs as ordinary pytest tests with CI integration. You define criteria in natural language and DeepEval handles prompt construction, score extraction, and probability weighting. You can also wrap any custom judge as a BaseMetric to keep bespoke logic while gaining pytest reporting.

## Conclusion

LLM as a judge turns the unbounded problem of evaluating free-form model output into a tractable, automatable one. The recipe is consistent: write a concrete single-dimension rubric, run the judge at temperature zero, demand a justification with every score, and -- critically -- measure and mitigate bias before you trust the numbers. Direct scoring gates CI and tracks trends; pairwise comparison wins model and prompt A/B tests; G-Eval and DeepEval's GEval raise correlation with human judgment for subtle criteria. The discipline that separates a toy judge from a production one is calibration: validate against human labels, re-validate whenever the model or rubric changes, and escalate disagreements to people. Start with the minimal direct-scoring judge in this guide, add position-bias swapping for any pairwise comparison, wire it into DeepEval so it runs in your pipeline, and you will have a reliable LLM evaluation judge you can actually trust. From there, extend the same machinery to adversarial robustness with our [prompt injection testing guide](/blog/prompt-injection-testing-guide-2026) and browse plug-and-play evaluators in the [QA skills directory](/skills).
`,
};
