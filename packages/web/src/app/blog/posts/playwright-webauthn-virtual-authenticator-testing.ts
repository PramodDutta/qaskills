import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test WebAuthn with a Virtual Authenticator in Playwright',
  description:
    'Test WebAuthn with a virtual authenticator in Playwright to automate passkey registration, sign-in, user verification, and negative browser flows.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test WebAuthn with a Virtual Authenticator in Playwright

A signup flow ships passkey registration behind a feature flag, and the ticket lands on your desk: automate it end to end, no physical security key, no mocking the browser's \`navigator.credentials\` API with hand-rolled JavaScript. The team tried stubbing \`credentials.create()\` earlier and it caught nothing real, since the actual bug was in how the RP ID was computed on a staging subdomain. What you need is a fake authenticator that Chromium itself treats as real hardware, so the same code path that runs in production runs in your test.

That's exactly what the WebAuthn domain in Chrome DevTools Protocol (CDP) gives you, and Playwright exposes CDP sessions directly. This piece walks through wiring up a virtual authenticator, registering and logging in through the real UI, and the caveats that trip people up: secure context requirements, RP ID mismatches, and the Chromium-only ceiling on this approach.

## Why WebAuthn testing needs CDP, not the Web API directly

Playwright doesn't ship a first-class \`page.virtualAuthenticator()\` API. What it does give you is \`context.newCDPSession(page)\`, which opens a raw CDP channel to the browser tab. WebAuthn support lives in CDP's \`WebAuthn\` domain, and that domain only exists in Chromium-based browsers (Chrome, Edge, and Playwright's bundled Chromium). Firefox and WebKit have no equivalent CDP surface, so this entire approach is Chromium-only. If your test matrix runs cross-browser, you'll need a separate strategy (or an explicit skip) for Firefox and WebKit projects.

The CDP \`WebAuthn\` domain simulates an authenticator at the platform level. Once you enable it and attach a virtual authenticator, every \`navigator.credentials.create()\` and \`navigator.credentials.get()\` call in the page gets routed to your fake device instead of prompting for a real one. The browser's own WebAuthn implementation runs unmodified, so you're testing real credential creation, real signature verification, and real RP ID checks, just against a device that never leaves your CI runner.

## Enabling the WebAuthn domain and adding a virtual authenticator

The setup is three CDP calls: enable the domain, add an authenticator with a specific protocol and transport, then let the page proceed as if a real key were plugged in.

\`\`\`typescript
import { test, expect, type CDPSession } from '@playwright/test';

test('register a passkey with a virtual authenticator', async ({ page, context }) => {
  const client: CDPSession = await context.newCDPSession(page);

  await client.send('WebAuthn.enable');

  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'usb',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await page.goto('https://staging.example.com/signup');
  await page.getByRole('button', { name: 'Create a passkey' }).click();

  await expect(page.getByText('Passkey registered')).toBeVisible();

  await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
});
\`\`\`

A few of those options carry real weight and are worth understanding rather than copying blindly:

- \`protocol: 'ctap2'\` selects the modern CTAP2 protocol, which is what real passkeys and platform authenticators speak. There's also \`'u2f'\` for testing legacy second-factor flows, but passkey registration specifically needs CTAP2 because resident keys (discoverable credentials) are a CTAP2 feature.
- \`transport: 'usb'\` tells the browser to present this as a USB-connected security key rather than \`'internal'\` (a platform authenticator like Touch ID or Windows Hello), \`'ble'\`, or \`'nfc'\`. If your UI branches on transport type (some apps show different copy for "use a security key" versus "use your device"), pick the transport that matches the path you're testing.
- \`hasResidentKey: true\` enables discoverable credentials, meaning the authenticator stores the credential itself and can be used for usernameless login later. If your passkey flow lets a user log in without typing a username first, you need this set to \`true\`.
- \`hasUserVerification\` and \`isUserVerified\` are separate knobs and it's easy to conflate them. \`hasUserVerification\` declares that the authenticator is capable of verifying the user (like a fingerprint sensor exists). \`isUserVerified\` is the actual outcome of that check for this session. Set both to \`true\` for a smooth, always-succeeding passkey flow. If you want to simulate a failed biometric check, flip \`isUserVerified\` to \`false\` and assert your app handles that gracefully.
- \`automaticPresenceSimulation: true\` is what removes the "touch your security key" prompt from the loop entirely. Without it, the virtual authenticator still waits for an explicit presence signal, which means your test would hang waiting for a tap that never comes. Leave this \`true\` for automated flows unless you're specifically testing a timeout path.

Here's what those authenticator options mean in practice:

| Option | Type | Effect when true | Typical test scenario |
|---|---|---|---|
| \`hasResidentKey\` | boolean | Credential stored on device, supports usernameless login | Passkey autofill / discoverable login |
| \`hasUserVerification\` | boolean | Authenticator declares biometric/PIN capability | Any passkey flow requiring UV |
| \`isUserVerified\` | boolean | This session's verification attempt succeeds | Happy path (\`true\`) vs. biometric failure (\`false\`) |
| \`automaticPresenceSimulation\` | boolean | Skips the "touch your key" wait | Almost always \`true\` in CI |

## Registration and login as two independent test cases

Registration and authentication exercise different parts of the WebAuthn ceremony, and they deserve separate tests rather than one long flow, because a login-only regression (say, a broken assertion signature check) shouldn't be masked by a passing registration step earlier in the same test.

For registration, the virtual authenticator generates a new key pair and returns the public key to your server, which your backend then stores against the user. For login, the authenticator retrieves the stored private key for that RP ID and signs a challenge. Playwright doesn't need to know the difference; it just drives the UI buttons and lets Chromium's real WebAuthn stack do the credential math underneath.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('passkey login', () => {
  let authenticatorId: string;

  test.beforeEach(async ({ page, context }) => {
    const client = await context.newCDPSession(page);
    await client.send('WebAuthn.enable');
    const result = await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
    authenticatorId = result.authenticatorId;

    // register once so a credential exists to log in with
    await page.goto('https://staging.example.com/signup');
    await page.getByLabel('Email').fill('sdet+webauthn@example.com');
    await page.getByRole('button', { name: 'Create a passkey' }).click();
    await expect(page.getByText('Passkey registered')).toBeVisible();
    await page.getByRole('button', { name: 'Log out' }).click();
  });

  test('logs in with the stored passkey', async ({ page }) => {
    await page.goto('https://staging.example.com/login');
    await page.getByRole('button', { name: 'Sign in with a passkey' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('sdet+webauthn@example.com')).toBeVisible();
  });
});
\`\`\`

Because \`hasResidentKey\` is \`true\`, the credential created in \`beforeEach\` persists on the virtual authenticator for the life of that CDP session, so the login test can reuse it without a separate registration ceremony inline. If you tear the authenticator down between tests (or run each test in a fresh browser context, which Playwright does by default per test), you'll need to re-register in each test that needs a login step, since there's no credential to retrieve otherwise. Removing the authenticator explicitly with \`WebAuthn.removeVirtualAuthenticator\` at the end of a test is good hygiene even though a fresh context would discard it anyway; it makes teardown ordering explicit if you ever add more than one authenticator in a single test.

## Secure context and RP ID: the two failure modes that aren't authenticator bugs

Almost every "WebAuthn just doesn't work in my test" report traces back to one of two things that have nothing to do with the virtual authenticator setup.

**Secure context.** WebAuthn's \`navigator.credentials\` API is only available in a secure context: HTTPS, or \`localhost\` (which the platform treats as a secure-context exception). If your staging environment is served over plain HTTP on a non-localhost address, \`navigator.credentials\` will be \`undefined\` in the page and registration will fail before it ever reaches your authenticator, with no CDP error to point at because the failure happened in page JavaScript, not in Chromium's WebAuthn stack. Check this first when a WebAuthn test fails in CI but passes locally against \`localhost\`: the CI environment is very often plain HTTP or a self-signed cert the browser doesn't trust.

**RP ID.** The Relying Party ID is the domain the credential gets scoped to, and the browser enforces that it either equals the current origin's domain or is a registrable parent domain of it. A credential registered against RP ID \`example.com\` works fine on \`app.example.com\`, but a credential registered while testing against \`localhost\` will not work if your app later computes the RP ID as \`staging.example.com\`, and vice versa. This is precisely the kind of bug a hand-rolled JavaScript mock would never catch, since a mock doesn't enforce origin/RP ID matching. It's also why running your WebAuthn tests against the same URL structure as production (not a stand-in \`localhost\` origin) matters more here than in most other test suites. For deeper context on how origin and domain scoping interacts with session and credential state more broadly, the storage-state patterns in [Playwright authentication testing with storage state](/blog/playwright-authentication-testing-storage-state-2026) are worth a look, since the same origin-matching rules govern cookie and storage-state reuse.

| Symptom | Likely cause | Where to check |
|---|---|---|
| \`navigator.credentials\` is undefined | Not a secure context (HTTP, non-localhost) | Network tab protocol, or \`window.isSecureContext\` in a \`page.evaluate\` |
| \`NotAllowedError\` on registration | RP ID doesn't match current origin's domain | Server-side RP ID config vs. \`page.url()\` |
| Credential created but login can't find it | Different RP ID used at registration vs. login | Compare RP ID passed to both ceremonies |
| Test hangs indefinitely | \`automaticPresenceSimulation\` left \`false\` | Authenticator options passed to \`addVirtualAuthenticator\` |
| Works locally, fails in CI | CI serves over HTTP or self-signed cert untrusted by Chromium | CI environment TLS config |

## Verifying credential state, not just UI text

Asserting on a success toast is a start, but it doesn't prove a credential was actually created on the authenticator. CDP's \`WebAuthn\` domain lets you query the authenticator directly, which gives you a stronger oracle than UI text alone.

\`\`\`typescript
test('registration creates exactly one resident credential', async ({ page, context }) => {
  const client = await context.newCDPSession(page);
  await client.send('WebAuthn.enable');
  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'usb',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await page.goto('https://staging.example.com/signup');
  await page.getByRole('button', { name: 'Create a passkey' }).click();
  await expect(page.getByText('Passkey registered')).toBeVisible();

  const { credentials } = await client.send('WebAuthn.getCredentials', { authenticatorId });
  expect(credentials).toHaveLength(1);
  expect(credentials[0].isResidentCredential).toBe(true);
});
\`\`\`

This closes the gap a pure UI assertion leaves open: a "Passkey registered" toast that fires on a client-side timeout rather than a real server acknowledgment would pass a text assertion but fail this credential-count check, since no actual credential exists on the authenticator in that case.

## Scope this only covers what CDP actually supports

This whole approach rides on Chromium's CDP \`WebAuthn\` domain, which means it's out of reach for Firefox and WebKit projects in your Playwright config; there's no equivalent virtual authenticator API in either engine as of this writing, so cross-browser WebAuthn coverage isn't achievable through Playwright alone today. It also doesn't validate your actual production authenticator integrations (a real YubiKey's USB timing quirks, an actual Touch ID prompt's UI chrome); it validates that your application code correctly drives the WebAuthn ceremony and handles the responses, which is the part that's actually under your control and worth automating. If your app also gates access behind other authorization checks after login, pairing this with the broader patterns in [authentication and authorization testing](/blog/authentication-authorization-testing-guide) rounds out coverage past the passkey ceremony itself, into what the user is and isn't allowed to do once they're in.


## Inspecting Credentials with WebAuthn.getCredentials

Once a virtual authenticator is wired up through the CDP session, you get a debugging window that hardware keys never give you. Enable the domain and add the authenticator first:

\`\`\`ts
const client = await context.newCDPSession(page);
await client.send('WebAuthn.enable');
const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2',
    transport: 'internal',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
  },
});
\`\`\`

After a registration ceremony runs, pull the stored credential straight off the authenticator:

\`\`\`ts
const { credentials } = await client.send('WebAuthn.getCredentials', { authenticatorId });
\`\`\`

Each entry exposes \`credentialId\`, \`rpId\`, \`privateKey\`, \`signCount\`, and \`userHandle\`. Assert on \`signCount\` incrementing across successive assertions to confirm your app is actually validating replay protection, not just accepting whatever the client sends. Assert on \`rpId\` to catch relying-party ID mismatches that would otherwise fail silently in production but pass a loosely configured test. This is also the fastest way to confirm resident (discoverable) credentials landed correctly when your flow depends on usernameless login.

## Limits of Virtual vs Hardware Authenticator Testing

A virtual authenticator proves your WebAuthn integration is wired correctly: correct RP ID, correct challenge handling, correct attestation format negotiation, correct signature verification server-side. It does not prove your app works with a real security key or platform authenticator.

Virtual authenticators skip the parts that break in the field: USB/NFC/BLE transport negotiation, actual biometric prompts, PIN retry lockout behavior, firmware-specific quirks across YubiKey, Touch ID, Windows Hello, and platform-specific attestation formats (packed, fido-u2f, android-safetynet). CTAP2 protocol edge cases and timeout behavior under real transport latency are invisible to CDP simulation.

Treat virtual-authenticator suites as your regression gate for integration logic, and keep a small manual or hardware-in-the-loop pass, ideally with at least one real security key and one platform authenticator, before shipping changes to registration or assertion flows. Automate the logic, verify the hardware separately.

## Frequently Asked Questions

### Does the virtual authenticator work in Playwright's Firefox or WebKit projects?

No. CDP's \`WebAuthn\` domain is Chromium-specific, so \`context.newCDPSession\` and the \`WebAuthn.addVirtualAuthenticator\` calls only function against Chromium-based browser contexts. If your config runs the same spec across all three engines, either tag the WebAuthn tests to run on Chromium only or write a separate skip condition, since there is no equivalent CDP surface in Firefox or WebKit to fall back to.

### Why does my registration silently fail with no visible error in the UI?

Check whether the page is running in a secure context before anything else. \`navigator.credentials\` simply won't exist on the \`navigator\` object if the origin is plain HTTP and isn't \`localhost\`, so the button click that's supposed to trigger \`credentials.create()\` throws inside your app's own error handling, which may swallow it or show a generic message unrelated to WebAuthn. Confirm with \`page.evaluate(() => window.isSecureContext)\` before debugging further.

### Can I simulate a user failing biometric verification, not just succeeding?

Yes. Set \`isUserVerified: false\` on the virtual authenticator while keeping \`hasUserVerification: true\`. This tells Chromium's WebAuthn stack that the authenticator attempted verification and it did not succeed, which lets you exercise your app's failure-state handling (retry prompts, fallback to password, error messaging) without needing a real failed fingerprint scan.

### Do I need a new virtual authenticator for every test, or can I reuse one across a suite?

Playwright's default per-test browser context means each test starts with a clean environment, so a fresh \`context.newCDPSession\` and \`WebAuthn.addVirtualAuthenticator\` call per test is the normal pattern, not overhead you're adding unnecessarily. If you deliberately share a browser context across multiple tests (uncommon in Playwright's default setup), the authenticator and its stored credentials persist across those tests, which can be either useful or a source of state leakage depending on what you're testing.

### How is this different from mocking \`navigator.credentials.create()\` with page-injected JavaScript?

A hand-rolled mock replaces the browser's real WebAuthn implementation with fake JavaScript that returns whatever shape of object you tell it to, so it never exercises the actual origin checks, RP ID validation, or credential signature logic the browser performs. The CDP virtual authenticator sits underneath the real WebAuthn implementation instead of replacing it, so RP ID mismatches, secure-context failures, and malformed challenge responses surface exactly as they would against a real hardware key, which is what makes this approach catch bugs that a JavaScript mock structurally cannot.
`,
};
