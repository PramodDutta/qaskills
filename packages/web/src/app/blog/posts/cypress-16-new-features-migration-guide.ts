import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress 16 New Features and Migration Guide',
  description: 'Cypress 16 migration guide for QA teams: breaking changes, CI upgrade steps, cy.env changes, native network checks, and failure triage plan.',
  date: '2026-09-28',
  category: 'Migration',
  content: `
# Cypress 16 New Features and Migration Guide

Cypress 16 is an active, current major release, not a rename or abandoned line. The current npm release I verified is 16.1.0, while 16.0.0 shipped on September 1, 2026 and 16.1.0 shipped on September 15, 2026. The short version for QA teams is this: upgrade from Cypress 15 one major at a time, move all sensitive reads away from \`Cypress.env()\`, retest network assertions in Chrome, Chromium, and Edge, and review every old escape hatch in config before letting an AI coding agent rewrite tests in bulk.

The biggest Cypress 16 feature is the native browser network path for Chrome-family browsers. Your application now negotiates HTTP/1.1, HTTP/2, or HTTP/3 directly with the server, instead of having Cypress sit in the middle as an HTTP/1.1 proxy. That makes tests more production-like, but it also breaks brittle assertions on protocol metadata, compression headers, and 304 responses.

Cypress 16 also removes APIs that were already deprecated or unsafe: \`Cypress.env()\`, \`cy.exec()\`, \`cy.end()\`, \`experimentalSourceRewriting\`, \`allowCypressEnv\`, and runtime mutation of \`viewportWidth\`, \`viewportHeight\`, and \`blockHosts\` through \`Cypress.config()\`. If your team uses Claude Code, Cursor, Copilot, or another coding agent, this is exactly the kind of migration where a checklist beats a prompt that says "upgrade Cypress" and hopes for the best.

## Verified Release Snapshot

| Version | Release date | What changed for migration planning |
| --- | --- | --- |
| \`15.10.0\` | February 3, 2026 | Added \`cy.env()\` and \`Cypress.expose()\` as the migration path away from \`Cypress.env()\`. |
| \`15.21.0\` | August 18, 2026 | Deprecated \`cy.exec()\` and \`execTimeout\`; added \`cypress tap\`, which is useful for agent-driven debugging in open mode. |
| \`16.0.0\` | September 1, 2026 | Released native network interception, removed multiple deprecated APIs, raised runtime requirements, and changed query behavior for cookies and storage. |
| \`16.1.0\` | September 15, 2026 | Fixed Chrome-family hangs from 16.0.0, reduced service-worker memory growth, and added \`trustedCertificates\`. |

The official docs list Node.js 22.x, 24.x, or 26.x and above as the supported Node range for Cypress 16 installation. Browser support remains the latest three major versions of Chrome, Edge, and Firefox, with WebKit still experimental. Electron is still bundled, but it is deprecated as a test browser and should not be your long-term CI default.

The npm page shows 16.1.0 as the current \`latest\` tag. That matters because a migration pinned to exactly \`16.0.0\` inherits a regression where Chrome, Chromium, or Edge runs could stop producing output and hang until CI killed the job. For most teams, the target should be \`^16.1.0\` or an exact \`16.1.0\` pin in a controlled lockfile.

## Upgrade Gate Before Code Changes

Do not let an agent edit tests before it proves the project is ready to run Cypress 16. The expensive failures are usually not in specs. They are in CI images, Docker base tags, package-manager script blocking, unsupported component-testing toolchains, and old plugins that still call \`Cypress.env()\`.

| Check | Cypress 16 requirement | Fast command or inspection |
| --- | --- | --- |
| Installed Cypress | Start from Cypress 15.x, then move to 16.x | \`npm ls cypress\` |
| Node runtime | \`22.x\`, \`24.x\`, or \`>=26.x\` | \`node --version\` |
| npm | \`>=10.1.0\`; newer npm may block postinstall scripts | \`npm --version\` |
| Vite component testing | Vite \`8.0.0+\` | \`npm ls vite\` |
| Angular component testing | Angular \`21.0.0+\`; Angular 22 supported | \`npm ls @angular/core @angular/cli\` |
| Next component testing | Next \`15.0.4+\` or \`16+\` | \`npm ls next\` |
| Browser choice | Prefer installed Chrome, Edge, or Firefox over Electron | Check CI \`--browser\` or Cypress action \`browser\` input |

\`\`\`bash
node --version
npm --version
npm ls cypress
npm ls vite @angular/core @angular/cli next
npx cypress verify
\`\`\`

If package scripts are blocked, installing the npm package may succeed while the Cypress binary is missing. Cypress docs now call out npm, Yarn Modern, pnpm, and Bun script controls. In npm 11.16.0 and later, warnings begin around blocked lifecycle scripts, and npm 12.0.0 blocks them by default. A reproducible migration should include a binary verification step, not just a dependency bump.

## Install And Pin Strategy

For application repos, pinning through the lockfile is normally enough. If your company audits test infrastructure tightly, pin \`cypress\` exactly while you migrate, then loosen once CI is stable. The bigger decision is not semver style. It is whether the package manager runs Cypress postinstall or whether CI calls \`cypress install\` explicitly.

\`\`\`json
{
  "devDependencies": {
    "cypress": "16.1.0"
  },
  "scripts": {
    "cy:verify": "cypress verify",
    "cy:run": "cypress run --browser chrome"
  }
}
\`\`\`

For pnpm projects, also check whether builds are allowlisted. Cypress docs note that newer pnpm can require allowlisting \`cypress\`, and Cypress recommends disabling pnpm side-effects cache for Cypress projects because it conflicts with Cypress binary caching.

\`\`\`bash
pnpm config set side-effects-cache false --location project
pnpm --allow-build=cypress add --save-dev cypress@16.1.0
pnpm cypress verify
\`\`\`

For npm projects on newer npm, approve Cypress scripts or install the binary explicitly. The second approach is appealing in CI because it is visible and easy to diagnose.

\`\`\`bash
npm install cypress@16.1.0 --save-dev
npx cypress install
npx cypress verify
\`\`\`

What people get wrong: they run \`npm install cypress@latest\`, see a lockfile change, and call the migration complete. Cypress has two moving parts, the npm package and the downloaded binary. If the binary never downloaded, your agent may spend an hour "fixing" specs that never actually launched.

## Native Network Interception Changes

Cypress 16 routes Chrome, Chromium, and Edge through the native browser network by default. Firefox, WebKit, and Electron still use the legacy network path. The temporary \`forceHttp1\` option routes every browser back through the legacy path, but Cypress introduced it as a deprecated migration aid. Treat it like scaffolding, not architecture.

| Assertion pattern from Cypress 15 | Cypress 16 diagnosis | Better assertion |
| --- | --- | --- |
| Assert \`req.httpVersion === "1.1"\` | Native network cannot report a protocol value at interception time | Assert method, URL, request body, headers your app controls, or user-visible behavior |
| Assert response has \`content-encoding: br\` | Cypress now gives you a decoded body and omits compression headers | Assert decoded body or rendered UI |
| Expect second cached response to report \`304\` | Browser cache merges the server 304 into a complete 200 response | Use \`cy.request()\` for server cache semantics |
| Expect a rejected browser response to have \`response.statusCode\` | Browser rejection can prevent the response from reaching Cypress | Assert the application error state |
| Expect \`responseTimeout\` to bound response handlers | Native browser request is not governed by that old Cypress fetch | Put an explicit \`timeout\` on \`cy.wait()\` |

Before:

\`\`\`typescript
cy.intercept('/api/users', (req) => {
  expect(req.httpVersion).to.equal('1.1')
}).as('users')

cy.visit('/admin/users')
cy.wait('@users')
\`\`\`

After:

\`\`\`typescript
cy.intercept('/api/users', (req) => {
  expect(req.method).to.equal('GET')
  expect(req.headers).to.have.property('accept')
}).as('users')

cy.visit('/admin/users')
cy.wait('@users').its('response.statusCode').should('eq', 200)
cy.contains('[data-testid="users-table"]', 'Active users').should('be.visible')
\`\`\`

The new version is less clever and more meaningful. It verifies what the application requested and what the user sees. It does not lock the test to an implementation detail of the old Cypress proxy.

## Rework Env Access Before The Major Bump

\`Cypress.env()\` was deprecated in 15.10.0 and removed in 16.0.0. The replacement is not one-to-one. Sensitive values move to asynchronous \`cy.env()\`, which yields only requested keys. Public values move to synchronous \`Cypress.expose()\`, which is intentionally browser-readable. For deeper environment design, use [Cypress environments config best practices](/blog/cypress-environments-config-best-practices) alongside this migration.

| Value type | Old Cypress 15 style | Cypress 16 target | Why |
| --- | --- | --- | --- |
| API token | \`Cypress.env('API_TOKEN')\` | \`cy.env(['API_TOKEN'])\` | Avoids hydrating every env value into browser state |
| Feature flag | \`Cypress.env('NEW_CHECKOUT')\` | \`Cypress.expose('NEW_CHECKOUT')\` | Public, synchronous, and safe for browser context |
| Plugin setting | \`Cypress.env('pluginMode')\` | \`Cypress.expose('pluginMode')\` | Plugin code often needs sync access |
| Per-test toggle | \`{ env: { flow: 'guest' } }\` | \`{ expose: { flow: 'guest' } }\` | \`env\` test overrides are removed |

Before:

\`\`\`typescript
it('creates an order through the service API', () => {
  const apiToken = Cypress.env('SERVICE_API_TOKEN')

  cy.request({
    method: 'POST',
    url: '/api/orders',
    headers: { Authorization: 'Bearer ' + apiToken },
    body: { sku: 'QA-COURSE', quantity: 1 },
  }).its('status').should('eq', 201)
})
\`\`\`

After:

\`\`\`typescript
it('creates an order through the service API', () => {
  cy.env(['SERVICE_API_TOKEN']).then(({ SERVICE_API_TOKEN }) => {
    expect(Boolean(SERVICE_API_TOKEN)).to.eq(true)

    cy.request({
      method: 'POST',
      url: '/api/orders',
      headers: { Authorization: 'Bearer ' + SERVICE_API_TOKEN },
      body: { sku: 'QA-COURSE', quantity: 1 },
      log: false,
    }).then((response) => {
      expect(response.status).to.eq(201)
      expect(response.body).to.have.property('id').that.matches(/^[A-Z0-9-]+$/)
    })
  })
})
\`\`\`

Do not chain \`.its('SERVICE_API_TOKEN')\` on the yielded object. Cypress documents that \`.its()\` and \`.invoke()\` can print yielded values into console output. Keep secrets inside \`.then()\`, pass them directly to commands that need them, and assert on derived booleans or side effects instead of raw values.

## Replace cy.exec With Tasks

\`cy.exec()\` was deprecated in 15.21.0 and removed in 16.0.0. This is one of the migration changes where AI agents often generate fragile code: they replace a shell command with another shell command hidden inside \`cy.task()\`. A good migration moves logic into Node and returns structured values.

Before:

\`\`\`typescript
cy.exec('ls -t cypress/downloads | head -1')
  .its('stdout')
  .then((filename) => {
    cy.readFile('cypress/downloads/' + filename.trim()).should('contain', 'invoice')
  })
\`\`\`

After:

\`\`\`typescript
import { defineConfig } from 'cypress'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        latestDownload() {
          const downloads = config.downloadsFolder
          const files = fs
            .readdirSync(downloads)
            .map((name) => ({
              name,
              time: fs.statSync(path.join(downloads, name)).mtimeMs,
            }))
            .sort((a, b) => b.time - a.time)

          return files.length ? path.join(downloads, files[0].name) : null
        },
      })
    },
  },
})
\`\`\`

\`\`\`typescript
cy.task<string | null>('latestDownload').then((filepath) => {
  expect(filepath, 'download was created').to.be.a('string')
  cy.readFile(filepath as string).should('contain', 'invoice')
})
\`\`\`

If a task must call an external binary, use \`execFileSync\` with an argument array inside Node. That avoids shell quoting differences across macOS, Linux, and Windows runners.

## Config Keys To Delete Or Rename

Some Cypress 16 config changes are straightforward, but they are easy to miss in monorepos because teams keep one config per package. Search all packages, not only \`cypress.config.ts\` in the root.

\`\`\`bash
rg -F "Cypress.env" .
rg -F "cy.exec" .
rg -F "cy.end" .
rg -F "experimentalMemoryManagement" .
rg -F "experimentalSourceRewriting" .
rg -F "experimentalFastVisibility" .
rg -F "allowCypressEnv" .
rg -F "viewportWidth" .
rg -F "viewportHeight" .
rg -F "blockHosts" .
\`\`\`

| Search hit | Cypress 16 action |
| --- | --- |
| \`experimentalMemoryManagement: true\` | Delete it. Browser memory management is now enabled by default. |
| \`experimentalMemoryManagement: false\` | Replace with \`manageBrowserMemory: false\` only if you really need to opt out. |
| \`experimentalFastVisibility\` | Delete it. Use \`visibilityStrategy: 'legacy'\` only as a temporary escape hatch. |
| \`experimentalSourceRewriting\` | Delete it. If you used it for SRI problems, evaluate \`removeSRIAttributes\`. |
| \`allowCypressEnv\` | Delete it. \`Cypress.env()\` is gone in 16. |
| \`cy.end()\` | Delete the call. Cypress chains already end naturally. |
| \`execTimeout\` | Remove it and use \`taskTimeout\` for \`cy.task()\`. |

The modern visibility algorithm defaults on in 16. It is based on the browser's native visibility behavior and can surface tests that encoded the older algorithm rather than the user's experience. If a visibility test fails after upgrade, resist the instinct to set \`visibilityStrategy: 'legacy'\` everywhere. Inspect the element, then assert on a stable user outcome.

## Cookie And Storage Reads Now Retry

Cypress 16 turns \`cy.getCookie()\`, \`cy.getCookies()\`, \`cy.getAllCookies()\`, \`cy.getAllLocalStorage()\`, and \`cy.getAllSessionStorage()\` into retry-able query commands. That is mostly an improvement. It removes manual waits around delayed auth writes and localStorage hydration. The catch is that retries only apply to assertions chained directly with \`.should()\`. A \`.then()\` callback still runs once after the command settles.

Before:

\`\`\`typescript
cy.getCookie('session_id').then((cookie) => {
  expect(cookie).to.have.property('value', 'authenticated')
})
\`\`\`

After:

\`\`\`typescript
cy.getCookie('session_id').should('have.property', 'value', 'authenticated')
cy.getAllLocalStorage().should('have.property', 'https://app.example.test')
\`\`\`

This is a quiet but important migration for flaky authentication suites. Tests that used to fail because a cookie appeared 50 ms late may now pass without a wait. Tests that intentionally verify absence should still use \`.then()\` for a one-shot snapshot.

## CI Migration Pattern For GitHub Actions

The official Cypress GitHub Action is maintained by Cypress, and the docs recommend \`cypress-io/github-action@v7\`. Pair it with the current majors of the GitHub-maintained actions, including \`actions/checkout@v7\` and \`actions/setup-node@v7\`.

\`\`\`yaml
name: Cypress 16

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-24.04
    env:
      CYPRESS_SERVICE_API_TOKEN: \${{ secrets.SERVICE_API_TOKEN }}
      CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Node
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: Cypress run
        uses: cypress-io/github-action@v7
        with:
          browser: chrome
          build: npm run build
          start: npm start
          wait-on: http://127.0.0.1:3000
          command: npm run cy:run -- --config video=false
\`\`\`

If you record to Cypress Cloud, remember that \`CYPRESS_RECORD_KEY\` and \`CYPRESS_PROJECT_ID\` are consumed by Cypress itself as OS environment variables. Do not put those values in \`cypress.env.json\` and expect Cloud recording to work.

For broader pipeline design and artifact handling, pair this with the [Cypress GitHub Actions CI guide 2026](/blog/cypress-github-actions-ci-guide-2026). The Cypress 16-specific concern is that the first green run should cover at least one Chrome-family browser on the native network path. Running only Electron can hide the network migration.

## Component Testing Framework Upgrades

Cypress 16 raises component testing minimums. That is a separate project from end-to-end spec edits, and it should be split in your issue tracker.

| Framework path | Cypress 16 status | Migration note |
| --- | --- | --- |
| Angular 18, 19, 20 | Removed | Upgrade to Angular \`21.0.0+\` before Cypress 16 component testing |
| Angular 21 | Supported | \`cypress/angular-zoneless\` merged into \`cypress/angular\` |
| Angular 22 | Supported | Launchpad detection and schematic integration included |
| Vite 5, 6, 7 | Removed for CT dev server | Upgrade to Vite \`8.0.0+\` and matching plugins |
| Next 14 | Removed for CT | Use Next \`15.0.4+\` or \`16+\` |

This is where monorepos bite. The E2E package may be ready while a component package still pins Vite 7. Let the E2E package migrate first only if your CI jobs are separated enough to avoid partial breakage.

## Realistic Failure Mode: Chrome Hangs In CI

Symptom: after upgrading to Cypress 16.0.0, a GitHub Actions run in Chrome prints normal output for a while, then stops. The job eventually fails because the runner reaches the no-output timeout. There is no failing spec and no Cypress assertion error.

Diagnosis: Cypress 16.1.0 fixed a regression in 16.0.0 where Chrome, Chromium, or Edge could hang indefinitely mid-run. First check the exact installed version from CI logs or with \`npx cypress version\`. If it is 16.0.0, upgrade to 16.1.0 before rewriting tests.

Second diagnosis step: inspect memory. Cypress 16.1.0 also fixed server memory growth caused by service workers that held state until browser close. If your app registers service workers in test, the 16.1.0 patch is relevant even if the run does not hang.

Third step: look for specs that depend on old network metadata. If a spec fails only in Chrome and passes in Firefox, it may be seeing native network behavior. Do not blanket-enable \`forceHttp1\`. Add one focused reproduction, compare against the official native network behavior list, then update the assertion.

## Agent Workflow For A Safe Migration

Give your coding agent a bounded migration plan. Start with facts, then mechanical edits, then behavior fixes.

1. Read package files and CI workflow files. Report Cypress, Node, browser, component-testing framework, and plugin versions.
2. Upgrade Cypress to 16.1.0, but do not edit specs until \`npx cypress verify\` passes.
3. Replace \`Cypress.env()\` by classifying every key as sensitive or public.
4. Replace \`cy.exec()\` with \`cy.task()\`, returning structured values.
5. Delete \`cy.end()\` and removed config keys.
6. Run a focused smoke subset in Chrome with \`npx cypress run --browser chrome --spec "cypress/e2e/smoke/**/*.cy.ts"\`.
7. Run the full CI job with Chrome and, if you support it, Firefox.
8. Review failures by category: removed API, native network difference, visibility algorithm, timing improvement, or unrelated app regression.

Ready-made QA skills install from qaskills.sh with the qaskills CLI, which can help teams standardize this kind of migration checklist across agents. Still, the agent should never invent API names. Cypress 16 has enough real changes without hallucinated helpers.

## Frequently Asked Questions

### Is Cypress 16 safe to upgrade to now?

Yes, but target 16.1.0 rather than stopping at 16.0.0. Cypress 16.0.0 introduced the major changes, while 16.1.0 fixed a Chrome-family hang regression and service-worker memory growth. The upgrade is safest when you first confirm Node 22, 24, or 26+, then migrate off removed APIs, then run Chrome in CI so the native network path is covered.

### What is the highest-risk Cypress 16 breaking change?

For most mature suites, the highest-risk change is the removal of \`Cypress.env()\`, because it touches secrets, plugins, support files, and per-test overrides. Network assertions are also important, but they tend to fail loudly. A hidden env migration mistake can leak values into logs or turn a public feature flag into an asynchronous command-chain problem.

### Should I set forceHttp1 to keep old behavior?

Use \`forceHttp1\` only as a temporary diagnostic tool. Cypress introduced and deprecated it in the same major release, so it is not a durable fix. If setting it makes a failure disappear, compare the failure with the documented native network differences, then update the assertion. Keep a ticket to remove the option if you must use it briefly.

### Do Cypress 16 changes affect Firefox and WebKit?

Some changes affect every browser, including removed APIs, Node requirements, env migration, config removals, and query behavior for cookies and storage. The native browser network path affects Chrome, Chromium, and Edge by default. Firefox, WebKit, and Electron continue to use the legacy network path, so network metadata differences can appear browser-specific.
`,
};
