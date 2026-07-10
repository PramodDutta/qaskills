import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'jqwik Property-Based Testing for Java Guide',
  description: 'jqwik property-based testing guide for Java teams building generators, shrinking failures, stateful checks, seed replay, and stronger JUnit 5 suites.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# jqwik Property-Based Testing for Java Guide

The first useful jqwik failure rarely looks like a polished example from a unit testing book. It is more likely to be a half-empty string, a date at the edge of a month, or a list with one duplicate value that slipped through because every hand-written test used clean data. jqwik earns its place when the input space is bigger than your patience for examples.

jqwik is a property-based testing library for Java that runs on the JUnit Platform. You write properties, attach generated inputs with \`@ForAll\`, define custom arbitraries with \`@Provide\`, and let jqwik search for counterexamples. When a property fails, jqwik attempts to shrink the generated input to a smaller failing case. That shrink is often the moment the bug becomes obvious.

Use this guide when you already have normal JUnit tests and want stronger coverage around parsers, validators, pricing logic, state transitions, and model invariants. For the broader testing style, see [a complete property-based testing guide](/blog/property-based-testing-complete-guide). For ordinary Jupiter lifecycle and assertions, keep [a JUnit 5 testing guide](/blog/junit5-testing-java-guide) nearby.

## A property is a rule, not a bigger example

A weak jqwik test is just a parameterized test with random values. A strong property states something that must hold across many inputs. That rule might be algebraic, such as sorting being idempotent. It might be domain-specific, such as a discount never making a payable amount negative. It might be round-trip based, such as parsing what you format.

The discipline is to name the invariant before choosing generators. If you cannot say what must always be true, jqwik will only produce noise faster.

| Code under test | Useful property | Poor property |
|---|---|---|
| Email normalizer | Normalizing twice returns the same value | Generated email contains \`@\` |
| Money calculator | Final amount is never below zero cents | Any generated price returns a number |
| Slug generator | Output contains only allowed characters and is stable | Generated title does not throw |
| Date range splitter | Segments cover the original range without gaps | Returned list is non-null |
| CSV parser and writer | Writing then parsing preserves fields | Parser accepts one canned line |

Here is a compact property for a slug function. The exact implementation is not the point. The property checks stability and allowed characters across generated titles.

\`\`\`java
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;

import static org.assertj.core.api.Assertions.assertThat;

class SlugProperties {

  @Property
  void slugIsStableAndUrlSafe(@ForAll String title) {
    String slug = Slugs.fromTitle(title);

    assertThat(Slugs.fromTitle(slug)).isEqualTo(slug);
    assertThat(slug).matches("[a-z0-9-]*");
  }
}
\`\`\`

That test will generate strings you would not put in a normal example table: whitespace-only input, punctuation, combining characters, long values, and control-like characters depending on jqwik's defaults. Some of those may be outside your business domain. That is a generator design question, not a reason to avoid properties.

## Shaping generators with Arbitraries

The default \`String\` generator is useful for pressure, but many business properties need domain-shaped values. jqwik's \`Arbitraries\` API lets you constrain ranges, compose objects, and name reusable generators.

Suppose an order discount rule accepts a subtotal in cents and a coupon percentage. The generator should avoid impossible subtotals while still exploring edges such as zero, one cent, and high values.

\`\`\`java
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

import static org.assertj.core.api.Assertions.assertThat;

record Cart(int subtotalCents, int couponPercent) {}

class PricingProperties {

  @Provide
  Arbitrary<Cart> carts() {
    Arbitrary<Integer> subtotal = Arbitraries.integers().between(0, 500_000);
    Arbitrary<Integer> coupon = Arbitraries.integers().between(0, 100);

    return Combinators.combine(subtotal, coupon).as(Cart::new);
  }

  @Property
  void discountNeverCreatesNegativePayable(@ForAll("carts") Cart cart) {
    int payable = Pricing.applyDiscount(cart.subtotalCents(), cart.couponPercent());

    assertThat(payable).isBetween(0, cart.subtotalCents());
  }
}
\`\`\`

This property says less about individual examples and more about the legal envelope. It would catch a rounding bug that subtracts one cent too many at 100 percent, or an integer overflow if the range is widened later.

## Shrinking is part of the design feedback

When jqwik finds a failure, it tries to shrink the generated input. Shrinking is not just a nice error message. It tells you whether your generator exposes the bug cleanly. A property that fails with a massive object graph and cannot shrink to a readable case is harder to maintain than a property with smaller, composable arbitraries.

| Symptom in failure output | Likely generator problem | Improvement |
|---|---|---|
| Huge nested object with irrelevant fields | Generator creates full production aggregate | Generate the minimum fields needed for the invariant. |
| Failure disappears when logged | Code under test has time, randomness, or mutation leakage | Inject clock/randomness and isolate state. |
| Counterexample is outside domain | Generator is too broad | Constrain arbitrary or add a precondition only when invalid input is truly out of scope. |
| Shrunk value is still unreadable | Domain type lacks useful \`toString\` | Add a readable representation for test output. |
| Many discarded tries | Assumptions reject too much data | Build a better generator instead of filtering heavily. |

Do not ignore the first shrunk failure. Add it as an example if it documents an important regression, then keep the property so nearby bugs are still discoverable.

## Assumptions are a scalpel

jqwik supports assumptions through \`Assume.that(...)\`. They are useful when a property applies only to part of a generated space. They become harmful when they discard most generated values. A property that spends its budget throwing away data is slower and less predictable.

For example, testing division behavior can assume a non-zero divisor. That is fine because almost all generated integers are non-zero. Generating arbitrary strings and assuming they match a complex email pattern is usually poor. Generate email-like values directly.

\`\`\`java
import net.jqwik.api.Assume;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;

import static org.assertj.core.api.Assertions.assertThat;

class RatioProperties {

  @Property
  void multiplyingQuotientByDivisorDoesNotExceedOriginalByMoreThanRemainder(
      @ForAll int numerator,
      @ForAll int divisor
  ) {
    Assume.that(divisor != 0);

    int quotient = numerator / divisor;
    int remainder = numerator % divisor;

    assertThat(quotient * divisor + remainder).isEqualTo(numerator);
  }
}
\`\`\`

That example is intentionally mathematical. In business code, the same principle applies. If the property is about active subscriptions, generate active subscriptions. Do not generate every possible customer and discard inactive ones.

## Stateful behavior and model checks

jqwik can test more than pure functions. For stateful code, model the rule you care about and generate sequences of operations. You do not need to model the entire system. A small model is often enough to catch missing idempotency, invalid transitions, or counters that drift.

A reservation service might allow hold, confirm, and cancel operations. The property can generate operation lists and compare the service's visible state with a simple model. Keep external dependencies out of the first version. Use an in-memory implementation, fake repository, or Testcontainers-backed boundary only after the model is clear.

| Stateful target | Operation sequence | Model invariant |
|---|---|---|
| Cart service | Add item, remove item, apply coupon | Total quantity is never negative. |
| Reservation workflow | Hold, confirm, cancel | Confirmed reservation cannot return to held. |
| Token bucket | Consume, refill | Available tokens stay within capacity. |
| Retry scheduler | Fail, backoff, succeed | Next attempt time never moves backward. |
| Inventory allocation | Reserve, release, ship | Allocated count never exceeds stock. |

For senior SDET work, stateful properties shine around workflows that already have too many example combinations. They do require careful design. If the generated operation list can create impossible business scenarios, improve the operation generator before blaming jqwik.

## Combining jqwik with example tests

Property-based testing does not replace example tests. Use examples for named business cases, regulatory rules, known incidents, and branch behavior that deserves a readable story. Use jqwik for invariants across wide input spaces.

A healthy Java test suite might have a few examples for coupon policy wording and one property that proves the payable amount stays within bounds for all generated carts. It might have examples for leap-day acceptance and a property that round-trips many valid date ranges. The two styles reinforce each other.

Keep properties deterministic in CI. jqwik reports seeds for failures, and you should capture them when investigating. Avoid calling live services, real clocks, or random production code inside properties unless you control those sources. Generated inputs are already variable. The environment should be boring.

## Making failures useful for the next engineer

A property name should read like a rule. \`testCart\` is a weak name. \`discountNeverCreatesNegativePayable\` tells the reviewer why the generated input matters. Custom arbitraries should also carry domain names. \`carts\`, \`validIsoDates\`, and \`retrySchedules\` are better than \`data\`.

When a property catches a bug, reduce the production fix and the test change to the rule. Do not assert the exact shrunk input unless it is a valuable regression example. If the property was too broad, narrow the generator. If the rule was incomplete, split it into two smaller properties.

The best jqwik suites feel like executable domain notes. They do not list every example. They state boundaries the system must respect.

## Generator names become domain documentation

A jqwik suite grows well when arbitraries are named after domain concepts. \`validCustomers\`, \`expiredSubscriptions\`, \`invoiceLines\`, and \`retryDelays\` communicate intent before the property body is read. Generic names such as \`strings\` and \`objects\` force the reader to reverse engineer why generated data is legal.

Do not put every arbitrary into one large factory class. Shared generators are useful when the domain shape is stable, but local generators keep a property focused. If a generator exists only to test one edge, define it near that property. If many properties need the same valid account shape, promote it to a test fixture package.

| Generator location | Use when | Risk |
|---|---|---|
| Inside property class | The shape is specific to one invariant | Minor duplication across nearby specs |
| Shared test fixture | Many properties need the same domain object | Hidden coupling when product rules change |
| Production builder reused in tests | Builder represents real construction rules | Builder bugs can mask generated invalid states |
| Arbitrary from raw primitives | Boundary exploration is important | Property body may become noisy |
| Filtered arbitrary | Invalid values are rare | Excessive filtering wastes generated attempts |

A good arbitrary also exposes edge values deliberately. For money, include zero, one cent, maximum expected amount, and normal random values. For dates, include month ends, leap days, daylight saving boundaries where relevant, and ordinary weekdays. Relying only on uniform random generation can miss the cases humans know are dangerous.

\`\`\`java
@Provide
Arbitrary<Integer> invoiceAmountsInCents() {
  return Arbitraries.oneOf(
      Arbitraries.of(0, 1, 99, 10_000, 500_000),
      Arbitraries.integers().between(0, 500_000)
  );
}
\`\`\`

This generator is still simple, but it makes boundary intent explicit. If a failure shrinks to \`1\`, the reader immediately understands why that value was in the search space.

## Keeping property tests fast enough to matter

Property tests can become slow when each generated case builds a Spring context, starts a container, or writes to a real database. Start with pure functions and small objects. Move outward only when the invariant genuinely crosses a boundary.

For code that needs collaborators, use fake implementations that preserve the rule under test. A fake inventory repository can enforce stock counts without starting Postgres. Later, add a smaller number of integration properties against the real repository if the database mapping is risky.

| Performance problem | Better jqwik design |
|---|---|
| Full application context per generated example | Test domain service with injected fakes. |
| Database cleanup after every generated case | Use transaction rollback or keep database properties small. |
| Huge generated collections | Cap sizes based on the invariant being tested. |
| Expensive assumptions | Generate valid values directly. |
| Slow shrinking | Reduce object graph depth and remove irrelevant fields. |

Run properties in CI where failures are visible. If a property is too slow for pull requests, split it: keep a fast invariant in PR and run the heavier search nightly. Do not leave all property-based testing on a developer laptop, because the bugs it finds will arrive unpredictably.

## Turning production incidents into properties

When a production bug came from an unexpected input shape, resist the urge to add only one example. Add the example, then ask what broader rule would have caught it. If a title with multiple spaces broke slug generation, the property may be about whitespace normalization. If a coupon rounded a cent incorrectly, the property may be about payable bounds and monotonic discounts.

The incident-derived example protects the exact case. The property searches the neighborhood. That combination is especially effective for Java services with years of accumulated branch logic.

## Capture seeds in failure triage

When jqwik reports a failing seed, copy it into the defect or pull request notes. The seed lets another engineer replay the generated path while investigating. Without it, a rare failure can turn into guesswork, especially when the counterexample involves a sequence of operations rather than one primitive value.

Do not keep a seed override permanently unless you are intentionally pinning a regression reproduction. The long-term test should still explore. A good workflow is: replay with the seed, understand the shrunk input, add a named example if the case deserves documentation, fix the production code, then let the property return to normal generated execution.

For stateful properties, also log the operation list in a readable form. A counterexample like \`[add(5), remove(6)]\` is actionable. A printed object identity is not.

For teams new to jqwik, start with one property around a function that already has example tests. That gives reviewers a familiar baseline and makes the first generated failure less surprising. After the team trusts the style, move toward richer generators and stateful checks.

That rollout keeps the learning curve manageable for skeptical Java reviewers.

## Frequently Asked Questions

### Can jqwik run with normal JUnit 5 tests?

Yes. jqwik runs on the JUnit Platform, so it can live beside Jupiter tests in the same build. Keep imports clear because jqwik annotations such as \`@Property\` are different from Jupiter's \`@Test\`.

### How many tries should a property use in CI?

Start with jqwik defaults unless the property is slow or the risk is unusually high. Increase tries for compact pure functions. Reduce or split properties that touch heavier components.

### Should generated values include invalid input?

Only when the property is about invalid input handling. For normal business invariants, generate values inside the domain so failures point to product logic rather than meaningless data.

### What do I do with a shrunk counterexample?

Use it to understand and fix the bug. Add a named example test if the case is important for documentation, but keep the property to search around the boundary in future runs.

### Is jqwik a good fit for database integration tests?

It can be, but be selective. Generated data plus database setup can become slow. Start with pure domain logic, then use jqwik for database boundaries where invariants are valuable and cleanup is reliable.
`,
};
