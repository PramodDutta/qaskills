/**
 * Data for /skills-for/[topic] keyword-targeted landing pages.
 *
 * Each entry generates a hub page with:
 * - SEO-optimized H1/title/meta
 * - Install command + value props
 * - Top skills grid (DB-driven by filter)
 * - Related deep-dive articles
 * - FAQ
 * - CollectionPage + ItemList + FAQ + Breadcrumb JSON-LD
 */

export interface SkillFilter {
  /**
   * SQL filter against jsonb columns on `skills`. Choose one approach:
   * - agentJsonb: filter `agents @> '[<value>]'::jsonb`
   * - frameworkJsonb: filter `frameworks @> '[<value>]'::jsonb`
   * - testingTypeJsonb: filter `testingTypes @> '[<value>]'::jsonb`
   * - tagsJsonb: filter `tags @> '[<value>]'::jsonb`
   */
  type: 'agent' | 'framework' | 'testingType' | 'tag';
  value: string;
}

export interface HubEntry {
  /** URL slug: /skills-for/<slug> */
  slug: string;
  /** Page title for the browser tab + SERP */
  title: string;
  /** Meta description (130-160 chars) */
  description: string;
  /** Hero headline shown on page */
  h1: string;
  /** Hero intro paragraph */
  intro: string;
  /** Install command shown in install card */
  installCmd: string;
  /** Filter applied to query the skills table */
  filter: SkillFilter;
  /** Three value props */
  valueProps: Array<{ icon: 'zap' | 'check' | 'terminal' | 'star'; title: string; body: string }>;
  /** Related blog slugs (must exist in /blog/posts) */
  relatedArticles: Array<{ slug: string; title: string }>;
  /** 5-7 FAQ entries */
  faqs: Array<{ q: string; a: string }>;
  /** CTA recommended skill (slug optional — defaults to /skills) */
  ctaSkillSlug?: string;
  ctaSkillLabel?: string;
}

export const HUBS: HubEntry[] = [
  {
    slug: 'claude-code-testing',
    title: 'Best Claude Code Skills for Testing & QA 2026',
    description:
      '100+ Claude Code skills for testing and QA. Playwright, Cypress, Selenium, pytest, API contract, performance, security — install in one command.',
    h1: 'Best Claude Code Skills for Testing & QA 2026',
    intro:
      'Curated SKILL.md files that teach Claude Code expert testing patterns. Playwright, Cypress, Selenium, pytest, JUnit, k6, REST Assured, Pact, and more. One command. Production-quality tests in your next session.',
    installCmd: `# Pick a skill from the grid below
npx @qaskills/cli add playwright-e2e

# Claude Code picks it up on next session
# Writes to ~/.claude/skills/playwright-e2e/SKILL.md`,
    filter: { type: 'agent', value: 'claude-code' },
    valueProps: [
      { icon: 'zap', title: 'One-command install', body: 'No copy-paste. CLI detects Claude Code and writes SKILL.md to the right path.' },
      { icon: 'check', title: 'Quality-scored', body: 'Every skill scored 0-100 on content depth, install retention, review rating.' },
      { icon: 'terminal', title: 'Real-world patterns', body: 'Page Object Model, fixtures, contract testing, CI integration — not just docs.' },
    ],
    relatedArticles: [
      { slug: 'best-claude-code-skills-for-testing-2026', title: 'Best Claude Code Skills for Testing in 2026' },
      { slug: 'best-claude-code-skills-for-automated-testing', title: 'Best Claude Code Skills for Automated Testing' },
      { slug: 'claude-code-qa-testing-workflows-2026', title: 'Claude Code QA Testing Workflows 2026' },
      { slug: 'claude-for-qa-engineers-complete-guide', title: 'Claude for QA Engineers — Complete Guide' },
      { slug: 'claude-qa-agent-setup-guide', title: 'Claude QA Agent Setup Guide' },
      { slug: 'must-have-qa-skills-claude-code-2026', title: 'Must-Have QA Skills for Claude Code 2026' },
      { slug: 'playwright-mcp-claude-code-setup-2026', title: 'Playwright MCP + Claude Code Setup 2026' },
      { slug: 'how-to-install-skills-claude-code', title: 'How to Install Skills in Claude Code' },
    ],
    faqs: [
      { q: 'What are Claude Code skills for testing?', a: 'SKILL.md files that teach Claude Code (Anthropic\'s official CLI agent) how to write tests using specific frameworks. Each skill ships expert patterns, locators, fixtures, and assertion conventions.' },
      { q: 'How do I install a Claude Code testing skill?', a: 'Run `npx @qaskills/cli add <skill-name>`. CLI auto-detects Claude Code and writes to ~/.claude/skills/<skill>/SKILL.md.' },
      { q: 'Which testing skills work best with Claude Code?', a: 'Highest install counts: playwright-e2e, cypress-e2e, selenium-advance-pom, pytest-patterns, jest-unit, react-testing-library, k6-performance, api-testing-rest, testcontainers-postgres.' },
      { q: 'Do these skills work with Claude Desktop?', a: 'No — Desktop uses different skill format. QASkills.sh targets coding agents that read SKILL.md (Claude Code, Cursor, Copilot, Windsurf, etc.).' },
      { q: 'Are Claude Code skills free?', a: 'Yes — MIT licensed. Some advanced packs are premium bundles.' },
      { q: 'Can I write my own?', a: 'Yes — see /how-to-publish. Create SKILL.md, validate, publish via `npx @qaskills/cli publish`. Live within 30 seconds.' },
    ],
    ctaSkillSlug: 'thetestingacademy/playwright-e2e',
    ctaSkillLabel: 'Start with Playwright E2E',
  },
  {
    slug: 'cursor-testing',
    title: 'Best Cursor AI Skills for Testing & QA 2026',
    description:
      'Curated Cursor rules for QA testing. Playwright, Cypress, Selenium, pytest, API, performance — install via npx qaskills add. .cursor/rules format.',
    h1: 'Best Cursor AI Skills for Testing & QA 2026',
    intro:
      'Cursor rules (.cursor/rules/*.mdc) that teach Cursor expert testing patterns across Playwright, Cypress, Selenium, pytest, JUnit, k6, and more. Install with a single command — works with Cursor\'s Composer + Agent + Chat modes.',
    installCmd: `# Install a Cursor testing skill
npx @qaskills/cli add playwright-e2e

# Writes to .cursor/rules/playwright-e2e.mdc
# Cursor reads on next prompt`,
    filter: { type: 'agent', value: 'cursor' },
    valueProps: [
      { icon: 'zap', title: 'One-command install', body: 'CLI auto-detects Cursor and writes rules to .cursor/rules/<slug>.mdc.' },
      { icon: 'check', title: 'Composer-ready', body: 'Rules apply to Cursor Composer multi-file edits + Agent mode out of the box.' },
      { icon: 'terminal', title: 'Production patterns', body: 'POM, fixtures, BDD, contract testing — real-world test code, not docs.' },
    ],
    relatedArticles: [
      { slug: 'qa-skills-for-cursor-2026', title: 'QA Skills for Cursor 2026' },
      { slug: 'cursor-for-qa-engineers-complete-guide', title: 'Cursor for QA Engineers — Complete Guide' },
      { slug: 'cursor-skills-md-best-practices', title: 'Cursor Skills MD Best Practices' },
      { slug: 'cursor-playwright-skill-setup-guide', title: 'Cursor Playwright Skill Setup' },
      { slug: 'how-to-install-skills-cursor', title: 'How to Install Skills in Cursor' },
      { slug: 'playwright-mcp-cursor-ide-setup-2026', title: 'Playwright MCP + Cursor Setup 2026' },
    ],
    faqs: [
      { q: 'What is a Cursor skill?', a: 'A .mdc file in .cursor/rules/ that teaches Cursor how to write tests in a specific framework. Cursor reads matching rules whenever it generates or edits code.' },
      { q: 'How do I install one?', a: 'Run `npx @qaskills/cli add <skill-name>`. CLI auto-detects Cursor and writes the rule file.' },
      { q: 'Do these work with Cursor Composer?', a: 'Yes — rules apply to Chat, Composer, and Agent modes equally.' },
      { q: 'Can I use the same skill in Claude Code and Cursor?', a: 'Yes — QASkills.sh skills are agent-agnostic. CLI writes the correct file per agent.' },
      { q: 'Free?', a: 'Yes — all open skills are MIT. Some advanced packs are paid bundles.' },
      { q: 'What about Cursor Tab autocomplete?', a: 'Rules influence Composer + Chat. Tab autocomplete is a separate Cursor-built model that uses repo context, not .mdc files directly.' },
    ],
    ctaSkillLabel: 'Start with Playwright Cursor Skill',
  },
  {
    slug: 'github-copilot-testing',
    title: 'Best GitHub Copilot Skills for Testing & QA 2026',
    description:
      'Curated Copilot instructions for QA testing. Playwright, Cypress, Selenium, pytest, k6 — installed to .github/copilot-instructions.md in one command.',
    h1: 'Best GitHub Copilot Skills for Testing & QA 2026',
    intro:
      'Copilot custom instructions tailored to QA testing patterns. Each skill appends to .github/copilot-instructions.md and influences inline suggestions, Copilot Chat, and Copilot Workspace. Works in VS Code, JetBrains, Neovim, Xcode, and Visual Studio.',
    installCmd: `# Install a Copilot testing skill
npx @qaskills/cli add playwright-e2e

# Appends to .github/copilot-instructions.md
# Copilot applies on next file edit`,
    filter: { type: 'agent', value: 'github-copilot' },
    valueProps: [
      { icon: 'zap', title: 'Editor-agnostic', body: 'Works wherever Copilot runs — VS Code, JetBrains, Neovim, Xcode.' },
      { icon: 'check', title: 'Repo-wide rules', body: 'Custom instructions apply to all suggestions in the repository.' },
      { icon: 'terminal', title: 'Test-aware', body: 'Skill content tells Copilot to follow POM, auto-waiting, fixtures.' },
    ],
    relatedArticles: [
      { slug: 'qa-skills-for-github-copilot-2026', title: 'QA Skills for GitHub Copilot 2026' },
      { slug: 'github-copilot-qa-engineers-deep-guide', title: 'GitHub Copilot for QA Engineers — Deep Guide' },
    ],
    faqs: [
      { q: 'How do Copilot custom instructions work?', a: 'GitHub Copilot reads .github/copilot-instructions.md and applies the content to every suggestion + chat response within the repo.' },
      { q: 'Do skills work in Copilot Chat?', a: 'Yes — chat reads custom instructions for repo-aware answers.' },
      { q: 'Can I use multiple skills?', a: 'Yes — each `qaskills add` appends a new section. Copilot reads all of it.' },
      { q: 'Does Copilot Workspace honor these?', a: 'Yes — Workspace reads the same .github/copilot-instructions.md.' },
      { q: 'Per-editor or repo-wide?', a: 'Repo-wide. The file is committed to your repo and applies to all team members.' },
      { q: 'JetBrains support?', a: 'Yes — JetBrains Copilot plugin reads .github/copilot-instructions.md from the repo.' },
    ],
    ctaSkillLabel: 'Start with Playwright Copilot Skill',
  },
  {
    slug: 'windsurf-testing',
    title: 'Best Windsurf Skills for Testing & QA 2026',
    description:
      'Curated Windsurf rules for QA testing. Playwright, Cypress, Selenium, pytest, API testing — install with npx qaskills add. .windsurf/rules format.',
    h1: 'Best Windsurf Skills for Testing & QA 2026',
    intro:
      'Windsurf rules (.windsurf/rules/*.md) tailored to QA testing across Playwright, Cypress, Selenium, pytest, JUnit, k6, REST Assured, and more. Windsurf\'s Cascade flows and Agent mode honor these rules during multi-step refactors.',
    installCmd: `# Install a Windsurf testing skill
npx @qaskills/cli add playwright-e2e

# Writes to .windsurf/rules/playwright-e2e.md
# Cascade + Agent pick it up automatically`,
    filter: { type: 'agent', value: 'windsurf' },
    valueProps: [
      { icon: 'zap', title: 'Cascade-aware', body: 'Rules influence Windsurf\'s multi-step Cascade flows from the start.' },
      { icon: 'check', title: 'Agent-ready', body: 'Agent mode reads rules for autonomous test generation runs.' },
      { icon: 'terminal', title: 'Repo-scoped', body: 'Rules live in .windsurf/rules — committed to repo for team-wide use.' },
    ],
    relatedArticles: [
      { slug: 'qa-skills-for-windsurf-2026', title: 'QA Skills for Windsurf 2026' },
      { slug: 'windsurf-qa-engineers-complete-guide', title: 'Windsurf for QA Engineers — Complete Guide' },
    ],
    faqs: [
      { q: 'What is a Windsurf rule?', a: 'A markdown file in .windsurf/rules/ that gives Windsurf project-specific context. Used by Cascade, Agent, and Chat.' },
      { q: 'How do I install one?', a: 'Run `npx @qaskills/cli add <skill-name>`. CLI auto-detects Windsurf and writes the rule.' },
      { q: 'Do rules affect Cascade?', a: 'Yes — Cascade reads all rules in .windsurf/rules during multi-step flows.' },
      { q: 'Repo or global?', a: 'Repo-scoped — committed to your repo for team-wide use.' },
      { q: 'Can I use multiple skills?', a: 'Yes — each skill is a separate file. Windsurf reads all of them.' },
      { q: 'Free?', a: 'Yes — MIT licensed.' },
    ],
    ctaSkillLabel: 'Start with Playwright Windsurf Skill',
  },
  {
    slug: 'ai-llm-evals',
    title: 'Best LLM Evaluation Skills 2026: OpenAI, Promptfoo, Ragas',
    description:
      'Skills for LLM application evaluation. OpenAI Evals, Promptfoo, Ragas, DeepEval, LangSmith — install via npx qaskills add.',
    h1: 'Best LLM Evaluation Skills 2026',
    intro:
      'Curated skills for evaluating LLM-powered applications: OpenAI Evals, Promptfoo, Ragas, DeepEval, LangSmith, LangChain Evaluators, Helicone, Arize Phoenix, TruLens, Evidently AI, Weights & Biases. Install with a single command for Claude Code, Cursor, Copilot, and 30+ agents.',
    installCmd: `# Install LLM eval skills
npx @qaskills/cli add promptfoo-llm-evals
npx @qaskills/cli add openai-evals
npx @qaskills/cli add ragas-rag-evals`,
    filter: { type: 'testingType', value: 'llm-evals' },
    valueProps: [
      { icon: 'zap', title: 'Multi-provider', body: 'Promptfoo, OpenAI Evals, Ragas, DeepEval — covers OpenAI, Anthropic, local models.' },
      { icon: 'check', title: 'RAG-ready', body: 'Context precision, recall, faithfulness, answer relevance metrics built in.' },
      { icon: 'star', title: 'Red-teaming', body: 'Promptfoo red-team skill covers jailbreaks, prompt injection, PII leakage.' },
    ],
    relatedArticles: [
      { slug: 'openai-evals-complete-guide-2026', title: 'OpenAI Evals Complete Guide 2026' },
      { slug: 'openai-evals-best-practices-2026', title: 'OpenAI Evals Best Practices' },
      { slug: 'promptfoo-complete-guide-2026', title: 'Promptfoo Complete Guide 2026' },
      { slug: 'promptfoo-red-teaming-llm-applications', title: 'Promptfoo Red Teaming LLM Applications' },
      { slug: 'ragas-rag-evaluation-metrics-complete-guide', title: 'Ragas RAG Evaluation Metrics' },
      { slug: 'ragas-context-precision-recall-faithfulness-guide', title: 'Ragas Context Precision/Recall/Faithfulness' },
      { slug: 'llm-evals-comparison-openai-promptfoo-ragas', title: 'LLM Evals: OpenAI vs Promptfoo vs Ragas' },
      { slug: 'deepeval-pytest-llm-testing-guide', title: 'DeepEval pytest LLM Testing' },
      { slug: 'langsmith-evaluation-platform-guide', title: 'LangSmith Evaluation Platform Guide' },
      { slug: 'langchain-evaluators-complete-guide', title: 'LangChain Evaluators Complete Guide' },
      { slug: 'arize-phoenix-llm-evaluation-guide', title: 'Arize Phoenix LLM Evaluation' },
      { slug: 'trulens-llm-evaluation-framework-guide', title: 'TruLens LLM Evaluation Framework' },
    ],
    faqs: [
      { q: 'What is LLM evaluation?', a: 'Measuring how well an LLM-powered application performs across correctness, faithfulness, factuality, safety, latency, cost. Critical for production LLM apps.' },
      { q: 'OpenAI Evals or Promptfoo?', a: 'Promptfoo for multi-provider + CI + red-teaming. OpenAI Evals for OpenAI-only Python research workflows.' },
      { q: 'What is Ragas?', a: 'RAG-focused eval library. Measures context precision, context recall, faithfulness, answer relevance for retrieval-augmented generation pipelines.' },
      { q: 'Red teaming?', a: 'Adversarial testing — jailbreaks, prompt injection, PII leakage, hallucination probes. Promptfoo has first-class red-team support.' },
      { q: 'How do skills install?', a: 'Run `npx @qaskills/cli add <skill-name>`. CLI detects your agent and writes the skill to the correct path.' },
      { q: 'Free?', a: 'Yes — MIT licensed skills. The underlying tools (Promptfoo, Ragas, DeepEval) are also OSS.' },
      { q: 'Pytest integration?', a: 'DeepEval is pytest-style natively. Ragas and Promptfoo can run inside pytest with a custom fixture.' },
    ],
    ctaSkillLabel: 'Start with Promptfoo LLM Evals',
  },
  {
    slug: 'playwright-typescript',
    title: 'Best Playwright TypeScript Skills 2026',
    description:
      'Curated Playwright + TypeScript skills: POM, fixtures, traces, parallel, multi-tab, network mocking. Install via npx qaskills add.',
    h1: 'Best Playwright TypeScript Skills 2026',
    intro:
      'Playwright with TypeScript is the dominant E2E stack in 2026 — auto-waiting locators, fixtures, BrowserContext isolation, native parallel execution. These skills teach AI agents the canonical patterns: getByRole, getByTestId, Page Object Model, APIRequestContext, multi-tab + multi-origin flows.',
    installCmd: `# Install Playwright TypeScript skills
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add playwright-api

# Or grab the full Playwright pack
npx @qaskills/cli add-pack playwright-pro`,
    filter: { type: 'framework', value: 'playwright' },
    valueProps: [
      { icon: 'zap', title: 'Auto-waiting', body: 'Skills teach native auto-wait — no manual page.waitForSelector clutter.' },
      { icon: 'check', title: 'POM + fixtures', body: 'Production-grade Page Object Model + Playwright fixtures patterns.' },
      { icon: 'terminal', title: 'CI ready', body: 'GitHub Actions, parallel sharding, retries, trace.zip artifacts included.' },
    ],
    relatedArticles: [
      { slug: 'playwright-e2e-complete-guide', title: 'Playwright E2E Complete Guide' },
      { slug: 'playwright-tutorial-beginners-2026', title: 'Playwright Tutorial for Beginners 2026' },
      { slug: 'playwright-best-practices-locators-2026', title: 'Playwright Best Practices: Locators 2026' },
      { slug: 'playwright-fixtures-complete-reference-2026', title: 'Playwright Fixtures Complete Reference' },
      { slug: 'playwright-trace-viewer-complete-guide-2026', title: 'Playwright Trace Viewer Complete Guide' },
      { slug: 'playwright-ui-mode-complete-2026-guide', title: 'Playwright UI Mode Complete 2026 Guide' },
      { slug: 'playwright-network-mocking-route-handler-guide', title: 'Playwright Network Mocking + route() Guide' },
      { slug: 'playwright-storagestate-authentication-reference', title: 'Playwright storageState Authentication Reference' },
      { slug: 'playwright-ci-github-actions-complete-guide-2026', title: 'Playwright CI + GitHub Actions Guide' },
      { slug: 'playwright-parallel-sharding-execution-guide', title: 'Playwright Parallel Sharding Execution Guide' },
      { slug: 'playwright-retries-flaky-test-handling-guide', title: 'Playwright Retries + Flaky Test Handling' },
      { slug: 'playwright-test-agents-planner-generator-healer-guide', title: 'Playwright Test Agents (Planner/Generator/Healer)' },
    ],
    faqs: [
      { q: 'What makes Playwright + TypeScript a top choice in 2026?', a: 'TypeScript-first API, auto-waiting locators, BrowserContext isolation for parallel, built-in trace viewer + UI mode, and free parallel execution without paid cloud.' },
      { q: 'Do I need separate skills for component vs E2E?', a: 'No — playwright-e2e covers both browser E2E and component testing patterns. Both use @playwright/test and @playwright/experimental-ct-react / -vue / -svelte.' },
      { q: 'How do skills handle authentication?', a: 'Skills teach the storageState pattern — log in once, save cookies + localStorage, reuse across tests for sub-second per-test setup.' },
      { q: 'Parallel execution patterns?', a: 'Skills configure workers + projects + sharding. Default 1 worker per test, parallel across files. Sharding splits files across CI machines.' },
      { q: 'What about multi-tab + multi-origin flows?', a: 'Native — Playwright supports both. Skills teach context.newPage() + page.context() for tab management and direct multi-origin navigation.' },
      { q: 'Skills compatible with which agents?', a: 'Claude Code, Cursor, Copilot, Windsurf, Cline, Codex CLI, Aider, Continue, Zed, Bolt, Lovable, v0, Gemini CLI, Amp.' },
    ],
    ctaSkillSlug: 'thetestingacademy/playwright-e2e',
    ctaSkillLabel: 'Start with Playwright E2E',
  },
  {
    slug: 'selenium-java',
    title: 'Best Selenium Java Skills 2026',
    description:
      'Curated Selenium WebDriver Java skills: Advanced POM, TestNG, JUnit 5, Page Factory, parallel Grid, Allure reporting. Install via npx qaskills add.',
    h1: 'Best Selenium Java Skills 2026',
    intro:
      'Selenium WebDriver with Java remains the de facto enterprise E2E stack — W3C standard, polyglot, mature Grid 4 distributed execution. These skills teach AI agents Advanced Page Object Model, Page Factory, fluent waits, TestNG parallel groups, JUnit 5 extensions, Allure reporting, and Jenkins + GitHub Actions CI integration.',
    installCmd: `# Install Selenium Java skills
npx @qaskills/cli add selenium-advance-pom
npx @qaskills/cli add selenium-allure-reporting
npx @qaskills/cli add selenium-testng-patterns`,
    filter: { type: 'framework', value: 'selenium' },
    valueProps: [
      { icon: 'zap', title: 'POM + Page Factory', body: 'Advanced Page Object Model with @FindBy + LoadableComponent patterns.' },
      { icon: 'check', title: 'Grid 4 ready', body: 'Distributed parallel execution with Docker + Kubernetes deploy patterns.' },
      { icon: 'terminal', title: 'CI matured', body: 'Maven + Gradle build, TestNG XML, Jenkins pipeline, Allure history.' },
    ],
    relatedArticles: [
      { slug: 'selenium-vs-playwright-2026', title: 'Selenium vs Playwright 2026' },
      { slug: 'selenium-tutorial-complete-beginners-2026', title: 'Selenium Tutorial for Beginners 2026' },
      { slug: 'selenium-java-testng-page-object-guide', title: 'Selenium + Java + TestNG Page Object Guide' },
      { slug: 'selenium-grid-docker-parallel-testing', title: 'Selenium Grid 4 + Docker Parallel Testing' },
      { slug: 'selenium-grid-4-docker-kubernetes-guide', title: 'Selenium Grid 4 + Docker + Kubernetes Guide' },
      { slug: 'selenium-manager-browser-driver-2026', title: 'Selenium Manager Browser Driver 2026' },
      { slug: 'selenium-bidirectional-bidi-protocol-guide', title: 'Selenium BiDi Protocol Guide' },
      { slug: 'selenium-allure-reporting-java-complete-guide', title: 'Selenium + Allure Reporting Java Guide' },
      { slug: 'selenium-jenkins-pipeline-complete-guide', title: 'Selenium + Jenkins Pipeline Complete Guide' },
      { slug: 'selenium-cucumber-java-bdd-complete-guide', title: 'Selenium + Cucumber Java BDD Guide' },
      { slug: 'selenium-to-playwright-migration-guide-2026', title: 'Selenium to Playwright Migration Guide' },
      { slug: 'selenide-vs-selenium-webdriver-2026', title: 'Selenide vs Selenium WebDriver 2026' },
    ],
    faqs: [
      { q: 'Selenium 4 or Selenium 3?', a: 'Selenium 4 only — W3C WebDriver native, Selenium Manager auto-downloads drivers, BiDi protocol, Grid 4 with Docker + K8s. Selenium 3 is EOL.' },
      { q: 'TestNG or JUnit 5 with Selenium?', a: 'Both excellent. TestNG dominates Selenium tutorials (DataProvider patterns). JUnit 5 catching up — Selenium\'s own examples now use JUnit 5.' },
      { q: 'Should I migrate to Playwright?', a: 'For new projects — Playwright. For existing Selenium suites — stay, but plan a 18-24 month migration for new test development.' },
      { q: 'Allure or Extent Reports?', a: 'Allure for polyglot teams + AllureSelenide convenience. Extent Reports for Java/.NET only with polished UI out of the box.' },
      { q: 'Mobile testing in Selenium?', a: 'Use Appium — shares WebDriver protocol. Selenium WebDriver and Appium in the same Java suite is a common pattern.' },
      { q: 'Selenium Manager replace WebDriverManager?', a: 'Yes — built into Selenium 4.6+. No more third-party WebDriverManager dependency for most cases.' },
    ],
    ctaSkillSlug: 'thetestingacademy/selenium-advance-pom',
    ctaSkillLabel: 'Start with Selenium Advanced POM',
  },
  {
    slug: 'api-contract-testing',
    title: 'Best API & Contract Testing Skills 2026',
    description:
      'Curated API + contract testing skills: REST Assured, Karate, Pact, WireMock, Supertest, Postman, Bruno. Install via npx qaskills add.',
    h1: 'Best API & Contract Testing Skills 2026',
    intro:
      'API and contract testing skills covering REST/GraphQL/gRPC across REST Assured, Karate, Supertest, Apickli, Pact, Spring Cloud Contract, WireMock, Mockoon, Bruno, Hoppscotch. Catch breaking changes before they ship. Validate OpenAPI specs. Run in CI.',
    installCmd: `# Install API testing skills
npx @qaskills/cli add api-testing-rest
npx @qaskills/cli add pact-contract-testing
npx @qaskills/cli add karate-bdd-api`,
    filter: { type: 'testingType', value: 'api' },
    valueProps: [
      { icon: 'zap', title: 'Contract-first', body: 'Pact + Spring Cloud Contract patterns prevent breaking changes.' },
      { icon: 'check', title: 'Multi-tool', body: 'REST Assured, Karate, Supertest, Bruno — pick the right tool per stack.' },
      { icon: 'terminal', title: 'CI gates', body: 'JUnit XML output + Pact broker can-i-deploy for safe deploys.' },
    ],
    relatedArticles: [
      { slug: 'api-testing-complete-guide', title: 'API Testing Complete Guide' },
      { slug: 'api-testing-best-practices-guide', title: 'API Testing Best Practices' },
      { slug: 'rest-assured-java-api-testing', title: 'REST Assured Java API Testing' },
      { slug: 'karate-dsl-bdd-api-testing-complete-guide', title: 'Karate DSL BDD API Testing Guide' },
      { slug: 'rest-assured-vs-karate-detailed-comparison-2026', title: 'REST Assured vs Karate 2026' },
      { slug: 'supertest-node-api-testing-complete-guide', title: 'SuperTest Node API Testing Guide' },
      { slug: 'pact-contract-testing-complete-guide-2026', title: 'Pact Contract Testing Complete Guide' },
      { slug: 'pactflow-contract-testing-broker-guide', title: 'Pactflow Contract Testing Broker Guide' },
      { slug: 'spring-cloud-contract-testing-guide', title: 'Spring Cloud Contract Testing Guide' },
      { slug: 'wiremock-api-mocking-complete-guide', title: 'WireMock API Mocking Complete Guide' },
      { slug: 'mockoon-api-mocking-tool-guide', title: 'Mockoon API Mocking Tool Guide' },
      { slug: 'bruno-api-testing-complete-guide', title: 'Bruno API Testing Complete Guide' },
      { slug: 'postman-api-testing-guide', title: 'Postman API Testing Guide' },
      { slug: 'hoppscotch-api-testing-complete-guide', title: 'Hoppscotch API Testing Complete Guide' },
      { slug: 'api-contract-testing-microservices', title: 'API Contract Testing for Microservices' },
      { slug: 'openapi-contract-testing-guide', title: 'OpenAPI Contract Testing Guide' },
    ],
    faqs: [
      { q: 'REST Assured vs Karate?', a: 'REST Assured for pure Java code-first teams. Karate for Gherkin-readable scenarios + integrated mocking + perf in one tool.' },
      { q: 'Pact vs Spring Cloud Contract?', a: 'Pact for polyglot microservices (consumer-driven). Spring Cloud Contract for pure Spring Boot stacks (producer-driven).' },
      { q: 'WireMock vs Mockoon?', a: 'WireMock for JVM-embedded service virtualization + advanced fault injection. Mockoon for quick local mocking + frontend dev environments.' },
      { q: 'Postman vs Bruno vs Insomnia?', a: 'Postman for cloud-first collaboration. Bruno for git-first OSS. Insomnia between the two — feature-rich + local-first.' },
      { q: 'OpenAPI validation in CI?', a: 'Use Dredd, Spectral, or Pact Provider verification against the OpenAPI spec. Block PRs that break the contract.' },
      { q: 'gRPC testing?', a: 'WireMock + grpc-mock or Karate (with grpc extension). REST Assured does not support gRPC directly.' },
    ],
    ctaSkillSlug: 'thetestingacademy/api-testing-rest',
    ctaSkillLabel: 'Start with API Testing REST',
  },
  {
    slug: 'visual-regression',
    title: 'Best Visual Regression Testing Skills 2026',
    description:
      'Curated visual regression skills: Playwright Visual, Percy, Applitools, Chromatic, BackstopJS, cypress-image-snapshot. Install via npx qaskills add.',
    h1: 'Best Visual Regression Testing Skills 2026',
    intro:
      'Visual regression skills covering Playwright\'s native toHaveScreenshot, Percy + Cypress/Playwright integrations, Applitools Eyes AI, Chromatic for Storybook component review, BackstopJS for hand-crafted CSS-baked diffs, and cypress-image-snapshot. Detect UI regressions before they ship.',
    installCmd: `# Install visual regression skills
npx @qaskills/cli add playwright-visual-regression
npx @qaskills/cli add applitools-eyes
npx @qaskills/cli add chromatic-storybook`,
    filter: { type: 'testingType', value: 'visual' },
    valueProps: [
      { icon: 'zap', title: 'Pixel + AI diffs', body: 'Skills cover both pixel comparison (Percy) and AI-powered (Applitools).' },
      { icon: 'check', title: 'CI-ready', body: 'PR checks + approval workflows + baselines stored in git or cloud.' },
      { icon: 'star', title: 'Storybook-first', body: 'Chromatic skill ships component-level review tied to Storybook stories.' },
    ],
    relatedArticles: [
      { slug: 'visual-regression-testing-guide', title: 'Visual Regression Testing Guide' },
      { slug: 'applitools-visual-ai-testing-complete-guide', title: 'Applitools Visual AI Testing Guide' },
      { slug: 'percy-visual-testing-complete-guide', title: 'Percy Visual Testing Guide' },
      { slug: 'chromatic-storybook-visual-testing-guide', title: 'Chromatic + Storybook Visual Testing Guide' },
      { slug: 'playwright-visual-comparison-snapshots-guide', title: 'Playwright Visual Comparison Snapshots Guide' },
      { slug: 'cypress-percy-visual-testing-guide', title: 'Cypress + Percy Visual Testing Guide' },
      { slug: 'cypress-applitools-visual-testing-guide', title: 'Cypress + Applitools Visual Testing Guide' },
      { slug: 'cypress-image-snapshot-visual-guide', title: 'cypress-image-snapshot Visual Guide' },
    ],
    faqs: [
      { q: 'Playwright native visual or Percy/Applitools?', a: 'Native (toHaveScreenshot) for in-house simple baselines. Percy/Applitools for cross-browser cloud + approval workflows + AI diff.' },
      { q: 'Applitools vs Percy?', a: 'Applitools for lowest false positives via AI diff + Ultrafast Grid multi-browser. Percy for BrowserStack-integrated stacks + predictable pricing.' },
      { q: 'Chromatic vs Percy?', a: 'Chromatic is Storybook-first (component review). Percy is page-level E2E visual diffs.' },
      { q: 'BackstopJS?', a: 'OSS pixel comparison tool. Strong for hand-crafted CSS pixel-baked tests. Slower than commercial tools at scale.' },
      { q: 'Where do baselines live?', a: 'Native Playwright + cypress-image-snapshot: in git. Percy/Applitools/Chromatic: in cloud dashboards with approval workflow.' },
      { q: 'How to handle dynamic content?', a: 'Use ignore regions (Percy, Applitools), masking (Playwright), or stubs (Cypress intercept). Skills include patterns for common dynamic UI.' },
    ],
    ctaSkillSlug: 'thetestingacademy/playwright-visual-regression',
    ctaSkillLabel: 'Start with Playwright Visual',
  },
  {
    slug: 'mcp-testing',
    title: 'Best MCP Skills for Testing & QA 2026',
    description:
      'Model Context Protocol (MCP) skills for QA. Playwright MCP, MCP server setup, MCP-based agent workflows. Install via npx qaskills add.',
    h1: 'Best MCP Skills for Testing & QA 2026',
    intro:
      'Model Context Protocol (MCP) is Anthropic\'s open standard for connecting AI agents to tools, data sources, and APIs. These skills configure MCP servers and clients for QA testing — Playwright MCP, browser automation MCP, test result MCP, CI MCP. Install once, use across Claude Code, Cursor, Windsurf, Codex CLI.',
    installCmd: `# Install MCP testing skills
npx @qaskills/cli add playwright-mcp-claude
npx @qaskills/cli add mcp-server-skill-template

# Skill content includes mcp.json config + tool definitions`,
    filter: { type: 'tag', value: 'mcp' },
    valueProps: [
      { icon: 'zap', title: 'Cross-agent', body: 'MCP servers work in Claude Code, Cursor, Windsurf, Codex CLI — write once.' },
      { icon: 'check', title: 'Tool composability', body: 'Compose MCP servers (Playwright + GitHub + Jira) into agentic workflows.' },
      { icon: 'terminal', title: 'Standard protocol', body: 'JSON-RPC over stdio/SSE — open spec, vendor-neutral.' },
    ],
    relatedArticles: [
      { slug: 'mcp-for-qa-engineers-guide', title: 'MCP for QA Engineers Guide' },
      { slug: 'mcp-testing-automation-guide', title: 'MCP Testing Automation Guide' },
      { slug: 'playwright-mcp-browser-automation-guide', title: 'Playwright MCP Browser Automation Guide' },
      { slug: 'playwright-mcp-claude-code-setup-2026', title: 'Playwright MCP + Claude Code Setup 2026' },
      { slug: 'playwright-mcp-cursor-ide-setup-2026', title: 'Playwright MCP + Cursor IDE Setup 2026' },
      { slug: 'playwright-mcp-accessibility-snapshots-reference', title: 'Playwright MCP Accessibility Snapshots Reference' },
      { slug: 'playwright-mcp-server-configuration-2026', title: 'Playwright MCP Server Configuration 2026' },
    ],
    faqs: [
      { q: 'What is MCP?', a: 'Model Context Protocol — Anthropic\'s open standard for connecting AI agents to tools and data. Servers expose tools/resources; clients (agents) invoke them via JSON-RPC.' },
      { q: 'Which agents support MCP?', a: 'Claude Code, Cursor, Windsurf, Codex CLI, and many more (including custom agents via the official MCP SDK).' },
      { q: 'What is Playwright MCP?', a: 'An MCP server that exposes Playwright browser automation as MCP tools — navigate, click, screenshot, evaluate. Lets AI agents drive a real browser.' },
      { q: 'How do I install an MCP testing skill?', a: 'Run `npx @qaskills/cli add <skill-name>`. Skill includes mcp.json config snippet that you copy into your agent\'s MCP settings.' },
      { q: 'Cursor + MCP?', a: 'Yes — Cursor supports MCP via /mcp config. Add server entry pointing to a Playwright MCP server binary.' },
      { q: 'Free?', a: 'Yes — MCP is OSS spec, MCP servers are OSS, QASkills.sh skills are MIT.' },
    ],
    ctaSkillLabel: 'Start with Playwright MCP Skill',
  },
];

export function findHub(slug: string): HubEntry | undefined {
  return HUBS.find((h) => h.slug === slug);
}

export function allHubSlugs(): string[] {
  return HUBS.map((h) => h.slug);
}

import { sql, type SQL } from 'drizzle-orm';
import { skills } from '@/db/schema';

export function buildHubFilter(filter: SkillFilter): SQL {
  const value = JSON.stringify([filter.value]);
  switch (filter.type) {
    case 'agent':
      return sql`${skills.agents} @> ${value}::jsonb`;
    case 'framework':
      return sql`${skills.frameworks} @> ${value}::jsonb`;
    case 'testingType':
      return sql`${skills.testingTypes} @> ${value}::jsonb`;
    case 'tag':
      return sql`${skills.tags} @> ${value}::jsonb`;
  }
}
