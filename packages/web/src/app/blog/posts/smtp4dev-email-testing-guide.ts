import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'smtp4dev: Local SMTP Server for Email Testing',
  description: 'smtp4dev tutorial for QA teams: run a local SMTP server, capture email in Docker, query REST APIs, test IMAP, wire CI, and debug delivery failures.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# smtp4dev: Local SMTP Server for Email Testing

smtp4dev is an actively maintained open-source fake SMTP server for development and testing. It captures messages your application sends, displays them in a web UI, exposes an OpenAPI/Swagger-backed REST API, and can provide IMAP and POP3 access for clients that need to retrieve messages like a real mailbox. The current stable package line I verified is 3.15.0, published in March 2026 on the official release/package channels, while the upstream repository and Docker tags also show an active 3.16.0 prerelease stream. Use \`rnwood/smtp4dev:v3\` or the stable package unless you intentionally want prerelease builds.

The key distinction is scope. smtp4dev is not a hosted SMS/email SaaS and it does not give you public wildcard inbox domains. It is a local or self-hosted mail sink. You point the app under test at smtp4dev over SMTP, then assert what was captured through the UI, REST API, IMAP, POP3, or raw MIME endpoints. That makes it excellent for deterministic CI jobs, developer machines, preview environments, and AI coding agent sandboxes where secrets and paid accounts add friction.

Choose smtp4dev when the test environment can route SMTP traffic to a container or local process. If you need richer local comparisons, [Mailpit](/blog/mailpit-email-testing-guide) belongs on the same shortlist. If your main risk is responsive HTML rendering across clients, use smtp4dev's HTML inspection as an early gate, then pair it with deeper [email template rendering tests across clients](/blog/email-template-rendering-testing-clients).

## What smtp4dev Actually Runs

The official Docker Compose file maps the web interface to container port \`80\`, SMTP to \`25\`, IMAP to \`143\`, and POP3 to \`110\`. The sample maps host \`5000:80\`, \`25:25\`, \`143:143\`, and \`110:110\`, with comments recommending a \`127.0.0.1:\` prefix when you only want local access. For developer and CI work, host port \`2525\` is often more convenient than privileged port \`25\`, but inside the container the SMTP service remains port \`25\`.

| Service | Container port | Common host port | Why QA cares |
|---|---:|---:|---|
| Web UI and API | \`80\` | \`5000\` or \`3000\` | Inspect messages, Swagger/OpenAPI docs, HTML previews |
| SMTP | \`25\` | \`2525\` or \`25\` | App sends mail here instead of a real provider |
| IMAP | \`143\` | \`1143\` or \`143\` | Test code or mail clients retrieve captured messages |
| POP3 | \`110\` | \`1110\` or \`110\` | Legacy retrieval behavior and delete-on-read scenarios |
| Data volume | \`/smtp4dev\` | named volume | Retain captured mail and generated TLS material between runs |

\`\`\`yaml
services:
  smtp4dev:
    image: rnwood/smtp4dev:v3
    restart: unless-stopped
    ports:
      - '127.0.0.1:5000:80'
      - '127.0.0.1:2525:25'
      - '127.0.0.1:1143:143'
      - '127.0.0.1:1110:110'
    volumes:
      - smtp4dev-data:/smtp4dev

volumes:
  smtp4dev-data:
\`\`\`

The localhost binding matters. smtp4dev is a testing tool that intentionally accepts messages, stores message bodies, and exposes an administrative UI. Publishing it to a public interface can leak reset links, invoices, auth codes, and customer-like fixtures. In CI, bind it to the job network. On a shared VM, protect it as carefully as any other test artifact store.

## Configure The App Under Test

Most app failures around smtp4dev happen before a single test assertion runs. The app is still sending to SendGrid, SES, Gmail, or a production relay because only the web app container was changed, not the worker process or background job. Treat SMTP configuration as part of the test fixture and assert it at startup.

| App setting | Local smtp4dev value | Notes |
|---|---|---|
| SMTP host from host machine | \`127.0.0.1\` | Use the mapped host port |
| SMTP host from Docker Compose sibling | \`smtp4dev\` | Service name resolves on the compose network |
| SMTP port from host machine | \`2525\` | If mapped as \`2525:25\` |
| SMTP port from compose sibling | \`25\` | Container-to-container uses internal port |
| TLS | Usually disabled for local CI | smtp4dev supports TLS/STARTTLS, but keep local smoke tests simple |
| Authentication | Usually disabled unless testing auth | smtp4dev supports auth validation expressions |

\`\`\`ts
import nodemailer from 'nodemailer';

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const smtpHost = process.env.SMTP_HOST ?? '127.0.0.1';
const smtpPort = Number(process.env.SMTP_PORT ?? '2525');

export async function sendTestEmail(input: MailInput): Promise<string> {
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false
  });

  const result = await transport.sendMail({
    from: 'QA Robot <qa@example.test>',
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  await transport.close();
  return result.messageId;
}
\`\`\`

That helper is intentionally boring. It sends both HTML and text, closes the transport, and returns a message ID. Your application code may use a queue or framework mailer, but the same contract applies: when running tests, every process that can send email must receive the same SMTP host and port.

## Query Captured Mail Through The REST API

smtp4dev's repository advertises an OpenAPI/Swagger API. The controller source confirms useful endpoints such as \`GET /api/Messages\` for message summaries, \`GET /api/Messages/new\` for messages since a known ID, \`GET /api/Messages/{id}\` for full details, \`GET /api/Messages/{id}/html\`, \`GET /api/Messages/{id}/plaintext\`, \`GET /api/Messages/{id}/raw\`, and \`DELETE /api/Messages/{id}\`. Query parameters on the summary endpoint include \`searchTerms\`, \`mailboxName\`, \`folderName\`, \`sortColumn\`, \`sortIsDescending\`, \`page\`, and \`pageSize\`.

Use the API as a polling target. The SMTP send completes when smtp4dev accepts the message, but a real app may enqueue mail asynchronously. Poll by recipient or subject, then fetch the full message or the HTML/plaintext endpoint.

\`\`\`ts
import assert from 'node:assert/strict';

type MessageSummary = {
  id: string;
  subject: string;
  from: string;
  to: string;
  receivedDate: string;
};

type PagedResult = {
  results?: MessageSummary[];
  items?: MessageSummary[];
};

const smtp4devBaseUrl = process.env.SMTP4DEV_URL ?? 'http://127.0.0.1:5000';

function itemsFrom(result: PagedResult): MessageSummary[] {
  return result.results ?? result.items ?? [];
}

export async function findMessageByRecipient(recipient: string): Promise<MessageSummary> {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    const url = new URL('/api/Messages', smtp4devBaseUrl);
    url.searchParams.set('searchTerms', recipient);
    url.searchParams.set('pageSize', '20');

    const response = await fetch(url);
    assert.equal(response.status, 200);

    const payload = (await response.json()) as PagedResult;
    const match = itemsFrom(payload).find((message) => message.to.includes(recipient));

    if (match) {
      return match;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(\`No smtp4dev message found for \${recipient}\`);
}
\`\`\`

The \`itemsFrom\` helper is defensive because API model names have varied across fake SMTP tools and generated clients. If you generate a typed client from smtp4dev's Swagger endpoint in your own repo, replace it with the generated type and delete the fallback. The important test behavior is the same: assert HTTP status, narrow the result set, and time out with a recipient-specific error.

## A Complete Password Reset Test

This example drives the product, waits for smtp4dev, checks the envelope, extracts the reset link from HTML, and proves the reset flow changes app state. The test does not merely assert that a mail was sent. It asserts that the user can actually use it.

\`\`\`ts
import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { findMessageByRecipient } from './smtp4dev-client';

const smtp4devBaseUrl = process.env.SMTP4DEV_URL ?? 'http://127.0.0.1:5000';

async function getHtml(messageId: string): Promise<string> {
  const response = await fetch(new URL(\`/api/Messages/\${messageId}/html\`, smtp4devBaseUrl));
  expect(response.status).toBe(200);
  return response.text();
}

function extractResetUrl(html: string): string {
  const dom = new JSDOM(html);
  const links = [...dom.window.document.querySelectorAll('a')];
  const resetLink = links.find((link) => link.textContent?.trim() === 'Reset password');
  expect(resetLink, 'reset password link should exist').toBeTruthy();

  const href = resetLink?.getAttribute('href');
  expect(href, 'reset password link should have href').toBeTruthy();

  const url = new URL(href as string);
  expect(url.hostname).toBe('app.example.test');
  expect(url.pathname).toBe('/reset-password');
  expect(url.searchParams.get('token')).toMatch(/^[A-Za-z0-9_-]{20,}$/);
  return url.toString();
}

test('password reset email works through smtp4dev', async ({ page }) => {
  const email = \`reset-\${Date.now()}@example.test\`;

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();

  const message = await findMessageByRecipient(email);
  expect(message.subject).toContain('Reset your password');
  expect(message.to).toContain(email);

  const html = await getHtml(message.id);
  const resetUrl = extractResetUrl(html);

  await page.goto(resetUrl);
  await page.getByLabel('New password').fill('correct horse battery staple 42');
  await page.getByLabel('Confirm password').fill('correct horse battery staple 42');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();
});
\`\`\`

One practical note for AI coding agents: ask the agent to create a small smtp4dev client module instead of scattering \`fetch('/api/Messages')\` across tests. That gives humans one place to review polling, response shape, and cleanup behavior.

## IMAP Retrieval For Mail-Client-Like Tests

The README confirms IMAP and POP3 access for retrieving and deleting messages. Use this when the system under test includes a mail client integration, or when you want to validate that your service works against mailbox protocols rather than a vendor-specific REST API. For ordinary E2E tests, the REST API is simpler. For mailbox behavior, IMAP is a better fit.

\`\`\`ts
import assert from 'node:assert/strict';
import { ImapFlow } from 'imapflow';

const client = new ImapFlow({
  host: process.env.SMTP4DEV_IMAP_HOST ?? '127.0.0.1',
  port: Number(process.env.SMTP4DEV_IMAP_PORT ?? '1143'),
  secure: false,
  auth: {
    user: process.env.SMTP4DEV_IMAP_USER ?? 'user',
    pass: process.env.SMTP4DEV_IMAP_PASSWORD ?? 'pass'
  }
});

export async function assertInboxHasSubject(subject: string): Promise<void> {
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');

  try {
    const messages = [];
    for await (const message of client.fetch('1:*', { envelope: true })) {
      messages.push(message.envelope.subject ?? '');
    }

    assert.ok(messages.includes(subject), \`Expected IMAP inbox to include subject: \${subject}\`);
  } finally {
    lock.release();
    await client.logout();
  }
}
\`\`\`

If authentication is not enabled in your smtp4dev instance, adjust the client configuration to match your chosen server settings. The point is not to force IMAP into every suite. It is to test protocol compatibility when your product claims to support mailbox retrieval, folder behavior, or delete-on-read workflows.

## Message Retention, Mailboxes, Relay, And Failure Simulation

smtp4dev is more than a mail bucket. The upstream README lists multiple mailboxes with routing rules, SMTP session logging, a multipart MIME inspector, HTML compatibility reports, a viewport size switcher, authentication, TLS/SSL, reply/compose/relay support, and scripting expressions including error simulation. The appsettings file documents environment-variable style configuration such as \`ServerOptions__Mailboxes__0\`, \`RelayOptions__SmtpServer\`, \`RelayOptions__SmtpPort\`, \`RelayOptions__Login\`, and \`RelayOptions__Password\`.

| Feature | Where it helps | Caution |
|---|---|---|
| Multiple mailboxes | Separate teams, products, or test personas | Name mailboxes explicitly in API calls when not using default |
| Relay options | Forward selected messages to a real SMTP server | Keep automatic relay disabled in CI unless the test requires it |
| SMTP session logs | Diagnose handshake, TLS, auth, recipient rejection | Logs can contain addresses and payload clues |
| HTML validation and compatibility checks | Catch malformed template output early | Do not treat local compatibility as proof across all real clients |
| Scripting expressions | Simulate recipient rejection, throttling, or disconnects | Keep failure simulations isolated from normal smoke tests |

\`\`\`yaml
services:
  smtp4dev:
    image: rnwood/smtp4dev:v3
    ports:
      - '127.0.0.1:5000:80'
      - '127.0.0.1:2525:25'
    environment:
      ServerOptions__Mailboxes__0: 'ProductA=*@product-a.test'
      ServerOptions__Mailboxes__1: 'ProductB=*@product-b.test'
      RelayOptions__SmtpServer: ''
      RelayOptions__SmtpPort: '25'
\`\`\`

Relay deserves special care. In a developer sandbox, relay can be useful for reproducing a real provider issue or manually forwarding a captured message. In automated CI, relay is usually a risk. Empty relay configuration keeps captured messages inside smtp4dev and prevents accidental delivery to external recipients.

## CI With Docker Compose

In CI, start smtp4dev before the app, wait for the web/API port, inject SMTP settings into the application, run the email tests, and upload logs only on failure. Do not rely on arbitrary sleeps. Poll the web endpoint so failures are immediate and diagnosable.

\`\`\`yaml
name: email-tests

on:
  pull_request:

jobs:
  smtp4dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: docker compose -f docker-compose.smtp4dev.yml up -d smtp4dev
      - name: Wait for smtp4dev
        run: |
          for attempt in 1 2 3 4 5 6 7 8 9 10; do
            if curl -fsS http://127.0.0.1:5000/api/Server; then
              exit 0
            fi
            sleep 1
          done
          docker compose -f docker-compose.smtp4dev.yml logs smtp4dev
          exit 1
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run email specs
        env:
          SMTP_HOST: 127.0.0.1
          SMTP_PORT: 2525
          SMTP4DEV_URL: http://127.0.0.1:5000
        run: npx playwright test --grep @email
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: smtp4dev-playwright-\${{ github.run_id }}
          path: playwright-report
\`\`\`

If your application also runs in Docker Compose, set \`SMTP_HOST=smtp4dev\` and \`SMTP_PORT=25\` inside that app container. A common failure is using \`127.0.0.1:2525\` from inside the app container, which points back to the app container itself. From the host, use the mapped port. From a sibling container, use the service name and internal port.

## Failure Mode: The UI Shows Nothing, But SMTP Was Called

Here is a realistic diagnosis path. The application logs "email sent", but smtp4dev UI remains empty. First, prove the app target: log or assert the SMTP host and port at test startup. Second, check whether the app sends mail from a background worker that has different environment variables. Third, inspect smtp4dev session logs. A failed recipient command, TLS mismatch, or auth requirement can make the mailer report an error that your app swallows.

The sneaky version is queue timing. The request returns before the worker sends. Your Playwright test opens smtp4dev immediately, sees no message, and fails. The fix is not a hard sleep. Poll the API by recipient with a bounded timeout, and make the timeout message include the recipient and SMTP target. That turns a vague "email not found" into a lead an engineer can follow.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { findMessageByRecipient } from './smtp4dev-client';

test('@email invite email is delivered by the worker', async ({ page }) => {
  const invitee = \`invite-\${Date.now()}@example.test\`;

  await page.goto('/team/invite');
  await page.getByLabel('Email').fill(invitee);
  await page.getByRole('button', { name: 'Send invite' }).click();
  await expect(page.getByText('Invite queued')).toBeVisible();

  const message = await findMessageByRecipient(invitee);

  expect(message.to).toContain(invitee);
  expect(message.subject).toMatch(/^You have been invited to /);
});
\`\`\`

What people get wrong: they test "sent" by mocking the mailer in application code, then separately test smtp4dev with a direct Nodemailer script. That misses the integration boundary where bugs live. Keep unit tests for mailer formatting, but have at least one E2E or service-level test where the real app configuration sends through smtp4dev.

## When smtp4dev Is The Wrong Tool

smtp4dev is a strong local SMTP server, but it should not be stretched into every messaging need. It does not validate inbox deliverability at a real provider, it does not cover SMS, and local rendering is not a substitute for client-specific screenshots. It is also not a long-term archive for sensitive test mail unless you operate it with retention, access controls, and storage policy.

Use a hosted testing service when your workflow requires public inbound domains, SMS, or globally reachable CI without container networking. Use a real email rendering platform when template correctness depends on Outlook, Gmail, iOS Mail, dark mode, or image blocking behavior. Use smtp4dev when you need fast, private, reproducible capture of outbound SMTP in development and CI.

## Frequently Asked Questions

### Is smtp4dev still maintained?

Yes. The upstream GitHub repository and Docker tags show active development, and the stable package line I verified is 3.15.0 from March 2026. There are also 3.16.0 prerelease tags. For normal QA and CI usage, pin \`rnwood/smtp4dev:v3\` or a stable version. Use prerelease tags only when you need a specific unreleased fix and are willing to absorb change.

### Which ports should I expose for tests?

Expose web/API port \`80\` from the container to a host port such as \`5000\`, and SMTP port \`25\` to a host port such as \`2525\`. Expose IMAP \`143\` or POP3 \`110\` only when tests need those protocols. Prefer localhost bindings such as \`127.0.0.1:5000:80\` so captured test messages are not visible on a public interface.

### Should I use REST or IMAP in automated assertions?

Use REST for most tests. It is easier to poll, filter, and fetch HTML or plaintext bodies. Use IMAP when the product itself claims mailbox protocol compatibility, or when you need to test client-like retrieval and deletion behavior. Mixing both in one ordinary password reset test usually adds complexity without improving the signal.

### Can smtp4dev replace email client rendering tests?

No. smtp4dev can inspect HTML, MIME parts, validation output, and local previews, which is valuable before merge. It cannot prove rendering across Gmail, Outlook, Apple Mail, or mobile clients. Treat it as the deterministic capture layer. Add specialized rendering tests for high-value templates whose layout, dark mode, or client-specific CSS behavior matters.
`,
};
