import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AI Test Generation Prompts: A Working Library for QA Engineers',
  description: 'automated test prompt examples help QA engineers generate runnable tests with clearer inputs, review gates, and repeatable fixes for agent output.',
  date: '2026-08-28',
  category: 'AI Testing',
  content: `
# AI Test Generation Prompts: A Working Library for QA Engineers

An automated test prompt is a precise instruction you give an AI coding agent so it can create, repair, or extend tests that actually run. The best prompts include the behavior under test, the test runner, the files to inspect, the data boundaries, and the acceptance command, so the agent produces verifiable test work instead of plausible-looking code.

Prompting for tests is not magic. It is test design written in a form an agent can execute. If you give the agent vague intent, it will fill gaps with guesses. If you give it a contract, examples, constraints, and a required verification loop, it can be a fast junior test implementer that still needs review.

## The Prompt Shape That Produces Runnable Tests

A test-generation prompt should tell the agent what to inspect, what behavior matters, what must not change, and how to prove success. Do not ask for "more coverage" and expect useful judgment. Ask for a named risk, a runner, and a failure mode.

| Prompt part | What to include | Bad omission |
|---|---|---|
| Target | File, route, component, endpoint, or function | Agent edits unrelated tests |
| Behavior | User-visible or contract-level outcome | Test mirrors implementation details |
| Boundaries | Empty, invalid, duplicate, slow, timezone, auth, or permission cases | Only sunny-day fixture appears |
| Tooling | Playwright, Vitest, pytest, JUnit, k6, or another runner | Agent invents commands or imports |
| Verification | Exact command to run and expected pass condition | Code is written but never executed |
| Review rule | What changes are out of scope | Agent refactors production code to make tests pass |

Here is the base prompt I use when the codebase is already present.

\`\`\`text
You are adding tests, not redesigning the feature.

Inspect these files first:
- src/routes/billing.ts
- tests/billing.spec.ts
- package.json

Behavior to test:
- A user with an expired trial sees the billing blocker.
- A user with an active subscription reaches the dashboard.
- A user without a session is redirected to sign in.

Constraints:
- Use the existing test runner and helpers.
- Do not add new packages.
- Do not change production code unless a real bug blocks the test, and explain that bug first.
- Prefer stable selectors already used in the suite.

Verification:
- Run npm test -- billing.
- If the command fails, diagnose the first real failure and fix only the related test or fixture.
\`\`\`

This prompt is plain. That is the point. It removes the agent's need to infer the runner, scope, and success criteria.

## Prompt Library For Common QA Jobs

Use these prompts as starting points, then replace the target names and commands. The goal is not to memorize text. The goal is to preserve the parts that make agent output testable.

| QA job | Prompt emphasis | Verification command |
|---|---|---|
| Regression test for a bug | Reproduce the observed failure first | Existing focused test command |
| UI flow coverage | User role, route, selectors, network state | Playwright with --grep or -g |
| Unit boundary tests | Inputs, expected outputs, invalid cases | Vitest with -t or --testNamePattern |
| API contract tests | Status, body shape, idempotency, auth | API test runner or integration suite |
| Data migration tests | Before state, migration, after state, rollback | Migration test command |
| Flake diagnosis | Failure signature, retry evidence, timing data | Repeat command with focused filter |

### Prompt: Generate A Regression Test From A Bug Report

This is the highest-return automated test prompt because the expected behavior is anchored by a real defect.

\`\`\`text
Create a regression test for this bug before changing implementation code.

Bug report:
- When a team owner removes the last billing contact, the API returns 200.
- Expected behavior: the API rejects the request with status 409 and an error code of LAST_BILLING_CONTACT.
- Existing endpoint: DELETE /api/teams/:teamId/billing-contacts/:contactId

Instructions:
- Inspect the existing API tests and test data builders.
- Add the smallest test that fails on the current behavior.
- Use existing factories and request helpers.
- Do not mock the service under test.
- After the test fails for the expected reason, implement the minimal production fix.
- Run the focused test command and report the failing assertion before the fix and the passing result after the fix.
\`\`\`

The phrase "fails on the current behavior" matters. Without it, agents often write a test that already passes because it asserts the existing bug.

### Prompt: Extend A Playwright Flow Without Making It Flaky

Playwright is good at user workflows, but agent-written UI tests can become timing soup. Put the stability rules in the prompt.

\`\`\`text
Add Playwright coverage for the saved-search flow.

User workflow:
1. Sign in as an existing analyst user.
2. Open /search.
3. Filter results by status "Needs review".
4. Save the search as "Needs review queue".
5. Reload the page.
6. Confirm the saved search appears and restores the status filter.

Stability rules:
- Use getByRole, getByLabel, and getByText where the app already exposes accessible names.
- Do not use fixed waits.
- Wait for specific UI states or network completion only when existing helpers do that.
- Keep the test independent of wall-clock time.
- Use the existing auth fixture.

Verification:
- Run npx playwright test --grep "saved search".
\`\`\`

If the project already has Playwright guidance, reference that file. For deeper Playwright-specific generation patterns, pair this library with [AI test generation for Playwright](/blog/ai-test-generation-playwright-2026).

## Prompt The Agent To Read Before It Writes

The best test prompt is often a reading prompt first. Agents make fewer mistakes when they inspect fixtures, helpers, and naming patterns before adding files.

\`\`\`text
Before writing tests, inspect:
- package.json
- tests/setup.ts
- tests/helpers
- the nearest existing spec for this feature

Then answer briefly:
1. Which runner is used?
2. Which helper creates authenticated users?
3. Which file should receive the new test?
4. What command will verify only this test area?

After that, add the test and run the command.
\`\`\`

This prompt adds a checkpoint without turning the interaction into ceremony. It is especially useful in mixed repositories where Playwright, Vitest, Jest, and API tests coexist.

| Repository signal | What the agent should infer | What you should still specify |
|---|---|---|
| package.json has several scripts | Which command matches the test layer | The exact command you want run |
| Existing spec has factories | Fixture style and cleanup pattern | New scenario boundaries |
| Test setup mocks network | Mocking convention | Which calls must stay real |
| CI config shards tests | Naming and grouping | Focused local filter |

## Unit Test Prompt For Boundary Tables

Unit tests are where agents can be very effective, if you ask for tables instead of one-off cases. The prompt should name the equivalence classes and require negative cases.

\`\`\`text
Add Vitest unit tests for normalizePlanCode in src/billing/plan-code.ts.

Expected behavior:
- Trim surrounding whitespace.
- Convert letters to uppercase.
- Accept FREE, PRO, TEAM, and ENTERPRISE.
- Reject empty input.
- Reject unknown plan codes.
- Do not accept null or undefined.

Testing style:
- Use test.each or the local equivalent if this codebase already uses table tests.
- Include one table for accepted values and one table for rejected values.
- Do not change normalizePlanCode unless a test exposes a real mismatch.

Verification:
- Run npm test -- --testNamePattern normalizePlanCode.
\`\`\`

A resulting Vitest test should be concrete, not a snapshot of a function call with weak assertions.

\`\`\`ts
import { describe, expect, test } from "vitest";
import { normalizePlanCode } from "../src/billing/plan-code";

describe("normalizePlanCode", () => {
  test.each([
    [" free ", "FREE"],
    ["pro", "PRO"],
    ["Team", "TEAM"],
    ["ENTERPRISE", "ENTERPRISE"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePlanCode(input)).toBe(expected);
  });

  test.each(["", "unknown", "trial"])("rejects %s", (input) => {
    expect(() => normalizePlanCode(input)).toThrow("Unsupported plan code");
  });

  test("rejects missing input", () => {
    expect(() => normalizePlanCode(null)).toThrow("Plan code is required");
    expect(() => normalizePlanCode(undefined)).toThrow("Plan code is required");
  });
});
\`\`\`

Notice the test does not assert that internal branches were visited. It asserts the contract a caller depends on.

## API Contract Prompt For Status, Body, And Idempotency

API prompts should make response status and body shape explicit. If idempotency matters, say how to test repeat calls.

\`\`\`text
Add integration tests for POST /api/invitations/resend.

Cases:
- Existing pending invitation returns 202 with { "status": "queued" }.
- Accepted invitation returns 409 with error code INVITATION_ALREADY_ACCEPTED.
- Missing invitation returns 404 with error code INVITATION_NOT_FOUND.
- Repeating the same resend request within the idempotency window does not create a second email job.

Constraints:
- Use the existing request helper and database cleanup helper.
- Assert email_jobs rows directly where existing tests do that.
- Do not mock the route handler.
- Keep fixtures local to this spec.

Verification:
- Run the focused API test command used by neighboring invitation tests.
\`\`\`

If the agent needs a concrete response contract, give it JSON examples.

\`\`\`json
{
  "accepted": {
    "status": 202,
    "body": {
      "status": "queued"
    }
  },
  "alreadyAccepted": {
    "status": 409,
    "body": {
      "error": {
        "code": "INVITATION_ALREADY_ACCEPTED"
      }
    }
  }
}
\`\`\`

Do not let the agent invent error codes. If the codebase has an error enum, tell it to inspect that enum first.

## Prompts For Test Data Builders

Weak test data is the source of many false positives. A generated test that creates "user1" and "org1" without roles, plan state, or cleanup may pass locally and fail in CI. Ask the agent to use builders with explicit defaults.

\`\`\`text
Improve the test data setup for the subscription cancellation tests.

Goal:
- Replace inline object literals with the existing builders where possible.
- Make role, plan, renewal date, and payment state explicit in each test.
- Keep each test readable without hiding the key condition inside a helper.

Rules:
- Do not create a new factory framework.
- Do not change production data models.
- Prefer small builder calls local to the test file if no shared builder exists.

Verification:
- Run the current cancellation test file.
\`\`\`

A useful generated builder remains boring.

\`\`\`ts
type AccountInput = {
  role?: "owner" | "member";
  plan?: "free" | "pro";
  paymentState?: "active" | "past_due";
};

export function accountFixture(input: AccountInput = {}) {
  return {
    id: "acct_test_1",
    role: input.role ?? "owner",
    plan: input.plan ?? "pro",
    paymentState: input.paymentState ?? "active",
  };
}
\`\`\`

What people get wrong: they ask an agent to "make fixtures reusable" and get a giant abstraction that hides the actual test condition. Reuse is not the goal. Clear state is the goal.

## Prompt For Negative Testing Without Noise

Negative tests should prove rejection paths, not create a wall of invalid inputs that all fail for the same reason. Ask for representative classes.

\`\`\`text
Add negative tests for the CSV import endpoint.

Reject classes to cover:
- Missing required header.
- Unknown extra header when strict mode is enabled.
- Invalid date format in a valid column.
- Duplicate external id in the uploaded file.
- File larger than the configured limit.

For each case, assert:
- HTTP status.
- Stable error code.
- Human-readable message contains the field or row number when available.
- No imported records were committed.

Avoid:
- Ten copies of the same malformed row.
- Snapshotting the whole error response.
- Changing parser behavior without calling out the product decision.
\`\`\`

This style gives the agent enough surface area to build meaningful cases while avoiding combinatorial junk.

## Add A Review Gate To Every Generated Test

AI-generated tests need review like production code. The review should be specific. "Looks good" is not review.

| Review question | Why it catches bad output | Fix when it fails |
|---|---|---|
| Does the test fail before the fix? | Prevents vacuous regression tests | Run against old behavior or remove weak assertion |
| Does it assert user-visible behavior or contract? | Avoids testing implementation trivia | Rewrite assertion around output, state, or response |
| Is setup explicit enough? | Prevents hidden fixture dependency | Inline the important state |
| Is cleanup deterministic? | Prevents CI bleed | Use transaction, temp resource, or teardown hook |
| Is the filter command correct? | Prevents unverified code | Use Vitest -t or Playwright --grep as appropriate |

You can encode that review as a second prompt after the agent writes the test.

\`\`\`text
Review the test you just added.

Answer these points before making changes:
- What behavior does the test prove?
- Which assertion would fail if the original bug returned?
- Does the test depend on timing, order, or external data?
- Did you run the requested command?
- Did you change production code? If yes, why was it necessary?

Then improve only the test issues you found.
\`\`\`

For teams maintaining prompt suites, [system prompt regression testing](/blog/prompt-testing-system-prompt-regression) is the natural next layer: the prompt itself becomes something you can test across model and agent changes.

## A Failure Story: Green Generated Tests, Broken Checkout

The symptom was ugly: checkout allowed a canceled subscription to use a paid-only export. The team had asked an agent to "add tests around subscription permissions." It generated five tests, all green. The wrong theory was that the authorization middleware had a race with cached account state.

The actual cause was in the tests. Every generated fixture used the default account builder, and that builder defaulted to an active paid subscription. The test names said "canceled subscription," but the setup never created one. The assertions passed because the route should allow active paid users.

The fix was a better prompt and a review gate. The new prompt required the agent to make plan state explicit in every test and to state which assertion would fail before the production fix. The team also added a tiny fixture helper with no hidden billing defaults. The next generated test failed immediately on the old behavior, then passed after the middleware checked canceled status correctly.

The diagnosis pattern is worth remembering: symptom -> wrong theory -> actual cause -> fix. In agent work, the actual cause is often the prompt, not the model.

## CI Prompt For Generated Tests

Agents frequently stop after editing. Make the verification loop part of the task. In GitHub Actions, use the official action versions that exist and keep artifacts focused on failure evidence.

\`\`\`yaml
name: focused-tests

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --testNamePattern "billing"
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-output
          path: test-results
\`\`\`

A prompt for CI repair should be narrow.

\`\`\`text
Fix the failing billing tests in CI.

Evidence:
- Use the uploaded test-output artifact and the CI log.
- Identify the first failing assertion.
- Do not widen timeouts unless the failure is proven to be timing-related.
- Do not delete assertions.
- Prefer fixing fixtures or the product bug over changing expected values.

Verification:
- Run the same focused command locally.
- If local pass and CI fail differ, explain the environment difference before editing.
\`\`\`

This protects against the common agent move of changing expected output to match a regression.

## Keep A Small Prompt Library In The Repo

Store prompts near the tests they affect or in a small QA directory. Keep them versioned. Treat them as working tools, not inspirational docs.

\`\`\`markdown
# QA Agent Prompts

## Regression Test From Bug

Use when a bug report has a clear observed and expected behavior.

Inputs required:
- Bug report
- Target files
- Existing focused test command
- Required failing assertion

Prompt:
Create a regression test that fails on the current behavior before making a production fix...
\`\`\`

Ready-made QA skills install from qaskills.sh with the qaskills CLI, but your local prompt library should still name your app's helpers, commands, and contracts. Generic prompts get you started. Local prompts make the agent useful.

## Turn Good Prompts Into Checklists

A prompt library gets stronger when each prompt has a short checklist attached to it. The checklist is for the human reviewer and for the agent's second pass. It should be specific enough that a reviewer can reject weak output without debating style.

| Prompt family | Checklist item | Reject the output when |
|---|---|---|
| Regression | Test fails on old behavior | The test only proves the current bug |
| Playwright | No fixed waits | The test waits for arbitrary time |
| API contract | Error codes come from existing code | The agent invented response fields |
| Unit boundary | Invalid cases are named | Every failure path uses the same input |
| Fixture work | Key state is visible in the test | Defaults hide role, plan, or permission state |

Here is a compact reviewer prompt that works after any generation task.

\`\`\`text
Audit the generated test before finalizing.

Return:
- The behavior under test in one sentence.
- The exact assertion that protects the behavior.
- Any fixture defaults that affect the result.
- The focused command that was run.
- One reason this test could be flaky, or "none found" if no timing or shared-state risk is visible.

Then make only the changes needed to fix review findings.
\`\`\`

That final line matters. Without it, agents sometimes perform a second broad rewrite after review. The review prompt should narrow the work, not restart it.

## Frequently Asked Questions

### What makes an automated test prompt effective?

An effective automated test prompt names the behavior, the target files, the test runner, the data boundaries, and the command that proves success. It also says what is out of scope. The agent should not have to guess whether to use Playwright or Vitest, whether mocks are allowed, or whether production code may change. The prompt is good when the generated test can fail for the right reason before the fix and pass after a focused change.

### Should I ask an AI agent to write tests before or after fixing a bug?

Ask for the regression test first when the bug has a clear reproduction. That creates a guard against changing expected behavior to match the bug. If the failure cannot be reproduced because the defect is intermittent, ask the agent to collect evidence, isolate the likely boundary, and add the narrowest test that exposes the risk. After implementation, run the same focused command and review which assertion would fail if the bug returned.

### How many examples should I include in a test generation prompt?

Include enough examples to define the pattern, usually one nearby test file and one or two concrete cases. Too many examples can make the agent copy old mistakes. For boundary-heavy logic, give classes of input instead of a long list of values. For UI flows, give the user role, route, and expected visible states. The prompt should guide test design without turning into a transcript of the final code.

### How do I prevent AI-generated tests from becoming flaky?

Put anti-flake constraints in the prompt and enforce them in review. For UI tests, ban fixed waits, require accessible locators where the app supports them, and ask for specific readiness signals. For API and database tests, require isolated fixtures and deterministic cleanup. For time-sensitive logic, freeze time or inject a clock if the codebase already has that pattern. Always run the focused test more than once when the risk is timing-related.
`,
};
