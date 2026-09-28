import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 2.0 Migration Guide: Breaking Changes and Upgrade Steps',
  description: 'A practical k6 2.0 migration guide for QA teams: audit breaking CLI, cloud, xk6, Redis, and OpenTelemetry changes, then upgrade CI safely with checklists.',
  date: '2026-09-28',
  category: 'Migration',
  content: `
# k6 2.0 Migration Guide: Breaking Changes and Upgrade Steps

k6 2.0 is a cleanup release with real migration work for teams that still carry pre-2.0 commands, old Grafana Cloud options, xk6 extension imports, Redis experiments, or OpenTelemetry output compatibility switches. The short version: ordinary protocol scripts that use \`k6 run script.js\`, modern executors, \`options.cloud\`, and no custom extensions usually upgrade cleanly. CI pipelines, cloud workflows, and extension repositories need a deliberate audit.

As of September 28, 2026, the official GitHub releases page marks k6 \`v2.3.0\` as the latest release. k6 \`v2.0.0\` was released on May 11, 2026, after \`v2.0.0-rc1\`. The v2.0 release removed long-deprecated interfaces rather than renaming the whole product. Grafana k6 is still active, the Docker image line continues under \`grafana/k6\`, and the official docs now include a dedicated migration page for v2.

Use this k6 2.0 migration guide as a field checklist. Start by inventorying scripts and pipeline calls, patch the hard removals, run v2 locally with the same outputs your CI uses, then move runners and Docker tags. If you are also refreshing your performance strategy, pair this upgrade with the broader [k6 load testing guide](/blog/k6-load-testing-guide-2026). If you maintain custom extensions, read the extension section here and then go deeper with [xk6 extensions for load testing](/blog/xk6-extensions-load-testing).

## What Changed In k6 2.0, In Release Order

The most important migration fact is that v2.0.0 is not just a feature release. It is the point where many deprecated paths finally disappear. The release notes also matter because some useful migration aids landed later in v2.1, v2.2, and v2.3.

| Version | Release date from official releases | Migration impact |
|---|---:|---|
| \`v2.0.0-rc1\` | April 28, 2026 | Previewed the major cleanup so teams could test deprecated command and config removals before the final release. |
| \`v2.0.0\` | May 11, 2026 | Removed deprecated commands, flags, executor support, old cloud syntax, old cloud option block, Redis experimental module, and extension import path compatibility. |
| \`v2.1.0\` | June 30, 2026 | Added \`k6 cloud test list\`, feature flags through \`--features\` and \`K6_FEATURES\`, browser context proxy support, and \`k6 x\` subcommand discovery. No breaking changes were listed. |
| \`v2.2.0\` | August 10, 2026 | Added local-execution log streaming for cloud runs, \`chromium.connectOverCDP()\`, \`TextEncoder\`, \`TextDecoder\`, \`k6 cloud load-zone list\`, and more feature flags. No breaking changes were listed. |
| \`v2.3.0\` | September 21, 2026 | Added \`--scenario\`, \`--once\`, async \`group()\` support behind a feature flag, byte helpers, TLS AIA fetching, Prometheus labels, nanosecond log timestamps, and WebSocket ready-state constants. |

For teams upgrading today, targeting \`grafana/k6:2.3.0\` in Docker or installing k6 \`2.3.0\` in CI is usually better than stopping at exactly \`2.0.0\`. You still need to fix the v2.0 removals, but v2.3 gives you better smoke-test ergonomics with \`--scenario\` and \`--once\`, plus fixes and observability improvements that help validate the migration.

The official release notes are at https://github.com/grafana/k6/releases and https://grafana.com/docs/k6/latest/release-notes/. Grafana's dedicated migration page is https://grafana.com/docs/k6/latest/get-started/migrating-to-v2/.

## Build An Upgrade Inventory Before You Touch CI

The safest migration starts with a search pass over every place k6 can be invoked: test scripts, reusable shell scripts, Dockerfiles, GitHub Actions workflows, Makefiles, GitLab CI files, Jenkinsfiles, Helm charts, and extension repositories. AI coding agents are useful here, but only if you give them a concrete search contract. Ask the agent to find removed interfaces, show file locations, and separate script changes from runner changes.

\`\`\`bash
rg "k6 login|k6 pause|k6 resume|k6 scale|k6 status" .
rg "k6 cloud [^r]" .github scripts Makefile Jenkinsfile Dockerfile
rg "upload-only|no-summary|summary-mode=legacy" .
rg "ext:|loadimpact|options.ext.loadimpact" tests src perf .
rg "k6/experimental/redis|externally-controlled" .
rg "K6_BINARY_PROVISIONING|K6_ENABLE_COMMUNITY_EXTENSIONS" .
rg "K6_OTEL_EXPORTER_TYPE|K6_OTEL_SINGLE_COUNTER_FOR_RATE" .
rg "go.k6.io/k6/" .
\`\`\`

Those searches intentionally overmatch. A match in a README is not a production failure. A match in \`.github/workflows/perf.yml\`, a shared \`ci/k6.sh\`, or a generated xk6 module is a migration blocker. Keep the raw inventory because it becomes your pull request checklist.

| Search target | Breaks where | Replacement or decision |
|---|---|---|
| \`k6 login cloud\` | Developer setup scripts, CI bootstrap docs | Use \`k6 cloud login\` interactively, or set \`K6_CLOUD_TOKEN\` and \`K6_CLOUD_STACK_ID\` in CI. |
| \`k6 pause\`, \`k6 resume\`, \`k6 scale\`, \`k6 status\` | Operations scripts that controlled a running test | No direct replacement. Redesign load control around scenarios and scheduled runs. |
| \`externally-controlled\` | Script \`options.scenarios\` | No replacement. Use \`constant-vus\`, \`ramping-vus\`, \`constant-arrival-rate\`, or another maintained executor. |
| \`k6 cloud script.js\` | CI and local scripts | Use \`k6 cloud run script.js\`. |
| \`--upload-only\` | Cloud upload jobs | Use \`k6 cloud upload script.js\`. |
| \`--no-summary\` | Quiet CI jobs | Use \`--summary-mode=disabled\`. |
| \`--summary-mode=legacy\` | Parsers built for old summary text | Switch to \`compact\`, \`full\`, or structured output from \`handleSummary()\`. |
| \`options.ext.loadimpact\` | Test scripts | Move cloud settings to \`options.cloud\`. |
| \`k6/experimental/redis\` | Redis setup, data seeding, cache checks | Use \`k6/x/redis\` with extension resolution or a custom xk6 binary. |
| \`go.k6.io/k6/\` in Go | xk6 extensions and internal helpers | Update imports to \`go.k6.io/k6/v2/\`, then run \`go mod tidy\`. |

What people get wrong: they update the local \`k6\` binary first, run one happy-path script, and declare the migration done. The hidden breakage is usually in non-default commands: a nightly cloud upload, an old dashboard parser that expected legacy summary text, a workflow that injects \`K6_OTEL_EXPORTER_TYPE\`, or an extension built in a separate repository.

## Pin The Runner, Then Prove The Binary

Do not upgrade by floating \`latest\` in CI and hoping every runner sees the same bits. Pin the first v2 run, record \`k6 version\`, and keep a rollback branch that still uses your last v1 tag. The official install docs still support native packages, standalone binaries, Homebrew, Windows installers, and Docker. For containerized CI, use the \`grafana/k6\` image and pin the tag during the migration.

\`\`\`bash
docker pull grafana/k6:2.3.0
docker run --rm grafana/k6:2.3.0 version
docker run --rm -i grafana/k6:2.3.0 run - < tests/smoke.js
\`\`\`

For mounted scripts and local modules, use a volume so k6 can resolve imports from inside the container.

\`\`\`bash
docker run --rm -i \\
  -v "\${PWD}/tests:/tests:ro" \\
  grafana/k6:2.3.0 run /tests/checkout.js
\`\`\`

In GitHub Actions, the official Grafana actions are \`grafana/setup-k6-action@v1\` and \`grafana/run-k6-action@v1\`. The examples in Grafana's README still show older checkout majors, but the workflow below uses the current majors.

\`\`\`yaml
name: k6-v2-smoke

on:
  pull_request:
  workflow_dispatch:

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: grafana/setup-k6-action@v1
        with:
          k6-version: "2.3.0"
      - name: Prove k6 version
        run: k6 version
      - uses: grafana/run-k6-action@v1
        with:
          path: |
            tests/smoke.js
          flags: --summary-mode=compact
\`\`\`

If you prefer Docker instead of the marketplace actions, keep the image tag visible in the workflow.

\`\`\`yaml
name: k6-docker-v2

on:
  workflow_dispatch:

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Run pinned k6 container
        run: |
          docker run --rm -i -v "\${PWD}/tests:/tests:ro" grafana/k6:2.3.0 version
          docker run --rm -i -v "\${PWD}/tests:/tests:ro" grafana/k6:2.3.0 run /tests/smoke.js
\`\`\`

The Docker path is attractive when the rest of the pipeline already runs in containers. The action path is convenient when you want browser support from \`setup-k6-action\` or want \`run-k6-action\` to handle globs and Grafana Cloud behavior.

## Replace Removed CLI Commands With Explicit Workflows

The removed command list in v2.0 is short but sharp: \`k6 login\`, \`k6 pause\`, \`k6 resume\`, \`k6 scale\`, and \`k6 status\` are gone. \`k6 login cloud\` becomes \`k6 cloud login\`. The InfluxDB login command has no command replacement, so output authentication belongs in environment variables.

\`\`\`bash
# Old cloud login, removed in k6 2.0
k6 login cloud

# New interactive login
k6 cloud login

# CI style, no prompt
K6_CLOUD_TOKEN="<token>" K6_CLOUD_STACK_ID="<stack-id>" k6 cloud run tests/checkout.js
\`\`\`

The pause, resume, scale, and status commands depended on a control model that no longer exists for normal use. If a pipeline used them to ramp a long-running soak test up and down, the correct migration is a scenario design, not a new command.

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    warmup_and_peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 25 },
        { duration: '20m', target: 25 },
        { duration: '5m', target: 80 },
        { duration: '20m', target: 80 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750'],
  },
};

export default function () {
  const response = http.get('https://quickpizza.grafana.com/');
  check(response, {
    'homepage returned 200': (res) => res.status === 200,
    'homepage has body': (res) => res.body.length > 100,
  });
  sleep(1);
}
\`\`\`

That example is more boring than remote scaling, which is exactly the point. A planned ramp profile is reproducible in review, visible to AI agents, and repeatable in CI. External commands that mutate a running test are harder to audit and harder to explain after a performance regression.

## Rewrite Cloud Commands And Stack Selection

k6 2.0 made two cloud workflow changes that affect CI immediately. First, the old positional form \`k6 cloud script.js\` is removed. Use \`k6 cloud run script.js\`. Second, every \`k6 cloud\` subcommand requires a stack. Earlier fallback behavior that picked the first available stack is gone.

| Old cloud behavior | k6 2.0 behavior | Migration step |
|---|---|---|
| \`k6 cloud script.js\` | Removed | Use \`k6 cloud run script.js\`. |
| \`k6 cloud --upload-only script.js\` | Removed | Use \`k6 cloud upload script.js\`. |
| Stack omitted and first stack used | Removed | Run \`k6 cloud login\` with stack, or set \`K6_CLOUD_STACK_ID\`. |
| No project discovery command in older workflows | v2.0 adds \`k6 cloud project list\` | Use \`--json\` when tooling needs stable parsing. |
| Test listing scripted through ad hoc UI or API calls | v2.1 adds \`k6 cloud test list\` | Use \`--project-id\`, \`K6_CLOUD_PROJECT_ID\`, or the default project. |

A robust CI cloud job now sets token and stack explicitly. Use repository or organization secrets for tokens, and use normal workflow inputs for stack or project IDs when you need to test multiple Grafana Cloud stacks.

\`\`\`yaml
name: k6-cloud-run

on:
  workflow_dispatch:
    inputs:
      project_id:
        description: Grafana Cloud k6 project ID
        required: true

jobs:
  cloud:
    runs-on: ubuntu-latest
    env:
      K6_CLOUD_TOKEN: \${{ secrets.K6_CLOUD_TOKEN }}
      K6_CLOUD_STACK_ID: \${{ secrets.K6_CLOUD_STACK_ID }}
      K6_CLOUD_PROJECT_ID: \${{ inputs.project_id }}
    steps:
      - uses: actions/checkout@v7
      - uses: grafana/setup-k6-action@v1
        with:
          k6-version: "2.3.0"
      - name: Confirm cloud project access
        run: k6 cloud project list --json
      - name: Run in Grafana Cloud k6
        run: k6 cloud run tests/checkout.js
\`\`\`

Notice the separation between stack and project. A stack identifies the Grafana Cloud instance. A project identifies where the k6 test belongs inside that stack. v2 makes the stack mandatory, and the current cloud command docs describe project resolution for \`k6 cloud test list\` in this order: \`--project-id\`, \`K6_CLOUD_PROJECT_ID\`, then the default project configured by \`k6 cloud login\`.

## Move From options.ext.loadimpact To options.cloud

The old \`options.ext.loadimpact\` block is no longer supported. This is one of the easiest script changes to automate, but one of the easiest to miss because many teams placed cloud metadata far away from the scenario definition.

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  cloud: {
    name: 'Checkout API migration smoke',
    projectID: 123456,
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const response = http.get('https://quickpizza.grafana.com/api/json');
  check(response, {
    'status is 200': (res) => res.status === 200,
    'content type is json': (res) => res.headers['Content-Type'].includes('application/json'),
  });
}
\`\`\`

Do not do a blind text replacement if your repository has helper functions that construct the options object. In TypeScript test authoring repos, you may have a factory like \`makeCloudOptions()\` or a base config that merges \`ext\` from several files. The safe pattern is:

1. Search for \`loadimpact\` and \`ext:\`.
2. Move only cloud settings into \`cloud\`.
3. Delete empty \`ext\` objects.
4. Run \`k6 inspect script.js\` or a one-iteration smoke test.
5. Confirm the Grafana Cloud run name and project are still correct.

The current Grafana Cloud options docs show \`options.cloud\` with fields such as \`name\`, \`stackID\`, \`projectID\`, load-zone distribution, static IPs, dropped metrics, and tag controls. Treat that page as the source of truth instead of preserving field names from older Load Impact era examples.

## Summary Output: Stop Parsing The Legacy Text

Two removals affect reporting pipelines: \`--no-summary\` is gone, and \`--summary-mode=legacy\` is gone. The replacement for silence is \`--summary-mode=disabled\`. There is no direct legacy mode replacement.

| Need | v1-era pattern | v2 pattern |
|---|---|---|
| Hide terminal summary | \`--no-summary\` | \`--summary-mode=disabled\` |
| Short human terminal output | Often default or legacy | \`--summary-mode=compact\` |
| More detailed terminal output | \`--summary-mode=legacy\` for old parsers | \`--summary-mode=full\` for humans, structured files for machines |
| Machine-readable summary | Grep terminal output | Use \`handleSummary()\` and emit JSON, text, or JUnit-compatible XML from script code. |

If you currently parse \`stdout\` to extract p95 latency, replace that with explicit summary output. Text parsing is brittle, and v2 is a good moment to stop doing it.

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const response = http.get('https://quickpizza.grafana.com/');
  check(response, {
    'response is successful': (res) => res.status >= 200 && res.status < 300,
  });
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: 'wrote summary.json\\n',
  };
}
\`\`\`

In CI, upload the structured summary as an artifact. That gives your QA team a stable comparison target and gives AI coding agents a file they can inspect without scraping ANSI-formatted logs.

\`\`\`yaml
name: k6-summary-artifact

on:
  pull_request:

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: grafana/setup-k6-action@v1
        with:
          k6-version: "2.3.0"
      - run: k6 run tests/checkout.js
      - uses: actions/upload-artifact@v7
        with:
          name: k6-summary-\${{ github.run_id }}
          path: summary.json
\`\`\`

## Redis, Extensions, And The Go Module Path

Two v2.0 changes converge on extension users. The Go module path changed from \`go.k6.io/k6\` to \`go.k6.io/k6/v2\`, and the \`k6/experimental/redis\` module was removed from the core binary. The migration note for Redis is to import \`k6/x/redis\`. With automatic extension resolution, k6 can provision the extension when it sees that import, but teams with pinned binaries or offline runners may still need to build a custom binary.

\`\`\`javascript
import redis from 'k6/x/redis';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

export default async function () {
  const client = new redis.Client('redis://localhost:6379');

  await client.set('k6:migration:probe', 'ok', 10);
  const value = await client.get('k6:migration:probe');

  check(value, {
    'redis probe returned expected value': (result) => result === 'ok',
  });

  await client.del('k6:migration:probe');
}
\`\`\`

For extension authors, update imports and module metadata before debugging runtime behavior. A minimal import change looks like this:

\`\`\`go
package myextension

import (
	"go.k6.io/k6/v2/js/modules"
)

func init() {
	modules.Register("k6/x/myextension", new(RootModule))
}
\`\`\`

Then run:

\`\`\`bash
go mod edit -require=go.k6.io/k6/v2@v2.3.0
go mod tidy
go test ./...
xk6 build v2.3.0 --with github.com/example/xk6-myextension=.
\`\`\`

The v2.0 release notes also say easyjson was dropped in favor of the Go standard library's \`encoding/json\`. That matters if your extension depended on easyjson-generated methods from k6 internals. Most extensions only need the module path update, but extension repositories deserve their own CI job because they compile against k6 internals more directly than ordinary scripts.

## OpenTelemetry Output Changes For Dashboards

k6 2.0 removed two deprecated OpenTelemetry output options: \`exporterType\` and \`SingleCounterForRate\`. The replacement for exporter selection is \`K6_OTEL_EXPORTER_PROTOCOL\`, with valid values \`grpc\` and \`http/protobuf\`. The \`SingleCounterForRate\` escape hatch is gone, and rate metrics are exported as a single counter with a \`condition\` attribute.

| Old configuration | k6 2.0 replacement | Verification step |
|---|---|---|
| \`K6_OTEL_EXPORTER_TYPE=grpc\` | \`K6_OTEL_EXPORTER_PROTOCOL=grpc\` | Check collector receives metrics on the gRPC endpoint, commonly port 4317. |
| \`K6_OTEL_EXPORTER_TYPE=http\` | \`K6_OTEL_EXPORTER_PROTOCOL=http/protobuf\` | Check collector receives metrics on the HTTP endpoint, commonly port 4318 with path \`/v1/metrics\`. |
| \`K6_OTEL_SINGLE_COUNTER_FOR_RATE=true\` | Remove it | Update dashboard queries to use the single counter and the \`condition\` attribute. |

\`\`\`bash
K6_OTEL_EXPORTER_PROTOCOL=grpc k6 run --out opentelemetry tests/checkout.js
K6_OTEL_EXPORTER_PROTOCOL=http/protobuf k6 run --out opentelemetry tests/checkout.js
\`\`\`

The failure mode here is sneaky. The test might still run, thresholds might still pass, and your CI status might be green, but Grafana panels that aggregate old rate metric names or old counter pairs can go blank. Make dashboard validation part of the migration: run one known script, confirm metrics arrive, confirm panels display the same semantic measurements, and then update alert queries.

## HTTP API, Abort Exit Codes, And Browser Metrics

Three v2.0 changes affect operational wrappers more than test scripts.

First, the k6 HTTP API server no longer starts by default. If a wrapper script expects \`http://localhost:6565/v1/status\`, enable the API by passing \`--address\`. This matters for long-running local processes, custom dashboards, and process supervisors.

\`\`\`bash
k6 run --address localhost:6565 --linger tests/long-running.js
curl -s http://localhost:6565/v1/status
\`\`\`

Second, cloud run non-threshold aborts now exit with code \`97\` instead of \`0\`. A threshold failure was already a failure signal, but user aborts, system aborts, and timeout-style aborts should now be treated as distinct failed outcomes by wrappers.

\`\`\`bash
k6 cloud run tests/checkout.js
status="$?"

if [ "$status" = "97" ]; then
  echo "Grafana Cloud k6 run aborted before threshold evaluation completed"
  exit 97
fi

exit "$status"
\`\`\`

Third, the browser web-vitals dependency was updated and the deprecated FID metric was removed. If your browser tests or dashboards still chart First Input Delay from k6 browser data, migrate the conversation to currently emitted metrics. Do not fake FID with another number just to keep an old panel alive. Rename the panel, document the metric change, and keep an annotation for the date of the migration.

## Use v2.3 Features To Make The Migration Easier

Even though the breaking changes are in v2.0, later v2 releases include useful migration tools. The v2.3 \`--scenario\` flag lets you run one named scenario from a large script without editing the file. That is perfect for bisecting failures found during migration.

\`\`\`bash
k6 run --scenario checkout tests/customer-journeys.js
k6 cloud run --scenario checkout tests/customer-journeys.js
\`\`\`

The v2.3 \`--once\` flag is also useful for smoke tests. It runs a script once while preserving the scenario's configured function and browser options. Before \`--once\`, teams often used \`--vus 1 --iterations 1\`, but that could replace script scenarios and lose configuration, especially for browser tests.

\`\`\`bash
k6 run --once tests/browser-checkout.js
k6 cloud run --once tests/protocol-checkout.js
\`\`\`

For feature flags introduced in v2.1 and expanded in v2.2, use discovery rather than guessing names.

\`\`\`bash
k6 features
k6 features --json
K6_FEATURES=native-histograms k6 run tests/checkout.js
\`\`\`

Do not mix feature experiments into the same pull request that does the v2 migration unless the flag is required for your validation. A clean migration PR should answer one question: does the current test suite behave correctly on k6 v2? Experimental metrics behavior can be a second PR.

## A Practical Upgrade Sequence For QA Teams

Use a branch that changes code and CI together. A migration that only patches scripts but leaves the shared runner on \`latest\` is not repeatable. A migration that changes CI but leaves local docs on old commands creates support churn the next time someone tries to reproduce a failure.

| Step | Owner | Done when |
|---|---|---|
| Inventory removed commands, flags, options, imports, and env vars | QA automation lead or agent | Search output is attached to the PR or summarized in a checklist. |
| Patch script-level removals | Test owners | No matches remain for \`externally-controlled\`, \`options.ext.loadimpact\`, or \`k6/experimental/redis\` in executable scripts. |
| Patch CI-level removals | Build owner | No removed commands or flags remain in workflows, Makefiles, Dockerfiles, or shared shell scripts. |
| Upgrade xk6 extensions | Extension owner | Go imports use \`go.k6.io/k6/v2\`, \`go test ./...\` passes, and a v2 binary builds. |
| Validate outputs | Observability owner | Grafana Cloud, OpenTelemetry, summaries, and artifacts still produce data with expected names. |
| Pin and merge | Release owner | CI uses a pinned v2 version, rollback instructions exist, and old docs are updated. |

You can also use ready-made QA skills from qaskills.sh with the qaskills CLI when you want agents to run this sort of repository audit consistently across projects. The important part is to give the agent exact searches and a verification command, not a vague request to "upgrade k6".

## Realistic Failure Mode: The Green Test With A Blank Dashboard

A common migration failure looks like this: the team upgrades Docker from \`grafana/k6:1.7.0\` to \`grafana/k6:2.3.0\`, the k6 job exits successfully, thresholds pass, and the PR merges. On Monday, the performance dashboard is blank for rate panels, and the on-call engineer thinks the test stopped emitting metrics.

The diagnosis usually goes in this order:

1. Confirm \`k6 version\` in CI logs so you know the runner really changed.
2. Confirm \`--out opentelemetry\` still appears in the command.
3. Search for \`K6_OTEL_EXPORTER_TYPE\` and replace it with \`K6_OTEL_EXPORTER_PROTOCOL\`.
4. Search for \`K6_OTEL_SINGLE_COUNTER_FOR_RATE\` and remove it.
5. Inspect collector logs for accepted metrics.
6. Update dashboard queries that assumed the old pair-of-counters representation for rate metrics.
7. Re-run a known script and compare a short time window before and after the dashboard query update.

The bug is not that k6 v2 lost your data. The bug is that the migration changed the metric representation contract, while CI only asserted process status. A meaningful migration test asserts side effects: a summary file exists, cloud run ID is produced, OpenTelemetry receives metrics, and dashboard queries still return series.

## Agent-Friendly Pull Request Prompt

When using Claude Code, Cursor, Copilot, or another coding agent, give it bounded work. The agent should not rewrite performance scenarios just because it found a removed CLI flag. Keep the prompt boring and measurable.

\`\`\`text
Upgrade this repository from k6 v1 to k6 v2.3.0.

Scope:
- Replace removed k6 2.0 commands and flags.
- Move options.ext.loadimpact to options.cloud.
- Replace k6/experimental/redis imports with k6/x/redis.
- Update xk6 Go imports from go.k6.io/k6 to go.k6.io/k6/v2.
- Replace removed OpenTelemetry env vars.
- Keep existing thresholds and load profiles unless they use externally-controlled.

Validation:
- Run the repository's k6 smoke command.
- Run the CI lint command if present.
- Show any remaining matches for removed k6 2.0 symbols.
\`\`\`

Review the diff with special attention to load shape. If an agent replaces \`externally-controlled\` with \`constant-vus\`, it made a necessary choice, but not always the correct performance-model choice. A deleted external-control executor is not enough information to infer the intended ramp, target arrival rate, or soak duration. That decision needs test-owner review.

## Frequently Asked Questions

### Is k6 2.0 a product rename or a discontinued tool?

No. The official releases and documentation show Grafana k6 as actively maintained, with \`v2.3.0\` marked latest on September 21, 2026. k6 2.0 is a major cleanup release that removes deprecated commands, flags, options, and APIs. The Docker image remains \`grafana/k6\`, the cloud command group remains \`k6 cloud\`, and Grafana continues to publish release notes, install docs, and cloud command docs.

### Should I upgrade straight to k6 2.3.0 instead of k6 2.0.0?

For most teams, yes. The breaking changes you must fix are the k6 2.0 removals, but v2.1, v2.2, and v2.3 add migration-friendly features and fixes without listing new breaking changes. Pinning \`2.3.0\` gives you \`--scenario\`, \`--once\`, cloud test and load-zone listing, and better operational diagnostics. Still read the v2.0 migration page first because that is where the compatibility work lives.

### What is the riskiest k6 2.0 breaking change for CI?

Cloud and reporting changes are usually riskiest because they can fail outside the test script. Watch for \`k6 cloud script.js\`, \`--upload-only\`, missing \`K6_CLOUD_STACK_ID\`, removed summary modes, and removed OpenTelemetry environment variables. A script can pass locally while the cloud run, artifact upload, or dashboard query silently changes behavior. Validate the side effects your release process depends on.

### Do all xk6 extensions need code changes for k6 2.0?

Extensions that import k6 Go packages need the module path update from \`go.k6.io/k6\` to \`go.k6.io/k6/v2\`. Many extensions only need that mechanical change plus \`go mod tidy\`, but do not assume that for private extensions. Rebuild against the target k6 version, run extension tests, and check for any dependency on k6 internals such as old generated JSON helpers.
`,
};
