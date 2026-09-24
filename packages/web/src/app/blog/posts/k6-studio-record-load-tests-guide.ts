import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Grafana k6 Studio: Record and Build Load Tests That Survive Reality',
  description: 'Learn k6 studio workflows for recording, correlating, validating, exporting, and CI-running realistic k6 load tests without brittle scripts.',
  date: '2026-09-24',
  category: 'Performance',
  content: `
# Grafana k6 Studio: Record and Build Load Tests That Survive Reality

Grafana k6 Studio is the practical answer when your team wants a k6 load test but the journey is too stateful, too large, or too annoying to hand-code from a blank file. It is a desktop application for Windows, macOS, and Linux that records a browser flow, saves protocol traffic as a HAR, captures browser events, then lets you generate, validate, debug, and export a k6 script. As of the verified GitHub release page on September 24, 2026, the latest k6 Studio release is v2.1.0, and Grafana's stability page says k6 Studio follows a rolling release model where only the latest version is actively supported.

The important point for QA engineers is this: k6 Studio is not a magic recorder that makes performance engineering disappear. It gives you a controlled starting point, then lets you apply generator rules for verification, correlation, parameterization, and custom code so the exported script behaves like a reusable test instead of a replay of yesterday's cookies. That makes it a good fit for AI coding agents too. You can record the hard-to-observe user journey visually, export the script, then ask Claude Code, Cursor, or Copilot to refactor it into project style, add CI wiring, and tighten assertions.

Use k6 Studio when the most expensive part of authoring the test is discovering request order, headers, tokens, and realistic payloads. Use plain k6 when the API contract is simple enough to write directly. If you already know the k6 JavaScript API and need a broader testing strategy, pair this workflow with [k6 load testing guide 2026](/blog/k6-load-testing-guide-2026). If your main comparison point is browser extension capture, read this after [k6 browser recorder test builder guide](/blog/k6-browser-recorder-test-builder-guide), because the desktop app has a different editing and validation loop.

## What k6 Studio Actually Produces

k6 Studio starts with a recording, not a finished benchmark. During recording, it opens Chrome, routes traffic through its local proxy, captures requests and responses, and stores the result as a HAR plus browser events. From there you can create an HTTP test from protocol-level requests or a browser test from captured interactions. This article focuses on the HTTP load-test path, because that is where most CI performance gates live.

The generated k6 script normally follows the shape you would expect from k6: imports, an exported \`options\` object, a default function, grouped requests, checks, and sleeps. The exact file depends on the recorded flow and the generator rules you apply, but the exported script is regular JavaScript that can run with the k6 CLI.

| Recording artifact | What it contains | How QA should treat it |
|---|---|---|
| HAR traffic | URLs, methods, headers, cookies, request bodies, response bodies, timings | Raw evidence. Keep it private when it contains tokens or customer data. |
| Groups | Named sections created while recording | Step boundaries for script readability and timing analysis. |
| Generator rules | Verification, correlation, parameterization, custom code | The editable transformation layer that turns replay into reusable test logic. |
| Exported script | A k6 JavaScript file | The version-controlled asset that belongs in review and CI. |
| Validation output | One-iteration debug run with requests, responses, checks, logs | The first proof that dynamic data and assertions are wired correctly. |

Here is a representative exported script shape for a login and order-history journey. The endpoints are intentionally generic, but the structure is realistic:

\`\`\`javascript
import { check, group, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    browse_orders: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://shop.example.test';

export default function () {
  let csrf = '';
  let sessionCookie = '';

  group('Open login page', () => {
    const res = http.get(\`\${BASE_URL}/login\`);
    check(res, {
      'login page loaded': (r) => r.status === 200,
      'csrf token exists': (r) => /name="csrf" value="[^"]+"/.test(r.body),
    });
    csrf = res.html().find('input[name=csrf]').attr('value');
  });

  group('Submit login', () => {
    const res = http.post(
      \`\${BASE_URL}/login\`,
      { username: __ENV.PERF_USER, password: __ENV.PERF_PASSWORD, csrf },
      { redirects: 0 },
    );
    check(res, {
      'login redirects': (r) => r.status === 302,
      'session cookie set': (r) => Boolean(r.cookies.session?.[0]?.value),
    });
    sessionCookie = res.cookies.session[0].value;
  });

  group('Open order history', () => {
    const res = http.get(\`\${BASE_URL}/account/orders\`, {
      cookies: { session: sessionCookie },
    });
    check(res, {
      'orders page works': (r) => r.status === 200,
      'orders table visible': (r) => r.body.includes('Recent orders'),
    });
  });

  sleep(1);
}
\`\`\`

That script is not meant to be copy-pasted into your app as-is. It is a mental model for reading k6 Studio output. The groups mirror recorded steps. Verification checks prevent false green runs. Correlation handles values generated by the server. Environment variables keep secrets and base URLs out of source control. Thresholds turn the script from a traffic generator into a release signal.

## Install and Version Choices

Grafana's install docs state that k6 Studio installs on macOS, Windows, and Linux. The docs also list Google Chrome as a prerequisite, with Chromium as an option for ARM64 Linux users. The GitHub release assets follow platform-specific naming: macOS DMG files for Apple silicon and Intel, a Windows setup executable, and Linux packages for Debian-based and Red Hat-based distributions.

| Platform | Install path to verify | Update behavior to plan for |
|---|---|---|
| macOS Apple silicon | Download \`k6.Studio-{VERSION}-arm64.dmg\` from GitHub releases | Auto-updates after install when the app is in Applications. |
| macOS Intel | Download \`k6.Studio-{VERSION}-x64.dmg\` | Same auto-update behavior as Apple silicon macOS. |
| Windows | Download \`k6.Studio-{VERSION}.Setup.exe\` | Auto-updates according to Grafana's install docs. |
| Debian or Ubuntu Linux | Download \`k6-studio_{VERSION}_amd64.deb\` and install with \`dpkg\` | Manual update by installing a newer release. |
| Red Hat family Linux | Download \`k6-studio-{VERSION}-1.x86_64.rpm\` | Manual update by installing a newer release. |

For a QA team, the versioning policy matters more than the installer. k6 Studio's docs say the app follows a rolling release model and only the latest version is actively supported. That is normal for a desktop authoring tool, but it changes governance. You should pin the exported k6 script in your repo, not the behavior of the desktop app. Review generated code like any other test code, and expect the generator UI to evolve every few weeks.

The app is open source at https://github.com/grafana/k6-studio. Grafana's k6 docs describe it as an open-source desktop application designed to record browser interactions and generate k6 test scripts. The release page showed v2.1.0 as the latest release during research for this article.

\`\`\`bash
# macOS and Windows are installed from the GitHub release asset.
# Linux Debian-family example, using the package you downloaded:
sudo dpkg -i k6-studio_2.1.0_amd64.deb

# Confirm the runtime you will use for exported scripts:
k6 version

# Keep generated scripts in your repository, not only in the Studio workspace:
mkdir -p performance/k6
\`\`\`

What people get wrong: they treat a recorder version as a test dependency. The actual dependency for CI is k6 itself and the committed script. k6 Studio is an authoring and debugging surface. Once the script is exported, your review process should check JavaScript quality, environment variable handling, thresholds, and data safety.

## Record a Flow Without Capturing Noise

The fastest way to produce a bad load test is to record your normal browser session with every tab, analytics beacon, extension request, and third-party pixel in the stream. A good k6 Studio recording is boring on purpose. Use a clean Chrome profile, start from a known URL, create groups as you move through the journey, and stop the recording as soon as the business action is complete.

Grafana's record guide shows a workflow where you click \`Record flow\`, provide a starting URL, start recording, create named groups, interact with the app, then stop recording. After stopping, k6 Studio saves the recording as a HAR file plus browser events. You can inspect request headers, payloads, cookies, response headers, and response content inside the app.

| Recording decision | Prefer | Avoid | Reason |
|---|---|---|---|
| Browser state | Fresh profile or known authenticated setup | Personal browser with extensions | Extensions add noisy requests and unpredictable headers. |
| User path | One valuable journey, such as search to checkout | Entire smoke suite in one recording | Load tests need clear timing and failure attribution. |
| Grouping | Business steps, not page implementation details | Default group for everything | Groups become readable timing sections in k6 output. |
| Test data | Dedicated performance users and records | Real customer accounts | Recordings can expose private data and unstable state. |
| Third-party hosts | Include only hosts you own or intentionally test | CDNs, analytics, support widgets by default | External services distort results and may violate terms. |

A recording checklist that works well with AI coding agents:

\`\`\`text
1. Start from a clean browser state.
2. Record only one journey: login -> search -> view result -> perform action.
3. Create a new group before each business step.
4. Use seed data built for performance tests.
5. Stop immediately after the outcome is visible.
6. Inspect captured hosts and remove anything not owned by the system under test.
7. Validate once before exporting.
8. Commit only the exported script and sanitized support files.
\`\`\`

The anti-pattern is to ask an agent to repair a chaotic HAR. It can refactor JavaScript, but it cannot infer whether a random analytics POST is required for your checkout endpoint to work. Give it a clean capture and it can help extract utilities, add thresholds, split scenarios, and make environment handling consistent.

## Use Generator Rules as Your Editing Layer

The k6 Studio Generator takes a recording and lets you create a script visually. Official docs list four rule types: verification, correlation, parameterization, and custom code. The verification rule is created by default and adds checks that compare runtime status codes with the recorded status codes. Correlation extracts a dynamic value from one response and reuses it in later requests. Parameterization replaces a recorded literal with text or data. Custom code inserts JavaScript snippets.

This is the heart of the workflow. You should do as much dynamic-data repair as possible with generator rules before exporting. The visual labels that show where a rule extracts or matches a value are useful for QA review, especially when the dynamic value appears in both headers and JSON bodies.

| Rule type | Use it for | Example QA review question |
|---|---|---|
| Verification | Preserve baseline response expectations | Does the generated check prove the step worked, or only that it returned any response? |
| Correlation | CSRF tokens, IDs, nonces, anti-forgery cookies, generated resource IDs | Is the extractor anchored to the right response and property? |
| Parameterization | Usernames, product IDs, search terms, tenant names | Can CI change this without editing the script? |
| Custom code | Logging, helper values, lightweight setup logic | Is the snippet deterministic under concurrent virtual users? |

Grafana's tutorial uses CSRF and a generated pizza ID as examples of values that fail replay until they are correlated. That maps directly to production apps. The token you saw during recording is already stale by the time CI runs. The ID created by a random recommendation endpoint is not known until runtime.

Here is a hand-written equivalent of the kind of correlation you want the exported script to express:

\`\`\`javascript
import { check } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'https://app.example.test';

export default function () {
  const form = http.get(\`\${BASE_URL}/settings/profile\`);
  const csrf = form.html().find('input[name=csrf]').attr('value');

  check(form, {
    'profile form loaded': (r) => r.status === 200,
    'csrf extracted': () => typeof csrf === 'string' && csrf.length > 20,
  });

  const update = http.post(\`\${BASE_URL}/settings/profile\`, {
    csrf,
    displayName: \`perf-user-\${__VU}\`,
  });

  check(update, {
    'profile update accepted': (r) => r.status === 200,
    'profile update persisted': (r) => r.body.includes('Saved'),
  });
}
\`\`\`

Notice the second check. A status-only assertion would be too weak if the app returns a friendly validation page with HTTP 200. A performance test that repeatedly posts invalid forms is worse than no test because it produces load numbers for a behavior users never execute.

## Validate Before Export, Then Validate Again in CLI

k6 Studio's Generator includes a Validate action that opens the Debugger and runs one iteration. The docs say the Debugger lets you inspect request and response details, logs, checks, and the generated script tab. That is a recorder-specific safety net: you can verify that your rule labels are correct and that correlated values flow through subsequent requests.

Validation is not the same as a load test. It answers "can one virtual user complete the journey once?" That still matters. A broken one-user journey becomes meaningless at 100 users. After export, run the script locally with the k6 CLI, then in CI with environment-specific thresholds.

\`\`\`bash
BASE_URL=https://staging.example.test \\
PERF_USER=perf-user-001 \\
PERF_PASSWORD='replace-me-in-ci' \\
k6 run performance/k6/account-orders.js
\`\`\`

For local debugging, keep the load tiny and turn on HTTP debug only when you need it. Do not paste token-filled debug logs into issue comments or agent prompts.

\`\`\`bash
BASE_URL=https://staging.example.test \\
k6 run --vus 1 --iterations 1 --http-debug=full performance/k6/account-orders.js
\`\`\`

A useful exported-script review is to scan for recorded literals. In many systems, a script should not contain a live session cookie, a CSRF value, a concrete order ID, or a production hostname.

\`\`\`bash
rg --line-number "session|csrf|token|Bearer|prod|customer" performance/k6
\`\`\`

That command is intentionally blunt. It catches both real risks and harmless names, but it gives reviewers a fast first pass.

## Exported Script Hardening for CI

The script that leaves k6 Studio should not go straight into a release gate. Treat it as generated code that needs a QA engineer's pass. Your goal is to make it configurable, deterministic, and meaningful under concurrent execution.

Start by replacing fixed hostnames with \`__ENV.BASE_URL\`, moving credentials into CI secrets, adding thresholds, and ensuring every business action has a check that proves the side effect or visible state. Then add a CI workflow that runs the test on demand, on a schedule, or against release candidates.

\`\`\`yaml
name: performance-k6

on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * 1-5'

jobs:
  account-orders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Install k6
        run: |
          sudo gpg -k
          curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install -y k6
      - name: Run account order journey
        env:
          BASE_URL: \${{ secrets.PERF_BASE_URL }}
          PERF_USER: \${{ secrets.PERF_USER }}
          PERF_PASSWORD: \${{ secrets.PERF_PASSWORD }}
        run: k6 run --summary-export summary.json performance/k6/account-orders.js
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: k6-account-orders-results
          path: summary.json
\`\`\`

That workflow uses current GitHub Actions majors and an artifact name without a slash. If you export a k6 JSON summary, write it explicitly from the script or command. For example:

\`\`\`bash
k6 run --summary-export summary.json performance/k6/account-orders.js
\`\`\`

Use thresholds that reflect the test's intent. A smoke-style load test might gate on failed requests and checks only. A release candidate capacity test might include p95 latency and request rate. A nightly endurance test might be more interested in error trends and resource saturation than a single strict latency number.

| Test intent | Scenario scale | Threshold emphasis | CI behavior |
|---|---|---|---|
| Authoring smoke | 1 virtual user, 1 iteration | Checks pass, no unexpected status | Run locally after export. |
| Pull request guard | Small steady load | Failure rate and critical journey checks | Optional or label-triggered to control cost. |
| Release candidate | Expected baseline traffic | p95 latency, error rate, side-effect checks | Required before deploy. |
| Nightly regression | Longer duration with realistic data | Trends, saturation, slow endpoint discovery | Scheduled, artifact-heavy, triaged next morning. |

If you install ready-made QA skills from qaskills.sh with the qaskills CLI, use them as scaffolding for repeatable agent prompts: one skill can review exported k6 code, another can wire the GitHub Action, and another can inspect failure logs. Keep the performance logic in the repo, not in the prompt.

## Diagnosing a Realistic Failure Mode

Imagine the Studio validation succeeds once, but the CI run fails after the first few virtual users. The error rate climbs, and your checks show that "order history loaded" fails even though login checks pass. The recorded script includes a hard-coded \`orderId=98324\` in the URL because you clicked a specific order during recording.

Diagnosis flow:

\`\`\`bash
# Run the script once and save all request names and statuses.
BASE_URL=https://staging.example.test \\
k6 run --vus 1 --iterations 1 --summary-export one-user.json performance/k6/order-detail.js

# Search the exported script for numeric IDs that look like recorded data.
rg --line-number "/orders/[0-9]+|orderId=[0-9]+" performance/k6/order-detail.js

# Re-run with one virtual user but multiple iterations to expose state coupling.
BASE_URL=https://staging.example.test \\
k6 run --vus 1 --iterations 5 performance/k6/order-detail.js
\`\`\`

The fix is not to add sleep. The fix is to correlate or parameterize the order ID. If the journey creates an order, extract the created ID from the creation response and open that ID. If the journey only reads existing data, use a feeder with stable test accounts and known records.

\`\`\`javascript
import { SharedArray } from 'k6/data';
import { check } from 'k6';
import http from 'k6/http';

const users = new SharedArray('performance users', () => JSON.parse(open('./users.json')));
const BASE_URL = __ENV.BASE_URL || 'https://shop.example.test';

export default function () {
  const user = users[(__VU - 1) % users.length];

  const login = http.post(\`\${BASE_URL}/api/login\`, {
    username: user.username,
    password: user.password,
  });

  check(login, {
    'login succeeded': (r) => r.status === 200,
    'auth token returned': (r) => Boolean(r.json('token')),
  });

  const token = login.json('token');
  const orders = http.get(\`\${BASE_URL}/api/orders\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  });

  const firstOrderId = orders.json('items.0.id');
  check(orders, {
    'orders returned': (r) => r.status === 200,
    'at least one order exists': () => Boolean(firstOrderId),
  });

  const detail = http.get(\`\${BASE_URL}/api/orders/\${firstOrderId}\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  });

  check(detail, {
    'order detail returned': (r) => r.status === 200,
    'same order rendered': (r) => r.body.includes(String(firstOrderId)),
  });
}
\`\`\`

This is the core mental shift: a recorder discovers the path, but a maintainable load test owns its data model.

## What AI Coding Agents Should Edit After Export

AI coding agents are helpful after k6 Studio has done the discovery work. Give the agent the exported script, a short description of the intended journey, the list of environment variables allowed in CI, and the failure budget. Ask it to make scoped changes, then run the k6 smoke command.

Good agent tasks:

\`\`\`text
Refactor this exported k6 script without changing behavior:
- Move BASE_URL, username, and password to environment variables.
- Replace recorded IDs with a JSON feeder from ./orders.json.
- Add thresholds for http_req_failed, checks, and p95 latency.
- Keep the request names and group names readable in k6 reports.
- Do not add dependencies.
- Run: k6 run --vus 1 --iterations 1 performance/k6/order-detail.js
\`\`\`

Bad agent tasks are vague: "make this production ready" or "optimize the load test." Those requests invite the agent to invent test data, delete important headers, or weaken assertions. The best workflow is human-recorded, tool-validated, agent-refactored, human-reviewed.

When reviewing agent edits, watch for vacuous checks. These pass while the app is broken:

\`\`\`javascript
check(res, {
  'status is okay-ish': (r) => r.status >= 200,
  'body has something': (r) => r.body.length > 0,
});
\`\`\`

Prefer checks that prove the business outcome:

\`\`\`javascript
check(res, {
  'payment is settled': (r) => /^(paid|settled)$/.test(String(r.json('state'))),
  'receipt id exists': (r) => typeof r.json('receiptId') === 'string',
});
\`\`\`

The anchored regex matters. Without anchors, \`unpaid-but-settled-later\` can accidentally match a loose \`/paid|settled/\` pattern. Performance scripts deserve the same assertion hygiene as functional tests.

## Decision Guide: k6 Studio, HAR Converter, or Hand-Written k6

k6 Studio is not the only way to create k6 scripts from browser activity. k6 also has flows around recordings and HAR conversion. The desktop app stands out when you want a visual editing surface, request inspection, generator rules, and one-iteration validation before export.

| Situation | Best starting point | Why |
|---|---|---|
| You need to capture a stateful browser journey and inspect requests | k6 Studio | Recording, grouping, generator rules, and debugger live together. |
| You already have a clean HAR from another approved source | k6 Studio generator or k6 HAR tooling | The HAR is useful, but you still need correlation and checks. |
| You are testing a small REST API with documented endpoints | Hand-written k6 | Faster, clearer, less generated cleanup. |
| You need browser-level rendering under load | k6 browser script | Protocol traffic alone will not measure front-end behavior. |
| You need a team member to learn by seeing traffic | k6 Studio | Request and response inspection makes hidden app behavior visible. |

The decision should depend on authoring cost, not personal preference. If hand-written code is clearer, write it. If the app's login dance hides multiple tokens and redirects, record it. If you need both, record once and then simplify aggressively.

## Frequently Asked Questions

### Is k6 Studio generally available?

Grafana's docs present k6 Studio as an open-source desktop application and document installation, recording, generator rules, debugging, exporting, versioning, and stability. The stability page says k6 Studio uses a rolling release model where only the latest version is actively supported. During research, the GitHub releases page listed v2.1.0 as the latest release. For team governance, treat the app as the authoring tool and the exported k6 script as the durable artifact.

### Does k6 Studio replace writing k6 JavaScript?

No. It reduces the discovery cost of request order, headers, payloads, tokens, and groups. You still need to review the exported JavaScript, parameterize data, add meaningful thresholds, and commit the script to your repository. The strongest workflow is record in k6 Studio, validate once, export, harden in code, then run with the k6 CLI in CI.

### What should I remove from a recording before export?

Remove hosts that are not part of the system under test unless you intentionally own that dependency. Watch for analytics, browser-extension traffic, support widgets, map tiles, and personal account data. Keep business-critical requests, correlated tokens, and checks that prove outcomes. A quiet recording is easier to validate, safer to share, and more reliable under load.

### Why does a recorded k6 test pass once but fail under load?

The usual cause is recorded state: a one-time CSRF token, fixed resource ID, stale cookie, unique email, or data row consumed by the first virtual user. Diagnose by running one user for multiple iterations and searching the script for literal IDs or tokens. Fix it with correlation for generated values, parameterization for configurable values, and feeders for per-user test data.
`,
};
