import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'HMAC Unsubscribe Token Testing',
  description:
    'HMAC unsubscribe token testing covers tampering, base64url parsing, timing-safe comparison, future timestamps, expiry boundaries, and secret rotation.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'HMAC unsubscribe token testing',
  keywords: [
    'HMAC unsubscribe token testing',
    'unsubscribe token tampering',
    'base64url token parsing',
    'timingSafeEqual test',
    '30 day token expiration',
    'HMAC secret fallback',
    'unsubscribe API security',
    'signed link boundary test',
  ],
  relatedSlugs: [
    'testing-clerk-user-created-webhook-idempotency',
    'testing-missed-clerk-webhook-user-recovery',
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
  ],
  sources: [
    'https://nodejs.org/api/crypto.html#cryptocreatehmacalgorithm-key-options',
    'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
    'https://www.rfc-editor.org/info/rfc2104/',
  ],
  content: `**HMAC unsubscribe token testing** proves that a signed email link accepts its original user and timestamp while rejecting altered payloads, signatures, broken shapes, and expired values. The suite must freeze time, test the exact 30-day edge, and record current handling of future timestamps instead of assuming every unusual token is rejected.

The QASkills token is small enough to test as a full matrix. Pair this security tutorial with the [authentication guide](/blog/authentication-authorization-testing-guide), find more test patterns in [QASkills](/skills), and use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) for the final browser link flow.

The goal is not to test the SHA-256 algorithm itself. The goal is to test how this application builds, signs, splits, decodes, compares, and ages each token. That boundary is where format bugs and policy gaps become user-facing failures.

## How Do You Test Unsubscribe Token Tampering?

**Unsubscribe token tampering** changes one part of a valid token while leaving the rest untouched. Start by generating a real token under a fixed secret and time. Then mutate the encoded payload, signature, separator, user ID, and timestamp in separate cases so each failure has one clear cause.

The current token has two dot-separated parts. The first part is base64url text for \`userId:timestamp\`, and the second is an HMAC-SHA256 signature over the decoded payload. The signature therefore binds both the user ID and time, but it does not hide either value.

HMAC is defined as keyed message authentication in [RFC 2104](https://www.rfc-editor.org/info/rfc2104/). A test should not expect encryption or secrecy from this format. Anyone holding the link can decode the payload, while only a holder of the secret should be able to create a matching signature.

Build mutations from one valid token rather than typing random strings. A random string proves only that random input fails. A one-character change proves the verifier notices a specific attack against an otherwise valid shape.

| Mutation | Expected current result | Main assertion |
| --- | --- | --- |
| Original generated token | Valid payload | Exact user ID and fixed timestamp |
| One payload character changed | Invalid | Verification returns null |
| One signature character changed | Invalid | Verification returns null |
| Signature shortened | Invalid | Length guard returns null |
| Extra dot section | Invalid | Part count is not two |
| Missing dot | Invalid | Part count is not two |
| Empty user ID with valid signature | Invalid | User ID check returns null |
| Future timestamp with valid signature | Currently accepted | Record policy gap |

HMAC unsubscribe token testing should create valid signatures for semantic edge cases. That may require a test-only helper that uses the same HMAC formula, not a production export of the private \`sign()\` function. Keep the helper in test code and compare its result with generated tokens.

Do not log the full token on failure. The link grants an account preference action while valid. Log the mutation name, fixed test user, and null-or-valid result, then redact the secret and signature.

Keep one untouched token beside every mutated copy. Verify the control first so a bad secret or clock cannot make the whole matrix pass with null results. Then require each mutation to differ from the control in exactly one named place.

Test repeated verification too. Reading a valid token does not consume it in the current design, so two checks return the same payload. The API action should remain safe when a user clicks the same link twice, which needs a separate preference-state assertion.

Sort mutation cases by parsing stage in the report. Shape failures should appear before signature and age failures. This order makes a broken parser easy to spot without exposing the token or adding private values to test names.

## What Can Break Base64url Token Parsing?

**Base64url token parsing** can fail at the outer dot split, payload decode, colon split, user check, or timestamp parse. Tests should cover each stage because Node's buffer decoder may accept some odd input instead of throwing. A catch-all invalid case cannot tell which policy the verifier applies.

The payload uses the last colon as its separator. That means a user ID containing a colon can still parse, since everything before the final colon remains the user ID. Test that behavior with a correctly signed fixture even if Clerk IDs normally use a safer shape.

An empty encoded payload decodes to an empty string and has no separator, so verification returns null. A payload with \`:123\` has a separator but an empty user ID, which also returns null. A payload with \`user:\` produces \`NaN\` and returns null.

\`\`\`typescript
import { createHmac } from 'node:crypto';

function makeToken(payload: string, secret: string) {
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return \`\${encoded}.\${signature}\`;
}

const cases = [
  { name: 'empty user', payload: ':1700000000000', valid: false },
  { name: 'missing time', payload: 'user_1:', valid: false },
  { name: 'colon in user', payload: 'team:user_1:1700000000000', valid: true },
  { name: 'trailing time text', payload: 'user_1:1700000000000x', valid: true },
];
\`\`\`

The trailing-text case reflects JavaScript \`parseInt()\`, which reads the leading numeric part. Because the signature still covers the full text, an outside attacker cannot add that suffix without a valid secret. The test should still record this parser behavior so a later switch to strict numeric validation is deliberate.

Add Unicode user IDs and long inputs as defensive cases. The HMAC signs UTF-8 bytes, while buffer encoding and decoding should preserve the same payload. Apply a reasonable request-size limit at the API boundary; the token helper itself does not enforce one.

Use a property test only after the named cases are clear. Generate safe user IDs and times, then assert that generate followed by verify returns the same data. Keep malformed generators bounded so the suite does not spend most of its time on huge strings.

Add input types that can arrive from loose JavaScript callers. An empty string should return null, while a value with spaces or extra dots should fail its shape or signature check. The TypeScript type helps developers, but network input still needs runtime behavior.

Keep parser tests separate from URL decoding. The browser and route may decode percent escapes before the helper receives the token. A route test should prove that one encoded query value becomes the exact two-part string expected by verification.

The [API testing guide](/blog/api-testing-complete-guide) can help organize those request cases. Use clear status, body, and no-write assertions rather than treating every bad token as a helper unit test.

## How Should a timingSafeEqual Test Work?

A **timingSafeEqual test** should prove the application checks buffer lengths before calling Node's comparison function. Node documents that [timingSafeEqual requires equal byte lengths](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b). Calling it with unequal buffers throws, which could turn a bad token into an avoidable error path.

The current verifier converts both base64url signature strings into UTF-8 buffers. It compares their lengths, returns null when they differ, and calls \`timingSafeEqual()\` only for equal lengths. A short and a long signature should both return null without escaping an exception.

Do not test constant-time behavior with elapsed milliseconds in normal CI. Schedulers, CPU load, runtimes, and optimization make such checks noisy. Test the API contract, branch order, and equal-length requirement, then rely on the reviewed Node primitive for comparison behavior.

Node's [createHmac documentation](https://nodejs.org/api/crypto.html#cryptocreatehmacalgorithm-key-options) covers the keyed hash construction used by the module. Keep one known-value test with a fixed secret, payload, and expected base64url signature. That case catches an accidental change in algorithm, payload bytes, or output encoding.

\`\`\`typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from '@/lib/email/unsubscribe-token';

describe('unsubscribe token signature checks', () => {
  beforeEach(() => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-secret-not-for-production');
    vi.setSystemTime(new Date('2026-07-25T00:00:00.000Z'));
  });

  it('rejects signatures with the wrong length without throwing', () => {
    const token = generateUnsubscribeToken('user_test_1');
    const [payload, signature] = token.split('.');

    expect(verifyUnsubscribeToken(\`\${payload}.\${signature.slice(1)}\`)).toBeNull();
    expect(verifyUnsubscribeToken(\`\${payload}.\${signature}x\`)).toBeNull();
  });
});
\`\`\`

Restore fake time and environment values after each test. Secret and clock state leak easily across files, and leaked state can make an expiry case pass for the wrong reason. Use \`vi.unstubAllEnvs()\` and real timers in teardown.

HMAC unsubscribe token testing must also reject a same-length signature made with another secret. That case reaches the timing-safe comparison instead of the length guard. It proves the verifier does not accept shape alone.

## Where Is the 30 Day Token Expiration Boundary?

The **30 day token expiration** rule uses \`Date.now() - timestamp > TOKEN_MAX_AGE_MS\`. A token exactly 30 days old is accepted because its age equals the limit, while a token 30 days and one millisecond old is rejected. Freeze time so this boundary never depends on test speed.

Use one generation time and move the verification clock. Do not generate a fresh token after advancing time, or every token will appear new. The token stores milliseconds, so use exact millisecond dates rather than rounding through seconds.

Test at least four points: one millisecond before the limit, exactly at the limit, one millisecond after it, and far after it. Add a same-day control to prove the secret and fixture remain valid. This set makes an accidental \`>=\` change visible.

\`\`\`typescript
it('accepts the exact limit and rejects one millisecond later', () => {
  const issuedAt = new Date('2026-06-25T00:00:00.000Z');
  vi.setSystemTime(issuedAt);
  const token = generateUnsubscribeToken('user_boundary');

  vi.setSystemTime(new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000));
  expect(verifyUnsubscribeToken(token)).toEqual({
    userId: 'user_boundary',
    timestamp: issuedAt.getTime(),
  });

  vi.setSystemTime(
    new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000 + 1),
  );
  expect(verifyUnsubscribeToken(token)).toBeNull();
});
\`\`\`

The current verifier does not reject future timestamps. A correctly signed token dated tomorrow has a negative age and passes the expiration check. Write a test that documents this result, then open a policy issue if future time should be bounded for clock skew and misuse.

Do not call that future token secure merely because it is signed. A leaked current secret could create a link with an extended life under this rule. The right fix and allowed clock skew should be chosen before changing the expected test.

Use UTC dates in fixtures. Millisecond arithmetic is independent of daylight-saving changes, but local date constructors make test intent harder to read. Explicit ISO strings keep the issue and verification clocks clear.

Run the boundary under both configured secret paths. The age result should not change when the fallback key signs and verifies the token. This catches a fixture that generates with one key but verifies with another after the clock moves.

Add one very old timestamp and one value near the largest safe integer. The old value must expire, while the large signed value records current future-time behavior. Keep these as policy cases rather than random arithmetic tests.

HMAC unsubscribe token testing should also verify the timestamp returned to the caller. It must match the issued millisecond value exactly. A rounded or reparsed value can move the edge and make audit logs disagree with the actual check.

## Test the HMAC Secret Fallback

The **HMAC secret fallback** chooses \`UNSUBSCRIBE_SECRET\` first and \`CRON_SECRET\` second. If neither exists, generation and verification attempt to sign and then fail. Generation throws, while verification catches signing errors and returns null.

Test precedence with two distinct secrets. Generate a token while both are set, remove only the unsubscribe secret, and prove verification fails under the cron secret. Then generate and verify with only the cron secret to prove the fallback path works.

This fallback is not key rotation. The verifier accepts one active key, not a current and prior key set. Replacing the configured secret immediately invalidates all older links, which may be a valid operational choice but must be planned.

| Environment state | Generation | Verification of token signed in same state |
| --- | --- | --- |
| Both secrets set | Uses unsubscribe secret | Valid |
| Only unsubscribe secret | Uses unsubscribe secret | Valid |
| Only cron secret | Uses cron secret | Valid |
| Neither secret | Throws | Returns null for supplied token |
| Secret changed after issue | Uses new secret | Old token invalid |

Keep production secrets out of tests. Use short synthetic values through the runner's environment stub and restore them after every case. A snapshot or failure message should never include the key.

HMAC unsubscribe token testing should include deployment configuration checks without reading secret values. Confirm that the required variable name exists in each target and that preview environments use separate keys. Do not print or compare live secret text in CI.

If the team removes the cron fallback later, update both unit and deployment tests in one change. A silent configuration mismatch could make every unsubscribe link fail while emails continue to send.

## Exercise Unsubscribe API Security

**Unsubscribe API security** starts with token verification and continues through user lookup and preference changes. The current route requires a token, maps invalid or expired tokens to 400, maps a missing user to 404, and updates or creates preference data for the token's user ID.

Test the helper and route separately first. Helper tests give exact boundary feedback, while route tests prove status codes and database effects. A single browser case can then prove the email link reaches the page and posts the expected token.

The token is a bearer credential for a limited preference action. Avoid placing it in analytics events, server logs, screenshots, or shared test reports. Query strings can also appear in browser history and proxy logs, so keep the action narrow and the validity window reviewed.

Use this route matrix:

| Request | Expected status | Database effect |
| --- | --- | --- |
| Missing token | 400 | None |
| Invalid signature | 400 | None |
| Expired token | 400 | None |
| Valid token, unknown user | 404 | None |
| Valid token, existing preferences | 200 | Selected fields updated |
| Valid token, no preferences | 200 | Default row created with selected opt-out |

Test \`all\`, \`weekly\`, and \`alerts\` as separate cases. An unknown type currently falls through to disabling all email notifications at runtime. Record that result rather than assuming TypeScript prevents malformed network input.

The [webhook testing guide](/blog/webhook-testing-complete-guide-2026) offers a useful comparison for signed requests, but email tokens have a different trust path. Also review the [privacy page](/privacy) when deciding what the link and logs may contain.

HMAC unsubscribe token testing should end with a fresh database read. Assert the intended flag changed and unrelated flags stayed as expected. Response success without saved preference state is not enough.

Run the valid API case twice. The second call should keep the chosen flag false and avoid creating extra preference rows. This is an action idempotency check, not a token validity check, and both results matter for a link that users may click again.

For broader request hardening, compare these cases with the [security testing guide](/blog/security-testing-ai-generated-code). Keep the focus on input handling and saved state, while secret storage and provider access stay in deployment review.

Do not infer the unsubscribe type from the token. The current signature binds only user ID and time, while the request carries the type separately. A test that changes \`weekly\` to \`all\` will show the current authority of that request field.

## Build a Signed Link Boundary Test

A **signed link boundary test** joins token creation, URL encoding, browser navigation, API submission, and saved preferences. Keep most mutation cases below the browser layer. The end-to-end case should focus on the one valid path plus one rejected token that a user can see.

Generate the email URL with a synthetic user and fixed environment. Parse its query with the platform URL class instead of splitting strings. Assert one token value and the requested preference type before opening the page.

In Playwright, mask the token in traces or avoid retaining the trace for that case. A test artifact can preserve a valid bearer link. Use a test-only secret and disposable user so any leaked fixture loses value after the run.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('weekly unsubscribe link changes only weekly digest', async ({ page }) => {
  const user = await createDisposableSubscriber();
  const url = await buildTestUnsubscribeUrl(user.id, 'weekly');

  await page.goto(url);
  await page.getByRole('button', { name: 'Unsubscribe' }).click();
  await expect(page.getByText('Preferences updated')).toBeVisible();

  const preferences = await readPreferences(user.id);
  expect(preferences.weeklyDigest).toBe(false);
  expect(preferences.newSkillAlerts).toBe(true);
});
\`\`\`

Keep the selector names aligned with the real page before adding this case. If the UI uses an automatic request instead of a button, wait for the response and visible result. Do not add a fake control only to make the example pass.

Run one expired-link browser case with a clear user message. The route returns the same invalid-or-expired error text, so the UI should not guess which cause occurred. Detailed token diagnostics belong in safe server-side test output, not in the page.

## Run the Security Procedure

Use one fixed test plan for every change to token format, secrets, email links, or unsubscribe preferences. Keep the matrix in source control so a new mutation does not replace an older boundary case.

1. Set a test-only unsubscribe secret, freeze UTC time, and generate one valid token.
2. Verify the original payload, then mutate payload, signature, separators, and lengths one at a time.
3. Build signed malformed payloads for empty IDs, bad times, colon-rich IDs, and future timestamps.
4. Move the clock around the exact 30-day edge and assert each millisecond boundary.
5. Test secret precedence, fallback, missing secrets, and a changed secret after token issue.
6. Call the unsubscribe API for missing, invalid, expired, unknown-user, and valid preference cases.
7. Run one valid browser link and one rejected link with disposable data and redacted artifacts.
8. Restore time and environment state, then publish only mutation names and pass-or-null results.

Add these checks to the post-change suite for email and security code. Run the browser pair in a slower integration job if needed, but keep format, signature, and age tests in the fast unit lane.

Use a second reviewer for changes to secret choice or token age. Tests can show the code matches a rule, but they cannot decide the right retention period or rotation plan. Document that choice beside deployment settings.

HMAC unsubscribe token testing also benefits from production counts. Track invalid, expired, missing-user, and successful outcomes without storing token text. A sudden shift can reveal bad email links, a secret mismatch, or automated abuse.

Keep a short runbook beside those counts. It should tell support how to confirm a bad campaign link without asking a user to send the full token. A campaign ID, send time, and safe response class are usually enough to start.

Review token failures after any proxy, URL, or mail-template change. Some systems rewrite query strings or wrap links before the browser sees them. A valid helper unit test cannot catch that delivery-path change, so retain one generated-email browser case.

## Apply HMAC Unsubscribe Token Testing

HMAC unsubscribe token testing is complete when valid links work at the exact policy edge and each controlled mutation fails as expected. It must also preserve current truths: future signed timestamps pass today, secret rotation is not built in, and helper success does not alone prove the preference update.

Add the matrix to your email post-flow, then use the [skills directory](/skills) for related security checks. The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) can cover the user link, while the [error-handling guide](/blog/error-handling-testing-patterns) helps keep failures clear without exposing tokens.

## Frequently Asked Questions

### Is an HMAC unsubscribe token encrypted?

No. The payload is base64url encoded, so it can be decoded without the secret. HMAC proves that the payload matches a holder of the key; it does not hide the user ID or timestamp. Keep private data out of the payload and treat the full link as a bearer credential.

### Why compare signature lengths before timingSafeEqual?

Node's timing-safe comparison requires buffers with the same byte length and throws when lengths differ. The verifier checks length first and returns null for a short or long signature. Then it uses the timing-safe function only when both encoded signature buffers have equal length.

### Is a token valid exactly 30 days after issue?

Yes under the current comparison. The verifier rejects an age only when it is greater than 30 days, so the exact limit remains valid. One millisecond later returns null. Fake time is needed to test that edge without delays or local clock noise.

### What happens when both unsubscribe and cron secrets exist?

The unsubscribe secret has precedence because the helper chooses it first. Tokens created with that key will not verify if only the different cron secret remains later. Test precedence with distinct synthetic values and never expose either production key in logs or test output.

### Does the current verifier reject future timestamps?

No. A correctly signed future timestamp produces a negative age and passes the present expiration check. The test suite should record that behavior as a policy gap. Add a bounded future-skew rule only after the team defines the allowed clock difference.

### Should every malformed token reach the API database code?

No. Missing, badly shaped, tampered, and expired tokens should fail verification before user or preference queries. Route tests can spy on database calls for these cases. That negative assertion proves invalid bearer data cannot trigger account preference writes or reveal whether a user exists.
`,
};
