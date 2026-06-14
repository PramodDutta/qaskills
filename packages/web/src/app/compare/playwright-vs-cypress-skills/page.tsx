import type { Metadata } from 'next';
import Link from 'next/link';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = {
  title: 'Playwright vs Cypress Skills for AI Agents',
  description:
    'Compare Playwright and Cypress testing skills for AI coding agents. Features, framework support, and which skills to install for your testing needs.',
  alternates: { canonical: 'https://qaskills.sh/compare/playwright-vs-cypress-skills' },
  openGraph: {
    title: 'Playwright vs Cypress Skills for AI Agents',
    description:
      'Compare Playwright and Cypress testing skills for AI coding agents. Features, framework support, and which skills to install.',
    url: 'https://qaskills.sh/compare/playwright-vs-cypress-skills',
    type: 'website',
  },
};

export default function PlaywrightVsCypressSkills() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'Playwright vs Cypress: Best Testing Skills for AI Agents',
            description:
              'Compare Playwright and Cypress testing skills for AI coding agents. Framework features, performance, community, and which skills to install.',
            url: 'https://qaskills.sh/compare/playwright-vs-cypress-skills',
            datePublished: '2026-02-14',
            image:
              'https://qaskills.sh/api/og?title=Playwright+vs+Cypress&description=Best+Testing+Skills+for+AI+Agents',
            author: {
              '@type': 'Person',
              name: 'Pramod Dutta',
              url: 'https://youtube.com/@TheTestingAcademy',
            },
            publisher: {
              '@type': 'Organization',
              name: 'QASkills.sh',
              url: 'https://qaskills.sh',
              logo: {
                '@type': 'ImageObject',
                url: 'https://qaskills.sh/logo.svg',
                width: 512,
                height: 512,
              },
            },
            mainEntityOfPage: 'https://qaskills.sh/compare/playwright-vs-cypress-skills',
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Compare', url: 'https://qaskills.sh/compare' },
              {
                name: 'Playwright vs Cypress Skills',
                url: 'https://qaskills.sh/compare/playwright-vs-cypress-skills',
              },
            ])
          ),
        }}
      />

      <article>
        {/* Header */}
        <div className="mb-12">
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Compare</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">Playwright vs Cypress Skills</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Playwright vs Cypress: Which Testing Skills Should You Install?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
            Playwright and Cypress are the two most popular end-to-end testing frameworks for modern
            web applications. This comparison helps you decide which testing skills to install into
            your AI coding agent for the best results.
          </p>
        </div>

        {/* Key Takeaways */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 mb-10">
          <h2 className="text-xl font-bold mb-4">Key Takeaways</h2>
          <ul className="space-y-3 text-sm leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                Playwright supports Chromium, Firefox, and WebKit natively; Cypress primarily targets
                Chromium-based browsers with experimental Firefox support
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                Playwright tests run faster in parallel by default and support multiple browser
                contexts; Cypress runs tests serially within a single browser instance
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                Cypress has a gentler learning curve and an excellent interactive test runner;
                Playwright offers more power and flexibility for complex testing scenarios
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                Both frameworks have dedicated QASkills.sh skills that teach AI agents
                framework-specific best practices, patterns, and configurations
              </span>
            </li>
          </ul>
        </div>

        {/* Quick Comparison Table */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Quick Comparison</h2>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left font-semibold">Feature</th>
                  <th className="px-4 py-3 text-left font-semibold">Playwright</th>
                  <th className="px-4 py-3 text-left font-semibold">Cypress</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Language Support',
                    playwright: 'TypeScript, JavaScript, Python, Java, C#',
                    cypress: 'TypeScript, JavaScript',
                  },
                  {
                    feature: 'Browser Support',
                    playwright: 'Chromium, Firefox, WebKit (Safari)',
                    cypress: 'Chrome, Edge, Firefox (beta), Electron',
                  },
                  {
                    feature: 'Parallel Execution',
                    playwright: 'Built-in, out of the box',
                    cypress: 'Via Cypress Cloud or third-party',
                  },
                  {
                    feature: 'Test Speed',
                    playwright: 'Fast (parallel by default)',
                    cypress: 'Moderate (serial by default)',
                  },
                  {
                    feature: 'Learning Curve',
                    playwright: 'Moderate',
                    cypress: 'Gentle (great for beginners)',
                  },
                  {
                    feature: 'Auto-Waiting',
                    playwright: 'Yes (built into all actions)',
                    cypress: 'Yes (automatic retry-ability)',
                  },
                  {
                    feature: 'API Testing',
                    playwright: 'Native (request context)',
                    cypress: 'Via cy.request()',
                  },
                  {
                    feature: 'Mobile Testing',
                    playwright: 'Device emulation + real mobile',
                    cypress: 'Viewport resizing only',
                  },
                  {
                    feature: 'Interactive Debugger',
                    playwright: 'Trace Viewer, VS Code extension',
                    cypress: 'Time-travel debugger (built-in)',
                  },
                  {
                    feature: 'Community',
                    playwright: 'Growing rapidly (Microsoft-backed)',
                    cypress: 'Large, established community',
                  },
                  {
                    feature: 'License',
                    playwright: 'Apache 2.0 (fully open source)',
                    cypress: 'MIT (open source, paid Cloud)',
                  },
                  {
                    feature: 'QASkills Skills',
                    playwright: '3+ dedicated skills',
                    cypress: '2+ dedicated skills',
                  },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.playwright}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.cypress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Architecture Differences */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Architecture Differences</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              Playwright and Cypress take fundamentally different approaches to browser automation.
              Understanding these architectural differences is crucial because they affect how your
              AI agent writes tests with each framework.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Playwright</strong> uses the Chrome DevTools
              Protocol (CDP) and similar protocols for Firefox and WebKit to control browsers from
              outside the browser process. This out-of-process architecture means Playwright can
              control multiple browser contexts, tabs, and even different browser types
              simultaneously. It can intercept network requests at the protocol level, emulate mobile
              devices, test across different browser engines, and handle complex scenarios like
              multi-tab workflows or authentication across origins.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Cypress</strong> runs inside the browser alongside
              your application. This in-process architecture gives Cypress direct access to the DOM,
              window object, and application state — which enables its signature time-travel
              debugging and automatic waiting. However, it also means Cypress is limited to a single
              browser tab, cannot natively handle multiple origins (though cross-origin support has
              improved in recent versions), and historically had limited browser support beyond
              Chromium.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              When an AI agent writes Playwright tests, it naturally produces code that leverages
              multiple browser contexts, parallel test execution, and cross-browser assertions.
              When writing Cypress tests, the agent focuses on Cypress&apos;s command chain syntax,
              custom commands, and its unique approach to asynchronous handling. This is exactly why
              framework-specific skills matter — they teach the agent the idiomatic patterns for each
              framework.
            </p>
          </div>
        </section>

        {/* Testing Capabilities */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Testing Capabilities</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">End-to-End Testing:</strong> Both frameworks excel
              at E2E testing. Playwright&apos;s auto-waiting is built into every action (click, fill,
              navigation), making tests naturally stable. Cypress&apos;s retry-ability mechanism
              automatically retries assertions until they pass or time out. Both approaches
              dramatically reduce flaky tests compared to older tools like Selenium.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">API Testing:</strong> Playwright has a first-class
              API testing module (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">request</code> context)
              that lets you make HTTP calls alongside browser tests, seed data, or test APIs
              independently. Cypress provides <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">cy.request()</code> and
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">cy.intercept()</code> for
              API testing and network stubbing, which is particularly useful for mocking backend
              responses during E2E tests.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Visual Testing:</strong> Playwright includes
              built-in screenshot comparison with{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">toHaveScreenshot()</code>,
              making visual regression testing a native feature. Cypress requires a plugin like
              Percy or cypress-image-snapshot for visual testing, though these integrations are
              mature and widely used.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Component Testing:</strong> Both frameworks support
              component testing. Playwright&apos;s component testing works with React, Vue, and
              Svelte. Cypress Component Testing is well-established and supports React, Vue, Angular,
              and Svelte with dedicated mount commands and component-level isolation.
            </p>
          </div>
        </section>

        {/* AI Agent Integration */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">AI Agent Integration</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              This is where QASkills.sh skills make the biggest difference. Without a testing skill,
              your AI agent will generate generic test code based on its training data — which may
              use outdated patterns, incorrect selectors, or miss framework-specific best practices.
              With the right skill installed, the agent writes tests that follow the exact patterns
              your team expects.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              The{' '}
              <Link
                href="/skills/thetestingacademy/playwright-e2e"
                className="text-primary hover:underline"
              >
                Playwright E2E skill
              </Link>{' '}
              teaches your AI agent to use Page Object Model (POM) patterns, Playwright fixtures for
              test setup and teardown, proper locator strategies (role-based, text-based, test-id),
              built-in assertions, trace collection for debugging, and parallel execution
              configuration. It also covers advanced patterns like authentication state reuse, visual
              comparison, and network mocking.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              The{' '}
              <Link
                href="/skills/thetestingacademy/cypress-e2e"
                className="text-primary hover:underline"
              >
                Cypress E2E skill
              </Link>{' '}
              teaches agents Cypress&apos;s command chain syntax, custom commands for reusable
              actions, proper use of{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">cy.intercept()</code>{' '}
              for network mocking, fixture-based test data, the{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">beforeEach</code> /
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">afterEach</code>{' '}
              lifecycle, and Cypress-specific assertion patterns. The skill ensures the agent avoids
              common Cypress antipatterns like unnecessary waits, direct DOM manipulation, and
              conditional testing.
            </p>
          </div>
        </section>

        {/* Performance and Speed */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Performance and Speed</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              Playwright is generally faster for large test suites. Its built-in parallel execution
              distributes tests across multiple worker processes by default, and each worker can run
              tests in isolated browser contexts without launching separate browser instances. A
              suite of 100 tests can run across 4 workers simultaneously, cutting total execution
              time significantly.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Cypress tests run serially by default within a single browser instance. While
              Cypress Cloud offers parallelization across CI machines, local development typically
              runs tests one at a time. Cypress compensates with fast startup time and real-time
              feedback through its interactive test runner — you see each command execute in the
              browser as it happens, which is invaluable during test development and debugging.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              For CI/CD pipelines where execution time directly impacts developer productivity,
              Playwright&apos;s native parallelism is a clear advantage. For local development where
              you are iterating on individual tests, Cypress&apos;s interactive runner provides a
              superior developer experience.
            </p>
          </div>
        </section>

        {/* When to Choose Each */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">When to Install Playwright Skills</h2>
          <ul className="space-y-3 mb-8">
            {[
              'You need cross-browser testing (Chrome, Firefox, Safari/WebKit)',
              'Your test suite is large and you need fast parallel execution',
              'You test multi-tab or multi-origin workflows',
              'You need built-in API testing alongside browser tests',
              'You want native visual regression testing without plugins',
              'You work with multiple languages (TypeScript, Python, Java, C#)',
              'You need mobile device emulation beyond viewport resizing',
              'You are building a new test automation framework from scratch',
            ].map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-green-500 shrink-0 mt-0.5">+</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold mb-4">When to Install Cypress Skills</h2>
          <ul className="space-y-3">
            {[
              'Your team is new to test automation and values a gentle learning curve',
              'You want the best-in-class interactive debugging experience',
              'Your application is a single-page app (SPA) that primarily runs in Chrome',
              'You need powerful network stubbing and response mocking (cy.intercept)',
              'You want mature component testing for React, Vue, or Angular',
              'Your existing test suite is already in Cypress and you want AI to extend it',
              'You prefer a command-chain API style over async/await',
              'You value the large ecosystem of Cypress plugins',
            ].map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-blue-500 shrink-0 mt-0.5">+</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Installing the Skills */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Install the Skills</h2>
          <p className="text-muted-foreground mb-6">
            Install these skills into your AI agent to get framework-specific testing patterns.
            Each skill is free and installs in seconds.
          </p>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Playwright E2E Testing</h3>
                <Link
                  href="/skills/thetestingacademy/playwright-e2e"
                  className="text-xs text-primary hover:underline"
                >
                  View skill
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Page Object Model, fixtures, auto-waiting, visual regression, parallel execution,
                and cross-browser patterns.
              </p>
              <div className="rounded-md border border-border bg-muted/50 px-4 py-2.5">
                <code className="font-mono text-sm">npx @qaskills/cli add playwright-e2e</code>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Playwright API Testing</h3>
                <Link
                  href="/skills/thetestingacademy/playwright-api"
                  className="text-xs text-primary hover:underline"
                >
                  View skill
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                API request contexts, response validation, authentication flows, and combined
                UI + API testing patterns.
              </p>
              <div className="rounded-md border border-border bg-muted/50 px-4 py-2.5">
                <code className="font-mono text-sm">npx @qaskills/cli add playwright-api</code>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Cypress E2E Testing</h3>
                <Link
                  href="/skills/thetestingacademy/cypress-e2e"
                  className="text-xs text-primary hover:underline"
                >
                  View skill
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Custom commands, network interception, fixture data, time-travel debugging, and
                Cypress best practices.
              </p>
              <div className="rounded-md border border-border bg-muted/50 px-4 py-2.5">
                <code className="font-mono text-sm">npx @qaskills/cli add cypress-e2e</code>
              </div>
            </div>
          </div>
        </section>

        {/* Can You Use Both? */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Can You Use Both?</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              Yes, and many teams do. A common pattern is to use Cypress for component testing and
              developer-facing integration tests (leveraging its excellent interactive debugger),
              while using Playwright for full E2E regression suites that need to run across multiple
              browsers in CI. You can install both the Playwright and Cypress skills into your AI
              agent — the agent will use the appropriate framework patterns based on the context of
              your project and the files you are working with.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              QASkills.sh also offers skill packs that bundle related testing skills together. The
              Web Testing Starter Pack includes both Playwright and Cypress skills along with
              accessibility and visual testing patterns, giving your AI agent comprehensive knowledge
              across the testing spectrum.
            </p>
          </div>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Conclusion</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              Both Playwright and Cypress are excellent testing frameworks, and the right choice
              depends on your team&apos;s needs. Playwright offers broader browser coverage, faster
              parallel execution, multi-language support, and more flexibility for complex testing
              scenarios. Cypress provides a smoother onboarding experience, an unmatched interactive
              debugger, and a mature ecosystem of plugins.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Regardless of which framework you choose, installing the corresponding QASkills.sh
              skill into your AI agent ensures it writes tests using the right patterns, proper
              assertions, and framework-specific best practices. No more generic test code — your
              agent becomes a testing expert for your chosen framework.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-bold">Start testing smarter with AI</h2>
          <p className="mt-2 text-muted-foreground">
            Install Playwright or Cypress skills and let your AI agent write production-ready tests.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/skills/thetestingacademy/playwright-e2e"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Install Playwright Skill
            </Link>
            <Link
              href="/skills/thetestingacademy/cypress-e2e"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Install Cypress Skill
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
