TITLE: Mountebank Service Virtualization Guide (2026)
DESCRIPTION: Learn Mountebank service virtualization: create imposters, stubs, predicates, and multi-protocol mocks (HTTP, HTTPS, TCP, SMTP) to test without real dependencies.
DATE: 2026-06-15
CATEGORY: Testing
---
# Mountebank Service Virtualization Guide (2026)

Mountebank is an open-source service virtualization tool that lets you replace real backend dependencies with programmable test doubles called **imposters**. You start a Mountebank process, POST a JSON definition that creates an imposter listening on a port, and your application talks to that port instead of the real service. Each imposter contains **stubs** (canned responses), **predicates** (rules that decide which stub matches a request), and supports multiple protocols — HTTP, HTTPS, TCP, and SMTP — making it ideal for integration tests where you cannot or should not call live systems.

This guide covers installation, the imposter/stub/predicate model, multi-protocol virtualization, recording real traffic via proxies, stateful behaviors with injection, and how to wire Mountebank into CI. Where exact flags or JSON keys are version-sensitive, verify them against the official docs at mbtest.org, but the core model below has been stable for years.

## Why Mountebank instead of in-process mocks?

In-process mocking libraries (like Nock or MSW) patch the HTTP client inside your test runner. That is perfect for unit tests, but it breaks down when:

- The system under test is a **separate process** (a microservice, a containerized app, a CLI) that you cannot reach into.
- You need to virtualize a **non-HTTP protocol** such as raw TCP or SMTP.
- You want a **single shared mock** that several services or several test suites hit over the network.
- You need **record-and-replay** against a real upstream to bootstrap realistic stubs.

Mountebank solves all of these because it is an out-of-process mock server. Your app sends real network traffic to `localhost:<port>`; Mountebank answers. Nothing in your application code needs to know it is talking to a virtual service. This is the defining trait of **service virtualization** versus lightweight mocking — see our broader overview of [test doubles and mocking strategies](/blog) for where Mountebank fits in the taxonomy.

## Installation

Mountebank ships as an npm package and runs on Node.js. The simplest install is global:

```bash
# Install globally
npm install -g mountebank

# Start the admin server on the default port (2525)
mb start --port 2525

# Or run without installing, via npx
npx mountebank
```

You can also run it in Docker, which is the most common choice for CI:

```bash
docker run -p 2525:2525 -p 4545:4545 bbyars/mountebank:latest
```

Port `2525` is the **control plane** — you POST imposter definitions here. The other exposed ports (like `4545`) are where your imposters will actually listen. Once `mb` is running, confirm it is healthy:

```bash
curl http://localhost:2525/imposters
```

A `200` with an empty `imposters` array means you are ready.

## Imposters: the core concept

An **imposter** is a single virtual service on one port speaking one protocol. You create one by POSTing JSON to the control plane:

```bash
curl -i -X POST http://localhost:2525/imposters \
  -H 'Content-Type: application/json' \
  -d '{
    "port": 4545,
    "protocol": "http",
    "name": "user-service-mock",
    "stubs": [
      {
        "responses": [
          {
            "is": {
              "statusCode": 200,
              "headers": { "Content-Type": "application/json" },
              "body": { "id": 1, "name": "Alice" }
            }
          }
        ]
      }
    ]
  }'
```

Now any request to `http://localhost:4545/` returns the canned user. The top-level keys you will use most often are:

| Key | Meaning |
|---|---|
| `port` | The port the imposter listens on. Omit it and Mountebank assigns one and returns it in the response. |
| `protocol` | `http`, `https`, `tcp`, or `smtp`. |
| `name` | A label for readability in logs and the admin UI. |
| `stubs` | An ordered array of stub objects (see below). |
| `recordRequests` | When `true`, the imposter remembers every request it received, retrievable later for assertions. |

To inspect what an imposter received (useful for verifying your app sent the right payload), GET it:

```bash
curl http://localhost:2525/imposters/4545
```

The `requests` array in the response is your spy data — this is how Mountebank doubles as a **spy**, not just a stub.

## Stubs and the `is` / `proxy` / `inject` response types

A **stub** is a matched response template. Each stub has a `responses` array, and Mountebank cycles through those responses on repeated matches (so you can simulate a flaky endpoint that returns `503` then `200`). There are three response types:

- **`is`** — a literal canned response (status, headers, body). This is the everyday stub.
- **`proxy`** — forward the request to a real upstream and (optionally) record the reply as a new `is` stub. This powers record-and-replay.
- **`inject`** — run a JavaScript function to compute the response dynamically. This is how you build stateful or request-aware behavior.

```json
{
  "stubs": [
    {
      "responses": [
        { "is": { "statusCode": 503 } },
        { "is": { "statusCode": 200, "body": "recovered" } }
      ]
    }
  ]
}
```

The first call gets `503`, the second gets `200`, the third wraps back to `503`, and so on. This single feature replaces a lot of brittle retry-logic test scaffolding.

## Predicates: matching the right stub

**Predicates** are the rules that decide whether a stub applies to an incoming request. If a stub has no predicates, it matches everything. Add predicates to route different requests to different responses. Predicates live in a `predicates` array on the stub:

```json
{
  "stubs": [
    {
      "predicates": [
        { "equals": { "method": "GET", "path": "/users/1" } }
      ],
      "responses": [
        { "is": { "statusCode": 200, "body": { "id": 1, "name": "Alice" } } }
      ]
    },
    {
      "predicates": [
        { "equals": { "method": "POST", "path": "/users" } },
        { "matches": { "body": "\"email\":" } }
      ],
      "responses": [
        { "is": { "statusCode": 201, "body": { "id": 2 } } }
      ]
    }
  ]
}
```

Common predicate operators include:

| Operator | Behavior |
|---|---|
| `equals` | Exact match (case-insensitive by default) on a request field. |
| `deepEquals` | Match an entire object, including all query parameters or all headers. |
| `contains` | Substring / sub-collection match. |
| `matches` | Regular-expression match. |
| `exists` | Assert a field is present (or absent). |
| `startsWith` / `endsWith` | Prefix / suffix match on a string field. |

You can match on `method`, `path`, `query`, `headers`, and `body`. Predicates can be combined (all must pass within a stub) and you can wrap them in `and`, `or`, and `not` for complex routing. Mountebank evaluates stubs **in order** and uses the first one whose predicates all match, so put your most specific stubs first.

## Multi-protocol virtualization

HTTP is the most common use, but Mountebank's protocol abstraction is its real differentiator.

**HTTPS** works exactly like HTTP — set `"protocol": "https"`. Mountebank generates a self-signed certificate by default; for mutual TLS or a custom cert you supply `key`, `cert`, and `mutualAuth` options in the imposter definition.

**TCP** virtualizes raw socket services. You match and respond with `data` payloads (text or base64), which is invaluable for legacy financial or telecom protocols that are not HTTP at all:

```json
{
  "port": 5555,
  "protocol": "tcp",
  "mode": "text",
  "stubs": [
    {
      "predicates": [{ "contains": { "data": "PING" } }],
      "responses": [{ "is": { "data": "PONG\n" } }]
    }
  ]
}
```

**SMTP** lets you stand up a fake mail server so your app can "send" email during tests without a real SMTP relay. The imposter records the messages it received so you can assert on subject, recipients, and body.

This breadth is why Mountebank is often chosen over HTTP-only tools when an organization has a mix of REST services, legacy TCP integrations, and email flows to virtualize in one place.

## Record and replay with proxies

You rarely want to hand-write stubs for a large existing API. Instead, point a `proxy` response at the real service, run your tests once to capture traffic, then replay the recorded stubs offline:

```json
{
  "port": 4545,
  "protocol": "http",
  "stubs": [
    {
      "responses": [
        {
          "proxy": {
            "to": "https://api.production.example.com",
            "mode": "proxyOnce",
            "predicateGenerators": [
              { "matches": { "method": true, "path": true, "query": true } }
            ]
          }
        }
      ]
    }
  ]
}
```

The `predicateGenerators` block tells Mountebank how to turn each recorded request into a predicate for the saved stub, so replayed responses match the same way the originals did. The `proxyOnce` mode records each unique request a single time; subsequent identical requests are served from the recording rather than hitting the real upstream. After recording, save the imposter (`GET /imposters/4545?replayable=true`) to a file and load it later with `mb start --configfile`.

A word of caution: recorded traffic can contain secrets, tokens, or PII. Scrub recordings before committing them to version control.

## Stateful behavior with injection

For workflows where a POST must affect a later GET, use `inject` responses. Mountebank gives the function a `state` object that persists across requests to that imposter:

```javascript
function (request, state, logger) {
  state.users = state.users || [];
  if (request.method === 'POST') {
    const user = JSON.parse(request.body);
    user.id = state.users.length + 1;
    state.users.push(user);
    return { statusCode: 201, body: JSON.stringify(user) };
  }
  return { statusCode: 200, body: JSON.stringify(state.users) };
}
```

Injection must be enabled when you start Mountebank with the `--allowInjection` flag, because it executes arbitrary JavaScript. Only enable it for trusted local or CI definitions, never for an imposter that accepts definitions from untrusted sources.

## Using Mountebank in CI

Mountebank fits cleanly into a CI pipeline because it is just a process and an HTTP API. A typical GitHub Actions job starts it, loads a config, runs tests, then tears it down:

```yaml
name: integration-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Start Mountebank
        run: npx mountebank --allowInjection --configfile mb-config.json &
      - name: Wait for control plane
        run: npx wait-on http://localhost:2525/imposters
      - run: npm test
        env:
          USER_SERVICE_URL: http://localhost:4545
```

The key is pointing your application's service URLs at the imposter ports via environment variables, so the same test suite runs against virtual services in CI and real services in staging without code changes.

## Common errors and troubleshooting

- **`EADDRINUSE` on imposter create** — the port is already taken. Either stop the conflicting process or omit `port` and let Mountebank assign one (it returns the chosen port in the create response).
- **A stub never matches** — predicates are evaluated top-down and the first matching stub wins. A broad stub placed before a specific one will shadow it. Reorder so specific predicates come first.
- **Injection silently ignored** — you forgot `--allowInjection`. Mountebank disables `inject` responses unless that flag is set.
- **Case sensitivity surprises** — `equals` is case-insensitive by default. Add `"caseSensitive": true` to the predicate when matching tokens or signatures.
- **Empty `requests` array** — `recordRequests` defaults to off in some configurations. Set `"recordRequests": true` on the imposter to capture request history for spy-style assertions.

## Mountebank vs WireMock vs Prism

All three are out-of-process mock servers, but they target different sweet spots:

| Tool | Strength | Best when |
|---|---|---|
| **Mountebank** | Multi-protocol (HTTP/S, TCP, SMTP), JS injection for stateful logic | You need protocols beyond HTTP or fully programmable behavior |
| **WireMock** | Rich HTTP request matching, response templating, fault injection, Java ecosystem | You are HTTP-only and live in the JVM world |
| **Prism** | Spins a mock directly from an OpenAPI spec | You have an accurate OpenAPI contract and want zero hand-written stubs |

If your virtualization needs are HTTP-only and you already maintain an OpenAPI spec, a contract-driven tool may be simpler. If you have heterogeneous protocols or need dynamic stateful logic, Mountebank is hard to beat. Compare these and other tooling tradeoffs on our [tool comparison hub](/compare).

## Where Mountebank fits in your test pyramid

Service virtualization with Mountebank belongs in the **integration** layer — between fast in-process unit tests and slow end-to-end tests against real systems. Use it to make integration tests deterministic, to develop against dependencies that do not exist yet, and to reproduce upstream failure modes on demand. Keep a smaller suite of real-dependency tests in staging to catch contract drift. Browse ready-to-install QA skills that teach AI coding agents these patterns at [/skills](/skills).

## Frequently Asked Questions

### What is the difference between Mountebank and WireMock?

Both are out-of-process mock servers, but Mountebank supports multiple protocols — HTTP, HTTPS, TCP, and SMTP — and uses JavaScript injection for dynamic, stateful responses. WireMock is HTTP-focused, lives in the Java ecosystem, and offers very rich HTTP request matching and response templating. Choose Mountebank when you need non-HTTP protocols or programmable logic; choose WireMock when you are HTTP-only on the JVM.

### What is an imposter in Mountebank?

An imposter is a single virtual service that listens on one port and speaks one protocol. You create it by POSTing a JSON definition to Mountebank's control plane on port 2525. Each imposter contains stubs and predicates that determine how it responds, and can optionally record the requests it receives for later verification.

### Can Mountebank record real API traffic?

Yes. Use a `proxy` response that points at the real upstream service. With `proxyOnce` mode and `predicateGenerators`, Mountebank forwards each unique request once, records the response as a replayable stub, and serves subsequent matching requests from the recording. Save the imposter with `?replayable=true` to persist the captured stubs for offline replay.

### Is Mountebank free and open source?

Yes, Mountebank is open source and free to use. It is distributed as an npm package and runs on Node.js, and there is an official Docker image for containerized environments. Always confirm the current license and version specifics on the official project site before adopting it in a commercial pipeline.

### How do I make Mountebank return different responses on each call?

Put multiple `responses` in a single stub. Mountebank cycles through them in order on repeated matches and wraps back to the start. For example, a stub with a `503` response followed by a `200` response returns `503` on the first call and `200` on the second, which is ideal for testing retry and circuit-breaker logic.

### Do I need to enable anything to use JavaScript injection?

Yes. Dynamic `inject` responses execute arbitrary JavaScript, so Mountebank only runs them when you start the process with the `--allowInjection` flag. Enable it only for trusted local and CI configurations, never for an instance that accepts imposter definitions from untrusted clients.
