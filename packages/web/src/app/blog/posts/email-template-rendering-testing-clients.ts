import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Email Template Rendering Across Clients: Dark Mode and Clipping',
  description: 'Email template testing across Gmail, Outlook, and Apple Mail: catch dark mode inversion, clipping, image blocking, and CTA breakage before send.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Email Template Rendering Across Clients: Dark Mode and Clipping

Email template testing is the practice of rendering the same HTML (and plain-text) email fixture in representative clients, then asserting layout, contrast, links, and multipart consistency before a campaign or transactional send. You do it by compiling templates to fixture HTML, opening those fixtures under light and dark modes, checking clipping and overflow, verifying preheaders and alt text when images are blocked, and asserting CTA URLs (including UTM and magic-link patterns) against expected values. Screenshot matrices and local Playwright checks catch regressions that unit tests on template strings will never see.

Email is not a browser. That sentence is the whole reason this discipline exists. Gmail, Outlook (desktop Word engine and Outlook.com), and Apple Mail each rewrite, strip, or reinterpret CSS differently. Dark mode may invert your carefully chosen palette. Overflow hidden and fixed heights clip CTAs on Outlook. Image blocking removes your hero and leaves empty boxes if alt text is missing. A green check in your web preview is not a ship signal.

Ready-made QA skills for related flows install from qaskills.sh with the qaskills CLI when you want a packaged checklist beside this guide. The rest of this article is a practitioner workflow you can run without buying a screenshot farm on day one.

## A Launch That Looked Fine Until Inbox Dark Mode

Symptom: a product launch email passed internal webmail preview. Design signed off on a light-theme Figma export. Support tickets arrived within an hour: "I cannot read the offer," "button is black on black," "half the card is cut off in Outlook."

Wrong theory: "Marketing changed the copy after QA." Copy had not changed. Another wrong theory: "Someone forgot to upload images." Images loaded fine in light mode. The tickets clustered on iOS Mail dark mode and Outlook desktop.

Actual cause: the template used dark text on a translucent white card, with background color only on the outer body. Apple Mail's dark mode inverted the body background but left the card translucent, so dark text sat on a now-dark surface. Separately, Outlook desktop ignored a max-height media query meant to shrink a hero; a nested table with overflow:hidden (which Outlook largely ignores or mishandles) plus a fixed-height cell clipped the primary CTA below the fold of the clipped region.

Fix: explicit dark-mode safe colors using supported color-scheme meta and dual background/text pairs that keep contrast without relying on inversion. Replace the clipped hero with a fluid table layout and a bulletproof CTA pattern (table-based button with VML fallback for Outlook where required). Add a dark-mode row to the screenshot matrix and an Outlook desktop capture before every release.

That failure is why email template testing is not "open in Chrome and squint." It is a client matrix with explicit assertions.

## What People Get Wrong About Email Template Testing

People treat the HTML email like a React page. They expect flexbox, gap, modern CSS grid, web fonts without fallbacks, and sticky headers to survive. They do not. They also treat Litmus-style or Email-on-Acid-style screenshot services as the only valid proof, then invent CLI flags that do not exist when writing CI scripts. Screenshot services are useful as a visual matrix; they are not a substitute for fixture HTML under version control, local rendering checks, and link assertions.

Another common miss: testing only the HTML part. Multipart MIME emails ship text/plain and text/html. If the plain-text part still says "Click here" with a stale staging URL while HTML has the production CTA, some clients and security gateways prefer or show the text part. Subject and preheader can disagree with the first visible line, which trains users to ignore your brand. QA that never opens the raw MIME is incomplete.

People also forget that transactional templates (receipts, magic links, password resets, notification digests) need the same rendering discipline as marketing. A clipped "Reset password" button is a support incident, not a brand nit.

## Build a Client Matrix Before You Touch CSS

Start with a written matrix. Do not expand to every obscure client on day one. Cover the engines your users actually use, then add rows when analytics or support demand them.

| Client / Surface | Engine Reality | Must-Check Behaviors | Fixture Mode |
|---|---|---|---|
| Gmail (web) | Aggressive CSS inlining and class rewriting | Clipping of wide tables, link wrapping, dark theme shifts | Light + dark if available |
| Gmail (iOS / Android) | Mobile webkit-ish with Gmail constraints | Tap target size, image blocking, preheader visibility | Light + dark |
| Outlook desktop (Windows) | Word-based HTML rendering | VML buttons, width quirks, overflow/clipping, DPI scaling | Light (dark varies by version) |
| Outlook.com / new Outlook | Closer to web clients, still not Chrome | Media query support gaps, padding collapse | Light + dark |
| Apple Mail (macOS / iOS) | WebKit with strong dark-mode inversion | Color inversion traps, remote content prompts, RTL | Light + dark |
| Plain-text only / security gateway | No HTML | Multipart text consistency, URL integrity | Text part dump |

Your matrix drives fixture names: \`welcome.gmail-dark.html\`, \`receipt.outlook-desktop.html\`, and so on. Store compiled HTML in the repo (or regenerate deterministically in CI). Do not screenshot only from a designer's laptop mail app and call it coverage.

## Dark Mode Color Inversion Traps

Dark mode is the highest-frequency visual failure after broken images. Clients invert or remap colors using different heuristics. Transparent backgrounds are especially dangerous: inversion changes the page chrome and body, while your semi-transparent card stays visually wrong relative to text.

Practical rules that survive most clients:

1. Set color-scheme intentionally in the document head when the client honors it.
2. Prefer solid background colors on every content cell, not only the outer body.
3. Pair every text color with an explicit background on the same cell or a parent that clients keep.
4. Avoid pure \`#000000\` text on \`#FFFFFF\` cards if you also ship transparent overlays; some inverters treat pure black/white as special.
5. Retest logos: many logos are dark-on-transparent PNGs that vanish on dark backgrounds. Ship a dark-mode-safe logo variant or add a solid backing cell.

\`\`\`html
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Receipt</title>
    <style>
      :root { color-scheme: light dark; }
      @media (prefers-color-scheme: dark) {
        .body-bg { background-color: #0f1419 !important; }
        .card-bg { background-color: #1a2332 !important; }
        .text-main { color: #f3f5f7 !important; }
        .text-muted { color: #c2c8d0 !important; }
      }
    </style>
  </head>
  <body class="body-bg" style="margin:0;padding:0;background-color:#f4f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" class="body-bg" style="padding:24px;background-color:#f4f6f8;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" class="card-bg" style="background-color:#ffffff;">
            <tr>
              <td class="text-main" style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                Your order is confirmed.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
\`\`\`

That snippet is conceptual HTML email practice, not a promise that every client honors \`prefers-color-scheme\`. Gmail and Apple Mail differ. Outlook desktop may ignore parts of it. Your test plan must include a dark-mode screenshot row even when CSS support is partial, because inversion can still rewrite colors you did not mark.

Assert contrast in tests where you can sample pixels, or at least review screenshots with a checklist: body background, card background, heading, body copy, link color, CTA label, footer legal text. If any pair fails readable contrast after inversion, fail the build or the review.

## CSS Clipping, Overflow, and Outlook Reality

Clipping is the second major failure mode. Designers use overflow:hidden, fixed heights, and absolute positioning to get pixel-perfect cards on the web. Outlook's Word engine does not behave like a browser. Overflow hidden is unreliable. Absolute positioning is a trap. Max-height media queries that shrink heroes on mobile may be ignored, leaving tall cells that push CTAs below a clipped region or outside the visible card.

Symptoms that point to clipping:

- CTA visible in Gmail web, missing in Outlook desktop screenshots
- Borders that cut through button text
- Images that bleed outside rounded corners in webkit but get squared and cropped oddly in Outlook
- "Ghost" whitespace where a fixed-height cell reserved space for content that reflowed taller

What to do instead:

- Prefer fluid table layouts with explicit widths on outer containers (often 560-600px for desktop-centric templates)
- Let rows grow with content; do not clip text containers
- Put CTAs in their own table row, not inside a fixed-height hero
- Test with long translated strings (German, Finnish) because clipping often appears first in localization

\`\`\`html
<!-- Fragile: fixed height + overflow invites Outlook clipping -->
<td style="height:120px;overflow:hidden;padding:16px;">
  <p style="margin:0;">Long localized string that may wrap...</p>
  <a href="https://example.com/cta">Continue</a>
</td>

<!-- Safer: separate rows, no overflow clip on text -->
<tr>
  <td style="padding:16px;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0 0 12px 0;">Long localized string that may wrap...</p>
  </td>
</tr>
<tr>
  <td style="padding:0 16px 16px 16px;">
    <!-- CTA cell -->
  </td>
</tr>
\`\`\`

When reviewing Outlook screenshots, scroll the full height of the message. Clipping bugs hide below the first screenful. If you only glance at the hero, you will ship a broken button.

## Table Layouts and Bulletproof CTA Patterns

HTML email still runs on tables for structure. Role presentation on layout tables reduces accessibility noise, while real content semantics stay limited compared to web apps. Bulletproof CTAs are a known pattern: a table cell with background color, padding, and an anchor, plus an Outlook-oriented VML rectangle when you must support older Word rendering.

You do not need a framework API to test this. Compile or hand-author a button fragment and assert:

- The anchor href is absolute HTTPS (or your documented scheme)
- UTM parameters match the campaign contract when present
- The visible label matches the plain-text counterpart
- Padding keeps a usable tap target on mobile screenshots

\`\`\`html
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" bgcolor="#0b57d0" style="border-radius:4px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
        href="https://example.com/pricing?utm_source=email&utm_medium=transactional&utm_campaign=welcome"
        style="height:44px;v-text-anchor:middle;width:220px;" arcsize="10%" stroke="f" fillcolor="#0b57d0">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
          View pricing
        </center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="https://example.com/pricing?utm_source=email&utm_medium=transactional&utm_campaign=welcome"
         style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:4px;">
        View pricing
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
\`\`\`

Link assertions belong in automated tests. Playwright can open a rendered HTML fixture as a page and read \`a[href]\` values. That catches staging URLs, missing UTM, and wrong paths without needing a mailbox.

Transactional emails that carry magic links should assert URL shape the same way you would in flow tests. The sibling guide on [testing passwordless email magic-link flows](/blog/testing-passwordless-email-magic-link-flow) covers token expiry, single use, and redirect safety. Rendering QA still owns: the CTA is visible in dark mode, not clipped in Outlook, and the href in HTML matches the href in the text/plain part.

## Media Queries Clients Ignore

Media queries help for fluid redesigns, but support is uneven. Some clients strip \`style\` blocks. Others keep them but ignore certain properties. Treat progressive enhancement as the rule: the default (non-media-query) layout must be readable. Mobile-specific stacking is a bonus when it works.

Test both widths intentionally:

| Width Fixture | Purpose | Typical Failures |
|---|---|---|
| 320-390 CSS px | Narrow mobile | CTA overflow, 600px tables forcing horizontal scroll |
| 600-800 CSS px | Desktop pane | Sparse padding, hero that looks fine only when wide |
| Zoom / text size increase | Accessibility | Clipped containers, overlapping cells |

Do not assert that a media query "always fires" in Gmail. Assert that the default table layout remains usable when the query does not fire.

\`\`\`css
/* Enhancement only: default layout must already work */
@media only screen and (max-width: 620px) {
  .email-container { width: 100% !important; }
  .stack-column { display: block !important; width: 100% !important; }
}
\`\`\`

In screenshot review, keep a "media query off" mental model: if the \`style\` block vanished, would the email still work? If not, fix the base tables.

## Image Blocking, Alt Text, and CSP-Like Constraints

Many clients block remote images until the user opts in. Corporate environments may proxy or strip them. Your template must read without images: alt text on every meaningful \`img\`, width and height attributes to reserve space, and a text hierarchy that does not live only inside the hero PNG.

Alt text is not a dumping ground for marketing slogans. Describe the image purpose. If the image is a button (discouraged; use HTML CTAs), the alt must match the action. Decorative spacers should use empty alt.

Also test what happens when images fail to load: broken-icon layout shifts, giant empty frames, and CTAs that were baked into a single hero image with no HTML fallback. Baked-in CTAs are a recurring accessibility and image-blocking failure.

Content Security considerations for webviews that display email-like HTML (in-app inboxes, admin previews) may block inline scripts (good) and sometimes remote images. Your admin preview should mimic image blocking with a toggle so designers see the alt-text path. Do not assume production Gmail CSP equals your preview iframe.

\`\`\`html
<img
  src="https://cdn.example.com/email/hero-welcome.png"
  width="560"
  height="200"
  alt="Welcome to Acme: your workspace is ready"
  style="display:block;width:100%;max-width:560px;height:auto;border:0;"
/>
\`\`\`

Automated check ideas: parse fixture HTML, fail if content images lack alt, fail if width/height missing on hero images, fail if the only CTA is an image map without a text link elsewhere.

## Preheader Length, Subject Alignment, and Multipart MIME

The preheader is the preview snippet after the subject in many inboxes. If you omit it, clients pull whatever text appears first, often "View in browser" or a leftover CSS remnant. Set an intentional preheader, keep it short enough to survive truncation, and align meaning with the subject.

Subject says the reason for the email. Preheader adds the next useful fact. They should not repeat verbatim, and they should not contradict the first heading in the body.

Multipart consistency checklist:

1. text/html and text/plain both present for transactional mail
2. Same primary URL(s) in both parts
3. No staging hosts in either part
4. Plain text includes the CTA URL as readable text, not only "click the button above"
5. Unsubscribe or account links match policy in both parts when required

| Field | Good Example | Failure Mode |
|---|---|---|
| Subject | Reset your Acme password | Vague "Action required" with no product cue |
| Preheader | Link expires in 30 minutes | Empty -> client shows "View online" |
| HTML H1 | Reset your password | Marketing slogan unrelated to subject |
| Text part CTA | https://example.com/reset?token=... | "Click here" with no URL |

Notification digests add another layer: event ordering and deduplication belong to the notification pipeline, while the template must still render a stable layout when the digest contains one event or fifty. Coordinate with [notification event schema and dedup testing](/blog/notification-event-schema-testing-dedup) so a dedup key change does not ship a template that assumes duplicate rows will never appear.

## Font Fallbacks, RTL, and Email Accessibility

Web fonts in email are inconsistent. Always declare a font stack that ends in widely available system fonts (Arial, Helvetica, sans-serif). Test that fallback metrics do not blow out button widths. Bold weights that only exist on the webfont can reflow when fallback kicks in.

RTL: if you ship Arabic or Hebrew, set \`dir="rtl"\` appropriately and test mirrored table layouts. Padding that looked fine in LTR can crowd icons against the wrong edge. Do not flip meaning of icons that are directional without providing RTL assets.

Accessibility in HTML email is constrained, but you can still:

- Use meaningful alt text
- Keep text in text nodes, not only images
- Maintain contrast in light and dark
- Give links descriptive labels ("Reset password" not "Click here")
- Mark layout tables with \`role="presentation"\` where appropriate
- Ensure focus order in clients that allow keyboard interaction with links

Screen reader behavior varies by client more than by browser. Treat accessibility checks as structured review plus HTML audits on fixtures, not as a single AXE run that proves inbox reality.

## Local HTML Fixtures and Playwright Assertions

You can get far without inventing third-party CLI flags. Pipeline:

1. Compile MJML or HTML templates into static fixtures under \`test/fixtures/email/\`
2. Open fixtures with Playwright (\`page.goto\` with a file URL or a tiny static server)
3. Assert links, UTM, visible CTA text, and critical CSS classes
4. Capture screenshots at defined viewports for light theme; add dark theme where you can emulate \`prefers-color-scheme\`
5. Store baselines or upload artifacts for human review on change

Playwright can emulate dark color scheme for engines that honor it. That does not equal Apple Mail inversion, so keep real-device or vendor screenshot rows for final confidence. Local checks still catch 80% of regressions early: wrong href, missing alt, accidental \`display:none\` on the CTA, broken table nesting.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import path from 'node:path';

const fixture = path.resolve('test/fixtures/email/welcome.light.html');

test('welcome email CTA href and label', async ({ page }) => {
  await page.goto(\`file://\${fixture}\`);

  const cta = page.getByRole('link', { name: 'View pricing' });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute(
    'href',
    'https://example.com/pricing?utm_source=email&utm_medium=transactional&utm_campaign=welcome'
  );
});

test('welcome email dark scheme still shows CTA', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(\`file://\${fixture}\`);
  await expect(page.getByRole('link', { name: 'View pricing' })).toBeVisible();
  await page.screenshot({
    path: 'artifacts/email/welcome.dark.png',
    fullPage: true
  });
});
\`\`\`

For magic-link templates, assert the href matches a safe pattern (host allowlist, path, token query param present) without printing live secrets into logs. Use deterministic fixture tokens in HTML fixtures; exercise live token issuance in the dedicated magic-link flow suite.

## Screenshot Matrix Approaches (Without Inventing Vendor CLIs)

A screenshot matrix is a table of captures: one row per template, columns per client or emulation target. You can build it three ways:

1. Local: Playwright or similar opens fixture HTML, emulates viewport and color scheme, saves PNGs as CI artifacts
2. Device lab: open the same MIME in real Apple Mail / Outlook desktop on shared VMs and capture manually or with OS tooling
3. Vendor preview services: upload HTML or send to seed addresses and collect their screenshots (use their documented UI or API; do not invent CLI flags)

Keep the matrix small and forced. Every template ships with at least: Gmail-like web light, narrow mobile, Outlook desktop, Apple Mail dark. Add more when a template uses risky CSS.

Review process: PR adds or updates fixtures -> CI renders local screenshots -> reviewer opens artifacts -> checklist covers dark mode contrast, clipping, image-off, CTA visibility, preheader text in HTML comment or hidden div, and link correctness already asserted in code.

\`\`\`javascript
// Illustrative matrix runner: renders fixture list to PNGs for artifact upload
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const fixtures = [
  'welcome.light.html',
  'receipt.light.html',
  'reset-password.light.html'
];

const outDir = 'artifacts/email-matrix';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const name of fixtures) {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  const file = path.resolve('test/fixtures/email', name);
  await page.goto(\`file://\${file}\`);
  await page.screenshot({
    path: path.join(outDir, name.replace(/\\.html$/, '.mobile.png')),
    fullPage: true
  });
  await page.close();
}
await browser.close();
\`\`\`

Upload \`artifacts/email-matrix\` with actions/upload-artifact@v4 in GitHub Actions. Pair with a job that fails on link assertion errors; keep screenshots as review evidence rather than flaky pixel diffs unless you invest in stable baselines.

## CI Pipeline for Fixture HTML

A practical CI shape:

1. Install dependencies (actions/checkout@v4, actions/setup-node@v4)
2. Build or compile templates into \`test/fixtures/email\`
3. Run Node tests that parse HTML for alt text, mandatory links, multipart text fixtures
4. Run Playwright fixture tests for visibility and href assertions
5. Generate screenshot artifacts and upload them
6. Optional: send to a capture service via its documented API if your org uses one

Keep MIME raw files for at least one transactional template so you can assert boundary parts. A tiny parser check can verify \`Content-Type: multipart/alternative\` and that both parts include the primary CTA URL.

\`\`\`typescript
import fs from 'node:fs';
import assert from 'node:assert/strict';

const raw = fs.readFileSync('test/fixtures/email/reset-password.eml', 'utf8');
assert.match(raw, /Content-Type:\\s*multipart\\/alternative/i);
assert.match(raw, /https:\\/\\/example\\.com\\/reset\\?token=[a-z0-9-]+/i);

const htmlHref = [...raw.matchAll(/href="(https:\\/\\/example\\.com\\/reset\\?[^"]+)"/gi)].map((m) => m[1]);
const textUrls = [...raw.matchAll(/https:\\/\\/example\\.com\\/reset\\?token=[a-z0-9-]+/gi)].map((m) => m[0]);
assert.ok(htmlHref.length > 0, 'HTML part missing reset URL');
assert.ok(textUrls.length > 0, 'Text part missing reset URL');
assert.equal(new URL(htmlHref[0]).pathname, new URL(textUrls[0]).pathname);
\`\`\`

Fail closed on staging hosts:

\`\`\`typescript
import fs from 'node:fs';

const html = fs.readFileSync('test/fixtures/email/welcome.light.html', 'utf8');
const bannedHosts = ['localhost', '127.0.0.1', 'staging.example.com', 'ngrok'];
for (const host of bannedHosts) {
  if (html.toLowerCase().includes(host)) {
    throw new Error(\`Fixture contains banned host: \${host}\`);
  }
}
\`\`\`

MJML and similar compilers are fine as build steps. Test the compiled HTML, not only the MJML source. Compiler upgrades change output; fixtures regenerated in CI should be deterministic enough that link tests stay stable. If you commit compiled HTML, review the diff like code.

## Connecting Rendering QA to Flows and Notifications

Rendering tests prove the email can be read and clicked. Flow tests prove the click completes the job. Keep them adjacent but separate:

- Rendering suite owns layout, dark mode, clipping, alt text, preheader, multipart URL parity
- Magic-link / auth suite owns token lifetime, reuse, and session creation after navigation
- Notification suite owns event schema, dedup keys, and whether one event produces one email

When a digest template starts clipping at N events, that is a rendering bug triggered by notification volume. Cap the template, paginate, or summarize, then add a fixture with N+1 events to the matrix. When dedup fails and users get two emails that look identical, rendering QA will not catch it; schema and dedup tests will.

Subject lines that include dynamic counts ("You have 3 new alerts") need fixtures for 0, 1, and many. Zero-count sends should be suppressed upstream; if a zero-count email still renders, fail the notification test, not only the template aesthetic review.

## Regression Discipline That Survives Redesigns

Treat each template as a product surface with owners. When design redesigns the welcome email, require:

1. Updated fixtures
2. Updated link contract if URLs changed
3. Dark-mode and Outlook rows re-captured
4. Plain-text part regenerated
5. Localization smoke for the longest copy

Visual redesigns are when clipping and inversion return. Do not skip the matrix because "it is only a color tweak." Color tweaks are exactly how dark-mode contrast dies.

Store a short human checklist beside automation:

- Subject and preheader intentional
- Images optional for comprehension
- CTA visible without images
- CTA not clipped in Outlook capture
- Dark mode text readable on card and body
- HTML and text URLs match
- No staging hosts
- Legal footer intact at full width and narrow width

## Frequently Asked Questions

### How do I start email template testing without a paid screenshot tool?

Start with compiled HTML fixtures in git, Playwright link and visibility assertions, and local screenshots under light and dark \`colorScheme\` emulation. Add one real Outlook desktop capture and one real iPhone Mail dark-mode capture per critical transactional template. That trio catches most clipping and inversion failures. Grow into a vendor screenshot matrix when you have many brands or locales. Paid tools help scale review; they do not replace fixture-owned href checks or multipart text parity tests in CI.

### Why does my email look fine in Chrome but break in Outlook?

Outlook desktop still relies on Word-like HTML rendering for many versions, not a modern browser engine. Properties like overflow, absolute positioning, advanced flex or grid, and some margin collapsing will not behave as in Chrome. Fixed heights clip content when text wraps. Use tables for structure, avoid clipping text containers, place CTAs in separate rows, and include an Outlook desktop screenshot in every release of a redesigned template. If you only QA in Chrome, you are QA-ing a client your customers may not use for mail.

### Should transactional emails follow the same rendering matrix as marketing emails?

Yes. Transactional templates (receipts, magic links, security alerts, notification digests) often matter more because the CTA is the product. Dark-mode inversion that hides a "Reset password" button is a severity-one support issue. Use the same dark mode, clipping, image-blocking, and multipart checks. Keep flow-level token tests separate, but never exempt transactional mail from the rendering matrix. If anything, prioritize them when time is short.

### How should AI coding agents help with email template testing?

Have the agent compile templates, generate fixture variants (long copy, RTL, many digest rows), write Playwright assertions for href and alt text, and draft a screenshot matrix checklist. Require the agent to show fixture diffs and failing assertions, not only prose summaries. Do not let it invent vendor CLI flags or unverified CSS support claims. Human review still owns Outlook and Apple Mail dark-mode captures where emulation diverges from real clients. Pair agent-generated fixtures with deterministic tokens for safe magic-link URL shape checks.
`,
};
