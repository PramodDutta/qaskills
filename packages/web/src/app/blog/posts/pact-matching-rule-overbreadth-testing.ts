import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact matching rule overbreadth testing',
  description:
    'Pact matching rule overbreadth testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Pact matching rule overbreadth testing',
  keywords: [
    'Pact matching rule overbreadth testing',
    'Pact matcher overbreadth',
    'consumer contract false positive',
    'Pact regex matcher test',
    'strict versus flexible matcher',
    'contract negative example testing',
  ],
  relatedSlugs: [
    'api-contract-testing-microservices',
    'contract-testing-pact-complete-guide',
    'bidirectional-contract-testing-pact-2026',
    'contract-testing-pact-vs-spring-cloud-contract-2026',
  ],
  sources: [
    'https://docs.pact.io/implementation_guides/javascript/docs/matching',
    'https://docs.pact.io/getting_started/matching',
  ],
  repoEvidence: [
    'seed-skills/contract-testing-pact/SKILL.md',
    'seed-skills/api-contract-validator/SKILL.md',
  ],
  content: `Pact matching rule overbreadth testing pairs each valid provider example with one-field mutations that should break the real consumer. A good matcher accepts planned change in IDs, dates, and list size, yet rejects wrong types, bad formats, missing used fields, unsafe values, and array shapes the consumer cannot read.

A passing provider check is not enough. It may pass because the contract is right, or because a type matcher accepts any string where the client needs a coded value. Negative examples reveal the true edge by asking which harmful response still passes.

The repo offers both halves of the method. \`seed-skills/contract-testing-pact/SKILL.md\` defines consumer expectations with exact values, type matchers, regex matchers, array matchers, provider states, and provider verification. \`seed-skills/api-contract-validator/SKILL.md\` checks types, formats, required fields, schema change, errors, fixed fixtures, and one clear cause per failure.

This article uses those files as evidence and adds a mutation matrix as test advice. Read the [API contract testing guide](/blog/api-contract-testing-microservices), then browse [contract QA skills](/skills) for reusable steps. Pact matching rule overbreadth testing should protect consumer needs without freezing harmless provider change.

## What Does Pact Matching Rule Overbreadth Testing Verify?

Pact matching rule overbreadth testing verifies that every matcher has a stated acceptance edge tied to code the consumer runs. A valid changed value should pass, while a one-field value outside that edge should fail provider verification or a checked matcher harness before release.

The Pact skill shows a consumer pact with \`like\`, \`string\`, \`uuid\`, \`integer\`, \`regex\`, and \`eachLike\`. It also shows provider verification against pact files and provider states. Its best practice favors matchers over exact values so contracts do not fail on harmless data change.

The validator skill adds another key fact: contract checks should cover types, required fields, formats, errors, versions, and negative inputs. It warns that testing only valid inputs misses much of the contract. These points support a paired valid and invalid case for each consumer need.

Pact's [JavaScript matching guide](https://docs.pact.io/implementation_guides/javascript/docs/matching) explains that a type matcher checks the template type, while array matchers can set size bounds. It also lists format and regex tools. The chosen matcher must reflect what the client can safely accept.

The goal is not to make every response exact. A display name may accept any nonempty string, and an array may accept new items. A role branch, URL parser, ID split, money field, or date parser may need a tighter type, pattern, range, or set.

Write one sentence beside each matcher: \`The consumer uses this field to...\`. If no consumer code uses the value, remove the field from that consumer contract instead of adding a strict rule for its own sake.

Use the [complete Pact guide](/blog/contract-testing-pact-complete-guide) for the wider pact flow. This page stays at matcher choice, harmful mutations, and proof that the contract fails when the client would fail.

## How Do You Build Pact Matcher Overbreadth?

Build Pact matcher overbreadth around one small response used by a real client path. Choose a user card with \`id\`, \`role\`, \`email\`, \`displayName\`, and \`permissions\`. Map each field to the client operation that consumes it before choosing a matcher.

Start with a valid example that the consumer test reads through the real API client. The mock response should drive the branch, parser, or view at issue. An assertion that only checks \`toBeDefined\` cannot show whether the matcher protects actual use.

For \`id\`, ask whether any string works. If the client treats it only as opaque text, a string matcher may be right. If it builds a route that requires \`usr_\` plus six digits, encode and test that rule or change the client to treat IDs as opaque.

For \`role\`, a broad string matcher can create a false pass if the client switches only on \`admin\`, \`member\`, and \`viewer\`. An anchored regex or another supported constrained matcher can state those values. The negative example \`owner\` should then fail.

For arrays, define item shape and the size fact the consumer needs. A list view may accept zero or many items, while code that reads the first item needs at least one. Do not use \`eachLike\` by habit without reviewing its minimum and any upper bound.

Create a mutation ledger with case ID, JSON path, valid value, changed value, consumer effect, matcher rule, and expected verification result. Keep one changed path per case. This makes a surprise pass point to one matcher rather than a whole malformed body.

Run the unmodified provider state first and require a pass. Then run each mutation through the same pact and verifier setup. Reset provider data between cases so a prior mutation cannot change the next response.

Compare the plan with [bidirectional Pact testing](/blog/bidirectional-contract-testing-pact-2026), but do not merge their scopes. This fixture asks whether one consumer pact rejects values that break that consumer.

## What Breaks a Consumer Contract False Positive?

A consumer contract false positive occurs when provider verification passes a response that the consumer cannot use. Type-only matchers on coded strings, unanchored regexes, loose arrays, missing critical checks, and positive-only examples are common causes. The provider is green while the client path would throw or choose the wrong branch.

A type matcher is too broad when client behavior depends on more than type. A string can be empty, use an unknown enum value, hold a bad URL, or break an ID parser. Pair the type with the weakest rule that matches real consumer use.

An unanchored regex may match one valid fragment inside bad text. A role pattern such as \`admin|user\` can match \`superadmin\` in some engines. Use start and end anchors when the full value must belong to the allowed form, then test bad prefixes and suffixes.

Array matchers can hide item or size faults. A type rule for each entry does not prove the list has the count the client assumes. Test empty, one, valid many, an invalid extra item, and an item missing the field used in the loop.

Missing fields need care because response matching may permit fields the consumer did not name. Pact's [general matching guidance](https://docs.pact.io/getting_started/matching) explains that response checks are meant to be loose and may ignore extra response keys. That behavior is not a defect when the consumer does not care about those keys.

The harmful case is the reverse: a field the consumer reads is absent or too weakly constrained. Make the consumer test exercise that read, and ensure the pact body names the field. Then mutate its provider response and expect verification to fail.

A harness fault appears when the mutation never reaches the provider stub, the wrong pact file is loaded, or a cached verification result is reused. A matcher fault appears when the exact harmful response is verified against the intended fresh pact and still passes.

Review [Pact versus Spring Cloud Contract](/blog/contract-testing-pact-vs-spring-cloud-contract-2026) for tool choice. Keep the false-positive proof bound to the matcher rules generated by this Pact consumer.

## Pact Regex Matcher Test Fixtures and Controls

A Pact regex matcher test should include one example, two valid variants, and at least four bad values around the pattern edge. For a user ID, test the sample, another six-digit ID, too few digits, too many digits, a wrong prefix, and a valid fragment with bad text around it.

The positive control proves the consumer can use a second valid value, not only the generated example. This matters because a contract may look flexible while a consumer test still asserts the sample exactly. The API client assertion should accept both valid variants through real parsing.

The negative controls should each have one clear reason. Keep wrong prefix, bad size, empty string, and trailing text as separate cases. A single value that breaks three rules cannot identify which part of the pattern is missing.

Use an anchored expression when the full string has a fixed form. Save the exact pattern text from the generated pact file, not only the TypeScript source. This catches an escape or DSL conversion error between consumer code and pact output.

Test the pattern with the same Pact implementation that provider verification uses. A native JavaScript \`RegExp\` precheck can help the fixture, but it is not final proof when the matcher engine or pact form differs. The JavaScript matching guide warns that implementation details can matter.

Keep random values out of the core matrix. Fixed examples make pact changes and failed rows easy to compare. If a property test later makes more strings, log the seed and retain one small failing value.

Cleanup should remove only pact and provider data created for the run. Save the pact hash, consumer version, provider version, matcher path, and mutation ID. Do not publish intentionally weak or test-only pacts to a shared deploy gate.

The validator skill's fixed fixtures, format checks, and detailed errors fit this plan. Browse [API testing categories](/categories/api-testing) for nearby schema tests, while keeping Pact matcher behavior as its own result.

## How Should Strict Versus Flexible Matcher Be Asserted?

Strict versus flexible matcher choice should be asserted against consumer behavior, not taste. Exact matching fits values the consumer itself sends or constants it truly requires. Flexible matching fits provider values that may vary while the client can still parse, branch, show, or store them safely.

Use exact equality for status codes, fixed protocol tokens, and request values under consumer control when the interaction requires them. Use a type matcher for opaque values. Use format or regex rules only when client code relies on that shape.

Use bounded arrays when the client has a size need. A minimum is enough for code that reads the first item, while a maximum belongs only where the consumer has a real cap. If the view can page any size, an arbitrary maximum would make safe provider change fail.

Use set-like rules for enum branches. Every value the client handles should pass, and one unknown value should follow the product's chosen rule. The contract may reject unknown values, or the client may support an explicit fallback and accept them.

Use a state transition for nullable or missing data. The provider state should create the value, omit it, or set it to null without changing unrelated fields. The consumer test then proves its behavior for every state promised by the contract.

Avoid a strict whole-body snapshot. Extra provider fields are often safe for a consumer, and exact sample values make pacts hard to change. Assert only the paths, types, formats, bounds, and values tied to consumer work.

The strongest oracle has a valid variation that passes and a harmful variation that fails for each matcher. If both pass, the rule is too broad or the consumer does not need that edge. If both fail, the rule or fixture is too strict.

Use the [API contract guide](/blog/api-contract-testing-microservices) for wider compatibility choices. Pact matching rule overbreadth testing keeps each decision tied to one consumer and one harmful change.

## Contract Negative Example Testing in CI

Contract negative example testing should run after normal consumer tests generate a fresh pact and before that pact reaches a shared broker. Pin the Pact library, specification version, consumer code, provider stub, and mutation ledger. Save a hash of the pact used by every row.

Run the valid provider response first. If it fails, stop the negative matrix because matcher rejection cannot be judged from a broken base. Then start a fresh provider state for each one-field mutation and expect the planned pass or failure.

Do not publish test mutations as real provider versions. They are local fault modes used to inspect the contract edge. Keep their verification output in a CI artifact named by pact hash and case ID.

Classify an unexpected pass as high risk only when the mutation would break proven consumer behavior. A new unused provider field should usually pass. An ID that the client parser rejects, a removed used field, or a wrong type should not.

The CI record should include consumer name and version, provider name and test version, interaction, JSON path, matcher kind, mutation, expected result, actual result, pact hash, and verifier version. Redact real account data and broker tokens.

Retries must make a fresh provider state and rerun the valid base. Repeating only the failed mutation can reuse a stale stub mode or verifier cache. Preserve the first outcome and label any infrastructure retry.

Gate on unexpected results in both directions. An invalid value that passes means overbreadth, while a valid variation that fails means brittleness. Report those labels separately because they require opposite matcher changes.

Link contract setup to \`seed-skills/contract-testing-pact/SKILL.md\` and mutation details to \`seed-skills/api-contract-validator/SKILL.md\`. Review [the project FAQ](/faq), then share the runbook through [QA skills](/skills) after the gate is stable.

## Pact Matching Rule Overbreadth Testing Comparison Matrix

The matrix below begins with an accepted sample and changes one response fact per row. The expected result follows the named consumer need, not a general rule that every API must reject the same value.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Exact matcher with documented value | Fixed provider state returns the required protocol token while all other response paths use the same valid base body. | Consumer test and fresh provider verification both pass, proving the fixture and pact work before any harmful mutation runs. | Base interaction fails, stale pact hash is loaded, or provider state differs before the first mutation can test matcher width. | \`seed-skills/contract-testing-pact/SKILL.md\` for consumer expectations, provider states, pact output, and provider verification. |
| Type matcher with invalid meaning | String keeps its type but uses a role the client cannot branch on, with every other field left valid. | Verification fails under a constrained rule or the consumer's safe unknown-role fallback is run and proved with real client code. | Broad type matcher passes while the client path throws, chooses the wrong branch, or leaves a state the product cannot show. | Both repository skills for matcher use, consumer needs, negative values, and clear contract faults. |
| Anchored versus unanchored regex | Valid ID fragment is wrapped in bad prefix or suffix text while the same generated pact and provider state remain fixed. | Anchored full-value rule rejects the changed ID, and a second valid ID still passes to prove useful provider freedom. | Pattern accepts a valid substring inside an invalid value, generated pact drops its anchors, or a native precheck masks verifier behavior. | Pact JavaScript matching guide for regex rules, type matchers, generated examples, and implementation-specific matcher details. |
| Array with an invalid extra item | Valid list gains one item with a wrong used-field type while its valid peers and required minimum count stay unchanged. | Item matcher rejects the bad entry while empty, one-item, and valid many-item cases follow the consumer's stated size needs. | Loose array rule skips or accepts the bad item, checks only the first entry, or enforces an arbitrary size the client does not need. | Pact matcher reference for item templates, flexible arrays, minimum bounds, maximum bounds, and constrained array forms. |
| Critical field removed | Provider omits one field read by the client, retains every unrelated path, and serves the response from a fresh named provider state. | Verification and the real client-use test expose the missing field at its JSON path before a later view or branch can hide it. | Pact stays green because the field was never expressed, the consumer test checks only presence, or cached verification uses another pact file. | \`seed-skills/api-contract-validator/SKILL.md\` for required fields, fixed fixtures, consumer-driven checks, and negative contract cases. |

Do not add a row for harmless extra response keys and expect failure. Pact response matching is intentionally open to fields a consumer does not name. A new key needs a separate consumer contract only when that consumer begins to use it.

Add status, header, null, and numeric bound rows when real client code depends on them. Keep each mutation at one path and record the expected consumer effect. A matrix with clear reasons is safer than a large set of random bad JSON.

Pact matching rule overbreadth testing should fail at the first unexpected match result and still list all planned rows. Compare this matrix with the [complete Pact guide](/blog/contract-testing-pact-complete-guide) before changing shared interactions.

## How Do You Implement Pact Matching Rule Overbreadth Testing?

Implement Pact matching rule overbreadth testing from a real consumer use map. Generate the pact with a valid example, inspect the saved matching rule, and run the base provider check. Only then apply one harmful mutation at a time.

1. Read \`seed-skills/contract-testing-pact/SKILL.md\` and \`seed-skills/api-contract-validator/SKILL.md\`, then record consumer, pact, provider state, field, and cleanup duties.
2. Build one valid interaction plus provider bodies with wrong types, bad formats, missing used fields, broad regex matches, and unsafe array shapes.
3. Run the valid consumer and provider case, capturing pact hash, matcher paths, consumer assertions, provider output, and cleanup state.
4. Inject one mutation per run, including type-only semantic faults, unanchored patterns, bad array items, removed critical fields, and a harmless extra key.
5. Compare outcomes with the five matrix rows, then report the first matcher path whose result differs from the consumer boundary.
6. Run the gate in CI, retain redacted pact evidence, reset provider state, avoid broker publication, and link each fault to its repo path.

The first TypeScript example expresses a coded ID, a role set, and a nonempty permission list. It adapts the matcher style shown in the Pact skill while making the consumer's field rules clear.

\`\`\`typescript
import { MatchersV3 } from '@pact-foundation/pact';

const { eachLike, regex, string } = MatchersV3;

export const userCardBody = {
  id: regex(/^usr_[0-9]{6}$/, 'usr_123456'),
  role: regex(/^(admin|member|viewer)$/, 'member'),
  email: regex(/^[^ @]+@[^ @]+[.][^ @]+$/, 'reader@example.test'),
  displayName: string('Case Reader'),
  permissions: eachLike(
    regex(/^(read|write|approve)$/, 'read'),
    { min: 1 },
  ),
};
\`\`\`

The sample patterns are test rules, not universal business rules. Replace them with the forms the actual consumer needs, and verify the generated pact stores the expected pattern and list minimum.

The second example drives fixed provider mutations through a local verification adapter. That adapter should start the same provider route with the chosen body, then invoke the pinned Pact verifier against the fresh pact.

\`\`\`typescript
type MatcherCase = {
  id: string;
  body: Record<string, unknown>;
  shouldVerify: boolean;
};

const valid = {
  id: 'usr_654321',
  role: 'viewer',
  email: 'next@example.test',
  displayName: 'Next Reader',
  permissions: ['read'],
};

const matcherCases: MatcherCase[] = [
  { id: 'valid-variation', body: valid, shouldVerify: true },
  {
    id: 'bad-role',
    body: { ...valid, role: 'owner' },
    shouldVerify: false,
  },
  {
    id: 'bad-id-suffix',
    body: { ...valid, id: 'usr_654321-extra' },
    shouldVerify: false,
  },
  {
    id: 'bad-array-item',
    body: { ...valid, permissions: ['read', 7] },
    shouldVerify: false,
  },
];

for (const testCase of matcherCases) {
  const result = await verifyFreshProviderBody(testCase.id, testCase.body);
  expect(result.verified).toBe(testCase.shouldVerify);
}
\`\`\`

Add one case with \`debugLabel\` as an extra response key and expect it to pass when the consumer ignores it. This positive flexibility control stops the suite from replacing overbroad matchers with an exact whole-body snapshot.

Save the generated pact hash before each provider run and reject any mismatch. A mutation test against the wrong pact says nothing about matcher width. Clean local pact output after the artifact is saved.

Review the result through [contract testing resources](/blog), then publish the focused procedure in [the skills directory](/skills). Keep the mutation ledger beside the consumer code so matcher edits and client use change together.

## Frequently Asked Questions

### How can consumer tests detect Pact matchers that are so permissive they allow breaking provider responses?

Map each matched field to real consumer code, then pair a valid variation with a one-field harmful mutation. Run both through a fresh pact and provider verifier. If the harmful body verifies while the consumer parser, branch, or view fails, the matcher is too broad for that consumer need.

### What should a Pact matcher overbreadth fixture record?

Record consumer and provider names, versions, interaction, pact hash, specification and library versions, JSON path, matcher kind, valid example, mutation, consumer effect, expected verification result, actual result, provider state, and cleanup status. Use fixed test data and remove broker tokens or real user values from artifacts.

### Which failure proves a consumer contract false positive is broken?

The strongest proof is a fresh provider verification that accepts the exact mutated response while a real consumer-use assertion rejects or mishandles it. First prove the right pact and provider state were loaded. A pass caused by stale verification data or an unused field does not prove matcher overbreadth.

### How do teams isolate a Pact regex matcher test?

Use one fixed field and test the sample, another valid value, wrong prefix, wrong size, empty text, and bad suffix as separate rows. Save the generated pact pattern and run the same verifier engine used in CI. Reset provider state and pact output between test groups.

### Which assertion is strongest for strict versus flexible matcher?

Require one safe provider variation to pass and one consumer-breaking variation to fail. Exact values fit true constants, types fit opaque data, and patterns or bounds fit shapes the client uses. A whole-body snapshot is too strict, while a type-only rule can be too loose for coded values.

### How should CI report contract negative example testing failures?

Report interaction, matcher path, mutation ID, consumer effect, expected and actual verification result, pact hash, tool versions, provider state, and cleanup status. Label unexpected passes as overbroad and unexpected failures as brittle. Keep test-only pacts local, attach redacted output, and preserve the first failed run before retrying.

## Conclusion

Pact matching rule overbreadth testing defines matcher width with consumer use, fixed valid changes, and one-field harmful mutations. It catches type rules, regexes, arrays, and missing used fields that let a breaking provider response pass, while a harmless extra-key control protects useful flexibility.

Run the five-row mutation matrix before publishing the next changed pact. Review the [API contract testing guide](/blog/api-contract-testing-microservices), then open [QA skills](/skills) and implement the Pact matching rule overbreadth testing matrix in the next test run.`,
};
