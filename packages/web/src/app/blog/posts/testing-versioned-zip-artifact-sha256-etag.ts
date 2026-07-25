import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'ZIP Artifact Checksum Testing',
  description:
    'ZIP artifact checksum testing verifies version pins, SHA-256 headers, ETag identity, archive paths, SKILL.md content, caching, and error responses.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'ZIP artifact checksum testing',
  keywords: [
    'ZIP artifact checksum testing',
    'version pinned skill artifact',
    'SHA-256 response header',
    'ETag checksum assertion',
    'JSZip archive structure',
    'SKILL.md ZIP content',
    'artifact cache header',
    'artifact route integration test',
  ],
  relatedSlugs: [
    'testing-lazy-neon-database-initialization-nextjs-build',
    'testing-typesense-multiselect-facet-filter-queries',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
  ],
  sources: [
    'https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html',
    'https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  content: `
ZIP artifact checksum testing requests a skill with its current version, reads the response as exact bytes, recomputes SHA-256, and compares that digest with \`X-Artifact-Sha256\` plus the quoted ETag. Then open the archive, verify \`<slug>/SKILL.md\`, compare metadata and body, inspect cache headers, and exercise missing-skill and version-mismatch errors.

The QASkills artifact route turns one database skill into an Agent Skills ZIP package. It accepts a UUID or slug, supports an optional current-version pin, builds Markdown, compresses one file with JSZip, hashes the final buffer, and sends integrity, version, length, download, and cache metadata.

## How Do You Test a Version Pinned Skill Artifact?

A version pinned skill artifact request includes \`?version=<current-version>\` and expects status 200. QASkills reads the current database row first, defaults a missing stored version to \`1.0.0\`, and rejects any requested version that differs from that current value.

The test should use a complete row fixture because \`buildSkillMarkdown\` reads metadata and the Markdown body, including slug, version, arrays, author, and full description. Fixed values make archive inspection easy.

Call the route by slug and UUID because a regular expression selects the matching database condition for each form. Both paths return the same logical skill, although separate ZIP bytes need not match until archive metadata is fixed.

The query selects the full row, applies one equality condition, and stops after the first match. Slugs are unique in the schema, while UUID values are primary keys. Assert one database result and avoid fixtures that hide lookup errors behind duplicate records.

Version is non-null with a \`1.0.0\` schema default, yet the route still applies a fallback for older or mocked rows. Keep the normal success fixture explicit, then isolate the fallback in its own case. Mixing both rules in one test makes the source of the version harder to see.

\`\`\`ts
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/skills/[id]/artifact/route';

const skill = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'playwright-cli',
  name: 'Playwright CLI Browser Automation',
  version: '1.0.0',
  description: 'Browser automation from the Playwright command line.',
  authorName: 'Pramod',
  license: 'ISC',
  githubUrl: 'https://github.com/PramodDutta/playwright-cli',
  testingTypes: ['e2e', 'visual', 'accessibility'],
  frameworks: ['playwright'],
  languages: ['javascript', 'typescript'],
  domains: ['web'],
  agents: ['claude-code', 'codex'],
  tags: ['browser', 'cli'],
  fullDescription: '## Usage\\n\\nRun focused browser commands and save evidence.',
};

it('returns the current version by slug', async () => {
  mockSkillRows([skill]);
  const request = new NextRequest(
    'http://test.local/api/skills/playwright-cli/artifact?version=1.0.0',
  );

  const response = await GET(request, {
    params: Promise.resolve({ id: 'playwright-cli' }),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get('X-Artifact-Version')).toBe('1.0.0');
  expect(response.headers.get('Content-Type')).toBe('application/zip');
});
\`\`\`

ZIP artifact checksum testing should make the pin explicit. A request without \`version\` also returns the current artifact, but it does not prove the mismatch guard. Add \`?version=0.9.0\` and expect status 404, an error naming that version, and \`currentVersion: "1.0.0"\`.

This route does not serve historical versions, so a mismatched pin returns 404 instead of sending current content. Tests should keep that behavior clear until versioned storage is added.

Check that a stale version stops before the Markdown helper and ZIP work begin. A spy can prove no buffer or digest was created after the mismatch. That result keeps a rejected request cheap and blocks accidental delivery of a different release.

An empty version query is not the same as no query in URL syntax, but \`searchParams.get()\` returns an empty string. The current truthy guard treats it like no pin and serves current content. Record that edge before deciding whether an empty pin should be rejected.

The [SKILL.md format guide](/blog/skill-md-format-guide) explains the package document. The [verified Playwright CLI skill](/skills/Pramod/playwright-cli) is a useful real catalog example, while route tests should use an isolated fixture that cannot change beneath the assertion.

| Request case | Expected status | ZIP work | Main assertion |
| --- | --- | --- | --- |
| Slug with current version | 200 | Runs | Version and byte headers match |
| UUID with current version | 200 | Runs | Lookup returns the same skill |
| Slug without a pin | 200 | Runs | Current version is reported |
| Slug with stale version | 404 | Skipped | Current version appears in JSON |
| Missing slug or UUID | 404 | Skipped | Skill not found is returned |

## How Do You Verify the SHA-256 Response Header?

The SHA-256 response header contains a lowercase hexadecimal digest of the exact compressed response bytes. Read \`response.arrayBuffer()\`, create a Node buffer from it, hash that buffer, and compare all sixty-four hex characters. Do not hash decoded text or extracted Markdown.

Node's [createHash documentation](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options) defines the streaming hash API used by the route. QASkills calls \`createHash('sha256').update(buffer).digest('hex')\` after JSZip finishes, so the test should use the same byte boundary.

\`\`\`ts
import { createHash } from 'node:crypto';

it('publishes the digest of the exact response bytes', async () => {
  mockSkillRows([skill]);
  const response = await requestArtifact('playwright-cli', '1.0.0');
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');

  expect(digest).toMatch(/^[a-f0-9]{64}$/);
  expect(response.headers.get('X-Artifact-Sha256')).toBe(digest);
  expect(response.headers.get('Content-Length')).toBe(String(bytes.length));
});
\`\`\`

Read the body once because Fetch response streams may reject a second \`arrayBuffer()\` call after consumption. Share that stored byte buffer with checksum and ZIP assertions.

ZIP artifact checksum testing should include one mutation control. Flip one byte in a copy, hash it, and expect a different digest. Do not try to open that altered archive; the purpose is to prove the assertion detects changed bytes.

The digest covers compression output and ZIP metadata as well as \`SKILL.md\`. Two archives with the same extracted text can differ in bytes because timestamps or compression metadata changed. Integrity checks must compare the downloaded bytes with headers from that same response.

The route converts the Node buffer into \`Uint8Array\` before creating the response. A checksum test must read the returned response rather than hash a mocked source buffer. This proves the conversion and transport boundary kept every byte in order.

Content length is the base-ten byte count rendered as a string. Compare it with the stored buffer length, not character count or extracted text size. Compressed bytes can be smaller or larger than source text based on content and ZIP overhead.

Never compare a digest prefix because a full SHA-256 match is cheap and avoids a weak test. Verify the header exists before hashing so its absence has a clear failure message.

Use the [agent skill security checklist](/blog/agent-skill-security-review-checklist) for wider package review. A matching digest proves transfer integrity for one representation; it does not prove the skill instructions are safe or approved.

## How Do You Add an ETag Checksum Assertion?

An ETag checksum assertion compares the response ETag with the same digest wrapped in double quotes, matching both QASkills checksum headers. Normalize neither value before checking its exact syntax.

The [HTTP Semantics specification](https://www.rfc-editor.org/info/rfc9110) defines entity tags and conditional requests, where an ETag identifies one selected representation. QASkills uses a quoted digest without the weak \`W/\` prefix.

\`\`\`ts
it('uses the artifact digest as a quoted entity tag', async () => {
  const response = await requestArtifact('playwright-cli', '1.0.0');
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');

  expect(response.headers.get('ETag')).toBe(\`"\${digest}"\`);
  expect(response.headers.get('X-Artifact-Sha256')).toBe(digest);
});
\`\`\`

Do not expect status 304 from this route today. It does not inspect \`If-None-Match\`; it always generates the current archive for a valid request. A future conditional response needs a new branch and tests for matching, non-matching, weak, and malformed validators.

ZIP artifact checksum testing should avoid demanding the same ETag from two separate route calls. JSZip can include file date metadata when a file is added, so generation time may alter bytes. First guarantee each ETag matches its own body.

The version header and ETag answer different questions. \`X-Artifact-Version\` names the skill release, while ETag names one byte representation. Keep both assertions so a correct version cannot excuse a digest mismatch, and a correct digest cannot excuse the wrong release.

Send an \`If-None-Match\` header once and assert the current 200 behavior as a documented gap. That check prevents a future test from assuming conditional support exists. Replace it only when the route adds explicit validator handling.

If immutable versions need stable bytes, set fixed ZIP metadata and add a repeated-generation test separate from checksum correctness. Document which promise installers can rely on.

Header case is not a test issue because Fetch headers are case-insensitive, but value syntax still matters. Assert the raw digest has no quotes and the ETag has exactly one quoted value.

## How Do You Inspect the JSZip Archive Structure?

The JSZip archive structure should contain one root directory named with the skill slug and one \`SKILL.md\` file inside it. QASkills calls \`zip.file(\`\${row.slug}/SKILL.md\`, skillMd)\` before generating a Node buffer with DEFLATE level nine.

The [JSZip generateAsync reference](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html) documents output types, compression choices, and asynchronous archive generation. The route requests \`nodebuffer\`, then wraps that buffer in a \`Uint8Array\` for the Next.js response.

Load the response bytes with \`JSZip.loadAsync\`, compare sorted file names, and reject absolute paths or parent segments. The current route should produce one file plus any implicit directory entry exposed by JSZip.

\`\`\`ts
import JSZip from 'jszip';

it('contains SKILL.md under the slug directory', async () => {
  const response = await requestArtifact('playwright-cli', '1.0.0');
  const bytes = Buffer.from(await response.arrayBuffer());
  const archive = await JSZip.loadAsync(bytes);
  const files = Object.values(archive.files).filter((entry) => !entry.dir);

  expect(files.map((entry) => entry.name)).toEqual([
    'playwright-cli/SKILL.md',
  ]);
  expect(files[0].name.startsWith('/')).toBe(false);
  expect(files[0].name.split('/')).not.toContain('..');
});
\`\`\`

Test a slug with ordinary hyphens because that is the catalog norm. If the system later accepts slashes or parent segments in slugs, the archive path needs a containment guard. A test should expose the risk before broadening accepted slug input.

ZIP artifact checksum testing should inspect uncompressed content after structure passes. A correct path with empty or truncated Markdown is still a broken artifact. Keep path, bytes, and semantic content as separate assertions so failures point to one stage.

Compression uses DEFLATE at level nine and returns a Node buffer, but small library changes may alter size without changing meaning. Test readable content, while the byte digest protects each returned representation.

Inspect entry count after filtering directory records, because JSZip may expose a parent folder as an entry. This prevents a valid archive from failing due to container bookkeeping. Any second real file should still fail the current one-file contract.

Do not require a physical directory entry because ZIP readers infer parents from file paths. The required user artifact is nested \`SKILL.md\`, while a directory record is only container detail.

## How Do You Validate SKILL.md ZIP Content?

SKILL.md ZIP content should equal the string produced by the repository's \`buildSkillMarkdown\` helper for the selected row. Extract the file as a string and compare it with that helper output. Then parse frontmatter and assert key metadata plus the full Markdown body.

An exact string comparison catches line endings, delimiters, and field loss, while semantic parsing catches changed metadata meaning. Use both when the repository parser is available.

The success fixture should include two-item arrays, an optional license, a GitHub URL, and several agents. This gives the builder enough work to reveal missing or malformed fields. Keep scalar values simple so the baseline represents behavior known to work.

\`\`\`ts
it('packages the generated skill Markdown without loss', async () => {
  const response = await requestArtifact('playwright-cli', '1.0.0');
  const archive = await JSZip.loadAsync(
    Buffer.from(await response.arrayBuffer()),
  );
  const markdown = await archive
    .file('playwright-cli/SKILL.md')!
    .async('string');

  expect(markdown).toBe(buildSkillMarkdown(skill));

  const parsed = parseSkillMd(markdown);
  expect(parsed.frontmatter.name).toBe(skill.name);
  expect(parsed.frontmatter.frameworks).toEqual(['playwright']);
  expect(parsed.content).toContain('Run focused browser commands');
});
\`\`\`

ZIP artifact checksum testing should also verify that absent full description produces the builder's defined fallback, if any. Do not invent body content in the route test. The artifact must reflect the selected database row and shared builder.

The builder emits only non-empty array fields and includes \`githubUrl\` only when its value is truthy. Create one fixture with empty tags and no URL, then require both keys to be absent. This protects package size and current compatibility without treating omitted optional data as loss.

When full description is empty, the builder creates an H1 from the skill name and follows it with the short description. Extract that fallback body and compare exact line breaks. A missing body should never turn into an empty file.

Manual scalar interpolation does not escape colons, hashes, quotes, or line breaks. Add a separate special-character case that may expose invalid YAML, and report it as a builder defect. Do not make the clean success fixture claim those values are safe today.

Use the [SKILL.md validation in CI guide](/blog/validate-skill-md-in-ci-pipeline) to add schema checks after extraction. The route owns packaging, while the validator owns metadata rules and warnings. A package can be byte-correct yet fail the skill schema.

Avoid checking only for \`name:\` because broken frontmatter delimiters, quoting, or arrays can still pass that weak check. Parse the document and compare fields that matter to installers.

## How Do You Check the Artifact Cache Header?

The artifact cache header currently equals \`public, max-age=300\`. Assert that exact value so a change in cache scope or age receives review. Public caching is a product choice because the artifact contains published skill content.

The route emits no \`immutable\`, \`s-maxage\`, or \`must-revalidate\` policy, so tests must not assume those rules. It also omits a version \`Vary\` value because version appears in the URL.

ZIP artifact checksum testing should pair the cache policy with the version header. A current-version pin and \`X-Artifact-Version\` make it clear which release the response represents. An omitted pin still returns current content and may change after a publish.

Check \`Content-Disposition\` because QASkills uses \`<slug>-<version>.zip\` as the download name with quotes around the filename. Reject line breaks or path separators in fixture values.

Caching does not validate body integrity, so a cached response needs the same checksum check as a fresh one. Installers should hash the bytes they receive and compare that result with trusted metadata or response headers.

The [QASkills skills directory](/skills) links users to published skill content. Browser tests can check that an artifact request starts, but byte and header checks belong in an API or Node test where the full response is available.

The five-minute cache rule applies even when the request omits a version pin. That moving URL can serve an older current artifact during its freshness window after a publish. A release smoke check should request the explicit version when exact release evidence matters.

Content disposition uses a quoted attachment filename built from slug and current version. Assert no carriage return or line feed can enter that value through fixture data. The current schema constrains slugs elsewhere, but this route does not sanitize the filename itself.

If policy later adds immutable versioned storage, split tests for pinned and unpinned URLs. A truly immutable version can use a long cache life, while a moving current alias needs shorter freshness rules.

## How Do You Build an Artifact Route Integration Test?

An artifact route integration test uses the real route, database adapter, Markdown builder, JSZip, and Node crypto. Run it against an isolated database row or mock only the database selection. Mocking JSZip or hashing would remove the behavior this article needs to verify.

Use one success matrix for slug, UUID, current version, and omitted version, plus one failure matrix for each fault. Missing rows, stale versions, database rejection, builder failure, and ZIP failure need distinct expected responses.

The missing-row case returns 404 with \`Skill not found\`, while stale versions return 404 with requested and current values. Other caught failures return 500 with \`Failed to build artifact\`.

ZIP artifact checksum testing should compare error responses as JSON and success responses as bytes. Do not call \`response.json()\` on a ZIP body or \`arrayBuffer()\` on an error and then guess its text. Branch assertions by status and content type.

Check that version validation runs before ZIP generation because a stale pin should not call Markdown, JSZip, or hashing code. This keeps rejected requests cheap and prevents building the wrong content.

Test the default \`1.0.0\` behavior with a fixture whose stored version is null only if the schema permits that state. The current route uses \`row.version || '1.0.0'\`. Record that fallback as compatibility behavior, not a replacement for valid stored versions.

Assert that errors use JSON content type and never carry ZIP integrity headers. A 404 body should not look installable to a client that checks only one header. The [API testing guide](/blog/api-testing-complete-guide) can extend these status and media-type cases.

Keep database mocks at the returned-row boundary and use real Markdown, ZIP, and crypto code. This split avoids network setup while preserving every transformation that defines the artifact. A separate database integration can verify slug and UUID predicates.

The [agent skill security review](/blog/agent-skill-security-review-checklist) can inspect the extracted instructions, while this route suite protects transport and package form. The two checks should report separate outcomes.

## Run the ZIP Artifact Checksum Testing Procedure

Run route checks from lookup and version policy through bytes, headers, archive structure, and parsed content. Save the route revision and fixture version with the report. One ordered flow makes it hard to verify the wrong body.

1. Insert or mock a complete skill row with fixed slug, UUID, version, arrays, and Markdown body.
2. Request the artifact by slug with an explicit current-version query and require status 200.
3. Read the body once as bytes, compare content length, and compute a full SHA-256 digest.
4. Compare the digest with the raw checksum header and the quoted ETag value.
5. Load the same bytes with JSZip and require exactly \`<slug>/SKILL.md\` as the file path.
6. Extract Markdown, compare the builder output, parse frontmatter, and assert key fields plus body.
7. Verify version, content type, disposition, and five-minute public cache headers.
8. Repeat lookup by UUID, then exercise missing row, stale version, and caught failure responses.
9. Mutate a byte copy and prove its digest differs without changing the original response buffer.
10. Run a post-deploy request and retain digest, version, length, and archive checks as evidence.

ZIP artifact checksum testing should report the computed digest, response digest, ETag, length, file list, and version when a case fails. Never print private database fields or the full skill body by default. A short path and metadata summary are enough.

Keep network retries outside digest assertions by retrying failed GET requests only under a defined transport policy. Hash one final successful body and never merge bytes from several attempts.

Use the same package check in CLI release tests when the installer consumes this route. Shared expectations prevent the server from publishing a shape that only the web test understands.

Keep the original response bytes as a failed CI artifact only when policy allows published content storage. Record the digest and file list in normal logs instead. This gives enough proof for most failures without copying full skill instructions into every test report.

Run a negative control with a changed expected version, a changed expected path, and a changed digest in separate cases. Each assertion should fail for its own reason. A single broad mismatch can hide which package guarantee stopped working.

## Publish Verifiable Skill Packages

ZIP artifact checksum testing proves that each response identifies its exact bytes, contains the expected skill path, carries the requested current version, and preserves generated Markdown. It also distinguishes per-response integrity from stronger byte-for-byte reproducibility across separate ZIP generations.

Keep these route checks beside artifact code, then validate extracted metadata with the [SKILL.md CI guide](/blog/validate-skill-md-in-ci-pipeline). Browse the [QASkills directory](/skills) for other packages, and use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) for browser-level download flows.

Treat checksum, ETag, archive path, and skill safety as related but separate claims. Clear tests let installers reject changed bytes without presenting a matching digest as proof that the instructions themselves are trustworthy.

## Frequently Asked Questions

### Should the checksum cover the ZIP or SKILL.md text?

It should cover the exact ZIP response bytes because that is what the route publishes and installers download. You can add a second content digest later, but it needs a separate name and contract. Do not compare a Markdown hash with \`X-Artifact-Sha256\`.

### Why is the ETag wrapped in quotes?

HTTP entity-tag syntax uses a quoted opaque value, with an optional weak prefix. QASkills places the hexadecimal digest inside quotes and sends the raw digest in its custom checksum header. Tests should compare each header with its own exact syntax.

### Does the route support old skill versions?

No. It materializes only the current database version today. A matching version pin succeeds, while a different requested version returns 404 and reports the current version. Historical storage needs new persistence, lookup, caching, and compatibility tests before that promise changes.

### Must two requests for one version have one digest?

Not under the current code contract. Each digest must match its own response bytes, but JSZip metadata can vary across generation times. If immutable versions require repeatable bytes, set fixed archive metadata and add a separate repeated-generation assertion for every supported runtime.

### What should happen for If-None-Match?

The current route does not inspect that request header, so a valid skill still returns a generated 200 response. Conditional 304 behavior can be added later, but it needs explicit tests for matching and non-matching tags plus the response headers retained on that path.

### How often should ZIP artifact checksum testing run?

Run route and integration cases whenever artifact, Markdown, database, JSZip, or version logic changes, plus one deployed smoke before each release candidate. Retain the version, digest, length, file path, and parsed metadata as compact package evidence for every supported installer path in CI.
`,
};
