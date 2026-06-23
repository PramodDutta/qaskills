import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Langfuse for LLM Observability: Tracing & Evals (2026 Guide)',
  description:
    'Complete 2026 guide to Langfuse for LLM observability. Learn tracing, sessions, scores, prompt management, datasets and LLM-as-judge evals with Python and TS code.',
  date: '2026-06-23',
  category: 'Guide',
  content: `
# Langfuse for LLM Observability: The Complete 2026 Guide to Tracing, Evaluation & Prompt Management

Shipping an LLM or agent application is easy. Understanding what it actually did in production is the hard part. A single user request can fan out into a dozen model calls, retrieval steps, tool invocations, and retries — and when the final answer is wrong, slow, or expensive, a plain log line tells you almost nothing about which link in that chain broke. Traditional APM tools were built for deterministic services where the same input always produces the same output. LLM systems are non-deterministic, token-priced, and prompt-driven, so they need an observability layer that understands traces, generations, token usage, prompts, and quality scores as first-class concepts.

Langfuse is the most widely adopted open-source platform built for exactly this problem. It gives you nested tracing of every step in an LLM pipeline, automatic capture of model inputs/outputs and token cost, a prompt management system with versioning, datasets for offline experiments, and a scoring system that supports human feedback, user signals, and automated LLM-as-a-judge evaluation. It runs as a managed cloud service or as a self-hosted Docker deployment you fully control, and it integrates with the OpenAI SDK, LangChain, LlamaIndex, and the OpenTelemetry ecosystem.

In this guide you will learn the core Langfuse data model, how to install and configure both the Python and TypeScript SDKs, how to instrument a function with the \`@observe\` decorator, how to trace a realistic RAG and agent pipeline, how to capture token usage and cost, how to attach scores and run model-based evaluations, how to manage prompts as versioned artifacts, and how to build datasets for repeatable offline experiments. By the end you should be able to take an opaque LLM app and turn it into something you can debug, measure, and improve with confidence. If you also test the generated outputs themselves, pair this with our guide to [RAG evaluation metrics](/blog/rag-evaluation-metrics-complete-2026).

## What Langfuse Is and Why LLM Observability Matters

Langfuse is an LLM engineering platform: an observability backend plus an SDK and UI purpose-built for generative AI applications. Where a tool like Datadog or Sentry treats your model call as an opaque HTTP request, Langfuse treats it as a structured \`generation\` with a model name, a prompt, a completion, token counts, latency, and a cost. It then nests those generations inside traces and sessions so you can reconstruct the full story of any single user interaction.

LLM observability matters because the failure modes are different from normal software. Your code can be bug-free and the app can still be broken: the model hallucinated, the retriever pulled irrelevant chunks, a prompt template regressed after an edit, an agent looped forever, or costs quietly tripled when someone switched to a larger model. None of these show up as exceptions. They show up as degraded quality, rising bills, and slow responses — symptoms you can only diagnose if you have captured the inputs, outputs, intermediate steps, and quality signals of every request.

Three forces make this urgent in 2026. First, apps are increasingly agentic, so a single request involves many model and tool calls that must be viewed together. Second, model pricing is per-token, so cost is a runtime property you have to measure, not a fixed infrastructure line item. Third, quality is subjective and drifts, so you need continuous evaluation rather than a one-time test pass. Langfuse addresses all three by unifying tracing, cost tracking, and evaluation in one place.

## Core Concepts: Traces, Observations, Generations, Sessions, and Scores

Langfuse has a small, composable data model. Understanding these five objects is the key to everything else.

A **trace** represents one end-to-end request — typically one user interaction. Inside a trace you record **observations**, which come in three flavors. A **span** is a unit of work with a duration (for example, a retrieval step or a tool call). A **generation** is a special span representing a single LLM call, carrying the model name, prompt, completion, token usage, and cost. An **event** is a point-in-time marker with no duration. Observations nest, so a span can contain child spans and generations, mirroring your call stack.

A **session** groups multiple traces that belong to one conversation or user journey — for example, every turn of a multi-message chat. A **score** is a numeric, categorical, or boolean quality signal attached to a trace, observation, or session; scores power your evaluation and analytics. Finally, every object can carry **metadata**, **tags**, and a **user ID** so you can slice your data by customer, feature, or experiment.

| Object | What it represents | Key fields |
|---|---|---|
| Trace | One end-to-end request / user interaction | id, name, input, output, userId, sessionId, tags, metadata |
| Span | A timed unit of work inside a trace | name, startTime, endTime, input, output, parent |
| Generation | A single LLM call (a specialized span) | model, input (prompt), output, usage (tokens), cost, modelParameters |
| Event | A point-in-time marker, no duration | name, timestamp, metadata |
| Session | A group of related traces (a conversation) | sessionId linking multiple traces |
| Score | A quality signal attached to a trace/observation/session | name, value, dataType, comment, source |

Because generations are just specialized spans, the entire structure is a tree of timed nodes with model calls at the leaves. The Langfuse UI renders this tree as a waterfall so you can see exactly where time and tokens were spent.

## Installation and Setup: Python and TypeScript, Cloud vs Self-Host

You can start on Langfuse Cloud (a free tier exists) or self-host. Either way you obtain three values from your project settings: a public key, a secret key, and a host URL. Set them as environment variables and the SDKs pick them up automatically.

\`\`\`bash
# Environment variables (works for both Python and TS SDKs)
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_HOST="https://cloud.langfuse.com"   # or your self-hosted URL
\`\`\`

Install the Python SDK (v3 is built on OpenTelemetry):

\`\`\`bash
pip install langfuse
\`\`\`

Install the TypeScript / JavaScript SDK:

\`\`\`bash
npm install @langfuse/core @langfuse/tracing @langfuse/otel
\`\`\`

For a quick self-hosted instance, Langfuse ships a Docker Compose setup. This is ideal when your data cannot leave your infrastructure for compliance reasons:

\`\`\`bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up
# UI now available at http://localhost:3000
\`\`\`

Cloud is the fastest path to value and removes operational burden; self-hosting gives you full data residency and control at the cost of running Postgres, ClickHouse, and the worker services yourself. Many teams prototype on Cloud and migrate to self-hosted once they hit data-governance requirements.

## Instrumenting Code with the @observe Decorator

The fastest way to start tracing in Python is the \`@observe()\` decorator. Wrapping a function automatically creates a span for it, captures its arguments as the input and its return value as the output, and records its duration. Nesting decorated functions builds the trace tree for free.

\`\`\`python
from langfuse import observe, get_client

langfuse = get_client()

@observe()
def retrieve_context(question: str) -> list[str]:
    # pretend this hits a vector store
    return ["Langfuse traces LLM calls.", "Scores measure quality."]

@observe()
def build_prompt(question: str, docs: list[str]) -> str:
    context = "\\n".join(docs)
    return f"Answer using only this context:\\n{context}\\n\\nQuestion: {question}"

@observe(name="rag-pipeline")
def answer(question: str) -> str:
    docs = retrieve_context(question)
    prompt = build_prompt(question, docs)
    # ... call the model, return the answer
    return "Langfuse records the full trace tree automatically."

result = answer("What does Langfuse do?")
langfuse.flush()  # ensure events are sent before the process exits
\`\`\`

Here the outer \`answer\` call becomes the root span of a trace named \`rag-pipeline\`, and \`retrieve_context\` and \`build_prompt\` become nested child spans. You did not write any manual tracing code — the decorator handled it. The \`get_client()\` call returns the global Langfuse client, which you use for explicit operations like flushing or scoring. Always call \`flush()\` in short-lived scripts and serverless functions so buffered events are delivered before the runtime shuts down.

To enrich the current trace from inside a decorated function — for example to set the user ID, session, or tags — use the client's update helpers:

\`\`\`python
@observe()
def answer(question: str, user_id: str) -> str:
    langfuse.update_current_trace(
        user_id=user_id,
        session_id="conversation-42",
        tags=["production", "rag"],
        metadata={"feature": "support-bot"},
    )
    return "..."
\`\`\`

## Capturing Generations with Input, Output, and Token Usage

The \`@observe\` decorator traces your functions, but the most valuable observation is the **generation** — the LLM call itself. When you use a supported integration (covered later), generations are captured automatically. When you call a model manually, you create the generation yourself so Langfuse records the model, prompt, completion, token usage, and cost.

\`\`\`python
from langfuse import observe, get_client

langfuse = get_client()

@observe()
def call_model(prompt: str) -> str:
    # Create a generation as a child of the current observation
    with langfuse.start_as_current_generation(
        name="chat-completion",
        model="gpt-4o-mini",
        input=[{"role": "user", "content": prompt}],
        model_parameters={"temperature": 0.2, "max_tokens": 256},
    ) as generation:
        # ... your real model call goes here ...
        completion = "Langfuse aggregates token usage and cost per generation."
        usage = {"input": 42, "output": 18, "total": 60}

        generation.update(
            output=completion,
            usage_details=usage,
        )
        return completion
\`\`\`

By passing \`usage_details\` with input and output token counts, Langfuse computes cost using its built-in model pricing table (you can also define custom model prices in the UI for fine-tuned or self-hosted models). The dashboard then shows total tokens and dollars per trace, per user, per model, and over time — turning cost from an end-of-month surprise into a live metric you can alert on. Capturing latency is automatic from the span's start and end times, so you get a p50/p95 latency view per generation without extra work.

## Tracing a RAG and Agent Pipeline End to End

Real applications are more than a single model call. Consider a retrieval-augmented agent that retrieves documents, calls a model to decide on an action, invokes a tool, and then synthesizes a final answer. With nested observations, the entire flow becomes one readable trace.

\`\`\`python
from langfuse import observe, get_client

langfuse = get_client()

@observe(as_type="span")
def retrieve(query: str) -> list[str]:
    return ["doc-1: pricing is per token", "doc-2: traces nest as a tree"]

@observe(as_type="span")
def run_tool(tool_name: str, args: dict) -> str:
    return f"result of {tool_name}({args})"

@observe()
def generate_answer(query: str, docs: list[str]) -> str:
    with langfuse.start_as_current_generation(
        name="synthesize",
        model="gpt-4o",
        input={"query": query, "docs": docs},
    ) as gen:
        answer = "Synthesized answer grounded in retrieved docs."
        gen.update(output=answer, usage_details={"input": 320, "output": 64})
        return answer

@observe(name="support-agent")
def agent(query: str, user_id: str) -> str:
    langfuse.update_current_trace(user_id=user_id, session_id="sess-7")
    docs = retrieve(query)
    tool_out = run_tool("lookup_order", {"id": 1234})
    return generate_answer(query, docs + [tool_out])

agent("Where is my order?", user_id="user-99")
langfuse.flush()
\`\`\`

In the Langfuse UI this renders as a waterfall: the \`support-agent\` root, then \`retrieve\`, \`run_tool\`, and a \`synthesize\` generation beneath it, each with its own duration and payload. When the agent returns a wrong answer, you can open the trace and immediately see whether retrieval missed the relevant document, the tool returned bad data, or the model ignored the context. This is the difference between guessing and debugging. For deeper agent-specific testing patterns, see our writeup on [autonomous testing agents](/blog/autonomous-testing-agents-build-vs-buy) — wait, focus on what matters: trace-driven debugging is the foundation everything else builds on.

## Scoring and Evaluations: Manual, LLM-as-Judge, and User Feedback

Tracing tells you what happened; **scores** tell you whether it was any good. A score is a named quality signal attached to a trace, observation, or session. Scores come from three main sources, and a mature LLM app uses all three.

**Manual / human annotation** is the gold standard: domain experts review traces in the Langfuse UI and assign scores (correctness, helpfulness, tone). **User feedback** captures implicit and explicit signals from real users — a thumbs up, a copy-to-clipboard, a regenerate click — submitted from your frontend. **Model-based evaluation (LLM-as-a-judge)** uses another model to grade outputs against a rubric, which scales to thousands of traces that humans could never review by hand.

You attach a score programmatically with \`create_score\`:

\`\`\`python
from langfuse import get_client

langfuse = get_client()

# Score the trace you just produced (e.g., from user feedback)
langfuse.create_score(
    trace_id="trace-abc-123",
    name="user_feedback",
    value=1,                 # 1 = thumbs up, 0 = thumbs down
    data_type="BOOLEAN",
    comment="User clicked thumbs up",
)

# A numeric quality score from an LLM judge
langfuse.create_score(
    trace_id="trace-abc-123",
    name="faithfulness",
    value=0.92,
    data_type="NUMERIC",
    comment="Answer is grounded in retrieved context",
)
\`\`\`

For LLM-as-a-judge, you typically run a second model with a grading prompt over the captured input and output, parse its verdict, and write it back as a score. Langfuse also offers managed evaluators you configure in the UI to run automatically on incoming production traces (online evaluation) or against datasets (offline evaluation). The principles of designing good judge rubrics carry over directly from frameworks like OpenAI Evals; see our [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) for rubric design patterns you can reuse inside Langfuse evaluators.

A simple LLM-as-judge loop looks like this:

\`\`\`python
@observe(name="llm-judge")
def judge(question: str, answer: str) -> float:
    rubric = (
        "Rate 0.0-1.0 how faithful the answer is to the question. "
        "Return only a number."
    )
    # call your judge model with rubric + question + answer, parse the float
    verdict = 0.88
    langfuse.update_current_trace(metadata={"judge_rubric": "faithfulness"})
    return verdict
\`\`\`

## Prompt Management and Versioning

Prompts are code, and editing them in scattered string literals causes silent regressions. Langfuse Prompt Management stores prompts as versioned artifacts you edit in the UI, deploy with labels (like \`production\` or \`staging\`), and fetch at runtime from the SDK with caching. Crucially, when you fetch a prompt and use it in a generation, Langfuse links that generation back to the exact prompt version — so your analytics and scores are attributable to a specific prompt revision.

\`\`\`python
from langfuse import get_client

langfuse = get_client()

# Fetch the production version of a named prompt (cached client-side)
prompt = langfuse.get_prompt("support-answer", label="production")

# Compile it with variables
compiled = prompt.compile(question="Where is my order?", tone="friendly")

with langfuse.start_as_current_generation(
    name="answer",
    model="gpt-4o-mini",
    input=compiled,
    prompt=prompt,        # links this generation to the prompt version
) as gen:
    gen.update(output="...", usage_details={"input": 50, "output": 20})
\`\`\`

Because the SDK caches prompts locally and refreshes in the background, fetching a prompt does not add latency to your hot path, and a Langfuse outage will not take down your app — it falls back to the cached version. When you ship a prompt change, you can compare the new version's quality scores and cost against the old one directly in the dashboard, making prompt iteration measurable instead of a leap of faith.

## Datasets and Offline Experiments

Online observation catches problems after they reach users. **Datasets** let you catch them before. A dataset is a collection of items, each with an input and an optional expected output. You run your current application (or a candidate version) over every item, capture the outputs as a linked trace, attach scores, and compare runs side by side — a repeatable offline experiment, essentially a regression test suite for quality.

\`\`\`python
from langfuse import get_client

langfuse = get_client()

# Create a dataset and add items (do this once)
langfuse.create_dataset(name="support-qa")
langfuse.create_dataset_item(
    dataset_name="support-qa",
    input={"question": "How is cost calculated?"},
    expected_output="Cost is computed per token using model pricing.",
)

# Run an experiment over the dataset
dataset = langfuse.get_dataset("support-qa")
for item in dataset.items:
    with item.run(run_name="v2-prompt") as root_span:
        output = answer(item.input["question"])   # your app under test
        root_span.update(output=output)
        langfuse.create_score(
            trace_id=root_span.trace_id,
            name="exact_match",
            value=1 if output == item.expected_output else 0,
            data_type="BOOLEAN",
        )
langfuse.flush()
\`\`\`

Each \`run_name\` becomes a column in the dataset's comparison view, so you can prove that \`v2-prompt\` actually beats \`v1-prompt\` on aggregate scores before promoting it to production. This is the same discipline that frameworks like Promptfoo and DeepEval bring to prompt testing; our comparison of [Promptfoo vs DeepEval](/blog/promptfoo-vs-deepeval-2026) is worth reading if you want a dedicated test runner alongside Langfuse's experiment view.

## Integrating with LangChain and the OpenAI SDK

You rarely instrument every generation by hand. Langfuse ships drop-in integrations that auto-capture generations. For the OpenAI SDK in Python, swap the import and every call is traced automatically with model, tokens, and cost:

\`\`\`python
# Instead of: from openai import OpenAI
from langfuse.openai import OpenAI

client = OpenAI()  # same API, now auto-traced into Langfuse

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Summarize Langfuse in one line."}],
)
\`\`\`

For LangChain, attach the Langfuse callback handler and every chain, retriever, and LLM step becomes a nested observation:

\`\`\`python
from langfuse.langchain import CallbackHandler

handler = CallbackHandler()
chain.invoke(
    {"question": "What is a trace?"},
    config={"callbacks": [handler]},
)
\`\`\`

In TypeScript, the SDK builds on OpenTelemetry. You register the Langfuse span processor once and then wrap or observe your functions:

\`\`\`typescript
import { LangfuseClient } from "@langfuse/core";
import { observe } from "@langfuse/tracing";

const langfuse = new LangfuseClient();

const answer = observe(
  async (question: string): Promise<string> => {
    // your model call here; return value is captured as output
    return "Langfuse works in TypeScript too.";
  },
  { name: "answer" },
);

await answer("Does the TS SDK trace?");

// Attach a score from your backend or frontend feedback
await langfuse.score.create({
  traceId: "trace-abc-123",
  name: "user_feedback",
  value: 1,
  dataType: "BOOLEAN",
});

await langfuse.flushAsync();
\`\`\`

Because the TS SDK speaks OpenTelemetry, it also slots into existing OTel pipelines, letting you correlate LLM traces with the rest of your application's distributed tracing.

## Langfuse vs LangSmith, Phoenix, and Helicone

Langfuse is not the only player. The right choice depends on whether you want open source, how deep your evaluation needs go, and whether you want a proxy or an SDK.

| Capability | Langfuse | LangSmith | Arize Phoenix | Helicone |
|---|---|---|---|---|
| License | Open source (MIT core) | Proprietary (SaaS) | Open source | Open source |
| Self-host | Yes (Docker / Helm) | Limited (enterprise) | Yes | Yes |
| Integration style | SDK + OTel + integrations | SDK (LangChain-first) | SDK + OTel | Proxy (gateway) + SDK |
| Tracing | Nested traces, sessions | Nested traces | Nested traces (OTel) | Request-level logs |
| Prompt management | Yes, versioned | Yes | Limited | Basic |
| Datasets & experiments | Yes | Yes | Yes (strong eval) | Limited |
| LLM-as-judge evals | Yes (managed + custom) | Yes | Yes (strong) | Basic |
| Best for | Full-stack open-source LLMOps | Teams deep in LangChain | Eval-heavy / research | Quick cost & caching via proxy |

In short: choose **Langfuse** when you want a complete, open-source observability and evaluation platform you can self-host. Choose **LangSmith** if your stack is heavily LangChain and you are happy with a managed proprietary tool. Choose **Phoenix** when evaluation and embedding analysis are your priority, especially in research settings. Choose **Helicone** when you mainly want a zero-code proxy for cost tracking and caching. Many teams even run Helicone as a gateway and Langfuse for tracing and evals together.

## Production Best Practices

A few habits separate a useful Langfuse setup from a noisy one. **Always flush** in serverless and short-lived processes so events are not lost on shutdown. **Set user and session IDs** on every trace so you can debug specific customers and reconstruct conversations. **Use tags and metadata** to mark environment, feature, and experiment, then filter on them in the dashboard. **Link prompts to generations** so quality and cost are attributable to a prompt version.

Be deliberate about data: redact or mask PII before it reaches Langfuse if you have compliance obligations, and use sampling for extremely high-volume, low-value traffic to control storage. Run **online evaluations** on a sample of production traffic to catch drift early, and run **offline dataset experiments** in CI before every prompt or model change so quality regressions block the deploy. Treat scores as the metrics you alert on — a sudden drop in your \`faithfulness\` score is your earliest warning that something regressed. Finally, remember that observability is a security surface too: traces capture user inputs and model outputs verbatim, so apply the same handling you would to any sensitive log. Our guide to [security testing AI-generated code](/blog/security-testing-ai-generated-code) covers the threat model for the code these systems produce.

## Frequently Asked Questions

### What is Langfuse used for?

Langfuse is an open-source LLM engineering platform used to observe, debug, evaluate, and improve LLM and agent applications. It captures nested traces of every model call, tool use, and retrieval step, tracks token usage and cost, manages versioned prompts, and runs evaluations through human feedback, user signals, and LLM-as-a-judge scoring across both development and production.

### Is Langfuse free and open source?

Yes. The Langfuse core is open source under a permissive license and can be fully self-hosted with Docker or Helm at no licensing cost. Langfuse also offers a managed cloud service with a free tier for getting started, plus paid tiers for higher volume and team features. Self-hosting gives you complete data control; cloud removes operational overhead.

### How is Langfuse different from LangSmith?

Both trace and evaluate LLM apps, but Langfuse is open source and self-hostable while LangSmith is a proprietary SaaS tied closely to the LangChain ecosystem. Langfuse integrates broadly via its SDK, the OpenAI SDK, LangChain callbacks, and OpenTelemetry, so it is framework-agnostic. Teams who want full data ownership or use frameworks beyond LangChain typically prefer Langfuse.

### How does Langfuse track token usage and cost?

When you record a generation, you pass the input and output token counts in the usage details, or an integration captures them automatically. Langfuse then multiplies those tokens by its built-in model pricing table to compute cost per call. You can define custom prices for fine-tuned or self-hosted models. The dashboard aggregates cost per trace, user, model, and time period.

### What is the @observe decorator in Langfuse?

\`@observe()\` is a Python decorator that automatically traces a function: it creates a span, captures the function arguments as input and the return value as output, and records the duration. Nesting decorated functions builds the full trace tree without manual instrumentation. You can mark a function as a generation and enrich the current trace with user IDs, sessions, tags, and metadata from inside it.

### Can Langfuse run LLM-as-a-judge evaluations?

Yes. Langfuse supports model-based evaluation where a second LLM grades outputs against a rubric and writes the verdict back as a score. You can run these as managed evaluators in the UI on a sample of live production traces (online evaluation) or against curated datasets (offline evaluation). Scores then drive dashboards, alerts, and side-by-side experiment comparisons.

### Does Langfuse work with TypeScript and JavaScript?

Yes. Langfuse provides a TypeScript/JavaScript SDK built on OpenTelemetry. You install the core, tracing, and OTel packages, register the Langfuse span processor, and use \`observe()\` to wrap functions or create generations and scores directly. Because it is OTel-based, it integrates with existing distributed tracing pipelines, letting you correlate LLM traces with the rest of your service telemetry.

### How do I get started with Langfuse quickly?

Sign up for Langfuse Cloud or run \`docker compose up\` from the cloned repo to self-host. Copy your public key, secret key, and host URL into environment variables, install the SDK with \`pip install langfuse\` or the npm packages, and add \`@observe()\` to a function or swap to \`from langfuse.openai import OpenAI\`. Trigger a request, then open the UI to see your first trace.

## Conclusion

LLM and agent applications fail in ways traditional monitoring can't see: hallucinations, irrelevant retrievals, prompt regressions, runaway loops, and silent cost creep. Langfuse turns these invisible failures into something you can inspect, measure, and fix. With nested tracing you can reconstruct any request end to end; with automatic token and cost capture you make spending a live metric; with prompt management you version your most important inputs; with datasets and scores — including LLM-as-a-judge — you make quality a number you can track and gate deploys on. Whether you run it on the cloud or self-host the open-source stack, Langfuse gives you the observability and evaluation backbone serious LLM engineering needs in 2026.

Start small: instrument one endpoint with \`@observe\`, capture a few generations, attach a user-feedback score, and watch the trace tree appear. Then layer on prompt management, datasets, and automated evals as your app matures.

Ready to level up your testing and evaluation workflow? Explore the curated tools, evaluators, and skills for AI agents in the [QASkills directory](/skills) and equip your agents to build, trace, and verify LLM systems with confidence.
`,
};
