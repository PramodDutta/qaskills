import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LocalStack Bedrock Mock Testing Guide for 2026 (boto3)',
  description:
    'Mock Amazon Bedrock with LocalStack Pro: test the bedrock-runtime Converse API in boto3, write pytest integration tests, and stub LLM responses without AWS bills.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# LocalStack Bedrock Mock Testing Guide 2026

Building applications on Amazon Bedrock means your code talks to large language models through the \`bedrock-runtime\` API. That is great in production and terrible in tests. Real Bedrock calls cost money per token, add network latency that makes test suites crawl, return non-deterministic output that breaks assertions, and require live AWS credentials that you do not want sitting in CI. LocalStack solves this by running a high-fidelity emulator of AWS on your laptop, and its Pro tier emulates Bedrock, including the modern \`Converse\` and \`ConverseStream\` APIs, so you can test the full request/response cycle locally, deterministically, and for free.

This guide is a practical 2026 reference to mocking Amazon Bedrock with LocalStack. We cover what LocalStack Bedrock does and does not emulate, how to start it, how to point boto3 at the local endpoint, how to invoke the \`bedrock-runtime\` \`Converse\` API against the mock, and how to wire all of this into fast pytest integration tests. Every code block is runnable Python using boto3. Whether you searched for "localstack bedrock," "mock bedrock converse api," or "test bedrock locally pytest," this is the reference you want.

If you are testing AI-powered features more broadly, our [skills directory](/skills) has installable QA skills for AI coding agents, and the [blog](/blog) covers AI agent evaluation and LLM testing patterns in depth. The core idea here is the same one behind all good service virtualization: replace the slow, costly, non-deterministic external dependency with a local stand-in that behaves like the real thing at the protocol level, so your tests exercise your code, not Amazon's servers.

## What LocalStack Bedrock Emulates

LocalStack is a cloud service emulator that runs in a single Docker container and reimplements the AWS APIs locally. The community edition covers core services like S3, SQS, DynamoDB, and Lambda. Bedrock support lives in LocalStack Pro, the paid tier, because emulating a model-serving API is substantially more involved than emulating a queue. With Pro, the \`bedrock\` (control plane: list models, manage configuration) and \`bedrock-runtime\` (data plane: invoke models) services respond on your local endpoint.

It is important to understand what "emulating Bedrock" means. LocalStack does not host the actual Anthropic Claude, Amazon Titan, or Meta Llama weights and run inference for you for free. Instead, depending on configuration, it either downloads and runs a small local model through Ollama to produce real (if smaller) completions, or it returns canned/stubbed responses. For testing application *plumbing* — that your code constructs the right \`Converse\` request, handles the response shape, parses \`stopReason\`, accumulates streamed chunks, and reacts to throttling errors — the exact quality of the generated text rarely matters. What matters is that the API contract is faithful, and that is precisely what LocalStack gives you.

The table below frames the trade-off.

| Concern | Real Bedrock | LocalStack Bedrock |
|---|---|---|
| Cost | Per-token billing | Free (Pro license aside) |
| Latency | Network + inference | Local, fast |
| Determinism | Non-deterministic | Controllable / stubable |
| API contract | Source of truth | High-fidelity emulation |
| Model quality | Full Claude/Titan/Llama | Small local model or stub |
| Credentials | Real AWS keys | Dummy keys |

## Starting LocalStack with Bedrock

You start LocalStack as a Docker container. For Bedrock you need a Pro auth token set in the environment. The simplest path is the \`localstack\` CLI, which wraps Docker for you.

\`\`\`bash
# Install the CLI (one time)
pip install localstack

# Provide your LocalStack Pro auth token
export LOCALSTACK_AUTH_TOKEN="ls-your-pro-token-here"

# Start LocalStack; eager-load the bedrock provider so the
# (optionally) bundled local model is ready before tests run
DEBUG=1 SERVICES=bedrock EXTRA_CORS_ALLOWED_ORIGINS="*" \\
  localstack start -d

# Confirm it is healthy and bedrock is available
localstack status services | grep bedrock
\`\`\`

For repeatable local development and CI, a \`docker-compose.yml\` is cleaner because it pins configuration in version control.

\`\`\`yaml
# docker-compose.yml
services:
  localstack:
    image: localstack/localstack-pro:latest
    ports:
      - "4566:4566" # the single edge endpoint for all services
    environment:
      - LOCALSTACK_AUTH_TOKEN=\${LOCALSTACK_AUTH_TOKEN}
      - SERVICES=bedrock
      - DEBUG=1
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
\`\`\`

The first time Bedrock starts it may download a local model image, which takes a while; subsequent starts are fast because the layer is cached. All AWS services in LocalStack listen on a single edge port, \`4566\`, so your client only ever needs that one endpoint URL.

## Pointing boto3 at LocalStack

boto3 talks to LocalStack exactly as it talks to AWS, with two changes: the \`endpoint_url\` points at \`http://localhost:4566\`, and the credentials are dummy values (LocalStack does not validate them). Centralize this in a small factory so production code and test code share one switch.

\`\`\`python
# clients.py
import os
import boto3

def bedrock_runtime_client():
    """Return a bedrock-runtime client.

    When BEDROCK_ENDPOINT is set (tests / local dev) we point at
    LocalStack; otherwise boto3 uses the real AWS endpoint.
    """
    endpoint = os.environ.get("BEDROCK_ENDPOINT")  # e.g. http://localhost:4566
    if endpoint:
        return boto3.client(
            "bedrock-runtime",
            endpoint_url=endpoint,
            region_name="us-east-1",
            aws_access_key_id="test",
            aws_secret_access_key="test",
        )
    return boto3.client("bedrock-runtime", region_name="us-east-1")
\`\`\`

The key design choice is that nothing about your *application* logic knows it is talking to a mock. You flip one environment variable and the same code runs against LocalStack in tests and real Bedrock in production. This is what keeps the test meaningful: you are exercising the production code path, not a test-only branch.

## Invoking the Converse API

The modern way to call a chat model on Bedrock is the \`Converse\` API, which gives a uniform request/response shape across model families so you do not hand-roll each provider's bespoke JSON body. A minimal call sends a list of messages and reads the assistant's reply out of the structured response.

\`\`\`python
# converse_demo.py
from clients import bedrock_runtime_client

def ask(prompt: str, model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0") -> str:
    client = bedrock_runtime_client()
    response = client.converse(
        modelId=model_id,
        messages=[
            {"role": "user", "content": [{"text": prompt}]},
        ],
        inferenceConfig={"maxTokens": 256, "temperature": 0.0},
    )
    # The reply lives in output.message.content[*].text
    parts = response["output"]["message"]["content"]
    return "".join(block.get("text", "") for block in parts)

if __name__ == "__main__":
    print(ask("Summarize what a smoke test is in one sentence."))
\`\`\`

Run it against LocalStack by exporting the endpoint first.

\`\`\`bash
export BEDROCK_ENDPOINT="http://localhost:4566"
python converse_demo.py
\`\`\`

The response object mirrors real Bedrock: \`output.message.content\` is a list of content blocks, \`stopReason\` tells you why generation ended (\`end_turn\`, \`max_tokens\`, \`tool_use\`, etc.), and \`usage\` reports token counts. Your assertions should target this structure, not the exact text, because the text comes from a small local model and is not stable.

The streaming variant, \`converse_stream\`, returns an event stream you iterate. Testing that your accumulation logic is correct is a classic case where the mock shines.

\`\`\`python
# stream_demo.py
from clients import bedrock_runtime_client

def ask_stream(prompt: str,
               model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0") -> str:
    client = bedrock_runtime_client()
    response = client.converse_stream(
        modelId=model_id,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
    )
    chunks = []
    for event in response["stream"]:
        # Text arrives in contentBlockDelta events
        if "contentBlockDelta" in event:
            delta = event["contentBlockDelta"]["delta"]
            chunks.append(delta.get("text", ""))
    return "".join(chunks)
\`\`\`

## Writing pytest Integration Tests

With the client factory and the endpoint switch in place, integration tests are straightforward. Use a session-scoped fixture so the LocalStack endpoint is wired once, and assert against the *shape* of the response. Here is a complete test module.

\`\`\`python
# test_bedrock_converse.py
import os
import pytest
from clients import bedrock_runtime_client
from converse_demo import ask

MODEL = "anthropic.claude-3-sonnet-20240229-v1:0"

@pytest.fixture(scope="session", autouse=True)
def point_at_localstack():
    """Force all clients in this suite at LocalStack."""
    os.environ["BEDROCK_ENDPOINT"] = "http://localhost:4566"
    yield
    os.environ.pop("BEDROCK_ENDPOINT", None)

def test_converse_returns_well_formed_response():
    client = bedrock_runtime_client()
    resp = client.converse(
        modelId=MODEL,
        messages=[{"role": "user", "content": [{"text": "hello"}]}],
        inferenceConfig={"maxTokens": 64},
    )
    # Assert the contract, not the content
    assert "output" in resp
    assert resp["output"]["message"]["role"] == "assistant"
    assert isinstance(resp["output"]["message"]["content"], list)
    assert resp["stopReason"] in {"end_turn", "max_tokens", "stop_sequence"}
    assert resp["usage"]["inputTokens"] >= 0

def test_helper_returns_string():
    answer = ask("What is a regression test?")
    assert isinstance(answer, str)
    assert len(answer) >= 0  # local model output length is not guaranteed
\`\`\`

Run the suite with the container already up.

\`\`\`bash
# Bring LocalStack up, run tests, tear down
localstack start -d
pytest test_bedrock_converse.py -v
localstack stop
\`\`\`

The discipline of asserting the contract — keys present, roles correct, \`stopReason\` valid, \`usage\` populated — rather than asserting the literal completion text is what makes these tests stable. The text is the model's job; your job is to send a valid request and correctly parse whatever well-formed response comes back.

## Stubbing Deterministic Responses

Sometimes you need an exact response — to test a parser that extracts a JSON object from the model's reply, or to simulate a specific \`stopReason\` like \`tool_use\`. For full determinism, pair LocalStack's API layer with a thin response stub at your own boundary, or use moto/botocore stubbers for pure unit tests where you do not want a container at all. The botocore \`Stubber\` lets you script exact responses without any network.

\`\`\`python
# test_parser_with_stubber.py
import botocore.session
from botocore.stub import Stubber

def test_parses_tool_use_stop_reason():
    session = botocore.session.get_session()
    client = session.create_client("bedrock-runtime", region_name="us-east-1")
    stubber = Stubber(client)

    expected = {
        "output": {
            "message": {
                "role": "assistant",
                "content": [{"text": '{"city":"Pune"}'}],
            }
        },
        "stopReason": "end_turn",
        "usage": {"inputTokens": 8, "outputTokens": 5, "totalTokens": 13},
        "metrics": {"latencyMs": 12},
    }
    stubber.add_response("converse", expected)

    with stubber:
        resp = client.converse(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            messages=[{"role": "user", "content": [{"text": "which city?"}]}],
        )
    text = resp["output"]["message"]["content"][0]["text"]
    assert text == '{"city":"Pune"}'
\`\`\`

This gives you two complementary tiers: LocalStack for end-to-end integration fidelity (real HTTP, real boto3 serialization, real error shapes), and the botocore Stubber for pinpoint, container-free unit tests of your parsing and branching logic. The table contrasts the approaches.

| Approach | Container needed | Determinism | Best for |
|---|---|---|---|
| LocalStack Pro Bedrock | Yes | Medium (local model) | Integration / contract tests |
| botocore Stubber | No | Full | Unit tests of parsing/branching |
| moto | No | Full | Lightweight AWS mocks |
| Real Bedrock | No (cloud) | Low | Pre-release smoke / eval only |

## Simulating Errors and Throttling

Robust applications must handle Bedrock throwing \`ThrottlingException\`, \`ValidationException\`, or \`ModelTimeoutException\`. The botocore Stubber makes injecting these trivial, so you can prove your retry and backoff logic works without hammering a real endpoint into rate-limiting you.

\`\`\`python
# test_throttling.py
import botocore.session
from botocore.stub import Stubber
from botocore.exceptions import ClientError
import pytest

def test_throttling_is_raised():
    session = botocore.session.get_session()
    client = session.create_client("bedrock-runtime", region_name="us-east-1")
    stubber = Stubber(client)
    stubber.add_client_error(
        "converse",
        service_error_code="ThrottlingException",
        service_message="Too many requests",
        http_status_code=429,
    )
    with stubber, pytest.raises(ClientError) as exc:
        client.converse(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            messages=[{"role": "user", "content": [{"text": "hi"}]}],
        )
    assert exc.value.response["Error"]["Code"] == "ThrottlingException"
\`\`\`

Wrapping this in a test for your own retry helper proves the production behavior you care about — that you back off and eventually succeed or fail cleanly — entirely offline. For broader patterns on testing AI features and agents, the [blog](/blog) has dedicated guides, and the [skills directory](/skills) has agent-installable testing skills.

## Testing Tool Use and Structured Output

Real Bedrock applications rarely just ask for free text; they use tool calling (function calling) and request structured JSON. The \`Converse\` API expresses tools through a \`toolConfig\`, and when the model decides to call a tool it returns \`stopReason: "tool_use"\` with a \`toolUse\` content block carrying the tool name and input. Your application then runs the tool and sends the result back in a follow-up \`Converse\` call. This multi-turn dance is exactly the kind of plumbing that is painful to debug against the live API and cheap to test against a mock or stub.

\`\`\`python
# tool_use.py — send a tool definition and detect a tool_use response
from clients import bedrock_runtime_client

TOOL_CONFIG = {
    "tools": [
        {
            "toolSpec": {
                "name": "get_weather",
                "description": "Get the weather for a city",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {"city": {"type": "string"}},
                        "required": ["city"],
                    }
                },
            }
        }
    ]
}

def maybe_call_tool(prompt: str,
                    model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"):
    client = bedrock_runtime_client()
    resp = client.converse(
        modelId=model_id,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        toolConfig=TOOL_CONFIG,
    )
    if resp["stopReason"] == "tool_use":
        for block in resp["output"]["message"]["content"]:
            if "toolUse" in block:
                return block["toolUse"]["name"], block["toolUse"]["input"]
    return None, None
\`\`\`

Because the tool-use path depends on the model actually deciding to call the tool — which a small local model may not do reliably — the deterministic way to test your *handling* of a tool_use response is the botocore Stubber, scripting a response with \`stopReason: "tool_use"\` and a \`toolUse\` block, then asserting your code dispatches to the right tool with the right input. LocalStack covers the happy-path integration; the Stubber covers the exact branching.

\`\`\`python
# test_tool_use.py — deterministic tool_use handling via Stubber
import botocore.session
from botocore.stub import Stubber

def test_dispatches_get_weather():
    session = botocore.session.get_session()
    client = session.create_client("bedrock-runtime", region_name="us-east-1")
    stubber = Stubber(client)
    stubber.add_response("converse", {
        "output": {"message": {"role": "assistant", "content": [
            {"toolUse": {"toolUseId": "t1", "name": "get_weather",
                          "input": {"city": "Pune"}}}
        ]}},
        "stopReason": "tool_use",
        "usage": {"inputTokens": 20, "outputTokens": 10, "totalTokens": 30},
    })
    with stubber:
        resp = client.converse(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            messages=[{"role": "user", "content": [{"text": "weather in Pune?"}]}],
        )
    block = resp["output"]["message"]["content"][0]["toolUse"]
    assert block["name"] == "get_weather"
    assert block["input"]["city"] == "Pune"
\`\`\`

## Wiring It Into CI

The last mile is making this run unattended in your pipeline. The pattern is: start LocalStack as a service, wait for it to report healthy, run the suite with \`BEDROCK_ENDPOINT\` set, then stop it. On GitHub Actions you run LocalStack as a service container or start it inline; the auth token comes from a repository secret. The key is the health gate — never run tests before \`localstack status\` confirms Bedrock is up, or the first test races the container and flakes.

\`\`\`yaml
# .github/workflows/bedrock-tests.yml
jobs:
  bedrock-integration:
    runs-on: ubuntu-latest
    env:
      LOCALSTACK_AUTH_TOKEN: \${{ secrets.LOCALSTACK_AUTH_TOKEN }}
      BEDROCK_ENDPOINT: http://localhost:4566
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install localstack boto3 pytest
      - name: Start LocalStack
        run: SERVICES=bedrock localstack start -d
      - name: Wait for Bedrock
        run: |
          for i in $(seq 1 30); do
            localstack status services | grep -q "bedrock.*available" && break
            sleep 2
          done
      - run: pytest -v
      - if: always()
        run: localstack stop
\`\`\`

Splitting your suite so that fast Stubber-based unit tests run on every push and the heavier LocalStack integration tests run on a separate, slightly slower job (or nightly) keeps developer feedback snappy while still exercising the full integration path regularly. For more on structuring CI test stages, see the pipeline guides on the [blog](/blog) and the agent-installable skills in the [directory](/skills).

## Frequently Asked Questions

### Is Bedrock support free in LocalStack?

No. Bedrock emulation is a LocalStack Pro feature, so you need a Pro license and an auth token set via \`LOCALSTACK_AUTH_TOKEN\`. The community (free) edition emulates core services like S3, SQS, and DynamoDB but not Bedrock. That said, the cost of a Pro seat is typically far lower than the per-token bills and engineering time you save by not hitting real Bedrock from every test run in CI.

### Does LocalStack run a real LLM or just return canned text?

It depends on configuration. LocalStack can run a small local model via Ollama to produce genuine (if lower-quality) completions, or return stubbed responses. For testing application plumbing — request construction, response parsing, streaming accumulation, error handling — the text quality is irrelevant; the API contract fidelity is what matters. When you need exact text, pair LocalStack with a botocore Stubber or your own response stub at the boundary.

### How do I point boto3 at LocalStack instead of AWS?

Create your client with \`endpoint_url="http://localhost:4566"\` and dummy credentials (\`aws_access_key_id="test"\`, \`aws_secret_access_key="test"\`). LocalStack exposes every service on the single edge port 4566 and does not validate credentials. Centralize this behind an environment-variable switch so the same application code runs against LocalStack in tests and real Bedrock in production with no test-only code branches.

### Should I assert on the model's generated text in tests?

Generally no. Because the completion comes from a small local model (or a stub), the exact text is not stable and asserting on it makes tests flaky. Assert on the response *contract* instead: that \`output.message.role\` is \`assistant\`, that \`content\` is a list of blocks, that \`stopReason\` is one of the valid values, and that \`usage\` is populated. Reserve exact-text assertions for botocore Stubber tests where you control the response byte for byte.

### Can I test the streaming ConverseStream API locally?

Yes. LocalStack emulates \`converse_stream\`, returning an event stream you iterate just like real Bedrock. This is one of the highest-value things to test locally because streaming accumulation logic — collecting \`contentBlockDelta\` events into a final string, handling \`messageStop\`, and reacting to mid-stream errors — is easy to get subtly wrong and expensive to debug against the live API.

### What is the difference between LocalStack and the botocore Stubber for this?

LocalStack runs a real local HTTP server emulating Bedrock, so your test exercises full boto3 serialization, real network calls, and authentic error shapes — ideal for integration and contract tests. The botocore Stubber intercepts calls in-process with scripted responses and no container, giving full determinism — ideal for fast unit tests of parsing and branching. Use both: LocalStack for fidelity, Stubber for pinpoint control.

### How do I simulate Bedrock throttling or validation errors?

The easiest way is the botocore Stubber's \`add_client_error\`, which lets you inject a \`ThrottlingException\` (429), \`ValidationException\`, or any other AWS error code so you can prove your retry, backoff, and error-handling logic works without rate-limiting a real endpoint. This keeps resilience tests fast and offline, and it never costs tokens or risks tripping production quotas.

## Conclusion

Mocking Amazon Bedrock with LocalStack gives you the thing that makes AI features actually testable: a local, fast, free stand-in that honors the \`bedrock-runtime\` API contract — including the \`Converse\` and \`ConverseStream\` APIs — so your boto3 code runs unchanged in tests and production. Layer LocalStack Pro for integration fidelity with the botocore Stubber for deterministic unit tests, assert on response shape rather than generated text, and inject errors to prove your resilience logic. The result is a Bedrock test suite that runs in CI in seconds without an AWS bill.

Want more AI-testing firepower? Explore installable QA skills for your coding agent in the [QASkills directory](/skills) and read the AI agent evaluation and LLM testing guides on the [blog](/blog). Install a Bedrock testing skill into Claude Code or Cursor and let your agent scaffold LocalStack fixtures and Converse contract tests for your whole codebase.
`,
};
