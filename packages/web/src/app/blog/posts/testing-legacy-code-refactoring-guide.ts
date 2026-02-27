import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Legacy Code -- Strategies for Adding Tests to Untested Codebases',
  description:
    'Practical guide to adding tests to legacy code. Covers characterization testing, seam identification, dependency breaking, safe refactoring, and AI-assisted legacy test generation.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Every team inherits code without tests. Maybe it was written by a contractor five years ago. Maybe it was a "proof of concept" that shipped to production. Maybe the original team moved on and no one felt confident enough to add a test suite after the fact. Whatever the story, the result is the same: a legacy codebase that everyone is afraid to touch, and that silently breaks in unpredictable ways. This guide gives you a practical, step-by-step playbook for testing legacy code -- from your first characterization test to a fully covered, safely refactored system.

## Key Takeaways

- **Legacy code is code without tests** -- Michael Feathers' definition reframes the problem as a testing challenge, not an age problem
- **Characterization testing** documents the current behavior of code before you change it, creating a safety net even if that behavior is buggy
- **Seams** are natural injection points where you can alter behavior without editing the source -- finding them is the key to making untestable code testable
- **Dependency-breaking techniques** like Extract and Override, Parameterize Constructor, and Wrap Method let you isolate code for testing incrementally
- **The Strangler Fig pattern** lets you gradually grow test coverage by requiring tests for every new feature and bug fix
- **AI coding agents** can accelerate legacy test generation by reading existing code and producing characterization tests automatically

---

## The Legacy Code Dilemma

Michael Feathers, in his landmark book *Working Effectively with Legacy Code*, defined **legacy code** as simply "code without tests." This definition is powerful because it shifts the conversation away from how old the code is or what language it is written in. A five-year-old Python service with 90% test coverage is not legacy. A six-month-old TypeScript module with zero tests absolutely is.

The dilemma every team faces is circular: **you cannot safely refactor code without tests, but you cannot easily add tests without refactoring the code first.** Tightly coupled functions, hidden dependencies, global state, and deeply nested logic make it nearly impossible to instantiate a class or call a function in isolation. You need to break dependencies to write tests, but breaking dependencies without tests is risky because you might change behavior.

This is the vicious cycle of legacy code, and it paralyzes teams. The result is that no one touches the code, technical debt compounds, and eventually the system becomes unmaintainable.

The way to break the cycle is to use **conservative, mechanical techniques** that let you make small, safe changes -- just enough to get the first tests in place. Once you have a minimal safety net, you can refactor with confidence, add more tests, and steadily expand coverage. The rest of this guide walks you through exactly how to do that.

---

## Characterization Testing

**Characterization testing** is the single most important technique for testing legacy code. Unlike traditional tests that verify *intended* behavior, characterization tests document *actual* behavior. You are not asserting what the code *should* do -- you are recording what it *does* do right now, including bugs.

Why? Because when you are adding tests to existing code, your first goal is not to fix bugs. Your first goal is to create a **safety net** that tells you if your refactoring changes any behavior -- intended or otherwise. Once you have that safety net in place, you can decide which behaviors to keep and which to fix.

Here is the step-by-step process for writing a characterization test:

1. **Identify a piece of code** you need to change or understand
2. **Write a test** that calls the code with a known input
3. **Run the test** and observe the actual output
4. **Update your assertion** to match the actual output
5. **Run the test again** -- it should pass

Here is a concrete example. Suppose you have an untested function that calculates shipping costs:

\`\`\`typescript
// src/legacy/shipping.ts -- no tests exist for this
export function calculateShipping(
  weight: number,
  zone: string,
  isPrime: boolean
): number {
  let base = weight * 0.5;
  if (zone === 'international') {
    base = base * 3.2;
  } else if (zone === 'remote') {
    base = base * 1.8;
  }
  if (isPrime && base > 10) {
    base = base - base * 0.15;
  } else if (isPrime) {
    base = 0;
  }
  return Math.round(base * 100) / 100;
}
\`\`\`

You do not know the exact business rules. You just need to capture current behavior:

\`\`\`typescript
// __tests__/shipping.characterization.test.ts
import { calculateShipping } from '../src/legacy/shipping';

describe('calculateShipping -- characterization tests', () => {
  it('calculates domestic shipping for non-prime', () => {
    const result = calculateShipping(10, 'domestic', false);
    expect(result).toBe(5); // observed output
  });

  it('calculates international shipping for non-prime', () => {
    const result = calculateShipping(10, 'international', false);
    expect(result).toBe(16); // observed output
  });

  it('gives free shipping for prime with small domestic orders', () => {
    const result = calculateShipping(5, 'domestic', true);
    expect(result).toBe(0); // observed: prime + base <= 10 = free
  });

  it('applies prime discount for large international orders', () => {
    const result = calculateShipping(10, 'international', true);
    expect(result).toBe(13.6); // observed: 16 - 15% = 13.6
  });

  it('handles remote zone with prime discount', () => {
    const result = calculateShipping(20, 'remote', true);
    expect(result).toBe(15.3); // observed output
  });
});
\`\`\`

Notice that we are not judging whether free shipping for orders under \$10 is the *correct* business rule. We are just locking in the current behavior. If any future refactoring changes these values, the test fails and tells you immediately.

**Best practices for characterization tests:**

| Practice | Why It Matters |
|---|---|
| Use descriptive test names that state the observed behavior | Makes it clear these are documenting, not prescribing |
| Mark tests with a \`characterization\` tag or suffix | Distinguishes them from intentional behavior tests |
| Cover boundary conditions and edge cases | These are where refactoring most commonly breaks things |
| Do not fix bugs in the code while writing characterization tests | The goal is a safety net, not correctness |
| Commit characterization tests before making any changes | Gives you a clean rollback point |

---

## Finding Seams

A **seam** is a place in your code where you can alter behavior without editing the code itself. The concept comes from Michael Feathers' work and is central to making legacy code testable. If you can find a seam, you can substitute a dependency, redirect a call, or inject a mock -- all without modifying the production code that you do not yet have tests for.

There are several types of seams:

**Object seams** are the most common in object-oriented code. If a class method calls another object's method, you can subclass and override the dependency:

\`\`\`typescript
// Original -- tightly coupled to EmailService
class OrderProcessor {
  private emailService = new EmailService();

  processOrder(order: Order): void {
    // ... business logic ...
    this.emailService.sendConfirmation(order.email);
  }
}

// Test -- override the seam
class TestableOrderProcessor extends OrderProcessor {
  public emailsSent: string[] = [];

  protected getEmailService() {
    return {
      sendConfirmation: (email: string) => {
        this.emailsSent.push(email);
      },
    };
  }
}
\`\`\`

**Link seams** exist at the module import level. In JavaScript and TypeScript, you can use module mocking to replace an imported dependency at the link level:

\`\`\`typescript
// Using Jest module mocking as a link seam
jest.mock('../src/services/email-service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendConfirmation: jest.fn(),
  })),
}));
\`\`\`

**Parameterize seams** involve changing a function or constructor to accept a dependency as a parameter rather than creating it internally. This is the most common refactoring you will do when adding tests to existing code.

**How to identify seams in tightly coupled code:**

1. **Look for \`new\` keywords** inside methods -- each one is a hidden dependency
2. **Look for static method calls** -- these are hard to override and often hide side effects
3. **Look for global state access** -- singletons, environment variables, file system calls
4. **Look for deep call chains** -- \`a.getB().getC().doThing()\` indicates tight coupling
5. **Trace the dependency graph** from the function you want to test outward -- every external call is a potential seam

---

## Breaking Dependencies Safely

Once you have identified seams, the next step is to **break dependencies** so you can get code under test. The key principle here is to make the **smallest possible change** that lets you write a test. You are not refactoring for beauty -- you are refactoring for testability, one surgical cut at a time.

Here are the most important dependency-breaking techniques:

### Extract and Override

This is the safest starting technique. You extract the dependency into a protected method, then override it in a test subclass.

**Before:**

\`\`\`typescript
class ReportGenerator {
  generate(month: number): string {
    const db = new DatabaseConnection('prod-connection-string');
    const data = db.query(\`SELECT * FROM sales WHERE month = \${month}\`);
    // ... complex formatting logic ...
    return formattedReport;
  }
}
\`\`\`

**After:**

\`\`\`typescript
class ReportGenerator {
  generate(month: number): string {
    const data = this.fetchData(month);
    // ... complex formatting logic ...
    return formattedReport;
  }

  protected fetchData(month: number): SalesData[] {
    const db = new DatabaseConnection('prod-connection-string');
    return db.query(\`SELECT * FROM sales WHERE month = \${month}\`);
  }
}

// In tests:
class TestableReportGenerator extends ReportGenerator {
  protected fetchData(month: number): SalesData[] {
    return [
      { month: 1, amount: 1000, product: 'Widget' },
      { month: 1, amount: 2000, product: 'Gadget' },
    ];
  }
}
\`\`\`

### Parameterize Constructor

Instead of creating dependencies internally, accept them as constructor parameters with sensible defaults.

**Before:**

\`\`\`typescript
class NotificationService {
  private mailer = new SmtpMailer();
  private logger = new FileLogger('/var/log/app.log');

  notify(userId: string, message: string): void {
    this.logger.log(\`Notifying \${userId}\`);
    this.mailer.send(userId, message);
  }
}
\`\`\`

**After:**

\`\`\`typescript
interface Mailer {
  send(to: string, message: string): void;
}

interface Logger {
  log(message: string): void;
}

class NotificationService {
  constructor(
    private mailer: Mailer = new SmtpMailer(),
    private logger: Logger = new FileLogger('/var/log/app.log')
  ) {}

  notify(userId: string, message: string): void {
    this.logger.log(\`Notifying \${userId}\`);
    this.mailer.send(userId, message);
  }
}
\`\`\`

Now you can inject mocks in tests while keeping the default production behavior unchanged for existing callers.

### The Sprout Method

When you need to add new functionality to a legacy function, do not modify the existing function. Instead, **sprout** a new, fully tested method and call it from the original:

\`\`\`typescript
// Original untested method
class InvoiceProcessor {
  processInvoice(invoice: Invoice): void {
    // 200 lines of untested legacy logic
    // ...

    // NEW: Add tax calculation (sprouted method)
    invoice.tax = this.calculateTax(invoice.subtotal, invoice.region);

    // ... more legacy logic ...
  }

  // New, fully tested method
  calculateTax(subtotal: number, region: string): number {
    const rates: Record<string, number> = {
      US: 0.08,
      EU: 0.20,
      UK: 0.20,
    };
    return subtotal * (rates[region] ?? 0);
  }
}
\`\`\`

### The Wrap Method

Similar to Sprout, but you wrap the original method instead of adding to it:

\`\`\`typescript
// Before: need to add logging to processPayment
class PaymentService {
  processPayment(payment: Payment): Result {
    // ... existing untested logic ...
  }
}

// After: wrap the original method
class PaymentService {
  processPayment(payment: Payment): Result {
    this.logPaymentAttempt(payment);
    const result = this.processPaymentOriginal(payment);
    this.logPaymentResult(payment, result);
    return result;
  }

  private processPaymentOriginal(payment: Payment): Result {
    // ... original untested logic, unchanged ...
  }

  // New, tested methods
  logPaymentAttempt(payment: Payment): void { /* ... */ }
  logPaymentResult(payment: Payment, result: Result): void { /* ... */ }
}
\`\`\`

---

## The Strangler Fig Pattern for Tests

The **Strangler Fig pattern** -- borrowed from Martin Fowler's architectural pattern -- is the most sustainable long-term strategy for testing legacy code. Instead of attempting a "big bang" test retrofit, you gradually grow test coverage over time by following three rules:

1. **Every new feature gets tests.** No exceptions. New code is written test-first or at minimum has comprehensive tests before merging.
2. **Every bug fix starts with a characterization test.** Before fixing a bug, write a test that reproduces it. This prevents regressions and incrementally adds to your safety net.
3. **Every refactoring is preceded by characterization tests.** Before you touch legacy code, lock in its current behavior with tests.

Over months, this approach produces a powerful effect: the tested surface area grows steadily while the untested legacy core shrinks. Like a strangler fig tree that gradually envelops its host, your test suite gradually wraps around the legacy code until the untested portions are small enough to tackle directly.

Here is what this looks like in practice:

| Timeline | Action | Coverage Impact |
|---|---|---|
| Month 1 | Add characterization tests for most-changed files | 0% to 15% |
| Month 2 | New features written test-first | 15% to 25% |
| Month 3 | Bug fixes include regression tests | 25% to 35% |
| Month 6 | Critical paths fully characterized | 35% to 55% |
| Month 12 | Most active code is under test | 55% to 75% |

The key insight is that you **do not need to test everything at once**. You focus your effort where it matters most -- the code that changes most frequently, breaks most often, and carries the highest business risk.

---

## Golden Master Testing

**Golden master testing** (also called **approval testing** or **snapshot testing**) is a characterization testing technique where you capture the complete output of a function, API, or system and store it as a reference file. Future test runs compare the current output against this stored "golden master" -- any difference triggers a failure.

This technique is especially valuable for:

- **Complex algorithms** with many interacting variables where writing individual assertions is impractical
- **Report generators** that produce large, formatted outputs
- **API response bodies** where the structure and content must remain stable
- **Data transformation pipelines** where input-to-output mappings are intricate
- **Rendering functions** where the output is HTML, PDF, or structured text

Here is how to implement golden master testing with Jest snapshots:

\`\`\`typescript
describe('ReportGenerator -- golden master', () => {
  it('generates the monthly sales report correctly', () => {
    const generator = new ReportGenerator(mockDatabase);
    const report = generator.generate(2026, 1);

    // First run: creates the snapshot file
    // Subsequent runs: compares against stored snapshot
    expect(report).toMatchSnapshot();
  });

  it('handles edge case with no sales data', () => {
    const generator = new ReportGenerator(emptyDatabase);
    const report = generator.generate(2026, 1);
    expect(report).toMatchSnapshot();
  });
});
\`\`\`

**When to use golden master testing:**

- When the output is large and complex, making individual assertions tedious
- When you do not fully understand the code's behavior and want to lock in whatever it does
- When you need a quick safety net before refactoring

**When to avoid golden master testing:**

- When the output includes timestamps, random values, or other non-deterministic data (you will need to normalize these first)
- When the output is trivial enough for explicit assertions
- When tests need to express *intent* -- snapshot tests document what the code does, not why

**Normalizing non-deterministic output:**

\`\`\`typescript
function normalizeForSnapshot(output: string): string {
  return output
    .replace(/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/g, 'TIMESTAMP')
    .replace(/[a-f0-9-]{36}/g, 'UUID')
    .replace(/"generatedAt":"[^"]+"/g, '"generatedAt":"NORMALIZED"');
}

it('generates stable report output', () => {
  const report = generator.generate(2026, 1);
  expect(normalizeForSnapshot(report)).toMatchSnapshot();
});
\`\`\`

---

## AI Agents for Legacy Test Generation

This is where testing legacy code gets genuinely exciting. **AI coding agents** are uniquely well-suited for generating characterization tests because the task is fundamentally mechanical: read a function, determine what it does for various inputs, and write tests that assert the observed behavior. This is exactly what characterization testing requires, and AI agents can do it faster than any human.

Here is the workflow for using an AI agent to generate legacy tests:

**Step 1: Point the agent at an untested file**

Give your AI agent a clear instruction:

\`\`\`
Write characterization tests for src/legacy/pricing-engine.ts.
Do not change the source code. Document its current behavior,
including edge cases and boundary conditions.
\`\`\`

**Step 2: The agent analyzes the code**

A well-configured AI agent will:
- Read the function signatures and implementation
- Identify input parameters and their types
- Trace control flow to find branches and edge cases
- Determine what external dependencies exist
- Generate test cases that cover each code path

**Step 3: Review and verify the generated tests**

\`\`\`typescript
// AI-generated characterization tests for pricing-engine.ts
describe('PricingEngine -- characterization', () => {
  it('applies base price for standard tier', () => {
    const engine = new PricingEngine();
    expect(engine.calculate('standard', 100, 'US')).toBe(100);
  });

  it('applies 20% discount for premium tier', () => {
    const engine = new PricingEngine();
    expect(engine.calculate('premium', 100, 'US')).toBe(80);
  });

  it('applies regional tax after discount', () => {
    const engine = new PricingEngine();
    expect(engine.calculate('premium', 100, 'EU')).toBe(96);
  });

  it('returns 0 for negative quantities', () => {
    const engine = new PricingEngine();
    expect(engine.calculate('standard', -5, 'US')).toBe(0);
  });

  // ... 15 more tests covering edge cases
});
\`\`\`

**Step 4: Run and verify coverage**

Run the generated tests, check that they pass, and measure coverage. The AI agent typically achieves **60-80% coverage** on its first pass for well-structured functions, and you can iterate by asking it to cover specific uncovered branches.

The key advantage is speed. A senior engineer might take a full day to write characterization tests for a complex module. An AI agent can generate a solid first draft in minutes. You still need to review the tests for accuracy and completeness, but the bulk of the mechanical work is done.

---

## Prioritizing What to Test First

When facing a large legacy codebase, the temptation is to try to test everything. Resist this temptation. **Risk-based prioritization** is essential -- you should focus your testing effort where it will have the greatest impact on stability and confidence.

Here is a prioritization framework:

**Priority 1: Code that changes frequently**

Use your version control history to identify files with the highest churn rate. These are the files most likely to break and most in need of a safety net:

\`\`\`bash
# Find the 20 most frequently changed files in the last year
git log --since="1 year ago" --name-only --pretty=format: | \\
  sort | uniq -c | sort -rn | head -20
\`\`\`

**Priority 2: Business-critical paths**

Identify the code paths that, if broken, would cause the most damage: payment processing, user authentication, data integrity checks, core business logic. These deserve characterization tests even if they rarely change.

**Priority 3: Code with known bugs or a history of incidents**

If a module has a track record of production incidents, it is telling you that it needs tests. Every past bug is a test case waiting to be written.

**Priority 4: Code you are about to modify**

The **"test before touch" rule** is the most practical prioritization heuristic: before modifying any legacy code, write characterization tests for it first. This ensures you always have a safety net for the code you are actively working on.

| Priority | Criteria | Testing Approach |
|---|---|---|
| **Critical** | Payment, auth, data integrity | Full characterization + golden master |
| **High** | Frequently changed files (> 10 commits/quarter) | Characterization tests for public API |
| **Medium** | Code with past incidents | Regression tests for known failure modes |
| **Normal** | Code you are about to modify | Test before touch |
| **Low** | Stable, rarely changed code | Defer until needed |

**Coverage heat maps** are a useful visualization tool. Generate a coverage report, overlay it with churn data, and you get a clear picture of where your risk is highest: high-churn, low-coverage code is your top priority.

---

## Automate Legacy Testing with AI Agents

AI coding agents equipped with QA-specific skills can dramatically accelerate the process of adding tests to existing code. Instead of manually writing characterization tests one function at a time, you can install specialized skills that guide your AI agent through the entire legacy testing workflow.

Start by installing the skills most relevant to legacy codebase testing:

\`\`\`bash
# Find untested code and coverage gaps
npx @qaskills/cli add test-coverage-gap-finder

# Generate test cases from existing behavior
npx @qaskills/cli add test-case-generator-user-stories

# Debugging strategies for understanding legacy behavior
npx @qaskills/cli add debugging-strategies

# Build regression suites from bug reports
npx @qaskills/cli add regression-suite-bug-reports

# JavaScript/TypeScript-specific testing patterns
npx @qaskills/cli add javascript-testing-patterns
\`\`\`

With these skills installed, your AI agent gains the specialized knowledge to:

- **Scan your codebase** for untested modules and prioritize them by risk
- **Generate characterization tests** that document current behavior without changing the source
- **Identify seams and dependencies** that need to be broken for testability
- **Create regression test suites** based on your bug tracker history
- **Apply framework-specific patterns** for Jest, Vitest, pytest, and other testing tools

Browse the full catalog of 95+ QA skills at [/skills](/skills), or get started with the [installation guide](/getting-started). For complementary strategies, see the [TDD with AI agents guide](/blog/tdd-ai-agents-best-practices) and the [mutation testing deep dive](/blog/mutation-testing-stryker-guide).

---

## Frequently Asked Questions

### How do you start testing a codebase that has zero tests?

Begin with a single characterization test for the most critical or most frequently changed function. Do not try to achieve broad coverage on day one. Install a test runner, write one test, verify it passes, and commit it. Then expand outward from there using the Strangler Fig approach -- every bug fix and every new feature adds to your test suite. The momentum builds quickly once the infrastructure is in place.

### Should you fix bugs you discover while writing characterization tests?

No -- not immediately. The purpose of characterization tests is to document current behavior, even if that behavior is wrong. If you fix bugs while writing safety-net tests, you are making two types of changes at once and cannot tell which one broke something if a problem arises. Write the characterization test first, commit it, and then create a separate commit that fixes the bug and updates the test expectation. This gives you a clean audit trail.

### How much legacy test coverage is "enough" before you can safely refactor?

There is no universal threshold, but a practical guideline is to have characterization tests covering **every code path that your refactoring will touch**. If you are extracting a method, test all the branches within that method. If you are changing a class hierarchy, test the public interface of every class involved. The goal is not 100% coverage of the entire codebase -- it is 100% coverage of the **change surface** for your specific refactoring.

### Is legacy code refactoring worth the investment, or should you just rewrite?

Almost always, **incremental refactoring beats a full rewrite**. Rewrites are notoriously risky -- they take longer than estimated, introduce new bugs, and lose subtle business logic that was encoded in the original code. The Strangler Fig approach lets you improve the codebase continuously without ever taking on the risk of a big-bang replacement. The exceptions are codebases that are so small that a rewrite takes less than a sprint, or systems built on completely obsolete technology stacks.

### Can AI agents handle testing legacy code in languages other than JavaScript?

Yes. AI coding agents are effective at generating characterization tests for Python, Java, C#, Go, Ruby, and most mainstream languages. The core workflow is the same: point the agent at untested code, instruct it to document current behavior, review the generated tests, and iterate. The QA skills on [QASkills.sh](/skills) cover multiple languages and frameworks, so you can find skills tailored to your specific stack.
`,
};
