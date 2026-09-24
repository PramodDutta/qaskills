import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CodeceptJS E2E Testing Guide 2026: Prose-Like Tests for QA Teams',
  description: 'A practical codeceptjs guide for QA engineers: setup, helpers, page objects, parallel runs, BDD, API data, AI healing, and CI debugging payoff.',
  date: '2026-09-24',
  category: 'Tutorial',
  content: `
# CodeceptJS E2E Testing Guide 2026: Prose-Like Tests for QA Teams

\`codeceptjs\` is an end-to-end testing framework for teams that want tests to read like user actions while still running on serious automation backends such as Playwright, WebDriver, Puppeteer, Appium, REST, and GraphQL. The short answer: use CodeceptJS when readable scenarios, helper abstraction, page object injection, and agent-friendly test maintenance matter more than exposing every low-level browser primitive in every test file.

That does not make it a universal replacement for Playwright Test, WebdriverIO, Cypress, or Selenium. CodeceptJS sits one layer above those tools. It delegates actions from the \`I\` actor to configured helpers, so a scenario can say \`I.click('Create project')\` while the helper decides how to drive the browser or request layer. This is especially useful for QA engineers working with AI coding agents because the intent is visible in the test text, not buried in locator plumbing.

The current docs show CodeceptJS 4.x as the active line, with ESM syntax, TypeScript support through \`tsx/esm\`, Playwright as the recommended quickstart helper, worker-based parallel execution, Gherkin support, REST and GraphQL helpers, and AI features including a \`heal\` plugin enabled through config and the \`--ai\` runtime flag. If you are deciding whether a lower-level runner is a better fit, compare this guide with [WebdriverIO vs Playwright in 2026](/blog/webdriverio-vs-playwright-2026) and the broader [Selenium vs Cypress vs Playwright comparison](/blog/selenium-vs-cypress-vs-playwright-2026).

## The CodeceptJS mental model: actor, helper, recorder

A CodeceptJS test is a scenario written around an actor named \`I\`. The actor is not magic. It is a proxy over the helpers enabled in \`codecept.conf.js\` or \`codecept.conf.ts\`. If the Playwright helper is enabled, \`I.amOnPage\`, \`I.click\`, \`I.fillField\`, and browser-specific commands route to Playwright. If the REST helper is enabled, request commands such as \`I.sendGetRequest\` become available. If JSONResponse is connected to the helper that sends the requests (REST in the config below), API assertions can run from the same actor vocabulary.

This matters because the test file describes the workflow, while the config defines the machinery. A QA lead can review the scenario without reading helper setup. An agent can patch a broken flow without deciding whether the repo uses WebDriver or Playwright on every line. The cost is indirection: when a command fails, you sometimes need to know which helper supplied it.

| Layer | What it owns | QA guidance |
|---|---|---|
| Scenario | User-visible flow and assertions | Keep it readable and business-facing |
| \`I\` actor | Action vocabulary delegated to helpers | Use built-in commands before adding custom ones |
| Helpers | Browser, mobile, API, and data backends | Configure once, keep secrets in environment variables |
| Page objects | Reusable page-specific actions and locators | Inject them by name, avoid direct imports in tests |
| Plugins | Screenshots, retry, pause, AI trace, healing | Enable deliberately, especially in CI |
| Workers | Parallel execution strategy | Isolate test data before scaling worker count |

The "what people get wrong" insight is simple: CodeceptJS is not just Playwright with softer syntax. Treating it that way produces tests that constantly drop into \`usePlaywrightTo\`, duplicate helper internals, and lose the readability advantage. Use the abstraction for common actions. Drop down only for capabilities the abstraction does not expose cleanly.

## Install and initialize without drifting from 4.x assumptions

The quickstart path installs CodeceptJS with Playwright, installs browser binaries, and runs \`npx codeceptjs init\`. The installation docs also describe CodeceptJS 4.x as ESM-based, with TypeScript tests loaded through \`tsx/esm\`. The docs note a Node 22.12 or newer requirement on the installation page for CodeceptJS 4.2, while the home page positions v4 as the current major line. In practice, check your lockfile and CI Node version together before upgrading.

\`\`\`bash
npm init -y
npm install codeceptjs playwright --save-dev
npx playwright install --with-deps
npx codeceptjs init
\`\`\`

During \`init\`, choose TypeScript if your project uses it. The wizard can create \`codecept.conf.ts\` and \`*_test.ts\` files. For TypeScript test files in CodeceptJS 4.x, install \`tsx\` and register \`tsx/esm\` in the \`require\` array.

\`\`\`json
{
  "type": "module",
  "scripts": {
    "e2e": "codeceptjs run --steps",
    "e2e:debug": "codeceptjs run --debug",
    "e2e:smoke": "codeceptjs run --grep @smoke",
    "e2e:workers": "codeceptjs run-workers 4 --by pool"
  },
  "devDependencies": {
    "codeceptjs": "^4.2.0",
    "playwright": "^1.63.0",
    "tsx": "^4.23.0"
  }
}
\`\`\`

Those ranges match the current releases as of September 2026 (CodeceptJS 4.2.0, Playwright 1.63.0). Let the lockfile pin exact versions, and upgrade on a branch with CI screenshots and artifacts. CodeceptJS also publishes beta builds, so check the npm dist-tag before assuming "latest" means the stable line.

## Choose the helper by risk, not fashion

CodeceptJS supports several browser and protocol helpers. Playwright is the quickstart recommendation for modern web testing. WebDriver is useful when you need W3C WebDriver semantics, cloud grids, or browser/device combinations tied to Selenium infrastructure. Puppeteer can fit Chrome-focused suites. Appium handles native mobile. REST and GraphQL helpers are for API setup, cleanup, and direct endpoint checks.

| Helper | Best fit | Watch out for |
|---|---|---|
| Playwright | Modern Chromium, Firefox, WebKit web E2E | Do not duplicate Playwright Test fixtures inside CodeceptJS |
| WebDriver | Selenium grids, vendor clouds, W3C protocol needs | Configure timeouts and remote capabilities carefully |
| Puppeteer | Chrome or Chromium-specific automation | Limited browser coverage compared with Playwright |
| Appium | Native iOS and Android flows | Device setup and app lifecycle dominate reliability |
| REST | Creating and cleaning test data by API | Pair with browser helpers for acceptance flows |
| GraphQL | Query and mutation setup for app state | Keep schemas and auth headers versioned with the app |
| JSONResponse | API response assertions | Connect it to the request helper you actually use |

\`\`\`typescript
import { setHeadlessWhen, setWindowSize } from '@codeceptjs/configure';

setHeadlessWhen(process.env.CI);
setWindowSize(1440, 1000);

export const config = {
  tests: './tests/**/*_test.ts',
  output: './output',
  require: ['tsx/esm'],
  helpers: {
    Playwright: {
      url: process.env.APP_URL || 'http://127.0.0.1:3000',
      browser: process.env.BROWSER || 'chromium',
      show: !process.env.CI,
      waitForTimeout: 5000,
    },
    REST: {
      endpoint: process.env.API_URL || 'http://127.0.0.1:3000/api',
      defaultHeaders: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    JSONResponse: {
      requestHelper: 'REST',
    },
  },
  include: {
    I: './support/steps_file.ts',
    loginPage: './pages/LoginPage.ts',
    projectPage: './pages/ProjectPage.ts',
  },
};
\`\`\`

The \`browser\` plugin can override helper settings from the CLI for Playwright, Puppeteer, WebDriver, and Appium. That is useful for local diagnosis: \`npx codeceptjs run -p browser:show\`, \`npx codeceptjs run -p browser:hide\`, or \`npx codeceptjs run -p browser:browser=firefox\`. For CI, prefer explicit matrix jobs so the result history clearly shows which browser failed.

## Write scenarios as executable test cases

A good CodeceptJS scenario reads like a test case a human QA engineer would write, with enough selectors to be stable and enough assertions to prove the outcome. The actor does actions. Page objects hide repeated mechanics. Assertions check visible state and persistent state when relevant.

\`\`\`typescript
Feature('Project dashboard');

Before(async ({ I, loginPage }) => {
  await loginPage.signInAs('qa.lead@example.com', 'correct-horse-battery');
  I.amOnPage('/projects');
});

Scenario('Create a project from the dashboard @smoke', async ({ I, projectPage }) => {
  projectPage.openCreateDialog();
  projectPage.submit({
    name: 'Checkout reliability',
    owner: 'QA Platform',
  });

  I.see('Checkout reliability', '[data-testid="project-list"]');
  I.see('QA Platform', '[data-testid="project-list"]');
});

Scenario('Prevent duplicate project names', async ({ I, projectPage }) => {
  projectPage.openCreateDialog();
  projectPage.submit({
    name: 'Checkout reliability',
    owner: 'QA Platform',
  });

  I.see('Project name already exists', '[role="alert"]');
});
\`\`\`

Do not assert only that a page loaded or a button exists. If the test creates data, prove the data is visible. If it saves a preference, navigate away and back, or verify through an API call. If it blocks a duplicate, assert the error and assert the duplicate was not added. CodeceptJS makes tests pleasant to read, but it cannot rescue a scenario that never checks the business effect.

## Page objects with inject: compose behavior without import knots

CodeceptJS page objects are listed in the config \`include\` section and injected by name into scenarios or other page objects. The docs also show a global \`inject()\` call for page object files. This pattern reduces circular import problems because CodeceptJS resolves dependencies through its container.

\`\`\`typescript
const { I } = inject();

type ProjectInput = {
  name: string;
  owner: string;
};

export default {
  fields: {
    name: '[data-testid="project-name"]',
    owner: '[data-testid="project-owner"]',
  },
  buttons: {
    newProject: 'New project',
    create: 'Create project',
  },

  openCreateDialog() {
    I.click(this.buttons.newProject);
    I.waitForVisible('[data-testid="project-dialog"]', 5);
  },

  submit(input: ProjectInput) {
    I.fillField(this.fields.name, input.name);
    I.fillField(this.fields.owner, input.owner);
    I.click(this.buttons.create);
  },

  checkVisible(name: string) {
    I.see(name, '[data-testid="project-list"]');
  },
};
\`\`\`

Use page objects for durable page semantics, not for hiding every individual line. A page object method named \`submit\` is useful. A method named \`clickBlueButtonNearTopRight\` is a selector smell. A method that makes five unrelated assertions is a maintenance trap because tests cannot reuse only the proof they need.

| Page object choice | Good use | Bad use |
|---|---|---|
| Locators | Centralize stable selectors and accessible names | Hide brittle XPath behind friendly names |
| Actions | Model page operations such as create, filter, archive | Wrap every one-line \`I.click\` without meaning |
| Assertions | Reusable page-specific checks | Giant "verify page" methods that mask failures |
| Cross-page flows | Step objects for admin setup or user onboarding | One page object controlling the whole app |

## API data: create state through stable interfaces

The CodeceptJS data management docs recommend creating and cleaning test data through application APIs rather than poking the database directly from acceptance tests. That matches how QA teams should think about E2E isolation: data setup should use a stable public or test-support interface, and cleanup should happen even when browser assertions fail.

\`\`\`typescript
Feature('Billing settings');

let accountId: string | null = null;

Before(async ({ I }) => {
  I.haveRequestHeaders({
    Authorization: 'Bearer test-admin-token',
  });

  const response = await I.sendPostRequest('/accounts', {
    name: 'CodeceptJS Billing Account',
    plan: 'trial',
  });

  accountId = response.data.id;
});

After(async ({ I }) => {
  if (accountId) {
    await I.sendDeleteRequest('/accounts/' + accountId);
  }
});

Scenario('Admin updates invoice email', async ({ I }) => {
  if (!accountId) {
    throw new Error('account was not created');
  }

  I.amOnPage('/accounts/' + accountId + '/billing');
  I.fillField('Invoice email', 'billing@example.com');
  I.click('Save billing settings');

  I.see('Billing settings saved');

  const saved = await I.sendGetRequest('/accounts/' + accountId);
  I.seeResponseCodeIs(200);
  I.seeResponseContainsKeys(['billing']);
  I.say('Verified billing state through the API');

  if (saved.data.billing.invoiceEmail !== 'billing@example.com') {
    throw new Error('invoice email was not persisted');
  }
});
\`\`\`

The guard around \`accountId\` is not optional polish. Without it, a failed setup can turn into a confusing URL such as \`/accounts/null/billing\`. Generated E2E tests often miss this and then assert a login redirect, an error page, or a random 404 as if it were application behavior.

## Runner commands that CodeceptJS actually understands

The main run command is \`npx codeceptjs run\`. Use \`--steps\` to print each step, \`--debug\` for more diagnostic output, \`--verbose\` for very detailed internals, and \`--grep\` to filter by title or tag. Parallel execution uses \`run-workers <N>\`; the current docs describe \`--by test\`, \`--by suite\`, and \`--by pool\`, with pool mode recommended for better load balancing.

| Task | Command | Notes |
|---|---|---|
| Run all tests | \`npx codeceptjs run\` | Uses config in current path |
| Run one file | \`npx codeceptjs run tests/login_test.ts\` | Keep file path explicit for agent loops |
| Show readable steps | \`npx codeceptjs run --steps\` | Good default for CI logs |
| Debug a failure | \`npx codeceptjs run --debug --grep "invoice"\` | Do not use Playwright's \`--grep\` assumptions outside CodeceptJS |
| Filter smoke tests | \`npx codeceptjs run --grep "@smoke"\` | Tags are just text in test titles or Gherkin scenarios |
| Run worker pool | \`npx codeceptjs run-workers 4 --by pool\` | Requires isolated data and artifacts |
| Override config | \`npx codeceptjs run -o '{ "helpers": { "Playwright": { "browser": "firefox" } } }'\` | Useful for one-off diagnosis |
| Generate typings | \`npx codeceptjs def\` | Helps TypeScript and autocomplete for \`I\` |

If an agent keeps trying \`-t\` or \`--testNamePattern\`, correct it. Those are conventions from other JavaScript runners, not the CodeceptJS run contract. The correct filter is \`--grep\`.

## Parallel execution without data collisions

\`run-workers\` can make suites much faster, but it multiplies every weakness in your data design. Four workers clicking the same "delete test project" button are not four times faster. They are four independent attempts to corrupt a shared fixture. Before increasing workers, make every scenario own its data or route through a test-data API that creates unique records.

\`\`\`typescript
function uniqueName(prefix: string) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

Feature('Team management');

Scenario('Manager invites a teammate @parallel', async ({ I, teamPage }) => {
  const teamName = uniqueName('qa-team');
  const email = uniqueName('member') + '@example.test';

  await teamPage.createTeam(teamName);
  teamPage.open(teamName);
  teamPage.invite(email);

  I.see(email, '[data-testid="pending-invites"]');
});
\`\`\`

Random names are not enough if cleanup is weak. Add an API cleanup step, expire test accounts automatically, or run each worker against an isolated tenant. Also keep artifacts per worker when possible. Screenshots, traces, and reports that overwrite each other are a quiet source of false confidence.

## BDD and Gherkin: use it where language is the asset

CodeceptJS can initialize Gherkin with \`npx codeceptjs gherkin:init\`, generate snippets with \`gherkin:snippets\`, list steps with \`gherkin:steps\`, and run only feature files with \`--features\` or only regular tests with \`--tests\`. The config uses a \`gherkin\` section with \`features\` and \`steps\` paths.

\`\`\`gherkin
Feature: Project limits
  In order to keep a trial workspace under control
  As a workspace owner
  I want project creation to stop at the trial limit

  @billing @smoke
  Scenario: Trial workspace reaches the project limit
    Given I have a trial workspace with 3 projects
    When I try to create another project
    Then I should see the project limit message
    And the project should not be created
\`\`\`

\`\`\`typescript
const { I, projectPage } = inject();

Given('I have a trial workspace with {int} projects', async (count: number) => {
  await projectPage.createTrialWorkspaceWithProjects(count);
});

When('I try to create another project', () => {
  projectPage.openCreateDialog();
  projectPage.submit({
    name: 'Project over limit',
    owner: 'QA',
  });
});

Then('I should see the project limit message', () => {
  I.see('Your trial workspace has reached its project limit', '[role="alert"]');
});

Then('the project should not be created', () => {
  I.dontSee('Project over limit', '[data-testid="project-list"]');
});
\`\`\`

Use Gherkin when product, QA, support, and compliance teams will actually read feature files. Do not move every regression into Gherkin out of habit. The official docs make the same practical distinction: not every test should become a feature file. Some checks are better as regular scenarios because they are technical regressions, not living business documentation.

## AI healing: useful assistant, not a source of truth

CodeceptJS AI features can assist while writing tests and can self-heal failing steps. The official AI docs show an \`ai\` config section with a model, optional \`prompts\`, \`html\`, and \`maxTokens\`, a \`generate:heal\` command, a \`heal\` plugin, and the \`--ai\` runtime flag. The docs are also clear about scope: healing works on actions such as \`click\` and \`fillField\`, not on assertions, waiters, or grabbers.

\`\`\`typescript
import './heal.js';
import { openai } from '@ai-sdk/openai';

export const config = {
  tests: './tests/**/*_test.ts',
  require: ['tsx/esm'],
  helpers: {
    Playwright: {
      url: process.env.APP_URL || 'http://127.0.0.1:3000',
      browser: 'chromium',
    },
  },
  ai: {
    model: openai('gpt-5'),
    maxTokens: 100000,
    prompts: {},
    html: {},
  },
  plugins: {
    heal: {
      enabled: true,
    },
  },
};
\`\`\`

\`\`\`bash
npm install --save-dev ai @ai-sdk/openai
export OPENAI_API_KEY="replace-me"
npx codeceptjs generate:heal
npx codeceptjs run --ai --grep "@smoke"
\`\`\`

Treat healing output as a suggested patch, not as evidence that the product works. If the AI finds a better locator for \`I.click('Submit')\`, review and commit the locator or page object change. If an assertion fails, do not ask healing to guess a new expected result. Assertions are the contract. Healing should help the test reach the contract, not rewrite the contract.

## CI workflow with readable logs and artifacts

CI should preserve the things a human or agent needs after a failure: console steps, screenshots, traces if enabled, and the \`output\` directory. Use current GitHub Actions majors, keep artifact names slash-free, and split browser matrices only after data isolation is proven.

\`\`\`yaml
name: codeceptjs-e2e

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22.12.0
          cache: npm

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run CodeceptJS smoke tests
        env:
          APP_URL: http://127.0.0.1:3000
          API_URL: http://127.0.0.1:3000/api
        run: npm run e2e:smoke

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: codeceptjs-output
          path: output
\`\`\`

If your app server is started in the same workflow, make readiness explicit. A fixed \`sleep 10\` is a flaky contract. Use a health-check loop or the platform's service container health options, then run CodeceptJS. When CI fails, do not rerun blindly. Inspect the step log, the screenshot, the helper involved, and whether the test data was created.

## A realistic failure mode: the click passes, the side effect never happens

The most common CodeceptJS failure I see in generated suites is a scenario that clicks through a flow, asserts a toast, and never verifies the durable side effect. Locally it feels fine because the UI flashes "Saved." In CI, a backend validation bug or race drops the update after the toast.

\`\`\`typescript
Scenario('User changes notification preference', async ({ I }) => {
  I.amOnPage('/settings/notifications');
  I.checkOption('Email me weekly summaries');
  I.click('Save preferences');

  I.see('Preferences saved');

  I.amOnPage('/settings/notifications');
  I.seeCheckboxIsChecked('Email me weekly summaries');

  const response = await I.sendGetRequest('/me/preferences');
  I.seeResponseCodeIs(200);

  if (response.data.notifications.weeklySummary !== true) {
    throw new Error('weekly summary preference was not persisted');
  }
});
\`\`\`

Diagnosis checklist: run with \`--steps\` first, then \`--debug\` if the failing step is unclear. Confirm that the helper has the command you are calling with \`npx codeceptjs list --action I.checkOption\`. If only CI fails, compare browser mode, base URL, test data, and worker count. If the UI assertion passes but API state is wrong, the test found a product bug or an eventually consistent path that needs a deterministic wait on the real persisted state.

## Where CodeceptJS fits in an agent-heavy QA workflow

CodeceptJS is unusually friendly to AI coding agents because the scenario language is compact. The agent does not need to parse long locator chains to understand a workflow. It can run a filtered scenario with \`--grep\`, read step output, inspect a page object, and patch the abstraction. Once, where it fits naturally in a team workflow, ready-made QA skills install from qaskills.sh with the qaskills CLI, and CodeceptJS-style skills can encode the exact commands, artifact paths, and retry policy your repo uses.

The strongest pattern is to put the repository contract in one place: \`npm run e2e:smoke\`, \`npm run e2e:debug\`, \`npm run e2e:workers\`, and a short QA skill or README note that says which tags are safe in CI. Then agents can work like disciplined junior automation engineers: reproduce, narrow, patch, rerun, and leave artifacts.

## Frequently Asked Questions

### Is CodeceptJS just a wrapper around Playwright?

No. Playwright is one supported helper and the recommended quickstart path, but CodeceptJS can also use WebDriver, Puppeteer, Appium, REST, GraphQL, and other helpers. The framework's core value is the actor-based scenario syntax, dependency injection, page objects, plugins, and runner behavior. If your team wants direct Playwright fixtures and expects every test to manipulate \`page\`, use Playwright Test. If your team wants readable test cases over helper backends, CodeceptJS fits.

### Which filter flag should I use in CodeceptJS?

Use \`--grep\`. For example, \`npx codeceptjs run --grep "@smoke"\` runs tests or Gherkin scenarios whose names include that tag, and \`npx codeceptjs run --grep "checkout"\` narrows by title text. Do not use filter flags from other JavaScript runners unless you are running those tools directly. Runner flag confusion is one of the easiest ways for agent-authored commands to waste time.

### Should I enable AI healing in CI?

Only after you decide how suggestions will be reviewed. The \`heal\` plugin can help actions recover from locator drift when tests run with \`--ai\`, but it does not heal assertions, waiters, or grabbers. That boundary is healthy. Let AI propose a better click or fill locator, then review and commit the patch. Do not let healing convert failed product expectations into new expected behavior.

### When should I use Gherkin instead of normal scenarios?

Use Gherkin when the feature file is valuable living documentation for product, QA, support, compliance, or customer-facing stakeholders. Keep it focused on business rules and representative examples. Use normal CodeceptJS scenarios for technical regressions, edge cases, and checks that only automation engineers will read. CodeceptJS can run both, so you do not need to force every test into one style.
`,
};
