import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'The Complete AI QA Skills Directory: 450+ Skills for Every Agent',
  description:
    'Explore the QASkills ecosystem with 450+ testing skills for AI coding agents. Learn skill categories, installation methods, top skills by category, agent compatibility, and how to publish your own.',
  date: '2026-03-24',
  category: 'Guide',
  content: `
## The Rise of AI-Powered QA Skills

The way software teams approach quality assurance has fundamentally changed. AI coding agents like Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, and others have moved beyond simple code completion into full-fledged development partners that can write tests, debug failures, and set up entire testing frameworks. But these agents are only as effective as the instructions they receive.

That is where QA skills come in. A QA skill is a structured set of instructions, packaged as a SKILL.md file, that tells an AI agent exactly how to perform a specific testing task. Think of skills as expert playbooks: they encode the knowledge of senior QA engineers into a format that any AI agent can follow consistently.

The QASkills directory has grown to over 450 skills covering every major testing discipline, framework, and language. This guide walks you through the ecosystem, helps you find the right skills for your stack, and shows you how to contribute your own.

## What Is a QA Skill?

A QA skill is a markdown file with YAML frontmatter that follows a standardized schema. The frontmatter contains metadata like the skill name, compatible agents, supported languages, testing types, and frameworks. The markdown body contains the actual instructions the AI agent will follow.

Here is the basic structure:

\`\`\`yaml
---
name: "Playwright E2E Testing"
description: "Write end-to-end tests using Playwright"
version: "1.0.0"
author: "your-name"
tags:
  - playwright
  - e2e
  - browser-testing
testingTypes:
  - e2e
frameworks:
  - playwright
languages:
  - typescript
  - javascript
agents:
  - claude-code
  - cursor
  - copilot
---
\`\`\`

Below the frontmatter, the skill body contains detailed instructions organized as markdown. The best skills include context about when to use the approach, step-by-step implementation guidance, code patterns, configuration examples, and common pitfalls to avoid.

## Skill Categories Breakdown

The QASkills directory organizes skills into categories that map to the testing disciplines teams use every day.

### End-to-End Testing

E2E testing skills are the largest category, with skills for Playwright, Cypress, Selenium, Puppeteer, and browser-specific tools. These skills guide agents through writing tests that exercise your application from the user's perspective, covering navigation, form interactions, authentication flows, and API-driven UI verification.

Popular E2E skills include cross-browser testing configurations, visual regression setups, and mobile viewport testing patterns.

### Unit Testing

Unit testing skills cover framework-specific patterns for Jest, Vitest, pytest, JUnit, NUnit, PHPUnit, and many others. They teach agents how to structure test files, use assertion libraries, mock dependencies, and achieve meaningful code coverage without over-testing implementation details.

### API Testing

API testing skills focus on REST and GraphQL testing with tools like Supertest, Postman/Newman, RestAssured, and built-in HTTP clients. They cover request validation, response schema checking, authentication flows, rate limiting verification, and contract testing.

### Performance Testing

Performance skills cover load testing with k6, JMeter, Artillery, and Locust. They help agents write realistic load scenarios, define performance budgets, set up monitoring, and interpret results.

### Security Testing

Security-focused skills guide agents through OWASP testing patterns, dependency scanning, static analysis, secret detection, and security header validation. These are particularly valuable because security testing is often overlooked and the rules are nuanced.

### Accessibility Testing

Accessibility skills help agents integrate tools like axe-core, pa11y, and Lighthouse into test suites. They cover WCAG compliance checking, keyboard navigation testing, screen reader compatibility, and color contrast validation.

### Mobile Testing

Mobile testing skills support Appium, Detox, Maestro, and XCUITest. They address device-specific behaviors, gesture testing, deep linking, push notification verification, and platform-specific UI patterns.

### CI/CD Integration

CI/CD skills help agents configure testing pipelines in GitHub Actions, GitLab CI, CircleCI, and Jenkins. They cover parallel test execution, test splitting, artifact management, and deployment gates.

## How to Install Skills

QASkills provides multiple ways to install skills into your development environment.

### Using the CLI

The QASkills CLI is the primary installation method. Install it globally:

\`\`\`bash
npm install -g qaskills
\`\`\`

Then add skills to your project:

\`\`\`bash
# Search for skills
qaskills search "playwright e2e"

# Install a skill by slug
qaskills add playwright-e2e-testing

# List installed skills
qaskills list

# Remove a skill
qaskills remove playwright-e2e-testing
\`\`\`

The CLI automatically detects which AI agents you have installed and places the skill file in the correct configuration directory.

### Agent Detection

When you run \`qaskills add\`, the CLI probes your system for known agent configuration directories. It supports over 30 agents, detecting both global installations and project-level configurations. For example:

- Claude Code: \`.claude/\` directory
- Cursor: \`.cursor/rules/\` directory
- GitHub Copilot: \`.github/copilot-instructions.md\`
- Windsurf: \`.windsurfrules/\` directory
- Cline: \`.cline/\` directory

### Manual Installation

You can also browse the QASkills website and copy skill content directly into your agent's configuration directory. Each skill page shows the raw SKILL.md content that you can download or copy.

### Programmatic Access via SDK

For tool builders and CI pipelines, the QASkills SDK provides programmatic access:

\`\`\`typescript
import { QASkills } from '@qaskills/sdk';

const client = new QASkills();

// Search for skills
const results = await client.search({
  query: 'react testing',
  languages: ['typescript'],
  testingTypes: ['unit'],
});

// Get a specific skill
const skill = await client.getSkill('react-testing-library-guide');
\`\`\`

## Top Skills by Category

### Best E2E Testing Skills

The most popular E2E testing skills focus on Playwright and Cypress, the two dominant browser automation frameworks. The Playwright skills cover the Page Object Model, API mocking, visual comparisons, and multi-browser configuration. Cypress skills address custom commands, component testing, and network stubbing.

### Best Unit Testing Skills

Unit testing skills for React Testing Library, Vitest, and Jest are consistently among the most installed. They teach agents to write tests that focus on user behavior rather than implementation details, structure test files with clear arrange-act-assert patterns, and use appropriate mocking strategies.

### Best API Testing Skills

API testing skills for contract testing (OpenAPI and Pact), REST endpoint validation, and GraphQL query testing are heavily used by teams building microservices. They guide agents through schema validation, authentication flow testing, and error response verification.

### Best Performance Testing Skills

The most popular performance skills center on k6, which has become the preferred tool for developer-centric load testing. These skills help agents write realistic virtual user scenarios, define SLOs, and integrate performance checks into CI pipelines.

## Agent Compatibility

Not all agents work the same way. QASkills includes agent compatibility metadata on every skill so you can quickly filter for skills that work with your tool.

### Claude Code

Claude Code reads skills from the \`.claude/\` directory. Skills are loaded as context when Claude processes your requests. Claude Code supports the full richness of SKILL.md files, including long-form instructions, code examples, and multi-step workflows.

### Cursor

Cursor uses \`.cursor/rules/\` for project-level rules. QASkills installs skills as rule files that Cursor references during code generation. Cursor works well with concise, pattern-focused skills.

### GitHub Copilot

GitHub Copilot reads instructions from \`.github/copilot-instructions.md\`. QASkills appends skill content to this file. Since Copilot has a more limited context window for instructions, skills optimized for Copilot tend to be more concise.

### Windsurf

Windsurf uses the \`.windsurfrules/\` directory. Like Cursor, it picks up rule files automatically. Windsurf skills work well with structured, directive-style instructions.

### Cline

Cline reads from the \`.cline/\` directory and supports detailed, multi-step instructions. Skills for Cline can include complex workflows with conditional logic.

### Cross-Agent Skills

Many skills in the directory are compatible with all major agents. The skill metadata includes an \`agents\` array listing every compatible agent, so you can filter by your specific tool.

## How to Publish Your Own Skill

Contributing to the QASkills directory is straightforward. Whether you have deep expertise in a niche testing tool or a novel approach to a common testing problem, the community benefits from shared knowledge.

### Step 1: Create Your SKILL.md File

Start by creating a SKILL.md file following the standard schema. Use the CLI to scaffold one:

\`\`\`bash
qaskills init my-testing-skill
\`\`\`

This creates a template SKILL.md with all required frontmatter fields.

### Step 2: Write Quality Instructions

The best skills share several characteristics:

- **Clear context**: Explain when and why to use this testing approach
- **Step-by-step guidance**: Walk the agent through setup, writing tests, and running them
- **Code examples**: Include realistic, copy-pasteable code patterns
- **Configuration files**: Show the complete configuration needed
- **Common pitfalls**: Warn about frequent mistakes and how to avoid them
- **Best practices**: Encode the wisdom of experienced practitioners

### Step 3: Validate Your Skill

Use the skill validator to check your file against the schema:

\`\`\`bash
qaskills validate my-skill/SKILL.md
\`\`\`

The validator checks that all required fields are present, values are within allowed ranges, and the markdown body is non-empty.

### Step 4: Publish

Publish your skill to the QASkills registry:

\`\`\`bash
qaskills publish my-skill/SKILL.md
\`\`\`

This uploads your skill to the directory where it becomes searchable and installable by the community. Published skills appear on the QASkills website with their own detail page, install instructions, and compatibility information.

### Quality Score

Every published skill receives a quality score based on factors like description completeness, the number of supported agents, tag coverage, and body length. Higher quality scores lead to better visibility in search results.

## Skill Packs

For teams adopting AI-powered testing across multiple disciplines, QASkills offers Skill Packs: curated bundles of related skills that can be installed together.

Example packs include:

- **Full Stack Testing Pack**: Unit, integration, E2E, and API testing skills for a complete TypeScript/React/Node stack
- **Python QA Starter Pack**: pytest, API testing, and CI/CD skills for Python projects
- **Mobile Testing Pack**: Appium, Detox, and accessibility skills for mobile development
- **Security Testing Pack**: OWASP, dependency scanning, and secrets detection skills

Install a pack with a single command:

\`\`\`bash
qaskills add --pack full-stack-testing
\`\`\`

## The Future of AI-Powered Testing

The QA skills ecosystem is evolving rapidly. Several trends are shaping where things are headed.

### Autonomous Testing Agents

AI agents are moving beyond following instructions to autonomously identifying what needs testing. Skills are evolving to provide higher-level strategies rather than step-by-step recipes, giving agents more room to apply testing principles to novel situations.

### Self-Healing Tests

Skills increasingly include patterns for making tests resilient to UI changes. Techniques like semantic selectors, AI-powered element matching, and fallback strategies help agents write tests that survive routine application updates.

### Shift-Left Quality

Skills are expanding beyond traditional post-development testing into design-time quality checks, requirement validation, and code review assistance. The boundary between writing code and testing code continues to blur.

### Community Growth

The directory grows daily as practitioners contribute skills from diverse domains: embedded systems testing, data pipeline validation, ML model testing, infrastructure testing, and more. Every new skill makes the entire ecosystem more valuable.

## Getting Started

If you are new to QA skills, here is the fastest path to value:

1. **Install the CLI**: \`npm install -g qaskills\`
2. **Search for your stack**: \`qaskills search "your-framework"\`
3. **Install a top-rated skill**: \`qaskills add skill-slug\`
4. **Ask your AI agent to write tests**: The skill provides the context needed for high-quality output
5. **Iterate and improve**: Customize installed skills to match your team's conventions

The QASkills directory exists to bridge the gap between AI agent capabilities and QA expertise. By encoding testing knowledge into a standardized, shareable format, we make it possible for every developer to benefit from the collective wisdom of the QA community, amplified by AI.

## Conclusion

With over 450 skills covering every major testing discipline, framework, language, and AI agent, the QASkills directory is the most comprehensive resource for AI-powered quality assurance. Whether you are a solo developer adding tests to a side project or a QA lead standardizing practices across a large team, there is a skill that fits your needs.

The directory is open and growing. Every skill you install makes your AI agent smarter about testing. Every skill you publish helps another developer ship with more confidence. Browse the directory at qaskills.sh, install the CLI, and start building a testing culture powered by AI.
`,
};
