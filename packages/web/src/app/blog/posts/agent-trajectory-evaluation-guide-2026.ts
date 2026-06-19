import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Agent Trajectory Evaluation Guide: Score Multi-Step Runs (2026)",
  description: "Evaluate AI agent trajectories in 2026: outcome vs step-level scoring, success criteria, tool-call correctness, efficiency metrics, and LLM-as-judge rubrics.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Agent Trajectory Evaluation Guide: Score Multi-Step Runs (2026)

**Agent trajectory evaluation scores not just an agent's final answer but the whole sequence of steps it took to get there — the reasoning, tool calls, and intermediate results that make up a multi-step run.** A single-shot LLM eval asks "is the output right?"; an agent eval also asks "did it get there sensibly?" — did it call the right tools with the right arguments, in a reasonable order, without wasteful detours or hallucinated steps? You evaluate trajectories along two axes: **outcome** (did the task succeed?) and **process** (was the path correct and efficient?). This guide covers success criteria, step-level scoring, tool-call correctness, efficiency metrics, and how to combine them into a rubric you can run in CI.

## Why a final-answer check is not enough for agents

An agent that produces the right answer through luck, brute force, or a chain of corrected mistakes is fragile — it will fail the next slightly different task. Conversely, an agent that takes a perfect path but is cut off one step from the goal is *almost* working, and a pure pass/fail outcome check throws away that signal. Trajectory evaluation captures both, which matters because:

- **Outcome alone hides how it got there.** Two agents both "succeed," but one called three tools and one called fifteen, retried twice, and hallucinated a parameter. The first is production-ready; the second is a latency and cost liability waiting to break.
- **Process alone hides whether it worked.** A clean-looking trajectory that does not actually complete the task is still a failure.
- **Debugging needs the steps.** When an agent fails, you need to know *where* — wrong tool, wrong argument, wrong order, or correct steps but a botched final synthesis. Step-level signal localizes the failure.

The mental model: outcome tells you *whether*, trajectory tells you *why and how well*. You need both to ship and to debug.

## Defining success criteria

Before you can score anything, you must define what "done" means for each task — vague criteria produce noisy scores. Good success criteria are explicit and checkable:

- **End-state criteria.** The observable result the task should produce: a file written with specific contents, a record created in a system, a correct numeric answer, a PR opened. These are the most robust because they check reality, not the agent's claims.
- **Output criteria.** Properties the final response must satisfy (mentions the right figure, cites a source, stays in scope), graded by keyword checks or an LLM-as-judge rubric.
- **Reference trajectory (optional).** For tasks with a known-good path, an expected sequence of tool calls you can compare against. Use loosely — there is often more than one correct path.

Write criteria that grade the *result*, not the narration. An agent saying "I have updated the file" is not evidence the file changed; checking the file is. Store the criteria with each task case, the same way a [golden dataset](/blog) stores expected outputs.

\`\`\`jsonl
{"id": "task-refund-batch", "goal": "Refund all orders in refunds.csv and write a summary to out.md", "success": {"end_state": [{"file": "out.md", "must_include": ["3 orders refunded", "$142.50"]}], "expected_tools": ["read_file", "process_refund", "write_file"]}}
\`\`\`

## The two axes: outcome and process

### Outcome (task success)

The top-line metric is **task success rate**: across your task dataset, what fraction reach the defined success criteria? Evaluate it by checking the end state and/or output criteria after the run completes. This is your headline number and the one to gate releases on.

For tasks where partial completion is meaningful, a **graded outcome** (fraction of subgoals achieved) carries more signal than binary pass/fail — an agent that completes 4 of 5 subgoals is different from one that completes 0.

### Process (trajectory quality)

Process metrics score *how* the agent worked:

- **Tool-call correctness.** Did the agent call the right tools, with valid arguments? Common sub-checks: correct tool selected, arguments well-formed and on-target, no calls to non-existent tools, no hallucinated parameters.
- **Trajectory match (where applicable).** How closely the actual tool sequence aligns with an expected one. Use flexibly — exact-order matching is too strict when multiple valid paths exist; "did it include the necessary tool calls?" is often the better question.
- **Step validity.** Were intermediate steps grounded in prior results, or did the agent invent facts/state it never observed?
- **Recovery.** When a tool errored or returned unexpected data, did the agent adapt sensibly or spiral?

These are what separate a robust agent from one that happens to pass.

| Axis | Metric | What it tells you | How to check |
|---|---|---|---|
| Outcome | Task success rate | Did it work? | End-state / output criteria |
| Outcome | Subgoal completion | How much worked? | Graded checklist |
| Process | Tool-call correctness | Right tools, right args? | Validate calls vs schema/intent |
| Process | Trajectory match | Reasonable path? | Compare to expected tools (loosely) |
| Process | Step validity | Grounded reasoning? | Check steps cite real results |
| Efficiency | Step count | Wasteful detours? | Count tool calls / turns |
| Efficiency | Token / cost | Expensive path? | Sum usage across the run |
| Efficiency | Wall-clock | Slow path? | Time the run |

## Efficiency metrics: the third dimension

A correct-but-wasteful agent is a real problem at scale. Track efficiency alongside outcome and process:

- **Step count** — number of tool calls or turns to complete. Fewer is generally better, but watch for the agent that "succeeds" in two steps by skipping necessary verification. Compare against a reasonable expected range, not just "lower is better."
- **Token cost** — total input + output tokens across the whole run, including reasoning tokens. Multi-step agents accumulate context fast; an inefficient path can cost many times an efficient one. (See our guide on measuring LLM cost and latency.)
- **Wall-clock time** — end-to-end duration, which scales with step count and per-step latency.
- **Redundant work** — repeated identical tool calls, re-reading the same file, re-deriving known facts. A sign of poor context use.

Efficiency metrics rarely gate releases on their own, but a regression in step count or token cost with flat success rate is a real regression — the agent got more expensive for the same result.

## Step-level scoring in practice

To score trajectories you need the run's structured trace: the ordered list of tool calls (name, arguments, result) and the agent's intermediate reasoning. Most agent frameworks emit this as an event stream. With the trace in hand:

\`\`\`python
# trajectory_eval.py — score one agent run on outcome + process + efficiency
def evaluate_run(trace, case, check_end_state, judge) -> dict:
    tool_calls = [e for e in trace if e["type"] == "tool_use"]

    # OUTCOME: check reality against success criteria
    outcome = check_end_state(case["success"]["end_state"])  # True/False or fraction

    # PROCESS: were required tools used, with valid args?
    used = {c["name"] for c in tool_calls}
    required = set(case["success"].get("expected_tools", []))
    tools_covered = required.issubset(used) if required else None
    bad_args = sum(1 for c in tool_calls if not args_valid(c))   # schema/intent check
    hallucinated = sum(1 for c in tool_calls if c["name"] not in KNOWN_TOOLS)

    # EFFICIENCY
    steps = len(tool_calls)
    tokens = sum(e.get("tokens", 0) for e in trace)

    return {
        "success": outcome,
        "tools_covered": tools_covered,
        "bad_arg_calls": bad_args,
        "hallucinated_tool_calls": hallucinated,
        "steps": steps,
        "tokens": tokens,
    }
\`\`\`

Two scoring styles for the process axis:

- **Programmatic checks** (above) for verifiable things: tool existence, argument schema validity, required-tool coverage, redundant calls. Cheap, deterministic, run on every case.
- **LLM-as-judge rubric** for holistic path quality: "Did the agent take a sensible approach? Was its reasoning grounded in tool results? Did it recover from errors?" Use a structured rubric with explicit criteria, run the judge at low temperature, and pin its version — the same discipline that keeps any [LLM judge](/blog) stable. The judge handles the judgment calls that rules cannot encode.

Combine them: programmatic checks catch the mechanical errors, the judge grades the qualitative path.

## Handling non-determinism and multiple valid paths

Agent runs are doubly non-deterministic — the underlying model varies, and small variations compound across many steps, so two runs of the same task can take quite different paths and still both succeed. Two consequences:

- **Do not over-fit to one reference trajectory.** Exact-sequence matching punishes valid alternative paths. Prefer "were the necessary tool calls present and were the bad ones absent?" over "did the order match exactly?" Outcome plus loose process checks are more robust than rigid trajectory matching.
- **Repeat runs and aggregate.** Run each task several times and report success rate and consistency, not a single pass/fail. A task that succeeds 3/5 times is telling you the agent is unreliable there — that is the finding. Mean step count and token cost across repeats are more trustworthy than a single sample.

This mirrors the broader advice for [taming non-determinism in evals](/blog): measure distributions, assert on meaning and outcomes, and treat low consistency as a real signal rather than averaging it away.

## A practical rubric to start with

If you are building agent evaluation from scratch, this layered rubric covers the essentials without over-engineering:

1. **Task success rate** (gate this) — fraction of tasks meeting end-state criteria, over N repeats.
2. **Tool-call correctness** — required tools covered, zero hallucinated tools, low bad-argument rate.
3. **Step validity** — intermediate reasoning grounded in actual tool results (LLM-judge).
4. **Efficiency** — step count and token cost within a reasonable band of baseline; flag regressions.
5. **Consistency** — per-task success consistency across repeats; investigate persistently low ones.

Gate releases primarily on success rate and tool-call correctness; track efficiency and consistency as regression signals. Browse runnable agent-evaluation skills in the [skills directory](/skills) and compare frameworks that capture and score traces on the [comparison hub](/compare); for the multi-agent case (handoffs, orchestration), see our multi-agent system testing guide on the [blog](/blog).

## Frequently Asked Questions

### What is the difference between outcome and trajectory evaluation?

Outcome evaluation checks only the final result — did the agent achieve the task's success criteria? Trajectory evaluation also scores the process: the sequence of tool calls, arguments, and reasoning the agent used to get there. You need both because an agent can reach the right answer through a fragile, wasteful, or lucky path that will fail next time, and a near-perfect path can still miss the goal by one step.

### How do I check tool-call correctness?

Validate each call against several criteria: was the right tool selected for the step, are the arguments well-formed and on-target for the tool's schema, did the agent avoid calling non-existent tools or inventing parameters, and were the required tools for the task all covered. Many of these checks are programmatic and deterministic — run them on every case — while holistic "was this a sensible call?" judgment can be delegated to an LLM-as-judge rubric.

### Should I compare against an expected trajectory?

Use it loosely, not strictly. Exact-sequence matching punishes valid alternative paths, and most agent tasks have more than one correct route. A better question than "did the order match exactly?" is "did the run include the necessary tool calls and avoid the bad ones?" Reserve tight trajectory matching for tasks where genuinely one canonical path exists, and lean on outcome plus loose process checks otherwise.

### How do I measure agent efficiency?

Track step count (number of tool calls or turns), total token cost across the whole run including reasoning tokens, and wall-clock time, plus redundant work like repeated identical calls. Compare these against a reasonable baseline band rather than assuming lower is always better — an agent that "succeeds" in too few steps may be skipping necessary verification. A rise in step count or token cost with flat success rate is a genuine regression.

### Why do agent evaluations need multiple runs per task?

Because agents are doubly non-deterministic: the underlying model varies, and small variations compound across many steps, so the same task can follow different paths and outcomes on different runs. A single pass/fail is noisy. Running each task several times and reporting success rate plus consistency gives a trustworthy picture, and a task that succeeds only 3 of 5 times is itself a finding — the agent is unreliable there.

### Can I use LLM-as-judge to score agent trajectories?

Yes, for the qualitative parts that rules cannot encode — whether the approach was sensible, the reasoning was grounded in tool results, and the agent recovered from errors. Give the judge a structured rubric with explicit criteria, run it at low temperature, and pin its version for stable scores. Combine it with programmatic checks (tool existence, argument validity, required-tool coverage) so the deterministic errors are caught cheaply and the judge handles the judgment calls.
`,
};
