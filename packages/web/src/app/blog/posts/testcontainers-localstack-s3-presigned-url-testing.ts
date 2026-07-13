import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test S3 Presigned URLs with Testcontainers and LocalStack',
  description:
    'Test S3 presigned URLs with Testcontainers and LocalStack across signed PUT and GET flows, payload metadata, tampering, expiration, and endpoint pitfalls.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test S3 Presigned URLs with Testcontainers and LocalStack

The upload request returns 200, yet the object is stored under the wrong key because the presigner signed one URL and the browser reconstructed another. A mock of getSignedUrl cannot reveal that failure. The signature binds method, path, query parameters, selected headers, credentials, and time, so the useful test sends an actual HTTP request to an S3-compatible endpoint.

Testcontainers can start LocalStack for a Node test process, while AWS SDK for JavaScript v3 creates buckets and signs S3 commands. The combination covers the application's signing configuration and the consumer's raw PUT or GET behavior without sharing a developer AWS account. It does not prove perfect AWS parity, so the suite should reserve a small canary for security-sensitive edge cases.

## Decide which side owns each step

Presigned URL workflows have two actors. A trusted backend holds AWS credentials and creates a URL for one command. An untrusted client uses ordinary HTTP without AWS credentials. Tests should preserve that separation. If the test uses S3Client.send(PutObjectCommand) for the upload, it bypasses the feature under test.

| Phase | Test actor | API | Assertion |
| --- | --- | --- | --- |
| Infrastructure setup | Trusted fixture | CreateBucketCommand | Bucket exists before signing |
| URL issuance | Application or signer fixture | getSignedUrl with an S3 command | URL targets test endpoint and expected key |
| Upload | Credential-free HTTP client | fetch PUT | Successful status and required signed headers |
| Stored-object inspection | Trusted fixture | HeadObjectCommand or GetObjectCommand | Bytes and metadata match |
| Download | Credential-free HTTP client | fetch GET | Response body and headers are usable |
| Negative use | Credential-free HTTP client | Mutated or expired HTTP request | Rejection without object mutation |

This boundary prevents a common false positive: verifying that credentials can write to LocalStack rather than verifying that a presigned request can.

## Start a pinned LocalStack image through Testcontainers

Use @testcontainers/localstack, not a hand-built sleep around docker run. LocalstackContainer waits for service readiness and supplies the mapped connection URI. Pin the image through CI configuration so upgrades are reviewed. Recent LocalStack images can require LOCALSTACK_AUTH_TOKEN, while older pinned releases may have different access terms and behavior. Do not silently pull latest.

The fixture below requires an explicit LOCALSTACK_IMAGE and forwards a token when present. It creates an S3 client configured for the container, path-style addressing, test credentials, and a fixed region.

\`\`\`typescript
import { LocalstackContainer, type StartedLocalStackContainer } from '@testcontainers/localstack';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { afterAll, beforeAll } from 'vitest';

export let localstack: StartedLocalStackContainer;
export let s3: S3Client;
export const bucket = 'presigned-url-tests';

beforeAll(async () => {
  const image = process.env.LOCALSTACK_IMAGE;
  if (!image) throw new Error('LOCALSTACK_IMAGE must be a pinned image reference');

  let container = new LocalstackContainer(image);
  if (process.env.LOCALSTACK_AUTH_TOKEN) {
    container = container.withEnvironment({
      LOCALSTACK_AUTH_TOKEN: process.env.LOCALSTACK_AUTH_TOKEN,
    });
  }
  localstack = await container.start();

  s3 = new S3Client({
    endpoint: localstack.getConnectionUri(),
    forcePathStyle: true,
    region: 'us-east-1',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
}, 60_000);

afterAll(async () => {
  s3?.destroy();
  await localstack?.stop();
});
\`\`\`

forcePathStyle is important for local endpoints. Virtual-hosted addressing would put the bucket into a hostname that may not resolve through the container's mapped host. Production AWS clients can use their normal addressing; the test override belongs in infrastructure configuration, not domain logic.

Give the startup hook a realistic deadline because the container must be pulled and initialized on a cold runner. Do not give every URL assertion 60 seconds. Once ready, individual operations should fail quickly.

## Exercise a signed PUT as raw HTTP, then inspect with trusted credentials

AWS SDK v3 exposes getSignedUrl from @aws-sdk/s3-request-presigner. Pass an S3Client and PutObjectCommand. The third argument sets expiresIn in seconds and can specify headers that must participate in signing.

This test signs Content-Type, uploads with fetch, then uses HeadObject and GetObject through the trusted client. Node 20 provides fetch, and the SDK response Body supports transformToString in this environment.

\`\`\`typescript
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { expect, test } from 'vitest';
import { bucket, s3 } from './localstack-fixture';

test('uploads bytes and signed content type through a presigned PUT', async () => {
  const key = 'runs/case-17/evidence.txt';
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: 'text/plain',
    Metadata: { suite: 'presigned-url' },
  });
  const url = await getSignedUrl(s3, command, {
    expiresIn: 120,
    signableHeaders: new Set(['content-type']),
  });

  const upload = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain' },
    body: 'artifact-body-17',
  });
  expect(upload.status).toBe(200);

  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  expect(head.ContentType).toBe('text/plain');
  expect(head.Metadata).toMatchObject({ suite: 'presigned-url' });

  const stored = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  expect(await stored.Body!.transformToString()).toBe('artifact-body-17');
});
\`\`\`

Metadata supplied to PutObject becomes x-amz-meta headers or signed query material according to the presigner's behavior. If a browser client must send particular headers, capture the issued URL and the upload request together. A URL that works only because the test omitted production headers is not representative.

Never add an Authorization header to the fetch. The signature is already in query parameters. Adding backend credentials changes the authentication mechanism and defeats the exercise.

## Generate a download URL only after seeding the exact object

GET signing uses GetObjectCommand. Seed through the trusted client, issue the URL through the same function production calls, and download with fetch. Check bytes and response metadata that consumers depend on, such as Content-Type and Content-Disposition.

\`\`\`typescript
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

test('downloads only the object named by the signed GET', async () => {
  const key = 'exports/release-42.csv';
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: 'case,status\nA-17,passed\n',
      ContentType: 'text/csv',
    }),
  );

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: 'attachment; filename="release-42.csv"',
    }),
    { expiresIn: 120 },
  );

  const response = await fetch(url);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toMatch(/^text\/csv/);
  expect(response.headers.get('content-disposition')).toBe(
    'attachment; filename="release-42.csv"',
  );
  expect(await response.text()).toBe('case,status\nA-17,passed\n');
});
\`\`\`

Response override parameters are part of the signed request. This scenario is specific to a download feature and catches code that appends content-disposition after signing, which should invalidate a correctly verified signature.

Use unique keys per test. Bucket cleanup is slower and less informative than namespaced object keys. A worker ID and random UUID are safe when assertions discover the generated key directly. Do not reuse “test.txt” across parallel cases.

## Mutate one signed component at a time

A presigned URL is a bearer capability restricted by its signature. Negative tests should prove that material changes are rejected: another object key, a required signed header value, a signed response parameter, or the HTTP method. Change only one component so the rejection has a clear cause.

Do not manually rebuild the complete URL with string replacement. Use URL to preserve encoding and query order. For a key-tampering test, modify pathname while leaving X-Amz query parameters untouched, then send the same method.

\`\`\`typescript
test('rejects a signed PUT after the object key is changed', async () => {
  const signed = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: 'allowed/report.txt' }),
    { expiresIn: 120 },
  );
  const tampered = new URL(signed);
  tampered.pathname = tampered.pathname.replace(
    '/allowed/report.txt',
    '/forbidden/report.txt',
  );

  const response = await fetch(tampered, { method: 'PUT', body: 'must not store' });
  expect(response.status).toBe(403);

  await expect(
    s3.send(new HeadObjectCommand({ Bucket: bucket, Key: 'forbidden/report.txt' })),
  ).rejects.toMatchObject({ name: 'NotFound' });
});
\`\`\`

LocalStack behavior has varied across versions and configuration, especially around strict signature validation. Pin the image and first confirm that a deliberately corrupted signature is rejected. If the emulator accepts it, do not weaken the expected security contract. Mark that negative as an AWS canary or configure strict validation, and retain LocalStack for positive integration.

Error XML and precise S3 error codes can differ from AWS. For most emulator negatives, assert non-success plus absence of the forbidden object. Use exact error-code parity only when the chosen LocalStack version documents it and the application consumes it.

## Test expiration without turning the suite into a long sleep

expiresIn controls the validity duration encoded in X-Amz-Expires. First inspect the issued URL: the value should equal the application policy and must not exceed the service's supported rules. This is a fast unit-level assertion on signing configuration.

For server enforcement, the signing arguments in the AWS SDK can use a controlled signingDate in supported versions. Create a URL whose signing time is sufficiently in the past and whose expiresIn is short, then request it immediately. This avoids waiting in real time. Verify the exact SDK version's RequestPresigningArguments type before adopting the option.

\`\`\`typescript
test('rejects a URL whose signing window is already expired', async () => {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: 'exports/existing.csv' }),
    {
      expiresIn: 60,
      signingDate: new Date(Date.now() - 5 * 60_000),
    },
  );

  expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('60');
  const response = await fetch(url);
  expect(response.status).toBe(403);
});
\`\`\`

Time enforcement is an area where emulators can diverge. Run at least one equivalent short-lived URL against a disposable AWS bucket in a non-blocking or scheduled parity suite if expiration is a security control. Account for clock skew in real infrastructure. Do not use a one-second wall-clock boundary as the only proof.

Expired URLs do not revoke an upload that already completed. Expiration controls when a request can begin authentication, not object retention. A test expecting the stored object to disappear is testing a lifecycle policy S3 presigning does not provide.

## Keep host, scheme, region, and credentials identical through signing and use

Signature V4 incorporates request details. A test environment often signs http://127.0.0.1:randomPort, then an application rewrites it to localhost or an external Docker hostname for a browser. Host rewriting can break the signature and can also create server-side request forgery risk if done carelessly.

| Configuration defect | Typical symptom | Targeted diagnostic |
| --- | --- | --- |
| Signed internal container host exposed to test client | Connection refused | Parse URL hostname before fetch |
| Host rewritten after signing | Signature mismatch | Compare issued and consumed URL components |
| Region differs between client and signer | Authorization error | Inspect X-Amz-Credential scope |
| Virtual-host style on unmapped local DNS | Name resolution failure | Enable forcePathStyle for local fixture |
| Temporary credentials omit session token | Authentication failure | Check X-Amz-Security-Token presence |
| Client changes a signed Content-Type | 403 on upload | Capture actual browser request headers |

Keep the endpoint override inside the S3Client passed to getSignedUrl. The production signer should accept configuration through dependency injection rather than replacing hosts in its returned string. This makes the LocalStack path faithful and testable.

For background on the container module and AWS service setup, see the [Testcontainers LocalStack AWS mocking guide](/blog/testcontainers-localstack-aws-mocking-guide). The [LocalStack Bedrock mock testing guide](/blog/localstack-bedrock-mock-testing-guide) covers a different AWS protocol and should not be used as evidence of S3 signing parity.

## Decide what remains in an AWS parity canary

LocalStack provides speed, isolation, and good coverage of everyday S3 calls. AWS remains authoritative for Signature V4 enforcement, IAM policy, bucket policy, encryption headers, checksum behavior, regional endpoints, and service-specific expiration limits.

Keep the canary narrow: create an isolated bucket or prefix, sign one upload and one download through the deployed signer, verify one tamper rejection, then delete objects. Do not send customer data. Tag resources for cost and cleanup. The main pull-request suite stays local; the canary detects emulator drift and infrastructure-policy mistakes.

Record the LocalStack image digest or tag, AWS SDK package versions, endpoint, region, and whether signature validation was enabled when a negative case fails. Never print the complete presigned URL in shared logs because it is a temporary bearer credential. Redact X-Amz-Signature and credential query values.

## Add browser CORS coverage only after raw HTTP works

Node \`fetch\` does not enforce browser CORS, so a successful integration request cannot prove that a web application may use the URL. Keep the raw PUT and GET tests because they isolate signature behavior. Then add one Playwright scenario for the bucket CORS policy when browser upload is a product requirement.

Configure the LocalStack bucket with the exact application origin, allowed methods, and required headers. From the application page, request a presigned URL through the normal backend route and perform the upload in page JavaScript. Observe the preflight and PUT separately. A failed OPTIONS request points to CORS; a PUT reaching S3 and returning 403 points back to signing or signed headers.

Do not use \`mode: 'no-cors'\` to make the test pass. It produces an opaque response and bypasses the application's need to inspect success. If the UI reads \`ETag\` or another response header, add it to the exposed-header configuration and assert that JavaScript can actually read it.

Browser tests also catch mixed-content policy. A page served over HTTPS cannot freely call the container's HTTP endpoint. Local test topology may need an HTTPS reverse proxy or a same-origin backend upload path. State which topology the test validates instead of weakening browser security settings and mistaking that for production coverage.

## Test key encoding as data, not path manipulation

S3 object keys can contain spaces, plus signs, percent signs, Unicode, and slash-like prefixes. A signer, reverse proxy, or URL-rewriting helper can double-encode those characters. Build a compact table of accepted keys based on the application's policy and verify each by reading the exact key with the trusted S3 client.

Include a space and a plus sign in separate cases because form-style decoders often confuse them. Include one non-ASCII filename to exercise UTF-8 canonicalization. If the application rejects control characters, traversal-looking segments, or repeated slashes, test rejection before signing rather than expecting S3 to enforce a filesystem model it does not have.

Never decode the path, concatenate a new host, and re-encode it after signing. Host and canonical URI are signature inputs. If production returns a public proxy URL, that proxy must be part of the signing architecture or exchange the capability server-side. A string replacement that appears to work for simple keys is not robust.

## Make multipart uploads a separate contract

A single presigned PUT does not cover multipart upload. Large-object workflows initiate an upload, sign each \`UploadPart\` command, collect part ETags, and complete using the ordered part list. Failure modes include signing the wrong part number, reusing an upload ID, completing out of order, and abandoning partial uploads.

Create a dedicated suite when the application exposes multipart capabilities. Upload at least two distinguishable byte ranges through raw HTTP, complete through the intended trusted or presigned path, and download the final object to compare exact concatenated bytes. Do not infer success from two 200 part responses because the object does not exist in completed form yet.

Abort behavior matters operationally. Exercise the application's cleanup command and verify the upload cannot later be completed. LocalStack can cover the request choreography, while an AWS canary should retain encryption, checksum, lifecycle, and IAM cases that the emulator may not reproduce exactly.

Multipart part-size limits and final-part exceptions are service rules that can change or be emulated imperfectly. Source them from AWS documentation for the deployed test, pin emulator behavior, and avoid inventing smaller "test-only S3 limits" in application code.

## Keep signing observability safe

A presigned URL is a bearer capability. CI logs, traces, and assertion diffs should not contain its complete query string. Record the operation, bucket alias, key classification, requested lifetime, signed-header names, and a correlation ID. Redact credential, signature, security token, and signing timestamp values.

When a request fails, parse the S3 error code from the response if available and attach a sanitized canonical-input summary. Do not log the signing secret or recreate the full canonical request in a broadly visible report. Access to test credentials may be low risk in an isolated container, but the logging pattern will migrate to staging unless it is safe by design.

Use a fake object namespace and delete or dispose of it with the container. Never presign production-derived keys in local tests. A passing security assertion should not create a new secret-distribution problem.

## Frequently Asked Questions

### Why should the upload use fetch instead of S3Client.send?

The consumer of a presigned URL has no AWS credentials and makes an ordinary HTTP request. Using S3Client for the upload tests a different authentication path and can conceal signing or header defects.

### Why is forcePathStyle commonly needed with LocalStack?

It places the bucket in the URL path instead of a bucket-specific hostname. That avoids local DNS problems around dynamically mapped container hosts. Production AWS configuration can continue using its normal addressing style.

### Can LocalStack prove that tampered and expired URLs are secure in AWS?

It can provide useful coverage when strict signature validation is enabled, but it is not the authority for AWS parity. Pin the emulator and keep a small disposable AWS canary for security-critical enforcement.

### Should a presigned PUT test include Content-Type?

Include and sign it when the production contract requires that header. Then send the exact value from the raw HTTP client and inspect the stored object's metadata. Omitting it from the test can hide browser-to-signer disagreement.

### Does URL expiration delete the uploaded object?

No. It limits when the signed request is valid. Object expiration or deletion is controlled separately through lifecycle rules, explicit deletion, or application retention logic.
`,
};
