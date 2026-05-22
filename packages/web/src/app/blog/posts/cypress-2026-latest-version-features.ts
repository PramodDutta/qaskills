import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress 2026 Latest Version: Features and Setup',
  description:
    'A complete guide to the latest Cypress release in 2026 — new features, breaking changes, setup, configuration, and migration from older versions with side-by-side examples.',
  date: '2026-05-12',
  category: 'Tutorial',
  content: `
The Cypress release cadence has stayed steady through 2026, with the team shipping several headline features that materially change how end-to-end suites are written, debugged, and scaled. This guide walks through the latest Cypress version available today (Cypress 14.x for most users, with 15.x in active development), what is new, what is deprecated, and how to set it up from scratch.

If you are still on Cypress 12 or 13, this is the article to read before upgrading. We cover migration paths, breaking changes, and the configuration patterns that have become standard.

## Key Takeaways

- **Cypress 14 is the current stable line.** It includes promoted WebKit support, improved component testing for Vue 3 / Angular 17 / React 19, and a redesigned origin handling for cross-domain tests.
- **Node.js 20 is the minimum.** Node 18 has been dropped; Node 22 is fully supported.
- **Configuration moved to TypeScript-first.** \`cypress.config.ts\` with typed plugins is the recommended setup.
- **Cypress Cloud has matured.** Parallel execution, flake detection, and analytics are now table stakes.
- **Migration is mostly mechanical** but watch for deprecated commands like \`cy.server()\` and \`cy.route()\`.
- **AI integration is first-class** -- Cypress now supports test recording inputs that feed AI-assisted authoring.

---

## What Is New in Cypress 14 (and Early 15)

Cypress 14 has been the focus of the team since late 2025. The headline changes that affect day-to-day testing:

### 1. WebKit Support Is Production-Ready

WebKit (the Safari engine) is no longer experimental. You can run your full suite against Safari-equivalent rendering without any \`--experimental\` flags.

\`\`\`bash
npx cypress run --browser webkit
\`\`\`

This closes a gap that Playwright held for years -- Safari coverage in Cypress used to require expensive third-party services or local-only manual runs.

### 2. Component Testing for Modern Frameworks

Cypress Component Testing now ships with first-class mount adapters for:

- React 19 (with the new compiler)
- Vue 3.4+
- Angular 17 standalone components
- Svelte 5

### 3. Improved cy.session and Cross-Origin Auth

\`cy.session()\` and \`cy.origin()\` were rebuilt under the hood for better reliability with SSO flows. You can now log in via a third-party identity provider and return to your application without the cookie loss issues that plagued earlier versions.

### 4. Faster Test Startup

The runner's startup time was cut roughly in half by lazy-loading internal modules. Spec files now begin executing several seconds sooner -- a big win for short suites.

### 5. Native ESM and TypeScript

You can now write \`cypress.config.ts\` and \`*.cy.ts\` files without ts-node configuration. Cypress's internal bundler handles TypeScript and ESM natively.

---

## Installation and Setup

### Prerequisites

- Node.js 20 or 22
- npm 10+, pnpm 9+, or yarn 4+
- macOS 12+, Windows 10+, or Ubuntu 22.04+

### New Project Setup

\`\`\`bash
mkdir my-cypress-app && cd my-cypress-app
npm init -y
npm install --save-dev cypress typescript
npx cypress open
\`\`\`

The first \`cypress open\` launches the configuration wizard, which scaffolds:

\`\`\`
cypress/
  e2e/
    spec.cy.ts
  fixtures/
  support/
    commands.ts
    e2e.ts
cypress.config.ts
\`\`\`

### Recommended cypress.config.ts

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // Plugins, tasks, environment overrides
      return config;
    },
    retries: {
      runMode: 2,
      openMode: 0,
    },
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
\`\`\`

---

## Writing Your First Test

\`\`\`typescript
// cypress/e2e/login.cy.ts
describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('logs in with valid credentials', () => {
    cy.intercept('POST', '/api/auth/login').as('login');

    cy.get('[data-cy=email]').type('alice@example.com');
    cy.get('[data-cy=password]').type('SecurePass1!');
    cy.get('[data-cy=submit]').click();

    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.url().should('include', '/dashboard');
    cy.get('[data-cy=user-name]').should('contain', 'Alice');
  });

  it('shows an error for invalid credentials', () => {
    cy.intercept('POST', '/api/auth/login', { statusCode: 401, body: { error: 'Invalid' } }).as('login');

    cy.get('[data-cy=email]').type('alice@example.com');
    cy.get('[data-cy=password]').type('wrong');
    cy.get('[data-cy=submit]').click();

    cy.wait('@login');
    cy.get('[data-cy=error]').should('contain', 'Invalid');
  });
});
\`\`\`

---

## Migration from Cypress 12 / 13 to 14

### Deprecations and Removals

- \`cy.server()\` and \`cy.route()\` -- removed. Use \`cy.intercept()\`.
- \`cy.task('clear:db')\` no longer auto-resolves promises. Return them explicitly.
- Node 18 support dropped.
- \`pluginsFile\` removed from config -- use \`setupNodeEvents\` in \`cypress.config.ts\`.

### Migration Steps

**1. Update Node.js**

\`\`\`bash
nvm install 20
nvm use 20
\`\`\`

**2. Update Cypress**

\`\`\`bash
npm install --save-dev cypress@latest
\`\`\`

**3. Convert cypress.config.js to TypeScript**

Rename and add types as shown in the recommended config above.

**4. Replace cy.server / cy.route**

Old:

\`\`\`javascript
cy.server();
cy.route('POST', '/api/checkout', { ok: true }).as('checkout');
\`\`\`

New:

\`\`\`javascript
cy.intercept('POST', '/api/checkout', { ok: true }).as('checkout');
\`\`\`

**5. Update cy.session usage**

If you were using a session ID that included objects, switch to arrays of primitives:

\`\`\`javascript
// Old (still works but discouraged)
cy.session({ user: 'alice' }, () => { /* ... */ });

// New
cy.session(['alice', 'admin'], () => { /* ... */ });
\`\`\`

---

## Component Testing Setup

Component testing has matured significantly. The setup for a Vite-based React app:

\`\`\`typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
  },
});
\`\`\`

\`\`\`typescript
// src/components/button.cy.tsx
import { Button } from './button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const onClick = cy.stub();
    cy.mount(<Button onClick={onClick}>Save</Button>);
    cy.get('button').click();
    cy.wrap(onClick).should('have.been.calledOnce');
  });
});
\`\`\`

---

## CI Configuration

GitHub Actions remains the most popular CI for Cypress. The recommended workflow:

\`\`\`yaml
name: Cypress
on: [push, pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          browser: \${{ matrix.browser }}
          record: true
          parallel: true
        env:
          CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

---

## Cypress 15 Preview: What Is Coming

Cypress 15 is in active development and brings several deeper changes:

- **Native multi-tab support.** Open multiple browser tabs in a single test without \`cy.origin()\` workarounds.
- **Improved network observability.** A new "Network" panel in the Test Runner inspired by browser devtools.
- **WebAuthn / passkey testing.** Built-in helpers for testing passwordless flows.
- **AI authoring assistance.** Type a natural language description; Cypress 15 scaffolds an initial test for you to refine.
- **Faster CI workers.** A redesigned scheduler reduces parallel job overhead.

Expect general availability in Q3 2026.

---

## Side-by-Side: Cypress 13 vs Cypress 14

### Cypress 13

\`\`\`javascript
// cypress.config.js
module.exports = {
  e2e: {
    setupNodeEvents(on, config) { /* ... */ },
  },
};

cy.server();
cy.route('POST', '/api/login').as('login');
\`\`\`

### Cypress 14

\`\`\`typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) { /* ... */ },
  },
});

cy.intercept('POST', '/api/login').as('login');
\`\`\`

---

## Anti-Patterns to Avoid in Cypress 14

### Mixing Cypress 13 Patterns

Do not import \`cy.server()\` from older docs into a new Cypress 14 project. The command does not exist anymore.

### Pinning to ^14.0.0

Cypress occasionally ships minor versions with breaking changes for community plugins. Pin to an exact version (\`"cypress": "14.5.0"\`) and update intentionally.

### Skipping the Cypress Cloud Setup in CI

Without Cypress Cloud (or an equivalent dashboard), parallel runs are harder to coordinate and you lose flake detection.

### Using cypress-image-snapshot

This community plugin has not kept pace with Cypress 14. Use Percy, Applitools, or the official Cypress visual snapshot support instead.

---

## Setting Up Cypress with Modern Build Tools

### Next.js 15

\`\`\`typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
\`\`\`

\`\`\`bash
# package.json scripts
"scripts": {
  "dev": "next dev",
  "cy:open": "cypress open",
  "test:e2e": "start-server-and-test dev http://localhost:3000 'cypress run'"
}
\`\`\`

### Vite + React

\`\`\`typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: { framework: 'react', bundler: 'vite' },
  },
});
\`\`\`

### SvelteKit

\`\`\`typescript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
  },
});
\`\`\`

---

## Automate Cypress Setup with AI Agents

Setting up Cypress correctly the first time -- with the right config, CI integration, and best practices baked in -- saves weeks of refactoring later. AI coding agents with QA-specific skills can scaffold a production-grade Cypress project in minutes.

\`\`\`bash
npx @qaskills/cli add cypress-e2e
npx @qaskills/cli add cicd-github-actions
\`\`\`

With these skills installed, your agent will:

- Generate a complete \`cypress.config.ts\` tuned for your framework
- Add \`data-cy\` attributes to your components automatically
- Wire up \`cy.session()\` for your authentication flow
- Create GitHub Actions workflows for parallel runs
- Configure visual regression with Percy or Applitools

Browse all available skills at [qaskills.sh/skills](/skills).

---

## Frequently Asked Questions

### What is the latest Cypress version?

As of 2026, Cypress 14 is the current stable line, with 15.x in preview. Always check \`npm view cypress version\` for the absolute latest.

### Can I still use Cypress with Node 18?

No. Cypress 14 requires Node 20 or 22.

### Is Cypress better than Playwright in 2026?

They are different tools with different strengths. Cypress excels at developer experience and debugging; Playwright leads in browser breadth, parallelism, and mobile emulation. See our [Cypress vs Playwright 2026 comparison](/blog/cypress-vs-playwright-2026).

### How do I install Cypress in an existing project?

\`\`\`bash
npm install --save-dev cypress
npx cypress open
\`\`\`

The first \`cypress open\` runs the launchpad which scaffolds your config.

### Does Cypress 14 support Safari?

Yes -- WebKit (Safari's engine) is fully supported in Cypress 14. Run with \`--browser webkit\`. See our [Cypress browser support guide](/blog/cypress-browser-support-chrome-firefox-webkit) for details.

### How do I migrate from Selenium to Cypress?

Map your existing Selenium tests one at a time. Replace WebDriver waits with Cypress's automatic retries, swap CSS selectors for \`data-cy\` attributes, and move authentication to programmatic API logins. The mental model is different -- give yourself time to absorb the chainable command pattern.
`,
};
