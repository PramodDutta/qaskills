import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mutation Testing -- Stryker, Code Quality, and Killing Mutants',
  description:
    'Complete guide to mutation testing. Covers Stryker Mutator for JavaScript and TypeScript, mutation operators, improving test suite quality, and CI/CD integration.',
  date: '2026-02-22',
  category: 'Guide',
  content: `
Mutation testing is the gold standard for measuring how effective your test suite really is. While code coverage tells you which lines executed, mutation testing tells you whether your tests can actually detect bugs -- and that distinction changes everything about how you think about test quality.

## Key Takeaways

- **Mutation testing** introduces small, deliberate faults (mutants) into your source code and checks whether your tests catch them
- **100% code coverage does not mean your tests are good** -- mutation testing exposes weak assertions and missing edge cases
- **Stryker Mutator** is the leading mutation testing framework for JavaScript, TypeScript, and other languages
- A **mutation score above 80%** is a strong indicator of a high-quality test suite
- **Incremental mutation testing** makes it practical to run in CI/CD pipelines without blowing up build times
- **AI coding agents** can automate the process of writing tests that kill surviving mutants

---

## What Is Mutation Testing?

Mutation testing is a technique that evaluates the quality of your test suite by systematically introducing small changes -- called **mutants** -- into your source code and then running your tests against each mutant. The core idea is simple: if your tests are good, they should fail when a bug is introduced.

A **mutant** is a modified version of your source code where a single, small change has been made. These changes mimic the kinds of real bugs that developers introduce: flipping a \`>\` to \`>=\`, replacing \`&&\` with \`||\`, removing a conditional block, or changing a return value from \`true\` to \`false\`.

Each mutant falls into one of these categories:

- **Killed**: Your tests detected the change and at least one test failed. This is what you want.
- **Survived**: Your tests all still passed despite the code change. This means your tests have a blind spot.
- **Timed out**: The mutant caused an infinite loop or exceeded the time limit. Typically counted as killed.
- **No coverage**: No tests executed the mutated code at all. This is the worst outcome.

Your **mutation score** is the percentage of mutants that were killed:

\`\`\`
Mutation Score = (Killed Mutants / Total Mutants) x 100
\`\`\`

A mutation score of 85% means that 85% of the artificial bugs your tool introduced were caught by your tests. The remaining 15% represent real gaps in your test suite -- places where a bug could hide and your tests would not notice.

This is why mutation testing goes far beyond code coverage. Code coverage answers "did this line run?" Mutation testing answers "would my tests catch a bug here?"

---

## Why Code Coverage Lies

Code coverage is the most widely used metric for test suite quality, and it is also the most misleading. A line of code being **executed** during a test does not mean that line is being **verified**. Code coverage measures execution, not assertion quality.

Consider this function and its test:

\`\`\`typescript
// src/pricing.ts
export function calculateDiscount(price: number, memberLevel: string): number {
  if (memberLevel === 'gold') {
    return price * 0.8;
  } else if (memberLevel === 'silver') {
    return price * 0.9;
  }
  return price;
}

// __tests__/pricing.test.ts
import { calculateDiscount } from '../src/pricing';

describe('calculateDiscount', () => {
  it('should calculate discount for gold members', () => {
    const result = calculateDiscount(100, 'gold');
    expect(result).toBeDefined(); // Weak assertion!
  });

  it('should calculate discount for silver members', () => {
    const result = calculateDiscount(100, 'silver');
    expect(typeof result).toBe('number'); // Weak assertion!
  });

  it('should return price for regular members', () => {
    const result = calculateDiscount(100, 'regular');
    expect(result).toBeTruthy(); // Weak assertion!
  });
});
\`\`\`

This test suite achieves **100% line coverage and 100% branch coverage**. Every line executes. Every branch is taken. But the assertions are worthless. If you changed \`price * 0.8\` to \`price * 0.5\`, every test would still pass. If you changed the return to \`price * 999\`, the tests would still pass. The tests verify that a value exists and is a number, but never verify the **correct** value.

Mutation testing exposes this immediately. Stryker would create mutants like:

- Change \`price * 0.8\` to \`price * 0.2\` -- **survived** (tests still pass)
- Change \`price * 0.9\` to \`price / 0.9\` -- **survived** (tests still pass)
- Remove the \`if (memberLevel === 'gold')\` block entirely -- **survived** (tests still pass)

Your mutation score for this code would be near 0%, despite having 100% code coverage. That is the gap mutation testing fills.

---

## How Mutation Testing Works

The mutation testing process follows a systematic workflow:

1. **Parse the source code** -- The mutation testing tool analyzes your source files and identifies locations where mutations can be applied.
2. **Apply mutation operators** -- Each mutation operator defines a specific type of change. The tool generates one mutant per operator per location.
3. **Run tests against each mutant** -- For every mutant, the tool runs your test suite (or a relevant subset) and records the outcome.
4. **Classify results** -- Each mutant is classified as killed, survived, timed out, or no coverage. The final mutation score is calculated.

The mutation operators are the heart of the system. Here are the most common ones:

| Operator | Original | Mutated | What It Tests |
|----------|----------|---------|---------------|
| Arithmetic | \`a + b\` | \`a - b\` | Correct math operations |
| Conditional | \`a && b\` | \`a \\|\\| b\` | Logic correctness |
| Equality | \`a === b\` | \`a !== b\` | Comparison checks |
| Relational | \`a > b\` | \`a >= b\` | Boundary conditions |
| Unary | \`-a\` | \`a\` | Sign handling |
| Block removal | \`if (x) { doStuff() }\` | \`// removed\` | Necessity of code blocks |
| Boolean | \`true\` | \`false\` | Boolean logic |
| String | \`"hello"\` | \`""\` | String handling |
| Array | \`[a, b]\` | \`[]\` | Array operations |
| Optional chaining | \`a?.b\` | \`a.b\` | Null safety |
| Assignment | \`x += 1\` | \`x -= 1\` | Update operations |

Each surviving mutant is a concrete, actionable signal. It tells you exactly which line of code lacks proper test coverage and exactly what kind of assertion is missing.

---

## Getting Started with Stryker

**Stryker Mutator** is the most popular mutation testing framework for JavaScript and TypeScript projects. It supports Jest, Vitest, Mocha, Jasmine, and Karma as test runners.

### Installation

\`\`\`bash
# Initialize Stryker in your project (interactive setup)
npm init stryker

# Or install manually
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
# For Vitest:
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner
\`\`\`

### Configuration with Jest

Create a \`stryker.config.json\` (or \`stryker.config.mjs\`) in your project root:

\`\`\`json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker/master/packages/core/schema/stryker-core.json",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts"],
  "testRunner": "jest",
  "jest": {
    "configFile": "jest.config.ts"
  },
  "reporters": ["html", "clear-text", "progress"],
  "coverageAnalysis": "perTest",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
\`\`\`

### Configuration with Vitest

\`\`\`json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker/master/packages/core/schema/stryker-core.json",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "testRunner": "vitest",
  "vitest": {
    "configFile": "vitest.config.ts"
  },
  "reporters": ["html", "clear-text", "progress"],
  "coverageAnalysis": "perTest",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
\`\`\`

### Running Your First Mutation Test

\`\`\`bash
npx stryker run
\`\`\`

Stryker will output a summary to the console and generate an HTML report in the \`reports/\` directory. The HTML report is interactive -- you can click into each file, see every mutant, and understand exactly which survived and why.

The clear-text output looks like this:

\`\`\`
All files
  Mutation score: 76.32%
  Mutants:
    Killed:       145
    Survived:      38
    Timed out:      7
    No coverage:    0
\`\`\`

Each surviving mutant will show you the exact line, the original code, and the mutated version. This gives you a precise roadmap for improving your tests.

---

## Stryker with Playwright and Cypress

Mutation testing is most effective with **unit and integration tests** because those tests are fast enough to run hundreds or thousands of times. E2E tests written with Playwright or Cypress are too slow for full mutation testing -- running your entire E2E suite once per mutant would take hours or days.

However, you can still apply mutation testing to **test utilities, page objects, helper functions, and shared test infrastructure** that support your E2E tests:

\`\`\`json
{
  "mutate": [
    "src/utils/**/*.ts",
    "src/helpers/**/*.ts",
    "src/lib/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!e2e/**/*"
  ],
  "testRunner": "vitest",
  "ignorePatterns": ["e2e/", "playwright/"]
}
\`\`\`

This approach lets you mutation-test the business logic and utility functions that your E2E tests depend on, while keeping the E2E tests themselves out of the mutation loop. The result is faster feedback and still a meaningful improvement in overall test quality.

If your Playwright or Cypress tests use a shared page object layer or custom assertion helpers, mutation testing those shared modules is especially valuable. A bug in a page object method can cause false passes across dozens of E2E tests.

---

## Improving Your Mutation Score

When Stryker reports surviving mutants, you have a clear action list. Here are the most effective strategies for killing those mutants and improving your mutation score.

### Strengthen Assertions

The most common reason mutants survive is **weak assertions**. Replace vague checks with precise ones:

\`\`\`typescript
// BEFORE: Weak -- mutant replacing 0.8 with 0.2 survives
it('calculates gold discount', () => {
  const result = calculateDiscount(100, 'gold');
  expect(result).toBeDefined();
  expect(result).toBeLessThan(100);
});

// AFTER: Strong -- any arithmetic mutant is killed
it('calculates gold discount', () => {
  const result = calculateDiscount(100, 'gold');
  expect(result).toBe(80);
});
\`\`\`

### Add Boundary Tests

Relational operator mutations (\`>\` to \`>=\`, \`<\` to \`<=\`) survive when you do not test at the boundary:

\`\`\`typescript
// BEFORE: Does not catch > vs >= mutation
it('rejects underage users', () => {
  expect(isEligible(10)).toBe(false);
  expect(isEligible(25)).toBe(true);
});

// AFTER: Boundary value kills the relational mutant
it('rejects underage users', () => {
  expect(isEligible(17)).toBe(false);
  expect(isEligible(18)).toBe(true);  // Exact boundary
  expect(isEligible(19)).toBe(true);
});
\`\`\`

### Test Error Paths

Block removal mutants survive when error-handling code is not tested:

\`\`\`typescript
// BEFORE: Only tests happy path
it('fetches user', async () => {
  const user = await getUser(1);
  expect(user.name).toBe('Alice');
});

// AFTER: Also tests error path, killing the block removal mutant
it('throws on invalid user ID', async () => {
  await expect(getUser(-1)).rejects.toThrow('Invalid user ID');
});
\`\`\`

### Use Exact Return Value Checks

Boolean mutants (\`true\` to \`false\`) survive when you do not assert the exact return value:

\`\`\`typescript
// BEFORE: Does not distinguish true from truthy
it('validates email', () => {
  expect(isValidEmail('a@b.com')).toBeTruthy();
});

// AFTER: Exact boolean check kills boolean mutants
it('validates email', () => {
  expect(isValidEmail('a@b.com')).toBe(true);
  expect(isValidEmail('invalid')).toBe(false);
});
\`\`\`

### Property-Based Testing

For functions with wide input ranges, property-based testing with libraries like **fast-check** can kill mutants that point-based examples miss:

\`\`\`typescript
import fc from 'fast-check';

it('discount is always less than or equal to original price', () => {
  fc.assert(
    fc.property(fc.float({ min: 0, max: 10000 }), (price) => {
      const result = calculateDiscount(price, 'gold');
      return result <= price && result >= 0;
    })
  );
});
\`\`\`

---

## CI/CD Integration

Running mutation testing in your CI/CD pipeline ensures that test quality does not degrade over time. Here is a GitHub Actions workflow that runs Stryker and enforces a minimum mutation score:

\`\`\`yaml
name: Mutation Testing
on:
  pull_request:
    branches: [main]
    paths:
      - 'src/**'
      - '__tests__/**'

jobs:
  mutation-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Run Stryker mutation testing
        run: npx stryker run --reporters clear-text,html,json

      - name: Check mutation score threshold
        run: |
          SCORE=\$(node -e "
            const report = require('./reports/mutation/mutation.json');
            const score = (report.schemaVersion ? report.files : report)
            console.log(report.schemaVersion
              ? Object.values(report.files).reduce((acc, f) => acc + f.mutants.filter(m => m.status === 'Killed').length, 0) /
                Object.values(report.files).reduce((acc, f) => acc + f.mutants.length, 0) * 100
              : 0);
          ")
          echo "Mutation score: \$SCORE%"
          if (( \$(echo "\$SCORE < 80" | bc -l) )); then
            echo "Mutation score below 80% threshold"
            exit 1
          fi

      - name: Upload mutation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation/
\`\`\`

### Setting Thresholds

Stryker's built-in threshold system can fail the build automatically:

\`\`\`json
{
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
\`\`\`

- **break**: Stryker exits with a non-zero code if the score falls below this value. Set this to your team's minimum acceptable score.
- **low**: Files below this score are highlighted in red in the report.
- **high**: Files above this score are highlighted in green.

### Incremental Mutation Testing

For large codebases, running full mutation tests on every PR is impractical. Stryker supports **incremental mode**, which only tests mutants in files that changed since the last run:

\`\`\`bash
npx stryker run --incremental --incrementalFile reports/stryker-incremental.json
\`\`\`

Store the incremental file as a CI cache artifact. On subsequent runs, Stryker skips mutants in unchanged code and only tests new or modified mutants. This can reduce mutation testing time from 30 minutes to under 2 minutes on typical PRs.

### Stryker Dashboard

Stryker provides a free hosted dashboard at [dashboard.stryker-mutator.io](https://dashboard.stryker-mutator.io) where you can track your mutation score over time. Add the \`dashboard\` reporter to your config and set the \`STRYKER_DASHBOARD_API_KEY\` environment variable in your CI environment.

For more on building robust CI/CD pipelines with testing gates, see our [CI/CD Testing Pipeline guide](/blog/cicd-testing-pipeline-github-actions).

---

## Mutation Testing at Scale

The biggest challenge with mutation testing is **performance**. If your test suite takes 30 seconds and Stryker generates 1,000 mutants, a naive approach would take 30,000 seconds (over 8 hours). Stryker uses several optimizations to make this practical:

| Strategy | How It Works | Speed Improvement |
|----------|-------------|-------------------|
| **Per-test coverage** | Only runs tests that cover the mutated line | 5-20x faster |
| **Incremental mode** | Skips mutants in unchanged files | 10-50x faster on PRs |
| **Parallel execution** | Runs mutants across multiple workers | 2-8x faster (scales with cores) |
| **Early exit** | Stops running tests as soon as one fails for a mutant | 2-5x faster |
| **Mutant sampling** | Tests a random subset of mutants | Proportional to sample size |

### Full Run vs Incremental vs Sampled

| Approach | When to Use | Typical Time | Coverage |
|----------|------------|-------------|----------|
| Full run | Weekly or nightly builds | 10-60 minutes | 100% of mutants |
| Incremental | Every PR | 1-5 minutes | Changed files only |
| Sampled (50%) | Quick feedback during development | 5-30 minutes | Statistical sample |

For most teams, the recommended approach is:

1. **Incremental mode on every PR** -- fast enough for CI, catches regressions in changed code
2. **Full run weekly** -- comprehensive baseline, tracks overall quality trends
3. **Local sampling during development** -- developers can run a quick check before pushing

### Scoping to Changed Files

You can also limit mutation testing to only the files changed in a PR using a script:

\`\`\`bash
# Get changed files from the PR
CHANGED_FILES=\$(git diff --name-only origin/main...HEAD -- 'src/**/*.ts' | grep -v '.test.ts' | tr '\\n' ',')

# Run Stryker only on changed source files
npx stryker run --mutate "\$CHANGED_FILES"
\`\`\`

This approach integrates well with any CI system and keeps mutation testing time proportional to the size of the change, not the size of the codebase.

---

## Automate Mutation Testing with AI Agents

Writing tests that kill surviving mutants is a repetitive, mechanical task -- exactly the kind of work AI coding agents excel at. When Stryker reports surviving mutants, an AI agent with the right QA skills can analyze each survivor and write targeted tests to kill them.

**QASkills** provides pre-built skills that teach AI agents how to write mutation-killing tests:

\`\`\`bash
npx @qaskills/cli add mutation-test-generator
\`\`\`

This skill teaches your AI agent to analyze Stryker reports, understand which mutation operators produced survivors, and generate precise test cases that kill them.

\`\`\`bash
npx @qaskills/cli add test-coverage-gap-finder
\`\`\`

The coverage gap finder skill identifies areas where your tests are weakest and suggests targeted improvements -- including areas where mutation testing would reveal the most issues.

For a complete testing workflow, combine these with foundational testing skills:

\`\`\`bash
npx @qaskills/cli add test-driven-development
npx @qaskills/cli add jest-unit
npx @qaskills/cli add vitest
\`\`\`

The **test-driven-development** skill ensures your AI agent writes tests before code, naturally producing higher mutation scores. The **jest-unit** and **vitest** skills provide framework-specific patterns for writing precise assertions that kill mutants.

Browse all available QA skills at [qaskills.sh/skills](/skills) or read the [getting started guide](/getting-started) to install your first skill in under 60 seconds.

For related testing strategies, see our guides on [TDD with AI agents](/blog/tdd-ai-agents-best-practices), [Jest vs Vitest in 2026](/blog/jest-vs-vitest-2026), and [building CI/CD testing pipelines](/blog/cicd-testing-pipeline-github-actions).

---

## Frequently Asked Questions

### Is mutation testing slow?

It can be, but modern tools like Stryker have solved the performance problem. With **per-test coverage analysis**, Stryker only runs the tests that are relevant to each mutant -- not the entire suite. Combined with **incremental mode** (only testing changed files) and **parallel execution**, you can run mutation testing on every PR in 1-5 minutes for most codebases. Full runs on large projects may take 30-60 minutes, which is why teams typically run those on a nightly or weekly schedule.

### What is a good mutation score?

A mutation score above **80%** is generally considered excellent and indicates a high-quality test suite. Scores between **60-80%** are good but suggest room for improvement. Below 60% indicates significant gaps in test coverage quality. Note that achieving 100% is neither practical nor necessary -- some mutants are equivalent (they produce the same behavior as the original code) and cannot be killed. Focus on killing mutants in your most critical business logic first.

### Can I use mutation testing with E2E tests?

Not directly in a practical way. E2E tests with tools like Playwright or Cypress are too slow to run hundreds of times against individual mutants. However, you can apply mutation testing to the **unit and integration tests** that cover the same code paths, and you can mutation-test **shared test utilities, page objects, and helper functions** that your E2E tests rely on. This hybrid approach gives you the best of both worlds -- fast mutation feedback for core logic and E2E confidence for user flows.

### Stryker vs PIT -- which should I use?

**Stryker Mutator** is the go-to choice for **JavaScript, TypeScript, C#, and Scala** projects. **PIT (PITest)** is the standard for **Java** projects. Both are mature, well-maintained, and feature-rich. If you are working in a Java ecosystem, use PIT. For everything else in the web development world, use Stryker. Both support incremental testing, CI integration, and HTML reports.

### Is mutation testing worth the effort?

Yes, especially for critical business logic. Mutation testing catches entire categories of bugs that code coverage metrics miss -- incorrect boundary conditions, wrong operators, missing error handling, and weak assertions. Teams that adopt mutation testing consistently report finding bugs they would have missed and building significantly more confidence in their test suites. Start small: run Stryker on your most important module, fix the surviving mutants, and measure the difference in bug escape rate. The ROI becomes clear quickly.
`,
};
