TITLE: Mockito vs EasyMock vs PowerMock: 2026 Comparison
DESCRIPTION: Mockito vs EasyMock vs PowerMock compared for Java in 2026: syntax, static mocking, final classes, maintenance status, and which mocking framework to choose.
DATE: 2026-06-15
CATEGORY: Comparison
---
# Mockito vs EasyMock vs PowerMock

For new Java projects in 2026, choose **Mockito**. It has the cleanest record-free API, mocks final classes and static methods natively (since Mockito 5 made the inline mock maker the default), is actively maintained, and integrates first-class with JUnit 5. **EasyMock** still works and some teams prefer its explicit record-replay-verify discipline, but it is a smaller community with slower momentum. **PowerMock** exists almost entirely to retrofit static/constructor/private mocking onto Mockito or EasyMock on legacy code — and most of what made it necessary is now built into Mockito, so it is effectively a legacy-only tool you should plan to remove.

This article compares all three on syntax, capabilities, JUnit support, and maintenance status, then gives a clear recommendation for each scenario. For installable, agent-ready Java testing skills, browse the [QASkills directory](/skills).

## Quick comparison table

| Capability | Mockito | EasyMock | PowerMock |
|---|---|---|---|
| API style | Stub-then-verify (no record phase) | Record → replay → verify | Extends Mockito or EasyMock |
| Mock final classes/methods | Yes, native (Mockito 5 inline default) | Yes (since 3.x via bytecode) | Yes (its original purpose) |
| Mock static methods | Yes (`mockStatic`, since 3.4) | Yes (`mockStatic`, EasyMock 4+) | Yes (its original purpose) |
| Mock constructors / private methods | No (by design) | No | Yes |
| JUnit 5 integration | Excellent (`MockitoExtension`) | Good (`EasyMockExtension`) | Limited / via runner, lagging |
| Default behavior of unstubbed methods | Returns type defaults (null/0/empty) | Throws unless expectation set | Inherits underlying framework |
| Active maintenance (2026) | Very active | Maintained, slower cadence | Largely stagnant |
| Community / Stack Overflow answers | Largest | Moderate | Shrinking |
| Recommended for new code | Yes | Niche | No |

## Mockito: the default choice

Mockito's defining trait is its "nice mock" philosophy. A freshly created mock answers every call with a type-appropriate default and you only stub what you care about. There is no record phase — you act, then verify.

```java
@ExtendWith(MockitoExtension.class)
class PriceServiceTest {
    @Mock TaxRepository taxes;
    @InjectMocks PriceService service;

    @Test
    void appliesTax() {
        when(taxes.rateFor("CA")).thenReturn(new BigDecimal("0.0725"));
        assertEquals(new BigDecimal("107.25"), service.withTax(100, "CA"));
        verify(taxes).rateFor("CA");
    }
}
```

Static and final mocking, the historical reason teams pulled in PowerMock, are now native:

```java
try (MockedStatic<Instant> clock = mockStatic(Instant.class)) {
    clock.when(Instant::now).thenReturn(Instant.parse("2026-01-01T00:00:00Z"));
    assertEquals("2026", report.currentYear());
}
```

The try-with-resources block scopes the static mock so it is automatically restored, avoiding the global-state leaks that plagued PowerMock-based static mocking. Mockito deliberately does **not** mock private methods or constructors — the maintainers treat that need as a design smell pointing at code that should be refactored for testability.

## EasyMock: explicit record-replay-verify

EasyMock predates Mockito and uses a stricter lifecycle. You **record** expectations against the mock, switch it to **replay** mode, exercise the code, then **verify** that every expectation was met. By default a method with no recorded expectation throws, which makes EasyMock mocks "strict" out of the box.

```java
@ExtendWith(EasyMockExtension.class)
class PriceServiceEasyTest {
    @Mock TaxRepository taxes;
    @TestSubject PriceService service = new PriceService();

    @Test
    void appliesTax() {
        expect(taxes.rateFor("CA")).andReturn(new BigDecimal("0.0725"));
        replay(taxes);

        assertEquals(new BigDecimal("107.25"), service.withTax(100, "CA"));

        verify(taxes);   // fails if rateFor was not called exactly as recorded
    }
}
```

The record-replay model appeals to teams who want the test to declare upfront exactly which interactions are expected, and who like that unexpected calls fail loudly. The cost is more ceremony per test and a mental model some developers find less intuitive than Mockito's act-then-assert flow. EasyMock supports final and static mocking too, so capability is rarely the deciding factor — style and ecosystem momentum are.

## PowerMock: the legacy bridge

PowerMock is not a standalone mocking framework. It plugs into Mockito (`powermock-api-mockito2`) or EasyMock and adds the capabilities those frameworks historically refused: mocking static methods, constructors, private methods, and final classes by manipulating bytecode with a custom classloader via `@RunWith(PowerMockRunner.class)` and `@PrepareForTest`.

```java
@RunWith(PowerMockRunner.class)
@PrepareForTest(LegacyUtil.class)
public class LegacyTest {
    @Test
    public void mocksStaticAndPrivate() {
        mockStatic(LegacyUtil.class);
        when(LegacyUtil.computeToken()).thenReturn("fixed");
        // ...
    }
}
```

The catch: PowerMock relies on a custom classloader and deep bytecode rewriting, which makes it brittle across new Java versions, slow to start, and a frequent source of obscure failures with JaCoCo coverage, Java modules, and JUnit 5. Its release cadence has stalled, and JUnit 5 support has always lagged the platform. Because Mockito 5 now covers static and final mocking natively, the only remaining justification for PowerMock is mocking **private methods and constructors** on legacy code you cannot refactor — and even then, refactoring to inject the dependency is almost always the better long-term move.

## Default-behavior difference that bites people

The single biggest behavioral gap between Mockito and EasyMock is what an unstubbed method does. A Mockito mock returns a benign default (`null`, `0`, empty list), so a forgotten stub silently produces a default value. An EasyMock mock in strict mode throws on any unexpected call, so forgotten expectations fail loudly. Neither is universally right: Mockito's leniency keeps tests focused but can hide gaps; EasyMock's strictness catches gaps but produces noisier tests. Mockito narrows the gap with strict stubbing in `MockitoExtension`, which fails on unused stubs (though not on unexpected calls).

## JUnit 5 and tooling

Mockito's `mockito-junit-jupiter` gives you `MockitoExtension`, `@Mock`, `@InjectMocks`, and `@Captor` with strict stubbing — the smoothest JUnit 5 story of the three. EasyMock ships `EasyMockExtension` and `@TestSubject`, which is solid but less ubiquitous. PowerMock's JUnit 5 support is the weakest; many teams on PowerMock are still on JUnit 4 runners precisely because migrating PowerMock to Jupiter is painful. If you are standardizing on JUnit 5 — which you should be — this alone tilts the decision toward Mockito.

## Argument matching and verification side by side

The day-to-day mechanics differ enough to feel in every test. Stubbing a call that matches any argument, then verifying it:

```java
// Mockito
when(repo.findByStatus(anyLong(), eq("active"))).thenReturn(list);
verify(repo, times(1)).findByStatus(anyLong(), eq("active"));

// EasyMock
expect(repo.findByStatus(anyLong(), eq("active"))).andReturn(list);
replay(repo);
// ...act...
verify(repo);   // verifies all recorded expectations at once
```

Both use matcher helpers (`anyLong()`, `eq(...)`), and both enforce the same all-or-nothing matcher rule: if one argument uses a matcher, all must. The difference is structural — Mockito verifies specific interactions individually after acting, while EasyMock's single `verify(mock)` confirms every recorded expectation in one shot. PowerMock inherits whichever underlying framework you bridge, so its matcher syntax is Mockito's or EasyMock's, just wrapped in the PowerMock runner. If you value granular, per-interaction verification, Mockito's model is more flexible; if you prefer declaring the full expected interaction set upfront and verifying it wholesale, EasyMock fits.

## Migrating off PowerMock

Because Mockito now covers static and final mocking natively, most PowerMock removal is mechanical. A `mockStatic` set up via PowerMock's `@PrepareForTest` becomes a scoped `Mockito.mockStatic(...)` inside try-with-resources; a final-class mock that needed PowerMock just works with plain Mockito 5. The only genuinely hard cases are mocked **private methods** and **constructors** — and the recommended fix there is refactoring rather than reaching for another tool: extract the private logic into a collaborator you can inject and mock normally, or replace `new Dependency()` with an injected factory. This not only removes PowerMock but usually improves the design, since the need to mock privates and constructors is a classic signal of hidden, hard-to-test coupling. Teams typically migrate test-class by test-class, deleting `@RunWith(PowerMockRunner.class)` and `@PrepareForTest` as they go, and gain faster, more stable test runs (PowerMock's classloader is a frequent cause of slow startup and JaCoCo coverage gaps).

## When to pick each

**Pick Mockito when:** you are starting a new project, standardizing on JUnit 5, or want the largest community and the most maintained tool. This covers the overwhelming majority of Java projects in 2026.

**Pick EasyMock when:** your team specifically values the record-replay-verify discipline and strict-by-default mocks, or you are maintaining an existing EasyMock codebase and see no reason to churn it. It is a legitimate choice, just a niche one.

**Pick PowerMock when:** you are stuck on legacy code that requires mocking private methods or constructors and refactoring is genuinely off the table. Treat it as technical debt and plan to remove it once you can. Do not adopt PowerMock for new code.

## Verdict

For 2026, Mockito is the default and the safe choice — modern API, native static/final mocking, active maintenance, best JUnit 5 integration, and by far the deepest pool of community knowledge. EasyMock remains viable for teams who prefer its stricter style or already use it. PowerMock has been largely superseded by Mockito's built-in capabilities; keep it only to support legacy private/constructor mocking, and migrate away when you can. If you are evaluating frameworks more broadly, our [comparison hub](/compare) lines up testing tools side by side, and the [skills directory](/skills) has installable Java testing skills for AI coding agents.

## Frequently Asked Questions

### Is Mockito or EasyMock better in 2026?

For most teams, Mockito. It has a simpler act-then-verify API, native static and final mocking, the best JUnit 5 integration, and the largest community. EasyMock is still maintained and a reasonable choice if your team specifically prefers its record-replay-verify model, but it has less momentum and a smaller answer base.

### Do I still need PowerMock?

Usually not. Mockito 5 mocks static methods and final classes natively, which were the main reasons teams adopted PowerMock. The only remaining use case is mocking private methods or constructors on legacy code, and even then refactoring for testability is the better long-term option. Avoid PowerMock entirely in new projects.

### Can Mockito mock static methods without PowerMock?

Yes. Since Mockito 3.4, `Mockito.mockStatic(SomeClass.class)` mocks static methods, and Mockito 5 enables this by default. Use it inside a try-with-resources block so the static mock is scoped and automatically restored, which avoids the global-state problems associated with PowerMock's classloader approach.

### Why does PowerMock break on new Java versions?

PowerMock uses a custom classloader and aggressive bytecode rewriting to intercept static, private, and constructor calls. That deep manipulation is fragile against changes in the JVM, the Java module system, coverage tools like JaCoCo, and JUnit 5. Its release cadence has slowed, so it frequently lags new Java releases and is a common source of obscure test failures.

### What is the main API difference between Mockito and EasyMock?

Mockito has no record phase: you stub with `when(...).thenReturn(...)`, run the code, then `verify(...)`. EasyMock follows record → replay → verify, where you declare expectations first, call `replay()`, run the code, and `verify()`. Mockito mocks also return benign defaults for unstubbed methods, while strict EasyMock mocks throw on any unexpected call.

### Which mocking framework has the best JUnit 5 support?

Mockito. The `mockito-junit-jupiter` artifact provides `MockitoExtension` with `@Mock`, `@InjectMocks`, `@Captor`, and strict stubbing. EasyMock offers a competent `EasyMockExtension`, while PowerMock's JUnit 5 support is the weakest of the three and is a common reason PowerMock-heavy projects remain on JUnit 4.
