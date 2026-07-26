import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Email footer preference route tests',
  description:
    'email footer preference route tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'email footer preference route tests',
  keywords: [
    'email footer preference route tests',
    'email footer link checker',
    'preference page email link',
    'unsubscribe footer route test',
    'react email broken link test',
    'email template route inventory',
  ],
  relatedSlugs: [
    'testing-hmac-unsubscribe-token-tampering-expiration',
    'testing-lazy-resend-initialization-nextjs-build',
    'testing-batch-email-partial-failures-promise-allsettled',
    'react-nextjs-testing-complete-guide',
  ],
  sources: ['https://react.email/docs/components/link', 'https://www.rfc-editor.org/info/rfc8058/'],
  repoEvidence: [
    'packages/web/src/emails/welcome.tsx:footer links',
    'packages/web/src/emails/new-skill-alert.tsx:footer links',
    'packages/web/src/emails/weekly-digest.tsx:footer links',
  ],
  content: `Email footer preference route tests should render every QASkills email with fixed props, extract footer anchors by visible label, and compare each destination with the application route inventory. They must verify preference links, conditional or fallback unsubscribe links, tracking parameters, signed-out handling, and a clear destination response without sending any email.

The tested templates are \`packages/web/src/emails/welcome.tsx\`, \`packages/web/src/emails/new-skill-alert.tsx\`, and \`packages/web/src/emails/weekly-digest.tsx\`. Their footer rules differ, so one copied assertion cannot cover all three. A useful gate records template, label, resolved URL, expected access mode, and observed route result.

## Email footer preference route tests: What Must the Suite Prove?

Email footer preference route tests must prove that every rendered footer points users toward a real preference page and the intended unsubscribe target. The suite should validate labels and complete href values, then navigate representative links. It should treat protected preference handling and public token handling as different outcomes.

Every template includes a preference link under the QASkills domain. Welcome labels it Email Preferences, while the alert and digest templates label it Update Email Preferences. All three append template-specific UTM values to \`/dashboard/preferences\`.

Unsubscribe behavior is not uniform. Welcome adds its Unsubscribe anchor only when \`unsubscribeUrl\` is supplied. New-skill alert and weekly digest always render that anchor, using the supplied value when present and a QASkills \`/unsubscribe\` fallback with tracking values otherwise.

Those differences are source-backed and belong in fixtures. A test should not require a welcome unsubscribe link when the optional prop is missing. It should require that link when a deterministic signed URL is passed, then compare the output exactly.

The [React Email Link documentation](https://react.email/docs/components/link) describes Link as a hyperlink with a required string href. Rendering valid anchor syntax is only the first layer. The target can still be misspelled, protected unexpectedly, or stripped of its token during template changes.

Route checks need observable criteria. A preference destination should reach the expected authenticated page or the expected sign-in flow when signed out. An unsubscribe destination should reach the unsubscribe page and preserve the supplied query, while an intentionally invalid token should display controlled error handling rather than a server crash.

Do not send messages through Resend during this gate. Rendering components, extracting links, and issuing local browser requests cover the contract without delivery side effects. The [lazy Resend testing article](/blog/testing-lazy-resend-initialization-nextjs-build) owns client setup and build-safe initialization.

## Which QASkills Code Paths Own This Contract?

The welcome template at \`packages/web/src/emails/welcome.tsx\` creates one UTM string for onboarding mail. Its footer always links Email Preferences and Visit Website, while Unsubscribe appears only when an optional URL exists. That condition should have separate present and absent fixtures.

The new-skill template at \`packages/web/src/emails/new-skill-alert.tsx\` creates campaign values for skill alerts. Its footer always links Update Email Preferences and Unsubscribe. The unsubscribe href uses the supplied URL first, then falls back to the public unsubscribe route with that template's UTM string.

The weekly template at \`packages/web/src/emails/weekly-digest.tsx\` follows a similar footer branch with digest campaign values. It also creates several skill links and one Browse All Skills link. The footer checker should identify anchors by label so skill count never shifts its target.

These components own rendered href construction, labels, fallback choice, and optional branches. They do not prove that the web routes exist, accept the right auth state, or process a token correctly. Browser navigation supplies that second layer without changing template ownership.

Keep exact UTM values in focused assertions because each template declares them as source constants. Welcome uses \`utm_medium=welcome\`, new-skill alert uses \`utm_medium=skill_alert\`, and weekly digest uses \`utm_medium=weekly_digest\`. All three have \`utm_source=email\`.

Do not assume the optional value always points at QASkills. The component accepts a string and renders it directly. Production helpers may supply a signed QASkills URL, while the template unit test should use a deterministic local value and verify that no fallback replaced it.

The [HMAC unsubscribe testing guide](/blog/testing-hmac-unsubscribe-token-tampering-expiration) owns signature creation, tampering, and expiry. This route-focused suite needs only known valid, missing, and invalid token categories. It should not duplicate cryptographic implementation tests inside template rendering.

Email footer preference route tests should cite the three template paths in every failure record. That evidence makes a changed label or fallback easy to locate. It also prevents a broad crawler failure from hiding which component emitted the bad URL.

## Email footer link checker: Baseline Cases

An email footer link checker should render every template with the smallest valid props and one fixed unsubscribe URL. Use plain ASCII fixture text so encoded content does not distract from href comparisons. Keep timestamps, skill counts, and user names stable across runs.

For welcome, render once without \`unsubscribeUrl\` and once with it. The first output should contain Email Preferences and Visit Website but no Unsubscribe label. The second should add exactly one Unsubscribe anchor whose href equals the supplied value.

For new-skill alert, render a fixed author and skill slug. Assert one Update Email Preferences link and one Unsubscribe link. Run a supplied-url fixture and a missing-url fixture so both sides of the fallback expression are observed.

For weekly digest, pass either an empty skills array or one fixed skill. Footer extraction must still return the same two footer labels. If the checker searches all anchors, scope it to the final footer text or filter by exact labels.

Resolve each absolute URL with the standard URL parser, then inspect origin, pathname, and search parameters separately. Exact full-string assertions remain useful for source constants, but parsed checks give clearer diagnostics when only a campaign value changes.

Preference paths should equal \`/dashboard/preferences\` in all three outputs. The campaign and medium values should match the source template. The welcome footer also includes a root Visit Website link, but that link does not replace the preference assertion.

Fallback unsubscribe links should use \`/unsubscribe\`. Supplied unsubscribe links should retain their exact pathname and token query without appending template UTM values. That source behavior prevents a signature from being altered after its helper created the URL.

Use the [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) for general render setup. Email footer preference route tests stay narrower: they verify footer identity, route shape, optional branches, and access behavior without snapshotting entire email HTML.

## Preference page email link: Test Matrix

A preference page email link matrix should compare each template branch with the route result expected for its access mode. The source columns below come directly from all three email components.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Welcome footer | No unsubscribe URL | Optional welcome branch | Preferences and website links only | No network send | Unsubscribe appears |
| New-skill footer | Signed URL supplied | Supplied value branch | Preferences plus exact unsubscribe href | No fallback rewrite | Token query changes |
| Weekly footer | URL omitted | Digest fallback branch | Preferences plus /unsubscribe fallback | No email delivery | Missing unsubscribe |
| Preference signed out | Browser has no session | Protected dashboard route | Expected authentication handling | No preference write | Server error or wrong path |
| Invalid unsubscribe | Fixed invalid token | Public unsubscribe route | Controlled error page | No valid unsubscribe | Crash or silent success |

The welcome row prevents a false requirement. Its unsubscribe link is conditional, so absence without the prop is correct source behavior. A separate fixture with the prop should confirm the positive branch and exact label.

The alert and digest rows must cover both supplied and fallback destinations. Their fallback UTM values differ by medium and campaign. A shared helper assertion can accept expected parameters while preserving template-specific fixtures.

The signed-out preference row should avoid demanding one exact provider URL. Auth systems can include changing state parameters and return URLs. Assert the recognized sign-in handling or protected response, plus absence of an application error page.

The invalid unsubscribe row should use a clearly fake token and expect controlled rejection. It must not assert a successful database change. Keep the valid-token mutation in the dedicated token suite where state can be reset safely.

Track route calls but never delivery calls. Rendering should cause zero fetches, and local navigation should touch only the selected web destinations. A test that sends a real email has widened beyond the footer contract and introduces unrelated credentials.

Record parsed path and search values in failures. Long absolute strings are hard to compare in CI logs, especially when token text is redacted. Show template name, anchor label, expected path, actual path, missing query keys, and browser status.

Email footer preference route tests should run this matrix whenever footer labels, route names, UTM strings, or unsubscribe helper inputs change. The [batch email failure article](/blog/testing-batch-email-partial-failures-promise-allsettled) covers delivery results after links are known to be correct.

## How Should Unsubscribe footer route test Be Exercised?

An unsubscribe footer route test needs two controlled layers. First render template components and inspect exact href output without a server. Then navigate selected destinations through the local Next.js app to prove that route handling matches the link category.

Use fixed URLs such as \`https://qaskills.sh/unsubscribe?token=fixed-test-token&type=alerts\` for render assertions. Do not claim that this fake token is valid. Its purpose is to prove that the component preserves a supplied URL exactly.

For browser checks, use the no-token and invalid-token states as safe public cases. The unsubscribe page should render its heading and a controlled message. Stub the unsubscribe API when testing a valid page flow so no real user preference can change.

The preference route has a different access model. Run one authenticated case that reaches Email Preferences and one signed-out case that observes configured auth handling. Do not reduce both cases to a generic status check because their user outcomes differ.

[RFC 8058](https://www.rfc-editor.org/info/rfc8058/) defines one-click behavior for List-Unsubscribe and List-Unsubscribe-Post headers using an HTTPS target. The three files in this brief render body footer anchors, not those message headers. Cite the RFC as an unsubscribe boundary, not proof that these templates implement one-click headers.

That separation prevents an inflated claim. Passing footer navigation does not establish header presence, DKIM coverage, or one-click POST behavior. Add a separate transport test if those features enter the sending layer.

Keep redirects visible in the report. Record original href, final browser URL, status class, and expected heading. A redirect to sign-in can be correct for preferences, while the same redirect would be suspicious for a token-based public unsubscribe page.

The [QASkills getting-started route](/getting-started) offers a stable public control for browser setup. Compare its reachability with protected and public email destinations so a broken local server does not look like three independent footer failures.

## Step-by-Step React email broken link test Procedure

A react email broken link test should connect static render output with a small route inventory. Keep the following four stages in one named workflow.

1. Render welcome, new-skill alert, and weekly digest templates with deterministic props and unsubscribe URLs.
2. Extract footer anchors by visible label rather than DOM position, then parse every href with URL.
3. Resolve each pathname against the route inventory and classify authentication, token, and tracking requirements.
4. Navigate representative links in Playwright, then assert destination headings or expected authentication handling.

The first stage needs branch coverage rather than many content combinations. Render welcome with and without its optional URL, then render alert and digest with supplied and missing URLs. That set covers every footer decision in the three source files.

The next example renders each component and extracts anchors from generated markup. It keeps label and href together, which makes exact branch assertions easier:

\`\`\`tsx
import { render } from '@react-email/render';
import { expect, test } from 'vitest';
import WelcomeEmail from '@/emails/welcome';
import NewSkillAlert from '@/emails/new-skill-alert';
import WeeklyDigest from '@/emails/weekly-digest';

const links = (html: string) =>
  [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\\/a>/g)].map(
    ([, href, label]) => ({ href: href.replace(/&amp;/g, '&'), label: label.trim() }),
  );

test('renders expected footer destinations', async () => {
  const unsubscribeUrl = 'https://qaskills.sh/unsubscribe?token=fixed&type=all';
  const welcome = links(await render(<WelcomeEmail username="Reader" unsubscribeUrl={unsubscribeUrl} />));
  const alert = links(
    await render(
      <NewSkillAlert
        skillName="Fixture"
        skillDescription="A fixed test skill."
        skillAuthor="owner"
        skillSlug="fixture"
        authorName="Owner"
        unsubscribeUrl={unsubscribeUrl}
      />,
    ),
  );
  const digest = links(
    await render(<WeeklyDigest skills={[]} weekNumber={30} year={2026} unsubscribeUrl={unsubscribeUrl} />),
  );

  expect(welcome).toContainEqual({ label: 'Unsubscribe', href: unsubscribeUrl });
  expect(alert).toContainEqual({ label: 'Unsubscribe', href: unsubscribeUrl });
  expect(digest).toContainEqual({ label: 'Unsubscribe', href: unsubscribeUrl });
});
\`\`\`

Regex extraction is acceptable for this narrow generated anchor shape, but keep fixtures under control. A DOM parser can replace it if markup becomes more complex. Never use the extraction helper as an HTML correctness validator.

The route inventory stage should classify \`/dashboard/preferences\` as protected and \`/unsubscribe\` as public. It should also preserve search keys for token, type, source, medium, and campaign. Reject unknown internal paths before opening a browser.

Finally, navigate one preference link and both unsubscribe error categories. Assert named page content, final path, and no server error. The [QASkills blog](/blog) can serve as another stable public route control, but keep it outside footer assertions.

## Email template route inventory: Assertions and Diagnostics

An email template route inventory should be data, not a set of scattered string checks. Each entry needs template, label, required path, access class, required query keys, optional branch, and source path. Generate cases from this inventory while keeping the templates as the href source.

Do not build expected values by importing the same UTM constant under test. Write explicit expected paths and keys in test data. Otherwise, an incorrect source constant can update both actual and expected values together.

The route-level example below checks public unsubscribe handling and protected preference behavior without asserting unstable provider parameters. It keeps each route claim tied to text that a user can see:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('email destinations have the expected access behavior', async ({ page }) => {
  await page.goto('/unsubscribe');
  await expect(page.getByRole('heading', { name: 'Unsubscribe from Emails' })).toBeVisible();
  await expect(page.getByText('Invalid unsubscribe link. No token was provided.')).toBeVisible();

  await page.goto('/dashboard/preferences');
  await expect(page).not.toHaveURL(/\\/unsubscribe/);
  await expect(page.locator('body')).not.toContainText('Application error');
});
\`\`\`

The signed-out preference assertion should be adapted to the configured Clerk test fixture. When a test session is authenticated, require the Email Preferences heading. Without a session, require the known auth destination or response rather than the page itself.

Every failure should retain the rendered label and sanitized href. Redact token values while preserving token presence and type. Include the source template path, final path, browser status, and visible heading so maintainers can separate rendering faults from route faults.

Call counts matter here. Template rendering should perform zero network requests, preference navigation should not write settings, and an invalid unsubscribe request should never report a valid mutation. If the valid flow is stubbed, assert the stub receives exactly one POST.

Avoid full-email snapshots because text and styling changes would create noise. Snapshot only a normalized footer inventory when review value justifies it. Direct label, href, route, and access assertions remain clearer.

Email footer preference route tests can link failures to the [API security checklist](/blog/api-security-testing-checklist-2026) when access behavior changes. The route inventory still owns only destinations emitted by these templates, not every application link.

## What Regressions and Boundaries Prevent False Confidence?

A syntactically valid href can still be wrong. It may point to an old path, drop a token, add tracking text inside a signed query, or send a signed-out user toward an application error. Rendering success proves none of those outcomes.

Position-based selectors create another blind spot. Weekly digest adds one skill anchor per item, so a footer link index changes with fixture size. Locate exact visible labels within the footer instead of choosing the last or fifth anchor.

Do not force all three templates into one unsubscribe rule. Welcome intentionally omits the link without its optional prop, while alert and digest use fallbacks. The test should detect an accidental behavior change without calling the current differences inconsistent.

Supplied URLs and fallback URLs deserve separate assertions. A helper-generated signed URL must remain byte-for-byte equal after rendering, apart from normal HTML escaping. A fallback needs exact path and tracking keys because no signature protects its query.

Route existence alone is not enough. The protected preference page should use expected authentication handling, while unsubscribe should remain usable without an account session. Test both access states without prescribing provider-specific query values.

Passing body-footer checks does not prove RFC 8058 support. Header construction, HTTPS POST semantics, and signature coverage belong to mail transport tests. Keep that boundary in reports so a route matrix never receives a compliance label it did not earn.

Email client click rewriting is also outside this local gate. The React Email component creates source href values, while delivery providers or clients may wrap them later. Add sent-message inspection only when that layer is intentionally under test.

After any template or route change, rerun optional branches, supplied links, fallbacks, signed-out preferences, missing tokens, invalid tokens, and one stubbed valid token. Email footer preference route tests should fail with one precise template and destination, not a generic broken-email message.

### Build a route ledger that a reviewer can read

Start the ledger with one row for each footer label in each mail type. Keep the label, source file, path, and access rule in plain text so a reviewer can check them fast.

Add one row for each optional branch instead of placing two outcomes in the same cell. A welcome mail with no link and a welcome mail with a link are two clear facts.

Place the full token outside the main report, then show only whether a token was present. This keeps the route clue while reducing the chance that a useful link leaks into a build log.

Show query keys in a fixed order even when their source order changes. A stable view makes a missing source, medium, campaign, token, or type key stand out at once.

For each browser check, save the start path, final path, status, and first page heading. These four facts often show whether the bad link came from source, auth, or route code.

Mark each destination as public, signed-in, or signed-out instead of using one broad pass label. A public link and a protected link can both work, yet their correct end states are not the same.

Use the live [unsubscribe page](/unsubscribe) only with safe test data or a stubbed request. A missing token is a good no-write check because the page can explain the fault without changing a user row.

Keep the route table in source control near the test, not in a remote sheet that can drift. A code review can then see a footer change and its expected route change in one place.

When a link moves, require the change to name the old path and the new path. This brief note helps the team update redirects, mail tests, and user help without guessing at past intent.

Email footer preference route tests become easier to trust when the ledger shows one cause per row. The ledger should aid the test, not act as a loose list that no code checks.

### Review a failed link from source to page

First open the rendered mail and find the link by the words a reader sees. Do not begin with its place in the HTML, since card links can move the footer index.

Next parse the href and compare the path before looking at any search keys. A wrong path is the main fault, while a right path with one bad key needs a much smaller fix.

Then compare supplied and fallback branches with two named fixtures. If both fail in the same way, the route may be at fault; if one fails, inspect that template branch first.

Run the path through the local route check with mail delivery turned off. This keeps the next fact close to the source link and removes send jobs, rate limits, and inbox state.

For a protected page, note the session state before the request starts. A signed-out test should show auth handling, while a signed-in test should reach the page title without a write.

For an unsubscribe page, note token presence and type but mask the token itself. Confirm that the page stays public and that only a known good stub can report a successful change.

Read the failure from left to right: template, label, href, path class, browser result, and write count. This order gives the first broken handoff without a long stack of unrelated output.

If the source is right but the page is gone, keep the template test red until the path is fixed. A valid anchor that leads nowhere is still a broken footer contract.

Use the [skills directory](/skills) as a known public control when the server seems suspect. If that route also fails, fix the test host before blaming all three mail templates.

This review path keeps each fix small and clear. It also stops a broad crawler result from masking a single bad fallback in one email type.

Before the gate ends, render each mail once with no signed link and once with one fixed signed link that stays safe for test use. This pair makes each source branch plain and keeps the route list tied to real output rather than a hand-made guess.

Read all footer words in the same order a mail user sees them, then match each phrase with one and only one href. If two links share a label, fail with both source paths instead of picking the first match and hiding the clash.

Open one link at a time in a clean page so an old sign-in state or prior token result cannot shape the next check. Save the final path and main heading, close that page, and then start the next route with a new state.

At the end, count links by mail type, label, source branch, and access class, while keeping raw token text out of the count. A short count makes a lost footer link clear even when the rest of the mail still has many valid links.

Keep the pass note just as plain: name the three mail types, the two route classes, and the branch set that ran. This brief proof lets a later change show what the old gate checked without forcing the team to search through a large trace.

Before the test job shuts down, compare the set of paths found in mail with the set of paths that the route check opened, then fail if any footer path had no matching page check or any page check had no source link. Keep optional welcome mail as its own named branch in that set, so the lack of an unsubscribe link with no prop stays a known source rule instead of looking like lost test data.

## Frequently Asked Questions

### How do you verify every QASkills email footer destination?

Render all three templates with fixed props, extract footer anchors by exact visible label, and parse each href. Compare paths and query keys with a route inventory, then navigate protected preferences and public unsubscribe cases. Record template, label, source path, expected access class, and observed destination.

### What should an email footer link checker avoid?

Avoid full HTML snapshots, anchor indexes, live delivery calls, and bare status-only checks. Those methods add noise or miss wrong access behavior. Use label-scoped extraction, explicit branch fixtures, parsed URL assertions, local navigation, and sanitized diagnostics that preserve token presence without exposing token values.

### How should a preference page email link behave when signed out?

It should reach the configured authentication handling for the protected dashboard route rather than an application error or unrelated page. Do not assert unstable provider state parameters. Assert the original preference pathname, recognized auth outcome, safe final response, and absence of any preference write.

### What belongs in an unsubscribe footer route test?

Cover optional omission, supplied signed URLs, fallback URLs, missing tokens, invalid tokens, and one stubbed valid flow. Preserve supplied queries exactly, verify public page access, and count unsubscribe API calls. Keep HMAC tampering and expiry details in the dedicated token test suite.

### Why run a react email broken link test before Playwright?

Component rendering isolates which template emitted each href and covers optional branches quickly. Playwright then proves route and access behavior for a small representative set. Running both layers gives better fault location than crawling rendered messages through a browser without first checking source output.

### What should an email template route inventory contain?

Store template name, footer label, expected pathname, access class, required query keys, optional condition, and repository source. Keep expected values independent from production constants. On failure, print normalized values and final browser outcome so reviewers can distinguish a template change from a route change.

## Conclusion

Email footer preference route tests prove that source templates, visible labels, optional branches, query values, and application access rules agree. Welcome, new-skill alert, and weekly digest need distinct fixtures because their unsubscribe behavior and tracking values differ, while all three must retain a valid preference destination.

[Open dashboard preferences](/dashboard/preferences), render every email footer, and add route-inventory checks before editing preference or unsubscribe links. Use the [skills directory](/skills) and [QASkills blog](/blog) to extend the same focused link checks across later user flows.`,
};
