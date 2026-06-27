import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "RSpec Mocks Guide 2026: Doubles, Stubs, Spies & Verifying Doubles",
  description: "A practical RSpec mocks guide: build doubles, stub with allow/and_return, set message expectations, use spies, and harden tests with verifying doubles.",
  date: "2026-06-26",
  category: "Testing",
  content: `RSpec's \`rspec-mocks\` library replaces a real collaborator with a test double, then lets you control and assert on the messages it receives. You create a double with \`double\` (or a verifying \`instance_double\`), stub a method with \`allow(obj).to receive(:name).and_return(value)\`, and set an expectation with \`expect(obj).to receive(:name)\`. Spies flip the order — call first, then assert with \`expect(obj).to have_received(:name)\`. Verifying doubles (\`instance_double\`, \`class_double\`) check that the stubbed methods actually exist on the real class, so your tests fail when the API drifts. This guide covers all of it with the real RSpec 3.13 API.

This guide assumes Ruby with RSpec 3.x. For installable, agent-ready testing skills across stacks, see the [QASkills directory](/skills).

## Doubles, stubs, and message expectations: the core loop

A **double** is a stand-in object you fully control. A **stub** configures what the double returns when it receives a message. A **message expectation** additionally asserts that the message *was* received. The three verbs you use constantly are \`double\`, \`allow(...).to receive\`, and \`expect(...).to receive\`.

\`\`\`ruby
RSpec.describe NotificationService do
  it "sends a welcome email on signup" do
    mailer = double("Mailer")
    allow(mailer).to receive(:deliver).and_return(true)

    NotificationService.new(mailer).welcome("ada@example.com")

    expect(mailer).to have_received(:deliver)
  end
end
\`\`\`

You can seed return values right at construction time by passing a hash to \`double\`: \`double("Mailer", deliver: true)\` stubs \`deliver\` to return \`true\` in one line. That shorthand is handy for collaborators whose return value you do not care about but whose method must not blow up.

The distinction between \`allow\` and \`expect\` is the whole game. \`allow(obj).to receive(:x)\` is a *stub*: it permits the call and defines a return value, but the test passes whether or not \`:x\` is called. \`expect(obj).to receive(:x)\` is a *mock expectation*: if \`:x\` is never received by the end of the example, the example fails. Use \`allow\` for incidental collaborators (a logger, a clock) and \`expect\` only for the interaction the test is actually about.

| Construct | Permits the call | Fails if not called | Typical use |
|---|---|---|---|
| \`allow(o).to receive(:m)\` | Yes | No | Incidental stub, query method |
| \`expect(o).to receive(:m)\` | Yes | Yes | The interaction under test (command) |
| \`expect(o).to have_received(:m)\` | Yes (set up earlier) | Yes | Spy-style after-the-fact assertion |

## Configuring return values, side effects, and arguments

A stub can do more than return a fixed value. RSpec lets you raise, throw, yield, return a sequence, or compute the result from a block.

\`\`\`ruby
# fixed and sequential return values
allow(repo).to receive(:find).and_return(user)
allow(token).to receive(:next).and_return(1, 2, 3)   # then 3 forever

# raise / throw
allow(api).to receive(:fetch).and_raise(Timeout::Error)
allow(loop).to receive(:run).and_throw(:halt)

# yield to a block
allow(db).to receive(:transaction).and_yield

# compute from the actual arguments
allow(repo).to receive(:find) { |id| User.new(id: id) }
\`\`\`

To constrain *which* arguments a stub responds to, chain \`with\`. A call that does not match the constraint falls through to the real method (on a partial double) or raises (on a pure double).

\`\`\`ruby
allow(calc).to receive(:add).with(2, 3).and_return(5)
expect(payment).to receive(:charge).with(amount: 1999, currency: "usd")
\`\`\`

RSpec ships a rich set of **argument matchers** for \`with\` so you do not have to pin every value exactly:

| Matcher | Matches |
|---|---|
| \`anything\` | any single argument |
| \`no_args\` | the call has zero arguments |
| \`instance_of(User)\` | an object whose class is exactly \`User\` |
| \`kind_of(Numeric)\` | an object that is a \`Numeric\` (or subclass) |
| \`hash_including(id: 1)\` | a Hash that contains those pairs |
| \`array_including(:a)\` | an Array that contains those elements |
| \`boolean\` | \`true\` or \`false\` |
| \`duck_type(:read, :write)\` | any object responding to those methods |
| \`/regex/\` | a String matching the pattern |

\`\`\`ruby
allow(repo).to receive(:save).with(hash_including(status: "active"))
expect(logger).to receive(:warn).with(/disk space/)
\`\`\`

## Setting expectations on counts and order

By default a message expectation is satisfied by *one or more* calls. Tighten it with count constraints, or assert it never happens with \`expect(...).not_to receive\`.

\`\`\`ruby
expect(cache).to receive(:write).once
expect(api).to receive(:poll).exactly(3).times
expect(retry_client).to receive(:call).at_least(:twice)
expect(mailer).to receive(:deliver).at_most(:once)
expect(db).not_to receive(:delete)        # asserts zero calls
\`\`\`

When the *sequence* of calls matters — a transaction must \`begin\` before it can \`commit\` — append \`.ordered\` to each expectation. RSpec then fails if the messages arrive out of order.

\`\`\`ruby
expect(conn).to receive(:begin).ordered
expect(conn).to receive(:commit).ordered
\`\`\`

Use \`.ordered\` sparingly. It couples the test to the exact call sequence, so a refactor that legitimately reorders independent calls breaks an otherwise-correct test. Reserve it for cases where order is part of the contract, not an implementation detail. For a broader treatment of when interaction testing helps versus hurts, see [stub vs mock vs spy vs fake: test doubles explained](/blog/stub-mock-spy-fake-test-doubles-explained).

## Spies: arrange, act, then assert

A **spy** lets you write tests in the natural arrange-act-assert order: build the double up front, exercise the code, then assert on what was received with \`have_received\`. This reads better than a message expectation set *before* the action, because the assertion sits next to the other assertions at the bottom of the example.

\`\`\`ruby
RSpec.describe OrderProcessor do
  it "charges the gateway and logs the result" do
    gateway = spy("PaymentGateway")
    logger  = spy("Logger")

    OrderProcessor.new(gateway, logger).process(order)

    expect(gateway).to have_received(:charge).with(order.total)
    expect(logger).to have_received(:info).once
  end
end
\`\`\`

\`spy("Name")\` creates a double that responds to *any* message and records every call, returning \`nil\` by default — so you do not have to pre-stub methods you only want to verify. You can also spy on a real object by stubbing it first: \`allow(real).to receive(:save)\` turns it into a partial spy. \`have_received\` accepts the same \`with\`, count, and \`ordered\` qualifiers as \`receive\`.

The key rule: \`have_received\` only works on a method that has been allowed (or on a \`spy\`, which allows everything). Call it on an un-stubbed method of a real object and RSpec raises, because it has no recorded calls to inspect. This is intentional — it forces you to declare the seam you are observing.

## Verifying doubles: the safety net you should default to

A plain \`double\` is happy to stub a method that does not exist on the real class. That makes tests pass even after the real API has changed — a classic source of green tests over broken code. **Verifying doubles** close that gap by checking the stubbed method against the real object's interface.

- \`instance_double("User")\` — verifies against *instance* methods of \`User\`, including arity (argument count).
- \`class_double("User")\` — verifies against \`User\`'s *class* methods.
- \`object_double(some_user)\` — verifies against the methods of a specific instance (useful for objects with singleton methods or \`method_missing\`).

\`\`\`ruby
RSpec.describe SessionController do
  it "looks the user up by id" do
    user = instance_double("User", name: "Ada", admin?: false)
    allow(User).to receive(:find).with(1).and_return(user)

    expect(SessionController.new.show(1)).to eq("Ada")
  end
end
\`\`\`

If \`User\` has no \`admin?\` method, or if you stub \`find\` with the wrong number of arguments, RSpec fails immediately with a clear message — *before* the code under test runs. That single change catches the most damaging class of mock bug: a stub that lies about the real interface.

| Double type | Verifies against | Use when |
|---|---|---|
| \`double\` | nothing (unverified) | quick throwaway, no real class exists yet |
| \`instance_double("C")\` | instance methods of \`C\` | stubbing a collaborator instance (default choice) |
| \`class_double("C")\` | class methods of \`C\` | stubbing class-level methods like \`C.find\` |
| \`object_double(obj)\` | methods of \`obj\` | the object has singleton methods / dynamic methods |

Make verifying doubles non-negotiable for partial doubles too by enabling \`verify_partial_doubles\` in your config (next section). The general principle — prefer the strictest double that still lets the test run — is the same one covered for JavaScript in the [Sinon stubs vs spies vs mocks guide](/blog/sinon-stubs-spies-mocks-javascript-guide).

## Partial doubles and \`and_call_original\`

A **partial double** stubs a method on an otherwise real object, leaving every other method intact — the right tool when you want genuine behavior except for one expensive or non-deterministic call.

\`\`\`ruby
report = Report.new(data)
allow(report).to receive(:fetch_remote).and_return(cached_payload)

expect(report.render).to include("Q3 revenue")   # real render, stubbed fetch
\`\`\`

Sometimes you want to spy on a call *and* still let the real method run, without changing its behavior. Use \`and_call_original\`:

\`\`\`ruby
allow(Logger).to receive(:new).and_call_original
expect(Logger).to receive(:new).with(STDOUT)   # observe, but build a real Logger
\`\`\`

\`and_wrap_original\` goes one step further: it hands you the original method as a block argument so you can decorate the result.

\`\`\`ruby
allow(api).to receive(:list).and_wrap_original do |original, *args|
  original.call(*args).first(10)   # call through, then take 10
end
\`\`\`

There is also \`allow_any_instance_of(Klass).to receive(:m)\`, which stubs a method on *every* instance of a class. Treat it as a last resort — the RSpec team discourages it as a design smell. Prefer injecting the collaborator and using \`instance_double\`.

## Configuration: enforce verifying behavior project-wide

RSpec's mock framework has a small but important set of switches. Set them once in \`spec/spec_helper.rb\` so the safer behavior applies to every example.

\`\`\`ruby
RSpec.configure do |config|
  config.mock_with :rspec do |mocks|
    # make partial doubles verify against the real object's methods
    mocks.verify_partial_doubles = true

    # fail the suite if any stubbed method does not exist on the double's class
    mocks.verify_doubled_constant_names = true
  end
end
\`\`\`

\`verify_partial_doubles = true\` is the single highest-value setting: it applies verifying-double checks to real objects you stub, so \`allow(user).to receive(:nmae)\` (a typo) fails loudly instead of silently passing. New projects generated by \`rspec --init\` enable it by default; confirm it is on in any older suite you inherit.

For more JVM- and JS-side mocking patterns, and how RSpec mocks compare to other frameworks, browse the [blog](/blog) and the framework [comparison hub](/compare).

## Cleanup and resetting between examples

In normal use you do not reset anything: RSpec automatically verifies all message expectations and tears down every stub at the end of each example. Doubles are example-scoped — a \`double\` created in one \`it\` block does not exist in the next.

The one case that needs care is using a double *outside* an example, such as in a \`before(:context)\` hook or a thread, where RSpec does not auto-verify. Wrap that work so RSpec sets up and verifies correctly:

\`\`\`ruby
RSpec::Mocks.with_temporary_scope do
  thing = double("Thing", call: 42)
  expect(thing).to receive(:call)
  do_background_work(thing)
end   # verification happens here, at scope exit
\`\`\`

You almost never need this in day-to-day specs — it exists for advanced setups like custom test harnesses. For ordinary examples, RSpec's automatic per-example verification is all you need.

## RSpec mocks vs Mocha for Ruby

\`rspec-mocks\` ships with RSpec and is the default for RSpec suites. **Mocha** is a standalone mocking library that works with Minitest, Test::Unit, *and* RSpec, with a different API style (\`stubs\`, \`expects\`, \`mock\`). Teams sometimes weigh one against the other.

| Concern | rspec-mocks | Mocha |
|---|---|---|
| Bundled with RSpec | Yes | No (separate gem) |
| Works with Minitest | No | Yes |
| Verifying doubles | \`instance_double\` / \`class_double\` | Not built in |
| Stub syntax | \`allow(o).to receive(:m)\` | \`o.stubs(:m)\` |
| Expectation syntax | \`expect(o).to receive(:m)\` | \`o.expects(:m)\` |
| Spy syntax | \`have_received\` | \`o.expects\` (pre-set only) |

**When to pick rspec-mocks.** Use it for any RSpec-based suite. It is already there, its \`allow\`/\`expect\` syntax matches RSpec's expectation grammar, and verifying doubles give you interface-checked stubs out of the box — the single biggest reliability win in this space.

**When to pick Mocha.** Choose Mocha when your suite is Minitest or Test::Unit, or when you want one mocking API across several test frameworks in a mixed codebase. Its API is terse and familiar to long-time Ruby testers, though you give up verifying doubles.

**Verdict.** For RSpec projects, rspec-mocks is the clear default — there is no reason to add a second mocking library, and verifying doubles meaningfully reduce false-green tests. Reach for Mocha only on Minitest or when you need one mocking layer across multiple frameworks. If you are choosing testing tooling for an AI coding agent, start from the full [RSpec testing in Ruby guide](/blog/rspec-ruby-testing-guide) and layer mocks on top.

## Frequently Asked Questions

### What is the difference between a stub and a mock in RSpec?

A stub uses \`allow(obj).to receive(:m).and_return(value)\` — it permits a call and defines its return value, but the example passes whether or not the method is ever called. A mock uses \`expect(obj).to receive(:m)\` — it additionally fails the example if the method is *not* called. Use stubs for incidental collaborators (queries) and mock expectations for the one command the test is actually verifying.

### When should I use instance_double instead of double?

Prefer \`instance_double("ClassName")\` almost always. Unlike a plain \`double\`, it verifies that every method you stub actually exists on the real class with the correct arity, so the test fails immediately when the real API changes or you typo a method name. Use a plain \`double\` only for a throwaway object or when the real class does not exist yet. Also enable \`verify_partial_doubles = true\` so the same checks apply to real objects you stub.

### How do I assert a method was NOT called in RSpec?

Use \`expect(obj).not_to receive(:method)\` set up *before* the action, which fails if the message arrives. With a spy you can assert after the fact: \`expect(obj).not_to have_received(:method)\`. You can also scope the negative assertion to specific arguments, e.g. \`expect(db).not_to receive(:delete).with(id)\`, which still allows \`delete\` with other arguments.

### What is a spy in RSpec and when should I use one?

A spy is a double that records every message it receives so you can assert on calls *after* the code runs, using \`expect(spy).to have_received(:m)\`. Create one with \`spy("Name")\` (responds to any message) or by stubbing a real object first with \`allow\`. Spies are preferable when you want arrange-act-assert ordering, keeping the interaction assertion next to your other assertions instead of a \`receive\` expectation set up before the action.

### How do I stub a method to raise an error in RSpec?

Chain \`and_raise\` onto the stub: \`allow(api).to receive(:fetch).and_raise(Timeout::Error)\`. You can pass an exception class, an instance, or a class and message: \`and_raise(ArgumentError, "bad id")\`. This is the standard way to test error-handling and retry paths without triggering the real failure. The parallel \`and_throw(:symbol)\` simulates Ruby's \`throw\`/\`catch\` control flow.

### Do I need to reset or clear mocks between RSpec examples?

No. RSpec automatically verifies all message expectations and removes every stub and double at the end of each example, and doubles are scoped to the example that creates them. The only time you intervene is when building doubles outside a standard example scope (a \`before(:context)\` hook or background thread), where \`RSpec::Mocks.with_temporary_scope { ... }\` ensures setup and verification happen correctly.
`,
};
