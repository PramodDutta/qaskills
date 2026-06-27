import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "FactoryBot Tutorial 2026: Test Data Factories for RSpec & Rails",
  description: "A practical FactoryBot tutorial for Rails: define factories, use build vs create vs build_stubbed, add traits, sequences, transient attrs, and associations.",
  date: "2026-06-26",
  category: "Testing",
  content: `FactoryBot is the Ruby library for building test data: you declare a **factory** for each model, then call \`build\`, \`create\`, \`build_stubbed\`, or \`attributes_for\` to get an object in the exact state a test needs. A factory lives inside \`FactoryBot.define do ... end\`, names a class with \`factory :user do ... end\`, and lists attributes as blocks. From there you compose **traits** for variations, \`sequence\` for unique values, \`transient\` attributes for builder options, and \`association\` for related records. With \`factory_bot_rails\`, \`FactoryBot.lint\` proves every factory still builds a valid record. This guide covers the whole API with real factory_bot 6.x syntax.

This tutorial assumes Ruby on Rails with RSpec. For installable, agent-ready testing skills across stacks, see the [QASkills directory](/skills).

## Installing FactoryBot in a Rails project

Add \`factory_bot_rails\` to the \`:development, :test\` group. The Rails wrapper gem brings in \`factory_bot\`, auto-loads definitions from \`spec/factories\` (or \`test/factories\`), and hooks generators so new models scaffold a factory instead of a fixture.

\`\`\`ruby
# Gemfile
group :development, :test do
  gem "factory_bot_rails"
end
\`\`\`

Then expose the short DSL (\`build\`, \`create\`, …) by including \`FactoryBot::Syntax::Methods\` once in your RSpec config, so you write \`create(:user)\` rather than \`FactoryBot.create(:user)\` everywhere.

\`\`\`ruby
# spec/support/factory_bot.rb
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
end
\`\`\`

For a non-Rails or Minitest setup the plain \`factory_bot\` gem works the same way; you call \`FactoryBot.find_definitions\` yourself and include the syntax module. If you are still choosing a test runner, start from the [RSpec testing in Ruby guide](/blog/rspec-ruby-testing-guide) and layer factories on top.

## Defining your first factory

A factory maps a name to a class and default attributes. Each attribute is a block whose return value becomes the column value, so defaults are computed at build time.

\`\`\`ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    first_name { "Ada" }
    last_name  { "Lovelace" }
    email      { "ada@example.com" }
    admin      { false }
  end
end
\`\`\`

The factory name infers the class: \`factory :user\` builds a \`User\`. When the name and class differ, pass \`class:\` — \`factory :admin_user, class: "User"\`. Attributes can reference other attributes on the same record, keeping derived values consistent:

\`\`\`ruby
factory :user do
  first_name { "Ada" }
  last_name  { "Lovelace" }
  email      { "#{first_name.downcase}.#{last_name.downcase}@example.com" }
end
\`\`\`

That \`email\` block runs against the instance being built, so \`build(:user, last_name: "Byron")\` yields \`ada.byron@example.com\` automatically. This dependency tracking is a core reason factories beat hand-rolled \`User.new(...)\` calls in specs.

## build vs create vs build_stubbed vs attributes_for

The most important concept in FactoryBot is the **build strategy** — it decides whether your object touches the database, which dominates test speed. The four core strategies and their list variants:

| Method | Returns | Saved to DB? | \`id\` set? | Associations |
|---|---|---|---|---|
| \`build(:user)\` | unsaved instance | No | No (nil) | built (unsaved) |
| \`create(:user)\` | persisted instance | Yes | Yes | created (saved) |
| \`build_stubbed(:user)\` | stubbed instance | No | Yes (fake) | stubbed |
| \`attributes_for(:user)\` | attribute Hash | No | No | omitted |

\`\`\`ruby
user  = build(:user)            # in-memory, not persisted
saved = create(:user)           # INSERTs a row, returns it
fast  = build_stubbed(:user)    # no DB, but acts persisted (has id, etc.)
attrs = attributes_for(:user)   # { first_name: "Ada", ... } for controller params
\`\`\`

Reach for \`build\` when you only need an object's behavior and never query it back. Use \`create\` when the code reads from the database (a \`User.where(...)\`, a persisting callback, a join). \`build_stubbed\` is the speed weapon: it reports \`persisted?\` as true but raises if anything hits the database, catching accidental writes while running far faster than \`create\`. \`attributes_for\` suits controller and request specs that POST a params hash.

Every strategy has plural forms for collections:

\`\`\`ruby
users = create_list(:user, 3)               # array of 3 persisted users
drafts = build_list(:post, 5, status: :draft)
pair  = create_pair(:comment)               # exactly 2
\`\`\`

Choosing \`build\` and \`build_stubbed\` over \`create\` wherever possible is the highest-leverage way to keep a Rails suite fast — the broader principle of minimizing persisted state per test is covered in [test data management strategies](/blog/test-data-management-strategies).

## Overriding attributes at call time

Any attribute can be overridden inline by passing it to the strategy — \`create(:user, admin: true)\` — so one factory serves dozens of scenarios. Overrides win over both factory defaults and traits. Keep a factory's baked-in defaults to the **minimum valid record** — only what's required to pass validation — and push situational values to the call site or a trait; a bloated factory that sets fields no test needs is a common source of slow, brittle specs.

## Traits: named bundles of attributes

A **trait** is a reusable group of attribute overrides you opt into by name. Traits keep variations declarative and composable — apply several at once.

\`\`\`ruby
factory :user do
  first_name { "Ada" }
  email      { "ada@example.com" }
  confirmed_at { nil }

  trait :admin do
    admin { true }
  end

  trait :confirmed do
    confirmed_at { Time.current }
  end

  trait :with_avatar do
    avatar { Rack::Test::UploadedFile.new("spec/fixtures/avatar.png") }
  end
end
\`\`\`

\`\`\`ruby
create(:user, :admin)                 # one trait
create(:user, :admin, :confirmed)     # stacked — both apply
build(:user, :confirmed, email: "x@y.z")  # traits + inline override
\`\`\`

Traits compose left to right, so when two set the same attribute the later one wins. You can also nest a trait inside a child factory or reference traits from associations (below). For how traits fit BDD-style fixtures, see [BDD test data management best practices](/blog/bdd-test-data-management-best-practices).

## Sequences: guaranteeing unique values

Uniqueness constraints (email, slug, username) break the moment two records share a hardcoded value. A \`sequence\` yields a fresh value on each evaluation, with \`n\` as the running counter.

\`\`\`ruby
factory :user do
  sequence(:email) { |n| "user#{n}@example.com" }
  sequence(:username) { |n| "user_#{n}" }
end
\`\`\`

The first build gets \`user1@example.com\`, the next \`user2@example.com\`, and so on. Sequences can start from a custom value or cycle through a list:

\`\`\`ruby
sequence(:rating, 1)                       # 1, 2, 3, ...
sequence(:status, %i[active inactive].cycle)  # active, inactive, active, ...
\`\`\`

For values reused across multiple factories, define a **global** sequence at the top level and reference it by name with \`generate\`:

\`\`\`ruby
sequence(:order_number) { |n| "ORD-#{n.to_s.rjust(6, '0')}" }
# inside a factory:  number { generate(:order_number) }
\`\`\`

Prefer sequences over random data for uniqueness: a sequence is deterministic, so a failure reproduces, whereas \`Faker\`-style randomness can produce a collision that fails only on CI.

## Transient attributes: options that aren't columns

A **transient** attribute is a value you pass to the builder that is *not* set on the model — it only parameterizes how the factory builds. The classic use is "build N associated records" without that count becoming a column.

\`\`\`ruby
factory :user do
  transient do
    posts_count { 0 }
  end

  after(:create) do |user, evaluator|
    create_list(:post, evaluator.posts_count, author: user)
  end
end
\`\`\`

\`\`\`ruby
create(:user, posts_count: 5)   # user with 5 posts; posts_count is never assigned to User
\`\`\`

Inside callbacks the second block argument — conventionally \`evaluator\` — exposes both real and transient attributes, so \`evaluator.posts_count\` reads the passed-in value. Transients are the clean way to add knobs to a factory without polluting the model's attributes.

## Callbacks: hooking into the build lifecycle

Callbacks run code at defined points in a record's construction. The four hooks line up with the strategies:

| Callback | Fires after / before | Runs for |
|---|---|---|
| \`after(:build)\` | instance built, before save | \`build\`, \`create\` |
| \`before(:create)\` | just before the INSERT | \`create\` |
| \`after(:create)\` | record persisted | \`create\` only |
| \`after(:stub)\` | stubbed instance built | \`build_stubbed\` only |

\`\`\`ruby
factory :account do
  after(:build)  { |account| account.token ||= SecureRandom.hex }
  after(:create) { |account| account.activate! }
end
\`\`\`

Crucially, \`after(:create)\` does **not** run for \`build\` or \`build_stubbed\`, so a test relying on rows built there must use \`create\`. Keeping expensive setup in \`after(:create)\` rather than \`after(:build)\` is what keeps the fast strategies fast.

## Associations: wiring related records

The \`association\` keyword declares a relationship; FactoryBot builds the associated record from the matching factory. When the association name equals the factory name you can omit the explicit call and just name it.

\`\`\`ruby
factory :post do
  title { "Hello" }
  association :author, factory: :user      # explicit
  # or simply:  author                     # implicit, uses :author factory
end
\`\`\`

You can pass overrides and traits straight into the association, and FactoryBot respects the **parent's build strategy**: \`build(:post)\` builds (but does not save) the author, while \`create(:post)\` creates it.

\`\`\`ruby
association :author, :admin                        # apply the :admin trait to the user
create(:post, author: create(:user, :confirmed))   # inject a specific author
\`\`\`

This strategy-propagation is why \`build_stubbed(:post)\` is so cheap — the whole object graph is stubbed, never persisted. Watch for deep graphs: a factory whose associations each create more associations can quietly insert dozens of rows per \`create\`. Use \`build\`/\`build_stubbed\`, or \`association: nil\`, to prune branches a test does not need.

## Inheritance: child factories for related shapes

Nest one factory inside another to inherit all parent attributes and override or add a few. This beats a pile of traits when the variations are genuinely different "kinds" of the record.

\`\`\`ruby
factory :user do
  role { :member }

  factory :admin do
    role  { :admin }
    admin { true }
  end
end

create(:admin)   # a User with role: :admin, admin: true
\`\`\`

\`create(:admin)\` builds a \`User\` (the inherited class) with the parent's defaults plus the admin overrides. Reach for inheritance when the override set is large or conceptually a subtype, traits when you want orthogonal, mix-and-match flags.

## Linting factories: catch broken factories early

\`FactoryBot.lint\` instantiates every factory (optionally every trait) and raises if any fail to build a valid record. Run it in CI so a validation change that breaks a factory fails fast, not as a confusing error elsewhere.

\`\`\`ruby
# spec/factory_lint_spec.rb
RSpec.describe "factories" do
  it "are all valid" do
    FactoryBot.lint(traits: true)
  end
end
\`\`\`

\`lint\` uses \`create\` by default, exercising persistence and \`after(:create)\` callbacks; pass \`strategy: :build\` to skip the database, or \`traits: true\` to build each trait in isolation. A green lint is the best single signal that your factories have not drifted from your models. For more CI-side testing patterns and framework choices, browse the [blog](/blog) and the [comparison hub](/compare).

## FactoryBot vs Rails fixtures

Rails ships its own test data tool — **fixtures**: static YAML files in \`test/fixtures\` loaded wholesale before the suite. FactoryBot is the most common replacement, and the trade-off is real.

| Concern | FactoryBot | Rails fixtures |
|---|---|---|
| Data definition | Ruby DSL, computed per test | Static YAML, loaded once |
| Per-test customization | Overrides + traits | Awkward (shared global rows) |
| Validations run | Yes (\`create\`/\`build\`) | No — inserted raw, bypassing validations |
| Speed | Slower (builds each test) | Very fast (loaded once) |
| Relationships | \`association\`, strategy-aware | Manual label references |
| Extra dependency | Yes (\`factory_bot_rails\`) | No (built into Rails) |

**When to pick FactoryBot.** Choose it for almost any non-trivial app: each test declares exactly the state it needs, traits express variations without duplication, and records pass through validations so a factory can't silently create an invalid row — and \`build\`/\`build_stubbed\` neutralize the per-test cost.

**When to pick fixtures.** Use fixtures for a small, stable reference dataset every test shares (countries, plans, feature flags) or when raw load speed on a huge suite outweighs flexibility.

**Verdict.** For most Rails projects FactoryBot is the default — readability and validation guarantees outweigh the speed cost once you lean on \`build\`/\`build_stubbed\`. The two are not mutually exclusive: use fixtures for truly-global rows and FactoryBot for everything test-specific. To equip an AI coding agent with this workflow, start from the installable skills in the [QASkills directory](/skills).

## Frequently Asked Questions

### What is the difference between build and create in FactoryBot?

\`build(:user)\` returns an unsaved instance in memory — no \`INSERT\` runs and \`id\` is \`nil\`. \`create(:user)\` saves the record and returns the persisted object with an \`id\`. Use \`build\` when the code never reads the record back, and \`create\` only when it does (queries, joins, \`after(:create)\` side effects), since hitting the database is the main thing that slows a suite down.

### When should I use build_stubbed instead of build or create?

Use \`build_stubbed\` when you want an object that *behaves* persisted — it has an \`id\` and reports \`persisted?\` as true — but you never want a database row. It is far faster than \`create\` and raises if the code tries to save, catching accidental writes. It is ideal for view specs, presenters, and pure-logic unit tests; use \`create\` only when something must round-trip through the database.

### How do traits differ from creating a child factory?

Both reduce duplication but solve different shapes. A trait is an orthogonal, opt-in bundle of attributes you mix and match — \`create(:user, :admin, :confirmed)\` stacks two — while a child factory inherits a parent's attributes to model a distinct subtype, like \`factory :admin\` nested in \`factory :user\`. Use traits for combinable flags, inheritance when the override set is large or a genuinely different kind of record.

### How do I create unique values to satisfy uniqueness validations?

Use a \`sequence\`, which yields a fresh value each time with \`n\` as the counter: \`sequence(:email) { |n| "user#{n}@example.com" }\`. Each build increments \`n\`, so no two records collide on a uniqued column. Prefer sequences over random fakers for uniqueness because they are deterministic — a failing test reproduces reliably, whereas random data can collide only intermittently on CI.

### What does FactoryBot.lint do and should I run it in CI?

\`FactoryBot.lint\` builds every factory (and every trait when you pass \`traits: true\`) and raises if any fails to produce a valid record. Yes, run it in CI: it turns a validation change that breaks a factory into an immediate, clearly-attributed failure instead of a confusing error elsewhere. By default it uses the \`create\` strategy; pass \`strategy: :build\` to lint without touching the database.

### How do I build a model with a set number of associated records?

Use a \`transient\` attribute plus an \`after(:create)\` callback. Declare \`transient { posts_count { 0 } }\`, then in the callback call \`create_list(:post, evaluator.posts_count, author: user)\`. The transient is read from \`evaluator\` but never assigned to the model, so \`create(:user, posts_count: 5)\` produces a user with five posts and no \`posts_count\` column. Since it relies on \`after(:create)\`, it runs only for the \`create\` strategy.
`,
};
