import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Storybook Component Testing — Interaction Tests, Visual Testing, and CI',
  description:
    'Complete guide to Storybook component testing. Covers interaction testing, play functions, Chromatic visual testing, accessibility addon, and CI/CD integration.',
  date: '2026-02-23',
  category: 'Tutorial',
  content: `
Storybook has evolved far beyond a design system documentation tool. In 2026, it is a full-fledged **component testing platform** that lets you write interaction tests, run visual regression checks, validate accessibility, and execute everything in CI -- all without spinning up your entire application. If you are building UI components in React, Vue, Angular, or Svelte, Storybook testing gives you isolated, reproducible, and fast feedback loops that traditional E2E tests cannot match. This guide covers everything you need to implement storybook testing in your workflow: from writing stories as test cases with CSF3 format, to interaction testing with play functions, Chromatic visual testing, accessibility validation, portable stories in Vitest and Playwright, coverage reporting, and CI/CD integration with GitHub Actions.

---

## Key Takeaways

- **Storybook is a component testing platform**, not just a design system tool -- it supports interaction testing, visual regression, accessibility checks, and coverage reporting out of the box
- **Stories are test cases** -- every story you write in CSF3 format is a testable specification of how your component behaves with specific props, states, and user interactions
- **Play functions** turn stories into interaction tests using \`@storybook/test\` utilities (\`expect\`, \`userEvent\`, \`within\`) that run directly in the browser with full DOM access
- **Chromatic visual testing** captures screenshots of every story on every PR, detects visual regressions, and provides a team approval workflow -- with TurboSnap for faster builds
- **Portable stories** via \`composeStories\` let you reuse your Storybook stories in Vitest, Jest, and Playwright tests without duplicating setup or test data
- AI agents equipped with QA skills from [QASkills.sh](/skills) can generate comprehensive Storybook test suites automatically, including interaction tests, accessibility checks, and CI workflows

---

## Why Storybook for Testing?

Traditional component testing approaches force you to choose between speed and realism. Unit tests with \`jsdom\` are fast but render components in a simulated environment that does not match real browser behavior. E2E tests with Playwright or Cypress run in real browsers but require your entire application to be running, making them slow and brittle for component-level testing.

**Storybook testing** sits in the middle. Components render in a real browser (or headless browser in CI) but in isolation -- without routing, global state, API dependencies, or other components getting in the way. This isolation provides several testing advantages:

- **Deterministic rendering** -- Each story controls exactly which props, state, and context a component receives. No shared global state means no flaky interactions between tests.
- **Visual documentation doubles as tests** -- The stories you write to showcase your design system are the same stories that run as visual regression tests. Zero duplication.
- **Interaction testing in the browser** -- Play functions execute user interactions (\`click\`, \`type\`, \`hover\`) in a real browser environment, not a \`jsdom\` simulation. This means your tests exercise real event handling, focus management, and DOM mutations.
- **Framework-agnostic** -- The same testing patterns work across React, Vue, Angular, Svelte, and web components. Your storybook testing knowledge transfers between projects.
- **Incremental adoption** -- You do not need to rewrite your existing test suite. Storybook tests complement your unit and E2E tests by filling the gap in component-level coverage.

The shift from "design system documentation tool" to "component testing platform" happened with Storybook 7's introduction of the **test runner** and **play functions**, and Storybook 8 cemented it by integrating \`@storybook/test\` (built on Vitest's \`expect\` and Testing Library's \`userEvent\`). Today, teams use Storybook as their primary component testing framework, with interaction tests, visual regression tests, and accessibility checks all running from the same story files.

---

## Writing Stories as Test Cases

Every Storybook story is a test case. In **Component Story Format 3 (CSF3)**, stories are plain objects that define the props, decorators, and rendering context for a component. This format makes stories composable, type-safe, and easy to extend with testing behavior.

Here is a complete story file for a \`LoginForm\` component that defines multiple test variants:

\`\`\`typescript
// LoginForm.stories.ts
import type { Meta, StoryObj } from '@storybook/react';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  // Decorators wrap every story with shared context
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  // Default args applied to all stories
  args: {
    onSubmit: fn(),
    onForgotPassword: fn(),
  },
  // Arg types for Storybook controls panel
  argTypes: {
    onSubmit: { action: 'submitted' },
    onForgotPassword: { action: 'forgot-password' },
  },
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

// Default state -- empty form ready for input
export const Default: Story = {};

// Pre-filled state -- form with valid credentials
export const PreFilled: Story = {
  args: {
    defaultEmail: 'user@example.com',
    defaultPassword: 'securepassword123',
  },
};

// Loading state -- form during submission
export const Loading: Story = {
  args: {
    isLoading: true,
    defaultEmail: 'user@example.com',
  },
};

// Error state -- form showing server error
export const ServerError: Story = {
  args: {
    error: 'Invalid email or password. Please try again.',
    defaultEmail: 'user@example.com',
  },
};

// Validation error state -- form with field-level errors
export const ValidationErrors: Story = {
  args: {
    fieldErrors: {
      email: 'Please enter a valid email address',
      password: 'Password must be at least 8 characters',
    },
  },
};

// Disabled state -- form when authentication is unavailable
export const Disabled: Story = {
  args: {
    disabled: true,
    disabledMessage: 'Authentication service is temporarily unavailable',
  },
};
\`\`\`

Each of these stories serves double duty. In the Storybook UI, they document the component's visual states for designers and developers. In CI, they become **visual regression test cases** (via Chromatic) and **interaction test targets** (via play functions). The \`fn()\` helper from \`@storybook/test\` creates mock functions that record calls, which play functions can assert against.

**Key CSF3 concepts:**

| Concept | Purpose | Example |
|---|---|---|
| **Meta** | Component-level configuration (title, decorators, default args) | \`const meta: Meta<typeof LoginForm>\` |
| **StoryObj** | Type-safe story definition | \`type Story = StoryObj<typeof LoginForm>\` |
| **args** | Props passed to the component | \`args: { isLoading: true }\` |
| **decorators** | Wrappers providing context (providers, layouts) | Theme provider, router context |
| **play** | Interaction test function (covered next section) | User clicks, typing, assertions |
| **parameters** | Story metadata (viewport, backgrounds, chromatic) | \`parameters: { chromatic: { delay: 500 } }\` |

---

## Interaction Testing with Play Functions

**Play functions** transform static stories into interactive tests. A play function runs after the story renders, simulating user behavior and asserting outcomes -- all inside a real browser. Storybook's \`@storybook/test\` module provides \`expect\` (from Vitest), \`userEvent\` (from Testing Library), \`within\` (scoped queries), and \`fn\` (mock functions) out of the box.

Here is a complete interaction test for the \`LoginForm\` component:

\`\`\`typescript
// LoginForm.stories.ts (adding play functions to existing stories)
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  args: {
    onSubmit: fn(),
    onForgotPassword: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

// Test: successful form submission
export const SuccessfulSubmission: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Find form elements
    const emailInput = canvas.getByLabelText(/email/i);
    const passwordInput = canvas.getByLabelText(/password/i);
    const submitButton = canvas.getByRole('button', { name: /sign in/i });

    // Simulate user typing
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, 'securepassword123');

    // Submit the form
    await userEvent.click(submitButton);

    // Assert the onSubmit handler was called with correct data
    await expect(args.onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'securepassword123',
    });
  },
};

// Test: form validation prevents empty submission
export const EmptySubmission: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const submitButton = canvas.getByRole('button', { name: /sign in/i });

    // Submit without filling in any fields
    await userEvent.click(submitButton);

    // Assert validation errors appear
    await expect(
      canvas.getByText(/please enter a valid email/i)
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/password is required/i)
    ).toBeInTheDocument();

    // Assert onSubmit was NOT called
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// Test: password visibility toggle
export const PasswordToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const passwordInput = canvas.getByLabelText(/password/i);
    const toggleButton = canvas.getByRole('button', {
      name: /show password/i,
    });

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await userEvent.click(toggleButton);
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle to hide password again
    await userEvent.click(toggleButton);
    await expect(passwordInput).toHaveAttribute('type', 'password');
  },
};

// Test: forgot password link
export const ForgotPasswordClick: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const forgotLink = canvas.getByRole('link', {
      name: /forgot password/i,
    });

    await userEvent.click(forgotLink);

    await expect(args.onForgotPassword).toHaveBeenCalledTimes(1);
  },
};

// Test: keyboard navigation (Tab order)
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Tab through the form
    await userEvent.tab();
    await expect(canvas.getByLabelText(/email/i)).toHaveFocus();

    await userEvent.tab();
    await expect(canvas.getByLabelText(/password/i)).toHaveFocus();

    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: /sign in/i })
    ).toHaveFocus();
  },
};
\`\`\`

**Key interaction testing patterns:**

- **\`within(canvasElement)\`** -- Scopes all queries to the story's rendered output, preventing cross-story interference
- **\`userEvent\` over \`fireEvent\`** -- \`userEvent\` simulates real user behavior including focus, blur, keyboard events, and pointer events. \`fireEvent\` dispatches synthetic events that skip browser behavior
- **\`await\` every interaction** -- Play functions are async. Each \`userEvent\` call triggers real DOM updates that may be asynchronous. Always await them
- **\`args.onSubmit\`** -- Mock functions created with \`fn()\` in the meta \`args\` are available in the play function. Assert on them to verify callback behavior
- **\`expect\` from \`@storybook/test\`** -- Uses Vitest's \`expect\` API with Testing Library's DOM matchers (\`toBeInTheDocument\`, \`toHaveAttribute\`, \`toHaveFocus\`)

You can run all play functions as tests using the **Storybook test runner**:

\`\`\`bash
# Install the test runner
npm install --save-dev @storybook/test-runner

# Run all interaction tests
npx test-storybook

# Run against a specific story
npx test-storybook --stories="**/LoginForm.stories.ts"
\`\`\`

The test runner launches a headless browser, navigates to each story, executes its play function, and reports pass/fail results in your terminal -- just like any other test framework.

---

## Visual Testing with Chromatic

**Chromatic** is a cloud-based visual testing service built by the Storybook maintainers. It captures a screenshot of every story on every commit, compares them against baselines, and provides a web-based approval workflow for reviewing visual changes. Chromatic is the most natural fit for storybook testing because it understands the Storybook story format natively -- every story automatically becomes a visual test case with zero additional configuration.

### Setup

\`\`\`bash
# Install Chromatic
npm install --save-dev chromatic

# Run your first visual test build
npx chromatic --project-token=chpt_your_token_here
\`\`\`

On the first run, Chromatic captures baseline screenshots of every story. On subsequent runs, it compares new screenshots against these baselines and flags any visual differences.

### How Visual Regression Works at Scale

Chromatic's workflow follows a capture-compare-review cycle:

1. **Capture** -- Chromatic builds your Storybook, navigates to every story, and captures a screenshot in a consistent browser environment (Chromium). It waits for fonts, images, and animations to settle before capturing.
2. **Compare** -- Each screenshot is compared pixel-by-pixel against the approved baseline. Chromatic's comparison engine detects meaningful visual differences while filtering out anti-aliasing noise.
3. **Review** -- Changed stories appear in a web dashboard with side-by-side diffs. Team members can **accept** changes (updating the baseline) or **deny** them (flagging a regression). Only accepted changes become the new baseline.
4. **Gate** -- Chromatic integrates with your CI pipeline as a required check. PRs cannot merge until all visual changes are reviewed and accepted.

### Configuring Chromatic Per-Story

You can control Chromatic's behavior at the story level using **parameters**:

\`\`\`typescript
export const AnimatedComponent: Story = {
  parameters: {
    chromatic: {
      // Wait for animations to complete before capturing
      delay: 1000,
      // Capture at multiple viewport widths
      viewports: [375, 768, 1280],
      // Disable snapshot for this story
      // disableSnapshot: true,
      // Increase diff threshold for stories with minor rendering variations
      diffThreshold: 0.2,
    },
  },
};
\`\`\`

| Parameter | Purpose | Default |
|---|---|---|
| \`delay\` | Milliseconds to wait after render before capturing | 0 |
| \`viewports\` | Array of viewport widths to capture | [1200] |
| \`diffThreshold\` | Pixel difference sensitivity (0 = exact, 1 = lenient) | 0.063 |
| \`disableSnapshot\` | Skip this story in visual tests | false |
| \`pauseAnimationAtEnd\` | Pause CSS animations on last frame before capture | false |

### TurboSnap for Faster Builds

As your Storybook grows to hundreds or thousands of stories, capturing every screenshot on every commit becomes slow and expensive. **TurboSnap** solves this by analyzing your git changes and only re-capturing stories whose dependencies changed.

\`\`\`bash
# Enable TurboSnap
npx chromatic --project-token=chpt_your_token --only-changed
\`\`\`

TurboSnap traces the import graph from each story file to determine which stories are affected by a code change. If you modify a \`Button\` component, only stories that import \`Button\` (directly or transitively) are re-captured. Stories unaffected by the change are skipped, reusing the previous baseline. Teams report **50-80% reduction in snapshot count** with TurboSnap enabled, which translates directly to faster builds and lower costs.

### Approval Workflow

Chromatic's review workflow integrates directly with GitHub pull requests:

1. A developer opens a PR with UI changes
2. Chromatic runs automatically (via CI) and detects visual differences
3. A status check appears on the PR: "Chromatic -- X visual changes found"
4. The developer (or a reviewer) opens the Chromatic review dashboard
5. Each changed story is shown with a side-by-side diff highlighting the exact pixels that changed
6. The reviewer accepts or denies each change
7. Once all changes are resolved, the Chromatic status check turns green
8. The PR can be merged

This workflow ensures that **no visual regression reaches production without human review**, while making intentional design changes easy to approve.

---

## Accessibility Testing Addon

The **\`@storybook/addon-a11y\`** addon integrates axe-core accessibility scanning directly into Storybook. Every story is automatically scanned for WCAG violations, and results appear in a dedicated panel in the Storybook UI. This means every component state you document in Storybook is also an accessibility test case -- zero additional test code required.

### Setup and Configuration

\`\`\`bash
# Install the addon
npm install --save-dev @storybook/addon-a11y

# Add to your .storybook/main.ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  addons: [
    '@storybook/addon-a11y',
    // ... other addons
  ],
};

export default config;
\`\`\`

Once installed, every story in your Storybook automatically gets an **Accessibility** panel that shows:

- **Violations** -- WCAG rules that failed (e.g., missing alt text, insufficient color contrast, missing form labels)
- **Passes** -- Rules that the component satisfies
- **Incomplete** -- Rules that require manual review (e.g., "verify that this color contrast meets your target WCAG level")

### Configuring Axe Rules Per-Story

You can customize which accessibility rules are checked at the component or story level:

\`\`\`typescript
// Disable specific rules for a component with known exceptions
export const DecorativeImage: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            // Decorative images intentionally have empty alt text
            id: 'image-alt',
            enabled: false,
          },
        ],
      },
    },
  },
};

// Set the entire component to WCAG AA standard
const meta: Meta<typeof DataTable> = {
  title: 'Components/DataTable',
  component: DataTable,
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            options: {
              noScroll: true,
            },
          },
        ],
      },
    },
  },
};
\`\`\`

### Enforcing Accessibility in CI

The Storybook test runner supports running accessibility checks as part of your CI pipeline. When combined with the a11y addon, every story is scanned for violations during test execution:

\`\`\`bash
# Run the test runner with accessibility checks
npx test-storybook
\`\`\`

The test runner automatically detects the a11y addon and includes accessibility violations in the test results. Stories with accessibility violations fail the test run, preventing inaccessible components from being merged.

For a deeper dive into accessibility testing strategies, including WCAG compliance levels, automated vs manual testing, and screen reader testing, see our [accessibility testing automation guide](/blog/accessibility-testing-automation-guide).

---

## Portable Stories

One of Storybook's most powerful -- and underused -- features is **portable stories**. The \`composeStories\` API lets you import your Storybook stories into any test runner (Vitest, Jest, Playwright) and render them with all their decorators, args, and context intact. This means you write the story once and reuse it everywhere -- no duplicating component setup, mock data, or provider wrappers between Storybook and your unit tests.

### Using Stories in Vitest

\`\`\`typescript
// LoginForm.test.ts
import { render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './LoginForm.stories';

// Compose all stories with their decorators and args
const {
  Default,
  Loading,
  ServerError,
  SuccessfulSubmission,
} = composeStories(stories);

describe('LoginForm', () => {
  it('renders the default state', () => {
    render(<Default />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('shows loading spinner during submission', () => {
    render(<Loading />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays server error message', () => {
    render(<ServerError />);
    expect(
      screen.getByText(/invalid email or password/i)
    ).toBeInTheDocument();
  });

  it('runs the play function for successful submission', async () => {
    const { container } = render(<SuccessfulSubmission />);
    // Play functions can be executed directly
    await SuccessfulSubmission.play({
      canvasElement: container,
      // args are available on the composed story
    });
  });
});
\`\`\`

### Using Stories in Playwright

You can also use portable stories in Playwright component tests for real browser testing:

\`\`\`typescript
// LoginForm.spec.ts (Playwright component test)
import { test, expect } from '@playwright/experimental-ct-react';
import { composeStories } from '@storybook/react';
import * as stories from './LoginForm.stories';

const { Default, ServerError } = composeStories(stories);

test('renders login form in real browser', async ({ mount }) => {
  const component = await mount(<Default />);
  await expect(component.getByLabel(/email/i)).toBeVisible();
  await expect(component.getByLabel(/password/i)).toBeVisible();
});

test('shows error state in real browser', async ({ mount }) => {
  const component = await mount(<ServerError />);
  await expect(
    component.getByText(/invalid email or password/i)
  ).toBeVisible();
});
\`\`\`

**Why portable stories matter:**

- **Single source of truth** -- Component setup, mock data, and provider wrappers are defined once in the story meta and reused across all test runners
- **Story-driven TDD** -- Write the story first (defining the component's expected behavior), then use it in Vitest for fast unit-level feedback and in Playwright for real browser validation
- **No test rot** -- When you update a story's args or decorators, all tests that use the composed story automatically get the updated configuration

---

## Test Coverage from Stories

The **\`@storybook/addon-coverage\`** addon instruments your component code during Storybook builds, allowing you to measure how much of your codebase is exercised by your stories and play functions. This gives you a concrete metric for how well your story-driven testing covers your component logic.

### Setup

\`\`\`bash
# Install the coverage addon
npm install --save-dev @storybook/addon-coverage

# Add to .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    '@storybook/addon-coverage',
    // ... other addons
  ],
};
\`\`\`

### Generating Coverage Reports

The coverage addon uses **Istanbul** instrumentation under the hood. When you run the Storybook test runner with the \`--coverage\` flag, it collects coverage data from every story and play function execution:

\`\`\`bash
# Run test runner with coverage
npx test-storybook --coverage

# Generate HTML coverage report
npx nyc report --reporter=html --temp-dir=.nyc_output

# Generate lcov report for CI integration
npx test-storybook --coverage --coverageDirectory=coverage
\`\`\`

The resulting coverage report shows line, branch, function, and statement coverage for every component file that your stories exercise.

### How Story-Driven Testing Contributes to Coverage

Story-driven coverage works at two levels:

1. **Rendering coverage** -- Simply rendering a story exercises the component's render path for that specific set of props. A component with five stories (default, loading, error, empty, disabled) covers five rendering code paths without writing a single assertion.

2. **Interaction coverage** -- Play functions exercise event handlers, state transitions, validation logic, and side effects. A play function that types into a form field, submits, and asserts the result covers the input handling, validation, submission, and callback code paths.

Teams that adopt story-driven testing typically see **60-80% component coverage** from stories alone, with play functions pushing coverage into the **85-95% range**. The remaining gaps are usually error handling edge cases and rarely-hit code paths that are better covered by targeted unit tests.

### Merging Coverage Reports

If you run both Vitest unit tests and Storybook tests, you can merge coverage reports for a unified view:

\`\`\`bash
# Generate Storybook coverage in lcov format
npx test-storybook --coverage --coverageDirectory=coverage/storybook

# Run Vitest with coverage
npx vitest --coverage --coverage.reportsDirectory=coverage/vitest

# Merge reports with nyc
npx nyc merge coverage/ coverage/merged/coverage.json
npx nyc report --temp-dir=coverage/merged --reporter=html --reporter=lcov
\`\`\`

This merged report shows total coverage across all testing methods, giving you a complete picture of your component test coverage.

---

## CI/CD Integration

Running storybook testing in CI ensures that every pull request is validated for interaction correctness, visual consistency, and accessibility compliance before merging. Here is a complete GitHub Actions workflow that runs the Storybook test runner, Chromatic visual tests, and reports results on the PR.

### GitHub Actions Workflow

\`\`\`yaml
# .github/workflows/storybook-tests.yml
name: Storybook Tests

on:
  pull_request:
    branches: [main]
    paths:
      - 'src/components/**'
      - 'src/stories/**'
      - '.storybook/**'
      - 'package.json'

jobs:
  # Job 1: Interaction tests and accessibility checks
  test-storybook:
    name: Interaction & Accessibility Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Storybook
        run: npx storybook build --quiet
        env:
          NODE_OPTIONS: '--max-old-space-size=4096'

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Serve Storybook and run tests
        run: |
          npx http-server storybook-static --port 6006 --silent &
          sleep 5
          npx test-storybook --url http://localhost:6006 --coverage
        env:
          CI: true

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: storybook-coverage
          path: coverage/
          retention-days: 14

  # Job 2: Chromatic visual regression tests
  chromatic:
    name: Visual Regression Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for TurboSnap

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true  # TurboSnap
          exitZeroOnChanges: true  # Don't fail, use review workflow
          exitOnceUploaded: true  # Speed up CI
          autoAcceptChanges: main  # Auto-accept on main branch
\`\`\`

### Workflow Breakdown

**Job 1 -- Interaction and Accessibility Tests:**

- Builds Storybook as a static site
- Serves it locally with \`http-server\`
- Runs the test runner against the served Storybook, executing every play function and accessibility check
- Collects coverage data and uploads it as an artifact

**Job 2 -- Chromatic Visual Regression:**

- Uses \`fetch-depth: 0\` to clone full git history (required for TurboSnap's git diff analysis)
- Runs Chromatic with TurboSnap (\`onlyChanged: true\`) to only capture stories affected by the PR's changes
- \`exitZeroOnChanges: true\` means Chromatic does not fail the CI job when visual changes are detected -- instead, it adds a status check that requires review in the Chromatic dashboard
- \`autoAcceptChanges: main\` automatically accepts baselines on the main branch after merge

### Visual Approval in the PR Workflow

With this setup, your PR gets two status checks:

1. **Storybook Tests** -- Pass/fail based on play function assertions and accessibility violations. This is a hard gate -- failures block the merge.
2. **Chromatic** -- Pending until visual changes are reviewed and approved in the Chromatic dashboard. This is a soft gate -- the PR is mergeable once a team member approves the visual changes.

This two-gate approach catches both functional regressions (broken interactions, accessibility violations) and visual regressions (unintended layout changes, color shifts, typography bugs) before code reaches production.

For a comprehensive guide to building multi-stage CI/CD pipelines with testing, linting, and deployment stages, see [CI/CD Testing Pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions).

---

## Automate Component Testing with AI Agents

Writing Storybook stories, play functions, and visual test configurations is repetitive work that AI coding agents handle exceptionally well. An AI agent can analyze your component's props and types, generate stories covering all visual states, write play functions for interactive behaviors, and configure Chromatic parameters -- all from your component source code.

**QASkills.sh** provides specialized skills that teach AI agents component testing best practices. Install the JavaScript testing patterns skill to give your agent expert knowledge about Storybook, interaction testing, and component coverage:

\`\`\`bash
npx @qaskills/cli add javascript-testing-patterns
\`\`\`

For visual regression testing expertise (including Chromatic configuration and baseline management):

\`\`\`bash
npx @qaskills/cli add visual-regression
\`\`\`

Related skills that complement storybook testing workflows:

\`\`\`bash
# Accessibility testing with axe-core and WCAG compliance
npx @qaskills/cli add axe-accessibility

# End-to-end testing patterns for full user flow coverage
npx @qaskills/cli add e2e-testing-patterns
\`\`\`

With these skills installed, your AI agent can generate a complete component testing suite -- including CSF3 stories for every component state, play functions for interactive behaviors, Chromatic configuration, accessibility assertions, and CI/CD workflow files -- from a single prompt like "write Storybook tests for the LoginForm component."

Browse all available QA skills at [qaskills.sh/skills](/skills) or read the [getting started guide](/getting-started) to install your first skill in under 60 seconds.

For deeper dives into related topics, explore:

- [Visual Regression Testing Guide](/blog/visual-regression-testing-guide) -- Playwright screenshots, Percy, Applitools, baseline management, and CI integration
- [Accessibility Testing Automation Guide](/blog/accessibility-testing-automation-guide) -- WCAG compliance, axe-core, screen readers, and automated audit pipelines

---

## Frequently Asked Questions

### Is Storybook testing a replacement for unit tests or E2E tests?

No. Storybook testing is a **complement** to your existing test suite, not a replacement. It fills a specific gap -- component-level testing in isolation with real browser rendering. Unit tests (Vitest, Jest) are faster and better for testing pure logic, utility functions, and hooks in isolation. E2E tests (Playwright, Cypress) are better for testing full user flows that span multiple pages and involve real API calls. Storybook interaction tests sit between these two: they run in a real browser (unlike unit tests) but test components in isolation (unlike E2E tests). The recommended approach is to use all three: unit tests for logic, Storybook tests for components, and E2E tests for critical user journeys.

### How do I handle components that depend on API calls or global state?

Use **decorators** and **loaders** to provide controlled dependencies. For API calls, use \`msw\` (Mock Service Worker) with Storybook's \`msw-storybook-addon\` to intercept network requests and return consistent mock data. For global state (Redux, Zustand, React Context), create decorators that wrap your stories with providers initialized to specific states. For example, a \`ThemeDecorator\` wraps stories in your theme provider, and a \`StoreDecorator\` wraps stories in your Redux provider with pre-configured state. This approach keeps stories self-contained and reproducible -- every story controls its own dependencies without relying on external services or shared state.

### What is the difference between the Storybook test runner and Chromatic?

The **Storybook test runner** (\`@storybook/test-runner\`) is a free, open-source tool that runs your play functions as tests in a headless browser. It verifies that interactions work correctly and accessibility checks pass. It runs locally or in CI and produces pass/fail results. **Chromatic** is a paid cloud service that captures screenshots of every story and compares them against baselines for visual regression detection. It provides a web dashboard for reviewing and approving visual changes. You can use both together: the test runner for interaction and accessibility testing (functional correctness) and Chromatic for visual regression testing (visual correctness). The test runner is free, Chromatic has a free tier with 5,000 snapshots per month and paid plans for larger teams.

### How do I migrate existing tests to Storybook interaction tests?

Start incrementally. Do not try to migrate all your tests at once. Begin by identifying components that already have Storybook stories but lack tests, and add play functions to those stories. Next, look for component tests in your Vitest or Jest suite that spend most of their code setting up props, providers, and context -- these are ideal candidates for migration because the story already handles that setup. Use \`composeStories\` as a bridge: import your new stories into your existing test files so you can gradually replace manual component setup with composed stories without changing your test runner. Over time, your stories become the single source of truth for component setup, and your test files become thinner -- focused on assertions rather than boilerplate.

### Does Storybook testing work with server components or RSC?

Storybook testing is designed for **client-side components** that render in the browser. React Server Components (RSC) render on the server and stream HTML to the client, which does not map to Storybook's browser-based rendering model. For RSC, you have two options. First, you can test the client component portions of your RSC architecture in Storybook -- most RSC applications have a mix of server and client components, and the client components are the ones with interactivity that benefit from storybook testing. Second, use Playwright E2E tests to test the full server-rendered output of your RSC pages. The Storybook team is actively working on RSC support, and experimental server component rendering is available in Storybook 8.x behind a feature flag. For now, the practical approach is to keep your interactive UI logic in client components and test those in Storybook while using E2E tests for server-rendered pages.
`,
};
