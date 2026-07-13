import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing TOTP Two-Factor Authentication with Clock Skew',
  description:
    'Test TOTP two-factor authentication under clock skew with exact time-step boundaries, replay prevention, narrow windows, throttling, and OTPAuth examples.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing TOTP Two-Factor Authentication with Clock Skew

At 12:00:29.999, an authenticator displays a six-digit code. One millisecond later, the server enters the next 30-second counter and may reject it unless the validation window includes the preceding step. That boundary, not the middle of a time period, is where TOTP implementations reveal clock assumptions, off-by-one errors, and replay gaps.

Time-based one-time passwords derive an HOTP value from a shared secret and a counter calculated from Unix time divided into fixed periods. The common defaults are SHA-1, six digits, and a 30-second period, but the provisioning URI is the actual contract. A validator tests the submitted token against the current counter and, when configured, nearby counters to tolerate device and server clock differences.

Widening the window improves usability but increases the set of currently acceptable codes. It does not solve replay, brute-force resistance, secret storage, or account recovery. Those require separate controls and tests. For the broader login and role model around the second factor, use the [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide). For endpoint abuse cases, response handling, and security headers, consult the [API security testing checklist](/blog/api-security-testing-checklist-2026).

## Model counters instead of vague “minutes”

For a period \`P\` seconds and timestamp \`t\`, the moving counter is the integer floor of \`t / P\`, using Unix time. A validation window of 1 conventionally searches the previous, current, and next counters. A match returns a delta such as -1, 0, or 1. That delta is operational evidence: persistent +1 matches indicate the authenticator clock is ahead, while -1 suggests it is behind.

Test timestamps in milliseconds when the library accepts milliseconds. Name every fixture with both wall time and expected counter so units cannot be confused. Passing seconds to an API that expects milliseconds creates a token from a date near the Unix epoch, a failure that can look like a bad secret.

| Server position in period | Device offset | Expected delta with window 1 | Risk to exercise |
|---|---:|---:|---|
| 1 ms after boundary | -2 ms | -1 | Previous code should remain acceptable |
| Middle of period | 0 | 0 | Normal current-step validation |
| 1 ms before boundary | +2 ms | 1 | Next code may be accepted |
| Middle of period | +31 s | None | Outside one-step window |
| Exact boundary | 0 | 0 | Floor and unit correctness |
| Near boundary | Large arbitrary skew | None | No accidental unbounded search |

Do not describe window 1 as “plus or minus 30 seconds” in every situation. Near a boundary, a code from an adjacent counter may differ by only milliseconds of wall-clock time. In the middle, the same adjacent counter represents a much larger offset. The counter set is exact; the intuitive elapsed-time range is position-dependent.

## Prove OTP generation against RFC vectors first

Before testing product policy, verify the library configuration using published RFC 6238 test vectors for SHA-1, SHA-256, and SHA-512 where applicable. This catches encoding, digit length, algorithm naming, and timestamp-unit errors. Then use an application-specific secret for boundary scenarios.

OTPAuth exposes \`TOTP.generate({ timestamp })\` and \`TOTP.validate({ token, timestamp, window })\`. Validation returns the matched counter delta or \`null\`. The following Vitest suite uses a fixed Base32 secret and intentionally crosses a period boundary.

\`\`\`typescript
import * as OTPAuth from 'otpauth';
import { describe, expect, it } from 'vitest';

const totp = new OTPAuth.TOTP({
  issuer: 'Example',
  label: 'clock-test@example.test',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: OTPAuth.Secret.fromBase32('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'),
});

const boundary = 1_800_000_000_000; // divisible by 30,000 ms

describe('TOTP counter boundaries', () => {
  it('changes token at the exact next time step', () => {
    const before = totp.generate({ timestamp: boundary - 1 });
    const atBoundary = totp.generate({ timestamp: boundary });

    expect(before).not.toBe(atBoundary);
    expect(totp.counter({ timestamp: boundary - 1 }) + 1).toBe(
      totp.counter({ timestamp: boundary }),
    );
  });

  it.each([
    { deviceTime: boundary - 1, serverTime: boundary, window: 1, delta: -1 },
    { deviceTime: boundary, serverTime: boundary, window: 1, delta: 0 },
    { deviceTime: boundary + 30_000, serverTime: boundary, window: 1, delta: 1 },
    { deviceTime: boundary + 60_000, serverTime: boundary, window: 1, delta: null },
  ])('returns \$delta for device time \$deviceTime', ({ deviceTime, serverTime, window, delta }) => {
    const token = totp.generate({ timestamp: deviceTime });
    expect(totp.validate({ token, timestamp: serverTime, window })).toBe(delta);
  });
});
\`\`\`

The timestamp is chosen because it divides evenly by 30,000. Avoid an arbitrary human-readable time unless you verify its remainder. Tests that claim to sit on a boundary while actually landing in the middle give false confidence.

## Turn clock skew into a full boundary matrix

Generate cases by counter, not by copying a handful of timestamps. For each configured period, choose a known boundary and test one millisecond before, at the boundary, and one millisecond after. Generate the authenticator code at offsets spanning \`-window - 1\` through \`window + 1\` counters. This proves both acceptance and rejection edges.

Include negative skew and positive skew. Many suites test a slow phone but forget a server whose clock is behind the authenticator. Also test application and database clocks separately if the service records last-used counters in the database. A validator using application time while replay storage compares database time can disagree during an infrastructure incident.

| Case family | Token counter relative to server | Expected validation |
|---|---:|---|
| Current | 0 | Accept with delta 0 |
| Slow device within window | -1 | Accept with delta -1 |
| Fast device within window | +1 | Accept with delta +1 |
| Too old | \`-window - 1\` | Reject |
| Too far ahead | \`window + 1\` | Reject |
| Malformed | Not a valid digit string | Reject without throwing details |
| Wrong secret | Same time, another account | Reject |
| Wrong algorithm or digits | Same secret and time | Reject according to provisioning contract |

If the server adapts to measured drift, test the drift-learning policy as its own state machine. A successful +1 validation may store an offset for future checks. Bound the maximum adjustment, require strong authentication before large resynchronization, and prove one malicious code cannot ratchet the accepted window indefinitely.

## Reject a valid code after it has been used

TOTP is time-based, but “one-time” is not automatically enforced by computing the token. The same six digits remain mathematically valid for the entire period and possibly adjacent validation windows. The application must remember the accepted counter for the account and reject reuse according to policy.

A strong rule stores the highest successfully accepted counter and requires a later counter for the next authentication. This prevents reuse of the same counter even if the user submits the identical code through another endpoint. It also means a server that accepts a +1 future-step token cannot later accept the current step, which is correct for strict monotonic use but can surprise support teams.

The sample verifier below wraps OTPAuth with a replay store. In production, the comparison and update must be atomic in a database transaction or conditional write. An in-memory map demonstrates the policy but is not a distributed lock.

\`\`\`typescript
import * as OTPAuth from 'otpauth';

type ReplayStore = {
  consumeIfNewer(userId: string, counter: number): Promise<boolean>;
};

export async function verifyTotp(input: {
  userId: string;
  token: string;
  timestamp: number;
  totp: OTPAuth.TOTP;
  replayStore: ReplayStore;
}) {
  const delta = input.totp.validate({
    token: input.token,
    timestamp: input.timestamp,
    window: 1,
  });
  if (delta === null) return { ok: false, reason: 'invalid_code' } as const;

  const serverCounter = input.totp.counter({ timestamp: input.timestamp });
  const matchedCounter = serverCounter + delta;
  const consumed = await input.replayStore.consumeIfNewer(input.userId, matchedCounter);
  if (!consumed) return { ok: false, reason: 'replayed_code' } as const;

  return { ok: true, delta, matchedCounter } as const;
}
\`\`\`

Test two concurrent submissions of the same code. Exactly one conditional update should win. A read followed by an unconditional write is vulnerable because both requests can observe the old counter. Also test the same token through login, step-up authorization, backup-factor management, and account recovery if those endpoints share TOTP verification. Replay scope must cover the intended security domain.

## Distinguish replay rules from user correction

Users mistype codes. A failed attempt must not consume a counter. A valid code submitted for the wrong account must not alter either account's replay state. A valid code rejected because another request already consumed it should return a generic user message while recording a distinct internal reason.

There is a nuanced retry case: the server commits successful consumption but the response is lost. The user retries and receives “invalid code.” This is secure but frustrating. The application can make the overall operation idempotent within a short transaction context, but it must not allow the token to authorize a different operation. Test network retry at the business-operation layer, not by weakening counter consumption.

## Keep the acceptance window narrow and observable

A symmetric window of 1 is common, not mandatory. High-quality time synchronization may support window 0. Devices with known clock problems may require a broader policy, but each additional counter expands the valid token set. Combine any nonzero window with attempt throttling and replay prevention.

Record matched deltas without recording secrets or codes. A rise in -1 and +1 matches is an early warning about NTP, device population, timestamp units, or deployment changes. Alert on distribution shifts rather than a fabricated universal percentage.

Do not expose delta to the unauthenticated client. Returning “your clock is 30 seconds fast” helps attackers learn the search behavior. The public response can remain “incorrect or expired code,” while telemetry holds the reason under access control.

## Test incorrect input without leaking an oracle

The verification endpoint should handle empty strings, fewer or more digits, non-ASCII numerals, whitespace, leading zeros, signs, decimal notation, and extremely long input. Decide whether user-interface formatting removes spaces before the server sees them. The server still needs length and character validation.

Leading zeros are meaningful. Never parse the token as a number because numeric conversion discards them. Keep it as a fixed-length string. Compare calculated tokens in constant time through the chosen library rather than an ordinary early-exit string comparison.

Responses for wrong code, expired code, replay, unknown account, and disabled factor should not reveal account state to an unauthenticated caller. Internally, stable reason codes are valuable for support and testing. Test both layers.

## Throttle across windows, endpoints, and workers

A six-digit token has a finite search space. A validation window checks several candidates per submission, so online attempt limits are mandatory. Test per-account and broader abuse controls across concurrent processes. A local in-memory counter on each server instance is insufficient in a horizontally scaled deployment.

Exercise attempts just below the limit, at the limit, and after reset. Verify that changing whitespace or account identifier case cannot bypass the counter. Test parallel requests that arrive together, because non-atomic counters may allow every worker through. Rate limiting should not consume a valid TOTP counter before verification occurs.

Avoid locking an account permanently through unauthenticated guesses. Progressive delays, bounded temporary lockouts, and risk-based controls each have tradeoffs. The test oracle should match the chosen policy and verify recovery, not assume one universal design.

## Verify provisioning parameters and secret handling

The QR code normally contains an \`otpauth://totp/...\` URI with issuer, label, Base32 secret, algorithm, digits, and period. Parse the URI in a test and confirm it round-trips to the expected configuration. An authenticator using 30 seconds cannot match a server silently changed to 60 seconds.

| Provisioning field | Failure to detect | Test |
|---|---|---|
| Secret | Every code rejected or another account accepted | Unique secret per account and cross-account negative case |
| Issuer and label | User cannot identify entry | URI parse and displayed identity review |
| Algorithm | Authenticator/server mismatch | Generate with provisioned algorithm |
| Digits | Truncation mismatch | Exact string length and leading-zero case |
| Period | Codes roll at different times | Boundary test using configured period |
| Factor status | Old secret remains usable after reset | Revoke and rotate integration test |

Never snapshot a live secret into test logs. Use dedicated fixture secrets in source only when they protect no real identity. Production secrets should be encrypted at rest with controlled decryption and must not appear in analytics, exception payloads, or support dashboards.

Test factor rotation: once a new secret is confirmed, the old secret must stop working according to the documented transition. Enrollment should not activate until the user proves possession by submitting a valid code. Concurrent enrollments must not leave multiple unintended active secrets.

## Exercise server clock incidents safely

Application tests should inject time rather than change the host clock. Mutating the CI machine's clock can break TLS, logs, databases, and neighboring tests. At infrastructure level, monitor NTP synchronization and use isolated environments for clock-fault exercises.

Simulate a server moving backward across a boundary. A strict highest-counter replay record should prevent old counters from becoming valid again. Simulate moving forward several steps and returning; decide whether future accepted counters make normal current codes unusable until time catches up. This is one reason large positive windows are risky.

When multiple regions validate against shared replay state, test network partitions and write consistency. Availability and one-time semantics can conflict. Document whether a region fails closed, uses a strongly consistent store, or accepts a bounded replay risk. Do not imply exact once-only behavior if the architecture cannot provide it.

## Compare adjacent authentication factors accurately

TOTP has broad authenticator support and works offline, but it is phishable and depends on a shared secret. Alternatives change both threat model and test plan.

| Factor | Clock dependence | Phishing resistance | Distinct test focus |
|---|---:|---:|---|
| TOTP authenticator | Yes | Low | Windows, replay, provisioning secret |
| HOTP token | Counter, not clock | Low | Counter resynchronization and advancement |
| SMS code | Provider expiry clock | Low | Delivery, SIM-swap risk, resend lifecycle |
| Push approval | No user code clock | Varies | Number matching, device binding, fatigue |
| WebAuthn passkey | No | High when verified correctly | Origin, RP ID, challenge, authenticator state |
| Recovery code | No | Low if copied | Single use, secure display and storage |

Do not call TOTP phishing-resistant. A real-time phishing proxy can relay a currently valid code. Sensitive systems may use passkeys or hardware-backed WebAuthn while retaining TOTP as a recovery or compatibility factor, with assurance recorded in the session.

## Frequently Asked Questions

### What does a TOTP validation window of 1 accept?

It searches the previous, current, and next counters and returns the matched delta in libraries such as OTPAuth. The exact wall-clock skew tolerated depends on where both clocks sit relative to a period boundary.

### Should the same correct code work twice during its 30-second period?

For a one-time authentication policy, no. Store the accepted counter and reject reuse with an atomic conditional update. Token mathematics alone does not enforce one-time consumption.

### How do I test clock skew without changing the CI host time?

Pass explicit millisecond timestamps to generation and validation APIs, or inject a clock into the application verifier. Reserve operating-system clock changes for isolated infrastructure experiments.

### Can I increase the window to solve user clock problems?

You can, but every additional counter widens the accepted candidate set and does not repair replay or throttling. Measure matched deltas, fix server synchronization, and choose the smallest window supported by user evidence.

### Why must a TOTP code remain a string?

Six-digit codes can begin with zero. Numeric parsing drops leading zeros and may accept formats the protocol does not intend. Validate exact length and digit characters while retaining the string representation.
`,
};
