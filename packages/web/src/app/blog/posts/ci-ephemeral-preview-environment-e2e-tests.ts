import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Run E2E Tests Against Ephemeral Preview Environments',
  description:
    'Run E2E tests against ephemeral preview environments with reliable URL handoff, readiness checks, isolated data, failure evidence, and cleanup.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Run E2E Tests Against Ephemeral Preview Environments

The pull request is green, the preview badge says deployed, and the browser test still receives a 503. This is the defining race in preview-environment testing: infrastructure has produced a URL, but the application behind that URL is not necessarily ready to serve a user journey. A dependable pipeline treats deployment, readiness, test execution, evidence retention, and teardown as separate states with explicit handoffs.

An ephemeral environment is valuable because it puts the proposed application build behind real routing, TLS, runtime configuration, and backing services. It can expose problems that a localhost test cannot: a missing public environment variable, a CDN cache rule, an incorrect callback origin, or a migration that behaves differently on the hosted database. The price is orchestration. Unlike a static staging target, the address and lifecycle belong to one change and often one workflow run.

This guide builds that orchestration as a testable protocol. The examples use GitHub Actions and Playwright, but the same state machine applies to any CI platform and browser runner.

## Model the preview as a resource, not a string

A URL alone is insufficient lifecycle data. The test job also needs to know which commit was deployed, who owns cleanup, whether the deployment is mutable, and which identifier the hosting provider expects during deletion. Pass a small deployment record between jobs, even if the first implementation exposes only some fields.

| Field | Producer | Consumer | Failure prevented |
|---|---|---|---|
| \`base_url\` | deploy job | readiness and E2E jobs | Testing a guessed or stale address |
| \`deployment_id\` | hosting adapter | cleanup job | Deleting the wrong preview |
| \`sha\` | workflow context | smoke assertion and reports | Testing an older build that reused a route |
| \`created_at\` | deploy job | janitor process | Leaking previews after cancelled runs |
| \`cleanup_token_ref\` | CI configuration | teardown adapter | Giving test code broad infrastructure credentials |

Keep provider-specific commands inside a deploy adapter. The workflow contract should be simple: provision returns a canonical HTTPS URL and an opaque ID; destroy accepts that ID and is idempotent. This boundary lets a team change hosting vendors without rewriting every browser suite.

Do not derive the URL in the test job from the branch name unless the platform documents that mapping as stable. Branch names can be sanitized, truncated, or collide. The deploy step's emitted URL is the authority.

## Hand the deployed URL across GitHub Actions jobs

GitHub Actions step outputs can become job outputs, and downstream jobs can consume them through \`needs\`. The deploy command below is intentionally represented as a project script because providers have different CLIs. The important part is that the script writes JSON containing \`url\` and \`id\`, then the workflow exposes both values.

\`\`\`yaml
name: Preview E2E

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy:
    runs-on: ubuntu-latest
    outputs:
      preview_url: \${{ steps.preview.outputs.url }}
      preview_id: \${{ steps.preview.outputs.id }}
    environment:
      name: preview-pr-\${{ github.event.pull_request.number }}
      url: \${{ steps.preview.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - id: preview
        name: Provision preview
        env:
          PREVIEW_TOKEN: \${{ secrets.PREVIEW_TOKEN }}
        run: |
          node scripts/provision-preview.mjs > preview.json
          echo "url=$(jq -r .url preview.json)" >> "$GITHUB_OUTPUT"
          echo "id=$(jq -r .id preview.json)" >> "$GITHUB_OUTPUT"

  e2e:
    needs: deploy
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      BASE_URL: \${{ needs.deploy.outputs.preview_url }}
      EXPECTED_SHA: \${{ github.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: node scripts/wait-for-preview.mjs "$BASE_URL"
      - run: npx playwright test --project=chromium
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: preview-e2e-\${{ github.run_id }}
          path: |
            playwright-report/
            test-results/
          if-no-files-found: ignore

  cleanup:
    needs: [deploy, e2e]
    if: always() && needs.deploy.outputs.preview_id != ''
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - env:
          PREVIEW_TOKEN: \${{ secrets.PREVIEW_TOKEN }}
          PREVIEW_ID: \${{ needs.deploy.outputs.preview_id }}
        run: node scripts/destroy-preview.mjs "$PREVIEW_ID"
\`\`\`

The environment URL appears in GitHub's deployment UI and pull request timeline. That is useful for human exploration, but the test still consumes the job output. The explicit \`needs\` edge prevents E2E from starting before provisioning finishes. It does not prove readiness, which requires a stronger check.

For a deeper treatment of workflow expressions, artifacts, and deployed targets, see the [GitHub Actions deployed URL testing guide](/blog/github-actions-e2e-deployed-url-testing-guide). If browser installation dominates runner time, use a version-aware approach from the [Playwright browser cache guide](/blog/github-actions-cache-playwright-browsers).

## Define readiness from the user's side of the router

Many deployment tools report success after uploading an image or updating a service, before load balancers have healthy endpoints. A TCP connection is too weak. Even a 200 from \`/\` can be misleading if the CDN serves a static shell while the API is still booting.

Create a readiness endpoint that checks only dependencies required for the selected E2E suite. It should return quickly, avoid mutating data, and distinguish temporary startup from permanent misconfiguration. A useful response includes the deployed commit so CI can reject a stale route.

| Probe observation | Interpretation | Pipeline response |
|---|---|---|
| DNS or connection error | Route not propagated or service absent | Retry with bounded backoff |
| HTTP 404 | Route exists but application/path is wrong | Retry briefly, then fail with body |
| HTTP 429 | Platform or app is rate limiting probes | Honor \`Retry-After\` when reasonable |
| HTTP 503 with starting state | Instance or dependency is warming | Retry until deadline |
| HTTP 200 with wrong commit | Stale deployment or reused hostname | Fail immediately |
| HTTP 200 with expected commit | Candidate is reachable and identified | Start browser tests |

This Node 20 script uses the built-in \`fetch\`, an overall deadline, per-attempt aborts, jitter, and commit verification. It is runnable without a request library.

\`\`\`javascript
// scripts/wait-for-preview.mjs
import process from 'node:process';

const baseUrl = process.argv[2];
const expectedSha = process.env.EXPECTED_SHA;
const deadline = Date.now() + 5 * 60_000;
let attempt = 0;

if (!baseUrl || !expectedSha) {
  throw new Error('BASE URL argument and EXPECTED_SHA are required');
}

while (Date.now() < deadline) {
  attempt += 1;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(new URL('/readyz', baseUrl), {
      signal: controller.signal,
      headers: { 'cache-control': 'no-cache' },
    });
    const text = await response.text();

    if (response.ok) {
      const state = JSON.parse(text);
      if (state.gitSha !== expectedSha) {
        throw new Error(
          \`Preview contains \${state.gitSha}, expected \${expectedSha}\`,
        );
      }
      console.log(\`Preview ready after \${attempt} attempts: \${baseUrl}\`);
      process.exit(0);
    }

    console.log(\`Attempt \${attempt}: HTTP \${response.status} \${text.slice(0, 160)}\`);
  } catch (error) {
    if (error.message?.includes('Preview contains')) throw error;
    console.log(\`Attempt \${attempt}: \${error.name}: \${error.message}\`);
  } finally {
    clearTimeout(timeout);
  }

  const delay = Math.min(1_000 * 2 ** Math.min(attempt, 4), 15_000);
  const jitter = Math.floor(Math.random() * 500);
  await new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

throw new Error(\`Preview did not become ready within five minutes: \${baseUrl}\`);
\`\`\`

The per-attempt controller stops one hung connection from consuming the entire readiness budget. The outer deadline bounds total CI time. Logging a short response body turns an opaque timeout into evidence, especially when the endpoint reports a missing database variable or an unfinished migration.

Avoid retrying every status equally. Authentication failures, an unexpected commit, or malformed readiness JSON normally indicate a configuration defect, not propagation. Retrying those errors for ten minutes only delays useful feedback.

## Make Playwright consume one canonical base URL

The suite should not know how previews are named. Read \`BASE_URL\` once in configuration, reject an absent or non-HTTPS value in CI, and let tests navigate with relative paths. This makes the same suite usable locally and on hosted candidates.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

if (process.env.CI && !baseURL.startsWith('https://')) {
  throw new Error(\`CI requires an HTTPS BASE_URL, received: \${baseURL}\`);
}

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list']],
});
\`\`\`

A candidate verification test can assert a build marker before expensive journeys run. Expose the SHA in a meta tag or a read-only version endpoint, rather than rendering secrets into the page. If the marker fails, stop. There is little value in debugging checkout behavior against the wrong binary.

Readiness and test assertions have different purposes. The probe asks, “Can a suite begin?” The browser asks, “Does a user-visible capability work?” Do not put a full login flow into \`/readyz\`, and do not replace the first E2E assertion with a health endpoint call.

## Isolate test data when the infrastructure is shared

An ephemeral frontend does not guarantee an ephemeral database. Cost-conscious platforms frequently point previews at a shared non-production service. Parallel pull requests can then create identical users, drain the same inventory, or see each other's asynchronous jobs.

Give every run a namespace derived from immutable CI identifiers, for example \`pr-418-run-9921\`. Include it in generated email addresses, tenant names, idempotency keys, and cleanup queries. Prefer an API fixture that creates precisely the state a scenario needs. A UI setup flow increases runtime and makes failures ambiguous.

Choose isolation based on the failure radius:

| Backing-service strategy | Fidelity | Operational cost | Suitable use |
|---|---|---|---|
| Dedicated database per preview | Highest isolation | Provisioning and migration overhead | Schema-heavy changes and destructive suites |
| Schema or tenant per preview | Strong logical separation | Requires application support | Multi-tenant services with controllable routing |
| Shared database with run-prefixed records | Moderate | Cleanup discipline is essential | Read-mostly tests and inexpensive fixtures |
| Fully mocked backend | Low production-path fidelity | Fast and predictable | Component-level browser checks, not deployment validation |

Do not let cleanup depend only on a successful test hook. Browser processes crash and CI runs are cancelled. Use both targeted teardown in the workflow and a scheduled janitor that removes expired namespaces and previews by creation time.

## Preserve evidence before destroying the scene

The cleanup job may remove the only system where a failure can be reproduced. Upload Playwright traces, screenshots, video, console logs, and deployment metadata first. The artifact should include the URL, SHA, preview ID, test run ID, and timestamps, but never authentication tokens.

There is a tension between immediate cleanup and debugging access. A practical policy is outcome-sensitive: remove successful previews immediately; retain failed previews for a short, documented window if cost and data controls allow it; always run a janitor with a hard maximum age. If previews handle personal or regulated data, immediate deletion may be mandatory regardless of debugging convenience.

Make artifact upload conditional on \`always()\`, not on test success. Make teardown another independent job with \`if: always()\`. At job level, that expression matters because a failed dependency otherwise causes the dependent job to be skipped.

Cancellation is trickier. A workflow superseded by a newer commit may stop before its cleanup job starts. Provider-side TTLs are the strongest backstop. Where TTL is unavailable, schedule a separate cleanup workflow that lists resources carrying your repository label and deletes those older than the agreed limit.

## Concurrency should supersede commits without crossing ownership

When five commits land quickly on one pull request, testing all five previews wastes capacity and produces obsolete feedback. GitHub Actions concurrency can cancel an older run for the same pull request. However, cancellation means the old run cannot be trusted to clean itself.

Name resources with the run ID as well as the pull request number. If the newest run reuses a single PR hostname, verify the commit marker immediately before and during critical tests because a redeployment can change the target under an active browser. Immutable per-run URLs avoid that race and make evidence interpretable.

For mutable previews, serialize deployment plus E2E by PR. For immutable previews, allow separate runs but cancel obsolete work and rely on provider TTL or a janitor. Never let one run's cleanup delete a resource merely because it shares the same branch label.

## Distinguish product failures from preview-platform failures

Preview suites become distrusted when routing incidents look identical to regressions. Classify failures using evidence already available:

1. Provisioning failure: no deployment record was produced.
2. Readiness failure: a record exists, but the expected commit never became healthy.
3. Harness failure: browser installation, test discovery, or credentials failed before a scenario.
4. Product failure: the identified candidate was ready and a user assertion failed.
5. Teardown failure: tests finished, but the resource could not be removed.

These categories should appear in check names and logs. A product team can own scenario failures while a platform team watches readiness latency and cleanup leaks. One red “E2E” box hides that operational boundary.

Retries must follow the category. Retry transient readiness observations inside the probe. Let Playwright retry a failed test only when traces from both attempts remain visible. Do not rerun deployment blindly after a deterministic migration error. A retry is a diagnostic policy, not a way to turn red into green.

## Choose the right target for each layer

Preview testing complements, rather than replaces, earlier checks. The alternatives differ mainly in the infrastructure they exercise.

| Target | Real routing and TLS | Per-change isolation | Feedback speed | Best defect class |
|---|---:|---:|---:|---|
| Local server in CI | No | Per runner | Fast | UI logic and application integration |
| Shared staging | Yes | Usually weak | Medium | Long-lived service compatibility |
| Ephemeral preview | Yes | Strong when designed well | Medium to slow | Deployment configuration and change-specific journeys |
| Production smoke test | Yes | None | After release | Monitoring critical paths with safe accounts |

Run broad deterministic coverage against local services, then send a narrow, high-value suite to the preview. Authentication callback, asset loading, one representative write path, and the riskiest change-specific behavior usually provide more signal than copying the entire nightly regression pack.

The final gate should answer a release question. If the suite includes hundreds of low-risk cosmetic assertions, queue time and environmental noise can obscure the few results that decide whether the candidate is deployable.

## Frequently Asked Questions

### Should the deploy job wait for health, or should the E2E job do it?

Let provisioning return when it has a durable resource and URL, then run an explicit readiness step before the browser suite. This preserves a clear failure boundary. A provider's deploy command may also wait internally, but your external probe still confirms that the public route and expected commit are reachable from the runner.

### How can tests authenticate when every preview has a different hostname?

Use a test-only identity flow whose callback policy explicitly permits controlled preview domains, or create authenticated state through a backend API and browser context. Do not use wildcard production callbacks casually. Keep credentials in protected CI secrets and ensure the preview hostname cannot be chosen by untrusted input.

### What happens when a pull request is closed before its workflow completes?

Handle the \`pull_request.closed\` event with a dedicated destroy workflow keyed by stored deployment metadata, and retain a scheduled age-based janitor. A close event alone is not enough because workflows can be disabled, cancelled, or rate limited.

### Should every browser project run against every preview?

Usually not. Chromium plus the highest-risk journey gives fast change feedback. Run the full Chromium, Firefox, WebKit, mobile, and accessibility matrix on a schedule or before release unless the change affects browser-specific code. Base the matrix on risk, not symmetry.

### How long should a failed preview remain available?

Set the shortest window that still supports investigation, often measured in hours rather than days, and enforce it automatically. The correct value depends on infrastructure cost, data classification, and team response time. Artifacts should remain useful even after the environment is gone.
`,
};
