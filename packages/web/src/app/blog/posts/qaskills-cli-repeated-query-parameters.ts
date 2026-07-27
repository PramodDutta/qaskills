import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI repeated query parameters',
  description:
    'QASkills CLI repeated query parameters: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills CLI repeated query parameters',
  keywords: [
    'QASkills CLI repeated query parameters',
    'URLSearchParams append arrays',
    'repeated filter query keys',
    'qaskills array parameter serialization',
    'multi value skill search',
    'query parameter order testing',
    'searchSkills URL contract',
  ],
  relatedSlugs: [
    'testing-typesense-multiselect-facet-filter-queries',
    'error-handling-testing-patterns',
    'test-environment-management-guide',
    'mcp-api-timeout-abortcontroller-testing',
  ],
  sources: [
    'https://nodejs.org/api/url.html#class-urlsearchparams',
    'https://url.spec.whatwg.org/',
    'https://www.rfc-editor.org/info/rfc3986',
  ],
  repoEvidence: [
    'packages/cli/src/lib/api-client.ts#buildUrl',
    'packages/cli/src/lib/api-client.ts#searchSkills',
    'packages/shared/src/types/skill.ts#SkillSearchParams',
    'packages/shared/src/schemas/skill-schema.ts#skillSearchSchema',
  ],
  content: `QASkills CLI repeated query parameters use one key for every selected filter value. The client appends arrays in input order, skips undefined fields, and converts scalar values to text. Tests should capture the complete request URL, compare each value by key, and keep ordering checks separate from server-side search behavior.

The contract is implemented in \`packages/cli/src/lib/api-client.ts\`, not in the interactive search screen. It supports filters beyond the two public search flags, including testing types, frameworks, languages, domains, and agents. The [skills catalog](/skills) shows the data being filtered, while this guide stays focused on low-level request serialization.

## What does QASkills CLI repeated query parameters guarantee?

QASkills CLI repeated query parameters guarantee that every array item becomes its own query pair under the same key. The implementation preserves the array's iteration order and omits only values that are undefined. It does not promise that a server will rank results by query order or treat duplicate values as unique choices.

The relevant helper is \`packages/cli/src/lib/api-client.ts#buildUrl\`. It creates a \`URL\` from a path and the configured base address, then visits \`Object.entries(params)\` once. An array enters a nested loop that calls \`url.searchParams.append(key, value)\` for each item, while a scalar calls \`set\` after conversion with \`String(value)\`.

That split produces an observable URL contract. Two frameworks become two \`frameworks\` pairs instead of one comma-separated value, one JSON string, or indexed keys such as \`frameworks[0]\`. A number such as page size becomes decimal text, and a boolean such as \`verifiedOnly\` becomes either \`true\` or \`false\`.

The helper returns \`url.toString()\`, so percent encoding and final formatting belong to the platform URL implementation. The [Node URLSearchParams reference](https://nodejs.org/api/url.html#class-urlsearchparams) documents the class used by Node. The [URL Standard](https://url.spec.whatwg.org/) defines the underlying parsing and serialization model that tests should treat as the platform boundary.

A regression test should avoid comparing a hand-built string before understanding encoding. Read the generated URL through \`new URL(captured)\`, then inspect \`searchParams.getAll('frameworks')\`. Keep one exact-string assertion for order and encoding only when that exact representation is part of a supported client contract.

The helper is private, but \`searchSkills\` exposes its result through \`fetch\`. A fetch spy therefore gives the test a stable observation point without exporting internal code solely for tests. The same spy can prove that only one request is made and that no live catalog is needed.

## How does URLSearchParams append arrays work?

URLSearchParams append arrays works by adding a fresh pair for each item while retaining earlier pairs. In QASkills, the array branch does not call \`set\`, join values, sort them, or remove duplicates. Empty arrays complete the loop without creating a key, which differs from passing one empty string.

The current branch can be represented directly without changing its meaning:

\`\`\`typescript
function buildUrl(
  path: string,
  params?: Record<string, string | string[] | number | boolean | undefined>,
): string {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
\`\`\`

The first useful fixture contains two values for several fields, not just one field. That shape proves the code does not accidentally special-case frameworks while dropping agents or domains. It also exposes inter-key order because \`searchSkills\` constructs the parameter object in a fixed sequence.

Use strings that reveal encoding errors, such as \`api testing\`, \`C#\`, and \`agent/name\`. The URL parser should return those original strings through \`getAll\`, even though the raw request contains percent encoding. Do not infer that spaces must appear as one particular character without checking the platform serializer.

The [URI generic syntax specification](https://www.rfc-editor.org/info/rfc3986) describes the broader URI components and reserved characters. QASkills delegates query serialization to the URL API instead of implementing that syntax itself. Tests should therefore assert application choices, such as repeated keys and omitted values, while using the platform parser for encoded text.

Duplicate array members are another clear boundary. If \`frameworks\` is \`['playwright', 'playwright']\`, both values are appended because no deduplication occurs. That fact is useful for a lock test, but a product decision about rejecting duplicates belongs in validation or server logic.

An empty array and undefined field both produce no query pair, yet they are not identical inputs. Include both in unit coverage so a future refactor can intentionally preserve or change that distinction. Also include \`false\`, because truthiness-based code would drop it even though the current explicit undefined check keeps it.

## Which cases define repeated filter query keys?

Repeated filter query keys need positive, empty, duplicate, encoded, and mixed-scalar cases. Each case should assert the captured request before returning a controlled JSON response. That method proves serialization independently from the live API and prevents search ranking changes from breaking a client test.

The public function at \`packages/cli/src/lib/api-client.ts#searchSkills\` maps the typed fields into request names. It changes \`query\` to \`q\`, keeps plural filter names, and forwards \`sort\`, \`page\`, \`pageSize\`, and \`verifiedOnly\`. The function then delegates to the shared request helper, which adds headers, a timeout signal, and JSON parsing.

A focused fixture can stub global fetch and inspect the first argument:

\`\`\`typescript
import { afterEach, expect, it, vi } from 'vitest';
import { searchSkills } from './api-client';

afterEach(() => vi.unstubAllGlobals());

it('serializes every filter value as a repeated key', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ skills: [], total: 0, page: 1, pageSize: 20 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await searchSkills({
    testingTypes: ['e2e', 'visual'],
    frameworks: ['playwright', 'cypress'],
    languages: ['typescript', 'javascript'],
    domains: ['web', 'api'],
    agents: ['claude-code', 'cursor'],
  });

  const url = new URL(String(fetchMock.mock.calls[0][0]));
  expect(url.searchParams.getAll('frameworks')).toEqual(['playwright', 'cypress']);
  expect(url.searchParams.getAll('agents')).toEqual(['claude-code', 'cursor']);
});
\`\`\`

The response object in this example only satisfies the path needed by \`request\`. It is not a claim about every field returned by production. Teams should use the exact \`SkillSearchResult\` shape required by their current compiled code and keep irrelevant ranking data out of a serialization fixture.

Add a second assertion for \`fetchMock.mock.calls[0][1]\`. Current request code supplies an abort signal, a JSON content type, and the \`@qaskills/cli\` user agent. Those details are adjacent transport behavior, so keep failures named separately from repeated-key failures.

Do not use a live [category page](/categories) as the oracle for this suite. Catalog data can change while URL construction remains correct. A separate integration check may issue one safe request after local tests pass, but it should report server availability apart from serialization results.

## qaskills array parameter serialization and the current QASkills contract

The qaskills array parameter serialization contract starts with \`packages/shared/src/types/skill.ts#SkillSearchParams\`. Five filter properties accept optional string arrays: \`testingTypes\`, \`frameworks\`, \`languages\`, \`domains\`, and \`agents\`. The type also defines an optional query, sort value, page, page size, and verification flag.

Types describe valid compile-time calls but do not validate data at runtime. The related \`packages/shared/src/schemas/skill-schema.ts#skillSearchSchema\` uses arrays of strings for the same five fields. It also limits page to positive integers, page size to one through one hundred, and sort to four named values.

The CLI API client does not call that schema inside \`searchSkills\`. A caller that bypasses TypeScript can still pass surprising runtime values, and the serializer will follow its own array or scalar branch. Tests for schema rejection and tests for URL output should therefore be separate suites with separate expectations.

This distinction prevents false confidence. Passing \`page: 0\` through a cast may serialize \`page=0\`, even though the shared schema would reject it. The client test should document current transport behavior, while an integration requirement may call for validation before a request.

The object passed by \`searchSkills\` has a stable source order: query, testing types, frameworks, languages, domains, agents, sort, page, page size, then verification. JavaScript preserves ordinary string-key insertion order for this object. Still, consumers should use key-based access unless raw pair order is a declared compatibility requirement.

There is no comma splitting in this layer. A value containing a comma stays one string after URL round trip. That makes repeated pairs unambiguous and avoids guessing whether punctuation separates values or belongs inside one value.

The public interactive command may expose fewer filters than \`SkillSearchParams\`, but the low-level client contract remains useful to SDK code and future command options. For broader result filtering, compare this transport guide with the [Typesense multi-select testing guide](/blog/testing-typesense-multiselect-facet-filter-queries). That article addresses search behavior after parameters reach another layer.

## How do you test multi value skill search?

Test multi value skill search by controlling fetch, calling \`searchSkills\`, and parsing its captured URL. Assert every repeated key with \`getAll\`, every scalar with \`get\`, and every omitted field with \`has\`. Then add one exact sequence assertion so a change in pair order is visible rather than accidental.

Use this repeatable procedure:

1. Read \`buildUrl\` and record its array, scalar, and undefined branches.
2. Stub global fetch with one successful JSON response and retain its call history.
3. Call \`searchSkills\` with two values per array plus page and boolean scalars.
4. Parse the captured URL and compare each key through \`getAll\` or \`get\`.
5. Add empty, duplicate, encoded, and undefined inputs as named test cases.
6. Restore fetch after every case and run the CLI package test in CI.

The main test should use all five arrays because a mapping typo can affect one property while the helper remains correct. A smaller parameterized test can then vary one array across empty, single, duplicate, and encoded values. This division keeps failure output precise without repeating the full setup.

For raw order, inspect \`Array.from(url.searchParams.entries())\`. Compare a complete array of pairs only in one test, since many exact snapshots become expensive when fields are added. Other tests should ask direct questions about one key and one omission.

A useful negative case returns an HTTP error after the URL is captured. That result proves serialization occurs before response handling, but it should not replace the successful test. The request helper reads response text and throws an \`API error {status}\` message when \`ok\` is false.

Run this suite without credentials and without a persistent server. The API search path is public, and the local unit test needs no database because fetch never leaves the process. Follow the [getting started guide](/getting-started) only for a later command smoke check against a controlled endpoint.

## query parameter order testing failure and edge-case matrix

Query parameter order testing should distinguish a wrong value set from a wrong sequence. Most server handlers retrieve values by key, so value equality is usually the stronger application requirement. Sequence still deserves one check because logs, caches, signatures, or snapshots may observe the raw URL.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| URLSearchParams append arrays | Two values for every array | One pair per value in input order | Joined, omitted, or reordered values | \`packages/cli/src/lib/api-client.ts#buildUrl\` |
| Repeated filter query keys | Duplicate framework values | Both pairs remain present | Hidden deduplication | \`packages/cli/src/lib/api-client.ts#searchSkills\` |
| Multi value skill search | Empty and undefined arrays | No pair for either field | Empty placeholder key | \`packages/shared/src/types/skill.ts#SkillSearchParams\` |
| Encoded filter text | Spaces, slash, hash, and comma | Parsed values match the inputs | Corrupted decoded text | URL platform contract |
| Scalar boundary | \`false\`, page one, size one hundred | Text values remain present | Falsy boolean omitted | \`packages/shared/src/schemas/skill-schema.ts#skillSearchSchema\` |
| searchSkills URL contract | Repeated isolated CI run | Identical captured pair sequence | Shared mock or state leak | CLI package test |

One malformed case should pass a runtime value through an explicit cast and record what the serializer does. Label that test as transport characterization, not supported input. Supported boundaries come from the schema, while the cast documents risk at an untyped call boundary.

Avoid asserting the base host unless the test resets modules after changing \`QASKILLS_API_URL\`. The \`BASE\` constant is calculated when the module loads, so setting the environment later will not update an already imported module. A URL-path assertion is often enough for this suite.

If a base URL override matters, isolate the module cache before import and restore the environment afterward. Run those cases serially when they mutate one process variable. This keeps [test environment management](/blog/test-environment-management-guide) concerns from contaminating the repeated-key contract.

The matrix should fail with short, semantic messages. Print the key, expected list, actual list, and raw URL only when a comparison fails. Do not expose private hosts or query text from unrelated tests in shared CI logs.

## How should searchSkills URL contract run in CI?

The searchSkills URL contract should run as a deterministic CLI package test on every API client change. It needs a mocked fetch response, restored globals, no database, and no public network. One optional smoke lane can call the catalog later, but its result should never replace the local branch assertions.

Put the narrow test beside the API client or in the current CLI test tree. Build the shared package first when the workspace requires generated output, then run the filtered CLI test command. The [error-handling patterns guide](/blog/error-handling-testing-patterns) can inform failure naming, while this suite should stay limited to URL creation.

Timer cleanup also matters because \`request\` starts a ten-second timeout for each call. The helper clears that timer in \`finally\`, including JSON parsing and error paths. A settled fetch mock should leave no open handle, and fake timer tests should always restore real timers.

Use fixed input arrays rather than randomly generated values in the required gate. Property-based cases can supplement the suite, but a release check needs stable failures that show which contract changed. A small encoded-value set covers the highest-risk branches with clearer reports.

The CI gate should verify that fetch runs once, receives an abort signal, and returns the controlled result. It should also check that malformed response handling does not mutate the already captured URL. These assertions separate construction, transport, and decoding without starting a server.

After the package test passes, a post-flow smoke test can request a known catalog query and inspect only response status plus a valid result shape. Use the [agents directory](/agents) or catalog data to choose safe filter values, but do not require a particular ranking. Ranking is not part of QASkills CLI repeated query parameters.

## Implementation checklist for QASkills CLI repeated query parameters

QASkills CLI repeated query parameters are covered when the fixture proves all five arrays, scalar conversion, omission, encoding, duplicates, and repeat-run isolation. The evidence should point back to the client mapping and shared contracts, not to assumptions about a browser address bar. Every test name should identify the key and behavior it owns.

Use this release checklist:

- Capture the URL from the public \`searchSkills\` call.
- Compare array values through \`searchParams.getAll\`.
- Compare query, sort, page, size, and boolean values through \`get\`.
- Prove undefined and empty arrays do not create pairs.
- Prove duplicate values remain duplicated under current code.
- Keep one exact pair-order assertion and avoid broad snapshots.
- Restore fetch, timers, environment values, and module state.
- Keep live search ranking outside the required serialization gate.

The source path \`packages/cli/src/lib/api-client.ts\` proves construction and request behavior. The path \`packages/shared/src/types/skill.ts\` proves the public TypeScript shape, while \`packages/shared/src/schemas/skill-schema.ts\` proves runtime limits when callers use the schema. Those sources should remain named in test comments or failure documentation.

Review internal behavior against the [categories directory](/categories), but never use catalog counts as the unit-test oracle. If the client adds another array filter, update the full fixture and the table in the same change. That practice catches a type addition that was never forwarded into the URL.

Finally, inspect test logs for a readable URL and one clear failed assertion. A release gate that prints hundreds of encoded pairs is harder to use than a key-focused comparison. Small fixtures make the QASkills CLI repeated query parameters contract easy to review and maintain.

Keep each case small, and let one row prove one rule at a time. A row for two framework values should not also own a failed response and a changed host. When that row fails, the team can see which pair was lost and where it should sit. This plain split cuts the time spent reading logs after a change.

Name the input list in the test before the call, then use that same list in the check. This step keeps the source of truth close to the failed line and makes a wrong value easy to spot. Do not rebuild the expected list from the URL, since that would repeat the code under test. A fixed list also makes code review quick and clear.

Use one helper to read the URL from the fetch spy, but keep each key check in the test. The helper may fail when fetch was not called or when its first value is not text. It should return a real \`URL\`, so all later checks use the same safe parser. This keeps setup short without hiding the rule each case must prove.

When a test checks pair order, print the pairs as a short list if they do not match. The raw URL can still appear on the next line for deeper work. Keep query text free from keys, names, or data that should not reach a shared build log. The [site FAQ](/faq) can guide users, while test logs should serve the team that owns the client.

Run the same core case twice in one test process to catch state that leaks from a prior call. Each call should make a new URL and should keep only the values passed for that run. A second call with one framework must not retain two values from the first call. This check is cheap because no file, host, or live service is involved.

Make one review rule explicit: each new array field needs a type, a schema entry, a client mapping, and a test row. A change that touches just three of those places is not complete. Reviewers can search the four repository paths named in this guide and compare the field names side by side. That check helps QASkills CLI repeated query parameters grow without silent gaps.

Keep the final test data close to real catalog terms but free from live catalog state. Values such as \`e2e\`, \`visual\`, \`playwright\`, and \`typescript\` are clear to a reader. The server does not need to know those values in this unit test. Their job is to show pair count, pair order, and exact round-trip text.

Let the test fail with a short fact that a new team member can read at once. Show the key, the list sent, and the list found, then add the raw URL as a last aid. Keep each word plain and each row tied to one rule. This style makes a small pair bug quick to find and safe to fix.

## Frequently Asked Questions

### What does URLSearchParams append arrays verify in QASkills?

It verifies that every selected value becomes a separate pair under one filter key. The best assertion parses the captured request and compares \`getAll(key)\` with the original array. This proves value count and order without depending on a hand-written encoding rule or a live server response.

### When should a team test repeated filter query keys?

Test them whenever the client mapping, search parameter type, runtime schema, or API filter list changes. Keep the test in the normal CLI package gate because a missing pair can silently narrow results. A separate live check may watch server interpretation without replacing this deterministic contract test.

### How can a fixture isolate qaskills array parameter serialization?

Stub global fetch with a fixed JSON response, call \`searchSkills\`, and inspect the first fetch argument. Restore the global after every case and avoid database or public network access. This isolates URL construction while still exercising the public client path that production code actually calls.

### Which assertion proves multi value skill search?

Compare \`url.searchParams.getAll('frameworks')\` with the complete input array, then repeat that assertion for every supported array field. Also prove fetch runs once. Result counts cannot prove serialization because changing catalog content may hide a dropped filter or produce the same visible skills.

### What failure cases belong in query parameter order testing tests?

Include reversed input, duplicate values, empty arrays, undefined values, encoded text, and mixed scalar fields. Report value-set failures separately from sequence failures. This distinction shows whether the client lost information or only changed raw URL ordering, which may have different compatibility effects.

### How should CI run searchSkills URL contract checks?

Run them with fixed inputs, mocked fetch, restored timers, and no credentials in the filtered CLI test job. Build required workspace dependencies first. Add a separate post-flow smoke request only for deployed API shape, and do not assert production ranking inside the local serialization suite.

## Conclusion

QASkills CLI repeated query parameters rely on a simple rule: arrays append repeated pairs, scalars become text, and undefined fields disappear. Good tests observe the public \`searchSkills\` request, parse it with the same URL platform, and keep runtime validation distinct from transport characterization.

Start with the isolated fixture in the [getting started workflow](/getting-started), then review the same filter names in the public [QA skills catalog](/skills). Preserve the pair matrix in CI so each future filter reaches the request exactly as its typed input specifies.`,
};
