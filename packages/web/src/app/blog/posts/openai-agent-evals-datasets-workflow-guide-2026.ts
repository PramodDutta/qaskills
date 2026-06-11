import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Agent Evals: Datasets + Traces Workflow Guide 2026',
  description:
    'End-to-end OpenAI agent evals workflow: build JSONL datasets, capture traces, attach graders, run evals on an agent, and read the report. Runnable SDK code.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# OpenAI Agent Evals: Datasets and Traces Workflow Guide 2026

Evaluating a single prompt is easy. Evaluating an agent is hard, because an agent is not one call but a whole loop: it reads input, decides to call a tool, reads the tool result, maybe calls another tool, and eventually produces a final answer. To know whether an agent works, you have to measure not just the final output but the path it took to get there. That path is the **trace**, and learning to capture, grade, and iterate on traces is the core skill of agent evaluation. This guide walks the complete OpenAI agent evals workflow end to end: building a dataset, capturing agent traces, grading traces and final outputs, attaching graders to dataset items, running evals against an agent, reading the report, and iterating until quality holds.

The workflow has a natural shape. First you build a **dataset**: a JSONL file where each line is a test case with an input and, ideally, an ideal output to grade against. Then you run your agent over those inputs and capture **traces**, the full record of every model call and tool call the agent made. Next you attach **graders** to your dataset items so each test case knows how it should be judged, both on the final answer and on the trace itself (did it call the right tool, in the right order, without unnecessary loops?). You then launch an **eval run** that executes the agent across the dataset and scores everything. Finally you read the **eval report**, find the failing items, fix your agent, and rerun. This guide gives you runnable Python using the \\\`openai\\\` SDK plus real JSONL dataset samples for every stage. If you are also evaluating retrieval quality inside your agent, pair this with our [TruLens RAG triad guide](/blog/trulens-rag-triad-groundedness-context-relevance-2026) and the [DeepEval RAG evaluation metrics reference](/blog/deepeval-rag-evaluation-metrics-reference-2026).

## The Agent Eval Workflow at a Glance

Here is the full pipeline. Each stage produces the input for the next, and the loop closes when you rerun after fixing failures.

| Stage | Goal | Primary artifact | Tooling |
|---|---|---|---|
| 1. Build dataset | Define test cases with inputs and ideal outputs | JSONL file | Text editor / generation script |
| 2. Run agent + capture traces | Execute the agent, record every step | Trace per item | OpenAI SDK, tracing |
| 3. Define graders | Decide how each item is judged | Grader configs | Evals API testing_criteria |
| 4. Attach graders to items | Bind graders to dataset rows | Eval definition | client.evals.create |
| 5. Run the eval | Execute agent across dataset, score all | Eval run | client.evals.runs.create |
| 6. Read the report | Find failures, inspect traces | Output items, metrics | client.evals.runs.output_items |
| 7. Iterate | Fix the agent, rerun | New eval run | Repeat 5-6 |

Keep this table next to you as you work. The single most common mistake in agent evaluation is grading only the final output and ignoring the trace; a fragile agent can get the right answer for the wrong reasons, and only trace grading catches that.

## Installing the SDK and Setup

Everything below uses the official \\\`openai\\\` Python SDK.

\\\`\\\`\\\`bash
pip install -U openai
export OPENAI_API_KEY="sk-..."
\\\`\\\`\\\`

\\\`\\\`\\\`python
from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY from the environment
print("SDK ready:", client.models.list().data[0].id)
\\\`\\\`\\\`

If your agent uses reusable tools or testing patterns, the [QA skills directory](/skills) has ready-made building blocks you can adapt for AI coding agents.

## Stage 1: Building a Dataset (JSONL of Inputs and Ideal Outputs)

A dataset is a JSONL file, one JSON object per line, where each object is a single test case. The minimum is an input the agent will receive and an ideal output to grade against. For agent evals you also include hints about the expected behavior, such as which tool should be called, so you can grade the trace.

\\\`\\\`\\\`jsonl
{"item": {"question": "What is the weather in Tokyo today?", "ideal": "It is sunny, 24C in Tokyo.", "expected_tool": "get_weather"}}
{"item": {"question": "Convert 100 USD to EUR", "ideal": "Approximately 92 EUR", "expected_tool": "currency_convert"}}
{"item": {"question": "Who wrote Pride and Prejudice?", "ideal": "Jane Austen", "expected_tool": "none"}}
{"item": {"question": "Email the Q3 report to the finance team", "ideal": "Report emailed to finance.", "expected_tool": "send_email"}}
\\\`\\\`\\\`

Each line is wrapped in an \\\`item\\\` object because that is the shape the Evals API expects: \\\`item\\\` is the row, and your grader and sampler templates reference its fields with \\\`{{ item.question }}\\\`, \\\`{{ item.ideal }}\\\`, and so on. The dataset field reference below explains the conventional fields and how each is used.

| Field | Purpose | Used by | Required? |
|---|---|---|---|
| \\\`question\\\` / \\\`input\\\` | The prompt fed to the agent | Sampler template | Yes |
| \\\`ideal\\\` | The reference answer for grading | Output graders | Recommended |
| \\\`expected_tool\\\` | Tool the agent should call | Trace grader | For agent evals |
| \\\`expected_args\\\` | Arguments the tool should receive | Trace grader | Optional |
| \\\`context\\\` | Extra context (retrieved docs, history) | Sampler / faithfulness grader | Optional |
| \\\`tags\\\` | Labels for slicing the report | Reporting | Optional |

Aim for diversity over volume. Twenty test cases that cover happy paths, edge cases, ambiguous inputs, and known-failure modes are worth more than two hundred near-duplicates. Include cases where the agent should call no tool at all (\\\`expected_tool: "none"\\\`), because over-eager tool calling is one of the most common agent bugs and you can only catch it if you test for it.

You can keep the dataset inline (as \\\`file_content\\\`) for small sets, or upload a \\\`.jsonl\\\` file for larger ones:

\\\`\\\`\\\`python
# Upload a JSONL dataset file for reuse across runs
with open("agent_dataset.jsonl", "rb") as f:
    uploaded = client.files.create(file=f, purpose="evals")

print("Dataset file id:", uploaded.id)
\\\`\\\`\\\`

## Stage 2: Defining the Agent and Capturing Traces

Your agent is whatever code calls the model in a loop and invokes tools. The trace is the record of that loop. The simplest way to capture a trace is to record every model message and every tool call as the loop runs. Here is a minimal tool-using agent that builds its own trace.

\\\`\\\`\\\`python
import json

def get_weather(city: str) -> str:
    return json.dumps({"city": city, "temp_c": 24, "conditions": "sunny"})

TOOLS = [
    {
        "type": "function",
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    }
]

def run_agent(question: str):
    trace = {"steps": [], "tool_calls": [], "final_output": ""}
    messages = [{"role": "user", "content": question}]

    for _ in range(5):  # cap the loop to avoid runaways
        resp = client.responses.create(
            model="gpt-4.1",
            input=messages,
            tools=TOOLS,
        )
        trace["steps"].append({"type": "model_call", "id": resp.id})

        tool_call = next(
            (o for o in resp.output if o.type == "function_call"), None
        )
        if tool_call is None:
            trace["final_output"] = resp.output_text
            break

        # Record the tool call into the trace
        args = json.loads(tool_call.arguments)
        trace["tool_calls"].append({"name": tool_call.name, "arguments": args})

        result = get_weather(**args) if tool_call.name == "get_weather" else "{}"
        messages += [
            tool_call,
            {"type": "function_call_output", "call_id": tool_call.call_id, "output": result},
        ]

    return trace

trace = run_agent("What is the weather in Tokyo today?")
print(json.dumps(trace, indent=2))
\\\`\\\`\\\`

The \\\`trace\\\` dict is the key artifact. It captures the ordered list of model calls, the exact tool calls with their arguments, and the final output. Everything you want to grade about the agent's behavior, did it call the right tool, with the right arguments, without looping, lives in this structure. In production you would also store latency, token counts, and any errors per step.

## Stage 3: Trace Grading versus Output Grading

Agent evaluation needs two kinds of grading. **Output grading** judges the final answer against the ideal, exactly like a normal eval, using string-check, text-similarity, or a model grader. **Trace grading** judges the path: did the agent call \\\`expected_tool\\\`, did it pass the right arguments, and did it avoid unnecessary steps? Trace grading is what separates agent evals from prompt evals.

A python grader is the natural fit for trace grading because the trace is structured data you inspect with code.

\\\`\\\`\\\`python
trace_grader_source = '''
import json

def grade(sample, item) -> float:
    # The agent serializes its trace into output_text as JSON
    try:
        trace = json.loads(sample["output_text"])
    except Exception:
        return 0.0

    expected = item.get("expected_tool", "none")
    called = [tc["name"] for tc in trace.get("tool_calls", [])]

    if expected == "none":
        # Should NOT have called any tool
        return 1.0 if len(called) == 0 else 0.0

    # Should have called exactly the expected tool, once
    if called == [expected]:
        return 1.0
    if expected in called:
        return 0.5  # called it, but also did extra work
    return 0.0
'''

trace_grader = {
    "name": "Correct tool usage",
    "type": "python",
    "source": trace_grader_source,
    "pass_threshold": 1.0,
}
\\\`\\\`\\\`

Notice the partial credit: calling the right tool plus extra unnecessary calls scores 0.5, which surfaces inefficient agents without failing them outright. This is the kind of nuance only trace grading can express. For the underlying grader mechanics, see the companion [OpenAI Evals graders reference](/blog/openai-evals-graders-complete-reference-2026).

## Stage 4: Attaching Graders to Dataset Items

You bind graders to your data by creating an eval whose \\\`testing_criteria\\\` lists every grader, and whose \\\`item_schema\\\` declares the fields your graders reference. Once created, every run against this eval applies all of these graders to every item.

\\\`\\\`\\\`python
eval_obj = client.evals.create(
    name="weather-agent-eval",
    data_source_config={
        "type": "custom",
        "item_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "ideal": {"type": "string"},
                "expected_tool": {"type": "string"},
            },
            "required": ["question", "ideal"],
        },
        "include_sample_schema": True,
    },
    testing_criteria=[
        {
            "name": "Correct tool usage",
            "type": "python",
            "source": trace_grader_source,
            "pass_threshold": 1.0,
        },
        {
            "name": "Final answer quality",
            "type": "score_model",
            "model": "gpt-4.1-mini",
            "input": [
                {"role": "system", "content": "Rate how well the answer matches the ideal, 0.0-1.0. Output only a number."},
                {"role": "user", "content": "Ideal: {{ item.ideal }}\\\\nTrace JSON: {{ sample.output_text }}"},
            ],
            "range": [0.0, 1.0],
            "pass_threshold": 0.7,
        },
    ],
)
print("Eval id:", eval_obj.id)
\\\`\\\`\\\`

Here both a trace grader (python) and an output-quality grader (score_model) are attached to every item. Because a run requires all testing criteria to pass, an item only counts as a full pass when the agent both took the right path and produced a good answer.

## Stage 5: Running the Eval Against the Agent

There are two ways to drive the run. If the agent logic is simple enough to express as a sampler template, you can let Evals generate outputs directly. For real agents with custom tool loops, the cleaner pattern is to run your agent yourself, serialize each trace, and feed those as stored results. Below, we run the agent locally over the dataset and push the traces as the run's data source.

\\\`\\\`\\\`python
import json

dataset = [
    {"question": "What is the weather in Tokyo today?", "ideal": "Sunny, 24C", "expected_tool": "get_weather"},
    {"question": "Who wrote Pride and Prejudice?", "ideal": "Jane Austen", "expected_tool": "none"},
]

# Run the agent and build run content: each item carries its trace as output_text
content = []
for row in dataset:
    trace = run_agent(row["question"])
    content.append(
        {
            "item": row,
            "sample": {"output_text": json.dumps(trace)},
        }
    )

run = client.evals.runs.create(
    eval_id=eval_obj.id,
    name="run-agent-v1",
    data_source={
        "type": "jsonl",
        "source": {"type": "file_content", "content": content},
    },
)
print("Run id:", run.id, "status:", run.status)
\\\`\\\`\\\`

This "bring your own outputs" pattern is the most reliable way to evaluate a real agent, because Evals never needs to understand your tool loop; it just grades the traces you captured. You keep full control of the agent, and Evals does what it is best at, scoring at scale and reporting.

## Stage 6: Reading the Eval Report

Once the run completes, read the headline metrics and then drill into failures. The report tells you the pass rate per grader and lets you inspect every item's trace and scores.

\\\`\\\`\\\`python
import time

while True:
    run = client.evals.runs.retrieve(run_id=run.id, eval_id=eval_obj.id)
    if run.status in ("completed", "failed"):
        break
    time.sleep(2)

print("Status:", run.status)
print("Result counts:", run.result_counts)  # passed / failed / errored

# Drill into per-item results to find what broke
items = client.evals.runs.output_items.list(run_id=run.id, eval_id=eval_obj.id)
for it in items.data:
    passed = all(r["passed"] for r in it.results)
    if not passed:
        print("FAILED item:", it.datasource_item.get("question"))
        for r in it.results:
            print("  grader:", r["name"], "passed:", r["passed"], "score:", r.get("score"))
\\\`\\\`\\\`

Read the report grader by grader. If the "Correct tool usage" grader fails often, your agent is calling the wrong tools or looping; if "Final answer quality" fails while tool usage passes, your agent gets to the right data but phrases the answer poorly. That separation, which only exists because you graded the trace and the output independently, tells you exactly where to spend your fixing time.

## Stage 7: Iterating Until Quality Holds

Evaluation is a loop, not a one-shot. Take the failing items, form a hypothesis (the tool description is ambiguous, the system prompt encourages over-calling, the answer format is wrong), make one change, and rerun the exact same eval. Because the dataset and graders are fixed, the new pass rate is directly comparable to the old one. This is how you turn agent development from guesswork into measurable engineering.

Some iteration discipline that pays off: keep the dataset under version control so eval results are reproducible; add a new test case every time you find a real-world failure so regressions cannot sneak back; and watch the partial-credit scores, not just pass/fail, because a drop from 1.0 to 0.5 on the trace grader means your agent started doing extra work even if it still technically passes. When pass rates plateau, expand the dataset with harder edge cases rather than declaring victory. For adversarial test cases that probe agent safety, see the [promptfoo red teaming guide](/blog/promptfoo-red-teaming-guide-2026), and for guardrail testing patterns see the [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026).

## Putting It All Together

The full agent eval workflow is a tight loop: build a diverse JSONL dataset with inputs, ideal outputs, and expected tool behavior; run your agent and capture a structured trace of every model and tool call; grade both the trace (right tool, right arguments, no waste) and the final output (matches the ideal); attach those graders to your dataset by creating an eval; run the eval over your captured traces; read the report grader by grader to localize failures; then fix and rerun. The "bring your own outputs" pattern keeps Evals out of your agent's internals while still giving you scoring at scale.

Do this once and you will have a regression suite for your agent that runs on every prompt change, every model upgrade, and every tool refactor. That suite is the difference between an agent you hope works and an agent you know works.

## Frequently Asked Questions

### What is the difference between trace grading and output grading in agent evals?

Output grading judges the agent's final answer against an ideal reference, using string-check, similarity, or a model grader. Trace grading judges the path the agent took: did it call the expected tool, with the right arguments, without unnecessary loops? Agent evals need both, because an agent can produce the right answer through a fragile or wasteful path that only trace grading catches.

### How do I build a dataset for OpenAI agent evals?

Create a JSONL file with one JSON object per line, each wrapped in an \\\`item\\\` key. Include the input question, an ideal output for grading, and agent-specific fields like \\\`expected_tool\\\` and \\\`expected_args\\\` so you can grade the trace. Favor diversity over volume: cover happy paths, edge cases, ambiguous inputs, and cases where no tool should be called, since over-eager tool calling is a common agent bug.

### How do I capture agent traces for evaluation?

Run your agent loop and record every step into a structured object: each model call, each tool call with its name and arguments, and the final output. Cap the loop to prevent runaways. The resulting trace dict holds everything you need to grade behavior. Serialize it to JSON and feed it to Evals as the sample output, so the grader can inspect tool usage and ordering with code.

### Can I evaluate a real agent with a custom tool loop in OpenAI Evals?

Yes, using the "bring your own outputs" pattern. Run your agent locally over the dataset, capture each trace, serialize it, and submit those traces as the run's data source. Evals never needs to understand your tool loop; it just grades the traces you captured. This keeps full control of agent logic in your code while Evals handles scoring at scale and reporting.

### How do I grade whether an agent called the right tool?

Use a python grader that parses the serialized trace JSON, extracts the list of tool calls, and compares it against the item's \\\`expected_tool\\\`. Return 1.0 when the agent called exactly the right tool, 0.5 when it called the right tool plus extra unnecessary calls, and 0.0 otherwise. For cases where no tool should fire, pass only when the tool-call list is empty.

### How do I read an OpenAI agent eval report?

Retrieve the run for headline \\\`result_counts\\\` (passed, failed, errored), then list \\\`output_items\\\` to inspect each test case. Read the report grader by grader: frequent trace-grader failures mean wrong or looping tool calls, while output-grader failures with passing traces mean the agent finds the right data but phrases answers poorly. That separation tells you exactly where to focus fixes.

### How many test cases do I need for an agent eval?

Quality beats quantity. Twenty to fifty well-chosen cases covering happy paths, edge cases, ambiguous inputs, and known-failure modes usually beat hundreds of near-duplicates. Always include cases where no tool should be called. Grow the dataset over time by adding a new case for every real-world failure you discover, so regressions cannot reappear, and add harder edge cases whenever pass rates plateau.

### How do I iterate on an agent using eval results?

Treat evaluation as a loop. Inspect failing items, form one hypothesis (ambiguous tool description, over-eager system prompt, wrong format), make a single change, and rerun the exact same eval. Because the dataset and graders are fixed, the new pass rate is directly comparable. Version-control the dataset, watch partial-credit scores for silent regressions, and expand with harder cases instead of declaring victory early.

## Conclusion and Next Steps

Agent evaluation is the discipline that turns "I think the agent works" into "the agent passes 47 of 50 cases, and here are the three it fails." The workflow is always the same: build a JSONL dataset, capture structured traces, grade both the trace and the output, attach those graders to an eval, run it, read the report, and iterate. The trace is the artifact that makes agent evals different from prompt evals, and grading it independently from the final output is what lets you localize failures precisely.

Start small today: pick one agent flow, write ten test cases with expected tools, capture traces, attach a python trace grader and a score_model output grader, and run your first eval. Then explore the [QA skills directory](/skills) for reusable agent-testing patterns, and read the companion [OpenAI Evals graders reference](/blog/openai-evals-graders-complete-reference-2026) to master every grader type. The agent you measure is the agent you can actually improve.
`,
};
