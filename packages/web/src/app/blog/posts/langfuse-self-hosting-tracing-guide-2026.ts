import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Langfuse Self-Hosting & Tracing Guide: Docker Compose Setup (2026)',
  description:
    'Self-host Langfuse with Docker Compose and add LLM tracing in Python and TypeScript. Covers the @observe decorator, LangChain, OpenTelemetry, and ClickHouse.',
  date: '2026-06-30',
  category: 'Guide',
  content: `
# Langfuse Self-Hosting & Tracing Guide: Docker Compose Setup (2026)

If you are running large language models in production and you want to see exactly what your application is doing — every prompt, every completion, every token, every latency spike — you need tracing. **Langfuse** is the most widely adopted open-source LLM engineering platform for exactly this, and the headline feature for teams with compliance or data-residency requirements is that you can run the entire stack yourself. This **langfuse self hosting tracing** guide walks through standing up Langfuse with Docker Compose, instrumenting Python with the \`@observe\` decorator, wiring up the TypeScript SDK, integrating LangChain, and pushing OpenTelemetry spans into Langfuse so it becomes the single pane of glass for your whole LLM workload.

A quick note on the state of the project in 2026: Langfuse was acquired by **ClickHouse in January 2026**. This matters less than you might fear. The core platform remains **MIT licensed**, the self-hosting story is unchanged and arguably better-supported, and the acquisition simply formalised what was already true — Langfuse stores its high-volume trace and observation data in ClickHouse, the analytical database that makes querying millions of spans fast. The OpenTelemetry-based ingestion path is now first-class, which means any OTel-instrumented service can emit data Langfuse understands.

By the end of this guide you will have a running self-hosted Langfuse instance, traces flowing from both Python and TypeScript applications, automatic capture of LangChain chains and agents, and a clear mental model of how observability differs from evaluation. If you are still deciding between hosted vendors, our [Langfuse vs LangSmith comparison](/blog/langfuse-vs-langsmith-2026-comparison) breaks down the tradeoffs, and you can browse practical [LLM observability skills](/skills) when you are ready to operationalise this.

## Why Self-Host Langfuse

Most teams reach for self-hosting for one of three reasons: data residency, cost at scale, or control. When your prompts and completions contain customer PII, financial records, or health data, shipping every trace to a third-party SaaS is often a non-starter for your security team. Self-hosting keeps that data inside your VPC. At high request volumes, the per-event pricing of hosted observability can also dwarf the cost of running a few containers. And finally, some teams simply want to pin versions, customise retention, and own their upgrade cadence.

The trade-off is operational burden. You now own a Postgres database, a ClickHouse cluster, a Redis instance, and an object store (S3 or MinIO). For a single-node Docker Compose deployment this is trivial; for a high-availability production deployment you will want Kubernetes and managed backing services. This guide targets the Docker Compose path, which is perfect for a team-internal instance, a staging environment, or a proof of concept that you later graduate to Kubernetes.

## Architecture: What You Are Actually Running

Before you copy a compose file, understand the moving parts. Langfuse is not a single binary — it is a small constellation of services, and knowing what each does makes debugging far easier.

| Component | Role | Notes |
| --- | --- | --- |
| Langfuse Web | UI + API server | Serves the dashboard and the ingestion API |
| Langfuse Worker | Async ingestion processing | Consumes events from the queue, writes to ClickHouse |
| PostgreSQL | Transactional store | Users, projects, prompts, datasets, config |
| ClickHouse | Analytical store | Traces, observations, scores (high volume) |
| Redis | Queue + cache | Buffers ingestion events between web and worker |
| MinIO / S3 | Blob storage | Large payloads, media, exports |

The ingestion flow is asynchronous by design. Your SDK batches events and POSTs them to the Langfuse Web service, which validates them and drops them onto a Redis queue. The Worker drains that queue and writes the durable records into ClickHouse. This decoupling is why Langfuse can absorb bursts without back-pressuring your application — your SDK call returns almost immediately and the heavy lifting happens out of band.

## Step 1: Self-Host with Docker Compose

The fastest way to get a working instance is the official compose file. Clone the repo, set a handful of secrets, and bring the stack up.

\`\`\`bash
# Clone the Langfuse repository
git clone https://github.com/langfuse/langfuse.git
cd langfuse

# Bring the full stack up in the background
docker compose up -d

# Watch the web service become healthy
docker compose logs -f langfuse-web
\`\`\`

For anything beyond a quick try-out you should not rely on the bundled defaults. Create a \`.env\` (or override the compose environment) with your own secrets. Never reuse these values across environments, and generate them with a cryptographically secure source.

\`\`\`bash
# Generate strong secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
SALT=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)   # exactly 64 hex chars (256-bit)
\`\`\`

A trimmed, production-leaning compose override looks like this. It pins images, sets explicit credentials, and keeps ClickHouse and Postgres data on named volumes so an upgrade does not wipe your history.

\`\`\`yaml
# docker-compose.override.yml
services:
  langfuse-web:
    image: langfuse/langfuse:3
    environment:
      DATABASE_URL: postgresql://postgres:\${POSTGRES_PASSWORD}@postgres:5432/postgres
      NEXTAUTH_URL: https://langfuse.internal.example.com
      NEXTAUTH_SECRET: \${NEXTAUTH_SECRET}
      SALT: \${SALT}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      CLICKHOUSE_URL: http://clickhouse:8123
      CLICKHOUSE_USER: clickhouse
      CLICKHOUSE_PASSWORD: \${CLICKHOUSE_PASSWORD}
      REDIS_CONNECTION_STRING: redis://redis:6379
      LANGFUSE_S3_EVENT_UPLOAD_BUCKET: langfuse
    ports:
      - "3000:3000"

  langfuse-worker:
    image: langfuse/langfuse-worker:3
    environment:
      DATABASE_URL: postgresql://postgres:\${POSTGRES_PASSWORD}@postgres:5432/postgres
      CLICKHOUSE_URL: http://clickhouse:8123
      CLICKHOUSE_PASSWORD: \${CLICKHOUSE_PASSWORD}
      REDIS_CONNECTION_STRING: redis://redis:6379
\`\`\`

Bring it up, visit \`http://localhost:3000\`, create the first user (it becomes an admin), create an organisation and a project, then copy the public and secret API keys from project settings. Those two keys are what every SDK below authenticates with.

## Step 2: Tracing in Python with @observe

The Python SDK's killer feature is the \`@observe\` decorator. You annotate any function and Langfuse automatically captures its inputs, outputs, latency, and exceptions as a span — no manual span management required. Install the SDK first.

\`\`\`bash
pip install langfuse openai
\`\`\`

Set your three environment variables so the SDK knows where to send data and how to authenticate.

\`\`\`bash
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_HOST="http://localhost:3000"   # your self-hosted URL
\`\`\`

Now decorate your functions. Nested decorated calls become nested spans automatically, so a parent function that calls helpers produces a clean tree in the UI.

\`\`\`python
from langfuse import observe, get_client
from openai import OpenAI

client = OpenAI()
langfuse = get_client()

@observe()
def retrieve_context(question: str) -> str:
    # Pretend this hits a vector store
    return "Langfuse stores traces in ClickHouse for fast analytics."

@observe()
def answer_question(question: str) -> str:
    context = retrieve_context(question)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": f"Use this context: {context}"},
            {"role": "user", "content": question},
        ],
    )
    answer = response.choices[0].message.content
    # Attach a score to the current observation
    langfuse.score_current_trace(name="answered", value=1.0)
    return answer

if __name__ == "__main__":
    print(answer_question("Where does Langfuse store traces?"))
    langfuse.flush()  # ensure events are sent before the process exits
\`\`\`

The \`flush()\` call matters for short-lived scripts. Because ingestion is batched, a process that exits immediately can drop the final batch. In long-running servers the background flusher handles this for you. The \`@observe\` decorator also supports \`as_type="generation"\` for LLM calls so you get token counts and cost in the UI, and you can enrich any active observation with \`langfuse.update_current_generation(...)\`.

## Step 3: Auto-Instrument OpenAI and Add Metadata

Decorating every function is fine, but for the OpenAI client specifically Langfuse ships a drop-in wrapper that captures every call without touching your business logic. Swap the import and you are done.

\`\`\`python
# Replace: from openai import OpenAI
from langfuse.openai import OpenAI

client = OpenAI()

# Every call is now traced automatically with model, tokens, cost, latency
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Summarise OpenTelemetry in one line."}],
    # Langfuse-specific kwargs are stripped before hitting OpenAI
    name="one-line-summary",
    metadata={"feature": "summariser", "env": "staging"},
    user_id="user_42",
    session_id="sess_abc",
)
\`\`\`

The \`metadata\`, \`user_id\`, and \`session_id\` fields turn into filterable dimensions in the dashboard. This is where self-hosted Langfuse earns its keep: you can slice latency and cost by feature, by user cohort, or by session, and ClickHouse keeps those aggregations fast even over millions of rows.

## Step 4: Trace LangChain Automatically

Most production LLM apps are built on a framework, and LangChain is the most common. Langfuse provides a callback handler that captures the entire chain — retriever, prompt, model, parser — as a single nested trace. Install the integration package and pass the handler in the \`config\`.

\`\`\`bash
pip install langfuse langchain langchain-openai
\`\`\`

\`\`\`python
from langfuse.langchain import CallbackHandler
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

langfuse_handler = CallbackHandler()

prompt = ChatPromptTemplate.from_template(
    "Answer concisely: {question}"
)
model = ChatOpenAI(model="gpt-4o-mini")
chain = prompt | model

result = chain.invoke(
    {"question": "What database backs Langfuse traces?"},
    config={"callbacks": [langfuse_handler]},
)
print(result.content)
\`\`\`

Every step in that LCEL pipeline shows up as a child span: you see the rendered prompt, the model call with token usage, and the final output. For agents and tool-calling, the same handler captures each tool invocation as its own span, which is invaluable when an agent loops or picks the wrong tool. Observability here is about understanding behaviour — if your next question is "but is the output any good?", that is evaluation, and the distinction is covered well in [LLM observability vs evaluation](/blog/llm-observability-vs-evaluation-2026).

## Step 5: Tracing with the TypeScript SDK

Plenty of LLM apps live in Node.js and Next.js, and the TypeScript SDK mirrors the Python ergonomics. Install it and initialise a client.

\`\`\`bash
npm install langfuse
\`\`\`

\`\`\`typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST ?? 'http://localhost:3000',
});

async function answer(question: string): Promise<string> {
  const trace = langfuse.trace({ name: 'qa-flow', userId: 'user_42' });

  const generation = trace.generation({
    name: 'chat-completion',
    model: 'gpt-4o-mini',
    input: [{ role: 'user', content: question }],
  });

  // ... call your model provider here ...
  const output = 'Langfuse stores traces in ClickHouse.';

  generation.end({ output });
  trace.update({ output });

  await langfuse.flushAsync(); // important in serverless / edge runtimes
  return output;
}
\`\`\`

In serverless and edge environments the \`flushAsync()\` call is critical: the runtime can freeze or terminate the moment your handler returns, so you must await the flush or your traces silently vanish. The TypeScript SDK also exposes wrappers for the Vercel AI SDK and OpenAI, so most apps can adopt tracing with a one-line import swap rather than manual span management.

## Step 6: OpenTelemetry Integration

Since the ClickHouse era, Langfuse leans hard into **OpenTelemetry** as a universal ingestion path. If your services are already OTel-instrumented, you can point an OTLP exporter at Langfuse and your existing spans become Langfuse traces. This is the cleanest way to unify LLM traces with the rest of your distributed tracing.

\`\`\`python
import base64, os
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Langfuse expects Basic auth: base64(public:secret)
auth = base64.b64encode(
    f"{os.environ['LANGFUSE_PUBLIC_KEY']}:{os.environ['LANGFUSE_SECRET_KEY']}".encode()
).decode()

exporter = OTLPSpanExporter(
    endpoint=f"{os.environ['LANGFUSE_HOST']}/api/public/otel/v1/traces",
    headers={"Authorization": f"Basic {auth}"},
)

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(exporter))
\`\`\`

Because Langfuse understands the OpenInference and OpenLLMetry semantic conventions, spans emitted by instrumentation libraries for LlamaIndex, the OpenAI SDK, or Anthropic's SDK are parsed into proper generations with model names and token counts. The practical upshot: you instrument once with OTel and Langfuse becomes one of potentially several backends consuming that telemetry.

## Step 7: Prompt Management and Scores

Self-hosted Langfuse is not only a passive recorder. It includes a prompt management layer — version your prompts in the UI, fetch them at runtime, and every generation that uses a managed prompt is linked back to its version. This lets you answer "did the regression start when we changed the prompt?" with a single dashboard filter.

\`\`\`python
from langfuse import get_client
langfuse = get_client()

# Fetch a versioned, production-labelled prompt
prompt = langfuse.get_prompt("qa-system-prompt", label="production")
compiled = prompt.compile(domain="QA testing")
# Use compiled in your model call; the link is automatic when traced
\`\`\`

Scores are the bridge to evaluation. You can attach numeric or categorical scores to any trace — from user thumbs-up, from an automated eval job, or from an LLM-as-a-judge run. Those scores aggregate into quality dashboards, and you can compare them across prompt versions or model swaps.

## Operating, Upgrading, and Securing Your Instance

Once traces are flowing, the work shifts from setup to operation, and a self-hosted instance has a handful of recurring concerns worth planning for up front. The first is retention. Trace volume grows fast — a busy application can emit millions of observations a week — and ClickHouse will happily store all of it until your disk fills. Decide on a retention window early and configure ClickHouse TTLs so old traces age out automatically. For most teams, full-fidelity traces for thirty to ninety days plus aggregated metrics for longer is the right balance between debuggability and cost.

The second concern is upgrades. Because Langfuse pins its schema to image versions, you should always read the release notes before bumping a major version and take a snapshot of both PostgreSQL and ClickHouse first. The web container runs migrations on boot, so a rollback means restoring those snapshots rather than simply re-pulling the old image. Named volumes — which is why the compose override above declares them explicitly — make these snapshots straightforward. Pin to a specific minor tag rather than \`latest\` so an unattended \`docker compose pull\` cannot surprise you with a breaking change at 3 a.m.

The third concern is access control and network exposure. The Langfuse Web service should sit behind a reverse proxy that terminates TLS and, ideally, an SSO layer. Never expose the raw container port to the public internet. Inside the platform, organisations and projects give you multi-tenancy, and role-based access lets you separate who can view traces from who can edit prompts or rotate API keys. Rotate the project secret key on a schedule and treat it like any other production credential — anyone holding it can write traces into your instance.

The fourth concern is sampling. You do not always need to trace one hundred percent of traffic. For very high-volume endpoints, head-based sampling at the SDK level reduces both ingestion load and storage cost while still giving you a statistically useful picture. Reserve full tracing for the paths you actively debug and the cohorts you care most about, such as paying customers or a feature you just shipped. Combined with metadata filtering, sampling keeps a self-hosted instance affordable as your traffic scales into the millions of requests.

## Common Pitfalls and How to Avoid Them

A few mistakes show up again and again in self-hosted deployments. The most common is forgetting to flush in short-lived processes — scripts, cron jobs, and serverless handlers — which silently drops the last batch of events. Always flush explicitly at the end of such processes. The second is misconfiguring the \`ENCRYPTION_KEY\`: it must be exactly sixty-four hexadecimal characters, and changing it after data has been written renders previously encrypted fields unreadable, so set it once and store it safely. The third is running ClickHouse on under-provisioned disk or memory; it is an analytical database and rewards giving it room, especially as your trace history grows. The fourth is leaving the bundled default passwords in place, which is fine for a five-minute demo and dangerous for anything reachable on a network. Address these four and a self-hosted Langfuse instance is remarkably low-maintenance.

## Self-Hosting Tiers at a Glance

Not every self-hosting setup needs the full ClickHouse-and-Kubernetes treatment. Match the deployment to your stage.

| Stage | Deployment | Backing services | Good for |
| --- | --- | --- | --- |
| Try-out | \`docker compose up\` | Bundled containers | Local evaluation, demos |
| Team instance | Compose + named volumes | Self-managed PG/CH/Redis | Internal staging, small teams |
| Production | Kubernetes / Helm | Managed PG, ClickHouse Cloud, Redis, S3 | HA, compliance, scale |

The migration path is smooth: traces in ClickHouse and config in Postgres are portable, so a team can start on Compose and graduate to Kubernetes without losing history. If you are comparing this build-vs-buy decision against managed offerings, weigh it alongside the [Langfuse vs LangSmith](/blog/langfuse-vs-langsmith-2026-comparison) analysis and the broader [Promptfoo vs DeepEval vs Ragas](/blog/promptfoo-vs-deepeval-vs-ragas-2026) landscape for the evaluation side of the stack.

## Frequently Asked Questions

### Is Langfuse still open source after the ClickHouse acquisition?

Yes. Langfuse was acquired by ClickHouse in January 2026, but the core platform remains **MIT licensed** and fully self-hostable. The acquisition formalised the existing relationship — Langfuse already used ClickHouse as its analytical store. Self-hosting via Docker Compose or Kubernetes is unchanged and continues to be actively maintained, with the OpenTelemetry ingestion path now treated as first-class.

### What is the difference between the @observe decorator and the OpenAI wrapper?

The \`@observe\` decorator instruments any Python function, capturing its inputs, outputs, latency, and exceptions as a span — ideal for retrievers, tools, and business logic. The \`langfuse.openai\` wrapper is a drop-in replacement for the OpenAI client that automatically traces every model call with token counts and cost. Use both together: \`@observe\` for your functions, the wrapper for model calls.

### Do I need ClickHouse to self-host Langfuse?

Yes, in Langfuse v3 and later. ClickHouse stores the high-volume trace, observation, and score data, while PostgreSQL holds transactional config like users, projects, and prompts. The Docker Compose file bundles a ClickHouse container so you do not need to provision it separately for a single-node deployment. For production scale, ClickHouse Cloud or a managed cluster is recommended.

### How do I avoid losing traces in serverless functions?

Langfuse batches events and flushes them in the background, but serverless and edge runtimes can freeze the moment your handler returns. Always call \`langfuse.flush()\` in Python or \`await langfuse.flushAsync()\` in TypeScript before the function exits. This guarantees the final batch is sent rather than discarded when the runtime tears down the execution context.

### Can I send OpenTelemetry spans directly to Langfuse?

Yes. Langfuse exposes an OTLP HTTP endpoint at \`/api/public/otel/v1/traces\` that accepts standard OpenTelemetry traces with Basic auth derived from your public and secret keys. Spans following OpenInference or OpenLLMetry semantic conventions are parsed into proper generations with model and token metadata, letting you unify LLM observability with your existing distributed tracing.

### How does Langfuse tracing differ from evaluation?

Tracing records what happened — prompts, completions, latency, cost, and the call tree. Evaluation judges whether the output was good — correctness, faithfulness, relevance. Langfuse handles tracing natively and supports evaluation through scores you attach to traces, including LLM-as-a-judge runs. The full distinction is explored in our [LLM observability vs evaluation](/blog/llm-observability-vs-evaluation-2026) guide.

### What secrets do I need to generate before going to production?

At minimum: \`NEXTAUTH_SECRET\` and \`SALT\` (each a 32-byte base64 value) and \`ENCRYPTION_KEY\` (exactly 64 hex characters for a 256-bit key). Generate them with \`openssl rand\`, never reuse them across environments, and store them in a secrets manager rather than committing them. Also set strong passwords for PostgreSQL, ClickHouse, and Redis instead of the bundled defaults.

### Can the TypeScript and Python SDKs share the same project?

Yes. Both SDKs authenticate with the same public and secret key pair for a given project, so a polyglot system — say a Python backend and a Next.js frontend — emits into one unified project. Traces, sessions, and users are correlated by the IDs you pass, letting you follow a request end to end across language boundaries inside a single Langfuse dashboard.

## Conclusion

Self-hosting Langfuse gives you full ownership of your LLM observability data without giving up the polished tracing experience that made the project popular. With a single Docker Compose file you get a UI, an ingestion API, and the ClickHouse-backed analytical store that keeps queries fast at scale — and the MIT license means none of that is going away after the ClickHouse acquisition. From there, the \`@observe\` decorator and OpenAI wrapper make Python instrumentation nearly free, the TypeScript SDK covers your Node and edge workloads, the LangChain handler captures entire chains, and the OpenTelemetry endpoint unifies LLM traces with the rest of your telemetry.

Start with a Compose try-out, instrument one critical path, and watch the traces flow. Once you trust the data, layer in scores and prompt management to turn observability into a quality feedback loop. Ready to go deeper? Browse hands-on [LLM observability and evaluation skills](/skills) on QASkills, and compare your tooling options with our [Langfuse vs LangSmith](/blog/langfuse-vs-langsmith-2026-comparison) and [Promptfoo vs DeepEval vs Ragas](/blog/promptfoo-vs-deepeval-vs-ragas-2026) deep dives.
`,
};
