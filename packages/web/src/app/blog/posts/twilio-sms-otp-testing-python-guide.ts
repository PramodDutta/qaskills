import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Twilio SMS/OTP Testing in Python: Complete Guide',
  description:
    'Automate SMS and OTP testing in Python with the Twilio API: fetch messages with date_sent_after, extract one-time codes by regex, and verify login end to end.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# Twilio SMS/OTP Testing in Python: Complete Guide

One-time passcodes sent over SMS sit on the critical path of nearly every signup, login, and password-reset flow, yet they are one of the hardest things to test automatically. A human can read the code off their phone in two seconds; an automated suite cannot hold a phone. The standard solution is to receive the OTP on a real, programmatically accessible phone number — a Twilio number — then pull the inbound message back through Twilio's REST API, extract the numeric code with a regex, and feed it into the application under test. Done right, this turns "log in with a real SMS code" from a manual step into a fully automated end-to-end test.

This guide is a complete 2026 walkthrough of SMS and OTP testing in Python using the official \`twilio\` helper library. We cover buying and configuring a number, the message data model, listing inbound messages efficiently with the \`date_sent_after\` filter, polling for a freshly arrived code without race conditions, extracting the OTP with robust regex patterns, and stitching it all into a pytest end-to-end test against a login flow. Every example is runnable Python. Whether you searched for "twilio otp testing python," "fetch twilio sms messages date_sent_after," or "automate sms verification test," this is the reference you want.

If you automate auth flows broadly, the [skills directory](/skills) has installable QA skills for AI coding agents, and the [blog](/blog) covers API testing and end-to-end strategies in depth. The principle behind this technique is simple: an SMS is just data Twilio holds for you, and the REST API is the seam that lets a test reach in, grab that data, and react to it exactly as a user would.

## How SMS OTP Testing Works End to End

The flow has four actors: your test, the application under test (AUT), the SMS provider that the AUT uses to send codes, and Twilio, which owns the phone number that *receives* them. The test triggers an action in the AUT — say, "send me a login code" — passing a Twilio phone number you control as the destination. The AUT generates an OTP and sends it via its own provider to that number. Twilio receives the inbound SMS and stores it. Your test then queries Twilio's API for messages sent to your number after a known timestamp, finds the new one, extracts the digits, and submits them back to the AUT to complete login.

The crucial subtlety is timing. SMS delivery is asynchronous and can take a few seconds. If your test queries Twilio the instant after triggering the send, the message will not be there yet. So the pattern is always: record a "since" timestamp *before* triggering the send, then poll Twilio with that timestamp as a floor until the message appears or a timeout elapses. Recording the timestamp first guarantees you never pick up a stale OTP from a previous test run.

The table maps the moving parts.

| Actor | Role | How the test interacts |
|---|---|---|
| Test | Orchestrator | Triggers send, polls, extracts, submits |
| Application under test | Generates the OTP | Via its API/UI |
| AUT's SMS provider | Delivers the code | Indirect (out of test's control) |
| Twilio | Receives + stores the inbound SMS | Test reads via REST API |

## Setting Up Twilio in Python

Install the official library and authenticate with your Account SID and Auth Token, which you find in the Twilio Console. Never hard-code these — read them from the environment.

\`\`\`bash
pip install twilio python-dotenv
\`\`\`

\`\`\`python
# client.py
import os
from twilio.rest import Client

def twilio_client() -> Client:
    """Authenticated Twilio REST client from environment variables."""
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    return Client(sid, token)

# The Twilio number that RECEIVES the OTP in tests, e.g. "+14155550123"
RECEIVING_NUMBER = os.environ["TWILIO_RECEIVING_NUMBER"]
\`\`\`

You need at least one Twilio phone number capable of receiving SMS. You can buy one in the Console or programmatically. For test isolation you may want a dedicated number (or a pool of them) so concurrent test runs do not collide on the same inbox.

\`\`\`python
# buy_number.py — provision an SMS-capable US number
from client import twilio_client

def buy_sms_number(area_code: str = "415") -> str:
    client = twilio_client()
    available = client.available_phone_numbers("US").local.list(
        area_code=area_code, sms_enabled=True, limit=1
    )
    if not available:
        raise RuntimeError("No SMS-capable numbers available in that area code")
    purchased = client.incoming_phone_numbers.create(
        phone_number=available[0].phone_number
    )
    return purchased.phone_number
\`\`\`

## The Message Resource Model

Every SMS — inbound or outbound — is a Message resource in Twilio. The fields that matter for OTP testing are \`body\` (the text, where the code lives), \`from_\` (the sender), \`to\` (the recipient, your Twilio number for inbound), \`direction\` (\`inbound\` for messages your number received), and \`date_sent\` (a timezone-aware datetime). When you list messages you filter on \`to\`, \`date_sent_after\`, and optionally \`from_\` to narrow the result set.

\`\`\`python
# A single message object exposes, among others:
# msg.sid          -> unique ID
# msg.body         -> "Your code is 482913"
# msg.from_        -> sender number/short code
# msg.to           -> your Twilio receiving number
# msg.direction    -> "inbound" | "outbound-api" | ...
# msg.date_sent    -> datetime (UTC, tz-aware)
# msg.status       -> "received" | "delivered" | ...
\`\`\`

Note the trailing underscore on \`from_\` — \`from\` is a Python keyword, so the library renames it. This trips up newcomers constantly.

## Listing Messages with date_sent_after

The list endpoint supports server-side date filtering, which is far more efficient than pulling every message and filtering in Python. The two relevant parameters are \`date_sent_after\` and \`date_sent_before\`. You pass timezone-aware \`datetime\` objects. Combined with \`to\`, this returns only the messages your test cares about.

\`\`\`python
# fetch.py
from datetime import datetime, timezone
from client import twilio_client, RECEIVING_NUMBER

def recent_inbound(since: datetime):
    """Return inbound messages to our number sent after 'since', newest first."""
    client = twilio_client()
    return client.messages.list(
        to=RECEIVING_NUMBER,
        date_sent_after=since,   # server-side floor on date_sent
        limit=20,
    )

# Example: messages in the last two minutes
from datetime import timedelta
since = datetime.now(timezone.utc) - timedelta(minutes=2)
for m in recent_inbound(since):
    print(m.date_sent, m.direction, repr(m.body))
\`\`\`

A few important behaviors. Twilio's \`date_sent\` filtering operates at *day* granularity in some API contexts and at finer granularity in others depending on the resource and account; to be safe, treat \`date_sent_after\` as a coarse server-side prefilter that dramatically shrinks the result set, then apply an exact \`msg.date_sent >= since\` comparison in Python for precision. This belt-and-suspenders approach guarantees correctness regardless of API granularity quirks.

The table summarizes the most useful list filters.

| Parameter | Type | Purpose |
|---|---|---|
| \`to\` | string | Only messages sent to this number |
| \`from_\` | string | Only messages from this sender |
| \`date_sent_after\` | datetime | Server-side floor on send time |
| \`date_sent_before\` | datetime | Server-side ceiling on send time |
| \`limit\` | int | Cap total results returned |
| \`page_size\` | int | Results per API page |

## Polling for a Fresh OTP

Because delivery is asynchronous, you poll. The robust pattern records the "since" timestamp before triggering the send, then loops with a short sleep and a hard timeout, applying the precise Python-side date filter on each pass. Returning as soon as a matching message arrives keeps tests fast in the common case while the timeout prevents hangs when delivery fails.

\`\`\`python
# poll.py
import time
from datetime import datetime, timezone
from client import twilio_client, RECEIVING_NUMBER

def wait_for_sms(since: datetime, timeout: float = 30.0,
                 interval: float = 2.0, sender: str | None = None):
    """Block until an inbound SMS sent after 'since' arrives, or time out."""
    client = twilio_client()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        messages = client.messages.list(
            to=RECEIVING_NUMBER,
            date_sent_after=since,   # coarse server-side prefilter
            limit=20,
        )
        # Precise client-side filter + optional sender match, newest first
        fresh = [
            m for m in messages
            if m.date_sent and m.date_sent >= since
            and m.direction.startswith("inbound")
            and (sender is None or m.from_ == sender)
        ]
        if fresh:
            fresh.sort(key=lambda m: m.date_sent, reverse=True)
            return fresh[0]
        time.sleep(interval)
    raise TimeoutError(f"No SMS to {RECEIVING_NUMBER} arrived within {timeout}s")
\`\`\`

Three details make this reliable. Recording \`since\` before the send eliminates stale-OTP false positives. Sorting newest-first means that if two codes somehow arrive, you use the latest. The hard \`deadline\` based on \`time.monotonic()\` (not wall-clock) makes the timeout immune to system clock changes.

## Extracting the OTP Code

OTPs are usually four to eight digits embedded in marketing-flavored text like "Your Acme verification code is 482913. Do not share it." A regex pulls the digits out. Make the pattern resilient: anchor on a likely context word when possible, but fall back to "the first run of N digits."

\`\`\`python
# extract.py
import re

# Common shapes: "code is 482913", "OTP: 12345", "G-839201"
OTP_PATTERNS = [
    re.compile(r"(?:code|otp|passcode|pin)\\D{0,10}(\\d{4,8})", re.IGNORECASE),
    re.compile(r"\\b(\\d{4,8})\\b"),  # fallback: any 4-8 digit run
]

def extract_otp(body: str) -> str:
    """Return the OTP digits from an SMS body, or raise if none found."""
    for pattern in OTP_PATTERNS:
        match = pattern.search(body)
        if match:
            return match.group(1)
    raise ValueError(f"No OTP found in message body: {body!r}")

# Quick sanity checks
assert extract_otp("Your Acme code is 482913. Do not share it.") == "482913"
assert extract_otp("G-839201 is your Google verification code") == "839201"
assert extract_otp("OTP: 12345") == "12345"
\`\`\`

The ordered-pattern approach matters: the context-aware pattern runs first so that when a message contains both an order number and a code, you grab the code, not the order number. Only if that fails do you fall back to the naive "first digit run." Tune the digit length range (\`{4,8}\`) to your application's actual code length to reduce ambiguity further.

## A Full pytest End-to-End Test

Now combine everything. This test triggers your application's "send login code" endpoint, waits for the SMS via Twilio, extracts the code, and submits it to complete authentication — a real OTP flow, fully automated. The application calls are illustrative; swap in your real API client or Playwright UI steps.

\`\`\`python
# test_login_otp.py
from datetime import datetime, timezone
import pytest
import requests
from poll import wait_for_sms
from extract import extract_otp
from client import RECEIVING_NUMBER

API = "https://staging.example.com/api"

def request_login_code(phone: str) -> None:
    r = requests.post(f"{API}/auth/send-code", json={"phone": phone}, timeout=10)
    r.raise_for_status()

def submit_login_code(phone: str, code: str) -> str:
    r = requests.post(f"{API}/auth/verify",
                      json={"phone": phone, "code": code}, timeout=10)
    r.raise_for_status()
    return r.json()["session_token"]

def test_sms_otp_login_end_to_end():
    # 1) Mark the floor BEFORE triggering the send
    since = datetime.now(timezone.utc)

    # 2) Ask the app to text a code to our Twilio number
    request_login_code(RECEIVING_NUMBER)

    # 3) Wait for the inbound SMS and read its body
    message = wait_for_sms(since, timeout=30, interval=2)
    assert message.body, "SMS arrived but body was empty"

    # 4) Extract the OTP and complete login
    code = extract_otp(message.body)
    assert code.isdigit() and 4 <= len(code) <= 8

    token = submit_login_code(RECEIVING_NUMBER, code)
    assert token, "Expected a session token after verifying the OTP"
\`\`\`

Run it with credentials in the environment.

\`\`\`bash
export TWILIO_ACCOUNT_SID=ACxxxxxxxx
export TWILIO_AUTH_TOKEN=your_token
export TWILIO_RECEIVING_NUMBER=+14155550123
pytest test_login_otp.py -v
\`\`\`

This single test exercises the entire human flow: a code is generated, physically sent over the carrier network, received on a real number, read back through Twilio, parsed, and verified. It is as close to a true user experience as automation gets, and it catches failures a mocked SMS never would — wrong sender ID, malformed body, delivery delays, expired codes.

## Test Hygiene and Cost Control

A few operational practices keep this sustainable. Use a dedicated test number (or a pool) so parallel runs do not read each other's codes; filter on \`from_\` when the sender is stable to add another isolation layer. Set a sensible timeout — 30 seconds is generous for SMS; lower it if your provider is fast. Each received SMS and each owned number costs money, so in CI prefer running OTP tests as a focused suite rather than on every commit, and consider tearing down ephemeral numbers after the run. For pure logic tests of your extraction and polling code, you do not need Twilio at all — unit-test \`extract_otp\` and stub the message list.

| Practice | Why it matters |
|---|---|
| Record \`since\` before sending | Prevents picking up stale OTPs |
| Filter on \`from_\` when stable | Isolates from other senders |
| Dedicated number per worker | Avoids cross-test collisions |
| Hard timeout on polling | Stops hangs on delivery failure |
| Unit-test regex separately | Fast feedback without API cost |

For more on assembling these into resilient pipelines, see the API and end-to-end testing guides on the [blog](/blog) and the agent-installable skills in the [directory](/skills).

## Driving the OTP Through a Playwright UI Flow

API-level OTP tests are fast, but many teams also need to prove the real browser journey: a user types their phone number, clicks "send code," receives the SMS, types the digits, and lands logged in. You can combine the Twilio polling helper with Playwright (Python) so the same Twilio inbox feeds a UI test. The structure mirrors the API test — record \`since\`, drive the UI to trigger the send, poll Twilio, extract, then type the code into the page.

\`\`\`python
# test_login_otp_ui.py
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
from poll import wait_for_sms
from extract import extract_otp
from client import RECEIVING_NUMBER

def test_otp_login_via_browser():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("https://staging.example.com/login")

        # 1) Record the floor BEFORE triggering the send
        since = datetime.now(timezone.utc)

        # 2) Enter the Twilio number and request a code in the UI
        page.fill('[data-testid="phone"]', RECEIVING_NUMBER)
        page.click('[data-testid="send-code"]')

        # 3) Wait for the SMS via Twilio and extract the OTP
        message = wait_for_sms(since, timeout=30, interval=2)
        code = extract_otp(message.body)

        # 4) Type the code and submit
        page.fill('[data-testid="otp"]', code)
        page.click('[data-testid="verify"]')

        # 5) Assert the logged-in state
        page.wait_for_url("**/dashboard")
        assert page.is_visible('[data-testid="user-menu"]')
        browser.close()
\`\`\`

This is the highest-fidelity OTP test you can write: it exercises the actual form, the actual carrier delivery, and the actual verification UI. Because the Twilio polling is the same helper, you maintain the extraction and timing logic in one place and reuse it across API and UI suites. The only addition is the Playwright page driving — everything about receiving the code is identical.

## Handling Inbound Webhooks vs Polling

There are two ways to learn that an SMS arrived: polling the messages list (what this guide uses) and configuring an inbound webhook so Twilio POSTs each received message to a URL you control. Polling is simpler for tests because it needs no public endpoint and no infrastructure — your test just queries the API on an interval. Webhooks are better for production message-handling but awkward for CI, since you would need a publicly reachable receiver (often a tunnel) for Twilio to call.

For automated testing, polling almost always wins on simplicity and reliability. If your application *itself* relies on inbound webhooks, you can still test that path by POSTing a simulated Twilio webhook payload directly to your endpoint in a unit test, bypassing Twilio entirely. The table contrasts the two.

| Approach | Needs public URL | Best for | Test complexity |
|---|---|---|---|
| Polling (messages.list) | No | Receiving OTPs in tests | Low |
| Inbound webhook | Yes | Production message handling | High in CI |
| Simulated webhook POST | No | Unit-testing your handler | Low |

The practical recommendation: use polling to receive OTPs in end-to-end tests, and if your app processes inbound SMS via webhook, unit-test that handler by feeding it a crafted payload. This keeps every test self-contained and free of tunneling infrastructure. For more on structuring these layers, see the API testing guides on the [blog](/blog).

## Frequently Asked Questions

### Why record the timestamp before triggering the SMS send?

Because SMS delivery is asynchronous and your test may run many times, you must distinguish *this run's* code from leftovers in the inbox. Capturing a \`since\` timestamp immediately before calling the application's "send code" endpoint gives you a floor: any message with \`date_sent >= since\` is necessarily fresh. If you instead computed the floor after sending, a slow round-trip could place it after the message and you would never find the code.

### What does date_sent_after actually filter, and is it precise?

\`date_sent_after\` is a server-side filter on the message's \`date_sent\` field that dramatically shrinks the result set before it reaches your code. Its granularity can vary by resource and account, so the safe pattern is to use it as a coarse prefilter and then apply an exact \`msg.date_sent >= since\` comparison in Python. That belt-and-suspenders approach guarantees correctness regardless of any API date-granularity quirks.

### How do I extract the OTP reliably when the message has other numbers?

Use an ordered list of regex patterns. Run a context-aware pattern first — one that looks for words like "code," "OTP," or "PIN" followed by the digits — so that when a message contains both an order number and a verification code, you capture the code. Only if that fails do you fall back to "the first run of 4-8 digits." Tuning the digit-length range to your real code length further reduces ambiguity.

### Why is the field called from_ with an underscore?

\`from\` is a reserved keyword in Python, so the Twilio helper library cannot use it as an attribute name. It renames the sender field to \`from_\` with a trailing underscore. This applies both when reading a message (\`msg.from_\`) and when filtering the list endpoint (\`from_=...\`). Forgetting the underscore is one of the most common errors when first using the library.

### How do I avoid Twilio costs blowing up in CI?

Each owned number and each received message incurs a small charge, so run OTP end-to-end tests as a focused, lower-frequency suite rather than on every commit, and unit-test your extraction and polling logic separately with stubs where no real SMS is needed. You can also provision ephemeral numbers for a run and release them afterward. Reserving live SMS tests for pre-release or nightly pipelines keeps the bill predictable.

### Can I run multiple OTP tests in parallel?

Yes, but give each parallel worker its own receiving number (a number pool) so they do not read each other's codes out of a shared inbox. Additionally filtering on the sender (\`from_\`) when it is stable adds a second isolation layer. Recording a per-test \`since\` timestamp already prevents stale codes within one inbox, but separate numbers are the clean way to scale concurrency without flakiness.

### Do I need a real phone or a real SIM for this?

No. The whole point is that a Twilio phone number is a programmatically accessible inbox in the cloud — there is no physical phone or SIM involved. Your application sends the SMS to that number through the normal carrier network, Twilio receives and stores it, and your test reads it back over the REST API. This is what makes the flow fully automatable in CI without any hardware.

## Conclusion

Automating SMS and OTP verification in Python comes down to treating a Twilio number as a cloud inbox and the REST API as the seam your test reaches through. Record a timestamp before triggering the send, poll the messages list with \`date_sent_after\` as a coarse prefilter plus a precise Python-side comparison, extract the code with ordered context-aware regexes, and submit it back to complete a real login. The payoff is an end-to-end test that exercises the genuine carrier delivery path and catches failures a mock never could.

Want to go further? Browse installable QA skills for your AI coding agent in the [QASkills directory](/skills) and read the API and end-to-end testing guides on the [blog](/blog). Drop an SMS-testing skill into Claude Code or Cursor and let your agent scaffold the Twilio polling, extraction, and pytest harness for your auth flows.
`,
};
