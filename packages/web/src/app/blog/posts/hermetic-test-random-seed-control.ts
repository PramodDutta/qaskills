import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'hermetic test random seed control',
  description:
    'hermetic test random seed control: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Testing Frameworks',
  primaryKeyword: 'hermetic test random seed control',
  keywords: [
    'hermetic test random seed control',
    'hermetic test random seed',
    'replay randomized test failure',
    'print seed in CI logs',
    'deterministic random test data',
    'seeded fixture generation',
  ],
  relatedSlugs: [
    'mutation-testing-stryker-guide',
    'property-based-testing-complete-guide',
    'pairwise-combinatorial-testing-guide-2026',
    'faker-deterministic-seed-parallel-tests',
  ],
  sources: [
    'https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/',
    'https://testing.googleblog.com/2012/10/hermetic-servers.html',
    'https://martinfowler.com/articles/nonDeterminism.html',
  ],
  repoEvidence: [
    'seed-skills/mutation-testing-advanced/SKILL.md',
    'seed-skills/test-hermetic-patterns/SKILL.md',
  ],
  content: `hermetic test random seed control makes one saved seed drive every test value. The suite prints that seed when a case fails, starts a new generator for replay, and checks the same list again in local and CI runs. Any use of time, shared state, or hidden chance must fail.

## What does hermetic test random seed control verify?

- The contract begins before any random value is drawn. One root seed enters through a documented command option, environment variable, or replay artifact. Every generator receives owned state derived from that root, and no fixture calls ambient randomness or the wall clock behind the harness.

- The root seed must appear once in the run manifest and once in each failure record. A developer should not need to search mixed logs or infer the value from generated data.

- The generator algorithm and version belong beside the seed. The same number given to a changed algorithm may produce a different sequence, so a seed without generator identity is incomplete evidence.

- Each case needs a stable index or case ID. If setup consumes one extra draw, the harness can identify the first changed index instead of reporting only a different final object.

- Parallel workers need deterministic child seeds. Derive them from the root and a stable shard key, never from startup order, process ID, current time, or a shared mutable generator.

- A minimized failing case should preserve both the original discovery seed and the final reduced input. The reduced value gives a fast regression, while the seed and shrink path explain how discovery reached it.

- seed-skills/test-hermetic-patterns/SKILL.md recommends isolated dependencies, deterministic time and random sources, independent tests, and resource cleanup. It provides principles rather than a specific JavaScript generator.

- seed-skills/mutation-testing-advanced/SKILL.md recommends focused tests, controlled changes, actionable reports, and CI gates. Those practices support deterministic fault campaigns, while the seed protocol here remains an article recommendation.

- The [property-based testing guide](/blog/property-based-testing-complete-guide) covers generator-led test design. This article owns seed input, child streams, replay artifacts, and the evidence needed to distinguish data drift from an application regression.

## How do you build a hermetic test random seed?

Start with a generated-data test that accepts a root seed from one ordered source. A command option can override an environment value, which can override a committed default. Record the resolved source so an unexpected CI variable cannot silently change local behavior.

- Use a small owned pseudo-random generator with a documented algorithm. Do not wrap Math.random and call the wrapper deterministic, because JavaScript does not expose a portable seed for that global generator. The harness should create generator instances and pass them into every factory.

The baseline fixture can generate account IDs, quantities, flags, and enum choices. Save the first values, a sequence digest, the root seed, the generator version, and the case count. A second run with the same manifest must match every field exactly.

- This TypeScript adaptation follows the repository's guidance to keep fixtures focused, independent, and free from external dependencies. It uses one numeric state and emits unsigned 32-bit values, making the algorithm explicit in test code.

\`\`\`typescript
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';

type RandomSource = {
  nextUint32(): number;
  pick<T>(values: readonly T[]): T;
};

function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    nextUint32() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return (value ^ (value >>> 14)) >>> 0;
    },
    pick<T>(values: readonly T[]) {
      return values[this.nextUint32() % values.length]!;
    },
  };
}

function generateCases(seed: number, count: number) {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, index) => ({
    caseId: \`case-\${index}\`,
    quantity: 1 + (random.nextUint32() % 20),
    role: random.pick(['reader', 'editor', 'owner'] as const),
  }));
}

const first = generateCases(41721, 8);
const replay = generateCases(41721, 8);
assert.deepEqual(replay, first);
assert.equal(
  createHash('sha256').update(JSON.stringify(replay)).digest('hex'),
  createHash('sha256').update(JSON.stringify(first)).digest('hex'),
);
\`\`\`

- The first assertion proves full input equality, while the digest gives a compact CI comparison. Keep the generated values too, because a hash mismatch identifies drift but does not show the first differing case. Hashes are evidence indexes, not replacements for safe input snapshots.

- Run a different-seed control with the same count. At least one generated field should differ, proving the harness is not returning a constant fixture. Do not demand that every field differ because finite generators can legitimately repeat values.

- Keep network access and shared services outside this focused test. The [Google hermetic servers article](https://testing.googleblog.com/2012/10/hermetic-servers.html) describes locally started systems with injected connections, bundled resources, and controlled data. The same dependency ownership principle applies to random input.

Use the [mutation testing guide](/blog/mutation-testing-stryker-guide) for broader fault campaigns. The seed fixture should first prove its own replay contract before it drives mutations, load, or concurrency.

## What breaks replay randomized test failure?

- Replay randomized test failure breaks when any generated value comes from outside the recorded stream. One direct Math.random call is enough to change a branch while every logged seeded value remains identical. Static analysis or a narrow runtime guard can ban ambient random calls inside fixture modules.

Time-derived values cause the same problem. A factory that appends Date.now to an ID changes output even under a stable root seed. Inject a fixed clock, record its epoch, and keep time advancement under the test's control.

Worker collisions appear when each process receives the same root and starts at draw zero. Two workers can create identical records or consume shared resources in a schedule-dependent order. Derive a child stream from stable shard identity and prove child seeds are distinct.

Shared generator state is equally unsafe. If tests import one generator singleton, execution order controls which test receives each draw. Create state per test or per named fixture, and reconstruct it from committed inputs at setup.

Locale and time-zone defaults can change formatted generated data after the numbers remain stable. Store raw values for the replay oracle, then set locale and zone explicitly when formatting is part of the case.

Shrinkers can hide the discovery path. A framework may print only the minimized value, only the seed, or both, depending on its API. The adapter should capture original seed, case index, reduced input, shrink trace or replay path, and framework version when available.

- The [non-deterministic testing article](https://martinfowler.com/articles/nonDeterminism.html) identifies lack of isolation, asynchronous behavior, remote services, time, and resource leaks as common causes. It also recommends wrapping the system clock so tests can substitute a controlled value.

- The [deterministic Faker guide](/blog/faker-deterministic-seed-parallel-tests) covers a library-specific pattern. Keep this cross-framework contract at the adapter boundary so a generator package can change without changing the artifact fields.

## print seed in CI logs fixtures and controls

Print seed in CI logs does not mean dumping every generated payload. Emit one machine-readable run line at startup and one focused replay line on failure. Redact secrets and personal data while retaining seed, generator, version, shard, case index, and safe input digest.

- The positive control runs the same seed twice in separate processes. Sequence snapshots, digests, case IDs, and final assertions must match without reusing a temp directory.

- The negative control adds one ambient random value through a test-only adapter. The replay comparison must fail at the exact field and case index, proving the oracle detects hidden entropy.

- The boundary control tests seeds zero, one, the largest accepted unsigned value, and a value outside the accepted range. Normalize or reject values through one documented policy.

- The parallel control derives streams for worker zero and worker one. Their child seeds and first sequences must differ, while each stream must replay alone from root plus worker key.

- The reduced-case control replays a saved minimal input without running discovery. It should fail at the same assertion and keep the original discovery fields in the artifact.

- The cleanup control removes per-run directories, closes local fakes, restores guarded globals, and proves the next run begins with fresh generator state. Failure artifacts may remain in the designated CI folder.

Use a JSON line such as seed_manifest with scalar fields rather than prose assembled by several tools. The CI interface can render that record and expose a ready replay command. Keep the actual command shell-safe and avoid embedding untrusted generated text.

- The [pairwise testing guide](/blog/pairwise-combinatorial-testing-guide-2026) can reduce fixed combinations before random exploration. Seed evidence remains useful when a random stage adds values around those planned combinations.

## How should deterministic random test data be asserted?

- Deterministic random test data needs equality at several levels. Assert the resolved seed and source, generator identity, ordered sequence, generated case snapshot, failure identity, and replay result. A final test status alone cannot show which layer drifted.

Exact equality is strongest for root seed, child seed, generator version, case count, ordered raw values, case IDs, and reduced input. Compare parsed structures instead of formatted logs, because spacing and key order can change without changing the fixture.

A sequence digest adds a compact guard for large input sets. Compute it over a canonical encoding with explicit field order and stable numeric representation. When it differs, compare raw cases to locate the first changed value.

- A partial-order assertion fits generated ranges rather than replay. It can prove that quantity stays inside one through twenty, yet it cannot prove reconstruction. Keep validity assertions beside exact replay assertions because the two answer different questions.

- State-transition assertions apply to shrink steps. Each reduced candidate should preserve failure while becoming smaller under the framework's ordering. Save the terminal reduced case and enough framework evidence to invoke its replay mode.

- Bounded timing can protect a randomized campaign from endless generation, but elapsed time should not determine which cases are generated. Prefer a fixed case count for replay, then place an outer timeout around the complete deterministic sequence.

- Compatibility assertions should state runtime, architecture when relevant, package versions, locale, and time zone. If the generator promises only same-version replay, pin that version rather than claiming cross-version equality.

- The [Stryker mutant states reference](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/) distinguishes killed, survived, timeout, runtime error, compile error, ignored, and other outcomes. A seeded mutation report should keep such outcome identity separate from its random ordering.

- Use the [property-based guide](/blog/property-based-testing-complete-guide) for framework-specific replay hooks. The cross-framework artifact should still expose stable seed and case identity even when a framework stores extra details.

## seeded fixture generation in CI

Seeded fixture generation should resolve one root at job start and make it immutable. Pull-request jobs can use a committed rotating set, while scheduled discovery can create a fresh seed and print it before execution. A failing discovery seed then becomes a replay input for the next job.

Do not generate the seed after setup fails. Print the manifest before fixture construction so early failures still show the intended run identity. If policy creates a fresh seed, use an approved entropy source once and record its resolved numeric value.

- Keep replay separate from discovery. The replay job accepts a captured artifact, disables seed rotation, uses the exact case count, and fails if generator or framework versions differ from required values. A version mismatch should not silently produce new data.

For parallel jobs, derive child seeds from stable shard labels such as suite and shard index. Do not use process IDs or completion order. Save the mapping from root to each child so one worker can be replayed without launching the complete matrix.

- CI should upload a small manifest, safe failing input, sequence digest, reduced case, test output, and cleanup status. It should not upload credentials, production records, or generated values that resemble private customer data.

- The repository's hermetic skill says dependencies should be controlled, tests should be independent, and resources should be cleaned after execution. The mutation skill asks for reports and quality gates. Those principles support a deterministic seed artifact with a nonzero result on replay drift.

- Open the [QA skills directory](/skills) for generator and isolation patterns. Keep the owning adapter in the test repository so CI configuration cannot bypass seed resolution.

## hermetic test random seed control comparison matrix

- This matrix separates sequence reconstruction, environment portability, variation, parallel ownership, and reduced-case replay. Each row records both input identity and observed data. A run passes only when the expected relationship holds at the raw-value and artifact levels.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Same seed in two local runs | Fresh processes, one seed, fixed count | Ordered cases and digests match exactly | First raw value or case ID differs | seed-skills/mutation-testing-advanced/SKILL.md |
| Same seed on local and CI runners | Pinned runtime, locale, zone, and generator | Manifest and sequence snapshot match | Environment changes generated raw data | seed-skills/test-hermetic-patterns/SKILL.md |
| Different seed with the same test count | Only root seed changes | Count stays fixed and at least one value differs | Data is constant or count changes | [Non-deterministic tests](https://martinfowler.com/articles/nonDeterminism.html) |
| Parallel workers deriving child seeds | Stable root, suite key, and shard index | Child streams differ and replay independently | Collision or schedule changes a stream | [Hermetic servers](https://testing.googleblog.com/2012/10/hermetic-servers.html) |
| Replay of a minimized failing case | Captured seed, index, reduced input, and versions | Same assertion fails without discovery | Failure moves, passes, or loses identity | [Stryker states](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/) |

The first row is the core replay proof. The second controls environmental formatting and runtime behavior. The third proves the seed reaches generation, while the fourth verifies owned parallel streams.

- The last row treats the minimized input as a first-class regression case. Preserve its discovery seed even when direct reduced-input replay becomes faster, because the original artifact supports later generator investigations.

- Report the first differing path, not just unequal JSON. A message such as case-14.quantity expected 7 but observed 12 leads directly to generator consumption or normalization code.

- Use the [blog index](/blog) for adjacent isolation, fake-service, and CI guidance. This matrix should remain independent of one property-testing library.

## How do you implement hermetic test random seed control?

- Implementation needs one seed resolver, one generator adapter, one child-seed function, one canonical manifest, and one replay command. Keep those pieces small enough to test without running the application suite. Reject malformed artifacts before creating any fixture.

The next example derives a child seed from stable text, writes explicit diagnostics, and proves replay under a new generator instance. It adapts the independent-test and cleanup rules from seed-skills/test-hermetic-patterns/SKILL.md.

\`\`\`typescript
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';

function childSeed(root: number, suite: string, shard: number): number {
  const digest = createHash('sha256')
    .update(\`\${root >>> 0}:\${suite}:\${shard}\`)
    .digest();
  return digest.readUInt32BE(0);
}

function buildManifest(root: number, suite: string, shard: number, count: number) {
  return {
    schema: 1,
    rootSeed: root >>> 0,
    childSeed: childSeed(root, suite, shard),
    suite,
    shard,
    count,
    generator: 'owned-mulberry32-v1',
    locale: 'en-US',
    timeZone: 'UTC',
  };
}

const manifest = buildManifest(41721, 'checkout-properties', 2, 50);
const firstRun = generateCases(manifest.childSeed, manifest.count);
const replayRun = generateCases(manifest.childSeed, manifest.count);

assert.deepEqual(replayRun, firstRun);
assert.notEqual(
  childSeed(manifest.rootSeed, manifest.suite, 0),
  childSeed(manifest.rootSeed, manifest.suite, 1),
);

console.error(
  JSON.stringify({
    event: 'seed_manifest',
    ...manifest,
    replay: \`SEED=\${manifest.rootSeed} SHARD=\${manifest.shard} npm test\`,
  }),
);
\`\`\`

The child function is an owned protocol, so changing it requires a schema or generator version change. The test compares fresh instances and distinct shards. In production, validate suite and shard inputs before rendering the replay command.

Use this procedure to install the contract:

1. Read seed-skills/mutation-testing-advanced/SKILL.md and seed-skills/test-hermetic-patterns/SKILL.md, then document isolation, generated-input, reporting, CI, and cleanup responsibilities.
2. Create a seed resolver with explicit option, environment, artifact, and default precedence, then reject values outside the supported numeric domain.
3. Run a positive case with an owned generator, fixed clock, locale, zone, case count, snapshots, sequence digest, failure identity, and complete manifest.
4. Inject direct Math.random, current time, worker collisions, shared state, locale drift, and an omitted shrink record one at a time while preserving every other input.
5. Compare local repeat, local-to-CI, different-seed, child-stream, and minimized-replay rows, then report the first divergent field or state.
6. Run discovery and replay jobs in CI, upload only safe artifacts, clean local fakes and temp paths, restore guarded globals, and keep failures nonzero.

Add a test that resolves the same seed from every supported source. The resulting manifest should be identical except for its source label, and precedence tests should prove that a command option cannot be overwritten by an ambient variable.

Run one case after cleanup with the committed default. If its first values depend on the prior test, a singleton or leaked environment value still owns part of the stream.

- The [Faker parallel seed guide](/blog/faker-deterministic-seed-parallel-tests) can implement this protocol for one library. Retain the generic manifest fields so another generator can be evaluated with the same matrix.

## Frequently Asked Questions

### How can a hermetic suite control random seeds, print them on failure, and replay the exact generated sequence?

- Resolve one root seed before setup, pass owned generator instances into every factory, and derive worker streams from stable shard keys. Record seed, source, algorithm, versions, count, case index, and digest. Recreate fresh instances from that manifest, then compare ordered raw inputs and the original failing assertion.

### What should a hermetic test random seed fixture record?

- Record root and child seeds, seed source, generator name and version, suite, shard, case count, case IDs, raw safe inputs, canonical digest, runtime, locale, time zone, fixed clock, failure identity, reduced case, and cleanup result. Never rely on a seed number without its generator protocol.

### Which failure proves replay randomized test failure is broken?

- The clearest failure uses the same validated manifest in a fresh process but changes the ordered raw sequence, case identity, or target assertion. Report the first differing field. A changed log format alone is not replay failure, while an equal digest with a different failure suggests shared state elsewhere.

### How do teams isolate print seed in CI logs?

- Emit one structured manifest before setup and one focused failure record afterward. Keep seed and replay fields separate from application payloads, redact private values, and use a stable event name. Test log capture with a child process so wrapper scripts cannot omit stderr or replace the failing exit code.

### Which assertion is strongest for deterministic random test data?

- Exact equality of parsed manifests and ordered raw cases is strongest. Add a canonical sequence digest for compact comparison and validity checks for allowed ranges. A digest alone cannot locate drift, while range checks alone cannot prove replay. The original failing assertion must also recur under the reconstructed fixture.

### How should CI report seeded fixture generation failures?

- CI should report suite, shard, root and child seeds, generator and framework versions, count, first differing case path, safe digest, reduced input reference, replay command, and cleanup status. It should preserve a nonzero result for drift or unreplayable failure and avoid printing secrets or production-derived records.

## Conclusion

hermetic test random seed control gives each run one clear source for all test data. The saved file must name the seed, tool, case count, child stream, and failed case.
This makes hermetic test random seed control easy to replay and audit.

Begin with a short list and two shards. Run the same seed twice, then use a new seed and prove that at least one safe value can change.

Next, replay each child stream on its own. A child must use the same values each time, while two child keys must not share one stream.

Freeze the clock and set the zone and locale. These small steps stop date text, IDs, and sort rules from changing data that the seed did not own.

Save the first field that does not match, not just a hash. That short note tells the team whether setup took an extra draw or a tool changed its rule.

Run one clean case after all fault checks. It must start at the first draw and use no file, variable, or shared object from the prior run.

Review the [mutation testing guide](/blog/mutation-testing-stryker-guide), then open the [QA skills directory](/skills). Use the hermetic test random seed control matrix in the next test run.`,
};
