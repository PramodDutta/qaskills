import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cucumber Tags and Hooks: Complete Reference 2026',
  description:
    'Complete reference for Cucumber tags and hooks across Cucumber-JVM, Cucumber.js, Behave, and Reqnroll. Tag expressions, hook ordering, conditional hooks, parallel safety, and CI patterns for 2026.',
  date: '2026-05-13',
  category: 'Reference',
  content: `
# Cucumber Tags and Hooks: Complete Reference 2026

Tags and hooks are the two features that elevate Cucumber from "Gherkin parser" to "test runner." Tags let you organize, filter, and conditionally execute scenarios; hooks let you orchestrate setup, teardown, and instrumentation around them. Used correctly, they are the foundation of a maintainable, parallel-capable, CI-friendly BDD suite. Used poorly, they produce fragile suites where scenarios depend on hook execution order, tags multiply uncontrollably, and CI runs become unpredictable.

This is the definitive reference for Cucumber tags and hooks in 2026 across all major Cucumber implementations: Cucumber-JVM, Cucumber.js, Behave, and Reqnroll. We cover tag syntax, tag expressions, hook types and lifecycle, hook ordering, conditional hooks, parallel safety, and CI patterns. Every example is current with the latest stable releases of each framework.

By the end you will have a complete mental model of how tags and hooks interact, the differences between frameworks, and patterns for organizing them in a multi-team codebase.

## Key Takeaways

- **Tags annotate scenarios and features** for selective execution.
- **Tag expressions** combine tags with and/or/not.
- **Hooks run before/after scenarios, steps, features, or the whole suite**.
- **Hook ordering** is critical -- before runs descending, after runs ascending.
- **Parallel safety** requires hooks to be free of static mutable state.

---

## 1. Tag Syntax

Tags are @-prefixed identifiers placed above features, scenarios, or scenario outlines:

\`\`\`gherkin
@feature-level-tag
Feature: User checkout

  @scenario-level-tag @another-tag
  Scenario: Place an order
    Given ...
\`\`\`

Tag inheritance: feature-level tags apply to every scenario in that feature.

Conventions adopted in 2026 across most teams:

| Tag | Purpose |
|---|---|
| @smoke | Critical path |
| @regression | Full suite |
| @wip | Work in progress, excluded |
| @flaky | Known flaky, excluded from gating |
| @manual | Manual testing, not automated |
| @api | API-only |
| @ui | UI-required |
| @slow | Long-running |
| @requires-X | Feature flag |

## 2. Tag Expressions

Tag expressions use boolean operators:

| Expression | Meaning |
|---|---|
| @smoke | All scenarios tagged @smoke |
| not @wip | All scenarios except @wip |
| @smoke and not @flaky | @smoke but exclude @flaky |
| @smoke or @critical | Either tag |
| (@api or @ui) and not @manual | Complex combination |

CLI usage by framework:

\`\`\`bash
# Cucumber-JVM via JUnit 5 properties
mvn test -Dcucumber.filter.tags="@smoke and not @wip"

# Cucumber.js
npx cucumber-js --tags "@smoke and not @wip"

# Behave
behave --tags "@smoke and not @wip"

# Reqnroll (via xUnit/MSTest filter)
dotnet test --filter "Category=smoke"
\`\`\`

## 3. Hooks: The Full Lifecycle

Hooks run at different points:

| Hook | Cucumber-JVM | Cucumber.js | Behave | Reqnroll |
|---|---|---|---|---|
| Before suite | @BeforeAll | BeforeAll | before_all | [BeforeTestRun] |
| After suite | @AfterAll | AfterAll | after_all | [AfterTestRun] |
| Before feature | (via @Before tag) | (via tag) | before_feature | [BeforeFeature] |
| After feature | (via tag) | (via tag) | after_feature | [AfterFeature] |
| Before scenario | @Before | Before | before_scenario | [BeforeScenario] |
| After scenario | @After | After | after_scenario | [AfterScenario] |
| Before step | @BeforeStep | BeforeStep | before_step | [BeforeStep] |
| After step | @AfterStep | AfterStep | after_step | [AfterStep] |

## 4. Conditional Hooks via Tags

Hooks can be filtered by tag expression:

\`\`\`java
// Cucumber-JVM
@Before("@requires-stripe")
public void startStripeMock() { StripeMock.start(); }

@After("@requires-stripe")
public void stopStripeMock() { StripeMock.stop(); }
\`\`\`

\`\`\`javascript
// Cucumber.js
Before({ tags: "@requires-stripe" }, function () { StripeMock.start(); });
After({ tags: "@requires-stripe" }, function () { StripeMock.stop(); });
\`\`\`

\`\`\`python
# Behave
def before_scenario(context, scenario):
    if "requires-stripe" in scenario.tags:
        context.stripe_mock = StripeMock.start()

def after_scenario(context, scenario):
    if "requires-stripe" in scenario.tags:
        context.stripe_mock.stop()
\`\`\`

\`\`\`csharp
// Reqnroll
[BeforeScenario("@requires-stripe")]
public void StartStripeMock() => StripeMock.Start();

[AfterScenario("@requires-stripe")]
public void StopStripeMock() => StripeMock.Stop();
\`\`\`

## 5. Hook Ordering

By default, hooks run in declaration order, but you can specify order:

\`\`\`java
@Before(order = 10)
public void firstHook() { /* runs first */ }

@Before(order = 20)
public void secondHook() { /* runs after */ }

@After(order = 20)
public void firstAfter() { /* runs first in @After */ }

@After(order = 10)
public void secondAfter() { /* runs second */ }
\`\`\`

The rule is: lower order runs first in @Before, last in @After. This means setup and teardown happen in reverse order (LIFO), like try/finally blocks.

## 6. Common Hook Patterns

Screenshot on failure:

\`\`\`java
@After
public void screenshotOnFailure(Scenario scenario) {
    if (scenario.isFailed()) {
        byte[] png = screenshotProvider.capture();
        scenario.attach(png, "image/png", "Failure");
    }
}
\`\`\`

Database reset:

\`\`\`python
def before_scenario(context, scenario):
    context.db.execute("TRUNCATE users, orders RESTART IDENTITY CASCADE")
\`\`\`

Selective slow setup:

\`\`\`csharp
[BeforeScenario("@requires-stripe-mock")]
public async Task StartStripeMockAsync()
{
    _stripeMock = await StripeMock.StartAsync(port: 8090);
}
\`\`\`

## 7. Parallel Safety

When scenarios run in parallel, hooks must avoid static mutable state. Anti-patterns:

\`\`\`java
// BAD: static field shared across threads
public class BadHooks {
    private static WebDriver driver;

    @Before
    public void before() { driver = new ChromeDriver(); }
}
\`\`\`

Use DI containers (Picocontainer in Cucumber-JVM, Spring in Reqnroll, fixtures in Behave) to scope state to scenarios:

\`\`\`java
// GOOD: per-scenario instance via Picocontainer
public class GoodHooks {
    private final WebDriverProvider driverProvider;

    public GoodHooks(WebDriverProvider provider) { this.driverProvider = provider; }

    @Before
    public void before() { driverProvider.open(); }

    @After
    public void after() { driverProvider.close(); }
}
\`\`\`

## 8. Tag-Driven CI Stages

A multi-stage CI pipeline uses tags to control what runs when:

| Stage | Tag Filter | Frequency |
|---|---|---|
| PR Check | @smoke and not @flaky | Every PR |
| Merge | @smoke or @critical | After merge |
| Nightly Full | not @wip and not @manual | Every night |
| Pre-release | not @wip | Before release |

GitHub Actions example:

\`\`\`yaml
jobs:
  smoke:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - run: mvn -B test -Dcucumber.filter.tags="@smoke and not @flaky"

  regression:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - run: mvn -B test -Dcucumber.filter.tags="not @wip and not @manual"
\`\`\`

## 9. Tag Maintenance

After 6 months, tags multiply. Conduct a quarterly cleanup:

1. List all tags with counts.
2. Identify deprecated tags (no scenarios anymore).
3. Identify ambiguous tags (@critical vs @important).
4. Document the canonical tag set in CONTRIBUTING.md.

A simple script for Cucumber-JVM:

\`\`\`bash
grep -RhoE "@[a-z][a-z0-9-]+" src/test/resources/features | sort | uniq -c | sort -rn
\`\`\`

## 10. AI-Assisted Tag and Hook Authoring

The [QASkills directory](/skills) has SKILL.md packs for Cucumber-JVM, Behave, and Reqnroll that codify common tag and hook patterns. AI agents like Claude will then generate hooks consistent with your conventions. See [cursor-skills-md-best-practices](/blog) and [claude-code-qa-testing-workflows-2026](/blog).

## 11. Migration Considerations

Moving between frameworks usually requires translating hooks but not tags:

- @Before in Cucumber-JVM = Before in Cucumber.js = before_scenario in Behave = [BeforeScenario] in Reqnroll.
- Tag expressions are nearly identical across frameworks.

## 12. Advanced Tag Patterns

### Hierarchical Tags
Some teams use hierarchical tagging:

\`\`\`gherkin
@persona-admin @feature-billing @release-Q3
Scenario: ...
\`\`\`

Tag expressions can then combine: \`@persona-admin and @feature-billing\`.

### Boolean Tag Expressions
\`\`\`bash
# Run smoke or critical, exclude flaky
--tags '(@smoke or @critical) and not @flaky'

# Run by feature flag
--tags '@feature-billing'

# Run regression nightly
--tags '@regression and not @manual'
\`\`\`

### Tag-Based Reporting
Reports can group by tag. Cluecumber and Allure both support tag-based filtering in the rendered HTML.

## 13. Hook Composition

### Multiple Hooks Per Phase
A scenario might invoke 5 @Before hooks: database reset, stripe mock, browser context, log capture, screenshot setup. Order them with @Before(order = N).

### Conditional Composition
Sometimes you need conditional hook execution:

\`\`\`java
@Before
public void conditionalSetup(Scenario s) {
    if (s.getSourceTagNames().contains("@requires-stripe")) {
        StripeMock.start();
    }
    if (s.getSourceTagNames().contains("@requires-aws")) {
        AwsMock.start();
    }
}
\`\`\`

But tag-filtered hooks are usually cleaner:

\`\`\`java
@Before("@requires-stripe")
public void stripeSetup() { StripeMock.start(); }

@Before("@requires-aws")
public void awsSetup() { AwsMock.start(); }
\`\`\`

## 14. Hook Performance

Each hook adds runtime. For long suites this matters:

- @BeforeAll runs once: heavy setup like Testcontainers is fine here.
- @Before runs per scenario: lightweight only.
- @BeforeStep runs per step: very lightweight only.

A common mistake: doing database truncation in @BeforeStep instead of @Before. This dramatically slows suites.

## 15. Tag Lifecycle Management

Tags accumulate over time. Quarterly maintenance:

\`\`\`bash
# List all tags with counts
grep -rohE '@[a-z][a-z0-9-]+' features | sort | uniq -c | sort -rn
\`\`\`

Then review:
- Remove tags no longer used.
- Merge synonymous tags (@important + @critical -> just @critical).
- Document canonical tags in CONTRIBUTING.md.

## 16. Cross-Framework Tag Translation

Tag semantics are 95% identical across Cucumber-JVM, Reqnroll, Behave, and Cucumber.js. Differences:

- Reqnroll uses [Category] attribute when filtering via xUnit; the runtime translates @smoke -> Category=smoke.
- Behave uses behave.ini configuration for default tags.
- Cucumber.js uses cucumber.cjs profile config.

## 17. Frequently Asked Questions

**Q: Can hooks run in parallel?**
A: Yes, but the hooks themselves shouldn't share state across threads. Use per-thread or per-scenario instances.

**Q: How do I skip a scenario at runtime?**
A: Throw a TestAbortedException (JUnit 5) or org.testng.SkipException, or use the framework's skip mechanism in a hook.

**Q: Can I tag features and override at scenario level?**
A: Yes -- scenario tags extend feature tags. Both apply when filtering.

**Q: What's the max number of tags per scenario?**
A: No hard limit, but more than 5 is usually a smell.

**Q: AI agents for tags and hooks?**
A: Yes -- SKILL.md packs in the [QASkills directory](/skills) encode tag conventions for AI agents to apply.

## 18. Migration Cheatsheet

When moving between frameworks:

- Feature files port unchanged.
- Tags port unchanged.
- Hooks translate via the table in section 3.
- Tag expressions translate identically.
- Order semantics may differ (verify behavior in each framework).

## Conclusion

Tags and hooks are the connective tissue of BDD. Used well, they make suites flexible and CI-friendly. Used poorly, they make suites brittle and unpredictable. Stick to a small canonical tag set, scope hook state via DI, and let CI stages drive what runs when. See [cucumber-java-bdd-best-practices-2026](/blog) and [behave-python-bdd-complete-tutorial](/blog) for framework-specific implementations.
`,
};
