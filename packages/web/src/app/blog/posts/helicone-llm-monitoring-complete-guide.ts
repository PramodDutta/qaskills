import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Helicone LLM Monitoring Complete Guide 2026',
  description:
    'Master Helicone for LLM observability in 2026. Proxy setup, request logging, prompt management, cost tracking, sessions, custom scoring, and integration with existing eval frameworks.',
  date: '2026-05-11',
  category: 'AI Testing',
  content: `
# Helicone LLM Monitoring Complete Guide 2026

Helicone is the open-source LLM observability platform that started as a simple OpenAI proxy and has become a full-featured monitoring product. In 2026 it supports prompt management, session tracking, cost analysis, custom scoring, and integrations with all major LLM providers. Compared to LangSmith and Weave, Helicone leans heavier on observability and lighter on evaluation, which makes it a strong choice for teams that need fast visibility into LLM costs, latency, and errors without committing to a full eval workflow.

This guide covers Helicone from zero to production: proxy setup for OpenAI and other providers, request logging, dashboards, sessions, prompt management, scoring, and the alerts that catch quality regressions. We include code samples for every common integration and a setup checklist for a new team. By the end you should know whether Helicone fits your stack and how to wire it up quickly. The guide assumes basic familiarity with HTTP and OpenAI APIs.

## Key Takeaways

- Helicone is a proxy-based LLM observability platform; you point your LLM SDK at Helicone instead of directly at OpenAI/Anthropic.
- Setup is changing the base URL and adding an API header; no SDK changes required.
- Dashboards cover cost, latency, error rate, token usage, and custom scores.
- Sessions group related requests (multi-turn conversations, agent runs).
- Prompt management versions prompts and lets you A/B test in production.
- Custom scoring lets you log quality scores from any external evaluator.

---

## How Helicone Works

Helicone is a proxy. Your LLM client sends requests to Helicone's endpoint; Helicone forwards them to the LLM provider, captures the request and response, and returns the response to your client. The overhead is small (typically 50-100 ms added latency).

\`\`\`
Your App -> Helicone Proxy -> OpenAI/Anthropic -> Helicone -> Your App
\`\`\`

This proxy model has advantages and tradeoffs. Advantages: zero SDK changes, language-agnostic (works with any HTTP client), captures everything. Tradeoffs: extra latency, an additional service in your critical path, and you trust Helicone with your API keys.

For teams that prioritize observability over deep evaluation, the proxy model is fast to adopt and immediately useful.

---

## Setup for OpenAI

Change the base URL in your OpenAI client.

\`\`\`python
from openai import OpenAI

client = OpenAI(
    base_url="https://oai.helicone.ai/v1",
    default_headers={"Helicone-Auth": "Bearer sk-helicone-..."},
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
\`\`\`

That is the entire integration. Every request now flows through Helicone and appears in your dashboard.

For JavaScript:

\`\`\`javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: { "Helicone-Auth": "Bearer sk-helicone-..." },
});
\`\`\`

---

## Setup for Anthropic

Same model: change the base URL and add the auth header.

\`\`\`python
from anthropic import Anthropic

client = Anthropic(
    base_url="https://anthropic.helicone.ai",
    default_headers={"Helicone-Auth": "Bearer sk-helicone-..."},
)
\`\`\`

Helicone supports OpenAI, Anthropic, Cohere, Together AI, Replicate, Mistral, and others. Each provider has its own proxy URL but the integration pattern is identical.

---

## Self-Hosting

For teams that prefer not to send traffic through a third party, Helicone can self-host. The codebase is open source.

\`\`\`bash
git clone https://github.com/Helicone/helicone
cd helicone
docker compose up -d
\`\`\`

Configure your apps to point at your self-hosted instance. All features work the same; you trade convenience for control.

---

## Dashboards

The Helicone dashboard shows requests by time, model, user, status, and custom properties. The default views cover the questions most teams want to answer:

How much are we spending per day, week, month?

What is the p50 and p99 latency?

What is the error rate by provider, model, and user?

How are tokens distributed across requests?

Which users or features drive the most cost?

Each metric has filters: by date range, model, user, custom property. The visualizations are interactive; drill from aggregate to individual requests with one click.

| Dashboard | Question Answered |
| --- | --- |
| Requests | How many requests per period |
| Costs | How much spent per period, model, user |
| Latency | Distribution of response times |
| Errors | Error rate and recent errors |
| Sessions | Conversations and their cost/latency |
| Custom Properties | Filter by your app metadata |

---

## Custom Properties

Tag requests with metadata. Use these for filtering and grouping.

\`\`\`python
client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    extra_headers={
        "Helicone-Property-User-Id": user_id,
        "Helicone-Property-Feature": "search",
        "Helicone-Property-Environment": "production",
    },
)
\`\`\`

Common properties: user ID, feature, environment, A/B variant, session ID. Filter dashboards by any combination.

---

## Sessions

Sessions group related requests. Useful for multi-turn conversations and agent runs.

\`\`\`python
client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    extra_headers={
        "Helicone-Session-Id": session_id,
        "Helicone-Session-Path": "/chat/conversation",
    },
)
\`\`\`

The Helicone UI shows sessions as threads, with all messages in one view. Total cost and latency per session are aggregated.

For agents, the session view shows the full trajectory: each tool call, each LLM call, each response. Inspect a failed agent run by clicking through the session.

---

## Prompt Management

Helicone's prompt management lets you version prompts and A/B test them in production without redeploying.

Define a prompt:

\`\`\`python
prompt = client.helicone.prompts.create(
    name="customer-support-greeting",
    text="You are a helpful customer support agent. Greet the user warmly and ask how you can help.",
)
\`\`\`

Use the versioned prompt in your code:

\`\`\`python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "{{prompts.customer-support-greeting}}"},
        {"role": "user", "content": user_input},
    ],
)
\`\`\`

Update the prompt in the dashboard. The next request uses the new version. A/B test by routing percentages of traffic to different versions and comparing metrics.

---

## Custom Scoring

Log quality scores to Helicone from any source: a human reviewer, a model-graded judge, an automated check.

\`\`\`python
client.helicone.requests.update(
    request_id=request_id,
    custom_properties={
        "quality_score": 0.92,
        "thumbs_up": True,
    },
)
\`\`\`

The dashboard surfaces custom scores alongside cost and latency. Use them to track quality alongside performance.

For automated scoring, run an evaluator in a separate job that polls recent requests and writes scores back. This pattern keeps the LLM call path fast while enriching the data after the fact.

---

## Caching

Helicone supports request caching. Identical requests return cached responses without hitting the LLM provider.

\`\`\`python
client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    extra_headers={"Helicone-Cache-Enabled": "true"},
)
\`\`\`

Useful for deterministic prompts that get many duplicate requests (chatbot openers, classification of common queries). The cache hit rate appears in the dashboard.

---

## Rate Limiting

Helicone can rate-limit per user, per app, or per model. Useful for cost control in apps with free tiers.

\`\`\`python
client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    extra_headers={
        "Helicone-RateLimit-Policy": "100;w=3600;u=request",  # 100 requests per hour
        "Helicone-User-Id": user_id,
    },
)
\`\`\`

Helicone returns a 429 status when the user exceeds the limit. Handle in your app.

---

## Alerts

Set alerts on Helicone metrics: cost above threshold, error rate spike, latency increase.

The alert system integrates with email, Slack, and PagerDuty. Configure once in the dashboard; alerts trigger on threshold breaches.

For production teams, alerts on the cost dashboard are common. A misconfigured loop can run up thousands of dollars per hour; the alert catches it before the bill arrives.

---

## Pricing

Helicone's pricing has free tier, growth tier, and enterprise.

The free tier covers small projects. Growth tier adds seats, retention, and higher rate limits. Enterprise adds self-hosting support, SLA, and dedicated support.

Compared to LangSmith and Weave, Helicone is often less expensive for high-volume apps because pricing is more storage-centric than per-trace-centric.

---

## Comparison to Alternatives

| Platform | Proxy-Based | Native Evals | Self-Host | Best For |
| --- | --- | --- | --- | --- |
| Helicone | Yes | Limited | Yes (OSS) | Observability, cost control |
| LangSmith | SDK | Yes | Enterprise | LangChain teams |
| W&B Weave | SDK | Yes | Enterprise | Teams on W&B |
| Arize Phoenix | SDK | Yes | Yes (OSS) | OSS preferred |
| Langfuse | SDK | Yes | Yes (OSS) | OSS, custom workflows |

Helicone's proxy model is the differentiator. No SDK changes, language-agnostic, fast adoption. For teams that need observability first and eval second, this matters.

---

## When to Choose Helicone

Choose Helicone if:

You want fast observability with zero SDK changes.

You need language-agnostic LLM tracking.

Cost control is a primary concern.

You want prompt versioning and in-production A/B tests.

You prefer open-source self-hosting.

Avoid Helicone if:

Your primary need is rich evaluation (LangSmith, Weave do more).

You cannot tolerate the proxy latency overhead.

You require SDK-level integration into a specific framework.

---

## Setup Checklist

For a new team adopting Helicone:

Sign up at helicone.ai and create a project.

Change LLM client base URL and add auth header.

Verify requests appear in the dashboard.

Add custom properties (user ID, feature) to important calls.

Set up sessions for multi-turn conversations.

Configure caching for deterministic prompts.

Create alerts for cost and error rate.

Add prompt versioning for prompts you iterate on.

Set up custom scoring from an external evaluator.

Add the dashboard URL to your team wiki.

---

## Common Patterns

Pattern 1: cost-first monitoring. The cost dashboard is the primary view. Alerts on daily cost catch runaway requests.

Pattern 2: user-attributed tracking. Tag every request with user ID. Identify high-cost users and adjust policies.

Pattern 3: session-based agent debugging. Group agent calls by session. When an agent fails, find the session and replay.

Pattern 4: prompt experimentation. Use Helicone prompt management to A/B test in production. Compare metrics before committing.

---

## Common Pitfalls

Forgetting sessions. Multi-turn conversations without session IDs appear as disconnected requests. Add session IDs from day one.

Untagged properties. Requests without metadata are hard to filter. Tag user ID, feature, and environment for every call.

Ignoring the dashboard. The data is collected but if nobody looks, it does not help. Designate an owner.

Over-caching. Caching deterministic prompts is great; caching personalized prompts produces wrong responses. Cache only where safe.

Skipping alerts. Without alerts, cost spikes go unnoticed until the bill arrives. Configure threshold alerts.

---

## Migration from Other Platforms

If you currently use LangSmith or Weave and want to switch:

Change base URL in your LLM clients. That's it for tracing.

Existing datasets do not migrate; Helicone uses sessions and custom properties for organization, not datasets.

Existing evaluators continue to work; log scores to Helicone via the request update API.

Helicone is often complementary rather than replacement. Teams use Helicone for production observability and LangSmith or Weave for evaluation. The two coexist via the request_id linking.

---

## Further Resources

- Helicone documentation and self-hosting guide.
- Compare Helicone to other platforms on /blog.
- Browse LLM evaluation skills at /skills.

---

## Conclusion

Helicone is the easiest-to-adopt LLM observability platform in 2026. The proxy model means zero SDK changes; you point at Helicone and immediately see costs, latency, errors, and request details. Add custom properties, sessions, and scoring as your needs grow. For teams that need fast visibility into LLM operations without committing to a heavy eval workflow, Helicone is a strong choice. Browse [/skills](/skills) for more LLM monitoring tools and the [/blog](/blog) for related guides.
`,
};
