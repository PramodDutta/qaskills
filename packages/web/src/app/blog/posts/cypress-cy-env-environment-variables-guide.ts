import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'cy.env() in Cypress: Environment Variables Without Leaking Secrets',
  description: 'cy.env guide for Cypress secrets: choose safe variable sources, migrate from Cypress.env(), wire CI, and avoid leaking tokens in logs safely.',
  date: '2026-09-28',
  category: 'Reference',
  content: `
# cy.env() in Cypress: Environment Variables Without Leaking Secrets

\`cy.env()\` is the Cypress command for reading sensitive environment variables from tests without hydrating every configured value into browser-accessible state. It was added in Cypress 15.10.0, and it became mandatory for sensitive values when \`Cypress.env()\` was removed in Cypress 16.0.0. As of the current 16.1.0 npm release, the command is active, documented, and central to Cypress secret handling.

Use \`cy.env()\` when a value is secret or privileged: API keys, service tokens, passwords, private service endpoints, seeded user credentials, or anything you would not intentionally expose to application JavaScript. Use \`Cypress.expose()\` for public, synchronous configuration such as feature flags, environment labels, API versions, plugin options, and public URLs.

The payoff is not magic redaction. Cypress documents a precise boundary: \`cy.env()\` logs requested key names, not values, but the yielded object is a normal JavaScript object. If you assert directly on the object, chain \`.its()\`, print it, or pass it into commands that log their inputs, you can still leak a secret. Good \`cy.env()\` usage is as much about discipline after the yield as it is about the command itself.

## The Exact API

The command signature is \`cy.env(keys)\` or \`cy.env(keys, options)\`. The \`keys\` argument is a string array. The command yields an object containing the requested keys, with \`undefined\` for any missing value. It is read-only: it cannot set or mutate environment variables at runtime. The two documented options are \`log\`, defaulting to \`true\`, and \`timeout\`, defaulting to \`4000\`.

| API detail | Confirmed behavior |
| --- | --- |
| Added in | Cypress \`15.10.0\` |
| Replaces | \`Cypress.env()\`, deprecated in \`15.10.0\` and removed in \`16.0.0\` |
| Signature | \`cy.env(keys)\`, \`cy.env(keys, options)\` |
| Keys type | \`String[]\`, not a single string |
| Yield | Object with values for requested keys |
| Missing key | Property value is \`undefined\` |
| Logging | Key names are logged by default, values are not |
| Mutation | Read-only, no runtime setting |

\`\`\`typescript
cy.env(['apiUrl', 'apiKey']).then(({ apiUrl, apiKey }) => {
  expect(new URL(apiUrl).origin).to.eq('https://api.example.test')
  expect(Boolean(apiKey)).to.eq(true)

  cy.request({
    method: 'GET',
    url: apiUrl + '/health',
    headers: { Authorization: 'Bearer ' + apiKey },
    log: false,
  }).its('status').should('eq', 200)
})
\`\`\`

That sample has two important traits. It requests only the keys it needs, and it never compares the secret token with an expected literal. The URL is safe to validate because it is not a secret in this example. The token is checked by presence and then used with command logging disabled.

## cy.env Versus Cypress.env Versus Cypress.expose

\`Cypress.env()\` used to be convenient because it was synchronous and globally available. It was also the problem. Cypress says the old API made accidental exposure easier because all configured environment variables were hydrated into the browser context, including values a test never read. Cypress 16 removes it entirely.

| Use case | Cypress 15 old habit | Cypress 16 API | Reason |
| --- | --- | --- | --- |
| Service API token | \`Cypress.env('SERVICE_API_TOKEN')\` | \`cy.env(['SERVICE_API_TOKEN'])\` | Sensitive, request only when needed |
| Public feature flag | \`Cypress.env('checkoutFlow')\` | \`Cypress.expose('checkoutFlow')\` | Public and synchronous |
| Plugin configuration | \`Cypress.env('pluginMode')\` | \`Cypress.expose('pluginMode')\` | Plugin code often runs outside command chains |
| Test-specific public mode | \`it(name, { env: { mode: 'guest' } }, fn)\` | \`it(name, { expose: { mode: 'guest' } }, fn)\` | \`env\` test overrides are removed |
| Dynamic secret from Node | mutate \`config.env\` in \`setupNodeEvents\` | keep \`config.env\`, read with \`cy.env()\` | Server-side source, controlled browser access |

\`\`\`typescript
import { defineConfig } from 'cypress'

export default defineConfig({
  env: {
    SERVICE_API_TOKEN: process.env.SERVICE_API_TOKEN,
  },
  expose: {
    apiVersion: 'v2',
    checkoutMode: 'guest',
  },
})
\`\`\`

\`\`\`typescript
it('reads public configuration synchronously', () => {
  const apiVersion = Cypress.expose('apiVersion')
  const checkoutMode = Cypress.expose('checkoutMode')

  expect(apiVersion).to.eq('v2')
  expect(checkoutMode).to.eq('guest')
})
\`\`\`

\`\`\`typescript
it('uses the secret token inside the command chain', () => {
  cy.env(['SERVICE_API_TOKEN']).then(({ SERVICE_API_TOKEN }) => {
    expect(Boolean(SERVICE_API_TOKEN)).to.eq(true)

    cy.request({
      method: 'POST',
      url: '/api/test-sessions',
      headers: { Authorization: 'Bearer ' + SERVICE_API_TOKEN },
      body: { scenario: 'checkout' },
      log: false,
    }).then((response) => {
      expect(response.status).to.eq(201)
      expect(response.body).to.have.property('sessionId').that.matches(/^[A-Z0-9-]+$/)
    })
  })
})
\`\`\`

What people get wrong: they migrate every old \`Cypress.env()\` call to \`cy.env()\` mechanically. That breaks code that needs synchronous values, and it hides intent. Public values belong in \`Cypress.expose()\`; secrets belong in \`cy.env()\`. The migration is classification first, replacement second.

For larger environment layouts across dev, staging, preview, and production, pair this reference with [Cypress environments config best practices](/blog/cypress-environments-config-best-practices). The important Cypress 16 distinction is that \`env\` no longer means "anything configurable"; it means values read through \`cy.env()\`, and many of those should be treated as secrets.

## Where Values Can Come From

Cypress documents five sources for variables read by \`cy.env()\`: the \`env\` key in Cypress config, \`cypress.env.json\`, OS environment variables prefixed with \`CYPRESS_\` or \`cypress_\`, the \`--env\` CLI flag, and dynamic changes to \`config.env\` from \`setupNodeEvents\`. Each source has different security and reproducibility tradeoffs.

| Source | Good for | Risk |
| --- | --- | --- |
| \`env\` in config | Non-checked secret references from \`process.env\`, shared defaults | Accidentally committing literal secrets |
| \`cypress.env.json\` | Local developer overrides | Must be ignored if it contains sensitive data |
| \`CYPRESS_*\` OS variables | CI secrets, preview secrets, local shell exports | Prefix stripping can surprise teams |
| \`--env\` CLI flag | Short-lived local experiments | Secrets may appear in shell history or CI logs |
| \`setupNodeEvents\` | Dynamic values fetched or computed in Node | Easy to overcomplicate or return unstable config |

\`\`\`json
{
  "SERVICE_API_TOKEN": "local-dev-token",
  "PRIVATE_API_BASE": "https://api.dev.example.test"
}
\`\`\`

If that \`cypress.env.json\` file holds real secrets, add it to \`.gitignore\`. For shared values that are safe to expose, use \`expose\` in config instead of storing them next to secrets.

\`\`\`bash
export CYPRESS_SERVICE_API_TOKEN=local-dev-token
export CYPRESS_PRIVATE_API_BASE=https://api.dev.example.test
npx cypress run --browser chrome
\`\`\`

Cypress strips the \`CYPRESS_\` prefix for test environment variables, so a test requests \`SERVICE_API_TOKEN\`, not \`CYPRESS_SERVICE_API_TOKEN\`. Case still matters: a configured \`apiUrl\` is not the same key as \`APIURL\`.

## Safe Patterns For Secret Use

The safest pattern is short-lived access: request the secret, validate presence through a derived boolean, pass it directly to the command that needs it, disable logging on downstream commands where possible, then assert on the externally visible result. Do not alias, print, snapshot, or attach secrets.

There is also an architectural reason to keep secret access close to the action that consumes it. Cypress command chains are scheduled, retried, and displayed differently from plain JavaScript. When a test reads a token at the top of a file, saves it in outer scope, and uses it later, the reader has to understand both Cypress timing and JavaScript closure behavior before they can reason about risk. A small \`cy.env()\` block around the private request is less glamorous, but it is reviewable.

For QA engineers, reviewability matters as much as secrecy. When a flaky setup step fails, the team should be able to answer four questions quickly: which key was required, where was it expected to come from, which command used it, and what observable side effect proved it worked. If the answer is spread across support files, global variables, and a hidden plugin mutation, an AI coding agent will often "fix" the wrong layer. Keep the key name visible, keep the value hidden, and keep the effect asserted.

\`\`\`typescript
function requireEnvValue(name: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(name + ' must be configured for this Cypress run')
  }
}

it('creates a seeded account through a private endpoint', () => {
  cy.env(['SERVICE_API_TOKEN', 'PRIVATE_API_BASE']).then((env) => {
    requireEnvValue('SERVICE_API_TOKEN', env.SERVICE_API_TOKEN)
    requireEnvValue('PRIVATE_API_BASE', env.PRIVATE_API_BASE)

    cy.request({
      method: 'POST',
      url: env.PRIVATE_API_BASE + '/qa/accounts',
      headers: { Authorization: 'Bearer ' + env.SERVICE_API_TOKEN },
      body: { plan: 'trial', source: 'cypress' },
      log: false,
    }).then((response) => {
      expect(response.status).to.eq(201)
      expect(response.body).to.include.keys(['id', 'email'])
      expect(response.body.email).to.contain('@example.test')
    })
  })
})
\`\`\`

The helper throws a useful configuration error without printing the secret. The response assertion checks side effects and contract shape. It avoids the weak pattern of asserting only a 201 status and then assuming the account exists.

Avoid this:

\`\`\`typescript
cy.env(['SERVICE_API_TOKEN']).should('deep.include', {
  SERVICE_API_TOKEN: 'expected-token',
})

cy.env(['SERVICE_API_TOKEN']).its('SERVICE_API_TOKEN').should('not.be.empty')
\`\`\`

The first example exposes the token in assertion output. The second example can expose the value through the yielded subject. Read properties inside \`.then()\` instead, and assert on a boolean or on the result of the command that uses the secret.

## GitHub Actions Without Secret Leakage

In GitHub Actions, put secret values in repository, environment, or organization secrets, then map them to OS environment variables with the \`CYPRESS_\` prefix. The official Cypress GitHub Action is currently documented as \`cypress-io/github-action@v7\`. For GitHub-maintained actions, use the current majors such as \`actions/checkout@v7\` and \`actions/setup-node@v7\`.

\`\`\`yaml
name: Cypress env checks

on:
  pull_request:
  push:
    branches: [main]

jobs:
  cypress:
    runs-on: ubuntu-24.04
    env:
      CYPRESS_SERVICE_API_TOKEN: \${{ secrets.SERVICE_API_TOKEN }}
      CYPRESS_PRIVATE_API_BASE: \${{ secrets.PRIVATE_API_BASE }}
      CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Node
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: Run Cypress
        uses: cypress-io/github-action@v7
        with:
          browser: chrome
          build: npm run build
          start: npm start
          wait-on: http://127.0.0.1:3000
\`\`\`

\`CYPRESS_RECORD_KEY\` and \`CYPRESS_PROJECT_ID\` are special. Cypress consumes them directly from the operating-system environment for Cypress Cloud. Do not expect \`cy.env(['RECORD_KEY'])\` to be the right pattern for Cloud recording. Your application test secrets and Cypress Cloud operation secrets are different categories.

For full pipeline examples, recording, artifact retention, and browser matrix design, use the [Cypress GitHub Actions CI guide 2026](/blog/cypress-github-actions-ci-guide-2026). This article stays focused on the env boundary: secrets enter CI through masked variables, Cypress reads test secrets through \`cy.env()\`, and Cloud keys remain OS-level inputs to Cypress itself.

## Migration From Cypress.env

Start by inventorying every old read, then classify each key. An agent can do this well if you force it to produce a table before editing. Do not let it replace everything in one commit without review, especially if your tests mix plugin options, feature flags, and credentials.

The classification step should involve the same people who own the environment, not only the person editing tests. A value named \`API_BASE\` might be public in one company and private in another because it points at an internal network address. A flag named \`billingV3\` might be harmless for a demo app but sensitive for a regulated rollout. Cypress gives you the two APIs, but your team decides which values are safe to expose.

\`\`\`bash
rg "Cypress\\.env|\\benv:\\s*\\{|--env|cypress\\.env\\.json|allowCypressEnv" .
\`\`\`

For each hit, write down the key, whether it is secret, where it is set, whether sync access is required, and what replacement should be used.

| Old pattern | Classification question | Replacement |
| --- | --- | --- |
| \`Cypress.env('TOKEN')\` inside a test | Is it secret? | Usually \`cy.env(['TOKEN'])\` |
| \`Cypress.env('feature')\` in support code | Is it public and sync? | \`Cypress.expose('feature')\` |
| \`{ env: { mode: 'guest' } }\` in test config | Is it a public per-test toggle? | \`{ expose: { mode: 'guest' } }\` |
| \`--env feature=true\` in a script | Is it public? | \`--expose feature=true\` |
| Plugin expects \`env\` config | Does plugin support Cypress 16 APIs? | Upgrade plugin or move options to \`expose\` |

Before:

\`\`\`typescript
describe('guest checkout', { env: { checkoutMode: 'guest' } }, () => {
  it('uses the guest flow', () => {
    expect(Cypress.env('checkoutMode')).to.eq('guest')
  })
})
\`\`\`

After:

\`\`\`typescript
describe('guest checkout', { expose: { checkoutMode: 'guest' } }, () => {
  it('uses the guest flow', () => {
    expect(Cypress.expose('checkoutMode')).to.eq('guest')
  })
})
\`\`\`

Before:

\`\`\`typescript
it('calls the billing API', () => {
  const token = Cypress.env('BILLING_TOKEN')

  cy.request({
    method: 'POST',
    url: '/api/billing/sync',
    headers: { Authorization: 'Bearer ' + token },
  }).its('status').should('eq', 202)
})
\`\`\`

After:

\`\`\`typescript
it('calls the billing API', () => {
  cy.env(['BILLING_TOKEN']).then(({ BILLING_TOKEN }) => {
    expect(Boolean(BILLING_TOKEN)).to.eq(true)

    cy.request({
      method: 'POST',
      url: '/api/billing/sync',
      headers: { Authorization: 'Bearer ' + BILLING_TOKEN },
      log: false,
    }).then((response) => {
      expect(response.status).to.eq(202)
      expect(response.body).to.have.property('queued', true)
    })
  })
})
\`\`\`

Notice the added side-effect assertion. A status-only assertion is often too weak for secret-backed setup calls. If the token is wrong but the endpoint returns an HTML login page with 200 in a misconfigured environment, a status-only test may lie.

## Custom Commands That Need Secrets

\`cy.env()\` works inside custom commands because it participates in the Cypress command queue. The custom command should return the Cypress chain so tests can wait for all async work before asserting.

Prefer custom commands for repeated secret-backed setup, not for one-off reads. A command named \`createQaUser\` gives the test a business action and hides token plumbing. A command named \`getServiceToken\` only moves the risk to another file, and it tempts callers to handle the secret in different ways. Put the privileged action behind the helper, return the resulting test data, and let specs stay focused on user behavior.

\`\`\`typescript
declare global {
  namespace Cypress {
    interface Chainable {
      createQaUser(role: 'admin' | 'member'): Chainable<{ id: string; email: string }>
    }
  }
}

Cypress.Commands.add('createQaUser', (role) => {
  return cy.env(['SERVICE_API_TOKEN', 'PRIVATE_API_BASE']).then((env) => {
    if (typeof env.SERVICE_API_TOKEN !== 'string') {
      throw new Error('SERVICE_API_TOKEN must be configured')
    }

    if (typeof env.PRIVATE_API_BASE !== 'string') {
      throw new Error('PRIVATE_API_BASE must be configured')
    }

    return cy
      .request({
        method: 'POST',
        url: env.PRIVATE_API_BASE + '/qa/users',
        headers: { Authorization: 'Bearer ' + env.SERVICE_API_TOKEN },
        body: { role },
        log: false,
      })
      .then((response) => {
        expect(response.status).to.eq(201)
        expect(response.body).to.have.property('id').that.matches(/^[A-Z0-9-]+$/)
        expect(response.body).to.have.property('email').that.includes('@example.test')
        return response.body
      })
  })
})
\`\`\`

Then a spec can use the command without touching the secret:

\`\`\`typescript
it('lets an admin open the team settings page', () => {
  cy.createQaUser('admin').then((user) => {
    cy.visit('/login')
    cy.get('[data-testid="email"]').type(user.email)
    cy.get('[data-testid="continue"]').click()
    cy.contains('Team settings').should('be.visible')
  })
})
\`\`\`

The custom command hides the env plumbing but not the behavior. It still returns useful data, asserts creation succeeded, and lets the test verify the user-visible path.

## Failure Mode: The Secret Appears In The Command Log

Symptom: after migrating to \`cy.env()\`, a failing test screenshot or Command Log includes a token value. The team assumed \`cy.env()\` redacted everything, so the leak is surprising.

Diagnosis: \`cy.env()\` protects the command boundary by logging requested names instead of values. The leak happens later. Common causes are \`.should('deep.include', { TOKEN: value })\`, \`.its('TOKEN')\`, \`.invoke()\`, \`cy.log(token)\`, typing a token without \`{ log: false }\`, or sending a request without \`log: false\` when the command details include headers.

Fix: keep the value inside \`.then()\`, never assert on the raw token, turn off logging on commands that receive it, and assert on side effects.

\`\`\`typescript
cy.env(['RESET_TOKEN']).then(({ RESET_TOKEN }) => {
  expect(Boolean(RESET_TOKEN)).to.eq(true)

  cy.get('[data-testid="reset-token"]').type(String(RESET_TOKEN), { log: false })
  cy.get('[data-testid="apply-reset"]').click()
  cy.contains('[role="status"]', 'Reset token accepted').should('be.visible')
})
\`\`\`

For incident cleanup, rotate the exposed secret, scrub artifacts where possible, and add a code review rule: no \`.its()\` directly after \`cy.env()\`, no \`cy.log()\` for secrets, and no raw-token equality assertions.

## Failure Mode: Undefined In CI But Present Locally

Symptom: a test passes locally with \`cypress.env.json\` but fails in GitHub Actions because \`SERVICE_API_TOKEN\` is \`undefined\`.

Diagnosis: local values came from \`cypress.env.json\`, which is not committed. CI needs a separate source. If using OS environment variables, the variable must be named \`CYPRESS_SERVICE_API_TOKEN\`, while the test reads \`SERVICE_API_TOKEN\`. Also verify that the GitHub environment containing the secret is actually attached to the job.

Use a non-secret smoke check that validates key presence without printing values:

\`\`\`typescript
it('has required secret configuration', () => {
  cy.env(['SERVICE_API_TOKEN', 'PRIVATE_API_BASE'], { log: false }).then((env) => {
    expect({
      hasToken: typeof env.SERVICE_API_TOKEN === 'string' && env.SERVICE_API_TOKEN.length > 0,
      hasBase: typeof env.PRIVATE_API_BASE === 'string' && env.PRIVATE_API_BASE.length > 0,
    }).to.deep.equal({ hasToken: true, hasBase: true })
  })
})
\`\`\`

This still writes assertion data, but the assertion data is booleans, not secrets. Run it early in the suite or as a small preflight spec so CI fails before setup calls cascade into confusing 401s.

## Agent Checklist For cy.env Migration

Give an AI coding agent precise rules. Environment migrations fail when the agent optimizes for syntactic replacement instead of secret flow.

The agent should also preserve working test boundaries. If one spec creates data through a private endpoint and another spec logs in through the UI, do not merge them just because both need configuration. Keep secret-backed setup in setup helpers, keep public mode selection in \`Cypress.expose()\`, and keep assertions near the UI or API behavior they validate. That separation makes future Cypress upgrades easier because the next API change will have fewer places to touch.

When reviewing an agent-generated diff, scan for three hazards. First, a secret moved into \`expose\` because the old call was synchronous. Second, a public flag moved into \`cy.env()\`, forcing an asynchronous command where a simple value was enough. Third, a missing return from a custom command, which lets the test continue before setup has finished. Those are small mistakes in code review and large mistakes in CI.

1. Find every \`Cypress.env()\`, \`env:\` test override, \`--env\` script, and plugin read.
2. Classify each key as secret or public.
3. Replace secrets with \`cy.env([key])\` inside a Cypress command chain.
4. Replace public sync values with \`Cypress.expose()\`.
5. Replace test override \`env\` objects with \`expose\` only for public values.
6. Add a required-env preflight for CI secrets, asserting booleans only.
7. Remove direct \`.its()\` and \`.invoke()\` on env-yielded objects.
8. Use \`log: false\` on downstream commands that receive secrets.
9. Run Chrome in CI to catch Cypress 16 behavior, then run the full matrix.

This workflow is intentionally plain. The clever part is the classification, not the syntax. Once the table is correct, the code changes are predictable.

## Frequently Asked Questions

### Can cy.env set an environment variable during a test?

No. \`cy.env()\` is read-only. It retrieves configured variables and yields an object, but it does not set values at runtime. Set values through Cypress config, \`cypress.env.json\`, \`CYPRESS_*\` OS variables, \`--env\`, or \`setupNodeEvents\`. If the value is public and needs runtime sync access in the browser, evaluate \`Cypress.expose()\` instead.

### Why does cy.env require an array of keys?

The array makes access explicit. A test requests the exact keys it needs, and Cypress yields only those values. That is the point of the newer API: reduce accidental exposure and make secret access auditable. Passing an array also encourages grouped reads inside one command-chain step instead of scattering hidden global reads through support code.

### Is cy.env enough to prevent secret leaks?

No. It prevents Cypress from logging values at the \`cy.env()\` command boundary, but the yielded object is ordinary JavaScript. Assertions, \`.its()\`, \`.invoke()\`, command arguments, screenshots, request logs, and manual logging can still expose values. Safe usage means keeping secrets inside \`.then()\`, disabling logs on downstream commands, and asserting on derived facts or side effects.

### Should public URLs use cy.env or Cypress.expose?

Use judgment. A private service endpoint belongs in \`cy.env()\`. A public base URL, API version, feature flag, or environment label usually belongs in \`Cypress.expose()\` because it is not secret and synchronous access is simpler. The important mistake to avoid is treating all configuration as secret or all configuration as public. Split by exposure risk.
`,
};
