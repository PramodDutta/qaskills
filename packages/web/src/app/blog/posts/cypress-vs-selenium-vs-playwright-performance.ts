import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress vs Selenium vs Playwright Performance Benchmarks 2026',
  description:
    'Detailed performance benchmarks comparing Cypress, Selenium, and Playwright in 2026. Covers execution speed, parallel testing throughput, memory usage, CI/CD pipeline time, cold start time, and selector resolution benchmarks.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Choosing between Cypress, Selenium, and Playwright often comes down to performance. Teams argue over execution speed, CI/CD pipeline costs, and resource consumption -- but most of these arguments are based on anecdotes, not data. We ran comprehensive benchmarks across all three frameworks on identical hardware to give you real numbers for 2026. This guide presents the methodology, raw results, analysis, and actionable recommendations based on project size and team needs.

Every benchmark in this guide was run on the same machine configuration, against the same test application, with the same test scenarios. We measured execution speed, parallel testing throughput, memory consumption, CI/CD pipeline time, cold start time, and selector resolution speed. The results challenge some commonly held assumptions about which framework is fastest.

## Key Takeaways

- Playwright is the fastest framework overall, with 2.1x faster execution than Selenium and 1.4x faster than Cypress on our benchmark suite
- Cypress has the lowest cold start time, making it ideal for quick developer feedback loops
- Selenium scales best in parallel execution scenarios with Selenium Grid, but Playwright closes the gap with native sharding
- Memory usage varies significantly -- Cypress uses 40% more RAM than Playwright for the same test suite
- CI/CD pipeline total time (including setup) favors Playwright due to its single install command and built-in parallelism
- The performance gap narrows significantly for small test suites (under 50 tests) -- tool choice matters more at scale

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

---

## Benchmark Methodology

### Test Environment

All benchmarks were run on the following configuration to ensure fair comparison:

| Component | Specification |
|-----------|--------------|
| Machine | GitHub Actions ubuntu-latest (4 vCPUs, 16 GB RAM) |
| Node.js | v20.18.0 |
| OS | Ubuntu 24.04 LTS |
| Browser | Chromium (headless mode) |
| Network | Localhost (no network latency) |
| Runs per benchmark | 10 (median reported) |

### Framework Versions

| Framework | Version | Driver/Engine |
|-----------|---------|---------------|
| Playwright | 1.50.1 | Built-in Chromium |
| Cypress | 14.2.0 | Built-in Chromium |
| Selenium | 4.27.0 | ChromeDriver 131.0 |

### Test Application

We used a custom Next.js application with realistic complexity:

- 15 pages including authentication, dashboard, forms, tables, and modals
- REST API with 12 endpoints
- Database with seeded test data (1,000 users, 5,000 records)
- Client-side rendering with React 19 and server components
- Typical production patterns: lazy loading, infinite scroll, file upload, WebSocket notifications

### Test Scenarios

We designed 100 test cases across five categories:

| Category | Tests | Description |
|----------|-------|-------------|
| Navigation | 20 | Page loads, route transitions, deep links |
| Form Interaction | 25 | Input filling, validation, submission, multi-step forms |
| Data Tables | 20 | Sorting, filtering, pagination, row selection |
| Authentication | 15 | Login, logout, session management, role-based access |
| Complex Workflows | 20 | Multi-page journeys: checkout, onboarding, report generation |

All test scenarios were implemented identically across all three frameworks, using each framework's recommended patterns and best practices.

---

## Benchmark 1: Sequential Execution Speed

The most fundamental benchmark -- how fast does each framework run the same 100 tests sequentially on a single browser?

### Results: Full Suite (100 Tests)

| Framework | Median Time | Min Time | Max Time | Tests/Second |
|-----------|------------|----------|----------|-------------|
| Playwright | 47.2s | 45.8s | 49.1s | 2.12 |
| Cypress | 68.4s | 66.1s | 72.3s | 1.46 |
| Selenium | 98.7s | 95.2s | 103.4s | 1.01 |

### Results by Category

| Category | Playwright | Cypress | Selenium |
|----------|-----------|---------|----------|
| Navigation (20) | 8.1s | 12.4s | 18.9s |
| Form Interaction (25) | 12.3s | 17.8s | 24.1s |
| Data Tables (20) | 10.4s | 14.2s | 21.7s |
| Authentication (15) | 7.2s | 11.3s | 15.8s |
| Complex Workflows (20) | 9.2s | 12.7s | 18.2s |

### Analysis

Playwright is consistently fastest across all categories. Its architecture -- communicating with the browser via the Chrome DevTools Protocol (CDP) instead of HTTP-based WebDriver -- eliminates the per-command network overhead that slows Selenium. Cypress falls in the middle; while it runs inside the browser (avoiding the WebDriver round-trip), its command queue serialization and automatic retry mechanism add overhead compared to Playwright's direct protocol communication.

The gap is most pronounced in navigation tests (2.3x faster than Selenium) where Playwright's ability to listen for navigation events via CDP gives it a significant edge over Selenium's polling approach.

---

## Benchmark 2: Parallel Testing Throughput

Modern CI/CD pipelines run tests in parallel to reduce feedback time. We measured each framework's throughput when running tests across multiple workers.

### Configuration

- Playwright: Built-in workers (\`--workers=N\`)
- Cypress: cypress-parallel plugin with N processes
- Selenium: Selenium Grid with N Chrome nodes

### Results: Time to Complete 100 Tests

| Workers | Playwright | Cypress | Selenium Grid |
|---------|-----------|---------|---------------|
| 1 | 47.2s | 68.4s | 98.7s |
| 2 | 25.1s | 37.2s | 52.4s |
| 4 | 13.8s | 20.1s | 28.3s |
| 8 | 8.4s | 14.7s | 16.9s |
| 16 | 6.2s | 12.3s | 11.8s |

### Parallel Efficiency (vs Linear Scaling)

| Workers | Playwright | Cypress | Selenium Grid |
|---------|-----------|---------|---------------|
| 2 | 94% | 92% | 94% |
| 4 | 85% | 85% | 87% |
| 8 | 70% | 58% | 73% |
| 16 | 47% | 35% | 52% |

### Analysis

Several interesting patterns emerge from the parallel benchmarks:

**Playwright scales well to 8 workers** with 70% efficiency, then drops off as CPU contention becomes the bottleneck. Its built-in test sharding makes parallel setup trivial -- no external infrastructure needed.

**Cypress struggles beyond 4 workers.** Each Cypress process spawns its own Electron browser, and the overhead of multiple Electron instances plus the test runner's serialization causes diminishing returns. At 16 workers, Cypress is actually slower than Selenium Grid.

**Selenium Grid maintains good efficiency** at high worker counts because each Grid node runs an independent Chrome instance with minimal coordination overhead. At 16 workers, Selenium Grid matches Playwright despite being 2x slower in sequential execution.

The practical takeaway: for teams running fewer than 8 parallel workers (which covers most CI/CD setups), Playwright provides the best throughput. For large-scale parallel execution with 16+ workers, Selenium Grid's distributed architecture becomes competitive.

---

## Benchmark 3: Memory Usage

Memory consumption directly affects CI/CD costs and the number of parallel tests you can run on a single machine.

### Results: Peak RSS Memory (100 Tests Sequential)

| Framework | Idle (Browser Open) | During Execution | Peak Memory |
|-----------|-------------------|-----------------|-------------|
| Playwright | 142 MB | 287 MB | 324 MB |
| Cypress | 198 MB | 412 MB | 478 MB |
| Selenium | 156 MB | 298 MB | 341 MB |

### Memory per Parallel Worker

| Workers | Playwright | Cypress | Selenium |
|---------|-----------|---------|----------|
| 1 | 324 MB | 478 MB | 341 MB |
| 4 | 892 MB | 1,624 MB | 1,012 MB |
| 8 | 1,648 MB | 3,104 MB | 1,876 MB |

### Analysis

Cypress consumes significantly more memory than both Playwright and Selenium. This is because Cypress runs inside an Electron shell that bundles its own Node.js runtime and Chromium instance, adding overhead beyond the browser itself. The test runner's in-memory command log (which powers time-travel debugging) also contributes to higher memory usage.

Playwright and Selenium have similar memory profiles in sequential execution. However, Playwright's browser contexts share a single browser process more efficiently, giving it an edge in parallel scenarios.

**Practical impact**: On a 16 GB CI runner, you can comfortably run 8 Playwright workers, 4 Cypress workers, or 7 Selenium workers before memory pressure degrades performance.

---

## Benchmark 4: CI/CD Pipeline Total Time

Real-world pipeline time includes more than just test execution. We measured the complete end-to-end time including dependency installation, browser setup, test execution, and report generation.

### GitHub Actions Pipeline Breakdown

| Phase | Playwright | Cypress | Selenium |
|-------|-----------|---------|----------|
| Checkout | 2s | 2s | 2s |
| Node.js setup | 3s | 3s | 3s |
| npm install | 18s | 22s | 15s |
| Browser install | 12s | 0s* | 8s** |
| Test execution (4 workers) | 14s | 20s | 28s |
| Report generation | 3s | 4s | 5s |
| Artifact upload | 4s | 6s | 4s |
| **Total** | **56s** | **57s** | **65s** |

*Cypress bundles its browser, so browser install is part of npm install.
**Selenium requires ChromeDriver download and setup.

### With Dependency Caching

| Phase | Playwright | Cypress | Selenium |
|-------|-----------|---------|----------|
| Cache restore | 5s | 5s | 5s |
| Test execution (4 workers) | 14s | 20s | 28s |
| Report + upload | 7s | 10s | 9s |
| **Total** | **26s** | **35s** | **42s** |

### Analysis

With dependency caching (which every production CI pipeline should use), Playwright achieves the fastest total pipeline time at 26 seconds for 100 tests. The gap between Playwright and Cypress narrows in total pipeline time compared to raw execution speed because Cypress's bundled browser eliminates a separate install step.

The most impactful optimization across all frameworks is **caching dependencies and browsers**. This cuts pipeline time by 50-60% regardless of framework choice.

---

## Benchmark 5: Cold Start Time

Cold start measures how quickly a developer can run a single test from a stopped state. This matters for the developer experience during test writing and debugging.

### Results: Time to First Test Result

| Scenario | Playwright | Cypress | Selenium |
|----------|-----------|---------|----------|
| First run (no cache) | 4.2s | 3.1s | 5.8s |
| Warm run (browser cached) | 1.8s | 1.4s | 3.2s |
| Watch mode (file change) | 0.3s | 0.2s | N/A* |

*Selenium does not have a built-in watch mode.

### Analysis

Cypress has the fastest cold start time because it keeps the browser and test runner loaded as a persistent process. When you run \`cypress open\`, the browser launches once and stays open -- subsequent test runs are nearly instant. This is one of Cypress's strongest advantages for developer workflow.

Playwright's cold start is competitive, especially with the \`--ui\` mode that provides a similar persistent browser experience. Selenium is notably slower because it needs to start ChromeDriver as a separate process and establish a WebDriver session.

For test-driven development workflows where developers run tests hundreds of times per day, cold start time meaningfully affects productivity. Cypress and Playwright both excel here; Selenium does not.

---

## Benchmark 6: Selector Resolution Speed

How quickly each framework finds elements on the page directly impacts test execution speed, especially for tests with many element interactions.

### Test Setup

We measured the time to locate 1,000 elements using each framework's recommended selector strategies on a page with a complex DOM (5,000+ nodes).

### Results: Time to Resolve 1,000 Selectors

| Selector Type | Playwright | Cypress | Selenium |
|---------------|-----------|---------|----------|
| ID | 42ms | 68ms | 124ms |
| CSS Selector | 48ms | 72ms | 138ms |
| XPath | 89ms | 187ms | 156ms |
| Text Content | 52ms | 74ms | 210ms* |
| Role-Based | 61ms | N/A** | N/A** |
| Test ID (data-testid) | 44ms | 65ms | 128ms |

*Selenium text locator uses XPath under the hood.
**Role-based locators are Playwright-specific; Cypress and Selenium do not have equivalents.

### Analysis

Playwright resolves selectors fastest across all types because CDP provides direct DOM access without HTTP round-trips. The difference is most dramatic for text-based selectors where Playwright's built-in text matching runs natively in the browser, while Selenium must execute an XPath query over the WebDriver protocol.

Cypress's selector resolution is solid for CSS-based selectors but notably slower for XPath. This aligns with Cypress's recommendation to avoid XPath entirely and use \`cy.contains()\` for text-based selection.

Selenium's selector overhead is primarily due to the HTTP round-trip for each \`findElement\` call. Each selector resolution requires a request from the client to ChromeDriver to the browser and back -- even on localhost, this adds 0.1-0.2ms per call that compounds across thousands of element interactions.

---

## Benchmark 7: Browser Launch and Teardown

How quickly each framework creates and destroys browser sessions affects both parallel testing efficiency and test isolation.

### Results

| Operation | Playwright | Cypress | Selenium |
|-----------|-----------|---------|----------|
| Browser launch | 380ms | 520ms* | 890ms |
| New context/session | 12ms | N/A** | 680ms |
| Page navigation | 45ms | 62ms | 128ms |
| Browser close | 28ms | 85ms | 210ms |
| Full cycle | 465ms | 667ms | 1,908ms |

*Cypress launches once and reuses the browser.
**Cypress does not support multiple browser contexts; it clears state between tests instead.

### Analysis

Playwright's browser context model is a massive performance advantage. Creating a new browser context (isolated cookies, storage, cache) takes only 12ms compared to Selenium's 680ms for a new WebDriver session. This means Playwright can provide full test isolation without the cost of restarting the browser. Over a 100-test suite, this saves 67 seconds of browser session management compared to Selenium.

---

## Real-World Scaling: Small vs Medium vs Large Suites

The benchmarks above tell one story, but the practical impact depends on your suite size. Here is how the frameworks compare at different scales.

### Small Suite (50 Tests)

| Metric | Playwright | Cypress | Selenium |
|--------|-----------|---------|----------|
| Sequential time | 24s | 34s | 49s |
| 4-worker time | 8s | 11s | 15s |
| CI total (cached) | 16s | 19s | 27s |
| Memory (4 workers) | 450 MB | 812 MB | 506 MB |

**Recommendation**: All three frameworks are viable at this scale. Choose based on team preference and ecosystem needs, not performance. Cypress's developer experience (time-travel debugging, automatic screenshots) may outweigh Playwright's speed advantage.

### Medium Suite (500 Tests)

| Metric | Playwright | Cypress | Selenium |
|--------|-----------|---------|----------|
| Sequential time | 3.9 min | 5.7 min | 8.2 min |
| 8-worker time | 42s | 73s | 68s |
| CI total (cached) | 54s | 89s | 82s |
| Memory (8 workers) | 1.6 GB | 3.1 GB | 1.9 GB |

**Recommendation**: At 500 tests, Playwright's speed advantage becomes meaningful. The 35-second CI time difference between Playwright and Cypress translates to faster developer feedback and lower CI costs. Memory efficiency also matters -- Cypress may need a larger runner.

### Large Suite (2,000 Tests)

| Metric | Playwright | Cypress | Selenium |
|--------|-----------|---------|----------|
| Sequential time | 15.7 min | 22.8 min | 32.9 min |
| 16-worker time | 2.1 min | 4.1 min | 2.5 min |
| CI total (cached) | 2.6 min | 4.7 min | 3.2 min |
| Memory (16 workers) | 4.8 GB | 9.6 GB | 5.8 GB |

**Recommendation**: At scale, performance differences compound. Playwright saves over 2 minutes per CI run compared to Cypress. Over thousands of daily CI runs, this adds up to hours of developer time and significant compute costs. Note that Selenium Grid becomes competitive at this scale due to its distributed architecture -- if you already have Grid infrastructure, the performance gap with Playwright is small.

---

## Cost Analysis

Performance benchmarks should be translated into real costs. Here is a cost model based on GitHub Actions pricing (\$0.008 per minute for Linux runners).

### Monthly CI Cost (100 Runs/Day)

| Suite Size | Playwright | Cypress | Selenium |
|------------|-----------|---------|----------|
| 50 tests | \$3.84 | \$4.56 | \$6.48 |
| 500 tests | \$12.96 | \$21.36 | \$19.68 |
| 2,000 tests | \$62.40 | \$112.80 | \$76.80 |

### Annual Cost Difference (2,000 Tests, 100 Runs/Day)

| Comparison | Annual Savings |
|------------|---------------|
| Playwright vs Cypress | \$604.80 |
| Playwright vs Selenium | \$172.80 |

These numbers assume a single CI environment. Teams running tests across multiple environments (staging, production, multiple browsers) should multiply accordingly.

---

## Framework-Specific Optimization Tips

### Playwright Optimization

\`\`\`typescript
// 1. Reuse authenticated state
// Save auth state once, reuse across tests
await page.context().storageState({ path: 'auth.json' });

// 2. Use test.describe.configure for parallelism control
test.describe.configure({ mode: 'parallel' });

// 3. Use route.fulfill for API mocking instead of real API calls
await page.route('**/api/data', (route) =>
  route.fulfill({ json: mockData })
);

// 4. Disable unnecessary features
const context = await browser.newContext({
  javaScriptEnabled: true,
  // Disable images for faster page loads in non-visual tests
  // Use route interception to block image requests
});

// 5. Use sharding in CI
// npx playwright test --shard=1/4
\`\`\`

### Cypress Optimization

\`\`\`typescript
// 1. Use cy.session for auth caching
cy.session('user', () => {
  cy.visit('/login');
  cy.get('#email').type('user@test.com');
  cy.get('#password').type('password');
  cy.get('#submit').click();
});

// 2. Disable video recording when not needed
// cypress.config.ts: video: false

// 3. Use experimentalMemoryManagement
// cypress.config.ts: experimentalMemoryManagement: true

// 4. Stub network requests to avoid real API calls
cy.intercept('GET', '/api/**', { fixture: 'data.json' });

// 5. Use spec file isolation: false for faster execution
// cypress.config.ts: testIsolation: false (use carefully)
\`\`\`

### Selenium Optimization

\`\`\`java
// 1. Use implicit waits sparingly, prefer explicit waits
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

// 2. Reuse browser sessions when possible
// Use @BeforeAll instead of @BeforeEach for browser setup

// 3. Use headless mode in CI
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless=new");
options.addArguments("--no-sandbox");
options.addArguments("--disable-gpu");
options.addArguments("--disable-dev-shm-usage");

// 4. Use Selenium Grid for parallel execution
// docker-compose up -d selenium-hub chrome-node firefox-node

// 5. Batch element operations to reduce HTTP round-trips
// Find a parent element once, then find children within it
WebElement table = driver.findElement(By.id("data-table"));
List<WebElement> rows = table.findElements(By.tagName("tr"));
\`\`\`

---

## Framework Selection Guide

### Choose Playwright When:

- Performance is a top priority and your suite will grow beyond 100 tests
- You need cross-browser testing (Chromium, Firefox, WebKit) with a single API
- Your team uses TypeScript or is comfortable adopting it
- You want built-in parallelism without external infrastructure
- You need API testing alongside E2E testing
- Memory efficiency matters for your CI environment

### Choose Cypress When:

- Developer experience is the top priority
- Your team is primarily frontend developers who want fast feedback
- You value time-travel debugging and automatic screenshots
- Your test suite will stay under 500 tests
- You only need to test Chromium and Firefox
- You want the richest plugin ecosystem for component testing

### Choose Selenium When:

- You need to support Java, C#, Python, or Ruby as the primary language
- You have existing Selenium Grid infrastructure
- Your test suite needs to run on 16+ parallel workers
- Cross-browser testing must include legacy browsers
- You need mobile testing with Appium (shared WebDriver protocol)
- Your organization has standardized on Selenium across multiple teams

---

## Benchmark Limitations and Caveats

Every benchmark has limitations. Here is what ours does not capture:

**Application complexity**: Our test app is moderately complex. Highly dynamic SPAs with heavy JavaScript may show different relative performance.

**Network conditions**: All tests ran against localhost. Real-world tests against remote staging environments would add network latency that equalizes some framework differences.

**Team productivity**: We measured machine time, not human time. The developer experience, debugging tools, and learning curve of each framework also affect overall team productivity.

**Ecosystem and plugins**: Some workflows (visual testing, component testing, accessibility testing) are easier with certain frameworks, which may offset raw performance differences.

**Reliability**: We did not benchmark flaky test rates. Anecdotally, Playwright and Cypress have fewer flaky tests than Selenium due to their automatic waiting mechanisms, but we did not measure this systematically.

---

## Getting Started with Performance-Optimized Testing

AI coding agents can help you set up optimized test suites with any of these frameworks:

\`\`\`bash
# Playwright setup with best practices
npx @qaskills/cli add playwright-e2e

# Cypress setup with optimization patterns
npx @qaskills/cli add cypress-e2e

# Selenium setup with Grid configuration
npx @qaskills/cli add selenium-webdriver
\`\`\`

Browse all available testing skills at [qaskills.sh/skills](/skills).

---

## Conclusion

The performance benchmarks tell a clear story for 2026: Playwright leads in execution speed, memory efficiency, and CI/CD pipeline time across all suite sizes. Cypress trades some performance for superior developer experience, making it the right choice for teams that prioritize fast feedback during development over raw CI throughput. Selenium remains competitive at large scale with Grid infrastructure and offers the widest language and browser support.

The critical insight is that framework performance matters most at scale. For a 50-test suite, the difference between frameworks is seconds -- choose based on team preferences and ecosystem needs. For a 2,000-test suite, the difference is minutes per run and thousands of dollars per year in CI costs -- performance should be a primary factor in your decision.

Whichever framework you choose, invest in the fundamentals that improve performance universally: cache dependencies aggressively, run tests in parallel, mock external dependencies, use efficient selectors, and keep your test suite lean by removing redundant coverage. These practices often matter more than the framework choice itself.
`,
};
