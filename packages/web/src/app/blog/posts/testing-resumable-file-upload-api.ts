import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing a Resumable File-Upload API',
  description:
    'Test a resumable file-upload API for byte offsets, interrupted transfers, retries, ordering, integrity, expiration, and safe recovery behavior.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing a Resumable File-Upload API

Byte 524,288 is where the connection vanishes. The client cannot assume the server stored the whole chunk, the server cannot trust the client's last local counter, and retrying from byte zero may duplicate data or waste minutes. A resumable upload protocol succeeds only when both sides reconcile against persisted server state.

This guide uses tus 1.0 semantics as a concrete protocol: create an upload resource, discover its \'Upload-Offset\' with \'HEAD\', and append bytes with \'PATCH\'. The same test reasoning applies to proprietary multipart and session APIs, but expected status codes and headers must come from their own contract.

## Model the upload as an append-only byte sequence

Ignore filenames for a moment. The core resource has a declared total length, a persisted byte sequence, and a current offset equal to the number of accepted bytes. A valid patch starts exactly at that offset. After accepting N bytes, the new offset is old offset plus N. That invariant is the center of the suite.

| State | Server offset | Legal client action | Expected state change |
| --- | ---: | --- | --- |
| Newly created | 0 | Patch bytes beginning at 0 | Offset advances by stored bytes |
| Partially uploaded | Between 0 and length | Head, then patch from returned offset | Existing prefix remains unchanged |
| Completed | Equals length | Head for confirmation | Offset and length remain equal |
| Offset disagreement | Any persisted value | Patch from another value | Conflict, no bytes modified |
| Expired or terminated | Resource unavailable | Head or patch | Not found or gone per contract |

Chunk numbers are a client convenience. The wire contract is about byte offsets. A 1 MiB first chunk followed by a 256 KiB second chunk is valid if offsets are contiguous. Conversely, "chunk 3" is meaningless unless the client knows the exact sizes of chunks 1 and 2.

Use binary fixtures that expose ordering mistakes. Repeated zero bytes are poor evidence because duplication and transposition can look identical. Construct chunks with different deterministic patterns, then verify a digest or retrieve the assembled object through the product's supported download path.

## Exercise creation, interruption, discovery, and resume

The following Vitest integration test uses the built-in Node \'fetch\' API and the tus creation extension. Set \'TUS_ENDPOINT\' to a test server's creation URL. It uploads one prefix, simulates a stopped client simply by ending the request sequence, asks the server for its durable offset, then sends the remainder.

\`\`\`ts
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

const endpoint = process.env.TUS_ENDPOINT ?? 'http://127.0.0.1:1080/files/';
const tusHeaders = { 'Tus-Resumable': '1.0.0' };

async function createUpload(bytes: Uint8Array): Promise<URL> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...tusHeaders,
      'Upload-Length': String(bytes.byteLength),
      'Upload-Metadata':
        'filename ' + Buffer.from('evidence.bin').toString('base64'),
    },
  });

  expect(response.status).toBe(201);
  const location = response.headers.get('location');
  expect(location).toBeTruthy();
  return new URL(location!, endpoint);
}

async function patch(url: URL, offset: number, body: Uint8Array) {
  return fetch(url, {
    method: 'PATCH',
    headers: {
      ...tusHeaders,
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': String(offset),
    },
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

describe('resumable upload', () => {
  test('continues from the server-reported durable offset', async () => {
    const source = Uint8Array.from({ length: 1024 }, (_, index) => (index * 31) % 251);
    const url = await createUpload(source);

    const first = await patch(url, 0, source.slice(0, 333));
    expect(first.status).toBe(204);
    expect(first.headers.get('upload-offset')).toBe('333');

    const head = await fetch(url, { method: 'HEAD', headers: tusHeaders });
    expect([200, 204]).toContain(head.status);
    expect(head.headers.get('upload-offset')).toBe('333');
    expect(head.headers.get('upload-length')).toBe('1024');
    expect(head.headers.get('cache-control')).toContain('no-store');

    const resumed = await patch(url, 333, source.slice(333));
    expect(resumed.status).toBe(204);
    expect(resumed.headers.get('upload-offset')).toBe('1024');

    const expectedDigest = createHash('sha256').update(source).digest('hex');
    expect(expectedDigest).toMatch(/^[0-9a-f]{64}$/);
  });
});
\`\`\`

The final digest in this sample proves the source fixture is deterministic, not that the server stored it. Connect the test to the application's supported object download, finalize endpoint, or test-only storage verifier and compare that object's SHA-256 digest with \'expectedDigest\'. Do not invent a GET-on-upload-resource behavior if the protocol does not define one.

Node's streaming fetch currently requires \'duplex: \'half\'\' in relevant environments, hence the typed intersection. A \'Uint8Array\' body is finite, but keeping the option makes the example usable when the helper later accepts a stream. If your runtime does not require it, remove only after executing the test in the supported Node version.

The broader [API testing best practices guide](/blog/api-testing-best-practices-guide) helps place this protocol suite among schema, authentication, observability, and environment controls.

## Force offset disagreements before testing happy retries

The most dangerous client bug is replaying a chunk without reconciling offset. Imagine the server stores all 333 bytes but the response is lost. The client thinks the patch failed. Sending those bytes again at offset 0 must not append a duplicate prefix. Under tus, a mismatched \'Upload-Offset\' returns 409 and does not modify the resource.

\`\`\`ts
import { expect, test } from 'vitest';

test('rejects stale and future offsets without changing persisted progress', async () => {
  const bytes = new TextEncoder().encode('AAAAABBBBBCCCCC');
  const url = await createUpload(bytes);

  const accepted = await patch(url, 0, bytes.slice(0, 5));
  expect(accepted.status).toBe(204);
  expect(accepted.headers.get('upload-offset')).toBe('5');

  const staleReplay = await patch(url, 0, bytes.slice(0, 5));
  expect(staleReplay.status).toBe(409);

  const futureGap = await patch(url, 10, bytes.slice(10));
  expect(futureGap.status).toBe(409);

  const head = await fetch(url, {
    method: 'HEAD',
    headers: { 'Tus-Resumable': '1.0.0' },
  });
  expect(head.headers.get('upload-offset')).toBe('5');

  const finish = await patch(url, 5, bytes.slice(5));
  expect(finish.status).toBe(204);
  expect(finish.headers.get('upload-offset')).toBe('15');
});
\`\`\`

This single case distinguishes three behaviors: correct append, rejected duplicate, and rejected gap. Always issue \'HEAD\' after each negative patch to prove immutability. A 409 alone is insufficient if the implementation wrote bytes before noticing the mismatch.

Concurrent patch requests against one upload deserve a related case. Launch two patches with the same current offset but different bodies. At most one can legitimately advance the resource under the core sequential protocol. The other should conflict after the winner establishes a new offset. Do not assert which body wins unless the service contract specifies scheduling. Assert one accepted result, one conflict, the resulting offset, and final stored bytes.

## Cut connections at three distinct moments

"Network interruption" is not one test. The storage outcome differs based on where the connection ends:

| Interruption point | What the client knows | What may be durable | Required recovery probe |
| --- | --- | --- | --- |
| Before request headers reach server | No response | Usually nothing, but client cannot assume | Head the resource |
| During request body | Transport error | Any accepted prefix if implementation streams | Head and resume from returned offset |
| After server commits, before response arrives | Transport error | Entire patch may be durable | Head before replay |
| During the next Head response | No trustworthy offset | Upload state unchanged | Repeat Head with backoff |

Application-level mocks that throw before \'fetch\' do not cover server parsing, proxy buffering, or partial writes. Use a controllable TCP proxy or fault-injection layer in an integration environment. Cut the upstream connection after a byte threshold, and run the probe against the same reverse proxy, timeout policy, object store, and load-balancing path used in deployment.

The assertion remains protocol-level: after connectivity returns, \'HEAD\' reports the authoritative offset; bytes before that offset match the source prefix; resuming from it yields exactly the original object. The server is allowed to persist as much as it safely received. Tests should not assume every mid-body disconnect leaves either zero bytes or a full chunk unless the implementation promises atomic chunk storage.

Repeat faults around storage boundaries. Small in-memory tests may never expose buffering thresholds, multipart part sizes, disk flushes, or object-store commit behavior. Select boundary values from the implementation and infrastructure, then document why each case exists.

## Validate length, media type, and version errors

Protocol negative cases should assert both response and non-mutation. For tus 1.0 core behavior:

- Every request and response except \'OPTIONS\' carries \'Tus-Resumable: 1.0.0\'. An unsupported requested version produces 412 with supported versions advertised.
- A patch uses \'Content-Type: application/offset+octet-stream\'. A wrong media type should produce 415.
- Offsets are nonnegative integers and must equal current server offset.
- A successful patch returns 204 and the new \'Upload-Offset\'.
- A successful head returns 200 or 204, includes the offset, includes known total length, and prevents caching with \'Cache-Control: no-store\'.

Test zero-length uploads separately. With the creation extension, \'Upload-Length: 0\' creates an upload already complete. There should be no need to send an empty patch merely to trigger finalization unless the product layers a separate processing workflow on top.

Test a patch that would exceed declared total length according to the server's documented behavior. The core tus text defines the length and offset invariants but implementations may express overrun errors differently. Lock the status code only if your public contract specifies it. Regardless of status, assert that the stored resource is not silently longer than the declared upload.

Metadata is another attack surface. In tus creation, values are Base64 encoded while keys have strict separator constraints. Test duplicate keys, invalid Base64, oversized values, control-character attempts after decoding, and filenames with Unicode. The storage layer must not use untrusted filenames as paths. A safe service generates its own object key and treats filename as display metadata.

## Completion is not the same as processing success

Offset equal to upload length means byte transfer is complete. It does not automatically mean antivirus scanning, media transcoding, archive extraction, document indexing, or database association succeeded. Separate transfer state from processing state.

An API may emit an event or expose a job resource after completion. Test that transition with its own contract:

1. Complete the bytes and confirm final offset.
2. Observe exactly one processing trigger for the upload identity.
3. Retry the final client action or poll again.
4. Confirm processing is not duplicated.
5. Verify failed processing preserves an auditable terminal state and does not misreport the transfer as incomplete.

If clients can attach an upload to a domain record, authorization must be checked at creation and final association. Possession of an upload URL should not let one tenant attach another tenant's object. The [API contract testing for microservices guide](/blog/api-contract-testing-microservices) is relevant when uploader, storage callback, scanner, and consuming service exchange events or payloads.

## Checksum coverage belongs at the correct layer

Transport success does not prove content integrity. Compare a digest of the source with the finalized object. If the server supports the tus checksum extension, discover it through \'OPTIONS\' rather than sending unsupported headers optimistically. The extension advertises algorithms and lets a patch carry \'Upload-Checksum\'. A mismatch must discard that chunk and leave the offset unchanged.

There are three useful integrity scopes:

| Digest scope | Detects | Does not independently detect |
| --- | --- | --- |
| Per-patch checksum | Corruption within one submitted patch | Misordered valid patches if offsets are mishandled |
| Final object digest | Any difference in assembled bytes | Which transfer stage caused the difference |
| Application file validation | Invalid file structure or unsafe content | Arbitrary bit changes that remain structurally valid |

Use at least final-object comparison in integration tests. Add patch checksums when the deployed server and client negotiate that extension. Do not label a Base64 encoding as a checksum; it is only an encoding.

## Expiration, cleanup, and authorization cases

Incomplete resources consume storage. If expiration is supported, creation or patch responses can expose \'Upload-Expires\'. Build tests with a controllable clock or a short test-only policy, then verify behavior before and after expiry. A removed resource may respond 404 or 410 as defined by the service and protocol. The client should begin a new upload rather than guessing that offset zero is safe on the old URL.

Termination, if advertised, lets a client delete an upload resource. Verify that deletion frees or schedules cleanup, repeated termination follows documented idempotency, and subsequent head and patch requests cannot resurrect bytes. Avoid tests that inspect an object-store bucket directly unless storage layout is a supported internal contract. Prefer observable resource state plus a dedicated administrative verifier.

Authorization scenarios should include:

- User B cannot head, patch, terminate, or finalize User A's upload.
- Revoked credentials cannot continue an existing URL.
- An upload URL leaked without credentials is insufficient if the API promises authenticated access.
- Tenant limits count incomplete uploads and recover capacity after expiry or termination.
- Metadata cannot choose another tenant's storage namespace.

Return-code privacy matters. Some services use 404 instead of 403 to avoid disclosing that another user's upload exists. Test the declared security behavior, not a generic preference.

## Make the suite observable without coupling to storage internals

Correlate creation, patch, head, and processing logs with one upload ID. Record offsets before and after each operation, request byte counts, status, and safe error classifications. Never log body bytes, access tokens, or arbitrary decoded metadata.

Metrics can reveal patterns the deterministic suite cannot: conflict rates, resume counts, age of abandoned uploads, processing lag, and bytes retransmitted. Avoid declaring universal alert thresholds. Establish baselines from your traffic, then test that dashboards distinguish client offset bugs from infrastructure interruptions.

Keep a compact conformance suite on every change and a slower fault suite in an environment that can cut real connections. Run large-file and long-expiration cases on a schedule if cost makes them unsuitable for every commit. The layers answer different questions and should not be conflated.

## Probe proxy buffering and request limits

The application server may support streaming patches while the reverse proxy buffers the entire body. In that deployment, cutting the client connection halfway can leave the application with zero observed bytes even though a direct-server test persisted a prefix. Neither result is automatically wrong, but recovery must still follow the server-reported offset and operational capacity must account for buffering.

Run the same interruption cases through each supported ingress path. Record whether the proxy returns its own timeout or body-size error, whether \'Tus-Resumable\' survives error responses, and whether the upload resource remains queryable. A proxy-generated 413 or 504 should not advance application offset unless bytes were durably accepted under the service contract.

Request-size limits must be compatible with client chunk strategy. Test a patch just below, at, and just above the configured limit using binary bodies. If an oversized patch is rejected, issue \'HEAD\' and verify its bytes were not appended. Then retry the same remaining source as smaller valid patches and confirm final integrity.

## Recover client state after a process restart

Browser refresh and mobile process death erase in-memory counters. A resumable client needs durable association between the local file, upload URL, authentication context, and relevant metadata. Test a genuine client restart: create and partially upload, serialize only the supported resume record, construct a fresh client instance, head the resource, and continue.

Do not trust a locally stored offset after restart. It is only a hint. The server can be ahead because an acknowledgement was lost, or the resource can be expired. Also verify that a resume record cannot be used with a different local file of the same name. Compare size and a safe fingerprint policy, then let final server-side integrity catch any mismatch.

Multiple tabs or processes can load the same resume record. Coordinate ownership or rely on offset conflict plus reconciliation. Add a case where both resume simultaneously and prove the resulting object contains one ordered copy, not interleaved chunks.

## Frequently Asked Questions

### Should a client resend the last chunk after a timeout?

Not before reconciling. The server may have persisted some or all of it even though the response was lost. Issue \'HEAD\', read the authoritative offset, and send bytes beginning there.

### How do I prove a rejected stale offset did not corrupt the upload?

Read the offset after the 409, finish from that offset, then compare the finalized object's digest and length with the original source. Status alone does not prove non-mutation.

### Is random chunk sizing useful in this suite?

Yes, as a supplemental property test. Keep deterministic boundary examples for diagnosis, then generate chunk partitions whose sizes sum to the file length and assert the same offset invariant after every accepted patch.

### Can two chunks be uploaded in parallel to one tus resource?

Not with the core sequential append flow. The concatenation extension supports parallel partial uploads that are later assembled. Discover support and test its ordering rules separately.

### What should happen when an incomplete upload expires?

The client should receive the service's documented unavailable response, commonly 404 or 410, and start a new upload. It must not continue using a guessed offset on the expired URL.
`,
};
