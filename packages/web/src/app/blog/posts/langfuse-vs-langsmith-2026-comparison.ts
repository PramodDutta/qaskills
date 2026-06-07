import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Langfuse vs LangSmith: LLM Observability Compared 2026',
  description:
    'Langfuse vs LangSmith in 2026: open-source self-host vs LangChain-native hosted. Compare tracing, evals, datasets, prompts, OTel, SDKs, and pricing with real code.',
  date: '2026-06-07',
  category: 'Comparison',
  content: `
# Langfuse vs LangSmith: LLM Observability Compared 2026

Once an LLM feature leaves your laptop and starts serving real users, you need to see what it is doing. Which prompts ran, how long they took, what they cost, where they went wrong, and whether quality is holding steady over time. That is the job of an LLM observability platform, and in 2026 two names dominate the conversation: Langfuse and LangSmith. Both give you tracing, evaluation, datasets, and prompt management. Both have mature SDKs. The difference that shapes everything else is ownership: Langfuse is the leading open-source platform you can self-host, while LangSmith is LangChain's hosted platform with deep, native integration into the LangChain and LangGraph ecosystem.

This guide compares the two head to head for engineers who have to choose one. We cover the open-source versus hosted split, tracing, evaluations, datasets, prompt management, pricing models, OpenTelemetry support, SDK language coverage, and clear guidance on when to pick each. You will find runnable code that instruments the same LLM call with the Langfuse SDK and with LangSmith tracing so you can compare the developer experience directly. The aim is a fair, accurate picture, not a sales pitch, so where pricing or features move quickly we say so and point you to check the current details.

## Key Takeaways

- Langfuse is open source and self-hostable, which gives you data ownership, on-premise deployment, and no vendor lock-in. It also offers a managed cloud.
- LangSmith is LangChain's hosted platform with the deepest native integration for LangChain and LangGraph applications, plus a strong managed experience.
- Both provide tracing, evaluations, datasets, and prompt management as core features.
- Langfuse emphasizes OpenTelemetry compatibility and framework-agnostic instrumentation; LangSmith shines when your stack is already LangChain.
- Both have Python and TypeScript or JavaScript SDKs. Langfuse self-host can be free at the infrastructure level; both offer paid cloud tiers. Check current pricing.
- Pick Langfuse for open source, self-hosting, data residency, and framework neutrality. Pick LangSmith for a LangChain-native, fully managed experience with minimal setup.

---

## Open Source and Self-Hosting

The single biggest difference is the deployment and ownership model, and it drives most other decisions.

Langfuse is open source. You can run the entire platform on your own infrastructure with Docker or Kubernetes, keep all trace data inside your network, and meet data-residency or compliance requirements without sending anything to a third party. There is no per-event cost when you self-host because you are simply running software you operate. Langfuse also offers a managed cloud for teams that prefer not to run infrastructure, so you can start on cloud and move to self-host later, or vice versa, without changing your instrumentation. This optionality is the core reason teams that care about data ownership, air-gapped environments, or avoiding vendor lock-in reach for Langfuse first.

LangSmith is a hosted platform operated by LangChain. The managed model means there is nothing to deploy: you create an account, set an API key, and traces flow in. LangChain has offered enterprise and self-hosted arrangements for organizations with strict requirements, but the default and most common experience is the cloud product. The trade is convenience for control. You get a polished, fully managed service maintained by the team behind LangChain, in exchange for your trace data living on their platform under the default model.

If "we must keep our data on our own infrastructure" or "we want open source with no lock-in" is a hard requirement, that single sentence usually decides the question in favor of Langfuse. If "we never want to run infrastructure and we live in the LangChain ecosystem" is the priority, LangSmith is the natural fit. For broader context on the hosted side, see our [LangSmith evaluation platform guide](/blog/langsmith-evaluation-platform-guide).

| Dimension | Langfuse | LangSmith |
|---|---|---|
| Open source | Yes | No (hosted product) |
| Self-host | Yes (Docker / Kubernetes) | Limited / enterprise arrangements |
| Managed cloud | Yes | Yes (default) |
| Data residency control | Full when self-hosted | Per provider terms |
| Vendor lock-in risk | Low | Higher (ecosystem-tied) |
| Best fit | Ownership, compliance, neutrality | Managed, LangChain-native |

---

## Tracing

Tracing is the foundation of both platforms. A trace records the full path of a request through your application: each LLM call, each retrieval step, each tool invocation, with inputs, outputs, latency, token counts, and cost. When something goes wrong in production, the trace is how you find out where and why.

Langfuse builds traces from spans and generations that you create through its SDK or through integrations. You can decorate functions, wrap LLM clients, or emit spans manually, and Langfuse stitches them into a nested trace you can explore in the UI. Because Langfuse leans on OpenTelemetry concepts and offers an OTel-compatible ingestion path, you can often reuse existing tracing instrumentation rather than building a parallel system. This framework-agnostic stance means Langfuse traces work whether you use LangChain, LlamaIndex, the raw provider SDKs, or your own glue code.

LangSmith captures traces with the least effort when your application is built on LangChain or LangGraph. In that case tracing is close to automatic: set the environment variables, and every chain, agent step, and tool call is recorded with rich structure that mirrors the framework's own abstractions. For non-LangChain code, LangSmith provides a tracing SDK and decorators so you can instrument arbitrary functions too, but the magic moment, where you get deep traces for almost no code, is strongest inside the LangChain ecosystem it was designed around.

Both produce excellent, explorable traces. The difference is where the friction is lowest. Langfuse minimizes friction for heterogeneous, framework-neutral stacks via OTel. LangSmith minimizes friction for LangChain-native stacks via automatic capture.

---

## Instrumenting a Call with the Langfuse SDK

Here is how you instrument an OpenAI call with the Langfuse Python SDK. The decorator captures the surrounding function as a trace, and the wrapped client records the generation with its inputs, outputs, tokens, and latency automatically. Set \`LANGFUSE_PUBLIC_KEY\`, \`LANGFUSE_SECRET_KEY\`, and \`LANGFUSE_HOST\` (your self-hosted URL or the managed cloud) in the environment first.

\`\`\`python
# app.py
from langfuse.decorators import observe
from langfuse.openai import openai  # drop-in OpenAI wrapper


@observe()
def answer_question(question: str) -> str:
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Answer in one sentence."},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content


if __name__ == "__main__":
    print(answer_question("What is LLM observability?"))
\`\`\`

The \`@observe()\` decorator creates a trace named after the function, and \`langfuse.openai\` reports the model call as a nested generation with prompt, completion, token usage, and cost. You did not write any export or flush logic; the SDK batches and ships spans for you. To attach metadata, scores, or a user id, you call helper functions inside the decorated function. Because the host is configurable, the exact same code points at your own server or at Langfuse cloud by changing one environment variable, which is the practical payoff of the self-host option.

---

## Instrumenting a Call with LangSmith Tracing

Here is the equivalent with LangSmith. The simplest path is to set the tracing environment variables and use the \`@traceable\` decorator, which records the function as a run. Set \`LANGSMITH_TRACING=true\`, \`LANGSMITH_API_KEY\`, and optionally \`LANGSMITH_PROJECT\` first.

\`\`\`python
# app.py
from langsmith import traceable
from openai import OpenAI

client = OpenAI()


@traceable
def answer_question(question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Answer in one sentence."},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content


if __name__ == "__main__":
    print(answer_question("What is LLM observability?"))
\`\`\`

The \`@traceable\` decorator turns the function into a tracked run that appears in your LangSmith project, capturing inputs and outputs. If this function were a LangChain or LangGraph component instead of a raw OpenAI call, you would often not need the decorator at all: simply enabling tracing through the environment variables records the entire chain automatically with its native structure. That is the heart of the LangSmith value proposition. The less LangChain you use, the more you instrument by hand, and at that point the two SDKs feel similar in effort. For TypeScript, both platforms ship equivalent SDKs; the Langfuse and LangSmith JS clients mirror these decorator and wrapper patterns.

---

## Evaluations

Observability is only half the story. You also need to know whether output quality is good and whether it is getting better or worse, which is the job of evaluations. Both platforms support running evaluators over datasets and over live production traces.

Langfuse supports evaluations through scores attached to traces and through dataset runs. You can attach numeric or categorical scores from automated evaluators, from LLM-as-judge metrics, or from human reviewers, and then track those scores over time in the dashboard. Because Langfuse is framework-agnostic, you can drive evals from any eval library, including Promptfoo, Ragas, or DeepEval, and push the resulting scores into Langfuse for tracking and comparison. This makes Langfuse a good central store for quality signals regardless of which eval tool produced them. For one such tool, see our [DeepEval pytest LLM testing guide](/blog/deepeval-pytest-llm-testing-guide).

LangSmith provides a tightly integrated evaluation experience. You define evaluators in code, run them against datasets, and view results in a UI built for comparing experiments side by side. Because LangSmith and the LangChain ecosystem share concepts, wiring evaluators to chains and agents is smooth, and the platform includes built-in and custom evaluator support plus regression comparison between runs. For teams already invested in LangChain, this integrated loop, from trace to dataset to evaluation to comparison, is cohesive and fast to adopt.

The practical takeaway: LangSmith offers a more turnkey, integrated eval workflow inside its own ecosystem, while Langfuse offers an open, tool-agnostic place to collect and track scores from whichever evaluators you prefer. Our broader [LLM evals comparison across OpenAI, Promptfoo, and Ragas](/blog/llm-evals-comparison-openai-promptfoo-ragas) covers the evaluator side in depth.

---

## Datasets and Prompt Management

Both platforms treat datasets and prompt management as first-class features, and the comparison here is closer than on deployment model.

For datasets, both let you curate collections of inputs and expected outputs, often built from real production traces you flag as interesting or problematic. You then run experiments against those datasets to measure quality, catch regressions, and benchmark prompt or model changes. Langfuse lets you create datasets from traces and run them through your own evaluators with results stored centrally. LangSmith offers a similar curate-from-traces flow with a polished experiment comparison view. Both make the loop of "see a bad output, add it to a dataset, prevent it from recurring" straightforward.

For prompt management, both provide a versioned prompt registry so you can edit prompts outside your codebase, track versions, and roll back. Langfuse prompt management lets you fetch a prompt by name and version at runtime, cache it, and link executions back to the prompt version that produced them, which ties prompt changes to observed quality. LangSmith similarly offers a prompt hub with versioning and the ability to pull prompts at runtime, integrated naturally with LangChain's prompt abstractions. If you are deep in LangChain, the LangSmith prompt experience feels native; if you want prompts decoupled from any framework, Langfuse keeps them portable.

| Feature | Langfuse | LangSmith |
|---|---|---|
| Datasets from traces | Yes | Yes |
| Experiment comparison | Yes | Yes (polished UI) |
| Versioned prompt registry | Yes | Yes |
| Runtime prompt fetch | Yes | Yes |
| Framework coupling | Neutral | LangChain-native |
| Link prompt version to quality | Yes | Yes |

---

## OpenTelemetry and SDK Languages

OpenTelemetry support matters because it determines how easily an observability platform fits into the tracing infrastructure you already run. If your services emit OTel spans for general application monitoring, an LLM observability tool that speaks OTel lets you unify everything rather than maintain a separate pipeline.

Langfuse places significant emphasis on OpenTelemetry compatibility. It offers an OTel-compatible ingestion path so you can send spans from OTel-instrumented services and from a range of integrations into Langfuse, and it aligns its tracing concepts with OTel semantics. For organizations standardizing on OpenTelemetry across their stack, this is a meaningful advantage because LLM traces become part of the same observability fabric as the rest of the system.

LangSmith focuses on its own tracing protocol and the rich, native capture it provides for LangChain and LangGraph. It has expanded interoperability over time, and you can ingest from non-LangChain sources, but its center of gravity is the LangChain-native experience rather than being an OTel-first backend. If OTel standardization is a priority, evaluate the current state carefully and check the latest docs, because interoperability features evolve.

On SDK languages, both platforms cover the two languages that dominate LLM application development: Python and TypeScript or JavaScript. That covers the large majority of teams. If you work primarily in another language, you may rely on HTTP ingestion or OTel rather than a first-party SDK, and here Langfuse's OTel orientation can help. Confirm current language support in each project's documentation before committing, since SDK coverage expands over time.

| Capability | Langfuse | LangSmith |
|---|---|---|
| OpenTelemetry ingestion | Strong emphasis | Evolving / partial |
| Python SDK | Yes | Yes |
| TypeScript / JS SDK | Yes | Yes |
| Native LangChain capture | Via integration | Best in class |
| Framework-agnostic ingestion | Yes (OTel-friendly) | Possible, less central |
| Standardize on existing OTel | Easiest | Verify current support |

---

## Pricing Models

Pricing is where you should be most careful, because the numbers change and the right comparison depends on whether you self-host. We will describe the models qualitatively; check current pricing on each project's site before you budget.

Langfuse has two cost stories. Self-hosted, the software is open source, so there is no per-trace license fee; your cost is the infrastructure you run, which can be modest for small volumes and scales with your own hardware and operations effort. Managed Langfuse cloud typically offers a free tier for getting started and paid plans that scale with usage and team features, removing the operational burden. The appeal is that you can start free on cloud, and if costs or compliance push you to self-host, you migrate without rewriting instrumentation.

LangSmith is a hosted product with a usage-based and seat-based model. It commonly includes a free tier suitable for individuals and small projects, with paid plans for teams and enterprises that scale with trace volume and add collaboration, retention, and support features. Because it is fully managed, the price includes the operational work you would otherwise do yourself.

The honest framing: if you have the operational capacity to run infrastructure and care about controlling cost at scale or keeping data in-house, self-hosted Langfuse can be the most economical and compliant path. If you would rather pay to never think about infrastructure and you value the LangChain-native experience, LangSmith's managed pricing buys you that convenience. Neither is simply cheaper; it depends on volume, team size, and whether you self-host. Always check current pricing.

| Pricing dimension | Langfuse | LangSmith |
|---|---|---|
| Self-host cost | Infrastructure only (open source) | Limited / enterprise |
| Managed free tier | Yes | Yes |
| Paid model | Usage + team features | Usage + seats |
| Cost control at scale | High (self-host) | Managed convenience |
| Operational burden | Yours if self-hosted | Handled by provider |
| Pricing note | Check current pricing | Check current pricing |

---

## When to Pick Each

A short decision guide based on the priorities that most often decide this choice.

Pick Langfuse when open source and data ownership matter, when you must self-host for compliance or data residency, when you want to avoid vendor lock-in, when your stack is framework-neutral or built on OpenTelemetry, or when you want a central place to collect quality scores from many different eval tools. Langfuse is the default for teams that value control and portability and are comfortable either running infrastructure or starting on its cloud with the option to move.

Pick LangSmith when your application is built on LangChain or LangGraph and you want tracing that is essentially automatic, when you prefer a fully managed service with no infrastructure to run, when a tightly integrated trace-to-dataset-to-eval workflow inside one ecosystem is worth more to you than framework neutrality, and when the team behind LangChain maintaining your observability layer is a feature rather than a concern. LangSmith is the default for LangChain-native teams that prioritize a cohesive managed experience.

Many teams settle the decision on one sentence. "We must keep data on our own infrastructure" points to Langfuse. "We are all-in on LangChain and never want to run servers" points to LangSmith. Everything else is a refinement on top of that. To round out your stack with complementary tooling, browse our [skills directory](/skills) and our roundup of [AI test automation tools for 2026](/blog/ai-test-automation-tools-2026).

---

## Frequently Asked Questions

### Is Langfuse a good open-source alternative to LangSmith?

Yes. In 2026 Langfuse is the leading open-source LLM observability platform and the most common alternative teams choose when they want self-hosting, data ownership, and freedom from vendor lock-in. It covers the same core ground as LangSmith, tracing, evaluations, datasets, and prompt management, while letting you run everything on your own infrastructure. It also offers a managed cloud, so you can start hosted and migrate to self-host later without changing your instrumentation.

### What is the main difference between Langfuse and LangSmith?

The main difference is ownership and ecosystem fit. Langfuse is open source and self-hostable, giving you full control over your data and no lock-in, with a framework-neutral, OpenTelemetry-friendly design. LangSmith is LangChain's hosted platform with the deepest native integration for LangChain and LangGraph applications and a fully managed experience. Both provide tracing, evals, datasets, and prompt management, so the decision usually comes down to self-hosting needs versus a turnkey LangChain-native workflow.

### Can I use Langfuse or LangSmith without LangChain?

Yes, both work without LangChain. Langfuse is framework-agnostic by design, with SDK decorators, client wrappers, and OpenTelemetry-compatible ingestion that instrument raw provider calls, LlamaIndex, or custom code. LangSmith also supports non-LangChain code through its tracing SDK and the traceable decorator, though its lowest-friction, automatic-capture experience is strongest inside LangChain and LangGraph. If your stack is not LangChain-based, Langfuse's neutral design often feels more natural, but either platform can trace arbitrary applications.

### Which platform is cheaper, Langfuse or LangSmith?

It depends on volume, team size, and whether you self-host, so there is no single answer. Self-hosted Langfuse has no per-trace license fee because it is open source; you pay only for the infrastructure and the operations effort to run it, which can be economical at scale. Both offer managed cloud tiers with a free starting point and usage- or seat-based paid plans. Pricing changes over time, so check current pricing on each project's site before budgeting.

### Does Langfuse support OpenTelemetry?

Yes, OpenTelemetry support is a notable strength of Langfuse. It provides an OTel-compatible ingestion path and aligns its tracing concepts with OTel semantics, so teams that already emit OpenTelemetry spans for general application monitoring can route LLM traces into the same fabric rather than maintaining a separate pipeline. LangSmith centers on its own tracing protocol with rich native LangChain capture and has expanded interoperability over time; if OTel standardization is critical, verify the current state in each project's documentation.

### Do both platforms support Python and TypeScript?

Yes. Both Langfuse and LangSmith ship first-party SDKs for Python and for TypeScript or JavaScript, which together cover the large majority of LLM application development. The instrumentation patterns are similar across languages: decorators to capture a function as a trace and client wrappers to record model calls. If you build in another language, you can often rely on HTTP ingestion or, in Langfuse's case, OpenTelemetry. Confirm current language coverage in each project's docs, since SDK support expands over time.

### Can I migrate from LangSmith to Langfuse later?

Migration is feasible but requires re-instrumentation, since each platform uses its own SDK and tracing conventions. You would swap the LangSmith decorators and configuration for Langfuse equivalents, point the SDK at your Langfuse host, and recreate datasets and prompts in the new system. Historical traces do not move automatically. Because Langfuse offers both managed cloud and self-host with identical instrumentation, a common pattern is to adopt Langfuse on cloud first and move to self-host once you are comfortable, minimizing disruption.

### Which is better for evaluating production LLM quality?

Both are strong, with different shapes. LangSmith offers a turnkey, integrated workflow from trace to dataset to evaluation to side-by-side comparison, which is fast to adopt inside the LangChain ecosystem. Langfuse provides an open, tool-agnostic place to attach scores from any evaluator, including Promptfoo, Ragas, or DeepEval, and track them over time, which suits teams that want freedom in how scores are produced. Choose LangSmith for an integrated loop, Langfuse for evaluator flexibility and ownership.

---

## Conclusion

Langfuse and LangSmith are both mature LLM observability platforms that deliver tracing, evaluations, datasets, and prompt management. The choice comes down to ownership and ecosystem. Langfuse is the leading open-source, self-hostable platform: pick it for data ownership, compliance, framework neutrality, OpenTelemetry compatibility, and freedom from lock-in, with a managed cloud available when you want it. LangSmith is LangChain's hosted platform: pick it for a fully managed, LangChain-native experience where tracing is nearly automatic and the eval loop is tightly integrated. Decide on the priority that matters most, self-hosting versus managed convenience, then refine on evals, OTel, and pricing. Explore complementary tooling on our [skills directory](/skills) and keep reading the [blog](/blog) for more LLM engineering guides.
`,
};
