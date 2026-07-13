import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Braintrust vs Langfuse: LLM Eval and Observability (2026)',
  description:
    'Braintrust vs Langfuse compared for 2026: eval workflows, tracing, datasets, scoring, CI, self-hosting, pricing shape, and TS + Python SDK examples to pick the right platform.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# Braintrust vs Langfuse: LLM Eval and Observability (2026)

If you are shipping an LLM feature in 2026, two platforms show up again and again on the shortlist: Braintrust and Langfuse. Both let you evaluate prompts, trace production calls, and manage datasets, but they come at the problem from different angles. Braintrust is an eval-first commercial platform built around the \`Eval()\` experiment loop and fast regression comparison. Langfuse is an open-source observability-first platform built around OpenTelemetry-style tracing, with evals layered on top and a fully self-hostable stack.

This guide compares the two across the dimensions that actually decide the purchase: eval ergonomics, tracing depth, dataset management, scoring, CI integration, self-hosting versus SaaS, pricing shape, and SDK experience in both TypeScript and Python. The tools move fast, so treat the code as accurate usage patterns and confirm exact argument names against the current docs before pinning versions.

## What each tool actually is

Braintrust is a commercial platform whose core unit is the experiment. You define a dataset, a task function that calls your model, and one or more scorers, then \`Eval()\` runs everything and renders scores, per-row diffs, and regressions in a polished web UI. Braintrust also ingests production logs so the same scorers can watch live traffic. Its opinionated strength is comparison: seeing whether prompt v2 beat prompt v1 on 500 rows in seconds.

Langfuse is an open-source LLM engineering platform. Its core unit is the trace: a tree of spans and generations captured from your app, with token counts, latency, cost, and model metadata attached. On top of tracing it adds prompt management, datasets, LLM-as-judge evaluators, and dashboards. The differentiator is that you can run the entire thing (web app, worker, Postgres, ClickHouse, Redis, object storage) on your own infrastructure under an MIT-licensed core.

The one-line framing: Braintrust optimizes for the eval-and-compare loop as a managed product, while Langfuse optimizes for open, self-hostable observability with evals attached. For the broader landscape see our [Langfuse LLM observability guide](/blog/langfuse-llm-observability-guide-2026) and [Braintrust LLM evaluation guide](/blog/braintrust-llm-evaluation-guide-2026).

## Feature matrix

| Dimension | Braintrust | Langfuse |
| --- | --- | --- |
| Primary focus | Evaluation and experiment comparison | Tracing and observability |
| License | Commercial (SaaS, hybrid deploy) | Open source (MIT core) plus paid cloud |
| Self-hosting | Hybrid: control plane SaaS, data plane self-hosted | Full self-host (Docker Compose, Helm, Kubernetes) |
| Tracing model | Spans and logs, eval-centric | OTel-style traces, spans, generations |
| Eval primitive | \`Eval()\` with task and scorers | Datasets plus experiment runs and evaluators |
| Prompt management | Playground plus prompt versioning | Prompt management with labels and versions |
| Built-in scorers | Autoevals library (LLM and heuristic) | LLM-as-judge templates plus custom |
| Dashboards | Experiment and monitoring views | Customizable dashboards and metrics |
| CI integration | \`Eval()\` in CI, comparison gating | SDK experiment runs plus CI assertions |
| SDKs | TypeScript, Python | Python, JS/TS, plus OpenTelemetry ingest |

## Eval workflows

Braintrust puts the eval front and center. You write a dataset (inline, from a file, or pulled from a Braintrust-hosted dataset), a task, and scorers, then run \`Eval()\`. Each run becomes a named experiment you can diff against any previous one.

Here is a minimal TypeScript eval:

\`\`\`ts
import { Eval } from 'braintrust';
import { Factuality, Levenshtein } from 'autoevals';

Eval('support-router', {
  data: () => [
    { input: 'How do I reset my password?', expected: 'account' },
    { input: 'My invoice is wrong', expected: 'billing' },
  ],
  task: async (input) => {
    const res = await classifyTicket(input);
    return res.category;
  },
  scores: [Factuality, Levenshtein],
});
\`\`\`

The same shape in Python:

\`\`\`python
from braintrust import Eval
from autoevals import Factuality

Eval(
    "support-router",
    data=lambda: [
        {"input": "How do I reset my password?", "expected": "account"},
        {"input": "My invoice is wrong", "expected": "billing"},
    ],
    task=lambda input: classify_ticket(input),
    scores=[Factuality],
)
\`\`\`

Langfuse approaches evals through datasets and experiment runs. You create a dataset of items, then loop over the items in your own code, run your task, and link each output back to the dataset run so Langfuse can aggregate scores.

\`\`\`python
from langfuse import Langfuse

langfuse = Langfuse()
dataset = langfuse.get_dataset("support-router")

for item in dataset.items:
    with item.run(run_name="prompt-v2") as root_span:
        output = classify_ticket(item.input)
        root_span.score_trace(name="exact_match", value=1.0 if output == item.expected_output else 0.0)
\`\`\`

The mental difference: Braintrust hands you a batteries-included runner and expects you to plug in a task and scorers. Langfuse hands you tracing primitives and a dataset abstraction, and you assemble the loop. Braintrust feels faster for pure offline eval; Langfuse feels more natural when the eval reuses the exact traced code path already running in production.

That distinction has a practical consequence for how the two evolve inside a team. With Braintrust, the eval is usually a standalone artifact: a file that imports \`Eval()\`, defines a dataset, and runs in CI or from the command line, cleanly separated from your application logic. That separation keeps evals tidy and easy to reason about, but it can drift from production if the task function in the eval diverges from the real code path. With Langfuse, because the eval loop reuses the same instrumented functions that serve live traffic, the eval is far less likely to test a stale version of your pipeline. The cost is that your eval and application code are more intertwined, so a refactor of the app can ripple into the eval. Teams that prize a clean testing boundary lean Braintrust; teams that prize eval-production parity lean Langfuse.

## Tracing and observability

This is where Langfuse leads. A Langfuse trace is a tree: a root span with nested spans and generation events, each carrying model name, prompt, completion, token usage, cost, and latency. The Python SDK offers a decorator so you can instrument functions without restructuring code.

\`\`\`python
from langfuse import observe, get_client

langfuse = get_client()

@observe()
def answer_question(question: str) -> str:
    context = retrieve(question)
    with langfuse.start_as_current_generation(
        name="llm-answer", model="gpt-4o"
    ) as gen:
        completion = call_llm(question, context)
        gen.update(output=completion, usage_details={"input": 900, "output": 120})
    return completion
\`\`\`

Because Langfuse speaks OpenTelemetry and OpenInference, you can also point existing instrumentation (from frameworks like LangChain, LlamaIndex, or the OpenAI SDK wrappers) at it and get traces without manual spans.

Braintrust also captures logs and traces, and its \`wrapOpenAI\` and \`traced\` helpers instrument calls, but the tracing exists mainly to feed evaluation and monitoring rather than to be a general-purpose distributed-tracing backend. If your primary need is deep, queryable production observability across a multi-step agent, Langfuse gives you more surface area. If tracing is mostly a way to capture examples to later evaluate, Braintrust is sufficient.

\`\`\`ts
import { wrapOpenAI, initLogger } from 'braintrust';
import OpenAI from 'openai';

initLogger({ projectName: 'support-bot' });
const client = wrapOpenAI(new OpenAI());

const res = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Summarize this ticket' }],
});
\`\`\`

## Dataset management

Both platforms treat datasets as first-class, versioned objects, but the workflows differ.

| Capability | Braintrust | Langfuse |
| --- | --- | --- |
| Create from UI | Yes | Yes |
| Create from SDK | Yes | Yes |
| Promote production logs to dataset | Yes, one click from a log row | Yes, add trace to dataset |
| Expected outputs | Optional per row | Optional per item |
| Versioning | Dataset versions per experiment | Dataset item versions |
| Human review workflows | Built-in review UI | Annotation queues |

Braintrust makes it easy to select interesting production log rows and push them into a golden dataset, then rerun evals against that curated set. Langfuse offers a similar path: any trace can be added to a dataset, and its annotation queues let human reviewers grade or correct outputs before they become eval targets. If your process is heavy on human-in-the-loop labeling, Langfuse annotation queues plus self-hosting keep sensitive data in house.

## Scoring and experiments

Braintrust ships the open-source Autoevals library, which includes LLM-as-judge scorers (Factuality, answer relevancy, moderation) and deterministic ones (Levenshtein, exact match, JSON diff, numeric closeness). Scorers return a number from 0 to 1 and can attach reasoning. A custom scorer is just a function:

\`\`\`ts
function containsCitation(args: { output: string }) {
  const hit = /\\[[0-9]+\\]/.test(args.output);
  return { name: 'has_citation', score: hit ? 1 : 0 };
}
\`\`\`

Langfuse scoring can be model-based (define an LLM-as-judge evaluator in the UI that runs automatically on incoming traces), programmatic (attach scores via the SDK), or human (annotation queues). A code-defined score in Python:

\`\`\`python
def has_citation(output: str) -> float:
    import re
    return 1.0 if re.search(r"\\[[0-9]+\\]", output) else 0.0

langfuse.score(trace_id=trace_id, name="has_citation", value=has_citation(answer))
\`\`\`

Braintrust wins on out-of-the-box scorer breadth and the experiment diff view, which lines up two runs row by row and highlights regressions. Langfuse wins on automatic online evaluation of live traffic, since you can configure a judge to sample production traces continuously. For a deeper comparison of eval frameworks that pair well with either, see [Promptfoo vs DeepEval](/blog/promptfoo-vs-deepeval-2026).

A subtle but important point about scoring is calibration. LLM-as-judge scorers are themselves models, and they drift, disagree with humans, and can be gamed by verbose or confident-sounding outputs. Both platforms let you mix judge scores with deterministic checks, and the mature pattern is to lean on cheap deterministic scorers (exact match, regex, JSON schema validation, latency and cost thresholds) for the properties you can specify precisely, and reserve LLM judges for the fuzzy properties like helpfulness or tone. Keep a small human-labeled sample as ground truth and periodically check that your judge agrees with humans on it. Both Braintrust and Braintrust's Autoevals, and Langfuse's annotation queues, support this discipline; the difference is where you spend your clicks. Braintrust makes the offline judge-versus-human comparison visual, while Langfuse makes the ongoing human annotation of live traffic a first-class queue.

## CI integration

Both fit into CI, but the ergonomics differ. Braintrust is designed so that running \`Eval()\` in CI produces a comparable experiment, and you can fail the build if scores drop below a threshold or regress against the main baseline.

\`\`\`ts
import { Eval } from 'braintrust';

const summary = await Eval('pr-gate', {
  data: goldenSet,
  task: runPrompt,
  scores: [Factuality],
});

const avg = summary.scores.Factuality?.score ?? 0;
if (avg < 0.8) {
  console.error(\`Factuality \${avg} below 0.8 gate\`);
  process.exit(1);
}
\`\`\`

Langfuse experiment runs work similarly: loop the dataset in a test, compute aggregate scores, and assert. Because Langfuse is SDK-driven, you often wrap the run inside pytest and assert on the returned metrics, which suits teams that already gate on pytest. Either way the pattern is the same: a curated dataset, a task, scorers, and a numeric gate. Our [DeepEval LLM testing guide](/blog/deepeval-llm-testing-guide-2026) shows a pytest-native take on the same idea if you prefer assertions living entirely in your test suite.

## Self-hosting, SaaS, and pricing

This pair of concerns is often the deciding factor, so it is worth treating deployment and cost together because they trade against each other.

| Concern | Braintrust | Langfuse |
| --- | --- | --- |
| Fully open source | No | Yes (MIT core) |
| Cloud offering | Yes | Yes |
| Self-host model | Hybrid: control plane SaaS, data in your VPC | Full self-host, no vendor dependency |
| Air-gapped deploy | Limited | Possible with self-host |
| Ops burden self-hosted | Lower (data plane only) | Higher (full stack: Postgres, ClickHouse, Redis, S3) |

Braintrust offers a hybrid model: the control plane stays on Braintrust while your prompts and completions can live in your own cloud, which reduces data-egress worry without you running the whole product. Langfuse can be fully self-hosted, and for regulated environments that need everything inside their own perimeter with no third-party dependency, that is decisive. The trade is operational: a production Langfuse deployment means running and upgrading several stateful services (a web app, an async worker, Postgres, ClickHouse for analytics, Redis, and object storage). If your team lacks that appetite, Langfuse Cloud or Braintrust removes the burden and hands you a maintained service instead.

There is also a compliance angle that goes beyond a simple hosted-versus-self-hosted binary. If your prompts or completions contain regulated data (health records, financial details, or personal information under strict residency rules), the question is not only who runs the software but where the payloads physically rest. Braintrust's hybrid split lets sensitive completions stay in your cloud while the comparison UI and orchestration run as a service. Full self-hosted Langfuse keeps everything inside your perimeter, which is the strongest posture for air-gapped or sovereignty-constrained environments. Weigh that against the engineering hours a self-run stack consumes over a year, because those hours are a real and recurring cost.

On pricing, neither list is worth quoting exactly because both change, but the shape is stable. Braintrust prices around usage of the platform: scores or spans processed and seats, with a free tier for small projects and enterprise plans for hybrid deploy and SSO. Langfuse has an open-source tier that is free forever if self-hosted (you pay only your own infra), plus a cloud offering priced on ingested events or units with paid tiers for higher retention, more users, and enterprise features.

The practical read: if you want zero platform cost and control your own infra, self-hosted Langfuse is the cheapest floor, trading money for ops time. If you want the fastest path to a polished eval-comparison workflow with minimal setup, Braintrust's managed product earns its fee. A useful budgeting exercise is to estimate your monthly ingested events and multiply by each vendor's unit price, then add the fully loaded cost of an engineer's time for self-hosting, so the comparison is apples to apples. Always confirm current numbers on each vendor's pricing page before committing, since both revise tiers regularly.

## Use-case fit

| If you are... | Lean toward |
| --- | --- |
| Running frequent offline evals and A/B prompt comparisons | Braintrust |
| Needing deep production tracing across multi-step agents | Langfuse |
| Required to keep all data on your own infrastructure | Langfuse (self-host) |
| Wanting minimal ops and a polished comparison UI | Braintrust |
| Doing heavy human-in-the-loop annotation | Langfuse annotation queues |
| Already emitting OpenTelemetry or OpenInference spans | Langfuse |
| Gating PRs on eval score regressions with rich diffs | Braintrust |
| On a tight budget with infra expertise in house | Langfuse (self-host) |

## SDK experience compared

Braintrust's SDKs feel like a test framework: \`Eval()\` is the hero, and everything else (logging, scorers, datasets) orbits it. TypeScript and Python are near feature parity, and the Autoevals package is shared. The learning curve is short if you have written unit tests before.

Langfuse's SDKs feel like an observability client: decorators and context managers wrap your code, spans nest naturally, and the dataset and score APIs are separate modules. There is more to learn because the surface area is larger, but the payoff is that the same instrumentation powers debugging, cost tracking, and evals at once.

A quick contrast of the same goal, capturing a graded generation:

\`\`\`python
# Braintrust: eval-centric
from braintrust import Eval
from autoevals import Factuality

Eval("qa", data=load_golden, task=answer, scores=[Factuality])
\`\`\`

\`\`\`python
# Langfuse: trace-centric
from langfuse import observe, get_client

langfuse = get_client()

@observe()
def answer(q):
    out = call_llm(q)
    langfuse.score_current_trace(name="factuality", value=grade(out))
    return out
\`\`\`

## Recommendation

Pick Braintrust when evaluation is the center of gravity: you iterate on prompts and models constantly, you want a managed product, and the comparison-diff view will save your team hours every week. Pick Langfuse when observability is the center of gravity, when you must self-host for compliance, or when you already speak OpenTelemetry and want evals to reuse that instrumentation.

Many teams even run both: Langfuse for open, self-hosted production tracing, and a dedicated eval framework in CI. Before committing, prototype your real task in each for an afternoon. To keep your agents disciplined about testing, browse the [QA skills catalog](/skills) for reusable evaluation and testing playbooks.

## Frequently Asked Questions

### Is Braintrust open source like Langfuse?

No. Braintrust is a commercial platform, though its Autoevals scorer library is open source. It offers a hybrid deployment where the data plane can live in your cloud, but you cannot run the whole product yourself for free. Langfuse has an MIT-licensed core you can self-host end to end. If a fully open, self-hostable stack is a hard requirement, that alone points you to Langfuse.

### Can I use Langfuse just for tracing and something else for evals?

Yes, and many teams do. Langfuse's tracing works standalone, and you can pipe the captured examples into a separate eval framework like DeepEval, Ragas, or Promptfoo. Langfuse also integrates directly with several of these, so you can run judge-style evals inside Langfuse or export datasets to your framework of choice. The tracing layer and eval layer are decoupled by design.

### Which one is better for CI regression gating?

Braintrust is purpose-built for it: \`Eval()\` produces comparable experiments and the diff view shows exactly which rows regressed, so gating a PR on a score threshold is natural. Langfuse can gate too, usually by running a dataset loop inside pytest and asserting on aggregate scores. If rich visual diffs of regressions matter to your reviewers, Braintrust has the edge; if you prefer assertions living in pytest, Langfuse fits.

### Do both support LLM-as-judge scoring?

Yes. Braintrust ships judge scorers in Autoevals (Factuality, relevancy, moderation) and you can write custom ones. Langfuse lets you define LLM-as-judge evaluators in the UI that run automatically on incoming traces, plus code-defined and human scores. The difference is emphasis: Braintrust judges run mostly in offline experiments, while Langfuse can continuously judge a sample of live production traffic.

### How hard is it to self-host Langfuse?

It is more than a single container. A production Langfuse deployment runs the web app, an async worker, Postgres, ClickHouse for analytics, Redis, and object storage such as S3. Docker Compose works for a quick trial, and Helm charts exist for Kubernetes. Budget real ops time for upgrades and backups. If that is too much, Langfuse Cloud removes the burden while keeping the same SDK.

### Can I migrate from one to the other later?

Partially. Datasets and prompts are portable since both expose them via SDK and export, so you can move golden sets and prompt templates with a script. Traces and historical experiments are harder to migrate because the schemas differ, so you usually leave history behind and start fresh. To reduce lock-in, keep your datasets and scorer logic in your own repo rather than authoring everything inside one vendor's UI.

### Which has better production monitoring?

Langfuse, for most teams. Its trace tree, cost and token tracking, latency breakdowns, and customizable dashboards are built for querying live systems, and online evaluators can score a continuous sample of traffic. Braintrust does offer monitoring and can apply scorers to logs, but its center of gravity is the offline experiment. If day-two operations and debugging real incidents dominate your needs, Langfuse gives you more.

### Do I need both tools at once?

Not necessarily, but it is a common and reasonable setup. Teams often self-host Langfuse for open production observability and run evals wherever they are most ergonomic, whether that is Braintrust for its comparison UI or a pytest-native framework. Start with the one that matches your center of gravity (eval-first or observability-first), then add the second only if a concrete gap appears. Avoid running two overlapping tools purely out of caution.
`,
};
