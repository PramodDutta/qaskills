import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TDD with AI Agents \u2014 Best Practices for 2026',
  description:
    'A comprehensive guide to Test-Driven Development with AI coding agents. Covers Red-Green-Refactor workflow, Jest/Vitest and pytest examples, anti-patterns, and CI integration.',
  date: '2026-02-12',
  category: 'Tutorial',
  content: `
Test-driven development has always been about discipline. Write the test first, watch it fail, write the minimum code to make it pass, then refactor. AI coding agents have the speed to make TDD enormously productive -- but only if they follow the discipline. Without explicit guidance, most AI agents skip the Red phase entirely, writing implementation and tests simultaneously or worse, generating tests after the fact that merely confirm what the code already does.

## Key Takeaways

- TDD matters more with AI agents because speed without discipline produces technical debt at scale
- The Red-Green-Refactor cycle provides structure that AI agents need to produce reliable code
- QA skills enforce TDD discipline by embedding test-first rules into the agent's context
- Coverage metrics are necessary but not sufficient -- mutation testing reveals true test quality
- Both TypeScript (Jest/Vitest) and Python (pytest) workflows are covered with complete examples

This guide shows you how to use TDD with AI agents effectively, with complete code examples in both TypeScript and Python, common anti-patterns to avoid, and how QA skills enforce the discipline your agent needs.

---

## Why TDD Matters More Than Ever with AI Agents

AI agents can generate code at remarkable speed. A developer using [Claude Code](/agents/claude-code) or [Cursor](/agents/cursor) can implement a feature in minutes that would have taken hours manually. But speed without direction produces code that works in demos and breaks in production.

Without TDD, the typical AI agent workflow produces a dangerous pattern: the agent writes implementation code that appears correct, then generates tests that verify the code it just wrote. These tests pass by construction but do not verify actual requirements. They test what the code does, not what it should do.

TDD inverts this pattern. By requiring the test first, you force the AI agent to think about requirements before implementation. The failing test becomes the specification. The implementation is constrained to only what is necessary to satisfy that specification. The result is code that does what you need, nothing more.

---

## The TDD Cycle: Red, Green, Refactor

### Red Phase: Write a Failing Test

Instruct your AI agent to write a test that describes the behavior you want. Run it. Confirm it fails. The failure message should clearly indicate what is missing.

### Green Phase: Write Minimum Code

The agent writes only enough code to make the test pass. No extra features, no premature optimization, no anticipated requirements.

### Refactor Phase: Clean Up

With tests passing, restructure the code for readability and maintainability. Tests must remain green throughout.

---

## Setting Up TDD with Jest/Vitest (TypeScript)

\`\`\`bash
npx @qaskills/cli add jest-unit
# or for Vitest projects:
npx @qaskills/cli add vitest-unit
\`\`\`

### Red: Write the Failing Test

\`\`\`bash
// src/validators/password-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword } from './password-validator';

describe('validatePassword', () => {
  it('should accept a strong password', () => {
    expect(validatePassword('SecurePass1!')).toEqual({
      valid: true, errors: []
    });
  });

  it('should reject passwords shorter than 8 characters', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should reject passwords without uppercase', () => {
    const result = validatePassword('lowercase1!');
    expect(result.valid).toBe(false);
  });

  it('should reject passwords without special characters', () => {
    const result = validatePassword('NoSpecial1');
    expect(result.valid).toBe(false);
  });
});
\`\`\`

Run the tests. All fail because \`validatePassword\` does not exist yet. This is the Red phase.

### Green: Write Minimum Implementation

\`\`\`bash
// src/validators/password-validator.ts
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a digit');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  return { valid: errors.length === 0, errors };
}
\`\`\`

All tests pass. Green phase complete.

---

## Setting Up TDD with Pytest (Python)

\`\`\`bash
npx @qaskills/cli add pytest-patterns
\`\`\`

### Red: Write the Failing Test

\`\`\`bash
# tests/test_password_validator.py
import pytest
from src.validators.password_validator import validate_password

class TestPasswordValidator:
    def test_accepts_strong_password(self):
        result = validate_password("SecurePass1!")
        assert result.valid is True

    @pytest.mark.parametrize("password,expected_error", [
        ("Ab1!", "Password must be at least 8 characters"),
        ("lowercase1!", "Password must contain an uppercase letter"),
        ("UPPERCASE1!", "Password must contain a lowercase letter"),
        ("NoDigits!!", "Password must contain a digit"),
        ("NoSpecial1a", "Password must contain a special character"),
    ])
    def test_rejects_weak_passwords(self, password, expected_error):
        result = validate_password(password)
        assert result.valid is False
        assert expected_error in result.errors
\`\`\`

Run with \`pytest -v\`. All fail. Red phase.

### Green: Write Implementation

Write the Python implementation. All tests pass. Now refactor.

---

## How QA Skills Enforce TDD Discipline

When you install the \`tdd-workflow\` skill, your agent receives explicit instructions:

1. **Never write production code without a failing test**
2. **Take small increments** -- one test at a time
3. **Verify the Red phase** -- present failing test output before implementation
4. **Refactor as a separate step** -- prevent over-engineering during Green phase

\`\`\`bash
npx @qaskills/cli add tdd-workflow
npx @qaskills/cli add jest-unit
npx @qaskills/cli add pytest-patterns
\`\`\`

The same skills work across [Claude Code](/agents/claude-code), [Cursor](/agents/cursor), [GitHub Copilot](/agents/copilot), [Windsurf](/agents/windsurf), and [Cline](/agents/cline). Browse all skills at [qaskills.sh/skills](/skills).

---

## TDD Anti-Patterns AI Agents Must Avoid

1. **The "Test After" Trap** -- Agent writes implementation first. The TDD skill forbids this.
2. **The "Kitchen Sink" Test** -- One test verifying 15 things. Write one behavior per test.
3. **The "Mock Everything" Trap** -- Only mock external dependencies, not pure functions.
4. **The "Green Bar Addiction"** -- Hardcoded return values. Always follow up with a second test.
5. **Testing Implementation Details** -- Test behavior, not internal method calls.

---

## Real-World TDD Workflow: User Authentication Module

A complete Red-Green-Refactor walkthrough for an AuthService class that supports registration with email validation, login with JWT token generation, and password strength validation. Start with 7 failing tests covering happy paths and error states. Write minimum implementation. All pass. Then refactor by extracting a PasswordPolicy class -- existing tests still pass because we tested behavior, not implementation.

---

## Measuring TDD Effectiveness

### Coverage Thresholds

Set 80% minimum in your config:

\`\`\`bash
# Vitest
vitest run --coverage

# Pytest
pytest --cov=src --cov-report=term-missing --cov-fail-under=80
\`\`\`

### Beyond Coverage

- **Mutation testing**: Stryker (TypeScript) or mutmut (Python) -- introduces deliberate bugs to verify tests catch them
- **Test-to-code ratio**: Healthy TDD projects maintain 1:1 to 1.5:1
- **Time in Red**: Track how long tests stay failing
- **Defect escape rate**: Bugs reaching production despite tests

---

## TDD in CI/CD Pipelines

Enforce TDD with a GitHub Actions pipeline that runs tests, checks coverage thresholds, and verifies test files exist for new source files. Install the \`cicd-pipeline\` skill for proper pipeline configuration:

\`\`\`bash
npx @qaskills/cli add cicd-pipeline
\`\`\`

---

## TDD vs BDD: When to Use Which

- **Use TDD** for internal modules, services, utilities -- developer audience, fast feedback
- **Use BDD** for user-facing workflows, stakeholder-readable specifications
- **Combine both**: \`npx @qaskills/cli add tdd-workflow\` + \`npx @qaskills/cli add bdd-cucumber\` + \`npx @qaskills/cli add playwright-e2e\`

---

## Getting Started

\`\`\`bash
# TypeScript
npx @qaskills/cli add tdd-workflow
npx @qaskills/cli add vitest-unit

# Python
npx @qaskills/cli add tdd-workflow
npx @qaskills/cli add pytest-patterns

# Verify
npx @qaskills/cli list
\`\`\`

Then give your AI agent a test-first instruction: "Write a failing test for a \`calculateDiscount\` function. Do not write the implementation yet." Watch the Red-Green-Refactor cycle in action.

Browse all 450+ QA skills at [qaskills.sh/skills](/skills).

---

*Written by [Pramod Dutta](https://thetestingacademy.com), founder of The Testing Academy and QASkills.sh.*
`,
};
