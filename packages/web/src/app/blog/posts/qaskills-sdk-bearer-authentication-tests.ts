import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills SDK bearer authentication tests',
  description:
    'QASkills SDK bearer authentication tests: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills SDK bearer authentication tests',
  keywords: [
    'QASkills SDK bearer authentication tests',
    'QASkillsClient apiKey',
    'SDK Authorization header',
    'Bearer token fetch test',
    'authenticated qaskills SDK',
    'omit empty API key',
    'SDK credential isolation',
  ],
  relatedSlugs: [
    'authentication-authorization-testing-guide',
    'typescript-testing-patterns-guide',
    'testing-cursor-pagination-api-boundaries',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc6750',
    'https://fetch.spec.whatwg.org/',
    'https://vitest.dev/guide/mocking.html',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts#QASkillsConfig',
    'packages/sdk/src/index.ts#QASkillsClient.request',
    'packages/sdk/src/index.ts#QASkillsClient.skills.create',
    'packages/sdk/src/index.ts#QASkillsClient.reviews.submit',
  ],
  content: `QASkills SDK bearer authentication tests should prove that a truthy configured apiKey adds an \`Authorization: Bearer <token>\` header to every client request, while an omitted or empty key adds no SDK-generated authorization header. Tests should capture fetch arguments, compare authenticated and public clients, protect token values, and reset mocks between cases.

The current contract lives in \`packages/sdk/src/index.ts#QASkillsClient.request\`, which all public skill, category, review, and leaderboard methods call. This article tests shared header injection, not one endpoint's business authorization or server-side token validation.

## What does QASkills SDK bearer authentication tests guarantee?

QASkills SDK bearer authentication tests guarantee that a nonempty \`apiKey\` writes one Bearer value, while no key or an empty string writes none. A fetch mock can observe both cases without sending a credential over the network.

This guarantee has a clear limit and does not prove server acceptance, user mapping, or access, which require API tests. The SDK unit contract ends at the URL and \`RequestInit\` passed to fetch.

The type at \`packages/sdk/src/index.ts#QASkillsConfig\` has optional \`baseUrl\` and \`apiKey\` fields, which the constructor reads and stores. It uses \`config.baseUrl || 'https://qaskills.sh'\` and assigns \`config.apiKey\` directly, with no environment lookup, trim, refresh, or storage work.

The auth format follows bearer use in [RFC 6750](https://www.rfc-editor.org/info/rfc6750), so the tested value starts with \`Bearer\`, one space, and the key. Do not log the full token in assertion messages or snapshots.

Use the broader [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) for server roles, session expiry, and access decisions. QASkills SDK bearer authentication tests remain smaller and faster because they inspect one client boundary.

A public client can call list methods, so the test should check header omission without claiming that each endpoint must grant access. Endpoint policy can change while shared request construction remains correct.

## How does QASkillsClient apiKey work?

QASkillsClient apiKey is stored on each client instance and evaluated when \`request\` runs. The code creates a plain header record with JSON content type, spreads any request-specific headers, then assigns authorization when \`this.apiKey\` is truthy.

The production branch in \`packages/sdk/src/index.ts#QASkillsClient.request\` is:

\`\`\`typescript
private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (this.apiKey) {
    headers['Authorization'] = \`Bearer \${this.apiKey}\`;
  }

  const res = await fetch(\`\${this.baseUrl}\${path}\`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(\`QASkills API error: \${error.error || res.statusText}\`);
  }
  return res.json();
}
\`\`\`

Header order creates a useful check because a truthy key overwrites an \`Authorization\` value after the spread. Without a key, caller headers remain, though public methods do not expose free request options and the private rule still owns all calls.

Truthiness also sets edge rules: false values skip SDK injection, while a whitespace-only string is true and yields a Bearer value with spaces. Tests should record this current boundary without recommending whitespace as a valid credential.

The [Fetch Standard](https://fetch.spec.whatwg.org/) defines request and header rules, while this unit test sees the arguments before host normalization. Assert header keys and values from the passed options object.

Create a new client for each key case to prove state stays local and to avoid a change to private fields. The exported \`createClient\` factory simply calls the same constructor, so one focused factory case can verify parity.

QASkills SDK bearer authentication tests should use an obvious fake such as \`test-token-a\`, never a real account key. Even test secrets can leak through CI logs when failed snapshots print whole request objects.

## Which cases define SDK Authorization header?

SDK Authorization header coverage needs configured, omitted, empty, whitespace, caller-header, method-variety, error-response, and multiple-client cases. The first three establish the core contract, while the others protect ordering and isolation.

For a set key, call a public method once and check the URL, JSON type, and \`Authorization: Bearer test-token-a\`. Return an \`ok: true\` mock response with a JSON method so client parsing completes.

For no key, build \`new QASkillsClient({ baseUrl })\` and check that its own header keys do not include \`Authorization\`. Checking \`headers.Authorization === undefined\` is weaker when inherited values or normalization enter the fixture.

For an empty key, pass \`apiKey: ''\` to set a false value and lock the current truthiness branch. Add whitespace as a documented boundary, but do not normalize it in the test because source does not trim.

Call at least one read and one write method. \`skills.list\` uses GET defaults, while \`packages/sdk/src/index.ts#QASkillsClient.skills.create\` passes POST plus a JSON body. Both should receive the same authentication value from the shared helper.

Reviews offer another write path through \`packages/sdk/src/index.ts#QASkillsClient.reviews.submit\`. A small representative set is enough because every method delegates to one helper. Avoid repeating identical tests for every endpoint unless route-specific options could alter headers.

The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) shows typed fixtures and cleanup. Here, type the fetch mock response narrowly and restore the global function after every test.

QASkills SDK bearer authentication tests should also prove that failed responses do not cause a second request. Return \`ok: false\`, provide a JSON error, and assert rejection plus one fetch call. Authentication construction occurs before response handling.

## Bearer token fetch test and the current QASkills contract

A Bearer token fetch test should invoke public behavior, capture transport arguments, and avoid importing the private request method. This keeps the test resilient if internal organization changes while the public client contract stays stable.

Vitest's [mocking guide](https://vitest.dev/guide/mocking.html) documents spies, function mocks, restoration, and module boundaries. Use \`vi.stubGlobal('fetch', mock)\` when the test environment exposes fetch globally, then call \`vi.unstubAllGlobals()\` during cleanup.

\`\`\`typescript
import { afterEach, expect, test, vi } from 'vitest';
import { QASkillsClient } from '../src';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('adds the configured bearer token', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ skills: [], total: 0 }),
  });
  vi.stubGlobal('fetch', fetchMock);

  const client = new QASkillsClient({
    baseUrl: 'https://sdk.test',
    apiKey: 'test-token-a',
  });
  await client.skills.list();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://sdk.test/api/skills');
  expect(init.headers).toMatchObject({
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token-a',
  });
});
\`\`\`

This fixture uses a fake domain and a fully mocked fetch, so no request leaves the process. It asserts the exact base and path concatenation as supporting context. The key assertion remains the header set.

Avoid snapshots of \`fetchMock.mock.calls\`. A snapshot writes the token into test output and may include unrelated request details. Direct assertions are easier to redact and diagnose.

The [API boundary testing guide](/blog/testing-cursor-pagination-api-boundaries) discusses query construction for list methods. Keep token assertions separate from pagination cases so a query change does not obscure authentication failure.

## How do you test authenticated qaskills SDK?

An authenticated qaskills SDK test should compare two clients against one controlled mock and prove that credentials never cross between them. Create one client with token A and one public client, call both, and inspect each call in order.

Use this numbered procedure:

1. Stub global fetch with successful JSON responses and no network access.
2. Construct authenticated, unauthenticated, and empty-key client instances.
3. Invoke one read method and one write method through public client APIs.
4. Assert exact URLs, methods, bodies, and authorization presence per call.
5. Clear calls, restore fetch, and verify no token appears in logs or snapshots.

A write case proves options merging:

\`\`\`typescript
test('keeps bearer auth on a create request', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'skill-1' }),
  });
  vi.stubGlobal('fetch', fetchMock);

  const client = new QASkillsClient({
    baseUrl: 'https://sdk.test',
    apiKey: 'test-token-b',
  });
  await client.skills.create({
    name: 'Fixture',
    description: 'A local SDK request fixture.',
    githubUrl: 'https://example.test/fixture',
    testingTypes: ['e2e'],
    languages: ['typescript'],
  });

  const [, init] = fetchMock.mock.calls[0];
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe('Bearer test-token-b');
  expect(JSON.parse(init.body)).toMatchObject({ name: 'Fixture' });
});
\`\`\`

The example URL appears inside code and is not a technical source. The request never reaches it because fetch is replaced. Keep external citations in prose limited to approved authorities.

Test public and private policy separately. The SDK may attach a token to all methods when configured, even if an endpoint is public. This is consistent shared behavior, not evidence that every route requires authentication.

Use [how to publish](/how-to-publish) when adding a real protected integration case. That later layer can confirm server acceptance with a short-lived test identity and controlled cleanup.

### Keep the token test safe by design

Use a fake key with no use on any host, and name it in the test file instead of an environment value. This makes it clear that no real key should enter the case. It also makes an exact header check safe to show when the test fails.

Do not print the full fetch call when one field is wrong; read the URL, method, and a flag that says whether auth was set. For a fake key, an exact value in the local failure can be fine, but a shared helper may later see a real one. A narrow message is a safer base for all tests.

Keep the mock result small and tied to its method, with an empty list for reads or one fake ID for a create call. The data does not need to look like the full live site. It only needs to let the client reach the point after fetch.

Make one test fail if fetch runs more than once, since the shared path sends one call and reads one result. A retry rule does not exist in this client code, so the test should not claim one. If retry support is added later, it will need its own plan for token use and safe logs.

Use the [QASkills skills page](/skills) for real route names, but make the mock work with no web link at all. This keeps a site outage from hiding a bad auth header. A later end-to-end job can own the live route.

### Compare calls without sharing state

Create keyed and public clients before either call, invoke them in order, and check each fetch call against only that client's rule. This proves that the key is held by the instance. It also catches a bad global key cache if one appears in a later change.

Clear the mock call list before a new case because a short list makes a call index error far less likely. Restore global fetch when the file ends, even if each test also clears calls. Both steps guard other test files from this mock.

Do not change a private field with a cast; call the public constructor, which takes little work and matches real app use. A fresh instance shows the same flow that app code uses. It also keeps the test from being tied to a private field name.

For a write call, parse the body and check key fields instead of a vast string when auth is the main aim. Check the method, JSON type, and Bearer value as separate facts. The split points to the right cause when one part breaks.

The [TypeScript test patterns guide](/blog/typescript-testing-patterns-guide) has more typed mock ideas, though a small local response type is enough here. Avoid a cast that lets any shape pass without thought. The mock should still act like the fields that \`request\` reads.

## omit empty API key failure and edge-case matrix

Omit empty API key coverage prevents accidental values such as \`Bearer undefined\` or \`Bearer \` from appearing when callers choose a public client. The matrix ties each configuration to the exact transport result.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| Authenticated | \`apiKey: 'test-token-a'\` | Exact Bearer header on one request | Missing or changed token | \`packages/sdk/src/index.ts#QASkillsClient.request\` |
| Omitted key | No apiKey property | No SDK authorization header | \`Bearer undefined\` appears | \`packages/sdk/src/index.ts#QASkillsConfig\` |
| Empty key | \`apiKey: ''\` | No SDK authorization header | Empty Bearer value appears | \`packages/sdk/src/index.ts#QASkillsClient.request\` |
| Two clients | Token client plus public client | Each call uses its own configuration | Credential crosses instances | \`packages/sdk/src/index.ts#QASkillsClient.request\` |
| Write request | Skills create or review submit | Method, body, and Bearer header coexist | Option merge drops auth | \`packages/sdk/src/index.ts#QASkillsClient.skills.create\` |

Add a custom content-type boundary only if a public method can pass that header. Current write methods rely on the default JSON value, and public APIs do not accept arbitrary options. Do not invent an override feature in a test.

Case sensitivity can be tricky because Fetch implementations may normalize header names after construction. The unit mock sees the plain object with \`Authorization\` and \`Content-Type\` keys. An integration server may compare case-insensitively as HTTP requires.

Whitespace token behavior should be documented as current truthiness, then evaluated as a possible validation improvement. It should not be silently trimmed in the test fixture. Tests describe source; product changes should modify source and expectations together.

QASkills SDK bearer authentication tests must not print actual configured values on failure. Prefer a fake constant and assertions on presence or exact fake text. Never read production environment variables for this unit suite.

## How should SDK credential isolation run in CI?

SDK credential isolation should run in the package unit stage with no database, Clerk session, registry request, or secret variable. A global fetch mock gives deterministic calls and makes accidental network access visible.

Run tests in isolated files or restore global fetch after every case. A leaked mock can make unrelated SDK tests pass against fake responses. A leaked real fetch can expose fake or inherited credentials to an unexpected destination.

Create clients inside each test, not in shared module scope. This prevents call order from becoming part of the contract and proves constructor configuration is enough. Use distinct token labels for multiple instances, then redact them from any custom diagnostics.

QASkills SDK bearer authentication tests should run on every pull request that changes \`packages/sdk\` or shared request types. Add a small integration check only when server authentication behavior changes. Keep that check in a separate job with explicit secret handling.

Failure output should state which call index, method, URL, and header-presence rule failed. It should never dump the full header object from a real environment. Custom assertions can report \`authorization present: true\` without revealing content.

Consult the [privacy page](/privacy) when reviewing credential and telemetry policy. The unit test itself should use only fake values, while production secret storage remains a caller responsibility.

The [error handling guide](/blog/error-handling-testing-patterns) can support response failure cases. Keep those assertions secondary to header injection so one article topic retains one intent.

### Make CI failures safe to share

When a header is wrong, report its scheme, whether a value exists, and which fake client made the call without showing all text. This rule costs little and still gives enough data for a fix. The test can check exact fake text without printing it.

Scan the test source for \`process.env\` calls that read a real key name, since this unit file should have none. A future helper may start reading the environment, so the scan acts as a small guard. Keep real secret tests in a job with a clear owner and short-lived access.

Run the unit suite with network access off so a missing fetch mock fails at once instead of reaching a live host. The fake base URL adds one more guard, but a blocked network is stronger. Use both for a high trust gate.

Reset fake timers only when a case turns them on, since the current request has no timer, retry, or refresh task. Adding broad timer setup can make a simple header test hard to read. Each mock should exist because the source path needs it, not because a common test file always uses it.

Use the [authentication test guide](/blog/authentication-authorization-testing-guide) to plan the next server check, but keep that job apart from the SDK job. If the server denies a fake or old key, that does not mean header construction failed. Separate jobs make that fact easy to judge.

Review call count, host, and the auth flag before the suite ends because these checks catch most leaks and wrong routes. Then clear the fake calls and let the runner tear down the file. A clean end state is part of SDK credential isolation.

## Implementation checklist for QASkills SDK bearer authentication tests

Use this checklist during review:

- Create a fresh client for every configured credential case.
- Stub global fetch before invoking any public SDK method.
- Return a minimal response with \`ok\` and an async JSON function.
- Assert exact Bearer text for a nonempty fake key.
- Assert own-key absence for omitted and empty keys.
- Cover one read and one write request through public methods.
- Compare authenticated and public clients for credential isolation.
- Assert one fetch call on both success and response failure.
- Restore fetch and clear mocks after every case.
- Keep tokens out of snapshots, logs, fixtures, and error messages.
- Check each fake client by call index, scheme, host, method, and auth presence while the full header value stays out of shared logs, no real key name is read from the process environment, and each mock is cleared before the next client makes a call

The checklist maps directly to QASkills SDK bearer authentication tests without claiming server acceptance. Repository facts come from the config type and shared request helper. Standards facts come from bearer and fetch specifications.

Browse [QA skill categories](/categories) to select stable public list fixtures for a later integration test. The unit suite should not depend on catalog contents because authentication construction is independent of returned skills.

## Frequently Asked Questions

### What does QASkillsClient apiKey verify in QASkills?

It verifies that the client stores the configured value per instance and adds \`Authorization: Bearer <value>\` when that value is truthy. A focused test captures fetch arguments from a public method, checks the exact fake token, and confirms that no network request occurs.

### When should a team test SDK Authorization header?

Run these checks whenever constructor configuration, the shared request helper, fetch options, public SDK methods, or authentication policy changes. They belong in every SDK pull request because mocks make them quick. Add server integration coverage separately when token acceptance or permissions change.

### How can a fixture isolate Bearer token fetch test?

Replace global fetch with a deterministic function, use a fake base URL and token, create the client inside the test, and restore the global afterward. Assert specific request fields rather than snapshotting calls. This setup prevents network access and keeps credentials outside logs.

### Which assertion proves authenticated qaskills SDK?

Call a public method and assert that fetch receives the expected API path plus an options object containing the exact fake Bearer value. Pair it with an unauthenticated client whose header object lacks Authorization. The comparison proves injection and omission through the same transport path.

### What failure cases belong in omit empty API key tests?

Cover omitted, undefined, empty-string, whitespace-only, multiple-client, read-request, write-request, and failed-response cases. Expect omission only for false values under current source. Record whitespace as truthy behavior, and change that check only with a matching product choice and code update in the same patch.

### How should CI run SDK credential isolation checks?

Run them as SDK unit tests with global fetch mocked, fake credentials, no service dependencies, and automatic cleanup. Create clients per case, prevent concurrent global leakage, and fail on unexpected calls. Keep any real-token integration suite separate with limited secrets and redacted diagnostics.

## Conclusion

QASkills SDK bearer authentication tests provide a precise client-side safety net: nonempty configured keys become Bearer headers, empty or omitted keys do not, and separate clients retain separate credentials. The next regression check should compare a read and write call across authenticated and public instances in one isolated fetch fixture.

Open the [QA skills catalog](/skills) to choose a stable fixture, then implement the SDK contract test described here. Continue with [QASkills getting started](/getting-started) when you need a broader client and CLI workflow.`,
};
