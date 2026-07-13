import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Multipart File-Upload Size Limits',
  description:
    'Test multipart file-upload size limits at exact boundaries, including MIME overhead, deceptive filenames, truncated bodies, cleanup, and proxy behavior.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Multipart File-Upload Size Limits

A 10 MiB file is not a 10 MiB HTTP request. The multipart boundary, per-part headers, filename, metadata fields, and closing delimiter all add bytes. If a reverse proxy caps the request at 10 MiB while the application promises a 10 MiB file, valid boundary uploads can fail before application code sees them. The test plan must distinguish file-byte limits from total-request limits and identify which layer rejects each case.

Upload limits are security controls, resource-management controls, and product rules at once. Testing only a tiny success and a huge failure misses exact boundaries, multiple parts, chunked transfer, parser cleanup, and filenames that alter multipart overhead or storage behavior.

## Write down the limit contract in bytes

“10 MB” is ambiguous. Decimal megabytes mean 10,000,000 bytes; mebibytes mean 10,485,760 bytes. The API contract should state bytes or an unambiguous unit, the scope of the limit, and the response expected when it is exceeded.

| Limit dimension | Example policy | Question the test must answer |
|---|---|---|
| Per-file bytes | 10,485,760 per attachment | Is exactly the maximum accepted? |
| Aggregate file bytes | 25 MiB across parts | Do three individually valid files exceed the batch? |
| Entire HTTP body | 30,000,000 bytes | Are MIME headers and text fields included? |
| File count | Maximum 8 parts named \`files\` | Are extra parts rejected or ignored? |
| Filename length | 255 UTF-8 bytes after normalization | Is measurement by bytes, code points, or characters? |
| Decompressed size | 100 MiB extracted archive | Is archive expansion checked after upload? |

Test \`limit - 1\`, \`limit\`, and \`limit + 1\` with deterministic buffers. Do not use approximate “large” fixtures whose size changes when checked out with different line endings.

## Generate exact files without fixture bloat

Node's built-in \`Blob\` and \`FormData\` can construct repeatable payloads. When \`fetch\` receives \`FormData\`, do not set \`Content-Type\` yourself. The implementation must add the matching boundary.

\`\`\`ts
import { describe, expect, it } from 'vitest';

const MiB = 1024 * 1024;

async function uploadFile(bytes: number, filename = 'evidence.bin') {
  const form = new FormData();
  form.append('caseId', 'CASE-1042');
  form.append(
    'file',
    new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }),
    filename,
  );

  return fetch('http://127.0.0.1:3000/api/evidence', {
    method: 'POST',
    body: form,
  });
}

describe('10 MiB evidence limit', () => {
  it.each([
    { bytes: 10 * MiB - 1, expected: 201 },
    { bytes: 10 * MiB, expected: 201 },
    { bytes: 10 * MiB + 1, expected: 413 },
  ])('returns $expected for $bytes file bytes', async ({ bytes, expected }) => {
    const response = await uploadFile(bytes);
    expect(response.status).toBe(expected);
  });
});
\`\`\`

This code exercises a running API. A local test server should write to isolated temporary storage and expose a way to verify cleanup. Repeating the zero-filled buffer is fine for byte limits, but it is highly compressible. If a gateway compresses request bodies, disable compression or use deterministic pseudo-random bytes so transmitted-size behavior is meaningful.

## File bytes and request bytes need separate suites

The convenient \`FormData\` API does not promise a caller-selected boundary, which is correct for client behavior but inconvenient for exact total-body tests. Construct the raw multipart body when the body byte count itself is the variable.

\`\`\`ts
import { Buffer } from 'node:buffer';

function multipartBody(file: Buffer, filename: string, boundary: string): Buffer {
  const head = Buffer.from(
    \`--\${boundary}\\r\\n\` +
      \`Content-Disposition: form-data; name="file"; filename="\${filename}"\\r\\n\` +
      'Content-Type: application/octet-stream\\r\\n\\r\\n',
    'utf8',
  );
  const tail = Buffer.from(\`\\r\\n--\${boundary}--\\r\\n\`, 'utf8');
  return Buffer.concat([head, file, tail]);
}

it('rejects a body one byte above the gateway limit', async () => {
  const boundary = 'qa-boundary-7f4a';
  const fixedOverhead = multipartBody(Buffer.alloc(0), 'x.bin', boundary).length;
  const bodyLimit = 1_000_000;
  const body = multipartBody(
    Buffer.alloc(bodyLimit - fixedOverhead + 1, 0x61),
    'x.bin',
    boundary,
  );

  expect(body).toHaveLength(bodyLimit + 1);
  const response = await fetch('http://127.0.0.1:3000/api/evidence', {
    method: 'POST',
    headers: {
      'content-type': \`multipart/form-data; boundary=\${boundary}\`,
      'content-length': String(body.length),
    },
    body,
  });

  expect(response.status).toBe(413);
});
\`\`\`

The CRLF sequences are part of the multipart encoding. A final boundary contains two trailing hyphens. Hand-built payloads should be reserved for protocol edge cases and verified against the server parser; ordinary client scenarios should use a standard encoder.

## Boundaries deserve hostile cases

The boundary parameter identifies delimiters, and the same byte sequence may appear inside binary content without being a delimiter unless it occurs with the required framing. Test a file containing boundary-like text so a naive parser does not truncate it. Also test a missing closing delimiter, mismatched header and body boundaries, quoted boundary parameters, and an unusually long but policy-valid boundary.

| Mutation | Correct high-level outcome | Risk exposed |
|---|---|---|
| Header names boundary A, body uses B | 400-class malformed request | Parser hangs or accepts empty upload |
| Closing delimiter omitted | Reject incomplete multipart body | Partial file left on disk |
| Boundary text occurs in file content | Preserve all file bytes | Naive substring splitting |
| Part lacks \`Content-Disposition\` | Reject or ignore per documented policy | Unnamed data accepted unexpectedly |
| Duplicate \`name="file"\` parts | Apply declared multi-file rule | Last-part overwrite or bypass |
| LF replaces required CRLF | Consistent parser decision | Environment-specific leniency |

Malformed tests should set client timeouts. Their purpose is not merely to get any error but to prove the server terminates parsing, does not retain a partial object, and remains responsive afterward.

## Filenames are metadata and attack input

Multipart \`Content-Disposition\` supplies a field name and may include a filename. The server must never treat that client value as a trusted filesystem path. Include traversal strings, Windows separators, reserved names, control characters if the HTTP client permits them, Unicode normalization variants, and names near the documented length limit.

\`\`\`ts
it.each([
  '../outside.txt',
  '..\\\\outside.txt',
  'report 2026.csv',
  'résumé.pdf',
  'photo.jpg.exe',
])('stores a safe server-generated name for %s', async (filename) => {
  const response = await uploadFile(64, filename);
  expect(response.status).toBe(201);

  const result = (await response.json()) as {
    objectKey: string;
    originalFilename: string;
  };
  expect(result.originalFilename).toBe(filename);
  expect(result.objectKey).toMatch(/^evidence\/[0-9a-f-]+$/);
  expect(result.objectKey).not.toContain('..');
});
\`\`\`

Whether the API echoes the original name is a product decision. If it does, output encoding still matters when another page renders it. Storage keys should be generated independently. MIME type and extension are both untrusted; validate content signatures when file type affects processing or security.

The [API security testing checklist](/blog/api-security-testing-checklist-2026) expands on traversal, content confusion, malware workflows, and authorization around uploaded objects.

## Verify rejection at every infrastructure layer

The same upload may encounter a CDN, ingress controller, reverse proxy, application server, multipart library, and object store. A 413 from the edge can have a different content type and request ID than a 413 from the application. Map the effective limits from outside inward.

| Layer | Evidence of rejection | Important follow-up |
|---|---|---|
| CDN or WAF | Edge headers, no origin trace | Is error format acceptable to clients? |
| Reverse proxy | Proxy log and configured body cap | Does cap leave room for multipart overhead? |
| App server | Request rejected before route handler | Is connection drained or closed safely? |
| Multipart parser | Route reached, parser emits size error | Are temporary chunks removed? |
| Business validator | Parsed file rejected by policy | Was object storage avoided? |
| Object store | Upload failure after streaming | Is multipart upload aborted? |

Run direct-to-service tests and through-production-shaped ingress tests. The former locates application behavior; the latter validates the actual public contract. If environments use different proxies, a green local integration suite cannot certify the deployed maximum.

## Streaming, content length, and early termination

Clients may send \`Content-Length\` or stream without it. When a trustworthy declared length exceeds the request cap, infrastructure can reject before reading the body. Without a length, the server must count received bytes and stop safely when the cap is crossed.

Test a false small \`Content-Length\` only with a low-level HTTP client, because \`fetch\` implementations protect or recalculate that header. Also test a client that disconnects midway. After each case, assert no database record, no final object, no temporary file, and no open multipart upload remain.

Avoid making connection-level details overly rigid. Depending on server and protocol, the client may receive a 413, a reset, or an aborted stream when the server stops accepting bytes. Define the supported public behavior at the chosen deployment boundary and instrument deeper tests for resource cleanup.

## Multiple files can bypass naive limits

A parser configured with a per-file limit may accept ten files just under that threshold and exhaust aggregate storage. Exercise combinations, not only single parts:

1. One file exactly at the per-file maximum.
2. Two valid files whose sum equals the aggregate maximum.
3. One additional byte spread across the last file.
4. Maximum file count with zero-byte files.
5. One more part than allowed.
6. Large text fields plus valid files to cross the total-body cap.
7. Repeated unexpected field names.

Zero-byte files need an explicit policy. Some products accept them as valid empty documents; others reject them as unusable. A parser successfully producing a zero-byte object does not decide the business rule.

## Prove cleanup after oversized uploads

Status assertions alone miss expensive failures. Provide test-only observability through isolated storage, an object-store emulator, or repository queries. Use a unique case ID for every request, then poll for absence after rejection. Account for asynchronous cleanup if the architecture documents it, but set a firm upper bound.

\`\`\`ts
it('removes temporary state after a streamed oversize rejection', async () => {
  const caseId = crypto.randomUUID();
  const form = new FormData();
  form.append('caseId', caseId);
  form.append('file', new Blob([new Uint8Array(10 * MiB + 1)]), 'too-large.bin');

  const response = await fetch('http://127.0.0.1:3000/api/evidence', {
    method: 'POST',
    body: form,
  });
  expect(response.status).toBe(413);

  await expect.poll(async () => {
    const audit = await fetch(\`http://127.0.0.1:3000/test-support/uploads/\${caseId}\`);
    return audit.json();
  }).toEqual({ databaseRows: 0, temporaryFiles: 0, objects: 0 });
});
\`\`\`

Never expose test-support endpoints in production. An alternative is to run the service with an injected storage adapter whose calls the integration test can inspect.

## Performance checks without invented throughput targets

Size-limit tests should measure that rejection occurs near the threshold and resources return to baseline, but the acceptable duration and memory ceiling must come from service objectives and deployment capacity. Record process memory, temporary disk usage, open connections, and object-store multipart sessions during concurrent oversized attempts. Report observations rather than declaring a universal safe number.

Rate limits and concurrency controls matter because an attacker can send many slow bodies that never individually cross the cap. That is a distinct slow-upload resilience test, not a reason to overload every functional boundary case.

For request design, assertions, and environment layering beyond uploads, use the [API testing best practices guide](/blog/api-testing-best-practices-guide).

## Keep errors stable across rejection layers

When the application owns a 413 response, assert a documented code, byte maximum, field name, and correlation ID. An edge proxy may instead return HTML or no body because the request never reached application code. Decide whether infrastructure must emit the product envelope or whether clients normalize several known 413 shapes.

\`\`\`ts
it('returns the application file-size policy', async () => {
  const response = await uploadFile(10 * MiB + 1, 'boundary.bin');
  expect(response.status).toBe(413);
  expect(response.headers.get('content-type')).toMatch(/^application\/json/);
  await expect(response.json()).resolves.toMatchObject({
    code: 'FILE_TOO_LARGE',
    maxFileBytes: 10 * MiB,
    field: 'file',
  });
});
\`\`\`

Do not assert this body in a case intentionally targeting a proxy without that contract. Name cases by their network entry point.

## Cross content type with byte boundaries

MIME labels are untrusted and independent from size. An attacker can label executable data as PNG, and a valid client may omit a type. Combine accepted, mismatched, missing, and forbidden types with boundary sizes so validation order cannot cause full buffering of an obviously oversized body.

| Size | Declared type | Bytes | Policy focus |
|---|---|---|---|
| Below cap | PNG | Valid PNG signature | Normal acceptance |
| Below cap | PNG | Executable signature | Content mismatch |
| Above cap | Allowed | Valid prefix | Early size termination |
| Exact cap | Missing | Allowed content | Missing-type rule |
| Empty | Generic binary | No bytes | Empty-file rule |

Scanning and parsing may be asynchronous. Confirm oversized requests never queue expensive scanners and unscanned accepted files remain quarantined.

## Direct-to-object-store uploads change the test point

With signed upload URLs, the application may receive only metadata while bytes travel directly to storage. Validate constraints issued during authorization, object-store enforcement, and server verification before attaching the object. Application multipart tests cannot certify a path they bypass.

Object-store multipart upload, where an object is split into numbered chunks, is different from HTTP \`multipart/form-data\`. Abort incomplete store sessions after failure so uploaded chunks do not remain billable.

Slow and truncated bodies also need dedicated resource tests. A client can pause under the cap or disconnect before the closing boundary. With explicit time limits in an isolated environment, prove parser state, temporary files, and connections are released, then send a normal upload to confirm service health.

## Measure filename overhead explicitly

If infrastructure caps the full body, a longer UTF-8 filename consumes more bytes in \`Content-Disposition\`. Send identical file content with short, long ASCII, and multibyte names near the total-request boundary. This reveals whether the public “file limit” has enough envelope allowance for every filename the product accepts.

Do not calculate Unicode overhead with JavaScript string length. Measure encoded bytes using \`Buffer.byteLength(name, 'utf8')\` and measure the completed body. Normalization can change the byte sequence while leaving text visually equivalent. Define whether the server normalizes before applying its filename-length policy.

## Avoid allocating extreme buffers in every CI run

Exact 10 MiB examples are reasonable, while multi-gigabyte product limits can exhaust test runners. Validate parser counting with a smaller configurable limit in component integration, then run a production-shaped boundary test in an environment provisioned for it. The configuration override must exercise the same code path and units.

Streaming generators prevent one large client allocation, but the server still receives the declared bytes. Monitor runner disk and memory, cap concurrency, and clean fixtures on assertion failure. Never replace an exact boundary test with a forged \`Content-Length\` alone, since servers must not trust that declaration as proof of received size.

Compression introduces another contract question. Standard multipart bodies are not automatically compressed by browsers. If a custom client applies content encoding, decide whether limits apply to transmitted or decoded bytes and test decompression bombs in a security environment. Document the layer responsible so two components do not each interpret “10 MiB” differently.

## Frequently Asked Questions

### Should exactly the advertised maximum file size succeed?

Usually yes if the wording says “up to” that size. Confirm whether the value is decimal or binary and whether it applies to file content or the whole request. Encode the agreed inclusive boundary explicitly.

### Why does a maximum-size file fail only through the reverse proxy?

The proxy may limit total request bytes, while the application limits file bytes. Multipart headers, fields, and delimiters push the request above the proxy cap. Leave justified overhead or align both layers to one clearly documented policy.

### Can I set the multipart Content-Type header when using FormData?

Do not set it manually with browser or standard \`fetch\` FormData. The client generates a boundary and must place that same value in the header. Set it yourself only when sending a deliberately hand-built raw body.

### What should an oversized upload return?

HTTP 413 is the conventional status for content that exceeds an accepted request limit. Your application may add a stable error code and documented maximum. Tests should tolerate only the response variants intentionally produced by known infrastructure layers.

### How do I know a rejected upload did not leave data behind?

Correlate the request with a unique identifier and inspect every persistence stage: database, temporary filesystem, final object, and multipart-upload session. If cleanup is asynchronous, poll to a documented deadline and fail with the remaining resource details.
`,
};
