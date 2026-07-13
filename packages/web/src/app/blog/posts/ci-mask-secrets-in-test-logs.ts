import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mask Secrets in CI Test Logs',
  description:
    'Mask secrets in CI test logs with early registration, application redaction, adversarial failure tests, and controls for encoded or transformed credentials.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Mask Secrets in CI Test Logs

The API test failed exactly as designed, then the assertion diff printed the request configuration. A live bearer token appeared in the job log, the reporter copied it into an HTML artifact, and a chat notification quoted the failing line. Secret masking that starts after the test command cannot retract any of those copies.

Log safety requires two independent controls: keep sensitive values out of diagnostic objects, and register unavoidable values with the CI runner before any command can emit them. Masking is a last line of defense, not permission to print credentials.

## Map every place a failed test can write

Console output is only one sink. Test frameworks generate JUnit XML, HTML reports, traces, screenshots, videos, snapshots, attachment files, and process crash dumps. CI platforms add step summaries, annotations, cached files, uploaded artifacts, and copied excerpts in notifications.

Create a data-flow inventory:

| Sink | Common leak source | Primary control |
|---|---|---|
| Live job log | Debug print, shell tracing, assertion diff | Never log raw objects; register masks early |
| JUnit XML | Failure message and captured stdout | Reporter redaction and artifact scan |
| Browser trace | Request headers, storage, page content | Limit capture and artifact access |
| Screenshot or video | Secret shown in UI or terminal | Avoid rendering secrets; restrict retention |
| Step summary | Script appends verbose diagnostics | Sanitize before writing to summary file |
| Cache or workspace upload | \`.env\`, auth state, config dump | Explicit include paths and denylist scan |
| Chat notification | CI copies failure excerpt | Ensure upstream text is already redacted |

The same value may appear in multiple representations: raw token, Basic base64 value, URL-encoded query parameter, JSON-escaped string, partial prefix, or decoded JWT claims. Most CI masking engines match registered literal values, not every transformation.

## Register GitHub Actions masks before first use

GitHub Actions automatically redacts configured secrets in many log contexts, but its documentation warns that automatic redaction is not guaranteed for transformed values. The workflow command \`::add-mask::VALUE\` registers an additional literal for redaction. Emit it before any later output contains that value.

\`\`\`yaml
name: test

on:
  pull_request:

jobs:
  integration:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Register derived masks
        shell: bash
        env:
          API_TOKEN: \${{ secrets.TEST_API_TOKEN }}
          BASIC_USER: \${{ secrets.STAGING_BASIC_USER }}
          BASIC_PASSWORD: \${{ secrets.STAGING_BASIC_PASSWORD }}
        run: |
          set +x
          printf '::add-mask::%s\n' "$API_TOKEN"
          printf '::add-mask::%s\n' "$BASIC_PASSWORD"
          basic_value="$(printf '%s:%s' "$BASIC_USER" "$BASIC_PASSWORD" | base64 | tr -d '\n')"
          printf '::add-mask::%s\n' "$basic_value"

      - name: Run integration tests
        shell: bash
        env:
          API_TOKEN: \${{ secrets.TEST_API_TOKEN }}
          BASIC_USER: \${{ secrets.STAGING_BASIC_USER }}
          BASIC_PASSWORD: \${{ secrets.STAGING_BASIC_PASSWORD }}
        run: npm test
\`\`\`

The workflow maps secrets only into the registration and test steps, so checkout does not receive them. Runner mask registration persists for later steps in the same job. Repeating the environment mapping is preferable to writing a secret through a step output.

\`set +x\` disables shell command tracing if a calling environment enabled it. It does not sanitize explicit output. Quote variables so whitespace and glob characters are not reinterpreted. \`printf\` is preferable to ambiguous \`echo\` behavior.

Do not pass a newly masked secret through a job output. GitHub treats masked values as secrets and restricts output handling. For cross-job use, store a handle in a secret manager and retrieve the value in the consuming job.

## Masking is literal, transformation is your responsibility

If the registered secret is \`alpha+beta\`, the runner can replace that exact sequence. It may not recognize \`alpha%2Bbeta\`, a base64 encoding, a substring, or a JSON value with inserted escapes. Register only transformations that the test stack can actually emit. Generating every possible encoding creates false matches and more sensitive material in runner memory.

| Representation | Example source | Control decision |
|---|---|---|
| Raw bearer token | Authorization header debug | Mask raw value and redact header by name |
| Basic credentials | Base64 username and password | Register derived Basic value if clients log it |
| URL encoding | Query-string API key | Avoid keys in URLs; mask encoded value if unavoidable |
| JWT segments | Token decoder diagnostic | Never print token; log approved claims only |
| First or last characters | "token ends with 7x" debugging | Prohibit partial-secret logging |
| Hashed identifier | Correlation digest | Use keyed or approved one-way correlation policy |

Partial values deserve special attention. Literal masking of a full token will not redact its first eight characters. Engineers often print prefixes to identify which credential was loaded, but prefixes can aid correlation or reduce search space. Use a secret name, environment label, or nonsecret credential id instead.

Multiline secrets are difficult because tools may normalize line endings or print individual lines. Private keys should be passed as files with restrictive permissions when possible, never echoed. Registering an entire multiline value may not protect line-by-line output.

## Redact at the application logging boundary

CI masking protects one execution environment. The test runner should also sanitize headers and structured payloads before they reach console or report attachments. An allowlist is stronger than a denylist: log method, host, path template, status, duration, and request id, but omit bodies and headers unless explicitly approved.

When existing diagnostics require arbitrary objects, use key-aware recursive redaction. The code below preserves structure for debugging and handles arrays plus circular references. It replaces values for known sensitive key names without mutating the original object.

\`\`\`typescript
const sensitiveKey =
  /^(authorization|cookie|set-cookie|password|token|refresh[-_]?token|api[-_]?key|secret)$/i;

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, seen));

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      sensitiveKey.test(key) ? '[REDACTED]' : redact(child, seen),
    ]),
  );
}

export function logFailedRequest(input: {
  method: string;
  url: string;
  headers: Record<string, string>;
  response?: unknown;
}) {
  const parsed = new URL(input.url);
  console.error(
    JSON.stringify(
      redact({
        method: input.method,
        origin: parsed.origin,
        path: parsed.pathname,
        headers: input.headers,
        response: input.response,
      }),
    ),
  );
}
\`\`\`

The logger discards the URL query entirely because query parameters can carry secrets and user data. If query keys matter, log an allowlisted set with redacted values. The key regex is illustrative, not complete for every organization. Domain-specific fields such as \`clientAssertion\`, \`refreshToken\`, and \`privateKey\` need coverage.

Redacting by key does not catch a token embedded in an ordinary \`message\` string. Combine structured logging with literal secret replacement for known runtime secrets, and prevent raw third-party error objects from being serialized wholesale.

## Test the redactor with canary secrets

A redaction utility is security code and deserves negative assertions. Feed unique canary values through the same failure formatter used in CI, then assert no output contains them or their expected encodings.

\`\`\`typescript
import { describe, expect, test, vi } from 'vitest';
import { logFailedRequest, redact } from './safe-logger';

describe('test diagnostic redaction', () => {
  test('removes nested credentials without mutating useful fields', () => {
    const source = {
      request: {
        method: 'POST',
        headers: { authorization: 'Bearer CANARY-7f91', 'x-request-id': 'req-12' },
      },
      response: { body: { refreshToken: 'CANARY-refresh-88', status: 'denied' } },
    };

    const result = redact(source);
    const text = JSON.stringify(result);

    expect(text).not.toContain('CANARY-7f91');
    expect(text).not.toContain('CANARY-refresh-88');
    expect(text).toContain('req-12');
    expect(text).toContain('denied');
  });

  test('does not include query parameters in failed request logs', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logFailedRequest({
      method: 'GET',
      url: 'https://api.example.test/orders?api_key=CANARY-query-31',
      headers: { cookie: 'session=CANARY-cookie-55' },
      response: { status: 401 },
    });

    const logged = error.mock.calls.flat().join(' ');
    expect(logged).not.toContain('CANARY-query-31');
    expect(logged).not.toContain('CANARY-cookie-55');
    expect(logged).toContain('/orders');
    error.mockRestore();
  });
});
\`\`\`

The example includes \`refreshToken\` explicitly because camelCase domain fields are easy to miss with an anchored generic rule. Extend the policy with fields from your own schemas and test each one before relying on it. A tutorial that presents a redactor as infallible would be more dangerous than no sample.

Run canary tests against reporters too. Force a test failure containing the canary in a disposable CI branch, then scan console capture, JUnit, HTML, attachments, and uploaded archives. Unit tests prove the formatter; an end-to-end canary proves configuration and artifact plumbing.

## Stop assertion libraries from printing secret-bearing objects

An equality assertion produces a diff. If the actual value contains request headers or an authentication response, the diff can include secrets even when application logging is clean. Assert safe projections instead:

Bad diagnostic boundary:

\`\`\`typescript
expect(actualHttpExchange).toEqual(expectedHttpExchange);
\`\`\`

Safer boundary:

\`\`\`typescript
expect({
  status: actualHttpExchange.status,
  requestId: actualHttpExchange.headers['x-request-id'],
  errorCode: actualHttpExchange.body.errorCode,
}).toEqual({ status: 401, requestId: expect.any(String), errorCode: 'TOKEN_EXPIRED' });
\`\`\`

Custom matcher messages, snapshots, and inline snapshots have the same risk. Never snapshot authentication state. If a library error includes its configuration, catch it at a narrow boundary, sanitize known properties, and rethrow an error that preserves safe cause metadata.

## Control shell and process-level leaks

\`set -x\` prints expanded shell commands and can reveal variables. Command-line arguments may appear in process listings and tool diagnostics. Prefer environment variables or protected files, while recognizing that child processes can still read inherited environment.

Use \`curl\` with a header sourced from an environment variable, but ensure verbose mode is disabled because it prints request headers. Avoid \`env\`, \`printenv\`, and configuration dumps in jobs with secrets. Package-manager debug logs and crash reporters may capture the environment; configure or disable uploads in test jobs.

Fork-based test workers inherit environment variables. Pass only the secrets a job needs, and do not expose production credentials to pull-request workflows. Untrusted code from forks must not receive repository secrets. Environment protection rules and short-lived credentials reduce impact if masking fails.

## Scan artifacts before upload

Redaction prevention should be followed by detection. Before \`upload-artifact\`, scan the intended directory for known canary values, credential patterns, and files that should never be present, such as \`.env\`, storage-state JSON, PEM keys, or cloud credential directories.

Pattern scanners have false positives and cannot prove absence of every secret. Exact runtime value scanning is strong for secrets available to the job, but the scanner must not print the matching line. It should report only file path, rule id, and remediation guidance. Be careful that providing secrets to a scanner does not leak them through arguments or diagnostics.

Artifact allowlists are better than uploading the whole workspace. Upload \`test-results/junit.xml\` and selected screenshots, not \`.\`. Review retention time and who can download artifacts. Masking a job log has no effect on a raw file uploaded afterward.

## Respond to a confirmed leak as an incident

Deleting a workflow run is not sufficient. Assume anyone with log or artifact access could have copied the value. Revoke or rotate the credential, invalidate derived sessions, review access logs, remove affected artifacts, and identify every downstream copy such as notifications.

Then create a regression test with a nonsecret canary shaped like the leaked value. Fix both the source logger and CI mask timing. Document why the value reached output so the same object is not printed through another reporter next month.

| Incident action | Purpose | Completion evidence |
|---|---|---|
| Revoke or rotate | End credential usefulness | Old credential rejected |
| Remove artifacts | Limit future exposure | Runs and mirrors reviewed |
| Audit use | Detect abuse | Access window and principals checked |
| Patch source logging | Prevent raw emission | Canary test passes |
| Register derived masks | Add runner defense | Disposable failure redacts value |
| Narrow credential scope | Reduce future impact | Least-privilege policy verified |

Use the [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide) to fit these controls into jobs and permissions. The [API security testing checklist](/blog/api-security-testing-checklist-2026) covers credential boundaries beyond logging.

## Redact URLs and database connection strings structurally

Secrets in URLs need parsing, not a single global regular expression. Remove user information, query values, and sensitive fragments while preserving an approved origin and path template. A database URL can carry username, password, host, database name, and TLS parameters, all of which may be sensitive in different organizations.

Never log a connection string after a failed driver initialization. Instead, parse configuration before connecting and record a nonsecret environment label plus a generated connection-attempt id. Even the hostname may reveal internal topology, so establish an allowlist for CI-visible infrastructure metadata.

Error messages can echo the original URL. Sanitizing only the configuration object does not sanitize \`error.message\` or \`error.cause\`. Convert third-party errors into an internal diagnostic type at the adapter boundary, selecting safe properties such as error code and retryability. Preserve the original error in memory for local debugging only when access controls and retention policy permit it.

## Include log safety in review and threat modeling

Reviewers should search new test utilities for broad object serialization, verbose client flags, raw response bodies, snapshotting of auth state, and whole-workspace artifact uploads. A helper named \`debugRequest\` deserves the same scrutiny as production logging because CI artifacts often have a wide audience.

Threat modeling should include malicious response content. An external service can reflect an Authorization value or place sensitive input inside an error field that the test prints. Key-based redaction alone will not catch the value once it is embedded in prose. Literal runtime replacement and safe-field projection limit that route.

Also consider log injection. Newlines in server-provided values can forge additional log records or workflow-command-looking text. Escape control characters and avoid writing untrusted text directly to runner command channels. GitHub provides environment files for structured workflow communication; use the documented mechanism and delimiters rather than constructing commands from arbitrary responses.

## A release gate for test-log hygiene

At minimum, require that workflows map secrets only into necessary jobs, register runtime or derived masks before test execution, disable shell tracing, and upload artifacts from explicit paths. Test helpers should project safe fields for assertions and sanitize error serialization.

Run a periodic canary failure because runner versions, reporters, and notification integrations change. Verify raw, URL-encoded, and deliberately used derived forms based on the actual stack. Do not fabricate transformations the system never produces.

Finally, give developers a safe way to debug. If all detail is removed, they will add \`console.log(config)\` during the next incident. Provide request ids, status codes, hostnames, path templates, timings, retry counts, and approved error codes. Good redaction preserves operational signal while removing credentials and sensitive payloads.

Document a short local-only escalation path for deeper inspection. It should use disposable credentials, synthetic accounts, and a workstation-approved output location rather than weakening shared CI policy. Debug flags that enable raw traffic must default off, refuse to run in CI, and print a prominent warning without printing the secret itself.

## Frequently Asked Questions

### Does GitHub Actions automatically mask every repository secret?

It masks many configured secret occurrences, but automatic redaction is not guaranteed, especially after transformation. Prevent raw output and register additional literal values with \`add-mask\` before they can be printed.

### Will add-mask hide a base64 or URL-encoded token?

Not merely because the raw token was registered. Literal transformations may need their own masks if the toolchain emits them. Prefer preventing those representations from entering logs at all.

### Can I safely print the first few characters of a token?

Avoid it. A full-value mask may not cover prefixes, and partial disclosure provides unnecessary correlation data. Log a nonsecret credential identifier or environment name instead.

### How can I test CI masking without exposing a real credential?

Use a unique fake canary through a deliberate failing test, then inspect and scan every log and artifact sink. Keep unit tests for redaction utilities and a disposable end-to-end workflow for runner behavior.

### What is the first action after finding a real token in a test log?

Revoke or rotate it immediately. Artifact deletion and masking fixes reduce exposure but do not invalidate copies already made. Follow with access review and a canary regression test.
`,
};
