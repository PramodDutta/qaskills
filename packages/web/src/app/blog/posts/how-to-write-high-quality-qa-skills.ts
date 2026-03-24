import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Write High-Quality QA Skills: Publisher Guide for AI Agents',
  description:
    'Publisher guide for creating high-quality QA skills for AI agents. Covers SKILL.md structure, frontmatter design, examples, anti-patterns, framework specificity, and how to publish better testing skills on QASkills.sh.',
  date: '2026-03-24',
  category: 'Guide',
  content: `
Publishing a QA skill is not the same as writing documentation. A good skill changes how an AI agent behaves. It gives the agent a repeatable decision framework, a vocabulary for testing tradeoffs, and framework-specific patterns that show up directly in generated output.

That is why high-quality skills are unusually valuable. They do not just explain testing. They **transfer testing judgment**.

This guide explains how to write QA skills that are specific, reusable, and genuinely useful for AI agents on [QASkills.sh](/skills).

## Key Takeaways

- A strong QA skill is **specific to a framework, testing type, or workflow**, not generic advice pasted into markdown
- The best skills combine **principles, project structure, code examples, anti-patterns, and decision rules**
- YAML frontmatter matters because it helps with **discovery, categorization, and compatibility**
- A skill should teach an agent **how to choose**, not just what commands exist
- You can publish skills through the [publisher flow](/how-to-publish) once the content is structured and reviewed

---

## What a QA Skill Is Really Supposed to Do

A QA skill should help an AI agent answer questions like:

- Which test layer is appropriate here?
- What selectors are preferred in this framework?
- How should files be organized?
- What anti-patterns should be avoided?
- What does good output look like for this tool stack?

If your skill does not influence those decisions, it is probably too generic.

## The Anatomy of a Good Skill

Every strong skill has two parts:

1. **Frontmatter** for metadata and discoverability
2. **Body content** for the behavioral guidance the agent will actually use

### Frontmatter Should Be Clean and Accurate

Your metadata should make the skill easy to search, install, and categorize:

\`\`\`yaml
---
name: Cypress E2E Testing
description: Production-grade Cypress patterns for E2E and component testing.
version: 1.0.0
author: your-name
license: MIT
tags: [cypress, e2e, component-testing]
testingTypes: [e2e]
frameworks: [cypress]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, cline]
---
\`\`\`

Bad metadata creates two problems:

- users cannot find the skill
- agents get mixed signals about what the skill actually covers

### The Body Should Teach Actionable Patterns

A high-quality skill usually includes:

- core principles
- preferred project structure
- framework-specific code examples
- selector hierarchy or assertion strategy
- setup and teardown patterns
- negative guidance for what not to do
- review checklist or quality bar

The goal is not to be exhaustive about everything. The goal is to be precise about the patterns that matter most.

## What Makes a Skill High Quality

### 1. It Is Narrow Enough to Be Useful

Skills that try to cover "all QA best practices" usually become vague. Better examples:

- Playwright E2E testing
- REST Assured API testing
- visual regression workflows
- test data factory patterns
- authentication testing

Narrow scope improves output quality because the agent gets a clearer decision boundary.

### 2. It Includes Real Examples

Agents learn better from examples than from abstract advice alone. If your skill says "use Page Object Model," show:

- folder structure
- a base page example
- a concrete page object
- a test using it correctly

This gives the agent something it can mirror.

### 3. It Contains Anti-Patterns

Negative guidance is one of the highest-leverage parts of a skill. Examples:

- do not use \`waitForTimeout\` unless debugging
- do not hard-code test data in multiple files
- do not rely on execution order
- do not use raw CSS or XPath when semantic selectors exist

Without anti-patterns, the agent tends to fill gaps with whatever generic habits it already has.

### 4. It Encodes Tradeoffs

The best skills help the agent choose between alternatives:

- when to use API tests instead of E2E tests
- when to mock versus call a real dependency
- when to create a custom command versus a helper function
- when a visual assertion is worth the maintenance cost

This is what turns a skill from a static reference into a decision aid.

## Common Mistakes Skill Authors Make

- Writing only motivational text with no implementation detail
- Covering too many frameworks in one skill
- Including outdated code snippets with weak practices
- Forgetting failure paths and negative testing
- Using vague phrases like "write robust tests" without showing how
- Omitting installation, usage, or project structure guidance

If a junior engineer cannot predict what better output the agent will generate after reading the skill, the skill is probably not finished.

## A Useful Writing Template

This structure works well for most QA skills:

1. Purpose and scope
2. Core principles
3. Project structure
4. Recommended patterns
5. Code examples
6. Anti-patterns to avoid
7. Review checklist
8. Optional advanced scenarios

That gives the agent both the "why" and the "how."

## How to Evaluate Your Draft Skill

Before publishing, review it against this checklist:

| Question | Why It Matters |
|---------|----------------|
| **Is the scope clear?** | Prevents vague, mixed guidance |
| **Are examples realistic?** | Improves generated output quality |
| **Are anti-patterns explicit?** | Reduces generic bad habits |
| **Are testing types and frameworks tagged correctly?** | Helps discovery and compatibility |
| **Would two different agents behave more consistently after reading this?** | Measures actual usefulness |

## Publishing on QASkills.sh

Once the skill is ready, you can publish it through the site:

- read the [how to publish guide](/how-to-publish)
- validate the frontmatter carefully
- make sure descriptions are concise and searchable
- include enough body content for the skill to be genuinely useful

The strongest published skills are not the longest. They are the clearest.

## Conclusion

Writing a high-quality QA skill is a form of test architecture work. You are distilling the patterns, defaults, and review heuristics that experienced QA engineers use every day, then packaging them so an AI agent can apply them consistently.

If you do that well, the payoff is large: faster test generation, more reliable framework usage, fewer generic mistakes, and better output across every session.

Start by studying strong existing examples on [QASkills.sh/skills](/skills), read the [publishing guide](/how-to-publish), and compare how different agents consume testing context in our [AI agent workflow comparison](/blog/ai-agent-testing-workflows-comparison).
`,
};
