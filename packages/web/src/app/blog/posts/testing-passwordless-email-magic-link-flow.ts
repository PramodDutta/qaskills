import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing a Passwordless Email Magic-Link Flow',
  description:
    'Test passwordless email magic links across delivery, expiry, single use, wrong-browser handling, deep links, enumeration resistance, and safe redirects.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing a Passwordless Email Magic-Link Flow

Clicking the newest email works on the happy path. The defect appears when an older request remains valid, a security scanner consumes the link before the user, or the phone opens it in a browser that never initiated login. Magic-link authentication is a distributed protocol across the request page, token store, email transport, user agent, session cookie, and redirect target. Testing only the final page leaves most of the security boundary untouched.

A magic link is a bearer credential delivered by email. Whoever possesses it may be able to establish a session. The test strategy must therefore cover token entropy indirectly through implementation review, storage and lifecycle through integration tests, delivery content through a captured mailbox, and browser/session behavior through end-to-end scenarios.

This guide assumes an email link with a server-side one-time token record. The same risk model applies when a signed self-contained token is used, but revocation and one-time consumption become harder. For the surrounding identity test model, use the [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide). For request validation and service-level assertions around the endpoints, read the [API testing best practices guide](/blog/api-testing-best-practices-guide).

## Map the flow before writing selectors

Write the state transitions in protocol terms. The client submits an email and intended continuation. The service normalizes the address, applies rate limits, creates a short-lived random token, stores only an appropriate digest or protected representation, sends a link, and returns a non-enumerating response. When the link arrives, the service validates purpose, expiry, consumption state, user status, and any browser binding. It then consumes the token atomically, creates or upgrades a session, and redirects to an allowlisted destination.

| Stage | Durable state | Observable contract |
|---|---|---|
| Request | Token record, request timestamp, user association | Same public response for known and unknown email |
| Delivery | SMTP message with purpose-bound URL | Correct recipient, host, token, and accessible copy |
| Redemption | Token consumed or rejected atomically | One session at most |
| Session issue | Session record or signed cookie | Correct user, assurance level, and lifetime |
| Continuation | Validated relative path or allowlisted URL | No open redirect or token leakage |
| Audit | Request and redemption events | No raw bearer token in logs |

Give each token an explicit state: issued, consumed, expired, revoked, or superseded. “Invalid” is a useful public response but an insufficient internal diagnosis. Tests need stable reason codes or database fixtures in non-production environments so expiry failures are not confused with parsing errors.

## Build a token lifecycle table

The core cases are not page variations. They are transitions under time and concurrency. Derive tests from the lifecycle table before adding browser automation.

| Starting condition | Action | Required result |
|---|---|---|
| Fresh, unconsumed token | Redeem once before expiry | Session created and token consumed |
| Consumed token | Redeem again | No second session, generic invalid-link page |
| Fresh token at expiry boundary | Redeem just before and at cutoff | Behavior matches one documented comparison |
| Revoked account | Redeem otherwise valid token | Authentication denied |
| Two outstanding requests | Redeem older token | Outcome follows explicit supersession policy |
| Same token, two concurrent requests | Redeem simultaneously | Exactly one transaction succeeds |
| Token for sign-in purpose | Submit to email-change endpoint | Purpose mismatch denied |

Decide whether issuing a new link invalidates earlier links. Both policies can be defensible. Allowing several outstanding tokens helps users who receive delayed email, while supersession limits exposure and reduces confusion. The unacceptable state is unspecified behavior that changes across implementations.

Use an injected clock at service level. Waiting real minutes makes boundary tests slow and imprecise. At the HTTP boundary, mint test tokens with a controlled issue time through a fixture API or database factory, never by altering production endpoints to accept arbitrary expiry from the client.

## Capture real mail without a real inbox

A local SMTP sink such as Mailpit receives the exact message the application sends and exposes it through an HTTP API. This catches errors that a mocked mail function misses: wrong recipient, template escaping, accidental staging host, malformed URL, duplicated query parameters, and text-only fallback problems.

The Playwright test below requests a link from the application, polls Mailpit's documented \`/api/v1/messages\` list, fetches \`/api/v1/message/{ID}\`, extracts the first HTTPS URL from the text body, and redeems it. Use a unique plus-address per test so parallel workers never claim each other's mail.

\`\`\`typescript
import { expect, test } from '@playwright/test';

type MessageSummary = { ID: string; Subject: string; To: Array<{ Address: string }> };
type MessageList = { messages: MessageSummary[] };
type Message = { ID: string; Subject: string; Text: string; HTML: string };

async function waitForMagicLink(
  request: import('@playwright/test').APIRequestContext,
  recipient: string,
) {
  await expect
    .poll(
      async () => {
        const response = await request.get('http://127.0.0.1:8025/api/v1/messages');
        expect(response.ok()).toBeTruthy();
        const list = (await response.json()) as MessageList;
        return list.messages.find((message) =>
          message.To.some((address) => address.Address === recipient),
        )?.ID;
      },
      { timeout: 10_000 },
    )
    .not.toBeUndefined();

  const listResponse = await request.get('http://127.0.0.1:8025/api/v1/messages');
  const list = (await listResponse.json()) as MessageList;
  const summary = list.messages.find((message) =>
    message.To.some((address) => address.Address === recipient),
  );
  if (!summary) throw new Error('Magic-link message not found');

  const messageResponse = await request.get(
    \`http://127.0.0.1:8025/api/v1/message/\${summary.ID}\`,
  );
  const message = (await messageResponse.json()) as Message;
  const link = message.Text.match(/https:\\/\\/[^\\s]+/)?.[0];
  if (!link) throw new Error('No HTTPS link in text part');
  return { link, message };
}

test('email link establishes the requested account session', async ({ page, request }) => {
  const recipient = \`qa+\${test.info().parallelIndex}-\${Date.now()}@example.test\`;
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(recipient);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();

  const { link, message } = await waitForMagicLink(request, recipient);
  expect(message.Subject).toMatch(/sign in/i);
  await page.goto(link);
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
});
\`\`\`

HTML extraction should use an HTML parser in production test code rather than a regular expression. The text-part regex is acceptable here because the URL contract is intentionally simple. Assert both HTML and text bodies contain a usable link, and ensure the URL host is the expected test application before navigation.

Delete captured messages before a test run or isolate recipients. Selecting “latest email” globally is a race condition. Mailpit list results arrive newest first, but recipient correlation remains essential when workers run concurrently.

## Prove single use under concurrency

Sequentially opening a link twice is necessary but not sufficient. Two requests can both read \`consumed_at = null\` before either writes it. The fix is an atomic update or transaction that changes the record only if it is unconsumed and unexpired, then creates one session from the winning result.

Exercise the race with two separate API contexts so cookies do not hide the server result:

\`\`\`typescript
import { expect, request, test } from '@playwright/test';

test('one magic link cannot create two sessions concurrently', async () => {
  const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
  const fixture = await request.newContext({ baseURL });
  const issued = await fixture.post('/test-support/magic-links', {
    data: { email: 'concurrent@example.test', redirectTo: '/account' },
  });
  expect(issued.ok()).toBeTruthy();
  const { token } = (await issued.json()) as { token: string };

  const clientA = await request.newContext({ baseURL });
  const clientB = await request.newContext({ baseURL });
  const responses = await Promise.all([
    clientA.get('/auth/magic/verify', { params: { token }, maxRedirects: 0 }),
    clientB.get('/auth/magic/verify', { params: { token }, maxRedirects: 0 }),
  ]);

  const statuses = responses.map((response) => response.status()).sort();
  expect(statuses).toEqual([303, 410]);
  await Promise.all([fixture.dispose(), clientA.dispose(), clientB.dispose()]);
});
\`\`\`

The \`/test-support/magic-links\` route is an example of a test-only fixture belonging to the application, not a Playwright API. It must be absent from production builds or strongly isolated. Adapt expected status codes to the product contract; the invariant is one successful redemption and one rejection, not specifically 303 and 410.

Also query the test database or audit API to assert exactly one session and one consumption event. HTTP status alone can pass even if both requests create sessions and one later renders an error.

## Test expiry at the exact boundary

Token checks often alternate accidentally between \`now > expiresAt\` and \`now >= expiresAt\`. Pick one contract and test immediately before, exactly at, and immediately after the boundary using the smallest time unit stored by the system. Database timestamp truncation can turn a carefully minted millisecond token into a whole-second ambiguity.

Separate token expiry from email delay. A token that expires ten minutes after request can arrive nine minutes later and technically work for one minute. Record issued and delivered timestamps in test telemetry, but do not extend validity based on an untrusted email-open time.

Clock differences matter when application servers and databases disagree. Prefer a single authoritative clock for the comparison. Integration tests with a real database should reveal whether the query uses database time or an application parameter. Do not “fix” clock skew by accepting an extra window silently; that extends every credential's attack period.

## Define wrong-browser behavior rather than stumbling into it

A user requests a link on a laptop and taps it on a phone. A corporate email gateway may open it in an isolated browser. Privacy software may strip cookies. Your design can choose a portable bearer link or bind redemption to the initiating browser. Each choice changes tests and usability.

| Design | Same browser | Different browser | Security and UX consequence |
|---|---|---|---|
| Portable bearer token | Signs in | Signs in | Smooth handoff, email possession is sole proof |
| Initiation-cookie binding | Signs in | Requests a code or restart | Reduces forwarded-link use, more friction |
| Link plus displayed code | Signs in after code | Can transfer code intentionally | More steps, explicit device handoff |
| Approval in original browser | Completes pending login | Shows confirmation instruction | Strong binding, requires both devices |

Use two Playwright browser contexts. Request in context A and redeem in context B. Assert the documented result. If B is rejected, verify A can still recover rather than leaving the user locked in a consumed-token dead end. If B is allowed, ensure the session exists only in B unless the design explicitly completes A too.

Browser binding must not depend on a fingerprint assembled from unstable device attributes. Use a cryptographically random, short-lived initiation identifier stored in a secure cookie or server state. Test cookie clearing, private mode, and cross-subdomain deployment.

## Keep security scanners from consuming GET links

Email security products frequently fetch links to inspect them. If a GET request consumes the token and establishes a session immediately, the scanner can invalidate the user's credential. It may also create an unaffiliated session that no human receives, leaving confusing audit data.

A robust design lets the GET display a confirmation page, then uses a POST with same-site protections to consume the token. Some products accept one-click GET redemption for simplicity, but they must test prefetch behavior explicitly. Send a request without normal browser cookies or navigation headers, then perform the human flow. Decide whether the first request consumes, previews, or rejects.

Avoid relying solely on User-Agent deny lists. Scanners change and attackers can copy browser headers. Protocol state is more reliable than guessing who fetched the URL.

## Stop account enumeration at request time

The request endpoint should return the same public status, message shape, and approximately similar timing whether the email belongs to an active account, no account, a disabled account, or an SSO-only account. This does not mean the internal action is identical. The service can send only when policy allows while presenting a uniform response.

Test response body, HTTP status, headers, and a broad latency distribution. Do not assert exact milliseconds in CI. Instead use enough samples to identify a gross branch difference, and review implementation for obvious synchronous database or email work that leaks account existence.

Rate limits should cover normalized email, account, IP or device signals, and broader abuse controls without turning the endpoint into a denial-of-service tool against a victim's address. Verify that case variants, whitespace, plus addressing according to your identity rules, and Unicode normalization cannot trivially bypass counters.

## Validate redirects and deep links

The continuation target is attacker-controlled input unless proven otherwise. A link such as \`/auth/verify?token=...&next=https://evil.example\` must not become an open redirect after authentication. Prefer server-side state keyed by the token and allow relative application paths or a strict allowlist of origins and schemes.

Test absolute external URLs, protocol-relative paths, backslashes, encoded separators, mixed-case schemes, userinfo syntax, nested redirect parameters, control characters, and double decoding. Expected behavior is a safe default page or a validation error before session creation, depending on product design.

For mobile deep links, test the universal/app link, application-not-installed fallback, and preservation of the intended in-app route. Never place the raw magic token in analytics events, referrer-bearing intermediate pages, or third-party deep-link services. Redeem at a controlled origin, then hand off a non-sensitive continuation.

## Check email content as authentication UI

The email is part of the login interface. Assert product name, purpose, recipient context when appropriate, expiry wording that matches configuration, plain-text alternative, accessible link text, and support guidance. Do not expose whether the recipient has an account in subject lines or previews.

The link must use HTTPS and the intended host. Test proxy and environment configuration so staging never emits localhost and production never emits staging. Percent-encoding must preserve the token exactly. Avoid printing the complete link in test failure output; redact the token before attaching traces or reports.

Forwarding is a realistic scenario. If the design treats email possession as sufficient, a forwarded live link grants access. State that in the threat model, keep lifetimes short, and provide account audit or step-up checks for sensitive actions. Marketing language should not imply device binding that the protocol lacks.

## Observe sessions after redemption

Authentication success is not merely landing on \`/account\`. Inspect the resulting cookie attributes: \`Secure\`, \`HttpOnly\`, appropriate \`SameSite\`, narrow domain and path, and expected expiry. Confirm session fixation protection by seeding a pre-authentication session and verifying its identifier rotates after login.

Verify the session belongs to the token's user, not the email currently typed in another tab. Check disabled-account changes between issuance and redemption. If magic-link login creates new users, test concurrent requests for the same normalized address and ensure one identity record results.

Sensitive actions may require a higher assurance level than email-only login. Test that the session's authentication method is recorded and authorization policy enforces step-up where required. A successful magic link should not accidentally satisfy a phishing-resistant MFA requirement.

## Make the suite deterministic and private

Use unique recipients, controlled clocks, isolated token records, and independent browser contexts. Poll the mailbox with a timeout rather than sleep. Clean up by recipient or run-specific tag, not by deleting a shared mailbox while other workers are active.

Redact tokens from Playwright traces, network logs, screenshots, and CI artifacts. A test token may still authenticate to a shared staging environment. Configure short lifetimes and destroy the environment or token records after the run. Never send automated tests through real customer email addresses.

Separate layers for fast diagnosis:

| Layer | Primary assertions | Typical dependency |
|---|---|---|
| Token unit tests | Digest, purpose, expiry comparison | Injected clock and random source |
| Service integration | Atomic consumption, session record, revocation | Real database |
| Mail integration | Recipient, template, URL construction | Mailpit SMTP and API |
| Browser E2E | Cookies, wrong-browser behavior, redirects | Playwright contexts |
| Abuse suite | Enumeration, rate limits, replay, leakage | Deployed test environment |

The end-to-end test proves wiring. The integration suite carries the concurrency and time-boundary load because it can control state precisely.

## Frequently Asked Questions

### Should requesting a new magic link invalidate the previous one?

Choose and document a policy. Supersession reduces the number of live credentials, while multiple outstanding links tolerate delayed email. Test the chosen behavior explicitly, including out-of-order delivery.

### How can I test expiration without waiting for the real lifetime?

Inject a clock in token-service tests or mint records with controlled timestamps through isolated fixtures. Verify just before, exactly at, and just after the stored precision boundary.

### What should happen when the link opens in another browser?

That depends on whether the product uses a portable bearer credential or initiation binding. The test must use two independent contexts and assert the declared handoff, recovery, and token-consumption behavior.

### Can an email security scanner invalidate a magic link?

Yes, if a simple GET consumes it. Test an automated prefetch before human redemption. A confirmation page followed by a protected POST is more resistant than immediate GET consumption.

### Where should the post-login destination be stored?

Prefer server-side state associated with the token and validate it against relative-path or strict-origin rules. Do not trust a raw \`next\` URL from the redemption request, and never pass the bearer token through third-party redirect infrastructure.
`,
};
