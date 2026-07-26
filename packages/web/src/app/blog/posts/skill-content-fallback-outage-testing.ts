import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'skill content fallback outage testing',
  description:
    'Use skill content fallback outage testing to prove playwright-cli remains downloadable while other skills preserve correct 404 and 500 responses.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'skill content fallback outage testing',
  keywords: [
    'skill content fallback outage testing',
    'playwright-cli content fallback test',
    'database outage skill download',
    'content API fallback matrix',
    '404 versus 500 download test',
    'local seed markdown availability',
  ],
  relatedSlugs: [
    'playwright-cli-install-quickstart-2026',
    'qaskills-cli-download-fallback-github-content-metadata',
    'testing-versioned-zip-artifact-sha256-etag',
    'testing-skill-md-yaml-frontmatter-roundtrip',
  ],
  sources: [
    'https://nextjs.org/docs/app/building-your-application/routing/route-handlers',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/[id]/content/route.ts',
    'packages/web/src/lib/fallback-skill-detail.ts',
    'seed-skills/playwright-cli/SKILL.md',
  ],
  content: `Skill content fallback outage testing proves that only the playwright-cli raw content route can recover from a database miss or failure. Stub the query to return no row and then to throw, while reading the real local seed file. Other slugs must keep distinct 404 and 500 results instead of receiving invented fallback text.

The decision lives in \`packages/web/src/app/api/skills/[id]/content/route.ts\`. Its small \`fallbackContent\` helper accepts only the exact \`playwright-cli\` slug, and both the empty-result branch and catch branch call it.

The file reader in \`packages/web/src/lib/fallback-skill-detail.ts\` searches two repository-relative locations. Its source is \`seed-skills/playwright-cli/SKILL.md\`, which contains real YAML frontmatter and the full skill body.

This narrow path differs from the CLI's wider download chain. Read the [CLI download fallback guide](/blog/qaskills-cli-download-fallback-github-content-metadata) when testing GitHub, content API, and metadata recovery together.

## What Must Skill Content Fallback Outage Testing Prove?

Skill content fallback outage testing must prove recovery scope, output integrity, and normal error semantics. A passing suite shows that playwright-cli returns real markdown during two database failure modes without changing behavior for any other identifier.

The database-hit case is the first control. When a row exists, the route calls \`buildSkillMarkdown(row)\` and returns that generated document, even when a local seed file is also present.

The clean-miss case comes next. An empty query result for \`playwright-cli\` should read the local seed and return status 200 with \`text/markdown; charset=utf-8\`.

The exception case uses the same narrow fallback. If the database query rejects, the catch block asks for playwright-cli content and returns the markdown when the file reader succeeds.

An unrelated slug must not borrow that file. A clean miss returns JSON with status 404, while a thrown query returns JSON with status 500 and a different error message.

UUID input follows the same normal rules. It changes the database predicate from slug to ID, but it can never equal the exact fallback slug, so no local recovery applies.

Local file failure is part of the contract as well. When the seed cannot be found, the reader returns null; then a playwright-cli miss becomes 404 and a database exception becomes 500.

The body must be more than nonempty test text. Parse its frontmatter, confirm the expected Playwright CLI name, and assert that a known body heading survives.

Use the [SKILL.md roundtrip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) for deeper parser checks. The outage suite needs enough document checks to prove the actual artifact reached the caller.

## How Do You Write a Playwright-CLI Content Fallback Test?

A playwright-cli content fallback test controls the database result and uses the repository file without replacing its contents. This keeps the route branch isolated while preserving proof that deployment inputs contain the needed markdown.

Begin with the real reader. Call \`readFallbackPlaywrightCliMarkdown()\`, require a non-null string, and check the opening delimiter, skill name, and one body heading.

Then mock only the database chain used by the route. The miss version resolves to an empty array, while the error version rejects before a row can be mapped.

Invoke GET with params that resolve to \`{ id: 'playwright-cli' }\`. The request body is irrelevant because the handler reads only route params for this method.

Assert status and content type before checking text. A JSON error body containing markdown-like words must not pass, and a 200 document with the wrong media type also breaks CLI expectations.

Compare the response body with the reader's exact output for both fallback branches. Exact equality catches truncation, frontmatter removal, line-ending damage, or a test-only substitute.

Keep a database-hit control in the same suite. Return a row whose generated markdown has a distinct marker and assert that marker wins over the local seed.

This example uses module mocks for the database and calls the real file helper. Adjust the mock builder to the project's Vitest setup, but do not mock the seed reader in the main artifact check.

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { readFallbackPlaywrightCliMarkdown } from '@/lib/fallback-skill-detail';

test.each([['miss', []], ['exception', new Error('database unavailable')]])(
  'returns the real playwright-cli seed on database %s',
  async (_caseName, outcome) => {
    arrangeSkillSelect(outcome);
    const expected = readFallbackPlaywrightCliMarkdown();
    expect(expected).toContain('name: Playwright CLI Browser Automation');

    const response = await callContentGet('playwright-cli');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await response.text()).toBe(expected);
  },
);
\`\`\`

Reset the database mock after each row. A rejected builder left in module state can turn later 404 tests into 500 tests and blur the branch under review.

Open the [Playwright CLI skill](/skills/Pramod/playwright-cli) to compare the public skill identity with the raw fallback artifact. The page and download route serve different formats, so test each owner directly.

Skill content fallback outage testing should also record which source supplied the body. A clear label such as \`database-generated\` or \`local-seed\` makes a failure easy to trace without logging the whole document.

## What Happens to a Database Outage Skill Download?

A database outage skill download succeeds only for the exact playwright-cli slug when its local markdown is available. Every other slug receives the route's 500 JSON response because a query exception is not a clean not-found result.

This distinction matters to callers. A 404 says the requested representation was not found, while a 500 says the server could not complete an otherwise valid lookup.

The route does not infer that any seed directory is a supported fallback. It calls a helper named for Playwright CLI and rejects every other ID before touching the file system.

Test a known unrelated slug that normally exists, but make the database throw. Its production identity must not matter because the simulated store cannot confirm or reconstruct it.

Also test a made-up slug under the same exception. Both receive the same 500 error because the route cannot distinguish absence from availability failure after the query rejects.

For a clean empty query, both unrelated inputs receive 404. This paired case proves that the test double preserves the semantic difference between a resolved empty result and a rejected operation.

The fallback can itself be unavailable. Run an isolated file-path test from a working directory where neither candidate resolves, or mock only \`existsSync\` in that narrow case.

Do not move the process working directory for the entire suite. Parallel tests could observe the change and fail for reasons unrelated to fallback behavior.

The route's catch block intentionally hides database details. Assert the stable JSON error and status, not a driver message that could expose credentials or change after a package update.

Use the [API testing category](/categories/api-testing) for response-contract checks around this route. Keep outage injection at the database boundary so the request and response stack still runs.

Skill content fallback outage testing treats a successful local response as reduced service, not proof that the database is healthy. Health checks and logs should still report the underlying store failure through their own channels.

## Content API Fallback Matrix

A content API fallback matrix crosses requested ID, query outcome, seed state, status, media type, and body source. It prevents one green Playwright case from masking broad or incorrect recovery.

The database-hit rows should include both slug and UUID lookup. They prove that canonical generated markdown remains the normal source and that ID detection selects the proper predicate.

Miss rows establish resource semantics. The Playwright slug gets local text when available, while unrelated slugs and UUIDs get a 404 JSON body.

Exception rows establish failure semantics. Only the Playwright slug can recover; other inputs return the route's 500 JSON body.

| Requested ID | Database outcome | Fallback available | Expected status | Content type | Body source |
|---|---|---:|---:|---|---|
| playwright-cli | Row found | Yes | 200 | text/markdown | Generated database row |
| playwright-cli | Empty rows | Yes | 200 | text/markdown | Local seed file |
| playwright-cli | Query throws | Yes | 200 | text/markdown | Local seed file |
| other-skill | Empty rows | Not used | 404 | application/json | Skill not found error |
| other-skill | Query throws | Not used | 500 | application/json | Fetch failure error |
| Valid UUID | Empty rows | Not used | 404 | application/json | Skill not found error |
| playwright-cli | Query throws | No | 500 | application/json | Fetch failure error |

Use exact values for the two JSON messages. \`Skill not found\` belongs to a clean miss, while \`Failed to fetch skill content\` belongs to the catch branch.

The official [Next.js route handler documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) explains that route handlers use Web request and response APIs. That makes status, headers, and raw body the right public observations.

The [HTTP semantics specification](https://www.rfc-editor.org/info/rfc9110) provides the basis for distinguishing not-found and internal-server-error outcomes. The test should preserve that distinction instead of reducing every failure to a generic download error.

Add a case-sensitive slug control such as \`Playwright-cli\`. The helper uses exact equality, so it should not receive fallback content unless the route contract later adds normalization.

The [versioned artifact testing guide](/blog/testing-versioned-zip-artifact-sha256-etag) covers checksums and validators for another artifact path. Here, exact body equality is the simpler integrity proof.

## How Do You Run a 404 Versus 500 Download Test?

A 404 versus 500 download test runs the same unrelated slug through a resolved empty query and a rejected query. It asserts distinct statuses and JSON messages while confirming that the fallback reader is never used.

Use one slug value in both cases so only the database outcome changes. A name such as \`unrelated-skill\` makes accidental Playwright matching impossible.

Spy on \`readFallbackPlaywrightCliMarkdown\` if the module design permits it. The spy should have zero calls for both unrelated-slug cases, which proves the route did not attempt a broad local scan.

For the miss, resolve the chained select to an empty array. Expect status 404, JSON content type, and the exact \`Skill not found\` payload.

For the exception, reject from the actual awaited point. Expect status 500, JSON content type, and the exact \`Failed to fetch skill content\` payload.

Do not throw while arranging params or reading the response. That would enter a different error path than the database failure described by the brief.

Run a matching Playwright pair beside these negative controls. Both should return 200 when the real seed is present, demonstrating that the error difference is tied to fallback scope.

\`\`\`typescript
import { expect, test } from 'vitest';

test('keeps 404 and 500 semantics for an unrelated slug', async () => {
  arrangeSkillSelect([]);
  const missing = await callContentGet('unrelated-skill');
  expect(missing.status).toBe(404);
  await expect(missing.json()).resolves.toEqual({ error: 'Skill not found' });

  arrangeSkillSelect(new Error('database unavailable'));
  const failed = await callContentGet('unrelated-skill');
  expect(failed.status).toBe(500);
  await expect(failed.json()).resolves.toEqual({
    error: 'Failed to fetch skill content',
  });
});
\`\`\`

The test name should state both status codes and the unrelated scope. If it fails, the report then points to status selection rather than markdown content.

Use the [error handling testing guide](/blog/error-handling-testing-patterns) to add malformed params or unexpected helper errors. Keep this pair focused on resolved absence versus database failure.

Skill content fallback outage testing should never accept either status for the same setup. Broad status arrays hide branch regressions and can let an outage look like a missing skill.

## Local Seed Markdown Availability

Local seed markdown availability is a deploy input, not a test fixture convenience. The reader builds \`seed-skills/playwright-cli/SKILL.md\` relative to either the repository root or the web package's common working directory.

Test both supported roots in isolated unit cases if packaging can launch from either location. For the main integration case, use the actual process working directory chosen by the web test command.

The file begins with YAML frontmatter and names Playwright CLI Browser Automation. Its body includes quick-start and command guidance, so one header assertion can prove the body was not reduced to metadata.

Check that the file is nonempty before simulating the database. This yields a direct missing-artifact failure instead of an indirect 404 from the route.

Do not duplicate the whole markdown in a snapshot. Exact route-to-reader equality plus a few semantic checks gives strong proof without making every copy edit rewrite a large fixture.

Packaging tests should inspect the built or deployed artifact, not only the source checkout. A source file can exist locally yet be absent from the server bundle or runtime file system.

The helper uses synchronous file reads because the fallback is small and rare. The outage suite should not claim that this choice guarantees deployment inclusion; only a packaged runtime check can prove that.

Add one deliberate absence case. Mock both candidate paths as missing and assert null from the reader, then confirm the route falls back to its normal 404 or 500 response.

Path tests should avoid absolute developer-specific locations. Assert suffixes and candidate order so the suite works in CI, package roots, and temporary checkouts.

Read the [Playwright CLI install quickstart](/blog/playwright-cli-install-quickstart-2026) for consumer-side installation checks. This article stays on server delivery of the raw SKILL.md file.

Skill content fallback outage testing must fail fast when the seed vanishes from release inputs. Without that check, the only recovery branch can disappear at the same time the database fails.

## Database State, Skill ID, and Response Matrix

Skill content fallback outage testing should report a small set of facts for each row: ID form, query result, file result, status, media type, and source. These facts explain every route branch without relying on private implementation errors.

Slug hits and UUID hits both return generated markdown. The difference lies only in which database column is compared, so body assertions should focus on the selected row.

The exact fallback slug is a separate axis from UUID syntax. A string that looks like a UUID never qualifies for the Playwright branch, even if a local file happens to share its text.

Case variants, whitespace, and URL-encoded surprises should remain negative controls unless routing normalizes them before params resolve. Test the actual decoded \`id\` value received by the handler.

When the database returns more than one row in a faulty mock, the route uses the first because the real query has \`limit(1)\`. Keep normal mocks faithful to one row so this irrelevant state does not distract from outage rules.

The fallback body should retain its final newline and all frontmatter. Comparing \`trim()\` values could hide a byte-level change that affects downstream parsers or checksums.

Media type is part of every matrix row. Markdown success uses \`text/markdown; charset=utf-8\`, while \`NextResponse.json\` supplies JSON for 404 and 500.

Use [all QA skills](/skills) as a consumer route after raw content tests pass. A healthy catalog page does not prove the content endpoint can deliver its artifact during a store outage.

Keep database and file failure injection independent. If both fail in one test without separate controls, the result cannot show whether fallback selection or file availability broke.

## How Do You Run the Outage Simulation Procedure?

The outage simulation procedure starts with the real local artifact, then runs hit, miss, and exception branches through the route. It finishes with unrelated inputs so recovery cannot spread beyond the named skill.

1. Assert the real playwright-cli fallback markdown is readable from the repository.
2. Mock a database hit and verify generated markdown wins over the seed.
3. Mock an empty result for playwright-cli and assert the local markdown response.
4. Mock a thrown query for playwright-cli and assert the same local response.
5. Repeat the miss and exception with one unrelated slug and one UUID.
6. Remove seed availability in an isolated case and assert normal 404 or 500 semantics.

Step one should parse enough frontmatter to prove identity. It should also find one known body heading and record the byte count.

Step two needs a distinct database marker that does not occur in the seed. That marker proves precedence without comparing every generated field.

Steps three and four should share the same expected string read once in setup. Their only difference is whether the database resolves empty or rejects.

Step five asserts two error bodies, not just status codes. It also verifies JSON media type and zero local-reader use for unrelated IDs.

Step six must restore all file mocks and working-directory state. Run it serially if global process state cannot be isolated safely.

After route-level tests, run one packaged integration check in the same launch layout used by deployment. Query failure can be stubbed through a test environment, while the response must come from the packaged real seed.

The [artifact checksum guide](/blog/testing-versioned-zip-artifact-sha256-etag) can strengthen byte identity if the file becomes versioned. Until then, exact equality with the checked-in seed is a clear oracle.

Record the source label and status for each step. Avoid storing the full skill body in routine logs because it adds noise without helping branch diagnosis.

- real seed can be found from the repository root work path
- real seed can be found from the web package work path
- real seed starts with valid YAML frontmatter and a body
- database slug hit returns generated markdown instead of local markdown
- database UUID hit returns generated markdown from the matched row
- playwright-cli clean miss returns the exact local seed bytes
- playwright-cli query error returns the same exact local seed bytes
- unrelated slug clean miss returns the stable 404 JSON body
- unrelated slug query error returns the stable 500 JSON body
- valid UUID clean miss never enters the slug fallback branch
- valid UUID query error never enters the slug fallback branch
- case changed Playwright slug does not match the exact fallback key
- missing seed turns a playwright-cli clean miss back into 404
- missing seed turns a playwright-cli query error back into 500
- each success and error row checks status media type and body source

## Frequently Asked Questions

### Why does only playwright-cli receive local fallback content?

The route's helper checks exact equality with \`playwright-cli\`, and the file reader is also named for that skill. No generic seed lookup exists in this contract. Tests should preserve that narrow scope so unrelated downloads never receive the wrong document during a database problem.

### Does a UUID miss use the playwright-cli fallback?

No. UUID syntax changes the query predicate to the skill ID column, but fallback still requires the exact slug string. An empty UUID lookup returns 404, and a failed UUID lookup returns 500. Include both cases so pattern detection cannot broaden local recovery.

### What content type should a recovered skill return?

A successful database or fallback document should return \`text/markdown; charset=utf-8\`. Missing and failed unrelated lookups should return JSON through \`NextResponse.json\`. Assert the header for each route branch before parsing the body, because a correct status with the wrong representation still breaks raw-content clients.

### Should tests mock the local seed markdown?

Use a mock only for the deliberate absence case. The main recovery tests should call the real reader and compare the response with \`seed-skills/playwright-cli/SKILL.md\`. That proves the checked-in artifact, path resolution, headers, and route selection work together in the packaged test run.

### Why distinguish 404 from 500 for other skills?

A clean empty query means no matching stored skill was found, while a rejected query means the server could not complete the lookup. Keeping 404 and 500 distinct lets clients choose accurate retry and reporting behavior. A broad fallback would conceal both facts.

### Is the skill page itself proof that fallback works?

No. The skill page can use separate detail recovery and render HTML, while this route returns raw markdown for download clients. Invoke the content route under controlled database failure and compare its bytes with the seed. Test the public page as a separate consumer flow.

## Conclusion

Skill content fallback outage testing proves one precise recovery rule: playwright-cli may return its real local SKILL.md after a database miss or exception. Database hits still win, unrelated misses remain 404, unrelated failures remain 500, and a missing seed restores those normal errors.

Open the [Playwright CLI skill](/skills/Pramod/playwright-cli) and verify its outage fallback in the packaged web runtime. Then add the negative slug and UUID cases before changing any content-route recovery rule.`,
};
