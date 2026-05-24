import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework SMS OTP Testing Complete Guide 2026',
  description:
    'Automate SMS OTP testing with Robot Framework. Twilio integration, mock SMS providers, OTP retrieval patterns, multi-factor authentication flows, and CI integration.',
  date: '2026-05-02',
  category: 'Tutorial',
  content: `
# Robot Framework SMS OTP Testing Complete Guide 2026

Two-factor authentication via SMS one-time passwords has become standard in banking apps, e-commerce checkouts, and any system that needs to verify a user's possession of a phone number. While end users see a short code arrive on their phone and type it into a form, the automation engineer faces a harder problem: how do you read an SMS message inside a test, knowing that physical phones are not part of CI infrastructure? Robot Framework, combined with SMS provider APIs like Twilio or self-hosted mock servers, lets you build reliable OTP test flows that handle the message lifecycle entirely in code.

This complete guide walks through every aspect of SMS OTP testing with Robot Framework in 2026. You'll learn how to set up dedicated test phone numbers, query messages programmatically via the Twilio API, build a mock SMS provider for offline tests, write reusable keywords for OTP retrieval and validation, handle expiry and rate limiting, and integrate the entire flow into your CI/CD pipeline. Real test suites and code samples illustrate each pattern. By the end, your authentication tests will pass deterministically without manual intervention or sketchy test bypasses.

## Key Takeaways

- Use disposable test phone numbers managed by Twilio, MessageBird, or Vonage
- Poll the SMS provider API for the most recent message with Wait Until Keyword Succeeds
- Mock providers like SMSMock and TestableSMS work for offline CI runs
- Never disable OTP validation in test environments - test it like production
- Use regex parsing to extract the OTP code from the message body
- Store API credentials in a secrets vault, not in robot files
- Tag OTP tests as slow so they can run in nightly suites

---

## Architecture Overview

A typical SMS OTP test flow has three steps:

1. The system under test sends an SMS to a phone number.
2. The test retrieves the SMS from the provider.
3. The test extracts the OTP and submits it to complete authentication.

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Library    RequestsLibrary
Library    String

*** Variables ***
\${TWILIO_ACCOUNT_SID}    AC1234567890
\${TWILIO_AUTH_TOKEN}     %{TWILIO_AUTH_TOKEN}
\${TEST_PHONE}            +15555550100
\${APP_URL}               https://app.example.com

*** Test Cases ***
SMS OTP Login Works
    Open Browser    \${APP_URL}/login    chrome
    Input Text      id=phone    \${TEST_PHONE}
    Click Button    Send Code
    \${otp}=    Get Latest OTP    \${TEST_PHONE}
    Input Text    id=otp-code    \${otp}
    Click Button    Verify
    Wait Until Page Contains    Welcome
    Close Browser
\`\`\`

## Twilio Setup

Twilio gives you programmable phone numbers and an HTTP API to read incoming messages:

\`\`\`python
# resources/twilio_helper.py
from twilio.rest import Client
import os

def get_latest_message(to_number: str) -> str:
    client = Client(
        os.environ['TWILIO_ACCOUNT_SID'],
        os.environ['TWILIO_AUTH_TOKEN']
    )
    messages = client.messages.list(to=to_number, limit=1)
    if not messages:
        raise Exception(f'No messages for {to_number}')
    return messages[0].body
\`\`\`

Robot can import this Python file as a library:

\`\`\`robot
*** Settings ***
Library    resources/twilio_helper.py
\`\`\`

## OTP Extraction

The OTP code is usually embedded in human-readable text. Use regex to extract it:

\`\`\`robot
*** Keywords ***
Extract OTP Code
    [Arguments]    \${message_body}
    \${matches}=    Get Regexp Matches    \${message_body}    \\\\d{6}
    Length Should Be Greater Than    \${matches}    0
    [Return]    \${matches}[0]

Get Latest OTP
    [Arguments]    \${phone}
    \${body}=    Get Latest Message    \${phone}
    \${otp}=    Extract OTP Code    \${body}
    Log    Retrieved OTP for \${phone}: \${otp}
    [Return]    \${otp}
\`\`\`

For 4-digit OTPs change the regex to \\\\d{4}; alphanumeric codes need a different pattern.

## Polling For The Message

SMS delivery has latency. Poll the provider with Wait Until Keyword Succeeds:

\`\`\`robot
*** Keywords ***
Get Latest OTP With Retry
    [Arguments]    \${phone}    \${timeout}=30s    \${interval}=2s
    \${otp}=    Wait Until Keyword Succeeds    \${timeout}    \${interval}
    ...    Get Latest OTP    \${phone}
    [Return]    \${otp}
\`\`\`

The keyword retries every 2 seconds for up to 30 seconds, which covers typical SMS arrival times.

## Avoiding Stale OTPs

If the test runs back to back, the previous OTP might still be the most recent. Track timestamps:

\`\`\`python
# resources/twilio_helper.py
from datetime import datetime, timedelta, timezone

def get_message_after(to_number: str, after_iso: str) -> str:
    client = Client(...)
    after = datetime.fromisoformat(after_iso).replace(tzinfo=timezone.utc)
    messages = client.messages.list(to=to_number, date_sent_after=after, limit=5)
    if not messages:
        raise Exception(f'No new messages since {after_iso}')
    return messages[0].body
\`\`\`

\`\`\`robot
*** Test Cases ***
Fresh OTP Each Run
    \${now}=    Get Current Date    UTC
    Click Button    Send Code
    \${body}=    Wait Until Keyword Succeeds    30s    2s
    ...    Get Message After    \${TEST_PHONE}    \${now}
    \${otp}=    Extract OTP Code    \${body}
    Log    OTP: \${otp}
\`\`\`

## Mock SMS Provider

For offline CI, run your own SMS mock. The simplest is a tiny Flask app:

\`\`\`python
# mock_sms.py
from flask import Flask, request, jsonify

app = Flask(__name__)
messages = []

@app.route('/messages', methods=['POST'])
def send():
    data = request.json
    messages.append(data)
    return jsonify({'sid': f'mock-{len(messages)}'}), 201

@app.route('/messages/latest', methods=['GET'])
def latest():
    to = request.args.get('to')
    filtered = [m for m in messages if m['to'] == to]
    if not filtered:
        return jsonify({'error': 'no messages'}), 404
    return jsonify(filtered[-1]), 200
\`\`\`

Point your app's SMS provider at this mock during integration tests. Now Robot reads from the mock instead of Twilio:

\`\`\`robot
*** Keywords ***
Get Mock Latest Message
    [Arguments]    \${phone}
    \${response}=    GET    \${MOCK_URL}/messages/latest    params=to=\${phone}
    Status Should Be    200    \${response}
    [Return]    \${response.json()}[body]
\`\`\`

## Full Login Suite

Combining everything:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Library    RequestsLibrary
Library    String
Library    DateTime
Library    resources/twilio_helper.py
Suite Setup    Open Browser    \${APP_URL}/login    chrome
Suite Teardown    Close Browser

*** Variables ***
\${APP_URL}    https://app.example.com
\${TEST_PHONE}    +15555550100

*** Test Cases ***
Mobile Number Login Flow
    [Tags]    smoke    auth    sms-otp
    \${start_time}=    Get Current Date    UTC
    Input Text    id=phone    \${TEST_PHONE}
    Click Button    Send Code
    \${otp}=    Wait Until Keyword Succeeds    45s    3s
    ...    Get OTP Since    \${TEST_PHONE}    \${start_time}
    Input Text    id=otp-code    \${otp}
    Click Button    Verify
    Wait Until Page Contains Element    id=dashboard    timeout=10s
    Element Text Should Be    css=.welcome-message    Hello, Test User

OTP Expires After 5 Minutes
    [Tags]    auth    sms-otp
    \${start_time}=    Get Current Date    UTC
    Input Text    id=phone    \${TEST_PHONE}
    Click Button    Send Code
    \${otp}=    Wait Until Keyword Succeeds    45s    3s
    ...    Get OTP Since    \${TEST_PHONE}    \${start_time}
    Sleep    6min
    Input Text    id=otp-code    \${otp}
    Click Button    Verify
    Page Should Contain    Code expired

Incorrect OTP Rejected
    [Tags]    auth    sms-otp
    Input Text    id=phone    \${TEST_PHONE}
    Click Button    Send Code
    Input Text    id=otp-code    000000
    Click Button    Verify
    Page Should Contain    Invalid code

*** Keywords ***
Get OTP Since
    [Arguments]    \${phone}    \${after}
    \${body}=    Get Message After    \${phone}    \${after}
    \${otp}=    Extract OTP Code    \${body}
    [Return]    \${otp}

Extract OTP Code
    [Arguments]    \${body}
    \${matches}=    Get Regexp Matches    \${body}    \\\\d{6}
    Length Should Be Greater Than    \${matches}    0
    [Return]    \${matches}[0]
\`\`\`

## Provider Comparison

Different SMS providers have different testing affordances:

| Provider | Test Numbers | API Latency | Cost Per SMS | Robot Friendly |
|----------|-------------|-------------|--------------|----------------|
| Twilio | Yes (magic numbers) | Low | $0.0075 | Yes |
| MessageBird | Yes (sandbox) | Low | $0.012 | Yes |
| Vonage | Yes (test API) | Medium | $0.0066 | Yes |
| AWS SNS | No native | Medium | $0.00645 | Limited |
| Self-hosted mock | N/A | Instant | Free | Best for CI |

For most teams, Twilio in dev/staging plus a self-hosted mock for unit-level integration tests gives the best balance.

## Handling Rate Limits

Real SMS providers enforce rate limits to prevent abuse. Your tests must respect them or use Twilio's test credentials:

\`\`\`robot
*** Keywords ***
Send OTP With Backoff
    [Arguments]    \${phone}    \${max_attempts}=3
    FOR    \${attempt}    IN RANGE    \${max_attempts}
        Click Button    Send Code
        \${response_visible}=    Run Keyword And Return Status
        ...    Wait Until Element Is Visible    id=code-sent    timeout=5s
        Exit For Loop If    \${response_visible}
        Sleep    \${attempt}min
    END
\`\`\`

For staging, Twilio test credentials (account SID starting with AC) send no real messages but produce predictable test responses.

## OTP Brute Force Protection

Good auth systems lock the account after N wrong OTPs. Test this:

\`\`\`robot
*** Test Cases ***
Account Locks After Three Wrong OTPs
    Input Text    id=phone    \${TEST_PHONE}
    Click Button    Send Code
    FOR    \${i}    IN RANGE    3
        Input Text    id=otp-code    000000
        Click Button    Verify
        Page Should Contain    Invalid code
    END
    Input Text    id=otp-code    000000
    Click Button    Verify
    Page Should Contain    Account locked
\`\`\`

## Voice OTP Alternative

Some flows offer voice OTP as an accessibility fallback. Robot can validate the call request was made:

\`\`\`robot
*** Keywords ***
Trigger Voice OTP
    Click Button    Send via voice call
    \${response}=    GET    \${TWILIO_URL}/calls    params=to=\${TEST_PHONE}
    Status Should Be    200    \${response}
    \${calls}=    Set Variable    \${response.json()}[calls]
    Length Should Be Greater Than    \${calls}    0
\`\`\`

This verifies the system kicked off a voice call without needing audio capture.

## Multi Number Concurrency

In parallel test runs, each worker needs its own phone number to avoid OTP collisions:

\`\`\`robot
*** Variables ***
@{PHONE_POOL}    +15555550100    +15555550101    +15555550102    +15555550103

*** Keywords ***
Get Worker Phone
    \${worker_id}=    Get Environment Variable    PABOT_PROCESS_ID    0
    \${index}=    Evaluate    \${worker_id} % len(\${PHONE_POOL})
    [Return]    \${PHONE_POOL}[\${index}]

*** Test Cases ***
Parallel Safe Login
    \${phone}=    Get Worker Phone
    Open Browser    \${APP_URL}/login    chrome
    Input Text    id=phone    \${phone}
    Click Button    Send Code
    \${otp}=    Wait Until Keyword Succeeds    45s    3s    Get Latest OTP    \${phone}
    Input Text    id=otp-code    \${otp}
    Click Button    Verify
    Close Browser
\`\`\`

## Securing Credentials

Never check Twilio credentials into version control. Use a secrets vault:

\`\`\`robot
*** Settings ***
Library    OperatingSystem

*** Variables ***
\${TWILIO_AUTH_TOKEN}    %{TWILIO_AUTH_TOKEN}
\${TWILIO_ACCOUNT_SID}    %{TWILIO_ACCOUNT_SID}
\`\`\`

Set via the environment in CI:

\`\`\`yaml
# .github/workflows/tests.yml
- run: robot --outputdir results tests/
  env:
    TWILIO_AUTH_TOKEN: \${{ secrets.TWILIO_AUTH_TOKEN }}
    TWILIO_ACCOUNT_SID: \${{ secrets.TWILIO_ACCOUNT_SID }}
\`\`\`

## CI Integration

\`\`\`yaml
name: SMS OTP Tests
on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: |
          pip install robotframework robotframework-seleniumlibrary \\
              robotframework-requests twilio
      - run: robot --include sms-otp --outputdir results tests/
        env:
          TWILIO_AUTH_TOKEN: \${{ secrets.TWILIO_AUTH_TOKEN }}
          TWILIO_ACCOUNT_SID: \${{ secrets.TWILIO_ACCOUNT_SID }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: sms-otp-results
          path: results/
\`\`\`

Tag SMS tests so they only run on a schedule, not on every PR. They are slow and consume real SMS credits.

## Cost Tracking

Track SMS spending in CI:

\`\`\`python
# resources/cost_tracker.py
import os
from twilio.rest import Client

def get_monthly_cost():
    client = Client(os.environ['TWILIO_ACCOUNT_SID'], os.environ['TWILIO_AUTH_TOKEN'])
    usage = client.usage.records.this_month.list(category='sms')
    total = sum(float(r.price) for r in usage)
    return total
\`\`\`

\`\`\`robot
*** Test Cases ***
Monthly SMS Cost Within Budget
    [Tags]    cost-audit
    \${cost}=    Get Monthly Cost
    Should Be True    \${cost} < 50.00    msg=SMS spend exceeded $50
\`\`\`

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Disable OTP in test env | Misses the entire flow | Use test phone numbers |
| Hardcoded OTP like 123456 | Fragile, doesn't test prod | Read from provider |
| Skip on CI | Coverage gap | Tag and schedule nightly |
| No timestamp filtering | Stale OTPs cause flakes | Filter by send time |
| Brittle regex | Misses code format changes | Centralize extraction |

## Debugging Failures

When SMS tests fail intermittently, capture rich logs:

\`\`\`robot
*** Keywords ***
Log SMS Debug
    [Arguments]    \${phone}
    \${messages}=    Get Recent Messages    \${phone}    10
    FOR    \${m}    IN    @{messages}
        Log    Time: \${m.date_sent}, Body: \${m.body}    INFO
    END
\`\`\`

Call this in a teardown so you have visibility on failure:

\`\`\`robot
*** Test Cases ***
Login With OTP
    [Teardown]    Log SMS Debug    \${TEST_PHONE}
    ...
\`\`\`

## Conclusion

SMS OTP testing is one of the trickiest parts of authentication automation, but it doesn't have to be flaky or skipped. With a real SMS provider for staging, a mock server for unit-level tests, and disciplined patterns around polling and timestamp filtering, your Robot Framework suites can validate the full OTP flow as reliably as any other test. The key is to treat the SMS provider as just another API and apply the same patterns - retries, timeouts, secret management, parallel safety - that you use elsewhere.

Start by setting up one Twilio number and a single end-to-end login test. Once that runs green in CI, expand to test expiration, brute force protection, and concurrency. Within a few sprints you'll have a complete OTP test suite that catches regressions before they hit production. Pair this with the broader [QA skills directory](/skills) and our [API testing complete guide](/blog/api-testing-complete-guide) for adjacent patterns.
`,
};
