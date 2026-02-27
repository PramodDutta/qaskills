import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Smoke Testing vs Sanity Testing -- When to Use Each',
  description:
    'Clear comparison of smoke testing vs sanity testing. Covers definitions, use cases, automation strategies, production smoke suites, and CI/CD pipeline placement.',
  date: '2026-02-23',
  category: 'Comparison',
  content: `
Every software team runs into the same confusion at some point: "Is this a smoke test or a sanity test?" The terms get used interchangeably in standups, pull request comments, and CI pipeline configs -- but they are fundamentally different testing techniques with different goals, different scopes, and different positions in your workflow. Confusing them leads to gaps in your testing strategy. You end up running broad surface-level checks when you need targeted verification, or vice versa. This guide gives you a definitive comparison of **smoke testing vs sanity testing**, with concrete examples, automation strategies, and guidance on where each fits in a modern CI/CD pipeline. By the end, you will know exactly when to reach for a smoke suite and when a sanity check is the right tool for the job.

---

## Key Takeaways

- **Smoke testing** is a broad, shallow check that verifies whether a build is stable enough for further testing -- it is the gatekeeper that prevents broken builds from wasting QA time
- **Sanity testing** is a narrow, focused check that verifies whether a specific piece of functionality works correctly after a targeted change -- it confirms that a bug fix or feature modification actually works
- Smoke tests run **after every build** and cover all critical paths at surface level; sanity tests run **after specific changes** and go deeper into the affected area
- **Production smoke tests** are a critical post-deployment safety net that catch environment-specific failures within minutes of a release
- Both testing types should be automated, but they serve different pipeline stages: smoke tests gate the build, sanity tests validate targeted changes in staging
- AI coding agents can generate and maintain both smoke and sanity suites using installable QA skills from [QASkills.sh](/skills)

---

## What Is Smoke Testing?

**Smoke testing** -- also known as **build verification testing** (BVT) -- is a broad, shallow testing technique that verifies the most critical functions of an application work at a basic level. The name comes from hardware testing: when you power on a new circuit board, you first check whether it literally smokes. If it does, there is no point running any further diagnostics. In software, the equivalent question is: "Does this build smoke?"

A smoke test suite does not attempt to verify every feature in detail. It touches the surface of every critical path to confirm the build is fundamentally stable. Think of it as a series of quick health checks:

- **Can the application start?** Does the server boot without crashing? Does the homepage load?
- **Can users authenticate?** Does the login flow complete with valid credentials?
- **Do core workflows function?** Can a user search for a product, add it to a cart, and initiate checkout?
- **Are critical integrations alive?** Does the database respond? Does the payment gateway handshake succeed? Do third-party APIs return valid responses?

The key characteristic of smoke testing is its **breadth over depth**. A smoke test for the checkout flow does not verify every edge case -- discount codes, out-of-stock items, international shipping, tax calculations. It verifies that a user can navigate through the basic checkout steps without encountering a crash or a 500 error. That is enough to answer the fundamental question: is this build worth testing further?

Smoke tests serve as a **quality gate**. If the smoke suite fails, the build is rejected immediately. There is no point running 2,000 regression tests or a full E2E suite against a build where users cannot even log in. This saves enormous amounts of time and compute resources. Teams that implement smoke test gates in their CI pipelines typically report a **30-50% reduction** in wasted test execution time because broken builds get caught in minutes instead of hours.

The scope of a smoke test suite is deliberately limited. A typical web application might have 10-30 smoke tests covering the 5-10 most critical user journeys. The entire suite should run in **under 5 minutes** -- fast enough to include in every build without slowing down the development feedback loop.

---

## What Is Sanity Testing?

**Sanity testing** is a narrow, focused testing technique that verifies whether a specific piece of functionality works correctly after a targeted change. Unlike smoke testing, which casts a wide net, sanity testing zooms in on the area that was modified. It is a subset of regression testing -- you are checking that a specific change has not introduced regressions in the directly related functionality.

The name "sanity" refers to a quick rationality check: "Does this change make sense? Does the fix actually fix the problem?" Before investing time in a full regression cycle, a sanity test confirms that the targeted modification achieves its intended effect.

Consider this scenario: a developer fixes a bug where users could not apply discount codes during checkout. After the fix, a **sanity test** would:

- Apply a valid discount code and verify the price updates correctly
- Apply an expired discount code and verify the error message displays
- Apply a discount code with a minimum purchase requirement and verify the threshold logic works
- Complete a purchase with a discount code and verify the order total in the confirmation email

Notice the difference from a smoke test. A smoke test for checkout would verify that a user can walk through the checkout steps. A sanity test for the discount code fix goes **deeper into that specific feature** to confirm the fix works across its relevant scenarios.

Key characteristics of **sanity testing**:

- **Narrow scope**: Only tests the area affected by the change, plus closely related functionality
- **Deeper verification**: Goes beyond surface-level checks to verify specific behavior, edge cases, and boundary conditions within the affected area
- **Change-driven**: Triggered by a specific code change, bug fix, or feature modification -- not by every build
- **Unscripted or semi-scripted**: Sanity tests are often performed by a QA engineer who understands the change and can make judgment calls about what to verify. Automated sanity suites exist but require thoughtful design
- **Faster than regression, deeper than smoke**: A sanity test suite for a specific change might take 10-30 minutes, compared to 5 minutes for a smoke suite or 2-4 hours for a full regression suite

Sanity testing answers a different question than smoke testing. Smoke testing asks, "Is this build stable enough to test?" Sanity testing asks, "Does this specific change work correctly?" Both questions are essential, but they are asked at different times and for different reasons.

---

## Smoke Testing vs Sanity Testing

The following comparison table summarizes the core differences between smoke testing and sanity testing across eight dimensions. Use this as a quick reference when deciding which approach fits your current situation.

| Dimension | Smoke Testing | Sanity Testing |
|---|---|---|
| **Scope** | Broad -- covers all critical paths at surface level | Narrow -- focuses on changed/affected functionality only |
| **Depth** | Shallow -- verifies basic functionality works | Deeper -- verifies specific behavior and edge cases |
| **Timing** | After every build or deployment | After specific bug fixes or feature changes |
| **Goal** | Determine if the build is stable enough for further testing | Confirm that a specific change works as intended |
| **Performed by** | Automated suite (CI/CD) or junior QA | QA engineer with knowledge of the change, or targeted automation |
| **Automated?** | Almost always -- runs in CI pipeline on every commit | Often manual or semi-automated; increasingly automated with tags |
| **Duration** | 2-5 minutes (10-30 test cases) | 10-30 minutes (depends on scope of change) |
| **Example** | Verify login, search, checkout, and dashboard all load | Verify that the discount code fix works for valid, expired, and threshold scenarios |
| **Failure action** | Reject the build -- do not proceed with any further testing | Send back to development -- the fix is incomplete or introduced a new issue |
| **Test suite** | Stable, rarely changes -- same core tests run on every build | Dynamic, changes based on what was modified in each release |

The most common mistake teams make is conflating these two techniques. When a team runs a "sanity check" on a new build but only verifies that the app loads and users can log in, they are actually running a smoke test. When a team runs 200 tests after a one-line bug fix, they are running a regression suite when a targeted sanity test would suffice.

**The rule of thumb**: smoke testing is about the **build**, sanity testing is about the **change**.

---

## Building a Smoke Test Suite

A well-designed **smoke test suite** is the most valuable automated test asset your team owns. It runs on every build, catches catastrophic failures within minutes, and prevents broken code from progressing through your pipeline. Here is how to build one that is fast, reliable, and maintainable.

### Identify Core User Journeys

Start by listing the 5-10 user journeys that represent the core value of your application. These are the paths that, if broken, would make the application essentially unusable:

- **Authentication**: Sign up, log in, log out, password reset
- **Core workflow**: The primary action users take (search, create, purchase, etc.)
- **Data display**: Can users see their data? Do dashboards load? Do lists render?
- **Navigation**: Can users reach all major sections of the application?
- **Critical integrations**: Payment processing, email delivery, file uploads

### Write Concise, Resilient Tests

Each smoke test should be short, focused on a single journey, and resistant to UI changes. Here is an example smoke suite using Playwright:

\`\`\`typescript
// tests/smoke/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('user can log in', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('smoke-test@example.com');
    await page.getByLabel('Password').fill(process.env.SMOKE_TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('search returns results', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox').fill('test query');
    await page.getByRole('searchbox').press('Enter');
    await expect(page.getByRole('list')).toBeVisible();
    const results = page.getByRole('listitem');
    expect(await results.count()).toBeGreaterThan(0);
  });

  test('checkout flow is navigable', async ({ page }) => {
    await page.goto('/products/sample-product');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page.getByText('Your Cart')).toBeVisible();
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await expect(page.getByText('Shipping')).toBeVisible();
  });

  test('API health check passes', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.database).toBe('connected');
    expect(body.cache).toBe('connected');
  });
});
\`\`\`

### Add API-Level Smoke Tests

Not every smoke test needs to drive a browser. API-level smoke tests are faster and more stable. Include checks for your most critical endpoints:

\`\`\`typescript
// tests/smoke/api-smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Smoke Tests', () => {
  test('GET /api/products returns 200', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('POST /api/auth/login returns token', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'smoke-test@example.com',
        password: process.env.SMOKE_TEST_PASSWORD,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toBeDefined();
  });

  test('GET /api/user/profile requires auth', async ({ request }) => {
    const response = await request.get('/api/user/profile');
    expect(response.status()).toBe(401);
  });

  test('database connection is healthy', async ({ request }) => {
    const response = await request.get('/api/health/db');
    expect(response.status()).toBe(200);
  });
});
\`\`\`

### Smoke Suite Design Principles

Follow these principles to keep your smoke suite effective over time:

- **Keep it under 5 minutes**: If your smoke suite takes longer, it loses its value as a fast feedback mechanism. Cut tests or parallelize
- **No flaky tests allowed**: A flaky smoke test is worse than no smoke test. It erodes trust and causes teams to ignore failures. Remove or fix any test with a flake rate above 1%
- **Test the critical path, not the edge cases**: Smoke tests verify that the highway works. Edge cases are for regression and sanity tests
- **Use dedicated test accounts**: Never rely on production user data. Create dedicated smoke test accounts with stable, predictable data
- **Run in parallel**: Most smoke tests are independent. Run them in parallel to keep execution time minimal

---

## Production Smoke Tests

**Production smoke tests** are a separate, critical category of smoke testing that runs immediately after a deployment to production. While pre-deployment smoke tests verify that a build is stable in a test environment, production smoke tests verify that the application works correctly in the real production environment -- with real infrastructure, real DNS, real CDN, real third-party integrations.

Production smoke tests catch failures that cannot be detected in staging:

- **Environment-specific configuration errors**: Wrong database connection string, missing environment variable, incorrect API key
- **Infrastructure differences**: CDN caching behavior, load balancer routing, SSL certificate issues
- **Third-party integration failures**: Payment gateway rejects requests from the new deployment IP, email service rate limits from a different region
- **Data migration issues**: A schema migration ran in staging but failed silently in production

### Building a Production Smoke Suite

A production smoke suite must be **non-destructive** -- it should never create real orders, send real emails to customers, or modify production data. Use dedicated test accounts, feature flags, and read-only checks wherever possible.

\`\`\`typescript
// tests/production-smoke/prod-smoke.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PRODUCTION_URL || 'https://app.example.com';

test.describe('Production Smoke Tests', () => {
  test.use({ baseURL: BASE_URL });

  test('homepage returns 200 with expected content', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('static assets load from CDN', async ({ page }) => {
    await page.goto('/');
    const styles = await page.evaluate(() => {
      return Array.from(document.styleSheets).length;
    });
    expect(styles).toBeGreaterThan(0);
  });

  test('API responds with correct version', async ({ request }) => {
    const response = await request.get(\`\${BASE_URL}/api/health\`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.version).toBeDefined();
    expect(body.environment).toBe('production');
  });

  test('authentication service is reachable', async ({ request }) => {
    const response = await request.post(\`\${BASE_URL}/api/auth/login\`, {
      data: {
        email: process.env.PROD_SMOKE_EMAIL,
        password: process.env.PROD_SMOKE_PASSWORD,
      },
    });
    expect(response.status()).toBe(200);
  });

  test('database queries execute within latency budget', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(\`\${BASE_URL}/api/products?limit=10\`);
    const latency = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(latency).toBeLessThan(2000); // 2 second budget
  });

  test('third-party payment gateway is reachable', async ({ request }) => {
    const response = await request.get(\`\${BASE_URL}/api/health/payments\`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.gateway).toBe('connected');
  });
});
\`\`\`

### Synthetic Monitoring and Heartbeat Checks

Beyond post-deployment smoke tests, **production smoke tests** should also run on a continuous schedule as synthetic monitoring. Run your production smoke suite every 5-15 minutes to detect issues caused by infrastructure changes, certificate expirations, or third-party outages:

\`\`\`yaml
# .github/workflows/production-smoke.yml
name: Production Smoke Tests
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch: {}

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install chromium
      - run: npx playwright test tests/production-smoke/
        env:
          PRODUCTION_URL: \${{ secrets.PRODUCTION_URL }}
          PROD_SMOKE_EMAIL: \${{ secrets.PROD_SMOKE_EMAIL }}
          PROD_SMOKE_PASSWORD: \${{ secrets.PROD_SMOKE_PASSWORD }}
      - name: Alert on failure
        if: failure()
        run: |
          curl -X POST \${{ secrets.SLACK_WEBHOOK_URL }} \\
            -H 'Content-Type: application/json' \\
            -d '{"text": "Production smoke tests FAILED. Check: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"}'
\`\`\`

### Alerting on Failures

Production smoke test failures must trigger **immediate alerts**. Unlike a staging test failure that can wait for a developer to check the CI dashboard, a production smoke failure means your customers may be affected right now. Connect your production smoke suite to:

- **Slack/Teams notifications** for the on-call channel
- **PagerDuty or Opsgenie** for critical failures (authentication down, payments broken)
- **Metrics dashboards** that track smoke test pass rates over time to detect gradual degradation

---

## Automating Sanity Tests

Automating **sanity testing** is more challenging than automating smoke tests because sanity tests are inherently change-dependent. The tests you need to run depend on what code was modified. There are three proven strategies for automating sanity test selection.

### Tag-Based Execution

The simplest approach is tagging your tests by feature area and running only the relevant tags after a change. Most test frameworks support tag-based filtering:

\`\`\`typescript
// Tag tests by feature area
test.describe('Checkout - Discount Codes @checkout @discounts @sanity', () => {
  test('valid discount code applies correctly', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByLabel('Discount code').fill('SAVE20');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('-20%')).toBeVisible();
  });

  test('expired discount code shows error', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByLabel('Discount code').fill('EXPIRED2025');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('This code has expired')).toBeVisible();
  });

  test('minimum purchase threshold is enforced', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByLabel('Discount code').fill('MIN100');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(
      page.getByText('Minimum purchase of \$100 required')
    ).toBeVisible();
  });
});
\`\`\`

Run only the relevant tags in your CI pipeline:

\`\`\`bash
# Run sanity tests for checkout changes
npx playwright test --grep "@checkout"

# Run sanity tests for authentication changes
npx playwright test --grep "@auth"

# Combine multiple tags for broader sanity checks
npx playwright test --grep "@checkout|@payments"
\`\`\`

### Change-Based Test Selection from PR Diff

A more sophisticated approach analyzes the pull request diff to determine which test files to run. This eliminates the need for manual tag mapping and adapts automatically as your codebase evolves:

\`\`\`bash
#!/bin/bash
# scripts/select-sanity-tests.sh
# Analyzes changed files and selects relevant test files

CHANGED_FILES=\$(git diff --name-only origin/main...HEAD)

TESTS_TO_RUN=""

for file in \$CHANGED_FILES; do
  case "\$file" in
    src/checkout/*|src/cart/*)
      TESTS_TO_RUN="\$TESTS_TO_RUN tests/e2e/checkout/ tests/e2e/cart/"
      ;;
    src/auth/*|src/middleware/auth*)
      TESTS_TO_RUN="\$TESTS_TO_RUN tests/e2e/auth/ tests/integration/auth/"
      ;;
    src/payments/*|src/billing/*)
      TESTS_TO_RUN="\$TESTS_TO_RUN tests/e2e/payments/ tests/integration/billing/"
      ;;
    src/api/*)
      TESTS_TO_RUN="\$TESTS_TO_RUN tests/integration/api/"
      ;;
    src/components/*)
      TESTS_TO_RUN="\$TESTS_TO_RUN tests/e2e/ui/"
      ;;
  esac
done

# Deduplicate and run
TESTS_TO_RUN=\$(echo "\$TESTS_TO_RUN" | tr ' ' '\\n' | sort -u | tr '\\n' ' ')

if [ -n "\$TESTS_TO_RUN" ]; then
  echo "Running sanity tests for changed areas: \$TESTS_TO_RUN"
  npx playwright test \$TESTS_TO_RUN
else
  echo "No sanity tests matched. Running smoke suite as fallback."
  npx playwright test tests/smoke/
fi
\`\`\`

### Dynamic Suite Generation with Module Dependency Mapping

The most advanced approach uses a module dependency graph to automatically determine which tests are affected by a code change. When a utility function used by multiple modules changes, this approach identifies all downstream tests that exercise those modules:

\`\`\`typescript
// scripts/dependency-sanity-runner.ts
import { execSync } from 'child_process';

interface ModuleMap {
  [sourceFile: string]: string[];
}

// Map source modules to their test files
const moduleToTests: ModuleMap = {
  'src/lib/pricing.ts': [
    'tests/e2e/checkout/pricing.spec.ts',
    'tests/unit/pricing.test.ts',
    'tests/integration/invoicing.test.ts',
  ],
  'src/lib/auth.ts': [
    'tests/e2e/auth/login.spec.ts',
    'tests/e2e/auth/signup.spec.ts',
    'tests/integration/middleware.test.ts',
  ],
  'src/lib/email.ts': [
    'tests/integration/email.test.ts',
    'tests/e2e/notifications.spec.ts',
  ],
};

function getChangedFiles(): string[] {
  return execSync('git diff --name-only origin/main...HEAD')
    .toString()
    .trim()
    .split('\\n');
}

function selectSanityTests(changedFiles: string[]): string[] {
  const tests = new Set<string>();

  for (const file of changedFiles) {
    const directTests = moduleToTests[file];
    if (directTests) {
      directTests.forEach((t) => tests.add(t));
    }

    // Also include tests in the same directory
    const dir = file.replace(/\\/[^/]+\$/, '');
    const testDir = dir.replace('src/', 'tests/');
    tests.add(testDir);
  }

  return Array.from(tests);
}

const changed = getChangedFiles();
const tests = selectSanityTests(changed);
console.log('Selected sanity tests:', tests.join(' '));
\`\`\`

---

## Pipeline Placement

Understanding where **smoke testing** and **sanity testing** fit in your CI/CD pipeline is essential. Each testing type serves a specific gate at a specific stage. Placing them incorrectly -- or omitting them entirely -- creates blind spots.

Here is the recommended pipeline layout showing where each testing type fits:

\`\`\`
Pipeline Stage          Testing Type        Purpose
-----------------------------------------------------------------------
1. Code Push            Linting + Types     Catch syntax and type errors
       |
       v
2. Build                (build artifact)    Compile application
       |
       v
3. Post-Build Gate  --> SMOKE TESTS         Is the build stable?
       |                (2-5 min)           Reject broken builds early
       v
4. Deploy to Staging    (staging env)       Deploy for deeper testing
       |
       v
5. Post-Staging     --> SANITY TESTS        Do targeted changes work?
       |                (10-30 min)         Verify bug fixes and features
       v
6. Full Regression      Regression Suite    Complete coverage check
       |                (30-120 min)        Nightly or pre-release
       v
7. Deploy to Prod       (production env)    Ship to customers
       |
       v
8. Post-Deploy      --> PROD SMOKE TESTS    Does production work?
       |                (2-5 min)           Catch environment issues
       v
9. Continuous       --> SYNTHETIC MONITORING Ongoing health checks
                        (every 10 min)      Detect outages and degradation
\`\`\`

### Stage 3: Smoke Tests as Build Gate

Smoke tests run **immediately after the build step** in your CI pipeline. They use the freshly compiled build artifact -- whether that is a Docker image, a serverless deployment package, or a compiled binary -- and verify basic stability. If any smoke test fails, the pipeline stops. No deployment to staging, no regression tests, no wasted time.

\`\`\`yaml
# In your CI config
smoke-test:
  stage: post-build
  script:
    - npx playwright test tests/smoke/ --reporter=list
  timeout: 5m
  rules:
    - if: \$CI_PIPELINE_SOURCE == "push"
\`\`\`

### Stage 5: Sanity Tests After Staging Deployment

Sanity tests run **after the application is deployed to the staging environment**, targeting only the functionality affected by the current changes. This is where tag-based or diff-based test selection shines. The staging environment should mirror production as closely as possible.

\`\`\`yaml
sanity-test:
  stage: post-staging
  needs: [deploy-staging]
  script:
    - bash scripts/select-sanity-tests.sh
  timeout: 30m
  rules:
    - if: \$CI_MERGE_REQUEST_ID
\`\`\`

### Stage 6: Full Regression on a Schedule

Full regression tests are too slow to run on every commit. Schedule them nightly or before major releases:

\`\`\`yaml
regression-test:
  stage: regression
  script:
    - npx playwright test tests/e2e/ tests/integration/
  timeout: 120m
  rules:
    - if: \$CI_PIPELINE_SOURCE == "schedule"
    - if: \$RELEASE_BRANCH
\`\`\`

### Stage 8: Production Smoke Tests Post-Deploy

Production smoke tests run **immediately after every production deployment** and then continuously on a schedule. They are the final safety net between your release process and your customers.

The key insight about pipeline placement is that each testing type answers a **different question at a different stage**:

- **Smoke tests after build**: "Should we deploy this?"
- **Sanity tests after staging**: "Does the specific change work?"
- **Regression tests nightly**: "Is everything still working?"
- **Production smoke tests after deploy**: "Is production healthy?"

Skipping any stage creates a gap. Teams that run only regression tests but skip smoke tests waste hours on broken builds. Teams that run smoke tests but skip sanity tests miss targeted verification of bug fixes. Teams that skip production smoke tests discover deployment failures from customer reports instead of automated alerts.

---

## Automate with AI Agents

Building and maintaining both smoke and sanity test suites takes significant effort. AI coding agents can accelerate this process by generating test templates, identifying critical paths, and suggesting sanity test scope based on code changes. Install specialized QA skills to give your agent the expertise it needs:

\`\`\`bash
# Install production smoke test patterns
npx @qaskills/cli add production-smoke-suite

# Install comprehensive E2E testing patterns
npx @qaskills/cli add e2e-testing-patterns
\`\`\`

With these skills installed, your AI agent can:

- **Generate smoke test suites** from your application's route structure and API endpoints
- **Suggest sanity test scope** by analyzing pull request diffs and mapping changed code to affected test areas
- **Create production smoke monitors** with appropriate alerting thresholds and escalation paths
- **Maintain test tags** by automatically suggesting \`@smoke\` and \`@sanity\` annotations based on test characteristics

Browse the full catalog of QA skills at [/skills](/skills), read the [getting started guide](/getting-started), or explore related topics:

- [CI/CD Testing Pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions) -- detailed pipeline configuration including smoke and sanity stages
- [Regression Testing Strategies Guide](/blog/regression-testing-strategies-guide) -- how smoke and sanity testing fit into a broader regression strategy

---

## Frequently Asked Questions

### Can smoke tests replace sanity tests?

No. Smoke tests and sanity tests answer different questions. A smoke test tells you whether the build is stable at a surface level. A sanity test tells you whether a specific change works correctly. After a developer fixes a bug in the payment retry logic, a passing smoke test only confirms that the checkout flow does not crash. A sanity test would verify the retry logic itself -- that failed payments are retried after the correct interval, that the retry count is respected, and that users see the right error messages. You need both: smoke tests to gate the build, sanity tests to validate the change.

### Is sanity testing the same as regression testing?

Not exactly. **Sanity testing** is a *subset* of regression testing. Regression testing is the broader practice of verifying that existing functionality still works after changes. A full regression suite might run 500 tests across the entire application. Sanity testing selects a small, targeted subset of those 500 tests -- the ones directly related to the change being verified. Think of sanity testing as a focused, lightweight regression check that runs before committing to the full regression suite.

### Should sanity tests be automated or manual?

Both approaches have their place, but the trend is strongly toward automation. Manual sanity testing gives you the flexibility to explore around the change -- an experienced QA engineer can spot unexpected side effects that a scripted test would miss. Automated sanity testing gives you speed, consistency, and the ability to run in CI without human intervention. The best approach is to automate the predictable sanity checks (standard inputs, known edge cases, expected error states) and reserve manual sanity testing for high-risk or complex changes where exploratory judgment adds value.

### How many tests should be in a smoke suite?

A smoke suite for a typical web application should contain **10-30 tests** covering the 5-10 most critical user journeys. The total execution time should stay **under 5 minutes**. If you have more tests than that, you are probably testing too deep for a smoke suite -- move the detailed checks to your sanity or regression suites. The specific number depends on your application's complexity: a simple CRUD app might need 8-10 smoke tests, while a complex e-commerce platform with multiple integrations might need 25-30.

### When should production smoke tests run?

**Production smoke tests** should run at two distinct times. First, they should run **immediately after every production deployment** as part of your deployment pipeline. This catches environment-specific failures within minutes of a release, giving you the chance to roll back before significant customer impact. Second, they should run **continuously on a schedule** -- every 5-15 minutes -- as synthetic monitoring. This catches issues caused by infrastructure changes, certificate expirations, third-party outages, or gradual resource exhaustion that would not be detected by a one-time post-deployment check. Both schedules are essential for maintaining production reliability.
`,
};
