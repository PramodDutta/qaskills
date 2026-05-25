/**
 * Programmatic comparison data for /compare/[slug] pages.
 *
 * Each entry generates a full SEO-optimized comparison page with:
 * - Hero, matrix, pros/cons, when-to-use, code samples, FAQ, related links
 * - CollectionPage + FAQ + Breadcrumb JSON-LD
 * - Metadata + OpenGraph + canonical
 *
 * To add a new comparison: append an entry, rebuild, deploy. Sitemap updates automatically.
 */

export interface CompareTool {
  name: string;
  tagline: string;
  creator: string;
  license: string;
  firstRelease: string;
  language?: string;
  skillSlug?: string; // qaskills.sh skill slug if any
  installCmd?: string; // e.g. `npx @qaskills/cli add playwright-e2e`
}

export interface CompareMatrixRow {
  feature: string;
  a: string;
  b: string;
}

export interface CompareEntry {
  slug: string; // e.g. 'playwright-vs-selenium'
  title: string;
  description: string;
  category: 'E2E' | 'API' | 'Performance' | 'BDD' | 'Unit' | 'Visual' | 'Mocking' | 'AI Agent' | 'LLM Evals' | 'CI/CD';
  a: CompareTool;
  b: CompareTool;
  intro: string; // markdown
  matrix: CompareMatrixRow[];
  prosA: string[];
  prosB: string[];
  whenA: string;
  whenB: string;
  codeA?: { lang: string; code: string };
  codeB?: { lang: string; code: string };
  faqs: Array<{ q: string; a: string }>;
  relatedBlogs?: string[]; // slugs in /blog
  verdict: string;
}

export const COMPARISONS: CompareEntry[] = [
  {
    slug: 'playwright-vs-selenium',
    title: 'Playwright vs Selenium 2026: Which Is Better?',
    description:
      'Detailed Playwright vs Selenium comparison for 2026: speed, auto-waiting, parallel execution, language support, CI integration, ecosystem, and migration path.',
    category: 'E2E',
    a: {
      name: 'Playwright',
      tagline: 'Modern E2E testing with auto-waiting, multi-browser, multi-language',
      creator: 'Microsoft',
      license: 'Apache 2.0',
      firstRelease: '2020',
      language: 'TypeScript / JavaScript / Python / Java / .NET',
      skillSlug: 'playwright-e2e',
      installCmd: 'npx @qaskills/cli add playwright-e2e',
    },
    b: {
      name: 'Selenium',
      tagline: 'W3C WebDriver standard, longest-running browser automation',
      creator: 'OpenJS Foundation',
      license: 'Apache 2.0',
      firstRelease: '2004',
      language: 'Java / Python / C# / JavaScript / Ruby / Kotlin',
      skillSlug: 'selenium-advance-pom',
      installCmd: 'npx @qaskills/cli add selenium-advance-pom',
    },
    intro:
      "Playwright and Selenium are the two dominant browser automation frameworks in 2026. Selenium is the elder statesman — the original WebDriver implementation that birthed an entire industry of E2E testing tools. Playwright is the modern challenger from Microsoft, designed from scratch to fix Selenium's pain points: flakiness, manual waits, slow execution, and complex parallel setups. Both are mature, both are free and open source, and both have enterprise adoption. The right pick depends on team skills, browser coverage needs, and how much existing investment you have in the WebDriver ecosystem.",
    matrix: [
      { feature: 'Auto-waiting locators', a: 'Native — built into every action', b: 'Manual (WebDriverWait / fluent waits)' },
      { feature: 'Parallel execution', a: 'Native via workers + projects', b: 'Selenium Grid 4 + Docker' },
      { feature: 'Browser support', a: 'Chromium, Firefox, WebKit (Safari engine)', b: 'Chrome, Firefox, Safari, Edge, IE (legacy)' },
      { feature: 'Mobile emulation', a: 'Built-in device descriptors', b: 'Via Appium (separate tool)' },
      { feature: 'Network interception', a: 'Native page.route() + APIRequestContext', b: 'Via CDP or BiDi protocol' },
      { feature: 'Trace viewer', a: 'Trace.zip + interactive viewer built-in', b: 'Selenium IDE / third-party' },
      { feature: 'Codegen / Recorder', a: 'npx playwright codegen', b: 'Selenium IDE (Chrome/Firefox plugin)' },
      { feature: 'Component testing', a: 'Yes — React/Vue/Svelte/Solid', b: 'No (use Karma or RTL)' },
      { feature: 'Test isolation', a: 'BrowserContext per test (sub-second)', b: 'New WebDriver session per test' },
      { feature: 'Language coverage', a: '5 official (TS/JS/Python/Java/.NET)', b: '6+ official (Java/Python/C#/JS/Ruby/Kotlin)' },
      { feature: 'CI/CD images', a: 'mcr.microsoft.com/playwright', b: 'selenium/standalone-* images' },
      { feature: 'Default reporters', a: 'HTML, JSON, JUnit, GitHub, Allure plugin', b: 'TestNG / JUnit / Allure / Extent' },
      { feature: 'Standardization', a: 'Proprietary protocol (CDP + Playwright)', b: 'W3C WebDriver standard' },
      { feature: 'Speed on 1000-test suite', a: '~3-5x faster (browser context reuse)', b: 'Slower (new session per test)' },
      { feature: 'Maturity', a: '6 years (2020-2026)', b: '22 years (2004-2026)' },
    ],
    prosA: [
      'Auto-waiting eliminates 90% of flaky tests',
      'Native parallel execution (no Grid setup)',
      'BrowserContext = test isolation without session overhead',
      'Built-in trace viewer + UI mode for debugging',
      'First-class component testing (React/Vue/Svelte)',
      'TypeScript-first API with full type safety',
      'WebKit support for real Safari testing',
      'Network interception, geolocation, permissions, clock control all built-in',
    ],
    prosB: [
      'W3C WebDriver standard — works with every browser vendor',
      'Largest ecosystem of integrations (Appium, BrowserStack, Sauce Labs)',
      'Mature for 22 years — every bug already documented',
      'Better support for legacy browsers (IE 11, old Edge)',
      'Selenium Grid 4 is battle-tested for distributed execution',
      'BiDi protocol (Selenium 4.10+) closes most Playwright gaps',
      'Larger talent pool — more engineers know Selenium',
      'First-class Java + C# + Ruby support',
    ],
    whenA:
      'Pick Playwright when starting a new project, when test reliability matters more than browser breadth, when you need fast feedback loops, when your team writes TypeScript, when you want network interception + traces built-in, or when you are using Claude Code / Cursor and want the AI to generate working tests on first attempt.',
    whenB:
      'Pick Selenium when you need IE11 or legacy Edge support, when your enterprise stack is Java + TestNG + Maven and you cannot rewrite, when you already invested in Selenium Grid infrastructure, when you need Appium for mobile testing in the same stack, or when standards-compliance (W3C) is required by procurement.',
    codeA: {
      lang: 'typescript',
      code: `import { test, expect } from '@playwright/test';

test('user can log in and see dashboard', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});`,
    },
    codeB: {
      lang: 'java',
      code: `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class LoginTest {
  @Test
  void userCanLogIn() {
    WebDriver driver = new ChromeDriver();
    driver.get("https://app.example.com/login");
    driver.findElement(By.cssSelector("input[name=email]")).sendKeys("user@example.com");
    driver.findElement(By.cssSelector("input[name=password]")).sendKeys("secret");
    driver.findElement(By.cssSelector("button[type=submit]")).click();
    new WebDriverWait(driver, Duration.ofSeconds(10))
      .until(ExpectedConditions.visibilityOfElementLocated(By.tagName("h1")));
    driver.quit();
  }
}`,
    },
    faqs: [
      { q: 'Is Playwright faster than Selenium?', a: 'Yes — typically 3-5x faster on suites of 100+ tests. Playwright reuses BrowserContext within a worker (sub-second test isolation) while Selenium creates a new WebDriver session per test (multi-second overhead). Auto-waiting also removes most explicit sleeps.' },
      { q: 'Does Selenium 4 close the gap?', a: 'Selenium 4 with BiDi protocol closes 80% of the gap on capability (network interception, console logs, BiDi events). Speed gap remains because of session-per-test architecture, not protocol.' },
      { q: 'Can I migrate from Selenium to Playwright?', a: 'Yes. Page Object Models port cleanly. Locator strategies usually convert 1:1. Biggest changes: remove explicit waits, switch from driver.findElement to page.locator, replace ExpectedConditions with auto-waiting. See our migration guide.' },
      { q: 'Which has better community support?', a: 'Selenium has larger absolute community (22 years), Playwright has faster-growing one (currently ~60K GitHub stars vs 29K for Selenium). Both have active issue trackers and Discord/Slack communities.' },
      { q: 'Do AI agents like Claude Code write better Playwright or Selenium tests?', a: 'Claude Code and Cursor generate cleaner Playwright tests because the API is more consistent and the docs are tighter. Selenium generation works but more often produces tests with hard-coded sleeps and brittle CSS selectors.' },
    ],
    relatedBlogs: [
      'playwright-vs-selenium-2026',
      'playwright-vs-selenium-complete-2026',
      'playwright-vs-selenium-2026-which-better',
      'selenium-to-playwright-migration-guide-2026',
      'best-test-automation-frameworks-2026',
    ],
    verdict:
      'For new projects in 2026 — Playwright. For legacy enterprise stacks already on Selenium — stay, but plan a migration over 18-24 months for new test development. Both tools are excellent; the question is what tradeoffs your team is willing to absorb.',
  },
  {
    slug: 'playwright-vs-cypress',
    title: 'Playwright vs Cypress 2026: Detailed Comparison',
    description:
      'Playwright vs Cypress in 2026: parallel execution, multi-tab, multi-origin, language support, CI cost, debugging tools, AI agent compatibility.',
    category: 'E2E',
    a: {
      name: 'Playwright',
      tagline: 'Multi-browser, multi-tab, multi-language E2E from Microsoft',
      creator: 'Microsoft',
      license: 'Apache 2.0',
      firstRelease: '2020',
      language: 'TypeScript / JavaScript / Python / Java / .NET',
      skillSlug: 'playwright-e2e',
      installCmd: 'npx @qaskills/cli add playwright-e2e',
    },
    b: {
      name: 'Cypress',
      tagline: 'Front-end developer-first E2E + component testing',
      creator: 'Cypress.io',
      license: 'MIT (core) + paid Cloud',
      firstRelease: '2017',
      language: 'JavaScript / TypeScript',
      skillSlug: 'cypress-e2e',
      installCmd: 'npx @qaskills/cli add cypress-e2e',
    },
    intro:
      'Playwright and Cypress are the two front-running modern E2E frameworks. Cypress kicked off the modern E2E renaissance in 2017 with its time-travel debugger and developer-experience focus. Playwright arrived in 2020 with multi-browser support and architectural decisions that scale better to large suites. Both are excellent for component + E2E, both have active communities, and both have first-class TypeScript support.',
    matrix: [
      { feature: 'Multi-browser', a: 'Chromium, Firefox, WebKit', b: 'Chromium, Firefox, WebKit (Cypress 12+)' },
      { feature: 'Multi-tab / multi-window', a: 'Yes — native', b: 'No — single tab per test' },
      { feature: 'Multi-origin / cross-domain', a: 'Yes — no workarounds', b: 'cy.origin() (Cypress 9.6+) but with limits' },
      { feature: 'Parallel execution', a: 'Free, built-in (workers + projects)', b: 'Cypress Cloud (paid) or open-source orchestrators' },
      { feature: 'Languages', a: 'TS/JS/Python/Java/.NET', b: 'TS/JS only' },
      { feature: 'iframe support', a: 'Native frameLocator', b: 'Limited — requires `chromeWebSecurity: false`' },
      { feature: 'File upload', a: 'setInputFiles native', b: 'cy.selectFile (cypress 9.3+)' },
      { feature: 'File download', a: 'Native event handler', b: 'Plugin required' },
      { feature: 'Network stubbing', a: 'page.route() native', b: 'cy.intercept() — superb DX' },
      { feature: 'Time-travel debugger', a: 'Trace viewer (post-run)', b: 'Yes — built-in, live during run' },
      { feature: 'Component testing', a: 'React/Vue/Svelte/Solid', b: 'React/Vue/Angular/Svelte' },
      { feature: 'API testing', a: 'APIRequestContext native', b: 'cy.request native' },
      { feature: 'Speed (1000 tests)', a: 'Fast — BrowserContext reuse', b: 'Slower — full browser per spec' },
      { feature: 'CI cost (parallel)', a: 'Free with self-hosted runners', b: 'Cypress Cloud paid for parallelism' },
      { feature: 'GitHub stars', a: '~64K', b: '~46K' },
    ],
    prosA: [
      'Multi-tab + multi-origin = real user flow testing',
      'Free parallel execution out of the box',
      'BrowserContext = better test isolation + speed',
      'Python/Java/.NET clients = polyglot teams',
      'WebKit = real Safari testing',
      'APIRequestContext = mixed UI + API tests',
      'Better for CI-cost-sensitive teams',
      'Auto-waiting eliminates most flake',
    ],
    prosB: [
      'Best-in-class developer experience',
      'Time-travel debugger live during run',
      'Cypress Dashboard is gorgeous for non-technical stakeholders',
      'cy.intercept() has clearer DSL than page.route()',
      'Component testing UX is more polished',
      'Documentation is excellent',
      'Larger plugin ecosystem',
      'Custom commands API is delightful',
    ],
    whenA:
      'Pick Playwright when your suite is 200+ tests, when you need multi-tab/multi-origin flows (OAuth, payments, third-party widgets), when your team writes Python/Java/.NET, when you want free parallel execution, or when you need WebKit/Safari coverage.',
    whenB:
      'Pick Cypress when developer experience is the primary goal, when your team is single-language JS/TS, when stakeholders use the Cypress Dashboard for reporting, when your suite is small-to-medium (<200 tests), or when component testing is the primary use case.',
    codeA: {
      lang: 'typescript',
      code: `import { test, expect } from '@playwright/test';

test('checkout flow', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  // Multi-origin: redirect to payment provider
  await expect(page).toHaveURL(/stripe\\.com/);
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay' }).click();
  // Return to our origin
  await expect(page).toHaveURL(/example\\.com\\/success/);
});`,
    },
    codeB: {
      lang: 'typescript',
      code: `describe('checkout flow', () => {
  it('completes payment', () => {
    cy.visit('/cart');
    cy.contains('button', 'Checkout').click();
    cy.origin('https://stripe.com', () => {
      cy.get('input[name=card_number]').type('4242424242424242');
      cy.contains('button', 'Pay').click();
    });
    cy.url().should('match', /example\\.com\\/success/);
  });
});`,
    },
    faqs: [
      { q: 'Is Playwright better than Cypress?', a: 'Better is context-dependent. Playwright wins on architecture (multi-tab, multi-origin, parallel, languages). Cypress wins on developer experience (time-travel debugger, custom commands, Dashboard UX). Both write good tests with AI agents.' },
      { q: 'Should I migrate from Cypress to Playwright?', a: 'Migrate if you need multi-tab flows, multi-origin without workarounds, polyglot test code, free parallel execution, or your CI bill is dominated by Cypress Cloud minutes. Otherwise stay — both produce reliable tests.' },
      { q: 'Which has better TypeScript support?', a: 'Both excellent. Playwright APIs are TS-first by design. Cypress added TS in v5 and the types are now solid.' },
      { q: 'Which is cheaper at scale?', a: 'Playwright. Parallelism is free with self-hosted GitHub Actions runners. Cypress Dashboard at 100+ parallel runners runs into thousands of USD/month.' },
      { q: 'Does Cypress work with Claude Code or Cursor?', a: 'Yes — both AI agents generate solid Cypress tests. Playwright wins slightly on first-try correctness because the locator API is more consistent.' },
    ],
    relatedBlogs: [
      'cypress-vs-playwright-2026',
      'playwright-vs-cypress-detailed-2026',
      'playwright-vs-cypress-2026-detailed-comparison',
      'cypress-to-playwright-migration-complete-guide',
      'cypress-vs-selenium-vs-playwright-performance',
    ],
    verdict:
      'For new large-scale E2E projects in 2026 — Playwright. For component testing or small suites with great DX — Cypress. Both are excellent picks; the tradeoff is architectural scale vs developer experience polish.',
  },
  {
    slug: 'k6-vs-jmeter',
    title: 'k6 vs JMeter 2026: Performance Testing Showdown',
    description:
      'k6 vs JMeter in 2026: scripting language, scalability, cloud execution, observability integration, learning curve, CI/CD fit.',
    category: 'Performance',
    a: {
      name: 'k6',
      tagline: 'Go-based load testing with JavaScript scripts',
      creator: 'Grafana Labs (formerly Load Impact)',
      license: 'AGPL v3 + commercial',
      firstRelease: '2017',
      language: 'JavaScript (ES2015+)',
      skillSlug: 'k6-performance',
      installCmd: 'npx @qaskills/cli add k6-performance',
    },
    b: {
      name: 'JMeter',
      tagline: 'Apache JMeter — JVM-based performance testing veteran',
      creator: 'Apache Software Foundation',
      license: 'Apache 2.0',
      firstRelease: '1998',
      language: 'XML + Groovy / BeanShell / Java',
      skillSlug: 'jmeter-performance',
      installCmd: 'npx @qaskills/cli add jmeter-performance',
    },
    intro:
      "k6 and JMeter are the two most-installed load testing tools in 2026. JMeter is the established veteran from the Apache Foundation — 28 years of bug-fixing, plugins, and enterprise adoption. k6 is the modern code-first alternative from Grafana Labs that turns load testing into a software engineering discipline (Git-friendly scripts, native CI, programmatic checks). Both can drive 10K+ concurrent users; the right pick depends on team skills and observability stack.",
    matrix: [
      { feature: 'Script language', a: 'JavaScript (ES2015+)', b: 'XML test plan + Groovy/BeanShell' },
      { feature: 'Test in Git', a: 'Plain JS files — diff-friendly', b: 'XML — diff-hostile' },
      { feature: 'Max VUs per host', a: '30K-40K on modest hardware', b: '5K-15K (JVM overhead)' },
      { feature: 'CLI execution', a: '`k6 run script.js`', b: '`jmeter -n -t plan.jmx`' },
      { feature: 'Cloud / SaaS', a: 'Grafana Cloud k6 (managed)', b: 'BlazeMeter / Octoperf (3rd party)' },
      { feature: 'Distributed load', a: 'k6 operator (Kubernetes)', b: 'JMeter master/slave or Docker' },
      { feature: 'Protocols', a: 'HTTP/1, HTTP/2, gRPC, WebSocket, browser (xk6-browser)', b: '20+ via plugins (FTP, JMS, JDBC, MQTT, etc.)' },
      { feature: 'Thresholds / SLOs', a: 'Native `thresholds` block', b: 'Listeners + custom code' },
      { feature: 'CI integration', a: 'GitHub Action, JUnit XML output', b: 'Jenkins Performance plugin' },
      { feature: 'Observability', a: 'Prometheus / Grafana / k6 Cloud native', b: 'InfluxDB + Grafana (plugin)' },
      { feature: 'GUI for non-engineers', a: 'No — code-first', b: 'Yes — graphical test plan editor' },
      { feature: 'Learning curve for JS devs', a: 'Hours', b: 'Days (XML + Groovy + plugin ecosystem)' },
      { feature: 'Browser-based testing', a: 'xk6-browser (Chromium via CDP)', b: 'WebDriver sampler (slow, unstable)' },
    ],
    prosA: [
      'JavaScript = familiar to most frontend/backend devs',
      'Test scripts live in Git — code review like any feature',
      'Single binary, no JVM, low memory footprint',
      'Thresholds = native CI pass/fail criteria',
      'Grafana Cloud k6 = managed distributed execution + dashboards',
      'xk6 extensions = Go-built plugins for any protocol',
      'Modern observability integrations (Prom, Loki, Tempo)',
      'Excellent docs and beginner-friendly tutorials',
    ],
    prosB: [
      '28 years of plugin ecosystem (50+ protocols)',
      'GUI is approachable for non-engineers + manual QAs',
      'Listeners give rich aggregate + per-request views',
      'BeanShell / Groovy lets you embed any Java code',
      'Mature distributed execution (master/slave)',
      'No license cost; OSS Apache 2.0',
      'Used in regulated industries with audit trails',
      'Recording HTTP via JMeter proxy is quick',
    ],
    whenA:
      'Pick k6 when scripts must live in Git, when you have a JS/TS team, when you want CI gates with native thresholds, when your observability stack is Grafana/Prometheus, or when you need Kubernetes-native distributed runs.',
    whenB:
      'Pick JMeter when you need non-engineers (manual QAs, business analysts) to author tests via GUI, when you need exotic protocol support (FTP, JMS, JDBC, MQTT), when your existing infrastructure is JVM-based, or when an OSS-only stance forbids the AGPL portions of k6.',
    codeA: {
      lang: 'javascript',
      code: `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '2m',  target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}`,
    },
    codeB: {
      lang: 'xml',
      code: `<TestPlan testname="Products API">
  <ThreadGroup numThreads="50" rampTime="30">
    <HTTPSamplerProxy>
      <stringProp name="HTTPSampler.domain">api.example.com</stringProp>
      <stringProp name="HTTPSampler.path">/products</stringProp>
      <stringProp name="HTTPSampler.method">GET</stringProp>
    </HTTPSamplerProxy>
    <ResponseAssertion>
      <collectionProp name="Asserion.test_strings">
        <stringProp>200</stringProp>
      </collectionProp>
      <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
    </ResponseAssertion>
  </ThreadGroup>
</TestPlan>`,
    },
    faqs: [
      { q: 'Is k6 better than JMeter?', a: 'For code-first engineering teams in 2026 — yes. For mixed teams with non-engineers authoring tests via GUI, JMeter is still ahead. Both can drive 10K+ concurrent users on modest hardware.' },
      { q: 'Can JMeter scripts be migrated to k6?', a: 'Yes — Grafana Labs ships a k6-jmeter-converter CLI that handles HTTP plans. Custom Groovy / BeanShell logic must be rewritten in JS.' },
      { q: 'How does k6 compare on memory?', a: 'k6 uses ~80MB for 1000 VUs; JMeter uses ~512MB+ JVM heap for the same load. k6 wins on density per host.' },
      { q: 'Which integrates better with CI/CD?', a: 'k6. Native JUnit XML, GitHub Action, thresholds = exit code on SLO breach. JMeter needs the Jenkins Performance plugin or custom parsing.' },
      { q: 'Does Grafana Cloud k6 replace k6 Cloud?', a: 'Same product, rebranded. Grafana acquired k6 (Load Impact) in 2021. The cloud platform is now part of the Grafana Cloud stack.' },
    ],
    relatedBlogs: [
      'k6-vs-jmeter-performance-testing',
      'k6-vs-jmeter-2026-which-better',
      'jmeter-distributed-load-testing-complete-guide',
      'k6-cloud-grafana-cloud-complete-guide',
      'jmeter-vs-locust-vs-gatling-comparison',
    ],
    verdict:
      'For engineering teams committing to performance testing as code in 2026 — k6. For mixed teams with non-engineers contributing tests via GUI, or regulated environments locked to JVM — JMeter. Both are valid; the tradeoff is developer ergonomics vs ecosystem breadth.',
  },
  {
    slug: 'cypress-vs-selenium',
    title: 'Cypress vs Selenium 2026: Which Should You Choose?',
    description:
      'Cypress vs Selenium 2026: architecture, browser support, parallel execution, language coverage, AI agent integration, and migration paths.',
    category: 'E2E',
    a: {
      name: 'Cypress',
      tagline: 'Front-end developer-first E2E + component testing',
      creator: 'Cypress.io',
      license: 'MIT (core) + paid Cloud',
      firstRelease: '2017',
      language: 'JavaScript / TypeScript',
      skillSlug: 'cypress-e2e',
      installCmd: 'npx @qaskills/cli add cypress-e2e',
    },
    b: {
      name: 'Selenium',
      tagline: 'W3C WebDriver standard, longest-running browser automation',
      creator: 'OpenJS Foundation',
      license: 'Apache 2.0',
      firstRelease: '2004',
      language: 'Java / Python / C# / JavaScript / Ruby / Kotlin',
      skillSlug: 'selenium-advance-pom',
      installCmd: 'npx @qaskills/cli add selenium-advance-pom',
    },
    intro:
      'Cypress and Selenium represent opposite ends of the E2E spectrum. Selenium has been the industry default since 2004 — W3C standard, polyglot, enterprise-grade. Cypress arrived in 2017 with a dramatic UX overhaul: time-travel debugger, no Selenium dependency, single-binary install. Both have strong adoption in 2026; the right pick depends on team makeup and infrastructure investment.',
    matrix: [
      { feature: 'Languages', a: 'TS/JS only', b: 'Java/Python/C#/JS/Ruby/Kotlin' },
      { feature: 'Architecture', a: 'Runs inside browser (in-process)', b: 'External WebDriver protocol' },
      { feature: 'Time-travel debugger', a: 'Yes — built-in, live', b: 'No (Selenium IDE plays back)' },
      { feature: 'Parallel execution', a: 'Cypress Cloud (paid)', b: 'Selenium Grid 4 (free, self-host)' },
      { feature: 'Browser support', a: 'Chromium, Firefox, WebKit', b: 'Every browser with a WebDriver' },
      { feature: 'Multi-tab / origin', a: 'Limited (cy.origin)', b: 'Native via switchTo()' },
      { feature: 'Component testing', a: 'Yes — first-class', b: 'No (use Karma or RTL)' },
      { feature: 'iframe', a: 'Limited', b: 'Native switchTo().frame()' },
      { feature: 'CI cost', a: 'Cypress Cloud paid at scale', b: 'Free (Grid + self-host)' },
      { feature: 'Standardization', a: 'Proprietary', b: 'W3C WebDriver standard' },
      { feature: 'Mobile testing', a: 'No', b: 'Via Appium' },
      { feature: 'Maturity', a: '9 years', b: '22 years' },
    ],
    prosA: [
      'Time-travel debugger is unmatched in any other tool',
      'Single-binary install — no Selenium drivers/grid',
      'Documentation is the best in the industry',
      'cy.intercept() for network stubbing is delightful',
      'Component testing UX is polished',
      'Active community + plugin ecosystem',
      'TypeScript-first since v5',
      'Custom commands API is simple and powerful',
    ],
    prosB: [
      'W3C standard — works with any browser vendor',
      'Polyglot — Java, Python, C#, Ruby, JS, Kotlin',
      'Largest ecosystem (Appium, Sauce Labs, BrowserStack)',
      'Free distributed execution via Grid 4',
      'Mature for 22 years — battle-tested everywhere',
      'Better mobile coverage via Appium integration',
      'Supports legacy browsers (IE 11) for enterprise needs',
      'Larger talent pool — easier hiring',
    ],
    whenA:
      'Pick Cypress when developer experience is paramount, your team is JS/TS only, you want time-travel debugging out of the box, component testing is the priority, and you can accept paid Cypress Cloud for parallel runs.',
    whenB:
      'Pick Selenium when polyglot language support is required, when you need mobile testing via Appium in the same stack, when free distributed execution at scale matters, when you have existing Selenium infrastructure, or when standards-compliance (W3C) is mandatory.',
    faqs: [
      { q: 'Should I migrate from Selenium to Cypress?', a: 'Migrate if your team is JS/TS only and you want better DX. Stay on Selenium if you have polyglot teams, need Appium, or have existing Grid infrastructure that works.' },
      { q: 'Is Cypress slower or faster than Selenium?', a: 'Cypress is faster for individual test debugging (in-browser execution). Selenium scales better with Grid 4 parallel execution. For raw suite throughput, both can be comparable with proper parallel config.' },
      { q: 'Does Cypress support mobile testing?', a: 'No native mobile testing. Cypress runs in browser only. For mobile, use Selenium + Appium or Playwright + device emulation.' },
      { q: 'Which AI agent works better with each?', a: 'Both Claude Code and Cursor generate solid tests for either. Cypress generation is slightly cleaner due to consistent API surface; Selenium generation occasionally adds hard-coded waits.' },
    ],
    relatedBlogs: [
      'cypress-vs-playwright-2026',
      'selenium-vs-playwright-2026',
      'selenium-vs-cypress-vs-playwright-2026',
      'cypress-vs-selenium-vs-playwright-performance',
      'selenium-tutorial-complete-beginners-2026',
    ],
    verdict:
      'Cypress for JS-only teams prioritizing DX. Selenium for polyglot enterprise stacks. Both are excellent in 2026; neither is going away.',
  },
  {
    slug: 'jest-vs-vitest',
    title: 'Jest vs Vitest 2026: Which JavaScript Test Runner?',
    description:
      'Jest vs Vitest 2026: speed, ESM support, configuration, watch mode, transformers, Vite ecosystem fit, migration path.',
    category: 'Unit',
    a: {
      name: 'Jest',
      tagline: 'Meta-built JavaScript test runner — the incumbent',
      creator: 'Meta (Facebook)',
      license: 'MIT',
      firstRelease: '2014',
      language: 'JavaScript / TypeScript',
      skillSlug: 'jest-unit',
      installCmd: 'npx @qaskills/cli add jest-unit',
    },
    b: {
      name: 'Vitest',
      tagline: 'Vite-native unit test framework',
      creator: 'Vitest team / Vite community',
      license: 'MIT',
      firstRelease: '2021',
      language: 'JavaScript / TypeScript',
      skillSlug: 'vitest-patterns',
      installCmd: 'npx @qaskills/cli add vitest-patterns',
    },
    intro:
      'Jest dominated JavaScript unit testing for nearly a decade with snapshot tests, watch mode, and a batteries-included philosophy. Vitest arrived in 2021 as the Vite-native alternative — faster cold starts, native ESM support, and zero-config TypeScript. By 2026 Vitest has taken significant share from Jest in modern Vite-based projects, while Jest remains entrenched in React Native, Next.js (where it is the recommended runner), and large enterprise monorepos.',
    matrix: [
      { feature: 'Cold start (small project)', a: '~2-4s', b: '~0.5-1s' },
      { feature: 'ESM support', a: 'Experimental flag', b: 'Native' },
      { feature: 'TypeScript', a: 'Via ts-jest or babel-jest', b: 'Native via esbuild' },
      { feature: 'Watch mode', a: 'Excellent (--watch)', b: 'Excellent + Vite HMR' },
      { feature: 'Snapshot testing', a: 'Yes — original implementation', b: 'Yes — Jest-compatible' },
      { feature: 'Mocking', a: 'jest.mock() + babel plugin', b: 'vi.mock() + esbuild' },
      { feature: 'Coverage', a: 'istanbul / v8', b: 'istanbul / v8' },
      { feature: 'Browser mode', a: 'jsdom / happy-dom', b: 'jsdom / happy-dom / native browser' },
      { feature: 'In-source testing', a: 'No', b: 'Yes — `if (import.meta.vitest)`' },
      { feature: 'Vite plugin reuse', a: 'No', b: 'Yes — uses your vite.config.ts' },
      { feature: 'GitHub stars', a: '~44K', b: '~13K' },
    ],
    prosA: [
      'Mature — 10+ years of edge cases handled',
      'Default in Next.js, React Native, Expo',
      'Vast plugin ecosystem',
      'Snapshot testing was its invention',
      'Watch mode is excellent',
      'Documentation is comprehensive',
      'Industry-standard mock helpers',
      'Stable API across major versions',
    ],
    prosB: [
      '5-10x faster cold starts',
      'Native ESM — no babel/ts-jest tax',
      'Reuses Vite config (single source of truth)',
      'In-source tests possible',
      'Native TypeScript via esbuild',
      'Native browser mode via playwright',
      'Watch mode tied to Vite HMR — instant',
      'Active development + Vue/Nuxt/Solid first-class',
    ],
    whenA:
      'Pick Jest for React Native, Next.js (still default), Expo, or any large monorepo where stability and ecosystem maturity outweigh raw speed. Pick Jest when your team has 5+ years of Jest knowledge to lose by migrating.',
    whenB:
      'Pick Vitest when you build with Vite (Vue, Nuxt, Astro, SvelteKit, modern React), when ESM is mandatory, when you want zero-config TypeScript, when watch-mode speed matters, or when you start a green-field project in 2026.',
    codeA: {
      lang: 'typescript',
      code: `import { describe, it, expect, jest } from '@jest/globals';
import { formatPrice } from './price';

describe('formatPrice', () => {
  it('formats USD with two decimals', () => {
    expect(formatPrice(19.99, 'USD')).toBe('$19.99');
  });

  it('calls logger when invalid', () => {
    const log = jest.fn();
    formatPrice(NaN, 'USD', log);
    expect(log).toHaveBeenCalledWith('invalid amount');
  });
});`,
    },
    codeB: {
      lang: 'typescript',
      code: `import { describe, it, expect, vi } from 'vitest';
import { formatPrice } from './price';

describe('formatPrice', () => {
  it('formats USD with two decimals', () => {
    expect(formatPrice(19.99, 'USD')).toBe('$19.99');
  });

  it('calls logger when invalid', () => {
    const log = vi.fn();
    formatPrice(NaN, 'USD', log);
    expect(log).toHaveBeenCalledWith('invalid amount');
  });
});`,
    },
    faqs: [
      { q: 'Should I migrate from Jest to Vitest?', a: 'Migrate if you build with Vite, want faster watch mode, or fight ESM issues in Jest. Stay on Jest if you use Next.js or React Native — both still default to Jest.' },
      { q: 'How compatible are Vitest and Jest APIs?', a: '95%+ compatible. vi.mock = jest.mock, expect() is identical, describe/it/beforeEach all match. Snapshot files are interchangeable.' },
      { q: 'Is Vitest stable for production?', a: 'Yes — Vitest 1.0 shipped in 2023 and is used by Vue Storefront, Nuxt, Astro, Element Plus, and thousands of OSS projects.' },
      { q: 'Does Vitest support React?', a: 'Yes — via @testing-library/react. Works seamlessly with Vite-based React projects.' },
      { q: 'Which is faster?', a: 'Vitest by 5-10x on cold start due to esbuild + native ESM. Hot reload nearly identical thanks to Vite HMR.' },
    ],
    relatedBlogs: ['jest-vs-vitest-2026', 'jest-to-vitest-migration-guide'],
    verdict:
      'Vitest for new Vite-based projects in 2026. Jest stays default for Next.js + React Native — for now. Both are excellent; the migration is straightforward when you decide to move.',
  },
  {
    slug: 'pytest-vs-unittest',
    title: 'pytest vs unittest 2026: Python Testing Showdown',
    description:
      'pytest vs unittest Python testing comparison: fixtures, parametrize, plugins, assertion syntax, and which to pick in 2026.',
    category: 'Unit',
    a: {
      name: 'pytest',
      tagline: 'Python testing framework with fixtures + plugins',
      creator: 'pytest-dev team',
      license: 'MIT',
      firstRelease: '2004',
      language: 'Python',
      skillSlug: 'pytest-patterns',
      installCmd: 'npx @qaskills/cli add pytest-patterns',
    },
    b: {
      name: 'unittest',
      tagline: 'Python stdlib testing — based on Java JUnit',
      creator: 'Python core team',
      license: 'PSF (Python stdlib)',
      firstRelease: '2001',
      language: 'Python',
    },
    intro:
      "pytest and unittest are the two dominant Python testing frameworks in 2026. unittest ships with the Python standard library — no install, JUnit-style xUnit API, methods prefixed `test_`. pytest is the third-party powerhouse — fixtures, parametrize, marks, 1000+ plugins, and far better failure output. The Python community has heavily standardized on pytest in 2026, but unittest remains valid in environments where dependencies must be minimized.",
    matrix: [
      { feature: 'Install', a: 'pip install pytest', b: 'stdlib — no install' },
      { feature: 'Assertion syntax', a: 'Plain `assert` with rich introspection', b: 'self.assertEqual / assertRaises / etc.' },
      { feature: 'Test discovery', a: 'Files `test_*.py`, functions `test_*`', b: 'TestCase subclasses + `test*` methods' },
      { feature: 'Fixtures', a: 'Native (@pytest.fixture, scopes)', b: 'setUp / tearDown / setUpClass' },
      { feature: 'Parametrize', a: '@pytest.mark.parametrize', b: 'subTest contexts or external libs' },
      { feature: 'Plugins', a: '1000+ on PyPI', b: 'Stdlib only' },
      { feature: 'Failure output', a: 'Rich diff with values shown', b: 'Stack trace + assert message' },
      { feature: 'Marks / tags', a: 'Yes — @pytest.mark.slow etc.', b: '@unittest.skipIf only' },
      { feature: 'Async test support', a: 'Via pytest-asyncio or anyio', b: 'IsolatedAsyncioTestCase (3.8+)' },
      { feature: 'CI integration', a: 'JUnit XML, GitHub annotations, etc.', b: 'JUnit XML via unittest-xml-reporting' },
      { feature: 'Used in modern OSS', a: 'Nearly all (FastAPI, Django, etc.)', b: 'Stdlib code + legacy Django' },
    ],
    prosA: [
      'Plain `assert` — Python idiomatic, no boilerplate',
      'Fixtures are first-class — composable + scoped',
      '@parametrize keeps data-driven tests DRY',
      '1000+ plugins (pytest-cov, pytest-mock, pytest-xdist, hypothesis, etc.)',
      'Failure output shows actual vs expected values inline',
      'Marks for selective test runs (slow, smoke, integration)',
      'Better for TDD — fast feedback + clear failures',
      'Compatible with unittest test classes (incremental migration)',
    ],
    prosB: [
      'Zero install — Python stdlib',
      'Stable API since Python 2.1',
      'Cross-language familiarity (xUnit family)',
      'Suitable for stdlib testing where deps forbidden',
      'IDE integration works everywhere',
      'IsolatedAsyncioTestCase ships in Python 3.8+',
      'Mock library shipped in stdlib (unittest.mock)',
      'Test discovery is simple and predictable',
    ],
    whenA:
      'Pick pytest for any Python project in 2026 that allows third-party dependencies. Especially for FastAPI, Django (modern), Flask, data science (pytest + hypothesis), and any greenfield project. Pick pytest when you want fixtures, parametrize, and rich failure output.',
    whenB:
      'Pick unittest when dependencies must be zero (CPython core test suite, security-restricted environments), when you maintain very old codebases that already use it heavily, or when you need maximum portability across Python versions.',
    codeA: {
      lang: 'python',
      code: `import pytest
from app import calculate_tax

@pytest.fixture
def order():
    return {"total": 100, "country": "US"}

@pytest.mark.parametrize("country,expected", [
    ("US", 8.0),
    ("UK", 20.0),
    ("DE", 19.0),
])
def test_tax_per_country(order, country, expected):
    order["country"] = country
    assert calculate_tax(order) == expected`,
    },
    codeB: {
      lang: 'python',
      code: `import unittest
from app import calculate_tax

class TaxTest(unittest.TestCase):
    def setUp(self):
        self.order = {"total": 100, "country": "US"}

    def test_us_tax(self):
        self.order["country"] = "US"
        self.assertEqual(calculate_tax(self.order), 8.0)

    def test_uk_tax(self):
        self.order["country"] = "UK"
        self.assertEqual(calculate_tax(self.order), 20.0)

    def test_de_tax(self):
        self.order["country"] = "DE"
        self.assertEqual(calculate_tax(self.order), 19.0)

if __name__ == "__main__":
    unittest.main()`,
    },
    faqs: [
      { q: 'Is pytest better than unittest?', a: 'For 95%+ of Python projects in 2026 — yes. Fixtures, parametrize, plugins, and richer failure output make it the de facto choice. unittest is fine for stdlib-only contexts.' },
      { q: 'Can pytest run unittest tests?', a: 'Yes — pytest discovers and runs unittest TestCase classes natively. You can migrate incrementally.' },
      { q: 'What about Python vs pytest?', a: 'Different things. Python is the language, pytest is a third-party test framework. unittest is the stdlib testing module that ships with Python.' },
      { q: 'Which has better IDE support?', a: 'Both excellent. PyCharm + VS Code + Cursor recognize both. pytest gets slightly richer support due to fixture autocomplete.' },
      { q: 'Async testing — pytest or unittest?', a: 'Both work. pytest-asyncio is more flexible; unittest.IsolatedAsyncioTestCase is built-in.' },
    ],
    relatedBlogs: [
      'pytest-testing-complete-guide',
      'python-unittest-vs-pytest',
      'unittest-vs-pytest-2026',
      'python-vs-pytest-explained',
    ],
    verdict:
      'pytest for any Python project that can install dependencies. unittest only when stdlib-only is mandatory. Migration from unittest to pytest is incremental — pytest runs both.',
  },
  {
    slug: 'claude-code-vs-cursor',
    title: 'Claude Code vs Cursor 2026: Which AI Coding Agent?',
    description:
      'Claude Code vs Cursor in 2026: CLI vs IDE, model access, skill system, MCP support, pricing, agentic workflows for QA testing.',
    category: 'AI Agent',
    a: {
      name: 'Claude Code',
      tagline: "Anthropic's official CLI agent with skills + MCP",
      creator: 'Anthropic',
      license: 'Proprietary (with free + paid plans)',
      firstRelease: '2025',
      language: 'CLI (any language target)',
      installCmd: 'npm install -g @anthropic-ai/claude-code',
    },
    b: {
      name: 'Cursor',
      tagline: 'VS Code-based AI IDE with multi-model support',
      creator: 'Anysphere',
      license: 'Proprietary (free + paid)',
      firstRelease: '2023',
      language: 'IDE (any language target)',
      installCmd: 'Download from cursor.sh',
    },
    intro:
      'Claude Code and Cursor are the two most popular AI coding agents for testing in 2026. Cursor is the leading AI IDE — VS Code-forked with chat, autocomplete, and agent modes built into the editor. Claude Code is Anthropic\'s answer — a CLI agent that lives in your terminal, talks to Claude models directly, and now supports skills and MCP servers. For QA testing both can generate Playwright, Cypress, Selenium, pytest, JUnit tests on demand. The choice comes down to workflow — IDE-first or CLI-first — and whether you want a single model (Claude) or multi-model (Cursor).',
    matrix: [
      { feature: 'Form factor', a: 'CLI in terminal', b: 'Forked VS Code IDE' },
      { feature: 'Models', a: 'Claude (Opus / Sonnet)', b: 'Claude / GPT / Gemini / Grok / Local' },
      { feature: 'Skills / rules', a: '~/.claude/skills/<slug>/SKILL.md', b: '.cursor/rules/<slug>.mdc' },
      { feature: 'MCP support', a: 'Native', b: 'Via /mcp config' },
      { feature: 'Agent mode', a: 'Full CLI agent', b: 'Composer / Agent mode' },
      { feature: 'Chat history', a: 'Per-project sessions', b: 'Per-project chats' },
      { feature: 'Pricing (Pro)', a: '$20/mo + API usage', b: '$20/mo flat (most features)' },
      { feature: 'IDE integration', a: 'Any (works alongside VS Code/JetBrains/Cursor)', b: 'Built-in IDE' },
      { feature: 'Test gen quality', a: 'Strong for Playwright/pytest', b: 'Strong across all frameworks' },
      { feature: 'Open source', a: 'No (CLI binary)', b: 'Mostly proprietary' },
      { feature: 'QASkills.sh skills', a: 'Direct install via npx qaskills add', b: 'Direct install via npx qaskills add' },
    ],
    prosA: [
      'Lives in terminal — works with any IDE',
      'Skills system is well-defined (SKILL.md format)',
      'MCP support is mature',
      'Single-model focus = predictable behavior',
      'Claude Opus excels at long-context reasoning',
      'Open ecosystem (qaskills.sh, anthropic-skills marketplace)',
      "Anthropic's safety + alignment work translates to fewer broken edits",
      'Great for headless / CI agent automation',
    ],
    prosB: [
      'Familiar VS Code UX',
      'Multi-model = right model for the job',
      'Composer for multi-file edits',
      'Free tier is generous',
      'Tab autocomplete is best-in-class',
      'Chat side-panel always visible',
      'Local model support (Ollama, LM Studio)',
      'Extension marketplace inherited from VS Code',
    ],
    whenA:
      'Pick Claude Code when you live in terminal, want a CLI-first agent, prefer Claude over multi-model, want a clear skill format, run headless agents in CI, or want the deepest QA skill ecosystem (qaskills.sh skills are most polished here).',
    whenB:
      'Pick Cursor when IDE-first workflow matters, when you want multi-model flexibility, when teammates use VS Code already, when Composer multi-file edits are core to your flow, or when tab autocomplete is the primary use case.',
    faqs: [
      { q: 'Can I use both Claude Code and Cursor?', a: 'Yes — many engineers use Cursor as their primary IDE and Claude Code for CLI-driven agent work (long refactors, CI runs, headless workflows). They complement rather than compete.' },
      { q: 'Which writes better tests?', a: 'Both excellent. Claude Code (Opus model) edges ahead on multi-file test refactors. Cursor (with Sonnet) is faster for single-file unit/component tests.' },
      { q: 'Does Cursor support QASkills.sh skills?', a: 'Yes — `npx @qaskills/cli add <skill>` writes to `.cursor/rules/<skill>.mdc` automatically.' },
      { q: 'Is Claude Code free?', a: 'Free tier exists; Pro is $20/mo with higher rate limits + Opus access. API usage is metered separately when running long agent sessions.' },
      { q: 'Which has better MCP support?', a: 'Claude Code has more polished MCP. Cursor added it later but is improving rapidly.' },
    ],
    relatedBlogs: [
      'best-claude-code-skills-for-testing-2026',
      'qa-skills-for-cursor-2026',
      'claude-for-qa-engineers-complete-guide',
      'cursor-for-qa-engineers-complete-guide',
      'claude-code-qa-testing-workflows-2026',
    ],
    verdict:
      'For QA testers in 2026 — use both. Cursor as primary IDE, Claude Code for CLI agent runs. Both integrate seamlessly with QASkills.sh skills.',
  },
  {
    slug: 'promptfoo-vs-openai-evals',
    title: 'Promptfoo vs OpenAI Evals 2026: LLM Testing Comparison',
    description:
      'Promptfoo vs OpenAI Evals 2026: open-source vs closed, red teaming, RAG evaluation, CI integration, providers supported.',
    category: 'LLM Evals',
    a: {
      name: 'Promptfoo',
      tagline: 'Open-source LLM eval + red teaming framework',
      creator: 'Promptfoo team',
      license: 'MIT',
      firstRelease: '2023',
      language: 'YAML + JS/TS',
      skillSlug: 'promptfoo-llm-evals',
      installCmd: 'npx @qaskills/cli add promptfoo-llm-evals',
    },
    b: {
      name: 'OpenAI Evals',
      tagline: "OpenAI's official eval framework",
      creator: 'OpenAI',
      license: 'MIT (framework) — closed for OpenAI API',
      firstRelease: '2023',
      language: 'YAML + Python',
    },
    intro:
      'Promptfoo and OpenAI Evals are the two most popular LLM evaluation frameworks in 2026. OpenAI Evals is the official eval framework — Python-first, tightly integrated with OpenAI models, supports model-graded evals. Promptfoo is the open-source alternative — works with any provider (OpenAI, Anthropic, Mistral, local Ollama), strong red-teaming support, CLI-first workflow that fits CI naturally. For QA teams evaluating LLM-powered applications, Promptfoo typically wins on flexibility while OpenAI Evals wins on first-party integration with OpenAI models.',
    matrix: [
      { feature: 'Providers supported', a: 'OpenAI, Anthropic, Mistral, Ollama, Azure, Bedrock, 30+', b: 'OpenAI + custom completion fn' },
      { feature: 'Red teaming', a: 'Native — promptfoo redteam', b: 'No' },
      { feature: 'RAG evaluation', a: 'Yes (via plugins + Ragas integration)', b: 'Via custom evals' },
      { feature: 'Config format', a: 'YAML + JS/TS hooks', b: 'YAML + Python' },
      { feature: 'CLI', a: 'npx promptfoo eval', b: 'oaievalset / oaieval' },
      { feature: 'Web UI', a: 'Yes — promptfoo view', b: 'Streamlit dashboard' },
      { feature: 'CI integration', a: 'Native — exit codes + JUnit XML', b: 'Via custom Python wrappers' },
      { feature: 'Model-graded evals', a: 'Yes', b: 'Yes — flagship feature' },
      { feature: 'Cost tracking', a: 'Native — per-test + total', b: 'Via API logs' },
      { feature: 'Snapshot testing', a: 'Yes', b: 'No' },
    ],
    prosA: [
      'Provider-agnostic (multi-model evals)',
      'Red teaming for LLM safety/security',
      'CI-friendly exit codes + JUnit XML',
      'Web UI bundled — no Streamlit needed',
      'YAML configs version-control friendly',
      'Active maintenance, MIT license',
      'Ragas integration for RAG metrics',
      'Cost tracking built-in',
    ],
    prosB: [
      'First-party — best OpenAI integration',
      'Python ecosystem (Pandas, Streamlit)',
      'Model-graded evals are the flagship feature',
      'Used internally by OpenAI for GPT eval research',
      'Strong academic citation footprint',
      'Reproducible eval sets format',
      'Integrates with OpenAI Evals leaderboard',
      'Custom completion functions for non-OpenAI providers',
    ],
    whenA:
      'Pick Promptfoo for multi-provider evals (you use OpenAI + Anthropic + local), for red-teaming an LLM application, when CI integration must be first-class, when YAML configs fit your workflow, or when you want a single tool for evals + red teaming + RAG.',
    whenB:
      'Pick OpenAI Evals when you exclusively use OpenAI models, when you need model-graded evals as the flagship feature, when Python + Streamlit is your stack, or when you want to contribute back to the public OpenAI Evals leaderboard.',
    faqs: [
      { q: 'Should I use Promptfoo or OpenAI Evals?', a: 'Promptfoo for multi-provider / multi-model evals, especially with red teaming + CI. OpenAI Evals if you are 100% on OpenAI and want first-party tooling.' },
      { q: 'Can I use both?', a: 'Yes — Promptfoo for daily CI evals, OpenAI Evals for deeper Python-based research evals. They are not mutually exclusive.' },
      { q: 'Does Promptfoo work with Claude?', a: 'Yes — Anthropic is a first-class provider in Promptfoo configs.' },
      { q: 'How do they handle RAG evaluation?', a: 'Promptfoo integrates with Ragas for context precision/recall/faithfulness. OpenAI Evals supports custom evals you can wire to Ragas manually.' },
      { q: 'Cost tracking?', a: 'Promptfoo tracks per-test + total cost natively. OpenAI Evals requires you to parse API logs.' },
    ],
    relatedBlogs: [
      'promptfoo-complete-guide-2026',
      'openai-evals-complete-guide-2026',
      'promptfoo-vs-openai-evals-comparison-2026',
      'promptfoo-red-teaming-llm-applications',
      'llm-evals-comparison-openai-promptfoo-ragas',
      'ragas-rag-evaluation-metrics-complete-guide',
    ],
    verdict:
      'Promptfoo for production LLM apps with multi-provider and red-teaming needs. OpenAI Evals for OpenAI-only research workloads. Most teams in 2026 default to Promptfoo for daily evals.',
  },
  {
    slug: 'restassured-vs-karate',
    title: 'REST Assured vs Karate 2026: API Testing Comparison',
    description:
      'REST Assured vs Karate 2026: BDD syntax, Gherkin scenarios, performance, contract testing, parallel execution, and which to pick for Java API tests.',
    category: 'API',
    a: {
      name: 'REST Assured',
      tagline: 'Java DSL for REST API testing',
      creator: 'Johan Haleby (community)',
      license: 'Apache 2.0',
      firstRelease: '2010',
      language: 'Java / Kotlin',
      skillSlug: 'rest-assured-api',
      installCmd: 'npx @qaskills/cli add rest-assured-api',
    },
    b: {
      name: 'Karate',
      tagline: 'Gherkin-based DSL for REST API + UI + perf testing',
      creator: 'Peter Thomas / Karate Labs',
      license: 'Apache 2.0',
      firstRelease: '2017',
      language: 'Gherkin + Java/JS',
      skillSlug: 'karate-bdd-api',
      installCmd: 'npx @qaskills/cli add karate-bdd-api',
    },
    intro:
      'REST Assured and Karate are the two most popular Java-based API testing frameworks in 2026. REST Assured is the established Java DSL — fluent assertions, JUnit/TestNG integration, used in millions of Java test suites since 2010. Karate is the Gherkin-based newcomer that bundles HTTP + assertions + mocking + parallel + perf into a single tool. Both excellent; choice depends on whether you want Java code-first (REST Assured) or BDD-style readable scenarios (Karate).',
    matrix: [
      { feature: 'Language', a: 'Java / Kotlin DSL', b: 'Gherkin + optional JS' },
      { feature: 'Step definitions', a: 'No — fluent Java DSL', b: 'No — Gherkin reads directly' },
      { feature: 'Assertions', a: 'Hamcrest matchers', b: 'JsonPath + match operators' },
      { feature: 'Parallel execution', a: 'JUnit/TestNG parallel', b: 'Native via @parallel' },
      { feature: 'Mocking server', a: 'Use WireMock separately', b: 'Built-in karate-netty mock server' },
      { feature: 'Performance testing', a: 'No', b: 'karate-gatling integration' },
      { feature: 'UI testing', a: 'No', b: 'karate-robot for desktop + browser' },
      { feature: 'Schema validation', a: 'JSON Schema via library', b: 'Built-in `schema` keyword' },
      { feature: 'Auth (OAuth, JWT)', a: 'Via interceptor or filter', b: 'Built-in feature steps' },
      { feature: 'Reports', a: 'JUnit / TestNG / Allure', b: 'Karate HTML + Cucumber JSON + Allure' },
      { feature: 'Learning curve for Java devs', a: 'Hours', b: 'Days (Gherkin paradigm shift)' },
      { feature: 'Learning curve for non-devs', a: 'Difficult (Java required)', b: 'Easier (Gherkin is plain English)' },
    ],
    prosA: [
      'Pure Java — no Gherkin paradigm shift',
      'Fluent DSL reads naturally for Java devs',
      'JUnit 5 + TestNG integration is mature',
      'Compose with Spring Boot test slices',
      'Hamcrest matchers are familiar',
      'IDE refactoring works perfectly',
      'Logback / SLF4J native logging',
      'Compatible with existing Java mocking (Mockito)',
    ],
    prosB: [
      'BDD-style scenarios readable by PMs',
      'Single tool: HTTP + mocking + perf + UI',
      'Parallel execution built-in',
      'karate-netty mock server in same suite',
      'karate-gatling for load testing same scenarios',
      'No step definitions needed',
      'JsonPath + match operators concise',
      'Schema validation native',
    ],
    whenA:
      'Pick REST Assured when team is Java-first and prefers code-based tests, when Spring Boot + JUnit 5 + Maven is your stack, when you already invested in Mockito + WireMock + Hamcrest, or when refactoring + IDE integration is critical.',
    whenB:
      'Pick Karate when team includes non-engineers who write scenarios, when you want a single tool for API + mocking + perf + UI, when parallel execution must be free, or when Gherkin readability is required by stakeholders.',
    faqs: [
      { q: 'Is Karate faster than REST Assured?', a: 'For raw API call execution — similar. For full suite with parallel + mocking + perf, Karate is faster because the tools are integrated.' },
      { q: 'Can I use both?', a: 'Yes — many teams use REST Assured for unit-level service tests and Karate for end-to-end API scenarios run by non-engineers.' },
      { q: 'Does Karate replace WireMock?', a: 'For most cases — yes. karate-netty mock server handles request matching + responses. WireMock has more advanced features (request templating, fault injection) for edge cases.' },
      { q: 'Which integrates better with Spring Boot?', a: 'REST Assured — first-class via @SpringBootTest. Karate works but needs a running app under test.' },
      { q: 'Schema validation?', a: 'Karate has built-in `schema` keyword. REST Assured needs a separate JSON Schema library.' },
    ],
    relatedBlogs: [
      'rest-assured-vs-karate-detailed-comparison-2026',
      'karate-dsl-bdd-api-testing-complete-guide',
      'rest-assured-java-api-testing',
      'restassured-vs-karate-api-testing',
    ],
    verdict:
      'REST Assured for code-first Java teams. Karate for mixed teams + integrated tooling. Both are excellent Java API test frameworks in 2026.',
  },
  {
    slug: 'applitools-vs-percy',
    title: 'Applitools vs Percy 2026: Visual Testing Comparison',
    description:
      'Applitools vs Percy in 2026: AI-powered visual comparison, browser coverage, snapshot management, pricing, and Playwright/Cypress integration.',
    category: 'Visual',
    a: {
      name: 'Applitools',
      tagline: 'AI-powered visual testing with Eyes',
      creator: 'Applitools',
      license: 'Proprietary (free + paid)',
      firstRelease: '2013',
      language: 'Polyglot SDK (JS/TS/Java/Python/.NET)',
    },
    b: {
      name: 'Percy',
      tagline: "BrowserStack's visual regression testing service",
      creator: 'BrowserStack (acquired Percy)',
      license: 'Proprietary (free + paid)',
      firstRelease: '2015',
      language: 'Polyglot SDK',
    },
    intro:
      'Applitools and Percy are the two leading commercial visual testing services in 2026. Applitools pioneered AI-powered visual diffs — its Eyes algorithm understands page structure rather than just comparing pixels, drastically reducing false positives from anti-aliasing, fonts, and dynamic content. Percy (acquired by BrowserStack) uses pixel-perfect comparison with smart cropping and is tightly integrated with the BrowserStack cross-browser cloud. Both work with Playwright, Cypress, Selenium, WebDriverIO, and Storybook.',
    matrix: [
      { feature: 'Diff algorithm', a: 'AI visual AI (Ultrafast Grid)', b: 'Pixel comparison + smart crop' },
      { feature: 'False positive rate', a: 'Very low (AI understands layout)', b: 'Low (with right config)' },
      { feature: 'Browser coverage', a: 'Ultrafast Grid (parallel browsers)', b: 'BrowserStack browsers' },
      { feature: 'Playwright integration', a: 'Yes — official SDK', b: 'Yes — @percy/playwright' },
      { feature: 'Cypress integration', a: 'Yes — official SDK', b: 'Yes — @percy/cypress' },
      { feature: 'Storybook integration', a: 'Yes', b: 'Yes' },
      { feature: 'Component-level snapshots', a: 'Yes', b: 'Yes' },
      { feature: 'Pricing model', a: 'Per-snapshot + features', b: 'Per-snapshot + parallelism' },
      { feature: 'Free tier', a: 'Yes — limited snapshots', b: 'Yes — 5K snapshots/month' },
      { feature: 'Approval workflow', a: 'Built-in dashboard', b: 'Built-in dashboard' },
      { feature: 'GitHub integration', a: 'PR checks + comments', b: 'PR checks + comments' },
    ],
    prosA: [
      'AI-powered diffs reduce false positives dramatically',
      'Ultrafast Grid = test on 10+ browsers in parallel',
      'Polyglot SDK (Java/Python/.NET in addition to JS)',
      'Self-healing for dynamic content',
      'Strong enterprise features (RBAC, audit logs)',
      'Layout regions, ignore regions, dynamic masking',
      'Strong Salesforce + SAP integrations',
      'Free tier supports learning',
    ],
    prosB: [
      'Tight BrowserStack integration (same login, same dashboard)',
      'Pricing is more predictable',
      'Pixel comparison is deterministic',
      'Smart cropping handles dynamic widgets',
      '5K free snapshots/month',
      'Simpler config — fewer knobs to turn',
      'Strong Storybook focus',
      'Faster onboarding for small teams',
    ],
    whenA:
      'Pick Applitools when false-positive noise is the bottleneck (dynamic content, animations, A/B variants), when you need polyglot SDKs (Java/Python/.NET), when enterprise features matter (RBAC, audit), or when you need parallel browser coverage via Ultrafast Grid.',
    whenB:
      'Pick Percy when you already use BrowserStack, when budget predictability matters, when pixel-perfect comparison is acceptable, when 5K snapshots/month free tier covers your needs, or when team is small + Storybook-heavy.',
    faqs: [
      { q: 'Which has lower false positives?', a: 'Applitools — its AI visual diff algorithm understands page structure. Percy needs careful ignore-region config for similar results.' },
      { q: 'Pricing?', a: 'Both per-snapshot. Applitools tends higher at enterprise tier; Percy is simpler. Get quotes from both for your snapshot volume.' },
      { q: 'Free tier?', a: 'Applitools has a small free tier. Percy gives 5K snapshots/month free.' },
      { q: 'Best with Playwright?', a: 'Both excellent. Applitools has Ultrafast Grid for multi-browser; Percy ties into BrowserStack cloud.' },
      { q: 'Self-healing?', a: 'Applitools has more mature self-healing. Percy works fine if your tests are stable.' },
    ],
    relatedBlogs: [
      'applitools-visual-ai-testing-complete-guide',
      'percy-visual-testing-complete-guide',
      'chromatic-storybook-visual-testing-guide',
      'visual-regression-testing-guide',
    ],
    verdict:
      'Applitools for enterprise scale + lowest false positives. Percy for BrowserStack-integrated teams + predictable budgets.',
  },
  {
    slug: 'github-actions-vs-jenkins',
    title: 'GitHub Actions vs Jenkins 2026: CI/CD for Testing',
    description:
      'GitHub Actions vs Jenkins 2026: hosted vs self-hosted, ecosystem, pricing, security, test orchestration, and which to pick.',
    category: 'CI/CD',
    a: {
      name: 'GitHub Actions',
      tagline: 'Hosted CI/CD inside GitHub',
      creator: 'GitHub / Microsoft',
      license: 'Free + paid',
      firstRelease: '2019',
      language: 'YAML workflows',
    },
    b: {
      name: 'Jenkins',
      tagline: 'Self-hosted automation server, 15+ years old',
      creator: 'Jenkins community',
      license: 'MIT',
      firstRelease: '2011 (Hudson 2005)',
      language: 'Groovy DSL + Jenkinsfile',
    },
    intro:
      'GitHub Actions and Jenkins are the two most-used CI/CD systems for QA test orchestration in 2026. GitHub Actions is hosted, tightly integrated with GitHub repos, and dominates new project starts. Jenkins is self-hosted, plugin-rich, and still entrenched in enterprises with regulatory or data-residency requirements. Both can drive Playwright, Selenium, Cypress, k6 — but the dev-experience gap is huge.',
    matrix: [
      { feature: 'Hosting', a: 'Cloud (or self-hosted runners)', b: 'Self-hosted only' },
      { feature: 'Config format', a: 'YAML (.github/workflows)', b: 'Groovy Jenkinsfile or freestyle UI' },
      { feature: 'Marketplace', a: 'GitHub Actions Marketplace (10K+)', b: 'Jenkins plugins (1800+)' },
      { feature: 'Matrix builds', a: 'Native', b: 'Via plugin' },
      { feature: 'Secrets management', a: 'Native (org + repo)', b: 'Credentials plugin' },
      { feature: 'Container support', a: 'Native (`container:` key)', b: 'Via Docker plugin or pipelines' },
      { feature: 'Cost (small teams)', a: 'Free up to 2K mins/month', b: 'Free (you pay infra)' },
      { feature: 'Cost (large suites)', a: 'Self-hosted runners or paid mins', b: 'Hardware cost only' },
      { feature: 'Security model', a: 'OIDC + per-repo tokens', b: 'Role-based via plugins' },
      { feature: 'Observability', a: 'Built-in logs + GitHub UI', b: 'Plugin-based (Blue Ocean, Grafana)' },
      { feature: 'Setup time', a: '5 minutes', b: 'Hours to days' },
    ],
    prosA: [
      'Zero infrastructure to manage',
      'YAML configs version-controlled in repo',
      '10K+ marketplace actions',
      'Tight GitHub integration (PR checks, comments)',
      'Free tier covers most small teams',
      'OIDC for cloud cred federation',
      'Matrix builds + reusable workflows',
      'Self-hosted runners for cost control',
    ],
    prosB: [
      '15+ year ecosystem of plugins (1800+)',
      'On-prem or air-gapped support',
      'Total control over runner hardware + network',
      'Free OSS license — only pay infra',
      'Mature for regulated industries (banking, healthcare)',
      'Pipeline as code (Jenkinsfile)',
      'Blue Ocean UI for visual pipeline',
      'Used in millions of enterprise CI systems',
    ],
    whenA:
      'Pick GitHub Actions for any new project hosted on GitHub, for fast iteration, when zero infra is desirable, when team is small-to-medium, when free tier covers you, or when self-hosted runners give you cost control without ops burden.',
    whenB:
      "Pick Jenkins when you have regulatory data residency (must run on-prem), when GitHub Actions cost exceeds infra cost at scale, when 15+ years of plugins cover edge protocols, or when you've already invested in Jenkins infrastructure.",
    faqs: [
      { q: 'Is GitHub Actions replacing Jenkins?', a: 'In new GitHub-hosted projects — yes. In enterprises with regulatory needs or massive existing Jenkins infra — Jenkins stays.' },
      { q: 'Can I run Playwright on GitHub Actions?', a: 'Yes — use the mcr.microsoft.com/playwright Docker image or playwright-action. Free tier handles small suites.' },
      { q: 'Jenkins pipeline syntax?', a: 'Jenkinsfile uses Groovy DSL — `pipeline { agent any; stages { stage("Test") { steps { sh "npm test" } } } }`.' },
      { q: 'Migrating from Jenkins to GitHub Actions?', a: 'GitHub provides a migration tool that converts Jenkinsfiles to workflows. Manual review needed for plugin-heavy setups.' },
      { q: 'Cost at scale?', a: 'GitHub Actions free tier covers small teams. Large enterprises usually self-host runners; cost approaches Jenkins infra cost.' },
    ],
    relatedBlogs: [
      'github-actions-testing-ci-cd-guide',
      'cicd-testing-pipeline-github-actions',
      'playwright-ci-github-actions-complete-guide-2026',
      'selenium-jenkins-pipeline-complete-guide',
    ],
    verdict:
      'GitHub Actions for new projects + GitHub-hosted code. Jenkins for regulated enterprises with on-prem requirements. Both can drive any test framework.',
  },
  {
    slug: 'testcontainers-vs-docker-compose',
    title: 'Testcontainers vs Docker Compose 2026: Integration Testing',
    description:
      'Testcontainers vs Docker Compose for integration testing in 2026: programmatic control, test isolation, parallel execution, CI fit.',
    category: 'API',
    a: {
      name: 'Testcontainers',
      tagline: 'Programmatic Docker containers from test code',
      creator: 'Testcontainers community',
      license: 'MIT',
      firstRelease: '2015',
      language: 'Java / Node / Go / Python / .NET / Rust',
      skillSlug: 'testcontainers-postgres',
      installCmd: 'npx @qaskills/cli add testcontainers-postgres',
    },
    b: {
      name: 'Docker Compose',
      tagline: 'Multi-container Docker apps via YAML',
      creator: 'Docker Inc.',
      license: 'Apache 2.0',
      firstRelease: '2014',
      language: 'YAML',
    },
    intro:
      'Testcontainers and Docker Compose are the two most common ways to spin up Postgres, Kafka, Redis, MongoDB, Elasticsearch, and other dependencies for integration tests in 2026. Docker Compose declares services in YAML and starts them as a stack; tests then point at known hostnames. Testcontainers programmatically starts containers from inside the test process — each test gets its own container with a random port. Both work; the choice is about isolation, parallelism, and cleanup.',
    matrix: [
      { feature: 'Control', a: 'Programmatic (from test code)', b: 'Declarative (YAML)' },
      { feature: 'Isolation', a: 'Per-test or per-class container', b: 'Shared across all tests' },
      { feature: 'Cleanup', a: 'Automatic via Ryuk + JVM shutdown hook', b: 'Manual via `docker-compose down`' },
      { feature: 'Random ports', a: 'Yes — no port conflicts', b: 'No — fixed ports in YAML' },
      { feature: 'Parallel test execution', a: 'Yes — each test gets fresh container', b: 'Shared state — needs careful design' },
      { feature: 'Language coverage', a: 'Java/Node/Go/Python/.NET/Rust', b: 'Any (YAML is language-agnostic)' },
      { feature: 'CI integration', a: 'Just needs Docker daemon', b: 'Just needs Docker daemon' },
      { feature: 'Configuration depth', a: 'Modules for Postgres, Kafka, etc.', b: 'Raw Docker image config' },
      { feature: 'Setup overhead per test', a: '1-5s per container', b: '0 (already running)' },
      { feature: 'Best for', a: 'Integration tests in any language', b: 'Local dev + shared CI services' },
    ],
    prosA: [
      'Per-test isolation — no shared state bugs',
      'Random ports — no conflicts in parallel runs',
      'Modules for Postgres, Kafka, Redis, MySQL, Mongo, Elasticsearch, etc.',
      'Lifecycle managed from test code (start/stop)',
      'Ryuk auto-cleans containers on JVM exit',
      'Polyglot — Java/Node/Go/Python/.NET/Rust',
      'Better for parallel test execution',
      'Works in any CI with Docker daemon',
    ],
    prosB: [
      'Single YAML file = clear service topology',
      'No per-test startup overhead (already running)',
      'Same compose file for local dev + CI',
      'Language-agnostic',
      'Familiar to ops engineers',
      'Simpler debugging (services keep running)',
      'No code dependency in test suite',
      'Works for E2E tests that span multiple services',
    ],
    whenA:
      'Pick Testcontainers when each test needs isolated infrastructure, when parallel test runs matter, when you want lifecycle management from test code, when polyglot teams share testing patterns, or when CI overhead per test is acceptable (1-5s container startup).',
    whenB:
      'Pick Docker Compose when shared services across the suite work fine, when local dev + CI share the same compose file, when test setup overhead must be zero, when tests are sequential (not parallel), or when language-agnostic config is required.',
    faqs: [
      { q: 'Can I combine both?', a: 'Yes — common pattern is Docker Compose for E2E tests spanning multiple services, Testcontainers for integration tests of single services in isolation.' },
      { q: 'Performance?', a: 'Docker Compose starts services once. Testcontainers starts a container per test (or class). Compose wins on raw speed; Testcontainers wins on isolation.' },
      { q: 'Cleanup?', a: 'Testcontainers auto-cleans via Ryuk + JVM hook. Compose requires `docker-compose down -v` after tests.' },
      { q: 'Best for CI?', a: 'Both work. Testcontainers is more popular for unit + integration tests; Compose for E2E and acceptance tests.' },
      { q: 'Module support?', a: 'Testcontainers has 50+ modules for popular services. Compose uses raw Docker image config.' },
    ],
    relatedBlogs: [
      'testcontainers-docker-integration-testing',
      'testcontainers-postgresql-node-complete-guide',
      'testcontainers-kafka-java-spring-boot-guide',
      'testcontainers-best-practices-2026',
      'docker-testing-strategies-guide',
    ],
    verdict:
      'Testcontainers for isolated integration tests. Docker Compose for shared-stack E2E tests. Both are excellent and commonly combined.',
  },
];

export function findComparison(slug: string): CompareEntry | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

export function allComparisonSlugs(): string[] {
  return COMPARISONS.map((c) => c.slug);
}
