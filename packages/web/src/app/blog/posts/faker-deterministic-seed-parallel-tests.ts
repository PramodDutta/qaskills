import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Deterministic Faker Seeds in Parallel Tests',
  description:
    'Design deterministic Faker seeds for parallel tests, reproduce failures by test identity, avoid worker collisions, and preserve realistic data variation.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Deterministic Faker Seeds in Parallel Tests

Worker three creates \`marco93@example.test\`, the uniqueness constraint fails, and the rerun passes because scheduling assigns the test to worker one. Random data has produced a real defect report with no replay key. The remedy is not one global seed copied into every process. That makes parallel generators emit identical sequences.

A useful seed scheme has two properties: the same test attempt can regenerate its data, and independent tests receive independent streams regardless of execution order. Test identity, run seed, and local draw order must be explicit.

## A seed controls a sequence, not global uniqueness

Faker is a pseudo-random data generator. Seeding selects a deterministic sequence for the installed Faker implementation and locale data. It does not reserve values across workers, guarantee database uniqueness, or promise the same output across library upgrades.

| Guarantee | A deterministic seed provides it? | Required addition |
|---|---:|---|
| Replay within the same Faker version and configuration | Yes | Record the effective seed |
| Different values in every worker | No | Derive distinct worker or test seeds |
| Database uniqueness across concurrent CI jobs | No | Add run namespace or allocate centrally |
| Stable output after a Faker upgrade | Not guaranteed | Pin version or snapshot semantic inputs |
| Independence from test scheduling | Only with per-test instances | Derive from stable test identity |

Avoid asserting the exact fictional name produced by a seed. That couples tests to Faker's datasets. Assert product behavior using the created value, and log the seed for replay.

## Do not share the default Faker singleton

In \`@faker-js/faker\`, the imported \`faker\` object has mutable generator state. Two tests drawing from it influence one another. In one process, concurrent async tests interleave calls. In multiple processes, each singleton begins from its own seed and can produce duplicates.

Construct a \`Faker\` instance per test with the locale definitions required by the suite. A per-test instance makes draw order local: adding \`faker.person.firstName()\` in another test cannot shift this test's email.

\`\`\`ts
// test-data.ts
import { createHash } from 'node:crypto';
import { Faker, en } from '@faker-js/faker';

function seedFrom(parts: readonly string[]): number {
  const digest = createHash('sha256').update(parts.join('\u001f')).digest();
  return digest.readUInt32BE(0);
}

export function fakerForTest(options: {
  runSeed: string;
  testId: string;
  variant?: string;
}): { faker: Faker; seed: number } {
  const seed = seedFrom([
    options.runSeed,
    options.testId,
    options.variant ?? 'default',
  ]);
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return { faker, seed };
}
\`\`\`

The unit separator reduces ambiguous concatenation: \`['ab', 'c']\` should not hash like \`['a', 'bc']\`. A 32-bit seed can collide because its space is finite. For test data, combine generated values with a unique run namespace when a hard uniqueness guarantee matters.

## Stable test identity beats worker number

Deriving only from \`workerIndex\` prevents identical streams among workers but makes data change when the scheduler moves a test. Reproduction then requires recreating worker placement. Derive the random stream from a stable test ID, such as normalized file path plus full test title.

Worker identity can still appear in external resource names to prevent concurrent ownership collisions. It should not be the primary replay identity for generated inputs.

| Seed input | Reproducible after scheduling changes? | Collision behavior |
|---|---:|---|
| Constant seed in every process | Yes, but misleading | Workers repeat the same sequence |
| Run seed plus worker index | No | Separate per worker within one run |
| Run seed plus test ID | Yes | Separate per named test, barring hash collision |
| Run seed plus test ID plus case index | Yes | Separate repeatable cases within a test |
| Current timestamp | No | Often unique, almost never replayable |

If parameterized cases have the same displayed title, include the parameter identifier. Do not use array position when cases are frequently reordered; use a semantic case key.

## A Playwright fixture with replay output

Playwright exposes stable title and file information through \`testInfo\`. A test-scoped fixture can create the generator and attach its effective seed on failure.

\`\`\`ts
// tests/fixtures/faker.ts
import { test as base } from '@playwright/test';
import type { Faker } from '@faker-js/faker';
import { fakerForTest } from '../../test-data';

type Fixtures = {
  testFaker: Faker;
};

export const test = base.extend<Fixtures>({
  testFaker: async ({}, use, testInfo) => {
    const runSeed = process.env.TEST_RUN_SEED ?? 'local-default';
    const testId = \`\${testInfo.file}::\${testInfo.titlePath.join(' > ')}\`;
    const { faker, seed } = fakerForTest({ runSeed, testId });

    await use(faker);

    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('faker-seed', {
        body: JSON.stringify({ runSeed, testId, seed }, null, 2),
        contentType: 'application/json',
      });
    }
  },
});
\`\`\`

A failed CI job can be replayed with the recorded \`TEST_RUN_SEED\` and the same test. The derived integer is useful for diagnosis, but the canonical inputs should also be retained so changes to the derivation function are visible.

Retries should normally use the same seed. A retry with new data answers a different question and can turn a deterministic product defect into apparent flakiness. If a suite intentionally explores several variants, model them as named cases rather than hidden retry randomness.

## Database uniqueness needs a namespace

Even independent random streams can collide. Faker's email generator samples a bounded set of names and domains. More importantly, two CI runs can intentionally replay the same seed against one shared environment.

Build database keys with a run namespace plus a deterministic local component:

\`\`\`ts
export function uniqueEmail(
  faker: Faker,
  runNamespace: string,
  sequence: number,
): string {
  const local = faker.string.alphanumeric({ length: 10, casing: 'lower' });
  const safeRun = runNamespace.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-12);
  return \`qa+\${safeRun}.\${sequence}.\${local}@example.test\`;
}
\`\`\`

The monotonically supplied \`sequence\` is local to the test or fixture, not a process-wide counter. The run namespace should come from CI metadata or a generated run ID. Use a domain reserved for testing, and verify that the application accepts plus addressing before relying on it.

For identifiers with a strict format, generate within that format and put namespace data into a related tenant or cleanup label. Do not weaken production validation to accommodate test strings.

## Order-independent record builders

A single generator used by a builder means field additions shift every later draw. That is reproducible but creates noisy changes. For highly stable fixtures, derive a child stream by field or entity role.

For example, create one Faker instance for \`customer:billing\` and another for \`customer:shipping\`. Adding a phone number to billing does not alter shipping. This costs more ceremony and should be reserved for data whose stability is valuable, such as snapshot inputs or cross-service fixtures.

Do not derive seeds with JavaScript's built-in object hash because there is none, nor with \`String(object)\`, which collapses objects to \`[object Object]\`. Canonicalize semantic inputs explicitly.

## Parallel property-like exploration

Faker is good at realistic-looking examples, but it is not a property-based testing engine with shrinking. If the objective is to discover minimal counterexamples across a structured input domain, use a property framework such as fast-check and record its seed and path.

| Tool or method | Primary strength | Failure replay |
|---|---|---|
| \`@faker-js/faker\` | Domain-flavored names, addresses, dates | Seed plus call sequence |
| fast-check | Generated structures and shrinking | Seed and shrink path |
| Static factories | Precise scenario control | Source-controlled input |
| Database sequence | Hard uniqueness in one database | Stored row identifiers |
| UUID from secure randomness | Extremely low collision probability | Record the actual UUID |

Combining Faker and fast-check is possible, but do not hide a mutable Faker singleton inside a property. Derive inputs from the property framework or construct a Faker instance from the generated seed for each case.

The [Faker test data strategies guide](/blog/faker-test-data-strategies-guide-2026) covers realistic factories and invalid data. The [test data management strategies article](/blog/test-data-management-strategies) addresses lifecycle, privacy, and environment ownership beyond generation.

## Locale and reference-date controls

The seed is not the only input. Locale definitions change name and address datasets. Date methods that use "now" can change output across days even with the same random sequence. Configure a reference date where the API supports it or pass explicit date boundaries.

Record Faker version, locale list, run seed, time zone, and relevant reference time in the test manifest. Pin dependencies through the lockfile. When upgrading Faker, expect deterministic snapshots to change and review them as fixture changes rather than product failures.

Time zones also change formatted results without changing the underlying generated instant. Prefer assertions on normalized instants or explicitly configured zones.

## Lifecycle and cleanup

Deterministic data makes cleanup easier because a failed run's namespace can be reconstructed. Still, tag created records with a run ID whenever the domain supports metadata. Cleanup by exact tenant or run label is safer than querying for an email prefix.

Do not delete every record matching \`qa+\` in a shared environment. Other jobs may still be active. Each run should own a namespace, and an orphan janitor should honor age and active-run checks.

If a test fails before recording created IDs, server-side correlation by run namespace remains possible. Include it in request headers only if the application has a test-safe metadata path and production rejects or ignores unauthorized test controls.

## Common seeding mistakes

Calling \`faker.seed(123)\` in \`beforeEach\` restores the same stream for every test. If every test asks for an email first, every test gets the same email. Calling it once globally makes results depend on which test happens to draw first. Adding a worker offset fixes duplicates only within one scheduling arrangement.

Generating a seed with \`Date.now()\` and never printing it is randomization without replay. Printing only the derived integer but not the Faker version can still make a future reproduction differ. Using a test title without its file path can collide across files.

Finally, random data should not replace boundary design. Faker will happily generate plausible middle-of-distribution values forever. Explicitly test empty, maximum-length, Unicode, normalization, and invalid combinations.

## Reviewing a deterministic data fixture

Ask where the root run seed comes from and how CI reports it. Confirm that test identity remains stable across worker counts. Verify retries retain the seed. Check that the generator instance is local rather than shared. Separate reproducibility from hard uniqueness and identify the mechanism for each.

Run the same test twice with one seed and compare generated semantic inputs. Then run two tests with different IDs and ensure their streams differ. Execute with one and four workers; the value for a given test should remain the same. Upgrade Faker in a branch to understand which guarantees the suite intentionally does not make.

The design is successful when a failure report contains enough information to recreate inputs without recreating scheduler timing, and when simultaneous workers cannot violate shared-environment uniqueness merely because their pseudo-random streams started alike.

## Python Faker and process-local generators

The same principles apply to Python's Faker package even though the API differs. Create a Faker instance in a test fixture and call its instance-level seed method for a derived test seed. Avoid relying on the class-level global seeding helper across independently collected tests.

Under pytest-xdist, each worker is a process and therefore has its own generator state. A session fixture seeded identically in every worker repeats the same sequence. A function-scoped fixture derived from pytest's node ID makes results independent of worker assignment. Include a root run seed so a scheduled exploratory run can change the corpus while remaining replayable.

If tests use multiple Faker instances for locales, seed each intentionally. Do not assume seeding one instance mutates all providers in another instance. Record the Python Faker version and locale configuration alongside the root seed.

## Seeds are sensitive data only in unusual cases

A pseudo-random seed is normally safe to print when it generates wholly synthetic fixtures. It becomes sensitive if the generator is misused to derive passwords, tokens, private keys, or production-like pseudonyms. Never use Faker or a replayable test seed for security credentials.

Generate authentication secrets with a cryptographically secure source and store only what the test needs. If reproducing a failure requires the actual short-lived credential, keep it in a protected secret-aware system rather than a public test attachment.

Synthetic names can still accidentally match real people. Use reserved domains and clearly fictional tenants. Do not combine a seeded fictional name with copied production addresses or identifiers and call the result anonymous.

## Shards, retries, and repeated projects

A stable test ID may appear in several browser projects or API configurations. Include project name in the derivation when each project should receive independent data. Omit it when exact cross-project parity is the purpose, but then ensure external keys do not collide while projects run together.

CI shards should not influence semantic data if a test can move among shards. Shard identity belongs in the run namespace for owned resources, not in the replay seed. Retries should retain both. A repeat-each configuration, by contrast, intentionally executes the same test several times; include the repeat index if it is meant to explore distinct deterministic variants.

Write these choices into the fixture API instead of letting individual tests concatenate ad hoc strings. Central derivation makes the replay contract reviewable.

## Random call order inside asynchronous code

Even a per-test generator can become scheduling-sensitive if several concurrent promises draw from it. The order of callbacks that call Faker may change with timing. Precompute each branch's inputs before starting concurrency, or derive a child generator for every logical branch.

This is especially important in load-shaped tests that launch many requests. Map stable request indexes to child seeds, build request payloads synchronously, then dispatch. Completion order can vary without changing inputs.

Do not serialize the whole application test merely to protect generator state. Isolate generation from concurrent execution. That preserves both deterministic evidence and the concurrency behavior under examination.

## Shrinking a production failure into a regression fixture

Once a seeded run finds a defect, replay the exact seed to confirm it. Then extract the smallest semantically relevant input into a static regression test. Keeping only the random case forces future maintainers to reconstruct why the value matters and ties the regression to generator internals.

Retain the broad seeded campaign as discovery coverage, but give the confirmed bug a descriptive fixture and assertion. If the failure depends on a sequence of generated entities, reduce the sequence manually or with a property-testing tool that supports shrinking.

The seed is evidence for reproduction, not the final specification of the defect.

## Frequently Asked Questions

### Should retries get a new Faker seed?

Usually no. A retry should reproduce the same input so it tests whether the failure is intermittent under equivalent conditions. Explore new data through explicit variants or a separate randomized campaign.

### Is a worker index enough to prevent duplicate Faker values?

It separates streams inside one run if correctly incorporated, but scheduling changes alter a test's data and separate CI runs can still collide. Derive replay data from test identity and use a run namespace for external uniqueness.

### Why did values change after upgrading \`@faker-js/faker\` with the same seed?

The library's algorithms and locale datasets are part of deterministic output. A seed does not promise stability across versions. Pin the version for replay and treat upgrades as deliberate fixture changes.

### Can I use Faker-generated emails as guaranteed unique database keys?

No. Add a deterministic sequence and run namespace, rely on a database allocation mechanism, or use an appropriately generated UUID. Faker provides plausible data, not a uniqueness registry.

### What must a failure report record?

Record the root run seed, stable test ID, derived seed, Faker version, locale configuration, and any time reference that affects generation. Also record actual external resource IDs when cleanup or investigation needs them.
`,
};
