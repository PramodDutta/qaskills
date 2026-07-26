import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills SDK create request contract',
  description:
    'QASkills SDK create request contract: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills SDK create request contract',
  keywords: [
    'QASkills SDK create request contract',
    'QASkills SDK create skill',
    'POST api skills contract',
    'SDK JSON request body',
    'optional frameworks serialization',
    'skill create authentication test',
    'mock fetch create request',
  ],
  relatedSlugs: [
    'how-to-write-high-quality-qa-skills',
    'skill-md-format-guide',
    'typescript-testing-patterns-guide',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://fetch.spec.whatwg.org/',
    'https://zod.dev/',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts#QASkillsClient.skills.create',
    'packages/sdk/src/index.ts#QASkillsClient.request',
    'packages/shared/src/schemas/skill-schema.ts#skillCreateSchema',
    'packages/shared/src/types/skill.ts#Skill',
  ],
  content: `The QASkills SDK create request contract sends \`POST /api/skills\` with JSON for name, description, GitHub URL, testing types, optional frameworks, and languages. The shared request adds JSON content headers plus optional bearer authentication, checks HTTP status, parses the response, and returns a \`Skill\` object or a normalized API error.

This guide tests that one SDK operation, not CLI publish validation or every use of API credentials. The implementation lives in \`packages/sdk/src/index.ts\`, while the [publishing page](/how-to-publish) explains the broader user flow that consumes the same service.

## What does QASkills SDK create request contract guarantee?

The QASkills SDK create request contract guarantees the observable method, path, headers, body, response, and error behavior of \`QASkillsClient.skills.create\`. A contract test should call that public method, intercept \`fetch\`, and inspect the request without contacting production.

The create method always calls the private request helper with \`/api/skills\`, method \`POST\`, and \`JSON.stringify(data)\`. The helper joins that path to the configured base URL, supplies \`Content-Type: application/json\`, and adds \`Authorization: Bearer <key>\` only when the client has an API key.

The input type in \`packages/sdk/src/index.ts\` requires \`name\`, \`description\`, \`githubUrl\`, \`testingTypes\`, and \`languages\`. It permits \`frameworks\` but does not expose every field accepted by the shared schema. That difference is part of the current SDK surface and should not be hidden by test fixtures.

The returned promise resolves with the JSON body typed as \`Skill\`, while TypeScript provides compile-time guidance but the helper does not validate response JSON at runtime. Tests should therefore distinguish transport parsing from schema validation.

The boundary also excludes command prompts and SKILL.md parsing. Those behaviors belong to CLI and validator suites. The [high-quality QA skills guide](/blog/how-to-write-high-quality-qa-skills) covers authoring, while this article proves the SDK request generated after data already exists.

Use a fixed base URL such as \`https://api.test.invalid\` and a mocked global fetch. A contract test should never need a live account, database record, or network response to prove request construction.

## How does QASkills SDK create skill work?

QASkills SDK create skill behavior begins with the public object property \`skills.create\`. It accepts one plain object, serializes that object directly, and delegates response handling to the class request method.

\`\`\`typescript
create: (data: {
  name: string;
  description: string;
  githubUrl: string;
  testingTypes: string[];
  frameworks?: string[];
  languages: string[];
}): Promise<Skill> => {
  return this.request<Skill>('/api/skills', {
    method: 'POST',
    body: JSON.stringify(data),
  });
},
\`\`\`

This excerpt comes from \`packages/sdk/src/index.ts\`. There is no data mutation between the method argument and \`JSON.stringify\`, so omitted optional properties stay absent. An explicitly supplied empty frameworks array remains an empty array.

The private helper creates a header record before calling fetch. Caller headers are spread over the default content type, then an API key assignment occurs afterward. That means an SDK caller cannot supply request options through \`skills.create\`, and the configured API key owns the authorization value.

The [Fetch Standard](https://fetch.spec.whatwg.org/) defines the request primitives used here. Repository tests should assert the values passed to fetch rather than reimplementing the standard or depending on a real server.

A successful response must have \`ok === true\`; the helper then calls \`res.json()\`. A response with valid JSON but status 400 still enters the error branch, while a 200 response with malformed JSON rejects during parsing.

Test those states independently. A successful response proves request shape and return forwarding, an API response proves normalized server errors, and malformed success JSON proves the current absence of runtime response validation.

The QASkills SDK create request contract does not promise retries, timeout cancellation, or automatic idempotency. Do not add those expectations unless the SDK implementation gains them.

## Which cases define POST api skills contract?

The POST api skills contract needs a minimal success case, optional-field boundaries, authentication variants, server errors, parsing errors, and repeat calls. These cases expose every branch in the create and request methods without building a fake service.

Start with a minimal valid object containing all required SDK fields. Mock a 201 response whose JSON matches the current \`Skill\` interface, then assert one fetch call to the configured base URL plus \`/api/skills\`.

Add a full object with \`frameworks\`. Parse the body string back into JSON before comparison because object property order is not the request contract. Require exact keys so a new serialized field triggers review.

For authentication, construct one client without \`apiKey\` and another with a fixed test key. The first header object must omit \`Authorization\`; the second must contain exactly \`Bearer test-key\`. Never use a production-shaped secret in fixture text.

Test a non-OK response with \`{ "error": "invalid skill" }\`. The helper should throw \`QASkills API error: invalid skill\`. Then test a non-JSON error response and supply \`statusText\`, proving the fallback branch.

The [HTTP Semantics specification](https://www.rfc-editor.org/info/rfc9110) defines method and status semantics. The repository adds its own error message and JSON expectation, so assertions should cite both layers accurately.

Repeat creation twice with different fixtures and two responses. Verify there are two independent bodies and no retained fields from the first call. The client stores base URL and API key, but it should not store request data.

Finally, reject fetch with a network error. The current helper lets that rejection propagate without wrapping it as a QASkills API error. Preserve this difference because callers may use it to distinguish transport failure from a server rejection.

Give each case one short name that states the input and result, since names such as "sends required fields" or "uses status text for plain errors" help a failed run point to one rule. Avoid a large shared setup that hides which values each case sends.

The success body should use a full skill record because the method returns that type, with small fixed values that can be compared after the promise resolves. This proves that the helper does not drop fields or wrap the result.

For the error body, use plain words that have no tie to a real skill or user because a message such as "invalid skill" is enough to prove error choice. There is no need to copy a live service response into the source tree.

Call counts are part of this rule, and one create call should make one fetch call even when the response is not OK. If a later retry is added on purpose, the product team can update both the rule and the test.

Keep the base URL fixed for all rows in this group because path tests become hard to read when each case also changes the host. A separate constructor test can own default and custom host behavior.

The [QASkills FAQ](/faq) can answer common publish questions for users. The SDK test should not load that page or depend on its text, since it proves a local call shape.

## SDK JSON request body and the current QASkills contract

The SDK JSON request body is narrower than the shared creation schema in \`packages/shared/src/schemas/skill-schema.ts\`. Both require name, description, GitHub URL, testing types, and languages, while the schema also defines domains with a default.

The shared \`skillCreateSchema\` enforces string lengths, URL syntax, and nonempty testing and language arrays. The SDK method's TypeScript input enforces field presence but does not execute Zod before sending. Invalid runtime JavaScript can therefore reach fetch.

That distinction should produce two suites. An SDK transport suite proves exact serialization for its declared input. A schema suite calls \`skillCreateSchema.parse\` or \`safeParse\` and proves validation and defaults.

\`\`\`typescript
const skillCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  githubUrl: z.string().url(),
  testingTypes: z.array(z.string()).min(1),
  frameworks: z.array(z.string()).default([]),
  languages: z.array(z.string()).min(1),
  domains: z.array(z.string()).default([]),
});
\`\`\`

This shape mirrors \`packages/shared/src/schemas/skill-schema.ts\`. Defaults appear only when code parses through the schema; \`QASkillsClient.skills.create\` does not call that parser. A missing frameworks property therefore remains missing in the outbound SDK body.

The response type in \`packages/shared/src/types/skill.ts\` includes identifiers, descriptive fields, arrays, metrics, flags, and timestamps. The request does not send server-managed values such as ID, slug, quality score, install counts, featured state, or created date.

Assert that those response-only fields are absent from the body even when the mocked response contains them. This catches code that accidentally serializes an entire returned \`Skill\` object on a later create call.

The [Zod documentation](https://zod.dev/) explains parsing and inferred types. In QASkills, tests must not imply that assigning a TypeScript type performs runtime validation, because those are separate mechanisms.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) when checking frontmatter inputs. Keep that parsing separate from this JSON transport test so one failure points to one layer.

## How do you test optional frameworks serialization?

Optional frameworks serialization is best tested with three inputs: property omitted, property set to an empty array, and property set to one or more framework names. Parsing the captured body makes those differences explicit.

1. Construct \`QASkillsClient\` with a fixed invalid test host and no API key.
2. Stub global fetch with a successful response containing one complete \`Skill\` fixture.
3. Call \`skills.create\` with required fields while omitting the frameworks property.
4. Parse \`RequestInit.body\` and assert that \`frameworks\` is not an own property.
5. Repeat with \`frameworks: []\` and require an own property whose value is an empty array.
6. Repeat with \`frameworks: ['playwright']\` and require the exact array in the same order.
7. Inspect method, URL, content type, and missing authorization for every call.
8. Restore global fetch after each test so no unrelated suite inherits the stub.

The body assertion should use \`Object.hasOwn\` for omitted values. Comparing \`body.frameworks\` with undefined cannot distinguish a missing property from an explicitly serialized value in a loosely created fixture.

The QASkills SDK create request contract currently preserves array order because JSON serialization preserves input order. Do not claim that the service stores or returns that order unless an API test proves it.

Use a unique but static GitHub URL such as \`https://github.com/example/qa-skill\`. The mock prevents network traffic, and the stable value keeps snapshots or equality output readable.

The test should compare data, not the exact JSON string. Whitespace and object key order are not meaningful JSON behavior. Exact property membership, array values, and primitive values are meaningful.

If product requirements decide that omitted frameworks must become an empty array before transport, change implementation and expectation together. Today, only the shared Zod schema supplies that default.

The [skills catalog](/skills) offers realistic names for manual exploration, but deterministic SDK tests should retain local fixtures. A catalog edit should never break transport serialization.

Read the captured body once and store the parsed value because repeated parsing adds noise and can make a bad body fail far from the main check. A clear parse step shows that valid JSON is itself part of the contract.

Do not add fields to make the fixture look more real because the best request fixture has each required key and only the one optional key owned by that row. Extra data can hide a field that the SDK should not send.

Use one array item in the populated case unless order itself is under test, since the goal is to prove that the key and value cross the boundary. A second item can be used in one order check.

The omitted case should be the first case in the group. It states the base rule, while empty and filled arrays show two clear changes from that base. This order makes review simple when the SDK input type changes.

When a body mismatch occurs, print the parsed key list and the expected key list. Avoid printing the token or all response fields. The small diff will point to a request change with less risk and less log text.

## skill create authentication test failure and edge-case matrix

A skill create authentication test should verify both header presence and error handling. It should not inspect real tokens, server sessions, or Clerk behavior because this SDK only receives an optional API key string.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| QASkills SDK create skill | Required fields and 201 JSON | POST resolves with parsed skill | Wrong path, method, or body | \`packages/sdk/src/index.ts\` |
| POST api skills contract | Frameworks omitted or supplied | Body preserves caller object | Default invented during transport | \`packages/sdk/src/index.ts\` |
| optional frameworks serialization | Missing, empty, and populated arrays | Three distinct JSON shapes | Missing and empty become equal | \`packages/shared/src/schemas/skill-schema.ts\` |
| skill create authentication test | Client with and without API key | Bearer header appears only with key | Secret missing or added unexpectedly | \`packages/sdk/src/index.ts\` |
| mock fetch create request | Error and malformed responses | Promise rejects with branch-specific error | False success or hidden parse fault | \`packages/shared/src/types/skill.ts\` |

An empty API key is false in the constructor path, so it produces no authorization header. A whitespace-only key is true and becomes a bearer value containing whitespace. Record this current boundary without recommending whitespace credentials.

The request helper always sets JSON content type, even for request methods without bodies elsewhere in the SDK. This create test should assert current behavior only for \`POST /api/skills\`.

When an error body is valid JSON but lacks an \`error\` property, the helper falls back to \`statusText\`. When error JSON parsing rejects, the catch supplies an object containing the same status text. Cover both paths without requiring exact Response internals.

Mock response objects can be real \`Response\` instances in Node, which keeps \`ok\`, \`statusText\`, and \`json\` behavior realistic. Use plain stubs only when testing a specific parse rejection that is awkward to express with Response.

Keep authentication assertions at the request boundary. The [authentication testing guide](/blog/authentication-authorization-testing-guide) covers wider identity and authorization checks, which are beyond SDK key injection.

## How should mock fetch create request run in CI?

A mock fetch create request suite should run with the SDK package tests and require no environment variables. Every test constructs its own client, stubs one global boundary, and restores that boundary before returning.

\`\`\`typescript
it('sends the create contract', async () => {
  const created = makeSkillFixture();
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(created), { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);

  const client = new QASkillsClient({
    baseUrl: 'https://api.test.invalid',
    apiKey: 'test-key',
  });
  const input = {
    name: 'Contract Fixture',
    description: 'A stable SDK contract fixture.',
    githubUrl: 'https://github.com/example/contract-fixture',
    testingTypes: ['e2e'],
    languages: ['typescript'],
  };

  await expect(client.skills.create(input)).resolves.toEqual(created);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://api.test.invalid/api/skills');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual(input);
  expect(init.headers.Authorization).toBe('Bearer test-key');
});
\`\`\`

This fixture exercises the public SDK path and captures the exact fetch arguments. A shared factory for a complete \`Skill\` response can reduce noise, but request inputs should remain visible in each behavior case.

Run the suite under the repository's supported Node version because it supplies global fetch and Response. If the SDK later supports older runtimes, add a declared polyfill and test that separate support contract.

Do not enable test retries for deterministic mocks. A retry can conceal leaked global state or incorrect call counts. Fix isolation by restoring globals and clearing mocks in \`afterEach\`.

Add type checking as a separate CI step. It catches changes to the input or \`Skill\` interface, while runtime tests catch serialization and error behavior. Both signals are needed for the QASkills SDK create request contract.

Keep one test file close to the SDK source and name the public method in its suite title. A short path from source to test helps a reviewer find the rule before changing shared request code. It also keeps web route tests from owning package behavior.

Use a factory for the response only, not for every request input. Response fields are long and stable, while the request differences are the main point of each case. Visible request data makes optional field checks much easier to review.

The test host should end without a slash in most cases. Add one focused constructor case for a host with a trailing slash only if the SDK claims to normalize it. Current constructor stores the value as given, so do not invent that rule here.

Run the mock suite before any test that starts a local server. Fast local checks should catch method, path, body, and headers first. A server check is useful only for behavior that a fetch mock cannot show.

When CI reports a parse fault, keep the raw response inside the fixed test case rather than logging a large body. The test author controls that data, so the failure can name "malformed success JSON" and show one brief value.

The QASkills SDK create request contract needs no seed row. Its success response is a local object, and its request points to an invalid host behind the stub. This fact should be clear in the suite setup.

Use the [blog directory](/blog) to find related API test guides during review. Do not add those pages as runtime calls, since local package proof should remain fast and self-contained.

The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) provides related compiler and runtime guidance. This suite should remain inside SDK ownership so CLI or web failures do not obscure its request contract.

## Implementation checklist for QASkills SDK create request contract

The implementation checklist should be small enough for pull-request review and complete enough to catch accidental transport changes. Each assertion should identify one stable behavior owned by current source.

- Call the public \`QASkillsClient.skills.create\` method instead of a private helper.
- Configure an invalid test host and stub fetch so live network access is impossible.
- Require \`POST\` and the exact \`/api/skills\` path.
- Parse the JSON body and compare exact request-owned keys.
- Cover omitted, empty, and populated framework arrays separately.
- Prove authorization is absent without a key and uses bearer syntax with a key.
- Prove a successful JSON response is returned without runtime schema parsing.
- Cover server JSON errors, non-JSON errors, malformed success JSON, and network rejection.
- Restore fetch and clear calls after every case.
- Keep CLI prompts, SKILL.md parsing, and service database behavior in other suites.

These checks tie \`packages/sdk/src/index.ts\` to \`packages/shared/src/schemas/skill-schema.ts\` without pretending they perform the same work. The SDK serializes its input, while the shared schema owns runtime validation when explicitly invoked.

Review a failed row from the outside in. Check the URL and method first, then headers, body, status branch, and returned data. This order follows the call and tends to reveal the first bad fact without a long debug session.

Keep the request and response fixture IDs different from real database IDs. Plain labels such as \`skill-1\` and \`contract-fixture\` state that the values are local. They also keep a test log from being mistaken for a live record.

A change to one optional field should add one clear row, not a copy of the whole suite. State whether the key is absent, empty, or filled and reuse the same response. This pattern keeps growth easy to audit.

The QASkills SDK create request contract should have one owner in CI. If both SDK and web jobs run the same mock file, failures can appear twice with no extra proof. Keep package behavior in the SDK job and service behavior in the web job.

End the suite with all globals in their prior state. A final check can require that the fetch stub was restored, but good cleanup hooks are the main guard. Leaked fetch state can make an unrelated test pass with the wrong response.

Review the [blog index](/blog) for connected API testing guidance, and use the [FAQ](/faq) for current product answers. Neither page should become a runtime dependency of the package suite.

The QASkills SDK create request contract should be updated whenever input fields, header rules, error text, or response validation changes. A failed exact-key assertion is a request for contract review, not a reason to weaken the test.

## Frequently Asked Questions

### What does QASkills SDK create skill verify in QASkills?

It verifies that the public create method sends one POST request to \`/api/skills\`, serializes the supplied fields as JSON, and returns parsed success data. The test should also prove that it uses the configured base URL and never contacts a live QASkills service.

### When should a team test POST api skills contract?

Run these tests when SDK inputs, API paths, request helpers, authentication rules, shared skill types, or publishing endpoints change. Keep the suite in every pull request because a small refactor to generic request code can alter method, headers, body, or error behavior.

### How can a fixture isolate SDK JSON request body?

Use a fixed input object, stub global fetch, and parse the captured body back into an object. Compare exact own properties rather than a raw JSON string. Restore fetch afterward, and never read account keys, base URLs, or network state from the developer environment.

### Which assertion proves optional frameworks serialization?

Use three calls and distinguish property absence, an empty array, and a populated array with \`Object.hasOwn\` plus value checks. This proves the SDK preserves caller input. It also prevents tests from incorrectly attributing the shared Zod schema's default behavior to transport code.

### What failure cases belong in skill create authentication test tests?

Cover a missing key, a valid fixed key, an empty key, a non-OK JSON response, a non-JSON error, malformed success JSON, and network rejection. Keep service-side token verification elsewhere. This suite only proves how the SDK creates headers and reports response failures.

### How should CI run mock fetch create request checks?

CI should run package type checking and deterministic runtime tests without credentials or network access. Construct one client per case, use real Response objects where practical, restore globals after each test, and reject retries that could hide leaked mocks or unexpected additional requests.

## Conclusion

The QASkills SDK create request contract is an observable boundary: one path, one method, predictable JSON, conditional bearer authentication, status checking, and parsed response data. Test the public create method against mocked fetch and keep schema validation as a separate shared-package responsibility.

Open the [QASkills skills directory](/skills) to choose a stable example, review the [publishing workflow](/how-to-publish), then implement the SDK contract test described here. That sequence connects realistic data with a deterministic request gate and avoids production dependencies.`,
};
