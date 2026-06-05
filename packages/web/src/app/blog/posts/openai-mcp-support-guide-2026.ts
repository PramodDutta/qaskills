import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI MCP Support: Remote MCP Servers Guide 2026',
  description:
    'How OpenAI supports the Model Context Protocol in 2026: connect remote MCP servers to the Responses API and Agents SDK, configure auth, and test MCP integrations.',
  date: '2026-06-04',
  category: 'Guide',
  content: `
# OpenAI MCP Support: Remote MCP Servers Guide 2026

The Model Context Protocol (MCP) started life as an Anthropic open standard for connecting language models to external tools and data, and by 2026 it has become the lingua franca of agent tooling across the industry. OpenAI now supports MCP as a first-class feature: instead of hand-writing JSON function schemas and wiring up your own tool-call dispatch loop, you point an OpenAI model at a remote MCP server's URL, and the model can discover and invoke every tool that server exposes. This collapses a huge amount of integration glue into a single configuration object, and it means the same MCP server you built for Claude, Cursor, or your internal agents can be reused verbatim with OpenAI's Responses API and the OpenAI Agents SDK.

This guide is a practical, code-first walkthrough of OpenAI's MCP support as it stands in 2026. We cover what a remote MCP server is and how it differs from the local stdio servers you may have run on your laptop, how to attach one to a model call using the hosted MCP tool, how authentication and approvals work, how to filter which tools are exposed, and — critically for any QA-minded reader — how to test an MCP integration so it behaves deterministically in CI. Every example is runnable Python using the official \`openai\` SDK, with JSON configuration shown where it matters. If you searched for "openai mcp support official docs 2026," "openai remote mcp official docs," or "openai mcp docs official," this is the hands-on reference to bookmark.

MCP matters for testing teams specifically because it is the seam where your agent meets the outside world, and seams are where bugs hide. If you are building QA tooling for AI agents, browse the installable [skills directory](/skills) and the wider [blog](/blog) for related material on [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) and [testing LLM applications](/blog/testing-llm-applications-guide). Let's start with the mental model.

## What MCP Is and Why OpenAI Adopted It

MCP is a client-server protocol. An MCP *server* exposes a set of capabilities — primarily **tools** (callable functions), but also **resources** (readable data) and **prompts** (reusable templates) — over a transport. An MCP *client*, embedded in the model runtime, connects to that server, lists what it offers, and calls tools on the model's behalf. The protocol is JSON-RPC under the hood, so any language that can serve HTTP can host an MCP server.

The reason this is a big deal is standardization. Before MCP, every model provider had its own function-calling format, and every integration was bespoke. With MCP, you write the integration once as a server, and any MCP-aware client — Claude Desktop, Cursor, the OpenAI Responses API — can consume it. OpenAI's adoption means the ecosystem of community MCP servers (for GitHub, Slack, Postgres, Stripe, browser automation, and hundreds more) is now directly usable from OpenAI models.

The table below summarizes the three capability types an MCP server can expose and how OpenAI models use them.

| MCP capability | What it is | How the model uses it |
|---|---|---|
| Tools | Callable functions with JSON schemas | Model decides to call; arguments validated against schema |
| Resources | Readable, addressable data (files, rows) | Model reads context without a side effect |
| Prompts | Named, parameterized prompt templates | Surfaced to the user or agent as starting points |

For OpenAI's hosted MCP tool, tools are the headline feature. The model lists the server's tools at the start of a turn, decides which to call, and the runtime executes the call against the remote server and feeds the result back into the model — no dispatch loop for you to write.

## Local stdio vs Remote MCP Servers

There are two transport flavors of MCP, and OpenAI's hosted support targets the remote one. Understanding the difference avoids the most common setup mistake.

A **local (stdio) server** runs as a subprocess on the same machine as the client and communicates over standard input/output. This is what powers desktop integrations: Claude Desktop spawns \`npx some-mcp-server\` and talks to it over pipes. It is convenient for local dev but cannot be reached by a cloud-hosted model, because there is no process for OpenAI's servers to spawn.

A **remote server** is reachable over HTTP, using either the newer Streamable HTTP transport or the older HTTP+SSE transport. Because it is just a URL, OpenAI's infrastructure can connect to it directly. This is the only transport the hosted MCP tool supports, which means: to use an MCP server with the Responses API, it must be deployed somewhere with a public (or OpenAI-reachable) HTTPS endpoint.

| Aspect | Local (stdio) | Remote (HTTP) |
|---|---|---|
| Transport | stdin/stdout pipes | Streamable HTTP / SSE |
| Reachable by hosted models | No | Yes |
| Typical use | Desktop apps, local dev | Production agents, OpenAI Responses API |
| Auth | OS process boundary | Bearer token / OAuth headers |
| Deployment | Subprocess on client machine | Cloud service behind a URL |

If you have only ever run stdio servers, the migration is mostly a deployment concern: wrap the same tool logic behind a Streamable HTTP endpoint. Many server frameworks (including the official MCP SDKs) support both transports from the same codebase.

## Attaching a Remote MCP Server to the Responses API

The simplest way to use MCP with OpenAI is the hosted \`mcp\` tool on the Responses API. You add one tool entry describing the server, and the model handles discovery and invocation. Here is a complete, runnable example that connects to a hypothetical deploy-status MCP server.

\`\`\`python
# responses_mcp.py
import os
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

response = client.responses.create(
    model="gpt-5.1",
    input="What is the status of our latest production deployment?",
    tools=[
        {
            "type": "mcp",
            "server_label": "deploybot",
            "server_url": "https://mcp.example.com/sse",
            # Forward auth to the remote server:
            "headers": {
                "Authorization": f"Bearer {os.environ['DEPLOYBOT_TOKEN']}"
            },
            # Skip the human approval step for a trusted server:
            "require_approval": "never",
        }
    ],
)

print(response.output_text)
\`\`\`

When this runs, OpenAI's runtime connects to \`server_url\`, lists the tools, exposes them to the model, and if the model decides to call \`get_deployment_status\` (or whatever the server names it), the runtime executes that call remotely and feeds the JSON result back. You never wrote a function schema or a dispatch \`if/elif\` block — the server's own tool definitions drive everything.

The equivalent configuration expressed as a standalone JSON object (useful if you build requests dynamically or in another language) looks like this:

\`\`\`json
{
  "type": "mcp",
  "server_label": "deploybot",
  "server_url": "https://mcp.example.com/sse",
  "headers": {
    "Authorization": "Bearer REDACTED"
  },
  "require_approval": "never"
}
\`\`\`

The \`server_label\` is an arbitrary identifier you choose; it shows up in the response output items so you can trace which server produced which tool call. Keep it short and stable — tests will assert against it.

## Authentication and Headers

Most real MCP servers are not public. They sit behind a bearer token, an API key, or full OAuth. OpenAI's MCP tool supports passing arbitrary headers to the remote server via the \`headers\` field, which is where you inject credentials. The runtime forwards those headers on every request it makes to the server.

The cardinal rule is the usual one: never hard-code secrets. Read them from the environment (or your secret manager) and inject at request time.

\`\`\`python
# auth_patterns.py
import os
from openai import OpenAI

client = OpenAI()

def mcp_tool(label: str, url: str, token_env: str) -> dict:
    """Build an MCP tool config with a bearer token from the environment."""
    token = os.environ[token_env]
    return {
        "type": "mcp",
        "server_label": label,
        "server_url": url,
        "headers": {"Authorization": f"Bearer {token}"},
        "require_approval": "never",
    }

response = client.responses.create(
    model="gpt-5.1",
    input="List the three most recently opened pull requests.",
    tools=[mcp_tool("github", "https://gh-mcp.example.com/sse", "GITHUB_MCP_TOKEN")],
)
print(response.output_text)
\`\`\`

For servers that speak OAuth, the pattern is to acquire an access token through your normal OAuth flow ahead of time and pass it in the \`Authorization\` header exactly as above. The MCP tool itself does not run the OAuth dance for you on the server-to-server path; it forwards whatever credential you hand it. Treat the token as short-lived and refresh it in your own code before it expires.

The following table summarizes the auth fields you will touch most often.

| Field | Purpose | Example value |
|---|---|---|
| \`headers.Authorization\` | Bearer token or API key for the server | \`Bearer eyJ...\` |
| \`server_url\` | HTTPS endpoint of the remote MCP server | \`https://mcp.example.com/sse\` |
| \`require_approval\` | Whether tool calls pause for human OK | \`never\` / \`always\` |
| \`allowed_tools\` | Whitelist of tool names to expose | \`["get_status"]\` |

## Tool Filtering and Approvals

A remote MCP server might expose dozens of tools, and you rarely want the model to reach all of them in a given context. The \`allowed_tools\` field whitelists exactly which tools the model may see and call. Anything not listed is hidden, which both reduces prompt bloat and shrinks the blast radius of a misbehaving model.

\`\`\`python
# filtered_tools.py
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5.1",
    input="How many open incidents are there right now?",
    tools=[
        {
            "type": "mcp",
            "server_label": "ops",
            "server_url": "https://ops-mcp.example.com/sse",
            # Only let the model call read-only status tools:
            "allowed_tools": ["count_incidents", "get_incident"],
            "require_approval": "always",
        }
    ],
)

# When require_approval is "always", the response contains an
# mcp_approval_request item the model is waiting on.
for item in response.output:
    if item.type == "mcp_approval_request":
        print("Model wants to call:", item.name, "with", item.arguments)
\`\`\`

The \`require_approval\` setting controls human-in-the-loop behavior. With \`"always"\`, every tool call surfaces an \`mcp_approval_request\` output item and the run pauses until you reply with an approval (or denial) by continuing the conversation. This is the right default for tools with side effects — anything that writes, deletes, charges money, or sends a message. For read-only servers in trusted environments, \`"never"\` keeps things snappy. You can also pass an object to require approval only for specific tools, approving safe reads automatically while gating dangerous writes.

A sensible policy is: read-only tools auto-approve, mutating tools always require approval. Encode that as a convention in your codebase and assert it in tests so a careless change cannot silently grant the model write access.

## Using MCP with the OpenAI Agents SDK

The Responses API approach is great for single calls, but multi-step agents benefit from the OpenAI Agents SDK, which has native MCP support. You register MCP servers on an agent, and the SDK handles listing tools and routing calls across the whole agent loop.

\`\`\`python
# agent_mcp.py
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp

async def main() -> None:
    # Connect to a remote MCP server over Streamable HTTP.
    async with MCPServerStreamableHttp(
        name="deploybot",
        params={
            "url": "https://mcp.example.com/mcp",
            "headers": {"Authorization": "Bearer " + __import__("os").environ["DEPLOYBOT_TOKEN"]},
        },
    ) as server:
        agent = Agent(
            name="Release Assistant",
            instructions="You answer questions about deployments using the tools available.",
            mcp_servers=[server],
        )
        result = await Runner.run(agent, "Did the 14:00 deploy succeed?")
        print(result.final_output)

asyncio.run(main())
\`\`\`

The SDK caches the tool list per connection and exposes every server tool to the agent automatically. Because the connection is an async context manager, the SDK opens the HTTP session, runs the agent, and tears the connection down cleanly. For agents that call the same server many times, enable tool-list caching so the SDK does not re-list tools on every turn — a measurable latency win when a server exposes many tools.

## Testing MCP Integrations Deterministically

This is the section QA teams care about. An MCP integration has two failure surfaces: the *wiring* (does the model reach the right server and call the right tool with the right arguments?) and the *server* (does the tool return correct results?). Test them separately.

For the server, treat it like any HTTP service and test it directly with a plain MCP client, bypassing the model entirely. That gives you fast, deterministic unit tests.

\`\`\`python
# test_mcp_server.py
import os
import pytest
from agents.mcp import MCPServerStreamableHttp

@pytest.mark.asyncio
async def test_get_status_tool_is_exposed():
    async with MCPServerStreamableHttp(
        name="deploybot",
        params={
            "url": os.environ["MCP_TEST_URL"],
            "headers": {"Authorization": f"Bearer {os.environ['MCP_TEST_TOKEN']}"},
        },
    ) as server:
        tools = await server.list_tools()
        names = {t.name for t in tools}
        assert "get_deployment_status" in names

@pytest.mark.asyncio
async def test_get_status_returns_known_shape():
    async with MCPServerStreamableHttp(
        name="deploybot",
        params={"url": os.environ["MCP_TEST_URL"]},
    ) as server:
        result = await server.call_tool(
            "get_deployment_status", {"environment": "staging"}
        )
        # Assert on the structured result your server returns.
        text = result.content[0].text
        assert "staging" in text
\`\`\`

For the wiring, you do want the model in the loop, but you must control the server so results are deterministic. Stand up a tiny fake MCP server that returns canned responses, point the Responses API at it, and assert that the model produced the tool call you expected. Inspect the response output items for the \`mcp_call\` entries.

\`\`\`python
# test_wiring.py
from openai import OpenAI

client = OpenAI()

def test_model_calls_status_tool():
    response = client.responses.create(
        model="gpt-5.1",
        input="What is the current staging status?",
        tools=[{
            "type": "mcp",
            "server_label": "fake",
            "server_url": "https://fake-mcp.internal/sse",
            "require_approval": "never",
        }],
    )
    called = [i for i in response.output if getattr(i, "type", "") == "mcp_call"]
    assert any(c.name == "get_deployment_status" for c in called)
\`\`\`

The table summarizes the test layers.

| Layer | What it verifies | How |
|---|---|---|
| Server unit | Tool exists and returns correct data | Direct MCP client, no model |
| Wiring | Model reaches the right tool | Responses API + fake server, assert \`mcp_call\` |
| Auth | Bad token is rejected | Direct call with wrong header expects error |
| Approval policy | Mutating tools gate on approval | Assert \`mcp_approval_request\` appears |

Run the server-unit tests on every commit; they are fast and need no model. Run the wiring tests on a slower cadence (they cost tokens and can be nondeterministic) with retries and tolerant assertions. For more on this split, see [testing LLM applications](/blog/testing-llm-applications-guide) and the broader [MCP testing automation guide](/blog/mcp-testing-automation-guide).

## Common Pitfalls and How to Avoid Them

A handful of mistakes account for most "my MCP server won't connect" support threads. First, **pointing at a stdio server**: if your URL is missing or you are trying to spawn a subprocess, the hosted tool cannot reach it — deploy it behind HTTPS. Second, **forgetting the trailing transport path**: Streamable HTTP and SSE endpoints often live at \`/mcp\` or \`/sse\` respectively; using the bare origin returns a 404. Third, **omitting auth headers**: a 401 from the server surfaces as a tool error, not an obvious "you forgot the token" message, so check the server logs.

Fourth, **over-broad tool exposure**: without \`allowed_tools\`, a server that exposes a \`delete_everything\` tool makes it reachable; always whitelist. Fifth, **auto-approving mutations**: \`require_approval: "never"\` on a write-capable server lets the model take destructive actions unsupervised. Finally, **non-idempotent tools in tests**: if a tool has side effects, your wiring tests will mutate real state — point them at a sandbox or a fake server. Encode all of these as lint rules or test assertions so they cannot regress.

## Frequently Asked Questions

### Does OpenAI officially support MCP in 2026?

Yes. OpenAI supports the Model Context Protocol as a first-class feature through the hosted \`mcp\` tool on the Responses API and via native MCP server registration in the OpenAI Agents SDK. You attach a remote MCP server by URL and the runtime handles tool discovery and invocation, so you no longer hand-write function schemas or a dispatch loop for those tools.

### What is the difference between a local and remote MCP server?

A local server runs as a subprocess and communicates over stdin/stdout pipes, which is convenient for desktop apps but unreachable by cloud-hosted models. A remote server is exposed over HTTPS using Streamable HTTP or SSE. OpenAI's hosted MCP tool only supports remote servers, because its infrastructure connects to a URL rather than spawning a process.

### How do I authenticate to a private MCP server from OpenAI?

Pass credentials in the \`headers\` field of the MCP tool config, typically as an \`Authorization: Bearer <token>\` header. The runtime forwards those headers to the server on every request. Read the token from an environment variable or secret manager, never hard-code it, and refresh OAuth tokens in your own code before they expire.

### How do I limit which tools the model can call?

Use the \`allowed_tools\` field to whitelist specific tool names. Any tool not listed is hidden from the model entirely, which reduces prompt size and limits the blast radius of an unexpected tool call. Combine this with \`require_approval\` set to \`always\` for any tool that has side effects such as writes, deletes, or payments.

### Can I reuse a Claude or Cursor MCP server with OpenAI?

Yes, as long as it is exposed over a remote HTTP transport. MCP is a shared open standard, so the same server that powers Claude Desktop or Cursor works with OpenAI's Responses API and Agents SDK without code changes. If your server only runs over stdio today, wrap the same tool logic behind a Streamable HTTP endpoint and deploy it.

### How do I test an MCP integration in CI?

Split the testing into layers. Test the server directly with a plain MCP client (no model) for fast, deterministic unit tests of each tool. Test the wiring by pointing the Responses API at a fake server that returns canned data and asserting the model produced the expected \`mcp_call\` items. Run server-unit tests on every commit and the slower, token-costing wiring tests on a reduced cadence with retries.

### What does require_approval do?

It controls human-in-the-loop gating. With \`"always"\`, each tool call surfaces an \`mcp_approval_request\` output item and pauses the run until you approve or deny it, which is the safe default for mutating tools. With \`"never"\`, tool calls execute immediately, which suits read-only servers in trusted environments. You can also pass an object to auto-approve safe reads while gating specific dangerous tools.

## Conclusion

OpenAI's MCP support turns the messy work of tool integration into a single configuration object: point a model at a remote MCP server's URL, pass the right auth headers, whitelist the tools you trust, and gate the dangerous ones behind approvals. The same servers you built for the broader agent ecosystem now work with the Responses API and the Agents SDK, and the standardization means your integration investment is portable across providers.

The piece that separates a demo from production is testing. Treat your MCP server like any HTTP service with fast, model-free unit tests, then layer in wiring tests against a fake server to confirm the model reaches the right tool. To go further, install agent-ready QA skills from the [skills directory](/skills), and explore the [blog](/blog) for deep dives on [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) and [MCP testing automation](/blog/mcp-testing-automation-guide). Wire it up, lock down the approvals, write the tests, and ship.
`,
};
