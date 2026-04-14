import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md Format: The Universal Standard for AI Agent Skills',
  description:
    'Learn the SKILL.md format specification for creating AI agent skills. This tutorial covers the complete frontmatter schema, markdown body structure, validation rules, publishing workflow, and the QASkills ecosystem for sharing testing skills across AI coding agents.',
  date: '2026-04-13',
  category: 'Tutorial',
  content: `
AI coding agents are only as effective as the knowledge they have access to. While general-purpose LLMs know a lot about software development, they lack the deep, specialized expertise that distinguishes a senior QA engineer from someone who just read the Playwright documentation. The SKILL.md format was created to solve this problem: a standardized way to encode expert knowledge into a portable, installable file that any AI coding agent can consume.

This tutorial covers everything you need to know about the SKILL.md format. We start with what the format is and why it exists, walk through the complete specification including every frontmatter field and validation rule, guide you through creating your first skill, explain how to publish it to the QASkills registry, and explore the broader ecosystem of tools and integrations built around this standard.

## Key Takeaways

- SKILL.md is a markdown file with YAML frontmatter that encodes domain-specific expertise in a format any AI coding agent can install and use
- The frontmatter contains structured metadata (name, version, tags, compatible agents, frameworks, languages) while the markdown body contains the actual knowledge, patterns, and instructions
- Validation is enforced by Zod schemas in the shared package, ensuring every published skill meets quality and consistency standards
- Skills are installed with a single CLI command and automatically placed in the correct configuration directory for each supported AI agent
- The format supports 30+ AI coding agents including Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, and many more
- Publishing a skill to the QASkills registry makes it discoverable to thousands of developers and QA engineers worldwide

---

## What Is SKILL.md

A SKILL.md file is a plain text document that combines two things: structured metadata in YAML frontmatter and expert knowledge in markdown. The metadata tells the ecosystem what the skill is, who made it, what tools and languages it covers, and which AI agents can use it. The markdown body contains the actual instructions, patterns, examples, and best practices that the AI agent will follow when the skill is active.

The format draws inspiration from several existing standards. MDX and frontmatter-based content systems from the Jamstack world. Package manifests like package.json and pyproject.toml. Configuration-as-code approaches from tools like Terraform and Kubernetes. The goal was to create something that is human-readable, machine-parseable, version-controllable, and simple enough that anyone with a text editor can create one.

### Why Not Just Use a Prompt File

A reasonable question is why not just paste instructions into a text file and tell the AI agent to read it. The answer is that raw prompt files lack the metadata needed for discovery, validation, compatibility checking, and ecosystem tooling. Without structured metadata, there is no way to search for skills by framework or language, no way to verify that a skill is compatible with your agent, no way to enforce quality standards, and no way to build an ecosystem of shared knowledge around it.

SKILL.md gives you the simplicity of a text file with the power of a structured package format.

### The Architecture

The SKILL.md format is defined and validated by the \`@qaskills/shared\` package, which is the single source of truth for the type system across the entire QASkills ecosystem. The shared package exports:

- **TypeScript types**: \`SkillFrontmatter\`, \`Skill\`, \`SkillSummary\`, \`SkillCreate\`
- **Zod schemas**: Validation rules for every frontmatter field
- **Parsers**: \`parseSkillMd()\` and \`serializeSkillMd()\` functions using gray-matter for YAML parsing
- **Constants**: Lists of supported agents, frameworks, languages, domains, and testing types

The validation pipeline works like this:

1. A SKILL.md file is read from disk
2. \`parseSkillMd()\` extracts the YAML frontmatter and markdown body using gray-matter
3. The frontmatter is validated against the \`SkillFrontmatter\` Zod schema
4. If publishing, additional fields are validated via the \`SkillCreate\` schema
5. The skill is stored in the database with the markdown body in the \`fullDescription\` column

---

## The Complete Frontmatter Specification

Every SKILL.md file begins with a YAML frontmatter block delimited by triple dashes. Here is a comprehensive example showing all available fields:

\`\`\`yaml
---
name: "Playwright E2E Testing"
description: "Expert Playwright end-to-end testing patterns with Page Object Model, fixtures, auto-waiting locators, and CI/CD integration for robust browser automation."
version: "1.2.0"
author: "QASkills Team"
tags:
  - playwright
  - e2e
  - browser-testing
  - page-object-model
  - fixtures
testingTypes:
  - e2e
  - integration
  - visual-regression
frameworks:
  - playwright
  - playwright-test
languages:
  - typescript
  - javascript
domains:
  - web
  - frontend
agents:
  - claude-code
  - cursor
  - github-copilot
  - windsurf
  - cline
---
\`\`\`

Let us examine each field in detail.

### name (required)

The human-readable name of the skill. Must be between 1 and 100 characters. This is what users see when browsing the skills directory or search results. Choose a name that is descriptive and includes the primary technology or pattern covered by the skill.

Good examples: "Playwright E2E Testing", "pytest Fixtures and Parametrize", "API Contract Testing with Pact"

Poor examples: "Testing Skill", "My Skill", "v2 updated"

### description (required)

A concise summary of what the skill teaches an AI agent to do. Must be between 10 and 500 characters. This appears in search results and skill cards, so it needs to convey value quickly. Include the key technologies, patterns, and outcomes.

### version (required)

A semantic version string following the semver convention (MAJOR.MINOR.PATCH). Increment the major version for breaking changes to the skill structure, minor version for new patterns or capabilities, and patch version for corrections and clarifications.

### author (required)

The name or handle of the skill creator. This is displayed on the skill detail page and in search results.

### tags (required)

An array of lowercase, hyphenated strings that help users discover the skill. Tags are used for filtering and search. Include the primary technology, testing approach, and key patterns. There is no hard limit on the number of tags, but 3 to 8 is the sweet spot for discoverability without dilution.

### testingTypes (required, minimum 1)

An array specifying the types of testing the skill covers. Must include at least one entry. Valid values are drawn from the constants defined in the shared package and include: unit, integration, e2e, api, performance, security, accessibility, visual-regression, contract, smoke, regression, load, stress, chaos, mobile, database, and more.

### frameworks (optional)

An array of testing frameworks the skill is designed for. Examples include: playwright, playwright-test, cypress, selenium, jest, vitest, pytest, junit, testng, mocha, and many others. When a user searches for skills by framework, this field determines which skills appear.

### languages (required, minimum 1)

An array of programming languages the skill supports. Must include at least one. Examples: typescript, javascript, python, java, csharp, ruby, go, php, kotlin, swift.

### domains (optional)

An array of application domains the skill is relevant to. Examples: web, frontend, backend, mobile, api, microservices, cloud, devops, data, ml.

### agents (optional)

An array of AI coding agent identifiers that the skill is compatible with. The shared package defines 30+ agent constants, each with specific configuration directories, skills directories, and installation methods. Examples: claude-code, cursor, github-copilot, windsurf, cline, aider, continue, tabnine, amazon-q, sourcegraph-cody.

When this field is omitted, the skill is assumed to be compatible with all agents. When specified, the CLI uses this information to determine where to install the skill file for each detected agent.

---

## The Markdown Body

Everything after the closing frontmatter delimiter (\`---\`) is the markdown body. This is where the actual skill content lives -- the expert knowledge, patterns, examples, and instructions that the AI agent will internalize.

### Structure Best Practices

The most effective skills follow a consistent structure:

**1. Overview Section**

Start with a brief explanation of what the skill covers and why it matters. This gives the AI agent context for when and how to apply the knowledge.

**2. Core Patterns**

Present the fundamental patterns and approaches as clear, actionable instructions. Use imperative language ("Always use", "Never do", "Prefer X over Y") because AI agents respond well to direct instructions.

**3. Code Examples**

Include practical code examples that demonstrate each pattern. Use fenced code blocks with language identifiers for proper syntax highlighting. Examples should be complete enough to be useful but concise enough to be digestible.

**4. Anti-Patterns**

Explicitly call out common mistakes and what to do instead. AI agents benefit enormously from knowing what NOT to do, because their training data includes plenty of bad practices that they might otherwise reproduce.

**5. Decision Framework**

When the skill covers a domain where multiple approaches are valid (for example, when to use page objects versus direct selectors), provide a decision framework that helps the AI agent choose the right approach based on context.

**6. Configuration and Setup**

Include any configuration patterns, file structure conventions, or setup instructions that the skill assumes.

### Markdown Features

The body supports standard GitHub-flavored markdown including:

- Headings (h1 through h6)
- Bold, italic, and strikethrough text
- Ordered and unordered lists
- Fenced code blocks with syntax highlighting
- Tables
- Links and images
- Blockquotes
- Horizontal rules
- Task lists

The markdown is rendered on skill detail pages using react-markdown with remark-gfm and rehype-sanitize for XSS protection.

---

## Creating Your First Skill

Let us walk through creating a complete skill from scratch. We will build a skill for API testing with Playwright that teaches AI agents to use the APIRequestContext for REST API testing.

### Step 1: Initialize the Skill

Create a new directory and SKILL.md file:

\`\`\`bash
mkdir playwright-api-testing
cd playwright-api-testing
touch SKILL.md
\`\`\`

Alternatively, use the QASkills CLI to scaffold:

\`\`\`bash
npx @qaskills/cli init
\`\`\`

The init command walks you through an interactive prompt to set up the frontmatter fields.

### Step 2: Write the Frontmatter

Open SKILL.md and add the metadata:

\`\`\`yaml
---
name: "Playwright API Testing"
description: "Expert patterns for API testing with Playwright APIRequestContext including REST endpoints, authentication flows, request chaining, and response validation."
version: "1.0.0"
author: "Your Name"
tags:
  - playwright
  - api-testing
  - rest
  - http
  - request-context
testingTypes:
  - api
  - integration
frameworks:
  - playwright
  - playwright-test
languages:
  - typescript
  - javascript
domains:
  - api
  - backend
  - web
agents:
  - claude-code
  - cursor
  - github-copilot
---
\`\`\`

### Step 3: Write the Body

Below the frontmatter, write the expert knowledge:

\`\`\`markdown
# Playwright API Testing Patterns

## Overview

Use Playwright APIRequestContext for API testing instead of external HTTP
libraries. This gives you shared authentication state with browser tests,
built-in request logging, and automatic base URL handling.

## Core Patterns

### Always Use Request Fixtures

Create a shared API request fixture that handles authentication:

- Use playwright.config.ts to define baseURL for API endpoints
- Create custom fixtures that extend the base test with authenticated
  API request contexts
- Share authentication state between API and browser tests

### Response Validation

Always validate both status codes and response body structure:

- Check status codes explicitly, do not rely on implicit assertions
- Validate response JSON schema for critical endpoints
- Use toMatchObject for partial response matching
- Store response data for use in subsequent requests

### Request Chaining

For multi-step API workflows:

- Create helper functions that return typed response data
- Use test.step() to group related API calls
- Clean up test data in afterEach hooks via API calls

## Anti-Patterns

- Never use node-fetch or axios when Playwright APIRequestContext is
  available
- Never hardcode authentication tokens in test files
- Never skip response status validation even for setup requests
- Avoid sharing mutable state between parallel test workers
\`\`\`

### Step 4: Validate the Skill

Use the skill validator to check your file:

\`\`\`bash
npx @qaskills/cli publish --dry-run
\`\`\`

This runs the Zod schema validation against your frontmatter and reports any issues without actually publishing.

### Step 5: Test Locally

Install the skill into your local AI agent to verify it works:

\`\`\`bash
npx @qaskills/cli add ./playwright-api-testing
\`\`\`

The CLI detects which AI agents you have installed and places the SKILL.md file in each agent's skills directory. For Claude Code, this is typically the \`.claude/\` directory. For Cursor, it is \`.cursor/rules/\`.

---

## Publishing to the QASkills Registry

Once your skill is tested and ready, publish it to make it available to the community.

### Prerequisites

You need a QASkills account. Visit [qaskills.sh](https://qaskills.sh) and sign up. Authentication is handled through Clerk.

### The Publishing Flow

\`\`\`bash
# Authenticate with the registry
npx @qaskills/cli login

# Publish your skill
npx @qaskills/cli publish
\`\`\`

The publish command:

1. Reads and parses your SKILL.md file
2. Validates frontmatter against the SkillCreate Zod schema
3. Extracts the markdown body as fullDescription
4. Uploads the skill to the QASkills API
5. Returns the URL of your published skill

### Quality Standards

Published skills are expected to meet certain quality standards:

- **Completeness**: The description should accurately reflect the body content. A skill that promises Playwright API testing patterns should actually contain those patterns
- **Accuracy**: Code examples should be correct and follow current best practices for the framework version
- **Actionability**: Instructions should be specific enough that an AI agent can follow them. Vague guidance like "write good tests" is not helpful
- **Uniqueness**: The skill should provide value that is not already covered by existing skills in the registry

### Quality Score

Each skill receives a quality score calculated by the \`calculateQualityScore()\` utility in the shared package. The score considers:

- Completeness of frontmatter fields
- Length and depth of the markdown body
- Presence of code examples
- Number of sections and subsections
- Tag relevance and coverage

Higher quality scores result in better visibility in search results and the skills directory.

---

## How Installation Works

Understanding the installation process helps you write skills that work well across all supported agents.

### Agent Detection

When you run \`npx @qaskills/cli add <skill>\`, the CLI first detects which AI coding agents are installed on your machine. The agent detector (\`agent-detector.ts\`) probes 30+ known configuration paths:

- Claude Code: \`~/.claude/\` (global) or \`.claude/\` (project)
- Cursor: \`~/.cursor/rules/\` (global) or \`.cursor/rules/\` (project)
- GitHub Copilot: \`~/.github/copilot/\` or \`.github/copilot-instructions.md\`
- Windsurf: \`~/.windsurf/rules/\` or \`.windsurf/rules/\`
- Cline: \`~/.cline/rules/\` or \`.cline/rules/\`

Each agent has specific conventions for where skill files should be placed and how they are named.

### Skill Resolution

The CLI resolves skills from multiple sources using a three-tier fallback:

1. **Registry**: If the skill name matches a published skill, download it from the QASkills API
2. **GitHub**: If a GitHub URL is provided, clone the repository and extract the SKILL.md
3. **Local**: If a local path is provided, read the SKILL.md file directly

### File Placement

Once resolved, the SKILL.md file is placed in the correct directory for each detected agent. The agent constants in the shared package define the exact paths:

\`\`\`bash
# Claude Code (project scope)
.claude/skills/playwright-api-testing/SKILL.md

# Cursor (project scope)
.cursor/rules/playwright-api-testing.md

# GitHub Copilot
.github/copilot-instructions.md  (appended)
\`\`\`

The installation method varies by agent. Some agents support dedicated skill directories (Claude Code, Cursor), while others use a single instructions file that skills are appended to (GitHub Copilot).

---

## The Ecosystem

The SKILL.md format is the foundation for a growing ecosystem of tools and integrations.

### QASkills CLI

The primary tool for discovering, installing, and publishing skills. Commands include:

- \`search\` -- Find skills by keyword, framework, language, or testing type
- \`add\` -- Install a skill from the registry, GitHub, or local path
- \`list\` -- Show installed skills for each detected agent
- \`remove\` -- Uninstall a skill
- \`publish\` -- Upload a skill to the registry
- \`init\` -- Scaffold a new SKILL.md with interactive prompts
- \`info\` -- Display detailed information about a skill
- \`update\` -- Update installed skills to latest versions

### QASkills SDK

The TypeScript SDK (\`@qaskills/sdk\`) provides programmatic access to the registry for building custom integrations. Use it to search for skills, fetch skill content, and manage installations from your own tools.

### QASkills Web

The web dashboard at [qaskills.sh](https://qaskills.sh) provides a visual interface for browsing, searching, and discovering skills. It includes detailed skill pages with rendered markdown, compatibility information, installation counts, reviews, and quality scores.

### Skill Validator

The \`@qaskills/skill-validator\` package provides standalone validation for SKILL.md files. Use it in CI/CD pipelines to validate skills before publishing, or integrate it into custom tooling.

### Seed Skills

The repository includes 300+ seed skills in the \`seed-skills/\` directory. These serve as reference implementations and cover major testing frameworks, patterns, and domains. Study them to understand what makes a high-quality skill.

---

## Advanced Patterns

### Multi-Framework Skills

Some skills cover patterns that span multiple frameworks. For example, a skill about page object model patterns might include examples for Playwright, Cypress, and Selenium. In these cases, use broad \`frameworks\` and \`languages\` arrays and organize the markdown body with clear sections for each framework.

### Skill Packs

Skill packs are curated collections of related skills that install together. For example, a "Full Stack Testing" pack might include skills for E2E testing, API testing, unit testing, and performance testing. Packs are defined in the database and displayed on the QASkills web dashboard.

### Version Management

When updating a published skill, increment the version following semver:

- **Patch (1.0.0 to 1.0.1)**: Fix typos, correct code examples, clarify instructions
- **Minor (1.0.0 to 1.1.0)**: Add new patterns, cover additional use cases, expand examples
- **Major (1.0.0 to 2.0.0)**: Restructure the skill, change the fundamental approach, remove deprecated patterns

### Localization

While the current ecosystem primarily supports English, the SKILL.md format does not restrict language. Skills can be written in any language, and the frontmatter fields remain in English for ecosystem compatibility.

---

## Troubleshooting Common Issues

### Validation Errors

If \`npx @qaskills/cli publish --dry-run\` reports validation errors, check:

- **Missing required fields**: Ensure name, description, version, author, tags, testingTypes, and languages are all present
- **Invalid version format**: Version must follow semver (e.g., "1.0.0", not "v1" or "1.0")
- **Empty arrays**: testingTypes and languages must have at least one entry
- **Character limits**: name (1-100 chars), description (10-500 chars)

### Agent Not Detected

If the CLI does not detect your AI agent:

- Ensure the agent is installed and has been run at least once (which creates the config directory)
- Check that the config directory exists at the expected path
- For project-scope installation, ensure you are running the CLI from the project root

### Skill Not Loading in Agent

If your AI agent does not seem to use the installed skill:

- Verify the file was placed in the correct directory for your agent
- Check that the file name and extension match what the agent expects
- Restart the agent or reload the workspace after installation
- Some agents require explicit skill activation in their settings

---

## What Makes a Great Skill

After reviewing hundreds of published skills, several patterns distinguish the most effective ones:

1. **Specificity over breadth**: A skill that deeply covers Playwright API testing is more useful than one that superficially covers all testing types
2. **Actionable instructions**: Direct, imperative statements that the AI agent can follow immediately
3. **Real code examples**: Complete, working examples that demonstrate patterns in context
4. **Anti-patterns**: Explicitly stating what NOT to do prevents common AI mistakes
5. **Decision frameworks**: Helping the AI agent choose between approaches based on context
6. **Current practices**: Using the latest APIs and patterns for the frameworks covered

## Getting Started

Ready to create your first skill or install existing ones? Start with the QASkills CLI:

\`\`\`bash
# Browse available skills
npx @qaskills/cli search

# Install a skill
npx @qaskills/cli add playwright-e2e

# Create your own skill
npx @qaskills/cli init
\`\`\`

Explore the full skills directory at [qaskills.sh/skills](/skills) and join the community of QA engineers building the future of AI-powered testing.
`,
};
