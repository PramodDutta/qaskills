import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Faker.js & Faker Python: Generate Realistic Test Data (2026)",
  description: "Generate realistic test data with Faker.js (@faker-js/faker) and Faker Python: real APIs for names, emails, seeding, locales, uniqueness, and pytest fixtures.",
  date: "2026-06-26",
  category: "Testing",
  content: `Faker generates realistic fake data — names, emails, addresses, phone numbers, dates — so tests and seed scripts stop relying on \`"foo@bar.com"\`. In JavaScript/TypeScript the maintained package is **\`@faker-js/faker\`**: \`import { faker }\` then call namespaced methods like \`faker.person.fullName()\` and \`faker.internet.email()\`. In Python it is the **\`Faker\`** package: \`from faker import Faker\`, instantiate \`fake = Faker()\`, then \`fake.name()\`, \`fake.email()\`. Both support deterministic **seeding** (\`faker.seed(123)\` / \`Faker.seed(0)\`), dozens of **locales**, **uniqueness** guarantees, and custom providers. This guide covers the real 2026 API for both, including the breaking renames in Faker.js v8+.

This tutorial targets \`@faker-js/faker\` 9.x and Python \`Faker\` 30+. For installable, agent-ready testing skills across stacks, see the [QASkills directory](/skills).

## Install the right package (this trips people up)

There are two historical "faker" packages in npm, and using the wrong one is the single most common mistake. The original \`faker\` package was deprecated and sabotaged by its author in early 2022; the community fork lives at **\`@faker-js/faker\`** and is the only one you should install today.

\`\`\`bash
# JavaScript / TypeScript — the maintained fork
npm install --save-dev @faker-js/faker

# Python
pip install Faker
\`\`\`

Do **not** \`npm install faker\` (no scope) — that pulls the abandoned package. The scoped \`@faker-js/faker\` ships its own TypeScript types, so there is no separate \`@types/...\` install.

\`\`\`ts
// correct import
import { faker } from '@faker-js/faker';

const name = faker.person.fullName();
const email = faker.internet.email();
\`\`\`

\`\`\`python
from faker import Faker

fake = Faker()
print(fake.name())   # 'Lucy Cechtelar'
print(fake.email())  # 'tyler.hoeger@example.org'
\`\`\`

## Faker.js: the namespaced API (and the v8 renames)

Faker.js groups generators into **modules** accessed as properties on the \`faker\` object: \`faker.person\`, \`faker.internet\`, \`faker.location\`, \`faker.commerce\`, \`faker.date\`, and so on. If you are following an old Stack Overflow answer, note that **v8 renamed several top-level modules** — the old names are gone in v9.

| Old (≤ v7) | New (v8 / v9) | Example |
|---|---|---|
| \`faker.name\` | \`faker.person\` | \`faker.person.firstName()\` |
| \`faker.address\` | \`faker.location\` | \`faker.location.city()\` |
| \`faker.random.word\` | \`faker.lorem\` / \`faker.word\` | \`faker.word.noun()\` |
| \`faker.random.alphaNumeric\` | \`faker.string.alphanumeric\` | \`faker.string.alphanumeric(10)\` |
| \`faker.datatype.uuid\` | \`faker.string.uuid\` | \`faker.string.uuid()\` |
| \`faker.datatype.number\` | \`faker.number.int\` | \`faker.number.int({ min: 1, max: 99 })\` |

A representative grab-bag of the most-used generators:

\`\`\`ts
import { faker } from '@faker-js/faker';

faker.person.firstName();              // 'Jane'
faker.person.fullName();               // 'Jane Doe'
faker.internet.email();                // 'jane.doe42@gmail.com'
faker.internet.email({ firstName: 'Jane', lastName: 'Doe' });
faker.internet.userName();             // 'Jane_Doe'
faker.location.city();                 // 'Port Lavinia'
faker.location.streetAddress();        // '742 Evergreen Terrace'
faker.location.zipCode();              // '90210'
faker.phone.number();                  // '(555) 123-4567'
faker.string.uuid();                   // 'a1b2c3d4-...'
faker.number.int({ min: 18, max: 65 });// 37
faker.date.past();                     // Date in the past
faker.commerce.productName();          // 'Handcrafted Steel Chair'
faker.helpers.arrayElement(['a', 'b', 'c']); // random pick
\`\`\`

\`faker.helpers\` is the utility module worth memorizing: \`arrayElement\`, \`arrayElements\`, \`multiple\` (build an array of N items from a callback), and \`fromRegExp\` for pattern-driven strings.

## Building a typed object factory in TypeScript

The real value of Faker shows up when you wrap it in a factory that returns a fully-typed entity, optionally overriding fields per test. \`faker.helpers.multiple\` builds collections cleanly.

\`\`\`ts
import { faker } from '@faker-js/faker';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
}

function makeUser(overrides: Partial<User> = {}): User {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: faker.string.uuid(),
    name: \`\${firstName} \${lastName}\`,
    email: faker.internet.email({ firstName, lastName }),
    age: faker.number.int({ min: 18, max: 80 }),
    isActive: faker.datatype.boolean(),
    ...overrides,
  };
}

const user = makeUser();
const admin = makeUser({ email: 'admin@example.com' }); // override one field

// a batch of 5 users
const users = faker.helpers.multiple(() => makeUser(), { count: 5 });
\`\`\`

Passing \`firstName\`/\`lastName\` into \`faker.internet.email()\` keeps the email consistent with the name, which makes failing-test output readable. This override-friendly factory pattern is the same idea explored more deeply in [test data management strategies](/blog/test-data-management-strategies).

## Faker Python: the flat method API

Python's \`Faker\` exposes generators as **methods on the instance** rather than namespaced modules. You instantiate once and reuse it; under the hood the instance is composed of **providers** (\`person\`, \`internet\`, \`address\`, \`company\`, …) whose methods are flattened onto the object.

\`\`\`python
from faker import Faker

fake = Faker()

fake.name()                 # 'Lucy Cechtelar'
fake.first_name()           # 'Lucy'
fake.last_name()            # 'Cechtelar'
fake.email()                # 'tyler.hoeger@example.org'
fake.user_name()            # 'lucy42'
fake.address()              # '426 Jordy Lodge\\nCartwrightshire, SC 88120-6700'
fake.city()                 # 'Lake Geovannyton'
fake.phone_number()         # '001-555-123-4567'
fake.uuid4()                # 'a1b2c3d4-...'
fake.random_int(min=18, max=65)
fake.date_of_birth(minimum_age=18, maximum_age=80)  # datetime.date
fake.company()              # 'Hettinger, Lind and Kihn'
fake.text()                 # paragraph of lorem-ish text
\`\`\`

Build a dictionary or dataclass factory the same way you would in TypeScript:

\`\`\`python
from dataclasses import dataclass
from faker import Faker

fake = Faker()

@dataclass
class User:
    id: str
    name: str
    email: str
    age: int

def make_user(**overrides) -> User:
    data = dict(
        id=fake.uuid4(),
        name=fake.name(),
        email=fake.email(),
        age=fake.random_int(min=18, max=80),
    )
    data.update(overrides)
    return User(**data)

users = [make_user() for _ in range(5)]
\`\`\`

## Seeding: making "random" reproducible

A test that uses random data must be reproducible, or a failure that only appears with one particular generated value is impossible to debug. **Seeding** pins the pseudo-random sequence so every run produces identical data.

\`\`\`ts
// Faker.js — seed the shared instance
import { faker } from '@faker-js/faker';

faker.seed(123);
faker.person.firstName();  // always the same value for seed 123
faker.person.firstName();  // deterministic next value

// reset to nondeterministic
faker.seed();
\`\`\`

\`\`\`python
# Faker Python — class method seeds the shared generator
from faker import Faker

Faker.seed(0)              # note: CLASS method, not instance
fake = Faker()
fake.name()                # deterministic for seed 0
\`\`\`

Two important gotchas. In Python, seeding is a **class method** — \`Faker.seed(0)\`, not \`fake.seed(0)\` — because all instances share one underlying random generator by default. In Faker.js, \`faker.seed(n)\` mutates the shared singleton, so seed once in a global test hook (\`beforeEach\`) rather than per-call. Determinism is also why seeding beats hand-rolled \`Math.random()\`: a failing CI run reproduces locally with the same seed. The trade-off between deterministic and freshly-random data is the same one weighed in the [FactoryBot sequences vs Faker discussion](/blog/bdd-test-data-management-best-practices).

## Locales: data that matches your market

Both libraries ship localized datasets so a German test gets German street names and a Japanese test gets Japanese names — important when validating address forms, phone formats, or i18n.

\`\`\`ts
// Faker.js v8+ — import a pre-built localized instance
import { fakerDE } from '@faker-js/faker/locale/de';
import { fakerJA } from '@faker-js/faker/locale/ja';

fakerDE.location.city();   // 'München'
fakerJA.person.lastName(); // '佐藤'
\`\`\`

\`\`\`python
# Faker Python — pass the locale to the constructor
from faker import Faker

fake_de = Faker('de_DE')
fake_de.city()             # 'Berlin'

# multiple locales — each call randomly picks one of them
fake_multi = Faker(['en_US', 'ja_JP', 'de_DE'])
fake_multi.name()
\`\`\`

Note the v8 change in Faker.js: you import a **named, pre-localized instance** (\`fakerDE\`) rather than calling \`faker.setLocale('de')\`, which no longer exists. Python keeps it on the constructor and even supports a weighted list of locales for realistic multi-region data.

## Guaranteeing unique values

Uniqueness constraints (email, username, slug) break the instant two generated rows collide. Both libraries provide an explicit uniqueness layer.

\`\`\`python
# Faker Python — .unique proxy raises UniquenessException if it can't find a new value
from faker import Faker

fake = Faker()
emails = [fake.unique.email() for _ in range(100)]  # all distinct
fake.unique.clear()                                  # reset the seen set
\`\`\`

\`\`\`ts
// Faker.js — helpers.uniqueArray for a batch of distinct values
import { faker } from '@faker-js/faker';

const emails = faker.helpers.uniqueArray(faker.internet.email, 100);
\`\`\`

For Faker.js, \`faker.helpers.uniqueArray(fn, length)\` is the supported path in v9 (the older standalone \`faker.unique()\` wrapper was removed). Be aware that uniqueness has limits: asking for more unique values than the source dataset can supply will eventually exhaust it — for high-volume distinctness, prefer a deterministic counter or \`faker.string.uuid()\`.

## Faker.js vs Faker Python at a glance

The two libraries solve the same problem with intentionally similar provider names, but the surface API differs in a few ways worth knowing before you port code between stacks.

| Concern | Faker.js (\`@faker-js/faker\`) | Faker Python (\`Faker\`) |
|---|---|---|
| Import | \`import { faker } from '@faker-js/faker'\` | \`from faker import Faker; fake = Faker()\` |
| API shape | Namespaced: \`faker.person.firstName()\` | Flat methods: \`fake.first_name()\` |
| Seeding | \`faker.seed(123)\` (instance/singleton) | \`Faker.seed(0)\` (**class** method) |
| Locale | Import \`fakerDE\` from \`/locale/de\` | \`Faker('de_DE')\` constructor arg |
| Uniqueness | \`faker.helpers.uniqueArray(fn, n)\` | \`fake.unique.email()\` |
| Batch | \`faker.helpers.multiple(fn, { count })\` | list comprehension |
| Types | Bundled TypeScript types | Python type hints / stubs |

**When to pick Faker.js.** Use it for any JS/TS codebase — Jest, Vitest, Playwright, Cypress, Node seed scripts. The namespaced API and bundled types give great editor autocomplete, and \`faker.helpers\` covers most fixture-building needs.

**When to pick Faker Python.** Use it for pytest, Django/Flask seeders, and data-pipeline tests. The \`faker\` pytest fixture (below) and the \`.unique\` proxy are particularly ergonomic, and \`Faker(locale_list)\` handles multi-region data in one object.

**Verdict.** They are peers, not competitors — pick the one matching your language. The mental model transfers almost one-to-one: providers, seeding, locales, uniqueness. The only real porting hazards are Python's class-level \`Faker.seed()\` and Faker.js's v8 module renames. To hand an AI coding agent this exact workflow, browse installable skills in the [QASkills directory](/skills) and the [comparison hub](/compare).

## Using Faker inside your test runner

You rarely call Faker in isolation — you wire it into a runner. The Python package ships a **pytest plugin**, so a \`faker\` fixture is available with zero config.

\`\`\`python
# test_users.py — \`faker\` fixture is provided by the Faker package, no import needed
def test_signup_accepts_generated_email(client, faker):
    email = faker.email()
    name = faker.name()
    resp = client.post('/signup', json={'name': name, 'email': email})
    assert resp.status_code == 201
\`\`\`

The fixture is automatically seeded per session for reproducibility; set the seed with \`@pytest.mark.faker(seed=...)\` or via \`--faker-seed\` on the command line. In Vitest or Jest, seed in a global hook so every test starts from a known state:

\`\`\`ts
import { faker } from '@faker-js/faker';
import { beforeEach } from 'vitest';

beforeEach(() => {
  faker.seed(42); // deterministic data for every test
});
\`\`\`

Seeding in \`beforeEach\` (rather than once at file load) isolates tests from each other — one test consuming extra random values can't shift the data another test sees. For broader patterns on keeping generated fixtures maintainable, see the [blog](/blog) index and the dedicated [AI test-data generation tools roundup](/blog/ai-test-data-generation-tools-2026).

## Common pitfalls

A short checklist of mistakes that bite teams adopting Faker:

- **Installing \`faker\` instead of \`@faker-js/faker\`** in Node — the unscoped package is the sabotaged, abandoned one.
- **Following pre-v8 docs** — \`faker.name\`, \`faker.address\`, and \`faker.setLocale()\` no longer exist; use \`faker.person\`, \`faker.location\`, and the \`/locale/*\` imports.
- **Forgetting Python's seed is a class method** — \`fake.seed(0)\` silently does nothing useful; use \`Faker.seed(0)\`.
- **Asserting on generated values** — never write \`expect(name).toBe('Jane Doe')\`; assert on shape, length, or format instead, since the value changes with the seed.
- **Over-relying on uniqueness for huge batches** — \`.unique\` exhausts a finite dataset; switch to UUIDs or counters past a few thousand rows.

## Frequently Asked Questions

### Is \`faker\` the same as \`@faker-js/faker\`?

No — and this matters. The unscoped \`faker\` npm package is the original project, which was deprecated and deliberately broken by its author in early 2022. The maintained community fork is **\`@faker-js/faker\`**, and it is the only one you should install for JavaScript or TypeScript. Always run \`npm install --save-dev @faker-js/faker\`, never \`npm install faker\`.

### How do I make Faker produce the same data every run?

Seed it. In Faker.js call \`faker.seed(123)\` before generating, and in Python call the class method \`Faker.seed(0)\`. With a fixed seed the pseudo-random sequence is identical on every run, so a test that fails on one generated value reproduces reliably. Seed inside a per-test hook (\`beforeEach\`, or pytest's session seeding) so tests stay isolated from each other.

### Why did \`faker.name\` and \`faker.address\` stop working?

Faker.js v8 renamed several top-level modules and v9 removed the old names entirely. \`faker.name\` became \`faker.person\`, \`faker.address\` became \`faker.location\`, \`faker.random.*\` split into \`faker.string\`/\`faker.number\`/\`faker.helpers\`, and \`faker.datatype.uuid\` became \`faker.string.uuid\`. If you are on v8 or v9, update your calls to the new module names — old tutorials predate the rename.

### How do I generate localized data like German or Japanese names?

In Faker.js, import a pre-built localized instance: \`import { fakerDE } from '@faker-js/faker/locale/de'\`, then call \`fakerDE.location.city()\`. The old \`faker.setLocale()\` was removed in v8. In Python, pass the locale to the constructor — \`Faker('de_DE')\` — or pass a list like \`Faker(['en_US', 'ja_JP'])\` to have each call randomly pick a locale.

### How do I guarantee unique emails or usernames?

In Python, use the \`.unique\` proxy: \`fake.unique.email()\` raises a \`UniquenessException\` rather than ever returning a duplicate, and \`fake.unique.clear()\` resets the seen set. In Faker.js, use \`faker.helpers.uniqueArray(faker.internet.email, 100)\` to get a batch of distinct values. For very large volumes, prefer \`faker.string.uuid()\` or a counter, since a finite dataset eventually runs out of unique values.

### Can I use Faker directly in pytest?

Yes — the \`Faker\` package bundles a pytest plugin, so a \`faker\` fixture is injected automatically with no extra install or import. Just add \`faker\` to your test signature: \`def test_signup(client, faker): ...\`. It is auto-seeded per session for reproducibility, and you can override the seed with \`@pytest.mark.faker(seed=...)\` or the \`--faker-seed\` command-line option.
`,
};
