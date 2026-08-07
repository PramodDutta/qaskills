import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Resend Next.js Build Testing',
  description:
    'Resend Next.js build testing verifies lazy client creation, missing API keys, import safety, singleton reuse, runtime sends, and provider error handling.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Resend Next.js build testing',
  keywords: [
    'Resend Next.js build testing',
    'lazy Resend initialization',
    'Next.js build environment variables',
    'email client import safety',
    'missing RESEND_API_KEY test',
    'Resend singleton reuse',
    'runtime email send test',
    'Vercel build email failure',
  ],
  relatedSlugs: [
    'testing-clerk-user-created-webhook-idempotency',
    'testing-missed-clerk-webhook-user-recovery',
    'testing-hmac-unsubscribe-token-tampering-expiration',
    'testing-batch-email-partial-failures-promise-allsettled',
  ],
  sources: [
    'https://nextjs.org/docs/15/app/guides/environment-variables',
    'https://resend.com/docs/api-reference/introduction',
    'https://resend.com/docs/api-reference/emails/send-email',
  ],
  content: `**Resend Next.js build testing** imports email modules without a production API key and proves that no Resend client is constructed until code reads a client property. Runtime cases then check the configured key, the current placeholder fallback, singleton reuse, sender-level missing-key guards, successful sends, and resolved provider failures.

The examples use the QASkills email client and send helpers. Pair them with the [CI/CD testing guide](/blog/cicd-testing-pipeline-github-actions), find reusable QA automation in [QASkills](/skills), and use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) for a final email link flow.

Build safety and send safety are different contracts. A module can import safely but still fail when a route sends mail. Tests should name the phase they cover, isolate module state, and avoid treating a successful compile as proof of provider access.

## Why Use Lazy Resend Initialization?

**Lazy Resend initialization** delays \`new Resend(apiKey)\` until \`getResendClient()\` is called. The QASkills module keeps a private \`_resend\` value, creates the client on first access, and returns the same object on later access.

The module also exports a \`resend\` wrapper with getters for \`emails\`, \`domains\`, and \`apiKeys\`. Importing that wrapper does not read a getter. A caller creates the real client only when it accesses one of those properties or calls \`getResendClient()\` directly.

This pattern helps a Next.js build import route and template modules without requiring a live provider client during module evaluation. It does not prove every import path is safe. A top-level read such as \`const emails = resend.emails\` would trigger client creation as soon as that caller loads.

| Operation | Should construct a client? | Current expected result |
| --- | --- | --- |
| Import email client module | No | Exports become available |
| Import email send module | No | Sender functions become available |
| Read \`FROM_EMAIL\` | No | Constant string returned |
| Call \`getResendClient()\` | Yes | New client on first call |
| Read \`resend.emails\` | Yes | Getter returns client emails API |
| Call \`getResendClient()\` again | No new client | Same object returned |

Resend describes API-key authentication in its [API introduction](https://resend.com/docs/api-reference/introduction). Keep production key checks at runtime and deployment boundaries. A test key or mocked constructor is enough for import and singleton tests.

Resend Next.js build testing should spy on the constructor before importing the client module. If the module is imported first, the runner cache can hide eager work or retain a client from another case.

Keep the constructor mock close to the module test. A global mock can make unrelated route tests pass even when they read the client too early. The import case should fail as soon as any top-level path calls the mocked constructor.

Read each public getter once after the no-access assertion. This proves the getter is the intended activation point and that each property comes from the SDK client. Avoid reading all getters before checking the first constructor call, since that hides which access caused it.

Add a plain Node import smoke check outside the test runner when possible. Runner transforms and mocks can change module order. A small process with no key should import the compiled email modules, print a safe marker, and exit without a provider call.

## How Do Next.js Build Environment Variables Differ?

**Next.js build environment variables** can be loaded from project files or the process environment, while variables prefixed with \`NEXT_PUBLIC_\` may be bundled for browser use. A server-only provider key should remain \`RESEND_API_KEY\` and must never use the public prefix.

The versioned Next.js guide explains [App Router environment variable loading](https://nextjs.org/docs/15/app/guides/environment-variables), including file order and browser bundling. Tests should not copy a real secret into a checked-in \`.env\` fixture. Stub the process variable inside the test and restore it afterward.

A production build often runs in a process that differs from the deployed server process. The QASkills placeholder supports client construction when no key exists, but normal send helpers check \`process.env.RESEND_API_KEY\` before reading \`resend.emails\`. That sender guard is separate from the client fallback.

Use a phase matrix rather than one broad environment case:

| Phase | API key state | Test goal |
| --- | --- | --- |
| Static module import | Missing | No constructor call |
| Build smoke command | Missing test key | Build completes without provider network work |
| Runtime sender | Missing | Returns configured failure and skips SDK |
| Runtime sender | Synthetic key | Builds payload and calls mocked SDK |
| Deployment smoke | Secret name present | Server route can reach controlled send path |

Do not assert a key value in deployment logs. Check only that the expected variable is configured through the platform's secret controls. A masked or boolean presence check avoids turning CI output into a credential leak.

The [serverless testing guide](/blog/serverless-testing-complete-guide) can help separate build, cold start, and request work. Email client tests should follow those phases rather than assuming every function process shares one module cache.

Run the build with a clean process environment plus only the variables the web app truly needs. This catches a local shell that hides missing configuration. Use test or preview values for required services and never borrow a live email key for a compile check.

Test the variable name, not just any string passed to the constructor. A misspelled key can make the client use its placeholder while deployment checks report a different variable present. Keep one controlled runtime case that sets only \`RESEND_API_KEY\`.

Build logs should show that email send functions did not run. A mocked SDK call count of zero is stronger than the absence of an error message. If a route generates static data and sends mail, the call spy will reveal that side effect.

## How Do You Prove Email Client Import Safety?

**Email client import safety** means importing the client and send modules performs no Resend construction and no network request. It also means constants and function references can be read without touching a lazy getter. Test those facts in a fresh module graph.

Mock the \`resend\` package constructor, reset modules, clear the API key, and import the local client. Assert zero constructor calls. Then read \`FROM_EMAIL\` and the \`resend\` wrapper itself, and assert the count stays zero.

\`\`\`typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const constructorSpy = vi.fn(() => ({
  emails: { send: vi.fn() },
  domains: {},
  apiKeys: {},
}));

vi.mock('resend', () => ({
  Resend: constructorSpy,
}));

describe('email client imports', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    constructorSpy.mockClear();
  });

  it('does not construct Resend during module import', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    const client = await import('@/lib/email/client');
    const senders = await import('@/lib/email/send');

    expect(client.FROM_EMAIL).toContain('qaskills.sh');
    expect(typeof senders.sendWelcomeEmail).toBe('function');
    expect(constructorSpy).not.toHaveBeenCalled();
  });
});
\`\`\`

Import templates as part of a second case. React email components should remain pure module definitions until a sender renders them. If an email template starts reading the provider client at top level, the wider import smoke test catches it.

Also import the route modules that depend on send helpers. Keep the test focused on module evaluation, not route execution. A route import that opens a provider client or database connection can create build failures even when the client module itself is lazy.

Resend Next.js build testing should run this suite with module isolation enabled. Parallel files can otherwise import the email client before the constructor mock is installed. Keep all constructor-count cases in one serial group if the runner shares module state.

Include one negative control in a test-only module that reads \`resend.emails\` at top level. Its import should call the constructor, which proves the spy can detect eager access. Remove or keep that fixture outside production source after the test is clear.

Check network stubs as well as constructor calls. A future SDK could delay setup until its first API method, so zero construction alone may stop being the full signal. Import safety means no DNS, fetch, or provider request during module evaluation.

Use dynamic imports with a unique query or module reset based on runner support. Static imports are evaluated before test hooks, which makes a constructor spy too late. The test should make its module order obvious to the next maintainer.

## Write a Missing RESEND_API_KEY Test

A **missing RESEND_API_KEY test** needs two distinct expectations. Calling \`getResendClient()\` directly creates a client with the current \`re_placeholder\` fallback, while calling a QASkills send helper returns \`{ success: false, error: 'Email service not configured' }\` before it reads the lazy client.

Test both behaviors so later refactoring cannot blur them. The placeholder supports import or direct construction paths, but it is not a valid send credential. The sender guard is what keeps a missing key from reaching \`resend.emails.send()\`.

\`\`\`typescript
it('uses the placeholder only for direct client access', async () => {
  vi.stubEnv('RESEND_API_KEY', '');
  const { getResendClient } = await import('@/lib/email/client');

  getResendClient();

  expect(constructorSpy).toHaveBeenCalledOnce();
  expect(constructorSpy).toHaveBeenCalledWith('re_placeholder');
});

it('skips the SDK when a sender has no configured key', async () => {
  vi.stubEnv('RESEND_API_KEY', '');
  const { sendWelcomeEmail } = await import('@/lib/email/send');

  await expect(
    sendWelcomeEmail({
      email: 'user@example.test',
      username: 'user',
      userId: 'test-user-id',
    }),
  ).resolves.toEqual({
    success: false,
    error: 'Email service not configured',
  });
  expect(constructorSpy).not.toHaveBeenCalled();
});
\`\`\`

Do not call the placeholder a key replacement. Once \`_resend\` is created in a process, the singleton keeps that client even if the environment variable changes later. Build and runtime usually use different processes, but one long-lived test process can expose this cache behavior.

Test whitespace only if the application defines it. A value containing spaces is truthy and currently reaches the SDK constructor. If that should count as missing, add validation before changing the test expectation.

Keep warning-log checks narrow. Assert one warning class or call without snapshotting whole output. Environment paths and rendered email data should not enter a simple missing-key assertion.

Call each sender under the missing-key state. Welcome, skill alert, and weekly digest should all return the configured failure before template or SDK work. This catches one sender that forgets the shared guard while the others remain safe.

Assert there is no unsubscribe token failure in this path. The current senders check the email key before they build the unsubscribe URL, so a missing unsubscribe secret should not matter when email is already disabled. Keep the token module uncalled in that case.

Resend Next.js build testing should run the missing-key cases in both development and production node modes if code branches on that value later. The present sender behavior should stay the same. Avoid changing global mode inside a shared process without full cleanup.

## Verify Resend Singleton Reuse

**Resend singleton reuse** means every direct client access after the first returns the same object and does not call the constructor again. This reduces repeated setup inside one server process and gives the exported property getters one shared SDK instance.

Call \`getResendClient()\` twice after setting a synthetic key. Assert reference identity and one constructor call. Then read \`resend.emails\`, \`resend.domains\`, and \`resend.apiKeys\`; each should come from that same client without added construction.

Module reset changes the contract. After \`vi.resetModules()\`, importing the module creates a new private singleton slot, so the next access should construct another client. This is expected in a test and similar to a new server process.

\`\`\`typescript
it('reuses one SDK client inside a module instance', async () => {
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  const module = await import('@/lib/email/client');

  const first = module.getResendClient();
  const second = module.getResendClient();
  const emails = module.resend.emails;

  expect(second).toBe(first);
  expect(emails).toBe(first.emails);
  expect(constructorSpy).toHaveBeenCalledTimes(1);
  expect(constructorSpy).toHaveBeenCalledWith('re_test_key');
});
\`\`\`

Add a key-change case in one module instance. Set key A, create the client, switch the environment to key B, and call again. The same client remains, so do not claim the helper reads a new key on every request.

That cache behavior is why tests must reset modules between key scenarios. Without reset, a missing-key test may receive a client created by a prior configured case. Test order should never decide which credential a mocked client holds.

Resend Next.js build testing should avoid inspecting private \`_resend\` through source tricks. Public constructor count and object identity prove the same contract while allowing internal refactoring.

Start several first-access calls in the same tick. JavaScript module code runs the simple null check synchronously, so each call should receive one object and the constructor count should remain one. This case guards a future async factory that could create a race.

Do not share the real singleton between test files. One file may create it with a placeholder before another expects a synthetic key. Isolate the module graph or expose a test setup that loads each case in a fresh process.

Check property identity only for stable SDK fields. The wrapper returns \`getResendClient().emails\` on each read, so the same mocked field should return. Avoid assuming undocumented inner SDK objects stay referentially equal across future provider versions.

## Add a Runtime Email Send Test

A **runtime email send test** supplies a synthetic key, invokes one sender, and inspects the SDK payload plus returned result. Mock the provider SDK so the test sends no real mail. Keep a separate deployment smoke check for actual provider access when needed.

The Resend [send email reference](https://resend.com/docs/api-reference/emails/send-email) lists the request and response fields. QASkills sends from its fixed sender string, uses the user's email, builds a subject, and passes a React email element. Assert stable fields and avoid snapshots of the whole React tree.

Test three SDK outcomes: successful data, resolved provider error, and thrown exception. The current sender returns \`{ success: true, data }\` for the first and \`{ success: false, error }\` for both failure paths. It does not rethrow those errors.

\`\`\`typescript
it('returns provider data from a configured welcome send', async () => {
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  const sdkSend = vi.fn().mockResolvedValue({
    data: { id: 'email_123' },
    error: null,
  });
  constructorSpy.mockReturnValue({
    emails: { send: sdkSend },
    domains: {},
    apiKeys: {},
  });

  const { sendWelcomeEmail } = await import('@/lib/email/send');
  const result = await sendWelcomeEmail({
    email: 'user@example.test',
    username: 'user',
    userId: 'test-user-id',
  });

  expect(result).toEqual({ success: true, data: { id: 'email_123' } });
  expect(sdkSend).toHaveBeenCalledWith(
    expect.objectContaining({
      from: 'QASkills <noreply@qaskills.sh>',
      to: 'user@example.test',
      subject: expect.stringContaining('Welcome'),
    }),
  );
});
\`\`\`

The user ID causes unsubscribe token creation before the SDK call. Set a test unsubscribe secret when this path needs one, or omit the optional ID when the test only owns basic SDK mapping. Keep token tests in the dedicated [HMAC unsubscribe tutorial](/blog/testing-hmac-unsubscribe-token-tampering-expiration).

Add one case for each public sender because their subjects, templates, and unsubscribe types differ. Share the provider outcome helper, but assert sender-specific fields in each test. This balances reuse with useful failure messages.

Use two recipients in separate calls and inspect both SDK payloads. The second call must not reuse the first address, subject data, or unsubscribe link. Singleton client reuse is correct, but message data must remain local to each sender call.

Test a slow provider promise without a narrow clock limit. The sender should settle when that promise settles and return its mapped result. Cancellation and request deadlines are not implemented by this helper, so do not claim a timeout that the code does not have.

Keep rendered template checks small. Assert the component receives the username, skill fields, or digest list through a template unit test. The runtime sender test should own provider payload shape and return handling, not every HTML node.

## Diagnose Vercel Build Email Failure

A **Vercel build email failure** can come from eager module work, missing environment setup, client-only imports, template compilation, or code that executes a sender during static work. Diagnose the phase before changing the lazy client.

Start with the import-safety unit test, then run the same production build command used by the deployment. A successful build proves compilation and module evaluation for discovered routes. It does not prove a later request has the right key or that the provider accepts mail.

Use a short decision table:

| Failure point | Evidence | Next check |
| --- | --- | --- |
| Client constructor during import | Constructor spy called before getter access | Find top-level property reads |
| Missing variable during sender call | Configured failure result | Check server secret name and target |
| Template compile error | Build stack names email component | Import and render template in isolation |
| Provider response error | Runtime result has \`success: false\` | Inspect safe provider code and payload |
| Stale singleton in test | Wrong constructor key after env change | Reset modules between cases |

Do not fix a build failure by adding a real provider key to every local or preview process. First prove whether the build needs client construction at all. A lazy import path should compile with no live email call.

Keep server-only email modules out of Client Components. If a browser bundle imports the Resend SDK or secret-reading code, move the send action behind a server route or action. The [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) can help test that component boundary.

Resend Next.js build testing should capture the failing route, stack frame, phase, and commit. Avoid printing the environment object while collecting that evidence. A masked variable-presence list is enough for configuration review.

Reproduce the build from a clean checkout and the lockfile used by deployment. A warm local cache can hide a missing generated file or module edge. Record the Node and package-manager versions with the failed command.

If the failure appears only during route collection, import that route in the focused smoke suite. Then remove imports one boundary at a time until the eager read is clear. Do not add broad try-catch code around module imports, because it can hide a real build defect.

Check preview and production targets separately through safe variable presence. A secret can exist for one target and not another. The test report should name the target and phase without exposing the value or provider request headers.

## Run the Build-Safety Procedure

Use the same procedure after changes to email clients, templates, routes, Next.js config, or deployment variables. Run import and sender tests before the full build so failures stay easy to locate.

1. Reset modules, clear the test API key, mock the Resend constructor, and import client plus send modules.
2. Assert zero constructor and network calls, then read constants and function references safely.
3. Call \`getResendClient()\` with no key and assert the current placeholder constructor value.
4. Reset modules, set a synthetic key, and prove one constructor plus singleton identity across getters.
5. Invoke each sender with success, resolved provider error, thrown error, and missing-key outcomes.
6. Import email templates and route modules, then run the production Next.js build without a live send.
7. Start a runtime test server with mocked provider access and verify one controlled send path.
8. Restore modules, environment stubs, timers, and mocks before publishing sanitized evidence.

Keep the full build in the post-change flow even when unit tests pass. Route discovery and bundling can expose imports that a direct test never touches. The [CI pipeline guide](/blog/cicd-testing-pipeline-github-actions) can make that build a required check.

Resend Next.js build testing should also run after dependency upgrades. A new SDK version may move constructor validation or change response shapes. Pin the lockfile, inspect release notes, and rerun import plus runtime cases before deployment.

Retain the build command, exit code, and first useful stack frame in the test artifact. Omit full environment dumps and rendered email data. This gives reviewers enough proof to compare a later build without leaking keys or user content.

After a failed build test, run the import unit case before another full build. That short loop shows whether the fix removed eager client work. Once it passes, rerun the production command to confirm route collection and bundling.

## Apply Resend Next.js Build Testing

Resend Next.js build testing is complete when imports create no client, direct access follows the documented placeholder behavior, configured runtime sends use one client, and sender failures resolve with accurate application results. The suite must keep build proof separate from provider and inbox proof.

Add these checks to the post-change test flow, then use the [skills directory](/skills) for related automation. Pair the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) with the [batch email failure tutorial](/blog/testing-batch-email-partial-failures-promise-allsettled) to cover both runtime links and mixed delivery results.

## Frequently Asked Questions

### Does importing the QASkills email client construct Resend?

No under the current module design. Importing creates the wrapper and exports functions and constants, but the private client remains null. Calling \`getResendClient()\` or reading a property such as \`resend.emails\` triggers construction. A constructor mock should prove this in a fresh module graph.

### What happens when RESEND_API_KEY is missing?

Direct client access constructs Resend with the current \`re_placeholder\` value. Public send helpers first check the environment and return \`{ success: false, error: 'Email service not configured' }\` without reading the client getter. Tests should cover both paths instead of treating them as one behavior.

### Does the singleton pick up an API key changed at runtime?

No. Once the module creates its private client, later calls return the same object even if the process environment changes. Build and deployed runtime usually use separate processes, but tests must reset modules between key cases to avoid stale client state and order-dependent results.

### Can a successful Next.js build prove email delivery works?

No. The build proves compilation, route discovery, and any module work performed during that phase. Provider authentication, request payloads, network access, and inbox results happen later. Run mocked sender tests plus a controlled deployment smoke check for those separate runtime contracts.

### Why do sender errors often resolve instead of reject?

The current QASkills sender functions catch thrown exceptions and handle SDK error responses, then return an object with \`success: false\`. Callers and batch reducers must inspect that flag. Promise fulfillment alone does not mean the provider accepted the email or that an inbox received it.

### Should RESEND_API_KEY use a NEXT_PUBLIC prefix?

No. A provider API key is server-only and should not be bundled for browser code. Use the unprefixed server variable and keep email SDK access behind server modules. Tests can scan client bundles and component imports to ensure secret-reading email code never crosses that boundary.
`,
};
