---
name: Cursor Skill (.mdc) Authoring
description: Author effective Cursor rules in .cursor/rules/*.mdc - YAML frontmatter (description, globs, alwaysApply), the four rule types, scoped QA rules, subagents, and structure that actually steers the model.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [cursor, mdc, cursor-rules, ai-rules, rules-for-ai, prompt-engineering, qa-automation, subagents, agent-config]
testingTypes: [unit, integration, e2e]
frameworks: [playwright, vitest, pytest, jest]
languages: [typescript, python, javascript]
domains: [web, api, ai]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Cursor Skill (.mdc) Authoring Skill

You are an expert at writing Cursor rules - the `.mdc` files in `.cursor/rules/` that steer Cursor's AI. When the user asks you to create or improve a Cursor rule (especially for testing/QA conventions), you write a correctly typed `.mdc` with valid YAML frontmatter, scope it precisely with globs, keep it short and imperative, and reference example files instead of pasting walls of code. You never write one giant catch-all rule; you write small, composable, well-scoped rules.

## Core Principles

1. **`.mdc` lives in `.cursor/rules/`, not the legacy root file.** Modern Cursor uses `.cursor/rules/*.mdc`. Nested rules in subfolders (`packages/api/.cursor/rules/`) scope to that part of the tree.
2. **The frontmatter fields decide *when* the rule fires.** `description`, `globs`, and `alwaysApply` together select one of four rule types. Get these wrong and the rule never activates - or always does.
3. **Four rule types, one chosen by frontmatter.** Always, Auto-Attached, Agent-Requested, and Manual. Pick deliberately; do not default everything to `alwaysApply: true`.
4. **`description` is the trigger for Agent-Requested rules.** When `alwaysApply` is false and `globs` is empty, the model reads `description` to decide relevance. Write it as a clear "use this when..." sentence.
5. **Scope with `globs`, not prose.** A rule that only matters for tests should be glob-scoped to `**/*.test.ts`, not a paragraph saying "only apply to tests."
6. **Keep rules short and imperative.** Under ~500 lines, ideally far less. Bullet directives beat essays. The rule competes for the model's attention with the actual task.
7. **Reference files with `@`, do not paste them.** `@tests/example.spec.ts` pulls in a canonical example on demand instead of bloating every prompt.
8. **One concern per rule file.** A "Playwright conventions" rule and a "PR description format" rule are two files. Composable rules are easier to scope and maintain.

## The Four Rule Types

| Type | `alwaysApply` | `globs` | `description` | When it fires |
|---|---|---|---|---|
| Always | `true` | - | - | Injected into every prompt in the project |
| Auto-Attached | `false` | set | optional | When a file matching `globs` is in context |
| Agent-Requested | `false` | empty | required | When the model judges it relevant from the description |
| Manual | `false` | empty | empty | Only when invoked explicitly with `@ruleName` |

## File Layout

```
project/
  .cursor/
    rules/
      000-core.mdc                # Always: project-wide non-negotiables
      testing-playwright.mdc      # Auto-Attached: globs **/*.spec.ts
      testing-pytest.mdc          # Auto-Attached: globs tests/**/*.py
      pr-format.mdc               # Agent-Requested: description-triggered
      legacy-migration.mdc        # Manual: invoked with @legacy-migration
  packages/
    api/
      .cursor/rules/
        api-contracts.mdc         # nested: scoped to the api package
```

## Anatomy of an .mdc File

```mdc
---
description: TypeScript end-to-end test conventions using Playwright.
globs: ["**/*.spec.ts", "tests/**/*.ts"]
alwaysApply: false
---

# Playwright E2E Conventions

When writing or editing Playwright tests in this project:

- Use `getByRole`, `getByLabel`, `getByText` locators. Do NOT use raw XPath.
- Never use `page.waitForTimeout`. Rely on auto-wait and web-first assertions.
- Assert with `await expect(locator).toBeVisible()` - never fetch a value
  manually and compare it.
- One `test()` verifies one behavior. Use `test.step()` to label phases.
- Page Objects live in `tests/pages/*.page.ts` with `Locator` fields built
  in the constructor.

See the canonical example: @tests/pages/login.page.ts
```

The frontmatter here makes it Auto-Attached: it activates whenever a `.spec.ts` file is open or referenced, without the model having to decide.

## Rule Type 1: Always (project core)

Use sparingly - it costs context on every single prompt. Reserve it for genuinely universal rules.

```mdc
---
alwaysApply: true
---

# Project Core Rules

- Package manager is pnpm. Never suggest `npm install` or `yarn`.
- TypeScript strict mode is on. No `any` without an inline justification comment.
- Tests are required for every new function in `src/`. No PR merges without them.
- Follow Prettier: single quotes, semicolons, 100-char width.
```

## Rule Type 2: Auto-Attached (the workhorse for QA)

This is the right type for most testing conventions: it fires exactly when a matching test file is in play.

```mdc
---
description: Python test conventions with pytest.
globs: ["tests/**/*.py", "**/test_*.py"]
alwaysApply: false
---

# Pytest Conventions

- Use fixtures from `conftest.py`; never write unittest setUp/tearDown.
- Default fixtures to function scope; widen only for expensive read-only resources.
- Parametrize cases with `@pytest.mark.parametrize` and always pass `ids=`.
- Mock at the point of use with the `mocker` fixture: patch where the name is
  looked up, not where it is defined.
- Name tests `test_<unit>_<condition>_<expected>`.
- All markers must be declared in pyproject.toml (suite runs with --strict-markers).

Reference fixture setup: @tests/conftest.py
```

## Rule Type 3: Agent-Requested (description-triggered)

No globs - the model reads `description` and decides. Write the description as an explicit trigger.

```mdc
---
description: >
  Use when writing a pull request title or description. Enforces the
  Conventional Commits style and the required QA checklist.
alwaysApply: false
---

# PR Description Format

When asked to draft a PR:

- Title: `type(scope): summary` (feat, fix, test, refactor, chore).
- Body must include a "## Testing" section listing how the change was verified.
- Include a checklist: [ ] unit tests, [ ] e2e if UI changed, [ ] no skipped tests.
- Link the issue with `Closes #<n>`.
```

## Rule Type 4: Manual (invoked on demand)

Empty `description` and `globs`. Fires only when the user types `@rule-name`. Good for heavy, occasional workflows.

```mdc
---
description:
globs:
alwaysApply: false
---

# Legacy Selenium -> Playwright Migration

(Invoke with @legacy-migration when porting an old test.)

- Map By.id/By.cssSelector to getByLabel/getByRole.
- Delete every WebDriverWait; replace with web-first `expect` assertions.
- Convert the Java Page Object to a TS class with lazy Locator fields.
- Keep both suites green; migrate one page at a time.
```

## Subagents: Delegating QA Work

Cursor can spawn subagents for focused, parallel work. Define them so a parent agent can hand off bounded tasks (e.g., "write the tests" while the main thread keeps building). Keep each subagent single-purpose with an explicit success criterion.

```mdc
---
description: Use to spin up a focused test-writing subagent for a single module.
alwaysApply: false
---

# Test-Author Subagent

When delegating test creation, instruct the subagent to:

1. Read ONLY the target module and its existing tests.
2. Write tests following @.cursor/rules/testing-pytest.mdc (or the matching
   framework rule for the file type).
3. Cover: happy path, each error branch, and boundary inputs.
4. Run the suite and report pass/fail counts. Do NOT edit source code.
5. Success criterion: new tests pass and branch coverage for the module is >= 85%.

Keep the subagent's scope to one module so its context stays small and focused.
```

## Writing Effective QA Rules

A rule that steers the model well is concrete, scoped, and shows an example.

```mdc
---
description: API contract test conventions.
globs: ["**/*.contract.test.ts"]
alwaysApply: false
---

# API Contract Tests

- Validate responses against the Zod schema in `@src/schemas`, not ad-hoc asserts.
- Test the status code AND the body shape for every endpoint.
- Include at least one 4xx case (bad input) per endpoint.
- Use the shared `apiClient` fixture; never construct fetch calls inline.

Good:
\`\`\`ts
const res = await apiClient.post('/orders', { amount: -1 });
expect(res.status).toBe(422);
expect(() => OrderSchema.parse(res.body)).toThrow();
\`\`\`

Bad: asserting only `expect(res.status).toBe(200)` with no body validation.
```

## Best Practices

1. **Choose the rule type on purpose.** Default to Auto-Attached for anything file-specific (most QA rules). Reserve Always for true universals; it taxes every prompt.
2. **Make `description` an explicit "use when..." sentence for Agent-Requested rules.** The model triggers on it - vague descriptions never fire.
3. **Scope with `globs`, not prose.** `globs: ["**/*.spec.ts"]` is enforceable; "apply only to test files" written in the body is a hope.
4. **Keep each rule under ~500 lines and single-concern.** Short, imperative bullets win attention; one topic per file keeps scoping clean.
5. **Reference canonical files with `@path`.** Pull in one good example on demand instead of pasting code into every prompt.
6. **Number Always rules (`000-core.mdc`) to control ordering.** Predictable load order avoids surprising overrides.
7. **Use nested `.cursor/rules/` for monorepos.** A package-local rule scopes naturally to that package's tree.
8. **Give subagents a bounded scope and an explicit success criterion.** "Write tests for this one module, do not touch source, target 85% coverage" keeps delegation reliable.

## Anti-Patterns to Avoid

1. **`alwaysApply: true` on everything.** It floods every prompt with irrelevant rules and dilutes the ones that matter. Scope instead.
2. **Agent-Requested rule with a vague or empty `description`.** With no globs and no clear description, the model has nothing to trigger on - the rule is dead.
3. **One giant `rules.mdc` covering testing, style, git, and architecture.** Unscopable and unmaintainable. Split into focused files.
4. **Pasting whole example files into the rule body.** It balloons context. Use `@file` references.
5. **Writing scope as prose instead of globs.** "Only for tests" in the body still loads the rule everywhere; the model may apply it to non-test files.
6. **Essays and rationale dumps.** Rules are directives, not documentation. State what to do, not three paragraphs of why.
7. **Subagents with open-ended scope.** "Improve the tests" with no boundary lets a subagent wander into source files and rack up context. Bound it.

## When to Trigger This Skill

Trigger when the user asks to:
- Create or edit a Cursor rule, `.mdc` file, or `.cursor/rules/` config
- Set up "rules for AI" / coding conventions for Cursor
- Choose between Always / Auto-Attached / Agent-Requested / Manual rule types
- Write QA or testing conventions that Cursor should follow
- Configure Cursor subagents for delegated test work
- Fix a Cursor rule that never activates or always activates

This skill is specific to Cursor's `.mdc` rule format. For authoring portable SKILL.md skills (this directory's format) or Claude Code skills, use the relevant skill-authoring guidance instead.
