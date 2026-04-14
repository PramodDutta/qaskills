---
name: Cypress v14 Component Testing
description: Component testing patterns with Cypress v14 including React, Vue, and Angular component mounting, custom mount commands, interaction testing, visual snapshots, and integration with Vite and Webpack bundlers.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [cypress, component-testing, react, vue, angular, vite, webpack, mount, visual-testing, interaction-testing]
testingTypes: [unit, integration, visual, accessibility]
frameworks: [cypress]
languages: [typescript, javascript]
domains: [web, frontend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Cypress v14 Component Testing Skill

You are an expert in Cypress v14 component testing. When the user asks you to set up component testing with Cypress, write component tests for React/Vue/Angular components, configure mount commands, or integrate with Vite or Webpack, follow these detailed instructions.

## Core Principles

1. **Component isolation** -- Mount components in isolation with controlled props, slots, and context. Test one component at a time without page-level dependencies.
2. **Real browser rendering** -- Unlike JSDOM-based tests, Cypress component tests render in a real browser. Leverage this for accurate styling, layout, and interaction testing.
3. **User-centric interactions** -- Interact with components the way users do: click buttons, type in inputs, select options. Avoid testing implementation details like state variables.
4. **Custom mount commands** -- Create reusable mount commands that wrap components with required providers (theme, router, store) to avoid boilerplate in every test.
5. **Visual validation** -- Use Cypress's visual capabilities to verify component rendering. Combine interaction tests with visual snapshots for comprehensive coverage.
6. **Bundler alignment** -- Configure Cypress component testing to use the same bundler (Vite or Webpack) as your application for accurate build behavior.
7. **Accessibility-integrated testing** -- Include accessibility checks in component tests using cypress-axe to catch a11y issues at the component level.

## Project Structure

```
src/
  components/
    Button/
      Button.tsx
      Button.cy.tsx
      Button.module.css
    Form/
      LoginForm.tsx
      LoginForm.cy.tsx
    Modal/
      Modal.tsx
      Modal.cy.tsx
    DataTable/
      DataTable.tsx
      DataTable.cy.tsx
cypress/
  support/
    component.ts
    commands.ts
    mount-utils.tsx
  fixtures/
    test-data.json
cypress.config.ts
```

## Cypress Configuration for Component Testing

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
  },
});
```

## Custom Mount Commands

```typescript
// cypress/support/mount-utils.tsx
import React from 'react';
import { mount } from 'cypress/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/providers/theme-provider';

interface MountOptions {
  routerProps?: Record<string, any>;
  queryClient?: QueryClient;
  theme?: 'light' | 'dark';
  initialRoute?: string;
}

export function mountWithProviders(
  component: React.ReactElement,
  options: MountOptions = {}
) {
  const queryClient = options.queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  const wrapped = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme={options.theme || 'light'}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );

  return mount(wrapped);
}

// Register as custom command
declare global {
  namespace Cypress {
    interface Chainable {
      mountWithProviders(
        component: React.ReactElement,
        options?: MountOptions
      ): Cypress.Chainable<any>;
    }
  }
}

Cypress.Commands.add('mountWithProviders', mountWithProviders);
```

## Component Support File

```typescript
// cypress/support/component.ts
import './commands';
import './mount-utils';

// Import global styles
import '../../src/index.css';

// Import cypress-axe for accessibility testing
import 'cypress-axe';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver loop')) return false;
  return true;
});
```

## React Component Test Examples

```typescript
// src/components/Button/Button.cy.tsx
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    cy.mount(<Button>Click me</Button>);
    cy.get('button').should('be.visible').and('contain.text', 'Click me');
  });

  it('renders different variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive'] as const;

    variants.forEach((variant) => {
      cy.mount(<Button variant={variant}>Button</Button>);
      cy.get('button').should('have.attr', 'data-variant', variant);
    });
  });

  it('renders different sizes', () => {
    cy.mount(<Button size="sm">Small</Button>);
    cy.get('button').should('have.class', 'btn-sm');

    cy.mount(<Button size="lg">Large</Button>);
    cy.get('button').should('have.class', 'btn-lg');
  });

  it('handles click events', () => {
    const onClick = cy.stub().as('clickHandler');
    cy.mount(<Button onClick={onClick}>Click me</Button>);

    cy.get('button').click();
    cy.get('@clickHandler').should('have.been.calledOnce');
  });

  it('is disabled when disabled prop is true', () => {
    const onClick = cy.stub().as('clickHandler');
    cy.mount(<Button disabled onClick={onClick}>Disabled</Button>);

    cy.get('button').should('be.disabled');
    cy.get('button').click({ force: true });
    cy.get('@clickHandler').should('not.have.been.called');
  });

  it('shows loading state', () => {
    cy.mount(<Button loading>Loading</Button>);
    cy.get('button').should('be.disabled');
    cy.get('[data-testid="spinner"]').should('be.visible');
  });

  it('renders as a link when asChild is provided', () => {
    cy.mount(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>
    );
    cy.get('a').should('have.attr', 'href', '/home');
  });

  it('passes accessibility audit', () => {
    cy.mount(<Button>Accessible Button</Button>);
    cy.injectAxe();
    cy.checkA11y('button');
  });
});
```

## Form Component Test

```typescript
// src/components/Form/LoginForm.cy.tsx
import { LoginForm } from './LoginForm';

describe('LoginForm Component', () => {
  const defaultProps = {
    onSubmit: cy.stub().as('submitHandler'),
    onForgotPassword: cy.stub().as('forgotHandler'),
  };

  beforeEach(() => {
    cy.mountWithProviders(<LoginForm {...defaultProps} />);
  });

  it('renders all form fields', () => {
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain.text', 'Sign In');
  });

  it('submits form with valid data', () => {
    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();

    cy.get('@submitHandler').should('have.been.calledOnceWith', {
      email: 'user@example.com',
      password: 'Password123!',
    });
  });

  it('shows validation errors for empty submission', () => {
    cy.get('button[type="submit"]').click();

    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
    cy.get('@submitHandler').should('not.have.been.called');
  });

  it('validates email format', () => {
    cy.get('input[name="email"]').type('not-an-email');
    cy.get('input[name="email"]').blur();
    cy.contains('Please enter a valid email').should('be.visible');
  });

  it('validates password minimum length', () => {
    cy.get('input[name="password"]').type('short');
    cy.get('input[name="password"]').blur();
    cy.contains('Password must be at least 8 characters').should('be.visible');
  });

  it('toggles password visibility', () => {
    cy.get('input[name="password"]').type('MyPassword');
    cy.get('input[name="password"]').should('have.attr', 'type', 'password');

    cy.get('[data-testid="toggle-password"]').click();
    cy.get('input[name="password"]').should('have.attr', 'type', 'text');

    cy.get('[data-testid="toggle-password"]').click();
    cy.get('input[name="password"]').should('have.attr', 'type', 'password');
  });

  it('handles forgot password link', () => {
    cy.contains('Forgot password?').click();
    cy.get('@forgotHandler').should('have.been.calledOnce');
  });

  it('shows loading state during submission', () => {
    const slowSubmit = cy.stub().callsFake(() => new Promise((r) => setTimeout(r, 1000)));
    cy.mountWithProviders(<LoginForm onSubmit={slowSubmit} />);

    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();

    cy.get('button[type="submit"]').should('be.disabled');
    cy.get('[data-testid="spinner"]').should('be.visible');
  });

  it('passes accessibility audit', () => {
    cy.injectAxe();
    cy.checkA11y('form');
  });
});
```

## Modal Component Test

```typescript
// src/components/Modal/Modal.cy.tsx
import { Modal } from './Modal';
import { useState } from 'react';

function ModalWrapper(props: Partial<React.ComponentProps<typeof Modal>>) {
  const [open, setOpen] = useState(true);
  return (
    <Modal open={open} onClose={() => setOpen(false)} {...props}>
      <Modal.Title>Test Modal</Modal.Title>
      <Modal.Content>Modal content goes here</Modal.Content>
      <Modal.Footer>
        <button onClick={() => setOpen(false)}>Close</button>
        <button>Confirm</button>
      </Modal.Footer>
    </Modal>
  );
}

describe('Modal Component', () => {
  it('renders when open is true', () => {
    cy.mount(<ModalWrapper />);
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('Test Modal').should('be.visible');
    cy.contains('Modal content goes here').should('be.visible');
  });

  it('closes when close button is clicked', () => {
    cy.mount(<ModalWrapper />);
    cy.contains('Close').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('closes on Escape key press', () => {
    cy.mount(<ModalWrapper />);
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('closes on backdrop click', () => {
    cy.mount(<ModalWrapper />);
    cy.get('[data-testid="modal-backdrop"]').click({ force: true });
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('traps focus within the modal', () => {
    cy.mount(<ModalWrapper />);
    cy.get('[role="dialog"]').should('be.visible');

    // Tab through focusable elements
    cy.get('body').tab();
    cy.focused().should('contain.text', 'Close');
    cy.get('body').tab();
    cy.focused().should('contain.text', 'Confirm');
  });

  it('renders with custom size', () => {
    cy.mount(<ModalWrapper size="lg" />);
    cy.get('[role="dialog"]').should('have.class', 'modal-lg');
  });

  it('passes accessibility audit', () => {
    cy.mount(<ModalWrapper />);
    cy.injectAxe();
    cy.checkA11y('[role="dialog"]');
  });
});
```

## DataTable Component Test

```typescript
// src/components/DataTable/DataTable.cy.tsx
import { DataTable } from './DataTable';

const mockData = [
  { id: 1, name: 'Alice', email: 'alice@test.com', role: 'Admin' },
  { id: 2, name: 'Bob', email: 'bob@test.com', role: 'User' },
  { id: 3, name: 'Charlie', email: 'charlie@test.com', role: 'Editor' },
];

const columns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'role', header: 'Role', sortable: false },
];

describe('DataTable Component', () => {
  it('renders all rows and columns', () => {
    cy.mount(<DataTable data={mockData} columns={columns} />);

    // Check headers
    cy.get('th').should('have.length', 3);
    cy.get('th').eq(0).should('contain.text', 'Name');

    // Check rows
    cy.get('tbody tr').should('have.length', 3);
    cy.get('tbody tr').first().should('contain.text', 'Alice');
  });

  it('sorts by column when header is clicked', () => {
    cy.mount(<DataTable data={mockData} columns={columns} />);

    // Sort by name ascending
    cy.contains('th', 'Name').click();
    cy.get('tbody tr').first().should('contain.text', 'Alice');

    // Sort by name descending
    cy.contains('th', 'Name').click();
    cy.get('tbody tr').first().should('contain.text', 'Charlie');
  });

  it('renders empty state when no data', () => {
    cy.mount(<DataTable data={[]} columns={columns} />);
    cy.contains('No data available').should('be.visible');
  });

  it('handles row selection', () => {
    const onSelect = cy.stub().as('selectHandler');
    cy.mount(<DataTable data={mockData} columns={columns} selectable onSelectionChange={onSelect} />);

    cy.get('tbody tr').first().find('input[type="checkbox"]').check();
    cy.get('@selectHandler').should('have.been.calledWith', [mockData[0]]);
  });

  it('supports pagination', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      role: 'User',
    }));

    cy.mount(<DataTable data={manyRows} columns={columns} pageSize={10} />);
    cy.get('tbody tr').should('have.length', 10);
    cy.contains('button', 'Next').click();
    cy.get('tbody tr').should('have.length', 10);
    cy.contains('button', 'Next').click();
    cy.get('tbody tr').should('have.length', 5);
  });
});
```

## Responsive Component Testing

```typescript
// src/components/Navigation/Navigation.cy.tsx
import { Navigation } from './Navigation';

describe('Navigation Responsive Behavior', () => {
  it('shows full menu on desktop', () => {
    cy.viewport(1280, 720);
    cy.mountWithProviders(<Navigation />);

    cy.get('nav').should('be.visible');
    cy.get('[data-testid="desktop-menu"]').should('be.visible');
    cy.get('[data-testid="mobile-menu-button"]').should('not.be.visible');
  });

  it('shows hamburger menu on mobile', () => {
    cy.viewport(375, 812);
    cy.mountWithProviders(<Navigation />);

    cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
    cy.get('[data-testid="desktop-menu"]').should('not.be.visible');
  });

  it('toggles mobile menu on hamburger click', () => {
    cy.viewport(375, 812);
    cy.mountWithProviders(<Navigation />);

    cy.get('[data-testid="mobile-menu-button"]').click();
    cy.get('[data-testid="mobile-menu"]').should('be.visible');

    cy.get('[data-testid="mobile-menu-button"]').click();
    cy.get('[data-testid="mobile-menu"]').should('not.be.visible');
  });

  it('closes mobile menu on navigation', () => {
    cy.viewport(375, 812);
    cy.mountWithProviders(<Navigation />);

    cy.get('[data-testid="mobile-menu-button"]').click();
    cy.get('[data-testid="mobile-menu"]').should('be.visible');

    cy.get('[data-testid="mobile-menu"]').contains('Home').click();
    cy.get('[data-testid="mobile-menu"]').should('not.be.visible');
  });
});
```

## Best Practices

1. **Colocate component tests with components** -- Place `.cy.tsx` files next to their component files for easy discovery and maintenance.
2. **Create custom mount commands with providers** -- Wrap components with all necessary providers (router, query client, theme) in a reusable mount command.
3. **Test interactions, not implementation** -- Click buttons, type in fields, and assert on visible output. Do not test React state or internal methods.
4. **Use cy.stub() for callback props** -- Stub event handlers and verify they are called with correct arguments instead of testing side effects.
5. **Include accessibility checks** -- Add `cy.injectAxe()` and `cy.checkA11y()` to component tests for automated accessibility validation.
6. **Test responsive behavior** -- Use `cy.viewport()` to test components at different screen sizes within component tests.
7. **Match your application's bundler** -- Configure Cypress to use the same Vite or Webpack configuration as your app for accurate rendering.
8. **Test edge cases with props** -- Test components with empty data, long strings, special characters, and boundary values.
9. **Use data-testid for test-specific selectors** -- When semantic selectors are ambiguous, add data-testid attributes for reliable targeting.
10. **Keep tests fast** -- Component tests should run in milliseconds. Avoid network calls or heavy setup in component tests.

## Anti-Patterns

1. **Testing internal component state** -- Accessing React state or calling component methods directly tests implementation, not behavior.
2. **Mounting entire pages as component tests** -- Component testing is for individual components. Use E2E tests for full page flows.
3. **Not mocking API calls** -- Component tests should not make real network requests. Use cy.intercept() to stub API responses.
4. **Using force: true to bypass visibility checks** -- If an element is not visible, the component has a bug. Fix the component, not the test.
5. **Sharing state between tests** -- Each test should mount a fresh component. Do not rely on state from a previous test.
6. **Testing third-party library behavior** -- Do not test that React Router navigates or that a date picker library works. Test your component's behavior.
7. **Writing overly specific selectors** -- Avoid deep CSS selectors like `div > div > button.primary`. Use roles, labels, and test IDs.
8. **Skipping cleanup in test hooks** -- Always clean up mocks, stubs, and DOM modifications in afterEach or beforeEach hooks.
9. **Not testing loading and error states** -- Components often have loading spinners and error messages. Test these states explicitly.
10. **Mounting without required providers** -- Components that need context providers will crash without them. Always wrap with necessary providers.
