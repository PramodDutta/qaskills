import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Weekly digest ranking link tests in email',
  description:
    'weekly digest ranking link tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'weekly digest ranking link tests',
  keywords: [
    'weekly digest ranking link tests',
    'digest rank badge test',
    'email skill order assertion',
    'utm content skill rank',
    'weekly digest author route',
    'react email list rendering',
  ],
  relatedSlugs: [
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'react-nextjs-testing-complete-guide',
  ],
  sources: ['https://react.email/components', 'https://react.email/docs/components/link'],
  repoEvidence: [
    'packages/web/src/emails/weekly-digest.tsx:skills map,rankBadge,skill URL',
    'packages/web/src/app/api/cron/weekly-digest/route.ts:topSkills projection',
  ],
  content: `Weekly digest ranking link tests should render a fixed, ordered skills array and inspect every card. Each card must show a one-based badge, use its own author and slug in the details URL, and carry utm_content=skill_rank_N matching the same array index. The suite passes only when all three facts stay aligned.

This contract spans the query result and the rendered email, but each layer needs its own proof; the route supplies ordered skill fields, while the template turns each array position into visible rank and tracking data. A passing response alone cannot show that each recipient receives the right destination.

## Weekly digest ranking link tests: What Must the Suite Prove?

Weekly digest ranking link tests must prove a stable relation among source position, displayed rank, destination, and tracking value. For every supplied skill, position zero becomes badge number one and \`utm_content=skill_rank_1\`. The author and slug on that same object must appear in its own details URL.

The observable unit is one complete rendered card, not four independent text searches. A document containing \`#1\`, an author, a slug, and one rank query can still be wrong when those values belong to different cards. Scope each assertion to the section created for one source item.

The first three cards deserve explicit checks because the rank text changes for each index, while a fourth card proves the code does not stop at a presumed podium. An empty array can prove no skill cards appear, although that template-only case is separate from the route's early response for no top skills.

Use distinctive fixtures so swapped values cannot pass by chance. Give every skill a different name, author, slug, install count, quality score, and description. A repeated author or shared word makes the output pleasant to read, but it weakens a regression fixture.

The pass criteria should report the array index and expected route when one card fails. Weekly digest ranking link tests are useful only when a maintainer can see whether the defect came from order, card grouping, path construction, or the rank query.

The [leaderboard](/leaderboard) gives reviewers a product view of ranked skills, while this suite fixes the email's rendering rules. Compare that view deliberately, but do not assume both surfaces share one implementation.

## Which QASkills Code Paths Own This Contract?

The template owner is \`packages/web/src/emails/weekly-digest.tsx\`. Its \`skills.map((skill, index) => ...)\` call creates one section per array item. The rank badge uses \`index + 1\`, and the details button uses the same expression inside \`utm_content\`.

That file also builds the author-qualified path as \`/skills/\${skill.author}/\${skill.slug}\`. It appends fixed source, medium, and campaign values before the rank value. These facts are direct repository evidence, so tests should assert the complete URL rather than only its final query pair.

The data owner is \`packages/web/src/app/api/cron/weekly-digest/route.ts\`. Its \`topSkills\` projection selects name, description, author, slug, install count, and quality score. The query orders by weekly installs and then total installs, limits the result to ten, and passes that array to \`sendWeeklyDigest\`.

The route includes \`authorName\` as an additional projected field, while the template consumes \`author\`. A projection test should keep both names visible because a refactor can change one without changing the other. The template contract still depends on \`author\` and \`slug\`.

The route and template prove different things, since a route test can verify projection and order before the send helper runs. A render test can verify badges and links for any ordered array. Keeping both tests narrow produces a clearer failure than one large cron test.

React Email describes its library as a set of components for email markup in the [component catalog](https://react.email/components). Its [Link documentation](https://react.email/docs/components/link) identifies \`href\` as the required destination prop. Those sources support rendering and link inspection, while QASkills source defines the actual route and tracking contract.

Review the [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) when choosing a renderer. Keep the repository path names in the test title so an ownership change is easy to trace.

## Digest rank badge test: Baseline Cases

A digest rank badge test starts with a two-item control and then expands to the brief's five boundaries. The control should render \`#1\` and \`#2\` once each inside the matching skill sections. It should also prove that source data is not sorted again inside the component.

The template does not calculate popularity or quality order. It trusts the array received from its caller and numbers that array from left to right. Reverse the fixture and confirm the badges follow the new positions, not install counts or quality scores.

Use first, second, third, and fourth items with unrelated values. The first three cases catch copied rank literals, while the fourth catches code that renders only a fixed set. Add a tenth item when the route limit needs direct coverage, but keep that query concern in the route suite.

A card should expose more than the badge. Assert its heading, description, metadata, and details button within the same section. These checks confirm that \`skills.map\` keeps all fields from one item together during React email list rendering.

Author and slug values need a separate boundary case. The current template interpolates those strings directly and does not call \`encodeURIComponent\`. A test with simple route-safe values should lock today's working output, while a value containing a space should document the raw output or drive a future encoding change.

Do not write an assertion that silently encodes the expected route, because that would claim behavior absent from the source. If the product decides to encode path segments, change the implementation and expected contract in one review. Until then, a failing boundary case is evidence, not a reason to weaken the check.

An empty skills array renders the surrounding digest, main call to action, and footer without skill cards. This can guard the component in isolation. The cron route normally returns early when \`topSkills.length\` is zero, so route and template expectations must remain distinct.

The [email preferences page](/dashboard/preferences) is relevant to recipient selection, not card rank. Keep subscription coverage outside the digest rank badge test so a recipient-query failure cannot hide a rendering defect.

Weekly digest ranking link tests should also render the same fixture twice and compare the extracted card model. The template has no stateful rank counter, so equal input should produce equal badge and URL data.

## Email skill order assertion: Test Matrix

An email skill order assertion should capture the source index, rendered badge, card text, author, slug, full \`href\`, and \`utm_content\`. The matrix below turns each planned boundary into one observable result. Every expected branch comes from the two repository paths named above.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| First-ranked skill | Item at array index zero | Template \`skills.map\` | Its card shows \`#1\` and its own title | Details link ends with \`skill_rank_1\` | Badge, title, and query belong to different cards |
| Second-ranked skill | Distinct item at index one | Template \`index + 1\` | Its card shows \`#2\` after the first card | Details link ends with \`skill_rank_2\` | Rank repeats one or cards change order |
| Third-ranked skill | Distinct item at index two | Template button URL | Author and slug form its details path | Query keeps source, medium, campaign, and rank | One tracking key is missing or copied |
| Fourth and later skills | At least four ordered items | Unbounded component map | Every supplied item has one section | Each later item gets its one-based rank | Rendering stops after a fixed podium |
| Author and slug boundary | Spaces or reserved path text | Raw string interpolation | Output reflects the current unencoded path rule | No extra send or data write occurs | Expected output claims encoding not present in code |

Read the first two rows together. The badge and query are both derived from one index, but separate assertions can pass after cards are crossed. A card-scoped model should compare \`{ title, badge, href }\` against one expected object.

The third row checks all query fields because \`utm_content\` does not stand alone. A refactor could preserve the rank while dropping \`utm_source=email\`, \`utm_medium=weekly_digest\`, or \`utm_campaign=engagement\`. Full URL equality catches that loss.

The fourth row proves that the component maps every supplied skill. The route limit is ten, but the template has no local limit. Assert one section per fixture item and one details link per section rather than a vague count of all buttons.

The boundary row is intentionally descriptive. Raw interpolation may yield a URL that a client later normalizes, so inspect the rendered \`href\` before browser navigation. This keeps a weekly digest author route test focused on component output.

Use the [QASkills catalog](/skills) for realistic route shape, but keep fixture authors and slugs synthetic. Production catalog data can change and would make the regression test unstable.

## How Should Utm content skill rank Be Exercised?

Utm content skill rank should be exercised by parsing each details URL and comparing its rank token with that card's source position. Rendered text searches are not enough because one URL can contain the expected token while another card lacks it. Build a small extracted model from each skill section.

Use React's server renderer or the same React Email render utility used by the project test setup. The test below uses static markup, finds each title, and inspects the nearby link. A DOM parser can make section scoping clearer when one is already available.

\`\`\`typescript
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import WeeklyDigest from '@/emails/weekly-digest';

const skills = [
  {
    name: 'API Contract Guard',
    description: 'Checks response fields and status codes.',
    author: 'Ada',
    slug: 'api-contract-guard',
    installCount: 19,
    qualityScore: 91,
  },
  {
    name: 'Trace Review',
    description: 'Checks traces for failed browser steps.',
    author: 'Lin',
    slug: 'trace-review',
    installCount: 11,
    qualityScore: 86,
  },
];

describe('WeeklyDigest ranking links', () => {
  it('keeps badge, author route, and rank query aligned', () => {
    const html = renderToStaticMarkup(
      <WeeklyDigest skills={skills} weekNumber={30} year={2026} />,
    );

    expect(html).toContain('#1');
    expect(html).toContain('#2');
    expect(html).toContain(
      'https://qaskills.sh/skills/Ada/api-contract-guard' +
        '?utm_source=email&amp;utm_medium=weekly_digest' +
        '&amp;utm_campaign=engagement&amp;utm_content=skill_rank_1',
    );
    expect(html).toContain(
      'https://qaskills.sh/skills/Lin/trace-review' +
        '?utm_source=email&amp;utm_medium=weekly_digest' +
        '&amp;utm_campaign=engagement&amp;utm_content=skill_rank_2',
    );
  });
});
\`\`\`

Static HTML escapes ampersands, so the expected string reflects serialized markup rather than the raw JSX prop. A DOM parser usually exposes a decoded \`href\`. Choose one form and state it in the test to prevent serializer changes from looking like product defects.

The stronger version first locates each title, then its parent card and button. It asserts one matching badge and one details link per card. This arrangement catches a copied rank even when the whole document still contains every expected number.

Also assert input order. Reverse \`skills\`, render again, and expect Lin's route to receive rank one. This proves the rank belongs to query order rather than a field such as install count.

Weekly digest ranking link tests should not mock \`index + 1\` or recreate the URL helper in test code. Drive the exported component and compare literal expected output. Reimplementing the formula in the expectation can repeat the same defect.

The [getting started guide](/getting-started) can supply a manual install flow after the unit gate passes. It should not replace exact card-level assertions in continuous integration.

## Step-by-Step Weekly digest author route Procedure

A weekly digest author route procedure must connect ordered query data to rendered link output without merging both concerns into one opaque assertion. Use deterministic objects and retain every extracted value when the check fails. The sequence below follows the brief's required cross-layer path.

1. Render a digest with ordered skills and distinct author-slug pairs.
2. Parse each item's badge, title link, href, and tracking query.
3. Assert one-based rank and \`utm_content\` stay aligned with the source array position.
4. Cross-check the projected fields supplied by the cron query.

Start by giving each object a route-safe author and slug. Keep a second fixture with a space or reserved character, since the current raw interpolation rule deserves a visible boundary. Do not let the boundary fixture change the normal control.

At the route layer, intercept the value passed to \`sendWeeklyDigest\`. The selected projection should contain the fields the template needs, in the same order returned by the query. The following focused shape check avoids testing actual email delivery.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/cron/weekly-digest/route';
import { sendWeeklyDigest } from '@/lib/email/send';

vi.mock('@/lib/email/send', () => ({
  sendWeeklyDigest: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
  vi.mocked(sendWeeklyDigest).mockClear();
});

it('passes the ordered topSkills projection to each subscriber', async () => {
  const request = new Request('http://local/api/cron/weekly-digest', {
    headers: { authorization: 'Bearer test-secret' },
  });

  const response = await GET(request as never);

  expect(response.status).toBe(200);
  expect(sendWeeklyDigest).toHaveBeenCalledTimes(1);
  expect(vi.mocked(sendWeeklyDigest).mock.calls[0][1]).toEqual([
    expect.objectContaining({
      name: 'API Contract Guard',
      author: 'Ada',
      slug: 'api-contract-guard',
    }),
    expect.objectContaining({
      name: 'Trace Review',
      author: 'Lin',
      slug: 'trace-review',
    }),
  ]);
});
\`\`\`

This example assumes the database chain is replaced by a fixture in the surrounding test setup. That double must preserve call order and return separate top-skill and subscriber results. A fake that always returns one array could pass the send assertion while bypassing the query split.

Assert status, send count, projected order, and card output in their respective tests. A route test should not parse HTML if the send helper is mocked. A template test should not start the cron route merely to obtain its fixture.

Finish with one cross-layer smoke check if the project test environment can render the React node passed into the email client. The [blog index](/blog) contains related email checks, but this procedure stays centered on ranks and routes.

## React email list rendering: Assertions and Diagnostics

React email list rendering needs visible-output assertions, card counts, field grouping, and useful diagnostics. Report the expected source index, actual badge, expected author path, actual \`href\`, and parsed \`utm_content\`. Those values identify a mapping defect faster than a full HTML snapshot.

Count skill sections indirectly through unique titles or details links, because the template also contains a browse button and footer links. A broad button count includes unrelated actions. Scope selection to links whose path begins with \`/skills/{author}/{slug}\`.

Assert each fixture name occurs once. Then compare its description, metadata values, and details link in the same section. This protects the map key and field grouping without tying the test to every style declaration.

Avoid a complete markup snapshot as the only signal. Email component versions may change wrappers or style serialization while preserving rank behavior. Keep a small snapshot only when the team also maintains semantic assertions for badge and \`href\`.

The React Email component catalog supports composing messages from headings, sections, text, and buttons. QASkills uses those pieces, but the suite should inspect the generated user contract rather than internal component names. A wrapper change should not force a rank test rewrite.

Track side effects explicitly at the route boundary. One subscriber should cause one \`sendWeeklyDigest\` call, while a template render should cause no database operation. Separate call-count checks catch duplicate sends that card HTML cannot reveal.

Weekly digest ranking link tests should retain the rendered fragment for the failed card, not the entire recipient list. Redact real recipient data by using synthetic email addresses and authors. The card fixture does not need a live [dashboard](/dashboard/preferences) session.

Run the card suite without network access. Rendering a React Email component and parsing its links are local operations. A delivery provider test belongs elsewhere and should not decide whether rank mapping is correct.

## What Regressions and Boundaries Prevent False Confidence?

Ranking query correctness and rendered link correctness are separate contracts. This article verifies template output and only cross-checks the projected order passed by the cron route. It does not prove that weekly install counters or leaderboard filters rank every database row correctly.

The query orders by weekly installs and then total installs. A query-focused test should seed ties and inspect returned order. The email test should accept the resulting array as its source and prove no later reorder occurs.

Raw author and slug interpolation is another boundary. The present template does not encode path segments, so a test must not assert encoded output without a matching code change. Add a failing product case when catalog rules permit characters that require encoding.

Email clients can rewrite or track links after delivery. Weekly digest ranking link tests operate before provider or client rewriting, at the rendered message boundary. Delivery checks may verify the received target separately, but they should not obscure a bad source \`href\`.

Do not infer click analytics from the presence of \`utm_content\`. The suite proves that the rank-specific value is emitted. It does not prove an analytics collector receives, stores, or attributes a click.

The route's no-skills response bypasses sending, while an empty template still renders shell content when called directly. Preserve both expectations in their proper suites. Combining them can create a false requirement that the route send an empty digest.

Likewise, recipient preferences decide who gets the message, not how cards are ranked. Use [dashboard preferences](/dashboard/preferences) checks for selection and the [leaderboard page](/leaderboard) for visual order. Keep card mapping focused on one ordered array.

After a template, projection, URL, or email component update, rerun first through fourth rank cases and the raw path boundary. Weekly digest ranking link tests should fail on a moved rank, copied author, copied slug, missing campaign value, duplicate card, or changed input order.

The [QASkills blog](/blog) can hold broader delivery and cache coverage. This regression gate should remain small enough to run on each pull request without a provider account.

## Frequently Asked Questions

### How do you test every digest rank badge and link?

Render several skills with unique names, authors, and slugs, then inspect each card separately. Compare its one-based badge and complete details URL with the same source index. Reverse the fixture once to prove rank follows array order rather than install count, quality score, or a copied literal.

### What should a digest rank badge test avoid?

Avoid checking only that the document contains every expected badge. Those numbers can exist in the wrong cards. Scope assertions by skill title, compare the nearby badge and link, and retain that card's markup on failure. Do not use a full snapshot as the sole behavioral check.

### How does an email skill order assertion catch swaps?

Give every item distinct text and route fields, then extract an ordered list of card models. Compare title, badge, author, slug, and rank query as one object per index. A swapped field breaks that object even when global text searches still find every expected value somewhere.

### What proves the utm content skill rank contract?

Parse each details link and compare \`utm_content\` with \`skill_rank_\${index + 1}\` for that card. Also assert the fixed source, medium, and campaign values. This proves the complete tracking URL emitted by the template, but it does not prove downstream analytics records a click.

### Does the weekly digest author route encode path segments?

The current template inserts author and slug strings directly into the path. It does not call a path encoder in \`packages/web/src/emails/weekly-digest.tsx\`. Keep a route-safe control and a separate boundary fixture, then change the expected encoded form only when implementation and product rules change together.

### How should react email list rendering fail in CI?

Report the source index, skill title, expected badge, actual badge, expected URL, and actual URL. Keep the failed card fragment rather than the whole message. That output shows whether order, grouping, path construction, or tracking changed, while synthetic fixture data avoids exposing recipient details.

## Conclusion

Weekly digest ranking link tests should bind each source item to one card, one-based badge, author-qualified route, and matching rank query. The route projection test protects ordered input, while the render test protects the email result. Neither check should claim delivery, analytics capture, or path encoding beyond current source.

[Open leaderboard](/leaderboard), compare its order with a rendered digest fixture, and add per-rank link assertions before changing the template. Then browse [QA skills](/skills) to select distinct author and slug examples for the normal route-safe control.`,
};
