import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'VCR.py and pytest-recording: Record and Replay HTTP in Python Tests',
  description: 'Use vcr.py with pytest-recording to make Python API tests deterministic, scrub secrets, debug cassette mismatches, and keep CI safely offline.',
  date: '2026-09-28',
  category: 'API Testing',
  content: `
# VCR.py and pytest-recording: Record and Replay HTTP in Python Tests

VCR.py records real HTTP requests and responses into cassette files, then replays those cassettes during later test runs so Python API tests stop depending on a live third-party service. The practical answer is simple: install \`vcrpy\` plus \`pytest-recording\`, mark only the tests that should replay HTTP with \`@pytest.mark.vcr\`, commit sanitized cassette files, and run CI with recording disabled or with \`--record-mode=none\`.

As of the current official release notes, VCR.py is active, with 8.3.0 released on July 4, 2026. That release added \`niquests\` support, improved safe YAML behavior for custom tags, and fixed stale keep-alive connection reuse across cassettes. The VCR.py maintainers also explicitly recommend \`pytest-recording\` over the older \`pytest-vcr\`, which they describe as unmaintained in the 8.2.1 release notes. Start new pytest suites with \`pytest-recording\`, not \`pytest-vcr\`, unless you are deliberately maintaining legacy tests.

The payoff is not just speed. Good cassette tests give QA engineers a controlled lab for error bodies, pagination edges, retry behavior, expired tokens, odd status codes, and upstream schema drift. They work especially well with AI coding agents because the agent can run a narrow test repeatedly without burning API quota or inventing mocks that do not match production traffic. For related isolation techniques, pair this approach with [pytest monkeypatch and pytest-mock patterns](/blog/pytest-mock-monkeypatch-guide-2026) and full API workflow testing with [Tavern and pytest](/blog/tavern-pytest-api-testing-complete-guide).

## Current Tool Status and Version Choices

VCR.py is a Python port of the Ruby VCR idea: capture outbound HTTP interactions and replay them later. VCR.py 8.3.0 requires Python 3.10 or newer (its PyPI metadata sets \`requires_python >=3.10\`), supports PyPy, and common HTTP libraries including \`requests\`, \`urllib3\`, \`httpx\`, \`httpcore\`, \`aiohttp\`, \`boto3\`, \`httplib2\`, \`http.client\`, and \`tornado.httpclient\`. The 8.2.0 release notes specifically mention fixes for \`httpx\` 2.x and \`aiohttp\` 3.14 compatibility, which matters if your API client stack is modern and async.

\`pytest-recording\` is a pytest plugin powered by VCR.py. Its README lists the important pytest-facing features: a straightforward \`pytest.mark.vcr\` marker, support for multiple cassettes, network access blocking, and a plugin-specific \`rewrite\` mode that rewrites cassettes from scratch. Its source defines \`--record-mode\` choices as \`once\`, \`new_episodes\`, \`none\`, \`all\`, and \`rewrite\`, and defaults to \`none\` when the CLI option is not provided. That default is deliberately conservative.

| Component | Current status to plan around | Install command | Main job |
|---|---:|---|---|
| VCR.py | Active, latest verified release 8.3.0 | \`pip install vcrpy\` | Patch supported HTTP clients and store cassette interactions |
| pytest-recording | Active pytest plugin, preferred over pytest-vcr for new suites | \`pip install pytest-recording\` | Provide pytest markers, fixtures, CLI flags, cassette paths, and network blocking |
| pytest-vcr | Legacy option, described as unmaintained by VCR.py release notes | Avoid for new work | Older pytest bridge around VCR.py |
| PyYAML with libyaml | Optional speed improvement noted by VCR.py docs | Platform dependent | Faster YAML serialization and loading |

One nuance: VCR.py's Read the Docs pages may show 8.0.0 in page chrome while the GitHub and PyPI release streams show 8.3.0 as the latest package. Use the latest package for dependency pinning, but verify API names against the stable docs and the release notes when upgrading.

## Build the Smallest Useful Stack

For a test suite, pin both packages through the dependency manager your project already uses. This example uses \`pyproject.toml\` with pytest, requests, and httpx because many teams have both synchronous and async clients during migration.

\`\`\`toml
[project]
name = "payments-client-tests"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "httpx>=0.28.0",
  "pytest>=8.0.0",
  "pytest-asyncio>=0.24.0",
  "pytest-recording>=0.13.0",
  "requests>=2.32.0",
  "vcrpy>=8.3.0",
]
\`\`\`

Keep cassette tests separate from true contract, integration, and smoke tests. A useful directory layout is:

| Path | Purpose | Review rule |
|---|---|---|
| \`tests/api/test_billing_client.py\` | The pytest tests that exercise your client | Review like normal test code |
| \`tests/api/cassettes/test_billing_client/*.yaml\` | Generated cassette files from pytest-recording defaults | Review for secrets and brittle timestamps |
| \`tests/conftest.py\` | VCR configuration and network policy | Review every matcher and scrubber carefully |
| \`.github/workflows/api-tests.yml\` | Replay-only CI job | Keep recording disabled in pull requests |

\`pytest-recording\` stores cassettes under \`cassettes/{module_name}/{test_name}.yaml\` by default. A test named \`test_get_invoice\` in \`test_billing_client.py\` gets a cassette path similar to \`tests/api/cassettes/test_billing_client/test_get_invoice.yaml\`. You can override names with \`@pytest.mark.default_cassette("invoice.yaml")\` or pass explicit cassette paths to \`@pytest.mark.vcr("path.yaml")\`, but boring defaults are usually better because they reduce naming fights.

## Configure Cassettes Once, Then Override Deliberately

\`pytest-recording\` exposes a \`vcr_config\` fixture that returns a dictionary passed to \`VCR.use_cassette\` under the hood. Use this fixture to put your shared scrubbing, matching, and library directory decisions in one place. Per-test \`pytest.mark.vcr\` keyword arguments can override it when a test truly needs different behavior.

\`\`\`python
# tests/conftest.py
from __future__ import annotations

import json
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import pytest


SENSITIVE_JSON_KEYS = {"access_token", "refresh_token", "client_secret"}


def _scrub_json_body(raw_body: bytes | str) -> bytes | str:
    if isinstance(raw_body, bytes):
        text = raw_body.decode("utf-8")
        as_bytes = True
    else:
        text = raw_body
        as_bytes = False

    try:
        document = json.loads(text)
    except json.JSONDecodeError:
        return raw_body

    if not isinstance(document, dict):
        return raw_body

    for key in SENSITIVE_JSON_KEYS:
        if key in document:
            document[key] = "REDACTED"

    scrubbed = json.dumps(document, sort_keys=True).encode("utf-8")
    return scrubbed if as_bytes else scrubbed.decode("utf-8")


def before_record_request(request: Any) -> Any:
    split = urlsplit(request.uri)
    safe_query = []

    for key, value in parse_qsl(split.query, keep_blank_values=True):
        if key in {"api_key", "signature", "token"}:
            safe_query.append((key, "REDACTED"))
        else:
            safe_query.append((key, value))

    request.uri = urlunsplit(
        (split.scheme, split.netloc, split.path, urlencode(safe_query), split.fragment)
    )
    request.body = _scrub_json_body(request.body or b"")
    return request


def before_record_response(response: dict[str, Any]) -> dict[str, Any]:
    headers = response.get("headers", {})
    headers.pop("set-cookie", None)
    headers.pop("x-request-id", None)
    response["headers"] = headers

    body = response.get("body", {}).get("string")
    if body:
        response["body"]["string"] = _scrub_json_body(body)

    return response


@pytest.fixture(scope="session")
def vcr_config() -> dict[str, Any]:
    return {
        "filter_headers": [("authorization", "Bearer REDACTED")],
        "filter_query_parameters": [("api_key", "REDACTED")],
        "before_record_request": before_record_request,
        "before_record_response": before_record_response,
        "decode_compressed_response": True,
        "match_on": ["method", "scheme", "host", "port", "path", "query"],
    }
\`\`\`

This is stricter than many first attempts. It handles headers, query strings, JSON request bodies, and JSON response bodies because secrets leak in all four places. VCR.py's official advanced docs support \`filter_headers\`, \`filter_query_parameters\`, \`filter_post_data_parameters\`, \`before_record_request\`, \`before_record_response\`, and \`decode_compressed_response\`. Use the built-ins for common fields, then callbacks for domain-specific tokens.

## Choose Record Modes Like Release Controls

VCR.py's core record modes are \`once\`, \`new_episodes\`, \`none\`, and \`all\`. \`pytest-recording\` adds \`rewrite\`. Treat them as workflow controls, not just convenience flags.

| Mode | Network behavior | Good use | Risk |
|---|---|---|---|
| \`none\` | Replay only, fail on new HTTP | CI, local verification before commit | Fails until cassettes exist |
| \`once\` | Record if cassette is absent, then replay and fail on unexpected new requests | First recording of a new test | A changed request fails loudly |
| \`new_episodes\` | Replay known requests and append new unmatched ones | Expanding a workflow cassette | Can hide accidental extra calls |
| \`all\` | Always call the network and overwrite interactions | Scheduled refresh or manual re-record | Can capture changed production data |
| \`rewrite\` | pytest-recording mode that rewrites cassettes from scratch | Cleaning a stale cassette set | Requires careful secret review |

For day-to-day development, a good loop is:

\`\`\`bash
python -m pytest tests/api/test_billing_client.py --record-mode=once
python -m pytest tests/api/test_billing_client.py --record-mode=none
\`\`\`

The first command records any missing cassette. The second proves the test can run offline. AI coding agents should usually run the second command while editing application code, because it prevents the agent from changing test behavior by repeatedly touching the real API.

## Write Assertions Against Behavior, Not Cassette Existence

The cassette is infrastructure. The test still needs real assertions against the client contract. A weak cassette test checks only that the HTTP call did not crash. A useful cassette test verifies response mapping, pagination state, headers that drive behavior, and side effects inside your own code.

\`\`\`python
# tests/api/test_billing_client.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest
import requests


@dataclass(frozen=True)
class Invoice:
    invoice_id: str
    status: str
    total_cents: int


class BillingClient:
    def __init__(self, base_url: str, token: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def get_invoice(self, invoice_id: str) -> Invoice:
        response = self.session.get(
            f"{self.base_url}/anything/invoices/{invoice_id}",
            params={"include": "line_items"},
            timeout=10,
        )
        response.raise_for_status()
        payload: dict[str, Any] = response.json()
        args = payload["args"]
        url = payload["url"]

        assert "include=line_items" in url
        return Invoice(
            invoice_id=invoice_id,
            status=args.get("status", "open"),
            total_cents=int(args.get("total_cents", "0")),
        )


@pytest.mark.vcr
def test_get_invoice_maps_required_fields(vcr: Any) -> None:
    client = BillingClient("https://httpbin.org", token="test-token")

    invoice = client.get_invoice("inv_123")

    assert invoice.invoice_id == "inv_123"
    assert invoice.status == "open"
    assert invoice.total_cents == 0
    assert vcr.play_count == 1
\`\`\`

The \`vcr\` fixture returns the cassette object for marked tests, so you can assert call counts when call count is part of the behavior. Do not make cassette count the only assertion. If the production client accidentally stops parsing a required field, your test should fail even when replay works perfectly.

## Match Requests at the Right Precision

The default VCR.py matcher set is \`method\`, \`scheme\`, \`host\`, \`port\`, \`path\`, and \`query\`. That is a good default for most REST clients because it catches endpoint, method, and query changes without forcing volatile headers into every match. Add body matching for mutation endpoints where two POST calls to the same path can mean different business actions.

| API shape | Suggested \`match_on\` | Why |
|---|---|---|
| Read-only REST endpoint with query filters | \`["method", "scheme", "host", "port", "path", "query"]\` | Catches filter and endpoint regressions |
| GraphQL over one POST endpoint | \`["method", "scheme", "host", "port", "path", "body"]\` | The operation lives in the body |
| Signed URL where query order changes | Default matcher, plus scrub canonical query carefully | Prevents signature churn from dominating |
| Idempotent POST with JSON body | Add \`body\` or \`raw_body\` | Distinguishes different payloads |
| Header-driven API versioning | Add \`headers\` only after scrubbing volatile headers | Ensures version headers matter |

What people get wrong: they loosen matching to make flaky cassettes pass. If a cassette fails because the request URL changed from \`/v1/invoices\` to \`/v2/invoices\`, that is often the signal you wanted. Fix the client, re-record intentionally, or write a new cassette for the new behavior. Do not drop \`path\` or \`query\` from \`match_on\` just to silence a mismatch.

For GraphQL, use a callback to normalize the request body before recording and matching only if your client emits nondeterministic JSON key ordering. Prefer configuring the client to serialize deterministically first. The fewer transformations you need, the easier cassette reviews become.

## Async Clients: httpx and aiohttp

VCR.py supports \`httpx\` and \`aiohttp\`, and recent releases fixed compatibility issues in both areas. With pytest, the async detail is usually less about VCR.py and more about using a stable async test runner and closing clients cleanly.

\`\`\`python
# tests/api/test_async_catalog_client.py
from __future__ import annotations

from typing import Any

import httpx
import pytest


class CatalogClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def health(self) -> dict[str, Any]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
            response = await client.get("/anything/catalog/health")
            response.raise_for_status()
            return response.json()


@pytest.mark.asyncio
@pytest.mark.vcr
async def test_async_health_uses_catalog_path() -> None:
    client = CatalogClient("https://httpbin.org")

    payload = await client.health()

    assert payload["method"] == "GET"
    assert payload["url"].endswith("/anything/catalog/health")
\`\`\`

Avoid global async clients in cassette tests unless your application already manages their lifecycle. The VCR.py 8.3.0 release notes mention a keep-alive cassette fix, but you still get cleaner tests when every test closes its network resources before assertions complete.

## Block Network by Default

\`pytest-recording\` has a \`--block-network\` option and a \`block_network\` marker. It also supports \`--allowed-hosts\` and an \`allowed_hosts\` configuration path. Use this for tests that should never make accidental calls. A common policy is:

| Environment | Command | Intent |
|---|---|---|
| Developer records new cassette | \`python -m pytest tests/api --record-mode=once\` | Let missing cassettes be created |
| Developer verifies before commit | \`python -m pytest tests/api --record-mode=none --block-network\` | Prove replay-only behavior |
| Pull request CI | \`python -m pytest tests/api --record-mode=none --block-network\` | Stop accidental external calls |
| Scheduled cassette refresh | \`python -m pytest tests/api --record-mode=rewrite\` | Controlled re-record with review |

\`\`\`yaml
name: api cassette tests

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  replay:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
      - name: Install test dependencies
        run: |
          python -m pip install --upgrade pip
          python -m pip install -e .
      - name: Run replay-only tests
        run: |
          python -m pytest tests/api --record-mode=none --block-network
\`\`\`

For a scheduled refresh workflow, keep it separate from pull request CI and publish the cassette diff for human review. Never let an unreviewed scheduled job push rewritten cassettes into \`main\`.

## Scrub Secrets Before the Cassette Exists

Treat cassettes like source files that may contain production-like data. Header filtering alone is not enough. Look at these common leak locations:

| Leak location | Example | Mitigation |
|---|---|---|
| Request headers | \`Authorization: Bearer ...\` | \`filter_headers\` with replacement values |
| Query parameters | \`?api_key=...\` | \`filter_query_parameters\` and request callback |
| Request JSON body | OAuth token exchange payload | \`before_record_request\` body scrubbing |
| Response JSON body | Access tokens, customer emails, account IDs | \`before_record_response\` body scrubbing |
| Cookies | \`Set-Cookie\` headers | Drop or replace cookie headers |
| Signed URLs | Full temporary storage URL | Replace signatures and expiration fields |

Here is a tiny cassette review helper that fails if obvious secrets appear. It is intentionally simple and should complement, not replace, secret scanning in your repository.

\`\`\`python
# tools/check_cassettes.py
from __future__ import annotations

from pathlib import Path


FORBIDDEN_FRAGMENTS = [
    "Bearer sk_",
    "client_secret",
    "refresh_token",
    "BEGIN PRIVATE KEY",
]


def main() -> int:
    cassette_paths = sorted(Path("tests").glob("**/cassettes/**/*.yaml"))
    failed = False

    for path in cassette_paths:
        text = path.read_text(encoding="utf-8")
        for fragment in FORBIDDEN_FRAGMENTS:
            if fragment in text:
                print(f"{path}: contains forbidden fragment {fragment!r}")
                failed = True

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
\`\`\`

Add that script to CI after your pytest command. If it catches something, delete the cassette, fix the scrubber, then re-record. Do not edit a secret out manually and leave the faulty scrubber in place, because the next recording will reintroduce the leak.

## Diagnose the Cassette Mismatch That Everyone Hits

The most common failure mode is a new request during \`record_mode=none\` or \`once\` after the cassette already exists. The surface symptom usually says VCR could not find a matching request. The root cause is one of four things: the client changed the URL, a default query parameter appeared, the body changed, or the cassette was consumed earlier than expected.

Use a short investigation loop:

\`\`\`bash
python -m pytest tests/api/test_billing_client.py::test_get_invoice_maps_required_fields \\
  --record-mode=none \\
  -vv
\`\`\`

Then inspect the cassette request and the failing request from the exception. Look for:

| Symptom | Likely cause | Better fix than loosening everything |
|---|---|---|
| Path differs by API version | Client base URL or route changed | Update expected behavior and re-record intentionally |
| Query has extra tracking or timestamp | Client adds volatile parameter | Remove it from production call or scrub only that parameter |
| POST body order differs | Nondeterministic serializer | Sort keys in client serialization |
| Same request was already played | Code now calls endpoint twice | Assert the second call is expected or cache the first response |
| Header mismatch after adding \`headers\` matcher | Dynamic auth or trace headers | Match only stable headers after scrub |

Do not immediately delete the cassette. First learn what changed. Cassette mismatch errors are sometimes the earliest evidence that an SDK upgrade, generated client, or AI-authored refactor changed wire behavior.

## Refresh Strategy for Long-Lived Suites

Cassettes age. APIs add fields, change pagination defaults, alter rate-limit headers, or remove deprecated endpoints. A healthy suite has a refresh policy:

| Test type | Refresh cadence | Approval needed | Notes |
|---|---:|---|---|
| Core client mapping tests | When API contract changes | Code owner review | Keep stable and small |
| Error response fixtures | Rarely | QA lead review | Preserve edge cases deliberately |
| Pagination and search flows | Monthly or release based | Test owner review | Watch for changed defaults |
| Third-party sandbox smoke cassettes | Before major release | Security plus QA review | Verify no tokens leak |

A useful scheduled job runs \`--record-mode=rewrite\` against a sandbox account, stores the generated diff as an artifact, and opens a human-reviewed pull request. This is a good place for AI coding agents to help summarize cassette diffs, but not to rubber-stamp them. The reviewer should check whether new fields are harmless, whether removed fields affect assertions, and whether any secret placeholders failed.

## Where VCR.py Stops Being the Right Tool

VCR.py is excellent when you want to preserve observed HTTP behavior. It is weaker when the API contract itself should drive the test. If your team owns both client and server, use contract tests or schema tests for the boundary and cassette tests for the client's behavior against representative traffic. If your test must prove live credentials, rate limits, DNS, TLS, or vendor uptime, run a real integration or smoke test instead.

Use this split:

| Goal | Better fit |
|---|---|
| Client maps response fields correctly | VCR.py cassette test |
| Client sends expected retry headers | VCR.py with strict matching |
| Server conforms to OpenAPI | Contract testing |
| Sandbox credentials still work | Live smoke test |
| Error body from vendor remains documented | VCR.py cassette with deliberate fixture |
| Vendor uptime is acceptable | Monitoring or synthetic check |

Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the durable part is the policy: record intentionally, replay in CI, and refresh with review.

## Frequently Asked Questions

### Should I commit VCR.py cassette files?

Yes, if the cassettes are scrubbed and reasonably small. The whole replay model depends on later test runs being able to read the recorded interaction without calling the network. Put cassette files through code review, secret scanning, and targeted assertions. If a cassette contains large binary bodies, production personal data, or volatile responses that change every run, do not commit it as-is. Filter it, reduce the scenario, or move that case to a live smoke test.

### Is pytest-recording better than pytest-vcr now?

For new work, yes. VCR.py release notes now recommend \`pytest-recording\` over \`pytest-vcr\`, and \`pytest-recording\` provides current pytest integration, markers, network blocking, multiple cassettes, and the \`rewrite\` mode. Existing \`pytest-vcr\` suites do not need a panic rewrite, but migration is sensible when you are already touching the tests or upgrading VCR.py. Do not install both plugins together because \`pytest-recording\` treats them as incompatible.

### Which record mode should CI use?

Use \`--record-mode=none\` with \`--block-network\` in pull request CI. That combination proves the committed cassettes are sufficient and prevents unexpected live HTTP calls. Use \`once\` locally when creating a new cassette. Use \`rewrite\` or \`all\` only in a controlled refresh workflow where the cassette diff receives human review. The mode should encode intent: development may record, CI should replay, refresh jobs may replace.

### Can VCR.py test async Python HTTP clients?

Yes, VCR.py supports \`httpx\` and \`aiohttp\`, and recent release notes include compatibility fixes for both. The main testing discipline is to use a stable async pytest setup, close async clients inside the test or fixture, and avoid sharing open connections across unrelated cassette tests. Keep matching strict enough to catch real URL, method, query, and body changes. If an async cassette flakes, inspect lifecycle and connection reuse before weakening matchers.
`,
};
