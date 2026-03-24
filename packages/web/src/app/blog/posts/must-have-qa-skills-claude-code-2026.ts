import type { BlogPost } from './index';

export const post: BlogPost = {
  title: '5 Must-Have QA Skills for Claude Code in 2026',
  description:
    'The five essential testing skills that transform Claude Code from a general-purpose AI agent into a QA powerhouse. Install them in seconds.',
  date: '2026-02-15',
  category: 'Guide',
  content: `
If you are using Claude Code for software development in 2026, you already know it can write application code, debug issues, and refactor with impressive accuracy. But when it comes to QA testing, Claude Code -- like every AI coding agent -- needs specialized knowledge to produce tests that are reliable, maintainable, and production-grade.

## Key Takeaways

- Claude Code produces significantly better tests when equipped with specialized QA skills
- Five skills cover the full testing pyramid: E2E, unit, API, performance, and accessibility
- Each skill installs in seconds with a single CLI command
- Skills teach Claude Code framework-specific patterns, not just generic test syntax
- The combination of all five skills gives Claude Code comprehensive testing expertise

The gap between "tests that pass" and "tests that a senior QA engineer would approve" is enormous. Without specialized testing knowledge, Claude Code defaults to generic patterns from its training data -- brittle CSS selectors instead of resilient role-based locators, hard-coded waits instead of auto-waiting assertions, and happy-path-only coverage that misses critical edge cases.

This is where **Claude Code testing skills** come in. A QA skill is a structured knowledge file that you install into your agent. It contains expert-level testing patterns, framework-specific idioms, project structure recommendations, anti-patterns to avoid, and real-world code examples. When Claude Code has a skill loaded, every test it writes follows proven, production-grade patterns.

You can browse the full catalog of 450+ skills at [qaskills.sh/skills](/skills), or check out the [Claude Code agent page](/agents/claude-code) for skills optimized specifically for this agent.

Let us walk through the five skills that deliver the most impact.

---

## 1. Playwright E2E Testing -- The Foundation of Browser Automation

**Skill slug:** \`playwright-e2e\`
**Testing type:** End-to-end, Visual
**Languages:** TypeScript, JavaScript
**Frameworks:** Playwright

Playwright has emerged as the dominant E2E testing framework in 2026, and for good reason. It offers auto-waiting, cross-browser support, powerful selectors, trace viewer debugging, and a fixture system that enforces test isolation. But getting Claude Code to use all of these features correctly requires the Playwright E2E skill.

### Install It Now

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

### What the Skill Teaches Claude Code

Once installed, the Playwright E2E skill transforms how Claude Code approaches browser testing across six major areas.

The skill instructs Claude Code to always implement the **Page Object Model**. Instead of scattering selectors across test files, every page gets its own class that encapsulates selectors and actions. The skill includes a full BasePage abstract class with navigation, screenshots, and page load helpers, plus concrete implementations like LoginPage with typed locators and action methods.

Here is an example of what Claude Code generates with the skill installed:

\`\`\`bash
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
\`\`\`

The skill defines a strict **auto-waiting locator priority** order: \`getByRole\` first, then \`getByLabel\`, \`getByPlaceholder\`, \`getByText\`, \`getByTestId\`, and CSS/XPath only as an absolute last resort. This selector hierarchy eliminates the most common cause of flaky tests.

The skill also teaches **fixture-based test setup** with \`storageState\` reuse, **cross-browser configuration** for Chromium, Firefox, WebKit, and mobile devices, **visual comparison testing** with \`toHaveScreenshot()\`, and **trace viewer integration** for debugging CI failures.

### Why Playwright E2E Is Skill #1

Every web application needs E2E tests. The difference between a well-structured Playwright suite and a poorly written one compounds over time. With this skill, Claude Code produces test suites that scale to hundreds of tests without becoming unmaintainable.

---

## 2. Pytest Patterns -- Python Testing Done Right

**Skill slug:** \`pytest-patterns\`
**Testing type:** Unit, Integration
**Languages:** Python
**Frameworks:** pytest

Python remains the most popular language for backend services, data pipelines, and machine learning systems in 2026. pytest is the undisputed testing framework for Python, but its power comes from a rich ecosystem of features that Claude Code often underutilizes without the right skill.

### Install It Now

\`\`\`bash
npx @qaskills/cli add pytest-patterns
\`\`\`

### What the Skill Teaches Claude Code

The most important pattern is the **fixture system**. Instead of class-based setUp and tearDown methods, the skill teaches fixture functions with proper scoping:

\`\`\`bash
@pytest.fixture(scope="session")
def database_connection():
    conn = create_connection("test_db")
    yield conn
    conn.close()

@pytest.fixture
def fresh_user(make_user):
    return make_user(email=f"test-{uuid4()}@example.com")
\`\`\`

The skill covers all four fixture scopes, yield fixtures for teardown, fixture factories, and autouse fixtures. It teaches **parametrize for data-driven testing**, combining multiple parametrize decorators for combinatorial testing. It instructs Claude Code on **markers** (\`@pytest.mark.smoke\`, \`@pytest.mark.slow\`) for selective execution and the **conftest hierarchy** for proper fixture scoping.

The skill also covers **pytest-mock integration** and the **plugin ecosystem** including pytest-cov, pytest-xdist, pytest-randomly, and pytest-timeout. Without this skill, Claude Code writes pytest tests that look like unittest tests. With it, every test is idiomatic pytest.

---

## 3. API Testing with REST Assured -- Bulletproof API Validation

**Skill slug:** \`api-testing-rest-assured\`
**Testing type:** API
**Languages:** Java
**Frameworks:** REST Assured

REST APIs are the backbone of modern software architecture. The API testing REST Assured skill teaches Claude Code to use REST Assured's BDD-style \`given().when().then()\` structure consistently.

### Install It Now

\`\`\`bash
npx @qaskills/cli add api-testing-rest-assured
\`\`\`

### What the Skill Teaches Claude Code

The skill ensures Claude Code generates **reusable request and response specifications** using \`RequestSpecBuilder\` and \`ResponseSpecBuilder\`, eliminating code duplication across hundreds of API tests. It teaches proper **POJO serialization and deserialization** with Lombok and Jackson annotations, **JSON schema validation** for contract testing, comprehensive **authentication flow testing**, and a strong emphasis on **negative and edge case testing**.

A key differentiator is the emphasis on negative testing. Claude Code learns to test validation errors, missing required fields, invalid formats, duplicate entries, and unauthorized access. Without the skill, agents typically only test happy paths.

API tests are the fastest feedback loop in your testing pyramid. With the REST Assured skill, Claude Code generates comprehensive suites covering CRUD operations, authentication, validation, pagination, and error handling.

---

## 4. k6 Performance Testing -- Load Test Like a Senior Performance Engineer

**Skill slug:** \`k6-performance\`
**Testing type:** Performance, Load
**Languages:** JavaScript
**Frameworks:** k6

Performance testing is the discipline most teams skip until production falls over. The k6 performance testing skill changes that by making it easy to generate load tests, stress tests, spike tests, and soak tests with proper thresholds.

### Install It Now

\`\`\`bash
npx @qaskills/cli add k6-performance
\`\`\`

### What the Skill Teaches Claude Code

The skill teaches Claude Code to distinguish between **five types of performance tests**:

| Test Type | Purpose | VU Pattern |
|-----------|---------|------------|
| **Smoke Test** | Verify script works | 1 VU |
| **Load Test** | Expected load validation | Ramp to 100 VUs |
| **Stress Test** | Find breaking point | Ramp to 400 VUs |
| **Spike Test** | Sudden traffic bursts | Jump to 500 VUs |
| **Soak Test** | Memory leak detection | Sustained 50 VUs |

The most critical concept is **threshold-based pass/fail criteria**. The skill teaches Claude Code to always define thresholds like \`http_req_duration: ['p(95)<500']\` that fail the test automatically if performance degrades. It also covers **scenario-based testing** with per-scenario thresholds, **custom metrics** using Trend, Rate, Counter, and Gauge types, **data-driven load testing** with SharedArray, and **CI/CD integration** with exit codes based on threshold failures.

Performance bugs are the most expensive to fix in production. With the k6 skill, Claude Code makes performance testing a first-class concern.

---

## 5. Accessibility Testing with Axe -- WCAG Compliance on Autopilot

**Skill slug:** \`accessibility-axe\`
**Testing type:** Accessibility
**Languages:** TypeScript
**Frameworks:** axe-core, Playwright

Accessibility is no longer optional. Legal requirements under the ADA, EAA, and similar legislation worldwide mean inaccessible web applications carry real business risk.

### Install It Now

\`\`\`bash
npx @qaskills/cli add accessibility-axe
\`\`\`

### What the Skill Teaches Claude Code

The skill teaches Claude Code to run **full page accessibility scans** against WCAG 2.1 Level AA criteria:

\`\`\`bash
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();

expect(results.violations).toEqual([]);
\`\`\`

Beyond full-page scans, the skill covers **component-level testing**, **keyboard navigation testing** (Tab navigation, modal focus trapping, dropdown arrow keys), **form accessibility patterns** (labels, aria-required, role=alert), **color contrast verification**, and **custom reporting** that formats violations into actionable output.

The skill provides a WCAG quick reference covering the most commonly tested criteria from 1.1.1 Non-text Content through 2.4.7 Focus Visible. Over one billion people worldwide live with some form of disability. With the Axe skill, Claude Code integrates accessibility testing into your existing E2E suite.

---

## Comparison: All Five Skills at a Glance

| Skill | Slug | Language | Testing Type |
|-------|------|----------|-------------|
| Playwright E2E | \`playwright-e2e\` | TypeScript/JS | E2E, Visual |
| Pytest Patterns | \`pytest-patterns\` | Python | Unit, Integration |
| REST Assured API | \`api-testing-rest-assured\` | Java | API |
| k6 Performance | \`k6-performance\` | JavaScript | Performance, Load |
| Accessibility Axe | \`accessibility-axe\` | TypeScript | Accessibility |

Each skill is compatible with Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, and 25+ other agents.

---

## How to Get Started

Getting started takes less than a minute:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add pytest-patterns
npx @qaskills/cli add api-testing-rest-assured
npx @qaskills/cli add k6-performance
npx @qaskills/cli add accessibility-axe
\`\`\`

Verify installation with \`npx @qaskills/cli list\`, then open Claude Code and ask it to write a test. You will immediately notice the difference: proper Page Object Model structure, correct fixture usage, comprehensive assertions, and production-grade patterns throughout.

Browse the full directory at [qaskills.sh/skills](/skills), or visit the [Getting Started guide](/getting-started) for a detailed walkthrough. With 450+ curated QA skills and growing, QASkills.sh is the fastest way to give your AI coding agent the testing expertise it needs.

---

*Written by [Pramod Dutta](https://thetestingacademy.com), founder of The Testing Academy and QASkills.sh.*
`,
};
