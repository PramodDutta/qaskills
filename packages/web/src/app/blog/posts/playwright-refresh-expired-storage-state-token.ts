import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Refresh an Expired Playwright storageState Token',
  description:
    'Refresh an expired Playwright storageState token safely before tests, preserve browser context isolation, and prevent parallel authentication failures.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Refresh an Expired Playwright storageState Token

At 9:01 on Monday, every authenticated Playwright test redirects to \`/login\`. The same suite passed on Friday, no selectors changed, and the saved state file still exists. Its access token simply expired while the file sat on disk. A \`storageState\` snapshot preserves authentication data, but it does not renew credentials or stop the identity provider's clock. Treating that snapshot as a permanent login turns a useful optimization into a scheduled failure.

The durable solution is a small authentication lifecycle: inspect the saved state, decide whether it is still usable, refresh or replace it through a supported application flow, write the new state atomically, and only then create test contexts. This guide builds that lifecycle in TypeScript without teaching tests to ignore expiry or weakening production token validation.

If the fundamentals are unfamiliar, the [Playwright authentication and storageState guide](/blog/playwright-authentication-testing-storage-state-2026) explains how reusable state is created. For the isolation model behind separate contexts, projects, and workers, use the [Playwright browser context guide](/blog/playwright-browser-context-guide-2026). Here we focus narrowly on expiry, refresh coordination, and safe state ownership.

## What Actually Expires Inside a storageState File

\`browserContext.storageState()\` serializes cookies and local-storage entries for visited origins. Recent Playwright versions can also include IndexedDB when requested. The JSON file has no Playwright-specific expiry timer. Instead, each credential inside it follows the application's own rules.

An HTTP cookie may carry an \`expires\` timestamp. A JWT in local storage usually carries an \`exp\` claim. An opaque access token has no client-readable expiry at all. A refresh cookie might remain valid after the access token expires, allowing the application to silently obtain a replacement. In another system, refresh rotation invalidates the previous refresh token after one use. Those cases require different test setup logic.

| Credential pattern | What the snapshot contains | Reliable freshness signal | Preferred recovery |
|---|---|---|---|
| Session cookie | Cookie plus optional expiry | Cookie expiry, then a session probe | Re-authenticate or extend through supported API |
| JWT in local storage | Encoded access token | Decode \`exp\`, then verify with a protected request | Call refresh flow before context creation |
| Access token plus refresh cookie | Local token and HTTP-only cookie | Protected request or token \`exp\` | Open context and let refresh endpoint rotate both |
| Opaque bearer token | Unreadable token string | Lightweight authenticated endpoint | Refresh on 401, not by guessing its lifetime |
| Server-side session without expiry metadata | Cookie identifier only | Authenticated \`/me\` or session endpoint | Recreate state when probe is unauthorized |

Decoding a JWT is useful for scheduling, not security validation. The test runner may read \`exp\` to avoid starting with a clearly stale token, but the application and identity provider remain responsible for signature, issuer, audience, and revocation checks. A token can be unexpired yet revoked, so a protected probe is the final authority.

## Choose the Owner of Authentication Refresh

Before writing code, decide who owns refresh. There should be one answer per saved-state file. If global setup, every worker, and the application UI can all rotate the same refresh token, intermittent failures are almost guaranteed.

| Ownership model | Best fit | Advantage | Main risk |
|---|---|---|---|
| Global setup refreshes once | Shared read-only account, short suite | Simple and efficient | Token may expire during a very long run |
| Setup project creates dependencies | Multiple roles or browsers | Visible in reports and traceable | Requires careful project dependencies |
| Worker fixture owns one account | Parallel tests mutate server data | Strong isolation per worker | More accounts and login traffic |
| Application refreshes naturally | Production client already handles 401 | Tests realistic browser behavior | Harder to distinguish setup bugs from client bugs |
| API login replaces state | Stable test-only authentication API | Fast and deterministic | Can miss defects in the real login UI |

For a shared account, use a setup project and make authenticated projects depend on it. The setup test runs once before its dependents, can be traced, and fails with a clear authentication error instead of producing dozens of misleading UI failures. For parallel mutation-heavy suites, allocate an account and state path per worker. Never let several processes rewrite one JSON file.

## Inspect JWT Expiry Without Trusting It

The following helper extracts a JWT from local storage, decodes only its payload, and applies a safety window. It does not claim the token is valid. It answers a narrower question: is this token definitely missing, malformed, or too close to expiry to start a suite?

\`\`\`typescript
// auth/token-state.ts
import fs from 'node:fs/promises';
import type { BrowserContext } from '@playwright/test';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

export async function readState(path: string): Promise<StorageState | undefined> {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8')) as StorageState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function decodePayload(token: string): { exp?: number } | undefined {
  const part = token.split('.')[1];
  if (!part) return undefined;

  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as {
      exp?: number;
    };
  } catch {
    return undefined;
  }
}

export function hasFreshAccessToken(
  state: StorageState | undefined,
  origin: string,
  minimumLifetimeSeconds = 120,
): boolean {
  const savedOrigin = state?.origins.find((item) => item.origin === origin);
  const token = savedOrigin?.localStorage.find((item) => item.name === 'access_token')?.value;
  if (!token) return false;

  const payload = decodePayload(token);
  if (typeof payload?.exp !== 'number') return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now + minimumLifetimeSeconds;
}
\`\`\`

The two-minute margin prevents a token from passing setup and expiring during the first navigation. Pick a margin based on suite startup time and token lifetime. Do not set it so high that every run refreshes. If the token is opaque, skip decoding and use the authenticated probe shown next.

## Refresh Through the Browser Context

An HTTP-only refresh cookie cannot be copied out of JavaScript, which is intentional. Playwright can still use it by creating a temporary context from the old state and calling the same refresh endpoint the application uses. The response may set a rotated cookie, and its JSON body may contain the new access token. After updating local storage, save the resulting context.

This example assumes a conventional JWT contract: \`POST /api/auth/refresh\` accepts the refresh cookie, returns \`{ accessToken }\`, and sets any rotated cookie. Replace those details with your application's documented endpoint. The helper probes \`/api/me\` before relying on the decoded expiry, so it also catches revoked JWTs.

\`\`\`typescript
// auth/ensure-auth-state.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { hasFreshAccessToken, readState } from './token-state';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const statePath = path.resolve('playwright/.auth/admin.json');

export async function ensureAuthState(): Promise<void> {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const oldState = await readState(statePath);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    storageState: oldState,
  });

  try {
    const probe = await context.request.get('/api/me');
    if (probe.ok() && hasFreshAccessToken(oldState, baseURL)) return;

    const refresh = await context.request.post('/api/auth/refresh');
    if (refresh.ok()) {
      const body = (await refresh.json()) as { accessToken: string };
      const page = await context.newPage();
      await page.goto('/auth/refresh-complete');
      await page.evaluate((token) => localStorage.setItem('access_token', token), body.accessToken);
      await context.storageState({ path: statePath });
      return;
    }

    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/dashboard/);
    await context.storageState({ path: statePath });
  } finally {
    await context.close();
    await browser.close();
  }
}
\`\`\`

The \`finally\` block matters even when the helper returns early. A setup process that leaks Chromium can hold CI open after tests finish. Also notice that refresh failure falls back to a real login. A refresh token can expire, be revoked, or be invalidated by rotation, and setup must recover rather than repeatedly retrying a dead credential.

In production code, avoid asserting a particular refresh status unless the contract guarantees it. Some identity layers answer 400, others 401. The decision that matters is simply whether refresh succeeded. Log sanitized status and correlation identifiers, never token bodies.

## Wire Refresh Into a Playwright Setup Project

Put the lifecycle behind a setup test and point dependent projects at the resulting file. This makes order explicit and prevents a normal test from racing setup.

\`\`\`typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';
import { ensureAuthState } from '../auth/ensure-auth-state';

setup('refresh or recreate admin authentication', async () => {
  await ensureAuthState();
});

// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium-authenticated',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
    },
  ],
});
\`\`\`

Keep \`playwright/.auth\` out of source control. State files can contain bearer credentials and personally identifiable data. Generate them inside CI, restrict artifact collection, and delete them according to the same policy used for other secrets. A trace recorded after authentication can also reveal tokens in headers, so configure redaction at the application or proxy layer where possible.

## Make State Writes Safe Under Parallel Execution

One setup project normally executes before workers, but developers may launch two Playwright commands against the same checkout. CI jobs may also share a mounted workspace. Directly writing \`admin.json\` risks another process reading a partial document.

Write to a unique temporary path, then rename it into place. On the same filesystem, rename provides an atomic replacement on common CI platforms. The browser API writes the temporary file, and Node performs the final swap.

\`\`\`typescript
import fs from 'node:fs/promises';
import type { BrowserContext } from '@playwright/test';

export async function saveStateAtomically(
  context: BrowserContext,
  destination: string,
): Promise<void> {
  const temporary = \`\${destination}.\${process.pid}.tmp\`;
  await context.storageState({ path: temporary });
  await fs.rename(temporary, destination);
}
\`\`\`

Atomic replacement prevents malformed JSON, but it does not solve refresh-token rotation. Two processes can both read refresh token A, one exchanges it for B, and the other then tries the invalid A. Use separate state files and test accounts per CI job, or guard refresh with a cross-process lock appropriate to your environment. A local lock file is insufficient across separate containers unless the filesystem is genuinely shared.

Worker-scoped authentication is cleaner when tests run concurrently and accounts are available. Include \`testInfo.parallelIndex\` or worker index in the state path, lease a distinct account, and let that worker own all rotation. The account pool must be at least as large as the effective worker count across shards.

## Test the Expiry Path Instead of Merely Using It

Authentication setup deserves direct tests. Otherwise, it is exercised only when credentials happen to age, often during a release. Build deterministic cases around a disposable account or stub identity service.

| Scenario | Arrange | Expected observation |
|---|---|---|
| Access token fresh | State with sufficient remaining lifetime | Probe succeeds and no refresh call occurs |
| Access token expired, refresh valid | Expired access token plus current refresh cookie | New access token and rotated cookie are saved |
| Access token revoked | Unexpired token rejected by \`/api/me\` | Refresh occurs despite future \`exp\` |
| Refresh token expired | Both credentials stale | Login fallback creates usable state |
| Refresh rotation race | Two consumers exchange one token | One fails clearly, no corrupted JSON appears |
| Identity provider unavailable | Refresh and login endpoints fail | Setup fails once with actionable diagnostics |

Use a short-lived token issued specifically for tests instead of editing a JWT signature. Editing \`exp\` makes the token invalid and tests signature rejection, not expiry behavior. If you own a fake identity provider, expose a test clock or configurable lifetime. If you do not, create the state through the supported login API and wait only when the lifetime is already very short. Avoid long sleeps in a main suite.

Also test a mid-run expiry. Setup refresh only proves that a context starts healthy. A production client should handle a token expiring between two requests, deduplicate concurrent refreshes, replay eligible requests, and sign out when refresh fails. That belongs in a focused browser test with controlled server responses, not hidden inside global setup.

## Diagnose Common Refresh Failures

When refreshed state still lands on login, inspect the state boundaries in order. Confirm the saved origin matches exactly, including scheme and port. Local storage for \`http://127.0.0.1:3000\` does not apply to \`http://localhost:3000\`. Confirm the refresh response's \`Set-Cookie\` domain, path, \`Secure\`, and \`SameSite\` attributes are compatible with the test URL.

If a new token is in the JSON but the app uses the old one, check when the application reads storage. Some clients cache the token in memory at startup. Set local storage before navigating to an application page, or reload after replacement. If authentication lives in IndexedDB, request IndexedDB capture or seed it through application code, because ordinary local-storage manipulation will not reach it.

Repeated 401 responses after successful refresh often indicate audience, tenant, or environment mismatch. A state file generated against staging should not be reused on localhost just because the cookie name matches. Record non-secret claims such as issuer, audience, subject identifier, and expiry in setup diagnostics, then compare them with the target API configuration.

Finally, distinguish authentication failure from authorization failure. Refresh may produce a valid token for an account that lacks the role required by the test. Probe a neutral identity endpoint first, then assert role claims or a capability endpoint separately. That yields a precise failure instead of labeling every 403 as an expired session.

Make setup telemetry useful without making it dangerous. Record whether setup reused, refreshed, or recreated state, plus the credential's remaining lifetime rounded to minutes and the probe status. Never print the access token, refresh token, full cookie header, or complete state document. In CI, a single structured setup annotation is usually enough to distinguish ordinary renewal from an unexpected login fallback.

Review the lifecycle whenever the identity provider changes refresh rotation, cookie scope, token lifetime, or claim format. Authentication helpers are infrastructure code, not a forgotten test shortcut. Give them focused ownership, dependency updates, and failure alerts. A passing setup should guarantee that dependent contexts start authenticated, while application tests remain responsible for renewal that occurs after those contexts are already running.

## Frequently Asked Questions

### Does Playwright automatically refresh tokens stored in storageState?

No. Playwright loads cookies and origin storage into a context, but token renewal is application behavior. Your setup or application must call the supported refresh flow and save any updated state when later contexts need it.

### Should a setup test decode the JWT exp claim?

It can decode \`exp\` as an optimization to avoid starting near expiry. Decoding does not validate the signature or detect revocation, so pair it with a protected endpoint probe and let the server make the validity decision.

### Can every Playwright worker share one refreshed state file?

Workers can safely read one stable file when they use the same read-only account. They should not concurrently rotate and overwrite that file. Use one setup owner, or give each worker its own account and state path.

### Why does the refreshed cookie disappear in the next context?

The most common causes are saving state before the refresh response completes, incompatible cookie domain or security attributes, and loading the state under a different origin. Inspect the saved cookie fields and ensure the temporary context receives the full response before calling \`storageState()\`.

### Is UI login better than an API refresh for test setup?

Use UI login in dedicated authentication journey tests. For most dependent tests, a documented refresh or login API is faster and isolates unrelated UI risk. Keep at least one focused test covering the real sign-in experience so setup efficiency does not replace product coverage.
`,
};
