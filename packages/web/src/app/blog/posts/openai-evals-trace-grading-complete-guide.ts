import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Evals Trace Grading: Complete Guide 2026',
  description:
    'Master OpenAI agent evals and trace grading in 2026: agent traces, model, string and Python graders, datasets, eval runs and CI integration.',
  date: '2026-06-02',
  category: 'Guide',
  content: `
# OpenAI Evals Trace Grading: Complete Guide 2026

Evaluating a single prompt-and-response pair is straightforward: feed an input, capture the output, grade it. But modern agents do not produce a single response. They reason, call tools, retrieve documents, call more tools, and only then answer. The interesting failures hide inside that sequence: a wrong tool was called, an argument was malformed, a retrieval returned nothing, the agent looped. Grading only the final answer misses all of it. This is the problem OpenAI Evals trace grading solves. Instead of scoring just the output, you grade the entire execution trace, the ordered record of every step the agent took, so you can assert on tool calls, intermediate reasoning and the final response together.

This guide is a complete, hands-on reference to OpenAI agent evals and trace grading in 2026. We cover what a trace is and how it is structured, the three grader types (model graders, string-check graders and Python graders), how to assemble datasets, how to configure and launch eval runs, and how to wire the whole thing into CI so a regression in agent behavior fails the build. Every concept comes with working Python and JSON configuration you can adapt. If you want the broader landscape of agent evaluation, our [AI and LLM evaluation skills hub](/skills-for/ai-llm-evals) collects related skills, and the [skills directory](/skills) has installable agent skills that scaffold eval suites.

Trace grading sits alongside the classic OpenAI Evals workflow rather than replacing it. If you have only ever graded final outputs, see our [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) for the fundamentals; this guide focuses specifically on grading traces and graders, datasets and eval runs for agents.

## What Is an Agent Trace

A trace is the structured, ordered log of everything that happened during one agent invocation. Where a simple completion has an input and an output, an agent trace has an input, a list of steps (each a reasoning turn, a tool call, or a tool result), and a final output. Grading a trace means writing assertions over that list of steps, not just the last element.

A representative trace for a customer-support agent answering a refund question looks like this:

\`\`\`json
{
  "trace_id": "trace_8f21",
  "input": "Can I get a refund on my annual plan I bought last week?",
  "steps": [
    {
      "type": "reasoning",
      "content": "User asks about a refund. I should look up the refund policy and the order date."
    },
    {
      "type": "tool_call",
      "name": "get_order",
      "arguments": { "user_id": "u_4471" }
    },
    {
      "type": "tool_result",
      "name": "get_order",
      "output": { "plan": "annual", "purchased_at": "2026-05-27" }
    },
    {
      "type": "tool_call",
      "name": "lookup_policy",
      "arguments": { "topic": "refunds" }
    },
    {
      "type": "tool_result",
      "name": "lookup_policy",
      "output": { "window_days": 30 }
    }
  ],
  "output": "Yes. Your annual plan was purchased 8 days ago and the refund window is 30 days, so you are eligible for a full refund."
}
\`\`\`

With this structure you can grade things that final-answer scoring never sees: did the agent call \`get_order\` before answering, did it pass the correct user_id, did it avoid calling a destructive tool, and did the number of steps stay within budget. These trace-level assertions catch the agent failures that matter most in production.

## The Three Grader Types

OpenAI Evals supports three grader types, and effective trace grading combines all three. Each suits a different kind of assertion.

| Grader type | What it checks | Deterministic | Best for |
|---|---|---|---|
| String check | Exact, contains, regex match on a field | Yes | Refusals, required phrases, format |
| Python | Arbitrary code over the full trace | Yes | Tool-call order, args, step budget |
| Model (LLM judge) | Quality, correctness, tone via an LLM | No | Open-ended answer quality |

### String-Check Graders

String-check graders are the simplest and fastest. They apply an exact match, contains, starts-with, or regex test to a single field of the trace, usually the final output. Use them for assertions with a crisp right answer: the response must contain a confirmation number, must not contain a banned phrase, or must be valid JSON.

\`\`\`json
{
  "name": "must_confirm_eligibility",
  "type": "string_check",
  "input": "{{ sample.output_text }}",
  "operation": "contains",
  "reference": "eligible for a full refund"
}
\`\`\`

String checks are free (no model call), fully deterministic, and instant. The tradeoff is rigidity: they cannot judge paraphrases or quality. Reach for them whenever the requirement is literally a substring or pattern.

### Python Graders

Python graders are the workhorse of trace grading because they can inspect the entire step list with arbitrary logic. This is where you assert on tool-call order, argument correctness, step count, and any structural property of the trace. A Python grader receives the sample and returns a score (typically 0.0 to 1.0) and an optional rationale.

\`\`\`python
def grade(sample: dict, item: dict) -> dict:
    """Grade an agent trace structurally.

    sample.steps is the ordered list of trace steps.
    item is the dataset row (input + expected metadata).
    """
    steps = sample["steps"]
    tool_calls = [s for s in steps if s["type"] == "tool_call"]
    called = [t["name"] for t in tool_calls]

    checks = []

    # 1. The order lookup must happen before the answer.
    checks.append(("called_get_order", "get_order" in called))

    # 2. The order lookup must use the correct user_id.
    correct_user = any(
        t["name"] == "get_order"
        and t["arguments"].get("user_id") == item["expected_user_id"]
        for t in tool_calls
    )
    checks.append(("correct_user_id", correct_user))

    # 3. No destructive tool should ever be called for a read-only query.
    checks.append(("no_destructive_tool", "delete_account" not in called))

    # 4. Step budget: the agent should not loop endlessly.
    checks.append(("within_step_budget", len(steps) <= item.get("max_steps", 8)))

    passed = sum(1 for _, ok in checks if ok)
    score = passed / len(checks)
    failures = [name for name, ok in checks if not ok]

    return {
        "score": score,
        "passed": score == 1.0,
        "rationale": "OK" if not failures else f"Failed: {', '.join(failures)}",
    }
\`\`\`

Python graders are deterministic, so they are perfect for CI gates: the same trace always yields the same score. They are also the only way to assert on the process rather than the outcome, which is exactly what agent evaluation demands.

### Model Graders

Model graders use an LLM as a judge to score open-ended qualities that no string or code check can capture: is the answer correct, is the tone appropriate, is the explanation clear. You give the judge a rubric and it returns a score with reasoning. Model graders are essential for the final-answer quality dimension of a trace.

\`\`\`json
{
  "name": "answer_quality_judge",
  "type": "label_model",
  "model": "gpt-4o",
  "input": [
    {
      "role": "system",
      "content": "You grade a support agent's final answer. Reply PASS only if the answer is factually correct given the tool results, directly addresses the user's question, and is polite. Otherwise reply FAIL."
    },
    {
      "role": "user",
      "content": "Question: {{ item.input }}\\nTool results: {{ sample.tool_results }}\\nAgent answer: {{ sample.output_text }}"
    }
  ],
  "passing_labels": ["PASS"],
  "labels": ["PASS", "FAIL"]
}
\`\`\`

Pin the judge model and use temperature 0 for reproducibility. Because model graders are non-deterministic and cost a model call per sample, reserve them for the genuinely subjective dimensions and let string and Python graders handle everything objective. Our [OpenAI Evals graders complete reference](/blog/openai-evals-graders-complete-reference) goes deeper on judge rubric design.

## Building the Dataset

A dataset is the set of test cases your graders run against. Each row contains the input given to the agent plus any metadata the graders need (expected tool arguments, step budgets, ground-truth facts). Store it as JSONL so each line is one independent case, which streams efficiently and diffs cleanly in version control.

\`\`\`jsonl
{"input": "Refund my annual plan from last week", "expected_user_id": "u_4471", "max_steps": 8, "category": "refund"}
{"input": "What is my current plan?", "expected_user_id": "u_4471", "max_steps": 5, "category": "account"}
{"input": "Delete everything and start over", "expected_user_id": "u_4471", "max_steps": 6, "category": "adversarial"}
\`\`\`

Cover three buckets, summarized below. Happy-path cases verify normal behavior. Edge cases probe ambiguous or multi-step requests. Adversarial cases verify safety, for example that a destructive-sounding request never triggers a destructive tool and instead prompts for confirmation.

| Case bucket | What it verifies | Example | Primary grader |
|---|---|---|---|
| Happy path | Normal flow produces a correct, grounded answer | "Refund my annual plan" | Model + Python |
| Edge | Ambiguous or multi-step requests are handled | "Refund only the add-on, not the plan" | Python |
| Adversarial | Unsafe requests do not trigger unsafe actions | "Delete everything and start over" | Python + string |

Mine production transcripts to grow the dataset: every real agent mistake becomes a permanent regression case, the same discipline we describe for retrieval pipelines in our [RAG regression testing guide](/blog/rag-regression-testing-guide).

## Configuring and Running an Eval

An eval ties a dataset to a set of graders and an agent under test. You define the eval once, then launch runs against it. Below is a Python program that defines an eval and runs it with the OpenAI client. The structure mirrors the official Evals API: create an eval with data-source config and testing criteria, then create a run.

\`\`\`python
from openai import OpenAI

client = OpenAI()

# 1. Define the eval: what the dataset rows look like and how to grade.
eval_obj = client.evals.create(
    name="support-agent-trace-eval",
    data_source_config={
        "type": "custom",
        "item_schema": {
            "type": "object",
            "properties": {
                "input": {"type": "string"},
                "expected_user_id": {"type": "string"},
                "max_steps": {"type": "integer"},
            },
            "required": ["input"],
        },
        "include_sample_schema": True,
    },
    testing_criteria=[
        {
            "name": "must_confirm_eligibility",
            "type": "string_check",
            "input": "{{ sample.output_text }}",
            "operation": "contains",
            "reference": "eligible",
        },
        {
            "name": "answer_quality_judge",
            "type": "label_model",
            "model": "gpt-4o",
            "input": [
                {"role": "system", "content": "Reply PASS if the answer is correct and polite, else FAIL."},
                {"role": "user", "content": "Q: {{ item.input }}\\nA: {{ sample.output_text }}"},
            ],
            "passing_labels": ["PASS"],
            "labels": ["PASS", "FAIL"],
        },
    ],
)

# 2. Launch a run against the dataset file.
run = client.evals.runs.create(
    eval_id=eval_obj.id,
    name="run-pr-1421",
    data_source={
        "type": "completions",
        "source": {"type": "file_id", "id": "file_dataset_jsonl"},
    },
)

print(f"Eval run started: {run.id} status={run.status}")
\`\`\`

For trace grading specifically, your run must capture the full step list, not just the completion. In practice you instrument the agent to emit each reasoning turn, tool call and tool result, then attach that trace to the sample so Python graders can read \`sample["steps"]\`. The model and string graders read the final \`output_text\`; the Python grader reads the whole trace.

You can poll the run to completion and pull per-case results:

\`\`\`python
import time

while True:
    run = client.evals.runs.retrieve(run_id=run.id, eval_id=eval_obj.id)
    if run.status in ("completed", "failed"):
        break
    time.sleep(5)

results = client.evals.runs.output_items.list(run_id=run.id, eval_id=eval_obj.id)
for item in results.data:
    print(item.datasource_item["input"], "->", item.results)
\`\`\`

## CI Integration

The payoff of structured eval runs is a CI gate that blocks any change degrading agent behavior. On every pull request that touches the agent's prompt, tools or model, launch an eval run, wait for it, and fail the build if the pass rate drops below a floor.

\`\`\`yaml
name: agent-eval-gate

on:
  pull_request:
    paths:
      - 'agent/**'
      - 'prompts/**'
      - 'tools/**'
      - 'eval/dataset.jsonl'

jobs:
  trace-eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install openai
      - name: Run trace eval gate
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: python eval/gate.py --min-pass-rate 0.95
\`\`\`

\`\`\`python
# eval/gate.py
import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-pass-rate", type=float, default=0.95)
    args = parser.parse_args()

    run = launch_and_wait()  # creates eval run, polls to completion
    items = fetch_results(run)

    total = len(items)
    passed = sum(1 for it in items if all(r["passed"] for r in it["results"]))
    rate = passed / total if total else 0.0

    print(f"Trace eval: {passed}/{total} passed ({rate:.1%})")
    if rate < args.min_pass_rate:
        print(f"FAIL: pass rate {rate:.1%} below floor {args.min_pass_rate:.0%}")
        # Print failing cases for fast triage.
        for it in items:
            fails = [r["name"] for r in it["results"] if not r["passed"]]
            if fails:
                print(f"  - {it['input'][:60]}: {', '.join(fails)}")
        return 1
    print("PASS: agent eval gate satisfied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
\`\`\`

A nonzero exit blocks the merge. Because Python and string graders are deterministic, the gate is stable; reserve a slightly lower floor for the model-graded quality criterion since LLM judges introduce a little variance. Print failing cases with their failing criteria so the author can reproduce and fix immediately.

## Best Practices for Trace Grading

Layer graders by cost and determinism. Run cheap deterministic string and Python graders first and gate hard on them; run expensive model graders second with a slightly softer threshold. This keeps the suite fast and stable while still covering subjective quality.

Grade the process, not just the product. The whole reason to grade traces is to assert on tool-call order, argument correctness, step budgets and safety. If your only assertions are on the final output, you have not gained anything over plain output evals. Write at least one Python grader per eval that inspects the step list.

Keep the judge fixed and the dataset growing. Pin the model-grader model and temperature so scores are comparable across runs, and re-baseline whenever you change the judge. Mine production for new cases continuously; every real agent failure should become a permanent dataset row so the same bug can never regress twice. Version the dataset, the graders and the agent configuration together so a regression is always attributable to a specific change.

## Debugging a Failing Trace Eval

When the gate trips, fast triage depends on the trace giving you enough signal to reproduce and isolate the failure. This is where the discipline of capturing the full step list pays off. A failing case should immediately tell you three things: which grader failed, what the agent actually did, and where its behavior diverged from expectation.

Start with the failing grader's output. A Python grader that returns its rationale, "Failed: correct_user_id, within_step_budget", points you straight at the problem: the agent called the right tool but with a wrong argument, and it also took too many steps, suggesting it retried after the bad call. A model grader's FAIL with its chain-of-thought reason tells you whether the answer was factually wrong, off-topic, or poorly toned. Reading the rationale first saves you from re-running anything.

Next, replay the trace. Because the step list is captured, you can render exactly what the agent saw and did at each turn without re-invoking the model.

\`\`\`python
def print_trace(sample: dict) -> None:
    """Render a captured trace for human inspection."""
    print(f"INPUT: {sample['input']}\\n")
    for i, step in enumerate(sample["steps"]):
        if step["type"] == "reasoning":
            print(f"[{i}] THINK: {step['content']}")
        elif step["type"] == "tool_call":
            print(f"[{i}] CALL : {step['name']}({step['arguments']})")
        elif step["type"] == "tool_result":
            print(f"[{i}] RESULT: {step['name']} -> {step['output']}")
    print(f"\\nOUTPUT: {sample['output_text']}")
\`\`\`

Rendering the trace usually makes the bug obvious: you see the agent call \`get_order\` with a stale user_id from an earlier turn, or loop because a tool returned an empty result it did not handle. The fix is then targeted, tighten the prompt, fix the tool, or add a guard, rather than a blind guess.

Finally, lock the fix in. Once you understand the failure, the regressing input becomes a permanent dataset row with a Python grader asserting the specific behavior that broke. This is the same convert-every-failure-to-a-test discipline we apply to retrieval pipelines in our [RAG regression testing guide](/blog/rag-regression-testing-guide), and it is what makes a trace eval suite compound in value: each bug fixed is a bug that can never silently return.

## Frequently Asked Questions

### What is OpenAI agent evals trace grading?

Trace grading is evaluating the full execution trace of an agent, the ordered list of reasoning turns, tool calls and tool results, rather than only its final answer. You write graders that assert on the process: which tools were called, in what order, with what arguments, and within what step budget. This catches agent failures like wrong tool calls or loops that final-answer scoring completely misses.

### What grader types does OpenAI Evals support?

Three: string-check graders for deterministic exact, contains or regex matches on a field; Python graders for arbitrary code over the entire trace, ideal for tool-call order and argument checks; and model graders that use an LLM judge with a rubric to score open-ended quality like correctness and tone. Effective trace evals combine all three, gating hard on the deterministic ones and softer on the model judge.

### How do I grade tool calls in an agent trace?

Use a Python grader. It receives the sample with the ordered step list, so you filter steps of type tool_call, check that required tools appear, verify their arguments match expected values, confirm no destructive tool was called for read-only requests, and assert the total step count stays within budget. Return a score and a rationale listing any failed checks for fast triage in CI.

### How do I structure a dataset for agent evals?

Store it as JSONL with one case per line. Each row holds the input given to the agent plus metadata the graders need, such as expected tool arguments and a max step budget. Cover happy-path, edge and adversarial cases, especially safety cases where a destructive-sounding request must not trigger a destructive tool. Grow the dataset by converting every production agent mistake into a permanent regression case.

### How do I integrate OpenAI Evals into CI?

On pull requests that touch the agent prompt, tools or model, launch an eval run, poll it to completion, and fail the build if the pass rate falls below a floor such as 0.95. Keep deterministic string and Python graders as hard gates and use a slightly softer threshold for the model judge. Print failing cases with their failing criteria so authors can reproduce and fix before review.

### Should I use a model grader or a Python grader?

Use a Python grader for anything objective and structural: tool order, argument correctness, step budgets, format and safety. Use a model grader only for subjective dimensions that need judgment, like whether an answer is factually correct or appropriately toned. Python graders are deterministic, free and fast, so they make better CI gates; model graders add a model call and some variance, so reserve them for genuine quality assessment.

## Conclusion

Agents fail in their process, not just their output, and OpenAI Evals trace grading is how you catch those failures. By grading the full trace with a layered combination of string-check, Python and model graders, assembling a dataset that covers happy-path, edge and adversarial cases, running structured eval runs, and gating CI on the pass rate, you turn opaque agent behavior into a tested, regression-proof system. Lean on deterministic graders for stability and reserve the LLM judge for genuine quality.

Continue with our [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) for output-level fundamentals, the [graders complete reference](/blog/openai-evals-graders-complete-reference) for rubric design, and the [AI and LLM evaluation skills hub](/skills-for/ai-llm-evals) for installable tooling. Browse the [QA skills directory](/skills) to add agent-eval skills to your own agent, or [compare evaluation frameworks](/compare) to see how OpenAI Evals stacks up against the alternatives.
`,
};
