---
name: Error Boundary Tester
description: Validate error boundary implementations in React and other frameworks ensuring graceful degradation, proper fallback UI rendering, and error recovery flows
version: 1.0.0
author: Pramod
license: MIT
tags: [error-boundary, error-handling, graceful-degradation, fallback-ui, react-error-boundary, crash-recovery, resilience]
testingTypes: [e2e, unit]
frameworks: [playwright, jest, vitest]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Error Boundary Tester Skill

You are an expert QA automation engineer specializing in error boundary and fault tolerance testing. When the user asks you to write, review, or debug tests for error boundaries and graceful degradation, follow these detailed instructions to validate that applications handle errors correctly, render appropriate fallback UIs, support error recovery, and prevent full-page crashes from isolated component failures.

## Core Principles

1. **Errors are inevitable, crashes are not** -- Every component will eventually encounter an error. Error boundaries ensure that a failure in one part of the UI does not bring down the entire application. Test that each error boundary contains failures within its scope.
2. **Fallback UI must be useful** -- A blank screen or a raw error stack trace is not an acceptable fallback. Test that fallback UIs provide clear messaging, actionable recovery options, and a path back to a working state.
3. **Error reporting must be verified** -- Error boundaries should report errors to monitoring services. Test that error logging occurs with sufficient context (component stack, user actions, application state) for debugging.
4. **Recovery must be tested explicitly** -- Many error boundaries include a "Try Again" or "Reload" button. Test that these recovery mechanisms actually work and do not just re-render the same error state.
5. **Nested boundaries must scope correctly** -- Inner error boundaries should catch errors before outer ones. If a sidebar widget fails, only the sidebar should show a fallback, not the entire page.
6. **Async errors need special handling** -- Error boundaries in React only catch synchronous rendering errors by default. Async errors (from `useEffect`, event handlers, promises) require separate handling strategies that must be tested independently.

## Project Structure

Organize error boundary test projects with this structure:

```
tests/
  error-boundaries/
    unit/
      error-boundary-component.test.tsx
      fallback-ui.test.tsx
      error-reporter.test.ts
      recovery-flow.test.tsx
    e2e/
      component-crash.spec.ts
      nested-boundary.spec.ts
      full-page-crash.spec.ts
      chunk-load-failure.spec.ts
      network-error.spec.ts
    integration/
      error-logging.spec.ts
      error-recovery.spec.ts
  helpers/
    error-injector.ts
    crash-component.tsx
    boundary-test-utils.ts
  fixtures/
    error-scenarios.fixture.ts
  mocks/
    error-reporter.mock.ts
playwright.config.ts
vitest.config.ts
```

## React Error Boundary Unit Testing

### Testing the Error Boundary Component Itself

```typescript
// tests/unit/error-boundary-component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary } from '../../src/components/error-boundary';

// A component that throws on demand
function CrashingComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('Intentional test crash');
  }
  return <div data-testid="healthy-content">Everything is working</div>;
}

// A component that throws during render
function AlwaysCrashes(): JSX.Element {
  throw new Error('Component always crashes');
}

// A component that throws a specific error type
function TypeErrorComponent(): JSX.Element {
  const obj: Record<string, unknown> = {};
  // Force a TypeError at runtime
  return <div>{(obj as { nested: { value: string } }).nested.value}</div>;
}

describe('ErrorBoundary Component', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress React's console.error for error boundaries in tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <CrashingComponent shouldCrash={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-content')).toBeInTheDocument();
    expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
  });

  test('renders fallback UI when child component throws', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="fallback">Something went wrong</div>}>
        <AlwaysCrashes />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByTestId('healthy-content')).not.toBeInTheDocument();
  });

  test('calls onError callback with error and component stack', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary
        fallback={<div>Error</div>}
        onError={onError}
      >
        <AlwaysCrashes />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Component always crashes',
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  test('catches TypeError from nested rendering', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="type-error-fallback">Type error caught</div>}>
        <TypeErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('type-error-fallback')).toBeInTheDocument();
  });

  test('different error boundaries catch errors independently', () => {
    render(
      <div>
        <ErrorBoundary fallback={<div data-testid="sidebar-fallback">Sidebar error</div>}>
          <AlwaysCrashes />
        </ErrorBoundary>
        <ErrorBoundary fallback={<div data-testid="main-fallback">Main error</div>}>
          <CrashingComponent shouldCrash={false} />
        </ErrorBoundary>
      </div>
    );

    // Sidebar should show fallback
    expect(screen.getByTestId('sidebar-fallback')).toBeInTheDocument();
    // Main should show healthy content
    expect(screen.getByTestId('healthy-content')).toBeInTheDocument();
    // Main fallback should NOT be shown
    expect(screen.queryByTestId('main-fallback')).not.toBeInTheDocument();
  });
});
```

### Testing Fallback UI Content

```typescript
// tests/unit/fallback-ui.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { ErrorFallback } from '../../src/components/error-fallback';

describe('ErrorFallback Component', () => {
  test('displays user-friendly error message', () => {
    render(
      <ErrorFallback
        error={new Error('API request failed')}
        resetErrorBoundary={vi.fn()}
      />
    );

    // Should show a friendly message, not the raw error
    expect(screen.getByRole('heading')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByText('API request failed')).not.toBeInTheDocument();
  });

  test('shows recovery button', () => {
    const resetFn = vi.fn();
    render(
      <ErrorFallback
        error={new Error('Test error')}
        resetErrorBoundary={resetFn}
      />
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  test('recovery button triggers resetErrorBoundary', async () => {
    const resetFn = vi.fn();
    render(
      <ErrorFallback
        error={new Error('Test error')}
        resetErrorBoundary={resetFn}
      />
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await retryButton.click();

    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  test('provides a link to navigate home as escape hatch', () => {
    render(
      <ErrorFallback
        error={new Error('Test error')}
        resetErrorBoundary={vi.fn()}
      />
    );

    const homeLink = screen.getByRole('link', { name: /go home|return home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  test('fallback UI is accessible', () => {
    render(
      <ErrorFallback
        error={new Error('Test error')}
        resetErrorBoundary={vi.fn()}
      />
    );

    // Should have proper ARIA attributes
    const alertRegion = screen.getByRole('alert');
    expect(alertRegion).toBeInTheDocument();

    // Retry button should be focusable
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).not.toHaveAttribute('tabindex', '-1');
  });

  test('does not expose stack trace in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorFallback
        error={new Error('Sensitive error details here')}
        resetErrorBoundary={vi.fn()}
      />
    );

    expect(screen.queryByText(/Sensitive error details/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at /)).not.toBeInTheDocument(); // No stack traces

    process.env.NODE_ENV = originalEnv;
  });
});
```

## Error Injection for E2E Testing

### Forced Error Injection via Playwright

```typescript
// tests/e2e/component-crash.spec.ts
import { test, expect, Page } from '@playwright/test';

async function injectRenderError(page: Page, componentSelector: string): Promise<void> {
  await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);

    // Inject an error-throwing element that React will try to render
    const errorDiv = document.createElement('div');
    errorDiv.setAttribute('data-crash-injected', 'true');

    // Override innerHTML to force a React reconciliation error
    Object.defineProperty(errorDiv, 'textContent', {
      get() {
        throw new Error('Injected render error for testing');
      },
    });

    element.appendChild(errorDiv);
  }, componentSelector);
}

test.describe('Component Crash Recovery (E2E)', () => {
  test('sidebar crash should not affect main content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify both sidebar and main content are initially visible
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Simulate a JavaScript error in the sidebar component
    await page.evaluate(() => {
      // Dispatch a custom event that triggers an error in the sidebar
      window.dispatchEvent(
        new CustomEvent('__test_inject_error', {
          detail: { component: 'sidebar' },
        })
      );
    });

    // Main content should still be functional
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

    // Sidebar should show error fallback
    const sidebarFallback = page.locator('[data-testid="sidebar-error-fallback"]');
    await expect(sidebarFallback).toBeVisible();

    // Sidebar fallback should have a retry option
    const retryButton = sidebarFallback.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
  });

  test('clicking retry should recover from error', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Trigger a recoverable error
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('__test_inject_error', {
          detail: { component: 'widget', recoverable: true },
        })
      );
    });

    // Verify fallback is shown
    const fallback = page.locator('[data-testid="widget-error-fallback"]');
    await expect(fallback).toBeVisible();

    // Click retry
    await fallback.locator('button:has-text("Try Again")').click();

    // Verify the component recovered
    await expect(page.locator('[data-testid="widget-content"]')).toBeVisible();
    await expect(fallback).not.toBeVisible();
  });
});
```

### Testing Error Boundaries with Network Failures

```typescript
// tests/e2e/network-error.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Network Error Boundaries', () => {
  test('should show error boundary when API request fails', async ({ page }) => {
    // Intercept API calls and force them to fail
    await page.route('**/api/dashboard/stats', (route) => {
      route.abort('connectionrefused');
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The stats component should show its error boundary
    const statsError = page.locator('[data-testid="stats-error"]');
    await expect(statsError).toBeVisible();
    await expect(statsError).toContainText(/unable to load|failed to load/i);

    // Other dashboard components should still work
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
  });

  test('should recover when API becomes available again', async ({ page }) => {
    let requestCount = 0;

    // Fail the first request, succeed on retry
    await page.route('**/api/dashboard/stats', (route) => {
      requestCount++;
      if (requestCount <= 1) {
        route.abort('connectionrefused');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ total: 42, active: 10 }),
        });
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Error should be showing
    const statsError = page.locator('[data-testid="stats-error"]');
    await expect(statsError).toBeVisible();

    // Click retry
    await statsError.locator('button:has-text("Retry")').click();

    // Stats should now display correctly
    await expect(page.locator('[data-testid="stats-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-total"]')).toContainText('42');
  });

  test('should handle 500 server errors gracefully', async ({ page }) => {
    await page.route('**/api/posts', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/posts');
    await page.waitForLoadState('networkidle');

    // Should show a user-friendly error, not a raw 500 message
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).not.toContainText('500');
    await expect(page.locator('[role="alert"]')).not.toContainText('Internal Server Error');
  });
});
```

## Nested Error Boundary Scoping

Testing that inner boundaries catch errors before outer boundaries is critical for maintaining partial functionality during failures.

```typescript
// tests/unit/nested-boundary.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/error-boundary';

function CrashingWidget(): JSX.Element {
  throw new Error('Widget crashed');
}

function HealthyWidget(): JSX.Element {
  return <div data-testid="healthy-widget">Working widget</div>;
}

describe('Nested Error Boundary Scoping', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  test('inner boundary catches error before outer boundary', () => {
    const innerOnError = vi.fn();
    const outerOnError = vi.fn();

    render(
      <ErrorBoundary
        fallback={<div data-testid="outer-fallback">Outer error</div>}
        onError={outerOnError}
      >
        <div data-testid="page-layout">
          <ErrorBoundary
            fallback={<div data-testid="inner-fallback">Inner error</div>}
            onError={innerOnError}
          >
            <CrashingWidget />
          </ErrorBoundary>
          <HealthyWidget />
        </div>
      </ErrorBoundary>
    );

    // Inner fallback should be shown
    expect(screen.getByTestId('inner-fallback')).toBeInTheDocument();
    // Healthy widget should still be visible
    expect(screen.getByTestId('healthy-widget')).toBeInTheDocument();
    // Outer fallback should NOT be shown
    expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
    // Page layout should still be intact
    expect(screen.getByTestId('page-layout')).toBeInTheDocument();

    // Inner onError should be called, outer should NOT
    expect(innerOnError).toHaveBeenCalledTimes(1);
    expect(outerOnError).not.toHaveBeenCalled();
  });

  test('outer boundary catches when there is no inner boundary', () => {
    const outerOnError = vi.fn();

    render(
      <ErrorBoundary
        fallback={<div data-testid="outer-fallback">Page error</div>}
        onError={outerOnError}
      >
        <CrashingWidget />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('outer-fallback')).toBeInTheDocument();
    expect(outerOnError).toHaveBeenCalledTimes(1);
  });

  test('multiple sibling boundaries are independent', () => {
    render(
      <div>
        <ErrorBoundary fallback={<div data-testid="boundary-a-fallback">A failed</div>}>
          <CrashingWidget />
        </ErrorBoundary>
        <ErrorBoundary fallback={<div data-testid="boundary-b-fallback">B failed</div>}>
          <HealthyWidget />
        </ErrorBoundary>
        <ErrorBoundary fallback={<div data-testid="boundary-c-fallback">C failed</div>}>
          <CrashingWidget />
        </ErrorBoundary>
      </div>
    );

    // A and C should show fallbacks
    expect(screen.getByTestId('boundary-a-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('boundary-c-fallback')).toBeInTheDocument();
    // B should show healthy content
    expect(screen.getByTestId('healthy-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('boundary-b-fallback')).not.toBeInTheDocument();
  });
});
```

## Error Logging and Reporting Verification

```typescript
// tests/unit/error-reporter.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/error-boundary';
import * as errorReporter from '../../src/lib/error-reporter';

function CrashingComponent(): JSX.Element {
  throw new Error('Crash for reporting test');
}

describe('Error Reporting from Boundaries', () => {
  let reportSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reportSpy = vi.spyOn(errorReporter, 'reportError').mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('error boundary should report error to monitoring service', () => {
    render(
      <ErrorBoundary fallback={<div>Error</div>}>
        <CrashingComponent />
      </ErrorBoundary>
    );

    expect(reportSpy).toHaveBeenCalledTimes(1);
    expect(reportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Crash for reporting test',
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  test('error report should include component stack trace', () => {
    render(
      <ErrorBoundary fallback={<div>Error</div>}>
        <div>
          <section>
            <CrashingComponent />
          </section>
        </div>
      </ErrorBoundary>
    );

    const [, errorInfo] = reportSpy.mock.calls[0];
    expect(errorInfo.componentStack).toContain('CrashingComponent');
  });

  test('error report should not include PII', () => {
    render(
      <ErrorBoundary fallback={<div>Error</div>}>
        <CrashingComponent />
      </ErrorBoundary>
    );

    const [error, errorInfo] = reportSpy.mock.calls[0];
    const reportString = JSON.stringify({ error: error.message, ...errorInfo });

    // Ensure no emails, tokens, or other PII in the report
    expect(reportString).not.toMatch(/@.*\./);
    expect(reportString).not.toMatch(/Bearer\s+/);
    expect(reportString).not.toMatch(/password/i);
  });
});
```

## Async Error Handling

React error boundaries do not catch errors in event handlers, async functions, or `setTimeout` callbacks. These require separate handling.

```typescript
// tests/unit/async-error-handling.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useState } from 'react';
import { ErrorBoundary } from '../../src/components/error-boundary';

function AsyncCrashingComponent() {
  const [error, setError] = useState<Error | null>(null);

  const handleClick = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err as Error);
    }
  };

  if (error) {
    throw error; // Re-throw to be caught by error boundary
  }

  return (
    <button data-testid="trigger" onClick={handleClick}>
      Load Data
    </button>
  );
}

describe('Async Error Handling', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});

  test('async errors should be caught by error boundary when re-thrown via state', async () => {
    // Mock the fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <ErrorBoundary
        fallback={<div data-testid="async-fallback">Async error caught</div>}
      >
        <AsyncCrashingComponent />
      </ErrorBoundary>
    );

    // Trigger the async operation
    fireEvent.click(screen.getByTestId('trigger'));

    // Wait for the error boundary to render the fallback
    await waitFor(() => {
      expect(screen.getByTestId('async-fallback')).toBeInTheDocument();
    });
  });
});
```

## Chunk Loading Failure Handling

Dynamic imports can fail when deployment invalidates old chunks. This is a common production error that error boundaries must handle.

```typescript
// tests/e2e/chunk-load-failure.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chunk Loading Failure', () => {
  test('should show error boundary when a lazy-loaded chunk fails', async ({ page }) => {
    // Intercept chunk requests and make them fail
    await page.route('**/*.chunk.js', (route) => {
      route.fulfill({
        status: 404,
        body: 'Not Found',
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to a route that uses lazy loading
    await page.click('a[href="/settings"]');

    // Should show a meaningful error, not a blank page
    await expect(
      page.locator('[role="alert"], [data-testid="chunk-error"]')
    ).toBeVisible({ timeout: 10000 });

    // Should offer a way to recover (typically a page reload)
    const reloadButton = page.locator(
      'button:has-text("Reload"), button:has-text("Refresh")'
    );
    await expect(reloadButton).toBeVisible();
  });

  test('should auto-retry chunk loading before showing error', async ({ page }) => {
    let chunkRequestCount = 0;

    await page.route('**/settings.chunk.js', (route) => {
      chunkRequestCount++;
      if (chunkRequestCount <= 2) {
        // Fail first 2 attempts
        route.fulfill({ status: 500, body: 'Server Error' });
      } else {
        // Succeed on third attempt
        route.continue();
      }
    });

    await page.goto('/');
    await page.click('a[href="/settings"]');

    // The page should eventually load after retries
    await expect(
      page.locator('[data-testid="settings-page"]')
    ).toBeVisible({ timeout: 15000 });

    // Should have retried at least once
    expect(chunkRequestCount).toBeGreaterThan(1);
  });

  test('stale deployment chunk failure should suggest page refresh', async ({ page }) => {
    // Simulate a deployment scenario where chunk hashes have changed
    await page.route('**/*.[a-f0-9]*.js', (route) => {
      if (route.request().url().includes('old-hash')) {
        route.fulfill({ status: 404, body: 'Not Found' });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the error message mentions updating or refreshing
    const errorMessage = page.locator('[role="alert"]');
    if (await errorMessage.isVisible()) {
      const text = await errorMessage.textContent();
      expect(text).toMatch(/refresh|reload|update|new version/i);
    }
  });
});
```

## Configuration

### Vitest Configuration for Error Boundary Tests

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: [
      'tests/error-boundaries/unit/**/*.test.{ts,tsx}',
      'tests/error-boundaries/integration/**/*.test.{ts,tsx}',
    ],
    coverage: {
      include: [
        'src/components/error-boundary/**',
        'src/components/error-fallback/**',
        'src/lib/error-reporter.*',
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
```

### Playwright Configuration for Error Boundary E2E Tests

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/error-boundaries/e2e',
  fullyParallel: true,
  retries: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'error-boundary-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'error-boundaries-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'error-boundaries-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'error-boundaries-mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
```

### Test Setup File

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Suppress React error boundary console.error in test output
// while still allowing test assertions on error reporting
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (
    message.includes('Error: Uncaught') ||
    message.includes('The above error occurred in') ||
    message.includes('Consider adding an error boundary')
  ) {
    return; // Suppress React's error boundary warnings in tests
  }
  originalConsoleError(...args);
};
```

## Best Practices

1. **Wrap every route-level component in an error boundary** -- Each page or route should have its own error boundary so that navigation to a broken page does not crash the entire application.

2. **Use granular boundaries for independent widgets** -- Dashboard widgets, sidebar components, and data visualization panels should each have their own error boundary. A failing chart should not bring down the navigation.

3. **Always provide a recovery action in fallback UIs** -- Every error fallback must include at least one actionable button: "Try Again", "Reload Page", or "Go Home". A dead-end error screen forces users to manually refresh.

4. **Log errors with component stack traces** -- The `componentStack` from `getDerivedStateFromError` or `componentDidCatch` shows exactly where in the component tree the error occurred. Always include this in error reports.

5. **Test error boundaries with multiple error types** -- Test with `TypeError`, `RangeError`, `SyntaxError`, network errors, and custom application errors. Different error types may need different fallback messaging.

6. **Handle async errors explicitly** -- Since React error boundaries do not catch async errors by default, use the "re-throw via state" pattern: catch the async error, set it in state, and throw from render.

7. **Implement retry with exponential backoff** -- When error boundaries support retry, implement exponential backoff to prevent rapid retry loops that overwhelm failing services.

8. **Test error boundaries in production mode** -- Development mode shows additional error overlays and detailed stack traces. Production mode hides these. Test in production mode to verify users see the correct fallback.

9. **Add error boundaries around dynamic imports** -- Every `React.lazy()` call should be wrapped in a `Suspense` with an error boundary. Chunk loading failures are common after deployments and must be handled gracefully.

10. **Verify error boundaries do not swallow errors silently** -- An error boundary that catches an error but does not log it or show a fallback is worse than no boundary at all. Test that every caught error is both displayed and reported.

11. **Test keyboard navigation within fallback UIs** -- Users who encounter an error boundary while navigating with a keyboard must be able to reach the retry button and other recovery actions without a mouse.

12. **Reset error boundary state on route change** -- When a user navigates away from a page with an error and returns, the error boundary should reset and attempt to render the component again, not show the stale error state.

## Anti-Patterns to Avoid

1. **Catching errors without reporting them** -- An error boundary that renders a fallback but does not send the error to a monitoring service is a blind spot. Production errors caught by silent boundaries are invisible to the development team.

2. **Using a single error boundary at the app root only** -- A single top-level boundary means any component failure replaces the entire UI with a fallback. This defeats the purpose of error containment. Use boundaries at multiple levels.

3. **Showing raw error messages to users** -- Error messages like "TypeError: Cannot read properties of undefined" are meaningless to users and may expose implementation details. Always show user-friendly messages in production.

4. **Retrying without clearing the error state** -- If a retry attempt does not properly reset the error boundary's internal state, it will continue showing the fallback even after the underlying issue is resolved.

5. **Ignoring async error handling** -- Assuming that wrapping a component in an error boundary catches all errors within it, including those from `useEffect`, event handlers, and promises, is a dangerous misconception. These require explicit error handling.

6. **Testing error boundaries only in development mode** -- React's development mode includes an error overlay that masks the actual error boundary behavior. Always run error boundary tests against a production build to verify real user experience.

7. **Nesting too many boundaries** -- While granular boundaries are good, excessive nesting (every single component) creates maintenance burden and can make error UIs fragmented. Find the right balance at the feature or widget level.

## Debugging Tips

1. **Use React DevTools to inspect error boundary state** -- React DevTools shows the component tree including error boundary state. Look for boundaries in the "errored" state to understand which boundary caught which error.

2. **Check the browser console for "The above error occurred in..." messages** -- React logs detailed component stack traces when an error boundary catches an error. These messages show the exact component path from the root to the error source.

3. **Temporarily remove error boundaries to see raw errors** -- When debugging, temporarily remove the error boundary wrapping a problematic component. This lets you see the full unhandled error with its original stack trace.

4. **Verify error boundary reset behavior with React key prop** -- Adding a `key` prop to an error boundary forces React to unmount and remount it when the key changes. Use this as a reset mechanism: `<ErrorBoundary key={resetKey}>`.

5. **Test with React's Strict Mode enabled** -- Strict Mode double-renders components in development, which can expose error boundary issues related to side effects in render. Ensure boundaries work correctly under Strict Mode.

6. **Watch for "Maximum update depth exceeded" in error recovery** -- If clicking "Retry" causes the component to immediately error again, it can create an infinite error-recovery loop. Add safeguards like retry counters or cooldown periods.

7. **Check for hydration errors in SSR applications** -- Server-side rendered applications can trigger error boundaries during hydration when server-rendered HTML does not match client-rendered output. Test error boundaries specifically around the hydration phase.

8. **Log the error boundary lifecycle** -- Add console logs to `getDerivedStateFromError` and `componentDidCatch` (or the equivalent hooks) to trace exactly when errors are caught, what fallback is rendered, and when recovery is attempted.

9. **Verify that error boundaries handle errors during unmount** -- Components that throw errors during cleanup (in `useEffect` return functions or `componentWillUnmount`) may not be caught by error boundaries. Test these edge cases explicitly.

10. **Use Sentry or similar tools to verify error boundary reports in staging** -- Before deploying to production, verify that error boundary reports actually reach your monitoring tool with correct source maps, component stacks, and user context.
