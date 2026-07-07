import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Keploy API Test Generation From Real Traffic: A Practical Guide',
  description:
    'Learn Keploy API test generation from real traffic: record-and-replay, auto-generated test cases and mocks, eBPF capture, CI replay, and coverage gains.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# Keploy API Test Generation From Real Traffic: A Practical Guide

Writing API tests by hand is slow, and the tests you write only cover the requests you imagined. Keploy takes a different route: it watches the real traffic your application already handles, records each request and its response, captures the outbound calls to databases and third-party services as mocks, and turns all of that into a test suite you can replay in CI. You get integration tests generated from actual usage, complete with the data dependencies stubbed out, without writing a single assertion by hand.

This guide explains how Keploy's record-and-replay model works, how it captures traffic (including the eBPF approach that requires no code changes), how the generated test cases and mocks fit together, how to replay them deterministically in CI, and where Keploy fits relative to hand-written tests. If you already invest in [API contract testing across microservices](/blog/api-contract-testing-microservices), Keploy complements that work by covering the concrete request/response behavior your contracts describe abstractly.

## The Problem Keploy Solves

Consider a typical service endpoint. To test it properly you need to construct a realistic request, then stub every downstream dependency: the Postgres query, the Redis lookup, the call to the payments API. Building those mocks by hand is the tedious, error-prone part of integration testing, and the mocks rot the moment the real dependencies change.

Keploy inverts the effort. Instead of you constructing the request and the mocks, it observes a real request flowing through your running application, records the outputs of every downstream call at that moment, and freezes them. On replay, it re-sends the recorded request, intercepts the same downstream calls, and serves the recorded responses, so the test is deterministic and hermetic without any manual stubbing.

| Task | Hand-written integration test | Keploy |
| --- | --- | --- |
| Construct the request | Manual | Captured from real traffic |
| Stub the database | Manual mock | Recorded automatically |
| Stub third-party APIs | Manual mock | Recorded automatically |
| Assert the response | Manual assertion | Recorded expected response |
| Keep mocks fresh | Manual maintenance | Re-record when behavior changes |

## How Record-and-Replay Works

Keploy operates in two modes. In **record mode**, it sits between your application and the outside world. When a request arrives, Keploy notes the request and the eventual response, and simultaneously intercepts every outbound call the request triggers, recording each dependency's response. It writes the request/response pair as a test case (a YAML file) and the dependency responses as a mock file.

In **test mode**, Keploy replays the recorded requests against your application, intercepts the same outbound calls, and instead of letting them hit the real database or API, it returns the recorded mock responses. It then compares the application's actual response to the recorded expected response and reports a pass or fail.

\`\`\`bash
# 1. Record: run your app under Keploy and drive real traffic
keploy record -c "npm start"

# ... exercise the app: hit endpoints via curl, Postman, or the UI ...

# 2. Test: replay the recorded cases deterministically
keploy test -c "npm start" --delay 10
\`\`\`

The \`-c\` flag is the command Keploy wraps to launch your application. The \`--delay\` gives the app time to boot before replay begins.

## Capturing Traffic With eBPF

The interception is the clever part. Keploy uses eBPF, a Linux kernel technology that lets programs run in kernel space and observe system calls, to capture network traffic at the syscall boundary. Because it hooks the kernel rather than instrumenting your code, you do not import a library, add middleware, or change a single line of your application. Keploy sees the raw reads and writes on sockets, reconstructs the HTTP requests and the outbound calls, and records them.

| Capture approach | Code changes needed | How it works |
| --- | --- | --- |
| eBPF (Keploy default on Linux) | None | Hooks syscalls in the kernel |
| Language SDK / middleware | Small integration | Instruments the app process |
| Proxy in front of the app | Config only | Routes traffic through Keploy |

The eBPF approach means Keploy is language-agnostic. Whether your service is Node, Go, Python, Java, or Rust, Keploy sees the same socket traffic and does not care about the framework. It requires running on Linux (or Docker/WSL on other hosts) and elevated permissions to load the eBPF programs.

## Anatomy of a Generated Test Case

A recorded test case is a human-readable YAML file. It captures the request, the expected response, and metadata. Here is a representative example for a GET endpoint.

\`\`\`yaml
version: api.keploy.io/v1beta1
kind: Http
name: test-1
spec:
  req:
    method: GET
    url: http://localhost:8080/api/users/42
    header:
      Accept: application/json
  resp:
    status_code: 200
    header:
      Content-Type: application/json
    body: '{"id":42,"name":"Ada Lovelace","email":"ada@example.com"}'
  assertions:
    status_code: 200
    header:
      Content-Type: application/json
\`\`\`

The matching mock file records what the downstream dependency returned during recording, for instance the database rows behind that user lookup:

\`\`\`yaml
version: api.keploy.io/v1beta1
kind: Postgres
name: mock-1
spec:
  metadata:
    operation: query
  postgresRequests:
    - query: 'SELECT id, name, email FROM users WHERE id = 42'
  postgresResponses:
    - rows:
        - id: 42
          name: Ada Lovelace
          email: ada@example.com
\`\`\`

On replay, when the application issues that same query, Keploy returns the recorded rows instead of hitting a real database. The test is now hermetic: it needs no live Postgres, runs in milliseconds, and is fully deterministic.

## Handling Non-Deterministic Fields

Real responses contain values that change every run: timestamps, generated IDs, tokens. If Keploy compared them literally, every replay would fail. You tell Keploy to ignore or template these fields with noise configuration in \`keploy.yml\`.

\`\`\`yaml
test:
  globalNoise:
    global:
      body:
        # Ignore these JSON paths during comparison
        "created_at": []
        "updated_at": []
        "request_id": []
    test-sets:
      test-set-1:
        body:
          "session_token": []
\`\`\`

Getting the noise configuration right is the main tuning task when adopting Keploy. Start by recording, running a replay, and inspecting the diffs Keploy reports. Every diff that is a legitimately dynamic field goes into the noise list; every diff that is a real behavior change is a bug your test just caught.

## Replaying in CI

The payoff is deterministic replay in continuous integration. Because the mocks are recorded, CI needs no live dependencies, only your application and the committed test and mock YAML files. Commit \`keploy/\` (the test and mock files) to your repository, then run \`keploy test\` in the pipeline.

\`\`\`yaml
name: keploy-api-tests

on:
  pull_request:
    paths:
      - 'src/**'

jobs:
  keploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Keploy
        run: |
          curl --silent -L https://keploy.io/install.sh | bash

      - name: Build the app
        run: |
          npm ci
          npm run build

      - name: Replay recorded tests
        run: |
          sudo -E keploy test \\
            -c "npm start" \\
            --delay 15
\`\`\`

Keploy exits non-zero if any recorded test's response no longer matches, so a failing replay fails the build, exactly like a unit test. The mocks make the run fast and independent of external systems, which is what makes it viable as a merge gate.

## Installing and Configuring Keploy

Keploy installs as a single binary via a shell script, and generates a config file on first run that you then tune. Because the eBPF capture needs kernel access, record and test commands run with elevated privileges.

\`\`\`bash
# Install Keploy
curl --silent -L https://keploy.io/install.sh | bash

# Generate a default config in the current directory
keploy config --generate

# Inspect the version
keploy --version
\`\`\`

The generated \`keploy.yml\` controls where tests are written, which paths to ignore, the global noise list, and test-set selection. A minimal, well-organized config looks like this:

\`\`\`yaml
path: "./keploy"
appId: "user-service"
command: "npm start"
port: 8080
test:
  delay: 10
  globalNoise:
    global:
      body:
        "created_at": []
        "updated_at": []
  ignoreOrdering: true
record:
  recordTimer: 0
\`\`\`

Keeping this file in version control means every engineer records and replays with identical settings, which is essential for the mocks and expected responses to stay consistent across machines.

## Running Keploy With Docker

On macOS or Windows, or in any containerized setup, Keploy runs your application inside Docker and captures the container's traffic. This is also the cleanest way to guarantee a reproducible environment for both recording and replay, since the container pins the runtime and dependencies.

\`\`\`bash
# Record while the app runs in a container
keploy record -c "docker compose up user-service" \\
  --container-name "user-service" \\
  --network-name "app-net"

# Replay the recorded suite against the same container
keploy test -c "docker compose up user-service" \\
  --container-name "user-service" \\
  --network-name "app-net" \\
  --delay 20
\`\`\`

The \`--container-name\` and \`--network-name\` flags tell Keploy which container's traffic to intercept and which Docker network to attach to. Recording and replaying against the same container image removes an entire class of "works on my machine" flakiness.

## Deduplicating and Curating the Suite

Real traffic is repetitive. If you exercise the same endpoint fifty times during a recording session, you do not want fifty near-identical test cases bloating the suite and slowing CI. Keploy can deduplicate recorded cases so only meaningfully distinct request/response pairs are kept.

\`\`\`bash
# Remove redundant, duplicate test cases
keploy dedup -c "npm start" --delay 10
\`\`\`

Deduplication is part of curation, not a substitute for it. After recording, treat the generated suite like a pull request: read each case, keep the ones that represent distinct behavior, delete the ones that captured noise or malformed exploratory requests, and make sure the retained set covers the endpoints you actually care about. A curated set of forty sharp cases is worth more than four hundred redundant ones.

## Measuring Coverage Gains

One reason teams adopt Keploy is speed of coverage growth. Instead of writing tests one endpoint at a time, you record a session of real usage and generate dozens of cases at once. Keploy can also report the code coverage its replayed tests achieve, integrating with standard coverage tools per language.

\`\`\`bash
# Replay tests and collect coverage (Node example)
keploy test -c "npm start" --delay 10 --coverage
\`\`\`

The realistic expectation is that Keploy quickly covers the common, real-world paths through your API, because those are precisely the paths that show up in captured traffic. It is weaker on rare error branches and edge cases that never occur during your recording session, which is where hand-written tests remain essential.

## Keploy Versus Hand-Written Tests

Keploy is not a replacement for all testing. It is a fast way to build a large base of realistic regression tests, on top of which you keep targeted hand-written tests for the cases traffic never exercises.

| Dimension | Keploy (recorded) | Hand-written tests |
| --- | --- | --- |
| Speed to create | Very fast (record a session) | Slow (write each case) |
| Realism | High (real traffic) | Depends on the author |
| Edge cases | Only what you record | Exactly what you design |
| Mock maintenance | Re-record | Manual updates |
| Best for | Regression coverage of real paths | Boundary and error handling |
| Determinism | High (recorded mocks) | High (explicit stubs) |

The healthy pattern is a large recorded regression base plus a curated set of hand-written tests for validation errors, auth failures, and rare branches. Pair this with [API testing best practices](/blog/api-testing-best-practices-guide) so the recorded suite fits into a coherent overall strategy rather than becoming an unreviewed pile of YAML.

## Best Practices for Adopting Keploy

A few disciplines keep a Keploy suite trustworthy:

1. **Record against a clean, seeded environment.** The mocks freeze whatever the dependencies returned. Record against known seed data so the recorded responses are stable and reviewable.
2. **Review generated tests before committing.** Recorded YAML is code. Read it, confirm the request and expected response make sense, and delete cases that captured garbage traffic.
3. **Tune noise deliberately.** Add dynamic fields to the noise list one at a time based on real diffs, not preemptively, so you do not accidentally silence a real regression.
4. **Re-record on intentional behavior changes.** When you deliberately change an endpoint's response, re-record its test rather than editing the YAML by hand, so the mocks stay coherent with the expected response.
5. **Keep recorded suites in version control.** Treat \`keploy/\` like any other test directory. Diffing it in code review shows exactly how behavior changed.

## Where Keploy Fits in a Test Pyramid

The classic test pyramid puts many fast unit tests at the base, fewer integration tests in the middle, and a thin layer of slow end-to-end tests at the top. Recorded tools like Keploy sit squarely in the integration band, and understanding that placement keeps expectations honest.

Keploy does not replace unit tests. Unit tests exercise pure logic in isolation, run in milliseconds, and are trivial to write for a single function. Recording traffic to test a summation helper would be absurd. Keep unit tests as your base and use them for algorithms, validation logic, and edge-case branches.

Where Keploy shines is the integration layer, which is traditionally the most expensive to build because of the mocking burden described earlier. This is exactly the tier where hand-authoring stubs for databases and third-party APIs eats days of engineering time. By recording those dependencies automatically, Keploy makes a normally costly layer cheap, so teams that historically had a thin, neglected integration band can suddenly populate it densely with realistic cases.

At the top of the pyramid, Keploy does not replace true end-to-end tests either. Because it mocks downstream dependencies, a Keploy replay does not exercise the real database or the real payment provider end to end. You still want a small number of full-stack tests that hit live dependencies to catch integration issues the mocks paper over, such as a schema migration that breaks a real query.

| Pyramid layer | Primary tool | Keploy's role |
| --- | --- | --- |
| Unit | xUnit / Jest / pytest | None |
| Integration | Traditionally hand-mocked | Primary: recorded cases + mocks |
| End-to-end | Full-stack suites | None (mocks hide real deps) |

Positioned this way, Keploy is not a silver bullet but a force multiplier for the one layer teams most often skimp on. It fills the integration band fast, freeing engineers to spend their manual effort on the unit edge cases and the handful of true end-to-end flows that recording cannot cover. The result is a healthier, fuller pyramid built in a fraction of the time it would take to author every integration mock by hand, which is precisely why record-and-replay has become a practical answer to the perpetually under-tested integration layer.

## Frequently Asked Questions

### How does Keploy generate API tests?

Keploy records real traffic flowing through your running application. For each incoming request it captures the request and the eventual response as a test case, and simultaneously records every outbound call to databases and third-party services as mocks. Replaying re-sends the request, serves the recorded mocks, and compares the response, so tests are generated from actual usage rather than written by hand.

### Does Keploy require changing my application code?

No. On Linux, Keploy uses eBPF to intercept traffic at the kernel syscall level, so it observes your application's network calls without any library, middleware, or code change. It is language-agnostic as a result: Node, Go, Python, Java, and others all work the same way because Keploy sees raw socket traffic rather than framework internals.

### What are Keploy mocks and why do they matter?

Keploy mocks are recorded responses from your application's downstream dependencies, such as database query results or third-party API replies, captured at record time. On replay, Keploy serves these mocks instead of calling the real dependencies. This makes tests hermetic and deterministic: they run without a live database, execute in milliseconds, and produce the same result every time.

### How does Keploy handle timestamps and random IDs?

You configure noise rules in \`keploy.yml\` listing the JSON paths of dynamic fields like \`created_at\`, \`request_id\`, or tokens. Keploy ignores those paths when comparing the replayed response to the recorded one, so genuinely dynamic values do not cause false failures while real behavior changes still fail the test.

### Can Keploy replace all my hand-written tests?

No, and it should not. Keploy excels at generating realistic regression coverage of the paths that appear in real traffic, quickly and with low effort. It is weaker on rare error branches and edge cases that never occur during recording. Keep hand-written tests for validation errors, auth failures, and boundary conditions, and use Keploy for the bulk regression base.

### Does Keploy work in CI without a live database?

Yes, that is a core advantage. Because the downstream responses are recorded as mocks and committed alongside the test cases, CI only needs your application and the YAML files. Keploy replays the requests, serves the mocks, and fails the build on any mismatch, all without provisioning a real database or external service in the pipeline.

### What is eBPF and why does Keploy use it?

eBPF is a Linux kernel technology that lets programs safely run in kernel space and observe or filter system calls. Keploy uses it to hook the socket syscalls your application makes, reconstructing HTTP requests and outbound dependency calls without instrumenting your code. This is what makes Keploy zero-code and language-agnostic, at the cost of needing Linux and elevated permissions.

## Conclusion

Keploy reframes API testing from an authoring chore into an observation task. By recording real traffic, freezing downstream dependencies as mocks, and replaying deterministically in CI, it builds a realistic regression suite in the time it takes to exercise your endpoints once, with no application code changes thanks to eBPF capture. It will not cover every rare error branch, so you keep a focused set of hand-written tests for the edges, but it removes the tedious mock-authoring work from the common case.

Install Keploy today, record a session against a seeded staging environment, review the generated cases, and wire \`keploy test\` into your pipeline as a merge gate. Then explore the [API testing best practices guide](/blog/api-testing-best-practices-guide) and browse the qaskills.sh catalog for a ready-made Keploy workflow you can adopt across your services.
`,
};
