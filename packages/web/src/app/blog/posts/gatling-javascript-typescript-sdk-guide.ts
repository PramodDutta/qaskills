import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gatling JavaScript SDK and TypeScript Load Testing Guide',
  description: 'Master the gatling javascript sdk with TypeScript simulations, injection profiles, assertions, CI runs, recorder use, and Enterprise deployment.',
  date: '2026-09-24',
  category: 'Performance',
  content: `
# Gatling JavaScript SDK and TypeScript Load Testing Guide

The Gatling JavaScript SDK lets QA and test-automation engineers write Gatling load tests in JavaScript or TypeScript while still using the Gatling engine, reports, workload models, and Enterprise path. The verified docs show the core npm packages as \`@gatling.io/core\`, \`@gatling.io/http\`, and \`@gatling.io/cli\`. The canonical entry point is a default export using \`simulation((setUp) => { ... })\`, with scenarios built from \`scenario(...).exec(...)\`, HTTP requests from \`http(...)\`, injection profiles such as \`constantUsersPerSec(...).during(...)\`, and assertions through \`global().responseTime().max().lt(...)\` style chains.

As of September 24, 2026, Gatling's "create your first JavaScript-based simulation" tutorial says it is intended for JavaScript SDK version 3.15.105 and later, while the npm search result available during research showed \`@gatling.io/cli\` 3.15.104 published shortly before. That mismatch is exactly why this guide emphasizes official docs for API shape and package update procedure instead of freezing every sample to one patch number. Gatling's docs also say to update \`version\`, \`@gatling.io/core\`, \`@gatling.io/http\`, and \`@gatling.io/cli\` together.

Choose the Gatling JavaScript SDK when your team wants load tests to live beside a Node or TypeScript test stack, but wants Gatling's workload modeling and reporting instead of a general-purpose unit-test runner. If you are deciding across tools, keep [Gatling vs k6 load testing 2026](/blog/gatling-vs-k6-load-testing-2026) handy. If you need broader Gatling concepts before going deep on JS and TS, pair this with [Gatling load testing guide](/blog/gatling-load-testing-guide).

## SDK Anatomy in One Simulation

A Gatling JS or TS project is an npm project with simulations under \`src\` by default. The CLI looks for files named \`*.gatling.js\` or \`*.gatling.ts\` at the root of that folder unless you override the sources folder. Local reports go under \`target/gatling\` by default, and the CLI creates a bundle at \`target/bundle.js\`. Packaging for Enterprise produces \`target/package.zip\` unless overridden.

The smallest useful TypeScript simulation has four layers: imports, protocol, scenario, and setup. The protocol holds shared HTTP configuration. The scenario encodes virtual-user behavior. The setup binds one or more scenarios to an injection model and optional assertions.

\`\`\`typescript
import {
  constantUsersPerSec,
  global,
  scenario,
  simulation,
} from '@gatling.io/core';
import { http, status } from '@gatling.io/http';

export default simulation((setUp) => {
  const httpProtocol = http
    .baseUrl('https://api.example.test')
    .acceptHeader('application/json')
    .userAgentHeader('qa-performance-suite/1.0');

  const scn = scenario('Catalog browse')
    .exec(
      http('Open catalog')
        .get('/catalog')
        .check(status().is(200)),
    )
    .exec(
      http('Open product detail')
        .get('/catalog/products/sku-001')
        .check(status().is(200)),
    );

  setUp(
    scn.injectOpen(constantUsersPerSec(5).during(120)),
  )
    .protocols(httpProtocol)
    .assertions(
      global().successfulRequests().percent().gt(99.0),
      global().responseTime().percentile(95.0).lt(800),
    );
});
\`\`\`

That snippet deliberately resembles production code rather than a demo. Request names are report labels. The base URL is centralized. The injection profile is explicit. Assertions fail the run after execution when the condition is not met, which is essential for CI gates.

| SDK piece | Typical import | What it represents |
|---|---|---|
| \`simulation\` | \`@gatling.io/core\` | Default-exported simulation definition Gatling can run. |
| \`scenario\` | \`@gatling.io/core\` | Virtual user journey made from actions, pauses, branches, and groups. |
| \`http\` | \`@gatling.io/http\` | HTTP protocol config and request builder DSL. |
| Injection builders | \`@gatling.io/core\` | Open or closed workload shape. |
| Assertions | \`@gatling.io/core\` | End-of-run pass or fail criteria for reports and CI. |
| CLI | \`@gatling.io/cli\` | \`npx gatling\` command for local runs, recorder, packaging, and Enterprise actions. |

The main conceptual difference from Playwright, Jest, or Vitest is that Gatling is not executing one test body per test case. A simulation describes many virtual users over time. That means shared mutable JavaScript state is dangerous, request names matter, and assertions are aggregate performance criteria rather than per-example expectations.

## Project Setup That Does Not Fight the CLI

The official JavaScript tooling docs say the \`@gatling.io/cli\` package provides the \`gatling\` command, executable with \`npx gatling\`. They also document the default folders: \`src\` for simulations, \`resources\` for feeder files, \`target/gatling\` for reports, \`target/bundle.js\` for the local or package bundle, and \`target/package.zip\` for Enterprise package output.

A TypeScript project can be minimal:

\`\`\`json
{
  "name": "perf-gatling-js",
  "version": "3.15.105",
  "private": true,
  "type": "module",
  "scripts": {
    "perf:smoke": "gatling run --typescript --simulation catalog",
    "perf:package": "gatling enterprise-package",
    "perf:recorder": "gatling recorder"
  },
  "devDependencies": {
    "@gatling.io/cli": "3.15.105",
    "@gatling.io/core": "3.15.105",
    "@gatling.io/http": "3.15.105",
    "typescript": "^5.9.2"
  }
}
\`\`\`

If you adopt the tutorial version line, keep all three Gatling packages on the same version. If npm shows a newer official release, upgrade the package version field and the three \`@gatling.io/*\` dependencies together, then run \`npm install\`. Do not mix an old CLI with newer DSL packages unless the release notes explicitly say it is supported.

| File or folder | Default expected by CLI | QA recommendation |
|---|---|---|
| \`src/catalog.gatling.ts\` | Simulation source at root of \`src\` | Keep one journey or workload family per file. |
| \`resources/users.csv\` | Feeder resources | Store synthetic users, product IDs, and scenario data here. |
| \`target/gatling\` | Local HTML reports | Ignore in git, upload in CI when debugging. |
| \`target/bundle.js\` | Generated bundle | Ignore in git. It is build output. |
| \`target/package.zip\` | Enterprise package | Ignore locally, publish as CI artifact only if needed. |

The docs also call out an important dependency limitation: additional npm libraries can be added only if they do not rely on native binaries and do not use Node-specific JavaScript APIs. A Gatling community answer clarified the runtime distinction with a sharp practical consequence: Gatling JS uses graal-js, not graal-node. So importing \`node:fs\` like a normal Node test utility is not a safe assumption. Prefer Gatling feeders, parameters, and HTTP calls over Node-only filesystem or process tricks.

## Running Simulations Locally

The JavaScript CLI docs show \`npx gatling run\` as the local run command. If several matching simulations exist, Gatling prompts you to choose. Use \`--simulation\` to select one directly. The install-local docs show \`--typescript\` when running TypeScript simulations, for example \`npx gatling run --typescript --simulation basicSimulation\`.

\`\`\`bash
# JavaScript simulation in src/catalog.gatling.js
npx gatling run --simulation catalog

# TypeScript simulation in src/catalog.gatling.ts
npx gatling run --typescript --simulation catalog

# Pass simulation parameters that code can read with getParameter.
npx gatling run --typescript --simulation catalog baseUrl=https://staging.example.test users=25

# See available run flags for your installed CLI version.
npx gatling run --help
\`\`\`

One verified CLI detail matters in locked-down CI networks: the \`gatling\` CLI needs internet access to automatically download the Gatling runtime bundle from GitHub releases unless it is already installed. The docs say the default runtime location is \`~/.gatling\` on Linux and macOS or \`%USERPROFILE%\\.gatling\` on Windows, and \`--gatling-home\` can override it.

\`\`\`bash
# Manual runtime install flow when CI cannot download during the job.
# Download the matching runtime bundle through your approved artifact process first.
npx gatling install ./vendor/gatling-js-runtime-3.15.105-linux-x64.zip

# Run using the default installed runtime location.
npx gatling run --typescript --simulation checkout

# Or choose a controlled runtime cache path.
npx gatling run --gatling-home ./.gatling-runtime --typescript --simulation checkout
\`\`\`

What people get wrong: they treat \`npx gatling run\` like a pure Node command. It is an npm-invoked CLI, but it orchestrates a Gatling runtime bundle and JavaScript execution that is not the same as Node. If your helper library assumes Node core modules, subprocesses, or native extensions, it may build in your editor and fail when Gatling runs it.

## Workload Models: Open, Closed, and Useful

Gatling's injection docs distinguish open and closed workload models through \`injectOpen\` and \`injectClosed\`. Open models control arrival rate, such as users per second. Closed models control concurrent users, where new users start as old users finish. QA teams often reach for virtual-user counts first, but arrival rate is usually closer to how public systems receive traffic.

The official open-model building blocks include \`nothingFor\`, \`atOnceUsers\`, \`rampUsers\`, \`constantUsersPerSec\`, \`rampUsersPerSec\`, and \`stressPeakUsers\`. The docs also show \`incrementUsersPerSec\` for stair-step capacity profiles.

| Goal | Better profile | Reason |
|---|---|---|
| Smoke a newly authored simulation | \`atOnceUsers(1)\` or tiny \`constantUsersPerSec\` | Debug behavior before traffic volume. |
| Model public API arrivals | \`constantUsersPerSec(rate).during(duration)\` | Keeps arrival pressure independent of response time. |
| Explore capacity boundary | \`incrementUsersPerSec(...).times(...)\` | Shows where latency or errors bend. |
| Model fixed pool of workers | \`injectClosed\` profiles | Represents concurrency-limited back-office behavior. |
| Shock a cache or queue | \`stressPeakUsers(count).during(duration)\` | Useful for a short spike, not baseline traffic. |

Example capacity staircase:

\`\`\`typescript
import {
  incrementUsersPerSec,
  global,
  scenario,
  simulation,
} from '@gatling.io/core';
import { http, status } from '@gatling.io/http';

export default simulation((setUp) => {
  const httpProtocol = http.baseUrl('https://api.example.test');

  const scn = scenario('Search capacity')
    .exec(
      http('Search')
        .get('/search?q=laptop')
        .check(status().is(200)),
    );

  setUp(
    scn.injectOpen(
      incrementUsersPerSec(2.0)
        .times(5)
        .eachLevelLasting(60)
        .separatedByRampsLasting(30)
        .startingFrom(2.0),
    ),
  )
    .protocols(httpProtocol)
    .assertions(
      global().failedRequests().count().lt(10),
      global().responseTime().percentile(95.0).lt(900),
    );
});
\`\`\`

The profile above uses illustrative values. You should derive real numbers from traffic analytics, production logs, or capacity targets. Never claim "this simulates peak traffic" because it feels large. A test at 20 users per second can be excessive for one internal app and laughably small for a public login service.

## Data, Parameters, and Correlation

Gatling scripts become maintainable when they separate environment, test data, and dynamic data. Environment decides where to run. Feeders decide which stable records or users to exercise. Correlation captures values produced during the scenario.

The CLI docs say you can pass options as \`key=value\` pairs and read them in code using \`getParameter\`. That is the right path for base URLs and simple numeric controls. Use feeders for many users or records. Use checks with \`saveAs\` style extraction when the app generates IDs and tokens, using the current SDK APIs documented for your version.

\`\`\`typescript
import {
  csv,
  feed,
  getParameter,
  jsonPath,
  scenario,
  simulation,
  constantUsersPerSec,
  StringBody,
} from '@gatling.io/core';
import { http, status } from '@gatling.io/http';

export default simulation((setUp) => {
  const baseUrl = getParameter('baseUrl') ?? 'https://api.example.test';
  const userFeeder = csv('users.csv').circular();

  const httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader('application/json');

  const scn = scenario('Create and read invoice')
    .exec(
      feed(userFeeder),
      http('Login')
        .post('/login')
        .body(StringBody('{"username":"#{username}","password":"#{password}"}'))
        .asJson()
        .check(status().is(200))
        .check(jsonPath('$.token').saveAs('token')),
    )
    .exec(
      http('Create invoice')
        .post('/invoices')
        .header('Authorization', 'Bearer #{token}')
        .body(StringBody('{"amount":42,"currency":"USD"}'))
        .asJson()
        .check(status().is(201))
        .check(jsonPath('$.id').saveAs('invoiceId')),
    )
    .exec(
      http('Read invoice')
        .get('/invoices/#{invoiceId}')
        .header('Authorization', 'Bearer #{token}')
        .check(status().is(200)),
    );

  setUp(scn.injectOpen(constantUsersPerSec(3).during(180)))
    .protocols(httpProtocol);
});
\`\`\`

The design principle is stable: do not bake recorded tokens into scripts, do not share one mutable token across all virtual users, and do not hide test data inside helper code an agent cannot inspect.

A simple \`resources/users.csv\`:

\`\`\`csv
username,password
perf-user-001,replace-with-secret-source
perf-user-002,replace-with-secret-source
perf-user-003,replace-with-secret-source
\`\`\`

In practice, you would avoid committing real passwords. Many teams provision performance users with temporary credentials during environment setup, then generate the feeder file in CI from a secret store.

## Assertions That Make CI Mean Something

Gatling assertions are evaluated after the simulation. The docs show assertions built by choosing a scope, statistic, metric, and condition. Scopes include \`global\`, \`forAll\`, and \`details(...)\`. Statistics include response time, all requests, failed requests, successful requests, and requests per second.

For CI, a status-only request check is not enough and a global latency assertion alone is not enough. You need request-level checks to prove the journey behaved correctly, plus aggregate assertions to fail the run when performance crosses the agreed boundary.

\`\`\`typescript
import {
  constantUsersPerSec,
  details,
  global,
  scenario,
  simulation,
} from '@gatling.io/core';
import { http, status, substring } from '@gatling.io/http';

export default simulation((setUp) => {
  const httpProtocol = http.baseUrl('https://api.example.test');

  const scn = scenario('Checkout happy path')
    .exec(
      http('Create cart')
        .post('/cart')
        .check(status().is(201)),
    )
    .exec(
      http('Pay cart')
        .post('/cart/pay')
        .check(status().is(200))
        .check(substring('"state":"settled"').exists()),
    );

  setUp(scn.injectOpen(constantUsersPerSec(2).during(60)))
    .protocols(httpProtocol)
    .assertions(
      global().failedRequests().percent().lt(1.0),
      global().responseTime().percentile(95.0).lt(700),
      details('Pay cart').successfulRequests().percent().gt(99.0),
    );
});
\`\`\`

The request check proves the side effect. The global assertions provide release criteria. The \`details('Pay cart')\` assertion focuses on the critical operation instead of letting fast static requests dilute the signal.

| Weak signal | Better signal | Why it matters |
|---|---|---|
| All responses had status under 500 | Payment response contains settled state and status 200 | A validation error can still be HTTP 200 in some apps. |
| Average response time below target | p95 or p99 below target for named request | Averages hide painful tail latency. |
| Global failed requests below threshold | Critical request success above threshold | Noncritical endpoints can mask checkout failure. |
| Test exited zero once | CI preserves report artifact and run title | Debuggability matters when failures are intermittent. |

The common agent mistake is to add assertions that always pass because they only check that a response object exists. Review generated or agent-edited simulations with the same suspicion you bring to UI test assertions.

## Recorder and Generated Starting Points

The Gatling JS demo README and CLI docs show \`npx gatling recorder\` as the command for launching the recorder. The recorder is useful when request order and headers are unclear, but the output should be treated as a starting point. Recording teaches the script what the browser did. Engineering turns it into a stable workload.

\`\`\`bash
npm run perf:recorder

# Equivalent direct command:
npx gatling recorder
\`\`\`

After generating a simulation, review:

\`\`\`text
- Are all hosts intentional?
- Are cookies, authorization headers, CSRF values, and IDs dynamic?
- Are request names readable in reports?
- Is user data synthetic?
- Does the scenario represent one workload, not an entire regression suite?
- Can the simulation run in a clean CI checkout?
\`\`\`

For QA engineers using AI coding agents, this is a strong handoff point. Ask the agent to convert recorder output into a smaller scenario, extract parameters, and add assertions. Do not ask it to guess which third-party hosts are safe to load test. That decision belongs to the test owner.

## GitHub Actions and Report Handling

Gatling can run in any CI that supports Node, npm, and whatever network access your target environment requires. The first CI goal is modest: install dependencies, run one named simulation, upload the report folder when the job fails or when a human triggers a run.

\`\`\`yaml
name: gatling-performance

on:
  workflow_dispatch:
    inputs:
      base_url:
        description: 'Target base URL'
        required: true
        default: 'https://staging.example.test'

jobs:
  checkout-simulation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - name: Run Gatling checkout simulation
        run: npx gatling run --typescript --simulation checkout baseUrl=\${{ inputs.base_url }}
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: gatling-checkout-report
          path: target/gatling
\`\`\`

Artifact names cannot contain \`/\`, so keep names flat. Gatling uses \`--simulation\` to select the simulation in this CLI path. If your team wraps Gatling in npm scripts, document the exact pass-through behavior so agents do not borrow filtering flags from other test runners.

For scheduled runs, avoid using production by accident:

\`\`\`yaml
name: nightly-gatling

on:
  schedule:
    - cron: '30 2 * * 1-5'

jobs:
  catalog:
    runs-on: ubuntu-latest
    environment: performance-staging
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - name: Run catalog profile
        run: npx gatling run --typescript --simulation catalog baseUrl=\${PERF_BASE_URL}
        env:
          PERF_BASE_URL: \${{ vars.PERF_BASE_URL }}
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: gatling-catalog-nightly
          path: target/gatling
\`\`\`

Notice the shell variable style: \`\${PERF_BASE_URL}\` is unambiguous in shell, while GitHub expressions remain in workflow syntax.

## Enterprise Packaging and Deployment

The JavaScript tooling docs describe three Enterprise-oriented commands: \`enterprise-package\`, \`enterprise-deploy\`, and \`enterprise-start\`. Packaging creates a zip containing matching simulations and resources. Deploy can create or update packages and simulations according to configuration. Start can deploy and start or start an existing deployed simulation. The docs say Enterprise API access can use \`GATLING_ENTERPRISE_API_TOKEN\` or \`--api-token\`, and most actions require a token with the Configure role on expected teams.

\`\`\`bash
# Package simulations for upload.
npx gatling enterprise-package

# Use a custom package filename.
npx gatling enterprise-package --package-file "target/checkout-package.zip"

# Deploy from configuration as code.
GATLING_ENTERPRISE_API_TOKEN=\${GATLING_ENTERPRISE_API_TOKEN} \\
npx gatling enterprise-deploy

# Deploy and start, then wait for assertions to decide the exit code.
GATLING_ENTERPRISE_API_TOKEN=\${GATLING_ENTERPRISE_API_TOKEN} \\
npx gatling enterprise-start \\
  --enterprise-simulation="Checkout API" \\
  --wait-for-run-end \\
  --run-title "checkout-\${GITHUB_SHA}"
\`\`\`

Use Enterprise when local or CI-hosted injection cannot represent your target geography, traffic volume, governance, or reporting needs. Use local runs for authoring and smoke checks. Do not spend cloud load-test budget on scripts that have not passed one-user validation locally.

| Capability | Local CLI run | Enterprise run |
|---|---|---|
| Authoring feedback | Fastest | Slower feedback loop |
| Scale | Limited by runner machine and network | Managed load infrastructure |
| Reports | Local HTML under \`target/gatling\` | Central run history and dashboards |
| Governance | Repo and CI permissions | Teams, tokens, packages, simulations |
| Best use | Script correctness and small gates | Release validation and shared reporting |

## Failure Mode: Works in Node, Fails in Gatling

A realistic failure: a TypeScript helper imports \`node:fs\` to read an OAuth token that a shell script wrote to disk. \`npm run build\` passes, but \`npx gatling run --typescript --simulation checkout\` fails with a module resolution or unsupported API error. The root cause is not TypeScript. It is runtime mismatch. Gatling JS is a JavaScript SDK running on the Gatling engine through its JS runtime path, not a generic Node process.

Diagnosis:

\`\`\`bash
# Search for Node-only imports and process assumptions.
rg --line-number "node:|from 'fs'|from \\"fs\\"|child_process|process\\.cwd|Buffer" src resources

# Confirm the simulation itself is selected correctly.
npx gatling run --typescript --simulation checkout

# Ask the CLI for installed-version flags and paths.
npx gatling run --help
\`\`\`

Fix strategy:

\`\`\`text
1. Replace filesystem token handoff with an HTTP login request inside the scenario.
2. If the data is static, move it to a feeder in resources.
3. If the value is an environment choice, pass it as a Gatling parameter.
4. Keep Node scripts outside the simulation runtime, for setup or CI preparation only.
5. Re-run with one user before restoring the full injection profile.
\`\`\`

The deeper lesson is that sharing TypeScript syntax does not mean sharing every Node runtime habit. Use TypeScript for maintainability, types, and editor help. Use Gatling primitives for load-test behavior.

## What AI Coding Agents Should Be Asked to Do

AI agents are good at repetitive Gatling cleanup when the task is precise. They are risky when asked to invent workloads or thresholds. A strong prompt gives the simulation intent, target files, allowed environment variables, and command to run.

\`\`\`text
Refactor src/checkout.gatling.ts for maintainability.

Constraints:
- Keep the same business journey: login -> create cart -> add item -> pay cart.
- Use getParameter('baseUrl') with a staging default.
- Move static users to resources/users.csv with a circular feeder.
- Add assertions for failed request percent, checkout p95, and Pay cart success.
- Do not import Node core modules.
- Do not change the injection rate.
- Verify with: npx gatling run --typescript --simulation checkout baseUrl=https://staging.example.test
\`\`\`

Review the diff for these agent errors:

\`\`\`text
- It changed arrival rate while "refactoring".
- It removed request names, damaging report readability.
- It weakened checks to status-only assertions.
- It introduced Node-only imports.
- It put secrets into committed feeder files.
- It changed --simulation selection to a test-runner flag from another ecosystem.
\`\`\`

The best division of labor is simple. Humans choose the workload and risk model. Gatling executes it. Agents help keep the TypeScript clean and CI-friendly.

## Frequently Asked Questions

### Is the Gatling JavaScript SDK only for JavaScript projects?

No. It is most convenient for teams that already use Node, npm, JavaScript, or TypeScript, but the system under test can be any HTTP service. The current JavaScript SDK path is especially useful when QA engineers want readable simulations in a familiar language while still using Gatling injection models, checks, assertions, local reports, and Enterprise deployment.

### Should I write Gatling simulations in JavaScript or TypeScript?

Use TypeScript when the simulation will live long enough to be reviewed, refactored, and extended. Types help agents and humans navigate larger helper modules, feeders, and configuration. Use JavaScript for quick experiments or teams without TypeScript tooling. The CLI supports TypeScript runs with \`--typescript\`, and the docs show TypeScript simulation files using the \`.gatling.ts\` extension.

### Can I use normal npm packages inside a Gatling simulation?

Sometimes. Gatling's tooling docs say additional npm libraries are allowed when they do not rely on native binaries and do not use Node-specific JavaScript APIs. Treat the simulation runtime as Gatling-first, not Node-first. Prefer Gatling feeders, parameters, checks, and HTTP calls. Keep Node-only setup scripts outside the simulation and run them before \`npx gatling run\`.

### How do I make Gatling fail a CI job correctly?

Put meaningful assertions in the simulation and run a named simulation from CI. Gatling assertions fail the simulation when conditions are not met, which gives CI a useful exit code. Upload \`target/gatling\` as an artifact for debugging. For Enterprise, \`enterprise-start --wait-for-run-end\` can wait for completion and return an error when assertions fail.
`,
};
