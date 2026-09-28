import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Skills for AI Coding Agents: Claude Code, Cursor, and Copilot',
  description: 'Evaluate Cypress skills for AI coding agents in 2026: selectors, intercepts, custom commands, component testing, CI, debugging, and flake control.',
  date: '2026-09-28',
  category: 'AI Testing',
  content: `
# Cypress Skills for AI Coding Agents: Claude Code, Cursor, and Copilot

Cypress skills are \`SKILL.md\` instruction packages that teach AI coding agents how to write, review, run, and debug Cypress tests using current Cypress conventions. In 2026 this is no longer just a community workaround: Cypress now maintains official AI skills in \`cypress-io/ai-toolkit\`, and its docs list five available skills: \`cypress-author\`, \`cypress-explain\`, \`cypress-docs\`, \`cypress-tap\`, and \`cypress-cloud-cli\`.

The current Cypress App version is \`16.1.0\`, released September 15, 2026, two weeks after 16.0.0 opened the major line on September 1. That matters because Cypress 16 changed real network behavior in Chrome-family browsers through HTTP/2 support, removed older environment patterns, and continues the migration toward \`cy.env()\` for sensitive values and \`Cypress.expose()\` for public configuration. Any Cypress skill that still teaches \`cy.route()\`, \`cy.server()\`, old \`Cypress.env()\` usage, or stale GitHub Actions examples should be fixed or rejected.

For QA engineers using Claude Code, Cursor, Copilot, Codex, or similar agents, the payoff is consistency. A good Cypress skill keeps the agent from inventing selectors, waiting with arbitrary sleeps, hiding flaky state in UI login flows, or declaring success without running a focused spec. A bad skill scales the exact mistakes you were trying to remove from your suite.

## The 2026 Cypress skill landscape

Cypress AI Skills are active and officially documented. Cypress says the skills run inside your own coding agent and work with tools that accept custom instructions, including Cursor, Claude Code, and GitHub Copilot. The Cypress AI features page also says AI Skills and the \`cypress tap\` CLI run locally and do not require a Cypress Cloud account. Some Cloud features need an account, but skills themselves are not gated behind paid Cypress Cloud access.

Install options currently include the \`skills\` CLI and GitHub CLI:

\`\`\`bash
npx skills add cypress-io/ai-toolkit

npx skills add https://github.com/cypress-io/ai-toolkit --skill cypress-author
npx skills add https://github.com/cypress-io/ai-toolkit --skill cypress-docs
npx skills add https://github.com/cypress-io/ai-toolkit --skill cypress-tap

gh skill install cypress-io/ai-toolkit cypress-author
\`\`\`

The official toolkit README also describes a plugin route, with a Claude Community Plugins marketplace path and a pending Cursor marketplace listing at the time it was crawled. For team QA work, I would still start with explicit skill installation in a repository branch. It is easier to review the exact files the agent will read.

| Official Cypress skill | Primary job | Best QA use |
|---|---|---|
| \`cypress-author\` | Create, update, and fix Cypress tests | New coverage, selector cleanup, assertion improvement |
| \`cypress-explain\` | Explain and critique existing tests | Suite audits and onboarding |
| \`cypress-docs\` | Ground agent answers in Cypress docs | Version-sensitive questions and API checks |
| \`cypress-tap\` | Drive a live \`cypress open\` session | Agentic local debugging and verification |
| \`cypress-cloud-cli\` | Investigate Cypress Cloud data from terminal | CI triage, recorded failure analysis, Test Replay context |

qaskills.sh can also list Cypress-oriented skills installable with the qaskills CLI, but do not assume any specific install counts, rankings, or names unless you verify them on the site. Treat all directories as discovery sources and the actual \`SKILL.md\` as the artifact to review.

## What a good Cypress skill should encode

A useful Cypress skill is not a generic "write tests" prompt. It should encode Cypress-specific judgment at the points where agents tend to drift.

| Area | Weak skill behavior | Strong skill behavior |
|---|---|---|
| Selectors | Uses classes, text, or generated ids first | Prefers stable \`data-*\` attributes or accessible locators by policy |
| Network control | Sleeps after UI actions | Uses \`cy.intercept()\`, aliases, and meaningful response assertions |
| State setup | Logs in through the UI for every spec | Uses programmatic login, API setup, or controlled fixtures |
| Assertions | Checks that a status code is 200 only | Checks visible result, persisted side effect, and error state |
| Async flow | Mixes promises with Cypress commands casually | Keeps Cypress command queue semantics clear |
| CI | Runs everything locally without artifacts | Supports focused specs, browser choice, recording, screenshots, and videos |
| Debugging | Stops at "test failed" | Reads command log, error frame, request data, and DOM state |

The Cypress best-practices docs still call out brittle selectors as an anti-pattern and recommend \`data-*\` attributes for resilient test targeting. A skill should not repeat that as a slogan. It should show the agent exactly how to apply it in your codebase.

For example, put selector helper policy in support code and teach the agent to reuse it:

\`\`\`typescript
declare global {
  namespace Cypress {
    interface Chainable {
      getByCy(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add('getByCy', (value: string) => {
  return cy.get(\`[data-cy="\${value}"]\`);
});

export {};
\`\`\`

That command is small, typed, and reviewable. It also gives the agent a local convention to follow instead of choosing selector style from memory.

## Cypress 16 details your skill must know

Cypress 16 is a line in the sand for outdated instructions. The changelog says Chrome, Chromium, and Edge intercept test traffic on the native browser network rather than routing it through Cypress. It also says a few \`cy.intercept()\` behaviors differ: \`req.httpVersion\` is no longer reported, compression headers are no longer present on intercepted responses, and Firefox, WebKit, and Electron continue on the legacy path unless \`forceHttp1\` is used while migrating.

The migration docs also reinforce that old \`cy.server()\` and \`cy.route()\` commands are gone and that \`cy.intercept()\` is the command to stub network requests. For environment data, Cypress 15.10 introduced the modern split: use \`cy.env()\` for sensitive values and \`Cypress.expose()\` for public configuration. The Cypress 16 migration path removes old \`Cypress.env()\` usage, and official plugin guidance now pushes public plugin configuration through \`--expose\`.

| Version-sensitive topic | Current guidance | Skill review question |
|---|---|---|
| Cypress App | \`16.1.0\` is current on npm (16.0.0 shipped September 1, 2026) | Does the skill mention Cypress 16 changes where relevant? |
| Network stubbing | Use \`cy.intercept()\` | Does it avoid \`cy.route()\` and \`cy.server()\`? |
| Public config | \`Cypress.expose()\` and \`--expose\` | Does it avoid teaching public values through old env paths? |
| Sensitive config | \`cy.env()\` and CI secrets | Does it keep secrets out of command lines and logs? |
| GitHub Action | \`cypress-io/github-action@v7\` | Does it avoid deprecated v6 or older examples? |
| Test filtering | \`--spec\` natively, \`@cypress/grep\` for title and tag filters | Does it use real Cypress flags? |

This is the fastest way to spot a stale Cypress skill. If the first examples are old, the agent will copy old code.

## Install and pin skills for each agent

The open skills ecosystem can install the same skill source into multiple agents, but every team should still decide where policy lives. Project-level installs are better for QA conventions because they travel with the repository. Global installs are convenient for personal workflows but can create "works on my agent" behavior.

A project bootstrap command might be:

\`\`\`bash
npx skills add https://github.com/cypress-io/ai-toolkit \\
  --skill cypress-author \\
  --skill cypress-docs \\
  --skill cypress-tap \\
  --agent claude-code \\
  --agent cursor \\
  --agent codex \\
  --yes
\`\`\`

For a full directory-level comparison of QA skill sources, see [AI QA Skills Directory 2026](/blog/ai-qa-skills-directory-2026). For Cypress-specific end-to-end examples beyond agent skills, see [Cypress E2E Testing AI Agents Guide](/blog/cypress-e2e-testing-ai-agents-guide).

After installation, inspect the generated folders. Do not skip this step because install success does not prove that your active agent session loaded the skill. Agents differ in how they discover rules, refresh context, and expose slash commands.

## Selector strategy the agent can actually follow

The best Cypress selector strategy is boring and explicit. Decide what your application supports, encode it in the skill, and add a lint or review check where possible.

| Selector type | When to allow | Risk |
|---|---|---|
| \`[data-cy="..."]\` | Primary Cypress automation hooks | Requires developers to add attributes |
| \`[data-testid="..."]\` | Shared testing convention across tools | May be less Cypress-specific but still stable |
| Accessible role and name | User-facing flows with stable semantics | Can break on copy or i18n changes |
| Visible text | Confirmation messages and labels that are product contract | Brittle for translated or marketing-edited text |
| CSS class | Rarely, only stable component API classes | Usually tied to styling |
| Generated id | Avoid | Often changes between builds |

An agent-friendly Cypress test should read like a user flow but assert more than appearance:

\`\`\`typescript
describe('checkout discount', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/discounts/apply').as('applyDiscount');
    cy.visit('/checkout');
  });

  it('applies a valid discount and updates the order total', () => {
    cy.getByCy('discount-code').type('SAVE10');
    cy.getByCy('apply-discount').click();

    cy.wait('@applyDiscount')
      .its('response.statusCode')
      .should('eq', 200);

    cy.getByCy('discount-line').should('contain.text', 'SAVE10');
    cy.getByCy('order-total').should('contain.text', '90.00');
    cy.getByCy('payment-submit').should('not.be.disabled');
  });
});
\`\`\`

The skill should prefer this shape: arrange the network, perform the user action, wait for the relevant request, then assert visible side effects. A status code alone is not enough. A DOM text check alone is often not enough either.

## \`cy.intercept()\` patterns agents need

\`cy.intercept()\` is where AI-generated Cypress tests often become subtly wrong. The agent may intercept after the action, overmatch a URL, stub the happy path without checking the request body, or wait on an alias that never matches. A good Cypress skill should teach three patterns.

First, register intercepts before the user action that triggers them. Second, make route matchers specific enough to protect against accidental matches. Third, assert on the request and response when the business behavior depends on them.

\`\`\`typescript
type CreateProjectRequest = {
  name: string;
  template: string;
};

type CreateProjectResponse = {
  id: string;
  name: string;
};

describe('project creation', () => {
  it('sends the selected template and opens the new project', () => {
    cy.intercept<CreateProjectRequest, CreateProjectResponse>(
      'POST',
      '/api/projects',
      (req) => {
        expect(req.body.name).to.match(/^QA smoke project$/);
        expect(req.body.template).to.equal('web-app');
        req.reply({
          statusCode: 201,
          body: { id: 'proj_123', name: 'QA smoke project' },
        });
      }
    ).as('createProject');

    cy.visit('/projects/new');
    cy.getByCy('project-name').type('QA smoke project');
    cy.getByCy('template-web-app').click();
    cy.getByCy('create-project').click();

    cy.wait('@createProject')
      .its('response.body.id')
      .should('eq', 'proj_123');

    cy.location('pathname').should('eq', '/projects/proj_123');
  });
});
\`\`\`

That sample uses an anchored regex for the exact project name, checks the request body, stubs a deterministic response, and verifies navigation. Those are the kinds of assertions a skill should nudge an agent toward.

## Custom commands without hiding the test

Custom commands are useful when they encode a domain action or a repeated selector convention. They become harmful when they hide every meaningful step behind vague verbs such as \`cy.doCheckout()\` with no assertions nearby.

Use custom commands for login and stable data setup, but keep test-specific expectations in the spec:

\`\`\`typescript
declare global {
  namespace Cypress {
    interface Chainable {
      loginByApi(email: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginByApi', (email: string) => {
  cy.request('POST', '/api/test/session', { email }).then((response) => {
    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('userId');
  });
});

export {};
\`\`\`

Then in a spec:

\`\`\`typescript
describe('account navigation', () => {
  beforeEach(() => {
    cy.loginByApi('qa-user@example.com');
  });

  it('opens the billing page from account settings', () => {
    cy.visit('/account');
    cy.getByCy('billing-link').click();
    cy.location('pathname').should('eq', '/account/billing');
    cy.getByCy('billing-heading').should('contain.text', 'Billing');
  });
});
\`\`\`

The skill should tell agents not to add custom commands for one-off code. A local helper function inside the spec is better when reuse is not real yet.

## Component testing instructions belong in the skill too

Cypress component testing has different defaults from E2E testing. The configuration docs show \`e2e\` and \`component\` objects inside \`defineConfig\`. E2E defaults to \`cypress/e2e/**/*.cy.{js,jsx,ts,tsx}\`; component testing defaults to \`**/*.cy.{js,jsx,ts,tsx}\`, with files matching the E2E pattern automatically excluded from component specs.

A skill should teach the agent to check whether the repository already has component testing configured before adding examples. For React with Vite, a minimal config can look like this:

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
});
\`\`\`

Component tests should assert component contract, not re-create a whole end-to-end journey:

\`\`\`tsx
import React from 'react';
import { DiscountBanner } from './DiscountBanner';

describe('<DiscountBanner />', () => {
  it('shows the applied discount and calls remove when dismissed', () => {
    const onRemove = cy.stub().as('onRemove');

    cy.mount(
      <DiscountBanner code="SAVE10" amountLabel="$10.00" onRemove={onRemove} />
    );

    cy.contains('SAVE10').should('be.visible');
    cy.contains('$10.00').should('be.visible');
    cy.contains('button', 'Remove').click();
    cy.get('@onRemove').should('have.been.calledOnce');
  });
});
\`\`\`

This example is intentionally small. Component testing catches rendering and interaction contracts close to the component, while E2E testing checks the integrated flow.

## CI examples the agent should generate in 2026

Cypress documents \`cypress-io/github-action@v7\` as the current recommended major. The action README says v7 uses \`node24\`, supports Node.js 22, 24, and 26 for command-type action options, and is compatible with Cypress 10 and above. It also notes \`github-action@v6\` is deprecated because it uses Node 20, and earlier versions are unsupported.

A current GitHub Actions workflow should use current action majors:

\`\`\`yaml
name: Cypress E2E

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  e2e:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - name: Cypress run
        uses: cypress-io/github-action@v7
        with:
          build: npm run build
          start: npm start
          browser: chrome
          spec: cypress/e2e/**/*.cy.ts
      - name: Upload Cypress artifacts
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: cypress-artifacts-\${{ github.run_id }}
          path: |
            cypress/screenshots
            cypress/videos
\`\`\`

If Cypress Cloud recording is enabled, use CI secrets for the record key. Cypress docs say \`CYPRESS_RECORD_KEY\` must be a real operating system environment variable when omitting \`--key\`; it is not read from \`cypress.env.json\` or the \`env\` block in Cypress config.

For test selection, Cypress natively supports \`--spec\`. For filtering by test title or tags, \`@cypress/grep\` is now the official plugin, current at \`7.0.0\` in the plugin list. Its modern examples use \`--expose\`, not \`--env\`, for public filter values:

\`\`\`bash
npx cypress run --spec "cypress/e2e/checkout.cy.ts"
npx cypress run --expose grep="checkout",grepFilterSpecs=true
npx cypress run --expose grepTags="@smoke",grepFilterSpecs=true,grepOmitFiltered=true
\`\`\`

That distinction is exactly why agent skills need maintenance. A model trained on old snippets may confidently generate \`--env grepTags=@smoke\`, but current Cypress guidance for public plugin configuration uses \`--expose\`.

## Using \`cypress tap\` for agentic debugging

\`cypress tap\` is a Cypress CLI extension for interacting with a live \`cypress open\` session from the terminal. The docs say it requires Cypress \`15.21.0\` or later, a supported browser, and an open-mode session to attach to. It can list specs, run a spec, poll status, read reporter output, inspect a failing command, and query the DOM or accessibility tree at the moment of failure.

The workflow looks like this:

\`\`\`bash
npx cypress open --e2e --browser=chrome
npx cypress tap specs
npx cypress tap run cypress/e2e/checkout.cy.ts
npx cypress tap status
npx cypress tap reporter
npx cypress tap reporter --test-id r5
\`\`\`

The Cypress docs explicitly warn that \`status\` exits zero for a determinable stage, so a poller must branch on the output rather than trusting the exit code. A skill should include that nuance. Otherwise an agent may treat "status command succeeded" as "test passed", which is a real failure mode.

## Realistic failure mode: the agent fixes the wrong test

Here is a common agentic Cypress failure. CI reports one failure in \`checkout.cy.ts\`. The agent opens the file, sees a similar test name, edits selectors in the wrong scenario, runs \`npx cypress run --spec cypress/e2e/checkout.cy.ts\`, and reports success because the edited test passes locally. The original failure remains in CI because it was browser-specific or tag-filtered.

Diagnosis:

1. Compare the failing test title, spec path, browser, viewport, and command log from CI.
2. Reproduce the same spec and browser locally with \`--spec\` and \`--browser\`.
3. If the team uses \`@cypress/grep\`, reproduce the same title or tag filter with \`--expose grep=...\` or \`--expose grepTags=...\`.
4. If using \`cypress tap\`, run the spec in open mode, poll for a fresh verdict, then read \`reporter --test-id <id>\`.
5. Only edit after the reproduced failure matches CI.
6. Assert the side effect that failed, not only the UI step that timed out.

A good skill writes that loop into the agent’s behavior. The agent should not start by patching code. It should start by narrowing identity: which test, which run conditions, which command, which observable failure.

## What people get wrong about Cypress skills

The biggest misunderstanding is treating a Cypress skill as a prompt shortcut. "Write good Cypress tests" is not enough. The skill should tell the agent what your team considers a good test: selector contract, setup path, network policy, fixture style, assertion depth, artifact expectations, and the minimum verification loop before completion.

Another mistake is asking the agent to write page objects because that pattern feels familiar from Selenium. Cypress docs have long pushed teams toward controlling state, testing flows directly, and avoiding needless layers that hide what the test does. Page objects can exist in a mature codebase, but a generic skill should not default to wrapping every page in a class.

The third mistake is forgetting that Cypress is both a local authoring tool and a CI signal. A skill that only writes specs is half a skill. It should also know how to run one spec, how to use \`cypress-io/github-action@v7\`, when to upload screenshots and videos, when to record to Cypress Cloud, and how to avoid leaking secrets into command output.

## A scorecard for choosing or writing a Cypress skill

Use this scorecard when comparing official skills, directory listings, or internal skills:

| Category | 0 points | 1 point | 2 points |
|---|---|---|---|
| Version awareness | Old APIs appear | Mostly current | Names Cypress 16 and migration-sensitive APIs |
| Selector policy | No policy | Mentions data attributes | Provides repo-specific helper and fallback order |
| Network testing | Uses waits or status only | Uses \`cy.intercept()\` | Asserts request, response, and UI side effects |
| State control | UI login everywhere | Some API setup | Clear programmatic setup and cleanup rules |
| Component testing | Ignored | Generic mention | Distinguishes E2E and component config |
| CI | Stale action versions | Basic run | Current action versions, artifacts, browser, filtering |
| Debugging | Tells agent to inspect failure | Runs focused spec | Uses \`cypress tap\` or Cloud context accurately |
| Security | Secrets in examples | Mentions secret store | Separates \`cy.env()\`, \`Cypress.expose()\`, CI secrets |

Reject or rewrite skills that score zero in version awareness, security, or CI. Those are the areas where a wrong answer can waste hours or leak data.

## Frequently Asked Questions

### Are Cypress skills officially maintained?

Yes, Cypress now maintains official AI skills in \`cypress-io/ai-toolkit\`. The official docs list \`cypress-author\`, \`cypress-explain\`, \`cypress-docs\`, \`cypress-tap\`, and \`cypress-cloud-cli\`. Community Cypress skills can still be useful, but evaluate them separately. Check whether they mention Cypress 16, \`cypress-io/github-action@v7\`, \`cy.intercept()\`, \`cy.env()\`, and \`Cypress.expose()\` before adopting them.

### Do Cypress skills require a paid Cypress Cloud plan?

No. Cypress says AI Skills and the \`cypress tap\` CLI can run locally without a Cypress Cloud account. Some AI capabilities and Cloud tools use Cypress Cloud data or account controls, and Cypress lists plan-dependent limits for features such as \`cy.prompt()\`. For basic agent instructions that help Claude Code, Cursor, or Copilot write and debug tests, the skill files themselves are not a paid Cloud feature.

### Should a Cypress skill prefer \`data-cy\` selectors or accessibility selectors?

For durable automation, prefer a documented order rather than a single slogan. Cypress best practices recommend \`data-*\` attributes because they are isolated from styling and JavaScript behavior changes. Accessibility locators can be excellent when labels and roles are stable product contracts. In internationalized apps, text-based locators can be fragile. Your skill should encode the team’s chosen order and reuse local helper commands.

### How do I know a Cypress skill is outdated?

Look for old APIs and old infrastructure examples. Red flags include \`cy.server()\`, \`cy.route()\`, public plugin settings through old \`--env\` examples, \`Cypress.env()\` for values that should use modern APIs, \`cypress-io/github-action@v6\` or older, and tests that rely on arbitrary waits. Also check whether the skill knows \`cypress tap\`, \`@cypress/grep\` with \`--expose\`, and Cypress 16 network changes.
`,
};
