import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cursor SKILL.md & .cursor/rules Frontmatter Schema 2026',
  description:
    'The 2026 reference for Cursor SKILL.md and .cursor/rules .mdc frontmatter: description, globs, alwaysApply, subagents, and best practices for QA skills.',
  date: '2026-05-30',
  category: 'Reference',
  content: `
# Cursor SKILL.md & .cursor/rules Frontmatter Schema 2026

Cursor's power as an AI coding agent depends heavily on the context you give it, and in 2026 that context is delivered through two related mechanisms: project rules stored as \`.mdc\` files in \`.cursor/rules\`, and reusable skills authored as \`SKILL.md\` files. Both use YAML frontmatter to tell Cursor when and how to inject your guidance, and getting that frontmatter schema right is the difference between rules that fire exactly when needed and rules that either never trigger or pollute every prompt with irrelevant noise. This reference documents the complete frontmatter schema, the fields that control activation, and the best practices for authoring high-quality QA skills that make Cursor a reliable test-writing partner.

If you searched for the SKILL.md frontmatter schema in Cursor agent documentation, for how .cursor skills and subagents handle markdown YAML frontmatter, or for Cursor skills documentation in 2026, this is the consolidated reference you want. We cover the \`.mdc\` format, every frontmatter field (\`description\`, \`globs\`, \`alwaysApply\` and friends), the four rule activation types, how subagents consume skills, and a complete worked example of a QA skill for Cursor. For the broader picture of authoring testing skills, see our [Cursor for QA engineers complete guide](/blog/cursor-for-qa-engineers-complete-guide) and the [skills directory](/skills) of ready-to-install QA skills.

The mental model to hold throughout: frontmatter is metadata, the markdown body is the instruction. Cursor reads the frontmatter to decide whether to load a rule into context for a given task, and if it loads, the body becomes guidance the model follows. Master the frontmatter and you control activation precisely; write a strong body and you control behavior.

## The .cursor/rules and .mdc Format

Modern Cursor stores project rules as individual \`.mdc\` files inside a \`.cursor/rules\` directory at your project root. This replaced the older single \`.cursorrules\` file because per-file rules can be scoped, versioned and reviewed independently. Each \`.mdc\` file is a markdown document with a YAML frontmatter block delimited by triple-dashes, followed by the rule body.

\`\`\`mdc
---
description: Playwright test authoring standards for this project
globs: tests/**/*.spec.ts
alwaysApply: false
---

# Playwright Test Standards

When writing Playwright tests in this project:

- Use the Page Object Model; never put raw selectors in spec files.
- Prefer role-based locators (getByRole, getByLabel) over CSS or XPath.
- Use web-first assertions (await expect(locator).toBeVisible()).
- One logical assertion per test; keep tests independent.
\`\`\`

You can nest \`.cursor/rules\` directories anywhere in the tree, so a monorepo package can carry rules that apply only within its subtree. Cursor discovers all \`.mdc\` files automatically; there is no central registry to maintain. Keep each file focused on one concern, a single framework, a single convention, so it can be scoped tightly and stays easy to review.

## The Frontmatter Schema

The frontmatter schema is small but each field changes activation behavior significantly. The table is the authoritative summary for 2026.

| Field | Type | Purpose | Default |
|---|---|---|---|
| description | string | Tells Cursor when the rule is relevant; used for agent-requested activation | empty |
| globs | string or list | File patterns that auto-attach the rule when matching files are in context | none |
| alwaysApply | boolean | Inject the rule into every prompt regardless of context | false |

These three fields combine to produce four distinct activation behaviors, which is the most important concept in the whole schema.

| Rule type | Frontmatter combination | When it activates |
|---|---|---|
| Always | alwaysApply: true | Every request, unconditionally |
| Auto Attached | globs set, alwaysApply: false | When a file matching globs is in context |
| Agent Requested | description set, no globs, alwaysApply: false | When the agent judges it relevant from the description |
| Manual | none of the above set | Only when explicitly referenced with @ruleName |

### description

The \`description\` field is a short, intent-focused sentence that tells Cursor what the rule is for. It powers agent-requested activation: when the agent is deciding which rules to pull into context, it reads descriptions and loads the ones that match the task. Write descriptions the way you would write a trigger, naming the framework and the action, for example "API contract testing conventions with Pact" rather than a vague "testing stuff." A precise description is the single biggest lever on whether agent-requested rules fire at the right moment.

### globs

The \`globs\` field auto-attaches a rule whenever a file matching the pattern is part of the current context. This is the cleanest activation for framework or directory conventions: a rule with \`globs: tests/**/*.spec.ts\` loads automatically whenever the agent is working on a Playwright spec, and stays out of the way otherwise. You can supply a single pattern or a list. Scope globs as tightly as the convention demands; a rule about Cypress custom commands should match \`cypress/support/**\` only, not the whole repo.

\`\`\`mdc
---
description: Cypress custom command conventions
globs:
  - cypress/support/**/*.ts
  - cypress/e2e/**/*.cy.ts
alwaysApply: false
---
\`\`\`

### alwaysApply

Setting \`alwaysApply: true\` injects the rule into every single prompt, no matter what file or task is in play. Reserve this for a small set of genuinely universal conventions, the project's overall testing philosophy, naming standards, or a hard rule like "never commit secrets in fixtures." Overusing alwaysApply is the most common authoring mistake: every always-on rule consumes context budget on every request, so a pile of them dilutes the model's attention and can degrade output across the board. Keep always-applied rules short and few.

## Rule Activation in Practice

Choosing the right activation type is most of the craft. The decision tree is short. If a convention is universal and brief, make it Always. If it is tied to specific files or a framework, give it globs so it auto-attaches only when relevant, this is the right choice for the large majority of QA rules. If it is broadly applicable but situational and you want the agent to decide, write a sharp description and make it Agent Requested. If it is a heavyweight playbook you only want occasionally, leave all three off and invoke it Manually with \`@ruleName\`.

A well-organized QA project layers these. A short always-applied rule states the testing philosophy. Glob-scoped rules carry per-framework conventions (Playwright, Cypress, pytest). An agent-requested rule holds the security-testing checklist that applies across frameworks when the task involves auth. And a manual rule holds a detailed flaky-test debugging playbook you pull in only when chasing a flake. This layering keeps each request's context lean while making deep guidance available on demand. The same discipline underpins our [Cursor SKILL.md best practices](/blog/cursor-skills-md-best-practices) post.

## SKILL.md for Cursor

Beyond project rules, Cursor consumes reusable skills authored as \`SKILL.md\` files. A skill is a portable package of expertise, frontmatter describing when to use it plus a markdown body of detailed instructions, that can be shared across projects and even across agents. The frontmatter follows the same metadata-then-instruction philosophy, with a \`name\` and a \`description\` that drives discovery.

\`\`\`markdown
---
name: playwright-e2e-qa
description: >-
  Use when writing or reviewing Playwright end-to-end tests. Enforces Page
  Object Model, role-based locators, web-first assertions, fixtures for setup,
  and test isolation. Triggers on requests to "write a Playwright test",
  "add an e2e test", or "review this spec".
---

# Playwright E2E QA Skill

## When to apply
Apply whenever the task involves authoring, refactoring or reviewing
Playwright tests (.spec.ts files, the tests/ directory, or any mention of
end-to-end testing with Playwright).

## Structure every test with the Page Object Model
Selectors live in page objects, never in spec files...

## Locator strategy
Prefer getByRole and getByLabel; treat CSS and XPath as a last resort...
\`\`\`

The single most important field is \`description\`, because it is what the agent reads to decide whether to load the skill. Make it specific and trigger-oriented: name the framework, name the actions ("write a Playwright test," "review this spec"), and state the scope. A skill with a vague description sits unused; a skill with a sharp, trigger-laden description activates exactly when it should. This is identical to the discipline we describe for authoring high-quality skills in our [how to write high-quality QA skills](/blog/how-to-write-high-quality-qa-skills) guide.

## Subagents and Skills

Cursor's subagents, focused sub-tasks the main agent delegates, consume the same skills and rules. When the main agent spins up a subagent to, say, generate a test suite while it continues another task, that subagent inherits the project's rules and can load relevant skills by their descriptions. The practical implication for authoring is that your frontmatter must be self-describing: a subagent does not carry your conversational context, so it relies entirely on the \`description\` to know when a skill applies. This is why trigger-oriented descriptions matter even more in a subagent world, the metadata is the only handshake.

A clean pattern for QA is to keep skills single-responsibility so a subagent can compose them. A "playwright-e2e" skill, an "api-contract-testing" skill, and a "test-data-factories" skill can each activate independently based on their descriptions, and a subagent tasked with building an integration test pulls in exactly the ones it needs. Bloated multi-purpose skills are harder for a subagent to match and waste context when only part applies. Keep them small, name them precisely, and let composition do the work.

There is a second reason single-responsibility skills matter for subagents: predictability of activation. When a subagent reads a dozen tight, well-described skills, it can reliably select the two or three that fit its task. When it reads three sprawling skills whose descriptions try to cover everything, the match is fuzzy, the subagent may load a skill for a fraction of its content, and the rest of that skill becomes noise the model must reason past. The discipline here is identical to good function design in code: one clear responsibility, a precise name, and a contract (the description) that says exactly when it applies. Skills authored this way compose cleanly not just for one subagent but across an entire team, because the same skill can be shared into any project and its activation behavior is fully determined by its frontmatter rather than by the surrounding context.

## A Complete QA Skill Example

Tying it together, here is a complete, production-quality QA skill for Cursor, both the project-rule form and the portable SKILL.md form, that enforces API testing conventions. Note the tightly scoped glob, the trigger-oriented description, and the deliberately concise body.

\`\`\`mdc
---
description: REST API testing conventions using Playwright APIRequestContext
globs: tests/api/**/*.spec.ts
alwaysApply: false
---

# API Test Conventions

When writing API tests in tests/api:

- Use request fixtures (APIRequestContext), not a UI browser context.
- Assert on status code AND response body shape; validate against a schema.
- Cover the contract: 2xx happy path, 4xx validation, 401/403 auth, 404.
- Keep each endpoint's tests in its own describe block.
- Use a test-data factory for request payloads; never hardcode bodies inline.

\\\`\\\`\\\`typescript
import { test, expect } from '@playwright/test';

test('GET /orders/:id returns the order', async ({ request }) => {
  const res = await request.get('/api/orders/o_123');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ id: 'o_123', status: expect.any(String) });
});
\\\`\\\`\\\`
\`\`\`

This rule auto-attaches only when the agent touches a file in \`tests/api\`, so it never pollutes UI test work. Its description also lets an agent request it explicitly when planning API coverage. The body is short on purpose, five rules and one illustrative snippet, because a focused rule the model can hold in full beats a sprawling document it skims. For ready-made versions of skills like this, browse the [QA skills directory](/skills) or the [API contract testing skills hub](/skills-for/ai-llm-evals) for adjacent evaluation tooling.

## Authoring Best Practices

A handful of practices separate rules that help from rules that hurt. Keep each rule single-responsibility and under a few hundred lines; a focused rule the model reads in full outperforms a kitchen-sink document. Write descriptions as triggers, naming the framework and the actions that should activate the rule, because vague descriptions are the top reason agent-requested rules never fire. Prefer glob auto-attachment for framework conventions so rules load exactly when relevant and stay silent otherwise.

Be miserly with \`alwaysApply: true\`; every always-on rule taxes every request, so reserve it for a few genuinely universal conventions and keep them terse. Version your \`.cursor/rules\` directory in git and review rule changes like code, since a bad rule degrades every future generation until someone notices. Finally, write rule bodies as concrete, imperative guidance with a short example rather than abstract philosophy, "use getByRole, not CSS selectors, like this" teaches the model far more than "write maintainable tests." These mirror the broader authoring principles in our [Cursor SKILL.md best practices](/blog/cursor-skills-md-best-practices) reference.

## Organizing a QA Rules Directory

As a project grows, an unstructured pile of \`.mdc\` files becomes hard to reason about. A deliberate directory layout keeps activation predictable and makes the rule set self-documenting. The convention that scales well is to mirror your test structure: one rule file per framework or concern, named for what it governs, scoped with the glob that matches that area.

\`\`\`text
.cursor/rules/
  00-testing-philosophy.mdc      # alwaysApply: true, short and universal
  playwright-e2e.mdc             # globs: tests/e2e/**/*.spec.ts
  playwright-api.mdc             # globs: tests/api/**/*.spec.ts
  cypress-commands.mdc           # globs: cypress/support/**
  pytest-fixtures.mdc            # globs: tests/**/conftest.py, tests/**/test_*.py
  security-checklist.mdc         # agent-requested, no globs
  flaky-debugging.mdc            # manual, invoked with @flaky-debugging
\`\`\`

The numeric prefix on the philosophy file is a small but useful trick: it sorts the always-applied rule to the top so reviewers see the universal conventions first. Everything else is glob-scoped so it loads only on relevant files, with two exceptions, the security checklist is agent-requested because it spans frameworks, and the flaky-debugging playbook is manual because it is heavyweight and situational. This layout means a new contributor can read the directory and immediately understand which rules fire when, and a reviewer can reason about the context budget of any given task by looking at which globs match.

## Migrating From .cursorrules to .cursor/rules

Many projects still carry a legacy single \`.cursorrules\` file at the repo root. In 2026 the per-file \`.cursor/rules\` directory is the recommended format because it supports scoping, per-rule activation and independent review, none of which a monolithic file allows. Migration is mechanical and worth doing.

| Legacy \`.cursorrules\` | Modern \`.cursor/rules\` |
|---|---|
| Single file, always in context | Many files, per-file activation |
| No scoping; everything applies everywhere | Glob, agent-requested or manual scoping |
| Hard to review (one giant diff) | Each rule reviewed independently |
| Context budget spent on every rule always | Only relevant rules loaded per task |

To migrate, read your existing \`.cursorrules\`, group its guidance by concern, and split each group into a focused \`.mdc\` file with appropriate frontmatter. Universal conventions become a short always-applied rule; framework-specific guidance becomes glob-scoped files; situational playbooks become agent-requested or manual rules. The result is the same knowledge, delivered far more precisely, with each request loading only what it needs instead of the entire monolith. After migration, delete the legacy file so there is a single source of truth and no conflicting guidance.

## Frequently Asked Questions

### What is the SKILL.md frontmatter schema for Cursor?

A Cursor SKILL.md file opens with a YAML frontmatter block, delimited by triple-dashes, containing a \`name\` and a \`description\`. The description is the critical field: it tells the agent when to load the skill, so it should be specific and trigger-oriented, naming the framework and the actions that should activate it. Below the frontmatter, the markdown body holds the detailed instructions the agent follows once the skill is loaded.

### What frontmatter fields do .cursor/rules .mdc files support?

The core fields are \`description\` (a sentence describing when the rule is relevant, used for agent-requested activation), \`globs\` (file patterns that auto-attach the rule when matching files are in context), and \`alwaysApply\` (a boolean that injects the rule into every prompt). The combination of these three produces four activation types: Always, Auto Attached, Agent Requested, and Manual.

### What is the difference between globs and alwaysApply in Cursor rules?

\`globs\` auto-attaches a rule only when a file matching the pattern is in the current context, so framework conventions load exactly when relevant and stay silent otherwise. \`alwaysApply: true\` injects the rule into every prompt regardless of context. Use globs for the large majority of scoped conventions; reserve alwaysApply for a few brief, universal rules, because every always-on rule consumes context budget on every request.

### How do Cursor subagents use skills and rules?

Subagents inherit the project's rules and can load skills by their descriptions, just like the main agent. Because a subagent does not carry your conversational context, it relies entirely on each skill's \`description\` to decide relevance. That makes trigger-oriented, self-describing descriptions essential, and it favors single-responsibility skills the subagent can compose, pulling in exactly the ones a delegated task needs.

### How do I write a good description for a Cursor QA skill?

Write it as a trigger, not a summary. Name the framework, state the actions that should activate it, and define the scope, for example "Use when writing or reviewing Playwright e2e tests; triggers on 'write a Playwright test' or 'review this spec'." Specific, action-laden descriptions activate at the right moment, while vague descriptions like "testing helpers" are the top reason agent-requested skills sit unused.

### Should QA rules use alwaysApply or globs in 2026?

Default to globs for almost everything. Per-framework and per-directory conventions, Playwright specs, Cypress commands, pytest fixtures, should auto-attach via tightly scoped globs so they load only when relevant. Reserve alwaysApply for a small set of universal, brief conventions like overall testing philosophy or "never commit secrets in fixtures." A pile of always-applied rules dilutes the model's attention on every request and degrades output.

## Conclusion

Cursor's effectiveness as a QA partner comes down to the frontmatter schema: \`description\`, \`globs\` and \`alwaysApply\` together decide when your guidance reaches the model, and the markdown body decides what it does. Use glob auto-attachment for scoped framework conventions, agent-requested activation with sharp descriptions for situational guidance, manual rules for heavyweight playbooks, and a small, terse set of always-applied rules for true universals. Keep skills single-responsibility so subagents can compose them, and write bodies as concrete imperative guidance with examples.

Go deeper with our [Cursor for QA engineers complete guide](/blog/cursor-for-qa-engineers-complete-guide) and [Cursor SKILL.md best practices](/blog/cursor-skills-md-best-practices), learn portable skill authoring in [how to write high-quality QA skills](/blog/how-to-write-high-quality-qa-skills), and browse the [QA skills directory](/skills) for ready-to-install Cursor skills. You can also [compare AI coding agents](/compare) to see how Cursor's skill model stacks up against the alternatives.
`,
};
