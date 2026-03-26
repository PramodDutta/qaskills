export function GET() {
  const content = `# QASkills.sh

> The curated QA skills directory for AI coding agents — 450+ skills for 30+ agents

## About
QASkills.sh is a free, open-source directory of QA testing skills for AI coding agents. Built by The Testing Academy (189K+ YouTube subscribers), it provides curated, quality-scored skills that can be installed into Claude Code, Cursor, GitHub Copilot, Windsurf, and 30+ other AI coding agents with a single command.

## Key Features
- 450+ curated QA testing skills with quality scores (0-100)
- One-command installation via CLI: npx @qaskills/cli add <skill-name>
- Supports 30+ AI coding agents including Claude Code, Cursor, Copilot, Windsurf, Cline, Zed, Bolt, Aider, Continue, Codex, Gemini CLI, AMP
- Free and open source (MIT license)
- Skill Packs for bundled installations
- Community publishing support
- 100+ blog articles covering every QA testing topic

## Skill Categories
- E2E Testing: Playwright, Cypress, Selenium, WebDriverIO, Puppeteer, TestCafe, Nightwatch.js
- Unit Testing: Jest, Vitest, Mocha, Jasmine, JUnit 5, TestNG, PHPUnit, NUnit, MSTest, RSpec, pytest
- API Testing: REST Assured, Postman, GraphQL, gRPC, tRPC, Playwright API
- Performance Testing: k6, JMeter, Gatling, Artillery, Locust
- Security Testing: OWASP, Burp Suite, ZAP, SQL Injection, XSS, SAST, DAST
- Mobile Testing: Appium, Detox, Espresso, XCUITest, Flutter
- Accessibility Testing: axe-core, WCAG, ARIA, keyboard navigation
- Visual Testing: Screenshot comparison, Playwright Visual, Percy, Applitools
- Contract Testing: Pact, GraphQL contracts, OpenAPI validation
- BDD Testing: Cucumber, Behave, SpecFlow, Gauge, Serenity BDD
- AI/LLM Testing: Prompt testing, LLM output validation, hallucination detection
- Infrastructure Testing: Docker, Kubernetes, Terraform, Testcontainers
- CI/CD Testing: GitHub Actions, Jenkins, GitLab CI, pipeline optimization
- Framework-Specific: Next.js, React, Angular, Vue, Django, Flask, Laravel, Rails, Spring Boot, .NET

## Languages Supported
TypeScript, JavaScript, Python, Java, C#, Ruby, PHP, Go, Rust, Kotlin, Swift

## Content Structure
- /skills — Browse all 450+ QA skills with search, filtering by framework, language, testing type
- /skills/[author]/[slug] — Individual skill detail pages with full documentation
- /packs — Curated skill bundles for common testing scenarios
- /leaderboard — Top skills ranked by installs, quality score, and trending
- /blog — 100+ QA testing articles, tutorials, framework comparisons, and guides
- /getting-started — Install your first skill in 30 seconds
- /agents — Skills organized by AI agent (Claude Code, Cursor, Copilot, etc.)
- /categories — Skills organized by testing type
- /compare — Tool comparison pages (Playwright vs Cypress, etc.)
- /how-to-publish — Publish your own QA skills
- /pricing — Free and open source
- /faq — Frequently asked questions

## API (Public, JSON)
- GET /api/skills — Search and list skills with pagination, filtering, sorting
- GET /api/skills/[id] — Individual skill details
- GET /api/skills/[id]/content — Full SKILL.md content (text/markdown)
- GET /api/categories — List all categories
- GET /api/leaderboard — Leaderboard data with ranking metrics

## Popular Skills
- playwright-e2e — Comprehensive Playwright E2E testing with Page Object Model
- jest-unit — Jest unit testing with mocking, snapshots, and coverage
- cypress-e2e — Cypress end-to-end testing patterns
- k6-performance — k6 performance and load testing
- api-testing-rest — RESTful API testing patterns
- owasp-security — OWASP security testing best practices
- react-testing-library — React component testing
- pytest-patterns — Python testing with pytest
- selenium-advance-pom — Selenium with advanced Page Object Model
- playwright-api — API testing with Playwright

## Contact
- Website: https://qaskills.sh
- GitHub: https://github.com/PramodDutta/qaskills
- YouTube: https://youtube.com/@TheTestingAcademy
- npm: https://www.npmjs.com/package/@qaskills/cli
- Author: Pramod Dutta

## Documentation
- Getting Started: https://qaskills.sh/getting-started
- How to Publish: https://qaskills.sh/how-to-publish
- FAQ: https://qaskills.sh/faq
- Blog: https://qaskills.sh/blog
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
