import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'JavaScript Testing in 2026: The Complete Guide (Mocha, Chai, Playwright, Vitest, BDD)',
  description: 'A complete 2026 guide to JavaScript testing: Mocha and Chai, Vitest and Jest, Playwright, and BDD with Cucumber. Setup, assertions, mocking, async, and how to choose.',
  date: '2026-07-16',
  category: 'Guide',
  content: `
# JavaScript Testing in 2026: The Complete Guide (Mocha, Chai, Playwright, Vitest, BDD)

The practical default JavaScript testing stack in 2026 is **Vitest for unit and integration tests in Vite-based applications, plus Playwright for end-to-end browser tests**. Vitest reuses Vite's transformation pipeline and includes assertions, mocks, snapshots, and coverage integration. Playwright adds isolated browser contexts, web-first assertions, tracing, and one API for Chromium, Firefox, and WebKit. Together they provide fast code-level feedback and browser-level confidence.

That default is not a mandate. Choose **Mocha with Chai** for a composable Node.js stack or a mature Mocha suite. Keep **Jest** when presets, custom matchers, snapshots, or migration cost favor it. Choose **Cypress** for its interactive browser workflow and component testing model. Add **Cucumber.js** only when product, QA, and engineering genuinely collaborate on Gherkin scenarios. Cucumber is an executable-specification layer, not a replacement for a unit runner or browser driver.

The right stack therefore depends less on which tool is newest and more on where a test runs, what failure it should localize, and who must understand it. Most teams need two primary runners, one for fast code-level checks and one for browser-level confidence. A third runner is justified only by a distinct job, such as real-browser component tests or business-readable acceptance specifications.

## The 2026 JavaScript testing landscape

JavaScript testing is a set of layers, not one competition between runners. Unit tests execute small pieces of logic with controlled dependencies. Integration tests check real modules or service boundaries. Component tests render UI components with DOM or browser behavior. End-to-end tests drive an assembled application as a user would. BDD crosses these layers when teams express behavior as shared examples.

| Tool | Layer | Best for | Runner/assertion model |
|---|---|---|---|
| Vitest | Unit, integration, lightweight component | Vite, ESM, TypeScript, and teams wanting fast watch feedback with an integrated toolset | Test runner with built-in \`expect\`, snapshots, \`vi.fn\`, \`vi.spyOn\`, and \`vi.mock\`; uses Vite-powered transformation |
| Mocha + Chai | Unit and integration | Node.js services, mature Mocha suites, and teams that prefer a modular stack | Mocha supplies suites, tests, hooks, async execution, and reporting; Chai separately supplies \`expect\`, \`should\`, and \`assert\` styles |
| Jest | Unit, integration, component | Existing Jest ecosystems, framework presets, extensive snapshot suites, and Jest-specific plugins or matchers | Integrated runner, assertions, mocks, snapshots, and coverage workflow |
| Playwright | End-to-end, browser integration, API-assisted UI setup | Cross-browser user journeys, isolated parallel tests, downloads, uploads, and multi-page workflows | Playwright Test combines runner, fixtures, locators, auto-waiting assertions, tracing, and Chromium, Firefox, and WebKit projects |
| Cypress | Component and end-to-end | Interactive browser debugging, time-travel-style command inspection, and real-browser component mounting | Cypress runner provides its command queue, assertions, retries, browser UI, and framework adapters for component mounting |
| Cucumber.js | BDD and acceptance specifications | Shared examples that non-developers actively discuss and review | Cucumber executes Gherkin scenarios by matching steps to JavaScript or TypeScript step definitions; assertions and system drivers come from the chosen libraries |

### Unit tests: put speed and diagnostic precision first

Unit suites should run frequently, remain deterministic, and identify a narrow cause when they fail. Vitest fits Vite applications because source code and tests can share module resolution, aliases, transforms, and plugins. Its API is familiar to Jest users, but extensions and mocking edge cases still require migration review. \`vi.mock\` is hoisted, and \`vi.hoisted\` creates values a mock factory must access before imports execute. Official guidance is at https://vitest.dev/.

This complete Vitest example can be saved as \`price.test.ts\` and run with \`npx vitest run\` after installing Vitest:

\`\`\`ts
import { describe, expect, it } from 'vitest'

function total(cents: number[], taxRate: number): number {
  const subtotal = cents.reduce((sum, price) => sum + price, 0)
  return Math.round(subtotal * (1 + taxRate))
}

describe('total', () => {
  it('adds tax and rounds to the nearest cent', () => {
    expect(total([1_999, 501], 0.18)).toBe(2_950)
  })
})
\`\`\`

Mocha remains valuable because it does not force an assertion or mocking library on the project. Mocha provides \`describe\`, \`it\`, \`before\`, \`after\`, \`beforeEach\`, and \`afterEach\`; it supports promises, \`async\` functions, and the \`done\` callback for callback-based APIs. Chai provides three assertion interfaces: \`expect\` and \`should\` are BDD styles, while \`assert\` is a TDD style. Chai as Promised extends Chai for promise assertions. Do not return a promise and also call \`done\` in the same test, because a test should use one asynchronous completion mechanism.

\`\`\`js
// test/cart.test.mjs
import { strict as nodeAssert } from 'node:assert'
import { describe, it } from 'mocha'
import { expect } from 'chai'

async function loadCart() {
  return { items: [{ sku: 'book', quantity: 2 }] }
}

describe('loadCart', () => {
  it('returns item quantities', async () => {
    const cart = await loadCart()

    expect(cart.items).to.have.lengthOf(1)
    nodeAssert.equal(cart.items[0].quantity, 2)
  })
})
\`\`\`

Run it with \`npx mocha "test/**/*.test.mjs"\`. In a real project, standardize on one Chai style rather than mixing it with Node assertions as the demonstration does. Add \`c8\` or \`nyc\` when a Mocha suite needs coverage. Mocha itself does not generate coverage, and Chai itself does not run tests.

### Integration and component tests: choose the environment deliberately

Integration tests should use real collaborators where doing so is fast and controlled. A Node API can use Mocha or Vitest with \`supertest\` to send requests directly to an application object. Replace a repository, queue, or third-party API at its boundary when necessary, but mocking every internal module turns the check back into a unit test.

For UI components, decide whether the test needs a simulated DOM or a real browser. Vitest with a DOM environment and a framework testing library covers rendering, events, accessible queries, and state changes. Cypress Component Testing mounts supported framework components in a real browser, useful for CSS, layout-sensitive behavior, and browser APIs. Teams can use Vitest broadly and reserve real-browser component tests for riskier widgets.

### End-to-end tests: verify valuable journeys, not every branch

Playwright is the strongest general default for new end-to-end suites that require cross-browser coverage. Its locators such as \`page.getByRole()\`, \`page.getByText()\`, and \`page.getByTestId()\` are designed around stable user-facing or explicit testing contracts. Actions wait for elements to become actionable, and locator assertions retry until their condition succeeds or times out. Each test receives an isolated browser context by default. Install the package, then install the required browser binaries with \`npx playwright install\`; CI environments may also need the documented operating-system dependencies. See https://playwright.dev/docs/intro.

\`\`\`ts
import { test, expect } from '@playwright/test'

test('example domain exposes its documentation link', async ({ page }) => {
  await page.goto('https://example.com/')

  await expect(
    page.getByRole('heading', { name: 'Example Domain' })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'More information...' }))
    .toHaveAttribute('href', 'https://iana.org/domains/example')
})
\`\`\`

Cypress remains sound when the team values its in-browser runner, command log, component support, or existing abstractions. Avoid equivalent Playwright and Cypress suites indefinitely. During migration, assign ownership by feature or layer and set a retirement condition for the old suite.

### BDD: use Gherkin when the conversation is real

Mocha's BDD interface and Chai's BDD assertions are naming conventions for code structure. Full BDD with Cucumber.js is different: a \`.feature\` file captures examples in Gherkin, step definitions connect those sentences to code, and a World provides scenario-specific context. Cucumber creates a new World for each scenario, which helps prevent state leakage. The browser driver can still be Playwright, and assertions can come from Node or Chai.

\`\`\`gherkin
Feature: Shipping eligibility

  Scenario: Order reaches the free-shipping threshold
    Given my order total is 5000 cents
    When shipping eligibility is calculated
    Then shipping should be free
\`\`\`

\`\`\`js
import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

Given('my order total is {int} cents', function (total) {
  this.orderTotal = total
})

When('shipping eligibility is calculated', function () {
  this.freeShipping = this.orderTotal >= 5000
})

Then('shipping should be free', function () {
  assert.equal(this.freeShipping, true)
})
\`\`\`

If only automation engineers read the scenarios, ordinary test code is often clearer, easier to refactor, and cheaper to maintain. Cucumber earns its extra indirection when examples improve discovery and shared understanding before implementation, not merely when a report needs Given, When, Then wording. Official Cucumber documentation is at https://cucumber.io/docs/.

## How to choose your testing stack

Start with the repository rather than a popularity chart. Record its module system, build tool, UI framework, Node.js range, current runners, CI duration, browser matrix, and highest-risk journeys. Then choose the smallest stack that covers those constraints.

1. **For a greenfield Vite application**, begin with Vitest for unit and integration tests and Playwright for a small end-to-end suite. Add a framework testing library for component behavior. Add Cypress Component Testing only if real-browser component inspection solves a concrete need that the existing layers do not.

2. **For a greenfield Node.js service without Vite**, Vitest offers an integrated runner with TypeScript and ESM ergonomics. Mocha plus Chai fits when modularity, existing helpers, or control over assertions and coverage matters. Use \`supertest\` for HTTP integration and a few Playwright tests if a browser-facing system surrounds the service.

3. **For an established Jest codebase**, measure before migrating. Inventory custom environments, manual mocks, fake timers, snapshot serializers, presets, and CI behavior. Run a representative slice under Vitest and compare correctness, watch performance, cold CI time, and effort. The detailed [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) helps frame that evaluation. Migrate only when ongoing simplification or speed exceeds conversion cost and compatibility risk.

4. **When end-to-end confidence is the priority**, select Playwright for first-class Chromium, Firefox, and WebKit projects, isolated contexts, trace-based debugging, and parallel execution. Select Cypress when its interactive workflow, existing plugins, or component runner better matches the team's daily work. In either case, automate a thin set of revenue, authentication, permissions, data-loss, and critical integration paths. Push validation permutations and calculation branches down to unit or integration tests.

5. **When product stakeholders request BDD**, first run an example-mapping or specification workshop. If the resulting Gherkin will be reviewed as shared documentation, Cucumber.js can connect it to Playwright, API clients, or domain code. If stakeholders will not maintain or discuss the scenarios, keep executable tests in the underlying runner and write concise acceptance criteria separately.

A sensible greenfield command surface is intentionally small:

\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
\`\`\`

This simplicity also matters when AI coding agents contribute tests. Give the agent one canonical unit runner, one browser runner, stable scripts, a checked-in configuration, and examples of preferred assertion and locator styles. Ask it to run the narrow test first, then the relevant suite. Review generated tests for false-positive assertions, excessive mocks, implementation-detail selectors, shared state, and arbitrary sleeps. An agent can accelerate test creation, but the team still owns the risk model: which failures matter, which layer should detect them, and what evidence makes a test trustworthy.

## Setting up Mocha and Chai

Mocha is the test *runner*: it discovers files, runs suites, reports pass/fail, and controls hooks and timeouts. Chai is the *assertion library*: readable \`expect\`, \`should\`, or \`assert\` checks. They ship as separate packages on purpose. That split is why Mocha still sits under so much legacy and greenfield JavaScript work in 2026: you can keep Mocha while swapping assertions, or keep Chai when you migrate runners (see the [Mocha to Jest migration guide](/blog/mocha-to-jest-migration-guide)).

### Install

\`\`\`bash
npm install --save-dev mocha chai
\`\`\`

\`\`\`json
{
  "scripts": {
    "test": "mocha",
    "test:watch": "mocha --watch"
  }
}
\`\`\`

By default Mocha looks for \`test/*.js\` (and related patterns). For TypeScript you compile first or use a loader; plain CJS/ESM projects can start with the defaults.

### Minimal first test

\`test/math.test.js\` (CommonJS):

\`\`\`js
const { expect } = require('chai');

function add(a, b) {
  return a + b;
}

describe('add', function () {
  it('sums two numbers', function () {
    expect(add(2, 3)).to.equal(5);
  });
});
\`\`\`

\`\`\`bash
npx mocha
\`\`\`

With \`"type": "module"\`, switch to \`import { expect } from 'chai'\` and the same \`describe\`/\`it\` body.

### \`.mocharc\` configuration

Prefer a config file over a long CLI string. Mocha loads \`.mocharc.json\`, \`.mocharc.js\`, \`.mocharc.yml\`, or a \`"mocha"\` key in \`package.json\`. Example \`.mocharc.json\`:

\`\`\`json
{
  "spec": ["test/**/*.test.js"],
  "timeout": 5000,
  "recursive": true,
  "require": ["./test/setup.js"],
  "reporter": "spec"
}
\`\`\`

| Option | Role |
| --- | --- |
| \`spec\` | Glob(s) for test files |
| \`timeout\` | Default per-test timeout in ms (default is 2000) |
| \`recursive\` | Search nested directories under the test root |
| \`require\` | Modules loaded before tests (setup, loaders, chai plugins) |
| \`reporter\` | Output style (\`spec\`, \`dot\`, \`json\`, and others) |

CLI flags map to the same names: \`mocha --timeout 10000 --require ./test/setup.js\`. Config is the durable baseline; flags override for one-off runs.

A typical \`test/setup.js\`:

\`\`\`js
const chai = require('chai');

// Optional: chai.should() for should-style globally
global.expect = chai.expect;
\`\`\`

Many teams still prefer \`const { expect } = require('chai')\` per file so dependencies stay obvious to static analysis and AI agents.

### \`describe\` / \`it\` structure

- \`describe(title, fn)\`: a suite. Can nest. Groups related cases and shares hooks.
- \`it(title, fn)\`: a single test case (alias: \`specify\`).
- \`describe.only\` / \`it.only\`: run just this suite or test (local debug; do not leave in CI).
- \`describe.skip\` / \`it.skip\`: pending; reported but not executed.

Nested suites keep large modules readable:

\`\`\`js
const { expect } = require('chai');
const { UserService } = require('../src/user-service');

describe('UserService', function () {
  describe('create', function () {
    it('rejects empty email', function () {
      expect(() => UserService.create({ email: '' })).to.throw(/email/i);
    });

    it('returns a user with an id', function () {
      const user = UserService.create({ email: 'a@b.com' });
      expect(user).to.have.property('id');
    });
  });

  describe('findById', function () {
    it('returns null for unknown ids', function () {
      expect(UserService.findById('missing')).to.equal(null);
    });
  });
});
\`\`\`

Mocha's BDD interface (\`describe\`/\`it\`) is the default. TDD (\`suite\`/\`test\`) also exists; stick to BDD unless the repo already standardized on TDD names. For project layout and CI wiring beyond this section, see the [Mocha and Chai testing guide](/blog/mocha-chai-testing-guide).

## Mocha hooks: before, after, beforeEach, afterEach

Hooks run fixture code around suites and tests. Mis-ordered hooks are a top source of order-dependent flakes: shared DB rows, open sockets, and mutated module state.

### The four hooks

| Hook | When it runs | Typical use |
| --- | --- | --- |
| \`before(fn)\` | Once, before any \`it\` in this suite (after outer \`before\`s) | Connect DB, start server, load heavy fixtures |
| \`after(fn)\` | Once, after all \`it\`s in this suite finish | Close connections, stop server, drop temp data |
| \`beforeEach(fn)\` | Before every \`it\` in this suite | Fresh stubs, reset mocks, seed one row per test |
| \`afterEach(fn)\` | After every \`it\` in this suite | Restore spies, clear caches, roll back transactions |

All four accept a sync function, an \`async\` function, a function that returns a Promise, or a function that takes a \`done\` callback (same async rules as \`it\`).

### Execution order with nesting

Outer suite hooks wrap inner ones. Rough order for a nested tree:

1. Root \`before\`
2. Child \`before\`
3. Root \`beforeEach\`
4. Child \`beforeEach\`
5. \`it\` body
6. Child \`afterEach\`
7. Root \`afterEach\`
8. (repeat 3-7 for the next sibling test in the child suite)
9. Child \`after\`
10. Root \`after\`

Both before-all hooks (root then child) run once up front, then the beforeEach chain runs outer-to-inner around every individual test.

\`\`\`js
describe('order demo', function () {
  before(function () { /* root before */ });
  beforeEach(function () { /* root beforeEach */ });
  afterEach(function () { /* root afterEach */ });
  after(function () { /* root after */ });

  describe('nested', function () {
    before(function () { /* nested before */ });
    beforeEach(function () { /* nested beforeEach */ });
    afterEach(function () { /* nested afterEach */ });
    after(function () { /* nested after */ });

    it('A', function () {});
    it('B', function () {});
  });
});
\`\`\`

Sequence for that tree: root before -> nested before -> root beforeEach -> nested beforeEach -> test A -> nested afterEach -> root afterEach -> (repeat beforeEach path for B) -> nested after -> root after.

### Per-suite vs per-test setup

- **Per-suite (\`before\` / \`after\`)**: expensive shared resources (one HTTP server, one DB container). Risk: tests share mutable state if you do not isolate writes.
- **Per-test (\`beforeEach\` / \`afterEach\`)**: isolation (new sandbox, new transaction, reset \`process.env\`). Cost: slower suite. Prefer this when failures are order-dependent.

Shared server with clean state per test:

\`\`\`js
const { expect } = require('chai');
const { createApp } = require('../src/app');

describe('GET /health', function () {
  let app;
  let server;

  before(async function () {
    app = await createApp();
    server = app.listen(0);
  });

  after(function (done) {
    server.close(done);
  });

  beforeEach(async function () {
    await app.db.truncateAll();
  });

  it('returns ok', async function () {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).to.equal(200);
  });
});
\`\`\`

If a suite's \`before\` fails, Mocha skips that suite's tests and does not run that same suite's \`after\` hook (its setup never completed), though \`after\` hooks in ancestor suites still run. Keep hooks small and fail loud: assert that the DB URL exists in \`before\` rather than discovering \`undefined\` inside the tenth \`it\`.

Avoid arrow functions for tests and hooks that rely on Mocha's \`this\` (for example \`this.timeout(10000)\`). Use \`function () {}\` so Mocha can bind the test context.

## Testing async code with Mocha and Chai

Mocha treats a test as async in three supported ways. Pick **one** style per test; mixing \`done\` with a returned promise is a classic double-settle bug.

### 1. \`async\` / \`await\` (preferred)

\`\`\`js
const { expect } = require('chai');
const { fetchUser } = require('../src/users');

describe('fetchUser', function () {
  it('loads a user by id', async function () {
    const user = await fetchUser('u_1');
    expect(user.email).to.equal('a@b.com');
  });
});
\`\`\`

If the promise rejects and you did not catch it, Mocha fails the test with that rejection.

### 2. Return a promise

\`\`\`js
it('loads a user by id', function () {
  return fetchUser('u_1').then((user) => {
    expect(user.email).to.equal('a@b.com');
  });
});
\`\`\`

Returning the promise is required. Without \`return\`, Mocha may finish before the assertion runs and mark the test green incorrectly.

### 3. \`done\` callback

\`\`\`js
it('loads a user by id', function (done) {
  fetchUser('u_1')
    .then((user) => {
      expect(user.email).to.equal('a@b.com');
      done();
    })
    .catch(done);
});
\`\`\`

Rules for \`done\`:

- Call \`done()\` exactly once on success.
- Call \`done(err)\` on failure so Mocha sees the error.
- Do not use \`done\` and also return a promise from the same test.
- Declare \`done\` as a parameter; Mocha only waits when it detects the arity.

### Asserting rejections

Plain \`async\` without plugins:

\`\`\`js
it('rejects on missing id', async function () {
  try {
    await fetchUser('');
    expect.fail('should have thrown');
  } catch (err) {
    expect(err).to.have.property('code', 'EINVAL');
  }
});
\`\`\`

With chai-as-promised (next section):

\`\`\`js
it('rejects on missing id', async function () {
  await expect(fetchUser('')).to.be.rejected;
});
\`\`\`

### Timeout pitfalls

Default timeout is **2000 ms** per test (and per hook).

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| \`Error: Timeout of 2000ms exceeded\` | Real work is slow or hung | Raise timeout or fix the hang |
| Timeout with no assertion failure | Forgot \`done()\` or forgot to \`return\`/\`await\` a promise | Fix the async contract |
| Flaky timeout in CI only | Shared runner load, cold DB | Higher \`timeout\`; retries only as last resort |
| Timeout after test "finished" | Background timer or open handle | Clear intervals; close servers in \`after\` |

Per-test:

\`\`\`js
it('imports a large fixture', async function () {
  this.timeout(15000);
  const data = await loadBigFixture();
  expect(data).to.have.lengthOf.above(1000);
});
\`\`\`

Per-suite:

\`\`\`js
describe('slow integration', function () {
  this.timeout(20000);

  it('...', async function () { /* ... */ });
});
\`\`\`

CLI / config: \`"timeout": 10000\` in \`.mocharc.json\`, or \`mocha --timeout 10000\`. \`this.timeout(0)\` disables the timeout for long diagnostics; do not ship \`0\` as a global default or hung tests sit until the job is killed externally.

## The Chai assertions cheat sheet

Chai exposes three styles for the same ideas. Pick one per project and stay consistent so reviews and AI-generated tests do not thrash styles.

### Enabling each style

\`\`\`js
const chai = require('chai');
const expect = chai.expect;  // BDD expect
const assert = chai.assert;  // TDD assert
chai.should();               // BDD should (extends Object.prototype)
\`\`\`

- **\`expect\`**: \`expect(value).to.equal(3)\`. Most common in modern codebases.
- **\`should\`**: \`value.should.equal(3)\`. Fluent, but pollutes \`Object.prototype\` and is awkward for \`undefined\`/\`null\` subjects.
- **\`assert\`**: \`assert.equal(value, 3)\`. Familiar to Node \`assert\` users; less chainable language.

### Side-by-side reference

| Intent | \`expect\` | \`should\` | \`assert\` |
| --- | --- | --- | --- |
| Strict equality (\`===\`) | \`expect(x).to.equal(y)\` | \`x.should.equal(y)\` | \`assert.strictEqual(x, y)\` (note: \`assert.equal\` is loose \`==\`) |
| Deep equality | \`expect(x).to.deep.equal(y)\` | \`x.should.deep.equal(y)\` | \`assert.deepEqual(x, y)\` |
| Include item / substring | \`expect(arr).to.include(1)\` / \`expect(str).to.include('a')\` | \`arr.should.include(1)\` | \`assert.include(arr, 1)\` |
| Throw (sync fn) | \`expect(fn).to.throw()\` / \`.throw(TypeError)\` / \`.throw(/msg/)\` | \`fn.should.throw(TypeError)\` | \`assert.throws(fn, TypeError)\` |
| Exist (not \`null\`/\`undefined\`) | \`expect(x).to.exist\` | \`should.exist(x)\` | \`assert.exists(x)\` |
| Length | \`expect(x).to.have.lengthOf(3)\` | \`x.should.have.lengthOf(3)\` | \`assert.lengthOf(x, 3)\` |
| Property | \`expect(o).to.have.property('a')\` / \`.property('a', 1)\` | \`o.should.have.property('a')\` | \`assert.property(o, 'a')\` / \`assert.propertyVal(o, 'a', 1)\` |

Notes that bite in real suites:

- Prefer \`equal\` for primitives and \`deep.equal\` for objects/arrays. \`expect({ a: 1 }).to.equal({ a: 1 })\` fails because they are different references.
- \`include\` on objects can check a property subset: \`expect(obj).to.include({ a: 1 })\`.
- \`throw\` needs a **function** wrapper: \`expect(() => parse('bad')).to.throw()\`, not \`expect(parse('bad')).to.throw()\`.
- \`exist\` is a terminal property in expect/should style: \`expect(x).to.exist\` (no \`()\`). Assert style is \`assert.exists(x)\`.
- Chain helpers (\`to\`, \`be\`, \`and\`, \`have\`, \`that\`, ...) are mostly syntactic sugar for readability.

### Worked examples

\`\`\`js
const { expect, assert } = require('chai');

describe('Chai styles', function () {
  const user = { id: 1, roles: ['admin', 'editor'], meta: { active: true } };

  it('expect style', function () {
    expect(user.id).to.equal(1);
    expect(user.roles).to.include('admin').and.have.lengthOf(2);
    expect(user).to.have.property('meta').that.has.property('active', true);
    expect(user.email).to.not.exist;
    expect(() => JSON.parse('not-json')).to.throw(SyntaxError);
  });

  it('assert style', function () {
    assert.strictEqual(user.id, 1);
    assert.deepEqual(user.roles, ['admin', 'editor']);
    assert.include(user.roles, 'editor');
    assert.lengthOf(user.roles, 2);
    assert.propertyVal(user.meta, 'active', true);
    assert.throws(() => JSON.parse('not-json'), SyntaxError);
  });
});
\`\`\`

Negation and custom messages: \`expect(list).to.not.be.empty\`, \`expect(fn).to.not.throw()\`, \`expect(x, 'retry count').to.equal(3)\`.

## chai-as-promised: asserting on promises

[chai-as-promised](https://www.chaijs.com/plugins/chai-as-promised/) extends Chai so you can assert on fulfillment and rejection without boilerplate \`try/catch\`.

### Setup

\`\`\`bash
npm install --save-dev chai-as-promised
\`\`\`

\`\`\`js
// test/setup.js
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
module.exports = { expect: chai.expect };
\`\`\`

Wire it from \`.mocharc.json\`:

\`\`\`json
{
  "require": ["./test/setup.js"]
}
\`\`\`

ESM:

\`\`\`js
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const { expect } = chai;
\`\`\`

With Mocha, **return or await** the assertion promise so the runner waits:

\`\`\`js
const { expect } = require('chai');
const { fetchUser, deleteUser } = require('../src/users');

describe('users async', function () {
  it('fulfills with a user', function () {
    return expect(fetchUser('u_1')).to.eventually.deep.equal({
      id: 'u_1',
      email: 'a@b.com',
    });
  });

  it('same with async/await', async function () {
    await expect(fetchUser('u_1')).to.eventually.have.property('email');
  });

  it('rejects with a typed error', async function () {
    await expect(deleteUser('')).to.be.rejectedWith(Error, /id/i);
  });

  it('rejects (any reason)', async function () {
    await expect(deleteUser('missing')).to.be.rejected;
  });
});
\`\`\`

### Core vocabulary

| Assertion | Meaning |
| --- | --- |
| \`.eventually\` | Wait for fulfillment, then apply the following Chai assertion to the resolved value |
| \`.become(value)\` | Sugar for \`.eventually.deep.equal(value)\` |
| \`.rejected\` | Promise must reject |
| \`.rejectedWith(errorLike)\` | Reject with matching Error type, message string, or regex (mirrors \`throw\`) |
| \`.fulfilled\` | Promise must fulfill |

\`\`\`js
await expect(Promise.resolve(4)).to.eventually.equal(4);
await expect(Promise.resolve({ a: 1 })).to.become({ a: 1 });
await expect(Promise.reject(new TypeError('bad'))).to.be.rejectedWith(TypeError);
await expect(Promise.reject(new Error('nope'))).to.be.rejectedWith(/no/);
\`\`\`

### Common mistakes

1. **Forgetting to await/return** the chai-as-promised chain (false greens or unhandled rejections).
2. **Using \`.eventually\` on a rejection path**. Prefer \`.rejected\` / \`.rejectedWith\`.
3. **Racing multiple assertions** without \`await\` on each chain.
4. **Passing a non-thenable**. The plugin expects a promise (or thenable).

Mocha can wait on returned promises, so prefer \`return\`/\`await\` over chai-as-promised's \`notify(done)\` helper (that helper is for runners that cannot wait on promises).

## Measuring Mocha coverage with c8 and nyc

Mocha does not ship code coverage. You wrap the \`mocha\` process with a coverage tool. The two names you will still see in 2026 are **c8** (V8 built-in coverage) and **nyc** (Istanbul instrumenter).

### c8 (V8 native)

\`\`\`bash
npm install --save-dev c8
\`\`\`

\`\`\`json
{
  "scripts": {
    "test": "mocha",
    "test:coverage": "c8 mocha"
  }
}
\`\`\`

\`\`\`bash
npx c8 mocha
npx c8 --reporter text --reporter html mocha
\`\`\`

c8 uses Node's built-in V8 coverage. No separate instrument step for plain JS. HTML output typically lands under \`coverage/\`. Check \`c8 --help\` on your installed version for include/exclude globs and threshold flags.

\`\`\`json
{
  "scripts": {
    "test:coverage": "c8 --check-coverage --lines 80 --functions 80 --branches 70 mocha"
  }
}
\`\`\`

### nyc (Istanbul)

\`\`\`bash
npm install --save-dev nyc
\`\`\`

\`\`\`json
{
  "scripts": {
    "test:coverage": "nyc mocha"
  }
}
\`\`\`

\`\`\`bash
npx nyc mocha
npx nyc --reporter=text --reporter=lcov mocha
\`\`\`

Configuration often lives in \`package.json\` under \`"nyc"\` or in \`.nycrc\` / \`.nycrc.json\`:

\`\`\`json
{
  "nyc": {
    "all": true,
    "include": ["src/**/*.js"],
    "exclude": ["test/**", "**/*.test.js"],
    "reporter": ["text", "lcov"],
    "check-coverage": true,
    "lines": 80
  }
}
\`\`\`

\`nyc mocha\` instruments files as they load, then runs Mocha. That model still fits existing Istanbul configs and older transpilation paths.

### c8 vs nyc

| Topic | c8 | nyc |
| --- | --- | --- |
| Engine | V8 built-in coverage | Istanbul instrumentation |
| Speed | Often faster (no rewrite of every file) | Extra instrument step |
| Setup with Mocha | \`c8 mocha\` | \`nyc mocha\` |
| Config | CLI / c8 config conventions | \`"nyc"\` in package.json, \`.nycrc\` |
| Reports | Istanbul-compatible reporters (text, html, lcov, ...) | Same reporter family |
| Best fit | Modern Node, plain JS/TS via loaders | Existing Istanbul configs, legacy toolchains |
| Maintenance signal | Common default for new Node services | Mature; still common in older repos |

### What to measure and CI

Unit-heavy \`src/\` can take high line/branch targets. Exclude generated clients. Integration-only runs can paint large files green without proving edge cases; combine unit + integration under one wrapper when you need a single badge.

\`\`\`bash
npx c8 --reporter lcov --reporter text npm test
\`\`\`

Keep \`coverage/\` out of git. Practical defaults: start with **c8** on modern Node unless nyc is already wired; put \`"test:coverage"\` next to \`"test"\`; enforce thresholds only after the suite is stable. When you move runners later, coverage tools are largely portable (see the [Mocha to Jest migration guide](/blog/mocha-to-jest-migration-guide)). For deeper project structure and CI matrix tips, use the [Mocha and Chai testing guide](/blog/mocha-chai-testing-guide).

## Vitest mocking: vi.mock, vi.fn, and vi.spyOn

Vitest deliberately mirrors much of Jest's assertion and mocking vocabulary, but the three main mocking primitives solve different problems. Choosing the narrowest one keeps a test honest: use a function fake when you control the dependency, a spy when you need to observe an existing object, and a module mock when an imported dependency must be replaced before the system under test loads.

| Primitive | Replaces | Calls the original by default? | Best fit | Cleanup concern |
|---|---|---:|---|---|
| \`vi.fn()\` | A function you create | No | Dependency injection, callbacks, small stubs | Clear or reset call history between tests |
| \`vi.spyOn(object, key)\` | One method or getter on an object | Yes | Observe a real method, or temporarily override it | Call \`mockRestore()\`, or enable \`restoreMocks\` |
| \`vi.mock(path, factory)\` | An imported module | Depends on the factory | Prevent network, filesystem, clock, or SDK code from loading | Hoisting and module cache behavior matter |

A **mock** usually includes both programmed behavior and call assertions. A **stub** is focused on replacing behavior, such as returning a fixed exchange rate. A **spy** records how an existing function was called. In Vitest, \`vi.fn()\` can act as either a stub or mock, depending on whether the test asserts its calls.

This test injects a plain function fake. There is no module rewriting, so the dependency relationship stays visible:

\`\`\`ts
// src/price.ts
export type TaxLookup = (country: string) => Promise<number>

export async function totalWithTax(
  subtotal: number,
  country: string,
  lookupTax: TaxLookup,
): Promise<number> {
  const rate = await lookupTax(country)
  return subtotal * (1 + rate)
}
\`\`\`

\`\`\`ts
// src/price.test.ts
import { describe, expect, it, vi } from 'vitest'
import { totalWithTax } from './price'

describe('totalWithTax', () => {
  it('applies the rate returned by the tax service', async () => {
    const lookupTax = vi.fn().mockResolvedValue(0.18)

    await expect(totalWithTax(100, 'IN', lookupTax)).resolves.toBe(118)
    expect(lookupTax).toHaveBeenCalledOnce()
    expect(lookupTax).toHaveBeenCalledWith('IN')
  })
})
\`\`\`

Use \`vi.spyOn\` when the production code already calls a method on an object. A spy invokes the original implementation unless you add \`mockReturnValue\`, \`mockResolvedValue\`, or \`mockImplementation\`. Restore it after the assertion so another test does not inherit the override:

\`\`\`ts
import { afterEach, expect, it, vi } from 'vitest'

const audit = {
  async record(_entry: { event: string; sku: string }): Promise<void> {},
}

async function createOrder(input: { sku: string; quantity: number }) {
  await audit.record({ event: 'order.created', sku: input.sku })
  return { id: 'order-1', ...input }
}

afterEach(() => vi.restoreAllMocks())

it('records the created order', async () => {
  const auditSpy = vi.spyOn(audit, 'record').mockResolvedValue(undefined)

  await createOrder({ sku: 'PW-101', quantity: 2 })

  expect(auditSpy).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'order.created', sku: 'PW-101' }),
  )
})
\`\`\`

\`vi.mock\` replaces module exports for the test file. The factory must return an object whose keys match the module's exports. For an ES module default export, include a \`default\` key. The imported function can then be typed as a mock with \`vi.mocked\`:

\`\`\`ts
// src/tax-client.ts
export async function getTaxRate(country: string): Promise<number> {
  const response = await fetch(\`https://tax.example/rates/\${country}\`)
  const body = (await response.json()) as { rate: number }
  return body.rate
}

// src/checkout.ts
import { getTaxRate } from './tax-client'

export async function checkoutTotal(subtotal: number, country: string) {
  return subtotal * (1 + await getTaxRate(country))
}
\`\`\`

\`\`\`ts
import { beforeEach, expect, it, vi } from 'vitest'
import { getTaxRate } from './tax-client'
import { checkoutTotal } from './checkout'

vi.mock('./tax-client', () => ({
  getTaxRate: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getTaxRate).mockReset()
})

it('calculates checkout without calling the real tax API', async () => {
  vi.mocked(getTaxRate).mockResolvedValue(0.2)

  await expect(checkoutTotal(50, 'GB')).resolves.toBe(60)
  expect(getTaxRate).toHaveBeenCalledWith('GB')
})
\`\`\`

Full module replacement can erase useful pure functions. A partial mock retains the real exports and replaces only the boundary that would perform I/O. \`vi.importActual\` bypasses the mock registry for that import:

\`\`\`ts
// src/currency.ts
export function convert(amount: number, _from: string, _to: string): number {
  return amount
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}
\`\`\`

\`\`\`ts
import { expect, it, vi } from 'vitest'
import { convert, formatCurrency } from './currency'

vi.mock('./currency', async () => {
  const actual = await vi.importActual<typeof import('./currency')>('./currency')
  return {
    ...actual,
    convert: vi.fn().mockReturnValue(83.25),
  }
})

it('keeps the formatter real while replacing conversion', () => {
  expect(convert(1, 'USD', 'INR')).toBe(83.25)
  expect(formatCurrency(83.25, 'INR')).toContain('83.25')
})
\`\`\`

Prefer dependency injection or \`vi.spyOn\` for a single replaceable function. Reserve \`vi.mock\` for true module boundaries. Module mocks are powerful, but they couple tests to import paths and module-loading order.

## vi.hoisted: fixing the hoisting trap

Vitest must register a module mock before the mocked module is evaluated. When a test contains \`vi.mock\`, Vitest statically transforms the file, moves the mock registration ahead of static imports, and preserves the imports through its module runner. That behavior makes this apparently reasonable code fail:

\`\`\`ts
import { vi } from 'vitest'

const fetchRateMock = vi.fn()

vi.mock('./fx-client', () => ({
  fetchRate: fetchRateMock,
}))
\`\`\`

The factory executes before the normal top-level initialization of \`fetchRateMock\`, so the variable is not ready. Moving the declaration above \`vi.mock\` in source text does not fix the transformed execution order.

\`vi.hoisted\` creates values during the same early phase as the hoisted mock and returns them to the test's scope. It is the right tool when the factory and later assertions need the same fake:

\`\`\`ts
import { beforeEach, expect, it, vi } from 'vitest'
import { priceInCurrency } from './pricing-service'

const mocks = vi.hoisted(() => ({
  fetchRate: vi.fn(),
}))

vi.mock('./fx-client', () => ({
  fetchRate: mocks.fetchRate,
}))

beforeEach(() => {
  mocks.fetchRate.mockReset()
})

it('uses the fetched exchange rate', async () => {
  mocks.fetchRate.mockResolvedValue(0.8)

  await expect(priceInCurrency(100, 'USD', 'EUR')).resolves.toBe(80)
  expect(mocks.fetchRate).toHaveBeenCalledWith('USD', 'EUR')
})
\`\`\`

Do not read a statically imported value inside the \`vi.hoisted\` callback. Imports have not been evaluated at that point. Keep the callback self-contained, creating spies, fixed data, or pre-import side effects there. Also remember that \`vi.mock\` supports ESM \`import\`, not modules loaded with \`require()\`. If a mock must depend on runtime data from an individual test, refactor toward injection or use the non-hoisted \`vi.doMock\` with a subsequent dynamic import.

The official API documents the transformation and its constraints at https://vitest.dev/api/vi.

## Migrating from Jest to Vitest

Vitest's Jest-compatible API makes many test bodies portable, but migration is not a search-and-replace exercise. The runner, transform pipeline, module system, defaults, and configuration ownership differ. Use the mapping below as an audit list.

| Jest | Vitest | Migration note |
|---|---|---|
| \`jest.fn()\` | \`vi.fn()\` | Mock function behavior and common matchers are similar |
| \`jest.spyOn()\` | \`vi.spyOn()\` | Restore spies or configure \`restoreMocks: true\` |
| \`jest.mock()\` | \`vi.mock()\` | Vitest factories return an export object and can be async |
| Jest globals | Imports from \`vitest\` | Or set \`test.globals: true\` |
| \`jest.config.*\` | \`vitest.config.ts\` | Use \`defineConfig\` from \`vitest/config\` |
| \`testEnvironment: 'jsdom'\` | \`test.environment: 'jsdom'\` | Install \`jsdom\` separately when using it |
| \`setupFilesAfterEnv\` | \`test.setupFiles\` | Runs setup code before each test file |
| \`testMatch\` | \`test.include\` | Both accept glob patterns, but defaults can differ |
| \`moduleNameMapper\` | Vite \`resolve.alias\` | Translate aliases, not regular-expression rewrites blindly |
| \`collectCoverage: true\` | \`test.coverage.enabled: true\` | Choose and install a Vitest coverage provider |
| \`jest.clearAllMocks()\` | \`vi.clearAllMocks()\` | Clears call history, not implementations |

Start with explicit imports. They make test dependencies visible and avoid TypeScript global-type configuration:

\`\`\`ts
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('slugify', () => {
  it('normalizes spaces', () => {
    expect('JavaScript Testing'.toLowerCase().replaceAll(' ', '-'))
      .toBe('javascript-testing')
  })
})
\`\`\`

If a large Jest suite relies on globals, enable them temporarily and add \`vitest/globals\` to the TypeScript \`types\` array. Treat that as an explicit compatibility choice, not a requirement. A practical configuration can also carry over setup, environment, aliases, and automatic mock restoration:

\`\`\`ts
// vitest.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
\`\`\`

The highest-risk gotchas are module-related. Vitest does not mock dependencies loaded with \`require()\`. Mock factories must expose named exports explicitly, and a default export must appear under \`default\`. A dependency imported by a setup file is already cached by the time a test file attempts to mock it, so avoid eagerly importing mock targets from setup. Jest-specific helpers need \`vi\` equivalents, while Jest plugins and custom environments need individual compatibility checks.

For the configuration above, install \`@vitest/coverage-v8\` alongside Vitest. Coverage is not merely a reporter rename from Jest: confirm which source files are included, whether untouched files count, and whether source maps point results back to TypeScript. Carry thresholds across only after comparing reports from both runners.

Run Jest and Vitest side by side during the change, first on a small representative directory, then on the full suite. Compare skipped tests, snapshots, coverage scope, environment assumptions, and CI exit behavior. A test count that matches is necessary, but it is not proof of equivalent isolation. The detailed [Jest to Vitest migration guide](/blog/jest-to-vitest-migration-guide) covers a staged rollout and troubleshooting checklist.

## supertest: testing HTTP APIs in Node

Supertest drives a Node HTTP server through real HTTP semantics while keeping the test inside the process. Pass it an \`http.Server\` or a compatible application function, such as an Express app. If the server is not listening, Supertest binds it to an ephemeral port, so unit and integration tests do not need a hard-coded port or a separate background process.

Keep \`app.listen()\` out of the application factory. Production startup can call \`listen\`, while tests create a fresh app with fresh state:

\`\`\`ts
// src/app.ts
import express from 'express'

type User = { id: number; email: string }

export function createApp() {
  const app = express()
  const users: User[] = []

  app.use(express.json())

  app.post('/users', (req, res) => {
    if (typeof req.body.email !== 'string') {
      return res.status(400).json({ error: 'email is required' })
    }

    const user = { id: users.length + 1, email: req.body.email }
    users.push(user)
    return res.status(201).json(user)
  })

  app.get('/users', (_req, res) => res.json(users))

  return app
}
\`\`\`

Supertest requests are thenable, so they work directly with \`async\` tests. Its \`.expect()\` API can check status, headers, exact bodies, regular expressions, or a custom assertion. Use Vitest assertions for domain details that read better after capturing the response:

\`\`\`ts
// src/app.test.ts
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app'

describe('users API', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp()
  })

  it('creates and returns a user', async () => {
    const response = await request(app)
      .post('/users')
      .set('Accept', 'application/json')
      .send({ email: 'dev@example.com' })
      .expect('Content-Type', /json/)
      .expect(201)

    expect(response.body).toEqual({ id: 1, email: 'dev@example.com' })

    await request(app)
      .get('/users')
      .expect(200)
      .expect([{ id: 1, email: 'dev@example.com' }])
  })

  it('rejects an invalid payload', async () => {
    await request(app)
      .post('/users')
      .send({})
      .expect(400)
      .expect({ error: 'email is required' })
  })
})
\`\`\`

For session flows, reuse \`request.agent(app)\` so cookies persist across requests. For database-backed integration tests, replace the in-memory array with a test database and reset data between tests. Mock outbound systems such as payment gateways, but keep routing, validation, middleware, serialization, and persistence real. That boundary catches API regressions without turning every test into a slow end-to-end workflow.

The [complete Supertest guide for Node API testing](/blog/supertest-node-api-testing-complete-guide) expands this pattern to authentication, uploads, database cleanup, and CI execution.

## Installing Playwright and PLAYWRIGHT_BROWSERS_PATH

Playwright is two install steps: the language package, then the browser binaries that package drives. On Node/TypeScript you install the test runner and pull browsers with the CLI:

\`\`\`bash
npm init playwright@latest
# or in an existing project:
npm install -D @playwright/test
npx playwright install
\`\`\`

On Python the package and the browser install are separate:

\`\`\`bash
pip install playwright
python -m playwright install
\`\`\`

\`npx playwright install\` / \`python -m playwright install\` download Chromium, Firefox, and WebKit builds that match your Playwright version. Those binaries are large (on the order of a few hundred megabytes each). By default they land in an OS-level cache, not inside your repo:

| Platform | Default browser cache |
| --- | --- |
| Windows | \`%USERPROFILE%\\AppData\\Local\\ms-playwright\` |
| macOS | \`~/Library/Caches/ms-playwright\` |
| Linux | \`~/.cache/ms-playwright\` |

### What \`PLAYWRIGHT_BROWSERS_PATH\` controls

\`PLAYWRIGHT_BROWSERS_PATH\` overrides that default cache. Set it both when you **install** browsers and when you **run** tests so Playwright looks in the same place.

\`\`\`bash
# Install into a shared directory
export PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers
npx playwright install

# Run tests against the same directory
PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers npx playwright test
\`\`\`

Python uses the same variable:

\`\`\`bash
export PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers
python -m playwright install
PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers pytest
\`\`\`

Use a shared path for multi-project CI agents, Docker layer caches, and containers with tiny or ephemeral \`$HOME\`.

### Hermetic install: \`PLAYWRIGHT_BROWSERS_PATH=0\`

On Node you can force a **hermetic** layout: browsers land under the local package tree instead of the user cache:

\`\`\`bash
# Places binaries in node_modules/playwright-core/.local-browsers
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install
\`\`\`

Use this when browsers must travel with \`node_modules\` (offline bundles, air-gapped artifacts). Caveats from the official docs: \`PLAYWRIGHT_BROWSERS_PATH\` does **not** relocate Google Chrome or Microsoft Edge channel installs, and hermetic mode couples disk usage to every \`npm install\` tree. Shared cache paths are usually better on multi-job CI agents.

### CI caching pattern

Cache the default OS path (or your custom \`PLAYWRIGHT_BROWSERS_PATH\`) keyed on the lockfile, then install and test:

\`\`\`yaml
- run: npm ci
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-\${{ runner.os }}-\${{ hashFiles('package-lock.json') }}
- run: npx playwright install --with-deps
- run: npx playwright test
\`\`\`

If you set a custom path, export the same env var on install and test steps:

\`\`\`yaml
env:
  PLAYWRIGHT_BROWSERS_PATH: \${{ github.workspace }}/.pw-browsers
\`\`\`

Always re-run \`playwright install\` after upgrading \`@playwright/test\` or \`playwright\`. Browser builds are version-locked to the package revision.

Docs: https://playwright.dev/docs/browsers

## Fixing \`python -m playwright install\` errors

Python install failures usually come from system libraries, proxies, or the wrong interpreter. \`python -m playwright install\` matches the \`playwright\` console script when the venv is correct; use the module form when \`playwright\` is not on \`PATH\`.

### 1. Missing system dependencies (Linux)

Symptom: browsers download, then crash on launch with missing shared libraries (\`libnss3\`, \`libatk\`, and similar).

Install OS deps with Playwright's helper, ideally combined with the browser download:

\`\`\`bash
python -m playwright install --with-deps
# Slim CI image: only Chromium
python -m playwright install --with-deps chromium
\`\`\`

Separate steps also work (\`install-deps\` then \`install\`). On rootless containers, \`install-deps\` may need root. When apt/yum needs a proxy, pass it into the elevated command:

\`\`\`bash
sudo HTTPS_PROXY=https://192.0.2.1 python -m playwright install-deps
\`\`\`

### 2. Proxy / firewall / corporate CA

Default downloads come from Microsoft's CDN. Behind a corporate proxy:

\`\`\`bash
HTTPS_PROXY=https://192.0.2.1 python -m playwright install
\`\`\`

If TLS is intercepted and you see \`self signed certificate in certificate chain\`, point Node's CA bundle at your corporate root:

\`\`\`bash
export NODE_EXTRA_CA_CERTS=/path/to/corp-root.pem
python -m playwright install
\`\`\`

Slow links can time out. Raise the connection timeout (milliseconds) or point at an internal mirror:

\`\`\`bash
PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=120000 python -m playwright install
PLAYWRIGHT_DOWNLOAD_HOST=http://artifactory.example.internal \\
  python -m playwright install
\`\`\`

### 3. Wrong Python / empty environment

Symptoms: \`No module named playwright\`, or install succeeds in one shell while tests fail in another.

\`\`\`bash
which python
python -c "import playwright; print(playwright.__file__)"
python -m playwright install --list
\`\`\`

Install the package into that environment first (\`pip install playwright\` or your lockfile tool), then run \`python -m playwright install\`.

### 4. Browser path mismatch after a custom install

If you installed with \`PLAYWRIGHT_BROWSERS_PATH=/opt/pw\` but run pytest without that variable, Playwright looks in the default cache and reports browsers missing. Export the same path for install **and** test:

\`\`\`bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw
python -m playwright install
PLAYWRIGHT_BROWSERS_PATH=/opt/pw pytest
\`\`\`

### 5. Disk pressure

Small CI disks fill under \`~/.cache/ms-playwright\`. Point \`PLAYWRIGHT_BROWSERS_PATH\` at a large volume, or install only what you need:

\`\`\`bash
python -m playwright install chromium
# Headless-only CI can skip full headed Chromium:
python -m playwright install --with-deps --only-shell
\`\`\`

Docs: https://playwright.dev/python/docs/browsers

## Playwright Python environment variables

These variables apply across Playwright language ports. Python teams use them most when wiring pytest, Docker, and CI.

| Variable | Purpose | Typical values / notes |
| --- | --- | --- |
| \`PLAYWRIGHT_BROWSERS_PATH\` | Where browser binaries are installed and loaded | Absolute path (shared cache). On Node, \`0\` means hermetic install under \`node_modules/playwright-core/.local-browsers\` |
| \`DEBUG\` | Verbose Playwright protocol / API logging | \`pw:api\` for API traces; use pytest \`-s\` so logs are not captured |
| \`PWDEBUG\` | Debug mode (Inspector, headed, relaxed timeouts) | \`1\` opens the Inspector; \`console\` exposes a \`playwright\` object in browser DevTools |
| \`HTTPS_PROXY\` / \`HTTP_PROXY\` | Proxy for browser **download** traffic | Used during \`playwright install\`; pass into install-deps as root when needed |
| \`PLAYWRIGHT_DOWNLOAD_HOST\` | Custom CDN / artifact base for browser archives | Internal mirror URL |
| \`PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT\` | Download connect timeout | Milliseconds, e.g. \`120000\` |
| \`NODE_EXTRA_CA_CERTS\` | Extra CA PEM for TLS interception | Path to corp root when install fails with certificate errors |
| \`PLAYWRIGHT_SKIP_BROWSER_GC\` | Disable unused-browser garbage collection | \`1\` to keep old browser revisions |
| \`PLAYWRIGHT_NODEJS_PATH\` | Force a specific Node binary (Python host) | Path to \`node\` when the bundled Node is wrong |

\`\`\`bash
# Inspector on a failing pytest
PWDEBUG=1 pytest -s tests/test_checkout.py

# Protocol logs without the Inspector
DEBUG=pw:api pytest -s tests/test_checkout.py

# Shared browsers on a build agent
export PLAYWRIGHT_BROWSERS_PATH=/var/cache/ms-playwright
python -m playwright install --with-deps
pytest
\`\`\`

\`PWDEBUG=1\` is the daily debugger: headed browser, Inspector, and default timeout 0 so the process waits while you inspect. Prefer it over long \`wait_for_timeout\` calls when chasing flakes.

Docs: https://playwright.dev/python/docs/debug

## Handling file uploads and downloads

Playwright bypasses the OS file picker for uploads and exposes a first-class \`download\` event for downloads.

### Uploads: \`setInputFiles\`

If the page has an \`<input type="file">\` (even if CSS-hidden), set files on that locator. Relative paths resolve from the process working directory.

**TypeScript**

\`\`\`ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('uploads a resume PDF', async ({ page }) => {
  await page.goto('/careers/apply');

  await page
    .getByLabel('Upload resume')
    .setInputFiles(path.join(__dirname, 'fixtures/resume.pdf'));

  await expect(page.getByText('resume.pdf')).toBeVisible();
});

// Multiple files when the input allows it; empty array clears selection
await page.locator('input[type="file"]').setInputFiles([
  'tests/fixtures/a.pdf',
  'tests/fixtures/b.pdf',
]);
await page.locator('input[type="file"]').setInputFiles([]);
\`\`\`

When a custom button opens the native chooser, wait for the file chooser event:

\`\`\`ts
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Upload file' }).click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles('tests/fixtures/resume.pdf');
\`\`\`

**Python**

\`\`\`python
from pathlib import Path

def test_upload_resume(page):
    page.goto("/careers/apply")
    page.get_by_label("Upload resume").set_input_files(
        str(Path(__file__).parent / "fixtures" / "resume.pdf")
    )
    page.get_by_text("resume.pdf").wait_for()
\`\`\`

### Downloads: wait for the event, then \`saveAs\`

Start waiting **before** the click that triggers the download. Playwright emits \`download\` for each attachment, stages the file in a temp directory, and deletes it when the browser context closes. Persist with \`saveAs\` / \`save_as\`.

**TypeScript**

\`\`\`ts
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('downloads invoice PDF', async ({ page }) => {
  await page.goto('/billing/invoices');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download invoice' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/invoice-.*\\.pdf$/);
  const target = path.join('test-results', download.suggestedFilename());
  await download.saveAs(target);
  expect(fs.existsSync(target)).toBeTruthy();
});
\`\`\`

**Python (sync)**

\`\`\`python
from pathlib import Path

def test_download_invoice(page):
    page.goto("/billing/invoices")

    with page.expect_download() as download_info:
        page.get_by_role("link", name="Download invoice").click()
    download = download_info.value

    assert download.suggested_filename.endswith(".pdf")
    target = Path("test-results") / download.suggested_filename
    download.save_as(str(target))
    assert target.exists()
\`\`\`

You can set \`downloadsPath\` / \`downloads_path\` on browser launch for a fixed staging directory. Still call \`saveAs\` when a test must keep a specific artifact for assertions or CI upload.

Docs: https://playwright.dev/docs/downloads and https://playwright.dev/docs/input#upload-files

## Playwright locators

Locators are Playwright's unit of auto-waiting. A locator does not snapshot a node once; every action re-queries the live DOM. Prefer user-facing selectors over CSS chains. For deeper patterns, see [Playwright best practices for locators (2026)](/blog/playwright-best-practices-locators-2026).

### Built-in getters (priority order)

\`\`\`ts
// Role + accessible name (preferred for controls)
await page.getByRole('button', { name: 'Sign in' }).click();

// Associated label text (forms)
await page.getByLabel('Email').fill('qa@example.com');

// Visible text (non-interactive copy)
await expect(page.getByText('Welcome back')).toBeVisible();

// Explicit test contract
await page.getByTestId('checkout-submit').click();
\`\`\`

Also available: \`getByPlaceholder\`, \`getByAltText\`, \`getByTitle\`. CSS/XPath via \`page.locator(...)\` works but couples tests to layout; use as a last resort.

Default \`getByTestId\` looks for \`data-testid\`. Override in config when your design system uses another attribute:

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    testIdAttribute: 'data-pw',
  },
});
\`\`\`

### Web-first assertions

Pair locators with \`expect(locator)\` so assertions retry until timeout instead of failing on the first paint:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('cart updates after add', async ({ page }) => {
  await page.goto('/shop');
  await page.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByTestId('cart-count')).toHaveText('1');
  await expect(page.getByRole('link', { name: 'Cart' })).toBeVisible();
});
\`\`\`

Common matchers: \`toBeVisible\`, \`toHaveText\`, \`toHaveValue\`, \`toBeEnabled\`, \`toHaveCount\`, \`toContainText\`. These replace most manual \`waitForSelector\` loops.

### Chaining and filtering

\`\`\`ts
await page
  .getByRole('listitem')
  .filter({ hasText: 'Product 2' })
  .getByRole('button', { name: 'Add to cart' })
  .click();

// Nested has: child locator relative to the parent match
await page
  .getByRole('listitem')
  .filter({ has: page.getByRole('heading', { name: 'Product 2' }) })
  .getByRole('button', { name: 'Add to cart' })
  .click();

const dialog = page.getByRole('dialog', { name: 'Settings' });
await dialog.getByLabel('Display name').fill('QA Bot');
await dialog.getByRole('button', { name: 'Save' }).click();
\`\`\`

Locators are **strict**: single-element actions throw if multiple nodes match. Fix ambiguity with better filters or names, not silent \`.first()\`, unless order is the real contract. Python uses the same model in snake_case (\`get_by_role\`, \`get_by_label\`).

Docs: https://playwright.dev/docs/locators

## Playwright vs Puppeteer: install size and speed

Both tools drive browsers for automation. Puppeteer grew as a high-level Chrome DevTools Protocol client for Chromium. Playwright rebuilt around **multi-browser** automation (Chromium, Firefox, WebKit) with a shared API, auto-waiting locators, and a first-party test runner.

| Dimension | Playwright | Puppeteer |
| --- | --- | --- |
| Primary browsers | Bundled Chromium, Firefox, WebKit (patched for automation) | Chromium by default; other engines are not the core product story |
| Language surface | JS/TS, Python, Java, .NET with aligned APIs | JavaScript/TypeScript first |
| Waiting model | Locators + web-first assertions auto-retry actionability | Historically more manual waits; modern Puppeteer has locators, but Playwright's test layer is deeper |
| Test runner | First-party \`@playwright/test\` (projects, traces, fixtures) | Bring your own (Jest, Mocha, etc.) or third-party wrappers |
| Install footprint | Package + **multiple** browser downloads (hundreds of MB each) | Package + typically **one** Chromium download (smaller total by default) |
| Cross-browser CI | First-class \`projects\` for chromium/firefox/webkit | Usually Chromium-only unless you add other stacks |
| Traces / inspector | Trace viewer, codegen, Inspector (\`PWDEBUG\`) | DevTools-oriented debugging; less multi-browser tooling |

### Install size

A full Playwright install pulls three browser families into the cache. Official browser docs show on the order of a few hundred megabytes per engine per revision (sizes change over releases). That is why CI caching and \`PLAYWRIGHT_BROWSERS_PATH\` matter.

Puppeteer ships a single Chromium by default, so cold install on a laptop or agent is often lighter and faster. The tradeoff is coverage: Safari-class WebKit or Firefox validation needs Playwright (or another stack), not a default Puppeteer install.

\`\`\`bash
# Only what your projects use
npx playwright install chromium

# Headless CI without full headed Chromium
npx playwright install --with-deps --only-shell
\`\`\`

### Speed

Raw protocol cost for a single Chromium navigation is similar. Suite wall clock differs because of:

1. **Auto-wait vs sleep**: Playwright locators wait for attached, visible, stable, and enabled states as needed. Suites that used fixed \`sleep(2000)\` get faster and less flaky when rewritten to locators.
2. **Parallelism**: \`@playwright/test\` runs workers in parallel by default; tune \`workers\` and shard on CI.
3. **Browser count**: three engines multiplies time. Smoke on Chromium every PR; full matrix nightly.
4. **Startup**: cold browser launch dominates short scripts. Avoid launching a new browser per tiny unit of work.

Keep Puppeteer for Chromium-only scrapers or tooling already deep in its ecosystem. Choose Playwright when you need WebKit/Firefox, resilient locators, uploads/downloads APIs, and a batteries-included runner. The mental model (page, context, browser) maps cleanly from Puppeteer; replace CSS-only selectors and hard waits as you port.

Official Playwright docs: https://playwright.dev/docs/intro

## BDD vs TDD: the same tests, a different conversation

Test-driven development (TDD) and behavior-driven development (BDD) both shorten the loop between an expectation and executable evidence. The difference is where that expectation starts and who helps shape it.

In TDD, a developer usually writes a failing test for the next small unit of behavior, implements the minimum code to pass, and refactors. In BDD, a product owner, domain expert, developer, and tester first agree on concrete examples of externally observable behavior. Those examples may later become unit, API, or browser tests. BDD is not synonymous with browser automation, and Gherkin is not required to practice BDD.

Consider a checkout rule: buying at least three units of one product gives that line a 10 percent discount. A TDD-first implementation can begin with a Vitest test:

\`\`\`ts
// checkout.test.ts
import { describe, expect, it } from 'vitest';
import { calculateTotalCents } from './checkout';

describe('calculateTotalCents', () => {
  it('applies a 10% line discount at a quantity of three', () => {
    const total = calculateTotalCents([
      { unitPriceCents: 2_000, quantity: 3 },
    ]);

    expect(total).toBe(5_400);
  });

  it('does not discount a quantity of two', () => {
    const total = calculateTotalCents([
      { unitPriceCents: 2_000, quantity: 2 },
    ]);

    expect(total).toBe(4_000);
  });
});
\`\`\`

After seeing the first test fail for the expected reason, the developer writes the production code:

\`\`\`ts
// checkout.ts
export type LineItem = {
  unitPriceCents: number;
  quantity: number;
};

export function calculateTotalCents(lines: LineItem[]): number {
  return lines.reduce((total, { unitPriceCents, quantity }) => {
    const subtotal = unitPriceCents * quantity;
    const lineTotal = quantity >= 3 ? Math.round(subtotal * 0.9) : subtotal;
    return total + lineTotal;
  }, 0);
}
\`\`\`

That is a good TDD loop. It exposes the boundary at three units and keeps money in integer cents. It does not, by itself, prove that everyone meant a discount per product line rather than per cart, or whether quantities of different products can be combined.

A BDD-first conversation starts before the implementation. The team explores examples such as two shirts, three shirts, and two shirts plus one hat. It records only the examples needed to define the business rule:

\`\`\`gherkin
Feature: Quantity discount
  Customers receive a discount for buying several units of one product.

  Scenario: The discount starts at three units of the same product
    Given a T-shirt costs $20
    And my cart is empty
    When I add 3 T-shirts to the cart
    Then the cart total should be $54

  Scenario: Different products do not combine for the discount
    Given a T-shirt costs $20
    And a hat costs $10
    And my cart is empty
    When I add 2 T-shirts to the cart
    And I add 1 hat to the cart
    Then the cart total should be $50
\`\`\`

The second scenario does more than add coverage. It resolves a domain ambiguity. The underlying function can still be developed with TDD, while the scenarios validate that the system implements the agreed rule.

Gherkin is really for teams that hold example-mapping or specification workshops and need a durable, readable record of the decisions. It is not a substitute for a product conversation, and it is rarely worth translating every unit test into English. If only automation engineers edit feature files and everyone else ignores them, the suite pays the cost of a second abstraction without receiving BDD's collaboration benefit. AI coding agents make this distinction more important: a reviewed scenario is a useful constraint for an agent, but generated prose that no domain expert validated is not a business specification. See the deeper [BDD and Cucumber testing guide](/blog/bdd-cucumber-testing-guide) for the discovery workflow behind the syntax.

## Cucumber.js in practice

Cucumber.js executes \`.feature\` files by matching each Gherkin step to JavaScript or TypeScript step definitions. \`Given\`, \`When\`, and \`Then\` communicate intent to readers. At runtime they use the same step-matching mechanism, so uniqueness comes from the expression, not from the keyword.

Use a small production module for the quantity rule:

\`\`\`js
// src/checkout.js
export function calculateTotalCents(lines) {
  return lines.reduce((total, { unitPriceCents, quantity }) => {
    const subtotal = unitPriceCents * quantity;
    return total + (quantity >= 3 ? Math.round(subtotal * 0.9) : subtotal);
  }, 0);
}
\`\`\`

Save the scenarios as \`features/quantity-discount.feature\`. Then bind their exact language with Cucumber Expressions. A custom World holds catalog and cart state for one scenario:

\`\`\`js
// features/step_definitions/quantity-discount.steps.js
import assert from 'node:assert/strict';
import {
  After,
  Before,
  Given,
  Then,
  When,
  setWorldConstructor,
} from '@cucumber/cucumber';
import { calculateTotalCents } from '../../src/checkout.js';

class CheckoutWorld {
  constructor({ log }) {
    this.log = log;
    this.catalog = new Map();
    this.lines = [];
  }
}

setWorldConstructor(CheckoutWorld);

Before(function () {
  this.catalog.clear();
  this.lines = [];
});

After(function () {
  this.log(\`Scenario finished with \${this.lines.length} cart line(s)\`);
});

Given('a T-shirt costs \${int}', function (priceInDollars) {
  this.catalog.set('T-shirt', priceInDollars * 100);
});

Given('a hat costs \${int}', function (priceInDollars) {
  this.catalog.set('hat', priceInDollars * 100);
});

Given('my cart is empty', function () {
  this.lines = [];
});

When('I add {int} T-shirts to the cart', function (quantity) {
  this.lines.push({
    unitPriceCents: this.catalog.get('T-shirt'),
    quantity,
  });
});

When('I add {int} hat to the cart', function (quantity) {
  this.lines.push({
    unitPriceCents: this.catalog.get('hat'),
    quantity,
  });
});

Then('the cart total should be \${int}', function (expectedDollars) {
  assert.equal(calculateTotalCents(this.lines), expectedDollars * 100);
});
\`\`\`

Cucumber creates a new World instance for every scenario, including retries. That isolation prevents the cart from one scenario leaking into another. Regular \`function\` callbacks are deliberate here because Cucumber exposes the current World as \`this\`. The \`Before\` hook establishes a known starting state, while \`After\` can log, attach diagnostics, or release scenario-level resources. \`BeforeAll\` and \`AfterAll\` run outside any scenario, so they do not have a scenario World.

For an ESM project, install Cucumber locally and mark the package as a module:

\`\`\`json
{
  "type": "module",
  "scripts": {
    "test:bdd": "cucumber-js features/quantity-discount.feature --import features/step_definitions/quantity-discount.steps.js"
  }
}
\`\`\`

Install and run it without relying on a global package:

\`\`\`bash
npm install --save-dev @cucumber/cucumber
npm run test:bdd
\`\`\`

The \`--import\` option loads ESM support code. CommonJS projects use \`--require\` instead. Commit the package manager's generated lockfile so local and CI installs resolve the same dependency graph. Keep step text at the domain level, and call application services, API clients, or page objects underneath. Steps such as \`When I click the blue checkout button\` encode a temporary interface; \`When I place the order\` preserves the business behavior. The [Cucumber BDD tutorial for beginners](/blog/cucumber-bdd-tutorial-beginners) expands this structure into a complete starter project.

## Choosing a BDD framework

The important choice is not which tool can parse Gherkin. It is how much separation, reuse, and runner integration the team can maintain.

| Framework | Execution model | Strongest fit | Main tradeoff |
|---|---|---|---|
| Cucumber.js | Its own CLI, support-code registry, hooks, tags, formatters, and per-scenario World | Cross-functional acceptance specifications, shared domain steps, runner-neutral API or UI automation | Global step matching can become ambiguous; feature and glue layers require disciplined naming and ownership |
| CodeceptJS | High-level end-to-end runner with helpers and optional Gherkin features and step definitions | Teams wanting a concise actor-style DSL across Playwright, WebDriver, or other helpers | Another abstraction sits above the browser library, which can obscure low-level behavior and make advanced debugging framework-specific |
| Jest-Cucumber | Loads feature files into Jest and binds each scenario through \`defineFeature\` and Jest tests | Jest-centered codebases that want Gherkin while retaining Jest mocks, coverage, watch tooling, and lifecycle | Default bindings are closer to each scenario than Cucumber's global registry; it is less suitable when many repositories share a Cucumber ecosystem |

Choose Cucumber.js when feature files are an actual collaboration artifact and the organization values Cucumber-compatible reporting or shared vocabulary. Choose CodeceptJS when readable end-to-end actions and its helper ecosystem matter more than direct access to a browser driver's native API. Choose Jest-Cucumber when the engineering team already standardizes on Jest and wants feature files kept in sync without adopting a separate runner. For a broader decision matrix, see the [BDD frameworks comparison for 2026](/blog/bdd-frameworks-comparison-2026).

Whichever tool wins, keep unit-level edge cases in Vitest or Jest. Reserve Gherkin for examples that clarify policy, workflow, permissions, money, risk, or other behavior a non-automation role can meaningfully review.

## Cypress vs Playwright in 2026

Cypress and Playwright both provide reliable locators, automatic waiting, network control, screenshots, video, and CI support. Their architecture changes how tests feel. Cypress test commands execute in the browser's run loop alongside the application, coordinated with a Node process. This enables its interactive command log, DOM snapshots, and tight feedback loop. Playwright Test runs test code in Node worker processes and drives isolated browser contexts through Playwright's browser automation layer. That model naturally handles multiple pages, contexts, origins, and browser engines.

| Decision point | Cypress | Playwright |
|---|---|---|
| Browser model | Runs with the application in a Cypress-controlled browser; Chrome-family browsers and Firefox are supported, with WebKit support still experimental | First-class Chromium, Firefox, and WebKit projects, with matching browser binaries installed by Playwright |
| Isolation | Clears browser state between tests and emphasizes one controlled browser session | Creates isolated browser contexts cheaply; multiple contexts and pages are first-class test objects |
| Local parallelism | A normal \`cypress run\` processes specs in its runner; teams commonly scale by distributing spec files across CI machines | Test files run across local worker processes by default; worker count is configurable |
| CI distribution | Cypress Cloud can record, load-balance, and parallelize spec files across machines with \`--record --parallel\` | Built-in sharding divides a suite across machines, while reports can be merged by the CI workflow |
| Debugging | \`cypress open\` provides a visual command log, time-travel DOM snapshots, console output, and direct DevTools access | UI Mode, Playwright Inspector, trace viewer, videos, screenshots, and the HTML report support live and post-run diagnosis |
| Complex browser workflows | Cross-origin flows use Cypress's \`cy.origin()\` model; multi-page workflows often need adaptation to Cypress conventions | Popups, multiple tabs, multiple users, permissions, downloads, and parallel contexts map directly to browser objects |
| Component testing | Mature interactive component runner for major web frameworks | Component testing exists, but official documentation still labels it experimental |
| Service dependency | Core local execution is free; Cypress Cloud is optional, but its recorded-run orchestration provides the official load-balanced parallel experience | Core execution, local workers, and sharding do not require a hosted coordination service |

Cross-browser support deserves precise wording. Cypress supports Chrome-family browsers and Firefox, bundles Electron, and offers experimental WebKit. Playwright installs and tests against Chromium, Firefox, and WebKit as named projects. Neither WebKit run is literally desktop Safari, but Playwright's WebKit coverage is a stable, first-class part of its normal project matrix, while Cypress documents its WebKit path as experimental.

Cypress wins when frontend developers value an exceptionally approachable interactive runner, time-travel inspection, and component tests close to the UI development loop. It is also a sensible choice for an established Cypress suite whose workflows fit its browser model. Cypress Cloud adds useful historical diagnostics and duration-aware spec distribution for teams willing to use the service.

Playwright wins when the suite needs several browser engines on every change, multiple tabs or users in one test, independent contexts, first-class downloads and popups, or fast local worker parallelism. Its trace archive is especially useful in CI and for AI agents because the failure evidence includes actions, DOM snapshots, network activity, console messages, and attachments in one inspectable artifact.

Do not migrate merely because one tool is fashionable. Run a representative slice containing authentication, an iframe or cross-origin handoff, file upload and download, network mocking, and CI parallelism. Measure runtime, flaky retries, artifact usefulness, and maintenance effort. The better framework is the one whose execution model matches the application's hardest workflows and whose failures your humans and coding agents can diagnose quickly.

## Building a full testing strategy

A useful JavaScript testing strategy assigns each risk to the cheapest layer that can detect it reliably. For a TypeScript commerce application with pricing rules, an HTTP API, a database, and browser checkout, use many unit and integration tests, fewer browser tests, and static checks underneath them. Cucumber is a collaboration format for selected behavior, not another pyramid level.

| Layer | What it should prove | Typical tool | CI placement |
|---|---|---|---|
| Static checks | Types, imports, and code-quality rules | TypeScript, ESLint | Every pull request, first lane |
| Unit | Pure rules, transformations, boundary cases, and error branches | Vitest or Jest | Every push and pull request |
| Component or module integration | Several modules collaborating with controlled external boundaries | Vitest or Jest | Every pull request |
| API integration | Routing, validation, authentication, serialization, and database behavior | supertest with the application server | Every pull request, using isolated test data |
| Browser end to end | Critical journeys in a real browser | Playwright | Pull requests for a focused suite, full suite after merge or before release |
| Executable business examples | Shared acceptance rules where business wording matters | Cucumber.js | Pull requests for tagged critical scenarios, broader acceptance runs before release |

Use Vitest or Jest for browser-independent rules such as pricing, permissions, normalization, retries, and reducers. Mock only boundaries that make a test slow or nondeterministic. A pricing rule can remain in memory:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { calculateTotal } from './calculate-total';

describe('calculateTotal', () => {
  it('applies a percentage discount before tax', () => {
    const total = calculateTotal({
      subtotal: 10_000,
      discountPercent: 10,
      taxPercent: 20,
    });

    expect(total).toBe(10_800);
  });
});
\`\`\`

Integer minor units keep this assertion independent of floating-point rounding. Add table-driven cases for zero values, invalid discounts, limits, and rounding boundaries. Run unit tests on every CI change. Coverage highlights unexercised branches, but cannot prove that assertions are meaningful.

Use supertest for HTTP contracts. Exercise the real router, middleware, validation, status codes, headers, and JSON serialization. Export the application separately from its network listener so tests need no fixed port:

\`\`\`ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('POST /api/orders', () => {
  it('rejects an empty basket', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ items: [] })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'EMPTY_BASKET',
    });
  });
});
\`\`\`

For database-backed API tests, isolate each worker with a disposable database, schema, transaction, or uniquely named records. Seed only required data, run migrations first, and retain server logs on failure. Run these tests on every pull request because they catch contract failures that mocks cannot.

Reserve Playwright for browser-dependent behavior: navigation, accessible interaction, cookies, redirects, uploads, downloads, and a few complete journeys. Prefer role, label, or text locators. Use test IDs when no stable semantic locator exists.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('a signed-in customer can submit an order', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('textbox', { name: 'Cardholder name' }).fill('Asha Rao');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
\`\`\`

On pull requests, run smoke tests against a production-like build and retain diagnostic artifacts on failure. Run the broader browser matrix after merge, nightly, or before release. Parallel workers need isolated accounts and records.

Use Cucumber.js for rules that benefit from shared examples, not as a wrapper around every test. Gherkin should state observable business behavior without selectors, implementation details, or page choreography:

\`\`\`gherkin
Scenario: Free delivery at the qualifying order value
  Given my basket subtotal is 5000 rupees
  When I review the delivery options
  Then standard delivery should be free
\`\`\`

Step definitions connect this language to application actions and keep scenario state in the Cucumber World. Keep steps domain-focused and avoid nearly identical phrases. Run critical acceptance scenarios on pull requests and the broader suite before release.

## A decision matrix

Choose tools by risk, runtime, and feedback speed. Several can coexist when each owns a clear layer.

| Scenario/Need | Recommended tool | Why |
|---|---|---|
| New TypeScript application using Vite | Vitest | It fits the Vite toolchain, supports TypeScript-friendly workflows, mocks, spies, snapshots, and fast watch-mode feedback. |
| Existing application with a large Jest suite | Jest | Keeping a stable suite usually costs less than migrating solely for tool uniformity. |
| Framework-neutral Node.js test runner with explicit setup | Mocha | Its suites, hooks, async support, reporters, and configuration work well when the team wants to assemble its own assertion and mocking stack. |
| Express or compatible Node HTTP endpoint | supertest plus Vitest, Jest, or Mocha | supertest drives the application through HTTP semantics without requiring a manually managed fixed port. |
| Readable \`expect\` assertions in Mocha | Chai | Chai supplies \`expect\`, \`should\`, and \`assert\` interfaces while Mocha supplies test execution. |
| Promise fulfillment or rejection assertions with Chai | chai-as-promised | It extends Chai with assertions designed for promises, reducing manual \`try\` and \`catch\` code. |
| Function stub or call tracking in Vitest | \`vi.fn\` | It creates a mock function whose calls and configured behavior can be asserted. |
| Observe an existing object method in Vitest | \`vi.spyOn\` | It tracks or replaces a method while preserving an explicit relationship to the object. |
| Mock an imported module in Vitest | \`vi.mock\` | It replaces a module boundary; use it narrowly so tests do not merely verify their own mocks. |
| Values needed by a hoisted Vitest mock factory | \`vi.hoisted\` | It creates values available to code involved in mock hoisting, where ordinary later declarations are unsuitable. |
| Coverage for a modern V8-based JavaScript test command | c8 | It uses V8 coverage and can wrap the command that runs the tests. |
| Coverage for an established Mocha project already using Istanbul workflows | nyc | It remains a practical fit when existing configuration, reports, and CI conventions depend on nyc. |
| Critical Chromium, Firefox, and WebKit user journeys | Playwright | One runner provides browser automation, resilient locators, isolation, and cross-browser projects. |
| Browser tests for a team deeply invested in the Cypress runner and UI | Cypress | Existing commands, plugins, tests, and team familiarity can outweigh the benefit of switching. |
| Business-readable acceptance examples | Cucumber.js | Gherkin scenarios and step definitions create executable examples that non-developers can review. |
| Pure domain rule with many edge cases | Vitest or Jest parameterized unit tests | Direct inputs and outputs are faster and easier to diagnose than expressing every edge case through a browser or Gherkin. |
| Authentication redirect, cookies, and rendered permissions | Playwright | The risk crosses HTTP and browser boundaries, so a real browser provides stronger evidence. |
| Request validation and error JSON | supertest | The contract is at the HTTP boundary and does not require rendering a browser page. |
| One runner for unit and DOM-oriented component tests | Vitest or Jest with an appropriate DOM environment | Both can cover module behavior and simulated DOM tests; choose based on the application's toolchain. |
| Mocha setup with fresh state per test | \`beforeEach\` and \`afterEach\` | Per-test hooks reduce state leakage; reserve \`before\` and \`after\` for safe suite-level work. |
| Legacy callback API under Mocha | Mocha \`done\` callback | Call it exactly once and do not mix it with a returned promise; prefer \`async\` and \`await\` for modern promise APIs. |

## Installing these skills into your AI agent

An AI coding agent is more reliable when its instructions encode the team's test layers, locator rules, mocking limits, and CI commands. Ready-made QA skills from qaskills.sh can be installed through the qaskills CLI. Review each skill, adapt it to the repository, and keep project scripts and contribution rules authoritative.

## Frequently Asked Questions

### Should I choose Mocha or Vitest for a new TypeScript project?

Choose Vitest when the project already uses Vite or when you want an integrated runner with assertions, mocks, spies, snapshots, coverage integration, and watch mode. Choose Mocha when you value a small, framework-neutral runner and want to select assertion, mocking, transpilation, and coverage tools independently. Both support promise-returning and \`async\` tests. The decisive factors are toolchain fit, startup and watch performance in your repository, debugging quality, and the cost of maintaining configuration, not whether either runner can express ordinary tests.

### Is Chai still needed when test runners include assertions?

Chai is still useful, but it is not universally required. Mocha does not provide an assertion library, so Chai remains a common partner and offers \`expect\`, \`should\`, and \`assert\` styles. Vitest and Jest already include their own \`expect\` APIs, making Chai unnecessary for most suites on those runners. Chai can also be extended with plugins such as chai-as-promised. Avoid adding it only to make syntax uniform across runners, because overlapping assertion libraries can confuse matcher behavior, types, and failure output.

### Do I need both Jest and Vitest in the same repository?

Usually not for the same class of tests. Two runners mean duplicate configuration, setup files, editor integration, coverage handling, and knowledge. Keep Jest if an existing suite and framework integrations are dependable. Prefer Vitest for Vite-centered packages when it materially improves the development loop. A monorepo can reasonably use Jest in one package and Vitest in another, but each package should have a clear owner and command. Migrate incrementally only after checking mocks, timers, snapshots, environments, and CI reporting for compatibility.

### How do Playwright and Cypress differ for end-to-end testing?

Both can automate modern web applications and support productive debugging. Playwright provides first-party automation across Chromium, Firefox, and WebKit, with isolated browser contexts and APIs for multiple pages, downloads, uploads, and network interactions. Cypress has a distinctive interactive runner and a mature ecosystem that many teams already know well. Select with a proof of concept using your hardest flows, browser requirements, CI environment, and debugging needs. Do not rewrite a healthy suite merely because another tool has a feature you may never use.

### Is BDD with Cucumber.js worth the additional layer?

BDD is worth it when concrete examples improve conversations among product, engineering, and QA, and when stakeholders actually review the scenarios. Use Cucumber.js for important business rules and acceptance behavior, with domain language and observable outcomes. It adds little value when Gherkin merely restates click-by-click automation or when only automation engineers read it. Step libraries also require deliberate maintenance. Start with a small rule set, watch whether examples resolve ambiguity before implementation, and keep lower-level edge cases in faster unit or API tests.

### Should I use c8 or nyc for JavaScript coverage?

c8 is a strong default for modern Node.js projects because it uses V8's coverage information and can wrap an existing test command. nyc is Istanbul's command-line interface and remains appropriate for projects with established Istanbul configuration, report pipelines, or instrumentation expectations. Compare branch mapping, source-map accuracy, supported runtimes, report formats, and CI integration on the actual repository. Whichever tool you choose, treat coverage as a map of untested code. A high percentage cannot establish that assertions are correct or that critical behavior is represented.

### Is Mocha still a sensible choice in 2026?

Yes. Mocha remains sensible for stable Node.js suites and teams that value its flexible, composable design. It supports \`describe\`, \`it\`, lifecycle hooks, callback completion, promises, \`async\` functions, configuration files, and required setup modules. Its flexibility also means the team must choose and maintain assertions, mocks, TypeScript execution, and coverage. A new project may get a more integrated experience from Vitest or Jest, but that is not a reason to replace a reliable Mocha suite without measured gains in speed, maintenance, or developer experience.
`,
};
