import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Nextjs static asset matcher tests',
  description:
    'nextjs static asset matcher tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'nextjs static asset matcher tests',
  keywords: [
    'nextjs static asset matcher tests',
    'nextjs middleware regex tests',
    'exclude static files middleware',
    'middleware matcher query string',
    'nextjs asset bypass matrix',
    'test middleware file extensions',
  ],
  relatedSlugs: [
    'react-nextjs-testing-complete-guide',
    'authentication-authorization-testing-guide',
    'api-security-testing-checklist-2026',
    'github-actions-testing-ci-cd-guide',
  ],
  sources: [
    'https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware',
    'https://clerk.com/docs/reference/nextjs/clerk-middleware',
  ],
  repoEvidence: [
    'packages/web/src/middleware.ts:config.matcher',
    'packages/web/src/app/robots.ts:robots',
  ],
  content: `Nextjs static asset matcher tests should evaluate complete URLs through Next.js matcher utilities, then confirm representative requests against a running app. Static file pathnames and framework assets should bypass the general matcher, while application paths remain eligible even when their query values look like filenames. API paths need their explicit matcher coverage.

The contract lives in \`packages/web/src/middleware.ts\`, with \`packages/web/src/app/robots.ts\` providing a useful generated-route control. Tests must separate pathname extensions from query text. A raw regular expression applied to the wrong string can pass while deployed middleware behaves differently.

## Nextjs static asset matcher tests: What Must the Suite Prove?

Nextjs static asset matcher tests must prove that the configured matcher skips intended framework and static asset pathnames without skipping application requests whose search parameters contain dots or file extensions. They must also prove that API paths remain matched and protected application paths still reach Clerk middleware.

The first configured pattern rejects paths beginning with \`_next\` and paths whose pre-query portion ends in a listed file extension. Its extension set covers common pages, scripts other than JSON, images, fonts, documents, archives, and web manifests. The second pattern always includes API and TRPC paths.

That wording is precise because \`js(?!on)\` treats JavaScript differently from JSON. A \`.js\` pathname belongs to the excluded file group, while \`.json\` is not captured by that \`js\` branch. API JSON paths still match through the explicit API expression.

Search text must not become a fake pathname extension. A request such as \`/dashboard?return=report.pdf\` has an application pathname and a file-like query value. The matcher should remain active, allowing the protected route rule to enforce authentication.

By contrast, \`/images/report.pdf?return=/dashboard\` has a listed extension in its pathname. The file should bypass the broad middleware pattern. Query text after the question mark should neither hide nor create the pathname extension.

The route control in robots source returns allow and disallow values plus a sitemap URL. Its generated pathname is \`/robots.txt\`, and \`txt\` is not in the current exclusion list. Therefore tests should evaluate it from source configuration rather than assuming every file-looking framework route bypasses middleware.

Observable results include matcher booleans, authentication behavior, response status, final path, and middleware call evidence where available. The [authentication testing guide](/blog/authentication-authorization-testing-guide) covers broader access rules, while this article owns request selection before those rules run.

## Which QASkills Code Paths Own This Contract?

The file \`packages/web/src/middleware.ts\` defines public webhooks, protected routes, the authenticated middleware, a test bypass, and two matcher strings. The matcher decides whether middleware is eligible to run. Route matchers inside the middleware then decide whether authentication protection applies.

Public webhooks use one createRouteMatcher expression. Protected routes include dashboard paths, skill creation API paths, and review API paths. A matcher inclusion does not automatically mean a request is protected, since most public application pages still pass through middleware without calling \`auth.protect()\`.

The default export also depends on \`QASKILLS_DISABLE_AUTH\`. When that value equals one, a small middleware returns NextResponse.next. Matcher tests should import only the exported config for pure selection cases, then run integration cases under an explicitly chosen auth mode.

The first config matcher contains a negative lookahead. It skips \`_next\` and listed static extensions before a query marker. The second matcher includes any path beginning with API or TRPC, preserving middleware coverage for service routes that could otherwise resemble files.

The file \`packages/web/src/app/robots.ts\` returns metadata for five user-agent rules. Each rule shares allow values for root and the Open Graph API, plus disallow values for dashboard, API, and unsubscribe paths. It also returns the QASkills sitemap URL.

The [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) supplies broad app test patterns. Nextjs static asset matcher tests should keep source ownership clear: middleware config owns selection, Clerk owns auth handling, and robots source owns response metadata.

Recommendations must not be presented as existing code. A helper that exports categorized fixture cases could reduce duplication, but no such helper appears in these files. Tests can define their own explicit URL table and compare it directly with \`config.matcher\`.

## Nextjs middleware regex tests: Baseline Cases

Nextjs middleware regex tests need representative positives and negatives rather than dozens of similar extensions. Start with one framework asset, one image, one font, one document, one application page, one query-string trap, and two API paths.

\`/_next/static/chunks/app.js\` should not match the broad application pattern. Its \`_next\` prefix is enough, even before the script extension is considered. This case catches accidental removal of the framework exclusion.

\`/brand/logo.svg\`, \`/fonts/site.woff2\`, and \`/manual.pdf\` should also bypass that pattern because their pathnames end with listed extensions. Add search text to one fixture and verify the original path extension still controls the outcome.

\`/blog\` and \`/getting-started\` should match because they are normal application paths. A dot inside a slug segment may need separate product review, but the present contract focuses on endings that match the configured extension group.

\`/blog?download=manual.pdf\` should match. The expression's \`[^?]*\` portion prevents the extension scan from consuming search parameters. This is the key negative case for a query-string bypass defect.

\`/dashboard?next=avatar.png\` should also match and remain eligible for [protected-route handling](/blog/authentication-authorization-testing-guide). A signed-out browser must not reach dashboard content merely because a query value ends in an image extension.

\`/api/reviews/export.csv\` matches the explicit API expression even if the first pattern excludes the file extension. Likewise, \`/api/data.json\` remains an API match. Report which matcher accepted the case when that detail helps diagnostics.

The [API security checklist](/blog/api-security-testing-checklist-2026) covers authorization after matching. Nextjs static asset matcher tests prove eligibility and one protected outcome, but they do not replace endpoint permissions or response-data assertions.

## Exclude static files middleware: Test Matrix

An exclude static files middleware matrix should show pathname and query inputs separately. This prevents reviewers from reading a full URL as one undifferentiated extension string.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Framework asset | /_next/static/app.js | _next exclusion | Matcher false | Auth middleware not selected | Framework request matches |
| Image or font | /brand.svg or /site.woff2 | Extension exclusion | Matcher false | No protection call | Static path enters middleware |
| Robots route | /robots.txt | txt not excluded | Matcher true | Robots response remains available | Assumed static bypass |
| File-like query | /blog?file=guide.pdf | Query boundary | Matcher true | Public page still responds | Query text causes bypass |
| Protected query | /dashboard?next=avatar.png | Dashboard plus query | Matcher true, then protected | Auth handling runs | Dashboard becomes public |

The framework row checks the prefix and one extension together. Add a plain \`/_next/data\` case if framework routing changes, but do not rely only on \`.js\` because the prefix is a distinct rule.

The image and font row verifies common binary assets without testing every listed suffix in every browser. A parameterized pure test can cover all suffixes cheaply, while one or two server requests confirm integration behavior.

The robots row is intentionally surprising. Its pathname looks like a static file, but \`txt\` is not listed. The expected matcher result follows current configuration, while response assertions follow \`packages/web/src/app/robots.ts\`.

The file-like query row is the core boundary. If a test strips the query before calling an arbitrary JavaScript RegExp, it may accidentally prove the desired result without exercising Next.js parsing. Use the framework matcher utility with the complete URL.

The protected query row connects selection with security behavior. It should run without an authenticated session and observe configured Clerk handling. Then run with a test session and require dashboard content, preserving the same query.

Nextjs static asset matcher tests should retain this matrix near middleware changes. The [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide) can help place pure and server cases in separate jobs without weakening either assertion.

## How Should Middleware matcher query string Be Exercised?

A middleware matcher query string should be passed as part of a complete absolute URL to Next.js testing utilities. Do not split the string and test only the pathname when the contract specifically concerns search values. The framework needs the chance to apply its own matcher parsing.

Next 15 exposes \`unstable_doesMiddlewareMatch\` from its experimental server testing module. It accepts the exported config, URL, and optional Next config. That utility is stronger than constructing a JavaScript RegExp directly from source text.

The [Next.js middleware documentation](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware) is the approved framework reference. Pair its matcher semantics with repository-specific examples. Source configuration remains the oracle for which extensions QASkills chose.

For each application path, create three variants: no query, a normal query, and a file-like query. Their matcher result should remain equal because pathname identity did not change. Use dashboard, blog, and an API route so public and protected categories appear.

For each static asset path, add both normal and file-like query values. Those results should remain false under the broad matcher because the actual pathname still has an excluded prefix or suffix. API paths remain a special case through the second expression.

The [Clerk middleware reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) shows the same style of matcher and describes skipping internals and static files unless the file-like text appears in search parameters. This external source supports the query boundary, while QASkills source defines its exact two strings.

After pure checks pass, launch the app with a known auth configuration. Request a protected application path containing \`.pdf\` in a query value. Assert the normal protected outcome, proving the integration did not apply a different URL interpretation.

Keep one public control such as [the QASkills blog](/blog) with a file-like query. Its content should remain available. This control separates a matcher defect from a broader server or authentication setup failure.

## Step-by-Step Nextjs asset bypass matrix Procedure

A nextjs asset bypass matrix should move from explicit URLs to pure matching and then to observed route behavior. Keep the sequence stable across middleware changes.

1. Convert representative URLs into a table with separate pathname, query, extension class, access class, and expected match.
2. Apply Next.js matcher semantics to every complete URL without treating query values as pathname extensions.
3. Run public and protected browser requests, then observe content or configured Clerk authentication handling.
4. Keep robots, framework assets, API routes, and file-like queries in the final post-change matrix.

The first step should use literal expected booleans. Do not generate expected results from the same regular expression under test. Human-readable categories make reviews possible before code runs.

The pure test can import the production config and execute all cases with the framework utility. Its case table should hold the expected value instead of deriving that value from the imported config:

\`\`\`typescript
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, test } from 'vitest';
import { config } from '@/middleware';

const cases = [
  ['framework script', 'https://qaskills.sh/_next/static/app.js', false],
  ['image path', 'https://qaskills.sh/images/logo.svg?next=/dashboard', false],
  ['public query', 'https://qaskills.sh/blog?file=guide.pdf', true],
  ['protected query', 'https://qaskills.sh/dashboard?next=avatar.png', true],
  ['robots route', 'https://qaskills.sh/robots.txt', true],
  ['API file path', 'https://qaskills.sh/api/reviews/export.csv', true],
] as const;

describe('middleware matcher', () => {
  test.each(cases)('%s', (_, url, expected) => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url,
      }),
    ).toBe(expected);
  });
});
\`\`\`

The API CSV case should match through the explicit second matcher even though the extension belongs to the first pattern's exclusion group. This fixture guards the intentional overlap between expressions.

The server stage should avoid counting console text as its only proof. Assert destination content or authentication outcome, status, and final path. Logs are helpful attachments, but production logging can change without changing matcher behavior.

The final stage records all cases and environment mode. If auth is disabled for a test server, protected behavior cannot be asserted there. Run that case under an auth-enabled fixture rather than claiming a bypass server proves protection.

Use [QASkills getting started](/getting-started) as another public control after the matrix runs. Nextjs static asset matcher tests should remain deterministic and must not depend on external assets loading successfully.

## Test middleware file extensions: Assertions and Diagnostics

The expression uses optional characters in several groups, such as html, jpeg, woff, doc, and xls variants. One representative per branch can catch grouping mistakes. A full suffix table remains cheap in the pure utility test.

Do not include unsupported assumptions. The current list does not name txt, map, xml, or pdf alternatives beyond its literal expressions. Record actual matcher results for such paths and review product needs separately instead of marking every file suffix false.

A cross-layer route test can verify robots output and a protected file-like query. It should keep the public text check apart from the signed-out access check:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('serves robots and protects an application path with a file query', async ({
  page,
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: https://qaskills.sh/sitemap.xml');

  await page.goto('/dashboard?next=manual.pdf');
  await expect(page).not.toHaveURL(/\\/_next\\/static/);
  await expect(page.locator('body')).not.toContainText('Application error');
  // Add the Clerk fixture's exact signed-out assertion for this environment.
});
\`\`\`

The final line is deliberately environment-specific. A project Clerk fixture should assert its known sign-in response or URL. Do not replace that proof with a comment in the real suite; the example marks where configured behavior belongs.

Diagnostics should include fixture name, complete URL, parsed pathname, search string, expected boolean, actual boolean, and matching expression category. For server cases, add auth mode, status, final URL, and visible heading.

Avoid printing cookies, Clerk tokens, or complete request headers. Matcher inputs rarely need those values for this contract. If header-based behavior is added later, sanitize the smallest relevant header in failure output.

Nextjs static asset matcher tests can use [available QA skills](/skills) for related security and browser checks. The report itself should stay focused on extension category, query boundary, API override, and protected outcome.

## What Regressions and Boundaries Prevent False Confidence?

A direct RegExp unit test alone can be misleading because Next.js preprocesses matcher configuration and request URLs. Use the framework testing utility for primary booleans, then keep one running-app request for the security-sensitive query case.

Stripping the query before every test creates another blind spot. That approach may return the desired boolean, yet it never proves the source expression handles a question mark correctly. Always retain full URLs in file-like query fixtures.

The opposite error treats the entire URL as a pathname. It can interpret \`?file=guide.pdf\` as a static extension and skip middleware incorrectly. Report parsed pathname and search fields separately so this mistake is visible.

Do not equate middleware matching with route protection. Public blog pages can match without calling \`auth.protect()\`, while dashboard paths match and trigger protection. Assertions need both the selection boolean and one access outcome.

API paths overlap the patterns intentionally. A CSV-like API path may fail the first matcher and still pass the second. A test harness that stops after evaluating only one expression can report the wrong final result.

Robots is a generated route control, not proof that all metadata routes behave alike. Its source response verifies allow, disallow, and sitemap output. The current matcher result follows the literal txt treatment and may change if exclusions change.

Avoid asserting that bypassed assets never execute any platform code. The config says QASkills middleware is not selected for those URLs. Hosting, caching, and framework internals remain outside this test's observable contract.

After changes, rerun framework prefixes, each extension branch, JSON contrast, public queries, protected queries, API file paths, robots, and auth-disabled mode. Nextjs static asset matcher tests should fail on the smallest changed category with complete URL evidence.

### Read each URL as two parts before judging it

Write the path in one field and the search text in a second field before the test runs. This split keeps a dot after the question mark from looking like a file at the end of the path.

Mark the last path part as app, framework, file, or API with a short plain label. The label gives the reviewer a quick clue, but the literal expected result must still stand on its own.

For an app path, keep the same path and swap three query values across separate rows. Use plain text, a file name, and a path-like value so all three forms prove the same match.

For a file path, keep its true suffix while changing search text in the same way. The matcher result should stay false because the real path, not the search text, owns the file type.

For an API file path, show both matcher rules in the report. The broad rule may skip a CSV path, yet the API rule should still make the full config return true.

For JSON, state why it is a contrast rather than calling it a script file. The negative lookahead after js keeps json out of that one script suffix branch.

For robots, keep txt visible in the path column and note that current source does not list txt. This fact makes the true result easy to review without a guess about all text files.

For dashboard, place the session state beside the URL rather than inside a long test name. The same row can then show matched, protected, and signed-out as three linked facts.

Do not trim, decode, or rebuild the URL before the framework helper receives it. The full input should match what a browser would request, including its question mark and search keys.

If a case uses encoded dots or slashes, show both raw URL and parsed parts. Add that case only when the product accepts such input, since extra encodings can blur the core rule.

### Use a short fault tree when a case fails

First compare the parsed pathname with the fixture path. If they differ, fix the test data or URL builder before changing the middleware expression.

Next compare the search text and confirm it did not move into the pathname field. A bad parser in the test can create the same bypass that the suite seeks to catch.

Then ask whether the first matcher accepted the URL. If not, check framework prefix and listed suffix before looking at the second API matcher.

For an API path, always check the second matcher before reporting a miss. The final config accepts a request when either listed matcher accepts it.

For a public app page, a true match should still lead to normal page content. A match does not imply a sign-in prompt because the inner protected list makes that later choice.

For dashboard, a true match should lead to the known auth result for the chosen session. If it does not, save status and final path, then inspect the protected route matcher.

For an asset, a false result is the whole QASkills middleware claim. Do not infer cache headers, file bytes, or host behavior from that one selection fact.

For robots, compare the response with source values after checking the match. This pair shows that route output stayed sound even though the txt path still entered middleware.

Keep one known public page and one known asset in every server run. If both fail, the host or build is likely at fault, not each fixture rule.

Use a related skill from the [QA skills directory](/skills) only after this small fault tree points to the right layer. Nextjs static asset matcher tests should lead with URL facts, not a large trace from unrelated app code.

Add one case where the app path has no dot at all, but both its key and value use dots after the question mark. The result must stay true because none of that search text changes the real path that the first matcher sees. Add a twin case where the real path ends in svg, but the search text looks like a plain app path with no file name.

The twin result must stay false because a safe query cannot turn a true file path back into an app page. Keep one API path that ends in csv and one that ends in js, then show the broad and API results for each. Both final results must be true because the second matcher has no file rule and accepts the API prefix.

Run the same key app cases with a slash at the end of the path, then parse the path that Next.js reports. A slash may change the text shape, but it must not let a search value act as a file suffix. Use one path with a dot in a middle folder while its last part is a normal app name.

Record the current helper result and avoid a broad claim until that exact form has a clear product rule. When the pure table passes, send just six key cases through the test host to keep the slow check short. Pick framework, file, public app, protected app, API file, and robots so each source branch has one real request.

Start the host with a named auth mode and print that safe mode name at the top of the report. This note stops a test run with auth turned off from being read as proof that the dashboard stayed protected. For the public app request, use a file-like query and check the page heading plus the same final path.

A blank page or route shift must fail even when the pure matcher value was true as planned. For the protected request, use the same kind of query and the known signed-out test state. Check the known auth result, then run one signed-in case to prove the page can still load with that query intact.

For the API file request, use a safe read route or a test stub that makes no change. Check that the request reached the API path, then keep endpoint data and access rules in their own suite. For the asset request, check that the file response does not need a user session, but do not treat that fact as proof of cache rules.

The matcher gate owns just the choice to skip QASkills auth code for the file path. For robots, read the text and match the allow, block, and site map lines that its source builds. Keep this content check near the true matcher result so the odd txt case stays easy to grasp.

Close each host run as soon as these six requests end, then save only failed route facts and safe screen text. A short run cuts noise and leaves the pure table to cover the full set of file types. If a host case fails while its pure case passes, mark the fault as an app handoff rather than a regex miss.

This name sends the next check toward auth, route build, or page output instead of the tested value table. If a pure case fails, stop before the host run and show its parsed path, search text, and two matcher outcomes. The small report is enough to fix the config or correct a wrong test claim.

## Frequently Asked Questions

### How do you test static paths and file-like query strings correctly?

Pass complete absolute URLs into Next.js matcher testing utilities and keep pathname plus search text visible in fixtures. Assert static pathname exclusions, application-path inclusion, and API overrides. Then request one protected path with a file-like query through a running app and observe normal authentication handling.

### What should nextjs middleware regex tests include?

Include a framework asset, JavaScript, image, font, document, archive, web manifest, JSON contrast, public page, protected page, robots route, and API file path. Add queries to both static and application paths. Use literal expected booleans rather than deriving the oracle from production regex text.

### How can you prove exclude static files middleware behavior?

Use the exported config with the framework matcher utility, then confirm a few asset requests against the app. Assert false for listed static pathname extensions and framework prefixes. Keep API paths separate because their explicit matcher can override exclusion from the broad application expression.

### Why is a middleware matcher query string a security case?

A protected application pathname must not bypass middleware because a search value resembles a file. Test a signed-out dashboard request containing a value such as report.pdf, then require configured auth handling. Also verify the same pathname matches without that query so both forms share protection.

### What belongs in a nextjs asset bypass matrix?

Record fixture name, pathname, search string, extension category, access class, expected match, actual match, status, and final route. Cover both pure matcher and server outcomes. Keep secrets and cookies out of logs, while preserving enough URL data to identify query-versus-path mistakes.

### How should teams test middleware file extensions without excess cases?

Parameterize one suffix for each regular-expression branch, plus optional variants and JSON as a contrast. Pure matcher checks are inexpensive, so the full list is reasonable there. Limit browser requests to representative assets, one API override, robots, and one protected file-like query.

## Conclusion

Nextjs static asset matcher tests prove a routing boundary before authentication code runs. They must distinguish excluded pathname extensions from harmless file-like search values, preserve explicit API matching, document robots behavior, and connect one protected query case with actual Clerk handling.

[Open getting-started](/getting-started), run the public and protected route matrix, and verify every case before changing middleware exclusions. Continue with the [skills directory](/skills) and [QASkills blog](/blog) for focused security and framework testing workflows.`,
};
