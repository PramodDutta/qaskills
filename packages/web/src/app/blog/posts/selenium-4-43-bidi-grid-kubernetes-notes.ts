import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium 4.43 Release Notes: BiDi, Grid, and Kubernetes Signals for QA Teams',
  description: 'Selenium 4.43 release notes explained for QA engineers: what changed in Grid, what came before it, and how to plan safer upgrades with less CI risk.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Selenium 4.43 Release Notes: BiDi, Grid, and Kubernetes Signals for QA Teams

Selenium 4.43 is a small patch release, not a broad feature release: it fixes a Grid regression where a mobile slot stereotype browserName could leak into merged session capabilities when app-related capabilities were present. The practical payoff is simple: if you run mobile or app-style sessions through Selenium Grid, upgrade from 4.42 to 4.43 before debugging strange capability negotiation failures.

The phrase "selenium 4.43 release" can be misleading because the most interesting work around it landed in 4.40, 4.41, and 4.42. Selenium 4.40 expanded BiDi support and Dynamic Grid handling. Selenium 4.41 added native Dynamic Grid support for Kubernetes, plus a session event API and several Distributor fixes. Selenium 4.42 added more BiDi consistency work and hardened the Grid WebSocket router. Selenium 4.43 then followed one day later to repair a specific Grid capability merge regression. Official release notes: https://www.selenium.dev/blog/2026/selenium-4-43-released/

If your team uses AI coding agents to maintain Selenium suites, the correct prompt is not "upgrade Selenium and fix everything." The correct prompt is "read our Grid mode, browser capabilities, mobile capabilities, and BiDi usage, then produce an upgrade diff with a rollback path." That matters because these releases touch transport, eventing, browser lifecycle, and capability routing. Those are exactly the layers where a naive bulk edit can create a failure that looks like an application bug.

## Release Map for 4.40 Through 4.43

The 4.43 patch makes the most sense when you treat it as the closing note on a four-release run. The release stream did not move one feature at a time. It moved client bindings, Grid internals, Docker images, Kubernetes support, and BiDi surface area in parallel. QA teams should read it as an operational upgrade cluster.

| Release | Date | Main QA Impact | Upgrade Risk |
|---|---:|---|---|
| 4.40.0 | 2026-01-18 | BiDi emulation and network additions, Dynamic Grid container handling fixes | Medium if tests use driver internals or custom Grid setup |
| 4.41.0 | 2026-02-20 | Kubernetes Dynamic Grid, session event API, Distributor and WebSocket reliability fixes | High for teams running Grid in containers |
| 4.42.0 | 2026-04-09 | BiDi consistency work, WebSocket router hardening, NodeCommandInterceptor via extension loading | Medium to high for Grid extension users |
| 4.43.0 | 2026-04-10 | Grid regression patch for mobile/app capability merging | Low, but urgent if affected by mobile slot routing |

The official Selenium 4.43 note says it is a quick follow-up patch to 4.42. That is a useful signal. It means you should not search for a long feature list in 4.43 itself. The deeper changes are nearby. Read the release train, then decide what to test.

For a local smoke check, pin the server jar you intend to deploy and query status before touching your main suite:

\`\`\`bash
java -jar selenium-server-4.43.0.jar standalone --selenium-manager true
curl -s http://localhost:4444/status
\`\`\`

That command does not prove your Grid topology is ready. It proves the binary starts, the Router answers, and your shell can reach the service. Keep that test boring. Upgrade work fails when the first check mixes too many concerns.

## What Actually Changed in 4.43

The 4.43 change is about capability filtering after a session request has been merged with slot stereotype capabilities. In a Grid, the slot advertises what it can run. The requested capabilities describe what the test asks for. The Grid must merge those pieces without carrying a value that changes the meaning of the request.

Mobile and app automation make this delicate. A desktop browser session usually has a clear browserName. An app session may use app-specific capabilities instead. If a mobile slot's stereotype browserName leaks into the final merged capabilities, downstream routing or driver startup can see a browser request that the test did not intend. That failure rarely says "capability merge regression" in the log. It tends to look like "session not created", "unsupported capability", or a remote end starting the wrong target.

| Symptom in CI | First Place to Look | Why 4.43 Matters |
|---|---|---|
| Mobile session asks for an app but Grid logs include browserName | Merged capabilities in Grid logs | 4.43 restores filtering when app-related capabilities exist |
| Remote end rejects a capability combination that worked before 4.42 | Router, Distributor, Node logs for the same session id | The bad value may be introduced during merge, not by the test |
| Desktop browser sessions pass but mobile app sessions fail | Slot stereotype config and requested capabilities | The regression is tied to mobile/app-style capability shape |
| Appium relay or mobile provider receives unexpected browser target | Relay configuration and final payload | The leak can change how the provider interprets the session |

A minimal capability audit catches this class of problem before the suite burns minutes:

\`\`\`json
{
  "capabilities": {
    "alwaysMatch": {
      "platformName": "Android",
      "appium:automationName": "UiAutomator2",
      "appium:app": "storage:filename=my-app.apk"
    },
    "firstMatch": [
      {}
    ]
  }
}
\`\`\`

The important detail is what is absent: browserName. If your test asks for an app session, your merged payload should not silently become a browser session. When an AI agent reviews a Grid failure, ask it to compare the client request, Grid merged capabilities, and provider request side by side.

## BiDi Expansion Around the Release

Selenium 4.43 itself is not the BiDi release, but it sits after several BiDi-heavy releases. Selenium 4.40 added Java support for BiDi emulation and network commands such as screen orientation override and network conditions. Selenium 4.41 expanded .NET BiDi work in Emulation, Input, and Speculation, while Python gained a screen settings override command. Selenium 4.42 added Java's BiDi speculation module, .NET event argument consistency, thread-safe event processing, and more Python BiDi test coverage.

That matters to QA engineers because BiDi changes what browser automation can observe. Old Selenium suites often inspect the page after an action. Newer BiDi workflows can observe console logs, network events, script events, dialogs, download activity, and emulation state closer to the browser. This is not only a new API. It is a new debugging habit.

| Use Case | Classic WebDriver Habit | BiDi-Friendly Habit | Test Value |
|---|---|---|---|
| SPA route failure | Wait for an element and time out | Capture console and network events around navigation | Finds failed API calls and front-end exceptions |
| Permission or viewport issue | Retry the click | Set emulation state deliberately, then assert browser behavior | Removes environment guesswork |
| Preload script behavior | Inject JavaScript after page load | Register script before navigation where binding supports it | Catches startup bugs |
| Flaky dialog handling | Add global sleeps | Subscribe to prompt or browsing context events | Reduces timing races |

Here is a small JavaScript pattern that keeps BiDi-adjacent debugging separate from page assertions. It uses normal Selenium WebDriver calls, so the example remains portable even if your binding-specific BiDi APIs differ:

\`\`\`javascript
const { Builder, By, until } = require('selenium-webdriver');

async function run() {
  const driver = await new Builder().forBrowser('chrome').build();
  const events = [];

  try {
    await driver.get('https://example.com/');
    events.push({ name: 'loaded', url: await driver.getCurrentUrl() });
    const heading = await driver.wait(until.elementLocated(By.css('h1')), 5000);
    events.push({ name: 'heading', text: await heading.getText() });
  } finally {
    console.log(JSON.stringify(events, null, 2));
    await driver.quit();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

The next step is to replace the event array with real BiDi event subscriptions where your language binding supports the event you need. Do not let an agent invent a binding call. Point it to the official Selenium docs or the installed package API, then ask for a narrow diff.

## Dynamic Grid on Kubernetes Changes the Capacity Conversation

Selenium Grid 4.41 introduced Dynamic Grid support inside Kubernetes. Before that, Dynamic Grid was Docker-first: the Grid node talked to Docker to create browser containers as needed. Kubernetes users often ran fixed node deployments or used KEDA with the Selenium Grid scaler. Both can work. Native Kubernetes Dynamic Grid changes who owns session provisioning. The Grid can create browser Pods per session and clean them up when the session ends.

This is a major operational shift. Fixed browser Pods are easier to reason about, but they waste capacity outside peak test windows. External scaling can save resources, but now you tune two control loops: the Grid's view of sessions and the scaler's view of pending work. Dynamic Grid in Kubernetes puts the browser Pod lifecycle closer to Selenium itself.

The official deep dive identifies a Kubernetes-aware session factory and related configuration for namespace, Pod specs, resource limits, tolerations, node selectors, and image pull secrets. Read that as a contract: your test reliability now depends on cluster policy as much as Selenium code. RBAC, image pull behavior, CPU limits, memory limits, DNS, service account inheritance, and network policy become test infrastructure inputs.

\`\`\`toml
[server]
port = 5555

[node]
detect-drivers = false
max-sessions = 4

[kubernetes]
namespace = "selenium"
configs = [
  "selenium/standalone-chrome:4.43.0", '{"browserName": "chrome"}',
  "selenium/standalone-firefox:4.43.0", '{"browserName": "firefox"}'
]
resource-requests = "cpu=500m,memory=512Mi"
resource-limits = "cpu=1,memory=1Gi"
server-start-timeout = 120
\`\`\`

Treat this as a shape, not a production manifest. Official configuration options move faster than blog posts, so confirm keys with Selenium Grid config help for your exact server version. The test strategy is stable even when the exact values change: create one Chrome session, one Firefox session, one failed app session, and one cancellation path. Then inspect whether Pods are created, become ready, attach to sessions, and disappear.

## A Kubernetes Smoke Test That Finds Real Failures

A meaningful Kubernetes smoke test checks the route from client to Router to Node to Kubernetes API to browser Pod and back. It should not run your entire regression suite. It should run one test per browser stereotype, one session cancellation, and one artifact path if video or logs are enabled.

Use a namespace-scoped check first:

\`\`\`yaml
apiVersion: v1
kind: Namespace
metadata:
  name: selenium
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: selenium-node
  namespace: selenium
\`\`\`

Then verify the client path with a tiny test that fails loudly when the Grid URL is wrong:

\`\`\`javascript
const { Builder, By, until } = require('selenium-webdriver');

const gridUrl = 'http://localhost:4444/wd/hub';

async function smoke(browserName) {
  const driver = await new Builder()
    .usingServer(gridUrl)
    .withCapabilities({ browserName })
    .build();

  try {
    await driver.get('https://example.com/');
    const heading = await driver.wait(until.elementLocated(By.css('h1')), 10000);
    const text = await heading.getText();
    if (text !== 'Example Domain') {
      throw new Error('Unexpected heading: ' + text);
    }
  } finally {
    await driver.quit();
  }
}

Promise.all([smoke('chrome'), smoke('firefox')]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

The mistake I see often: teams scale browser Pods first and ask why tests are flaky later. Start with lifecycle evidence. Can the Grid create a Pod? Can the browser inside it accept a session? Does quit delete the Pod? Does a failed startup leave an orphan? Capacity tuning comes after lifecycle correctness.

## How AI Coding Agents Should Help With the Upgrade

AI agents are useful for upgrade chores because they can search large suites and produce mechanical diffs. They are dangerous when they treat Selenium as only a client library. In a Grid shop, Selenium is a distributed system. A useful agent workflow reads code, config, CI, container images, and cluster manifests together.

Give the agent an inventory task first:

\`\`\`bash
rg "selenium|RemoteWebDriver|browserName|appium:|grid|standalone|node-kubernetes|PERCY|webdriver" .
\`\`\`

Then ask for a typed report before edits:

\`\`\`text
Find every Selenium touchpoint in this repository.
Group findings by client code, Grid config, CI image, Docker image, Kubernetes manifest, and visual testing integration.
For each finding, say whether Selenium 4.40 through 4.43 can affect it.
Do not edit files until the report lists the exact files and risks.
\`\`\`

That prompt works because it denies the agent the easy path: editing package versions and waiting for CI to fail. It forces dependency context. Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but a release upgrade still needs local inventory because every Grid is a little different.

## Failure Story: The App Session That Became a Browser Session

The symptom was noisy: Android app smoke tests failed after a Selenium server bump, but only in the shared Grid. Local Appium tests passed. The first theory was stale app storage. The second theory was a provider-side Android image issue. Both were plausible because the error mentioned unsupported capabilities.

The actual cause was capability pollution. The Grid slot stereotype included browserName for mobile browser coverage. The app test requested app-specific capabilities. During routing, the merged payload sent downstream contained a browserName the test never asked for. The mobile provider interpreted the session as a browser request and rejected the combination.

The fix was not to rewrite the test. It was to patch the Grid version, split browser and app stereotypes more clearly, and add a log assertion in the Grid smoke job that app sessions do not include browserName after merge. Selenium 4.43 is exactly the kind of patch that saves teams from spending a week in the wrong layer.

## What People Get Wrong About 4.43

People get two things wrong. First, they call 4.43 a BiDi expansion release. The BiDi expansion is real, but it belongs mostly to 4.40, 4.41, and 4.42. Second, they treat a patch release as low priority because it has a short changelog. For desktop-only suites, that may be fine. For Grid users with mobile or app sessions, a short changelog can be a high-signal bug fix.

Your upgrade note to the team should say this:

| Team Profile | Recommendation | Reason |
|---|---|---|
| Local WebDriver only, no Grid | Upgrade during normal dependency maintenance | 4.43 is unlikely to change local browser tests by itself |
| Grid with desktop browsers only | Upgrade after one Grid smoke pass | Neighboring releases changed WebSocket and Dynamic Grid paths |
| Grid with mobile/app capability routing | Upgrade to at least 4.43 before deeper debugging | 4.43 fixes the mobile/app merge regression |
| Kubernetes Dynamic Grid pilot | Test 4.41 through 4.43 as one cluster | Kubernetes support and follow-up Grid fixes belong together |

## Upgrade Checklist for QA Owners

Do not let the upgrade checklist become a wall of package names. Tie every check to a failure mode.

1. Record current Selenium client binding versions, server jar version, Docker image tags, and Grid deployment mode.
2. Capture one passing Grid session payload for each browser and app profile before the upgrade.
3. Upgrade a staging Grid to 4.43 while keeping the old Grid available.
4. Run browser smoke tests, app smoke tests, cancellation tests, and a forced startup failure.
5. Compare requested capabilities with merged capabilities in logs.
6. Inspect WebSocket-heavy tests, especially BiDi, VNC, video, and long-running page interactions.
7. For Kubernetes Dynamic Grid, verify Pod creation, readiness, service account permissions, resource limits, and cleanup.
8. Promote only after CI has run against the staging Grid with parallelism close to production.

Teams planning a broader browser automation rethink should read [Selenium to Playwright Migration in 2026](/blog/selenium-to-playwright-migration-2026) before turning release fatigue into a rushed rewrite. Teams staying on Selenium should pair this with [Selenium Manager 4.6 Driver Management Guide](/blog/selenium-manager-4-6-driver-management-2026-guide), because driver resolution and Grid routing often fail in the same CI week.

## Version-Specific Test Matrix

The safest matrix is small and intentional. You do not need every browser version in the first pass. You need coverage for the changed surfaces.

| Test Slice | Minimum Scenario | Evidence to Save |
|---|---|---|
| Capability merge | One desktop session and one app session | Requested and merged capabilities |
| WebSocket path | One test that keeps a session open during page activity | Router and Node logs with session id |
| BiDi surface | One console or network observation test where supported | Event stream or fallback logs |
| Kubernetes lifecycle | One session per browser stereotype | Pod name, phase transitions, deletion |
| Failure cleanup | Bad image tag or denied scheduling in staging | Queue behavior and orphan check |

A rollback plan is part of the matrix. Keep the previous server artifact and image tag available. Keep the old Grid endpoint reachable for one release window if your organization allows it. If a regression appears, you want a binary decision: roll back Grid only, roll back client bindings only, or roll back both. Without that split, every failure turns into a debate.

## Log Evidence to Capture Before You Blame the App

The hardest Selenium release failures are misclassified as product bugs. A button does not click, a page load hangs, or a mobile app session never appears, so the team starts editing waits. Before that happens, capture transport evidence. For every failed staging run, save the client capability payload, Grid status response, Router log line for the new session, Distributor decision, Node startup message, and final remote-end error. If Kubernetes is involved, add Pod events and container termination reason.

The useful join key is the Selenium session id when one exists. Before a session exists, use timestamp, browserName or app capability, test name, and CI job id. This sounds tedious until the first incident. Once you have that bundle, an AI agent can compare a passing 4.40 run with a failing 4.43 run and point to the layer that changed. Without it, the agent mostly guesses from stack traces.

Keep a small artifact directory per smoke run:

\`\`\`text
artifacts/selenium-upgrade-smoke/
  requested-capabilities.json
  grid-status-before.json
  grid-status-after.json
  router.log
  distributor.log
  node.log
  kubernetes-pod-events.txt
  test-output.txt
\`\`\`

This directory is not for long-term storage. It is for fast diagnosis. The moment the upgrade passes consistently, shorten retention. During the upgrade window, those files are more valuable than another rerun.

One final release-management habit helps: separate "upgrade validation" from "suite improvement." During the validation window, do not rewrite locators, replace waits, change test data factories, and alter browser versions in the same pull request. Those may be good changes, but they destroy attribution. If the Grid upgrade fails, you need to know whether the failure came from Selenium, the browser image, the test code, or the application. Keep the first diff boring. After the Grid is stable, open a second diff for cleanup and newer BiDi observability.

That separation also helps rollback conversations stay factual. A release manager can accept a Selenium server rollback when the only changed production variable is the server image. The same conversation becomes messy when a single diff also includes fixture rewrites and wait strategy changes.

## Frequently Asked Questions

### Is Selenium 4.43 a major BiDi release?

No. Selenium 4.43 is mainly a Grid regression patch. The broader BiDi work sits in nearby releases, especially 4.40, 4.41, and 4.42. That distinction matters when you write upgrade notes. If your team wants to evaluate new BiDi capabilities, read the 4.40 through 4.42 notes. If your team saw mobile or app session failures after 4.42, 4.43 is the release to test quickly.

### Should desktop-only Selenium users rush to 4.43?

Usually no, unless your dependency policy already keeps Selenium current. Desktop-only local WebDriver suites are less likely to hit the specific 4.43 fix. Grid users should still run a staging smoke pass because 4.42 touched WebSocket routing and Grid behavior. The upgrade is small, but the correct habit is to verify your own transport path rather than infer safety from changelog length.

### What is the biggest Kubernetes Grid risk after 4.41?

The biggest risk is treating browser Pod creation as only a Selenium concern. Kubernetes Dynamic Grid also depends on RBAC, image pull policy, namespace settings, service accounts, resource requests, network rules, and cleanup behavior. A test can fail before the browser even starts. Your smoke test should inspect Pod lifecycle events and Selenium logs together, using the session id as the join key.

### How should AI agents be used for this upgrade?

Use agents for inventory, diff review, and repetitive edits. Do not let them guess API names or rewrite waits without evidence. A strong prompt asks the agent to list every Selenium client, Grid config, Docker image, CI job, and Kubernetes manifest before editing. Then ask for the smallest version bump and smoke-test additions. Selenium upgrades fail when config and test code are reviewed separately.
`,
};
