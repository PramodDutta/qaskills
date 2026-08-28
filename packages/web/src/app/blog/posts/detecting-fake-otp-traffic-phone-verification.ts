import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Detecting Fake OTP Traffic on Phone Verification Forms',
  description: 'Learn the best way to detect fake OTP traffic on phone verification forms using conversion signals, velocity rules, and QA-ready tests before spend spikes.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Detecting Fake OTP Traffic on Phone Verification Forms

The best way to detect fake OTP traffic on phone verification forms is to correlate send volume, verification success rate, phone reputation, IP behavior, country cost, retry cadence, and account intent in one risk score before sending the message. Do not rely on CAPTCHA or a single rate limit. Fake OTP traffic is usually profitable abuse, so the attacker adapts as soon as one control becomes predictable.

For QA teams, the job is not only to test that a six-digit code works. The job is to prove the system refuses wasteful sends, slows suspicious retries, flags low-conversion destinations, and preserves enough evidence for fraud review. Twilio calls this class SMS pumping or artificially inflated traffic: attackers exploit signup or OTP flows to send high message volume to numbers they control or monetize. Official reference: https://www.twilio.com/docs/verify/preventing-toll-fraud

## The Detection Model That Works in Production

Fake OTP detection works when it combines pre-send controls and post-send feedback. Pre-send controls ask whether this request deserves a message. Post-send feedback asks whether sent messages are turning into successful verifications. Fraud hides in the gap between those two questions.

A good phone verification system records an OTP request as an event before it talks to the SMS provider. The event includes normalized phone number, country, carrier or line type when available, IP, user agent, device id, session id, account id if present, route, campaign source, and whether the request eventually verified. With that dataset, QA can build deterministic tests instead of checking the provider dashboard by hand.

| Signal | Healthy Pattern | Suspicious Pattern | Test Assertion |
|---|---|---|---|
| Send to verify ratio | Most sends verify within the expected window | Many sends, few or no successful checks | Alert when conversion drops below policy threshold |
| Country mix | Matches product availability and recent campaigns | New expensive destinations appear suddenly | Block or step-up countries outside allowlist |
| IP velocity | A few numbers per IP per hour | Many numbers from one IP range | Throttle before provider call |
| Phone velocity | Few OTP requests per number | Repeated sends without checks | Apply exponential delay |
| Number shape | Diverse real user numbers | Sequential prefixes or adjacent ranges | Flag range walking |
| Account context | User continues onboarding | OTP send is the only action | Score as low intent |

The number thresholds are product choices. Do not copy someone else's limits. A bank, a developer tool, a marketplace, and a gaming signup funnel have different false-positive costs. What QA can insist on is the mechanism: every threshold must be configurable, observable, and covered by tests.

## Build a Minimal Event Ledger First

Most weak OTP defenses fail because the application cannot answer basic questions after an incident. How many OTPs were sent to a country in the last hour? How many verified? Which IPs drove the sends? Did those sessions ever create useful accounts? If your logs cannot answer those questions, a smarter model will not save you.

Start with an append-only ledger. It can live in your application database, analytics warehouse, or fraud service. The schema below is intentionally plain SQL. It avoids provider-specific assumptions and gives test automation a stable surface.

\`\`\`sql
CREATE TABLE otp_events (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  country_code TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  session_id TEXT NOT NULL,
  account_id TEXT,
  provider_request_id TEXT,
  risk_score INTEGER NOT NULL,
  decision TEXT NOT NULL
);

CREATE INDEX otp_events_phone_time ON otp_events (phone_e164, created_at);
CREATE INDEX otp_events_ip_time ON otp_events (ip_address, created_at);
CREATE INDEX otp_events_country_time ON otp_events (country_code, created_at);
\`\`\`

The event_type should include request_started, send_allowed, send_blocked, verification_passed, verification_failed, and provider_error. The decision should be allow, throttle, block, step_up, or observe. QA can then assert both user behavior and fraud telemetry in the same test.

Here is a tiny Node risk scorer that runs as written and demonstrates the shape without external packages:

\`\`\`javascript
function scoreOtpRequest(input) {
  let score = 0;
  if (input.ipRequestsLastHour > 5) score += 30;
  if (input.phoneRequestsLastHour > 2) score += 25;
  if (input.countryAllowed === false) score += 50;
  if (input.recentVerifyRate < 0.2 && input.countrySendsLastHour > 20) score += 35;
  if (input.sequentialRangeHits > 3) score += 20;

  if (score >= 70) return { score, decision: 'block' };
  if (score >= 40) return { score, decision: 'throttle' };
  return { score, decision: 'allow' };
}

const result = scoreOtpRequest({
  ipRequestsLastHour: 8,
  phoneRequestsLastHour: 1,
  countryAllowed: true,
  recentVerifyRate: 0.1,
  countrySendsLastHour: 30,
  sequentialRangeHits: 0
});

console.log(result);
\`\`\`

This is not a fraud product. It is a contract. Your production scorer can be provider-backed, ML-backed, rules-backed, or a hybrid. The QA contract remains the same: identical inputs must produce explainable decisions, and high-risk sends must stop before the SMS provider charges you.

## Pre-Send Gates: Spend Money Only After Checks Pass

The first control point is before the OTP is sent. Once the message leaves your system, the attacker has already extracted value from your flow. That does not mean every suspicious request should be blocked. It means the system should choose among allow, delay, deny, or step-up before paying for SMS.

Good pre-send gates are boring. They use country permissions, route eligibility, per-IP velocity, per-phone velocity, per-session velocity, account reputation, and phone intelligence where available. They also respect product reality. If you launch in India and the United States, a sudden burst to a costly destination outside those markets deserves a different path than a normal launch-country spike after a campaign.

| Gate | Example Decision | False Positive Risk | QA Scenario |
|---|---|---|---|
| Country allowlist | Block unsupported destinations | Travelers and edge launches | Supported country passes, unsupported country blocks |
| Retry delay | Delay repeated sends to same phone | Users with poor reception | Second resend shows timer, provider not called |
| IP velocity | Throttle many phones from one IP | Offices, schools, mobile NAT | Known shared IP has higher policy or step-up |
| Account age | Limit sends from new anonymous sessions | Legitimate new users | Authenticated user gets different quota |
| Phone lookup | Step-up VOIP or high-risk line types | Some users only have VOIP | VOIP path uses alternate verification |

An API-level test should assert that a blocked decision does not call the SMS adapter. This is where mocks earn their keep.

\`\`\`typescript
type OtpDecision = 'allow' | 'throttle' | 'block';

type OtpRequest = {
  phone: string;
  country: string;
  ipRequestsLastHour: number;
  phoneRequestsLastHour: number;
};

function decide(request: OtpRequest): OtpDecision {
  if (request.country !== 'US' && request.country !== 'IN') return 'block';
  if (request.phoneRequestsLastHour >= 3) return 'throttle';
  if (request.ipRequestsLastHour >= 10) return 'throttle';
  return 'allow';
}

function shouldSendSms(request: OtpRequest): boolean {
  return decide(request) === 'allow';
}

const suspicious = {
  phone: '+15555550100',
  country: 'US',
  ipRequestsLastHour: 12,
  phoneRequestsLastHour: 0
};

if (shouldSendSms(suspicious)) {
  throw new Error('Expected high IP velocity to stop SMS send');
}
\`\`\`

Notice the assertion is about spend prevention, not just response status. A 429 response that still sends the OTP is a billing bug disguised as a security feature.

## Post-Send Signals: Conversion Rate Is a Fraud Sensor

OTP verification has a built-in truth signal: did the recipient verify? Real users usually request a code because they want to continue. Fake traffic often sends many messages and completes few verifications. That makes conversion rate one of the strongest fraud sensors.

Measure conversion by country, carrier, IP range, route, campaign, and account cohort. A global conversion metric hides attacks. A country-level metric finds them faster. A route-level metric separates signup abuse from login friction. A carrier-level metric helps provider and fraud teams communicate.

\`\`\`sql
SELECT
  country_code,
  COUNT(CASE WHEN event_type = 'send_allowed' THEN 1 END) AS sends,
  COUNT(CASE WHEN event_type = 'verification_passed' THEN 1 END) AS verifies,
  ROUND(
    1.0 * COUNT(CASE WHEN event_type = 'verification_passed' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN event_type = 'send_allowed' THEN 1 END), 0),
    3
  ) AS verify_rate
FROM otp_events
WHERE created_at >= '2026-08-27T00:00:00Z'
GROUP BY country_code
ORDER BY sends DESC;
\`\`\`

QA can seed this data and test the alert logic without sending a single SMS. Use illustrative thresholds in tests, then set production thresholds from historical traffic.

\`\`\`javascript
function countriesToInvestigate(rows) {
  return rows
    .filter((row) => row.sends >= 20)
    .filter((row) => row.verifyRate < 0.15)
    .map((row) => row.country);
}

const flagged = countriesToInvestigate([
  { country: 'US', sends: 120, verifyRate: 0.72 },
  { country: 'GB', sends: 42, verifyRate: 0.69 },
  { country: 'ZZ', sends: 38, verifyRate: 0.03 }
]);

if (flagged.join(',') !== 'ZZ') {
  throw new Error('Expected low-conversion country to be flagged');
}
\`\`\`

What people get wrong: they alert on send volume alone. A product launch can create real volume. An outage in SMS delivery can create low verification. Fake OTP traffic is the pattern that joins volume, cost, destination surprise, and weak completion. Single-signal alerting creates noise, and noisy fraud alerts eventually get ignored.

## Test the UX Without Teaching Attackers the Rules

The user experience should slow abuse without exposing the exact policy. A normal user can understand "Try again in 30 seconds." An attacker should not receive "blocked because IP has 11 requests in one hour and country risk score is 35." Keep the public response coarse and the internal event rich.

Good QA covers both layers. The API response should be safe to show. The telemetry should be precise enough for incident response.

| Scenario | Public Response | Internal Event |
|---|---|---|
| First valid request | OTP sent | decision allow, score low |
| Fast resend | Please wait before requesting another code | decision throttle, reason phone_velocity |
| Unsupported country | Verification is not available for this number | decision block, reason country_denied |
| High-risk IP burst | Please try again later | decision throttle or block, reason ip_velocity |
| Provider fraud block | We could not send a code right now | provider decision captured with request id |

Here is a Playwright API test that checks the split:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('high velocity OTP request is throttled without sending SMS', async ({ request }) => {
  const first = await request.post('/test/reset-otp-state', {
    data: { phone: '+15555550123', ipRequestsLastHour: 12 }
  });
  expect(first.ok()).toBeTruthy();

  const response = await request.post('/api/otp/send', {
    data: { phone: '+15555550123' }
  });
  expect(response.status()).toBe(429);
  expect(await response.json()).toEqual({ message: 'Please try again later' });

  const ledger = await request.get('/test/otp-events?phone=%2B15555550123');
  expect(ledger.ok()).toBeTruthy();
  const events = await ledger.json();
  expect(events.at(-1)).toMatchObject({
    event_type: 'send_blocked',
    decision: 'throttle'
  });
});
\`\`\`

The endpoint names under /test are test-only helpers. In a real service, protect them behind a test environment flag. Do not expose fraud state mutation to production clients.

## Provider Signals and Your Own Signals Must Agree

SMS providers can block suspicious traffic, but they cannot fully understand your product intent. They see message patterns. You see user journeys. Combine both. Twilio recommends fraud guard features, geographic permissions, retry delays, rate limits, bot detection, phone number lookup, conversion monitoring, IP and VPN analysis, and unused-channel shutdown. Those are not substitutes for application telemetry. They are layers.

Provider logs are especially useful when your application says "we did the right thing" but spend still climbs. If provider requests exist after your app says "blocked", you have an adapter bypass, retry bug, queue replay, or background worker path that skips the decision service.

\`\`\`yaml
otp_fraud_policy:
  supported_countries:
    - US
    - IN
    - GB
  phone_retry_delays_seconds:
    first: 0
    second: 30
    third: 120
  max_ip_requests_per_hour: 8
  max_phone_requests_per_hour: 3
  low_conversion_alert:
    minimum_sends: 50
    verify_rate_below: 0.2
  provider_required: true
\`\`\`

Keep policy in config, not scattered constants. That gives QA a stable way to test country expansion, emergency blocklists, and temporary campaign exceptions.

## Failure Story: The 429 That Still Sent Messages

The symptom was a sudden billing spike overnight. The fraud dashboard showed many OTP requests from a small set of IP ranges to an expensive country. The first theory was that rate limiting was not enabled. The team checked the API gateway and found plenty of 429 responses, so the incident was blamed on provider-side delayed reporting.

The actual cause was inside the application. The route created a send job before the rate-limit check returned. Under normal load, the job ran after the user received a success response. Under attack load, the route returned 429 but the queued job still called the SMS provider. The public API looked protected. The bill proved it was not.

The fix was to move the risk decision before job creation, add an idempotency key per phone and purpose, and create a test that asserts no provider_request_id exists after throttle. The lesson is blunt: never test OTP abuse only at the HTTP layer. Test the side effect.

## A QA Workflow for Fake OTP Traffic

Build a test pack that exercises spend, state, and observability.

1. Unit-test the risk scorer with boundary values around every threshold.
2. API-test that block and throttle decisions do not call the SMS adapter.
3. E2E-test the resend timer and user-safe messages.
4. Seed analytics events and test conversion-rate alerts.
5. Replay provider webhooks and verify the ledger updates.
6. Run a small k6 or API load test against staging with provider calls disabled.
7. Verify dashboards show country, IP, phone, route, and provider status.

The load test can be simple and still useful:

\`\`\`javascript
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';
import { check } from 'k6';

export const blockedRate = new Rate('otp_blocked_rate');
export const requestTime = new Trend('otp_request_time');

export const options = {
  vus: 5,
  iterations: 50
};

export default function () {
  const phone = '+15555550' + String(100 + __ITER);
  const res = http.post('http://localhost:3000/api/otp/send', JSON.stringify({ phone }), {
    headers: { 'Content-Type': 'application/json' }
  });
  requestTime.add(res.timings.duration);
  blockedRate.add(res.status === 429 || res.status === 403);
  check(res, {
    'returns controlled status': (r) => [200, 202, 403, 429].includes(r.status)
  });
}
\`\`\`

Run this only against a staging adapter that cannot send real SMS. A test that accidentally generates billable OTPs is not a test. It is a production incident with a nicer filename.

For broader flow coverage, pair this detector with [Testing OTP SMS Phone Flows: A Complete Guide](/blog/testing-otp-sms-phone-flows-complete-guide). If your product also supports email sign-in, compare the fraud and expiry assumptions in [Testing Passwordless Email Magic Link Flow](/blog/testing-passwordless-email-magic-link-flow). Phone and email verification share state-machine risks, but phone verification adds spend exposure.

## Incident Runbook for a Suspected OTP Pump

When a billing alert fires, the first hour matters. Do not start by changing every limit. Start by freezing evidence and narrowing the blast radius. Pull sends by country, provider, route, IP range, and verification outcome for the alert window. Compare it with the same hour one day earlier and one week earlier. Then disable unsupported destinations, reduce resend quotas, and turn on provider-side fraud controls if they are available but not already active.

The runbook should name owners. QA owns reproduction and regression coverage. Engineering owns the decision path and adapter side effects. Fraud or operations owns provider contact and country policy. Support owns user messaging. Finance owns spend tracking. Without clear ownership, teams lose time debating whether the spike is fraud, growth, provider delay, or analytics lag.

| Runbook Step | Question | Evidence |
|---|---|---|
| Freeze timeline | When did sends diverge from baseline? | Provider usage, app ledger, deploy log |
| Segment traffic | Which countries, IP ranges, and routes moved? | Grouped event query |
| Check completion | Did users verify and continue onboarding? | Verification pass events and account actions |
| Contain spend | Which sends can be blocked without harming core markets? | Country allowlist and campaign calendar |
| Add regression | Which missing test would have caught this? | New failing test before fix |

Here is a plain query for the first cut. It uses illustrative time bounds. Replace them with the alert window from your monitoring system:

\`\`\`sql
SELECT
  country_code,
  decision,
  COUNT(*) AS events
FROM otp_events
WHERE created_at >= '2026-08-27T01:00:00Z'
  AND created_at < '2026-08-27T02:00:00Z'
GROUP BY country_code, decision
ORDER BY events DESC;
\`\`\`

The containment fix should be reversible. A hard-coded country block added during an incident often survives for months and breaks a later launch. Put temporary controls in policy config with an owner and expiry date. QA should add a test that fails when an expired temporary rule remains active.

## Agent Prompts That Produce Useful OTP Tests

AI agents can write a lot of OTP tests quickly, but the first prompt determines whether those tests check real risk or only happy paths. Give the agent the state machine and the side effects. Tell it to prove that blocked requests do not call the provider, delayed requests do not create jobs, and verification failures still preserve audit evidence.

Use a prompt shaped like this:

\`\`\`text
Read the OTP send and verify routes, the SMS adapter, the job queue producer, and the fraud policy config.
Create tests for country block, phone retry delay, IP velocity, low conversion alert input, provider error, and successful verification.
Every negative test must assert no provider send happened and an otp_events row was written.
Do not add CAPTCHA tests unless the existing product already has CAPTCHA.
\`\`\`

That last sentence matters. Agents love adding visible controls because they are easy to test. Fake OTP traffic is mostly an economics problem. A visible puzzle that still allows the SMS send before risk scoring has not protected the business.

## Data Retention and Privacy Boundaries

OTP fraud logs are sensitive. They contain phone numbers, IP addresses, device identifiers, and security decisions. Keep enough detail to investigate abuse, but avoid turning the ledger into a permanent pile of personal data. Hash or tokenize values in analytics views where exact lookup is not needed. Keep raw phone numbers in the operational system only as long as support, fraud review, and legal requirements justify it.

QA should test privacy behavior too. Export endpoints should redact phone numbers. Dashboards should show country and prefix trends without exposing full numbers to every viewer. Test fixtures should use reserved or fake numbers, never real customer numbers copied from production. A fraud system that stops spend while leaking phone data has traded one incident for another.

## Monitoring That QA Can Assert

Fraud monitoring should be testable. A dashboard screenshot is not enough because visual checks can miss missing segments, bad filters, and silent query failures. Add automated checks for the underlying metrics that drive alerts. At minimum, QA should verify total sends, blocked sends, throttled sends, verification passes, provider errors, country grouping, and conversion rate calculation. If any metric is derived, test the derivation with seeded data.

The most useful alert is not "OTP traffic is high." It is "OTP sends to a segment are high, verification is low, and the segment does not match an expected launch, outage, or campaign." That alert needs context fields. Include current value, baseline value, affected countries, top IP ranges, top routes, and a link to provider logs when your tooling supports it. A responder should be able to decide containment from the alert body without opening five dashboards.

QA should also test alert suppression. During a known marketing campaign, a supported country may spike legitimately. During a provider outage, verification may fall across many countries at once. During a bot attack, traffic often concentrates in routes and number ranges. Suppression logic should be explicit and temporary. Hidden "ignore this country forever" filters become blind spots.

Synthetic monitoring helps when real traffic is quiet. Run a scheduled non-billable check through the fake adapter that creates a normal OTP request, a throttled retry, and a blocked unsupported country. Assert that the ledger and metrics pipeline receive all three. That gives you confidence the detector still works before the next attack, not only after a bill has already moved.

## Product Decisions That Shape Detection

Detection quality depends on product choices that are easy to overlook. Do users need phone verification at signup, or can it move later after stronger intent is shown? Do you support voice fallback, and if so, is it disabled by default for new anonymous sessions? Do you allow every country because the provider can send there, or only countries where the product operates? Each answer changes fraud exposure.

QA should push these questions into acceptance criteria. A story that says "add phone verification" is incomplete. It should say which countries are allowed, what happens after failed sends, how many retries are permitted, which channels exist, what the user sees when blocked, and which events must be written. That level of detail is not bureaucracy. It is how you prevent a simple input field from becoming an open spend endpoint.

One more product choice matters: when to stop offering SMS. If a user has failed repeated phone checks but has a trusted email, passkey, or support-assisted path, forcing more SMS attempts helps the attacker more than the user. QA should test alternate recovery routes so fraud controls do not become account lockout machines.

## Frequently Asked Questions

### Is CAPTCHA enough to stop fake OTP traffic?

No. CAPTCHA can slow basic automation, but it does not prove a phone verification request is economically safe. Attackers can use solver services, compromised browsers, or low-cost human labor. More importantly, CAPTCHA does not understand country cost, verification conversion, number ranges, or provider feedback. Use it only as one possible step-up control, and still score the OTP request before sending SMS.

### What metric catches SMS pumping fastest?

A sharp drop in OTP verification rate for a destination segment is often the fastest useful signal, especially when joined with send volume and country cost. Send volume alone creates false alarms during campaigns. Verification rate alone creates false alarms during provider outages. The stronger detector asks: are we sending many codes to an unusual segment, and are those codes failing to become verified users?

### Should blocked users see the real fraud reason?

No. Public responses should be coarse and user-safe. Internal events should be detailed. If the API says "blocked because this IP requested 11 numbers in one hour", attackers can tune around the limit. Show messages such as "Please try again later" or "Verification is not available for this number." Store precise reasons in logs and dashboards for QA, support, and fraud review.

### How do QA engineers test without sending real SMS?

Use a fake SMS adapter in automated tests and a provider sandbox or restricted staging account for integration checks. Assert the side effect, not only the response. A blocked request should have no provider request id, no queued send job, and a ledger event that explains the decision. For conversion alerts, seed the event table directly and test the alert query without contacting the provider.
`,
};
