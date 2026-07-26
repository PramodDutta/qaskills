import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills search filter flag testing',
  description:
    'QASkills search filter flag testing: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills search filter flag testing',
  keywords: [
    'QASkills search filter flag testing',
    'qaskills search type filter',
    'qaskills framework filter',
    'CLI filter argument mapping',
    'searchSkills parameter test',
    'QA skill filtered search',
    'Commander option contract test',
  ],
  relatedSlugs: [
    'ai-qa-skills-directory-2026',
    'error-handling-testing-patterns',
    'skill-md-format-guide',
    'qaskills-add-custom-directory-ci',
  ],
  sources: [
    'https://github.com/tj/commander.js',
    'https://nodejs.org/api/url.html#class-urlsearchparams',
    'https://vitest.dev/guide/mocking.html',
  ],
  repoEvidence: [
    'packages/cli/src/commands/search.ts#searchCommand',
    'packages/cli/src/lib/api-client.ts#searchSkills',
    'packages/shared/src/types/skill.ts#SkillSearchParams',
    'packages/shared/src/schemas/skill-schema.ts#skillSearchSchema',
  ],
  content: `QASkills search filter flag testing proves that \`qaskills search --type <value> --framework <value>\` passes each supplied value as a one-item API filter array; omitted flags become undefined, the query remains optional, and the limit becomes \`pageSize\`. Test the command-to-client call directly before testing URL serialization or result display.

## What does QASkills search filter flag testing guarantee?

QASkills search filter flag testing guarantees the public command maps user-facing type and framework options into \`SkillSearchParams\` without renaming or combining them; a supplied \`--type\` becomes \`testingTypes: [value]\`, while \`--framework\` becomes \`frameworks: [value]\`. Missing flags remain undefined rather than empty arrays.

This contract is implemented in \`packages/cli/src/commands/search.ts\`, where the command declares one optional query argument and three options: \`--type\`, \`--framework\`, and \`--limit\`. Its action resolves an absent query through a prompt, then calls the client from one guarded block.

The file \`packages/cli/src/lib/api-client.ts\` holds the search client, which receives the mapped object and forwards \`testingTypes\`, \`frameworks\`, and other supported fields to \`buildUrl\`. The test in this guide stops at the command-client boundary first, then adds one integration assertion for the resulting request.

This boundary prevents mixed failures, since URL parsing is irrelevant when a flag reaches \`searchSkills\` incorrectly. If mapping is correct but the server rejects a repeated query key, that belongs to a lower transport or API contract test.

The [Commander project](https://github.com/tj/commander.js) documents the option registration and action model used here. Repository code remains the authority for the chosen names, default limit, one-item arrays, prompt behavior, and output branches.

Use the [skills directory](/skills) to see available catalog data and the [categories page](/categories) to understand current filter labels. Deterministic tests should still supply fixed strings instead of scraping either page.

The command does not validate whether a type or framework exists before sending it. QASkills search filter flag testing should therefore assert faithful mapping, not claim that an arbitrary value is accepted by every API or returns results.

## How does qaskills search type filter work?

The qaskills search type filter starts with \`.option('-t, --type <type>', 'Filter by testing type')\`, and Commander gives the action one optional string. When that value is truthy, the command constructs \`testingTypes: [options.type]\`; otherwise, it passes \`testingTypes: undefined\`.

The singular CLI flag and plural API property are intentional, since users enter one type through this command interface while \`SkillSearchParams\` can represent several values for other callers. A regression could easily pass the scalar directly or use the wrong property, so the unit test should inspect the exact object.

\`\`\`typescript
const results = await searchSkills({
  query: searchQuery,
  testingTypes: options.type ? [options.type] : undefined,
  frameworks: options.framework ? [options.framework] : undefined,
  pageSize: parseInt(options.limit, 10),
});
\`\`\`

The query argument may be absent, in which case the action awaits a prompt and uses the returned text. A canceled prompt calls \`process.exit(0)\`, while a supplied query skips the prompt entirely. Flag mapping tests should provide a query so prompt behavior cannot obscure the call.

The default limit is the string \`'10'\`, declared by Commander, and the action converts it with \`parseInt(options.limit, 10)\`. No custom parser rejects text such as \`abc\` before that conversion, so a malformed value can become \`NaN\`.

Keep limit coverage adjacent because it shares the same client object, but do not let it replace filter assertions; the positive case should compare \`query\`, both arrays, and \`pageSize\`. A type-only case should prove \`frameworks\` remains undefined.

After the client returns, the command prints the total, handles an empty skill list, and renders each result, although those branches are outside the intent boundary. Mock a compact result object so the action finishes, but avoid snapshots of formatted output in the mapping suite.

The [AI QA skills directory guide](/blog/ai-qa-skills-directory-2026) explains catalog discovery from a user perspective. Here, the oracle is the argument received by \`searchSkills\`, not which live records happen to match.

QASkills search filter flag testing should also verify that the source flag string is not split on commas, since current code wraps the entire value once. If multi-select syntax is added later, that behavior needs a new command contract rather than an assumed parser.

## Which cases define qaskills framework filter?

A qaskills framework filter case mirrors type mapping but protects a different property, so \`--framework playwright\` must produce \`frameworks: ['playwright']\` and leave \`testingTypes\` undefined. Supplying both flags must preserve both one-element arrays in the same call.

Use simple values that make accidental swaps obvious, such as \`e2e\` for type and \`playwright\` for framework. If both fixtures use similar text, a broken property mapping may still look plausible in a snapshot.

Boundary coverage starts with omitted options. Neither omission should create an empty array. This matters because the client skips undefined values, while an empty array enters its array branch and appends nothing. The final URL may look the same, but the command-level object contract differs.

An empty textual option is difficult to produce through the normal \`<value>\` syntax because Commander expects a value. Test Commander's parse failure separately from action mapping. Do not call the action with an impossible shape and present that as a user-facing case.

Whitespace and unknown framework names are passed as supplied if Commander accepts the argument. Current command code does not trim or compare them against constants. A characterization test can record this fact, while input validation should be proposed as separate product work.

The public client serializes array entries by appending one query parameter for each value. The [Node URLSearchParams reference](https://nodejs.org/api/url.html#class-urlsearchparams) documents the URL object used by the client. This article's primary command test should not duplicate every serialization case.

For the integration case, capture the fetch URL and assert \`testingTypes=e2e\` and \`frameworks=playwright\`. Parse search parameters rather than comparing a full query string order. That keeps the test focused on values and key names.

Run a framework-only fixture twice after resetting mocks. It should produce two independent calls with the same object. The command has no filter cache, so prior type input must never enter the next action.

The [getting started guide](/getting-started) gives a stable place to document the command. A qaskills framework filter regression gate should stay offline and use a mocked response.

## CLI filter argument mapping and the current QASkills contract

CLI filter argument mapping crosses a small but meaningful type boundary. The action receives \`type?: string\`, \`framework?: string\`, and \`limit: string\`. The client expects \`SkillSearchParams\`, where \`testingTypes\` and \`frameworks\` are optional string arrays and \`pageSize\` is an optional number.

That interface is declared in \`packages/shared/src/types/skill.ts\`. It also permits languages, domains, agents, sorting, page number, and verified-only filtering. The search command does not expose or populate those additional fields in this path.

The runtime schema in \`packages/shared/src/schemas/skill-schema.ts\` has matching optional arrays and constrains \`pageSize\` to an integer between one and one hundred. However, \`searchCommand\` does not call \`skillSearchSchema.parse\`, and \`searchSkills\` does not call it either.

This difference must remain visible in tests. TypeScript proves source compatibility during compilation, while the Zod schema can validate explicit test fixtures. Neither automatically blocks a malformed CLI limit at runtime in the current command.

A useful contract test has two layers. First, mock \`searchSkills\` and assert the command object exactly. Second, feed that object to \`skillSearchSchema.safeParse\` in a separate test to show which values satisfy the shared intended limits.

Do not merge these oracles. If command mapping passes \`pageSize: NaN\`, the direct call assertion should report what happened, while schema validation should reject it. This exposes a real gap without inventing an error that the command does not currently produce.

The object also keeps \`query\` optional. When an interactive response supplies text, the command forwards that result without explicit trimming or schema parsing. Query sanitation and API search semantics are different concerns.

QASkills search filter flag testing benefits from compiling against the real \`SkillSearchParams\` type. A hand-written local interface can drift and allow the test to approve a property the client never reads.

The [SKILL.md format article](/blog/skill-md-format-guide) discusses fields used inside skill packages. Do not confuse those content fields with search request filters, even when terms such as framework and testing type appear in both places.

## How do you test searchSkills parameter test?

A searchSkills parameter test should control the command parser, prompt library, client function, and process state. It can leave filesystem and network untouched because the client is mocked at the module boundary.

Use this five-step procedure:

1. Mock \`searchSkills\` before importing \`searchCommand\`, then return a valid empty result.
2. Parse a command line containing a query, type, framework, and explicit limit.
3. Capture the sole client call and compare every mapped property with the expected value.
4. Repeat with omitted filters and a malformed limit, recording current behavior separately.
5. Restore prompt spies, command state, mocks, and \`process.exitCode\` after each case.

The [Vitest mocking guide](https://vitest.dev/guide/mocking.html) describes module replacement and spy cleanup. Because the exported command instance can retain parsing state, reset modules or build a fresh command instance for each case.

\`\`\`typescript
vi.mock('../src/lib/api-client', () => ({
  searchSkills: vi.fn().mockResolvedValue({
    skills: [],
    total: 0,
    page: 1,
    pageSize: 7,
    totalPages: 0,
  }),
}));

await searchCommand.parseAsync(
  ['node', 'qaskills', 'login', '--type', 'e2e', '--framework', 'playwright', '--limit', '7'],
  { from: 'node' },
);

expect(searchSkills).toHaveBeenCalledWith({
  query: 'login',
  testingTypes: ['e2e'],
  frameworks: ['playwright'],
  pageSize: 7,
});
\`\`\`

This example tests only argument mapping. The returned empty list drives the command through its no-results branch without requiring a complete skill fixture. Stub prompt presentation methods so terminal behavior does not clutter output.

Add an interactive-query case with no positional argument. Make the text prompt return \`api testing\`, then prove that value reaches the same object. A canceled prompt belongs in another case because it exits before client mapping.

The malformed limit case should not expect schema enforcement that does not exist. Assert \`Number.isNaN(received.pageSize)\` or document the current client URL result. If the command later adopts an option parser, update the expected failure boundary.

For one integration check, restore the real client and replace global fetch. Parse the captured URL's search parameters, then return a fixed JSON result. This verifies the command mapping survives the transport layer without contacting the site.

## QA skill filtered search failure and edge-case matrix

A QA skill filtered search matrix distinguishes parser failures, mapping defects, client failures, and empty results. Each row needs one controlled trigger and one observable result. Combining them makes the first broken boundary difficult to locate.

| Command case | Parsed arguments | Client call contract | Wrong observation | Source path |
|---|---|---|---|---|
| qaskills search type filter | Query plus \`--type e2e\` | \`testingTypes: ['e2e']\`, framework undefined | Scalar, wrong key, or empty array | \`packages/cli/src/commands/search.ts\` |
| qaskills framework filter | Both filter flags | Two distinct one-item arrays reach client | Values swapped, merged, or omitted | \`packages/cli/src/lib/api-client.ts\` |
| searchSkills parameter test | Missing filters or malformed limit | Undefined arrays; current invalid number is visible | Test invents runtime schema parsing | \`packages/shared/src/types/skill.ts\` |
| Commander option contract test | Missing required option value | Parser rejects before client invocation | API called despite parse failure | \`packages/shared/src/schemas/skill-schema.ts\` |

Client rejection enters the command catch block, stops the spinner with \`Search failed\`, logs that the site could not be reached, and prints connection advice. The catch does not inspect the error type. A mapping test should assert no rejection so this branch stays out of its result.

An empty successful result is different. The command stops the spinner with a total, logs \`No skills found\`, and returns normally. This is a valid QA skill filtered search outcome, not a transport failure.

A successful nonempty result triggers formatting that reads \`qualityScore\`, \`testingTypes\`, \`installCount\`, and other fields. Avoid using an incomplete skill object unless the test specifically targets rendering. The mapping suite can use an empty array.

Check a limit of \`0\`, \`101\`, negative text, decimal text, and nonnumeric text against the schema separately. \`parseInt\` transforms these inputs differently, and only schema validation states the intended one-to-one-hundred range.

Unknown filter values should still reach the client unchanged under current code. The server may return no records. Do not assert the command rejects them unless runtime validation is added.

Finally, run a test with option-looking text inside the query only when parser semantics matter. Keep that Commander-focused fixture apart from ordinary filter mapping.

## How should Commander option contract test run in CI?

A Commander option contract test should run in the CLI package on every change to search command declarations or shared search types. It needs no database, browser, or public network connection. Mocking the client makes failures fast and specific.

Compile the shared package first so the CLI uses current types. Then run the command test with deterministic prompt responses and an empty result fixture. One integration case may restore the client and use a fetch spy.

Reset the exported command between cases. Command objects hold options and parsed values, and test order should not change the next invocation. A fresh module import is simple and keeps each command line independent.

Avoid snapshots of terminal colors, spinner frames, or complete result cards. Assert important text for cancellation, empty results, and transport failure only in their dedicated cases. Parameter mapping should compare structured data.

Run table rows in both original and reversed order during local debugging. If reversal changes a call, module or command state leaked. Fix isolation rather than adding retries.

QASkills search filter flag testing should include one TypeScript compile check and one runtime schema characterization. These prove different things: source shape and accepted runtime values.

Store no production search response as a golden fixture. A small local object is enough. The [blog home](/blog) and [FAQ](/faq) remain documentation destinations, not CI dependencies.

When the command grows multi-value options, add cases without rewriting current historical assertions. The old one-value behavior should change only with a deliberate interface decision.

## Implementation checklist for QASkills search filter flag testing

Verify the declared short and long flags, optional query, and default limit first. Then assert type-only, framework-only, both-filter, and no-filter objects. Keep distinct fixture strings so property swaps are obvious.

Use \`packages/cli/src/commands/search.ts\` for command facts and treat \`packages/cli/src/lib/api-client.ts\` as the transport mapping source. Use \`packages/shared/src/types/skill.ts\` for compile-time shape and \`packages/shared/src/schemas/skill-schema.ts\` for explicit runtime constraints.

Assert undefined rather than merely absent query parameters at the command boundary. Then parse the real request URL in one integration case. These checks cover both object mapping and wire names without duplicating all client tests.

Characterize malformed limit handling honestly. Current code uses \`parseInt\` and does not call the Zod schema. A future validation fix should change a named expectation and add a useful diagnostic.

Keep citations limited to approved authoritative sources. Commander covers command parsing, Node covers URL search parameters, and Vitest covers mocking. Repository paths establish QASkills-specific behavior.

Run cleanup after success, cancellation, parser failure, and client rejection. Restore mocks and process state, and make every test own a fresh command instance.

Use the [categories page](/categories) to choose meaningful fixture labels and the [skills page](/skills) for a manual comparison after tests pass. Neither route should determine the automated result.

Name each case from the user's command line, then put the expected client object next to that line in the test data. This makes the map from a short flag to a plural field clear without a long setup block.

Start the main row with both flags, because that row can catch a swap that two single-flag rows might miss during quick review. Follow it with each flag alone so omitted fields are checked as well as set fields.

Use a query that is not the same as either filter value, such as \`login flow\`, and keep the result list empty. Distinct words help a failed call show which input landed in the wrong slot.

Compare arrays by value and order, not by a joined string, even though each has one item today. An array check guards the public type and gives a clear base when the command later gains more than one value.

Add a row with no filter flags and assert both keys are undefined in the received object. This row proves the command did not carry old options from the last parse or add blank arrays on its own.

Keep the default limit row apart from the custom limit row, since one comes from Commander setup and one comes from user text. Both should reach the client as numbers after the base-ten parse in current source.

For a bad limit, record the raw word, the parsed value, and the schema result in three fields. This short record shows that the command can pass \`NaN\` even while the shared schema rejects the same shape.

Do not turn that known gap into a test skip, because a plain current-behavior check gives a safe point for the later fix. When validation is added, the row can move from a client-call result to a clear user error.

For the prompt case, return a short query and assert the prompt ran once before the client call. In all flag-only map cases, supply a query and assert the prompt did not run, which keeps the setup paths distinct.

For cancellation, stub the process exit edge with care so it cannot end the test worker. Prove the client stays untouched, then restore the stub even if the output check fails.

At the wire edge, parse the captured URL and use \`getAll\` for array-backed keys. Even with one value, that check matches the client's append rule and leaves no false hint that only scalar query keys are valid.

The mock response should include a zero total and an empty skills list, plus the small page fields used by shared types. This lets command code finish its no-result path without fake skill cards or quality scores.

When the client rejects, check that no old successful result is printed and that the command reports its fixed reachability text. Keep the thrown cause in a spy if diagnosis needs it, since the command does not show that cause to users.

Run the same four map rows after any change to option names, aliases, defaults, or search types. A new user flag should get its own source-to-field row instead of being folded into a broad command snapshot.

Add one parse run that uses the short flags and one that uses the long flags, then compare the client calls as equal data. This proves each alias leads to the same map without tying the test to help text or color.

Put the input line at the top of each case and keep it as an array of args, not one shell string. Direct args let spaces stay in the value and match how Commander sees each token after the shell has done its work.

For the type-only row, check that the framework key is set to no value and that the type array has one item. For the framework-only row, make the same check in reverse so stale state is easy to spot.

For the both-flags row, use a page size that is not the default and assert it in the same object. This row proves the three set options reach one client call and do not cause a second search.

For the no-flags row, keep the query fixed and expect the default page size of ten. The call should hold no type or tool array, while the mock result should still lead to a normal no-match end state.

For the bad-page row, do not add a broad catch that turns all faults into the same test pass. Capture the value sent to the client first, then run the shared schema on a copy and state that those two facts are not the same gate.

For the prompt row, give the fake prompt one plain answer and assert that no text from an old query is joined to it. The client should see that answer once, with any supplied flags mapped just as they are in the direct-query rows.

For the cancel row, make the exit stub throw a small owned signal after it records the code, then catch only that signal. This keeps source flow from moving on to fetch while the test worker remains alive for its next case.

For the fetch row, parse the URL and call \`getAll\` on the two list keys, then compare one item in each. This wire check should sit after the direct map cases because it has more parts and a less sharp fault point.

Use one known term from the [QA skills guide](/blog/ai-qa-skills-directory-2026) for a manual check, but keep all test results fixed in code. A live catalog can gain or lose rows without changing how the command maps its flags.

Close each test with one line that says whether prompt, client, fetch, and output ran, using yes or no for each edge. That small trace can expose an extra call while staying far more useful than a full terminal snapshot.

QASkills search filter flag testing passes when each supplied flag reaches the right array and each omitted flag stays undefined. A clear failure must also name parser, mapping, transport, or display as the layer that changed.

## Frequently Asked Questions

### What does qaskills search type filter verify in QASkills?

It verifies that \`--type <value>\` becomes the one-element \`testingTypes\` array passed to \`searchSkills\`. It should also prove an omitted type becomes undefined. The test does not need live catalog results because its main and most useful oracle is the structured client argument.

### When should a team test qaskills framework filter?

Run the test whenever search options, client parameters, shared search types, or command parsing changes. Include framework-only and combined-filter cases in the gate. Distinct fixture values make a swap visible, while an empty mocked result keeps rendering details outside the contract.

### How can a fixture isolate CLI filter argument mapping?

Mock \`searchSkills\` before importing a fresh command instance, return a valid empty result, and supply a positional query to bypass prompts. Compare the complete call object, then restore modules, prompts, and process state. No filesystem or network fixture is required.

### Which assertion proves searchSkills parameter test?

Assert one exact client object containing the query, \`testingTypes\`, \`frameworks\`, and numeric \`pageSize\`. Follow it with a separate URL integration assertion if needed. Keeping this direct structured object check first identifies command mapping defects before later serialization can obscure them.

### What failure cases belong in QA skill filtered search tests?

Cover missing option values, omitted filters, unknown labels, malformed limits, client rejection, empty successful results, and leaked command state. Treat each as a separate boundary. Current code forwards unknown labels and does not apply the shared runtime schema inside the command.

### How should CI run Commander option contract test checks?

Run offline command tests after the shared package builds, using a mocked client and fresh command modules. Add one fetch-spy integration case, avoid output snapshots, and restore all state. Public catalog checks belong in a separate smoke lane after deterministic mapping tests pass.

## Conclusion

QASkills search filter flag testing protects a narrow translation that users depend on. The type flag maps to \`testingTypes\`, the framework flag maps to \`frameworks\`, and each supplied scalar becomes one array entry. Omitted flags remain undefined.

Tests should compare the command's structured client call before inspecting URL parameters or output. They should also expose the current gap between TypeScript types, the shared Zod schema, and runtime limit parsing without claiming validation occurs.

Use the [getting started guide](/getting-started) to run the command, then compare its behavior with the current [skills catalog](/skills). Add the four mapping cases and one real-client fetch assertion to the CLI package gate.`,
};
