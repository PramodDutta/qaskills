import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing HTTP Range Requests for File Downloads',
  description:
    'Test HTTP Range requests for file downloads with precise byte boundaries, 206 and 416 assertions, validators, multipart cases, and corruption-resistant checks.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing HTTP Range Requests for File Downloads

Byte 1048576 is requested twice after a download resumes, while byte 1048577 is never written. The final file has the expected length but the wrong hash. Range testing must therefore verify exact bytes and inclusive boundaries, not merely a 206 status or a plausible Content-Length.

HTTP byte ranges support resumable downloads, media seeking, parallel transfer clients, and partial access to large objects. Their surface looks small, yet off-by-one arithmetic, stale validators, compression, proxy behavior, and multi-range formatting create defects that ordinary GET coverage will not reveal.

## Establish an oracle whose bytes cannot be confused

Use a deterministic fixture with content that changes across offsets. A file filled with zeros cannot expose a shifted slice. A short repeating alphabet can hide errors at its period. For integration tests, create a known binary object, calculate its size and digest, and retain a function that returns the expected inclusive slice.

The Range header uses an inclusive end position. For bytes=10-19, a successful single-range representation contains 10 bytes: offsets 10 through 19. In JavaScript, Buffer.subarray(start, endExclusive) requires end + 1.

| Request form | Meaning for a 1000-byte representation | Expected byte count |
|---|---|---|
| bytes=0-0 | First byte only | 1 |
| bytes=0-99 | First hundred bytes | 100 |
| bytes=900- | Offset 900 through the end | 100 |
| bytes=-64 | Final 64 bytes | 64 |
| bytes=999-999 | Last byte only | 1 |
| bytes=1000- | Unsatisfiable start at representation length | 0 response body in common implementations |

Do not derive expected bytes by calling the same range helper used by the server. That duplicates the defect in the oracle. In a service test, read the original fixture directly and slice it with independently reviewed arithmetic.

## Assert the full single-range response

A satisfiable byte-range response normally returns 206 Partial Content. Content-Range identifies the selected interval and complete representation length. Content-Length describes the returned payload length. The body must equal the corresponding original bytes.

This Vitest example uses the standard fetch API against a running service and a local Buffer oracle.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

describe('GET /downloads/manual.bin byte ranges', () => {
  let original: Buffer;
  const url = 'http://127.0.0.1:3000/downloads/manual.bin';

  beforeAll(async () => {
    original = await readFile('test/fixtures/manual.bin');
  });

  it.each([
    [0, 0],
    [0, 127],
    [128, 511],
    [1023, 1023],
  ])('returns the exact inclusive slice %i-%i', async (start, end) => {
    const response = await fetch(url, {
      headers: { Range: \`bytes=\${start}-\${end}\` },
    });
    const actual = Buffer.from(await response.arrayBuffer());
    const expected = original.subarray(start, end + 1);

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe(
      \`bytes \${start}-\${end}/\${original.length}\`,
    );
    expect(Number(response.headers.get('content-length'))).toBe(expected.length);
    expect(createHash('sha256').update(actual).digest('hex')).toBe(
      createHash('sha256').update(expected).digest('hex'),
    );
    expect(actual.equals(expected)).toBe(true);
  });
});
\`\`\`

The hash is redundant beside Buffer.equals for a small fixture, but it mirrors how a large resumed artifact can be verified without retaining several copies. In most functional tests, direct equality is the clearest assertion.

Header names are case-insensitive. The Fetch Headers API normalizes lookup, so get('content-range') is appropriate. Avoid assertions on header order, which has no protocol meaning.

## Cover open-ended and suffix calculations

Clients commonly resume from a known downloaded length using bytes=N-. The returned end is the last offset, representation length minus one. For a nonempty 4096-byte object and start 1024, Content-Range is bytes 1024-4095/4096 and the body contains 3072 bytes.

A suffix request bytes=-N asks for the final N bytes. If N is larger than the current representation, a satisfiable response can include the entire representation. A suffix length of zero does not express a useful range and should be part of invalid-input testing based on the server's standards-compliant parsing behavior.

\`\`\`typescript
it('serves the final 257 bytes for a suffix range', async () => {
  const response = await fetch(url, {
    headers: { Range: 'bytes=-257' },
  });
  const body = Buffer.from(await response.arrayBuffer());
  const start = original.length - 257;

  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toBe(
    \`bytes \${start}-\${original.length - 1}/\${original.length}\`,
  );
  expect(body.equals(original.subarray(start))).toBe(true);
});

it('serves from an offset through the final byte', async () => {
  const start = 513;
  const response = await fetch(url, {
    headers: { Range: \`bytes=\${start}-\` },
  });
  const body = Buffer.from(await response.arrayBuffer());

  expect(response.status).toBe(206);
  expect(body.length).toBe(original.length - start);
  expect(body.equals(original.subarray(start))).toBe(true);
});
\`\`\`

Include odd sizes rather than only powers of two. Boundaries such as 0, 1, chunkSize - 1, chunkSize, chunkSize + 1, length - 1, and length reveal inclusive and buffering defects. If the implementation reads storage in 8 MiB chunks, place test boundaries around 8 MiB while keeping the oracle independent of that internal choice.

## Distinguish ignored ranges from partial responses

A server is permitted to ignore a Range header and return the complete representation with 200 OK. This may occur when the range unit is unsupported, the server chooses not to process ranges, or an intermediary changes behavior. A client test must handle 200 as a full response rather than appending it at the requested offset.

For a server that promises resumable downloads, the product contract can be stricter than the protocol minimum: advertise and honor byte ranges for eligible resources. Express that requirement explicitly. Accept-Ranges: bytes is useful capability metadata, but a client can send Range without first seeing it. Accept-Ranges: none advises that ranges are not supported.

| Response | Client interpretation | Dangerous mistake |
|---|---|---|
| 206 with valid Content-Range | Write body at returned start offset | Assume requested start without parsing response |
| 200 with full body | Replace or restart local file | Append full body to partial file |
| 416 with bytes */length | Reconcile local offset with current size | Retry same invalid offset forever |
| 206 multipart/byteranges | Parse each part and its Content-Range | Treat MIME envelope as file bytes |

Build client-side tests around these distinctions. A robust downloader validates Content-Range before writing, rejects overlapping or unexpected intervals according to its policy, and verifies the final artifact digest when one is available.

## Test unsatisfiable and malformed ranges separately

When none of the requested ranges are satisfiable, the expected status is 416 Range Not Satisfiable. For a byte range, Content-Range should communicate the current complete length as bytes */N. This header lets a resume client learn that its local offset is beyond the remote representation.

\`\`\`typescript
it('reports the representation length for an unsatisfiable start', async () => {
  const response = await fetch(url, {
    headers: { Range: \`bytes=\${original.length}-\` },
  });
  const body = Buffer.from(await response.arrayBuffer());

  expect(response.status).toBe(416);
  expect(response.headers.get('content-range')).toBe(
    \`bytes */\${original.length}\`,
  );
  expect(body.length).toBe(0);
});
\`\`\`

Some frameworks generate an error document for 416, so an empty body may be a product decision rather than a universal requirement. If your API specifies JSON errors, assert the declared media type and schema. The critical range metadata remains Content-Range.

Malformed syntax is not identical to a well-formed but unsatisfiable interval. Cases include a missing unit, nonnumeric positions, reversed endpoints, extra separators, unsupported units, and excessive range counts. Standards and framework behavior can produce an ignored Range with 200 or a rejection depending on the condition. Define expected behavior from the HTTP specification and your API policy, then test it without labeling every bad string as 416.

Security tests should limit range count and complexity. A client can request many tiny or overlapping ranges, forcing allocation and multipart construction. The server may reject or coalesce such input. Assert a bounded, documented response rather than a particular internal limit unless that limit is part of the public contract.

## Validate conditional resume with If-Range

Resuming bytes from a changed object can silently combine two versions. If-Range prevents that corruption. The client sends Range with a strong entity tag or an HTTP date. If the validator matches, the server returns the requested partial content. If it does not match, the server returns the entire current representation instead of a partial segment from the new version.

Test the sequence rather than hardcoding a fabricated ETag:

1. GET or HEAD the object and capture its strong ETag.
2. Request a range with If-Range set to that value.
3. Expect 206 and verify the selected bytes.
4. Replace the object through a controlled fixture or use a definitely nonmatching strong tag.
5. Repeat and expect a full 200 representation.

\`\`\`typescript
it('returns the whole file when If-Range does not match', async () => {
  const response = await fetch(url, {
    headers: {
      Range: 'bytes=512-',
      'If-Range': '"definitely-not-the-current-entity-tag"',
    },
  });
  const body = Buffer.from(await response.arrayBuffer());

  expect(response.status).toBe(200);
  expect(response.headers.get('content-range')).toBeNull();
  expect(body.equals(original)).toBe(true);
});
\`\`\`

Weak entity tags are not suitable for If-Range comparison. Date validators have one-second granularity and are less precise when objects change rapidly. Prefer a strong ETag when the storage and representation pipeline can provide one.

Also ensure ETag identity refers to the selected representation. Content encoding complicates byte offsets: bytes of a gzip-coded representation are not offsets in the decoded file. Tests should control Accept-Encoding or explicitly specify whether ranges apply to encoded output. Many download services disable dynamic compression for already compressed artifacts and large binary files.

## Parse multipart ranges as MIME, not concatenated bytes

A request can contain multiple byte ranges, such as bytes=0-9,100-109. A server that honors multiple satisfiable ranges returns 206 with Content-Type: multipart/byteranges and a boundary parameter. Each body part has its own Content-Range and payload.

Do not assert the literal boundary string or entire raw body. The server chooses the boundary, header ordering can vary, and legal formatting may differ. Parse the media type, split with a MIME-aware parser, then verify each part's Content-Range and bytes. If the product intentionally does not support multipart ranges, test its documented behavior, which may be a full 200 response or another standards-aligned handling strategy.

| Multi-range case | Coverage goal |
|---|---|
| Two disjoint satisfiable ranges | Both parts contain correct intervals and bytes |
| Overlapping ranges | Server coalesces, preserves, or rejects according to policy |
| One satisfiable and one beyond length | Response contains the satisfiable range as allowed by semantics |
| Many tiny intervals | Resource-protection limit is enforced |
| Unordered intervals | Client uses each Content-Range rather than assuming request order |

Client libraries sometimes automatically decompress or normalize multipart responses. For protocol tests, use an HTTP client mode that exposes raw body bytes and headers. Confirm the tool is not hiding the very layer under inspection.

## Reassemble a download and verify the final artifact

Unit assertions on individual responses catch header defects, but a resume workflow test catches write-offset errors. Download an initial segment, simulate interruption, request from the number of bytes safely persisted, append only after validating Content-Range, and compare the completed file with the original digest.

\`\`\`typescript
it('reassembles a file after a simulated interruption', async () => {
  const split = 777;
  const first = await fetch(url, { headers: { Range: \`bytes=0-\${split - 1}\` } });
  const firstBytes = Buffer.from(await first.arrayBuffer());

  const second = await fetch(url, { headers: { Range: \`bytes=\${split}-\` } });
  const secondBytes = Buffer.from(await second.arrayBuffer());
  const assembled = Buffer.concat([firstBytes, secondBytes]);

  expect(first.headers.get('content-range')).toBe(
    \`bytes 0-\${split - 1}/\${original.length}\`,
  );
  expect(second.headers.get('content-range')).toBe(
    \`bytes \${split}-\${original.length - 1}/\${original.length}\`,
  );
  expect(assembled.equals(original)).toBe(true);
});
\`\`\`

Add a changed-validator version of this test for a production downloader. It should discard or replace incompatible partial data when the server returns 200 after If-Range, never concatenate versions.

For general status, schema, authorization, and negative-case principles around endpoints, see the [API testing best practices guide](/blog/api-testing-best-practices-guide). If several services depend on download metadata, the [microservices API contract guide](/blog/api-contract-testing-microservices) helps define which headers and error shapes need provider-consumer protection.

## Include storage and intermediary boundaries

An application-level range implementation may pass locally while a CDN, reverse proxy, object store adapter, or serverless runtime changes it. Test at the closest layer for arithmetic and parsing, then keep a smaller deployed-path suite for the full chain.

Useful deployment cases include:

- A cached 206 does not poison later full GET responses.
- Authorization applies equally to full and partial requests.
- Signed URLs accept Range without invalidating their signature contract.
- The CDN preserves Content-Range and ETag.
- Object replacement changes validators and complete length.
- HEAD reports metadata consistent with GET where the product supports HEAD.
- Content-Disposition filename remains stable on partial responses.

Large-file tests need not download gigabytes on every pull request. Use a compact patterned fixture for exhaustive boundaries, then a scheduled or pre-release scenario around storage chunk transitions and realistic object sizes. Mark duration expectations as environment-specific measurements, not universal protocol requirements.

Log requested Range, returned status, Content-Range, Content-Length, ETag, and correlation ID on failure. Never log signed URL credentials. Those fields usually reveal whether the defect sits in request construction, origin handling, or an intermediary.

## Apply security and caching rules equally to partial content

A Range header must not weaken authorization. Test the same resource with no credentials, expired credentials, another tenant's identity, and a valid identity. Unauthorized requests should not reveal the representation length through Content-Range if the ordinary endpoint conceals resource existence. The exact 401 or 404 policy belongs to the API, but full and partial paths must agree.

Caching adds another representation boundary. A cache key that ignores Range can serve a stored 206 body as though it were a complete 200 response. Conversely, a full cached object may be capable of satisfying a later range if the intermediary implements range caching correctly. Deployed-path tests should request a partial segment, then a full object, then a different segment, verifying status, headers, bytes, Age or cache diagnostics where available, and the final digest.

Check content negotiation as well. If authorization, locale, or Accept-Encoding changes the selected representation, validators and cache variation must distinguish those forms. Reusing an ETag across byte-incompatible representations can corrupt resume behavior even when each isolated response looks correct.

Avoid asserting vendor-specific cache headers in origin unit tests. Keep origin coverage focused on HTTP representation semantics, and run a compact suite through the actual CDN configuration. That division identifies whether a failing Content-Range was generated incorrectly or altered after leaving the service.

## Frequently Asked Questions

### Is the end value in a Range header inclusive?

Yes. bytes=0-9 requests ten bytes. A JavaScript slice uses an exclusive end, so the equivalent Buffer call is subarray(0, 10). This mismatch is a common source of gaps and duplicates.

### Must a server return 206 whenever Range is present?

No. A server can ignore Range and send a full 200 representation. If resumability is a product guarantee, test the stricter application contract for eligible resources and ensure the client safely handles a full response.

### What should Content-Range contain on a 416 response?

For an unsatisfied byte-range request, it should communicate the current representation length in the form bytes */N. This lets a client detect that its stored offset no longer fits the remote object.

### Can I test resume correctness using only Content-Length?

No. Content-Length says how many bytes arrived, not which offsets they represent. Validate status, Content-Range, payload bytes, and ideally the final artifact digest after reassembly.

### How does compression affect byte positions?

Ranges apply to the selected representation, including its content coding. Automatic gzip can make offsets refer to encoded bytes rather than the decoded file a client expects. Control Accept-Encoding and test the service's documented representation policy.
`,
};
