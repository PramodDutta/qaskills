import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Browserbase for AI Agents and Test Automation: Sessions, Stagehand, and Debugging',
  description: 'Browserbase guide for QA engineers: create cloud browser sessions, connect Playwright, use Stagehand, persist contexts, debug replays, and control cost.',
  date: '2026-09-28',
  category: 'AI Testing',
  content: `
# Browserbase for AI Agents and Test Automation: Sessions, Stagehand, and Debugging

Browserbase is a hosted browser infrastructure platform for AI agents, browser automation, web data retrieval, and end-to-end testing. The current docs describe a broader platform than just remote Chrome: Browser Sessions, Fetch, Search, Agents, Functions, Agent Identity, Model Gateway, Contexts, Proxies, Session Inspector, Live View, and Session Replay all sit behind the same Browserbase account model.

For QA engineers, the useful mental model is simple: Browserbase gives you cloud Chromium sessions that your existing tools can drive over CDP or WebDriver, plus observability and persistence features that are painful to build yourself. Playwright still writes the deterministic test. Stagehand adds AI actions, extraction, and observation when selectors are unstable or the workflow benefits from natural-language steps. Browserbase supplies the remote browser fleet, session URLs, recordings, logs, live debugging, proxies, and contexts.

Stagehand 4.0.0 shipped on August 10, 2026 and \`@browserbasehq/stagehand@4.1.0\` (September 9, 2026) is the npm \`latest\` tag, while 3.7.3 remains available under the \`v3-latest\` tag for teams that have not migrated. The v4 docs emphasize TypeScript, Python, and Go APIs, and the samples below use the v4 \`browserbase.launch()\` entry point. Browserbase and Stagehand are active, but their docs and packages move quickly. Pin package versions, read the migration notes before upgrading, and keep plain Playwright coverage for critical assertions. For related agent-browser patterns, compare [Stagehand AI Browser Automation Guide 2026](/blog/stagehand-ai-browser-automation-guide-2026) and [Skyvern AI Browser Automation Guide](/blog/skyvern-ai-browser-automation-guide).

## Product Surface QA Teams Actually Use

The Browserbase documentation currently positions Browserbase as a complete platform for browser agents: cloud browsers, web search, page fetching, sandbox runtime, and model access. QA teams do not need every product on day one. Most testing programs start with sessions, then add contexts, proxies, replay, and Stagehand only when those solve a real bottleneck.

| Browserbase surface | What it does | QA use case |
| --- | --- | --- |
| Browser Sessions | Isolated cloud browser instances with connection URLs | Run Playwright, Puppeteer, Selenium, or Stagehand remotely |
| Session Inspector | Live debugging view with browser state, network, console, metrics, and replay | Triage CI failures without guessing from logs only |
| Session Replay | HLS replay metadata and page playlists | Attach recordings to failed builds or internal dashboards |
| Contexts | Persist Chromium user data across sessions | Avoid repeated login and keep authenticated state |
| Proxies | Built-in or external proxy routing with geolocation options | Validate regional behavior and identity-sensitive flows |
| Stagehand | AI primitives plus Playwright-style page APIs | Handle changing UI where deterministic selectors are too brittle |
| Functions | Run TypeScript next to Browserbase browsers | Move automation close to the browser for latency and deployment |

The trap is using all of it because it exists. Start with a remote Playwright smoke suite, capture replay links for failures, and add context persistence for logins. Once that is stable, introduce Stagehand for the small set of actions where AI actually reduces maintenance.

## Create Sessions And Connect Playwright

The core Browserbase loop is create, connect, use, close. The Sessions API returns an \`id\`, \`connectUrl\`, region, status, expiration data, and related metadata. The docs show \`@browserbasehq/sdk\` with \`playwright-core\` for Node.js, and the project can be inferred from the API key.

\`\`\`bash
npm install --save-dev playwright-core @browserbasehq/sdk
\`\`\`

This Playwright sample checks required environment, creates a session, connects over CDP, uses the default context and page, asserts useful content, and closes the browser. It avoids relying on a local browser binary.

\`\`\`javascript
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { Browserbase } from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");

const bb = new Browserbase({ apiKey });
const session = await bb.sessions.create({
  region: "us-west-2",
  userMetadata: {
    suite: "smoke",
    owner: "qa",
  },
});

const browser = await chromium.connectOverCDP(session.connectUrl);

try {
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  await page.goto("https://www.browserbase.com/", {
    waitUntil: "domcontentloaded",
  });

  const title = await page.title();
  assert.match(title, /Browserbase/i);

  const bodyText = await page.locator("body").textContent();
  assert.match(bodyText ?? "", /browser/i);
} finally {
  await browser.close();
}
\`\`\`

Browserbase docs call out one easy-to-miss rule: after creating a session, you have five minutes to connect before it terminates. That affects queue-based CI. If your test runner creates all sessions up front and then waits behind a long build step, sessions can expire before Playwright attaches. Create the session as close as possible to the point of use, or use keep-alive when the workflow requires reconnection.

## Session Configuration That Changes Test Outcomes

The Create Session API exposes practical settings: \`region\`, \`timeout\`, \`keepAlive\`, \`proxies\`, \`proxySettings\`, \`browserSettings\`, and \`userMetadata\`. The API reference lists available regions as \`us-west-2\`, \`us-east-1\`, \`eu-central-1\`, and \`ap-southeast-1\`. Timeout ranges from 60 seconds to 21600 seconds, which is 6 hours.

| Setting | Why it matters | QA recommendation |
| --- | --- | --- |
| \`region\` | Latency and geography can affect app behavior | Pick the closest region unless testing location |
| \`timeout\` | Long flows need more than the project default | Set explicit timeouts for suites over a few minutes |
| \`keepAlive\` | Lets sessions survive disconnects on eligible plans | Use for human-in-the-loop and reconnect debugging |
| \`browserSettings.recordSession\` | Replay is enabled by default in docs | Keep on for CI triage unless retention policy forbids it |
| \`browserSettings.logSession\` | Logs help explain browser failures | Keep on for non-sensitive test environments |
| \`browserSettings.viewport\` | Remote browser size affects responsive UI | Pin width and height per suite |
| \`userMetadata\` | Lets you tag sessions | Include suite, commit, shard, and test owner |

Here is a session shape for a CI smoke shard that needs deterministic viewport and useful metadata:

\`\`\`javascript
import assert from "node:assert/strict";
import { Browserbase } from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");

const bb = new Browserbase({ apiKey });

const session = await bb.sessions.create({
  region: "us-east-1",
  timeout: 900,
  browserSettings: {
    viewport: {
      width: 1440,
      height: 1000,
    },
    recordSession: true,
    logSession: true,
  },
  userMetadata: {
    suite: "checkout-smoke",
    shard: process.env.CI_NODE_INDEX ?? "0",
    commit: process.env.GITHUB_SHA ?? "local",
  },
});

assert.match(session.id, /^[a-zA-Z0-9_-]+$/);
console.log("Session URL: https://browserbase.com/sessions/" + session.id);
\`\`\`

The \`userMetadata\` object is underrated. When a failure report contains only a Browserbase session ID, someone still has to map it back to a test. Metadata lets you filter and correlate sessions by suite, commit, shard, customer sandbox, or agent run ID.

## Persist Logins With Contexts

Browserbase Contexts persist Chromium user data across sessions. The docs say they store cookies, localStorage, IndexedDB, session storage, service workers, web data, browser preferences, and site settings, while not including the browser HTTP cache. Context data is encrypted at rest. By default, every Browserbase session starts fresh, so Contexts are the way to reuse login state.

The workflow is create a Context, start a session with that Context, log in, close the session with \`persist: true\`, wait a few seconds for synchronization, then reuse the Context in later sessions.

\`\`\`javascript
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { Browserbase } from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");
assert.ok(process.env.APP_EMAIL, "APP_EMAIL is required");
assert.ok(process.env.APP_PASSWORD, "APP_PASSWORD is required");

const bb = new Browserbase({ apiKey });
const context = await bb.contexts.create({
  name: "qa-demo-login",
});

const session = await bb.sessions.create({
  browserSettings: {
    context: {
      id: context.id,
      persist: true,
    },
  },
});

const browser = await chromium.connectOverCDP(session.connectUrl);

try {
  const page = browser.contexts()[0].pages()[0];
  await page.goto("https://app.example.test/login");
  await page.getByLabel("Email").fill(process.env.APP_EMAIL);
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();

  const heading = await page.getByRole("heading", { name: "Dashboard" }).textContent();
  assert.equal(heading, "Dashboard");
} finally {
  await browser.close();
}

console.log("Context ID: " + context.id);
\`\`\`

What people get wrong is sharing one Context across parallel tests. Browserbase docs warn that simultaneous logins with the same Context can cause sites to force logout, and they recommend one Context per site and per login. For QA, that usually means one Context per test account class, not one global super-context. If you need ten parallel authenticated shards, create ten accounts and ten Contexts.

## Stagehand: Use AI Where Selectors Are The Bottleneck

Stagehand is built by Browserbase for browser agents. The docs describe three AI primitives: \`act\`, \`extract\`, and \`observe\`, alongside Playwright-style page APIs such as \`goto\`, \`click\`, \`type\`, \`locator\`, and \`screenshot\`. Stagehand v3 can connect to Browserbase sessions, and the current docs emphasize that you can mix AI-powered actions with deterministic browser control.

That mix is the whole point for QA. Do not replace every stable locator with natural language. Use Stagehand when the page is third-party, changes often, or needs extraction from inconsistent structures. Use Playwright locators when you own the app and can add roles, labels, and test IDs.

| Step type | Prefer Playwright | Prefer Stagehand |
| --- | --- | --- |
| Owned app button with accessible name | Yes | Rarely |
| Third-party portal with changing labels | Sometimes | Yes |
| Extract product data from varied cards | Maybe | Yes with schema |
| Assert checkout success in your app | Yes | No |
| Explore available actions before scripting | No | Yes, with \`observe\` |
| Enter credentials | Yes, never send secrets to the model | Use \`observe\` only to find selectors |

This pattern uses Stagehand to discover selectors, then fills credentials through deterministic page APIs so secrets do not enter the model prompt.

\`\`\`javascript
import assert from "node:assert/strict";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";

const apiKey = process.env.BROWSERBASE_API_KEY;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");
assert.ok(process.env.APP_EMAIL, "APP_EMAIL is required");
assert.ok(process.env.APP_PASSWORD, "APP_PASSWORD is required");

// Stagehand v4 launches the Browserbase session itself, with its extension attached.
const browser = await browserbase.launch({ apiKey });

try {
  const stagehand = await Stagehand.create({ browser });
  const [page] = await browser.context.pages();

  await page.goto("https://app.example.test/login");
  const emailFields = await stagehand.observe("find the email input");
  const passwordFields = await stagehand.observe("find the password input");

  assert.ok(emailFields.data.length > 0, "email selector not found");
  assert.ok(passwordFields.data.length > 0, "password selector not found");

  await page.locator(emailFields.data[0].selector).fill(process.env.APP_EMAIL);
  await page.locator(passwordFields.data[0].selector).fill(process.env.APP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
} finally {
  await browser.close();
}
\`\`\`

The failure mode here is easy to diagnose. If \`observe\` returns no candidates, the problem is element discovery. If candidates exist but login fails, the issue is credentials, app state, or post-submit behavior. Splitting AI discovery from deterministic action makes the run explainable.

## Debugging With Live View, Inspector, And Replay

Browserbase sessions are not black boxes. The docs describe Session Inspector with live browser state, real-time network requests and responses, console output, performance metrics, resource usage, and replay. Live View can also be embedded into your application and supports human-in-the-loop control for authentication, CAPTCHAs, or unexpected errors.

The Playwright quickstart shows \`bb.sessions.debug(session.id)\` returning debug URLs. Use that in local repro scripts, but do not print sensitive URLs into public logs.

\`\`\`javascript
import assert from "node:assert/strict";
import { Browserbase } from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");

const bb = new Browserbase({ apiKey });
const session = await bb.sessions.create({
  userMetadata: {
    purpose: "debug-demo",
  },
});

const debugUrls = await bb.sessions.debug(session.id);
assert.ok(debugUrls.debuggerUrl.startsWith("https://"));

console.log("Session: https://browserbase.com/sessions/" + session.id);
console.log("Debugger URL: " + debugUrls.debuggerUrl);
\`\`\`

For automated failure reporting, prefer storing the Browserbase session page URL and replay metadata behind your own access controls. The replay docs say the metadata response lists each tab recording and the page response is an HLS \`.m3u8\` playlist whose segment URLs are signed and valid for a limited time.

\`\`\`javascript
import assert from "node:assert/strict";
import { Browserbase } from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
const sessionId = process.env.BROWSERBASE_SESSION_ID;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");
assert.ok(sessionId, "BROWSERBASE_SESSION_ID is required");

const bb = new Browserbase({ apiKey });
const meta = await bb.sessions.replays.retrieve(sessionId);
assert.ok(meta.pages.length > 0, "session replay has no pages");

const firstPage = meta.pages[0];
const playlist = await bb.sessions.replays.retrievePage(sessionId, firstPage.pageId);
const m3u8 = await playlist.text();
const hasSegment = m3u8.split("\\n").some((line) => line.startsWith("https://"));

assert.equal(hasSegment, true);
\`\`\`

Do not call the replay API directly from a browser client with your API key. The docs explicitly recommend proxying through your own backend if embedding an HLS player. For QA dashboards, make the backend enforce the same access policy as your CI logs.

## Proxies, Identity, And Regional Test Design

Browserbase supports built-in residential proxies, custom external proxies, geolocation settings, and ordered routing rules. The proxy docs say \`proxies: true\` makes a best-effort attempt to use a US-based proxy by default, while array configuration can specify Browserbase proxies, external proxies, geolocation, domain patterns, and exclusions.

Use proxies to test location-sensitive behavior, not as a magic fix for every block. The docs warn that provider restrictions can affect categories such as financial services, government domains, streaming, ticketing, webmail, and gambling, and that \`ERR_TUNNEL_CONNECTION_FAILED\` can mean an unsupported site, unsupported city, or temporary proxy problem.

| Proxy pattern | Example use | QA caution |
| --- | --- | --- |
| \`proxies: true\` | Quick US-ish proxy coverage | Best effort geography, not a location assertion |
| Browserbase geolocation | Country-level regional behavior | Prefer broad country before city |
| External proxy | Corporate egress or approved provider | Validate credentials at session creation |
| Domain routing | Different proxy for selected domains | Order matters, first matching rule wins |
| \`type: "none"\` exclusion | Keep internal domains direct | Put exclusions before fallback proxies |

Here is a focused regional session:

\`\`\`javascript
import assert from "node:assert/strict";
import { Browserbase } from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");

const bb = new Browserbase({ apiKey });
const session = await bb.sessions.create({
  proxies: [
    {
      type: "browserbase",
      geolocation: {
        country: "GB",
      },
    },
  ],
  userMetadata: {
    suite: "regional-pricing",
    country: "GB",
  },
});

assert.ok(session.connectUrl.startsWith("wss://"));
\`\`\`

For custom proxies with private certificate authorities, Browserbase supports uploading PEM certificates and referencing them through \`proxySettings.caCertificates\`. That is cleaner than disabling certificate validation globally when testing corporate egress flows.

## CI Architecture For Browserbase Tests

Browserbase moves the browser out of your CI runner, but it does not remove test architecture. You still need sharding, timeouts, artifact capture, and secret hygiene. The difference is that the expensive browser process lives remotely and the failure evidence lives in Browserbase.

\`\`\`yaml
name: browserbase-smoke

on:
  pull_request:
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - name: Run Browserbase Playwright smoke
        env:
          BROWSERBASE_API_KEY: \${{ secrets.BROWSERBASE_API_KEY }}
          GITHUB_SHA: \${{ github.sha }}
        run: node tests/browserbase-smoke.mjs
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: browserbase-results-\${{ github.run_id }}
          path: test-results
\`\`\`

A production workflow should write a small JSON file per test with the session ID, app URL, commit SHA, shard, and failure reason. Upload that as an artifact and, if your organization allows it, add the Browserbase session URL to the test report.

\`\`\`javascript
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const sessionId = process.env.BROWSERBASE_SESSION_ID;
assert.ok(sessionId, "BROWSERBASE_SESSION_ID is required");

await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/browserbase-session.json",
  JSON.stringify(
    {
      sessionId,
      sessionUrl: "https://browserbase.com/sessions/" + sessionId,
      commit: process.env.GITHUB_SHA ?? "local",
      suite: "checkout-smoke",
    },
    null,
    2,
  ),
);
\`\`\`

If you use Playwright Test, keep filtering normal and explicit. For example, \`npx playwright test --grep @browserbase\` selects tagged tests, while \`npx playwright test tests/checkout.spec.ts -g "guest checkout"\` narrows by title. Do not ask agents to invent runner flags. Playwright uses \`--grep\` or \`-g\`.

## Cost, Rate Limits, And Plan Design

The Browserbase plans page currently lists Free, Developer, Startup, and Scale. Free includes 3 concurrent sessions, 1 browser hour, and 15 minute session duration. Developer is $20 with 25 concurrent browsers, 100 browser hours, 6 hour session duration, and proxy allocation. Startup is $99 with 100 concurrent browsers and 500 browser hours. Scale is custom with higher concurrency, enterprise controls, and compliance options.

The same docs say browser time is billed by the minute with a one-minute minimum per session, and session creation has per-minute limits. That has direct test-design consequences.

| Cost lever | Bad pattern | Better pattern |
| --- | --- | --- |
| Session startup | Create a new session for every tiny assertion | Group related checks into one browser flow |
| Parallelism | Fan out beyond creation rate | Cap shards to plan limits |
| Timeouts | Leave defaults implicit | Set suite-specific \`timeout\` values |
| Replays | Record all sensitive exploratory sessions | Align recording with data policy |
| Contexts | Re-login on every test | Persist stable login state per account |
| Proxies | Route all traffic through proxies | Use proxies only for tests that need them |

Do not optimize cost by deleting assertions. Optimize by choosing the right evidence layer: Search or Fetch for content discovery, Browser Sessions for real interactions, Stagehand for resilient exploration, and Playwright for deterministic regression checks.

## A Practical Failure Mode: Session Expired Before Connect

Here is a realistic Browserbase failure: CI creates 40 sessions at the start of a job, then the runner installs dependencies, builds the app, starts the server, and finally tries to connect. Some sessions fail with CDP connection errors. The root cause is not Playwright flake. Browserbase docs say a newly created session must be connected within five minutes before it terminates.

The diagnosis is to log creation time and connect time, then move session creation into the test fixture after the app is ready. A useful guard looks like this:

\`\`\`javascript
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { Browserbase } from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
assert.ok(apiKey, "BROWSERBASE_API_KEY is required");

export async function withBrowserbasePage(run) {
  const bb = new Browserbase({ apiKey });
  const session = await bb.sessions.create({
    timeout: 1200,
    userMetadata: {
      fixture: "withBrowserbasePage",
    },
  });

  const browser = await chromium.connectOverCDP(session.connectUrl);
  try {
    const context = browser.contexts()[0];
    const page = context.pages()[0];
    await run({ page, session });
  } finally {
    await browser.close();
  }
}
\`\`\`

Create late, connect immediately, and close deliberately. That one habit removes a surprising amount of remote-browser flake.

## Frequently Asked Questions

### Is Browserbase only for AI agents?

No. Browserbase is useful for AI agents, but QA teams can use it as remote browser infrastructure for Playwright, Puppeteer, and Selenium without adding AI to the test. The agent-specific value appears when you add Stagehand, Agents, or natural-language workflows. A conservative rollout is to move a small Playwright smoke suite to Browserbase first, prove replay and debugging value, then add Stagehand for brittle third-party workflows.

### Should Stagehand replace Playwright locators?

Not across your owned application. Stable Playwright locators are still better for deterministic regression tests, especially roles, labels, and well-named test IDs. Stagehand is strongest when selectors are unknown, changing, or outside your control. A good hybrid pattern is using Stagehand \`observe\` to find candidates, then using Playwright-style APIs for secrets, clicks, assertions, and side-effect checks. That keeps AI helpful without making every test probabilistic.

### How do Browserbase Contexts differ from Playwright storage state?

Playwright storage state usually serializes cookies and localStorage for a browser context. Browserbase Contexts persist the underlying Chromium user data directory across Browserbase sessions, including cookies, localStorage, IndexedDB, session storage, service workers, web data, preferences, and security state. They are useful for remote authenticated sessions, but they should not be shared recklessly across parallel tests. Use one Context per site and login identity when reliability matters.

### What should I upload from CI failures?

Upload your normal test report plus a small Browserbase metadata file containing the session ID, Browserbase session URL, suite name, shard, commit, and failure message. Keep API keys out of artifacts. If replay is allowed by your data policy, link to the Browserbase session or route replay metadata through an internal dashboard. For sensitive flows, consider disabling recording or using enterprise retention controls instead of spreading recordings through generic CI artifacts.
`,
};
