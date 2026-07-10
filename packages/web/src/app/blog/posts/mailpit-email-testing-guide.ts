import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mailpit Email Testing Guide',
  description: 'Mailpit email testing guide for SMTP capture, inbox assertions, MIME inspection, attachments, CI-safe notification tests, and transactional QA.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Mailpit Email Testing Guide

A password reset test should not depend on Gmail, a shared QA mailbox, or somebody remembering to delete yesterday's messages. The application needs to send email through SMTP, the test needs to inspect exactly what was sent, and no real user should receive anything. Mailpit gives you that local capture point.

Mailpit is a small email testing server with an SMTP listener and a web UI. In test automation, the more interesting part is its HTTP API. Your app sends email to Mailpit's SMTP port, and your test queries the captured messages, body, headers, and recipients. That turns email from a manual side effect into an assertion-friendly boundary.

This article is for QA engineers who need reliable local and CI notification tests. If the email is triggered by an inbound event, combine it with [a webhook testing complete guide for 2026](/blog/webhook-testing-complete-guide-2026). If the email is one checkpoint inside a larger browser flow, keep the surrounding coverage aligned with [a web testing checklist for 2026](/blog/web-testing-checklist-2026).

## The capture server belongs in the test environment

Mailpit should be treated like a test dependency, not a shared staging utility. Each CI job should get its own instance or its own clean mailbox. Local developers should be able to run the same setup without credentials for a real mail provider.

A typical local command is straightforward: SMTP on 1025, web and API on 8025.

\`\`\`bash
mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025
\`\`\`

Point the application under test at \`127.0.0.1:1025\` for SMTP. Keep production email credentials out of this path. If the app uses a higher-level provider SDK in production, wrap email sending behind an interface so test environments can use SMTP capture while production uses the provider.

| Environment | SMTP host and port | Mailpit access | Cleanup policy |
|---|---|---|---|
| Developer laptop | \`127.0.0.1:1025\` | Web UI at \`127.0.0.1:8025\` | Clear manually or before each test run. |
| CI service container | Container service name plus 1025 | API from test runner network | Delete all messages at test start. |
| Docker Compose app stack | \`mailpit:1025\` | Expose 8025 for debugging | Reset per compose project. |
| Preview environment | Prefer isolated instance per environment | Restrict UI if exposed | Avoid mixing multiple branches. |
| Production | Never Mailpit | Not applicable | Real provider observability applies. |

## Sending a message and asserting it through the API

The test should verify the email that matters, not every MIME byte. For a password reset, the important facts are recipient, subject, visible body, and the reset link shape. The following Node example uses Nodemailer to send through Mailpit, then polls the Mailpit API until the message appears.

\`\`\`ts
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';

type MailpitMessage = {
  ID: string;
  To: Array<{ Address: string }>;
  Subject: string;
};

async function getMessages(): Promise<MailpitMessage[]> {
  const response = await fetch('http://127.0.0.1:8025/api/v1/messages');
  assert.equal(response.status, 200);
  const payload = await response.json() as { messages: MailpitMessage[] };
  return payload.messages;
}

async function waitForMessage(subject: string) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    const message = (await getMessages()).find((item) => item.Subject === subject);
    if (message) return message;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for Mailpit message: ' + subject);
}

const transport = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 1025,
  secure: false,
});

await transport.sendMail({
  from: 'no-reply@example.test',
  to: 'maya@example.test',
  subject: 'Reset your password',
  html: '<p>Use <a href="https://app.example.test/reset?token=abc123">this reset link</a>.</p>',
});

const message = await waitForMessage('Reset your password');
assert.equal(message.To[0]?.Address, 'maya@example.test');
\`\`\`

The polling loop is intentionally small and local. Email sending is asynchronous even when captured locally, so a single immediate API read can create a race. Avoid long sleeps. Poll for the specific subject or recipient that proves the app emitted the message.

## Inspecting body content without brittle snapshots

Email HTML changes often. Marketing updates a paragraph, a designer adjusts table markup, or a footer gains a new link. QA tests should be strict about transactional requirements and tolerant of harmless presentation changes.

Fetch the full message by ID and assert specific content. Mailpit exposes message details through its API, including HTML and text body fields in current releases. Keep your test helper small so any API response shape adjustment is fixed once.

\`\`\`ts
import assert from 'node:assert/strict';

async function getMessage(id: string) {
  const response = await fetch('http://127.0.0.1:8025/api/v1/message/' + id);
  assert.equal(response.status, 200);
  return await response.json() as {
    ID: string;
    Subject: string;
    HTML?: string;
    Text?: string;
  };
}

function extractResetUrl(html: string) {
  const match = html.match(/href="([^"]+\/reset\?token=[^"]+)"/);
  assert.ok(match, 'reset URL should be present in email HTML');
  return new URL(match[1]);
}

const detail = await getMessage(message.ID);
assert.equal(detail.Subject, 'Reset your password');
assert.match(detail.HTML ?? '', /Reset your password|reset link/i);

const resetUrl = extractResetUrl(detail.HTML ?? '');
assert.equal(resetUrl.hostname, 'app.example.test');
assert.ok(resetUrl.searchParams.get('token'));
\`\`\`

This is stronger than a full snapshot because it tests the security-sensitive link while allowing harmless HTML structure changes. If your email templates require visual review, run a separate rendering check. Do not make a transactional smoke test fail because a footer line wrapped differently.

## Cleaning inbox state between tests

Email tests become flaky when a test finds a message from a previous run. Use unique recipients, clear Mailpit before each test, or both. Unique recipients make debugging easier because the message identity appears in the captured inbox. Clearing reduces accidental matches.

| Isolation tactic | Benefit | Limitation |
|---|---|---|
| Unique recipient per test | Easy to filter and debug | Requires app to accept generated addresses. |
| Clear all messages before test | Simple mental model | Parallel tests can delete each other's messages. |
| One Mailpit instance per worker | Strong parallel isolation | More setup in CI. |
| Subject with run id | Useful for workflows that reuse recipient | Subject may be user-visible and not appropriate. |
| Header correlation id | Clean for internal systems | App must support adding a test-only header. |

For parallel CI, one Mailpit instance per worker is the cleanest approach. If that is too much infrastructure, avoid clearing during the test body. Clear at worker startup, generate unique recipients, and query by recipient plus subject.

## What to assert in email QA

Email tests should not become a second template engine. Focus on behaviors that break users or compliance. Examples include recipient list, subject, unsubscribe link, magic link target, attachment presence, text alternative, and key headers.

| Email type | High-value assertions | Low-value assertions |
|---|---|---|
| Password reset | One recipient, tokenized reset URL, expiry copy if required | Exact HTML table nesting |
| Invite email | Invited address, organization name, accept URL | Pixel-perfect logo dimensions |
| Invoice email | PDF attachment, invoice number, amount string | Full legal footer snapshot |
| Weekly digest | User preference respected, item count, unsubscribe URL | Every article teaser word |
| Alert email | Severity, affected resource, runbook link | Timestamp formatting beyond contract |

When a field is regulated or contractual, assert it directly. When a field is editorial, prefer a smoke assertion that the region exists and leave copy review to content workflow.

## CI configuration that does not leak mail

The safest CI setup starts Mailpit as a service and points the app to it through environment variables. The app should not know it is in a test beyond normal config. It just sees an SMTP host.

\`\`\`yaml
services:
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - 1025:1025
      - 8025:8025

env:
  SMTP_HOST: 127.0.0.1
  SMTP_PORT: 1025
  SMTP_SECURE: 'false'
  EMAIL_FROM: no-reply@example.test
\`\`\`

If your CI runner uses container networking, the host may be \`mailpit\` from the application container and \`127.0.0.1\` from the job process. Verify the network path once and document it in the test helper. Most Mailpit failures in CI are port routing issues, not email bugs.

Never use a production provider API key in an automated email test that can send arbitrary addresses. If a test accidentally loops or retries, the blast radius should be a disposable Mailpit inbox.

## Debugging failed email assertions

When an email assertion fails, first determine whether the app attempted to send. Application logs, SMTP connection errors, and Mailpit inbox state answer different questions. An empty inbox could mean the business event did not fire, SMTP config is wrong, or the message is still in an internal queue.

Add diagnostics that print the subjects and recipients currently in Mailpit when a wait times out. Avoid dumping full message bodies into CI logs if tokens or personal data may appear. For local debugging, open the web UI and inspect MIME content, attachments, and headers.

If messages arrive with wrong links, check the public URL configuration used by the email template. Password reset and invite emails often accidentally use \`localhost\` in CI or staging. Mailpit catches that before a real customer gets a broken link.

## Testing attachments and MIME boundaries

Attachments deserve separate assertions because they fail differently from body text. A message can have the right subject and still miss the invoice PDF. A PDF can be attached with the wrong content type. A CSV export can be present but encoded incorrectly. Mailpit lets the test inspect the captured message before anything leaves the test environment.

Keep attachment checks specific. For an invoice email, assert the filename pattern, content type, and a small content signature if the attachment is generated in the test. Do not compare the entire binary unless the document is deliberately stable. Generated PDFs often contain timestamps or object ids that make full binary snapshots noisy.

| Attachment type | Useful assertion | Avoid |
|---|---|---|
| Invoice PDF | Filename includes invoice number, content type is PDF | Byte-for-byte snapshot with generated timestamps |
| CSV export | Header row and expected row count | Comparing platform-specific line endings blindly |
| Calendar invite | \`text/calendar\` part and event uid | Asserting every organizer display string |
| Image receipt | Content id referenced by HTML | Visual pixel assertion in a transactional test |
| Security report | Attachment exists only for authorized recipient | Sending sample to shared external mailbox |

If your Mailpit API helper exposes attachments by message id, wrap that response behind a domain assertion such as \`expectInvoiceAttachment(message, invoiceNumber)\`. Tests should read like email requirements, not MIME plumbing.

## Verifying user preferences and suppression logic

A serious email suite does not only prove that messages can be sent. It proves that messages are not sent when the user opted out, when an account is suspended, or when a notification is rate-limited. Mailpit is valuable here because an empty inbox becomes an assertion, provided isolation is strong.

Use negative checks carefully. An immediate empty inbox check can race with an async job. Trigger the event, wait for the job system to settle if your app exposes that signal, then assert no matching message exists. If there is no settle signal, poll for a short window and fail if the forbidden message appears.

| Suppression scenario | Test setup | Assertion |
|---|---|---|
| Marketing opt-out | User preference disables digest | No digest email for that recipient |
| Transactional reset | User requests password reset | Reset email still sends despite marketing opt-out |
| Suspended account | Account status blocks invites | No invite email and UI shows blocked state |
| Rate limit | Same alert fires repeatedly | At most one alert message in the window |
| Unverified address | User changes email | Verification email goes to new address only |

These tests catch expensive mistakes. Accidentally suppressing password resets can lock users out. Accidentally ignoring opt-out preferences can create compliance risk. Both are better found in a captured inbox than in customer reports.

## Making Mailpit helpers product-aware

A reusable helper should know how your product identifies email, but it should not know every test story. Good helpers include \`waitForEmailTo\`, \`getHtmlBody\`, \`findLinkByPath\`, and \`expectNoEmailTo\`. Product-specific helpers can layer on top: \`waitForPasswordReset\`, \`expectInviteEmail\`, or \`expectInvoiceAttached\`.

Keep diagnostics built in. On timeout, print the recipient and subject filters plus the subjects currently present. That one detail often saves several minutes in CI triage because the failure shows whether no email arrived or the wrong email arrived.

## Outbox architecture changes what you wait for

Some applications send email directly during the HTTP request. Others write an outbox row and let a worker deliver later. Mailpit works for both, but the wait strategy changes. For direct sending, polling the Mailpit API is usually enough. For an outbox, first prove the job worker processed the row or expose a test helper that drains the queue, then inspect Mailpit.

Do not make the browser test sleep for the longest possible worker delay. That turns email QA into a timing lottery. A better design gives tests a deterministic signal: queue drained, job completed, or outbox row marked sent.

| Sending design | Better synchronization |
|---|---|
| Direct SMTP in request | Poll Mailpit for recipient and subject. |
| Database outbox | Drain worker or wait for outbox status, then poll Mailpit. |
| Message broker event | Wait for consumed event offset or test worker completion. |
| Scheduled digest | Trigger the digest job explicitly in test mode. |
| Retry after failure | Assert retry metadata and eventual captured message separately. |

This distinction also improves diagnostics. If the outbox row exists but Mailpit is empty, the worker or SMTP config is suspect. If no outbox row exists, the business event did not request an email.

Finally, keep Mailpit assertions close to the user story. A reset flow should prove the reset email works, not that every global footer link is perfect. Separate template rendering reviews from transactional delivery checks so failures point to the right owner.

That ownership split keeps failures actionable instead of turning every email change into a broad QA dispute.

## Frequently Asked Questions

### Can Mailpit replace provider-level tests for Resend, SES, or SendGrid?

No. Mailpit verifies that your application composes and sends email through SMTP capture. Provider-specific API integration, domain authentication, suppression lists, and bounce handling need separate coverage.

### Should I assert the HTML body with snapshots?

Use snapshots sparingly. Transactional email tests are usually better when they assert specific links, recipient data, attachments, and required text. Full HTML snapshots create noisy failures for harmless markup changes.

### How do I keep Mailpit tests parallel-safe?

Use unique recipients and, for heavy suites, one Mailpit instance per worker. Clearing a shared inbox while other tests are running is a common source of missing-message failures.

### Is the Mailpit web UI needed in CI?

The API is enough for assertions. Exposing the UI can help with debugging failed jobs, but it should not be required for the test to pass.

### What timeout should email waits use?

Local SMTP capture should usually complete within a few seconds. If you need long waits, inspect the application queue or job worker rather than hiding the delay inside the Mailpit helper.
`,
};
