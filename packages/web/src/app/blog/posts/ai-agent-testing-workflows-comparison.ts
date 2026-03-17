import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AI Agent Testing Workflows: Claude Code vs Cursor vs Copilot for QA in 2026',
  description:
    'In-depth comparison of AI agent testing workflows. Covers Claude Code with QA skills, Cursor rules for testing, GitHub Copilot test generation, prompt engineering for tests, and choosing the right AI testing workflow.',
  date: '2026-03-16',
  category: 'Guide',
  content: `
In 2026, AI coding agents are no longer just autocomplete engines. They are full-fledged **testing partners** capable of generating entire test suites, debugging flaky tests, and suggesting coverage improvements. But not all agents approach testing the same way, and the differences matter enormously for QA teams.

This guide provides a comprehensive, side-by-side comparison of **Claude Code**, **Cursor**, **GitHub Copilot**, and other emerging AI agents for QA testing workflows. We will examine how each agent handles test generation, what customization options are available, and -- critically -- how **QA skills from qaskills.sh** can supercharge any workflow.

## Key Takeaways

- **Claude Code with QA skills** offers the deepest testing customization through installable SKILL.md files that encode expert QA patterns directly into the agent's context
- **Cursor** provides powerful rules-based testing workflows through \`.cursorrules\` files but lacks a dedicated QA skill ecosystem
- **GitHub Copilot** excels at inline test completions and chat-based generation but offers limited persistent testing knowledge
- **Skill stacking** -- installing multiple complementary QA skills -- produces dramatically better test output than any single agent configuration
- The best workflow for most teams in 2026 is a **hybrid approach**: use qaskills.sh to install domain-specific testing knowledge, then leverage whichever agent fits your editor preference
- **300+ QA skills** are available on qaskills.sh, covering every major testing framework, pattern, and domain

---

## Introduction: AI Agents as Testing Partners

The conversation around AI agents in QA has shifted fundamentally. In 2024, the question was "Can AI write tests?" In 2025, it became "How good are AI-generated tests?" Now in 2026, the real question is: **"Which AI testing workflow produces production-grade tests that senior QA engineers would actually approve?"**

The answer depends on three factors:

1. **Base model capability** -- How well does the underlying LLM understand testing concepts?
2. **Context and customization** -- Can you feed the agent specialized QA knowledge?
3. **Workflow integration** -- How seamlessly does the agent fit into your existing testing pipeline?

Every major AI coding agent can generate a basic unit test. The differentiation happens when you need **framework-specific patterns** (Page Object Model for Playwright, custom commands for Cypress), **testing strategy** (when to use E2E vs integration vs unit), and **anti-pattern avoidance** (no hard-coded waits, no brittle selectors, no shared test state).

Let us examine how each agent handles these challenges.

---

## Claude Code Testing Workflow

**Claude Code** is Anthropic's CLI-based AI coding agent, designed for terminal-first workflows. For QA testing, it has a unique advantage: native support for **QA skills from qaskills.sh** that encode expert testing knowledge directly into the agent's context.

### Installing QA Skills

The core workflow starts with installing skills from the qaskills.sh directory:

\`\`\`bash
# Install a Playwright E2E testing skill
npx @qaskills/cli add playwright-e2e

# Install API testing patterns
npx @qaskills/cli add api-testing-rest

# Install accessibility testing knowledge
npx @qaskills/cli add accessibility-a11y

# Search for skills by keyword
npx @qaskills/cli search "performance"
\`\`\`

Each skill is a **SKILL.md file** -- a structured markdown document with YAML frontmatter that contains expert-level testing patterns, framework-specific idioms, project structure recommendations, anti-patterns to avoid, and real-world code examples. When Claude Code loads a skill, it gains deep domain knowledge that transforms its test output.

### The SKILL.md Format

Every skill follows a standardized format that AI agents can parse and apply:

\`\`\`yaml
---
name: playwright-e2e
version: 1.2.0
description: Expert Playwright E2E testing patterns
author: qaskills
tags:
  - playwright
  - e2e
  - browser-testing
testingTypes:
  - e2e
  - visual
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

Below the frontmatter, the skill contains detailed markdown instructions covering patterns, examples, anti-patterns, and decision trees. This structure means the skill is **not just documentation** -- it is machine-readable context that fundamentally changes how the agent approaches test generation.

### Skill Stacking: The Power of Multiple Skills

One of the most powerful techniques in Claude Code's testing workflow is **skill stacking** -- installing multiple complementary skills to create a comprehensive testing knowledge base:

\`\`\`bash
# Stack skills for full-stack testing coverage
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add api-testing-rest
npx @qaskills/cli add test-data-management
npx @qaskills/cli add visual-regression
npx @qaskills/cli add accessibility-a11y
\`\`\`

When Claude Code has all five skills loaded, it does not just write Playwright tests -- it writes Playwright tests that **also handle API mocking correctly**, **generate test data with proper factories**, **include visual regression checkpoints**, and **verify accessibility at each interaction step**. The skills compose together, producing test suites that a single skill alone could never achieve.

### Practical Workflow with Claude Code

Here is a real-world workflow for adding E2E tests to a React application:

\`\`\`bash
# Step 1: Install the relevant QA skill
npx @qaskills/cli add playwright-e2e

# Step 2: Ask Claude Code to generate tests
claude "Write E2E tests for the user registration flow.
Cover happy path, validation errors, duplicate email,
and password strength requirements."

# Step 3: Claude Code generates tests following the skill's patterns
# - Page Object Model with typed locators
# - Auto-waiting selectors (getByRole, getByLabel)
# - Fixture-based setup with test isolation
# - Proper assertion patterns
# - Cross-browser configuration
\`\`\`

The generated test follows every pattern defined in the skill:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { RegistrationPage } from './pages/registration.page';
import { testUsers } from './fixtures/users';

test.describe('User Registration', () => {
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    await registrationPage.navigate();
  });

  test('should register a new user successfully', async () => {
    await registrationPage.fillForm(testUsers.valid);
    await registrationPage.submit();
    await expect(registrationPage.successMessage).toBeVisible();
    await expect(registrationPage.successMessage).toContainText(
      'Welcome'
    );
  });

  test('should show validation errors for empty fields', async () => {
    await registrationPage.submit();
    await expect(registrationPage.emailError).toContainText(
      'Email is required'
    );
    await expect(registrationPage.passwordError).toContainText(
      'Password is required'
    );
  });

  test('should reject duplicate email addresses', async () => {
    await registrationPage.fillForm(testUsers.existing);
    await registrationPage.submit();
    await expect(registrationPage.emailError).toContainText(
      'already registered'
    );
  });

  test('should enforce password strength requirements', async () => {
    await registrationPage.fillForm({
      ...testUsers.valid,
      password: 'weak',
    });
    await registrationPage.submit();
    await expect(registrationPage.passwordError).toContainText(
      'at least 8 characters'
    );
  });
});
\`\`\`

Notice the **Page Object Model**, **role-based locators**, **fixture-based test data**, and **descriptive test names**. None of this is accidental -- every pattern comes directly from the installed skill.

### How Skills Augment Test Generation

Without a QA skill, Claude Code still generates functional tests. But the difference is stark:

- **Without skill**: Raw CSS selectors, hard-coded waits, inline test data, no page objects, happy-path only
- **With skill**: Role-based locators, auto-waiting assertions, fixture-based data, POM pattern, edge case coverage, proper test isolation

The skill acts as a **persistent knowledge layer** that survives across sessions. You install it once, and every future test generation session benefits from it.

---

## Cursor Testing Workflow

**Cursor** is an AI-powered code editor forked from VS Code, featuring deep AI integration through its Composer mode, inline edits, and chat panel. For testing, Cursor offers a different approach to customization: **rules files**.

### Rules Files for Testing Patterns

Cursor uses \`.cursorrules\` files (or the newer \`.cursor/rules/\` directory structure) to provide persistent context to its AI features. You can create testing-specific rules:

\`\`\`markdown
# .cursor/rules/testing.md

## Testing Standards

- Always use Playwright for E2E tests
- Follow the Page Object Model pattern
- Use getByRole and getByLabel selectors, never raw CSS
- Every test must be independent and isolated
- Use test fixtures for common setup
- Include both happy path and error scenarios
- Name tests descriptively: "should [action] when [condition]"
\`\`\`

### Composer Mode for Test Suites

Cursor's Composer mode allows multi-file generation, which is useful for creating test suites that span page objects, fixtures, and test files simultaneously. You can prompt:

> "Create a complete Playwright test suite for the checkout flow. Include page objects for CartPage, CheckoutPage, and ConfirmationPage. Add fixtures for test products and users."

Composer generates all files in one pass, maintaining consistency across the page objects and tests.

### Cursor Testing Limitations

While Cursor's rules system is flexible, it has notable limitations for QA workflows:

1. **No skill ecosystem**: You must write all testing rules manually. There is no curated directory of expert-written testing patterns to install
2. **Rules are project-scoped**: Sharing testing patterns across projects requires manually copying rules files
3. **No validation**: Rules files have no schema or validation -- there is no guarantee the AI will follow them consistently
4. **Limited composability**: You cannot easily stack multiple specialized testing configurations the way you can with QA skills

Cursor is excellent for teams that want to maintain their own testing standards in code. But for teams that want **expert-curated, community-validated testing patterns**, the qaskills.sh ecosystem provides a more structured approach. And since QA skills from qaskills.sh are compatible with Cursor, you can install them and reference the SKILL.md content in your Cursor rules for the best of both worlds.

---

## GitHub Copilot Testing Workflow

**GitHub Copilot** has evolved significantly since its launch, now offering inline completions, chat-based generation, and workspace-aware suggestions. For testing, Copilot takes a more integrated approach through its IDE extensions and GitHub-native features.

### Inline Test Completions

Copilot's strongest testing feature remains its inline completions. When you open a test file and start typing, Copilot suggests test implementations based on:

- The function or component being tested
- Existing test patterns in your codebase
- The testing framework detected in your project

\`\`\`typescript
// Type a test description and Copilot completes it
test('should calculate total with discount', () => {
  // Copilot suggests the implementation based on your
  // calculateTotal function signature and existing tests
});
\`\`\`

### Chat-Based Test Generation

Copilot Chat (available in VS Code and GitHub.com) can generate tests from natural language:

> "/tests Write unit tests for the ShoppingCart class covering add, remove, and calculateTotal methods"

This generates a complete test file. The quality depends heavily on the context available -- Copilot performs best when it can see the source code being tested.

### Custom Instructions with copilot-instructions.md

GitHub Copilot now supports a \`.github/copilot-instructions.md\` file for repository-level customization:

\`\`\`markdown
# .github/copilot-instructions.md

## Testing Guidelines
- Use Vitest for unit tests, Playwright for E2E
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies with vi.mock()
- Use descriptive test names following the convention:
  "should [expected behavior] when [condition]"
- Aim for >80% branch coverage
- Always test error paths and edge cases
\`\`\`

### Copilot Limitations for QA

GitHub Copilot's testing limitations include:

1. **Context window constraints**: Copilot has a smaller effective context window than Claude Code, limiting the amount of testing knowledge it can apply simultaneously
2. **No persistent skill system**: Custom instructions are basic compared to structured SKILL.md files with framework-specific patterns, anti-patterns, and decision trees
3. **Inline completion bias**: Copilot tends to mimic nearby code patterns, which means if your existing tests have bad patterns, it will replicate them
4. **Limited multi-file awareness**: Generating coordinated page objects, fixtures, and tests across multiple files is less seamless than in Composer-style workflows

That said, Copilot's tight integration with GitHub (Actions, PRs, code review) makes it valuable in **CI/CD-centric workflows** where test generation happens alongside pull requests.

---

## Windsurf, Codex, and Other Agents

The AI coding agent landscape extends beyond the big three. Here is a brief look at other agents relevant to QA testing:

### Windsurf (Codeium)

Windsurf offers a Cursor-like experience with its Cascade feature for multi-step reasoning. For testing, it supports custom rules and has strong multi-file generation. Its testing workflow is similar to Cursor but with a different AI backend. Windsurf supports QA skills from qaskills.sh through its rules system.

### OpenAI Codex CLI

OpenAI's Codex CLI agent operates in the terminal like Claude Code. It can generate tests from natural language prompts and has access to your full project context. While it lacks a native skill system, you can provide testing context through project-level markdown files that Codex reads automatically.

### Amazon Q Developer

Amazon Q (formerly CodeWhisperer) integrates with AWS services and is particularly strong at generating tests for Lambda functions, API Gateway endpoints, and DynamoDB operations. Its testing capabilities are specialized for AWS-centric stacks.

### Augment Code

Augment Code focuses on codebase-aware AI assistance with deep indexing of your entire repository. For testing, this means it can generate tests that accurately reference real types, interfaces, and patterns across your codebase.

---

## Head-to-Head Comparison Table

| Feature | Claude Code + QA Skills | Cursor | GitHub Copilot | Windsurf |
|---|---|---|---|---|
| **Skill System** | Native (qaskills.sh, 300+ skills) | Rules files (manual) | copilot-instructions.md | Rules files (manual) |
| **Test Generation Quality** | Excellent with skills | Good with rules | Good for inline | Good with Cascade |
| **Multi-File Generation** | Yes (terminal workflow) | Yes (Composer) | Limited | Yes (Cascade) |
| **Framework Awareness** | Deep (via SKILL.md) | Moderate (via rules) | Basic (via context) | Moderate (via rules) |
| **Customizability** | Highest (structured skills) | High (flexible rules) | Moderate (instructions) | High (flexible rules) |
| **CI/CD Integration** | CLI-native | Editor-based | GitHub-native | Editor-based |
| **Test Pattern Enforcement** | Strong (skill-driven) | Moderate (rule-driven) | Weak (suggestion-based) | Moderate (rule-driven) |
| **Skill Sharing/Reuse** | Built-in (npm registry) | Manual copy | Per-repo file | Manual copy |
| **Community Skills** | 300+ curated QA skills | None | None | None |
| **Anti-Pattern Detection** | Yes (skills include anti-patterns) | If configured | No | If configured |
| **Cost** | CLI free, Anthropic API | \\\$20/mo editor | \\\$10-19/mo | \\\$15/mo editor |
| **Editor Lock-in** | None (terminal) | Cursor editor | VS Code / JetBrains | Windsurf editor |

---

## Practical Example: Same Component, Three Agents

To illustrate the real differences, let us test the same React component with each agent. Here is the component:

\`\`\`typescript
// UserProfile.tsx
interface UserProfileProps {
  userId: string;
  onSave: (data: UserData) => Promise<void>;
}

interface UserData {
  name: string;
  email: string;
  bio: string;
}

export function UserProfile({ userId, onSave }: UserProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUserData).catch(() => setError('Failed to load'));
  }, [userId]);

  const handleSave = async () => {
    if (!userData) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(userData);
      setIsEditing(false);
    } catch {
      setError('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (error) return <div role="alert">{error}</div>;
  if (!userData) return <div aria-busy="true">Loading...</div>;

  return (
    <div>
      <h1>{userData.name}</h1>
      {isEditing ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <label>
            Name
            <input value={userData.name}
              onChange={(e) => setUserData({...userData, name: e.target.value})} />
          </label>
          <label>
            Email
            <input type="email" value={userData.email}
              onChange={(e) => setUserData({...userData, email: e.target.value})} />
          </label>
          <label>
            Bio
            <textarea value={userData.bio}
              onChange={(e) => setUserData({...userData, bio: e.target.value})} />
          </label>
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
        </form>
      ) : (
        <button onClick={() => setIsEditing(true)}>Edit Profile</button>
      )}
    </div>
  );
}
\`\`\`

### Claude Code with QA Skills Output

With \`npx @qaskills/cli add playwright-e2e\` and \`npx @qaskills/cli add react-component-testing\` installed:

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { UserProfile } from './UserProfile';
import { createMockUser, createMockOnSave } from './fixtures/user.fixtures';

test.describe('UserProfile Component', () => {
  test('should render user data after loading', async ({ mount }) => {
    const mockUser = createMockUser();
    const component = await mount(
      <UserProfile userId="user-1" onSave={createMockOnSave()} />
    );
    await expect(component.getByRole('heading', { name: mockUser.name }))
      .toBeVisible();
  });

  test('should show loading state initially', async ({ mount }) => {
    const component = await mount(
      <UserProfile userId="user-1" onSave={createMockOnSave()} />
    );
    await expect(component.getByRole('generic', { busy: true }))
      .toBeVisible();
  });

  test('should enter edit mode and save changes', async ({ mount }) => {
    const onSave = createMockOnSave();
    const component = await mount(
      <UserProfile userId="user-1" onSave={onSave} />
    );
    await component.getByRole('button', { name: 'Edit Profile' }).click();
    await component.getByLabel('Name').fill('Updated Name');
    await component.getByLabel('Email').fill('updated@example.com');
    await component.getByRole('button', { name: 'Save' }).click();
    await expect(component.getByRole('button', { name: 'Edit Profile' }))
      .toBeVisible();
  });

  test('should show error state when save fails', async ({ mount }) => {
    const failingSave = async () => { throw new Error('Network error'); };
    const component = await mount(
      <UserProfile userId="user-1" onSave={failingSave} />
    );
    await component.getByRole('button', { name: 'Edit Profile' }).click();
    await component.getByRole('button', { name: 'Save' }).click();
    await expect(component.getByRole('alert')).toContainText('Failed to save');
  });

  test('should cancel editing without saving', async ({ mount }) => {
    const onSave = createMockOnSave();
    const component = await mount(
      <UserProfile userId="user-1" onSave={onSave} />
    );
    await component.getByRole('button', { name: 'Edit Profile' }).click();
    await component.getByLabel('Name').fill('Changed Name');
    await component.getByRole('button', { name: 'Cancel' }).click();
    await expect(component.getByRole('button', { name: 'Edit Profile' }))
      .toBeVisible();
  });

  test('should disable save button while saving', async ({ mount }) => {
    const slowSave = () => new Promise((r) => setTimeout(r, 2000));
    const component = await mount(
      <UserProfile userId="user-1" onSave={slowSave} />
    );
    await component.getByRole('button', { name: 'Edit Profile' }).click();
    await component.getByRole('button', { name: 'Save' }).click();
    await expect(component.getByRole('button', { name: 'Saving...' }))
      .toBeDisabled();
  });
});
\`\`\`

**Key patterns from skills**: Fixture factories, role-based locators throughout, error state testing, loading state testing, disabled state verification, descriptive test names.

### Cursor Output (with .cursorrules)

With a testing rules file configured:

\`\`\`typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './UserProfile';
import { vi } from 'vitest';

describe('UserProfile', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        name: 'John Doe', email: 'john@example.com', bio: 'A developer'
      }),
    });
  });

  it('renders user profile data', async () => {
    render(<UserProfile userId="1" onSave={mockOnSave} />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('allows editing and saving', async () => {
    render(<UserProfile userId="1" onSave={mockOnSave} />);
    await waitFor(() => screen.getByText('John Doe'));
    await userEvent.click(screen.getByText('Edit Profile'));
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Jane Doe');
    await userEvent.click(screen.getByText('Save'));
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane Doe' })
    );
  });

  it('handles save errors', async () => {
    mockOnSave.mockRejectedValueOnce(new Error('Failed'));
    render(<UserProfile userId="1" onSave={mockOnSave} />);
    await waitFor(() => screen.getByText('John Doe'));
    await userEvent.click(screen.getByText('Edit Profile'));
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to save');
    });
  });
});
\`\`\`

**Assessment**: Good test structure, proper use of Testing Library, but fewer test cases (no loading state, no cancel test, no disabled button test). Relies on global fetch mocking rather than fixture factories.

### GitHub Copilot Output

With default configuration and copilot-instructions.md:

\`\`\`typescript
import { render, screen } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('should render loading state', () => {
    render(<UserProfile userId="1" onSave={jest.fn()} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render user data', async () => {
    render(<UserProfile userId="1" onSave={jest.fn()} />);
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
  });

  it('should toggle edit mode', async () => {
    render(<UserProfile userId="1" onSave={jest.fn()} />);
    const editButton = await screen.findByText('Edit Profile');
    editButton.click();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });
});
\`\`\`

**Assessment**: Minimal test coverage, uses Jest (not Vitest -- did not detect project config), incomplete assertions, no error path testing, no save verification. This is typical of Copilot without detailed custom instructions.

### The Verdict

The Claude Code + QA skills output is **measurably more comprehensive**: 6 test cases vs 3-4, fixture factories vs inline mocks, full state machine coverage (loading, display, editing, saving, error, cancel) vs partial coverage. This is not because Claude is inherently better -- it is because the **installed QA skills provided specific, actionable testing patterns** that the other agents lacked.

---

## When to Use Which Agent

Choosing the right AI testing workflow depends on your team's context. Here is a decision matrix:

**Choose Claude Code + QA Skills when:**
- You want the highest quality test output with minimal configuration
- Your team works across multiple testing frameworks and needs deep expertise in each
- You prefer terminal-based workflows and CI/CD integration
- You want to share testing standards across teams via installable skills
- You are building a testing center of excellence

**Choose Cursor when:**
- Your team is VS Code-native and wants an integrated editor experience
- You have existing testing standards you want to encode as rules
- You use Composer mode for multi-file test generation
- You need quick iteration on tests with inline AI assistance

**Choose GitHub Copilot when:**
- Your workflow is GitHub-centric (PRs, Actions, code review)
- You need inline test completions while writing code
- Your testing needs are straightforward (unit tests, simple integration tests)
- Budget is a primary concern

**Choose a hybrid approach when:**
- You want the best of all worlds
- Install QA skills from qaskills.sh for expert testing patterns
- Use your preferred editor's AI features for day-to-day test writing
- Use Claude Code for complex test suite generation and test strategy

---

## Combining Agents with QA Skills

The qaskills.sh ecosystem is **agent-agnostic by design**. While QA skills install natively into Claude Code, the SKILL.md format is plain markdown that any AI agent can consume. Here is how to use QA skills with different agents:

### With Claude Code (Native)

\`\`\`bash
npx @qaskills/cli add playwright-e2e
npx @qaskills/cli add api-testing-rest
# Skills are automatically loaded into Claude Code's context
\`\`\`

### With Cursor (Via Rules)

\`\`\`bash
# Install the skill to get the SKILL.md file
npx @qaskills/cli add playwright-e2e --agent cursor

# The skill content is placed in your .cursor/rules/ directory
# Cursor automatically picks it up as context
\`\`\`

### With Copilot (Via Instructions)

\`\`\`bash
# Install the skill and reference it in your copilot instructions
npx @qaskills/cli add playwright-e2e

# Copy key patterns into .github/copilot-instructions.md
# or reference the SKILL.md file in your workspace
\`\`\`

### The QA Skills Ecosystem

With **300+ curated QA skills** available on [qaskills.sh](/skills), there is specialized testing knowledge for virtually every framework and domain:

- **E2E Testing**: Playwright, Cypress, Selenium, WebDriverIO, TestCafe
- **Unit Testing**: Vitest, Jest, pytest, JUnit, NUnit, Go testing
- **API Testing**: REST Assured, Postman, Playwright API, SuperTest, k6
- **Performance**: k6, JMeter, Gatling, Artillery, Lighthouse
- **Security**: OWASP ZAP, Burp Suite patterns, SAST/DAST workflows
- **Mobile**: Appium, Detox, Maestro, XCTest, Espresso
- **Accessibility**: axe-core, Pa11y, WAVE, screen reader testing
- **Visual**: Percy, Chromatic, Playwright visual comparison, Applitools
- **Data**: Test data management, database testing, fixture factories
- **Specialized**: Contract testing, chaos engineering, mutation testing, BDD/Cucumber

Browse the full catalog at [qaskills.sh/skills](/skills) or search from your terminal:

\`\`\`bash
npx @qaskills/cli search "your-framework"
\`\`\`

---

## Best Practices for AI Testing Workflows

Regardless of which agent you choose, these ten practices will maximize the quality of AI-generated tests:

### 1. Always Install Domain-Specific Skills First

Before asking any agent to generate tests, install the relevant QA skills. The difference between generic test output and skill-augmented output is dramatic.

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

### 2. Provide Explicit Test Scope

Never ask "write tests for this component." Instead, specify exactly what behaviors to test, what edge cases to cover, and what patterns to follow.

### 3. Use the Testing Pyramid

Instruct your agent to follow the testing pyramid. Most tests should be unit tests, fewer integration tests, and the fewest E2E tests. QA skills from qaskills.sh encode this strategy automatically.

### 4. Review AI-Generated Selectors

The most common flaw in AI-generated tests is **brittle selectors**. Always verify that tests use accessible, role-based selectors rather than CSS classes or auto-generated IDs.

### 5. Enforce Test Isolation

Every test must be independent. AI agents sometimes generate tests that share state through global variables or depend on test execution order. QA skills include explicit anti-patterns to prevent this.

### 6. Validate Assertion Quality

AI agents tend to write **weak assertions** like \`expect(element).toBeTruthy()\` instead of specific assertions like \`expect(element).toHaveText('Expected value')\`. Skills teach agents to use strong, specific assertions.

### 7. Include Negative Test Cases

Prompt your agent explicitly for error paths, boundary conditions, and invalid input scenarios. QA skills include patterns for systematic negative testing.

### 8. Use Fixture Factories Over Inline Data

Hard-coded test data makes tests brittle and hard to maintain. QA skills teach agents to generate factory functions that create test data with sensible defaults and easy overrides.

### 9. Integrate Tests Into CI/CD Early

Do not treat AI-generated tests as throwaway code. Configure your CI/CD pipeline to run them on every PR. QA skills include CI configuration patterns for GitHub Actions, GitLab CI, and other platforms.

### 10. Stack Skills for Comprehensive Coverage

A single skill covers one testing dimension. Stack multiple skills to get multi-dimensional coverage that addresses functional, visual, accessibility, and performance testing simultaneously.

---

## The Future: Autonomous Testing Agents

The trajectory of AI testing workflows points toward **fully autonomous testing agents** that can:

- **Observe application changes** and automatically generate relevant tests
- **Detect uncovered code paths** and propose tests without human prompting
- **Self-heal failing tests** by analyzing DOM changes and updating selectors
- **Optimize test suites** by identifying redundant tests and coverage gaps
- **Run exploratory testing sessions** that discover bugs humans would miss

We are already seeing early versions of this with agentic testing loops in Claude Code, where the agent can run tests, analyze failures, fix the tests, and re-run them autonomously. The key bottleneck is not the AI's reasoning ability -- it is the **quality of testing knowledge** the agent has access to.

This is exactly why QA skills matter so much. As agents become more autonomous, the skills they have installed determine the **ceiling of their testing capability**. An autonomous agent with expert Playwright knowledge (via a QA skill) will produce fundamentally different results than one relying on generic training data.

The future of QA is not AI replacing testers. It is AI agents, **augmented with expert testing knowledge from ecosystems like qaskills.sh**, working alongside QA engineers to achieve testing coverage and quality that neither could achieve alone.

---

## Conclusion

The AI agent testing landscape in 2026 offers genuine choice. **Claude Code** with QA skills provides the deepest testing customization and highest quality output. **Cursor** offers a polished editor-integrated experience with flexible rules. **GitHub Copilot** delivers tight GitHub integration and solid inline completions.

But the real insight is this: **the agent matters less than the knowledge you give it**. A mediocre agent with expert QA skills installed will outperform a powerful agent with no testing context. That is why the qaskills.sh ecosystem -- with its 300+ curated, community-validated QA skills -- is the most impactful investment you can make in your AI testing workflow, regardless of which agent you prefer.

Get started in 30 seconds:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Browse all skills at [qaskills.sh/skills](/skills). Your AI agent's testing quality will thank you.
`,
};
