import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Inspect AI Evals Tutorial (UK AISI) — 2026 Guide",
  description: "Inspect AI tutorial for 2026: build LLM evals with Task, dataset, solver, and scorer using the UK AI Safety Institute framework, plus CLI usage and examples.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Inspect AI Evals Tutorial (UK AISI) — 2026 Guide

Inspect (also called Inspect AI) is an open-source framework for evaluating large language models, created by the UK AI Safety Institute (AISI). You write evals in Python as **Tasks**, where each Task combines a **dataset** of samples, one or more **solvers** that determine how the model is prompted (including multi-step agents and tool use), and a **scorer** that grades the model's answers. You then run the eval from the command line with \`inspect eval\`, which produces a rich, viewable log of every sample, transcript, and score. Inspect is model-agnostic, supports tool-using agents, and is built for rigorous, reproducible evaluation.

This tutorial covers installation, the Task/dataset/solver/scorer model with real Python code, running and viewing evals, multi-model comparison, and common pitfalls. Inspect is actively developed, so use the patterns here as accurate structure and confirm exact function arguments against the official Inspect documentation before relying on specifics.

## What makes Inspect different

Inspect comes from a government AI safety institute and reflects that lineage: it prioritizes **rigor, transparency, and reproducibility** over a hosted dashboard product. Its distinguishing traits are:

- **Code-first and open source** — evals are plain Python, version-controlled with your project, no account required.
- **First-class agents and tools** — solvers can give the model tools (bash, Python, web), making it well suited to evaluating agentic behavior, not just single-turn Q&A.
- **A powerful log viewer** — every run writes a detailed log you can open to inspect each sample's full transcript, the messages exchanged, tool calls, and the scorer's reasoning.
- **Provider-agnostic** — the same Task runs against many model providers by changing one \`--model\` flag.

If your goal is research-grade, auditable evaluation — especially of safety-relevant or agentic capabilities — Inspect is purpose-built for it. For a gentler conceptual on-ramp to evaluation in general, see our [AI agent evaluation overview](/blog).

## Installation

Inspect is a Python package:

\`\`\`bash
pip install inspect-ai
\`\`\`

You also need access to at least one model provider. Inspect reads provider credentials from environment variables, following each provider's conventions:

\`\`\`bash
# Examples — set whichever provider(s) you will evaluate
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
\`\`\`

Verify the install and see available options:

\`\`\`bash
inspect --help
\`\`\`

With a key in place, you are ready to write a Task.

## The four building blocks

Inspect evals are composed from four concepts. Understanding how they fit together is the whole framework:

| Concept | Role |
|---|---|
| **Sample** | One test case: an \`input\` (the prompt) and usually a \`target\` (the correct answer). |
| **Dataset** | A collection of Samples, loaded from a list, CSV, JSON, or Hugging Face. |
| **Solver** | The strategy for producing an answer — e.g. prompt template, chain-of-thought, multi-turn agent with tools. Solvers are composable. |
| **Scorer** | Grades the model's output against the target, producing a score and an explanation. |

A **Task** ties these together: \`Task(dataset=..., solver=..., scorer=...)\`. You decorate a function with \`@task\` so the CLI can discover and run it.

## A minimal Task

Here is a complete, runnable eval that checks whether the model answers simple factual questions, using exact matching:

\`\`\`python
from inspect_ai import Task, task
from inspect_ai.dataset import Sample
from inspect_ai.solver import generate
from inspect_ai.scorer import match

@task
def capitals():
    return Task(
        dataset=[
            Sample(input="What is the capital of France?", target="Paris"),
            Sample(input="What is the capital of Japan?", target="Tokyo"),
            Sample(input="What is the capital of Brazil?", target="Brasilia"),
        ],
        solver=generate(),       # just call the model once
        scorer=match(),          # check the answer contains the target
    )
\`\`\`

Three pieces map directly to the table above: the \`dataset\` is a list of \`Sample\`s, the \`solver\` is the built-in \`generate()\` (a single model call), and the \`scorer\` is the built-in \`match()\` (substring/exact matching against the target). You run it from the CLI, choosing a model:

\`\`\`bash
inspect eval capitals.py --model openai/gpt-4o
\`\`\`

Inspect executes every sample, scores it, prints a summary, and writes a log file.

## Solvers in depth

A **solver** controls *how* the model is asked to produce an answer. The simplest is \`generate()\`, but solvers are composable: you chain them so each transforms the conversation state before the next runs. Common built-in solvers include a system-message setter, a prompt template, chain-of-thought, multiple-choice formatting, and self-critique.

\`\`\`python
from inspect_ai.solver import system_message, prompt_template, generate

solver = [
    system_message("You are a careful, concise expert."),
    prompt_template("Answer the following question step by step:\\n\\n{prompt}"),
    generate(),
]
\`\`\`

The real power shows when you build **agents**. A solver can grant the model tools and let it loop — calling tools, reading results, and acting again — until it produces a final answer. This is how Inspect evaluates agentic tasks such as solving a coding problem in a sandbox:

\`\`\`python
from inspect_ai.solver import use_tools, generate
from inspect_ai.tool import bash, python

solver = [
    use_tools([bash(), python()]),  # give the model a shell and Python
    generate(),                      # let it call tools and reason in a loop
]
\`\`\`

Because solvers are just composable functions over the message state, you can also write your own to encode any prompting strategy or agent scaffold your application uses — which means your eval can mirror your real system.

## Scorers in depth

A **scorer** decides whether an output is correct and returns a score plus an explanation. Built-in scorers cover the common cases:

- \`match()\` / \`includes()\` — the output matches or contains the target string.
- \`pattern()\` — a regular expression extracts and checks the answer.
- \`choice()\` — for multiple-choice tasks, checks the selected option.
- \`model_graded_qa()\` / \`model_graded_fact()\` — **LLM-as-judge**: a grader model decides whether the answer is correct against the target or a rubric. Essential for open-ended responses.

\`\`\`python
from inspect_ai.scorer import model_graded_qa

# Use a model to grade open-ended answers against the target
scorer = model_graded_qa()
\`\`\`

You can write custom scorers too. A scorer receives the sample's target and the model's output and returns a \`Score\`. Use deterministic scorers (\`match\`, \`pattern\`, \`choice\`) wherever the answer is well-defined, and reserve model-graded scorers for genuinely open-ended quality — they cost tokens and can be noisy, so give the grader a precise rubric.

## Datasets from files

Inline samples are fine for demos; real evals load datasets from files or Hugging Face. Inspect provides loaders that map columns to the \`input\`/\`target\` fields:

\`\`\`python
from inspect_ai.dataset import csv_dataset, FieldSpec

dataset = csv_dataset(
    "questions.csv",
    FieldSpec(input="question", target="answer"),
)
\`\`\`

This separation of data from logic is what makes evals reproducible and growable: when you find a failure case in production, you append it to the CSV and it becomes a permanent regression test. The same discipline QA engineers apply to test fixtures applies here.

## Running evals and the log viewer

The CLI is how you run everything. Useful invocations:

\`\`\`bash
# Run against a specific model
inspect eval capitals.py --model anthropic/claude-3-5-sonnet-latest

# Limit to a few samples while developing
inspect eval capitals.py --model openai/gpt-4o --limit 5

# Run a task multiple times per sample (for stochastic stability)
inspect eval capitals.py --model openai/gpt-4o --epochs 3
\`\`\`

After a run, Inspect writes a structured log. Open the interactive viewer to inspect everything:

\`\`\`bash
inspect view
\`\`\`

The viewer shows each sample's full transcript — the system and user messages, the model's responses, any tool calls and their outputs, and the scorer's verdict with its reasoning. This transparency is one of Inspect's biggest strengths: when a sample fails, you can see *exactly* what the model did and why the scorer marked it wrong, rather than staring at an aggregate number.

## Comparing models

Because the Task is model-agnostic, comparing providers is a one-flag change. Run the same eval against several models and compare their logs:

\`\`\`bash
inspect eval mybench.py --model openai/gpt-4o
inspect eval mybench.py --model anthropic/claude-3-5-sonnet-latest
inspect eval mybench.py --model google/gemini-1.5-pro
\`\`\`

Each run produces its own log, and the viewer lets you review and compare scores across runs. This makes Inspect a practical harness for model selection: define your benchmark once, then objectively measure each candidate model on the tasks you actually care about. See how Inspect stacks up against other evaluation tooling on our [comparison hub](/compare).

## CI integration

To guard against regressions, run an Inspect eval in CI and fail when accuracy drops below a threshold. A GitHub Actions step:

\`\`\`yaml
name: inspect-eval
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install inspect-ai
      - name: Run eval
        run: inspect eval bench.py --model openai/gpt-4o --limit 50
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

To gate on a numeric threshold, read the run's log programmatically (Inspect can be driven from Python as well as the CLI) and exit non-zero if the aggregate score falls below your floor. Keep CI runs small and representative so they stay fast and cheap, and run the full dataset on a schedule.

## Common errors and troubleshooting

- **\`Model not found\` / auth errors** — the provider key environment variable is missing or the \`--model\` string uses the wrong \`provider/model\` format. Check the provider prefix.
- **Task not discovered** — the function must be decorated with \`@task\` and live in the file you pass to \`inspect eval\`.
- **Model-graded scores look random** — your grader prompt is too loose. Use \`model_graded_qa()\` with a clear rubric, lower the grader temperature, and inspect the grader's reasoning in the log viewer.
- **Agent tasks hang or loop forever** — tool-using solvers can loop; set a message or token limit so the agent terminates. Review the transcript in the viewer to see where it got stuck.
- **Flaky pass/fail across runs** — model stochasticity. Use \`--epochs\` to run each sample several times and aggregate, and lower temperature for deterministic tasks.

## When to choose Inspect

Choose Inspect when you want a rigorous, open-source, code-first framework with excellent transcript-level transparency and strong support for evaluating agents and tool use — particularly for safety-relevant work, given its AISI origin. If you instead want a hosted platform with a team dashboard, automatic experiment diffing, and production monitoring built in, a commercial evaluation platform may fit better; many teams use Inspect for deep local analysis alongside such a platform. Explore install-ready evaluation skills for AI coding agents at [/skills](/skills).

## Frequently Asked Questions

### What is Inspect AI?

Inspect (Inspect AI) is an open-source framework for evaluating large language models, created by the UK AI Safety Institute. You write evals in Python as Tasks that combine a dataset of samples, solvers that control how the model is prompted, and scorers that grade the answers, then run them from the command line. It is model-agnostic and built for rigorous, reproducible, transcript-transparent evaluation.

### What are the four main components of an Inspect eval?

An Inspect eval is built from samples, datasets, solvers, and scorers, tied together in a Task. A Sample is one test case with an input and a target; a Dataset is a collection of samples; a Solver determines how the model produces an answer (from a single call to a tool-using agent loop); and a Scorer grades the output against the target. The \`@task\`-decorated function returns a \`Task(dataset=..., solver=..., scorer=...)\`.

### How do I run an Inspect eval?

Run evals from the command line with \`inspect eval <file.py> --model <provider/model>\`, for example \`inspect eval capitals.py --model openai/gpt-4o\`. You can add \`--limit\` to run a subset while developing and \`--epochs\` to repeat each sample for stability. Afterward, open the interactive log viewer with \`inspect view\` to inspect every sample's full transcript and score.

### Is Inspect AI free and open source?

Yes. Inspect is open source and free to install via \`pip install inspect-ai\`. You do still need API access to at least one model provider to run evals against real models, and those provider calls incur the provider's own token costs. Confirm the current license and provider support in the official Inspect documentation.

### Can Inspect evaluate AI agents and tool use?

Yes, and this is one of its strengths. Solvers can grant the model tools such as a bash shell or a Python interpreter using \`use_tools(...)\`, then let the model loop — calling tools, reading results, and acting again — until it produces a final answer. This makes Inspect well suited to evaluating agentic and multi-step capabilities, not just single-turn question answering, with full tool-call transcripts visible in the log viewer.

### How does Inspect compare to a hosted eval platform?

Inspect is code-first, open source, and emphasizes transparency and reproducibility, with no hosted account required and a strong local log viewer. Hosted platforms add team dashboards, automatic experiment-to-experiment diffing, and built-in production monitoring. Many teams use Inspect for deep, auditable local evaluation — especially of agents and safety-relevant behavior — and a hosted platform when they need shared tracking and live observability.
`,
};
