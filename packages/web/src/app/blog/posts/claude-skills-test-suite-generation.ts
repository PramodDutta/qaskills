import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude Skills Test Suite Generation: A Production Workflow for QA Teams',
  description: 'Master Claude Skills test suite generation with test contracts, fixtures, deterministic checks, MCP boundaries, and CI gates that produce reviewable tests.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# Claude Skills Test Suite Generation: A Production Workflow for QA Teams

Claude Skills test suite generation works best when the skill is a small, versioned testing playbook rather than a vague request to "write more tests." Give the skill an explicit input contract, a risk model, output constraints, runnable verification commands, and examples of acceptable tests. Then evaluate the generated suite on compilation, execution, mutation sensitivity, requirement coverage, and reviewer effort before accepting it.

This approach turns generation into a controlled engineering loop. Claude can inspect the code under test, identify behavioral boundaries, produce framework-native tests, run them, and revise failures. The QA engineer still owns the oracle and release decision. If agent-driven testing is new to your team, the broader [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) provides the operating model. When test setup depends on external tools or data, the [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026) explains that integration boundary.

The concrete workflow below uses a TypeScript price calculator, Node's built-in test runner for deterministic skill helpers, and Vitest for the generated product tests. The same control structure applies to Jest, Playwright, Cypress, pytest, or a service-level contract suite. Tool syntax changes, but the quality gates do not.

## Define generation as a test contract, not a creative prompt

A useful generation contract answers five questions before Claude edits anything: what behavior is in scope, where evidence comes from, what files may change, how tests are executed, and what proves that a test has value. Without those boundaries, an agent often optimizes for visible quantity. It may duplicate assertions, snapshot entire objects, mock the unit under test, or encode current implementation details as expected behavior.

| Contract element | Concrete instruction | Evidence produced |
|---|---|---|
| Scope | Cover exported behavior in \`src/pricing.ts\` only | Small, reviewable diff |
| Oracle | Derive expected results from named requirements and examples | Traceable assertions |
| Allowed edits | Add or change files under \`test/pricing/\` | Product code remains untouched |
| Execution | Run type checking, focused tests, then the full suite | Reproducible command output |
| Quality | Include boundaries, invalid input, and interaction invariants | Behavior diversity |
| Stop rule | Report ambiguity instead of inventing a business rule | Visible unresolved questions |

The skill should distinguish observations from requirements. Existing implementation is evidence about interfaces and branches, but it is not automatically the correct oracle. A bug in a discount formula must not become a generated expected value simply because the current function returns it.

Start with a project structure that keeps instructions, examples, and validators close while leaving product tests in their normal location:

\`\`\`text
.claude/
  skills/
    generate-pricing-tests/
      SKILL.md
      references/
        requirements.md
        test-review-rubric.md
      scripts/
        inspect-target.mjs
        validate-generated-tests.mjs
src/
  pricing.ts
test/
  pricing/
    pricing.test.ts
package.json
\`\`\`

Claude Code discovers project skills in \`.claude/skills/<name>/SKILL.md\`. The current official skills documentation is https://code.claude.com/docs/en/skills. A concise body is important because the full skill enters the working context when invoked. Put long domain facts in referenced files and tell the skill exactly when to read them.

## Build the smallest useful system under test

A generation exercise needs behavior rich enough to expose weak test design. This calculator has normal cases, a boundary, a capped discount, input validation, and a rounding rule:

\`\`\`ts
// src/pricing.ts
export interface PriceInput {
  unitPriceCents: number;
  quantity: number;
  customerTier: 'standard' | 'gold';
}

export function orderTotalCents(input: PriceInput): number {
  const { unitPriceCents, quantity, customerTier } = input;

  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new RangeError('unitPriceCents must be a non-negative integer');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError('quantity must be a positive integer');
  }

  const subtotal = unitPriceCents * quantity;
  const tierRate = customerTier === 'gold' ? 0.1 : 0;
  const volumeRate = quantity >= 10 ? 0.05 : 0;
  const discountRate = Math.min(tierRate + volumeRate, 0.15);

  return Math.round(subtotal * (1 - discountRate));
}
\`\`\`

The requirements file states intent independently of the implementation:

\`\`\`markdown
# Pricing requirements

- PR-1: Quantity is an integer of at least one.
- PR-2: Unit price is a non-negative integer number of cents.
- PR-3: Gold customers receive a 10 percent discount.
- PR-4: Orders of 10 or more units receive a 5 percent discount.
- PR-5: Discounts combine but never exceed 15 percent.
- PR-6: The final cent amount uses JavaScript Math.round semantics.

Every generated test title must begin with one requirement ID.
Do not infer tax, currency conversion, or shipping behavior.
\`\`\`

That last line is a guard against scope expansion. A test generator commonly fills domain gaps with plausible assumptions. Plausible is not the same as specified.

## Write a skill that forces an evidence loop

The skill needs a strong description because that is what Claude uses to decide whether it applies. The instructions should order discovery before generation and verification after generation.

\`\`\`markdown
---
name: generate-pricing-tests
description: Generate or improve Vitest tests for the pricing module. Use when pricing behavior changes, coverage gaps are reported, or a reviewer requests boundary tests.
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(npm run test:pricing *) Bash(npm run typecheck *)
---

# Generate pricing tests

1. Read src/pricing.ts, references/requirements.md, and references/test-review-rubric.md.
2. Inspect existing files under test/pricing before proposing additions.
3. Create a requirement-to-test matrix. Mark any requirement whose oracle is ambiguous.
4. Edit only test/pricing files. Do not modify production code or package configuration.
5. Prefer one behavioral reason for each test. Include valid partitions, exact boundaries,
   invalid input, combined rules, and rounding only where requirements support them.
6. Use public exports. Do not mock orderTotalCents or reproduce its implementation in a helper.
7. Run npm run typecheck, then npm run test:pricing.
8. If a command fails, diagnose the product, test, fixture, or environment layer before editing.
9. Return the matrix, changed files, commands run, results, and unresolved questions.

Do not weaken an assertion merely to make a test pass. Stop when an expected result cannot be
derived from the requirements.
\`\`\`

Manual invocation is appropriate here, so \`disable-model-invocation: true\` keeps generation intentional. The documented \`allowed-tools\` field can pre-approve matching tools for the active skill, but normal permission policy still matters. It is a permission convenience, not a sandbox and not proof that every command is safe.

What people get wrong is treating the skill as the test oracle. The skill is a procedure. The requirement document, API contract, examples approved by domain owners, and observable system behavior provide the oracle. If the procedure tells the agent to calculate an expected value by copying the production formula, the generated test can pass through the exact defect it was supposed to catch.

## Make the generated test suite readable before making it large

A strong first suite maps directly to the six requirements and uses values chosen for diagnostic power:

\`\`\`ts
// test/pricing/pricing.test.ts
import { describe, expect, it } from 'vitest';
import { orderTotalCents } from '../../src/pricing';

describe('orderTotalCents', () => {
  it('PR-1 rejects zero quantity', () => {
    expect(() => orderTotalCents({
      unitPriceCents: 500,
      quantity: 0,
      customerTier: 'standard',
    })).toThrow('quantity must be a positive integer');
  });

  it('PR-2 accepts a zero-priced item', () => {
    expect(orderTotalCents({
      unitPriceCents: 0,
      quantity: 1,
      customerTier: 'standard',
    })).toBe(0);
  });

  it('PR-3 applies the gold discount below the volume threshold', () => {
    expect(orderTotalCents({
      unitPriceCents: 1_000,
      quantity: 2,
      customerTier: 'gold',
    })).toBe(1_800);
  });

  it.each([
    { quantity: 9, expected: 9_000 },
    { quantity: 10, expected: 9_500 },
  ])('PR-4 treats quantity $quantity at the volume boundary', ({ quantity, expected }) => {
    expect(orderTotalCents({
      unitPriceCents: 1_000,
      quantity,
      customerTier: 'standard',
    })).toBe(expected);
  });

  it('PR-5 combines gold and volume discounts', () => {
    expect(orderTotalCents({
      unitPriceCents: 1_000,
      quantity: 10,
      customerTier: 'gold',
    })).toBe(8_500);
  });

  it('PR-6 rounds the discounted result to a whole cent', () => {
    expect(orderTotalCents({
      unitPriceCents: 101,
      quantity: 1,
      customerTier: 'gold',
    })).toBe(91);
  });
});
\`\`\`

These tests do not chase every branch mechanically. Each value tells a reviewer why it exists. Nine and ten isolate the threshold. A price of 101 creates a fractional discounted cent. The combined case uses simple arithmetic that can be checked without reproducing the function.

| Generated pattern | Signal | Review decision |
|---|---|---|
| Exact boundary pair | High | Keep when each side has a distinct expected outcome |
| Broad snapshot of return object | Often low | Replace with assertions on contract fields |
| Repeated happy paths with different names | Low | Collapse into a parameterized partition table |
| Invalid input assertion | High when error is contractual | Keep message assertions only if message stability matters |
| Private helper import | Brittle | Test through a public entry point |
| Mock of the target function | None | Reject because no production behavior executes |

## Test deterministic skill helpers like normal software

Skills often bundle scripts for inventory, validation, or report formatting. Those scripts are code and deserve direct tests. Keep them deterministic so failures can be attributed to input rather than model variation.

The following validator checks filenames, test title traceability, forbidden focused tests, and minimum requirement coverage. It uses only Node APIs:

\`\`\`js
// .claude/skills/generate-pricing-tests/scripts/validate-generated-tests.mjs
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function validateSource(source, requiredIds) {
  const errors = [];

  if (/\\b(?:it|test|describe)\\.only\\s*\\(/.test(source)) {
    errors.push('Focused tests are forbidden');
  }
  if (/\\b(?:it|test|describe)\\.skip\\s*\\(/.test(source)) {
    errors.push('Skipped tests require explicit review');
  }

  for (const id of requiredIds) {
    if (!source.includes(id)) {
      errors.push('Missing requirement ID: ' + id);
    }
  }

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node validate-generated-tests.mjs <test-file>');
    process.exitCode = 2;
  } else {
    const source = await readFile(file, 'utf8');
    const errors = validateSource(source, ['PR-1', 'PR-2', 'PR-3', 'PR-4', 'PR-5', 'PR-6']);
    if (errors.length > 0) {
      console.error(errors.join('\\n'));
      process.exitCode = 1;
    }
  }
}
\`\`\`

The executable entry check compares normalized file URLs, so importing the module in its unit test does not run the command-line branch. The pure validation function remains easy to exercise with in-memory source strings.

\`\`\`js
// .claude/skills/generate-pricing-tests/scripts/validate-generated-tests.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSource } from './validate-generated-tests.mjs';

const ids = ['PR-1', 'PR-2'];

test('accepts traced tests without focus or skip markers', () => {
  const source = "it('PR-1 works', () => {}); it('PR-2 fails safely', () => {});";
  assert.deepEqual(validateSource(source, ids), []);
});

test('reports focused tests and missing requirement IDs', () => {
  const source = "it.only('PR-1 works', () => {});";
  assert.deepEqual(validateSource(source, ids), [
    'Focused tests are forbidden',
    'Missing requirement ID: PR-2',
  ]);
});
\`\`\`

This validator is deliberately lexical, not a replacement for a TypeScript parser. Its narrow claims make it dependable. A production team can add ESLint rules for focused tests and use an AST only when formatting variations make the simple check unreliable.

## Evaluate generation across fixtures, not one lucky conversation

An agent can produce a strong result once and still be unreliable. Build an evaluation set representing the kinds of change the skill will see. Each fixture should have an input repository state, a user request, required observations, forbidden outcomes, and commands that determine execution success.

| Fixture | Change presented to Claude | Required output behavior | Critical rejection condition |
|---|---|---|---|
| Boundary addition | Volume threshold introduced | Tests 9 and 10 separately | Only quantity 10 is tested |
| Ambiguous rounding | Requirement omits tie rule | Reports missing oracle | Invents banker's rounding |
| Existing regression | Failing test already present | Diagnoses before editing | Deletes or weakens old assertion |
| Duplicate coverage | Equivalent gold test exists | Reuses or improves existing test | Adds semantic duplicate |
| Unsafe scope | Product code appears wrong | Reports suspected defect | Changes product source without permission |
| Tool outage | MCP requirement source unavailable | Stops with evidence gap | Generates guessed expectations |

Store fixture expectations as data so they can be reviewed without reading an opaque evaluator:

\`\`\`json
{
  "fixture": "volume-boundary",
  "request": "Generate missing tests for the pricing change",
  "requiredText": ["PR-4", "quantity: 9", "quantity: 10"],
  "forbiddenText": ["it.only", "test.only", "src/pricing.ts"],
  "commands": [
    "npm run typecheck",
    "npm run test:pricing"
  ]
}
\`\`\`

Do not reduce the evaluation to text matching. Text checks catch obvious contract failures, while compilation and test execution catch syntax and runtime errors. A reviewer or a carefully specified rubric must judge oracle quality, meaningful independence, and whether the test would detect a plausible defect.

Run each fixture in a clean worktree or disposable checkout. Give Claude the same starting files each time. Capture the prompt, selected skill version, diff, command output, and final report. That record lets you distinguish model variance from changes in the skill itself.

## Use mutation probes to measure whether tests can fail

Coverage shows that code executed. It does not show that assertions can detect a wrong result. Mutation testing is valuable for generated suites because agents often write tests that look specific but assert only types, truthiness, or large snapshots.

You can begin with manual mutation probes before adopting a mutation framework. Make one temporary behavioral change at a time in a disposable branch:

1. Change \`quantity >= 10\` to \`quantity > 10\`.
2. Change the gold rate from \`0.1\` to \`0.09\`.
3. Remove the integer check for quantity.
4. Replace \`Math.round\` with \`Math.floor\`.
5. Remove the combined discount.

The suite should fail for every probe, and the failing test should point to the corresponding rule. Restore each change before applying the next one. These are illustrative mutants selected from the contract, not fabricated claims about a target score.

A simple evidence table belongs in the generation report:

| Probe | Expected detecting test | Result | Interpretation |
|---|---|---|---|
| Threshold shifted above 10 | PR-4 boundary case | Killed | Exact lower boundary is protected |
| Gold rate changed | PR-3 gold case | Killed | Tier value is asserted |
| Quantity integer guard removed | Additional PR-1 fractional case | Survived | Generator missed an invalid partition |
| Rounding changed | PR-6 fractional-cent case | Killed | Rounding behavior is observable |

A surviving mutant creates a specific improvement request. In this example, add a fractional quantity test derived from PR-1. Avoid asking Claude to "increase mutation score" with no constraint, because it may produce implementation-coupled assertions solely to kill mutants.

## Diagnose failures by layer before regenerating

Consider a realistic failure: the generated tests pass locally but CI reports that the pricing test file cannot resolve \`../../src/pricing\`. The tempting response is to ask the agent to rewrite imports until CI turns green. That can hide the actual problem.

Use a layered diagnosis:

| Layer | Check | Example finding |
|---|---|---|
| Repository | Compare exact path casing | CI uses a case-sensitive filesystem |
| Dependency | Install from the lockfile | Local node_modules contains undeclared package state |
| TypeScript | Run the repository's typecheck | Alias is known to editor but not compiler config |
| Runner | Print Vitest configuration through documented project commands | Test root differs in CI job |
| Generated test | Inspect import relative to file | Path has one extra parent segment |

If the file is \`test/pricing/pricing.test.ts\`, \`../../src/pricing\` is correct for the shown tree. A CI-only resolution error could instead reveal that the committed path is \`src/Pricing.ts\` while a case-insensitive local filesystem tolerated \`pricing\`. Regenerating assertions will never fix that. Capture \`git ls-files\` output and compare case before editing.

Another common failure is a test timeout after the skill adds fake timers. Diagnose whether the test waits for a promise whose scheduling source is not advanced, whether real timers were restored, and whether the code actually needs timer control. Removing the timeout assertion is not a repair. Generated tests need the same root-cause discipline as human-written tests.

## Put deterministic gates around a probabilistic generator

CI should judge the committed output, not depend on a live model call for every pull request. Generation can happen locally or in a controlled automation job, but the merge gate should run stable checks over the resulting diff.

\`\`\`yaml
# .github/workflows/pricing-tests.yml
name: pricing-tests

on:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: node --test .claude/skills/generate-pricing-tests/scripts/validate-generated-tests.test.mjs
      - run: node .claude/skills/generate-pricing-tests/scripts/validate-generated-tests.mjs test/pricing/pricing.test.ts
      - run: npm run typecheck
      - run: npm run test:pricing
\`\`\`

Pin actions according to your organization's supply-chain policy, potentially by commit SHA. The shown major tags are readable examples. The test runner and package scripts must already exist in the repository. Avoid installing undeclared tools inside the workflow because that allows CI to exercise a different dependency graph from local development.

The merge request should include the requirement matrix and generator evidence, but generated prose must not substitute for command output. A compact checklist is enough:

- Every new test traces to a named requirement or approved defect.
- The test fails for a relevant controlled mutation or for the pre-fix implementation.
- No product source changed unless the task explicitly included a fix.
- Focused, skipped, retried, or quarantined tests are visible.
- The focused suite and the full affected suite pass from a clean install.
- A human reviews the oracle, not only syntax and coverage.

## Keep MCP and other external evidence behind a stable adapter

A skill may need requirements from an issue tracker, examples from a test management system, or an OpenAPI document exposed by an MCP server. External context is powerful, but it adds availability, authorization, freshness, and prompt-injection risks.

Ask the skill to retrieve a narrow artifact by stable identifier, save only the fields needed for the test decision, and record the source identifier in its report. Do not let untrusted issue text silently override the skill's scope or permissions. Treat retrieved content as data, especially if it contains instructions aimed at the agent.

A useful adapter output is plain JSON with a schema your validation code owns:

\`\`\`ts
// test-support/requirement-record.ts
export interface RequirementRecord {
  id: string;
  revision: string;
  statement: string;
  examples: Array<{ input: unknown; expected: unknown }>;
}

export function assertRequirementRecord(value: unknown): asserts value is RequirementRecord {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('Requirement record must be an object');
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.revision !== 'string') {
    throw new TypeError('Requirement record needs string id and revision');
  }
  if (typeof record.statement !== 'string' || !Array.isArray(record.examples)) {
    throw new TypeError('Requirement record has invalid content');
  }
}
\`\`\`

Validate before using the data. Cache by requirement ID and revision for reproducibility if policy permits. Never cache credentials, broad tool responses, or sensitive customer examples in the repository. If the server is unavailable, the correct behavior is to use an approved pinned artifact or report the missing oracle, not invent one.

## Review generated tests with a QA-specific rubric

Style review alone misses the hardest problems. Score or label each test on oracle independence, fault-detection potential, determinism, isolation, readability, and maintenance cost. The rubric can be simple, but every dimension needs observable criteria.

| Dimension | Acceptable evidence | Warning sign |
|---|---|---|
| Oracle independence | Expected value comes from requirement example or hand-checkable arithmetic | Test duplicates production algorithm |
| Fault detection | Relevant mutant or pre-fix build makes it fail | Test passes after behavior is deliberately broken |
| Determinism | Time, randomness, network, and data are controlled | Retry is required for routine success |
| Isolation | Test creates and cleans its own mutable state | Order or worker count changes outcome |
| Readability | Name states rule and scenario | Name says only "works" or "case 3" |
| Maintenance | Assertion targets public contract | Snapshot captures unrelated representation details |

Use the rubric both for generation instructions and evaluation. If reviewers repeatedly reject tests for the same reason, update the skill with one precise constraint and one contrasting example. Do not keep adding paragraphs of prohibitions without removing obsolete guidance. Skills are operational code: version them, review them, test their helpers, and periodically delete rules that no longer match the stack.

Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when an existing workflow matches your framework and review policy. Inspect any installed skill like code before allowing it to run commands, and adapt its verification steps to the repository rather than assuming one test command fits every project.

## Roll out generation without losing test ownership

Begin with a single module and an explicit reviewer. Establish a baseline from human-written tests, then run the skill against a small fixture set. Track defects found during review, invalid tests rejected, commands that fail, and time spent correcting output. These are local measurements, not universal productivity claims.

Next, allow the skill to propose tests in pull requests while keeping product edits out of scope. Once the team trusts the contract, expand to nearby modules and add requirement adapters. Reserve automatic commits or broad repository edits for workflows with strong isolation, permissions, and rollback.

Ownership remains clear: product and domain owners approve behavior, QA engineers design the risk model and judge the oracle, developers maintain testable interfaces, and the skill accelerates evidence gathering and implementation. Claude Skills test suite generation is valuable precisely because this division is explicit. The agent performs repeatable work, while accountable humans decide what correctness means.

## Frequently Asked Questions

### Should a Claude skill generate product fixes and tests in the same run?

Usually, separate the generation task from the product fix. A test-only run preserves evidence that the existing implementation fails and makes oracle review easier. After the failing test is accepted, a second task can implement the fix and run the same suite. Combining both can be reasonable for a tightly scoped defect, but the report should still show the pre-fix failure and distinguish product changes from test changes. Never let the agent weaken the newly generated assertion to accommodate its own implementation.

### How many examples belong inside a test-generation skill?

Use the fewest examples that establish the desired shape and expose common mistakes. One strong boundary example, one invalid-input example, and one rejected implementation-coupled example often teach more than a large catalog. Put domain-specific expected values in a referenced requirement file rather than bloating the core skill. Evaluate whether new examples change output quality across fixtures. If an example merely causes copying or consumes context without preventing a known failure, remove it.

### Can coverage percentage validate an AI-generated suite?

Coverage is a useful inventory signal, but it cannot validate the oracle. A test can execute every line while asserting only that a result exists. Pair coverage with requirement traceability, boundary review, controlled mutation probes, and a check that each assertion fails when its target behavior is broken. Treat uncovered code as a question about risk, not an automatic instruction to generate tests. Some defensive or platform-specific paths need a different test level rather than a forced unit test.

### What should the skill do when requirements conflict with current behavior?

It should preserve both pieces of evidence and stop short of inventing a resolution. The report should name the requirement, show the observed behavior, identify the exact conflict, and propose a test that can be enabled once a domain owner decides the oracle. If the requirement is authoritative, a deliberately failing regression test may be appropriate, but that decision should be explicit. Quietly changing the expected value to match the implementation converts a potential product defect into a false pass.
`,
};
