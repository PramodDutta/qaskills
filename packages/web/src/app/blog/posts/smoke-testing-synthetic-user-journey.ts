import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Smoke Testing Synthetic User Journey: Build a Fast, Trustworthy Release Signal',
  description: 'Design a smoke testing synthetic user journey that verifies critical paths, diagnoses failures quickly, and protects every deployment without flaky noise.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Smoke Testing Synthetic User Journey: Build a Fast, Trustworthy Release Signal

A smoke testing synthetic user journey is a short automated transaction that behaves like a real user and proves a deployed system can complete one business-critical outcome. It does more than ping a health endpoint. It signs in through supported paths, reads or creates meaningful data, crosses the services that must cooperate, and confirms the outcome a customer would recognize. Kept small and deterministic, this journey becomes an early release signal that can run after deployment and continuously from production-like locations.

The most effective journey is not a compressed regression suite. It is a deliberately narrow probe with a clear owner, a strict runtime budget, isolated test data, diagnostic checkpoints, and a documented response when it fails. Teams choosing the browser and assertion layer can use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) to position smoke checks within their test portfolio. Teams implementing browser steps should also apply the [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026), because a journey that breaks on cosmetic DOM churn is not a dependable operational signal.

This guide builds a realistic workspace-creation journey with Playwright, but the design works with any supported browser or API runner. The goal is a probe that tells release engineers, quickly and specifically, whether users can still reach the product's central value.

## Translate a Business Promise Into One Observable Transaction

Begin with the sentence your product implicitly promises: "A subscribed user can sign in, create a workspace, add a task, and see it after refresh." That is a better source than an existing test folder because it names an outcome, a role, and persistence. The journey should prove only the critical chain necessary for that promise.

Map the chain before writing code. Mark each dependency and the externally visible checkpoint. For the workspace example:

1. Resolve the public application URL.
2. Authenticate a dedicated synthetic account.
3. Open the workspace list.
4. Create a uniquely named workspace.
5. Add one task through the normal UI.
6. Reload and confirm the task persists.
7. Remove the workspace through an API or supported UI cleanup path.

The journey crosses identity, frontend delivery, gateway routing, the workspace service, the task service, and the database. A passing result covers their basic cooperation. It does not prove every validation rule, browser, locale, or permission. Those belong in other test layers.

| Candidate step | Keep in smoke? | Decision test | Example assertion |
| --- | --- | --- | --- |
| Sign in with synthetic user | Yes | Product is unusable without it | Workspace navigation becomes visible |
| Create core object | Yes | Central value depends on a successful write | New workspace has returned identifier |
| Verify persistence after reload | Yes | Catches read-after-write and routing failures | Task text remains visible |
| Change avatar | No | Secondary behavior does not gate release | Cover in regression suite |
| Exercise five validation errors | No | Exhaustive branch coverage expands runtime | Cover at component or API layer |
| Log out | Usually no | Adds little signal to the primary promise | Separate auth smoke if logout is high risk |

The mistake people make is selecting smoke tests because they are already fast. Speed is necessary, but relevance is the gate. Ten quick page-load checks can all pass while the one revenue-producing transaction is broken.

## Set a Budget for Time, Scope, and Failure Ambiguity

A synthetic journey consumes three budgets. Runtime determines how soon deployment automation can react. Scope determines how many unrelated systems can fail the probe. Ambiguity determines how long an engineer needs to locate the fault. Treat all three as design constraints.

For a post-deployment gate, aim for a few minutes, not tens of minutes. Exact limits depend on rollout cadence, but every wait should have a reason. For continuous production checks, frequency must respect rate limits and side effects. Running every minute can create 1,440 workspaces per day if cleanup is unreliable.

| Budget | Healthy signal | Warning sign | Design response |
| --- | --- | --- | --- |
| Runtime | Stable p95 well inside release window | Duration grows with data or retries | Reduce steps, seed directly, parallelize only independent probes |
| Scope | One named business promise | Journey covers unrelated admin and reporting flows | Split into separate owned probes |
| Ambiguity | Failure names the last verified checkpoint | Generic timeout after many actions | Add step annotations and domain-level assertions |
| Data | Unique, identifiable, removable records | Shared account accumulates state | Namespace every run and implement idempotent cleanup |
| Frequency | Matches detection objective and system capacity | Probe becomes meaningful production load | Slow schedule or use lighter API journey |

Write a small journey contract in the repository. It should state the promised outcome, target environments, maximum intended duration, account owner, data prefix, dependencies, and alert destination. This turns an anonymous browser script into an operational component.

\`\`\`yaml
name: create-and-persist-task
promise: A subscribed user can create a workspace and persist a task
owner: qa-platform
data_prefix: synthetic-smoke
targets:
  - staging
  - production
expected_dependencies:
  - identity
  - web-frontend
  - workspace-api
  - task-api
cleanup: delete the run workspace by its captured identifier
\`\`\`

This YAML is a team-owned manifest, not a Playwright configuration format. A simple manifest is useful because monitoring dashboards and runbooks can consume it without parsing test source.

## Provision a Synthetic Identity Without Sharing Human Credentials

Use a dedicated non-human account created for the probe. Give it only the permissions required for the transaction. Store credentials in the deployment platform's secret store, rotate them, and keep them out of logs, screenshots, traces, source code, and baseline files. If production synthetic traffic affects billing or analytics, label the account so downstream reporting can exclude it intentionally.

Avoid one account shared across parallel environments unless the product supports that concurrency safely. State collisions cause failures such as "workspace already exists," unexpected onboarding screens, and rate limiting. One account per environment or per probe is easier to reason about.

Authentication strategy depends on what the journey is meant to cover:

| Strategy | What it validates | Tradeoff | Appropriate use |
| --- | --- | --- | --- |
| UI login every run | Login page, identity redirects, session creation | Slower and more exposed to third-party identity variance | Dedicated authentication smoke |
| Pre-created storage state | Application behavior after authentication | Does not validate the login interaction | Frequent core-product journey |
| Supported API login | Identity API plus application session | May differ from public UI route | Service-focused smoke with browser continuation |
| Bypass or test-only token | Downstream product only | Can hide production auth integration defects | Isolated staging diagnostics, not sole production signal |

If authentication depends on multifactor prompts or bot detection, do not weaken production controls for the probe. Use an approved machine identity flow or a separately controlled synthetic tenant. Coordinate with security and identity owners so the automation path is supported rather than accidental.

Load credentials with strict validation and redact them from error messages:

\`\`\`ts
type SmokeSecrets = {
  email: string;
  password: string;
};

export function loadSmokeSecrets(): SmokeSecrets {
  const email = process.env.SMOKE_USER_EMAIL;
  const password = process.env.SMOKE_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('Synthetic smoke credentials are not configured');
  }

  return { email, password };
}
\`\`\`

Never print the loaded object. Configure the test runner and CI provider to avoid echoing shell values. Review traces before enabling retention in production, because typed passwords and session data may appear in debugging artifacts depending on capture settings.

## Make Test Data Unique, Traceable, and Disposable

Every execution needs a run identity. Include environment, a time component, and a short random suffix in created names. Do not depend solely on timestamps when concurrent runs can start within the same unit. Prefix records consistently so operations teams can recognize and purge stranded data.

\`\`\`ts
import { randomUUID } from 'node:crypto';

export type RunIdentity = {
  runId: string;
  workspaceName: string;
  taskTitle: string;
};

export function createRunIdentity(environment: string): RunIdentity {
  const suffix = randomUUID().slice(0, 8);
  const started = new Date().toISOString().replaceAll(':', '-');
  const runId = \`synthetic-smoke-\${environment}-\${started}-\${suffix}\`;

  return {
    runId,
    workspaceName: \`Smoke workspace \${runId}\`,
    taskTitle: \`Verify persistence \${runId}\`,
  };
}
\`\`\`

Attach the run ID as permitted metadata, such as an internal tag, request header, or record label. Confirm that any custom header is accepted by your system before relying on it. Correlation is valuable only if services retain and index the value in logs.

Cleanup belongs in a finally path and should use the most direct supported interface. The user journey should exercise the public UI, while cleanup can use an authenticated API to reduce runtime and avoid adding more UI failure points. Capture the created resource identifier as soon as it exists. If creation succeeds but the next assertion fails, cleanup still has what it needs.

\`\`\`ts
import type { APIRequestContext } from '@playwright/test';

export async function removeWorkspace(
  request: APIRequestContext,
  workspaceId: string | undefined,
): Promise<void> {
  if (!workspaceId) return;

  const response = await request.delete(\`/api/workspaces/\${workspaceId}\`);
  if (response.status() === 404) return;
  if (!response.ok()) {
    throw new Error(
      \`Cleanup failed for workspace \${workspaceId}: HTTP \${response.status()}\`,
    );
  }
}
\`\`\`

Use your application's documented endpoint and authorization model. The route above is illustrative application code, not a Playwright feature. If cleanup failure occurs after a product failure, preserve both facts. Do not let the cleanup exception overwrite the original signal in reporting.

## Implement the Journey as Named Checkpoints

Playwright's test steps make reports reflect business stages. Use role- or label-based locators aligned with the visible interface. Avoid sleeps. Let observable conditions determine progression.

\`\`\`ts
import { test, expect } from '@playwright/test';
import { createRunIdentity } from './support/runIdentity';
import { loadSmokeSecrets } from './support/secrets';
import { removeWorkspace } from './support/cleanup';

test('subscribed user creates a workspace and persistent task', async ({
  page,
  request,
}) => {
  const identity = createRunIdentity(process.env.TEST_ENV ?? 'unknown');
  const secrets = loadSmokeSecrets();
  let workspaceId: string | undefined;

  try {
    await test.step('authenticate synthetic subscriber', async () => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(secrets.email);
      await page.getByLabel('Password').fill(secrets.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
    });

    await test.step('create an isolated workspace', async () => {
      await page.getByRole('button', { name: 'New workspace' }).click();
      await page.getByLabel('Workspace name').fill(identity.workspaceName);
      await page.getByRole('button', { name: 'Create workspace' }).click();
      await expect(page.getByRole('heading', { name: identity.workspaceName })).toBeVisible();
      workspaceId = new URL(page.url()).pathname.split('/').at(-1);
      expect(workspaceId).toBeTruthy();
    });

    await test.step('add and persist the critical task', async () => {
      await page.getByLabel('Task title').fill(identity.taskTitle);
      await page.getByRole('button', { name: 'Add task' }).click();
      await expect(page.getByText(identity.taskTitle, { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByText(identity.taskTitle, { exact: true })).toBeVisible();
    });
  } finally {
    await removeWorkspace(request, workspaceId);
  }
});
\`\`\`

Adapt names and routes to the real product. The important structure is the try/finally boundary, captured resource ID, and assertion after reload. A success toast alone is not sufficient because it can appear before a failed persistence request. The refreshed state proves a more valuable outcome.

## Configure the Runner for Signal, Not Concealment

Keep smoke configuration separate enough that its purpose is obvious. Limit projects to the browser or API clients required by the release gate. A complete cross-browser matrix belongs in regression unless browser diversity is itself the release risk.

\`\`\`ts
import { defineConfig } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL;
if (!baseURL) throw new Error('SMOKE_BASE_URL is required');

export default defineConfig({
  testDir: './smoke',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['junit', { outputFile: 'artifacts/smoke-results.xml' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

Zero retries is a strong default for a deployment gate because the first failure matters. Automatic retries can convert an intermittent outage into green while consuming precious rollout time. If the organization deliberately retries, report first-attempt failure separately and never treat repeated success as proof that the system was healthy throughout.

Use one worker when the journey owns shared state or when order is important. Multiple independent journeys can run in parallel if each has its own identity and data. Do not parallelize merely to hide an overgrown smoke pack.

## Run After Deployment and Preserve Failure Evidence

The pipeline must wait until deployment readiness checks complete, then target the exact release. A false green against an old environment is worse than no check. Verify build identity through a version endpoint, response header, or deployment metadata supported by the application.

\`\`\`yaml
name: post-deploy-smoke

on:
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --config=playwright.smoke.config.ts
        env:
          SMOKE_BASE_URL: \${{ vars.SMOKE_BASE_URL }}
          TEST_ENV: production
          SMOKE_USER_EMAIL: \${{ secrets.SMOKE_USER_EMAIL }}
          SMOKE_USER_PASSWORD: \${{ secrets.SMOKE_USER_PASSWORD }}
      - name: Retain smoke diagnostics
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-diagnostics
          path: |
            artifacts
            test-results
          if-no-files-found: ignore
\`\`\`

This manual trigger is a safe skeleton. Connect it to the repository's real deployment event only after the target URL, release identity, secret environment, and rollback authority are defined. The synthetic test should not guess which deployment it is validating.

| Result | Release action | Operational action | Test-owner action |
| --- | --- | --- | --- |
| All critical checkpoints pass | Continue rollout | Watch normal service indicators | Record duration and build identity |
| Product assertion fails consistently | Hold or roll back under release policy | Inspect correlated service errors | Preserve trace, actual state, run ID |
| Authentication alone fails | Hold if login is in scope | Check identity provider and account status | Verify secret rotation and auth contract |
| Cleanup fails after journey passes | Continue only if policy permits | Prevent data accumulation | Repair cleanup and purge stranded records |
| Runner cannot reach target | Hold, no valid signal | Check DNS, network policy, runner health | Distinguish infrastructure failure from product failure |

## Diagnose a Journey That Fails Only in Production

A realistic failure looks like this: the journey passes in staging, but production times out after clicking "Create workspace." A rerun passes. The team labels it flaky and adds retries. Days later, customers report occasional blank workspaces because one production region points to a read replica with delayed routing metadata.

Diagnose by preserving the first failure and asking where the observable chain stopped. Did the click issue a request? What status returned? Was a workspace ID created? Did navigation reach the expected URL? Did the subsequent read go to a different region? Correlate the synthetic run ID with gateway and service logs. Compare production configuration, traffic routing, feature flags, identity claims, and data topology with staging.

Add a response listener only for diagnosis or narrow structured logging. Avoid dumping every header and body, which can expose credentials and personal data.

\`\`\`ts
import type { Page } from '@playwright/test';

export function observeWorkspaceCalls(page: Page): void {
  page.on('response', async (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith('/api/workspaces')) return;

    console.log(JSON.stringify({
      method: response.request().method(),
      path: url.pathname,
      status: response.status(),
    }));
  });
}
\`\`\`

If the request succeeded but the UI assertion failed, inspect eventual consistency and frontend state. If no request appeared, inspect locator targeting, disabled controls, console errors, and client exceptions. If the request failed, inspect server logs and dependency health. This branch-based reasoning is faster than simply increasing a timeout.

## Prevent the Probe From Becoming a Second Regression Suite

Review the journey whenever the product's central promise or architecture changes. Remove steps that no longer gate that promise. Split only when a separate critical outcome has a different owner or incident response. A synthetic suite with forty journeys, five browsers, and hundreds of assertions becomes too slow and too ambiguous for release gating.

Track four health indicators: pass rate on unchanged builds, p50 and p95 duration, time to diagnose, and escaped incidents on the promised path. Pass rate alone is misleading. A probe can be perfectly green because it asserts only page visibility while persistence is broken.

Schedule controlled failure drills. In a non-production environment, revoke the synthetic user's entitlement, make a dependency return an error through an approved fault-injection mechanism, or deploy a deliberately broken test fixture. Confirm the journey fails at the expected checkpoint, diagnostics reach the owner, and the deployment process responds correctly. A monitor that has never been observed failing is an untested alarm.

Finally, separate operational expectations from product assertions. Browser tooling failures, expired credentials, network denial, application regression, and cleanup errors are different categories. Report them distinctly even if they all block a rollout. That classification turns the probe from a red light into an actionable release instrument.

## Combine Browser and API Checkpoints Without Splitting the Story

A hybrid journey often provides the best balance. Use the browser for the interactions that define the customer experience, then use a supported API or database-facing test helper to verify durable state and perform cleanup. The journey still represents one promise, but each checkpoint uses the interface that makes its evidence strongest.

For example, create a task through the browser, capture its visible identifier or the response to the creation request, and query the public task API to verify the saved title and workspace association. Then reload the browser and assert the task remains visible. The API checkpoint distinguishes a failed write from a failed render, while the final browser checkpoint confirms the user can retrieve the result. Do not query internal tables as the only success check if the user-facing read path can still be broken.

Name hybrid checkpoints by outcome rather than transport: "task is durably stored" communicates more than "GET request returns 200." Assert the response body fields that establish the promise. A successful status with an empty or wrong record is not a useful smoke signal.

## Schedule Continuous Journeys Around Operational Reality

Post-deployment execution answers whether a particular release can perform the transaction. Scheduled production execution answers whether the transaction remains available between releases, when certificates expire, dependencies change, data accumulates, or regional infrastructure degrades. These are related but different signals. Give them distinct run identifiers and dashboards so a scheduled failure is not incorrectly attributed to the last deployment.

Choose locations based on customer topology and incident history. A probe from the same cloud region as the application can validate core services while missing public DNS, edge routing, or regional access problems. An external probe adds that path but also introduces its own network variability. If both matter, run one internal and one external journey, then interpret disagreement explicitly.

Control overlap. If a five-minute journey runs every five minutes and an outage slows each execution, runs may pile up and create extra load. Configure scheduling and concurrency in the orchestration system so only the intended number of transactions operates at once. Alert on missed schedules separately from application assertions, because a monitor that never started cannot report health.

Use maintenance windows carefully. Muting all failures during a change window can conceal an unrelated outage. Prefer routing notifications to the active change owner while continuing to record results. If synthetic actions trigger emails, webhooks, fraud controls, or inventory changes, provide approved suppression or sandbox destinations for those side effects, and test the real external integration with a separate controlled probe when its availability is a critical promise.

## Define an Alert That a Human Can Act On

An alert should include journey name, environment, release identity, failed checkpoint, first failure time, recent pass time, run ID, and links to sanitized evidence. It should not include the password, session cookie, full request bodies, or uncontrolled screenshots. Route it to the team that owns the broken promise, with escalation tied to customer impact.

Avoid paging on one isolated external timeout if the journey is known to traverse a variable public network, unless the protected service demands that sensitivity. At the same time, avoid requiring so many consecutive failures that a short but severe checkout outage disappears. Calibrate the policy using historical run data and business tolerance. Maintain two concepts: detection, when the probe first fails, and notification, when evidence meets the response rule.

When an engineer acknowledges the alert, the runbook should offer a short branch: verify target identity, inspect the failed checkpoint, compare service indicators, check synthetic account status, and decide whether to hold a deployment or open an incident. The journey's value is realized when this path is faster than a customer report, not merely when a dashboard contains another red dot.

## Frequently Asked Questions

### How many steps should a synthetic smoke journey contain?

Use the fewest steps that prove one critical business outcome across its required dependencies. For many applications that means roughly three to seven meaningful checkpoints, though the outcome matters more than the count. Remove cosmetic navigation and exhaustive validation branches. Each retained step should either establish required state, cross an important integration, or verify user-visible success. If a step can fail without affecting the stated promise, it probably belongs in regression. If removing it allows a severe customer failure to pass unnoticed, keep it and name the checkpoint clearly.

### Should a production smoke journey create real data?

Creating data is appropriate when a write and subsequent read are central to the product promise, provided the organization approves synthetic production transactions. Use a dedicated tenant, unique names, explicit labels, least-privilege credentials, reliable cleanup, and a retention sweep for abandoned records. Exclude synthetic activity from customer analytics and billing through a documented rule. If production writes are prohibited, run the transactional journey in a production-like environment and keep a read-only production probe, but acknowledge that the read-only check provides less coverage of persistence and permissions.

### When should a failed journey block a deployment?

A failure should block or pause rollout when the journey represents a release-critical promise and the runner successfully reached the intended release. The policy must distinguish product failure from missing evidence. A network-broken runner does not prove the product is bad, but it also does not provide a green signal, so holding is usually safer. Define outcomes before incidents: pass, confirmed product failure, authentication failure, probe infrastructure failure, and cleanup-only failure. Connect each outcome to named authority for promotion, rollback, or investigation rather than improvising under release pressure.

### Can API checks replace the browser in a synthetic user journey?

API checks are faster and often more deterministic, but they do not validate frontend delivery, browser session behavior, client routing, or the integration between UI and services. Use an API-only journey when the product itself is an API or when the release risk is specifically service-level. For a web product, one narrow browser transaction usually provides valuable end-user coverage, while direct API calls can prepare data and perform cleanup. The right blend minimizes fragile UI steps without claiming coverage of a user experience that automation never actually exercised.
`,
};
