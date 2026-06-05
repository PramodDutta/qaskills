import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing OTP, SMS & Phone Number Flows: Complete Guide 2026',
  description:
    'A tool-agnostic guide to testing OTP, SMS, 2FA and phone-number flows: Twilio test credentials, mock gateways, and deterministic codes with Playwright, Selenium and Robot Framework.',
  date: '2026-06-05',
  category: 'Guide',
  content: `
# Testing OTP, SMS & Phone Number Flows: Complete Guide 2026

One-time passcodes delivered by SMS guard the front door of almost every modern application — signup, login, password reset, payment confirmation, and step-up authentication all hinge on a short numeric code arriving on a phone. For a human this is trivial: glance at the notification, type six digits, done. For an automated test suite it is one of the genuinely hard problems, because CI infrastructure does not hold a phone and cannot read a push notification. Yet skipping OTP coverage leaves the most security-critical path in your product untested. The solution is to make the SMS *reachable to your test as data* — through a programmable phone number, a mock gateway, or a deterministic code in non-production environments.

This guide is a complete, tool-agnostic playbook for testing OTP, SMS, 2FA, and phone-number flows in 2026. We cover four strategies — Twilio test credentials, a real programmable receiving number, a mock SMS gateway, and deterministic test-mode codes — and then show concrete implementations across Playwright (TypeScript), Selenium (Python), and Robot Framework, including how to poll an inbox API with the Twilio \`date_sent_after\` filter and extract the code with a regex. Every snippet is runnable. If you searched for "playwright phone number testing," "robot framework sms testing," "password reset testing robot framework," or "date_sent_after twilio python," you are in the right place.

The unifying idea is simple and worth stating up front: the SMS is just a piece of data sitting in some provider's store, and your test needs a *seam* to reach in and grab it. Pick the seam that matches your environment. For installable QA skills and related deep dives, browse the [skills directory](/skills) and the [blog](/blog), especially the [Twilio SMS/OTP testing in Python guide](/blog/twilio-sms-otp-testing-python-guide) and the [Robot Framework SMS OTP testing guide](/blog/robot-framework-sms-otp-testing-complete-guide).

## The Four Strategies for Testing OTP

There is no single right way to test an SMS code; there are four, and the best choice depends on whether you control the application's test environment and whether you need a real end-to-end path. Understanding all four lets you pick deliberately instead of defaulting to whatever you saw first.

The **deterministic test-mode code** approach is the cheapest and most reliable: in non-production environments, the application is configured to always issue a known code (e.g. \`000000\`) or to expose the generated code through a test-only endpoint. No real SMS is sent. The **real receiving number** approach uses a programmable number (Twilio, Vonage, MessageBird) that actually receives the SMS, which your test then pulls back via the provider's API — a true end-to-end path including the real SMS provider. The **mock SMS gateway** approach points your application's SMS sending at a fake server you control, which records messages for the test to read. The **provider test credentials** approach (Twilio's magic test numbers) lets you exercise the *sending* code path without delivering real messages or incurring cost.

| Strategy | Real SMS sent? | Cost | Determinism | Best for |
|---|---|---|---|---|
| Deterministic test code | No | Free | Highest | Owned test envs, CI |
| Real receiving number | Yes | Per message | Medium (async) | True end-to-end smoke |
| Mock SMS gateway | No | Free | High | Offline CI, isolation |
| Provider test credentials | No (simulated) | Free | High | Verifying send code path |

A mature suite mixes these: deterministic codes for the bulk of functional tests, one or two real-number tests as a periodic end-to-end smoke check, and mocks for offline CI. Never test against production by triggering real codes to real users.

## Twilio Test Credentials and Magic Numbers

If your application sends via Twilio, the official **test credentials** are the fastest way to verify the *sending* path without delivering messages or paying. Twilio provides a separate Test Account SID and Auth Token, plus "magic" phone numbers that trigger specific outcomes. A request made with test credentials is validated and logged but never actually sends an SMS.

\`\`\`python
# twilio_test_creds.py — verify send logic with TEST credentials
import os
from twilio.rest import Client

# These are the TEST SID/token from the Twilio console, not the live ones.
client = Client(os.environ["TWILIO_TEST_SID"], os.environ["TWILIO_TEST_TOKEN"])

# Magic 'from' number that Twilio accepts in test mode:
TEST_FROM = "+15005550006"  # valid, SMS-capable test sender

def send_otp(to: str, code: str):
    return client.messages.create(
        to=to,
        from_=TEST_FROM,
        body=f"Your code is {code}",
    )

# A magic 'to' number that simulates an invalid destination:
INVALID_TO = "+15005550001"  # Twilio returns error 21211 in test mode
\`\`\`

Use test credentials to assert that your application *attempts* to send the right message with the right parameters and handles Twilio errors (invalid number, unsubscribed recipient) correctly. They do not help you read an inbound code — for that you need a real number, covered next.

## Polling a Real Inbox with date_sent_after

For a genuine end-to-end test, provision a real Twilio number that can receive SMS, trigger the application to send a code to it, then poll Twilio's API for the inbound message. The critical correctness detail is timing: SMS is asynchronous, so you must record a timestamp *before* triggering the send and pass it as \`date_sent_after\` when listing messages. That floor guarantees you never pick up a stale code from a previous run.

\`\`\`python
# poll_otp.py — fetch a fresh OTP from a real Twilio inbox
import os, re, time
from datetime import datetime, timezone, timedelta
from twilio.rest import Client

client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
RECEIVING_NUMBER = os.environ["TWILIO_RECEIVING_NUMBER"]  # the number under your control

def wait_for_otp(since: datetime, timeout_s: int = 60, interval_s: int = 3) -> str:
    """Poll Twilio for an inbound SMS newer than 'since' and return the 6-digit code."""
    deadline = time.time() + timeout_s
    # A tiny clock-skew cushion avoids missing a message sent at exactly 'since'.
    floor = since - timedelta(seconds=5)
    while time.time() < deadline:
        messages = client.messages.list(
            to=RECEIVING_NUMBER,
            date_sent_after=floor,
            limit=20,
        )
        for msg in messages:
            match = re.search(r"\\b(\\d{6})\\b", msg.body or "")
            if match:
                return match.group(1)
        time.sleep(interval_s)
    raise TimeoutError("No OTP arrived within the timeout window")

# Usage:
since = datetime.now(timezone.utc)
# ... trigger the app to send the code to RECEIVING_NUMBER here ...
code = wait_for_otp(since)
\`\`\`

Two things make this robust. First, recording \`since\` *before* the trigger eliminates the race where a stale message satisfies the query. Second, the regex \`\\b(\\d{6})\\b\` extracts exactly a six-digit token; tighten or loosen the digit count to match your code format, and prefer a pattern anchored to surrounding text (e.g. \`code is (\\d{6})\`) if multiple numbers can appear in the body. For a deeper Twilio-specific treatment, see the [Twilio SMS/OTP testing in Python guide](/blog/twilio-sms-otp-testing-python-guide).

## Mock SMS Gateways for Offline CI

Real numbers cost money and add network flakiness to CI. A mock SMS gateway removes both: you run a tiny HTTP server that mimics the SMS provider's send endpoint, point the application's provider configuration at it in test mode, and read back the captured messages from the mock. This keeps the whole flow offline and deterministic.

\`\`\`python
# mock_sms_server.py — minimal in-memory SMS sink (FastAPI)
from fastapi import FastAPI, Request
import re

app = FastAPI()
SENT: list[dict] = []

@app.post("/Messages")               # mimic the provider's send path
async def send(request: Request):
    form = await request.form()
    SENT.append({"to": form.get("To"), "body": form.get("Body")})
    return {"sid": f"SM{len(SENT):032d}", "status": "queued"}

@app.get("/inbox/{to}")              # test-only helper to read back
async def inbox(to: str):
    msgs = [m for m in SENT if m["to"] == to]
    return {"messages": msgs}

def latest_code(to: str) -> str | None:
    for m in reversed(SENT):
        if m["to"] == to:
            found = re.search(r"\\d{6}", m["body"] or "")
            if found:
                return found.group(0)
    return None
\`\`\`

Run this mock as a fixture, set the application's SMS base URL to \`http://localhost:8000\` for the test run, and your tests read codes from the in-memory store instantly. The same idea applies to email OTP with a mock SMTP sink. The trade-off is fidelity: you are not exercising the real provider, so keep a thin real-number smoke test to catch provider-side regressions.

## Playwright: Phone Number Flows in TypeScript

Playwright drives the browser; the OTP retrieval is a separate async call you await between UI steps. The pattern is: fill the phone field, click "send code," then call your retrieval helper (real Twilio poll or mock read), then type the code. Here is a complete password-reset flow.

\`\`\`typescript
// otp.spec.ts
import { test, expect } from '@playwright/test';
import { fetchLatestOtp } from './otp-helper';

test('password reset via SMS OTP', async ({ page }) => {
  const phone = process.env.TEST_PHONE!;        // the receiving number

  await page.goto('https://app.example.com/forgot-password');
  await page.getByLabel('Phone number').fill(phone);

  const sinceIso = new Date().toISOString();     // record BEFORE triggering
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByText('Code sent')).toBeVisible();

  // Retrieve the code out-of-band (Twilio poll or mock read):
  const code = await fetchLatestOtp(phone, sinceIso);

  await page.getByLabel('Verification code').fill(code);
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/reset-password/);
});
\`\`\`

The retrieval helper isolates the seam so tests stay readable. Below it polls a mock inbox; swapping in a Twilio call is a one-line change.

\`\`\`typescript
// otp-helper.ts
export async function fetchLatestOtp(to: string, sinceIso: string): Promise<string> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const res = await fetch(\`http://localhost:8000/inbox/\${encodeURIComponent(to)}\`);
    const data = await res.json();
    for (const m of [...data.messages].reverse()) {
      const match = (m.body as string).match(/\\b(\\d{6})\\b/);
      if (match && new Date(m.sentAt) >= new Date(sinceIso)) return match[1];
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('OTP did not arrive in time');
}
\`\`\`

For more Playwright patterns, see the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide).

## Selenium: OTP Verification in Python

Selenium follows the same shape: drive the UI, retrieve the code out-of-band, type it. Reusing the \`wait_for_otp\` helper from earlier keeps the test focused on the user journey.

\`\`\`python
# test_otp_selenium.py
from datetime import datetime, timezone
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from poll_otp import wait_for_otp, RECEIVING_NUMBER

def test_login_with_sms_otp():
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 15)
    try:
        driver.get("https://app.example.com/login")
        driver.find_element(By.NAME, "phone").send_keys(RECEIVING_NUMBER)

        since = datetime.now(timezone.utc)            # record BEFORE clicking
        driver.find_element(By.ID, "send-code").click()
        wait.until(EC.visibility_of_element_located((By.ID, "otp-input")))

        code = wait_for_otp(since)                     # out-of-band retrieval
        driver.find_element(By.ID, "otp-input").send_keys(code)
        driver.find_element(By.ID, "verify").click()

        wait.until(EC.url_contains("/dashboard"))
        assert "/dashboard" in driver.current_url
    finally:
        driver.quit()
\`\`\`

The explicit \`WebDriverWait\` between sending and entering the code matters: the input field may render only after the send succeeds. For broader Selenium guidance, see the [Selenium Python tutorial](/blog/selenium-python-tutorial-2026).

## Robot Framework: SMS and Password-Reset Keywords

Robot Framework shines here because the polling logic collapses into a single \`Wait Until Keyword Succeeds\`, and OTP retrieval becomes a reusable keyword. Below is a password-reset suite that retrieves the code from Twilio via a small Python library. Note Robot's variable syntax uses the dollar-brace form.

\`\`\`robotframework
*** Settings ***
Library    SeleniumLibrary
Library    OtpLibrary.py        # wraps wait_for_otp() from earlier

*** Variables ***
\${URL}        https://app.example.com/forgot-password
\${PHONE}      %{TEST_PHONE}

*** Test Cases ***
Password Reset Via SMS OTP
    Open Browser    \${URL}    chrome
    Input Text      id=phone   \${PHONE}
    \${since}=       Get Current Utc Time
    Click Button    id=send-code
    Wait Until Element Is Visible    id=otp-input    timeout=15s
    \${code}=        Wait Until Keyword Succeeds    60s    3s
    ...                 Get Latest Otp    \${PHONE}    \${since}
    Input Text      id=otp-input    \${code}
    Click Button    id=verify
    Wait Until Location Contains    /reset-password
    [Teardown]      Close Browser
\`\`\`

The supporting Python library exposes the two custom keywords Robot calls.

\`\`\`python
# OtpLibrary.py
from datetime import datetime, timezone
from poll_otp import wait_for_otp

def get_current_utc_time():
    return datetime.now(timezone.utc)

def get_latest_otp(phone: str, since):
    # Raises on timeout so Wait Until Keyword Succeeds retries cleanly.
    return wait_for_otp(since)
\`\`\`

\`Wait Until Keyword Succeeds\` is the idiomatic Robot polling primitive: it retries \`Get Latest Otp\` every 3 seconds for up to 60 seconds, which maps perfectly onto the asynchronous nature of SMS. For more, see the [Robot Framework SMS OTP testing guide](/blog/robot-framework-sms-otp-testing-complete-guide).

## Edge Cases and Security Considerations

OTP flows have failure modes a happy-path test will miss. Cover them deliberately. **Expiry**: request a code, wait past its TTL, and assert the application rejects it. **Rate limiting**: trigger repeated sends and assert the app throttles after the configured threshold. **Wrong code**: submit an incorrect code and assert a clear error without leaking whether the phone number exists. **Resend**: assert a resend invalidates the previous code (or does not, per spec) and that you read the *newest* message. **Replay**: assert a consumed code cannot be reused.

| Edge case | What to assert |
|---|---|
| Expiry | Code past TTL is rejected |
| Rate limiting | Sends throttled after N attempts |
| Wrong code | Generic error, no account enumeration |
| Resend | Newest code is the valid one |
| Replay | Used code cannot be reused |

On security: never log real OTPs in CI output, scope test credentials tightly, and keep a dedicated receiving number (or pool) so concurrent runs do not read each other's codes. Treat the receiving number's credentials as secrets in your CI vault, exactly as you would any production token.

## Email OTP and Magic Links

Not every one-time code arrives by SMS — email OTPs and magic links are just as common, and the testing pattern is structurally identical: the code or link is data sitting in an inbox your test can reach. The two practical approaches mirror the SMS strategies. Use a real test inbox with an IMAP/API interface (Gmail with an app password, or a disposable-inbox service like Mailosaur or MailSlurp), or run a mock SMTP sink that captures outgoing mail in memory.

\`\`\`python
# email_otp.py — fetch a code from a real inbox over IMAP
import imaplib, email, re, time

def wait_for_email_code(host, user, password, subject_contains, timeout_s=60):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        box = imaplib.IMAP4_SSL(host)
        box.login(user, password)
        box.select("INBOX")
        _, ids = box.search(None, f'(SUBJECT "{subject_contains}" UNSEEN)')
        for msg_id in ids[0].split():
            _, data = box.fetch(msg_id, "(RFC822)")
            msg = email.message_from_bytes(data[0][1])
            body = _plain_text(msg)
            match = re.search(r"\\b(\\d{6})\\b", body)
            if match:
                box.store(msg_id, "+FLAGS", "\\\\Seen")  # mark read to avoid re-reads
                return match.group(1)
        box.logout()
        time.sleep(3)
    raise TimeoutError("No email code arrived")

def _plain_text(msg):
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                return part.get_payload(decode=True).decode(errors="ignore")
    return msg.get_payload(decode=True).decode(errors="ignore")
\`\`\`

For magic links, extract the URL with a regex instead of a numeric code, then navigate to it directly in Playwright or Selenium to complete authentication. Marking each processed message as read (the \`+FLAGS \\Seen\` step) is the email equivalent of the SMS \`date_sent_after\` floor: it prevents a stale message from a previous run satisfying the next query.

| Flow | Where the secret lives | How the test extracts it |
|---|---|---|
| SMS OTP | Provider inbox (Twilio) | Poll API, regex digits |
| Email OTP | IMAP/API inbox | Search subject, regex digits |
| Magic link | Email body | Regex the URL, navigate to it |
| Authenticator (TOTP) | Shared secret | Compute code from secret |

## Testing TOTP-Based 2FA

Authenticator-app 2FA (Google Authenticator, Authy) uses TOTP — a time-based code derived from a shared secret and the current clock, with no SMS or email involved at all. This is actually the easiest 2FA to automate, because if your test knows the shared secret it can compute the exact same six-digit code the authenticator app would show, deterministically and instantly. No polling, no inbox.

\`\`\`python
# totp.py — compute the current 2FA code from the shared secret
import pyotp

# The base32 secret shown (or encoded in the QR) at enrollment time.
# In tests, enroll a known test account and store this as a secret.
TOTP_SECRET = "JBSWY3DPEHPK3PXP"

def current_2fa_code() -> str:
    return pyotp.TOTP(TOTP_SECRET).now()
\`\`\`

\`\`\`typescript
// totp.ts — same idea in TypeScript with otplib, used in a Playwright test
import { authenticator } from 'otplib';

export function current2faCode(): string {
  return authenticator.generate(process.env.TOTP_SECRET!);
}

// In a test:
// await page.getByLabel('Authenticator code').fill(current2faCode());
\`\`\`

Because the code is computed from the secret and the clock, TOTP tests are fully deterministic and need no external service. The one caveat is clock skew: if the CI runner's clock drifts, the code may be rejected — keep runners time-synced, and prefer enrolling a dedicated test account whose secret you control rather than reusing a human's. This makes authenticator-based 2FA the most CI-friendly second factor of all.

## Frequently Asked Questions

### How do I test SMS OTP without a real phone?

Make the code reachable as data instead of a notification. The most reliable approach is a deterministic test-mode code (the app issues a known code like \`000000\` in non-production), but you can also use a programmable receiving number whose inbox you poll via API, or a mock SMS gateway that captures messages your test reads back. Each removes the need for a physical phone in CI.

### What does date_sent_after do in the Twilio API?

\`date_sent_after\` filters the message list to only messages sent after a given timestamp, which is essential for OTP tests. Record a timestamp *before* triggering the send and pass it as the floor, so you never pick up a stale code from a previous run. Add a small clock-skew cushion of a few seconds to avoid missing a message sent at exactly that moment.

### How do I test a password reset flow in Robot Framework?

Drive the UI with SeleniumLibrary, record a timestamp before clicking "send code," then use \`Wait Until Keyword Succeeds\` to poll a custom \`Get Latest Otp\` keyword that retrieves the code (from Twilio or a mock). Input the code, submit, and assert the URL advances to the reset-password page. The retry primitive maps cleanly onto the asynchronous arrival of the SMS.

### Can I test phone number flows with Playwright?

Yes. Playwright drives the browser, and OTP retrieval is an out-of-band async call you await between UI steps. Fill the phone field, click send, then await a helper that polls a real inbox or a mock, then type the returned code and verify. Keep the retrieval logic in a separate helper so swapping a mock for a real Twilio poll is a one-line change.

### Should I use real SMS in CI?

Mostly no. Run the bulk of your functional tests with deterministic test-mode codes or a mock gateway so CI stays fast, free, and deterministic. Keep one or two real-number end-to-end smoke tests on a slower cadence to catch provider-side regressions. Never trigger real codes to real users, and never test OTP flows against production.

### How do I extract the OTP code from a message body?

Use a regex tuned to your code format. A six-digit token is \`\\b(\\d{6})\\b\`, but if other numbers can appear in the body, anchor to surrounding text such as \`code is (\\d{6})\` to avoid matching the wrong number. Always read the newest matching message and confirm it arrived after your recorded send timestamp before accepting it.

### How do I test OTP expiry and rate limiting?

For expiry, request a code, wait past its configured TTL, submit it, and assert the application rejects it. For rate limiting, trigger repeated sends in quick succession and assert the app throttles after the configured threshold, returning a clear error. Both are easy to test deterministically with a mock gateway because you control timing and can fast-forward by adjusting the app's clock in test mode.

## Conclusion

Testing OTP, SMS, and phone-number flows comes down to choosing the right seam to reach the code: a deterministic test-mode value for everyday functional coverage, a real programmable number for true end-to-end smoke checks, a mock gateway for fast offline CI, and provider test credentials for verifying the send path. Once you have the seam, the framework barely matters — Playwright, Selenium, and Robot Framework all follow the same shape: drive the UI, retrieve the code out-of-band, type it, and assert the outcome. Always record your timestamp before triggering the send, extract the code with a tight regex, and cover expiry, rate limiting, and replay.

Wire one of these patterns into your suite and the most security-critical path in your product stops being a manual step. For installable, agent-ready QA skills, see the [skills directory](/skills); for deeper, tool-specific walkthroughs, continue with the [Twilio SMS/OTP testing in Python guide](/blog/twilio-sms-otp-testing-python-guide) and the [Robot Framework SMS OTP testing guide](/blog/robot-framework-sms-otp-testing-complete-guide) on the [blog](/blog).
`,
};
