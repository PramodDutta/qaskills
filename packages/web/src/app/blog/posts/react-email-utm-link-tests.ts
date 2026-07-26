import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'React email utm link tests',
  description:
    'react email utm link tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'react email utm link tests',
  keywords: [
    'react email utm link tests',
    'react email link testing',
    'email utm campaign assertions',
    'weekly digest utm content',
    'skill alert tracking links',
    'render email template tests',
  ],
  relatedSlugs: [
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
    'react-nextjs-testing-complete-guide',
    'test-reporting-allure-dashboards-guide',
  ],
  sources: ['https://react.email/docs/components/link', 'https://react.email/components'],
  repoEvidence: [
    'packages/web/src/emails/welcome.tsx:utmParams',
    'packages/web/src/emails/new-skill-alert.tsx:utmParams',
    'packages/web/src/emails/weekly-digest.tsx:utmParams',
  ],
  content: `React email utm link tests should render all three QASkills templates, extract every anchor, parse each href with URL, and compare exact query fields. Welcome, skill alert, and weekly digest use different medium and campaign values. Digest skill links also need one-based rank content, while supplied unsubscribe URLs must remain unchanged.

The welcome contract is in \`packages/web/src/emails/welcome.tsx:utmParams\`, and the alert contract is in \`packages/web/src/emails/new-skill-alert.tsx:utmParams\`. Digest-wide fields and per-item rank values live in \`packages/web/src/emails/weekly-digest.tsx:utmParams\`.

This plan checks rendered links rather than visual style or email delivery. Use the [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) for shared JSX test setup, then keep URL assertions template-specific.

## React email utm link tests: What Must the Suite Prove?

React email utm link tests must prove that every tracked first-party anchor carries the source, medium, and campaign assigned by its template. They must also prove destination paths and dynamic segments remain correct after query strings are attached.

The welcome template defines \`utm_source=email\`, \`utm_medium=welcome\`, and \`utm_campaign=user_onboarding\`. It adds that same query to Browse Skills, Getting Started Guide, Email Preferences, and Visit Website. An optional supplied unsubscribe URL is rendered as received.

The new-skill alert defines source \`email\`, medium \`skill_alert\`, and campaign \`new_skill\`. It builds a dynamic detail URL from skill author and slug, and uses the same query for the preference link plus the default unsubscribe destination.

The weekly digest defines source \`email\`, medium \`weekly_digest\`, and campaign \`engagement\`. Every ranked skill button appends \`utm_content=skill_rank_N\`, where N is \`index + 1\`. The browse-all and utility links do not add rank content.

Supplied unsubscribe URLs are an important boundary. Welcome omits the unsubscribe anchor when no value is passed, while alert and digest use a tracked QASkills unsubscribe URL as their default. When a caller supplies a signed URL, those templates use it without appending campaign fields.

Pass criteria should include anchor count, unique destination role, origin, pathname, exact required parameter values, rank order, and forbidden extras. Comparing full href strings alone gives poor diagnostics when only one query field changes.

The React Email [Link component documentation](https://react.email/docs/components/link) identifies Link as an anchor-producing component for email templates. The repository code remains the authority for each QASkills URL and campaign value.

After the rendered checks pass, visit [getting started](/getting-started) to verify the destination itself. Destination smoke tests should remain separate from query construction tests.

## Which QASkills Code Paths Own This Contract?

The welcome file owns four tracked first-party destinations and one conditional unsubscribe destination. Its fixed query fragment begins with \`?\`, so each base URL must have no prior query. Tests should parse output rather than assuming source string interpolation survived rendering.

\`packages/web/src/emails/welcome.tsx\` uses a Button for Browse Skills and Link components for the guide, preferences, website, and optional unsubscribe. Rendered HTML turns both Button and Link actions into anchors, so extraction must include every \`href\`, not only one component type.

The new-skill alert file owns a dynamic skill path. It places \`skillAuthor\` and \`skillSlug\` into \`/skills/{author}/{slug}\` before attaching campaign fields. Give both values distinctive text so a swapped or omitted segment cannot pass.

\`packages/web/src/emails/new-skill-alert.tsx\` also owns fallback behavior for unsubscribe. A provided \`unsubscribeUrl\` wins through a logical OR; otherwise, the fixed QASkills unsubscribe path receives the alert query. The preferences link always receives that query.

The digest file maps over the input array in its current order. It derives visible rank and \`utm_content\` from the same zero-based index, then adds one. A test should use at least three skills so later ranks prove the formula, not only the first constant.

\`packages/web/src/emails/weekly-digest.tsx\` uses the skill's author and slug in each path. It also has a Browse All Skills button, preferences link, and fallback unsubscribe link with template-level parameters but no rank content.

The component collection in the [React Email components reference](https://react.email/components) shows the building blocks used for email markup. It does not define QASkills campaign policy, so assertions must trace values back to these three repository files.

Read the [batch email failure article](/blog/testing-batch-email-partial-failures-promise-allsettled) for send orchestration. This suite ends after deterministic template output and does not claim an email was accepted or delivered.

## React email link testing: Baseline Cases

React email link testing begins with deterministic props and one rendered HTML string per template. Keep usernames and descriptions plain ASCII, use stable author and slug values, and pass a known absolute unsubscribe URL when testing caller-owned links.

Extract all href attributes from rendered output. Decode HTML entities such as \`&amp;\` before constructing URL objects, because email rendering may escape separators. Then group links by pathname or visible role instead of relying on render order alone.

The welcome baseline should find paths \`/skills\`, \`/getting-started\`, \`/dashboard/preferences\`, and \`/\`. Each must have exactly three campaign keys with the welcome values. No link should carry \`utm_content\`.

Run welcome twice. With a supplied unsubscribe URL, find that exact destination and assert its existing query remains unchanged. Without one, assert no unsubscribe destination appears, while the four first-party tracked links remain.

The alert baseline should use author \`case-author\` and slug \`case-skill\`. Assert the main path is \`/skills/case-author/case-skill\`, then compare alert source, medium, and campaign. Confirm preferences and default unsubscribe share those values.

Run alert with a signed-looking URL on a safe test origin. Assert the rendered unsubscribe href equals the supplied value after normal HTML decoding and has no injected UTM fields. This protects token signatures from query mutation.

The digest baseline should use three ordered skills with unique authors and slugs. Assert their item paths, common digest campaign fields, and rank content values one through three. Then prove browse, preferences, and default unsubscribe lack \`utm_content\`.

Use [dashboard preferences](/dashboard/preferences) as a route smoke target after URL tests. The template suite should not authenticate or navigate because that would mix URL generation with application access.

## Email utm campaign assertions: Test Matrix

Email utm campaign assertions should compare destination role, template fields, optional rank, and utility-link rules. The matrix below uses current source values and calls out where caller input takes priority.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Welcome primary CTA | Render welcome with username | Welcome fixed query | \`/skills\` with email, welcome, user_onboarding | One tracked skills anchor | Alert campaign appears |
| New-skill alert CTA | Distinct author and slug | Dynamic \`skillUrl\` | Skill path with email, skill_alert, new_skill | One detail anchor | Path segment or query lost |
| Weekly digest item at rank one | First skill in array | \`index + 1\` | Digest query plus skill_rank_1 | Rank matches visible order | Zero-based rank |
| Weekly digest item at a later rank | Third skill in array | Mapped item branch | Digest query plus skill_rank_3 | Unique item destination | Every item says rank one |
| Preference or unsubscribe utility link | Default and supplied URLs | Fixed query or caller override | Preferences tracked; supplied unsubscribe unchanged | No rank content | Signed URL receives extra query |

The welcome row should identify the skills anchor by pathname. Template renderers may add style or attribute ordering, so an exact HTML snapshot is not the best campaign assertion. Parsed parameters give smaller, clearer failures.

The alert row proves both dynamic path interpolation and fixed campaign values. Use different author and slug strings, then assert each segment in order. A test with identical values cannot reveal a swap.

The first digest rank catches a zero-based value of zero, while a later rank catches a hardcoded one. Use at least rank three so the input array clearly drives content. Also assert no duplicate rank content values across item links.

The utility row needs two render modes. Default QASkills utility URLs receive their template query, but supplied unsubscribe URLs remain caller-owned. Treat those outcomes as separate expectations rather than forcing one global UTM rule.

Count keys, not only values. Each tracked link should have one value for source, medium, and campaign. Digest item links should have one content value, while other links should have none.

React email utm link tests should fail on misspelled names such as \`utm_campain\`, duplicated keys, wrong case, blank values, or unexpected rank content. URLSearchParams makes each condition direct and readable.

Review the [lazy Resend initialization article](/blog/testing-lazy-resend-initialization-nextjs-build) for client creation checks. Rendering URLs does not require a live Resend client or API key.

## How Should Weekly digest utm content Be Exercised?

Weekly digest utm content should be exercised with ordered inputs whose paths make each rank obvious. Three items are enough to prove first, middle, and later behavior, while an empty list covers the no-item branch.

Render with stable \`weekNumber\` and \`year\`, although those props do not alter href values. Extract only anchors under the QASkills origin, then separate skill detail paths from the catalog, preference, and unsubscribe paths.

For each detail link, parse the last path segments and compare them with the corresponding input item. Assert source \`email\`, medium \`weekly_digest\`, campaign \`engagement\`, and content \`skill_rank_\${index + 1}\`.

The helper below renders welcome and alert templates, then returns decoded URL objects. It avoids a whole-document snapshot and gives each test access to parsed query values.

\`\`\`tsx
import { render } from '@react-email/render';
import { expect, test } from 'vitest';
import WelcomeEmail from '@/emails/welcome';
import NewSkillAlert from '@/emails/new-skill-alert';

function urlsFrom(html: string): URL[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map(([, href]) => {
    const decoded = href.replaceAll('&amp;', '&');
    return new URL(decoded);
  });
}

test('welcome and skill alert keep their own campaign fields', async () => {
  const welcome = urlsFrom(
    await render(<WelcomeEmail username="Case User" unsubscribeUrl="https://mail.test/u?id=7" />),
  );
  const skillAlert = urlsFrom(
    await render(
      <NewSkillAlert
        skillName="Case Skill"
        skillDescription="A stable test fixture."
        skillAuthor="case-author"
        skillSlug="case-skill"
        authorName="Case Author"
      />,
    ),
  );

  const browse = welcome.find((url) => url.pathname === '/skills')!;
  expect(Object.fromEntries(browse.searchParams)).toEqual({
    utm_source: 'email',
    utm_medium: 'welcome',
    utm_campaign: 'user_onboarding',
  });

  const detail = skillAlert.find((url) => url.pathname === '/skills/case-author/case-skill')!;
  expect(detail.searchParams.get('utm_medium')).toBe('skill_alert');
  expect(detail.searchParams.get('utm_campaign')).toBe('new_skill');
});
\`\`\`

An HTML parser may be preferable if the project already uses one. The extraction rule must still include both Button-generated and Link-generated anchors. Avoid a regex that captures only links with UTM text because it would miss an untracked regression.

The empty digest should contain no skill detail href and no \`utm_content\`, while its browse and utility links remain. This proves item tracking depends on mapped skills rather than a template-wide query.

Use unique slugs that contain no query or fragment characters. URL encoding behavior is a separate concern unless the product accepts such values. This suite should isolate rank and campaign rules first.

After unit checks, open the [QA skills catalog](/skills) from one rendered browse link in a smoke test. Do not send real email just to prove URL parsing.

## Step-by-Step Skill alert tracking links Procedure

Skill alert tracking links should be checked through one repeatable render, parse, classify, and compare flow. Use the same helper across templates, but pass a distinct expected campaign object for each one.

1. Render each email template with deterministic URLs and ranked skills.
2. Extract all anchors and parse each href with the URL API.
3. Assert campaign fields by template and rank-specific \`utm_content\` for digest items.
4. Flag missing, duplicated, or unexpected tracking on utility links.

Step one should render both default and supplied unsubscribe variants. Stable props keep failures focused on URL code. Never put real signed unsubscribe tokens or customer data into fixtures or test output.

Step two should decode HTML entities before URL parsing and retain link text or role when the renderer exposes it. Path-only grouping is enough for these templates because destinations are distinct, but clear labels improve reports.

Step three compares exact key sets as well as values. Welcome expects three campaign keys, alert expects three, digest items expect four, and digest utility links expect three. Supplied unsubscribe links expect only their caller-provided query.

Step four should list every anchor that lacks expected fields and every anchor with forbidden extras. A broad \`some(link matches)\` assertion can pass while another CTA is broken. Iterate over the full classified collection.

Run the procedure after any campaign rename, URL path change, or template component upgrade. Then check [getting started](/getting-started) and [dashboard preferences](/dashboard/preferences) separately so route failures do not blur generation failures.

Save only normalized origin, path, and key names in routine logs. Query values can include signed unsubscribe data in other fixtures, so redact caller-owned values by default.

## Render email template tests: Assertions and Diagnostics

Render email template tests should assert semantics instead of generated style markup. Anchor hrefs, destination paths, campaign fields, counts, and visible CTA labels survive harmless layout changes better than a full HTML snapshot.

For welcome, expect one skills CTA, one guide link, one preferences link, and one website link. Expect the optional unsubscribe link only when its prop exists. Each first-party tracked URL gets welcome fields and no rank content.

For the alert, expect one dynamic skill CTA, preferences, and unsubscribe. The default unsubscribe link gets alert fields, while a supplied one stays exact. The code block with the CLI command is not an anchor and should not enter link counts.

For digest, expect one detail link per skill plus browse, preferences, and unsubscribe. Visible ranks and \`utm_content\` should agree. Duplicate slugs can make path grouping unclear, so fixture slugs should be unique.

This parameterized example focuses on rank content and rejects rank fields on utility links. It uses URL parsing after HTML entity decoding rather than string suffix checks.

\`\`\`tsx
import { render } from '@react-email/render';
import { expect, test } from 'vitest';
import WeeklyDigest from '@/emails/weekly-digest';

test('weekly digest assigns one-based content only to ranked skills', async () => {
  const skills = [1, 2, 3].map((rank) => ({
    name: \`Skill \${rank}\`,
    description: \`Fixture \${rank}\`,
    author: \`author-\${rank}\`,
    slug: \`skill-\${rank}\`,
    installCount: rank,
    qualityScore: 90,
  }));
  const html = await render(<WeeklyDigest skills={skills} weekNumber={30} year={2026} />);
  const urls = [...html.matchAll(/href="([^"]+)"/g)].map(
    ([, href]) => new URL(href.replaceAll('&amp;', '&')),
  );
  const details = urls.filter((url) => /^\\/skills\\/author-\\d\\/skill-\\d$/.test(url.pathname));

  expect(details).toHaveLength(3);
  details.forEach((url, index) => {
    expect(url.searchParams.get('utm_source')).toBe('email');
    expect(url.searchParams.get('utm_medium')).toBe('weekly_digest');
    expect(url.searchParams.get('utm_campaign')).toBe('engagement');
    expect(url.searchParams.get('utm_content')).toBe(\`skill_rank_\${index + 1}\`);
  });
  expect(urls.find((url) => url.pathname === '/skills')?.searchParams.has('utm_content')).toBe(
    false,
  );
});
\`\`\`

Add failure messages that print template name, CTA role, pathname, expected keys, and actual key names. Do not print a supplied unsubscribe query. A redacted report still reveals whether mutation occurred.

Email delivery, provider click rewriting, and analytics ingestion are outside these component tests. Use a separate environment if those systems need end-to-end proof. React email utm link tests establish the HTML handed to that pipeline.

Browse the [QASkills blog](/blog) for adjacent email checks. Keep this suite runnable without network access, provider credentials, or a mailbox.

## What Regressions and Boundaries Prevent False Confidence?

A test that searches rendered HTML for \`utm_source=email\` can pass when only one anchor is tracked. Classify every href and apply expectations to each role. Missing and duplicate links must fail as clearly as wrong values.

Full-string comparisons can hide query ordering concerns or fail on harmless escaping. Parse with URL and compare key sets plus values. Reserve exact href comparison for caller-supplied unsubscribe URLs that must remain unchanged.

Rank one alone cannot prove indexing. Include a later item and compare content with its input position. Also check that browse and preference links do not inherit the last item's rank.

Default and supplied unsubscribe behavior differ by design. Welcome omits unsubscribe without a prop, while alert and digest create a default tracked URL. A shared helper must not flatten those branches into one false rule.

The templates interpolate author and slug without local normalization. Give them safe, distinct fixture values and test exact paths. Validation of those input fields belongs upstream unless these components later take responsibility.

Do not infer click success from valid HTML. These tests do not open destinations, send mail, or confirm analytics storage. One separate route smoke can check key paths, while provider and reporting checks keep their own owners.

Campaign values may change through an approved marketing decision. Update source and expectations in one change, then inspect all links for mixed old and new values. The [batch email failure guide](/blog/testing-batch-email-partial-failures-promise-allsettled) remains separate because sending does not define tracking.

Finally, run output checks after React Email dependency updates. The [lazy Resend testing article](/blog/testing-lazy-resend-initialization-nextjs-build) can cover build-time client behavior, while this suite guards anchor semantics.

Keep the final report small enough to scan. Each row should show the template, link role, safe path, key names, and rank when one is due. It should hide any token or caller-owned value. React email utm link tests then give a clean fault trail without placing private link data in CI output.

Use plain fixture words so path faults stand out. Give each author and slug a short, unique name. Keep item order fixed for the full run. If a row moves, the rank field and visible rank should move as one pair, while the base campaign fields stay the same.

Run this link list before a template change ships:

- welcome skills button has the right path and three welcome keys
- welcome guide link has the same source medium and campaign values
- welcome preference link has no rank key or extra blank value
- welcome site link keeps the root path and the welcome query
- welcome supplied unsubscribe link stays byte-for-byte caller owned
- welcome without an unsubscribe prop has no unsubscribe anchor at all
- alert skill button keeps author before slug in its dynamic path
- alert skill button has source email medium skill alert and new skill campaign
- alert preference link uses the alert campaign and no rank content
- alert default unsubscribe link uses the same fixed alert campaign
- alert supplied unsubscribe link gains no new key from the template
- digest first skill link has content rank one and its own path
- digest third skill link has content rank three and its own path
- digest item ranks stay unique across the full input list
- digest browse link has campaign keys but no rank content key
- digest preference link has campaign keys but no rank content key
- digest default unsubscribe link has no rank value from the last item
- digest supplied unsubscribe link stays exact after HTML is decoded
- empty digest output has no detail link and no rank content key
- all tracked links have one value for each required campaign key

## Frequently Asked Questions

### How do react email utm link tests inspect every CTA?

Render each template, extract every href from Button and Link output, decode HTML entities, and parse each value with URL. Classify anchors by role or pathname, then compare destination, exact query keys, parameter values, counts, and forbidden extras. Do not stop after finding one correctly tracked link.

### What should react email link testing do with unsubscribe URLs?

Test default and caller-supplied branches separately. Alert and digest add their campaign query to the default QASkills unsubscribe path, while welcome omits that link without a prop. Any supplied unsubscribe URL should remain unchanged, since extra parameters could alter a signed destination.

### Which email utm campaign assertions differ by template?

All three use source \`email\`. Welcome uses medium \`welcome\` and campaign \`user_onboarding\`; alert uses \`skill_alert\` and \`new_skill\`; digest uses \`weekly_digest\` and \`engagement\`. Only ranked digest skill links add a \`utm_content\` value, and supplied unsubscribe links stay outside those fixed template campaign rules.

### How is weekly digest utm content calculated?

The digest maps skills in input order and builds \`skill_rank_\${index + 1}\`. The first item receives rank one, and each later item receives its one-based position. Test at least three items, then assert utility and browse links contain no rank content.

### What belongs in skill alert tracking links coverage?

Assert the dynamic author and slug path, source, alert medium, new-skill campaign, preference URL, and default unsubscribe URL. Repeat with a supplied unsubscribe destination and confirm it stays exact. Distinct author and slug fixture text catches swapped or missing path segments.

### Why should render email template tests avoid full snapshots?

Full snapshots change with style, attribute order, or renderer details that do not affect tracking. Parsed URL assertions focus on user destinations and campaign meaning. Small snapshots may support layout work, but they should not replace complete anchor classification and query checks.

## Conclusion

React email utm link tests should parse every rendered anchor, verify each template's exact campaign tuple, prove one-based digest rank content, and preserve caller-owned unsubscribe URLs. Those checks catch partial tracking and path drift without tying the suite to generated style markup.

[Open getting-started](/getting-started), render all three templates, and add URL-parsed UTM assertions before changing email campaigns. Then browse [QA testing skills](/skills) for related checks that can support the wider email release gate.`,
};
