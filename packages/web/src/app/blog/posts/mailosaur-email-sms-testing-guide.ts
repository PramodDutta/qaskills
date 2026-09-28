import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mailosaur: Email and SMS Testing for Automated Suites',
  description: 'Mailosaur guide for QA engineers: automate email, SMS, OTP, magic-link, and CI checks with reliable inboxes, Playwright examples, and failure diagnostics.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# Mailosaur: Email and SMS Testing for Automated Suites

Mailosaur is a commercial email and SMS testing service for automated suites that need to receive real messages, inspect their content, extract links or one-time codes, and continue the browser flow. It is actively maintained: the official Node package is current, the Python package has 2026 releases, the Cypress plugin is listed in the Cypress plugin catalog, and Mailosaur's own documentation covers Playwright, Cypress, Selenium, WebdriverIO, Robot Framework, Node.js, Python, Java, .NET, Ruby, PHP, Go, and browser-side JavaScript.

The important status detail is that Mailosaur is not a disposable local SMTP catcher like Mailpit or smtp4dev. It is a paid hosted platform with inboxes, wildcard test addresses, API keys, retention controls, optional SMS/authentication add-ons, and plan limits. The official pricing page currently lists Personal from $20 per month billed annually with one inbox and 15,000 inbound emails per month, Core from $50 per month billed annually with multiple inboxes and 75,000 inbound emails per month, and SMS/authentication as an add-on starting from $37.50 per month. Treat those numbers as procurement inputs, not constants in tests, because account limits can be customized.

Use Mailosaur when your test has to leave the app, wait for a delivered email or SMS, prove that the message is addressed correctly, then use its real link, OTP, attachment, or body text. For purely local template debugging, a tool like [Mailpit](/blog/mailpit-email-testing-guide) is often cheaper and faster. For login journeys where the link itself is the product behavior, pair this guide with a flow-level pattern such as [testing passwordless email magic link flow](/blog/testing-passwordless-email-magic-link-flow).

## Current Product Shape And Limits To Plan Around

Mailosaur calls its inboxes servers in much of the API. Each inbox has a unique server ID, and that ID becomes a wildcard email domain. Any address ending in \`@SERVER_ID.mailosaur.net\` can receive mail without pre-creating the mailbox address. This wildcard pattern is the feature that makes parallel tests practical: generate a unique address per test, submit it through the UI, then search for a message sent to that exact address.

The official Node.js guide documents \`messages.get(serverId, criteria, options)\` as the preferred retrieval method because it waits for a matching message and returns the full message object. The default wait is 10 seconds, and \`timeout\` is expressed in milliseconds. By default, searches consider messages received in the last hour; use \`receivedAfter\` when you want the test window to begin at a captured timestamp.

| Capability | Confirmed current behavior | Test design impact |
|---|---|---|
| Hosted inboxes | Inboxes have unique server IDs and wildcard domains | Generate a new recipient per test instead of sharing one address |
| Message lookup | \`messages.get\` waits and returns the full message | Prefer it over list/search in E2E tests |
| Search criteria | \`sentTo\`, \`sentFrom\`, \`subject\`, \`body\`, with \`match\` in the API reference | Combine recipient and subject to avoid stale matches |
| Time window | Default lookup window is recent mail, with \`receivedAfter\` override | Capture \`testStart\` before triggering the app action |
| SMS | Phone numbers are assigned to inboxes and fetched with the same message API style | Keep SMS tests in a smaller tagged suite because they consume paid resources |
| SMTP | Hosted SMTP endpoint uses \`smtp.mailosaur.net\` on port \`2525\` with inbox credentials | Useful for staging apps that can be pointed at a test SMTP server |

What people get wrong: they search by subject alone. That passes locally, then fails in CI because another run generated the same subject. Search by a unique recipient or phone number, include a subject/body discriminator when useful, and set \`receivedAfter\` to the moment before the user action. This turns the inbox from a shared bucket into a per-test queue.

## Build A Playwright Email Test Around The Message, Not The Inbox

A resilient Mailosaur test has five phases: create a unique recipient, trigger the product action, retrieve the message with scoped criteria, assert the envelope and content, then continue the browser journey using the extracted link or code. Do not assert only that a message arrived. Assert that the message was sent to the user you created, came from the expected sender, contains the expected call to action, and produces the expected state change in the app.

\`\`\`ts
import { test, expect } from '@playwright/test';
import MailosaurClient from 'mailosaur';

const apiKey = process.env.MAILOSAUR_API_KEY;
const serverId = process.env.MAILOSAUR_SERVER_ID;

if (!apiKey || !serverId) {
  throw new Error('MAILOSAUR_API_KEY and MAILOSAUR_SERVER_ID are required');
}

const mailosaur = new MailosaurClient(apiKey);

test('new user verifies an email address', async ({ page }) => {
  const testStart = new Date();
  const emailAddress = mailosaur.servers.generateEmailAddress(serverId);

  await page.goto('/signup');
  await page.getByLabel('Email').fill(emailAddress);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();

  const message = await mailosaur.messages.get(
    serverId,
    {
      sentTo: emailAddress,
      subject: 'Verify your email'
    },
    {
      receivedAfter: testStart,
      timeout: 30000
    }
  );

  expect(message.to[0].email).toBe(emailAddress);
  expect(message.from[0].email).toBe('noreply@example.com');
  expect(message.subject).toBe('Verify your email');
  expect(message.html.body).toContain('Confirm your account');

  const verifyLink = message.html.links.find((link) => link.text.includes('Verify'));
  if (!verifyLink?.href) throw new Error('Verification link missing from the email');
  expect(verifyLink.href).toMatch(/^https:\\/\\/app\\.example\\.com\\/verify/);

  await page.goto(verifyLink.href);
  await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible();
});
\`\`\`

Notice the order. The test captures \`testStart\` before clicking the product action. It searches by the generated recipient and subject. It checks sender and recipient before opening the link. It asserts a page-level outcome after following the link. Those details prevent the common false positive where the test finds an old message, follows an old link, and still reports success because the page happened to load.

## Extract Links And OTP Codes Without Fragile Parsing

Mailosaur parses email content and exposes links in \`html.links\` and \`text.links\`. It also extracts verification codes into \`html.codes\` and \`text.codes\`. Use those arrays before writing your own parser. When the product sends both HTML and plain text, assert both are usable. A plain text part matters for accessibility, deliverability, and fallback clients.

| Content type | Mailosaur field | Assertion that catches real defects |
|---|---|---|
| HTML body | \`message.html.body\` | Required CTA text appears, hidden fallback text is not the only content |
| Plain text body | \`message.text.body\` | Same destination and instructions exist without HTML |
| Links | \`message.html.links\`, \`message.text.links\` | URL host, path, and token parameters match the expected environment |
| Codes | \`message.html.codes\`, \`message.text.codes\` | Code exists once and has the expected length or format |
| Attachments | \`message.attachments\` plus \`files.getAttachment\` | File name, content type, byte length, and decoded content are checked |

\`\`\`ts
import { expect } from '@playwright/test';

type MailosaurLink = { text?: string; href: string };
type MailosaurCode = { value: string };
type MailosaurMessage = {
  html?: { links?: MailosaurLink[]; codes?: MailosaurCode[]; body?: string };
  text?: { links?: MailosaurLink[]; codes?: MailosaurCode[]; body?: string };
};

export function getLoginLink(message: MailosaurMessage): string {
  const htmlLinks = message.html?.links ?? [];
  const textLinks = message.text?.links ?? [];
  const allLinks = [...htmlLinks, ...textLinks];
  const loginLink = allLinks.find((link) => {
    const url = new URL(link.href);
    return url.hostname === 'app.example.com' && url.pathname === '/login/magic';
  });

  if (!loginLink) throw new Error('magic login link should be present');
  return loginLink.href;
}

export function getSixDigitCode(message: MailosaurMessage): string {
  const allCodes = [...(message.html?.codes ?? []), ...(message.text?.codes ?? [])];
  const matchingCodes = allCodes.filter((code) => /^[0-9]{6}$/.test(code.value));

  expect(matchingCodes, 'exactly one six digit code should be present').toHaveLength(1);
  return matchingCodes[0].value;
}
\`\`\`

The helper above still uses a regex, but it uses Mailosaur's extracted code values as input. That is different from scraping the entire email body with a permissive pattern that might capture an invoice number, support ticket ID, or year. For links, parse with \`URL\` and assert the host and path. Substring matching on the entire href is too easy to fool when environments share domains or redirect paths.

## SMS And 2FA Tests Need Their Own Budget

Mailosaur SMS testing works by assigning a phone number to an inbox, sending SMS to that number, and retrieving the resulting message through the API. The official SMS docs say the code for SMS automation is almost identical to email automation, but the operational model is not identical. Email addresses are wildcard and cheap to generate. Phone numbers are allocated resources, and SMS traffic usually has tighter cost and throughput constraints.

For CI, put SMS tests behind a tag or project that runs on release branches, nightly builds, or explicit workflow dispatch. Run fast email flows on every pull request, but do not make every contributor wait on external SMS delivery unless the changed area affects authentication or messaging.

\`\`\`ts
import { test, expect } from '@playwright/test';
import MailosaurClient from 'mailosaur';

const apiKey = process.env.MAILOSAUR_API_KEY;
const serverId = process.env.MAILOSAUR_SERVER_ID;
const smsNumber = process.env.MAILOSAUR_SMS_NUMBER;

if (!apiKey || !serverId || !smsNumber) {
  throw new Error('MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID, and MAILOSAUR_SMS_NUMBER are required');
}

const mailosaur = new MailosaurClient(apiKey);

test('user signs in with an SMS verification code', async ({ page }) => {
  const testStart = new Date();

  await page.goto('/login');
  await page.getByLabel('Phone number').fill(smsNumber);
  await page.getByRole('button', { name: 'Send code' }).click();

  const sms = await mailosaur.messages.get(
    serverId,
    { sentTo: smsNumber, body: 'Your ExampleApp code' },
    { receivedAfter: testStart, timeout: 45000 }
  );

  const code = sms.text.codes.find((entry) => /^[0-9]{6}$/.test(entry.value));
  if (!code?.value) throw new Error('SMS should contain one six digit verification code');

  await page.getByLabel('Verification code').fill(code.value);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

If this test fails intermittently, diagnose by looking at three things in order: whether the SMS is visible in the Mailosaur dashboard, whether the app sent to the exact allocated number, and whether your search window began too late. Do not immediately increase the timeout to two minutes. Longer waits hide routing mistakes and turn a deterministic configuration bug into a slow failure.

## Cypress, SDKs, And When To Use The Raw API

Mailosaur's Cypress quickstart documents the official \`cypress-mailosaur\` package, imported from \`cypress/support/e2e.js\`, with \`CYPRESS_MAILOSAUR_API_KEY\` available as the environment variable alternative to hardcoding the key. For Cypress-heavy teams, those commands keep test code idiomatic. For Playwright and other Node-based suites, the \`mailosaur\` Node client is usually simpler because it can be used directly in test fixtures and helpers.

| Stack | Recommended integration | Good fit |
|---|---|---|
| Playwright | \`mailosaur\` Node SDK in fixtures/helpers | Browser flows that continue after email or SMS |
| Cypress | \`cypress-mailosaur\` custom commands | Teams that keep all test actions inside Cypress command chains |
| Python | Official \`mailosaur\` package from PyPI | Pytest suites, service checks, backend test jobs |
| Java/.NET | Official SDKs listed in Mailosaur docs | Enterprise stacks that already drive Selenium or API tests there |
| Raw REST API | \`GET /api/servers\`, \`GET /api/messages/:id\`, search/list endpoints | Diagnostics, cross-language glue, or tools without SDK support |

\`\`\`js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://app.example.com',
    setupNodeEvents() {
      return undefined;
    }
  },
  env: {
    MAILOSAUR_SERVER_ID: 'SERVER_ID'
  }
});
\`\`\`

\`\`\`js
import 'cypress-mailosaur';
// cy.findByLabelText and cy.findByRole come from Cypress Testing Library (@testing-library/cypress).
import '@testing-library/cypress/add-commands';

describe('email verification', () => {
  it('receives a verification email', () => {
    // Cypress 16 removed Cypress.env(); cy.env() reads CYPRESS_MAILOSAUR_SERVER_ID without exposing it to the browser.
    cy.env(['MAILOSAUR_SERVER_ID']).then(({ MAILOSAUR_SERVER_ID: serverId }) => {
      const email = \`signup-\${Date.now()}@\${serverId}.mailosaur.net\`;

      cy.visit('/signup');
      cy.findByLabelText('Email').type(email);
      cy.findByRole('button', { name: 'Create account' }).click();

      cy.mailosaurGetMessage(serverId, {
        sentTo: email,
        subject: 'Verify your email'
      }).then((message) => {
        expect(message.to[0].email).to.equal(email);
        expect(message.html.links.length).to.be.greaterThan(0);
      });
    });
  });
});
\`\`\`

Use \`cypress-mailosaur\` 4.0 or later with Cypress 16: the plugin moved from \`Cypress.env\` to \`cy.env\`. Make sure the API key is supplied by \`CYPRESS_MAILOSAUR_API_KEY\` in the runner environment, not in \`cypress.config.js\` committed to source control. Keep the server ID in non-secret config if the inbox is dedicated to test, but treat the API key as a credential because it can read and delete messages.

## CI Wiring For Pull Requests And Release Gates

CI should separate fast email checks from slower paid-channel checks. The example below runs Playwright tests tagged \`@email\` on pull requests and makes an SMS job manual by using \`workflow_dispatch\`. It pins current action majors, stores traces only on failure, and keeps Mailosaur secrets in GitHub Actions secrets.

\`\`\`yaml
name: messaging-tests

on:
  pull_request:
  workflow_dispatch:

jobs:
  email:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run email tests
        env:
          MAILOSAUR_API_KEY: \${{ secrets.MAILOSAUR_API_KEY }}
          MAILOSAUR_SERVER_ID: \${{ secrets.MAILOSAUR_SERVER_ID }}
        run: npx playwright test --grep @email
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: playwright-report-\${{ github.run_id }}
          path: playwright-report

  sms:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run SMS tests
        env:
          MAILOSAUR_API_KEY: \${{ secrets.MAILOSAUR_API_KEY }}
          MAILOSAUR_SERVER_ID: \${{ secrets.MAILOSAUR_SERVER_ID }}
          MAILOSAUR_SMS_NUMBER: \${{ secrets.MAILOSAUR_SMS_NUMBER }}
        run: npx playwright test --grep @sms
\`\`\`

Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the important design principle is independent of the runner: the agent or human who changes an auth flow should have a small, named messaging suite that can be executed locally and in CI without reading a long wiki page.

## Failure Mode: The Message Arrives, But The Test Times Out

A realistic failure looks like this: the app shows "Check your email", Mailosaur dashboard shows a fresh message, but \`messages.get\` times out. The root cause is usually a mismatch in search criteria, not delivery. Maybe the app lowercased the recipient, the test generated \`user+run@example\` but the product rejected plus addressing, or the subject changed from "Verify your email" to "Confirm your email address".

Diagnose it with a temporary list/search step that prints summaries for messages received after the test start. Do this in a branch or local run, not as permanent noisy CI logging.

\`\`\`ts
import MailosaurClient from 'mailosaur';

const apiKey = process.env.MAILOSAUR_API_KEY;
const serverId = process.env.MAILOSAUR_SERVER_ID;

if (!apiKey || !serverId) {
  throw new Error('MAILOSAUR_API_KEY and MAILOSAUR_SERVER_ID are required');
}

const mailosaur = new MailosaurClient(apiKey);

export async function printRecentSubjects(): Promise<void> {
  const result = await mailosaur.messages.search(
    serverId,
    { sentTo: 'debug@example.test' },
    { timeout: 10000, errorOnTimeout: false }
  );

  for (const item of result.items) {
    console.log([item.id, item.subject, item.received].join(' | '));
  }
}
\`\`\`

Once you identify the mismatch, fix the criteria. Do not leave a broad \`body\` search in place because it can match marketing footers, legal text, or a previous email in a multi-step journey. If you need to prove absence, use \`messages.search\` with \`errorOnTimeout: false\`, then assert the result count is zero for the exact recipient and subject.

## Choosing Mailosaur Versus Local Mail Capture

Mailosaur is strongest when hosted delivery behavior matters: password resets in staging, SMS OTP, email replies, external address forwarding, POP3/IMAP connectivity, spam analysis, and tests run by distributed CI agents. Local capture tools are strongest when you want zero SaaS dependency, free local development, and full control inside Docker Compose.

| Decision point | Choose Mailosaur | Choose a local catcher |
|---|---|---|
| SMS or 2FA by phone | Yes, with allocated numbers | Usually no |
| Pull request email smoke tests | Yes, if staging is hosted | Yes, if app runs entirely in CI |
| Template iteration | Useful, but paid | Better default for rapid local loops |
| Compliance or procurement | Needs vendor review | Simpler for local-only testing |
| Agent-driven setup | Stable API and SDKs help coding agents | Docker Compose is easier for isolated sandboxes |
| Production-like SMTP credentials | Hosted SMTP and inbox passwords | Good only if your app can target local network services |

For AI coding agents, Mailosaur's advantage is explicit API shape. An agent can add a test helper around \`messages.get\`, wire secrets into CI, and assert links or codes without reverse engineering a web UI. The risk is cost and secret handling. Give agents a narrow task, a dedicated inbox/server ID, and a clear rule that destructive cleanup such as \`messages.deleteAll\` belongs only in isolated test inboxes.

## Frequently Asked Questions

### Is Mailosaur only for email testing?

No. Mailosaur covers email and SMS testing, and its docs also include authentication workflows such as one-time codes and TOTP-related testing. Email is the easiest starting point because wildcard addresses let you generate a unique recipient for every test. SMS needs more planning because phone numbers are allocated to inboxes and SMS/authentication is priced as an add-on on current plans.

### Should every pull request run Mailosaur SMS tests?

Usually no. Run email smoke tests on pull requests when they are stable and cheap enough for your team. Keep SMS tests tagged separately and run them on release branches, nightly builds, manual workflow dispatch, or changes that touch authentication. SMS delivery has external routing, cost, and phone-number constraints, so it should guard important flows without slowing every UI copy change.

### How do I stop Mailosaur tests from reading old emails?

Generate a unique recipient per test, capture a \`testStart\` timestamp before triggering the product action, and pass \`receivedAfter: testStart\` to \`messages.get\`. Also search by \`sentTo\` plus a meaningful subject or body fragment. Avoid shared addresses and broad subject-only searches. If the suite is highly parallel, dedicate separate inboxes to noisy test groups.

### Can AI coding agents safely add Mailosaur tests?

Yes, if you constrain the task. Ask the agent to use the official SDK, keep API keys in environment variables, create a unique address per test, and assert the post-click product state. Review any cleanup code carefully. Deleting a single known message in a disposable inbox is different from deleting all messages in a shared QA inbox.
`,
};
