import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Offline vs Online LLM Evaluation: When to Use Each (2026)",
  description: "Offline vs online LLM evaluation compared for 2026: batch dataset testing vs production monitoring, latency, cost, ground truth, and a hybrid workflow.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Offline vs Online LLM Evaluation: When to Use Each (2026)

**Offline LLM evaluation** runs a fixed dataset of inputs through your model or agent in a controlled batch and scores the outputs against known expectations — you use it before you ship, to answer "did this change make things better or worse?" **Online (production) evaluation** scores real user traffic as it happens or shortly after, with no ground-truth labels available up front — you use it after you ship, to catch quality drift, edge cases, and failures the test set never anticipated. They are complementary, not competing: offline gates releases, online watches live behavior. Most mature LLM teams in 2026 run both.

This guide breaks down the two modes, when each wins, the metrics that fit each, and a hybrid loop that turns production signal back into offline test cases.

## The core difference: controlled set vs live traffic

Offline evaluation is reproducible. You hold the inputs constant — a curated dataset of prompts, conversations, or agent tasks — and re-run them whenever the prompt, model, retrieval pipeline, or tool definitions change. Because the inputs are fixed, two runs are directly comparable: you can diff scores row by row and attribute a regression to a specific change.

Online evaluation is observational. The inputs are whatever your users actually sent, which means you cannot control or replay them the same way, and you usually have no labeled "correct" answer. Instead you score live outputs with proxies — an LLM-as-judge rubric, heuristic checks, user feedback signals (thumbs up/down, retries, abandonment) — and watch aggregate trends over time.

| Dimension | Offline evaluation | Online evaluation |
|---|---|---|
| **When it runs** | Pre-deployment (CI, pre-merge, pre-release) | Post-deployment (live or near-real-time) |
| **Inputs** | Fixed, curated dataset | Real production traffic |
| **Ground truth** | Often available (labeled expectations) | Usually absent (use proxies) |
| **Reproducibility** | High — re-run the same set | Low — traffic is never identical |
| **Primary question** | "Is the new version better than the old?" | "Is the live system degrading?" |
| **Coverage** | Only what you thought to test | Everything users actually do |
| **Latency sensitivity** | Low — batch, run overnight if needed | High — must not slow user responses |
| **Cost driver** | Dataset size × runs per change | Traffic volume × sampling rate |
| **Catches** | Known failure modes, regressions | Unknown unknowns, drift, rare edge cases |

The single most useful way to remember the split: **offline tells you whether a change is safe to ship; online tells you whether what you shipped is still working.**

## When to pick offline evaluation

Reach for offline evaluation when you control the variable under test and want a clean before/after comparison:

- **Prompt and model changes.** You rewrote a system prompt, swapped models (say from a Sonnet-tier to an Opus-tier model), or upgraded a model version. Run both against the same dataset and compare per-row scores.
- **Regression gating in CI.** Wire an evaluation suite into your pipeline so a pull request that drops accuracy below a threshold fails the build, exactly like a unit test. This is the LLM analog of the [test doubles and assertions](/blog) you already use in conventional testing.
- **Retrieval / RAG pipeline tuning.** Changing chunk size, embedding model, or reranking is invisible in production until it hurts — offline lets you measure retrieval precision and answer faithfulness deterministically.
- **Agent task suites.** For multi-step agents, a fixed set of tasks with success criteria tells you whether a code change improved or broke trajectories before users see it.

Offline is where ground truth lives. If you have labeled expected outputs — gold answers, reference summaries, expected tool calls — offline is the only place you can use them at scale without humans in the live path.

A minimal offline harness looks like this in Python:

\`\`\`python
# offline_eval.py — run a fixed dataset, score, fail on regression
import json

DATASET = [
    {"input": "Refund window for damaged items?", "expected_contains": "30 days"},
    {"input": "Do you ship to Canada?", "expected_contains": "yes"},
    # ... dozens to thousands of cases
]

def run_model(prompt: str) -> str:
    # call your LLM / agent under test
    ...

def score(output: str, case: dict) -> float:
    return 1.0 if case["expected_contains"].lower() in output.lower() else 0.0

results = []
for case in DATASET:
    out = run_model(case["input"])
    results.append(score(out, case))

accuracy = sum(results) / len(results)
print(json.dumps({"accuracy": accuracy, "n": len(results)}))

# Gate: fail CI if below baseline
BASELINE = 0.92
assert accuracy >= BASELINE, f"Regression: {accuracy:.3f} < {BASELINE}"
\`\`\`

The \`assert\` at the end is what makes this a *gate* rather than a report. In a real suite you would persist each run so you can diff experiments, and you would use semantic scorers (embedding similarity, LLM-as-judge) instead of substring matching for open-ended outputs.

## When to pick online evaluation

Reach for online evaluation when the thing you care about only shows up in production:

- **Quality drift.** User behavior, input distributions, and even upstream data sources shift over time. A model that scored 92% offline three months ago may be quietly handling a different mix of queries now.
- **Unknown unknowns.** Your dataset can only contain cases you imagined. Production surfaces the prompt injection attempt, the malformed input, the question in a language you did not test, the user who pastes 40 KB of context.
- **Real outcome signals.** Thumbs-down rates, conversation length, retry/regenerate clicks, escalation to a human, and task-abandonment are real quality signals you cannot synthesize offline.
- **Guardrail and safety monitoring.** Continuously sampling live outputs for policy violations, PII leakage, or hallucinated facts is inherently an online job.

Online evaluation has one hard constraint that offline does not: **it must not degrade the user experience.** You cannot block a user's response while an LLM judge deliberates. The standard pattern is asynchronous, sampled scoring — log the request/response, then run scorers out of band on a sample of traffic:

\`\`\`python
# online_eval.py — async, sampled scoring of live traffic
import random

SAMPLE_RATE = 0.05  # score 5% of traffic

def handle_request(user_input: str) -> str:
    output = run_model(user_input)        # serve the user immediately
    if random.random() < SAMPLE_RATE:
        enqueue_for_scoring(user_input, output)  # non-blocking: queue, return now
    return output

# Worker (separate process) drains the queue and applies scorers
def scoring_worker(item):
    judge_score = llm_judge(item["input"], item["output"])  # rubric-based
    heuristic = contains_pii(item["output"])
    record_metric("quality.judge", judge_score)
    record_metric("safety.pii_flag", heuristic)
\`\`\`

The two non-negotiables: scoring runs **off the request path** (the user already has their answer) and runs on a **sample** (scoring 100% of high-volume traffic with an LLM judge gets expensive fast). Start at 1–5% and raise the rate for high-risk flows.

## Metrics: ground truth vs proxies

The metrics differ because the information available differs.

**Offline metrics** can lean on references when you have them:
- Exact match / contains for closed-form answers
- Embedding (semantic) similarity to a reference answer
- Task success rate against explicit success criteria
- Retrieval precision/recall and answer faithfulness for RAG
- LLM-as-judge with a rubric when there is no single right answer

**Online metrics** mostly use reference-free proxies:
- LLM-as-judge applied to live outputs (no gold answer needed — the judge scores against a rubric, not a reference)
- User feedback: explicit (ratings) and implicit (retries, abandonment, session length)
- Heuristic guardrails: PII detection, profanity, format validity, schema conformance
- Operational signals: latency percentiles, token cost, error rates, refusal rates

A subtle but important point: **LLM-as-judge works in both modes**, which is why teams often write a rubric once and run it both offline (against the dataset) and online (against sampled traffic). That shared scorer is what makes a hybrid loop practical.

## The hybrid loop: production signal feeds the test set

Offline and online are strongest when wired together. The loop that high-functioning teams run in 2026:

1. **Offline gate.** Every prompt/model/pipeline change must clear the offline suite in CI before merge.
2. **Online monitor.** Sampled production scoring runs continuously, alerting on score drops, rising thumbs-down, or guardrail flags.
3. **Mine failures.** When online surfaces a new failure mode — a category of question the model botches, a prompt-injection pattern, a hallucination trigger — capture those real examples.
4. **Promote to the dataset.** Label the captured cases and add them to the offline golden dataset, so the regression can never silently return.
5. **Re-baseline.** The expanded offline suite now guards the newly discovered edge case on every future change.

This is the same virtuous cycle as turning a production bug into a regression test — except the "bug" is a quality failure caught by a scorer rather than a stack trace. Over time your offline dataset stops being a guess about what users do and becomes a distilled record of what they actually do and where you actually fail. You can compare evaluation tooling on our [tools comparison hub](/compare) and browse runnable evaluation skills in the [skills directory](/skills).

## Practical defaults to start with

If you are standing this up from scratch:

- **Build the offline suite first.** You cannot safely iterate without a regression gate. Start with 30–50 hand-written cases covering your top user intents and expand from there.
- **Add online sampling second.** Begin at a low sample rate with a single LLM-judge rubric plus a couple of cheap heuristics (format validity, PII). Watch the trend before you tune thresholds.
- **Share scorers across both.** Write your quality rubric once and apply it in both modes so offline scores and online scores are on the same scale.
- **Treat cost as a first-class metric** in both modes — token spend per case offline, and token spend per scored request online. (See our dedicated guide on measuring LLM cost and latency.)

The wrong move is to pick one and skip the other. Offline-only teams ship confidently and then go blind in production; online-only teams see problems but cannot tell whether a fix actually fixed anything. Run both.

## Frequently Asked Questions

### Is online evaluation just A/B testing?

No, though they overlap. A/B testing compares two variants on a business metric (conversion, retention) with live traffic split between them. Online evaluation continuously scores the *quality* of outputs — via judges, heuristics, and feedback signals — regardless of whether you are running an experiment. You can use online evaluation scores as one of the metrics inside an A/B test, but online evaluation also runs steadily on your single production version to catch drift.

### Do I need ground-truth labels for online evaluation?

Generally no, and that is the point — production traffic rarely comes with correct answers attached. Online evaluation leans on reference-free signals: LLM-as-judge against a rubric, user feedback, and heuristic guardrails. If you do collect labels later (for example by having reviewers grade a sample), you can feed those labeled cases back into your offline dataset rather than using them live.

### How much production traffic should I sample for online evaluation?

Start low — 1% to 5% — especially if your scorers call an LLM judge, since cost scales with sampled volume. Raise the rate for high-risk or low-volume flows where you want near-complete coverage, and lower it for high-volume, low-risk paths. The goal is a statistically useful signal on quality trends without an evaluation bill that rivals your inference bill.

### Can the same LLM-as-judge rubric run offline and online?

Yes, and doing so is a best practice. Writing one rubric and applying it both against your fixed dataset (offline) and against sampled live outputs (online) keeps the two scores on the same scale, so a drop in the online judge score is directly comparable to your offline baseline. It also halves the maintenance — you tune one scorer, not two.

### Which should I build first if I have limited time?

Build the offline suite first. Without a regression gate you cannot iterate on prompts or models safely — every change is a gamble. Once offline gating is in place and you are shipping with confidence, add lightweight online sampling to catch the failure modes your dataset missed, then feed those back into the offline set.

### Does offline evaluation become outdated?

It can. A dataset assembled six months ago may no longer reflect how users phrase requests or what they ask about, which is exactly why the hybrid loop matters: mining production failures and promoting them into the offline set keeps it current. Periodically audit your dataset for staleness and prune cases that no longer represent real usage.
`,
};
