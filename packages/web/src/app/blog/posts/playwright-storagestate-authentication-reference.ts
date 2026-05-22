import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright storageState Authentication: Complete Reference',
  description: 'Complete 2026 reference for Playwright storageState authentication. Learn how to save and reuse login state across tests with storageState, project dependencies, global setup, multi-role auth, and CI patterns.',
  date: '2026-05-22',
  category: 'Guide',
  content: `
Logging in once per test is the single largest source of slowness in modern Playwright suites. A 200-test login at three seconds each is ten minutes of nothing-but-typing-passwords. The fix is \`storageState\`: log in one time, save cookies and local storage to a JSON file, and have every subsequent test boot up already authenticated.

This complete reference covers every storageState pattern that matters in 2026: global setup, project dependencies, multi-role authentication, storage state in CI, token refresh, and the gotchas that bite teams who do it wrong.

---

## Table of Contents

1. [What Is storageState?](#what-is-storagestate)
2. [Basic Pattern: Global Setup](#basic-pattern-global-setup)
3. [Modern Pattern: Setup Project](#modern-pattern-setup-project)
4. [Multi-Role Authentication](#multi-role-authentication)
5. [storageState Format Reference](#storagestate-format-reference)
6. [Per-Test storageState Override](#per-test-storagestate-override)
7. [Token Refresh and Expiry](#token-refresh-and-expiry)
8. [storageState in CI](#storagestate-in-ci)
9. [Comparison: storageState vs Alternatives](#comparison-storagestate-vs-alternatives)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## What Is storageState? {#what-is-storagestate}

\`storageState\` is a Playwright feature that serializes a browser context's cookies, \`localStorage\`, and \`sessionStorage\` to a JSON file. Subsequent test runs load that JSON, restoring the authenticated state without re-running login.

The contract is simple:

\`\`\`typescript
// Save
await context.storageState({ path: 'auth.json' });

// Load (next run)
const context = await browser.newContext({ storageState: 'auth.json' });
\`\`\`

That second context starts already logged in — every test inside it skips the login form entirely.

### Why It Matters

| Approach              | 200 tests × 3s login | CI cost (per run) |
| --------------------- | -------------------- | ----------------- |
| Login in each test    | 600 seconds          | 10 min wasted     |
| storageState (once)   | 3 seconds            | 3s amortized      |

That is the difference between a five-minute and a fifteen-minute CI pipeline.

---

## Basic Pattern: Global Setup {#basic-pattern-global-setup}

The simplest pattern uses a \`globalSetup\` script that runs once before any test.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  use: {
    storageState: 'auth.json',
  },
});
\`\`\`

\`\`\`typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  await page.context().storageState({ path: 'auth.json' });
  await browser.close();
}

export default globalSetup;
\`\`\`

Pros: simple. Cons: no parallelism for login itself, harder to model multiple roles.

---

## Modern Pattern: Setup Project {#modern-pattern-setup-project}

The recommended pattern in 2026 is a **dedicated setup project** that runs as a dependency before all other projects.

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\\.setup\\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

\`\`\`typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  await page.context().storageState({ path: authFile });
});
\`\`\`

Advantages over \`globalSetup\`:

- Runs as a real test with reporting and traces
- Can run in parallel with other setup tasks
- Trace Viewer captures the login if it fails
- Easy to extend to multiple roles

---

## Multi-Role Authentication {#multi-role-authentication}

Most real apps have multiple user roles (admin, manager, customer). Use one storageState file per role.

\`\`\`typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

const adminFile = 'playwright/.auth/admin.json';
const userFile = 'playwright/.auth/user.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/admin');
  await page.context().storageState({ path: adminFile });
});

setup('authenticate as user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill(process.env.USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: userFile });
});
\`\`\`

Then create separate projects per role:

\`\`\`typescript
projects: [
  { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
  {
    name: 'admin tests',
    testMatch: /admin\\/.*\\.spec\\.ts/,
    use: { storageState: 'playwright/.auth/admin.json' },
    dependencies: ['setup'],
  },
  {
    name: 'user tests',
    testMatch: /user\\/.*\\.spec\\.ts/,
    use: { storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
];
\`\`\`

---

## storageState Format Reference {#storagestate-format-reference}

Inspecting a real \`auth.json\` reveals the format:

\`\`\`json
{
  "cookies": [
    {
      "name": "session",
      "value": "abc123...",
      "domain": "app.example.com",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://app.example.com",
      "localStorage": [
        { "name": "user_pref", "value": "dark" }
      ]
    }
  ]
}
\`\`\`

You can construct this object programmatically without ever running the login UI — useful when your backend exposes a fast API endpoint that returns a session token.

\`\`\`typescript
const response = await request.post('/api/login', {
  data: { email: 'user@example.com', password: 'pw' },
});
const token = (await response.json()).token;

const storageState = {
  cookies: [],
  origins: [
    {
      origin: 'https://app.example.com',
      localStorage: [{ name: 'token', value: token }],
    },
  ],
};

await fs.writeFile('auth.json', JSON.stringify(storageState));
\`\`\`

This API-based login is **10× faster** than going through the UI.

---

## Per-Test storageState Override {#per-test-storagestate-override}

Sometimes a single test needs a different auth state (e.g., a logged-out flow). Override at the test level:

\`\`\`typescript
test.use({ storageState: { cookies: [], origins: [] } });

test('shows login page when logged out', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
\`\`\`

Or per fixture for cleaner organization:

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ adminPage: Page }>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
\`\`\`

Now any test that needs admin state just destructures \`{ adminPage }\`:

\`\`\`typescript
test('admin can delete users', async ({ adminPage }) => {
  await adminPage.goto('/admin/users');
  await adminPage.getByRole('button', { name: 'Delete' }).click();
});
\`\`\`

---

## Token Refresh and Expiry {#token-refresh-and-expiry}

JWTs expire, sessions get invalidated, cookies have TTLs. Strategies:

### Strategy 1: Refresh Every Run

Always run setup, never persist auth.json between runs. Slow but correct.

### Strategy 2: TTL-Based Refresh

Check the file's mtime and refresh if older than N minutes:

\`\`\`typescript
import fs from 'fs';

setup('authenticate if needed', async ({ page }) => {
  const file = 'playwright/.auth/user.json';
  const exists = fs.existsSync(file);
  const age = exists ? Date.now() - fs.statSync(file).mtimeMs : Infinity;
  const TTL = 30 * 60 * 1000; // 30 minutes

  if (age < TTL) return;

  await page.goto('/login');
  /* ... login flow ... */
  await page.context().storageState({ path: file });
});
\`\`\`

### Strategy 3: Validate Then Refresh

Try the stored state, hit an authenticated endpoint, and only refresh if it returns 401:

\`\`\`typescript
setup('ensure valid auth', async ({ request }) => {
  const file = 'playwright/.auth/user.json';
  const state = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const token = state.origins[0].localStorage[0].value;

  const r = await request.get('/api/me', { headers: { Authorization: \`Bearer \${token}\` } });
  if (r.ok()) return;

  /* otherwise re-login */
});
\`\`\`

---

## storageState in CI {#storagestate-in-ci}

### Recipe 1: Never Commit auth.json

Add to \`.gitignore\`:

\`\`\`
playwright/.auth/
\`\`\`

The file contains live session tokens. Treat it like a password.

### Recipe 2: Cache Between Runs (Optional)

If your setup is slow and credentials are static, you can cache:

\`\`\`yaml
- name: Cache auth state
  uses: actions/cache@v4
  with:
    path: playwright/.auth
    key: pw-auth-\${{ hashFiles('playwright.config.ts') }}-\${{ secrets.CACHE_BUST_KEY }}
\`\`\`

Bump \`CACHE_BUST_KEY\` to force a fresh login (e.g., after rotating credentials).

### Recipe 3: Secrets, Not Hardcoded Passwords

\`\`\`typescript
await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
\`\`\`

Inject via CI secrets, never hardcode.

---

## Comparison: storageState vs Alternatives {#comparison-storagestate-vs-alternatives}

| Strategy                   | Speed     | Realism   | Complexity | Multi-Role |
| -------------------------- | --------- | --------- | ---------- | ---------- |
| Login per test             | Slow      | High      | Low        | Trivial    |
| storageState (UI login)    | Fast      | High      | Medium     | Easy       |
| storageState (API login)   | Fastest   | Medium    | Medium     | Easy       |
| Cookies via context.addCookies | Fast      | Medium    | Low        | Easy       |
| Mock auth (no real backend) | Fastest   | Low       | Low        | Trivial    |

For 90% of teams, **storageState via setup project** is the right answer.

---

## Frequently Asked Questions {#frequently-asked-questions}

### How big does auth.json typically get?

Usually 2–20 KB. If yours is megabytes, you probably have a bug.

### Can I share storageState between Chromium, Firefox, and WebKit?

Yes. Cookies and localStorage are browser-agnostic JSON.

### Does storageState persist sessionStorage?

Yes, since Playwright 1.36+. It is included in the \`origins\` array.

### What if my app uses HTTP-only cookies?

Perfect — Playwright captures HTTP-only cookies and replays them just fine.

### Can I use storageState with the \`request\` (APIRequestContext) fixture?

Yes:

\`\`\`typescript
const request = await playwright.request.newContext({ storageState: 'auth.json' });
\`\`\`

### Does storageState support service worker state?

No — service worker registrations and IndexedDB are not persisted.

### What about CSRF tokens stored in meta tags?

Those are re-fetched on each page load, so storageState handles them implicitly.

### Can I use storageState across different Playwright versions?

Yes. The JSON format is stable across minor and major versions.

---

## Related QASkills Skills

Get instant access to authentication patterns in your AI coding agent:

\`\`\`bash
npx qaskills add playwright-storagestate-auth
npx qaskills add playwright-multi-role-testing
npx qaskills add playwright-api-login
\`\`\`

Browse all auth-related skills at [qaskills.sh/skills](https://qaskills.sh/skills).

---

storageState is the cheapest 10× speed-up you can apply to any Playwright suite. Move login into a setup project today and watch your CI minutes plummet.
`,
};
