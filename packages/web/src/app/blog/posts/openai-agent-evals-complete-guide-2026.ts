import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Agent Evals Complete Guide 2026',
  description:
    'Build production-grade agent evals with the OpenAI Evals framework in 2026. Covers eval YAML, custom graders, tool-use evaluation, multi-turn agent traces, and dashboards.',
  date: '2026-05-03',
  category: 'AI Testing',
  content: `
# OpenAI Agent Evals Complete Guide 2026

Agents are no longer a research curiosity. In 2026, production agents handle customer support escalations, draft pull requests, reconcile expense reports, and run data analyses across enterprise tools. With production deployment comes the need for production-grade evaluation. The OpenAI Evals framework is the most widely used open-source tool for evaluating LLM systems, and its 2026 release adds first-class support for agents: multi-turn trace recording, tool-use grading, and pass-rate dashboards across versions.

This guide walks you through the agent evaluation features that matter. We cover the eval YAML format, how to record agent traces, how to grade tool calls and final answers, how to write custom graders, how to wire evals into CI, and how to compare runs across agent versions. Every section includes runnable Python and YAML code that you can drop into your own repo. We also explain how agent evals differ from regular LLM evals and why the differences matter. By the end you should be able to set up a complete eval suite for your own agent and use the results to improve it.

## Key Takeaways

- OpenAI Evals 2026 adds first-class agent support: multi-turn traces, tool-call grading, and final-answer evaluation in one framework.
- Eval suites are defined in YAML with one entry per test case; graders are configured per suite and can be model-graded, exact match, or custom Python.
- Tool-call grading evaluates whether the agent called the right tools with the right arguments; final-answer grading evaluates the response to the user.
- Agent evals require a different dataset shape than LLM evals: each example needs initial state, expected tool calls, and optionally a gold final answer.
- Run evals on every PR for fast feedback and nightly on a larger dataset for deeper signal.
- The Evals dashboard compares pass rates across agent versions and surfaces failing examples for review.

---

## What Makes Agent Evals Different

LLM evals score a single input-output pair: prompt in, response out, grader checks the response. Agent evals score a multi-step trajectory: initial state, a sequence of tool calls and observations, and a final response. The trajectory dimension introduces failure modes that single-turn evals miss.

An agent can choose the wrong tool, pass wrong arguments, fail to handle an error from a tool, loop indefinitely, or call too many tools when fewer would do. A single-turn grader cannot catch these failures because it only sees the final response. Agent evals expose the trajectory so graders can score intermediate decisions, not just the final answer.

The OpenAI Evals 2026 framework supports this through a new agent eval type. The eval runs the agent against each test case, captures the trajectory, and passes both the trajectory and the final response to the grader. The grader can score any aspect: which tools were called, what arguments were used, whether the agent took the shortest path, and whether the final response is correct.

---

## Installation and Setup

Install the OpenAI Evals 2026 framework and the agent SDK.

\`\`\`bash
pip install openai-evals openai
export OPENAI_API_KEY=sk-...
\`\`\`

The framework includes a CLI for running evals, building reports, and pushing results to a dashboard. Verify installation by listing the built-in evals.

\`\`\`bash
oaievals list
oaievals run hello-world
\`\`\`

A scaffolded agent eval lives in two files: a YAML suite that lists test cases and a Python agent that implements the system under test.

\`\`\`yaml
# evals/customer_support.yaml
name: customer_support_agent
description: Evaluates the customer support agent on refund and shipping queries.
type: agent
agent_module: agents.customer_support
graders:
  - id: tool_call_check
    type: python
    path: graders/tool_call_check.py
  - id: final_answer
    type: model_graded
    model: gpt-4o
    prompt: |
      Compare the agent's final response to the expected answer. Score 1 if
      the response addresses the user's question and is consistent with the
      expected answer. Score 0 otherwise.
test_cases: cases/customer_support.jsonl
\`\`\`

The YAML defines what gets evaluated and how. The agent module is your code under test. The graders are configured per suite and can be reused across suites.

---

## Test Case Format

Each test case is a JSONL line with the initial state, expected tool calls, and optionally a gold final answer.

\`\`\`json
{
  "id": "refund_1",
  "messages": [
    {"role": "user", "content": "I want to refund order 12345"}
  ],
  "expected_tool_calls": [
    {"name": "lookup_order", "arguments": {"order_id": "12345"}},
    {"name": "issue_refund", "arguments": {"order_id": "12345"}}
  ],
  "expected_final_answer": "Your refund for order 12345 has been processed. You'll see the credit in 5-7 business days."
}
\`\`\`

Test cases come from real production traffic when possible. Sample 100 to 200 traces from your logs, redact PII, and have a subject matter expert label the expected outcomes. Each test case is a contract: this is what the agent should do, regardless of internal implementation changes.

For new agents without production traffic, write test cases that cover the happy path, common variants, and known failure modes. Aim for 50 test cases at launch and grow the suite as you discover new patterns. Stratify by difficulty so you can report performance per bucket.

---

## Running an Eval

The eval CLI runs the suite, captures traces, and produces a report.

\`\`\`bash
oaievals run evals/customer_support.yaml --output runs/2026-05-03/
\`\`\`

The output directory contains the trajectories, grader outputs, and a summary report. The report includes overall pass rate, per-grader pass rate, and a list of failing examples with their trajectories.

\`\`\`
Run: customer_support_agent
Total cases: 50
Passed: 42 (84%)
Failed: 8 (16%)

Grader breakdown:
  tool_call_check: 45/50 (90%)
  final_answer: 43/50 (86%)

Top failures:
  refund_3: agent called lookup_order with wrong arguments
  refund_7: agent issued refund without verifying order status
  shipping_2: agent's final answer omitted tracking number
\`\`\`

The trace JSON for each failing example shows the full conversation, every tool call, and every observation. Reviewers can replay the trace step by step to understand what went wrong.

---

## Grader 1: Tool Call Check

Tool call grading verifies that the agent called the expected tools with the expected arguments. The built-in grader compares the actual trace to the expected_tool_calls list with configurable matching rules.

\`\`\`python
# graders/tool_call_check.py
from openai_evals import Grader, Result

class ToolCallCheck(Grader):
    def grade(self, case, trajectory):
        expected = case["expected_tool_calls"]
        actual = [step for step in trajectory if step["type"] == "tool_call"]
        if len(actual) != len(expected):
            return Result(score=0, reason=f"Expected {len(expected)} calls, got {len(actual)}")
        for e, a in zip(expected, actual):
            if e["name"] != a["name"]:
                return Result(score=0, reason=f"Expected {e['name']}, got {a['name']}")
            if not self._args_match(e["arguments"], a["arguments"]):
                return Result(score=0, reason="Arguments mismatch")
        return Result(score=1)

    def _args_match(self, expected, actual):
        # Exact match for now; relax for fuzzy matching as needed.
        return expected == actual
\`\`\`

Tool call grading catches the most common agent failure modes: missing tools, wrong tools, wrong arguments, and extra tools. A common variant relaxes the order of tool calls so that two equivalent paths both pass.

For agents with optional tools, expected_tool_calls can include alternatives. The grader passes if any of the alternatives match the trajectory.

---

## Grader 2: Final Answer Check

The final answer grader scores the agent's response to the user. It is usually a model-graded grader that compares the agent's final answer to an expected answer.

\`\`\`yaml
graders:
  - id: final_answer
    type: model_graded
    model: gpt-4o
    prompt: |
      Compare the agent's final answer to the expected answer.

      Question: {{ user_message }}
      Expected: {{ expected_final_answer }}
      Actual: {{ final_answer }}

      Score 1 if the actual answer addresses the user's question and is
      consistent with the expected answer. Score 0 otherwise.

      Return JSON: {"score": 0|1, "reason": "<one-sentence explanation>"}
\`\`\`

Model-graded answers handle paraphrase well: the grader recognizes that "Your refund is in process" and "We're working on your refund" mean the same thing. For high-stakes evaluations, use two judges and require both to agree.

For deterministic answers (specific numbers, IDs, code snippets), use exact-match or regex graders instead of model-graded ones. The grader configuration accepts a list, so a single suite can use different graders for different test cases.

---

## Grader 3: Trajectory Quality

Beyond tool calls and final answers, you may want to score the trajectory itself: did the agent take the shortest path, did it handle errors well, did it explain its reasoning.

\`\`\`python
class TrajectoryQuality(Grader):
    def grade(self, case, trajectory):
        steps = len([s for s in trajectory if s["type"] in ("tool_call", "tool_result")])
        max_steps = case.get("max_steps", 10)
        if steps > max_steps:
            return Result(score=0, reason=f"Too many steps: {steps}")
        if self._has_loop(trajectory):
            return Result(score=0, reason="Agent looped on the same tool call")
        if self._has_unhandled_error(trajectory):
            return Result(score=0, reason="Agent did not handle tool error")
        return Result(score=1)
\`\`\`

Trajectory quality grading is the most agent-specific metric. It catches behaviors that a final-answer grader would miss: an agent that produces the right answer after calling the same tool twenty times is technically correct but operationally bad.

---

## Custom Graders

The framework supports arbitrary Python graders. Inherit from Grader, implement the grade method, and return a Result with a score between 0 and 1.

\`\`\`python
class CitationGrader(Grader):
    """Score 1 if the agent cited at least one source in its final answer."""
    def grade(self, case, trajectory):
        final = trajectory[-1]["content"]
        if "Source:" in final or "Reference:" in final:
            return Result(score=1)
        return Result(score=0, reason="No citations in final answer")
\`\`\`

Compose graders by listing multiple in the YAML. Each grader runs independently, and the per-grader pass rate appears in the report.

| Grader Type | Best For |
| --- | --- |
| Exact match | Deterministic answers (numbers, IDs) |
| Regex | Structured outputs with variable fields |
| Model-graded | Paraphrased natural language |
| Tool-call check | Agent action validation |
| Trajectory quality | Multi-step efficiency |
| Custom Python | Domain-specific business logic |

---

## CI Integration

Run the eval suite on every pull request. The framework's exit code reflects whether the suite passed all thresholds.

\`\`\`yaml
# .github/workflows/evals.yml
name: Agent Evals
on: [pull_request]
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: oaievals run evals/customer_support.yaml --threshold 0.85
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Set thresholds based on a baseline run. The first run on main establishes the pass rate; subsequent PRs cannot drop below it without a failing CI step.

For larger suites that take minutes to run, use a smaller PR-time subset and a full nightly run. Both feed into the same dashboard so reviewers can see the trend.

---

## The Evals Dashboard

The framework ships with a web dashboard for comparing runs across versions. The dashboard shows pass rates, regressions, and failing examples with their trajectories.

\`\`\`bash
oaievals dashboard --port 8080
\`\`\`

Open the dashboard in a browser to see runs grouped by suite and date. Click on a run to see the per-grader breakdown and the list of failing examples. Click on an example to see the full trace, with tool calls, observations, and grader outputs annotated.

The dashboard is the primary review interface for agent quality. Most teams put the link in their CI status check so reviewers can dig into failures without leaving the PR.

---

## Dataset Curation

The quality of the eval suite depends on the quality of the test cases. Three rules apply.

First, sample from production. Hand-crafted test cases miss the patterns that real users produce. Once your agent has any traffic, sample 100 conversations and convert them to test cases.

Second, redact PII. Test cases live in your code repo; do not store customer names, emails, or order details. Replace with synthetic values that preserve the structure.

Third, label outcomes by a domain expert. The expected_final_answer field is the ground truth that every grader checks against. If it is wrong, the suite is wrong.

Grow the suite as you find new failure modes. When a customer reports an issue, add a test case that reproduces it. When a PR introduces a regression, add the failing case to the suite so the regression cannot recur. The suite is a record of every failure your team has seen.

---

## Comparing to Other Frameworks

| Framework | Agent Support | Custom Graders | Dashboard | Open Source |
| --- | --- | --- | --- | --- |
| OpenAI Evals | Yes (2026) | Yes | Yes | Yes |
| LangSmith | Yes | Yes | Yes | No |
| promptfoo | Partial | Yes | CLI | Yes |
| Ragas | RAG only | Limited | No | Yes |
| DeepEval | Yes | Yes | No | Yes |

OpenAI Evals 2026 is the most agent-focused open framework. LangSmith offers similar features but is paid. promptfoo is more lightweight but lacks trajectory grading. Ragas is RAG-specific. DeepEval is pytest-native and useful for unit-level evals.

---

## Production Patterns

Use temperature zero on the agent under test for reproducible traces. Stochastic agent decisions make the eval noisy.

Snapshot tool responses. If your agent calls external services, mock or snapshot the responses so the eval is deterministic. Live external calls make the eval unreliable.

Version the eval suite. Each release ties to a specific suite version. A failing run could mean the agent regressed or the suite changed; tying them together prevents confusion.

Run on multiple base models. Run the same suite against the candidate model and the production model side by side. If the candidate passes more than 90 percent of cases and does not regress on any, it is safe to promote.

Investigate failures one at a time. Most regressions come from a small number of root causes. Diagnose one root cause, fix it, re-run, and move to the next.

---

## Common Pitfalls

Grader noise. Model-graded graders are stochastic by default. Set temperature zero and use a strong judge to reduce variance.

Overfit suites. If you add a test case for every PR failure, the suite becomes a regression net but may not generalize. Periodically sample fresh production traces to keep the suite representative.

Tool mock drift. If your tool mocks do not match the real tool behavior, the eval gives false positives. Validate mocks against the real tool when contracts change.

Long traces. Agents that loop or call many tools produce huge traces that are expensive to grade. Cap the trace length and treat overruns as failures.

Stale expected answers. Domain expectations change. Periodically rebaseline the expected_final_answer fields so they reflect current product behavior.

---

## Further Resources

- OpenAI Evals 2026 release notes and source.
- Agent skills directory at /skills.
- Related guides on /blog: OpenAI Evals Graders Reference, OpenAI Evals Design Best Practices, and Promptfoo vs OpenAI Evals.

---

## Conclusion

Agent evaluation is harder than LLM evaluation because the trajectory matters as much as the final answer. The OpenAI Evals 2026 framework gives you the tools to evaluate both: tool-call grading, final-answer grading, trajectory quality grading, and a dashboard for tracking trends. Start with a suite of 50 production-derived test cases, set thresholds based on a baseline, and wire the suite into CI. From there, grow the suite, refine the graders, and use the dashboard to make data-driven decisions about agent versions. See more in [/skills](/skills) and the [/blog](/blog) for related deep dives.
`,
};
