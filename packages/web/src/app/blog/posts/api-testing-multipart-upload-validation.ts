import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Multipart Upload Validation: Files, Fields, and Failure Modes',
  description: 'API testing multipart upload validation guide for proving file metadata, boundaries, errors, cleanup behavior, and safer release gates in CI.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# API Testing Multipart Upload Validation: Files, Fields, and Failure Modes

API testing multipart upload validation proves that an endpoint accepts exactly the files and form fields your product promises, rejects dangerous or malformed inputs, and leaves the system in a known state after every success or failure. A good multipart test does more than call \`attach()\` and expect \`201\`. It checks content type handling, filename normalization, file size limits, field validation, storage writes, database records, error envelopes, and cleanup behavior.

For QA and test-automation engineers, the practical workflow is to treat multipart uploads as a contract with three parts: HTTP framing, application validation, and downstream side effects. The HTTP layer must parse the multipart boundary and stream the file. The application layer must validate file and field rules. The side-effect layer must prove that object storage, virus scanning, queue messages, and database rows match the final response.

This guide uses Node, TypeScript, Supertest, and realistic fake storage examples. If you need a broader HTTP testing foundation, pair this workflow with [Supertest Node API Testing Complete Guide](/blog/supertest-node-api-testing-complete-guide). If upload behavior is consumed by another service or frontend team, use the compatibility strategy from [Contract Testing Pact Complete Guide](/blog/contract-testing-pact-complete-guide) alongside the API tests here.

## Map the Multipart Contract Before Writing Tests

Multipart endpoints are deceptively large. The request body contains one or more named parts, and each part can have its own headers, filename, media type, and byte stream. The API response often includes computed metadata such as size, checksum, dimensions, scan status, public URL, or a generated asset ID. That means the test contract should list every observable promise before a test runner touches the endpoint.

Start by writing the upload contract as a small matrix. This prevents a common failure where the test only validates the happy path and misses that the endpoint accepts an unexpected field name or silently stores an unapproved file type.

| Contract area | Example promise | Test evidence to collect |
|---|---|---|
| Part names | File must be sent as \`avatar\` | Missing and wrong field-name tests fail clearly |
| File metadata | Original filename is sanitized before persistence | Response and database never expose unsafe path text |
| Byte limits | Files over 2 MB are rejected | Oversized fixture returns \`413\` or documented validation status |
| Media type | Only PNG and JPEG are accepted | Declared type and detected type are both checked |
| Form fields | \`purpose\` must be \`profile\` or \`support\` | Invalid enum is rejected before storage commit |
| Side effects | Stored object key belongs to authenticated user | Storage fake records key, bytes, and metadata |
| Failure cleanup | Rejected upload leaves no durable object | Storage fake has no committed object after failure |

The contract should also state ordering rules. If your server validates fields before storing the stream, a bad \`purpose\` should leave no object. If the server streams to temporary storage first, the test should prove the temporary object is deleted or marked for cleanup. QA engineers often find production upload bugs in this boundary between parser behavior and cleanup behavior.

## Build Fixtures That Say What They Are

Binary fixtures should be small, deterministic, and named by intent. Do not rely on random screenshots from a developer desktop. Put minimal valid files under a fixture directory, and generate oversized or malformed content in the test when that makes the intent clearer. For image validation, use a known tiny PNG or JPEG with stable bytes. For type mismatch tests, use text bytes with a misleading filename and declared content type.

\`\`\`bash
tests/
  fixtures/
    upload/
      avatar-valid.png
      avatar-valid.jpg
      notes.txt
      renamed.exe.txt
      empty.bin
\`\`\`

Keep file creation close to the test when the bytes are part of the scenario. This example creates a buffer that claims to be a PNG through multipart metadata but is really plain text. That exposes handlers that trust \`Content-Type\` without sniffing or deeper validation.

\`\`\`ts
import { Buffer } from 'node:buffer';

export function fakePngNamedText(): Buffer {
  return Buffer.from('this is not a real image file', 'utf8');
}

export function bytesOfSize(sizeInBytes: number): Buffer {
  return Buffer.alloc(sizeInBytes, 0x61);
}
\`\`\`

The exact file-type detection library belongs to the application, not the test article. The test should assert the business outcome: invalid content is rejected, no asset record is visible, and no committed object remains. Avoid asserting private parser internals unless your team owns that parser and intentionally exposes those diagnostics.

## Exercise the Endpoint Through the Real Multipart Parser

A multipart upload test should go through the same HTTP stack used in production. Calling the controller with a fabricated object can be useful for unit tests, but it will not catch boundary parsing errors, field-name mismatches, file stream truncation, or middleware ordering problems. Use Supertest or the equivalent client for your platform to send a real multipart request.

\`\`\`ts
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

const fixturePath = (...parts: string[]) =>
  path.join(process.cwd(), 'tests', 'fixtures', 'upload', ...parts);

describe('POST /v1/me/avatar multipart upload', () => {
  it('stores a valid avatar and returns normalized metadata', async () => {
    const app = await createApp({ storage: 'memory' });

    const response = await request(app)
      .post('/v1/me/avatar')
      .set('Authorization', 'Bearer test-user-token')
      .field('purpose', 'profile')
      .attach('avatar', fixturePath('avatar-valid.png'));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      purpose: 'profile',
      mediaType: 'image/png',
      originalName: 'avatar-valid.png',
      status: 'pending_scan',
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.size).toBeGreaterThan(0);
  });
});
\`\`\`

This is the first confidence checkpoint, not the full suite. It proves that the endpoint can parse multipart, bind a file to the expected field, bind a scalar form field, authenticate the caller, and return a useful response. The rest of the suite should narrow the surface by attacking one rule at a time.

## Validate Form Fields Separately From File Rules

Multipart form fields are strings when they arrive. If the endpoint accepts \`expiresInDays\`, \`isPublic\`, or a JSON metadata field, the application must parse and validate those values deliberately. Test automation should cover both the incoming text value and the normalized value returned or stored by the service.

| Incoming field | Risk | Validation check |
|---|---|---|
| \`purpose=support\` | Valid alternate enum path ignored by happy path | Response stores \`support\` and routes to support bucket |
| \`purpose=admin\` | Privilege escalation through unreviewed purpose | Response returns documented validation error |
| \`expiresInDays=7\` | Numeric string parsed incorrectly | Stored expiry is based on integer 7 |
| \`expiresInDays=7.5\` | Float accepted where integer is required | Request is rejected |
| \`metadata={"ticketId":"T-1"}\` | JSON field accepted but not schema checked | Invalid JSON and invalid shape both fail |

A focused field-validation test keeps the attached file valid so the failure points to the field rule. Mixing a bad field with a bad file makes failures hard to diagnose because either validation branch may run first.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';

it('rejects an unsupported upload purpose without storing the file', async () => {
  const { app, storage } = await createTestServer();

  const response = await request(app)
    .post('/v1/me/avatar')
    .set('Authorization', 'Bearer test-user-token')
    .field('purpose', 'admin')
    .attach('avatar', fixturePath('avatar-valid.png'));

  expect(response.status).toBe(422);
  expect(response.body).toMatchObject({
    error: {
      code: 'VALIDATION_ERROR',
      fields: {
        purpose: 'Unsupported upload purpose',
      },
    },
  });
  expect(storage.committedKeys()).toEqual([]);
});
\`\`\`

This style gives a QA engineer direct evidence for a bug report: the invalid field was accepted far enough to parse, the API returned the expected validation status, and storage remained untouched. If storage shows a committed key, the issue is no longer just validation. It is a cleanup or transaction-boundary bug.

## Prove File Type Checks Cannot Be Fooled by Metadata

The easiest multipart upload bug to miss is trusting the client-provided media type. A client can declare \`image/png\` while sending JavaScript, text, or a renamed executable. The server may still use the declared type for display decisions, CDN metadata, or downstream processing. Your tests should include mismatches between extension, declared content type, and actual bytes.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { fakePngNamedText } from './upload-fixtures';

it('rejects text bytes even when the multipart part declares image/png', async () => {
  const { app, storage } = await createTestServer();

  const response = await request(app)
    .post('/v1/me/avatar')
    .set('Authorization', 'Bearer test-user-token')
    .field('purpose', 'profile')
    .attach('avatar', fakePngNamedText(), {
      filename: 'avatar.png',
      contentType: 'image/png',
    });

  expect(response.status).toBe(415);
  expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  expect(storage.committedKeys()).toEqual([]);
});
\`\`\`

Do not over-specify how the server detects the type unless that is part of your public contract. The robust assertion is that the mismatch is rejected. If your organization documents that the server uses magic-byte inspection, then add a lower-level test for the detector. Keep the API test focused on behavior at the boundary.

## Treat Size Limits as Streaming Behavior, Not Just Schema Rules

Size limits are not the same as JSON field limits. The server may reject a file before the entire stream is consumed, after buffering it in memory, after writing a temporary object, or after storage returns an error. Tests should verify the external status and the system state after rejection. They should also avoid committing large binary fixtures to the repository.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { bytesOfSize } from './upload-fixtures';

it('rejects an avatar that exceeds the configured byte limit', async () => {
  const { app, storage } = await createTestServer({
    uploadLimits: { avatarBytes: 1024 },
  });

  const response = await request(app)
    .post('/v1/me/avatar')
    .set('Authorization', 'Bearer test-user-token')
    .field('purpose', 'profile')
    .attach('avatar', bytesOfSize(1025), {
      filename: 'large.png',
      contentType: 'image/png',
    });

  expect([413, 422]).toContain(response.status);
  expect(response.body.error.code).toMatch(/FILE_TOO_LARGE|PAYLOAD_TOO_LARGE/);
  expect(storage.committedKeys()).toEqual([]);
});
\`\`\`

The status code depends on your API standard. Some teams use \`413 Payload Too Large\` for transport-size failures and \`422\` for business validation. Either can be defensible if the contract is documented and consistent. What is not defensible is accepting the file, truncating it silently, and returning success. Add a regression test if you ever see a stored object whose byte length is lower than the uploaded buffer.

## Use a Storage Fake That Records Bytes and Metadata

Mocking storage with \`vi.fn()\` or \`jest.fn()\` catches that a call happened, but it rarely catches the wrong key, wrong content type, missing checksum, or forgotten cleanup. A better fake is small and stateful. It behaves like an in-memory object store and exposes inspection methods for tests.

\`\`\`ts
type StoredObject = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata: Record<string, string>;
};

export class MemoryObjectStorage {
  private readonly objects = new Map<string, StoredObject>();

  async putObject(input: StoredObject): Promise<void> {
    this.objects.set(input.key, {
      ...input,
      body: Buffer.from(input.body),
    });
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  getObject(key: string): StoredObject | undefined {
    return this.objects.get(key);
  }

  committedKeys(): string[] {
    return [...this.objects.keys()].sort();
  }
}
\`\`\`

Now the API test can verify side effects without reaching a real cloud account. This is not a replacement for one scheduled integration test against real storage. It is the fast pull-request layer that catches logic regressions before they become expensive environment failures.

| Storage check | Bug it catches | Example assertion |
|---|---|---|
| Key prefix includes user ID | Cross-tenant object visibility | \`expect(key).toMatch(/^users\\\\/user-123\\\\//)\` |
| Metadata includes checksum | Processor cannot verify bytes later | \`expect(object.metadata.sha256).toEqual(hash)\` |
| Content type is normalized | CDN serves unsafe type | \`expect(object.contentType).toBe('image/png')\` |
| Failed validation leaves no key | Temporary object leaked | \`expect(storage.committedKeys()).toEqual([])\` |
| Replacement deletes old object | Orphaned storage cost grows | \`expect(keys).not.toContain(oldKey)\` |

When storage keys include timestamps or random IDs, assert the deterministic prefix and persisted database reference. Do not snapshot a full key that changes every run. Stable partial assertions produce less noise and still catch the security-relevant bug.

## Check Database Records as Public State, Not Implementation Trivia

Most upload endpoints create an asset row, media row, scan job, or audit entry. Validate the records that matter to the product contract. Avoid asserting every column because that couples tests to internal implementation, but do assert ownership, status, storage key, byte size, content type, and correlation IDs that downstream systems require.

\`\`\`ts
import { expect, it } from 'vitest';

it('creates an asset row that points to the committed object', async () => {
  const { app, db, storage } = await createTestServer();

  const response = await uploadAvatar(app, {
    token: 'test-user-token',
    file: fixturePath('avatar-valid.jpg'),
    purpose: 'profile',
  });

  expect(response.status).toBe(201);

  const asset = await db.asset.findUniqueOrThrow({
    where: { id: response.body.id },
  });
  const stored = storage.getObject(asset.storageKey);

  expect(asset.userId).toBe('user-123');
  expect(asset.status).toBe('pending_scan');
  expect(asset.byteSize).toBe(stored?.body.length);
  expect(stored?.contentType).toBe('image/jpeg');
});
\`\`\`

If this test fails because the database row exists but storage does not, the API has an atomicity problem. If storage exists but the row does not, the cleanup path is missing. If both exist but ownership is wrong, that is a security defect, not just a data-quality issue.

## Diagnose Boundary and Parser Failures With Raw Requests

Framework helpers are convenient, but they can hide malformed multipart requests. Keep at least one negative test that sends an intentionally broken body with a mismatched boundary. This catches middleware behavior changes and proves the API responds with a controlled error instead of an HTML stack trace or connection reset.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';

it('returns a controlled error for malformed multipart boundaries', async () => {
  const { app } = await createTestServer();

  const response = await request(app)
    .post('/v1/me/avatar')
    .set('Authorization', 'Bearer test-user-token')
    .set('Content-Type', 'multipart/form-data; boundary=declared')
    .send(
      [
        '--actual',
        'Content-Disposition: form-data; name="purpose"',
        '',
        'profile',
        '--actual--',
      ].join('\\r\\n'),
    );

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe('MALFORMED_MULTIPART');
});
\`\`\`

This is where many suites become too polite. Normal client helpers create valid boundaries by design. Production traffic includes mobile SDK bugs, reverse proxy rewrites, interrupted uploads, and clients that manually construct requests. Your API should handle those cases with bounded memory, bounded time, and a structured error.

## Keep Error Envelopes Stable Across Upload Failures

Upload errors often come from different layers: authentication middleware, multipart parser, validation service, storage adapter, scanner, and database transaction. If each layer leaks its native error shape, clients have to implement a pile of special cases. Tests should verify that every upload failure returns the same envelope shape even when the status code differs.

\`\`\`ts
type UploadCase = {
  name: string;
  build: (agent: request.Test) => request.Test;
  expectedStatus: number;
  expectedCode: string;
};

const cases: UploadCase[] = [
  {
    name: 'missing file part',
    build: (agent) => agent.field('purpose', 'profile'),
    expectedStatus: 422,
    expectedCode: 'FILE_REQUIRED',
  },
  {
    name: 'wrong file field name',
    build: (agent) =>
      agent.field('purpose', 'profile').attach('document', fixturePath('avatar-valid.png')),
    expectedStatus: 422,
    expectedCode: 'FILE_REQUIRED',
  },
  {
    name: 'unsupported media type',
    build: (agent) =>
      agent.field('purpose', 'profile').attach('avatar', fixturePath('notes.txt')),
    expectedStatus: 415,
    expectedCode: 'UNSUPPORTED_MEDIA_TYPE',
  },
];

it.each(cases)('$name returns the upload error envelope', async (testCase) => {
  const { app } = await createTestServer();
  const agent = request(app)
    .post('/v1/me/avatar')
    .set('Authorization', 'Bearer test-user-token');

  const response = await testCase.build(agent);

  expect(response.status).toBe(testCase.expectedStatus);
  expect(response.body).toMatchObject({
    error: {
      code: testCase.expectedCode,
    },
  });
  expect(response.body.error.message).toEqual(expect.any(String));
});
\`\`\`

The value of this table-driven test is not fewer lines of code. The value is that a new failure mode has to join the same public error contract. When an AI coding agent adds support for another file field, ask it to add both a success case and a row in the failure matrix before accepting the change.

## Separate Contract Tests From Deep Upload Behavior

Consumer-driven contract tests are useful for upload APIs, but they should not carry every byte-level validation rule. A consumer usually needs to know the field name, required form fields, response shape, and main error cases. The provider test suite should own parser edge cases, storage cleanup, virus-scan transitions, and dangerous payload handling.

| Test type | Good upload responsibility | Poor fit |
|---|---|---|
| Unit test | Filename sanitizer, checksum helper, media detector wrapper | Full HTTP multipart parsing |
| API integration test | Parser, validation, database, fake storage | Verifying every consumer state |
| Consumer contract | Required part names, accepted happy path, response shape | Oversized stream cleanup |
| Scheduled environment test | Real object storage permissions and lifecycle policy | Fast PR feedback |
| Security test | Polyglot files, path traversal names, malware scanner behavior | Normal success metadata only |

This split matters because multipart tests can become slow. If every pull request uploads dozens of large files to real storage, engineers will disable or ignore the suite. Keep most tests fast and local. Run a smaller real-environment set on schedule or before release.

## What People Get Wrong About Multipart Upload Validation

The most common mistake is treating multipart upload as a single positive test. A team writes one test with \`attach('file', 'sample.png')\`, sees a \`201\`, and assumes the endpoint is covered. That test proves the route works for one client helper. It does not prove the API rejects wrong field names, prevents content-type spoofing, enforces size limits, sanitizes filenames, cleans up partial writes, or keeps error envelopes stable.

The second mistake is validating only the response. The response can look correct while storage metadata is wrong. A CDN may later serve the object as \`text/html\`, a background worker may fail because the checksum was omitted, or another user may gain access because the storage key lacks tenant scoping. Multipart validation is incomplete until side effects are checked.

The third mistake is over-trusting generated tests. AI coding agents are helpful at expanding a matrix, but they often mirror the happy path unless given explicit negative cases. Provide the agent a table of forbidden examples: wrong field name, empty file, misleading media type, oversized file, unsafe filename, malformed boundary, duplicate scalar field, duplicate file part, and storage failure. Then review whether each test has a distinct failure reason.

## A Pull Request Checklist for Upload Endpoints

Before approving a new or changed upload endpoint, ask for evidence that each layer is covered. The checklist should live in the repository so reviewers, QA engineers, and AI agents use the same standard.

| Review question | Evidence in the PR |
|---|---|
| Are required part names tested? | Missing and wrong part-name cases |
| Are scalar form fields validated as strings first? | Enum, numeric, boolean, and JSON field tests |
| Are declared and actual file types challenged? | Spoofed metadata test |
| Are byte limits tested without huge fixtures? | Generated buffer over the limit |
| Is filename handling covered? | Path traversal and Unicode normalization cases when relevant |
| Are storage side effects asserted? | In-memory storage fake or real integration evidence |
| Are parser failures controlled? | Malformed boundary returns JSON error |
| Is cleanup verified after every rejection path? | No committed object and no visible database row |

This is also a practical place to use ready-made QA skills from qaskills.sh with the qaskills CLI, especially when you want an AI coding agent to scaffold the matrix consistently across services. Keep the skill output under review, because upload behavior is security-sensitive and product-specific.

## Failure Mode: The File Is Rejected But Still Stored

A realistic production failure looks like this: the API receives a valid PNG with an invalid \`purpose\` field, streams the object to storage, then returns \`422\` after business validation. The client sees a rejection, but storage now contains an orphaned object. Over time this becomes a cost problem. If object keys are guessable or public, it can become a security problem.

Diagnose it in three steps. First, add a storage fake and assert \`committedKeys()\` after the invalid request. Second, check whether validation runs before or after the storage write. Third, decide the intended design. Either validate fields before consuming the file, or write to temporary storage and delete the object in a \`finally\` block or transaction cleanup path. The test should encode whichever design the team chooses.

\`\`\`ts
it('cleans up a temporary object when later validation fails', async () => {
  const { app, storage } = await createTestServer({
    storageMode: 'temporary-before-validation',
  });

  const response = await request(app)
    .post('/v1/me/avatar')
    .set('Authorization', 'Bearer test-user-token')
    .field('purpose', 'not-a-real-purpose')
    .attach('avatar', fixturePath('avatar-valid.png'));

  expect(response.status).toBe(422);
  expect(storage.committedKeys()).toEqual([]);
  expect(storage.deletedTemporaryKeys().length).toBeGreaterThan(0);
});
\`\`\`

If this test is flaky, inspect asynchronous cleanup. The request may return before cleanup completes. That design is acceptable only if the object is inaccessible and a durable cleanup job is guaranteed. In that case, assert the queued cleanup job instead of immediate deletion.

## CI Strategy for Multipart Suites

Multipart tests can be fast if fixtures are small and infrastructure is local. Run parser, validation, and fake-storage tests on every pull request. Run real storage tests in a controlled environment with credentials scoped to a disposable bucket or prefix. Publish logs that include request IDs, asset IDs, and storage keys for failed tests, but never publish raw sensitive uploads as CI artifacts.

\`\`\`yaml
name: upload-api-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  multipart:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:api -- --runInBand
\`\`\`

Use your runner's documented options rather than copying flags across tools. For example, Jest and Vitest do not share all CLI flags. If the upload suite depends on a single in-memory app instance or an ephemeral port, configure concurrency through the runner you actually use and document the reason in the script name.

## Put Multipart Validation on a Maintenance Schedule

Upload endpoints change when product teams add new file categories, scanners, transformations, or storage providers. Revisit the tests whenever one of those pieces changes. A new image-resizing worker may require dimensions in metadata. A new document-preview pipeline may require stronger file-type validation. A new storage bucket policy may require a real integration test even if the application code did not change.

Keep a short changelog near the upload tests. Record why each unusual fixture exists. Six months later, \`renamed.exe.txt\` is not self-explanatory. A one-line note that it prevents trusting filename extensions helps future reviewers preserve the test instead of deleting it as clutter.

## Frequently Asked Questions

### Should multipart upload validation use real object storage?

Use fake storage for pull-request speed and deterministic failure messages, then add a smaller scheduled suite against real object storage. The fake should record keys, bytes, content type, metadata, and deletes. The real suite should prove credentials, bucket policy, lifecycle cleanup, and network behavior. Do not make every PR depend on cloud storage unless the endpoint is thin and the environment is exceptionally stable.

### Is checking the uploaded file extension enough?

No. Extensions are client-controlled text. A user can upload text bytes named \`avatar.png\`, or a dangerous file with a harmless-looking extension. API tests should challenge filename, declared multipart content type, and actual bytes. The public assertion is simple: unsupported or mismatched content is rejected, and no durable object or asset record remains after the rejection.

### How should tests handle duplicate multipart fields?

Document the intended behavior and test it directly. Some parsers keep the first value, some keep the last, and some expose an array. For security-sensitive fields such as \`purpose\`, \`tenantId\`, or \`isPublic\`, ambiguity is risky. The safest API contract is usually to reject duplicate scalar fields with a validation error instead of guessing which value the client meant.

### What is the fastest useful upload test to add first?

Start with one valid upload through the real HTTP stack and one invalid upload that must leave storage empty. Those two tests prove the route can parse multipart and that a rejected request does not create durable side effects. After that, add field-name, media-type spoofing, oversized file, malformed boundary, and stable error-envelope cases.
`,
};
