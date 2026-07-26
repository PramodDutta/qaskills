import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'New skill email route tests',
  description:
    'new skill email route tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'new skill email route tests',
  keywords: [
    'new skill email route tests',
    'skill alert url test',
    'author slug email link',
    'qaskills cli command email',
    'react email dynamic route',
    'published skill cta assertion',
  ],
  relatedSlugs: [
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
    'how-to-write-high-quality-qa-skills',
    'qaskills-add-custom-directory-ci',
  ],
  sources: [
    'https://react.email/docs/components/link',
    'https://nextjs.org/docs/app/getting-started/layouts-and-pages',
  ],
  repoEvidence: [
    'packages/web/src/emails/new-skill-alert.tsx:skillUrl and quick install code',
    'packages/web/src/app/skills/[author]/[slug]/page.tsx:skill detail route',
  ],
  content: `New skill email route tests should prove that one published skill fixture produces the same author-qualified detail path in the alert CTA and the expected slug in its quick-install command. A passing test renders the email, reads the real href and code text, then checks those values against the dynamic skill page contract.

This scope tests route and command construction before delivery. It keeps provider faults, batch fan-out, and unsubscribe handling in their own suites, so a broken link cannot hide behind a mail send result.

## New skill email route tests: What Must the Suite Prove?

New skill email route tests must bind four inputs to four visible outputs. \`skillAuthor\` and \`skillSlug\` form the path, \`skillName\` appears in the preview and card, \`authorName\` appears as display text, and the slug alone forms the CLI argument.

The main CTA URL starts with \`https://qaskills.sh/skills/\`, then appends the supplied author and slug; it ends with the exact tracking query \`utm_source=email&utm_medium=skill_alert&utm_campaign=new_skill\`. The button text is "View Skill Details."

The quick-install block renders \`npx @qaskills/cli add\` followed by \`skillSlug\`, and it does not include the author value. A test should compare the route slug and command slug from the same fixture so those two outputs cannot drift.

The destination page is a dynamic route with author and slug params, and its database lookup matches \`skills.authorName\` to author and \`skills.slug\` to slug. Its canonical and open graph URLs use the same param pair when a skill is found.

Current template code interpolates author and slug without calling \`encodeURIComponent\`, and new skill email route tests should record that fact. A fixture with a reserved character should expose the raw path result rather than claim that the template encodes it.

Mixed case is also kept as supplied; the template does not lower case author or slug, while the page performs exact equality checks in its query. A good fixture uses canonical stored values, and a boundary fixture shows why pre-publish slug rules matter.

The [high-quality skill writing guide](/blog/how-to-write-high-quality-qa-skills) covers skill content. This suite owns only the alert link, visible name, command, and destination params.

## Which QASkills Code Paths Own This Contract?

The template contract is in \`packages/web/src/emails/new-skill-alert.tsx\`. It builds \`utmParams\`, builds \`skillUrl\`, gives that URL to the main button, and renders the quick command with \`skillSlug\`.

The same template renders two footer links; preferences receives the same tracking query, while unsubscribe uses the supplied \`unsubscribeUrl\` or a default tracked URL. Those links are useful render checks, but they are not part of the skill detail route promise.

The destination lives in \`packages/web/src/app/skills/[author]/[slug]/page.tsx\`, where both the page and metadata function await dynamic params and call \`getSkill(author, slug)\`. They use both values in route-facing metadata.

The page query combines exact author and slug checks. If the DB read throws, it asks for fallback skill detail with that pair. If no skill is returned, the page calls \`notFound\`, while metadata returns a not-found title.

Next.js explains file-based pages and dynamic segments in its [layouts and pages guide](https://nextjs.org/docs/app/getting-started/layouts-and-pages). That source supports the route shape, while repository code sets the exact author and slug query.

The [React Email Link documentation](https://react.email/docs/components/link) defines an \`href\` string for link targets and shows a rendered hyperlink. QASkills uses that component in the footer and passes the detail URL to a React Email button for the main CTA.

New skill email route tests should render the component rather than call a copied URL helper, because the URL is built inside the component; rendering also proves the button and command receive the same fixture. The resulting HTML is the artifact that extraction checks should inspect.

Open the [publishing guide](/how-to-publish) for the wider skill release path. The two repo files above are the evidence for this route test.

## Skill alert url test: Baseline Cases

A skill alert url test should begin with a simple canonical author and hyphenated slug. The expected path is easy to read, and the rendered command should end with that same slug.

Use distinct author display and route values. For example, \`skillAuthor\` can be a stored handle while \`authorName\` is a full display name. The href must use the first value, and the card text must use the second.

The hyphenated slug case proves separators survive both outputs. Parse the href with \`URL\`, compare its pathname, then read the code node and compare its full trimmed text. Avoid a broad HTML substring check as the only proof.

Add a mixed-case author fixture to document current pass-through behavior. The path keeps that case, and the command remains based only on the slug. Do not turn this into a claim that all stored authors allow mixed case.

Add one fixture containing a reserved path character. Since the template does no encoding, the test should show the raw interpolation and mark the result as a boundary risk. The expected result must follow current code until route construction changes.

New skill email route tests also need a deliberate mismatch fixture at the test-harness level. Render one email, then compare its route slug with a separately altered expected command slug and prove the matcher fails. This mutation check shows the assertion can catch drift.

Keep live email delivery out of these baseline cases. The [batch email failure article](/blog/testing-batch-email-partial-failures-promise-allsettled) covers send fan-out and partial provider errors. A render test should need no API key.

The [getting started page](/getting-started) shows the public install flow. Use its command style as context, but take the exact alert command from the template source.

## Author slug email link: Test Matrix

The author slug email link matrix compares route inputs, rendered output, command text, tracking values, and destination checks. Each row should use the same extraction helpers so only the fixture changes.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Simple author and slug | Canonical stored values | Direct string interpolation | Detail CTA with tracked URL | No send or DB work | Wrong path segment |
| Mixed-case author | Author case differs | Pass-through author value | Same case in pathname | Command still uses slug only | Test assumes lower case |
| Hyphenated slug | Slug contains hyphens | Shared slug interpolation | Same slug in path and code | One rendered command | Hyphen lost or changed |
| Reserved path character | Raw author or slug value | No encode call in template | Raw interpolation is visible | Boundary risk is reported | Test claims encoded output |
| Route and command mismatch | Mutated expected slug | Equality guard in test | Assertion fails | No delivery attempt | Drift passes unnoticed |

For the simple row, assert protocol, host, pathname, and each query value separately. A single full string comparison is useful too, but parsed checks explain which part changed. Both forms can share one fixture.

The mixed-case row should not call a lower-case helper in the test. That would hide current pass-through code. Compare the exact supplied author with the path segment and keep any normalization rule in publish validation.

For the hyphenated row, extract code text from rendered HTML instead of reading component props. The render is the artifact subscribers receive. It can reveal HTML escaping or spacing that a prop-only test misses.

The reserved-character row should have a plain expected raw string and a failing safety note. Do not send it to the live page as if it were a valid published skill. This case documents a construction boundary without inventing a working destination.

The mismatch row is a test of the test. Change the expected route slug or command slug and confirm the equality helper throws. Remove that mutation after proving the guard, or keep it as a focused unit case for the matcher.

New skill email route tests should also assert there is one main detail CTA. Multiple matching links can make extraction choose the wrong node. Footer links have different text and destinations, so select by visible button text.

Use the [QASkills blog](/blog) to group this plan with other mail checks. Keep the matrix in the template suite where route copy changes are reviewed.

## How Should Qaskills cli command email Be Exercised?

Qaskills cli command email checks should render the actual component with a complete fixture. They need not execute the CLI, since the contract here is exact command text in the alert.

Use React Email's render utility and an HTML parser that can select the detail anchor and code node. Decode text content, trim it, and compare the whole command. Avoid a regular expression that accepts extra unsafe shell text after the slug.

This example checks the path, query, card label, and command from one render:

\`\`\`typescript
import { render } from '@react-email/render';
import { load } from 'cheerio';
import { expect, it } from 'vitest';
import NewSkillAlert from '@/emails/new-skill-alert';

it('renders one matching skill route and install command', async () => {
  const html = await render(
    NewSkillAlert({
      skillName: 'Playwright API Checks',
      skillDescription: 'Focused API checks for a published skill.',
      skillAuthor: 'Pramod',
      skillSlug: 'playwright-api-checks',
      authorName: 'Pramod Dutta',
      unsubscribeUrl: 'https://qaskills.sh/unsubscribe?token=test-token',
    }),
  );
  const $ = load(html);
  const href = $('a').filter((_, node) => $(node).text().includes('View Skill Details')).attr('href');
  const url = new URL(href!);

  expect(url.pathname).toBe('/skills/Pramod/playwright-api-checks');
  expect(url.searchParams.get('utm_source')).toBe('email');
  expect(url.searchParams.get('utm_medium')).toBe('skill_alert');
  expect(url.searchParams.get('utm_campaign')).toBe('new_skill');
  expect($('code').text().trim()).toBe(
    'npx @qaskills/cli add playwright-api-checks',
  );
  expect($.text()).toContain('by Pramod Dutta');
});
\`\`\`

The fixture uses an explicit unsubscribe URL so the render contains no unrelated default choice. The assertion should also check that the command appears once. Duplicate code blocks could confuse subscribers even when one string is correct.

Do not use a snapshot as the sole check. A broad snapshot can show that markup changed, but it may not state whether author, slug, tracking, and command still agree. Keep semantic assertions beside any snapshot.

The route and CLI values have different shapes. The path contains author plus slug, while the command contains only slug. The shared contract is slug equality, not full identifier equality.

A cross-check can split the pathname into segments and compare its last item with the final command arg. This remains useful when the fixture changes. It catches copy edits that hard-code a stale slug.

The [custom directory CI article](/blog/qaskills-add-custom-directory-ci) owns execution of install commands in CI. Do not run a real install merely to test email text.

## Step-by-Step React email dynamic route Procedure

A react email dynamic route check should move from one known fixture to rendered output and then to page params. The order below keeps template faults apart from destination faults.

1. Create a canonical published-skill fixture with author, slug, name, and description.
2. Render \`NewSkillAlert\` and extract every href plus the quick-install code block.
3. Resolve the author-qualified route against the dynamic skill page contract.
4. Assert the route slug and CLI argument remain identical in the email regression test.

First compare the full tracked URL. Then parse it and compare the host, two path params, and three query values. These checks make a failed report point to route, identity, or tracking text.

Next, feed the extracted author and slug into a metadata test for the dynamic page. Mock the skill query to return the fixture's stored record. The canonical URL should use those same two params and exclude email tracking.

This route example proves the page consumes the same pair:

\`\`\`typescript
import { expect, it } from 'vitest';
import { generateMetadata } from '@/app/skills/[author]/[slug]/page';

it('builds canonical metadata from the email route params', async () => {
  skillQueryMocks.first.mockResolvedValue({
    name: 'Playwright API Checks',
    description: 'Focused API checks for a published skill.',
    authorName: 'Pramod',
    slug: 'playwright-api-checks',
  });

  const metadata = await generateMetadata({
    params: Promise.resolve({
      author: 'Pramod',
      slug: 'playwright-api-checks',
    }),
  });

  expect(skillQueryMocks.where).toHaveBeenCalledWith({
    authorName: 'Pramod',
    slug: 'playwright-api-checks',
  });
  expect(metadata.alternates?.canonical).toBe(
    'https://qaskills.sh/skills/Pramod/playwright-api-checks',
  );
});
\`\`\`

The plain object in the query assertion stands for a small adapter around the Drizzle expression. A repo test may inspect the seeded query result instead. It should still prove both params take part in the match.

Finally, compare the last email path segment with the final command arg. Fail with both safe strings when they differ. This gives copy reviewers one direct signal without exposing subscriber data.

New skill email route tests should run before any provider send test. The [lazy Resend initialization article](/blog/testing-lazy-resend-initialization-nextjs-build) covers client startup, which is a later and separate layer.

## Published skill cta assertion: Assertions and Diagnostics

A published skill cta assertion should cover count, text, protocol, host, pathname, and query. It should also compare display name and author text so a correct link cannot sit beside stale content.

Count one anchor whose text includes "View Skill Details." Parse its href with the standard URL class, then expect HTTPS and \`qaskills.sh\`. Compare the full two-part path with the fixture.

For tracking, compare each value rather than only checking that a question mark exists. The source, medium, and campaign strings are all fixed in the template. A missing or renamed key should give a direct failure.

For command text, trim rendered whitespace and compare the full safe command. Then split on spaces and compare the final arg with the path slug. Assert the author does not appear as a second CLI identifier.

When HTML is rendered, select the CTA by its visible label before reading the href, since the footer contains other anchors with tracked QASkills URLs. Decode HTML entities in text nodes, trim only outer space, and keep internal command spacing exact so a malformed shell line cannot pass through loose whitespace cleanup. If the parser finds zero or several detail links, fail before URL parsing and report the count, because choosing the first match would hide duplicate or missing CTA markup.

Keep a small extraction helper that returns the detail href, quick command, card title, display author, and all footer targets from one rendered document. It should throw when a required node is absent and should never rebuild any expected URL from component props, since reconstruction would repeat production logic inside the test. A second comparison helper can accept those extracted values plus the fixture, then produce field-level errors for host, author segment, slug segment, tracking key, visible label, and final command argument.

Run both helpers against the canonical, mixed-case, hyphenated, and reserved-character fixtures so parsing rules stay constant while only source data changes. The mismatch case should alter one extracted copy after rendering, not change the component fixture, which proves the comparison guard rejects drift without testing a different email. Report the expected and actual route slug as safe values, but omit full unsubscribe targets because they may later contain signed tokens. This design gives content reviewers short errors while preserving the rendered HTML as an optional local artifact for deeper markup review.

New skill email route tests need clear diagnostics for raw reserved characters. Report the fixture case and parsed path outcome, but never claim that the route is safe if the template did not encode it. Treat that case as a known boundary.

Do not print the whole HTML document on every failure. Keep a small artifact when needed, then report the selected href, command text, and visible label. Full markup can add noise and may include unsubscribe data.

The template has no send call or DB query. A render case should assert those services are not part of its setup. Delivery belongs to the [batch email failure guide](/blog/testing-batch-email-partial-failures-promise-allsettled), and destination data belongs to the page test.

Run the render group with no mail provider key. This proves the contract remains a pure template check and can run on each pull request.

## What Regressions and Boundaries Prevent False Confidence?

The first false pass is testing a URL recreated inside the test. That only proves test string code. Always extract the href from rendered output built by \`NewSkillAlert\`.

The next false pass is checking that the slug occurs somewhere in HTML. It may appear in the CTA while the command is wrong, or appear in code while the route is wrong. Select and compare both outputs.

Snapshots can also hide the key fault. A large diff may be approved for style while a small route segment changes. Keep focused path and command checks even if a snapshot is retained for layout.

Do not test a provider success as proof of a valid destination. A mail service can accept an alert with a broken link. The [lazy email client article](/blog/testing-lazy-resend-initialization-nextjs-build) covers send setup, while this suite validates content before that call.

Do not assume route encoding. Current template code interpolates raw values, and the page expects stored author and slug strings. A boundary fixture should keep this gap visible until a shared route builder or validation rule handles it.

Do not use the author display name in the path expectation. The template has separate \`skillAuthor\` and \`authorName\` props for a reason. One case must give them distinct values and check each output.

Add a regression case when the host, route shape, tracking values, CTA text, quick command, or dynamic page params change. Keep all expected strings based on one fixture so cross-output drift stays visible.

After automation passes, open the [publishing guide](/how-to-publish) and review the alert contract with the publish flow. A manual click can add confidence, but it cannot replace parsed output checks.

## Frequently Asked Questions

### How do you verify the alert URL and CLI command match?

Render the real email with one fixture, parse the detail href, and read the code node. Compare the last path segment with the final command argument, then assert the full author-qualified path and full command. This catches drift without sending an email or running the CLI.

### What should a skill alert url test inspect?

Inspect the one detail CTA's text, HTTPS host, author and slug path, and all three tracking values. Also compare the rendered skill name and display author. Use the rendered href, not a duplicate URL builder inside the test, so component changes cannot bypass the check.

### Why keep skillAuthor separate in an author slug email link?

\`skillAuthor\` is the stored route value, while \`authorName\` is visible card text. A fixture with different values proves the href uses the route identity and the card uses the display label. Mixing them can lead subscribers to a path that does not match the database query.

### What does a qaskills cli command email test cover?

It covers exact rendered command text and its slug agreement with the CTA path. It does not prove installation, package download, or agent detection. Those behaviors need CLI tests, while this template test stays fast, local, and independent of registry or mail provider state.

### How should a react email dynamic route case handle encoding?

Match current code first: author and slug are inserted without an encode call. A reserved-character fixture should expose that raw result and record the boundary, not claim safe encoding. If a shared encoder is added, change the expected path and add destination coverage in the same review.

### What makes a published skill cta assertion useful in CI?

It checks one selected link with exact path and query values, one matching command, and clear failure output. This is stronger than an HTML snapshot or provider success. It can run without credentials and points reviewers to the route, tracking field, label, or command that changed.

## Conclusion

New skill email route tests prove that the alert CTA, displayed skill data, quick command, and dynamic page params agree on one published fixture. They also preserve current pass-through case, raw interpolation, tracking, and destination behavior without treating delivery as route proof.

[Open how-to-publish](/how-to-publish), then add the rendered-link contract before changing alert routes or CLI copy. Browse the [QA skills catalog](/skills) to select a real published route for the final post-test click.`,
};
