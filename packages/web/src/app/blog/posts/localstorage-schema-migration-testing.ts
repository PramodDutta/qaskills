import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'localStorage Migration Testing: Versioning and Corrupt State',
  description: 'localStorage migration testing workflow for versioned browser state, corrupt JSON, idempotency, quota failures, support recovery, and Playwright checks.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# localStorage Migration Testing: Versioning and Corrupt State

localStorage migration testing proves that old browser state can be upgraded safely when your frontend changes stored keys, JSON shape, feature flags, or preferences. The test should seed older localStorage values, boot the app, verify the new schema, reload, verify idempotency, and then try corrupt or unexpected values. The target is not only "no crash." The target is predictable recovery.

This matters because localStorage lives outside deployments. A user can skip five releases, keep stale JSON for months, run multiple tabs, or carry corrupted values from a browser extension. Your code has to meet that state in the browser.

## Treat Browser State Like a Small Database

localStorage is string storage scoped to an origin. It is synchronous, persistent, and easy to misuse. The browser will not run migrations for you, enforce schemas, manage transactions, or tell your app that a user has a half-old, half-new state bundle. If your app stores preferences, drafts, onboarding progress, cached filters, or client-side feature state, you own the migration behavior.

| localStorage risk | Why it appears | Test signal |
|---|---|---|
| Missing key | New user, cleared storage, old app never wrote it | App boots with defaults |
| Old version | User skipped releases | Migration writes current version |
| Future version | User downgraded app or shared profile | App avoids destructive rewrite |
| Corrupt JSON | Manual edit, extension, partial write, old bug | App resets or quarantines key |
| Wrong type | Earlier schema allowed loose values | Migration normalizes or drops value |
| Quota error | Storage full or browser restriction | App continues with in-memory fallback |
| Multi-tab race | Two tabs migrate at once | Migration is idempotent |

The database analogy is useful, but do not overbuild. You do not need a migration framework for every preference. You need a versioned contract, a tested upgrader, and a recovery policy for bad state.

If localStorage state controls cache invalidation or offline behavior, test it beside [service worker cache update flows](/blog/service-worker-testing-cache-update-flows). A service worker can keep old assets alive while localStorage already moved forward, which creates a mixed-version client that normal happy-path tests miss.

## Define the Stored Schema in Code

Start with one source of truth for each key. The code below defines a stored preferences object with a version number, a migration function, and a safe loader. It does not trust parsed JSON. It checks shape before using values.

\`\`\`ts
export interface PreferencesV1 {
  theme?: 'light' | 'dark';
  dense?: boolean;
}

export interface PreferencesV2 {
  version: 2;
  appearance: {
    theme: 'light' | 'dark' | 'system';
    density: 'comfortable' | 'compact';
  };
}

const STORAGE_KEY = 'app.preferences';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migratePreferences(value: unknown): PreferencesV2 {
  if (!isRecord(value)) {
    return defaultPreferences();
  }

  if (value.version === 2 && isRecord(value.appearance)) {
    const theme = value.appearance.theme;
    const density = value.appearance.density;

    return {
      version: 2,
      appearance: {
        theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
        density: density === 'compact' ? 'compact' : 'comfortable',
      },
    };
  }

  const theme = value.theme === 'light' || value.theme === 'dark' ? value.theme : 'system';
  const density = value.dense === true ? 'compact' : 'comfortable';

  return {
    version: 2,
    appearance: { theme, density },
  };
}

export function defaultPreferences(): PreferencesV2 {
  return {
    version: 2,
    appearance: { theme: 'system', density: 'comfortable' },
  };
}

export function loadPreferences(storage: Storage = window.localStorage): PreferencesV2 {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return defaultPreferences();
  }

  try {
    const parsed = JSON.parse(raw);

    if (isRecord(parsed) && typeof parsed.version === 'number' && parsed.version > 2) {
      // A newer deploy (or shared profile) wrote a schema this build does not
      // understand. Render on defaults, but leave the stored value untouched:
      // writing back would silently downgrade the newer code's data.
      return defaultPreferences();
    }

    const migrated = migratePreferences(parsed);
    storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    const fallback = defaultPreferences();
    storage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}
\`\`\`

The function is intentionally strict about known values and forgiving about unknown objects. That is a good default for preferences. For security-sensitive state, such as remembered account IDs or authorization hints, the safer policy may be to delete unknown values and force a fresh server-backed read.

## Build a Migration Matrix

Do not ask reviewers to infer coverage from test names. Write a matrix that lists the stored shapes your app must tolerate. Each row should map to a test case.

| Stored input | Example | Expected result | User-facing behavior |
|---|---|---|---|
| Missing key | No \`app.preferences\` | Write v2 defaults | Settings page loads |
| V1 light dense | \`{ "theme": "light", "dense": true }\` | v2 light compact | User preference preserved |
| V1 unknown theme | \`{ "theme": "blue" }\` | v2 system comfortable | Bad value normalized |
| Valid v2 | Current schema | Same value after reload | Idempotent |
| Future version | \`{ "version": 99 }\` | Product-specific policy | No crash, no silent downgrade |
| Corrupt JSON | \`{ theme:\` | Defaults or quarantine | App tells user only if needed |

The future-version row is often skipped. It matters when rollback happens. If a user opens v2, stores v2 state, then the site rolls back to v1 code, old code may not understand the new shape. You cannot solve every downgrade path, but you can stop older code from deleting data it does not understand.

For localization settings, include invalid locale tags, removed locales, right-to-left flags, and stale currency preferences. Those details fit naturally with a broader [localization testing checklist](/blog/localization-testing-checklist-guide), because stored language choices can break rendering before the user reaches a settings screen.

## Unit Test the Pure Migrator First

The fastest tests should not need a browser. They should call the migrator with plain values and prove that every historical shape maps to the current shape.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { defaultPreferences, migratePreferences } from './preferencesStorage';

describe('migratePreferences', () => {
  it('converts v1 dense dark preferences to v2', () => {
    expect(migratePreferences({ theme: 'dark', dense: true })).toEqual({
      version: 2,
      appearance: { theme: 'dark', density: 'compact' },
    });
  });

  it('normalizes unknown v1 values', () => {
    expect(migratePreferences({ theme: 'blue', dense: 'yes' })).toEqual({
      version: 2,
      appearance: { theme: 'system', density: 'comfortable' },
    });
  });

  it('keeps valid v2 state idempotent', () => {
    const current = {
      version: 2,
      appearance: { theme: 'light', density: 'compact' },
    };

    expect(migratePreferences(current)).toEqual(current);
  });

  it('uses defaults for arrays, null, and primitives', () => {
    expect(migratePreferences(null)).toEqual(defaultPreferences());
    expect(migratePreferences(['dark'])).toEqual(defaultPreferences());
    expect(migratePreferences('dark')).toEqual(defaultPreferences());
  });
});
\`\`\`

These tests tell you whether the migration math is correct. They do not prove the app writes localStorage at the right time, handles parse errors, or survives reloads. That is the browser test's job.

## Test the Storage Boundary Without a Browser

A fake \`Storage\` implementation catches loader behavior, including write-back and corrupt JSON. Keep it tiny and standards-shaped.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { defaultPreferences, loadPreferences } from './preferencesStorage';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('loadPreferences', () => {
  it('writes migrated v2 preferences back to storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('app.preferences', JSON.stringify({ theme: 'light', dense: true }));

    const loaded = loadPreferences(storage);
    const stored = storage.getItem('app.preferences');

    expect(loaded.appearance.density).toBe('compact');
    expect(stored).toBe(JSON.stringify(loaded));
  });

  it('recovers from corrupt JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('app.preferences', '{ theme: dark');

    const loaded = loadPreferences(storage);

    expect(loaded.version).toBe(2);
    expect(loaded.appearance.theme).toBe('system');
  });

  it('does not overwrite a future schema version', () => {
    const storage = new MemoryStorage();
    const futureValue = JSON.stringify({ version: 99, layout: { mode: 'grid' } });
    storage.setItem('app.preferences', futureValue);

    const loaded = loadPreferences(storage);

    expect(loaded).toEqual(defaultPreferences());
    expect(storage.getItem('app.preferences')).toBe(futureValue);
  });
});
\`\`\`

This boundary test is where many defects show up. A pure migrator might return good data but forget to write it back. That means every page load repeats migration. In a single tab, that is wasteful. In multiple tabs, it can become a race if other keys depend on the migrated value.

## Browser Tests for Real App Boot

Use Playwright to seed localStorage before the app code runs. The safest pattern is to navigate to the origin once, set storage, then navigate to the page under test. If you need state present before any application script executes, use \`browserContext.addInitScript()\`.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('migrates v1 preferences on app boot', async ({ page }) => {
  await page.goto('/');
  await page.localStorage.setItem(
    'app.preferences',
    JSON.stringify({ theme: 'dark', dense: true })
  );

  await page.goto('/settings');

  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Compact' })).toBeChecked();

  const stored = await page.localStorage.getItem('app.preferences');
  expect(JSON.parse(stored ?? '{}')).toEqual({
    version: 2,
    appearance: { theme: 'dark', density: 'compact' },
  });
});
\`\`\`

For state that must exist before application JavaScript reads it, install it at context creation.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('boots with corrupt preferences without blanking the page', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.localStorage.setItem('app.preferences', '{ theme: dark');
  });

  const page = await context.newPage();
  await page.goto('/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('Display')).toBeVisible();

  await context.close();
});
\`\`\`

These tests are not substitutes for unit tests. They check the lifecycle: browser origin, app boot, storage access, render, write-back, and reload. Keep them focused and tag them so agents and CI can run them directly with \`npx playwright test --grep "@storage"\` if you use tags in titles.

## Idempotency and Multi-Tab Behavior

A migration is idempotent when running it twice produces the same stored state as running it once. This is non-negotiable for localStorage because users reload, open duplicate tabs, navigate back from bfcache, and keep stale pages alive during deploys.

| Scenario | Setup | Required behavior |
|---|---|---|
| Reload after migration | Seed v1, open app, reload | No second transform or value drift |
| Two tabs open | Both tabs see v1 | Final stored state is valid v2 |
| Older tab writes late | Tab A migrates, tab B writes old shape | App detects and remigrates or ignores old write |
| Rollback | New app wrote v2, old app loads | Old app fails soft or preserves unknown data |

You can test a simple two-tab case with Playwright pages in one context. This shares localStorage because both pages use the same browser context and origin.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('migration remains stable across two tabs', async ({ context }) => {
  const first = await context.newPage();
  await first.goto('/');
  await first.localStorage.setItem(
    'app.preferences',
    JSON.stringify({ theme: 'light', dense: true })
  );

  const second = await context.newPage();
  await first.goto('/settings');
  await second.goto('/settings');

  const firstStored = await first.localStorage.getItem('app.preferences');
  const secondStored = await second.localStorage.getItem('app.preferences');

  expect(JSON.parse(firstStored ?? '{}')).toEqual({
    version: 2,
    appearance: { theme: 'light', density: 'compact' },
  });
  expect(secondStored).toBe(firstStored);
});
\`\`\`

This does not simulate every race. localStorage writes are synchronous in a tab, but application scheduling still matters. If your app listens for the \`storage\` event, add tests that update state from another page and verify the visible UI.

## Quota and Write Failure Tests

Most localStorage migration tests assume writes succeed. That is not always true. Storage can be unavailable, full, disabled by policy, or blocked in unusual browsing modes. You do not need to support every browser quirk perfectly, but the app should not white-screen because preference write-back failed.

Make write failure injectable. The loader can catch \`setItem\` errors and return migrated in-memory state. That way the UI can render even if persistence is unavailable.

\`\`\`ts
export function loadPreferencesWithWriteGuard(storage: Storage): PreferencesV2 {
  let migrated: PreferencesV2;
  try {
    const raw = storage.getItem('app.preferences');
    migrated = raw === null ? defaultPreferences() : migratePreferences(JSON.parse(raw));
  } catch {
    // getItem itself can throw (disabled storage), and raw can be corrupt.
    migrated = defaultPreferences();
  }

  try {
    storage.setItem('app.preferences', JSON.stringify(migrated));
  } catch {
    // Persistence unavailable; render from memory anyway.
  }

  return migrated;
}
\`\`\`

Now test the failure policy.

\`\`\`ts
import { expect, it } from 'vitest';
import { loadPreferencesWithWriteGuard } from './preferencesStorage';

class ThrowingStorage implements Storage {
  get length() {
    return 1;
  }

  clear() {}
  key() {
    return null;
  }
  removeItem() {}
  getItem(key: string) {
    return key === 'app.preferences' ? '{"theme":"dark","dense":true}' : null;
  }
  setItem() {
    throw new Error('quota exceeded');
  }
}

it('renders migrated preferences even when persistence fails', () => {
  const loaded = loadPreferencesWithWriteGuard(new ThrowingStorage());

  expect(loaded).toEqual({
    version: 2,
    appearance: { theme: 'dark', density: 'compact' },
  });
});
\`\`\`

The product may also show a nonblocking warning, but be careful. Users do not need an alarming message because compact mode failed to persist. They do need a clear message if an offline draft cannot be saved.

## A Failure Story: The Dark Mode Migration That Broke Checkout

Symptom: after a frontend release, a small percentage of users saw a blank checkout page. Error monitoring showed \`Cannot read properties of undefined\` in the theme provider. The first theory was that the deployment served mismatched JavaScript chunks because only returning users were affected.

Wrong theory: the team purged CDN caches and redeployed the same build. New users were fine. Affected users stayed broken.

Actual cause: an older app stored \`{ "theme": "dark" }\` in \`app.preferences\`. The new app expected \`{ "version": 2, "appearance": { "theme": "dark" } }\`. The migration ran inside the settings route, not at app boot. Checkout loaded the provider before settings ever ran, read \`appearance.theme\`, and crashed.

Fix: the migration moved into the earliest preferences loader, corrupt and v1 shapes were covered by unit tests, and a Playwright test seeded v1 localStorage before visiting checkout. The app also stopped assuming optional nested objects existed. The deploy bug was small. The missing test path was the real issue.

## What People Get Wrong About Version Numbers

Version numbers do not migrate data by themselves. I have seen code that checks \`version < 3\`, writes \`version: 3\`, and leaves the old fields untouched. That is worse than no version number because future code sees the current version and trusts the shape.

A version bump should mean three things:

1. The migrator recognizes at least one older shape.
2. The migrator writes the complete current shape, not a partial patch.
3. A test proves that running the migrator twice leaves the same value.

Use a version field when the stored object has real structure. For single scalar values, a namespaced key may be clearer: \`ui.theme.v2\` instead of a JSON object with only \`version\` and \`theme\`. Do not store server truth in localStorage just because migration tests are easy. localStorage is client-controlled and should be treated as a hint unless the server verifies it.

## Give AI Coding Agents a Narrow Harness

AI agents are useful for updating storage migrations because the work is repetitive: add a fixture, update the migrator, run tests, inspect failure, repeat. They are also prone to hiding parse errors by broadening catch blocks too far. Give the agent a specific command and acceptance rule.

\`\`\`markdown
# Storage Migration Agent Task

Goal: update app.preferences from version 2 to version 3.

Rules:
- Add a fixture for every older stored shape.
- Keep corrupt JSON recovery behavior unchanged.
- Prove idempotency with a unit test.
- Add one Playwright boot test for the highest-risk route.
- Run npm run test:storage and npx playwright test --grep "@storage".
- Do not delete unknown future-version data unless the test states that policy.
\`\`\`

This is the right level of instruction. It names the key, the version, the tests, and the safety policy. It does not ask the agent to "make it reliable," which is too vague to review.

## Release Checklist for localStorage Changes

Before shipping a browser-state schema change, run this checklist.

1. Every stored key has an owner and a documented current shape.
2. The migrator handles missing, old, current, future, corrupt, and wrong-type values.
3. Unit tests cover pure migration rules without a browser.
4. Storage boundary tests prove write-back and parse-error recovery.
5. Playwright tests seed old state before app boot on at least one high-risk route.
6. Reload and two-tab cases are covered for important preferences or drafts.
7. Write failures do not blank the UI.
8. Rollback behavior is described if the old app may see new state.
9. Monitoring can distinguish storage migration errors from generic render errors.
10. Support has a safe way to tell users how to clear state only when needed.

Local storage migrations feel minor because they do not require a database deploy. That is exactly why they slip through review. The user's browser is the production database for that slice of state, and it keeps old rows longer than your release branch does.

## Observability and Support Recovery

A localStorage migration failure should be visible without exposing the user's stored values. Log the key name, old detected version, target version, error class, route, and whether the app recovered with defaults. Do not log the raw value. Stored values often contain emails, search text, draft content, internal IDs, or feature state that your privacy policy does not allow in telemetry.

| Telemetry field | Safe example | Avoid |
|---|---|---|
| Key name | \`app.preferences\` | Full serialized value |
| Detected version | \`1\`, \`missing\`, \`corrupt\` | Raw JSON blob |
| Recovery action | \`defaulted\`, \`quarantined\`, \`ignored\` | User's draft text |
| Route | \`/checkout\` | Full URL with private query |
| Error class | \`SyntaxError\` | Stack with customer data |

Support recovery should also be precise. "Clear your browser storage" is a blunt instruction that can erase useful state for the whole origin. If only \`app.preferences\` is broken, support should have a safe one-key reset path, ideally exposed through an internal troubleshooting panel or a documented console snippet for trained staff.

\`\`\`ts
export function resetPreferences(storage: Storage = window.localStorage): void {
  storage.removeItem('app.preferences');
}

export function describePreferencesState(storage: Storage = window.localStorage): string {
  const raw = storage.getItem('app.preferences');
  if (raw === null) {
    return 'missing';
  }

  try {
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'number' ? \`version:\${parsed.version}\` : 'unversioned';
  } catch {
    return 'corrupt';
  }
}
\`\`\`

That diagnostic function gives support a state label without leaking content. It also gives QA a simple assertion target. After a corrupt-state Playwright test, you can verify that the app reports \`corrupt\` before recovery or \`version:2\` after recovery, depending on your product's timing.

One more practice helps during staged rollouts: count migrations by source version. If almost every user migrates from v1 to v2 on day one, you can retire some compatibility code later. If a meaningful tail continues to migrate from an older shape, keep the test fixtures. Browser state ages differently from server rows. Some users return after months, and their first session is still production.

## Frequently Asked Questions

### What should localStorage migration testing cover first?

Cover the states users are most likely to have: missing key, last released schema, current schema, corrupt JSON, and values with wrong types. Then add high-impact edge cases such as future versions, quota failures, and multi-tab behavior. Start with pure unit tests for the migrator, then add one Playwright boot test for a route that reads the state early. That mix gives fast feedback and real browser coverage.

### Should localStorage migrations run on app boot or only when a page needs the value?

Run migrations when the value is first loaded by shared app code, which is often app boot for preferences, auth hints, layout, and feature state. Page-level migrations are risky when other routes read the same key earlier. Lazy migration can work for isolated features, but the loader still needs to tolerate old and corrupt shapes. The test should visit a high-risk route directly, not only the settings page.

### How should corrupt localStorage values be handled?

For low-risk preferences, reset to defaults and write the clean value back if storage is available. For user-generated drafts or offline work, do not casually delete corrupt data. Quarantine it under a recovery key or send it to a repair flow if the product supports that. The test should reflect the business value of the data. A broken theme preference and a half-written customer report deserve different recovery policies.

### Can Playwright test localStorage before the app starts?

Yes. For many cases, navigate to the origin, set localStorage, then navigate to the route under test. When state must exist before any application script runs, create a browser context and use \`context.addInitScript()\` to write localStorage before page scripts execute. Playwright 1.61 also provides \`page.localStorage\`, which makes storage setup and assertions clearer than older \`page.evaluate\` helpers in migration specs and reviews.
`,
};
