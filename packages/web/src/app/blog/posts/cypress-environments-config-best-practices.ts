import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Environments and Config: Best Practices 2026',
  description:
    'Best practices for Cypress configuration and multi-environment testing in 2026. Config layering, env vars, secrets, retries, viewports, and CI patterns.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
# Cypress Environments and Config: Best Practices 2026

A real Cypress suite runs in more than one place. Developers run it locally against a dev backend, CI runs it against a staging environment, smoke tests run against production. Each environment has its own URLs, credentials, feature flags, and expectations. Managing this matrix without descending into config hell requires discipline: a layered config strategy, environment variables for secrets, and a clear convention for what changes per environment versus what stays constant.

This guide is the 2026 best-practices reference for Cypress configuration and multi-environment testing. We cover \`cypress.config.ts\` structure, the \`env\` object, dotenv integration, CI secrets, per-environment overrides, viewport and browser matrix, retries, timeouts, and the patterns we recommend after building config for dozens of production Cypress suites.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Config layering

Cypress reads config from multiple sources in this priority (highest wins):

1. CLI flags (\`--config\`, \`--env\`, \`--browser\`)
2. Environment variables (\`CYPRESS_*\`)
3. Plugin file (\`setupNodeEvents\`)
4. \`cypress.config.ts\` (\`env\` block)
5. \`cypress.env.json\` (a JSON file)

Treat \`cypress.config.ts\` as the source of truth for defaults. Use \`cypress.env.json\` for local overrides (gitignored). Use environment variables for CI secrets.

## Minimal config

\`\`\`typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    retries: { runMode: 2, openMode: 0 },
    video: false,
    screenshotOnRunFailure: true,
  },
  component: {
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'src/**/*.cy.{ts,tsx}',
  },
});
\`\`\`

## Environment variables

Use \`Cypress.env('key')\` to read values inside specs and support files.

\`\`\`typescript
// In a spec
cy.visit(Cypress.env('LOGIN_URL') || '/login');
cy.get('[data-testid=email]').type(Cypress.env('TEST_USER_EMAIL'));
\`\`\`

Set values via:

| Method | Example |
|---|---|
| CLI | \`cypress run --env TEST_USER_EMAIL=user@example.com\` |
| Environment | \`CYPRESS_TEST_USER_EMAIL=user@example.com cypress run\` |
| cypress.config.ts | \`env: { TEST_USER_EMAIL: process.env.TEST_USER_EMAIL }\` |
| cypress.env.json | \`{ "TEST_USER_EMAIL": "user@example.com" }\` |

## Per-environment configuration

A common pattern is one config file per environment.

\`\`\`text
cypress/
  config/
    dev.json
    staging.json
    production.json
\`\`\`

\`\`\`json
// cypress/config/staging.json
{
  "baseUrl": "https://staging.example.com",
  "env": {
    "API_URL": "https://api.staging.example.com",
    "FEATURE_FLAGS_ENDPOINT": "https://flags.staging.example.com"
  }
}
\`\`\`

Load via:

\`\`\`bash
cypress run --config-file cypress/config/staging.json
\`\`\`

Or, more flexibly, merge in \`setupNodeEvents\`:

\`\`\`typescript
import { defineConfig } from 'cypress';
import fs from 'fs';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const env = process.env.ENV || 'dev';
      const overrides = JSON.parse(
        fs.readFileSync(\`cypress/config/\${env}.json\`, 'utf-8')
      );
      return { ...config, ...overrides, env: { ...config.env, ...overrides.env } };
    },
  },
});
\`\`\`

\`cypress run\` then reads the \`ENV\` variable to pick the overrides.

## Secrets in CI

Never commit secrets. Use environment variables provided by the CI provider.

\`\`\`yaml
# GitHub Actions
- run: npx cypress run
  env:
    CYPRESS_TEST_USER_EMAIL: \${{ secrets.TEST_USER_EMAIL }}
    CYPRESS_TEST_USER_PASSWORD: \${{ secrets.TEST_USER_PASSWORD }}
    CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
\`\`\`

The \`CYPRESS_*\` prefix tells Cypress to expose the variable via \`Cypress.env\`.

## dotenv integration

For local development, dotenv simplifies environment management.

\`\`\`typescript
// cypress.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      config.env = { ...config.env, ...process.env };
      return config;
    },
  },
});
\`\`\`

\`.env.test\`:

\`\`\`bash
TEST_USER_EMAIL=user@example.com
TEST_USER_PASSWORD=secret
API_URL=http://localhost:3001
\`\`\`

## Retries

Configure retries per environment. CI runs should retry more aggressively than local runs.

\`\`\`typescript
retries: {
  runMode: 2,    // CI
  openMode: 0,   // local
}
\`\`\`

Per-spec retries:

\`\`\`typescript
describe('flaky suite', { retries: { runMode: 3 } }, () => {
  // ...
});
\`\`\`

Per-test retries:

\`\`\`typescript
it('flaky test', { retries: 2 }, () => {
  // ...
});
\`\`\`

## Timeouts

| Key | Default | When to adjust |
|---|---|---|
| \`defaultCommandTimeout\` | 4000 | Increase for slow apps |
| \`requestTimeout\` | 5000 | Network calls |
| \`responseTimeout\` | 30000 | Slow server responses |
| \`pageLoadTimeout\` | 60000 | First page load |
| \`taskTimeout\` | 60000 | \`cy.task\` calls |

Set per-command for one-off cases:

\`\`\`typescript
cy.get('.slow-element', { timeout: 30000 }).should('be.visible');
\`\`\`

## Viewport matrix

For responsive testing, run the same specs at multiple viewports.

\`\`\`typescript
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

viewports.forEach((vp) => {
  describe(\`@\${vp.name}\`, () => {
    beforeEach(() => cy.viewport(vp.width, vp.height));
    it('renders correctly', () => {
      cy.visit('/');
      cy.contains('Sign up').should('be.visible');
    });
  });
});
\`\`\`

## Browser matrix

\`cypress run --browser chrome\` selects the browser. For CI matrix:

\`\`\`yaml
strategy:
  matrix:
    browser: [chrome, firefox, edge]
steps:
  - run: npx cypress run --browser \${{ matrix.browser }}
\`\`\`

## Headed vs headless

\`\`\`bash
cypress run --headless   # default in CI
cypress run --headed     # show the browser
cypress open             # GUI mode
\`\`\`

For debugging in CI, screenshots and videos are saved by default on failure.

## Parallelization with Cypress Cloud

For paid Cypress Cloud users, add \`--record --parallel\`:

\`\`\`yaml
- run: npx cypress run --record --parallel --group "ci-staging"
  env:
    CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
\`\`\`

Cypress Cloud distributes specs across workers based on past timing.

## Self-managed parallelization

Without Cloud, you can split specs across runners manually.

\`\`\`yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npx cypress run --spec "cypress/e2e/**/*.cy.ts" --shard \${{ matrix.shard }}/4
\`\`\`

This requires a custom plugin or wrapper script to actually split the specs; Cypress does not ship a shard flag out of the box. See community plugins like \`cypress-split\`.

## Feature flags

Per-environment feature flags via the \`env\` object:

\`\`\`typescript
// cypress.config.ts
env: {
  FEATURE_NEW_NAV: false,
}

// Per-environment override
env: {
  FEATURE_NEW_NAV: true,  // in staging.json
}

// In a spec
if (Cypress.env('FEATURE_NEW_NAV')) {
  cy.get('[data-testid=new-nav]').should('exist');
}
\`\`\`

## Best practices

1. **One default config; per-environment overrides.** Avoid copy-pasting configs.
2. **Secrets only in environment variables.** Never in git.
3. **Layer config: defaults, env, overrides.** Highest specificity wins.
4. **Retries on CI, not local.** Catches flake without masking bugs in dev.
5. **Document the matrix.** A README explains which env runs what.
6. **Version control \`cypress.config.ts\`.** Gitignore \`cypress.env.json\` for local secrets.
7. **Avoid hardcoded URLs.** Use \`baseUrl\` and \`env.API_URL\`.
8. **Set realistic timeouts.** Too short causes flake; too long masks bugs.
9. **Test the matrix on every PR.** Catch env-specific bugs before merge.
10. **Review config quarterly.** Delete unused env variables.

## Gotchas

1. **\`CYPRESS_*\` env vars are global to all specs.** Scope with \`env\` object overrides if needed.
2. **\`cypress.env.json\` overrides \`cypress.config.ts\`.** Gitignore it.
3. **\`baseUrl\` requires the path; \`API_URL\` does not.** Be explicit.
4. **Retries hide flake.** Use sparingly; investigate the underlying cause.
5. **Headless behavior can differ from headed.** Test both occasionally.
6. **Browser-specific timeouts.** Firefox sometimes needs longer.
7. **\`setupNodeEvents\` runs in Node, not the browser.** Use for env setup, not test logic.
8. **\`process.env\` is read at start-up.** Restart Cypress after editing \`.env\`.
9. **Cypress Cloud groups specs by name.** Use clear group labels.
10. **Self-managed sharding requires a plugin.** \`cypress-split\` is the most common.

## Config quick reference

| Key | Purpose |
|---|---|
| \`baseUrl\` | Default URL for \`cy.visit\` |
| \`viewportWidth\` / \`viewportHeight\` | Browser size |
| \`defaultCommandTimeout\` | Per-command timeout |
| \`requestTimeout\` | Network request timeout |
| \`responseTimeout\` | Network response timeout |
| \`retries\` | Run-mode and open-mode retry counts |
| \`video\` | Record video |
| \`screenshotOnRunFailure\` | Capture on failure |
| \`env\` | Custom variables accessible via \`Cypress.env\` |
| \`specPattern\` | Glob for spec files |
| \`supportFile\` | Path to support file |

## Conclusion and next steps

A good Cypress config is invisible: it works the same way on every developer's machine, every CI run, and every environment. Achieving that takes layering, environment variables, and a clear convention for what is configurable.

Start with a minimal \`cypress.config.ts\`. Layer in per-environment overrides via JSON files. Use environment variables for secrets. Document the matrix in a README. Review quarterly.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for CI, sessions, and fixtures guides.
`,
};
