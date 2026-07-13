import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Configure Playwright baseURL for Multiple Environments',
  description:
    'Configure Playwright baseURL for local, staging, and preview environments with validated targets, project overrides, and safe relative navigation.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Configure Playwright baseURL for Multiple Environments

A pull request produces \`https://pr-1842.preview.example.net\`, staging lives on another origin, and a developer still expects \`page.goto('/checkout')\` to reach localhost. The test body should not know which host won that selection. Playwright's \`use.baseURL\` option provides the boundary, but only if environment selection is validated before the first test runs.

The risky version reads any string from \`process.env.BASE_URL\` and silently falls back to production. A typo can send destructive setup requests to the wrong deployment. A safer configuration translates a small environment name into an approved origin, permits a preview URL only under strict rules, and exposes the resolved target through Playwright configuration. Tests continue using relative URLs, while CI remains explicit about what it is exercising.

## How Playwright resolves a relative page.goto()

When \`baseURL\` is configured, Playwright uses the web platform's URL resolution rules for methods that accept a URL, including \`page.goto()\`. The base and the relative reference matter together. With \`https://staging.example.test/app/\`, navigating to \`settings\` resolves under \`/app/\`, while \`/settings\` resolves from the origin root. That leading slash is a behavioral choice, not decoration.

| Configured base | Test navigation | Resolved target | Observation |
|---|---|---|---|
| \`http://127.0.0.1:3000\` | \`/login\` | \`http://127.0.0.1:3000/login\` | Common origin-root navigation |
| \`https://stage.example.test/portal/\` | \`users\` | \`https://stage.example.test/portal/users\` | Trailing slash keeps the path directory |
| \`https://stage.example.test/portal/\` | \`/users\` | \`https://stage.example.test/users\` | Leading slash discards \`/portal/\` |
| \`https://stage.example.test/app\` | \`users\` | \`https://stage.example.test/users\` | Base path without trailing slash behaves like a file |

Keep the base at the origin when possible. Applications mounted below a path can work, but every author must understand relative URL semantics. An origin-only base plus root-relative paths is usually the least surprising convention.

The option also affects request contexts exposed through Playwright fixtures, so \`request.get('/api/health')\` can target the selected environment. That is convenient, but it increases the importance of validating the origin. UI and API setup can both touch the wrong system if selection is careless.

## Map named targets instead of accepting arbitrary hosts

Use a target name for persistent environments and a separate, constrained variable for ephemeral previews. The following config accepts \`local\`, \`staging\`, or \`preview\`. Preview hosts must use HTTPS and end in the organization's preview domain. Production is intentionally absent from the map because this suite creates orders and users.

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';

const namedTargets = {
  local: 'http://127.0.0.1:3000',
  staging: 'https://staging.example.test',
} as const;

type TargetName = keyof typeof namedTargets | 'preview';

function resolveBaseURL(): string {
  const target = (process.env.TEST_TARGET ?? 'local') as TargetName;

  if (target === 'preview') {
    const value = process.env.PREVIEW_URL;
    if (!value) throw new Error('PREVIEW_URL is required when TEST_TARGET=preview');
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.preview.example.net')) {
      throw new Error(\`Refusing unapproved preview origin: \${url.origin}\`);
    }
    return url.origin;
  }

  if (!(target in namedTargets)) {
    throw new Error(\`Unknown TEST_TARGET: \${target}\`);
  }
  return namedTargets[target as keyof typeof namedTargets];
}

const baseURL = resolveBaseURL();

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer:
    process.env.TEST_TARGET === undefined || process.env.TEST_TARGET === 'local'
      ? {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        }
      : undefined,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
\`\`\`

Throwing during config evaluation is desirable. A job with \`TEST_TARGET=stagng\` should fail before authentication setup, not quietly test localhost or another default. The exception names the invalid input without printing credentials.

This pattern also prevents a subtle security problem: untrusted pull-request code should not choose an arbitrary URL and receive test credentials. Host allowlists are only one control. CI permissions, secret exposure rules, and network segmentation still matter, but validation narrows accidental misuse.

## Decide whether environments are projects or separate jobs

Playwright projects can each override \`use.baseURL\`. This works well when the same invocation intentionally compares a small, read-only suite across two targets. It is less suitable when environments require different secrets, deployment gates, data lifecycles, or failure ownership. In those cases, separate CI jobs with one resolved base each produce clearer isolation.

| Selection model | Appropriate case | Benefit | Cost |
|---|---|---|---|
| Environment variable plus one project | Normal local, staging, or preview run | One target and one credential scope per job | CI defines the matrix |
| One Playwright project per environment | Small cross-environment smoke comparison | Single command can run named targets | Easy to trigger unintended duplicate writes |
| Separate config files | Products with materially different suites | Strong configuration separation | Shared options can drift |
| Runtime fixture that changes host | Rare multi-origin workflow inside one test | Explicit page-to-page journey | Weak choice for general environment selection |

Projects are also used for browsers, devices, authenticated roles, and setup dependencies. Combining all dimensions creates a Cartesian product. Three environments, three browsers, and two roles become eighteen projects before test-level parallelism begins. Keep environment outside the project matrix unless running those combinations is an intentional requirement.

The [Playwright projects and multi-browser guide](/blog/playwright-projects-multi-browser-guide-2026) explains project dependencies and device profiles in depth. For environment switching, the practical question is simpler: does one test command genuinely need to hit more than one deployment? If not, use a single target variable.

## Preview deployments need stricter readiness checks

An assigned preview URL does not mean the application is ready. DNS may resolve before migrations finish, the frontend may be live while an API revision is still rolling out, or an access gateway may return a successful HTML login page. Playwright's \`webServer\` option starts local processes, but it does not provision remote previews. Let the deployment system report readiness, then run a short target-specific preflight.

A useful preflight checks an endpoint whose response proves the relevant build is running. Match a commit or deployment identifier when the platform exposes one. A generic \`200 OK\` from the homepage can be produced by a CDN, maintenance page, or authentication proxy.

Do not hide a long preview poll in \`globalSetup\` unless Playwright owns the deployment lifecycle. CI is better positioned to time out deployment readiness and show platform logs. The test config should validate the URL and the first smoke test should establish application identity. This division keeps infrastructure failures distinct from product regressions.

Preview data also needs a naming strategy. Incorporate a run identifier into users, orders, and idempotency keys; delete data where deletion is safe; and avoid relying on staging's long-lived fixtures. A correct \`baseURL\` cannot rescue a suite that assumes every environment contains the same mutable records.

## Verify the resolved origin from inside tests

Most tests should never read \`process.env.TEST_TARGET\`. They should interact through relative paths and observable product behavior. A small guard test or fixture can nevertheless verify that the loaded page stayed on the approved origin. This detects application redirects to production, stale login links, and incorrectly configured canonical hosts.

The example below uses Playwright's built-in \`baseURL\` fixture value, performs UI navigation, and compares origins after redirects. It also uses the request fixture for a build identity check. The test does not duplicate the environment map.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('selected deployment serves the expected build and keeps navigation on-origin', async ({
  baseURL,
  page,
  request,
}) => {
  if (!baseURL) throw new Error('This suite requires use.baseURL');
  const expectedOrigin = new URL(baseURL).origin;

  const health = await request.get('/api/build-info');
  expect(health.ok()).toBeTruthy();
  const build = (await health.json()) as { commit: string; environment: string };
  expect(build.commit).toMatch(/^[a-f0-9]{7,40}$/);
  expect(build.environment).not.toBe('production');

  await page.goto('/login');
  await page.getByLabel('Email').fill('qa-user@example.test');
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(new URL(page.url()).origin).toBe(expectedOrigin);

  await page.getByRole('link', { name: 'Orders' }).click();
  await expect(page).toHaveURL(new URL('/orders', expectedOrigin).toString());
});
\`\`\`

The test intentionally rejects a production identity even if someone adds production to the config later. Defense in depth is useful for suites with mutations. A read-only synthetic monitor would have a different policy and different credentials.

## Keep credentials coupled to the selected target

A base URL and its account credentials form one configuration unit. Reusing a global \`E2E_PASSWORD\` across every deployment is convenient but increases blast radius. Prefer environment-scoped secret stores and accounts with only the permissions required by the suite. A preview may use short-lived credentials created for the build; staging may use a resettable automation tenant.

Validate combinations, not only individual values. If \`TEST_TARGET=staging\`, require the staging credential variable. If the target is a preview, reject staging-only administrative tests through tags or a separate test directory. A correct host with the wrong tenant can be as destructive as a wrong host.

Do not put secrets in \`baseURL\`, query parameters, Playwright project names, or report metadata. URLs appear in traces and logs. HTTP basic authentication, when unavoidable, belongs in the supported \`httpCredentials\` option, but an application login through a storage-state setup project is generally clearer.

## Overrides at config, project, file, and test scope

Playwright merges \`use\` options at several scopes. Top-level config establishes the suite default. A project can override it. \`test.use()\` can override options for a file or describe group. That power is useful for a genuine secondary origin, but casual local overrides make failures hard to reproduce.

If a single workflow visits two cooperating applications, keep one canonical \`baseURL\` and navigate to the second with an explicit, validated URL supplied by a fixture. Changing the base mid-test does not rewrite URLs already loaded, and it obscures which origin a relative call will use. Naming both origins, such as \`merchantBaseURL\` and \`adminBaseURL\`, is more legible than repeatedly overriding a generic option.

The complete [Playwright test configuration reference](/blog/playwright-test-config-options-complete-reference) is useful when inheritance becomes complex. In code review, ask where each value is resolved and whether a project spread accidentally overwrites \`use\`. For example, placing \`use: devices['Desktop Chrome']\` in a project would replace project use values, while \`use: { ...devices['Desktop Chrome'], baseURL }\` keeps both explicit.

## Failure patterns that look like product bugs

An extra or missing slash can route tests to the wrong path. Diagnose by logging the resolved origin and pathname, never the entire URL if it may contain sensitive query data. If every locator fails on an unexpected page, inspect \`page.url()\` and the trace before changing selectors.

Environment redirects are another source of confusion. A preview's OAuth callback may still point at staging. Playwright follows the redirect, so the login appears to succeed while subsequent data assertions hit a different backend. Origin guards make that failure immediate.

Cookies are scoped by domain and security attributes. A storage-state file captured on localhost will not authenticate \`staging.example.test\`. Generate state for each target, name it by non-secret environment identifier, and never check live tokens into the repository. The same rule applies when localhost uses HTTP but remote systems require Secure cookies.

Finally, remember that configuration is evaluated in the Node process before tests. Loading a \`.env\` file, if your project chooses to use one, must happen before resolving the map. Playwright does not require a particular dotenv library. Avoid magical search rules that select an unexpected file based on the current working directory.

## A deployment-target review checklist

Before enabling a new environment in CI, verify all of the following:

- The target has a named, reviewed mapping or a narrowly validated preview domain.
- Unknown names fail closed during config loading.
- Production is excluded from mutating suites.
- The selected secret belongs to the same environment as the URL.
- Relative paths follow one agreed leading-slash convention.
- Remote readiness proves build identity, not only HTTP availability.
- Authentication state is generated for the selected origin.
- Test data is unique to the run and does not assume staging fixtures exist.
- Reports identify the target without exposing credentials or sensitive query strings.
- Redirects are checked so a preview cannot silently drift to another origin.

Once those controls exist, \`baseURL\` becomes pleasantly boring. Test authors write \`page.goto('/orders')\`, CI chooses a reviewed deployment, and a configuration error fails before a destructive action can run.

## Unit-test the target resolver without launching a browser

Environment selection is ordinary configuration code and can be tested as such. Extract \`resolveBaseURL(env)\` into a side-effect-free module that accepts a small environment record. Table-drive valid names, missing preview values, deceptive host suffixes, HTTP previews, credentials embedded in a URL, query strings, and fragments. Return a canonical origin only after validation.

Hostname checks require care. \`hostname.endsWith('preview.example.net')\` accepts \`evilpreview.example.net\`. Requiring \`.preview.example.net\` handles subdomains but rejects the bare parent intentionally. Decide whether the parent itself is allowed and encode that as \`hostname === parent || hostname.endsWith('.' + parent)\`. Parse with the platform \`URL\` class before comparing; do not validate security boundaries with one large URL regex.

Reject usernames and passwords in preview URLs. Reducing an accepted URL to \`url.origin\` removes paths and queries, but it does not make embedded credentials safe to accept or log during an error. Reject non-empty \`username\` or \`password\` explicitly. Similarly decide whether a non-default port is permitted. Many preview systems use standard 443, so an unexpected port can indicate a malformed or attacker-chosen target.

The resolver tests should not import \`playwright.config.ts\` if that import starts environment loading or computes unrelated options. Keep a tiny module such as \`test-target.ts\`, test it with Vitest or Node's test runner, and call it from the Playwright config. This catches fail-open regressions before a browser or credential is involved.

There is also value in a CI contract test for the generated configuration. Run \`playwright test --list\` with each supported target using non-secret placeholder inputs where possible. Listing evaluates configuration and discovers tests without executing them. It can catch a renamed environment, invalid project combination, or missing test directory. Do not use \`--list\` as proof that a remote deployment is reachable; that remains a readiness concern.

Treat additions to the target map as security-sensitive code review. The reviewer should know whether tests mutate data, which credential scope will be used, whether the hostname is internal, and what cleanup policy applies. A new string in a map can change where hundreds of API and browser actions run.

Include normalization cases in that review. Hostnames are case-insensitive, default ports may disappear from a canonical origin, and a trailing dot can change a naive suffix comparison. Decide whether internationalized domain names are ever valid targets. For most private preview systems, rejecting surprising forms is simpler than broad normalization. The resolver should return one predictable spelling so traces, storage-state filenames, and target labels do not fragment into several identities for the same deployment.

## Frequently Asked Questions

### Does baseURL apply to both page and APIRequestContext fixtures?

Yes, relative URLs used through Playwright's configured fixtures can resolve against the \`use.baseURL\` value. That is why target validation must protect both browser flows and API-based setup or cleanup.

### Should localhost be the fallback when TEST_TARGET is missing?

It is a reasonable developer default if local startup is deterministic. In CI, consider requiring an explicit target so a missing variable cannot accidentally start or test the wrong service.

### Can each Playwright project have a different baseURL?

Yes. Put \`baseURL\` inside each project's \`use\` object. Use that design only when one invocation intentionally runs the same selected tests against multiple deployments, because writes and credentials otherwise become difficult to control.

### Why does a relative path ignore the path segment in my base URL?

A reference beginning with \`/\` resolves from the origin root. A base path also needs a trailing slash to behave like a directory. Use the standard \`new URL(relative, base)\` behavior in a unit check if the result is not obvious.

### How should ephemeral preview URLs be passed safely?

Pass the platform-produced HTTPS URL through a dedicated variable, parse it with \`URL\`, require an approved hostname suffix, and restrict secret availability for untrusted pull requests. Do not accept an unrestricted host through a generic base URL variable.
`,
};
