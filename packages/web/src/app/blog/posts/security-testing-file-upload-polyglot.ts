import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing File Upload Polyglot Defenses End to End',
  description: 'Learn security testing file upload polyglot defenses with safe fixtures, parser checks, storage assertions, and CI tests that expose validation gaps.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing File Upload Polyglot Defenses End to End

Security testing file upload polyglot behavior means proving that every component agrees about what an uploaded object is, what may process it, and how it may be returned. A polyglot is accepted as more than one format by different parsers. The important test is therefore not merely whether an extension allowlist rejects a suspicious name. It is whether the upload gateway, content inspector, image or document processor, object store, download handler, browser, and downstream jobs make one consistent and safe decision.

A reliable workflow uses harmless fixtures with recognizable markers, records decisions at every boundary, and asserts safe storage and retrieval. It also separates rejection tests from transformation tests. If the product promises to accept a photo and re-encode it, the expected result may be a clean derivative rather than rejection. If it promises to store an original document, quarantine and controlled download may be the correct outcome. The oracle must reflect that contract.

This guide builds that workflow from a threat model through API tests, parser probes, browser verification, observability, and CI. It deliberately avoids live payloads. The goal is to reveal interpretation gaps without executing server-side code or placing users at risk.

## Define the polyglot risk as an interpretation mismatch

The common shorthand, “a file that is both format A and format B,” hides the engineering problem. Formats are recognized through several independent signals: filename extension, client-supplied media type, leading signature bytes, complete structural parsing, and the context in which bytes are later served. A file can pass a shallow signature check, fail a full decoder, and still be embedded in an HTML response. Those are three different interpretations.

Model the object as a sequence of decisions. At upload, the application sees a name, headers, and bytes. An inspector may infer a type. A transformer may decode and rewrite it. Storage assigns a key and metadata. Retrieval selects response headers. A background service may index, extract, resize, or scan it. Your test needs evidence for each relevant decision, not a single 201 response.

| Boundary | Evidence to capture | Unsafe disagreement |
|---|---|---|
| HTTP upload | submitted name, declared media type, size | server trusts the browser header alone |
| Validation | detected type, parser result, policy rule | signature says image while decoder rejects it |
| Transformation | output hash, dimensions, metadata | untrusted trailing bytes survive an image rewrite |
| Storage | generated key, bucket policy, scan status | user filename becomes an executable web path |
| Retrieval | status, Content-Type, disposition, nosniff | active bytes are served inline as HTML |
| Asynchronous processing | scanner and extractor verdicts | one consumer bypasses quarantine state |

The most dangerous defect is often temporal. An upload is initially private, then a thumbnailer fails and a fallback path exposes the original. Or a scanner marks the object clean after only checking the first recognized format. Include state transitions in the threat model: pending, quarantined, accepted, transformed, rejected, and deleted.

OWASP’s File Upload Cheat Sheet recommends an allowlist, server-side type checks, generated filenames, size limits, authorized access, storage outside the webroot, malware analysis where available, and format-specific validation. Its core point is that no single check is sufficient. The official guidance is at https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html.

## Turn the upload contract into explicit security oracles

Before making fixtures, write the product contract as assertions. “Only images allowed” is too vague. Specify which encodings, maximum dimensions and bytes, whether metadata is preserved, whether originals are retained, and how retrieval works. Ask the development team which library performs the authoritative decode. A magic-byte library is classification, not necessarily complete validation.

Here is a practical oracle matrix for a profile-photo endpoint. The values are illustrative and should be replaced with the product’s approved policy.

| Case | Upload result | Stored object | Retrieval result |
|---|---|---|---|
| valid PNG named avatar.png | accepted | re-encoded PNG derivative | inline image with exact image media type |
| valid PNG named avatar.txt | rejected or renamed by documented policy | none before acceptance | no public URL |
| text named avatar.png | rejected | quarantined temporarily at most | inaccessible |
| valid PNG plus trailing marker | accepted only if decoder rewrites | marker absent from derivative | image response cannot expose original |
| two valid concatenated structures | rejected or normalized | only normalized output | no ambiguous original served inline |
| decoder timeout or crash | fail closed | quarantine state | unavailable until a verdict exists |

The oracle should also cover negative side effects. A rejected request must not create a durable object, enqueue a thumbnail job, increment a user’s permanent quota, or return a predictable storage key. An accepted request should not reuse the caller’s filename as a path. When processing is asynchronous, poll a documented status resource until a terminal state rather than sleeping for an arbitrary interval.

What people get wrong is treating rejection as the only safe result. A mature image pipeline can accept a structurally valid input, decode pixels, discard ancillary data, and encode a new file. In that design, preservation of the original ambiguous bytes is the failure. Conversely, simply renaming the original does not normalize it. Your tests must distinguish byte-preserving storage from content reconstruction.

## Build safe fixtures that reveal shallow validation

Start with a tiny valid image generated by a standard encoder. Then produce controlled mutations containing only inert ASCII markers. A marker such as \`QA_TRAILING_MARKER\` lets a test determine whether the original tail survived. It is not executable content. The following Node script uses only built-in modules and a known one-pixel PNG encoded as base64.

\`\`\`js
import { mkdir, writeFile } from 'node:fs/promises';

const out = new URL('./fixtures/', import.meta.url);
await mkdir(out, { recursive: true });

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const marker = Buffer.from('QA_TRAILING_MARKER', 'ascii');

await writeFile(new URL('valid.png', out), png);
await writeFile(new URL('trailing-marker.png', out), Buffer.concat([png, marker]));
await writeFile(new URL('wrong-extension.txt', out), png);
await writeFile(new URL('fake.png', out), Buffer.from('not an image', 'utf8'));
\`\`\`

Run it with \`node make-fixtures.mjs\`. Keep fixture creation deterministic and record hashes in the repository. Never pull samples from an unreviewed public corpus during CI. That makes builds non-reproducible and can introduce real malware into developer machines or artifact stores.

A suffix marker is not a universal polyglot. It is a focused probe for validators that check only a leading signature and pipelines that claim to re-encode but accidentally preserve the original. Add format-pair fixtures only after identifying supported formats and parsers. For example, an application that accepts both PDF and ZIP needs different probes from an image-only avatar service.

Classify fixture intent so failures remain interpretable:

| Fixture family | Safe mutation | Control it tests |
|---|---|---|
| declaration mismatch | valid bytes with wrong extension or media type | header and name are not authoritative |
| signature mismatch | expected extension with plain inert text | magic and full parse are required |
| trailing data | valid image followed by ASCII marker | transformation removes non-image tail |
| truncation | remove final bytes from a valid file | complete decoding is required |
| resource boundary | valid file exactly at and just above limit | size policy has no off-by-one gap |
| filename ambiguity | mixed case, extra dots, Unicode name | decoded basename policy is consistent |

## Probe bytes with independent, bounded checks

The test harness should inspect fixtures independently of the service under test. Do not use the same parsing library as production for every oracle, because a shared bug can make both sides agree incorrectly. At minimum, inspect the leading signature, expected terminal structure, total size, and marker presence. For production-quality format verification, use a maintained decoder or command-line tool supported by your organization.

This runnable script reports properties of the generated PNG probes without asserting that signature recognition equals validity.

\`\`\`js
import { readFile } from 'node:fs/promises';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  throw new Error('Pass one or more fixture paths');
}

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
for (const path of paths) {
  const bytes = await readFile(path);
  const report = {
    path,
    bytes: bytes.length,
    hasPngSignature: bytes.subarray(0, 8).equals(pngSignature),
    hasTrailingMarker: bytes.includes(Buffer.from('QA_TRAILING_MARKER')),
  };
  console.log(JSON.stringify(report));
}
\`\`\`

Run \`node inspect-fixture.mjs fixtures/valid.png fixtures/trailing-marker.png\`. Treat this output as test evidence, not the application verdict. Full PNG validation requires checking chunk lengths, CRCs, ordering, and image decoding. Delegating that work to a real decoder is safer than maintaining a homegrown parser.

Bound every inspection. A test suite can itself be vulnerable to decompression bombs, enormous dimensions, recursive archives, or parsers that hang. Put memory, CPU, wall-clock, recursion, and expanded-size limits around auxiliary tools. Execute risky parsers in an isolated worker with minimal filesystem and network access. The test asset can be inert and still trigger an availability bug through pathological structure.

## Exercise the HTTP boundary without trusting the client declaration

API tests should vary filename, declared media type, and bytes independently. The following Node test uses built-in \`fetch\`, \`FormData\`, and the test runner. It expects an already running service whose base URL is provided explicitly. It makes no assumption about an invented client library.

\`\`\`js
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.UPLOAD_BASE_URL;
const token = process.env.UPLOAD_TEST_TOKEN;
if (!baseUrl || !token) {
  throw new Error('Set UPLOAD_BASE_URL and UPLOAD_TEST_TOKEN');
}

async function upload(path, filename, type) {
  const bytes = await readFile(new URL(path, import.meta.url));
  const form = new FormData();
  form.set('file', new Blob([bytes], { type }), filename);
  return fetch(new URL('/api/profile-photo', baseUrl), {
    method: 'POST',
    headers: { authorization: \`Bearer \${token}\` },
    body: form,
  });
}

test('rejects plain text declared as PNG', async () => {
  const response = await upload('./fixtures/fake.png', 'avatar.png', 'image/png');
  assert.equal(response.status, 415);
});

test('does not accept a valid image solely because of its header', async () => {
  const response = await upload('./fixtures/wrong-extension.txt', 'avatar.txt', 'image/png');
  assert.ok([400, 415].includes(response.status));
});
\`\`\`

Status expectations must match the actual API contract. A 400 can mean malformed multipart data, while 415 commonly represents an unsupported media type. More important than the exact choice is stable, non-sensitive behavior. Error bodies should not expose temporary paths, parser stack traces, antivirus command lines, or internal bucket names.

Repeat the matrix with a deliberately false \`Content-Type\`, an omitted filename where the client permits it, upper-case extensions, and the maximum supported size. Capture the final server-side detected type in restricted test telemetry if the product exposes it. Do not make sensitive detection internals public to normal callers.

For engineers already testing identity boundaries, [security testing JWT algorithm confusion](/blog/security-testing-jwt-algorithm-confusion) provides a parallel lesson: the untrusted declaration must not select the security mechanism that validates it.

## Verify normalization by comparing the retrieved derivative

When the policy accepts and rewrites images, the strongest assertion is on the result. Upload the marker-bearing image, wait for processing, retrieve the canonical derivative, and prove the marker is absent. Also verify that decoded dimensions and appearance remain expected. Byte inequality alone is insufficient because metadata timestamps or compression settings can change harmlessly.

This example is a complete Node test for an illustrative asynchronous API contract. Adapt only the paths and documented response shape to your system.

\`\`\`js
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.UPLOAD_BASE_URL;
const token = process.env.UPLOAD_TEST_TOKEN;
if (!baseUrl || !token) throw new Error('Missing upload test environment');

const headers = { authorization: \`Bearer \${token}\` };

test('re-encoding removes an inert trailing marker', async () => {
  const input = await readFile(new URL('./fixtures/trailing-marker.png', import.meta.url));
  const form = new FormData();
  form.set('file', new Blob([input], { type: 'image/png' }), 'avatar.png');

  const created = await fetch(new URL('/api/profile-photo', baseUrl), {
    method: 'POST', headers, body: form,
  });
  assert.equal(created.status, 202);
  const { statusUrl } = await created.json();

  let result;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await fetch(new URL(statusUrl, baseUrl), { headers });
    assert.equal(status.status, 200);
    result = await status.json();
    if (result.state === 'ready' || result.state === 'rejected') break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  assert.equal(result?.state, 'ready');
  const download = await fetch(new URL(result.downloadUrl, baseUrl), { headers });
  assert.equal(download.status, 200);
  const output = Buffer.from(await download.arrayBuffer());
  assert.equal(output.includes(Buffer.from('QA_TRAILING_MARKER')), false);
});
\`\`\`

The retry loop is bounded to five seconds in this example. Real CI should set a documented service-level budget and print the last observed state on failure. Avoid a fixed long sleep, which is simultaneously slow when the job is fast and flaky when the job is slow.

If originals must be retained for audit, they should remain in a private quarantine or evidence store and never become the public derivative. Test authorization separately for original access. An administrator role should not automatically imply that a browser may render arbitrary active content inline.

## Test retrieval as a separate security surface

Many upload defenses succeed at ingestion and fail at download. A benign file can become dangerous when the retrieval endpoint chooses an attacker-controlled media type or omits protective headers. Assert the response headers and browser behavior for every public route: direct object URL, application download handler, thumbnail URL, CDN alias, and cached historical link.

For untrusted files that are not intended for inline rendering, a typical safe contract uses \`Content-Disposition: attachment\`, a specific or conservative \`Content-Type\`, and \`X-Content-Type-Options: nosniff\`. Exact requirements depend on the product. A valid user image intended for display may be inline, but its media type must come from trusted processing metadata, not the original multipart header.

\`\`\`js
import test from 'node:test';
import assert from 'node:assert/strict';

const downloadUrl = process.env.UPLOAD_DOWNLOAD_URL;
const token = process.env.UPLOAD_TEST_TOKEN;
if (!downloadUrl || !token) throw new Error('Set download test variables');

test('quarantined originals cannot be rendered inline', async () => {
  const response = await fetch(downloadUrl, {
    headers: { authorization: \`Bearer \${token}\` },
    redirect: 'manual',
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition') ?? '', /^attachment;/i);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  // A raw inequality passes for 'text/html; charset=utf-8', which is still HTML.
  // Strip parameters and lowercase before comparing.
  const mediaType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  assert.notEqual(mediaType, 'text/html');
});
\`\`\`

Also check redirects. A protected handler that redirects to a signed object-store URL may enforce authorization correctly while the final response has unsafe metadata. Follow the redirect in a second request and assert the terminal headers. Verify that signed URLs expire and are scoped to one object, but do not put live signatures in test logs.

## Use a real browser to detect rendering regressions

HTTP assertions cannot fully prove browser behavior. Add a browser test for the route that displays user content. The safest fixture remains inert: it contains a visible marker string but no script. Assert that the application renders an image element from the processed URL and that the marker never appears as page text.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('profile page displays only the processed image', async ({ page }) => {
  const profileUrl = process.env.TEST_PROFILE_URL;
  if (!profileUrl) throw new Error('Set TEST_PROFILE_URL');

  await page.goto(profileUrl);
  const avatar = page.getByRole('img', { name: 'Profile photo' });
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute('src', /processed/);
  await expect(page.getByText('QA_TRAILING_MARKER')).toHaveCount(0);
});
\`\`\`

Use accessible roles and names rather than brittle DOM chains. If the product uses a canvas or CSS background image, assert the actual supported contract instead of forcing this locator. Network event inspection can additionally prove that the page never requests a quarantine URL.

Keep browser origins in scope. Serving user content from a separate cookieless origin limits impact, but only if cookies, cross-origin resource sharing, content security policy, and navigation behavior are configured as intended. Test both the application origin and the upload origin. A CDN migration can silently collapse that separation.

## Diagnose a realistic “accepted then exposed” failure

Consider this failure: \`trailing-marker.png\` returns 202, processing becomes ready, and the profile page shows the picture. The derivative does not contain the marker when downloaded through the API, yet browser network logs show a request to an original-object URL when the responsive image reaches a particular size.

The diagnosis should proceed by boundaries:

1. Compare the URLs in \`src\`, \`srcset\`, CSS, and preload headers. A rarely selected \`srcset\` candidate may point to the original.
2. Fetch every candidate directly and record terminal headers after redirects.
3. Compare hashes against the submitted bytes and processed derivative.
4. Inspect application metadata mapping, not just storage contents. A “largest rendition” fallback may resolve to the source key.
5. Purge the test object from CDN caches through the normal test cleanup path, then repeat to distinguish stale metadata from current routing.

The root cause is not “the validator missed a polyglot” if normalization succeeded. It is a retrieval mapping defect that bypassed the normalized asset. Fix the mapping and add a regression assertion covering all responsive candidates. Precise classification keeps teams from adding redundant upload checks while leaving the exposure path intact.

| Symptom | Likely layer | Next evidence |
|---|---|---|
| request rejected before multipart parsing | gateway limit or syntax | gateway logs and request size |
| accepted, then processor reports corrupt image | full decoder | decoder exit reason and quarantine state |
| derivative is clean, page fetches original | URL mapping or template | rendered candidates and object hashes |
| correct headers at app, wrong after redirect | object metadata or CDN | terminal response headers |
| only first request is unsafe | cache population race | cache status and origin response |

## Cover concurrency, cache, and asynchronous races

Upload pipelines are distributed systems. Race tests often reveal gaps that static fixture matrices miss. Try simultaneous retrieval while the object is pending, repeated replacement of a profile image, deletion during processing, and scanner timeouts. The invariant is that no path exposes unapproved bytes before a terminal safe decision.

Use unique generated identifiers for every test run and clean them through supported APIs. Names should include clearly separated variables, for example \`security_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}\` in a shell script. Do not depend on user-controlled filenames for uniqueness, because production correctly should replace them.

\`\`\`bash
set -eu
: "\${CI_PIPELINE_ID:?CI_PIPELINE_ID is required}"
: "\${CI_NODE_INDEX:?CI_NODE_INDEX is required}"

RUN_LABEL="security_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"
export RUN_LABEL
node --test test/upload-polyglot.test.mjs
\`\`\`

Make cleanup idempotent. A failed scan may leave an object in quarantine, so the cleanup identity needs permission to remove test-owned objects from every state without gaining broad production access. Prefer a dedicated test tenant and bucket prefix. Never run destructive cleanup by enumerating an entire shared bucket.

JWT-protected upload services also need cache-aware authentication coverage. [Testing JWT key rotation with a JWKS cache](/blog/testing-jwt-key-rotation-jwks-cache) explains how to verify that authorization remains correct while keys and caches change, a useful companion when upload workers call each other with service tokens.

## Make CI informative without distributing dangerous artifacts

Run small inert probes on every change to validation, processing, storage, and delivery code. Place expensive decoder, antivirus, archive, and browser matrices in a scheduled or pre-release lane. CI output should identify the fixture family, expected policy, observed state, response headers, and content hashes. It should not attach untrusted originals to public build logs.

A good failure report says: “trailing-data fixture accepted, derivative hash differs from input, marker still present in terminal download, object state ready.” That immediately distinguishes a failed rewrite from a pure storage path. Redact authorization headers and signed query strings. Store restricted forensic artifacts only when policy permits.

Use the following release gate as a compact review:

| Gate | Pass condition | Owner |
|---|---|---|
| classification | declared type cannot override structural result | upload API team |
| decoding | supported files complete a bounded full decode | media pipeline team |
| transformation | ambiguous or unnecessary bytes are absent | media pipeline team |
| quarantine | pending and rejected objects are inaccessible | platform security |
| delivery | every terminal route has approved headers | web and CDN team |
| observability | decisions correlate by opaque object ID | SRE team |
| cleanup | test tenant artifacts expire or delete safely | QA infrastructure |

Review this gate whenever a parser, CDN, object store, image library, or upload API changes. A parser upgrade may correctly reject an old fixture, but it can also alter metadata preservation or error handling. Update expectations only after explaining the changed security property.

## Report parser disagreements with reproducible evidence

A useful security defect names every interpreter involved. Record the submitted filename, declared media type, byte length, cryptographic hash, production detector verdict, complete decoder result, transformation outcome, storage state, and terminal retrieval headers. Include the application build and parser package versions captured from the build manifest. Do not attach sensitive signed URLs or unrestricted artifacts to a broadly visible ticket.

Describe the violated invariant rather than leading with an attack label. “The image derivative contains the inert trailing marker and the profile page selects that derivative” is more actionable than “polyglot bypass.” If two parsers truly accept separate formats, list the exact commands or harness calls and their results. If only a leading signature check accepts the object, call it shallow classification. Precise language directs the fix toward the correct boundary.

Retest the entire path after remediation. A new decoder rejection may leave quarantined objects accessible, and a corrected download header may not repair a responsive-image URL that bypasses the handler. Verify cleanup, asynchronous state, CDN behavior, and all derivatives. Preserve the smallest safe regression fixture and its policy expectation in version control.

Severity depends on reachable impact, not novelty. An ambiguous file stored privately and reconstructed before display differs from original bytes served inline on an authenticated application origin. Document authorization, origin separation, browser context, downstream processors, and user reachability so security reviewers can prioritize based on evidence.

## Frequently Asked Questions

### Is every file with trailing bytes a polyglot?

No. Some formats permit trailing data, while others require a strict end structure, and a second parser may not recognize the suffix as another complete format. A trailing-marker fixture is still useful because it tests shallow signature validation and promised normalization. Call it a polyglot only when you have demonstrated that two relevant parsers accept meaningful interpretations. In reports, name the exact parsers, versions recorded by your build, commands, and outcomes so developers can reproduce the disagreement without relying on a vague label.

### Should a secure upload service reject every ambiguous image?

Not necessarily. Rejection is appropriate when the service stores originals or cannot establish a safe canonical form. A well-isolated pipeline may fully decode pixels and produce a fresh image whose dimensions, encoding, and metadata follow policy. In that case the key assertion is that downstream routes use only the reconstructed derivative. The decision should be documented per file type. Renaming, changing a media-type field, or copying the original bytes does not count as reconstruction.

### Can antivirus scanning replace parser and retrieval tests?

No. Malware scanning addresses known or behaviorally suspicious content, but it does not establish that every component interprets a file consistently. A scanner can return clean while a browser receives an unsafe media type, a thumbnailer reaches a vulnerable parser, or a CDN exposes a quarantined original. Keep scanning as one defense layer. Test structural decoding, transformation, authorization, storage state, response headers, redirects, and browser rendering as separate controls with separate evidence.

### How can a team test polyglots safely in shared CI?

Begin with deterministic, inert fixtures containing only valid minimal files, mismatched declarations, truncations, size boundaries, and visible ASCII markers. Use a dedicated test tenant and isolated storage prefix, restrict access to artifacts, and bound parser resources. Do not download live samples during the build or publish originals in logs. Add true multi-format samples only after security review, keep them in controlled storage, and ensure no step executes embedded content. The test should prove policy decisions, not demonstrate exploitation.
`,
};
