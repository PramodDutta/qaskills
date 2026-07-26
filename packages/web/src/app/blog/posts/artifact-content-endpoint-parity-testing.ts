import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'artifact content endpoint parity testing',
  description:
    'Use artifact content endpoint parity testing to compare raw SKILL.md with its ZIP entry, assert byte equality, and catch shared builder regressions.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'artifact content endpoint parity testing',
  keywords: [
    'artifact content endpoint parity testing',
    'ZIP raw markdown parity test',
    'SKILL.md byte equality assertion',
    'artifact content contract testing',
    'two download endpoints consistency',
    'shared markdown builder regression',
  ],
  relatedSlugs: [
    'testing-versioned-zip-artifact-sha256-etag',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'qaskills-cli-download-fallback-github-content-metadata',
    'qaskills-cli-extract-skill-package-github',
  ],
  sources: [
    'https://stuk.github.io/jszip/documentation/api_jszip/load_async.html',
    'https://www.rfc-editor.org/info/rfc9110',
    'https://agentskills.io/specification',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/[id]/artifact/route.ts',
    'packages/web/src/app/api/skills/[id]/content/route.ts',
    'packages/web/src/lib/skill-markdown.ts',
  ],
  content: `Artifact content endpoint parity testing proves that raw SKILL.md and the matching ZIP entry contain identical UTF-8 bytes. The test requests both forms from one database row, extracts the named archive entry, and compares buffers without text cleanup. It fails on any changed byte while ignoring unrelated ZIP container metadata.

This contract protects installers that choose different download paths for the same published skill. It also separates payload equality from archive checksum stability, since compression headers can change without changing SKILL.md. The test therefore compares the inner file first and treats the outer archive as another contract.

## What Must Artifact Content Endpoint Parity Testing Prove?

Artifact content endpoint parity testing must prove that two successful handlers serialize one selected row into one canonical markdown payload. Both routes may use different response headers and transport wrappers, but their SKILL.md bytes must match. A passing result covers the exact entry path, content bytes, lookup identity, and requested version.

The repository already establishes a shared construction point in \`packages/web/src/lib/skill-markdown.ts\`. Its \`buildSkillMarkdown\` function creates frontmatter in insertion order, includes nonempty array fields, adds optional GitHub data, and chooses either the stored body or a fallback body. A parity suite should execute that function through both public handlers rather than copying its algorithm into test helpers.

The skill package shape has an external rule as well. The [Agent Skills specification](https://agentskills.io/specification) requires a skill directory with a SKILL.md file that contains YAML frontmatter followed by Markdown instructions. That requirement makes \`<slug>/SKILL.md\` the meaningful archive target, not merely the first file returned by a ZIP reader.

The raw route in \`packages/web/src/app/api/skills/[id]/content/route.ts\` returns markdown with a UTF-8 content type. The artifact route in \`packages/web/src/app/api/skills/[id]/artifact/route.ts\` places the same builder result inside a compressed archive. Their shared helper makes parity likely, yet only an integration assertion proves later refactors preserve that relationship.

Do not compare the complete responses as if they were interchangeable. One body is markdown, while the other body is binary ZIP data with artifact headers. The useful oracle opens the archive and compares only the required entry against the raw response body.

The [YAML frontmatter roundtrip test](/blog/testing-skill-md-yaml-frontmatter-roundtrip) complements this check. A roundtrip test asks whether metadata can be parsed and serialized meaningfully, while parity asks whether two delivery paths expose the exact same bytes. Both can pass or fail independently.

Keep the first case small enough that each changed byte has one likely cause and one clear owner. One row, one slug, and one short body make a strong base case for the two routes. Add more fields only after this plain case proves the core link from stored data to sent bytes.

A test name should state the key used, the row shape, and the result that must stay the same. Clear names help when the slug case passes but the UUID case fails in the same run. They also stop a broad snapshot from hiding which route chose the wrong row.

The best seed has values a reader can spot at once in both forms of the file. Use short tags, a plain name, and a body line with no date or random token. This keeps each run the same and makes a wrong field stand out in the first text span.

## How Does a ZIP Raw Markdown Parity Test Work?

A ZIP raw markdown parity test starts with one deterministic skill row and two requests that identify it the same way. It reads the content response as an \`ArrayBuffer\`, converts that value to a Node buffer, then loads the artifact response with JSZip. The expected entry name comes from the seeded slug rather than archive enumeration.

JSZip accepts buffers and byte arrays through its documented [loadAsync API](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html). The same documentation explains that loading can reject invalid archives and that file content supports UTF-8. A test should let those failures surface with the route status and response headers attached.

Archive extraction must request bytes, not a JavaScript string. Calling \`entry.async('nodebuffer')\` preserves line endings, byte order, and trailing newline evidence. Calling \`entry.async('string')\` adds a decode step that can hide which layer changed.

The core extraction example follows the archive layout implemented by the artifact handler:

\`\`\`typescript
import JSZip from 'jszip';
import { expect } from 'vitest';

async function expectSkillEntryToMatch(
  artifactResponse: Response,
  contentResponse: Response,
  slug: string,
) {
  expect(artifactResponse.status).toBe(200);
  expect(contentResponse.status).toBe(200);

  const archiveBytes = Buffer.from(await artifactResponse.arrayBuffer());
  const rawBytes = Buffer.from(await contentResponse.arrayBuffer());
  const archive = await JSZip.loadAsync(archiveBytes);
  const entry = archive.file(\`\${slug}/SKILL.md\`);

  expect(entry, 'expected canonical SKILL.md entry').not.toBeNull();
  const entryBytes = await entry!.async('nodebuffer');
  expect(entryBytes.equals(rawBytes)).toBe(true);
}
\`\`\`

This helper verifies status before parsing, so a JSON error body cannot be mistaken for an archive. It also names the expected file directly. That choice catches an accidental root-level SKILL.md, a changed slug folder, or an extra prefix that enumeration might overlook.

Artifact content endpoint parity testing should not require identical ZIP checksums across separate calls. DEFLATE output may include container details outside the inner file contract, depending on generation options and library behavior. The [versioned artifact checksum guide](/blog/testing-versioned-zip-artifact-sha256-etag) covers archive identity and response headers as a separate release gate.

Capture the artifact content type, version header, checksum header, and disposition when a check fails. Those values speed diagnosis, but they do not replace the byte comparison. A valid-looking header cannot prove that the entry contains the current markdown.

Read each body once and keep the bytes in local test state for all later checks. Web response streams are spent after a read, so a second read can yield a false test fault. A saved buffer also lets the test print a hash, byte span, and text clue from one source.

Let a bad ZIP fail the case at the load step, since there is no inner file to compare then. Do not catch that fault and swap in an empty file for the next check. The load error, status, and type tell a clear story when the route sends the wrong kind of body.

## How Should a SKILL.md Byte Equality Assertion Be Written?

A SKILL.md byte equality assertion should compare two \`Buffer\` values and report the first unequal offset. Buffer equality catches CRLF conversion, missing terminal newlines, reordered frontmatter, different UTF-8 sequences, and invisible spaces. A normalized string comparison can erase exactly the fault under investigation.

Start with length because it gives a fast and useful signal. If lengths match, scan until bytes differ and show a small hexadecimal window around that position. Also decode a limited nearby range for readable context, but never use that decoded text as the deciding assertion.

The following diagnostic keeps the final oracle binary while producing a focused failure:

\`\`\`typescript
import { expect } from 'vitest';

function assertSameSkillMarkdown(raw: Buffer, archived: Buffer) {
  const limit = Math.min(raw.length, archived.length);
  let offset = 0;
  while (offset < limit && raw[offset] === archived[offset]) offset += 1;

  const equal = raw.length === archived.length && offset === limit;
  const start = Math.max(0, offset - 16);
  const end = Math.min(Math.max(raw.length, archived.length), offset + 32);
  const details = {
    offset,
    rawLength: raw.length,
    archivedLength: archived.length,
    rawHex: raw.subarray(start, end).toString('hex'),
    archivedHex: archived.subarray(start, end).toString('hex'),
  };

  expect(archived.equals(raw), JSON.stringify(details, null, 2)).toBe(equal);
}
\`\`\`

Do not trim either side before this call. The builder intentionally returns one newline after the body, and a route could accidentally add another. Trimming would make that regression invisible to an installer that saves bytes directly.

Do not replace line endings or parse YAML before comparing. Those operations answer useful semantic questions, but they weaken a byte contract. Run semantic validation afterward if the suite also needs to check required frontmatter and markdown structure.

The [CLI download fallback article](/blog/qaskills-cli-download-fallback-github-content-metadata) explains why alternate sources need a clear order. When raw content and artifact delivery are both canonical server sources, exact equality prevents the fallback branch from installing a subtly different instruction file.

Artifact content endpoint parity testing benefits from hashing only as a compact report. Computing SHA-256 for each inner payload can make logs shorter, yet equal hashes should still lead to a direct equality assertion in the test process. The route's archive checksum applies to the ZIP bytes, not to extracted SKILL.md.

Use a plain byte loop when a helper library would mask the place where the two files split. The first bad offset is often enough to spot a lost line feed or a new space. Keep the log span short, since a skill body may hold text that does not belong in build logs.

## Artifact Content Contract Testing Across Response Types

Artifact content contract testing should divide assertions into selection, payload, package, and transport layers. Selection checks which database row was chosen. Payload checks generated markdown. Package checks entry location and extractability, while transport checks status and media metadata.

HTTP defines representation metadata and response semantics independently from the application payload. [RFC 9110](https://www.rfc-editor.org/info/rfc9110) provides that shared HTTP vocabulary. Use it to justify status and content type checks, but keep project-specific archive names and version behavior tied to the repository implementation.

The raw endpoint should return status 200 and \`text/markdown; charset=utf-8\` for a stored row. The artifact endpoint should return status 200 and \`application/zip\`, plus its version and checksum headers. A missing row should return 404 from each route, except for the documented raw fallback that serves one known skill.

Version handling belongs only to the artifact request today. A matching version returns the current package, while an unavailable value returns 404 with the current version in the JSON body. The raw content route has no version query contract, so a parity test must not invent historical selection for it.

Use [API testing skills](/categories/api-testing) to organize these layers into separate cases. A single assertion chain can obscure whether lookup, response construction, archive parsing, or markdown generation broke. Small named cases preserve the same fixture while giving each contract a clear failure.

Artifact content endpoint parity testing should compare a successful pair only after both lookups resolve the same row. A test that requests one route by slug and the other by an unrelated UUID can report a byte difference that is correct but unhelpful. Record the seeded ID, slug, and version in each case name.

Transport details should never excuse payload drift. A correct content length describes the bytes actually sent, not the bytes that should have been sent. Likewise, a valid ZIP and a valid markdown file can still disagree with the raw endpoint.

Write one test for each layer and share only the row setup plus the two saved response bodies. A failed media type should not block the inner file check when the body can still be read. This split gives the team more facts from one run and points to the right source path.

## How Do You Verify Two Download Endpoints Consistency?

Two download endpoints consistency begins with equivalent identifiers and an explicit row oracle. Seed one row, retain its UUID and slug, then request both routes by slug. Repeat the pair by UUID and prove all four successful results yield one identical markdown buffer.

This test catches branch drift in each handler's UUID recognition. Both route files use the same UUID-shaped regular expression and choose either \`skills.id\` or \`skills.slug\` for lookup. The suite should include a malformed UUID-like slug because shape detection can change which column is queried.

Use a unique slug that cannot match another fixture. The database schema makes slugs unique, while IDs are primary keys. The row name does not participate in either download lookup, so changing only the display name should not change selection.

A content route fallback requires its own case. The route may return bundled markdown for \`playwright-cli\` when database selection fails, but the artifact route has no matching branch. Exclude that special identifier from the general parity matrix unless the product contract later gives both endpoints the same fallback.

The [package extraction guide](/blog/qaskills-cli-extract-skill-package-github) helps frame installer-side archive checks. Server parity should stay one level earlier: prove the emitted entry first, then let CLI tests prove destination paths, cleanup, and package installation behavior.

For every successful pair, assert the row's unique marker appears in both payloads. A distinct body sentence works better than the display name alone because names also appear in fallback markdown. This marker guards a poorly mocked database that returns a default row regardless of the predicate.

Artifact content endpoint parity testing should also compare an unavailable artifact version against no raw request. That scenario tests error isolation, not payload parity. Expecting raw content to fail would incorrectly couple a legacy endpoint to the artifact version query.

Give the row a body line that no other seed uses, then check that line before the full byte test. This quick guard proves both calls reached the same test data and not a stale stub. It also makes a bad lookup clear before a long hex report draws focus to the wrong cause.

## Detecting a Shared Markdown Builder Regression

A shared markdown builder regression often starts as a harmless formatting edit. Reordering keys, filtering arrays differently, changing defaults, or dropping a final newline can affect every download path. Parity alone may still pass when both handlers call the same changed helper, so add direct builder expectations beside endpoint equality.

Create a rich row with every supported array and optional GitHub metadata. Its expected output should pin key order, list syntax, delimiter placement, body choice, and terminal newline. Then create a sparse row that exercises default version, default license, omitted arrays, absent GitHub data, and generated fallback body.

The repository path \`packages/web/src/lib/skill-markdown.ts\` defines six array fields in a fixed list. Only nonempty arrays enter frontmatter. The helper joins values with comma and space inside brackets, which means element order and embedded punctuation deserve explicit fixtures.

Author data behaves differently from optional arrays. The builder always places the \`author\` key into its frontmatter object, even when the row value is null. Tests should reflect current output rather than silently deleting that line in an expected-value helper.

Use a body containing headings, inline code, a trailing blank line, and non-ASCII fixture text at the builder unit level. The article itself remains ASCII, but production markdown can use UTF-8. Endpoint buffers should preserve each encoded byte from the builder result.

The [frontmatter roundtrip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) can supply semantic YAML checks after parity passes. Keep the exact builder snapshot small enough to review. A giant sample body makes a one-line frontmatter change difficult to locate.

Artifact content endpoint parity testing and direct builder tests guard different failure modes. Parity detects route-specific transforms or divergent helper calls. Builder assertions detect a shared change that reaches both routes equally but violates the published markdown contract.

When the builder intentionally changes, update its focused expected output first. Then review whether existing artifacts remain compatible and rerun parity by UUID and slug. This order turns a broad snapshot update into a deliberate contract decision.

Keep the rich row and sparse row in the same test file, but do not make them share mutable arrays. A test that sorts one list in place can change the next expected output. Fresh values for each case make field order faults repeat the same way on every host.

For the sparse row, state each value that should fall back and each line that should stay out. A short list is easier to read than a broad snapshot with blank fields. It also shows why the test expects a default and not a value set by a mock.

## Parity Matrix for IDs, Versions, and Markdown Fields

The matrix below distinguishes cases that should produce equal inner bytes from cases that should stop before comparison. It uses one deterministic row family, so failures indicate route behavior rather than random seed differences.

| Lookup | Version query | Database row variant | ZIP entry | Raw response | Expected assertion |
|---|---|---|---|---|---|
| Slug | Current version | Every optional field | \`<slug>/SKILL.md\` | 200 markdown | Equal buffers |
| UUID | None | Every optional field | \`<slug>/SKILL.md\` | 200 markdown | Equal buffers |
| Slug | Unavailable version | Current row | No ZIP expected | Not requested | Artifact returns 404 |
| Slug | Current version | Empty optional arrays | \`<slug>/SKILL.md\` | 200 markdown | Equal sparse output |
| UUID | None | Empty \`fullDescription\` | \`<slug>/SKILL.md\` | 200 markdown | Equal fallback body |

Run the rich and sparse cases because optional fields change exact line positions. A test using only complete data can miss accidental strings such as \`tags: []\`. A test using only sparse data cannot prove array order or GitHub metadata survives packaging.

The expected archive path comes from the row slug even when lookup uses UUID. This detail proves selection and packaging are joined correctly. If a route uses the request ID as the folder name, UUID lookup will reveal the error.

Include one body whose length crosses a compression boundary, but do not assert the compressed byte count. The inner bytes remain the stable oracle. Compression ratio is an implementation detail unless a separate performance budget explicitly owns it.

Browse the [QA skill catalog](/skills) to see the user-facing objects served by these routes. Keep test fixtures synthetic and local, since live catalog rows can change between runs and make byte expectations unstable.

The [artifact checksum test](/blog/testing-versioned-zip-artifact-sha256-etag) belongs beside this matrix, not inside every row. It proves the declared checksum matches one returned archive. This matrix proves the archive's instruction file matches the other endpoint.

Run the table from top to bottom in local work, then let CI run each row as its own test. The order helps a person start with the plain success path during a quick check. Test isolation still means one failed row cannot change the data or bytes used by the next row.

Use the same ZIP tool as the route when the aim is to prove file shape and stored bytes. A second parser can be useful in a wider tool check, but it adds one more cause here. Keep this gate close to the code path, then add cross-tool tests in their own suite.

## How Do You Run the Endpoint Parity Procedure?

Run the endpoint parity procedure against route handlers with a controlled database adapter. The fixture must survive long enough for both calls, and each response body can be consumed only once. Capture buffers immediately, then perform headers, extraction, and diagnostics from those stored values.

1. Seed one deterministic skill row with every markdown field represented.
2. Call the raw content handler by slug and store its response as a buffer.
3. Call the artifact handler for the same slug and its current version.
4. Load the returned ZIP and extract the exact \`<slug>/SKILL.md\` entry as bytes.
5. Assert buffer equality and report the first differing byte with nearby context.
6. Repeat by UUID, with optional fields absent, and with fallback body generation.

Give each request a fresh \`NextRequest\` and a fresh handler context. Reusing consumed responses or mutable request objects can create failures unrelated to parity. Reset database mocks after every case so a lookup count from one identifier cannot satisfy the next.

The procedure should assert query predicates indirectly through returned marker data unless a focused route test needs call inspection. Overly detailed Drizzle chain mocks can mirror implementation without proving behavior. A small fake adapter or test database gives stronger row-selection evidence.

Use the [API testing category](/categories/api-testing) when selecting a reusable test skill for this workflow. Keep the integration itself offline, deterministic, and independent from a deployed host. Network tests add caching and release state that obscure a byte-level regression.

When the assertion fails, print statuses, media types, requested identifier, version, entry list, lengths, hashes, and first difference. Do not dump the entire skill body into shared CI logs. A short window gives enough context without exposing unexpected instruction content.

The [CLI source fallback guide](/blog/qaskills-cli-download-fallback-github-content-metadata) can drive a later end-to-end case. First make server output trustworthy. Then verify the installer selects, extracts, and writes that output without another transform.

Artifact content endpoint parity testing should run on each change to either route, the markdown builder, archive dependencies, or skill row fields. It should also run before artifact releases. These triggers cover both direct edits and shared serialization shifts.

Keep test data in the suite rather than pulling a live skill from the site. A live row may gain tags, a new body, or a new version while the code stays sound. Fixed local data makes each byte change trace back to a code or fixture review in the same change.

When a failure reaches CI, save the small ZIP as a test artifact only when access rules allow it. Most faults need just the entry list, lengths, hashes, and first changed span in the log. That short set can show path drift, a lost byte, or the wrong row without a full file dump.

End the suite with one clean run that uses no spy on text, bytes, or ZIP calls. This case proves the parts still work as a whole after each small test has checked one seam. Keep it local and fast, so the same proof can run on each pull request.

## Frequently Asked Questions

### Does ZIP metadata need to match between endpoint parity runs?

No, the inner SKILL.md bytes are the primary parity target, while ZIP metadata belongs to the archive contract. Compression timestamps or library details may alter container bytes. Assert the returned checksum against that specific archive separately, then compare the extracted entry with raw content.

### Should a parity test normalize line endings before comparison?

No, normalization hides a delivery defect that can affect hashes, diffs, and installed files. Read each response into a buffer and compare bytes directly. If the product later defines canonical LF output, add a separate assertion that both equal buffers contain only that line ending.

### Can UUID and slug requests share one expected buffer?

Yes, when both identifiers select the same stored row, their generated markdown should be identical. Keep a unique marker in the fixture and verify it appears before comparing. This protects the test from a mock that returns one default row for every query.

### What should happen when the artifact version is unavailable?

The artifact request should return 404 and identify the current version according to the route contract. The raw content endpoint remains unversioned, so it need not fail. Treat this as a version-selection case rather than trying to extract or compare a missing archive.

### Is a SHA-256 hash enough for SKILL.md equality?

Matching hashes provide compact evidence, but a direct buffer comparison gives clearer failure diagnostics and avoids mixing inner and outer hashes. Hash each inner payload for logs if needed. Still assert equal length and bytes, then report the first offset when they differ.

### Why compare binary data instead of decoded strings?

Binary comparison preserves every encoded fact, including line endings, byte order markers, invalid sequences, spaces, and terminal newlines. Decoding can replace or reinterpret some values. A readable text window is useful after failure, but it should not define whether parity passed.

## Conclusion

Artifact content endpoint parity testing creates one measurable release rule: a selected row must yield the same SKILL.md bytes through raw and ZIP delivery. Pair that check with focused builder expectations and a separate archive checksum test, so shared and route-specific regressions both become visible.

Browse [installable QA skills](/skills), choose a package with rich frontmatter, and adapt this parity matrix to its next artifact release. Then use the [package extraction workflow](/blog/qaskills-cli-extract-skill-package-github) to extend the verified bytes through the installer path.`,
};
