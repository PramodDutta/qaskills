import type { SeoClusterArticle } from './seo-cluster-article';

export const mcpTestingChildren2026: SeoClusterArticle[] = [
  {
    slug: 'mcp-official-conformance-suite-server-guide-2026',
    clusterId: 'mcp-testing',
    post: {
      title: 'Run the Official MCP Conformance Suite Against Your Server',
      description:
        'Run the official MCP conformance suite against a live server with a pinned runner, deterministic fixtures, scoped results, and release-ready evidence.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/mcp-testing.png',
      imageAlt:
        'MCP conformance runner validating a live server endpoint with deterministic fixtures, checks, and release evidence',
      primaryKeyword: 'mcp conformance suite server',
      keywords: [
        'mcp conformance suite server',
        'MCP server conformance testing',
        'official MCP conformance runner',
        'MCP protocol compliance tests',
        'MCP server test fixtures',
        'MCP conformance 2025-11-25',
        'Model Context Protocol testing',
      ],
      contentKind: 'child',
      pillarSlug: 'mcp-server-testing-guide-2026',
      relatedSlugs: [
        'mcp-server-testing-guide-2026',
        'mcp-conformance-github-actions-baseline-2026',
        'mcp-inspector-tutorial-2026',
        'mcp-server-contract-testing-guide',
      ],
      sources: [
        'https://github.com/modelcontextprotocol/conformance/tree/v0.1.16',
        'https://github.com/modelcontextprotocol/conformance/blob/v0.1.16/SDK_INTEGRATION.md',
        'https://modelcontextprotocol.io/docs/learn/versioning',
        'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
        'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
      ],
      content: `An **MCP conformance suite server** run answers a narrow but important question: does a running MCP server behave as the official conformance scenarios expect for the selected protocol release? With the stable \`@modelcontextprotocol/conformance@0.1.16\` runner, you start and health-check your own Streamable HTTP server, point the runner at its MCP endpoint, select the published \`2025-11-25\` protocol baseline, and retain the generated check records. The runner is the test client; your application remains responsible for server startup, fixture state, credentials, and cleanup.

Start with the [MCP server testing pillar](/blog/mcp-server-testing-guide-2026), then connect this workflow to the [GitHub Actions conformance baseline](/blog/mcp-conformance-github-actions-baseline-2026), [MCP Inspector CLI tutorial](/blog/mcp-inspector-tutorial-2026), and [MCP tool contract testing guide](/blog/mcp-server-contract-testing-guide). Teams can browse reusable instructions in the [QASkills directory](/skills), install the [Playwright CLI skill](/skills/Pramod/playwright-cli), and use the existing [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide) when an MCP workflow also needs browser evidence.

## What the official suite proves, and what it does not

The [official conformance repository](https://github.com/modelcontextprotocol/conformance/tree/v0.1.16) describes two distinct modes. Client mode starts a scenario server and launches a client implementation. Server mode connects as an MCP client to a server that is already running. This tutorial covers server mode only. There is no official server-adapter interface that the application must implement. The integration boundary is a reachable MCP URL; any startup wrapper around that URL belongs to your test harness.

Keep four kinds of statements separate during review:

| Statement class | Authority | Example in this workflow | How to treat it |
| --- | --- | --- | --- |
| MCP specification requirement | Published MCP specification | Streamable HTTP has one MCP endpoint and lifecycle messages follow the negotiated protocol | A failure can indicate protocol nonconformance |
| Conformance implementation behavior | Runner version \`0.1.16\` | \`server --url\` connects to an already running endpoint; \`active\` excludes pending scenarios | Pin and re-check when upgrading the runner |
| Security recommendation | MCP security or transport guidance | Bind local fixtures to \`127.0.0.1\`, validate Origin, and protect nonlocal endpoints | Test it, but do not mislabel every recommendation as a suite assertion |
| Team policy | Your release process | Active suite must pass before release; evidence is retained for 14 days | Document owner, exception path, and expiry |

The suite is not a substitute for product semantics, authorization abuse cases, tenant isolation, load testing, secret scanning, or destructive-operation controls. It also does not certify a client, because server and client modes exercise different implementations. The stable \`active\` server suite excludes scenarios marked pending. Do not say "all MCP behavior passed" when you ran only \`active\`, one scenario, or one transport.

## Version and environment baseline

As of July 14, 2026, the MCP documentation identifies \`2025-11-25\` as the current published protocol version. The conformance repository contains work for a later 2026 draft, but draft scenarios are not published requirements. The commands below therefore pin the stable npm release \`0.1.16\` and explicitly select \`2025-11-25\`. A future migration should be a reviewed change, not an automatic consequence of using \`latest\`.

Before the first run, record:

- the conformance package version and lockfile digest;
- the MCP protocol version the server negotiates;
- server SDK and application commit identifiers;
- endpoint transport and authentication mode;
- fixture dataset revision;
- runner operating system and Node version;
- the exact suite or scenario selector.

Install the runner as an exact development dependency so local and CI runs resolve the same package:

\`\`\`bash
npm install --save-dev --save-exact @modelcontextprotocol/conformance@0.1.16
npm exec -- conformance --version
npm exec -- conformance list --server --spec-version 2025-11-25
\`\`\`

The final command is deliberately part of setup. Scenario membership changes between runner releases, so the command output is better evidence than an article that freezes a count. Review the names before adding a failure baseline. The tagged official guide names \`server-initialize\`, \`tools-list\`, tool-call scenarios, resource scenarios, and prompt scenarios as representative server coverage; the actual list from the pinned binary is authoritative for the run.

## Build a server adapter without inventing an API

For conformance server mode, "adapter" should mean a repository-owned launcher that exposes your real implementation through the transport expected by the runner. It should not reimplement protocol behavior merely to make tests pass. A useful adapter selects test configuration, starts the production server entry point, exposes a separate health route, seeds deterministic dependencies, and forwards termination signals.

The official [SDK integration guide](https://github.com/modelcontextprotocol/conformance/blob/v0.1.16/SDK_INTEGRATION.md) says the server must already be running and that your workflow manages startup, readiness, and cleanup. A minimal shell harness can enforce that lifecycle:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=test
export DATABASE_URL='file:./artifacts/conformance-fixture.db'
export MCP_TEST_CLOCK='2026-07-14T00:00:00Z'

mkdir -p artifacts/mcp-conformance
node dist/conformance-server.js --host 127.0.0.1 --port 3001 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent http://127.0.0.1:3001/healthz >/dev/null; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo 'MCP fixture server exited before readiness' >&2
    exit 1
  fi
  sleep 1
done

curl --fail --silent http://127.0.0.1:3001/healthz >/dev/null
npm exec -- conformance server \
  --url http://127.0.0.1:3001/mcp \
  --suite active \
  --spec-version 2025-11-25 \
  --output-dir artifacts/mcp-conformance
\`\`\`

The health route is a harness choice, not an MCP requirement. It avoids treating an expected \`GET /mcp\` status as a generic readiness contract. The [Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) defines behavior for the MCP endpoint, including POST and GET handling, but a deployment can still benefit from a separate health probe that does not initialize a protocol session.

Do not point the suite at a production endpoint. A conformance scenario may invoke tools and exercise state. Bind locally, use synthetic credentials, deny external egress unless a fixture needs it, and replace irreversible integrations with test doubles at the same application boundary used by ordinary integration tests.

## Design fixtures that make failures interpretable

Conformance checks become noisy when tool data changes between scenarios. Create a fixture contract before running the suite:

| Fixture concern | Deterministic design | Failure if omitted |
| --- | --- | --- |
| Tool catalog | Fixed names, descriptions, schemas, and ordering for the test build | A catalog change looks like a transport regression |
| Tool results | Stable IDs, timestamps, and resource contents | Assertions vary by wall clock or random seed |
| Side effects | Transaction rollback, disposable database, or per-run namespace | One scenario contaminates the next |
| External APIs | Local fake with recorded request assertions | Network availability masks server behavior |
| Authentication | Dedicated principal with minimum fixture permissions | A credential problem is confused with protocol failure |
| Logs | JSON logs on stderr or a file, never protocol noise on stdio stdout | Diagnostics can corrupt stdio framing in other test modes |

A fixture manifest gives reviewers a human-readable inventory:

\`\`\`json
{
  "fixtureVersion": "2026-07-14.1",
  "protocolVersion": "2025-11-25",
  "transport": "streamable-http",
  "mcpEndpoint": "http://127.0.0.1:3001/mcp",
  "healthEndpoint": "http://127.0.0.1:3001/healthz",
  "tools": ["orders.lookup", "orders.quote_refund"],
  "externalEgress": false,
  "destructiveOperations": false
}
\`\`\`

Reset fixture state before the suite, not only before the workflow. If a scenario crashes midway, the next retry should begin from a known state. A database migration plus seed script is preferable to a hand-maintained database snapshot when schema evolution matters. If the server caches its tool list, restart it after fixture generation so the test process observes the intended catalog.

## Run one scenario before the active suite

Begin with initialization. It gives a small diagnostic surface for endpoint, transport, lifecycle, and capability problems:

\`\`\`bash
npm exec -- conformance server \
  --url http://127.0.0.1:3001/mcp \
  --scenario server-initialize \
  --spec-version 2025-11-25 \
  --output-dir artifacts/mcp-conformance-init \
  --verbose

npm exec -- conformance server \
  --url http://127.0.0.1:3001/mcp \
  --suite active \
  --spec-version 2025-11-25 \
  --output-dir artifacts/mcp-conformance-active
\`\`\`

The first command is a diagnostic run. The second is the release candidate. Do not replace the suite with the initialization scenario after initialization passes. Conversely, do not start with the full suite when every request fails at the same transport boundary; isolate the lifecycle problem first.

The \`--spec-version\` filter is runner behavior, not protocol negotiation by itself. Your server still participates in MCP initialization and must reject unsupported negotiation appropriately. Capture the server log line that records the negotiated version. If the runner filter and server behavior disagree, treat that as a test configuration defect before classifying application behavior.

## Interpret checks without turning the suite into a score

For server runs with an output directory, the stable runner writes per-scenario \`checks.json\` evidence below the chosen directory. A check includes an identifier, status, description, timestamp, and optional error details. Preserve raw files before creating summaries. A count such as "48 of 50" is not durable because scenario and check membership can change; scenario IDs plus runner version are durable enough for comparison.

Use this triage order:

1. **Harness failure:** the process never became ready, exited unexpectedly, used the wrong URL, or lacked a fixture dependency.
2. **Transport or lifecycle failure:** initialization, protocol version, headers, session handling, or HTTP framing failed before feature logic ran.
3. **Capability mismatch:** the server declared a feature but did not implement the corresponding behavior, or the test build exposed a different catalog.
4. **Feature conformance failure:** a request reached the intended handler but the response violated the scenario check.
5. **Runner question:** behavior appears consistent with the published specification but conflicts with a check. Reproduce narrowly and review the pinned scenario source before filing an upstream issue.

Never edit a result file to make a release green. Fix the server, fix the harness, or add a reviewed expected-failure entry with an issue and expiry through the baseline mechanism. The companion CI guide explains why a stale baseline must also fail.

### Review evidence across reruns

Keep the first failing run when a retry passes. The pair can reveal nondeterministic fixture state, startup races, expiring credentials, or shared service instability that a final green status conceals. Compare scenario identifier, check identifier, server commit, fixture revision, negotiated protocol version, and sanitized request correlation data. A rerun is new evidence; it does not rewrite the earlier observation.

Classify reproducibility separately from severity. A repeatable low-impact catalog mismatch and an intermittent authorization leak require different release decisions. The specification defines protocol behavior, and the pinned runner defines how its scenarios observe that behavior, but neither defines your retry allowance or risk acceptance. Those are team policies. Record who reviewed the discrepancy, which evidence was compared, whether the same binary and fixture were used, and what event will force another review.

When a retry uses a changed image, seed, credential, dependency, or runner version, label it as a different configuration rather than a rerun. This prevents an environment repair from being misreported as proof that the original server build conformed.

## Add positive and negative product tests beside conformance

The official suite validates implemented scenarios against the specification; it does not know your business rules. Keep a second layer of server contract tests with explicit positive and negative fixtures.

Positive cases should prove that a representative tool appears in \`tools/list\`, accepts a valid fixture argument, returns the expected content kind, and performs the expected isolated side effect. Negative cases should cover an unknown tool, a malformed request, schema-invalid input, business-invalid input, unauthorized access, dependency failure, and output that fails the declared schema. The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) distinguishes protocol errors from tool execution errors, so assert the channel as well as the message.

| Test | Expected evidence | Owned by |
| --- | --- | --- |
| Unknown tool name | JSON-RPC protocol error | Protocol adapter |
| Missing structurally required request member | JSON-RPC protocol error | Protocol adapter |
| Date has correct JSON type but violates business rule | Tool result with \`isError: true\` and actionable content | Tool implementation |
| Valid lookup | Successful content and, when declared, schema-valid \`structuredContent\` | Tool implementation |
| Unauthorized refund quote | Access denial with no protected data | Security integration |
| Duplicate idempotency key | Product-defined repeat behavior | Product contract |

This matrix prevents a common error: claiming that a passing conformance suite proves refund policy, tenant filtering, or safe retry behavior. Those are product contracts and team policies, even when transported through MCP.

## Use the result in CI and release review

A practical cadence has three layers. Run a single initialization scenario during rapid local development. Run the stable active suite on every pull request that changes the MCP server, SDK, transport, schemas, or deployment configuration. Run supplemental security and product tests before release, plus draft conformance in a nonblocking research job when planning the next protocol migration.

The blocking release record should include:

- commit and fixture identifiers;
- exact conformance package and protocol versions;
- selected suite and scenario inventory output;
- raw \`checks.json\` directories;
- server logs with secrets redacted;
- approved baseline file, if any;
- links to product and security test runs;
- reviewer and exception expiry.

The suite's exit code is a gate signal, not a full release decision. A zero exit after expected failures means only known baseline entries failed and no baseline entry became stale under the runner's algorithm. It does not mean every scenario passed. Display both the process outcome and baseline contents in release review.

## Troubleshooting by boundary

**The runner cannot connect.** Confirm the server process is alive, the URL ends at the actual MCP endpoint, and the fixture binds to \`127.0.0.1\`. Check whether a container uses a different network namespace. Test the dedicated health endpoint first, then inspect MCP request logs.

**Every scenario fails after initialization.** Compare declared capabilities with enabled handlers. A test build that advertises tools, resources, or prompts but disables their backing modules creates a false capability contract.

**Only later scenarios fail.** Suspect state leakage. Reset storage, clear in-memory caches, make generated IDs deterministic, and inspect whether a previous tool invocation changed shared fixture data.

**The server works in Inspector but fails conformance.** Inspector is an exploratory client, while a conformance scenario asserts particular behavior. Save the exact Inspector request, compare negotiated protocol and transport, then run the single failing conformance scenario with \`--verbose\`.

**A draft scenario contradicts the published release.** Do not relabel draft behavior as a current requirement. Keep draft runs separate and nonblocking until the protocol revision is published and the migration is approved.

**No artifact files appear.** Pass an explicit \`--output-dir\`, verify the process can write it, and upload the directory even when the test step fails. The runner prints results to the console regardless, but console output is weaker evidence than the raw check files.

## Limitations to state in every report

The stable suite is a work in progress, according to its own tagged README. It exercises the scenarios shipped in the pinned runner, not every sentence in the specification. Server mode reaches a running HTTP endpoint and does not validate a separate stdio deployment unless you create an appropriate HTTP test surface that faithfully uses the same implementation. It cannot establish production authorization correctness with synthetic credentials, nor can it prove operational resilience, scalability, privacy, or safe model behavior.

Conformance is also version-relative. A server can conform to one published protocol revision and intentionally reject another. Record the selected revision instead of using an unqualified "MCP compliant" label.

## Release checklist

- Pin \`@modelcontextprotocol/conformance@0.1.16\` and commit the lockfile.
- Record published protocol baseline \`2025-11-25\` separately from draft work.
- Start the real server implementation through a thin repository-owned launcher.
- Use a dedicated health route and deterministic fixture state.
- List server scenarios from the pinned runner before accepting a baseline.
- Run initialization first, then the complete selected \`active\` suite.
- Preserve raw check files and sanitized server logs.
- Classify failures as harness, protocol, capability, feature, or runner questions.
- Keep product semantics and security abuse tests outside the conformance claim.
- Require an owner, issue, rationale, and expiry for every expected failure.

## Frequently asked questions

### Does the official runner start my MCP server?

No. In server mode, your harness starts, health-checks, and stops the server. The official runner connects to the URL passed with \`--url\`. Client mode has a different lifecycle and should not be used as evidence for the server implementation.

### Is a custom server adapter required by the conformance package?

No adapter interface is required. A team may create a launcher that configures the real server for deterministic tests, but the official server-mode integration boundary is the live MCP URL. Keep that launcher thin so it does not hide production protocol behavior.

### Should I run the active, all, or pending suite?

Use \`active\` as the stable default for a blocking baseline, because the runner documents it as excluding pending scenarios. Run \`pending\` or broader exploratory selections separately. Record the exact command and generated scenario list rather than implying that one selection covers every implementation concern.

### Why select protocol version 2025-11-25 explicitly?

It is the current published MCP version on July 14, 2026. Explicit selection prevents draft scenario work from silently changing a release claim and makes results comparable. Upgrade the protocol baseline through a deliberate compatibility review.

### Can an expected failure make a nonconforming release acceptable?

That is a team policy decision, not an MCP rule. The runner can classify a named failure as expected, but a reviewer must assess impact, affected users, workaround, owner, and expiry. Never baseline an unexplained failure merely to obtain exit code zero.

### Does a passing suite prove that tool inputs are safe?

No. The tools specification requires input validation and access controls, but the conformance scenarios do not know every domain invariant or attacker path. Add negative contract, authorization, injection, rate-limit, and side-effect tests for your actual tools.

### Can I run the suite against production?

Do not use production as the default. Scenarios may call features and mutate state. Use an isolated endpoint with synthetic identities and disposable data. A separately approved production smoke test should be read-only, narrowly scoped, and governed by operational policy.

## Conclusion

The official MCP conformance suite is most valuable when its claim stays precise. Pin the runner, target the published protocol revision, expose the real server through a thin lifecycle harness, run the complete selected server suite, and retain raw evidence. Then place product semantics, authorization, security, and operational tests beside conformance rather than pretending the suite replaces them. That produces a release signal another engineer can reproduce and defend.
`,
    },
  },
  {
    slug: 'mcp-conformance-github-actions-baseline-2026',
    clusterId: 'mcp-testing',
    post: {
      title: 'Add MCP Conformance Tests to GitHub Actions with Failure Baselines',
      description:
        'Add pinned MCP conformance tests to GitHub Actions, preserve raw evidence, and govern expected failures without hiding regressions or stale exceptions.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/mcp-testing.png',
      imageAlt:
        'GitHub Actions pipeline running pinned MCP conformance checks with reviewed baselines and retained failure artifacts',
      primaryKeyword: 'mcp conformance github actions',
      keywords: [
        'mcp conformance github actions',
        'MCP conformance CI',
        'MCP expected failures baseline',
        'MCP server GitHub workflow',
        'MCP conformance artifacts',
        'MCP release gate',
        'Model Context Protocol CI testing',
        'MCP regression baseline',
      ],
      contentKind: 'child',
      pillarSlug: 'mcp-server-testing-guide-2026',
      relatedSlugs: [
        'mcp-server-testing-guide-2026',
        'mcp-official-conformance-suite-server-guide-2026',
        'mcp-inspector-tutorial-2026',
        'mcp-server-contract-testing-guide',
      ],
      sources: [
        'https://github.com/modelcontextprotocol/conformance/tree/v0.1.16',
        'https://github.com/modelcontextprotocol/conformance/blob/v0.1.16/action.yml',
        'https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts',
        'https://github.com/actions/upload-artifact/releases/tag/v7.0.1',
        'https://github.com/actions/checkout/releases/tag/v7.0.0',
        'https://github.com/actions/setup-node/releases/tag/v7.0.0',
      ],
      content: `A reliable **MCP conformance GitHub Actions** job does more than run a command. It locks the conformance runner and Node runtime, starts a disposable server fixture, records the protocol and suite scope, preserves raw checks even when the gate fails, and treats the expected-failures file as reviewed technical debt. The stable \`@modelcontextprotocol/conformance@0.1.16\` baseline has a useful safeguard: an unlisted failure exits nonzero, and a listed scenario that starts passing also exits nonzero so the stale exception must be removed.

Use the [MCP server testing pillar](/blog/mcp-server-testing-guide-2026) for the full test architecture, the [official conformance server tutorial](/blog/mcp-official-conformance-suite-server-guide-2026) for local runner setup, the [MCP Inspector CLI tutorial](/blog/mcp-inspector-tutorial-2026) for focused diagnostics, and the [MCP tool contract guide](/blog/mcp-server-contract-testing-guide) for product-specific assertions. The [QASkills catalog](/skills), [Playwright CLI skill](/skills/Pramod/playwright-cli), and canonical [Playwright MCP browser guide](/blog/playwright-mcp-browser-automation-guide) cover reusable QA and browser automation workflows around the protocol gate.

## Define the gate before writing YAML

The job should have one auditable claim: a specific server build ran a named conformance suite from a pinned runner against a published MCP version, with only a reviewed set of expected failures. Everything else is supporting evidence. Do not label the job "MCP certified" or "fully compliant" because the official repository describes the framework as a work in progress and because application security and product behavior sit outside its scenario set.

Separate authorities in the pull request description:

| Decision | Classification | Source of truth |
| --- | --- | --- |
| MCP messages use JSON-RPC and negotiate a protocol version | Specification requirement | Published MCP specification |
| \`--expected-failures\` fails on a new failure and a stale baseline entry | Runner behavior | Pinned conformance implementation |
| Raw results should be retained after a failing job | Engineering recommendation | GitHub artifact capability and incident needs |
| Retain evidence for 14 days and require two reviewers for baseline changes | Team policy | Repository governance |

That distinction matters when the suite evolves. A runner upgrade can change scenarios without changing the protocol. A security review can add stricter policy without claiming the specification mandates that exact threshold. A product team can temporarily accept a known gap without rewriting history to call it conformant.

## Pin every moving part that can change the result

As of July 14, 2026, the stable npm conformance package is \`0.1.16\`, the published MCP protocol version is \`2025-11-25\`, and the maintained Node 22 line is \`22.23.1\`. The workflow below uses those exact values. It also references immutable commits corresponding to GitHub's official July 2026 action releases: Checkout \`v7.0.0\`, Setup Node \`v7.0.0\`, and Upload Artifact \`v7.0.1\`.

Pin the npm dependency and commit the generated lockfile:

\`\`\`json
{
  "engines": {
    "node": "22.23.1"
  },
  "devDependencies": {
    "@modelcontextprotocol/conformance": "0.1.16"
  },
  "scripts": {
    "mcp:scenarios": "conformance list --server --spec-version 2025-11-25",
    "mcp:conformance": "conformance server --url http://127.0.0.1:3001/mcp --suite active --spec-version 2025-11-25 --output-dir artifacts/mcp-conformance --expected-failures ./conformance-baseline.yml"
  }
}
\`\`\`

Run \`npm ci\`, not a fresh install, in CI. The exact top-level package plus lockfile constrains transitive resolution. Dependabot or Renovate can propose upgrades, but each upgrade should regenerate the scenario inventory, run without a baseline in a research branch, and receive the same review as a protocol-facing code change.

An immutable commit SHA is stronger than a moving major tag for actions. Keep the human-readable release in a comment so maintainers can trace it. A policy bot can verify SHA pinning, but the policy itself is a repository decision rather than an MCP requirement.

## Create a baseline that cannot normalize new failures

The official runner accepts a YAML file keyed by mode. For a server job, only the \`server\` list affects the baseline. The scenario names below come from the official README's format example; they are not a recommendation to accept those failures in your project.

\`\`\`yaml
server:
  # MCP-412, owner: protocol-team, expires: 2026-08-15
  - tools-call-with-progress
  # MCP-427, owner: resources-team, expires: 2026-07-31
  - resources-subscribe

client: []
\`\`\`

Do not create this file by copying every current failure. Establish each entry through this sequence:

1. Run the pinned suite without \`--expected-failures\` and save all artifacts.
2. Re-run the exact failing scenario with verbose output.
3. Decide whether the defect belongs to the server, fixture, environment, or runner.
4. Link a tracked issue containing impact, reproduction, intended fix, and owner.
5. Assess whether accepting the gap exposes data, side effects, or interoperability risk.
6. Add only the exact scenario identifier after approval, with an expiry comment.
7. Re-run the full suite with the baseline and verify no unlisted failure remains.

The runner evaluates the baseline bidirectionally:

| Scenario result | Listed in baseline | Runner outcome | Required response |
| --- | --- | --- | --- |
| Fails | Yes | Exit 0 for that expected gap | Keep issue active; review expiry |
| Fails | No | Exit 1 | Treat as regression or classify before review |
| Passes | Yes | Exit 1 | Remove stale entry in the same change |
| Passes | No | Exit 0 | Normal passing scenario |

This behavior prevents the baseline from becoming an ever-growing ignore list. Never add \`continue-on-error: true\` to the conformance step, because that bypasses the runner's distinction between known, new, and stale outcomes. Use \`if: always()\` only on evidence-upload steps.

## Use one step for server lifecycle and runner execution

Background process behavior is easier to control when startup, readiness, conformance, and cleanup share one shell. The following workflow uses a separate \`/healthz\` route for readiness and the real \`/mcp\` route for the runner. Replace the build and server command with your repository's commands; do not replace the protocol handler with a test-only implementation.

\`\`\`yaml
name: MCP conformance

on:
  pull_request:
    paths:
      - 'src/mcp/**'
      - 'package.json'
      - 'package-lock.json'
      - 'conformance-baseline.yml'
      - '.github/workflows/mcp-conformance.yml'
  push:
    branches: ['main']

permissions:
  contents: read

jobs:
  server-conformance:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - name: Check out repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Set up pinned Node
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: '22.23.1'
          cache: npm

      - name: Install locked dependencies
        run: npm ci

      - name: Build server
        run: npm run build

      - name: Run published MCP conformance suite
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p artifacts/mcp-conformance
          npm run mcp:scenarios > artifacts/server-scenarios.txt
          npm exec -- conformance --version > artifacts/conformance-version.txt
          node dist/conformance-server.js \
            --host 127.0.0.1 \
            --port 3001 \
            > artifacts/server.log 2>&1 &
          SERVER_PID=$!
          trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

          for attempt in 1 2 3 4 5 6 7 8 9 10; do
            if curl --fail --silent http://127.0.0.1:3001/healthz >/dev/null; then
              break
            fi
            kill -0 "$SERVER_PID"
            sleep 1
          done

          curl --fail --silent http://127.0.0.1:3001/healthz >/dev/null
          npm run mcp:conformance

      - name: Preserve conformance evidence
        if: always()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: mcp-conformance-server
          path: artifacts/
          if-no-files-found: error
          retention-days: 14
\`\`\`

The action versions and SHAs are verified facts for July 14, 2026. The \`ubuntu-24.04\` runner choice, 15-minute timeout, ten readiness attempts, and 14-day retention are example team policies, not universal MCP thresholds. Adjust them from measured startup time, artifact sensitivity, storage policy, and support needs. Keep those choices explicit so a future maintainer knows which numbers are negotiable.

## Preserve evidence even when the command exits nonzero

GitHub defines workflow artifacts as files retained after a job for later inspection. The official [workflow artifact documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) lists test results and logs as common examples. The workflow's \`if: always()\` ensures upload is attempted after a failing test step. \`if-no-files-found: error\` catches a broken output path rather than producing a green upload step with no evidence.

Retain at least these files:

| Artifact | Why it matters | Redaction rule |
| --- | --- | --- |
| \`conformance-version.txt\` | Proves the runner binary selected by the lockfile | No secrets expected |
| \`server-scenarios.txt\` | Records suite inventory for the pinned version | No secrets expected |
| Runner \`checks.json\` files | Provides scenario-level status and diagnostic details | Inspect tool content for sensitive fixture data |
| \`server.log\` | Correlates runner failures with application behavior | Remove tokens, credentials, personal data, and raw production payloads |
| \`conformance-baseline.yml\` from the commit | Explains accepted gaps at execution time | Keep issue references but no secret context |
| Fixture manifest | Records data revision, transport, and disabled integrations | Use synthetic values only |

The current Upload Artifact action supports \`retention-days\` and can fail when a path is empty. It also notes that hidden files are excluded by default. Do not enable hidden-file upload broadly; an environment file can contain credentials. Package only the reviewed artifact directory.

For a failed release build, add the artifact URL to the defect or release record before rerunning. A successful retry does not erase the evidence needed to diagnose the original failure.

## Review baseline changes as production changes

Protect \`conformance-baseline.yml\` with CODEOWNERS or an equivalent approval rule. A baseline addition changes what the release gate accepts, so it deserves review from the server owner and, for authorization or data-handling scenarios, a security owner.

A strong review template asks:

- What exact scenario failed, on which pinned runner and protocol version?
- Can the failure be reproduced with \`--scenario\`?
- Is it a server defect, fixture defect, environment issue, or disputed check?
- Which users, tools, or transports are affected?
- Does the gap permit unauthorized access, data leakage, or destructive behavior?
- What issue, owner, and expiry control remediation?
- Which compensating test or deployment restriction reduces risk?
- What evidence will prove the baseline can be removed?

Do not accept wildcard matching or generated baseline updates in the blocking job. The stable file format lists scenario names. An automation may propose a diff, but a human should approve every added entry. Removal can be encouraged aggressively because the runner already identifies stale entries, but it should still accompany evidence that the passing behavior is real and not a fixture regression.

### Turn every exception into a bounded decision

The runner baseline records scenario names because that is what it needs to evaluate expected and unexpected outcomes. It does not carry your business context. Keep the decision record in the pull request, issue tracker, or release system and link it to the exact baseline diff. Record the observed check, affected server surface, reproduction command, impact assessment, owner, target removal date, and compensating control. This additional record is team governance, not an MCP or conformance file-format requirement.

Review additions and removals differently. An addition broadens what the gate accepts and needs evidence that shipping is safer than blocking, plus a clear remediation path. A removal narrows the exception set, but still needs a clean run from the same pinned runner, protocol selector, fixture revision, and server commit under review. If a scenario passes only after changing fixture data, investigate whether the contract was repaired or the test stopped reaching the defective branch.

Treat a runner upgrade as a baseline migration, not routine dependency maintenance. First capture the scenario inventory from the old and new pinned versions. Then run the new version without silently extending the baseline and classify each difference as a newly active scenario, a changed check, a server regression, or a harness incompatibility. Preserve both result sets. A scenario renamed upstream should not be copied into the baseline until reviewers confirm that it represents the same known gap; matching names are implementation details of the runner, not stable protocol identifiers.

Retries also need an explicit policy. Automatic retry can be useful for diagnosing runner infrastructure, but a second attempt must not replace the first status in the blocking decision. Preserve artifacts from each attempt under distinct paths and compare server logs before calling a result flaky. If the same scenario alternates between pass and fail with identical recorded inputs, open a reliability defect and decide whether the affected release surface can be constrained. Do not add an intermittent failure to the expected-failure file merely to make the final attempt green.

A baseline review should answer three independent questions: what behavior is currently nonconforming, why the release is allowed despite that behavior, and how the team will know the exception can be removed. Combining these questions into a generic approval such as "known issue" makes the file durable while its rationale disappears. A bounded decision keeps the technical result visible without pretending that the conformance runner made the product-risk decision.

## Add positive and negative controls around the gate

A CI job can appear healthy while discovering no meaningful work. Add controls that prove the harness can fail:

1. Validate that \`server-scenarios.txt\` is nonempty and contains the expected initialization scenario.
2. Run a unit test against the fixture health contract before launching conformance.
3. Keep a separate test that supplies an invalid product input and expects a tool execution error.
4. Verify artifacts exist after a deliberately failing test in a nonblocking harness validation workflow.
5. Confirm that a temporary bogus baseline entry causes the runner to report a stale entry and exit nonzero; do this during harness development, not on every production pull request.

The negative-control exercise should be documented, then removed. Do not commit a fabricated failure to main merely to prove the gate reacts.

## Split pull request, nightly, and release coverage

One workflow cannot optimize for speed, breadth, and migration research at the same time.

| Cadence | Selection | Blocking? | Purpose |
| --- | --- | --- | --- |
| Pull request | Stable \`active\` server suite for published \`2025-11-25\` | Yes for MCP-affecting changes | Detect protocol regressions before merge |
| Main branch | Same stable suite plus product contracts | Yes | Confirm merged dependency graph and fixture |
| Nightly | Stable suite on supported deployment variants | Team decision | Detect environmental drift |
| Protocol research | Draft or pending scenarios with separate artifacts | No until migration approval | Estimate future work without redefining current requirements |
| Release | Stable suite, security tests, product semantics, and evidence review | Yes | Produce a defensible release record |

If the server supports multiple SDK versions or transports, use a matrix only when each combination is an actual support promise. A large matrix that nobody owns wastes capacity and creates ignored failures. Give every cell a fixture, artifact name, and responsible team.

## Troubleshoot common workflow failures

**\`npm ci\` changes the resolved runner.** It should not. Confirm the lockfile is committed, the exact top-level version is \`0.1.16\`, and no workflow step runs \`npm update\` or an unpinned \`npx ...@latest\` command.

**The server never becomes ready.** Read \`server.log\`, confirm the build output path, and check fixture dependencies. Do not increase the retry loop until you understand normal startup distribution. A longer timeout can hide a crash-restart loop.

**Artifacts are missing after failure.** Ensure the upload step has \`if: always()\`, the runner receives \`--output-dir\`, and the path is under the workflow workspace. Keep \`if-no-files-found: error\` so evidence failures remain visible.

**A new failure passes because the job uses \`continue-on-error\`.** Remove that setting from the conformance step. Expected failures belong in the reviewed baseline, where the runner can distinguish them from regressions.

**A fixed scenario still fails the job.** This is intentional stale-baseline behavior. Remove the scenario from \`conformance-baseline.yml\`, rerun the entire selected suite, and close the tracked issue with artifacts.

**A runner upgrade introduces many changes.** Revert only the upgrade branch's dependency change if needed, not application fixes. Compare scenario inventories, read upstream release notes and scenario source, classify each change, and update the baseline only after review.

## Limitations and release language

GitHub Actions proves behavior in its runner environment, not every production topology. The conformance framework covers its shipped scenarios, not all security, load, model, or business requirements. An expected-failure baseline explicitly records known gaps; its presence means a zero process exit is not identical to all checks passing.

Release notes should say: "The server ran the \`active\` server suite from \`@modelcontextprotocol/conformance@0.1.16\` against protocol \`2025-11-25\`; raw results and any expected failures are attached." Avoid "MCP certified" unless an actual recognized certification process exists and was completed.

## Implementation checklist

- Pin Node, the conformance npm package, GitHub actions, and the lockfile.
- Keep the published protocol selector separate from draft research.
- Use a disposable server fixture on \`127.0.0.1\` with a dedicated health route.
- Capture scenario inventory and runner version before execution.
- Run startup, readiness, suite, and cleanup in one controlled shell step.
- Upload artifacts with \`if: always()\` and fail when expected files are absent.
- Redact secrets before writing logs to the artifact directory.
- Require issue, owner, impact, reviewer, and expiry for every baseline addition.
- Let new failures and stale baseline entries fail the job.
- Pair conformance with negative product, authorization, and output-schema tests.

## Frequently asked questions

### Should the conformance step use continue-on-error?

No. That setting erases the useful distinction between passing scenarios, approved expected failures, new regressions, and stale entries. Keep the test step blocking and apply \`if: always()\` only to diagnostics and artifact upload.

### Why does a passing scenario in the baseline fail CI?

The runner treats it as a stale exception. This prevents fixed scenarios from remaining silently ignored. Remove the entry, run the complete suite, and retain the new evidence.

### Is 14-day artifact retention required by MCP?

No. It is an example team policy. Choose retention from incident response needs, data sensitivity, legal requirements, and storage budget. The action accepts a retention period within the limits configured for the repository.

### Can a bot update the failure baseline automatically?

A bot can prepare a proposed diff and attach evidence, but automatically accepting every current failure normalizes regressions. Require human review for additions. Automated removal suggestions are safer, yet reviewers should still confirm the pass is reproducible.

### Why pin action commit SHAs instead of major tags?

Commit SHAs are immutable references, while some tags can move. Comments preserve the release label for readability. This is a CI supply-chain policy, not an MCP protocol rule.

### Should draft conformance run in the same blocking job?

Not by default. Keep draft or pending scenarios in a separately named, nonblocking research job until the new protocol is published and your migration plan is approved. Otherwise a future proposal can redefine a current release gate.

### What if the server requires real external services?

Prefer contract-faithful local fakes or isolated sandbox accounts with synthetic data. If an external service is unavoidable, classify outages separately, restrict credentials and egress, and avoid baselining environmental failures as protocol exceptions.

## Conclusion

An MCP conformance workflow is trustworthy when it is reproducible and difficult to weaken accidentally. Pin the runner and execution environment, make the server fixture deterministic, preserve raw results after every outcome, and govern expected failures as temporary release exceptions. The stable runner's regression and stale-baseline behavior then becomes an asset instead of an ignore mechanism.
`,
    },
  },
  {
    slug: 'mcp-inspector-tutorial-2026',
    clusterId: 'mcp-testing',
    post: {
      title: 'Use MCP Inspector CLI to Automate tools/list and tools/call Tests',
      description:
        'Automate MCP tools/list and tools/call checks with the pinned Inspector CLI, typed arguments, JSON assertions, negative cases, and CI-safe evidence.',
      date: '2026-03-24',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/mcp-testing.png',
      imageAlt:
        'MCP Inspector CLI sending tools list and call requests to local and remote servers with automated JSON assertions',
      primaryKeyword: 'mcp inspector cli testing',
      keywords: [
        'mcp inspector cli testing',
        'MCP Inspector tools list',
        'MCP Inspector tools call',
        'MCP CLI automation',
        'MCP server smoke tests',
        'MCP Inspector 0.22.0',
        'Model Context Protocol tool testing',
        'MCP negative tool tests',
      ],
      contentKind: 'child',
      pillarSlug: 'mcp-server-testing-guide-2026',
      relatedSlugs: [
        'mcp-server-testing-guide-2026',
        'mcp-official-conformance-suite-server-guide-2026',
        'mcp-conformance-github-actions-baseline-2026',
        'mcp-server-contract-testing-guide',
      ],
      sources: [
        'https://github.com/modelcontextprotocol/inspector/tree/0.22.0',
        'https://github.com/modelcontextprotocol/inspector/releases/tag/0.22.0',
        'https://modelcontextprotocol.io/docs/tools/inspector',
        'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
        'https://modelcontextprotocol.io/docs/learn/versioning',
      ],
      content: `Practical **MCP Inspector CLI testing** turns the official Inspector from an interactive debugger into a repeatable smoke-test client. With \`@modelcontextprotocol/inspector@0.22.0\`, use \`--cli\` plus \`--method tools/list\` to capture a server's catalog, then use \`--method tools/call --tool-name ... --tool-arg key=value\` for positive and negative invocations. The CLI prints the MCP result as JSON, but your test must still assert tool names, schemas, content, \`structuredContent\`, and \`isError\`; process success alone is not a product assertion.

Place these checks inside the broader [MCP server testing guide](/blog/mcp-server-testing-guide-2026), and use the sibling [official conformance suite tutorial](/blog/mcp-official-conformance-suite-server-guide-2026), [GitHub Actions baseline guide](/blog/mcp-conformance-github-actions-baseline-2026), and [MCP schema contract guide](/blog/mcp-server-contract-testing-guide) for deeper gates. Reusable test guidance lives in [/skills](/skills), including the [Playwright CLI skill](/skills/Pramod/playwright-cli); the established [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide) explains the separate browser-control use case.

## Choose Inspector CLI for focused protocol probes

The [official Inspector documentation](https://modelcontextprotocol.io/docs/tools/inspector) presents the tool as a development utility for inspecting resources, prompts, tools, notifications, and server behavior. The tagged [Inspector 0.22.0 README](https://github.com/modelcontextprotocol/inspector/tree/0.22.0) documents a distinct CLI mode for automation. It supports local stdio commands, remote URLs, config files, headers, and methods including \`tools/list\` and \`tools/call\`.

Inspector CLI is useful for a small number of explicit questions:

| Question | Inspector command | Assertion you add |
| --- | --- | --- |
| Can a client initialize and discover tools? | \`--method tools/list\` | Required tools and valid schemas are present |
| Can a known tool accept a valid fixture? | \`--method tools/call\` | Result is successful and semantically correct |
| Does invalid product input remain actionable? | Same call with negative arguments | Result has \`isError: true\` and safe diagnostic content |
| Does a protected endpoint reject bad credentials? | Remote call with test header | Command fails without leaking protected data |
| Did the tool catalog drift? | Capture list JSON | Reviewed snapshot or contract diff explains the change |

It is not the official conformance suite, a load generator, a fuzzing engine, or a guarantee that the model will choose the right tool. Use the conformance runner for its formal scenarios and Inspector for narrow reproductions and repository-owned contracts.

## Version baseline and prerequisites

As of July 14, 2026, npm and the official repository identify \`0.22.0\` as the stable Inspector release. Its package metadata requires Node \`>=22.7.5\`. The current published MCP protocol remains \`2025-11-25\`; the Inspector negotiates through the SDK, while your server decides which protocol version it supports.

Record these assumptions in the test artifact:

- Inspector package \`0.22.0\` and committed lockfile;
- Node version at or above the documented minimum;
- local stdio command or remote Streamable HTTP URL;
- server commit, SDK version, and fixture revision;
- expected tool catalog revision;
- authorization identity and environment, without recording the token;
- published protocol version expected from initialization.

For repeatable repository use, install exactly one release:

\`\`\`bash
npm install --save-dev --save-exact @modelcontextprotocol/inspector@0.22.0
node --version
npm exec -- mcp-inspector --cli node build/index.js --method tools/list
\`\`\`

The third line uses the package's installed \`mcp-inspector\` binary. If you prefer the official README's on-demand form, keep the same version pin: \`npx @modelcontextprotocol/inspector@0.22.0 --cli ...\`. Do not put \`@latest\` in a release gate.

## Use the current tools/list syntax

For a local stdio server, place the server command and its arguments immediately after \`--cli\`, then add the Inspector operation flags. The 0.22.0 parser permits server arguments and recognizes the method flag later in the same command.

\`\`\`bash
mkdir -p artifacts/mcp-inspector

npm exec -- mcp-inspector --cli \
  node build/index.js --fixture test/fixtures/orders.json \
  --method tools/list \
  > artifacts/mcp-inspector/tools-list.json
\`\`\`

For a remote Streamable HTTP server, pass the endpoint URL and select \`http\` transport. Version 0.22.0 also auto-detects HTTP when a URL path ends in \`/mcp\`, but an explicit transport makes the test intent visible:

\`\`\`bash
npm exec -- mcp-inspector --cli \
  http://127.0.0.1:3001/mcp \
  --transport http \
  --method tools/list \
  > artifacts/mcp-inspector/tools-list-http.json
\`\`\`

The spelling is \`--transport http\` in CLI mode, not a guessed \`streamable-http\` flag. The wrapper maps config-file type \`streamable-http\` to the CLI's \`http\` transport value. For remote headers, the tagged README documents \`--header "X-API-Key: value"\`. Use a synthetic, short-lived test credential and prevent shell tracing from printing it.

## Assert the catalog instead of saving and forgetting it

The CLI serializes the method result as JSON. A catalog test should verify required tool identities, object-root input schemas, declared required fields, and intentional output schemas. Avoid exact snapshots of descriptions if editorial changes are allowed; assert only contract-bearing fields or maintain an approved normalized snapshot.

This Node script reads the captured result and reports actionable failures without adding another test framework:

\`\`\`javascript
import { readFile } from 'node:fs/promises';

const payload = JSON.parse(
  await readFile('artifacts/mcp-inspector/tools-list.json', 'utf8'),
);

if (!Array.isArray(payload.tools)) {
  throw new Error('tools/list result did not contain a tools array');
}

const byName = new Map(payload.tools.map((tool) => [tool.name, tool]));
const lookup = byName.get('orders.lookup');

if (!lookup) {
  throw new Error('Required tool orders.lookup is missing');
}

if (lookup.inputSchema?.type !== 'object') {
  throw new Error('orders.lookup inputSchema must have an object root');
}

if (!lookup.inputSchema.required?.includes('orderId')) {
  throw new Error('orders.lookup must require orderId');
}

if (lookup.outputSchema?.type !== 'object') {
  throw new Error('orders.lookup must publish its object output contract');
}

console.log(\`Validated \${payload.tools.length} discovered tools\`);
\`\`\`

The final count is diagnostic, not a universal minimum. A server with one well-designed tool can be valid; a server with many tools can still have poor schemas. If catalog size is a team contract, store its expected value with a reason rather than presenting it as an MCP rule.

### Normalize only non-contract noise

A useful catalog comparison starts from an allowlist of fields whose changes matter. Tool name, input schema, declared output schema, and required annotations may be release contracts. Human-readable descriptions may be reviewed but intentionally change more often. Preserve the raw response as evidence, then create a normalized comparison object for the gate. Do not overwrite the raw capture or sort arrays whose order has product meaning.

Schema normalization deserves care. Reordering object properties is normally presentation noise, while changing required membership, accepted types, numeric bounds, enum values, or whether additional properties are permitted can alter accepted calls. A comparison script should report those changes directly instead of reducing the whole schema to one opaque hash. If the server generates schemas from application types, test both the generated catalog and representative instances; generation can be deterministic while still expressing the wrong contract.

Tool annotations require a separate review. The published specification treats annotations as hints and says clients must not make security decisions from untrusted annotations. A changed destructive or read-only hint can affect client presentation and model planning, but it does not replace authorization or confirmation controls on the server. Catalog tests can detect the change, while security tests must prove the enforcement behavior.

## Use the current tools/call syntax and typed arguments

Inspector 0.22.0 requires \`--tool-name\` for \`tools/call\`. Each \`--tool-arg\` uses \`key=value\`. The parser attempts \`JSON.parse\` on each value and falls back to a string. That means \`limit=2\` becomes a number, \`includeHistory=true\` becomes a boolean, and \`status=open\` remains a string. Arrays and objects need valid JSON quoted for the shell.

\`\`\`bash
npm exec -- mcp-inspector --cli \
  node build/index.js --fixture test/fixtures/orders.json \
  --method tools/call \
  --tool-name orders.lookup \
  --tool-arg orderId=ORD-1001 \
  --tool-arg includeHistory=true \
  --tool-arg 'fields=["status","total"]' \
  > artifacts/mcp-inspector/orders-lookup-success.json

npm exec -- mcp-inspector --cli \
  node build/index.js --fixture test/fixtures/orders.json \
  --method tools/call \
  --tool-name orders.lookup \
  --tool-arg orderId=DOES-NOT-EXIST \
  > artifacts/mcp-inspector/orders-lookup-negative.json
\`\`\`

Do not infer a pass from both commands exiting zero. A protocol-valid tool execution error is still a successful JSON-RPC response, so Inspector can print a result whose \`isError\` is true. Parse and assert each file according to the case.

## Build positive and negative result assertions

A positive check should verify the result channel and product meaning. If the tool declares \`outputSchema\`, validate \`structuredContent\` against that schema. The MCP tools specification says servers with an output schema must provide conforming structured results, while clients should validate them. For backward compatibility, structured output should also have serialized JSON in a text content block.

A small positive/negative assertion module can keep the distinction clear:

\`\`\`javascript
import { readFile } from 'node:fs/promises';

async function readResult(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

const success = await readResult(
  'artifacts/mcp-inspector/orders-lookup-success.json',
);

if (success.isError === true) {
  throw new Error('Valid lookup returned a tool execution error');
}
if (success.structuredContent?.orderId !== 'ORD-1001') {
  throw new Error('Valid lookup returned the wrong fixture order');
}
if (!Array.isArray(success.content) || success.content.length === 0) {
  throw new Error('Valid lookup returned no content blocks');
}

const negative = await readResult(
  'artifacts/mcp-inspector/orders-lookup-negative.json',
);

if (negative.isError !== true) {
  throw new Error('Unknown order must be an actionable tool execution error');
}
if (!negative.content?.some((block) => block.type === 'text')) {
  throw new Error('Negative result needs a safe text explanation');
}
\`\`\`

The expectation that an unknown *order* is a tool execution error is product semantics: the tool exists, the request shape is valid, and the domain lookup fails. An unknown *tool name* is a protocol error under the published tools specification. Test both, but do not collapse them into one generic "error test."

| Negative case | Expected channel | Why |
| --- | --- | --- |
| Tool name does not exist | JSON-RPC protocol error | Client requested an unknown protocol operation target |
| Call request is malformed | JSON-RPC protocol error | Request fails the \`CallToolRequest\` shape |
| Argument has valid JSON shape but invalid domain value | Tool result with \`isError: true\` | Model can correct the argument and retry |
| Upstream order service is unavailable | Tool result with \`isError: true\` | Tool executed but its dependency failed |
| Auth header is absent on protected endpoint | Transport or authorization failure | Request is not authorized to reach tool execution |
| Successful call returns wrong order | Successful transport but failed product assertion | Protocol success does not imply semantic correctness |

### Build fixtures that expose semantic mistakes

Choose fixture values that make the wrong branch obvious. A successful lookup should use an identifier with distinctive status, totals, and history so an assertion can detect accidental fallback to the first record. A missing identifier should be absent by construction, not merely unlikely to exist. For tenant tests, place records with similar identifiers in two synthetic tenants and prove that the test principal receives only the authorized record.

Keep expected protocol errors separate from domain failures in the fixture manifest. An unknown tool tests dispatch before product code runs. A missing required argument tests schema handling. A well-shaped request for a closed account tests product policy. A simulated dependency outage tests execution failure and safe error content. These cases may all be described as negative tests in a dashboard, but their expected envelopes and remediation owners differ.

Assertions should reject accidental data disclosure as well as wrong status. Error text must not contain fixture secrets, authorization headers, stack traces, or another tenant's values. This is a security recommendation and product policy layered on top of the protocol's error channels; Inspector captures the response, while your assertion module defines which content is safe for the application.

## Test omitted fields and defaults deliberately

Run one call without an optional argument and another with the explicit value. Inspector sends only the \`--tool-arg\` pairs you provide. The 0.22.0 README advises Inspector implementations to omit empty optional fields, preserve explicit defaults when supplied by a form, include required fields, and defer deep validation to the server.

JSON Schema's \`default\` keyword is an annotation; validation does not automatically insert the value. Therefore, your server contract must state whether omitted input is normalized to a default, passed downstream as absent, or rejected by product policy. Inspector can demonstrate the observed behavior, but it does not define that behavior.

\`\`\`bash
# Omitted includeHistory: tests the server's omission policy.
npm exec -- mcp-inspector --cli node build/index.js \
  --method tools/call \
  --tool-name orders.lookup \
  --tool-arg orderId=ORD-1001 \
  > artifacts/mcp-inspector/orders-default-omitted.json

# Explicit false: tests a concrete boolean, not the string "false".
npm exec -- mcp-inspector --cli node build/index.js \
  --method tools/call \
  --tool-name orders.lookup \
  --tool-arg orderId=ORD-1001 \
  --tool-arg includeHistory=false \
  > artifacts/mcp-inspector/orders-default-explicit.json
\`\`\`

Compare normalized results or server audit records. Do not require byte-identical output when timestamps or trace IDs are intentionally dynamic; remove those fields before comparing.

## Test local stdio and remote HTTP without mixing claims

Local stdio testing launches the command provided to Inspector. It validates the built entry point, environment, stdio framing, and tool behavior in one process tree. Remote HTTP testing validates a deployed endpoint, HTTP transport, headers, and its configured backing services. Passing one does not prove the other.

| Surface | Strength | Common blind spot |
| --- | --- | --- |
| Local stdio | Fast, isolated, easy fixture injection | Does not exercise HTTP Origin, auth, proxy, or deployment config |
| Local Streamable HTTP | Exercises HTTP lifecycle with disposable data | May omit production gateway behavior |
| Staging Streamable HTTP | Exercises routing, authorization, and managed dependencies | Harder to keep data deterministic |
| Production read-only smoke | Confirms a narrow live path | Must not become a destructive conformance or regression suite |

When using a bearer token, prefer a masked environment secret and a short-lived test principal. A header passed on a command line can be visible to local process inspection. On shared runners, use repository-approved secret handling and never upload command traces containing the header.

## Put Inspector smoke tests in CI

Create a repository script that runs catalog capture, positive calls, negative calls, and assertion modules under \`set -euo pipefail\`. Upload JSON and sanitized server logs even on failure. Pin Inspector in \`devDependencies\`; the CI command should use the local binary rather than downloading code at runtime.

An example script sequence is:

\`\`\`bash
set -euo pipefail
rm -rf artifacts/mcp-inspector
mkdir -p artifacts/mcp-inspector

npm exec -- mcp-inspector --cli node build/index.js \
  --method tools/list \
  > artifacts/mcp-inspector/tools-list.json
node test/contracts/assert-tools-list.mjs

npm exec -- mcp-inspector --cli node build/index.js \
  --method tools/call \
  --tool-name orders.lookup \
  --tool-arg orderId=ORD-1001 \
  > artifacts/mcp-inspector/orders-lookup-success.json

npm exec -- mcp-inspector --cli node build/index.js \
  --method tools/call \
  --tool-name orders.lookup \
  --tool-arg orderId=DOES-NOT-EXIST \
  > artifacts/mcp-inspector/orders-lookup-negative.json

node test/contracts/assert-tool-results.mjs
\`\`\`

Run this job when tool registration, schemas, handlers, SDK versions, transport configuration, or fixture data changes. Keep the official conformance suite as a separate named job so reviewers can tell an Inspector product-contract failure from a formal scenario failure.

### Read the artifacts as one test transaction

Catalog and call captures should identify the same server build, fixture revision, identity, and transport. Otherwise a catalog from one process can be paired with a call from another configuration and produce a misleading conclusion. Write a small manifest beside the JSON files containing nonsecret commit, package, fixture, endpoint mode, and test-principal identifiers. This manifest is a team evidence format, not Inspector output or an MCP requirement.

Preserve stderr separately from stdout for local stdio runs. Inspector needs machine-readable JSON on its captured output, while server diagnostics help explain startup and handler failures. Redact diagnostics before artifact upload and retain the unmodified raw files only in an access-controlled location if policy permits. For HTTP tests, include sanitized server-side correlation identifiers so a reviewer can connect a tool result to the intended request without storing credentials.

Review the collection before release: the listed schema should match the call assumptions, positive output should satisfy declared and product contracts, negative output should use the intended error channel, and no artifact should expose sensitive values. A single green assertion script cannot compensate for captures produced from inconsistent configurations.

## Troubleshooting exact CLI failures

**"Method is required."** Add \`--method tools/list\` or \`--method tools/call\`. CLI mode does not infer the operation from \`--tool-name\`.

**"Tool name is required."** A \`tools/call\` command needs \`--tool-name\`. Confirm the spelling against captured \`tools/list\` output; names are case-sensitive by specification guidance.

**A number arrives as a string.** Make the value valid JSON. \`limit=2\` parses as number two; \`limit='02'\` is not valid JSON and remains a string. Inspect the captured server arguments when debugging.

**An object argument is split by the shell.** Quote the entire \`key=JSON\` pair, such as \`--tool-arg 'options={"limit":2}'\`. Validate the command in the same shell used by CI.

**A remote \`/mcp\` URL uses the wrong transport.** Pass \`--transport http\` explicitly. Use \`sse\` only for an SSE endpoint and \`stdio\` only with a local command.

**The command exits zero but the negative case is wrong.** Inspect \`isError\` and content. A tool execution error travels inside a successful JSON-RPC result; write a semantic assertion rather than relying only on the process code.

**Captured JSON contains unexpected text.** Ensure a stdio server writes only MCP messages to stdout and sends logs to stderr. For remote mode, check whether wrapper scripts print banners before launching the server.

## Limitations and safe claims

Inspector CLI invokes one operation at a time. It does not generate a complete conformance verdict, prove concurrency safety, explore every schema boundary, or assess whether a language model chooses tools safely. Its output reflects one fixture, identity, transport, and server version.

The CLI parser helps encode basic JSON values, but it is not a replacement for server-side JSON Schema validation. The official Inspector guidance explicitly defers deep validation to the server. Treat catalog and call assertions as repository-owned tests whose thresholds and expected semantics require product review.

## Automation checklist

- Pin \`@modelcontextprotocol/inspector@0.22.0\` and commit the lockfile.
- Use Node \`>=22.7.5\`; record the actual CI patch version.
- Use \`--cli --method tools/list\` for catalog capture.
- Use \`--method tools/call --tool-name\` plus repeated \`--tool-arg\` pairs for calls.
- Quote JSON arrays and objects for the shell.
- Assert JSON content, \`structuredContent\`, and \`isError\`, not only exit code.
- Test unknown tool, domain-invalid input, dependency failure, and unauthorized access separately.
- Keep stdio and Streamable HTTP evidence labeled by transport.
- Use synthetic data and short-lived test credentials.
- Run formal conformance, security, and load tests as separate gates.

## Frequently asked questions

### What is the exact command to list MCP tools with Inspector 0.22.0?

For local stdio, use \`npm exec -- mcp-inspector --cli node build/index.js --method tools/list\`. For a remote MCP endpoint, use the URL as the target and add \`--transport http --method tools/list\`.

### How do I call a tool from Inspector CLI?

Use \`--method tools/call --tool-name NAME\`, followed by one or more \`--tool-arg key=value\` options. Version 0.22.0 parses valid JSON values, so booleans, numbers, arrays, and objects retain their JSON types when quoted correctly for the shell.

### Does Inspector validate a tool's inputSchema?

The Inspector exposes schemas and performs basic argument handling, but its official guidance defers deep validation to the server. Add a JSON Schema validator in your contract tests and verify the server reports invalid domain input through the correct error channel.

### Why did a tool error produce exit code zero?

A tool execution error is a valid MCP result with \`isError: true\`. The Inspector successfully completed the protocol request and printed that result. Parse the JSON and assert \`isError\` plus diagnostic content for the negative case.

### Should I snapshot the entire tools/list response?

Only if every field is intentionally stable. Normalized contract assertions are often better: required names, schema dialect, required fields, output schemas, and security annotations. Review description or ordering changes separately if they are not compatibility contracts.

### Can Inspector replace the official conformance suite?

No. Inspector is excellent for smoke tests and reproductions, while the conformance runner executes its maintained protocol scenarios and baseline logic. Use both, with clearly different job names and claims.

### Is MCP Inspector safe to expose on a shared network?

The official Inspector warns that its UI proxy can launch local processes and should not be exposed to untrusted networks. CLI mode still executes the target command or connects to a supplied URL. Run it in an isolated environment, restrict credentials and egress, and do not disable security controls for convenience.

## Conclusion

Inspector CLI becomes a useful automation tool when the syntax and assertion boundary are explicit. Pin 0.22.0, capture \`tools/list\`, invoke \`tools/call\` with correctly typed arguments, and inspect the JSON result channel. That creates fast, readable smoke tests while leaving conformance, schema depth, security, and product behavior to their appropriate test layers.
`,
    },
  },
  {
    slug: 'mcp-server-contract-testing-guide',
    clusterId: 'mcp-testing',
    post: {
      title: 'Test MCP Tool Schemas, Defaults, Invalid Inputs, and Error Types',
      description:
        'Test MCP tool schemas, omitted defaults, invalid inputs, protocol and execution errors, structured output, and product semantics under the current spec.',
      date: '2026-07-10',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/mcp-testing.png',
      imageAlt:
        'MCP tool contract matrix separating JSON Schema validation, defaults, error channels, structured output, and product behavior',
      primaryKeyword: 'mcp tool schema contract testing',
      keywords: [
        'mcp tool schema contract testing',
        'MCP inputSchema testing',
        'MCP outputSchema validation',
        'MCP tool execution errors',
        'MCP protocol errors',
        'MCP structuredContent testing',
        'JSON Schema 2020-12 MCP',
        'MCP tool defaults',
        'MCP product contract tests',
      ],
      contentKind: 'child',
      pillarSlug: 'mcp-server-testing-guide-2026',
      relatedSlugs: [
        'mcp-server-testing-guide-2026',
        'mcp-official-conformance-suite-server-guide-2026',
        'mcp-conformance-github-actions-baseline-2026',
        'mcp-inspector-tutorial-2026',
      ],
      sources: [
        'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
        'https://modelcontextprotocol.io/specification/2025-11-25/basic',
        'https://modelcontextprotocol.io/specification/2025-11-25/schema',
        'https://modelcontextprotocol.io/docs/learn/versioning',
        'https://json-schema.org/understanding-json-schema/reference/annotations',
      ],
      content: `Effective **MCP tool schema contract testing** separates five questions that are often collapsed into one assertion: is the advertised JSON Schema valid, how does the server normalize omitted values, which failures belong in JSON-RPC errors, which failures belong in tool results with \`isError: true\`, and does a successful result satisfy both \`outputSchema\` and the product's meaning? Under the published \`2025-11-25\` MCP specification, these are related contracts with different authorities and different failure evidence.

Use the [MCP server testing pillar](/blog/mcp-server-testing-guide-2026) for the complete architecture, then pair this guide with the [official conformance server tutorial](/blog/mcp-official-conformance-suite-server-guide-2026), [GitHub Actions conformance baseline](/blog/mcp-conformance-github-actions-baseline-2026), and [MCP Inspector CLI tutorial](/blog/mcp-inspector-tutorial-2026). Teams can find reusable QA instructions in [/skills](/skills), install the [Playwright CLI skill](/skills/Pramod/playwright-cli), and read the canonical [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide) when tool contracts drive browser workflows.

## Start with the current published contract

As of July 14, 2026, the [MCP versioning documentation](https://modelcontextprotocol.io/docs/learn/versioning) identifies \`2025-11-25\` as the current published protocol release. Draft material can describe future behavior, but it is not the baseline for a current release gate. Record the protocol revision, server SDK version, schema validator and dialect configuration, application commit, fixture revision, and tool catalog digest with every contract run.

The published [tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) establishes these relevant requirements and recommendations:

| Contract area | Published MCP behavior | What your tests must not assume |
| --- | --- | --- |
| \`inputSchema\` | Required JSON Schema object for every tool; defaults to dialect 2020-12 without \`$schema\` | A validator automatically inserts values from \`default\` |
| \`outputSchema\` | Optional JSON Schema for \`structuredContent\`; when supplied, server results must conform and clients should validate | Text content alone proves the structured contract |
| Unknown tool or malformed call | Protocol error | Every invalid domain value should be a protocol error |
| Input validation, API, or business failure | Tool result with \`isError: true\` | JSON-RPC success means the tool succeeded |
| Tool annotations | Hints that clients must treat as untrusted from untrusted servers | \`readOnlyHint\` enforces authorization or prevents writes |
| Human control and security | Specification contains SHOULD and MUST guidance for confirmation, validation, access control, rate limits, sanitization, and audit | One universal prompt, timeout, or rate threshold fits every product |

Keep specification requirements, implementation behavior, security recommendations, and team policy labeled in test names and reports. For example, "output matches declared schema" is a protocol contract; "refund quotes expire after 15 minutes" is product semantics; "block release when any destructive tool lacks approval coverage" is team policy.

## Define a representative tool contract

Use a real tool shape with enough constraints to expose type, omission, error, and output mistakes. The following \`orders.quote_refund\` definition uses explicit JSON Schema 2020-12, rejects unknown input properties as a team compatibility choice, annotates an optional currency, and declares structured output.

\`\`\`json
{
  "name": "orders.quote_refund",
  "title": "Quote an order refund",
  "description": "Calculate an eligible refund quote without issuing the refund.",
  "inputSchema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "orderId": {
        "type": "string",
        "pattern": "^ORD-[0-9]{4}$"
      },
      "currency": {
        "type": "string",
        "enum": ["USD", "EUR"],
        "default": "USD"
      },
      "includeShipping": {
        "type": "boolean",
        "default": false
      }
    },
    "required": ["orderId"]
  },
  "outputSchema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "orderId": { "type": "string" },
      "eligible": { "type": "boolean" },
      "amount": { "type": "number", "minimum": 0 },
      "currency": { "type": "string", "enum": ["USD", "EUR"] },
      "reasonCode": { "type": "string" }
    },
    "required": ["orderId", "eligible", "amount", "currency", "reasonCode"]
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
\`\`\`

The root \`additionalProperties: false\` is not a universal MCP requirement. It is a compatibility policy that prevents misspelled or newly introduced fields from being ignored. Some extensible tools intentionally allow additional properties. Decide per tool and test the decision.

The annotations are discovery hints, not security controls. A server must still authenticate the caller, authorize access to the order, prevent cross-tenant data exposure, and ensure the supposedly read-only implementation does not mutate state.

## Test schema validity before instance validity

There are two validation layers:

1. **Schema validation** asks whether \`inputSchema\` and \`outputSchema\` are legal schemas in the declared or default dialect.
2. **Instance validation** asks whether a particular argument object or \`structuredContent\` value satisfies that legal schema.

The MCP base specification says schemas without \`$schema\` default to JSON Schema 2020-12, implementations must support at least that dialect, and unsupported explicit dialects must be handled gracefully. Configure the validator for 2020-12; do not let a library silently interpret the schema as draft-07.

Build catalog tests for every advertised tool:

- \`name\` is unique and follows the published naming guidance;
- \`inputSchema\` is non-null, valid for its dialect, and has an object root;
- every name in \`required\` exists under \`properties\` when that is the intended schema structure;
- examples and defaults validate against their containing subschemas;
- references resolve without network access in CI unless remote retrieval is explicitly controlled;
- \`outputSchema\`, when present, is valid and has an object root;
- annotations match observed behavior, even though they remain hints.

Use an explicit case matrix rather than one happy-path object:

| Case | Input | Schema expectation | Product expectation |
| --- | --- | --- | --- |
| Minimum valid | \`{"orderId":"ORD-1001"}\` | Valid | Server applies documented omission policy |
| Fully explicit | Order, USD, shipping false | Valid | Same normalized quote as minimum case if defaults are applied |
| Wrong JSON type | \`includeShipping: "false"\` | Invalid | Actionable tool execution error |
| Pattern violation | \`orderId: "1001"\` | Invalid | Actionable tool execution error |
| Unknown property | \`includeTax: true\` | Invalid under this schema | No silent ignore |
| Unsupported enum | \`currency: "GBP"\` | Invalid | Error identifies supported choices without leaking data |
| Valid shape, missing domain entity | \`ORD-9999\` | Valid | Product not-found tool execution error |
| Valid and eligible | Fixture order \`ORD-1001\` | Valid | Correct quote and schema-valid structured output |

Schema validation tells you whether the data shape is accepted. It cannot prove that the quote amount, tenant, eligibility, reason code, or authorization decision is correct.

## Treat default as an annotation, then define server policy

The official [JSON Schema annotation documentation](https://json-schema.org/understanding-json-schema/reference/annotations) states that \`default\` does not fill missing values during validation. It can communicate that absence is semantically equivalent to a value, and tools such as forms may use it as a hint. Therefore, MCP schema validation alone does not turn an omitted \`currency\` into \`"USD"\`.

Choose and document one normalization policy:

| Policy | Omitted field behavior | Contract test |
| --- | --- | --- |
| Server applies schema defaults | Server materializes \`USD\` and \`false\` before business logic | Omitted and explicit-default calls produce equivalent normalized audit input |
| Application defaults independently | Domain service owns the default; schema mirrors it | Unit test schema and application constants cannot drift |
| Absence has separate meaning | Omitted differs from explicit value | Test both paths and remove misleading \`default\` annotation |
| Field is actually required | Server rejects omission | Add field to \`required\`; do not rely on prose |

Test omission, explicit default, non-default, explicit null, and wrong type separately. Null is not absence. If the schema type is \`string\`, \`null\` is invalid unless the schema explicitly permits it.

\`\`\`json
{
  "cases": [
    {
      "id": "currency-omitted",
      "arguments": { "orderId": "ORD-1001" },
      "normalized": { "orderId": "ORD-1001", "currency": "USD", "includeShipping": false }
    },
    {
      "id": "currency-explicit-default",
      "arguments": { "orderId": "ORD-1001", "currency": "USD", "includeShipping": false },
      "normalized": { "orderId": "ORD-1001", "currency": "USD", "includeShipping": false }
    },
    {
      "id": "currency-explicit-null",
      "arguments": { "orderId": "ORD-1001", "currency": null },
      "expectedError": "tool-execution"
    }
  ]
}
\`\`\`

The \`normalized\` field is a fixture expectation, not an MCP message field. Observe normalization through a test seam or sanitized audit event; do not add private diagnostic data to production tool results merely for testing.

## Distinguish malformed requests from invalid tool inputs

The current tools specification defines two error mechanisms. Protocol errors are standard JSON-RPC errors for an unknown tool, a malformed \`CallToolRequest\`, or a server-level protocol failure. Tool execution errors are ordinary JSON-RPC results with \`isError: true\` for input validation, upstream API failures, and business logic errors.

That means "invalid input" needs a precise definition:

| Failure | Example | Correct channel under current tools spec |
| --- | --- | --- |
| Malformed request envelope | \`params\` is a string, or required request structure is absent | JSON-RPC protocol error |
| Unknown tool | \`name: "orders.missing"\` | JSON-RPC protocol error |
| Arguments violate tool schema | Boolean supplied as string | Tool result with \`isError: true\` |
| Arguments pass schema but violate domain rule | Refund window closed | Tool result with \`isError: true\` |
| Dependency rejects or times out | Order service unavailable | Tool result with \`isError: true\` |
| Caller lacks product permission | Valid identity cannot access order | Product/security design; normally actionable execution error without leaked data |
| MCP endpoint lacks valid authorization | Missing or invalid HTTP credential | Authorization or transport response before tool execution |

Do not require \`-32602\` for every schema-invalid argument. The \`2025-11-25\` changelog explicitly clarifies that input validation errors should be tool execution errors so a model can correct its call. Reserve protocol errors for the malformed or unknown protocol-level cases described by the specification.

These two JSON documents show the shape difference. The first is a protocol error for an unknown tool:

\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 7,
  "error": {
    "code": -32602,
    "message": "Unknown tool: orders.missing"
  }
}
\`\`\`

The second is a tool execution error for a known tool with a domain-invalid order identifier:

\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "orderId must use the form ORD-0000"
      }
    ],
    "isError": true
  }
}
\`\`\`

Error messages should be actionable enough for correction but must not expose stack traces, credentials, tenant existence, database queries, or internal network details. Exact public error codes and redaction rules are product and security contracts.

## Validate structuredContent and its text fallback

\`structuredContent\` is a JSON object in a tool result. When the tool advertises \`outputSchema\`, the server must provide structured results conforming to it, and clients should validate them. The tools specification also recommends returning serialized JSON in a text content block for backward compatibility.

A valid success fixture for the refund quote could be:

\`\`\`json
{
  "content": [
    {
      "type": "text",
      "text": "{\"orderId\":\"ORD-1001\",\"eligible\":true,\"amount\":42.5,\"currency\":\"USD\",\"reasonCode\":\"WITHIN_WINDOW\"}"
    }
  ],
  "structuredContent": {
    "orderId": "ORD-1001",
    "eligible": true,
    "amount": 42.5,
    "currency": "USD",
    "reasonCode": "WITHIN_WINDOW"
  },
  "isError": false
}
\`\`\`

Test at least these output defects:

- \`structuredContent\` is absent despite an advertised output schema;
- amount is a numeric string instead of a number;
- a required field is missing;
- currency falls outside the enum;
- an undeclared property appears when output forbids additional properties;
- text fallback is missing or serializes different data;
- result is schema-valid but refers to the wrong order;
- \`isError\` is true while the payload looks like a successful quote.

If error results need structured machine-readable fields, define and document an error contract deliberately. Do not assume a success-only \`outputSchema\` automatically describes every \`isError: true\` payload. The current specification's broad conformance statement should be tested against your SDK behavior and tool design, and ambiguous error unions should be made explicit in product documentation.

## Add transport-neutral contract assertions

Keep core assertions independent of stdio or HTTP so the same matrix can run through an SDK client, Inspector capture, or another harness. The following TypeScript is syntactically complete and receives an injected request function; it does not guess a changing SDK constructor.

\`\`\`typescript
import assert from 'node:assert/strict';

type JsonObject = Record<string, unknown>;
type Invoke = (request: JsonObject) => Promise<JsonObject>;

export async function verifyRefundContracts(invoke: Invoke) {
  const unknownTool = await invoke({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'orders.missing', arguments: {} },
  });
  assert.equal(typeof unknownTool.error, 'object');

  const invalidInput = await invoke({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'orders.quote_refund',
      arguments: { orderId: 'ORD-1001', includeShipping: 'false' },
    },
  });
  const invalidResult = invalidInput.result as JsonObject;
  assert.equal(invalidResult.isError, true);

  const valid = await invoke({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'orders.quote_refund',
      arguments: { orderId: 'ORD-1001' },
    },
  });
  const result = valid.result as JsonObject;
  assert.notEqual(result.isError, true);

  const output = result.structuredContent as JsonObject;
  assert.equal(output.orderId, 'ORD-1001');
  assert.equal(output.currency, 'USD');
  assert.equal(typeof output.amount, 'number');
  assert.equal(typeof output.eligible, 'boolean');
}
\`\`\`

Add your chosen JSON Schema 2020-12 validator before the semantic assertions. The injected \`invoke\` adapter should preserve the full JSON-RPC response so the test can distinguish \`error\` from \`result.isError\`. Do not write an adapter that converts every failure into a thrown JavaScript exception; that erases the protocol channel under test.

## Test product semantics after schema success

A schema-valid response can still be dangerously wrong. For the quote tool, assert:

- the returned order belongs to the authorized fixture tenant;
- eligibility matches refund-window and order-state rules;
- amount uses the approved decimal and rounding policy;
- currency comes from the order or documented default policy;
- shipping inclusion follows the explicit argument;
- the quote operation creates no refund or payment side effect;
- reason code maps to a documented user-safe explanation;
- repeated calls are consistent with the advertised idempotency hint;
- unavailable dependencies produce a safe execution error rather than a fabricated quote.

These are product requirements. MCP transports them but does not define refund arithmetic, tenant design, or idempotency keys. Assign business owners to expected values and security owners to authorization and leakage cases.

Use mutation tests against the fixture: change the order tenant, state, purchase date, currency, item total, shipping amount, and prior refund status one field at a time. A mutation should change only the outcomes implied by the rule. This catches handlers that return a hard-coded schema-valid fixture.

## Include security and team policy without overstating the spec

The tools specification says servers must validate inputs, implement access controls, rate limit invocations, and sanitize outputs. It recommends that clients confirm sensitive operations, show inputs, validate results, use timeouts, and log tool use. Those statements establish direction, but exact limits remain implementation and team decisions.

| Control | Specification or recommendation | Example team policy |
| --- | --- | --- |
| Input validation | Server MUST validate | Validate before any dependency call and log only field names on rejection |
| Access control | Server MUST implement proper controls | Every order lookup is tenant-scoped and deny-by-default |
| Rate limiting | Server MUST rate limit | Limit chosen from abuse model and service capacity, not a copied universal number |
| Output sanitization | Server MUST sanitize | No stack, credential, raw SQL, or cross-tenant identifier in errors |
| Confirmation | Client SHOULD confirm sensitive operations | Refund execution requires explicit user confirmation; quote does not |
| Timeout | Client SHOULD implement | Per-tool budget based on observed latency and safe cancellation behavior |

Test both presence and effectiveness. A rate limiter that always permits calls is not proven by configuration. An annotation claiming read-only behavior is not proven until a state-diff assertion shows no mutation.

## Run contracts in CI and release review

Organize the job into catalog, call-shape, error-channel, structured-output, product, and security phases. Save normalized request and response fixtures with secrets removed. Run contract tests on every tool schema or handler change, every MCP SDK upgrade, and every product rule change that affects tool output.

Block release on protocol contract failures. Whether a product-semantic or security test can be temporarily waived is a risk decision, but waivers need owner, impact, compensating control, and expiry. Never convert a wrong error channel or cross-tenant result into a broad expected snapshot.

Compare catalog digests across releases. A removed tool, newly required input, narrowed enum, changed default meaning, or incompatible output schema should trigger compatibility review. Adding an optional output property can still break strict consumers if they apply \`additionalProperties: false\` locally, so publish change notes even for theoretically additive updates.

## Troubleshooting failures by layer

**Schema compiles in one environment but not another.** Confirm both validators use the declared dialect. MCP defaults an absent \`$schema\` to 2020-12; a draft-07 default in a library is a configuration mismatch.

**Omitted values differ between Inspector and an SDK client.** Compare the actual arguments sent. A form may materialize an explicit default while CLI invocation omits the key. Decide whether normalization belongs to the server and test both request shapes.

**Invalid arguments return a JSON-RPC error.** Check whether the request itself is malformed or only violates the tool's input schema. Under the current tools guidance, input validation belongs in a tool execution error so a model can retry.

**Structured output validates but the text fallback differs.** Serialize from one normalized result object instead of building text and structured forms independently. Test semantic equality after parsing the text JSON.

**The success response validates but contains the wrong tenant's order.** This is a critical product and access-control failure, not a schema problem. Stop the release and inspect authorization scope before changing expected fixtures.

**Annotations disagree with behavior.** Treat annotations as untrusted hints and fix either the implementation or metadata. Never use the hint as the only authorization or confirmation control.

## Limitations

Contract tests cover declared tools and selected fixtures. They cannot prove every JSON Schema instance, every dependency response, or every attack path. Property-based generation and fuzzing can broaden input coverage, but generated cases still need domain oracles. Load and concurrency tests are separate because a functionally valid tool may race or exhaust resources under parallel calls.

Schema compatibility is also consumer-dependent. MCP defines message shapes and guidance, while a particular client may have stricter code generation or rendering behavior. Test the supported clients that matter to your product without rewriting those client quirks as universal protocol rules.

## Contract checklist

- Pin and record the published MCP protocol baseline \`2025-11-25\`.
- Validate each schema against its declared or default 2020-12 dialect.
- Test valid, omitted, explicit-default, null, wrong-type, enum, pattern, and extra-field inputs.
- Define who applies defaults; do not expect validation to insert them.
- Assert malformed requests and unknown tools through protocol errors.
- Assert schema, dependency, and business failures through \`isError: true\` results.
- Validate \`structuredContent\` whenever \`outputSchema\` is advertised.
- Compare the serialized text fallback with structured data.
- Add product semantics and tenant authorization after schema validation.
- Verify annotations against behavior while treating them as hints.
- Preserve sanitized fixtures, responses, versions, and catalog digests in CI.
- Review every schema change for backward compatibility and release impact.

## Frequently asked questions

### Which JSON Schema dialect does MCP use for tool schemas?

The published \`2025-11-25\` specification defaults schemas without \`$schema\` to JSON Schema 2020-12. Implementations must support that dialect and should document additional dialects. Explicitly configure your validator instead of relying on its library default.

### Does the default keyword insert a missing tool argument?

No. JSON Schema defines \`default\` as an annotation, not a mutation performed by validation. A form or server may choose to apply it. Document that normalization policy and test omitted and explicit values separately.

### Should a schema-invalid tool argument return JSON-RPC -32602?

Not under the current tools guidance when the \`tools/call\` request is structurally valid and the known tool's argument fails validation. Return a tool execution error with \`isError: true\` and actionable content. Reserve protocol errors for unknown tools, malformed requests, and protocol-level server failures.

### Is structuredContent required for every tool?

Tools can return unstructured content without an output schema. When a tool advertises \`outputSchema\`, the server must provide conforming structured results, and clients should validate them. The specification recommends a serialized text block for backward compatibility.

### Does outputSchema prove the result is correct?

No. It proves only that the structured value has the declared shape. A refund amount can be a valid number and still be wrong, unauthorized, or calculated from another tenant's order. Add product and security assertions after schema validation.

### Are readOnlyHint and destructiveHint security controls?

No. Tool annotations are hints and must be treated as untrusted when they come from untrusted servers. Enforce authorization, confirmation, isolation, and side-effect controls in the client and server, then test observed behavior.

### Should error results conform to the success output schema?

Do not assume a success-only schema explains every error payload. Define an explicit structured error design if clients need one, test it against your SDK behavior, and always preserve the required distinction between protocol errors and tool execution errors.

### How often should MCP tool contracts run?

Run them on every change to tool registration, schemas, handlers, product rules, MCP SDK, authorization, or transport adapters. Include the stable conformance suite as a separate job and run broader security, fuzz, and load coverage according to release risk.

## Conclusion

A durable MCP tool contract is layered. Validate the advertised schema and dialect, define omission and default behavior, preserve the protocol-versus-execution error boundary, verify structured results, and then assert the product's real meaning and security rules. Keeping those layers separate produces failures that are diagnosable and release claims that match what the tests actually prove.
`,
    },
  },
];
