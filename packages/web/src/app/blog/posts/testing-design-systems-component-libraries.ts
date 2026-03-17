import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Design Systems: Component Libraries at Scale with Storybook, Playwright, and AI',
  description:
    'Complete guide to testing design systems and component libraries at scale. Covers Storybook testing, visual regression with Chromatic, accessibility testing with axe-core, and AI-assisted component testing.',
  date: '2026-03-17',
  category: 'Guide',
  content: `
Design systems are the backbone of consistent, scalable user interfaces. Companies like Shopify, GitHub, Atlassian, and Adobe invest millions in component libraries that power hundreds of applications and serve billions of users. Yet testing these systems presents unique challenges that traditional application testing strategies fail to address. A broken \`Button\` variant in your design system does not just break one page -- it breaks every page across every product that consumes it.

This guide covers everything you need to know about testing design systems at scale, from unit testing individual components to visual regression testing across themes, viewports, and browsers. Whether you maintain a small internal component library or a public design system used by thousands of developers, these patterns will help you ship with confidence.

## Key Takeaways

- **Design system testing requires a fundamentally different strategy** than application testing -- you are testing reusable contracts, not user flows, and a single regression can cascade across dozens of consuming applications
- **Storybook is the centerpiece** of modern design system testing, serving as both a development environment and a test harness through interaction tests, accessibility audits, and visual regression snapshots
- **Visual regression testing with Chromatic or Playwright screenshots** catches pixel-level regressions that unit tests and snapshot tests miss entirely, especially across themes, viewports, and browser engines
- **Accessibility testing must happen at the component level** using axe-core and keyboard navigation tests -- retrofitting accessibility into a shipped design system is 10x more expensive than building it in from the start
- **Component API testing** (prop validation, TypeScript type safety, default values, edge cases) prevents breaking changes from reaching consumers and enforces your design system's public contract
- **AI coding agents equipped with design system testing skills** from [qaskills.sh](https://qaskills.sh) can generate comprehensive test suites for components, covering visual, accessibility, and interaction testing in minutes instead of hours

---

## Why Design System Testing Is Different from App Testing

Application testing focuses on **user journeys**: a user logs in, adds an item to a cart, and checks out. Design system testing focuses on **component contracts**: a \`Button\` renders correctly in every size, variant, state, and theme combination. The difference is profound.

Consider a \`Select\` component in your design system. In an application test, you might verify that selecting "California" from a state dropdown populates the shipping form correctly. In a design system test, you need to verify:

- The \`Select\` renders all variants (default, error, disabled, loading)
- It handles 0 options, 1 option, 100 options, and 10,000 options
- Keyboard navigation works (arrow keys, type-ahead, Enter, Escape)
- Screen readers announce the selected value, available options, and state changes
- It renders correctly in light mode, dark mode, and high-contrast mode
- It works in LTR and RTL layouts
- It composes correctly inside a \`FormField\` wrapper
- Its TypeScript types prevent invalid prop combinations
- It does not introduce visual regressions at any viewport width

This is a combinatorial explosion that demands automation. Manual testing cannot scale to the hundreds of components in a mature design system, each with dozens of prop combinations across multiple themes and viewports.

### The Cost of Design System Bugs

When a bug ships in an application, it affects that application. When a bug ships in a design system, it affects **every application that depends on it**. If your design system is consumed by 30 products, a broken \`Tooltip\` component means 30 broken tooltip implementations. The blast radius is enormous, and the political cost of shipping a breaking change to your consumers erodes trust in the entire system.

This is why design system teams need **higher test coverage, stricter quality gates, and more comprehensive CI pipelines** than typical application teams.

---

## The Design System Testing Stack

Here is the testing stack that leading design system teams use in 2026:

| Tool | Role | Why It Wins |
|------|------|-------------|
| **Storybook 8** | Component development + test harness | Stories double as test cases, interaction testing, accessibility addon |
| **Chromatic** | Visual regression testing | Storybook-native, infrastructure-free, PR-based visual review |
| **Playwright** | Cross-browser E2E + screenshot testing | Real browsers, network interception, component testing mode |
| **Vitest** | Unit + component test runner | Fast, ESM-native, Jest-compatible API |
| **React Testing Library** | Component rendering + assertions | User-centric queries, accessibility-focused |
| **axe-core** | Accessibility auditing | WCAG 2.2 compliance, integration with every test runner |
| **@storybook/test** | Interaction testing inside stories | Play functions, user event simulation, assertions |

Install the core dependencies:

\`\`\`bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @vitejs/plugin-react jsdom
pnpm add -D playwright @playwright/test
pnpm add -D storybook @storybook/react-vite @storybook/test
pnpm add -D @storybook/addon-a11y axe-core
pnpm add -D chromatic
\`\`\`

Equip your AI coding agent with design system testing expertise:

\`\`\`bash
npx @qaskills/cli add storybook-testing
npx @qaskills/cli add shadcn-component-testing
npx @qaskills/cli add visual-regression-testing
\`\`\`

---

## Unit Testing Components

Unit tests form the foundation of your design system test suite. They verify that each component behaves correctly in isolation, handles edge cases, and enforces its API contract.

### Setting Up Vitest for Component Testing

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
\`\`\`

\`\`\`typescript
// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
\`\`\`

### Testing Props and Variants

Every design system component has a public API defined by its props. Test every variant, size, and state combination:

\`\`\`typescript
// src/components/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  // Variant rendering
  it.each(['primary', 'secondary', 'ghost', 'destructive'] as const)(
    'renders the %s variant with correct styles',
    (variant) => {
      render(<Button variant={variant}>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toHaveAttribute('data-variant', variant);
    }
  );

  // Size rendering
  it.each(['sm', 'md', 'lg', 'xl'] as const)(
    'renders the %s size correctly',
    (size) => {
      render(<Button size={size}>Click me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', size);
    }
  );

  // Disabled state
  it('prevents click when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click me</Button>);
    const button = screen.getByRole('button');

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  // Loading state
  it('shows spinner and disables interaction when loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Submit</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  // Polymorphic rendering
  it('renders as an anchor when asChild wraps a link', () => {
    render(
      <Button asChild>
        <a href="/about">About</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toHaveAttribute('href', '/about');
  });

  // Ref forwarding
  it('forwards ref to the underlying DOM element', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Click me</Button>);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });
});
\`\`\`

### Testing State Management

Components with internal state need tests that verify state transitions:

\`\`\`typescript
// src/components/Accordion/Accordion.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion';

describe('Accordion', () => {
  const renderAccordion = () =>
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content for section 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Content for section 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

  it('expands and collapses items on click', async () => {
    renderAccordion();
    const trigger = screen.getByRole('button', { name: 'Section 1' });

    // Initially collapsed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Expand
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Content for section 1')).toBeVisible();

    // Collapse
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('collapses the previous item when a new one is expanded in single mode', async () => {
    renderAccordion();
    const trigger1 = screen.getByRole('button', { name: 'Section 1' });
    const trigger2 = screen.getByRole('button', { name: 'Section 2' });

    await userEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(trigger2);
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');
    expect(trigger2).toHaveAttribute('aria-expanded', 'true');
  });
});
\`\`\`

---

## Visual Regression Testing

Unit tests verify behavior. Visual regression tests verify **appearance**. A component can pass every unit test while rendering completely broken visually -- a CSS specificity conflict, a missing token, or a broken media query will not trigger a test failure unless you are comparing pixels.

### Chromatic: The Storybook-Native Approach

Chromatic is the visual testing platform built by the Storybook team. It captures screenshots of every story in your Storybook and diffs them against baselines:

\`\`\`typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: '@storybook/react-vite',
};

export default config;
\`\`\`

\`\`\`typescript
// src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Button' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary Button' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {(['primary', 'secondary', 'ghost', 'destructive'] as const).map(
        (variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        )
      )}
    </div>
  ),
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Disabled' },
};

export const Loading: Story = {
  args: { variant: 'primary', loading: true, children: 'Loading...' },
};
\`\`\`

Run Chromatic in CI:

\`\`\`bash
npx chromatic --project-token=\${CHROMATIC_PROJECT_TOKEN} --exit-zero-on-changes
\`\`\`

### Playwright Screenshot Testing

For teams that want self-hosted visual regression testing without a SaaS dependency, Playwright provides built-in screenshot comparison:

\`\`\`typescript
// tests/visual/button.visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Button visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:6006/iframe.html?id=components-button--all-variants');
    await page.waitForLoadState('networkidle');
  });

  test('matches baseline screenshot', async ({ page }) => {
    await expect(page.locator('#storybook-root')).toHaveScreenshot(
      'button-all-variants.png',
      {
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      }
    );
  });

  test('matches dark mode screenshot', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('#storybook-root')).toHaveScreenshot(
      'button-all-variants-dark.png',
      {
        maxDiffPixelRatio: 0.01,
      }
    );
  });

  test('matches mobile viewport screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#storybook-root')).toHaveScreenshot(
      'button-all-variants-mobile.png',
      {
        maxDiffPixelRatio: 0.01,
      }
    );
  });
});
\`\`\`

### Managing Baselines at Scale

Visual regression testing generates hundreds or thousands of baseline images. Managing these effectively is critical:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/__snapshots__',
  snapshotPathTemplate:
    '{snapshotDir}/{testFilePath}/{arg}-{projectName}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
\`\`\`

Store baselines in Git LFS to avoid bloating your repository:

\`\`\`bash
git lfs track "tests/visual/__snapshots__/**/*.png"
git add .gitattributes
\`\`\`

---

## Accessibility Testing at Component Level

Accessibility is not a feature -- it is a requirement. Design systems that bake accessibility into every component eliminate an entire class of bugs for every consuming application. Testing accessibility at the component level is the most cost-effective strategy because you fix it once and every consumer benefits.

### Automated Auditing with axe-core

\`\`\`typescript
// src/components/Dialog/Dialog.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from './Dialog';

expect.extend(toHaveNoViolations);

describe('Dialog accessibility', () => {
  it('has no axe violations when open', async () => {
    const { container } = render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirm Action</DialogTitle>
          <p>Are you sure you want to proceed?</p>
        </DialogContent>
      </Dialog>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when closed', async () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirm Action</DialogTitle>
          <p>Are you sure?</p>
        </DialogContent>
      </Dialog>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
\`\`\`

### Keyboard Navigation Testing

Keyboard support is critical for accessibility and power users. Every interactive component must be fully operable with the keyboard:

\`\`\`typescript
// src/components/Menu/Menu.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Menu, MenuTrigger, MenuContent, MenuItem } from './Menu';

describe('Menu keyboard navigation', () => {
  const renderMenu = () =>
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={vi.fn()}>Edit</MenuItem>
          <MenuItem onSelect={vi.fn()}>Duplicate</MenuItem>
          <MenuItem onSelect={vi.fn()}>Delete</MenuItem>
        </MenuContent>
      </Menu>
    );

  it('opens with Enter key and focuses first item', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Actions' });

    await userEvent.tab();
    expect(trigger).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    const firstItem = screen.getByRole('menuitem', { name: 'Edit' });
    expect(firstItem).toHaveFocus();
  });

  it('navigates items with arrow keys', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Actions' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{ArrowDown}');

    const secondItem = screen.getByRole('menuitem', { name: 'Duplicate' });
    expect(secondItem).toHaveFocus();
  });

  it('closes with Escape and returns focus to trigger', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Actions' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('wraps focus from last item to first item', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));

    // Navigate to last item
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();

    // Wrap to first
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });
});
\`\`\`

### Focus Management Testing

Components that manage focus (modals, popovers, drawers) need explicit focus trap testing:

\`\`\`typescript
describe('Dialog focus management', () => {
  it('traps focus within the dialog when open', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
          <input data-testid="first-input" />
          <input data-testid="second-input" />
          <Button>Save</Button>
        </DialogContent>
      </Dialog>
    );

    const firstInput = screen.getByTestId('first-input');
    const saveButton = screen.getByRole('button', { name: 'Save' });

    // Focus should start on first focusable element
    expect(firstInput).toHaveFocus();

    // Tab through all elements
    await userEvent.tab();
    expect(screen.getByTestId('second-input')).toHaveFocus();

    await userEvent.tab();
    expect(saveButton).toHaveFocus();

    // Tab wraps back to first element (focus trap)
    await userEvent.tab();
    expect(firstInput).toHaveFocus();
  });
});
\`\`\`

---

## Interaction Testing with Storybook

Storybook 8 introduced **play functions** that turn stories into interactive tests. These tests run inside the browser, which means they test real DOM behavior -- not a simulated environment like jsdom.

\`\`\`typescript
// src/components/Combobox/Combobox.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Combobox } from './Combobox';

const meta: Meta<typeof Combobox> = {
  title: 'Components/Combobox',
  component: Combobox,
};

export default meta;
type Story = StoryObj<typeof Combobox>;

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'dragonfruit', label: 'Dragon Fruit' },
];

export const FilteringBehavior: Story = {
  args: {
    options: fruits,
    placeholder: 'Select a fruit...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open the combobox
    const input = canvas.getByRole('combobox');
    await userEvent.click(input);

    // Verify all options are visible
    const listbox = canvas.getByRole('listbox');
    await expect(listbox.children).toHaveLength(4);

    // Type to filter
    await userEvent.type(input, 'dr');

    // Only Dragon Fruit should be visible
    await expect(canvas.getByRole('option', { name: 'Dragon Fruit' })).toBeInTheDocument();
    await expect(canvas.queryByRole('option', { name: 'Apple' })).not.toBeInTheDocument();

    // Select the filtered option
    await userEvent.click(canvas.getByRole('option', { name: 'Dragon Fruit' }));

    // Verify selection
    await expect(input).toHaveValue('Dragon Fruit');
  },
};

export const KeyboardSelection: Story = {
  args: {
    options: fruits,
    placeholder: 'Select a fruit...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    // Open with keyboard
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    // Second option should be selected
    await expect(input).toHaveValue('Banana');
  },
};

export const EmptyState: Story = {
  args: {
    options: fruits,
    placeholder: 'Select a fruit...',
    emptyMessage: 'No fruits found.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    await userEvent.click(input);
    await userEvent.type(input, 'zzzzz');

    await expect(canvas.getByText('No fruits found.')).toBeInTheDocument();
  },
};
\`\`\`

Run Storybook interaction tests in CI:

\`\`\`bash
npx test-storybook --ci
\`\`\`

---

## Testing Component Composition and Slots

Design system components are rarely used in isolation. They compose with each other -- a \`FormField\` wraps an \`Input\` and a \`Label\`, a \`Card\` contains a \`CardHeader\`, \`CardBody\`, and \`CardFooter\`. Testing composition patterns ensures your components work together as intended.

### Compound Component Testing

\`\`\`typescript
// src/components/Tabs/Tabs.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

describe('Tabs composition', () => {
  const renderTabs = () =>
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Account</TabsTrigger>
          <TabsTrigger value="tab2">Security</TabsTrigger>
          <TabsTrigger value="tab3">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <p>Account settings content</p>
        </TabsContent>
        <TabsContent value="tab2">
          <p>Security settings content</p>
        </TabsContent>
        <TabsContent value="tab3">
          <p>Notification preferences content</p>
        </TabsContent>
      </Tabs>
    );

  it('shows the default tab content on mount', () => {
    renderTabs();
    expect(screen.getByText('Account settings content')).toBeVisible();
    expect(screen.queryByText('Security settings content')).not.toBeVisible();
  });

  it('switches content when clicking a different tab', async () => {
    renderTabs();
    await userEvent.click(screen.getByRole('tab', { name: 'Security' }));

    expect(screen.getByText('Security settings content')).toBeVisible();
    expect(screen.queryByText('Account settings content')).not.toBeVisible();
  });

  it('maintains correct ARIA relationships', () => {
    renderTabs();
    const tab = screen.getByRole('tab', { name: 'Account' });
    const panel = screen.getByRole('tabpanel');

    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  });
});
\`\`\`

### Testing Render Props and Children Patterns

\`\`\`typescript
// src/components/Toggle/Toggle.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Toggle } from './Toggle';

describe('Toggle with render prop children', () => {
  it('passes pressed state to children function', async () => {
    render(
      <Toggle>
        {({ pressed }) => (pressed ? 'ON' : 'OFF')}
      </Toggle>
    );

    expect(screen.getByText('OFF')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('ON')).toBeInTheDocument();
  });
});
\`\`\`

### Testing Slot Composition with asChild

Many modern design systems use the \`asChild\` pattern (popularized by Radix UI) to allow polymorphic rendering. Test that slot composition preserves behavior:

\`\`\`typescript
// src/components/Button/Button.composition.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../Tooltip';

describe('Button composition', () => {
  it('works as a tooltip trigger', async () => {
    render(
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Helpful information</TooltipContent>
      </Tooltip>
    );

    const button = screen.getByRole('button', { name: 'Hover me' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('data-variant', 'ghost');
  });

  it('renders as a link with asChild', () => {
    render(
      <Button asChild variant="primary">
        <a href="https://example.com">Visit site</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Visit site' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });
});
\`\`\`

---

## Cross-Browser and Theme Testing

Design systems must work across browsers, themes, and writing directions. This section covers testing these cross-cutting concerns systematically.

### Dark Mode Testing

\`\`\`typescript
// tests/themes/dark-mode.spec.ts
import { test, expect } from '@playwright/test';

const components = [
  'button--all-variants',
  'input--all-states',
  'card--default',
  'dialog--open',
  'alert--all-variants',
];

for (const component of components) {
  test(\`\${component} renders correctly in dark mode\`, async ({ page }) => {
    await page.goto(
      \`http://localhost:6006/iframe.html?id=components-\${component}\`
    );
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#storybook-root')).toHaveScreenshot(
      \`\${component}-dark.png\`,
      { maxDiffPixelRatio: 0.01 }
    );
  });
}
\`\`\`

### Responsive Testing

\`\`\`typescript
// tests/themes/responsive.spec.ts
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const responsiveComponents = [
  'navigation--responsive',
  'data-table--default',
  'sidebar--collapsible',
];

for (const viewport of viewports) {
  for (const component of responsiveComponents) {
    test(\`\${component} at \${viewport.name} viewport\`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(
        \`http://localhost:6006/iframe.html?id=components-\${component}\`
      );
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#storybook-root')).toHaveScreenshot(
        \`\${component}-\${viewport.name}.png\`,
        { maxDiffPixelRatio: 0.01 }
      );
    });
  }
}
\`\`\`

### RTL (Right-to-Left) Testing

If your design system supports RTL languages, test that components mirror correctly:

\`\`\`typescript
// tests/themes/rtl.spec.ts
import { test, expect } from '@playwright/test';

test('Input with icon renders correctly in RTL', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?id=components-input--with-icon'
  );

  // Inject RTL direction
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
  });

  await expect(page.locator('#storybook-root')).toHaveScreenshot(
    'input-with-icon-rtl.png',
    { maxDiffPixelRatio: 0.01 }
  );
});
\`\`\`

---

## Testing Component APIs and Props

Your component API is your public contract. Consumers depend on prop names, default values, types, and behavior. Changing any of these without careful consideration is a breaking change.

### TypeScript Type Safety Testing

Use TypeScript's type system as a testing layer. Create type-level tests that verify your component accepts and rejects the correct props:

\`\`\`typescript
// src/components/Button/Button.types.test.ts
import { expectTypeOf, describe, it } from 'vitest';
import type { ButtonProps } from './Button';

describe('Button type safety', () => {
  it('requires children', () => {
    expectTypeOf<ButtonProps>().toHaveProperty('children');
  });

  it('accepts valid variants', () => {
    expectTypeOf<'primary'>().toMatchTypeOf<ButtonProps['variant']>();
    expectTypeOf<'secondary'>().toMatchTypeOf<ButtonProps['variant']>();
  });

  it('accepts onClick handler', () => {
    expectTypeOf<ButtonProps['onClick']>().toEqualTypeOf<
      ((event: React.MouseEvent<HTMLButtonElement>) => void) | undefined
    >();
  });

  it('accepts standard HTML button attributes', () => {
    expectTypeOf<ButtonProps>().toHaveProperty('disabled');
    expectTypeOf<ButtonProps>().toHaveProperty('type');
    expectTypeOf<ButtonProps>().toHaveProperty('aria-label');
  });
});
\`\`\`

### Default Prop Testing

Verify that default props are applied correctly:

\`\`\`typescript
describe('Button defaults', () => {
  it('defaults to medium size', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'md');
  });

  it('defaults to type="button" to prevent form submission', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('defaults to the primary variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute(
      'data-variant',
      'primary'
    );
  });
});
\`\`\`

### Edge Case and Boundary Testing

\`\`\`typescript
describe('Input edge cases', () => {
  it('handles extremely long values without layout overflow', () => {
    const longValue = 'a'.repeat(10000);
    render(<Input value={longValue} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue(longValue);
  });

  it('handles special characters in value', () => {
    render(<Input value={'<script>alert("xss")</script>'} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('<script>alert("xss")</script>');
    // Value should be in the attribute, not rendered as HTML
    expect(input.innerHTML).toBe('');
  });

  it('handles rapid value changes without dropping updates', async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'hello world');
    expect(onChange).toHaveBeenCalledTimes(11);
  });
});
\`\`\`

---

## CI/CD for Design Systems

Design systems need rigorous CI/CD pipelines because a broken release affects every consumer. The pipeline should enforce quality gates at every stage.

### The Design System CI Pipeline

\`\`\`yaml
# .github/workflows/design-system-ci.yml
name: Design System CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build-storybook
      - run: npx test-storybook --ci

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build-storybook
      - uses: chromaui/action@latest
        with:
          projectToken: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: true

  cross-browser:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm build-storybook
      - run: npx http-server storybook-static -p 6006 &
      - run: npx wait-on http://localhost:6006
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  publish:
    if: github.ref == 'refs/heads/main'
    needs: [lint-and-typecheck, unit-tests, accessibility-tests, visual-regression, cross-browser]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
\`\`\`

### Versioning Strategy

Design systems should use semantic versioning with strict enforcement:

- **Patch**: Bug fixes, visual corrections that match the intended design
- **Minor**: New components, new props on existing components, new variants
- **Major**: Removed components, renamed props, changed default behavior, visual changes to existing components

Use a changeset-based workflow to enforce this:

\`\`\`bash
pnpm add -D @changesets/cli
pnpm changeset init
\`\`\`

Every PR that changes component behavior must include a changeset describing the change and its semver impact.

---

## AI-Assisted Design System Testing with QASkills

AI coding agents can dramatically accelerate design system testing. By equipping your agent with specialized QA skills, you can generate comprehensive test suites for new components in minutes instead of hours.

### Install Design System Testing Skills

\`\`\`bash
npx @qaskills/cli add storybook-testing
npx @qaskills/cli add shadcn-component-testing
npx @qaskills/cli add visual-regression-testing
npx @qaskills/cli add accessibility-testing
\`\`\`

With these skills installed, your AI coding agent understands the patterns described in this guide and can:

- Generate Storybook stories with interaction tests for new components
- Write comprehensive unit tests covering all prop combinations
- Create visual regression test suites with theme and viewport coverage
- Add accessibility tests with axe-core audits and keyboard navigation
- Set up CI/CD pipelines with all quality gates pre-configured

### Example Prompt for AI-Assisted Testing

After installing the skills, you can prompt your AI coding agent:

> "Write a complete test suite for the new DatePicker component. Cover unit tests for all props, Storybook stories with play functions for date selection and range selection, accessibility tests including keyboard navigation and screen reader announcements, and visual regression tests for light mode, dark mode, and mobile viewport."

The agent will generate production-ready tests following all the patterns in this guide, saving hours of manual test authoring.

---

## 10 Best Practices for Design System Testing

1. **Test the contract, not the implementation.** Your tests should verify what consumers depend on: rendered output, ARIA attributes, event callbacks, and public class names. Do not test internal state variables or CSS class generation logic.

2. **Create a story for every component state.** Stories serve as living documentation, visual regression baselines, and accessibility test targets. If a state exists, it needs a story.

3. **Run accessibility tests on every component, not just interactive ones.** Even static components like \`Badge\` and \`Avatar\` need ARIA compliance. Color contrast, text alternatives, and semantic HTML matter everywhere.

4. **Use data-driven tests for variant matrices.** Use \`it.each\` or \`for...of\` loops to test every combination of variant, size, and state. This catches the "works in primary but breaks in ghost" category of bugs.

5. **Test theme switching, not just individual themes.** Components should handle dynamic theme changes without visual artifacts. Test the transition from light to dark, not just dark mode in isolation.

6. **Pin your baseline screenshots to specific browser versions.** Browser rendering changes between versions can cause false positive diffs. Use Docker images with pinned browser versions in CI.

7. **Test composition before you test isolation.** Components that work perfectly in isolation but break when composed are a common design system bug. Prioritize composition tests for frequently-combined components.

8. **Keep visual regression thresholds tight.** A 5% pixel difference threshold hides real regressions. Use 0.1% to 1% thresholds and invest time reviewing legitimate changes through your visual review workflow.

9. **Automate type-level testing.** TypeScript types are part of your public API. Use \`expectTypeOf\` from Vitest or \`tsd\` to verify that your types accept valid props and reject invalid ones.

10. **Test server-side rendering (SSR) compatibility.** If your components are used in Next.js or Remix, verify they render correctly without \`window\` or \`document\` access. Use Vitest with a Node environment for SSR-specific tests.

---

## 8 Anti-Patterns to Avoid

1. **Testing CSS values directly.** Asserting \`expect(element.style.backgroundColor).toBe('rgb(59, 130, 246)')\` is fragile and breaks when you change tokens. Test visual output with screenshots instead.

2. **Snapshot testing as your primary strategy.** Jest snapshots capture the entire DOM tree and break on every minor change, leading to "update all snapshots" becoming a reflexive habit that defeats the purpose of testing.

3. **Skipping disabled and loading states.** These states are often the most bug-prone because they involve conditional rendering, ARIA attribute changes, and event handler suppression.

4. **Testing only the happy path.** Design system components encounter empty strings, undefined values, extremely long content, special characters, and null children in production. Test these edge cases.

5. **Running visual tests on a single browser only.** Font rendering, subpixel antialiasing, and flexbox behavior differ across Chrome, Firefox, and Safari. A component that looks perfect in Chrome can have subtle rendering issues in WebKit.

6. **Treating accessibility tests as optional.** If your design system ships an inaccessible component, every consuming application inherits that accessibility violation. Make accessibility tests a hard gate in CI.

7. **Not testing keyboard interaction.** Many developers only test mouse-driven interactions. Keyboard navigation, focus management, and screen reader compatibility are equally important and frequently broken.

8. **Coupling tests to internal component structure.** Testing internal state, private methods, or implementation details makes your tests break when you refactor without changing behavior. Test the public interface only.

---

## Conclusion

Testing a design system is one of the highest-leverage QA investments you can make. Every bug you catch at the component level prevents that bug from appearing in every application that consumes your system. The combination of **unit tests** (for behavior), **visual regression tests** (for appearance), **accessibility tests** (for inclusivity), and **interaction tests** (for user experience) creates a comprehensive safety net that lets your team ship component updates with confidence.

The tooling has never been better. Storybook 8, Chromatic, Playwright, Vitest, and axe-core form a powerful stack that covers every testing dimension. And with AI coding agents equipped with specialized skills from [qaskills.sh](https://qaskills.sh), generating comprehensive test suites is faster than ever.

Get started by installing the design system testing skills for your AI coding agent:

\`\`\`bash
npx @qaskills/cli add storybook-testing
npx @qaskills/cli add shadcn-component-testing
npx @qaskills/cli add visual-regression-testing
npx @qaskills/cli add accessibility-testing
\`\`\`

Invest in your design system tests today, and every product team that depends on your components will thank you tomorrow.
`,
};
