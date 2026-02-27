import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Code Review for QA — Testing Checklist, PR Reviews, and Quality Gates',
  description:
    'Complete guide to code review from a QA perspective. Covers PR review checklists, test coverage verification, automated review tools, and quality gates in CI/CD.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Every pull request is a quality gate. It is the last human checkpoint before code reaches the main branch, triggers a deploy pipeline, and eventually lands in production where real users interact with it. Yet most code review processes focus exclusively on implementation correctness -- does the logic work? -- while ignoring the far more consequential question: is this code testable, tested, and safe to ship? Code review testing is the practice of evaluating pull requests through a QA lens, verifying not just that the code works but that it is properly covered by tests, handles edge cases, and does not introduce regressions. This guide gives you a comprehensive PR review checklist, automated review tool recommendations, quality gate configurations, and strategies for building a code review culture that treats testing as a first-class concern. Whether you are a QA engineer reviewing developer PRs or a developer wanting to catch more bugs before they escape, this guide will transform how your team thinks about pull request testing.

---

## Key Takeaways

- **Code review from a QA perspective** catches testability issues, missing edge cases, and inadequate error handling before code reaches the main branch -- where fixes cost 10x less than in production
- **A structured PR review checklist** covering test coverage, error handling, security, performance, and accessibility ensures consistent quality across every review
- **Test code deserves the same review rigor as production code** -- poorly written tests give false confidence and create maintenance debt that slows the entire team
- **Automated code review tools** like Danger.js, CodeRabbit, and SonarQube can enforce objective quality standards and free human reviewers to focus on logic and design
- **Quality gates in branch protection rules** make it impossible for untested or broken code to merge, shifting accountability from individual discipline to systemic enforcement
- **A healthy review culture** balances thoroughness with speed, treats feedback as collaboration rather than criticism, and rotates reviewers to spread knowledge across the team

---

## Why QA Should Review Code

There is a persistent misconception that code review is a developer-only activity. QA engineers are expected to test the output -- the deployed feature -- rather than inspect the input -- the code that implements it. This separation made sense in waterfall workflows where QA operated as a distinct phase. In modern agile and DevOps teams, it is a missed opportunity.

### Catching Testability Issues Early

The most valuable contribution QA engineers make during code review is identifying code that will be **difficult or impossible to test**. A function with five nested conditionals and three external API calls embedded directly in the logic is a testing nightmare. A QA reviewer spots this pattern and suggests refactoring before it ships -- saving hours of test writing and maintenance later.

When you review code for testability during the PR stage, you prevent the scenario where QA receives a feature that cannot be adequately tested without extensive mocking, complex setup, or brittle integration tests. This is the essence of [shift-left testing](/blog/shift-left-testing-ai-agents) applied to the review process itself.

### Understanding Implementation for Better Test Design

Reading the code gives QA engineers insight into **how** a feature works, not just what it does from the outside. This knowledge directly improves test design. You discover the boundary conditions the developer was thinking about, the error paths they implemented, and the assumptions they made. Your test cases become sharper because you understand the implementation -- you know exactly where the code might break.

### Knowledge Sharing Across the Team

Code review is one of the most effective knowledge-sharing mechanisms in software engineering. When QA engineers participate in reviews, they build understanding of the codebase architecture, learn about new patterns being introduced, and can proactively plan testing strategies for upcoming features. Conversely, developers who see QA feedback on their PRs begin to internalize testing concerns and write more testable code from the start.

### Shift-Left Quality at the Review Stage

The pull request is the natural point where shift-left quality practices converge. Static analysis has already run. The developer has (hopefully) written tests. The PR review is where a human applies judgment that automated tools cannot: Is the test strategy appropriate? Are the assertions meaningful? Does the error handling cover real-world failure modes? QA engineers are uniquely qualified to answer these questions because they think about software from the perspective of what can go wrong.

---

## The QA Code Review Checklist

A consistent PR review checklist ensures you evaluate every pull request against the same quality standards. Print this checklist, bookmark it, or integrate it into your PR template. Each category targets a different dimension of quality.

### Test Coverage

- [ ] **New code has corresponding tests** -- every new function, endpoint, or component should have at least one test
- [ ] **Modified code has updated tests** -- if behavior changed, existing tests should reflect the new behavior
- [ ] **Edge cases are covered** -- empty inputs, null values, boundary values, maximum lengths
- [ ] **Error paths are tested** -- not just the happy path, but what happens when things fail
- [ ] **Test coverage meets the team threshold** -- typically 80%+ for new code, never decreasing overall coverage
- [ ] **Integration tests exist for cross-boundary changes** -- database queries, API calls, service interactions

### Error Handling

- [ ] **All external calls have error handling** -- API calls, database queries, file operations
- [ ] **Error messages are descriptive and actionable** -- not just "something went wrong"
- [ ] **Errors do not leak sensitive information** -- no stack traces, internal paths, or credentials in user-facing errors
- [ ] **Retry logic exists for transient failures** -- network timeouts, rate limits, connection resets
- [ ] **Graceful degradation is implemented** -- the feature fails safely rather than crashing the entire application

### Security

- [ ] **User input is validated and sanitized** -- both on the client and server side
- [ ] **SQL queries use parameterized statements** -- no string concatenation with user input
- [ ] **Authentication and authorization checks are present** -- new endpoints require proper access control
- [ ] **Sensitive data is not logged or exposed** -- passwords, tokens, PII are masked or excluded
- [ ] **Dependencies are up to date** -- no known vulnerabilities in newly added packages

### Performance

- [ ] **No N+1 query patterns** -- database calls inside loops, especially with ORM lazy loading
- [ ] **Large data sets are paginated** -- unbounded queries that could return thousands of rows
- [ ] **Expensive operations are cached or batched** -- repeated computations, redundant API calls
- [ ] **Async operations are properly awaited** -- no fire-and-forget promises that swallow errors
- [ ] **No memory leaks** -- event listeners are cleaned up, subscriptions are unsubscribed, intervals are cleared

### Accessibility

- [ ] **Interactive elements have ARIA labels** -- buttons, links, form fields, modals
- [ ] **Keyboard navigation works** -- tab order, focus management, escape key behavior
- [ ] **Color is not the only means of conveying information** -- icons, text labels, patterns supplement color
- [ ] **Images have alt text** -- meaningful descriptions, not just filenames
- [ ] **Form errors are announced to screen readers** -- using aria-live regions or proper association

### General Quality

- [ ] **Code follows established patterns** -- consistent with the rest of the codebase
- [ ] **No commented-out code** -- dead code should be removed, not commented
- [ ] **Logging is appropriate** -- enough for debugging, not so much that it creates noise
- [ ] **Feature flags are used for risky changes** -- new functionality can be toggled off without a deploy
- [ ] **Documentation is updated** -- API docs, README, inline comments for complex logic

---

## Reviewing Test Code Quality

Test code is production code. It runs in CI on every commit, it serves as living documentation of expected behavior, and it is the safety net that enables confident refactoring. Yet many teams apply rigorous review standards to application code while rubber-stamping tests with a cursory "looks good to me." This double standard creates a growing pile of unreliable, unmaintainable tests that eventually erode team confidence in the entire test suite.

### What Makes a Good Test

**Clear Arrange/Act/Assert structure.** Every test should have three distinct phases. The arrange phase sets up preconditions and test data. The act phase executes the behavior under test. The assert phase verifies the expected outcome. When these phases blur together, the test becomes hard to understand and maintain.

\`\`\`typescript
// Good: clear AAA structure
test('returns 404 when user does not exist', async () => {
  // Arrange
  const nonExistentId = 'user-999';

  // Act
  const response = await api.get(\\\`/users/\\\${nonExistentId}\\\`);

  // Assert
  expect(response.status).toBe(404);
  expect(response.body.error).toBe('User not found');
});
\`\`\`

**Descriptive test names.** A test name should tell you what scenario is being tested and what the expected outcome is -- without reading the test body. Use the pattern "should [expected behavior] when [condition]" or "[method/action] [expected result] [context]." When a test fails in CI, the name alone should tell the developer what broke.

**No test interdependence.** Each test must be able to run in isolation, in any order. Tests that depend on shared mutable state or execution order are the primary cause of [flaky tests](/blog/fix-flaky-tests-guide). If test B fails only when test A runs first, you have a coupling problem. Use proper setup and teardown hooks, fresh test data, and isolated test contexts.

**Proper assertions -- not just truthy checks.** A test that asserts \`expect(result).toBeTruthy()\` when it should assert \`expect(result).toEqual({ id: 1, name: 'Alice' })\` provides almost no safety net. Truthy checks pass for any non-null, non-undefined, non-empty value. Be specific about what you expect. Assert on structure, values, types, and error messages.

**No sleep or hardcoded waits.** Tests that use \`await new Promise(r => setTimeout(r, 2000))\` or \`cy.wait(5000)\` are time bombs. They either slow down the suite unnecessarily or fail when the CI environment is slower than expected. Use polling, event-based waits, or framework-specific mechanisms like Playwright's \`waitForSelector\` and auto-waiting locators.

### Anti-Patterns to Flag During Review

| Anti-Pattern | Problem | What to Suggest |
|---|---|---|
| **Test only the happy path** | Misses every edge case and error condition | Add tests for empty input, invalid data, auth failures, timeouts |
| **Giant test with multiple assertions** | Hard to diagnose which behavior broke | Split into focused tests, one behavior per test |
| **Mocking everything** | Tests pass but production breaks because mocks diverge from reality | Use real dependencies where practical; update mocks when APIs change |
| **Copy-paste test duplication** | Maintenance nightmare when shared logic changes | Extract helpers, use parameterized tests, build test factories |
| **Testing implementation details** | Tests break on refactoring even when behavior is unchanged | Assert on outputs and observable behavior, not internal state |
| **No cleanup in afterEach** | Test pollution causes intermittent failures | Reset state, clean up database records, restore mocks |
| **Ignoring async errors** | Promises reject silently, test passes despite real failure | Always await async operations, use \`rejects.toThrow()\` for expected errors |

When you spot these patterns during code review, flag them constructively. Do not just say "this test is bad." Explain **why** it is problematic and suggest a specific improvement.

---

## Automated Code Review Tools

Manual code review is essential for evaluating logic, design decisions, and test strategy. But many aspects of code review testing are objective and repeatable -- perfect candidates for automation. Automated tools enforce consistent standards without reviewer fatigue and catch issues that humans routinely miss.

### Tool Comparison

| Tool | Type | Strengths | Best For |
|---|---|---|---|
| **Danger.js** | CI-integrated PR automation | Custom rules in JS/TS, checks PR metadata, enforces conventions | Teams wanting full control over review rules |
| **CodeRabbit** | AI-powered code review | Understands context, suggests improvements, reviews test quality | Teams wanting intelligent review augmentation |
| **SonarQube** | Static analysis platform | Deep code quality analysis, technical debt tracking, security hotspots | Enterprise teams needing comprehensive quality metrics |
| **GitHub Actions checks** | CI/CD platform | Native integration, matrix testing, artifact management | Every team using GitHub for version control |

### Danger.js

**Danger.js** runs during CI and posts comments on pull requests based on custom rules you define in a \`dangerfile.ts\`. It is particularly powerful for enforcing QA conventions.

\`\`\`typescript
// dangerfile.ts
import { danger, warn, fail } from 'danger';

// Warn if no tests are added for new source files
const newSourceFiles = danger.git.created_files.filter(
  f => f.startsWith('src/') && !f.includes('.test.')
);
const newTestFiles = danger.git.created_files.filter(
  f => f.includes('.test.') || f.includes('.spec.')
);

if (newSourceFiles.length > 0 && newTestFiles.length === 0) {
  warn('New source files were added without corresponding test files.');
}

// Fail if PR has no description
if (!danger.github.pr.body || danger.github.pr.body.length < 50) {
  fail('PR description is too short. Please describe what changed and why.');
}

// Warn on large PRs
const changedLines = danger.github.pr.additions + danger.github.pr.deletions;
if (changedLines > 500) {
  warn(\\\`This PR changes \\\${changedLines} lines. Consider splitting into smaller PRs.\\\`);
}
\`\`\`

Danger.js gives you fine-grained control. You can check that test files exist for new modules, enforce PR description length, warn about large diffs, verify changelog entries, and flag TODO comments. The rules are code, so they evolve with your team's standards.

### CodeRabbit

**CodeRabbit** uses AI to provide contextual code review feedback. Unlike rule-based tools, it understands the semantic meaning of changes and can identify issues that pattern matching misses: tests that do not actually verify the behavior they claim to, error handling that catches exceptions too broadly, or API responses missing proper status codes.

CodeRabbit is particularly valuable for pull request testing because it can evaluate whether test assertions are meaningful, flag missing edge case coverage, and suggest additional test scenarios based on the code changes it sees.

### SonarQube

**SonarQube** provides deep static analysis with a focus on code quality, technical debt, and security. Its quality gate feature integrates directly with the PR workflow -- a PR cannot merge if it violates quality thresholds like minimum coverage, maximum duplicated lines, or zero new critical issues. For teams that need objective, measurable quality standards enforced consistently, SonarQube is the industry standard.

### GitHub Actions Checks

**GitHub Actions** itself is the foundation for pull request testing automation. Required status checks ensure that tests pass, type-checking succeeds, and linting is clean before merge is allowed. Combined with branch protection rules, Actions checks transform your CI pipeline into an automated quality gate.

---

## Test Impact Analysis in PRs

One of the most valuable questions a reviewer can ask is: "Which tests are affected by this change?" If a developer modifies a database query function but only runs the unit tests for the API layer, there might be untested integration paths. **Test impact analysis** maps code changes to the tests that exercise them, ensuring that the right tests run for every PR.

### Determining Affected Tests

Most testing frameworks provide built-in mechanisms for running tests related to changed files:

\`\`\`bash
# Jest: run tests related to changed files since main
npx jest --changedSince=main

# Vitest: run tests related to changed files
npx vitest --changed=main

# Playwright: run tests matching a tag or grep pattern
npx playwright test --grep @checkout

# pytest: run tests that match changed modules
pytest --lf  # re-run last failed
pytest -k "test_user_api"  # keyword match
\`\`\`

### PR Comment Example

Automated test impact analysis can post a comment on the PR showing exactly which test suites are affected:

\`\`\`markdown
## Test Impact Analysis

**Changed files:** 4 source files, 2 test files

| Changed File | Affected Test Suites | Status |
|---|---|---|
| src/api/users.ts | tests/api/users.test.ts | Existing tests updated |
| src/db/queries/users.ts | tests/integration/user-queries.test.ts | Tests exist |
| src/components/UserProfile.tsx | tests/components/UserProfile.test.tsx | No tests found |
| src/utils/format-date.ts | tests/utils/format-date.test.ts | Tests exist |

**Warning:** \`src/components/UserProfile.tsx\` was modified but has no corresponding test file.
\`\`\`

This kind of automated feedback eliminates the guesswork in code review testing. Reviewers can see at a glance whether changes are adequately covered and where gaps exist.

### Integrating with QA Skills

The **pr-test-impact-analyzer** skill teaches your AI agent to perform this analysis automatically. When installed, your agent examines code changes, maps them to affected test suites, and highlights coverage gaps -- all during the PR review stage.

\`\`\`bash
npx @qaskills/cli add pr-test-impact-analyzer
\`\`\`

---

## Quality Gates for Pull Requests

A quality gate is a set of conditions that must be met before a pull request can merge. Unlike code review feedback -- which is advisory -- quality gates are enforced by the system. If tests fail, the merge button is disabled. If coverage drops below the threshold, the PR is blocked. Quality gates remove the temptation to merge "just this once" when deadlines are tight.

### Essential Quality Gate Checks

Every team should enforce these minimum checks on pull requests:

1. **All tests pass** -- unit, integration, and E2E tests relevant to the changed code
2. **Coverage threshold met** -- new code meets the minimum coverage percentage (typically 80%+)
3. **No security vulnerabilities** -- dependency scanning with \`npm audit\` or Snyk finds zero critical/high issues
4. **Lint clean** -- ESLint, Prettier, or equivalent produces zero warnings and zero errors
5. **Type-check passes** -- TypeScript compilation succeeds with strict mode enabled
6. **Build succeeds** -- the application builds without errors
7. **PR has a description** -- minimum length requirement ensures context is documented

### GitHub Branch Protection Setup

Configure branch protection rules in your repository settings to enforce quality gates:

\`\`\`yaml
# .github/branch-protection.yml (documented as reference)
# Settings > Branches > Branch protection rules > main

# Required status checks:
#   - ci/tests (unit + integration)
#   - ci/e2e (Playwright)
#   - ci/lint (ESLint + Prettier)
#   - ci/typecheck (tsc --noEmit)
#   - ci/security (npm audit)
#   - coverage/threshold (80% minimum)

# Additional settings:
#   - Require pull request reviews: 1 approval minimum
#   - Dismiss stale reviews on new commits: enabled
#   - Require review from code owners: enabled
#   - Require branches to be up to date: enabled
#   - Include administrators: enabled
\`\`\`

### Coverage Enforcement in CI

Use your test runner's coverage reporting with a threshold gate:

\`\`\`yaml
# GitHub Actions workflow snippet
- name: Run tests with coverage
  run: npx vitest --coverage --coverage.thresholds.lines=80

# Or with Jest
- name: Run tests with coverage
  run: npx jest --coverage --coverageThreshold='{"global":{"lines":80,"branches":75}}'
\`\`\`

When coverage drops below the configured threshold, the CI step fails, and the quality gate blocks the merge. This systematic enforcement ensures coverage never silently erodes over time.

### Layering Quality Gates

The most effective quality gate strategy layers fast checks first and slow checks last:

| Priority | Check | Typical Duration | Blocks Merge? |
|---|---|---|---|
| 1 | Lint + Format | 15-30 seconds | Yes |
| 2 | Type-check | 30-60 seconds | Yes |
| 3 | Unit tests + coverage | 1-3 minutes | Yes |
| 4 | Integration tests | 3-5 minutes | Yes |
| 5 | E2E tests | 5-10 minutes | Yes |
| 6 | Security scan | 1-2 minutes | Yes (critical/high only) |
| 7 | Performance benchmark | 3-5 minutes | Advisory |

This ordering means a typo caught by the linter fails the PR in 20 seconds, not after waiting 10 minutes for E2E tests to complete. Read our [CI/CD pipeline guide](/blog/cicd-testing-pipeline-github-actions) for detailed implementation instructions.

---

## Reviewing for Testability

Some of the most valuable code review feedback does not point to bugs -- it points to code that **will make future bugs harder to find**. Untestable code is a quality liability because it cannot be adequately covered by automated tests. When you review for testability, you are investing in the team's long-term ability to catch regressions.

### Dependency Injection

Code that creates its own dependencies is hard to test because you cannot substitute test doubles:

\`\`\`typescript
// Hard to test: creates its own database connection
class UserService {
  private db = new DatabaseClient('postgres://prod-server');

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}

// Testable: accepts dependencies through constructor
class UserService {
  constructor(private db: DatabaseClient) {}

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}
\`\`\`

When reviewing a PR, flag classes and functions that instantiate their own dependencies. Suggest injecting them through constructors, function parameters, or framework-specific dependency injection containers.

### Interface-Based Design

Functions that depend on concrete implementations are tightly coupled and require the real dependency in tests. Functions that depend on interfaces can accept any implementation, including test doubles:

\`\`\`typescript
// Tightly coupled to a specific email provider
async function notifyUser(userId: string) {
  const sendgrid = new SendGridClient(process.env.SENDGRID_KEY);
  await sendgrid.send({ to: userId, subject: 'Hello' });
}

// Loosely coupled via interface
interface EmailSender {
  send(options: { to: string; subject: string }): Promise<void>;
}

async function notifyUser(userId: string, emailSender: EmailSender) {
  await emailSender.send({ to: userId, subject: 'Hello' });
}
\`\`\`

In tests, you pass a mock implementation of \`EmailSender\` that records calls without sending real emails. During code review, look for functions that directly reference external services and suggest extracting interfaces.

### Avoiding Global State

Global mutable state is the enemy of test isolation. When one test modifies a global variable, every subsequent test runs in a contaminated environment. During review, flag patterns like module-level \`let\` variables, singleton instances with mutable state, and direct manipulation of \`process.env\` without restoration.

### Pure Functions

**Pure functions** -- functions that return the same output for the same input and produce no side effects -- are the easiest code to test. They need no mocking, no setup, no teardown. When reviewing complex logic, ask whether it can be extracted into pure functions that are tested independently from the side-effectful code that calls them.

\`\`\`typescript
// Mixed concerns: hard to test the calculation logic independently
async function calculateDiscount(userId: string) {
  const user = await db.getUser(userId);
  const orders = await db.getOrders(userId);
  const totalSpent = orders.reduce((sum, o) => sum + o.amount, 0);
  if (totalSpent > 1000) return 0.15;
  if (totalSpent > 500) return 0.10;
  if (user.isVip) return 0.05;
  return 0;
}

// Separated: pure function is trivially testable
function computeDiscountRate(totalSpent: number, isVip: boolean): number {
  if (totalSpent > 1000) return 0.15;
  if (totalSpent > 500) return 0.10;
  if (isVip) return 0.05;
  return 0;
}
\`\`\`

The pure function \`computeDiscountRate\` can be tested with a simple table of inputs and expected outputs -- no database, no mocking, no async. The orchestration function that calls it and the database can be tested separately with integration tests.

---

## Creating a Review Culture

The best PR review checklist in the world is useless if your team dreads code review. A toxic review culture -- where feedback is harsh, reviews are adversarial, and junior developers fear submitting PRs -- does more damage to quality than no reviews at all. Building a healthy code review culture requires intentional effort.

### Constructive Feedback

Frame feedback as suggestions, not commands. Instead of "This is wrong," say "Have you considered handling the case where the input is null? That could cause a TypeError in production." Instead of "This test is useless," say "This assertion checks for truthiness, but it would catch more bugs if it verified the exact structure of the response."

**Use questions to prompt thinking** rather than directives to prescribe solutions. "What happens if this API call times out?" is more educational and less confrontational than "Add a try-catch here." The question invites the developer to reason about the edge case, which builds their skills for next time.

### Reviewing Reviews

Periodically review your own review feedback. Are you consistently constructive? Are you balancing critique with acknowledgment of good work? Do your comments include enough context for the author to understand the reasoning? Self-reflection on review quality is as important as the review itself.

Senior engineers should also review the feedback that junior reviewers give. This meta-review ensures consistency in standards and helps junior team members calibrate their expectations.

### Balancing Speed and Thoroughness

**Reviews should not block PRs for days.** Establish team norms: initial review within 4 hours during business hours, final approval within one business day. For urgent fixes, define an expedited review process with a single approver.

At the same time, thoroughness matters. A review that only checks whether the code compiles is not a review -- it is a rubber stamp. The balance comes from having clear checklists (like the one earlier in this guide), automated tools that handle the mechanical checks, and human reviewers who focus on logic, design, and test strategy.

### Reviewer Rotation

Avoid the pattern where the same senior engineer reviews every PR. Rotating reviewers spreads codebase knowledge across the team, prevents bottlenecks, and gives every team member practice evaluating code quality. Use GitHub's code owners feature to ensure domain experts review changes in their area while rotating the general reviewer role.

### Celebrating Good Practices

When a PR includes excellent test coverage, thoughtful error handling, or well-structured code -- say so. Positive feedback reinforces good habits and motivates the team. A simple "Great test coverage here, especially the edge case for empty arrays" takes five seconds to write and has an outsized impact on team morale and quality culture.

---

## Automate PR Reviews with AI Agents

Manual code review is valuable but time-consuming. AI coding agents can augment your review process by automatically analyzing PRs for code review best practices, identifying missing test coverage, and suggesting improvements. The key is equipping your agent with specialized QA knowledge so its feedback is actionable rather than generic.

### Install Review Skills

The **code-review-excellence** skill teaches your AI agent to evaluate code changes through a QA lens -- checking for testability, error handling patterns, and test coverage gaps:

\`\`\`bash
npx @qaskills/cli add code-review-excellence
\`\`\`

The **pr-test-impact-analyzer** skill enables automated test impact analysis on every PR, mapping code changes to affected test suites:

\`\`\`bash
npx @qaskills/cli add pr-test-impact-analyzer
\`\`\`

### Complementary Skills

For a complete code review QA workflow, combine these additional skills:

- **test-coverage-gap-finder** -- identifies specific lines and branches missing test coverage, not just the overall percentage
- **bug-report-writing** -- ensures that issues discovered during review are documented with clear reproduction steps, expected vs actual behavior, and environment details

\`\`\`bash
npx @qaskills/cli add test-coverage-gap-finder
npx @qaskills/cli add bug-report-writing
\`\`\`

### Explore More Skills

Browse the full directory of QA skills at [/skills](/skills) to find tools for every testing need -- from [Playwright automation](/blog/playwright-e2e-complete-guide) to [API testing](/blog/api-testing-complete-guide). If you are new to QA skills, start with our [getting started guide](/getting-started) to install your first skill in under a minute.

For teams building out their full CI/CD pipeline with automated quality gates, our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers the complete GitHub Actions setup from unit tests through deployment.

---

## Frequently Asked Questions

### How much time should QA spend on code review vs. manual testing?

The ideal ratio depends on your team's maturity and automation level. For teams with strong test automation, QA engineers might spend 30-40% of their time on code review and test design, with the remaining time on exploratory testing and automation maintenance. For teams earlier in their testing journey, 15-20% on code review is a good starting point. The important thing is that QA participates in code review consistently -- even 2-3 hours per week yields significant quality improvements because it catches issues before they reach the test environment.

### What should QA reviewers focus on if they have limited time?

If you can only check one thing, **check that tests exist for new and modified code**. Missing tests are the highest-risk finding because they mean the code has zero automated safety net. After that, focus on error handling -- untested error paths are the most common source of production incidents. Third, check for test quality: are assertions specific, or are they vague truthy checks that would pass even with wrong results? These three areas -- coverage, error handling, and assertion quality -- cover the majority of bugs that escape pull request testing.

### How do you handle disagreements during code review?

Disagreements are healthy and expected. The key is having a framework for resolution. Start by distinguishing between **objective issues** (the code has a bug, tests are missing, a security vulnerability exists) and **subjective preferences** (naming conventions, architectural style). Objective issues should block the PR until resolved. Subjective preferences should be discussed but not block merging unless they violate documented team standards. When two reviewers disagree, escalate to a brief synchronous conversation -- written comments often lack the nuance needed to resolve design disagreements efficiently.

### Should automated tools replace human code review?

No. Automated tools and human review are complementary, not substitutes. Automated tools excel at objective, repeatable checks: coverage thresholds, lint rules, type errors, known vulnerability patterns, and PR metadata validation. Humans excel at evaluating design decisions, test strategy, business logic correctness, and code readability. The most effective code review process uses automation to handle the mechanical checks, freeing human reviewers to focus on the judgment-dependent aspects that tools cannot evaluate. Think of automated tools as your **first reviewer** that catches the obvious issues before a human ever looks at the PR.

### How do you measure the effectiveness of code review?

Track these metrics to evaluate your review process: **defect escape rate** (bugs found in production that should have been caught in review), **review turnaround time** (hours from PR creation to first review), **review iteration count** (number of review cycles before approval), and **post-merge defect rate** (bugs found after merge but before production). A healthy review process has a low escape rate, turnaround under 4 hours, 1-2 review iterations on average, and a declining post-merge defect rate over time. Avoid measuring lines of code reviewed per hour or number of comments per review -- these incentivize the wrong behaviors.
`,
};
