import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "AgentOps AI Agent Monitoring Guide (2026)",
  description: "AgentOps guide for 2026: monitor and debug AI agents with session replay, LLM cost and latency tracking, and observability for multi-step agentic workflows.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# AgentOps AI Agent Monitoring Guide (2026)

AgentOps is an observability and monitoring platform built specifically for AI agents. Where generic LLM logging captures single request/response pairs, AgentOps records an entire **session** — every LLM call, tool invocation, and step an agent takes from start to finish — and lets you replay it visually to see exactly what the agent did, in what order, with what cost and latency. You instrument your agent with a few lines of SDK code, and AgentOps captures the full execution trace, tracks token spend and timing, flags errors, and gives you a dashboard to debug why an agent went off the rails. It integrates with popular agent frameworks and is provider-agnostic.

This guide covers what AgentOps monitors, how to instrument an agent, session replay, cost and error tracking, framework integrations, and how to fit it into your workflow. AgentOps updates frequently, so treat the code below as accurate usage patterns and confirm exact function and decorator names against the official AgentOps docs before pinning them.

## Why agents need their own observability

A single LLM call is easy to log. An **agent** is not a single call — it is a loop: the model reasons, calls a tool, reads the result, reasons again, calls another tool, and eventually produces an answer. A single user request can fan out into dozens of LLM calls and tool invocations across several seconds. When that goes wrong — the agent loops forever, picks the wrong tool, burns $2 of tokens on one request, or quietly fails halfway — a flat list of LLM calls tells you almost nothing.

Agent-specific observability captures the **structure and sequence** of that execution so you can answer:

- What steps did the agent take, and in what order?
- Which tool calls succeeded, which failed, and what did they return?
- Where did the time and the cost go?
- At which step did the run derail?

This is the gap AgentOps fills. For a broader conceptual primer on evaluating agentic systems, see our [AI agent evaluation overview](/blog).

## Installation and setup

AgentOps is primarily a Python SDK (with growing support for other ecosystems):

\`\`\`bash
pip install agentops
\`\`\`

Authenticate with an API key from your AgentOps dashboard, supplied as an environment variable:

\`\`\`bash
export AGENTOPS_API_KEY="your_key_here"
\`\`\`

The SDK reads the key from the environment. With that set, instrumenting an agent is usually a single initialization call near the start of your program.

## Instrumenting an agent

The core pattern is: initialize AgentOps, and it automatically captures the LLM calls and (with supported frameworks) tool calls that follow. A minimal setup:

\`\`\`python
import agentops

# Start capturing — this begins a session
agentops.init()

# ... run your agent as normal ...
# AgentOps automatically records LLM calls made by supported providers

# End the session, marking the outcome
agentops.end_session("Success")
\`\`\`

For finer control you annotate the units of work in your agent. AgentOps provides decorators to mark functions as agents, tools, or operations so they appear as labeled steps in the replay:

\`\`\`python
import agentops
from agentops import track_agent

agentops.init()

@track_agent(name="research-agent")
class ResearchAgent:
    def run(self, query: str) -> str:
        results = self.search(query)        # a tool step
        return self.summarize(results)      # another step

    def search(self, query: str):
        ...

    def summarize(self, text: str):
        ...
\`\`\`

The exact decorator names and signatures evolve, so confirm them in the docs — but the model is consistent: you tell AgentOps which functions are meaningful agent steps, and it stitches them into a session trace with timing, inputs, outputs, and cost per step.

## Session replay

The signature feature is **session replay**. A session is one complete agent run, and AgentOps reconstructs it as a visual, step-by-step timeline you can walk through. Instead of reading scattered logs, you see:

- The sequence of LLM calls and tool invocations as a connected flow.
- The full prompt and completion at each LLM step.
- Each tool call's arguments and returned result.
- Per-step latency and token cost.
- Where errors or exceptions occurred.

This turns debugging an agent from archaeology into observation. When an agent produces a wrong final answer, you open the session and trace the reasoning: maybe it called the search tool with a malformed query, got empty results, and then hallucinated an answer. You can *see* that chain rather than infer it. Replay is also how you build intuition about agent behavior across many runs — spotting that the agent frequently retries a flaky tool, or that one step dominates latency.

## Tracking cost, tokens, and latency

Agents are expensive precisely because one request triggers many model calls, and that cost is easy to lose track of. AgentOps aggregates spend so you can see it per session and in totals:

| Metric | Why it matters for agents |
|---|---|
| Tokens per session | One user request can consume tens of thousands of tokens across many steps. |
| Cost per session | Translates token usage into dollars per provider/model. |
| Latency per step and per session | Identifies which tool or model call is the bottleneck. |
| LLM call count | A runaway loop shows up as an abnormally high call count. |

These metrics make two common agent failures visible: **cost blowups** (a loop that keeps calling the model) and **latency hotspots** (one slow tool dragging the whole run). Watching cost-per-session over time also catches regressions — a prompt change that makes the agent take three extra steps shows up immediately as rising average cost.

## Error and failure tracking

AgentOps captures errors and lets you mark session outcomes, so you can distinguish runs that completed successfully from those that failed or were indeterminate:

\`\`\`python
import agentops

agentops.init()
try:
    result = run_agent(task)
    agentops.end_session("Success")
except Exception as e:
    agentops.end_session("Fail")
    raise
\`\`\`

On the dashboard you can then filter to failed sessions and replay them to find the root cause. Because each step records its inputs and outputs, you can see exactly which tool threw, what it received, and what the agent did in response. This is far more actionable than a stack trace alone, because it preserves the *agent's reasoning context* around the failure.

## Framework integrations

AgentOps is designed to plug into popular agent frameworks with minimal code, so you do not have to manually annotate every step. Integrations commonly cover frameworks such as CrewAI, AutoGen, LangChain/LangGraph, and direct provider SDKs. In the typical pattern, you call \`agentops.init()\` and the integration auto-instruments the framework's LLM and tool calls, surfacing them in the session replay without further changes.

If you build agents directly against a provider SDK rather than a framework, the auto-capture of LLM calls still works, and you add the agent/tool decorators yourself for the steps you want labeled. Either way, the goal is the same: a faithful trace of the agent's execution with as little instrumentation burden as possible. Compare AgentOps's agent-centric model against general LLM eval and observability tools on our [comparison hub](/compare).

## Monitoring vs evaluation — how AgentOps fits

It is worth being precise about scope. AgentOps's strength is **observability and monitoring** of agent execution: what happened, how much it cost, how long it took, and where it failed. That is distinct from **scoring** the quality of outputs against a dataset, which is what dedicated evaluation harnesses focus on.

In practice the two are complementary. You use agent observability to debug and operate your agent in production, and an evaluation framework to systematically score its answers on a curated benchmark before you ship. A mature agent stack typically runs both: session replay and cost tracking for operational visibility, plus offline evals to gate quality. The replay data is also a rich source of cases to add to your eval dataset — when you find a bad session, that input becomes a regression test.

## A realistic debugging workflow

Putting it together, here is how teams actually use AgentOps when an agent misbehaves:

1. A user reports the agent gave a wrong or incomplete answer.
2. Open the dashboard and find that session (filter by user, time, or "Fail" outcome).
3. Replay it step by step: read the agent's reasoning, the tool calls, and the returned data.
4. Spot the derailment — e.g. a tool returned an error the agent ignored, or it looped on an ambiguous instruction.
5. Fix the prompt, tool, or guardrail.
6. Add that input to your eval dataset so the fix is verified and the case never silently regresses.

This loop — observe, diagnose, fix, regression-test — is the same discipline QA engineers apply to any system, adapted to the non-deterministic, multi-step nature of agents. Browse install-ready agent-testing and monitoring skills for AI coding agents at [/skills](/skills).

## Common errors and troubleshooting

- **No session appears** — \`agentops.init()\` was not called before the agent ran, or \`AGENTOPS_API_KEY\` is unset. Initialize early and confirm the key.
- **LLM calls not captured** — the provider or framework is not auto-instrumented in your setup. Check that your provider/framework is supported, or add explicit decorators around the calls.
- **Session never ends / stays "Indeterminate"** — you did not call \`end_session(...)\`. Always end the session, including in exception paths, so the outcome is recorded.
- **Cost shows as zero** — the model/provider pricing was not recognized for those calls. Verify the integration captures the model name so cost can be computed.
- **Steps unlabeled in replay** — without framework auto-instrumentation, decorate the functions you want to appear as named agent/tool steps.

## Frequently Asked Questions

### What is AgentOps used for?

AgentOps is an observability and monitoring platform for AI agents. It records an agent's entire session — every LLM call, tool invocation, and step — and lets you replay it visually, while tracking token cost, latency, and errors. It is used to debug why an agent went wrong, control runaway costs, and monitor multi-step agentic workflows in production.

### What is session replay in AgentOps?

Session replay reconstructs one complete agent run as a visual, step-by-step timeline. You can walk through the sequence of LLM calls and tool invocations, read the full prompt and completion at each step, see each tool's arguments and results, and inspect per-step latency and cost. It turns debugging an agent from reading scattered logs into directly observing what the agent did and where it derailed.

### How do I instrument an agent with AgentOps?

Install the SDK with \`pip install agentops\`, set your \`AGENTOPS_API_KEY\`, and call \`agentops.init()\` near the start of your program — this begins a session and auto-captures supported LLM calls. For labeled steps, add the agent and tool decorators to the functions you want to appear in the replay, and call \`agentops.end_session("Success")\` or \`"Fail"\` when the run finishes. Confirm exact decorator names in the official docs.

### Is AgentOps an evaluation tool or a monitoring tool?

AgentOps is primarily a monitoring and observability tool focused on what an agent did, how much it cost, how long it took, and where it failed. That is distinct from scoring output quality against a dataset, which dedicated evaluation harnesses handle. The two are complementary: use AgentOps to operate and debug agents, and an eval framework to score quality before shipping, often feeding bad sessions back into the eval dataset.

### Does AgentOps work with frameworks like CrewAI and LangChain?

Yes. AgentOps is designed to integrate with popular agent frameworks — commonly including CrewAI, AutoGen, and LangChain/LangGraph — typically auto-instrumenting their LLM and tool calls after a single \`agentops.init()\` call. If you build agents directly against a provider SDK, LLM-call capture still works and you add step decorators yourself. Check the official integration list for the frameworks supported in your version.

### How does AgentOps help control AI agent costs?

Because one agent request can trigger many LLM calls, costs are easy to lose track of. AgentOps aggregates token usage and dollar cost per session and in totals, and surfaces the LLM call count, so a runaway loop or an unexpectedly expensive run is immediately visible. Watching cost-per-session over time also catches regressions, such as a prompt change that makes the agent take extra steps.
`,
};
