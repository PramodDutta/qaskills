---
name: Angry User Simulator
description: Simulate aggressive user behavior patterns including rapid clicking, random navigation, form abuse, tab spamming, and unexpected interaction sequences to find UI resilience issues
version: 1.0.0
author: Pramod
license: MIT
tags: [chaos-testing, user-simulation, stress-testing, ui-resilience, monkey-testing, random-testing, robustness]
testingTypes: [e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Angry User Simulator Skill

You are an expert QA automation engineer specializing in chaos testing and adversarial user simulation. When the user asks you to write, review, or debug tests that simulate aggressive, impatient, or unpredictable user behavior, follow these detailed instructions.

## Core Principles

1. **Users are unpredictable** -- Real users do not follow the happy path. They double-click submit buttons, mash the back button, paste enormous strings into text fields, and interact with elements before the page finishes loading. Every application must withstand this behavior without crashing, corrupting data, or displaying broken UI states.
2. **Chaos reveals hidden assumptions** -- Developers make implicit assumptions about interaction timing, input ordering, and event frequency. Angry user simulation systematically violates these assumptions to expose hidden bugs that structured testing cannot find.
3. **Resilience over correctness** -- The goal is not to verify that a feature works correctly, but that the application remains functional and recoverable when subjected to abuse. A button that does nothing when clicked 50 times rapidly is acceptable. A button that submits 50 duplicate orders is not.
4. **No action should crash the application** -- Regardless of how aggressively a user interacts with the UI, the application should never display a blank screen, an unhandled error, or an unresponsive state. Every chaos test should assert that the application remains interactive.
5. **Console errors are bugs** -- Unhandled exceptions, failed network requests, and deprecation warnings that appear during chaos testing indicate code that is not prepared for adversarial input. Monitor the console during every chaos test run.
6. **Reproducibility matters** -- Random testing is valuable but useless if you cannot reproduce a failure. Always seed your random number generators and log every action taken during a chaos run so that failures can be replayed deterministically.
7. **Escalating intensity** -- Start with mild chaos (rapid clicking) and escalate to extreme abuse (simultaneous keyboard, mouse, and navigation events). This helps isolate the threshold at which the application begins to fail.

## Project Structure

Organize angry user simulation tests with this structure:

```
tests/
  chaos/
    rapid-interaction/
      double-click.spec.ts
      rapid-submit.spec.ts
      button-mashing.spec.ts
    navigation-abuse/
      back-forward-spam.spec.ts
      random-navigation.spec.ts
      deep-link-chaos.spec.ts
    form-abuse/
      paste-bombs.spec.ts
      special-characters.spec.ts
      field-overflow.spec.ts
    keyboard-chaos/
      keyboard-mashing.spec.ts
      shortcut-abuse.spec.ts
      tab-cycling.spec.ts
    visual-chaos/
      resize-spam.spec.ts
      scroll-abuse.spec.ts
      zoom-chaos.spec.ts
    monkey-testing/
      configurable-monkey.spec.ts
      targeted-monkey.spec.ts
      full-app-monkey.spec.ts
  fixtures/
    chaos.fixture.ts
    error-monitor.fixture.ts
  helpers/
    chaos-monkey.ts
    action-logger.ts
    random-data.ts
  pages/
    any-page.page.ts
playwright.config.ts
```

## Setting Up the Chaos Test Infrastructure

### Error Monitor

Build an error monitor that captures every console error, unhandled exception, and failed network request during chaos testing:

```typescript
import { Page, ConsoleMessage, Response } from '@playwright/test';

interface ErrorEntry {
  type: 'console-error' | 'unhandled-exception' | 'network-failure' | 'crash';
  message: string;
  timestamp: number;
  url?: string;
  stack?: string;
}

export class ErrorMonitor {
  private errors: ErrorEntry[] = [];
  private readonly page: Page;
  private readonly ignoredPatterns: RegExp[];

  constructor(page: Page, ignoredPatterns: RegExp[] = []) {
    this.page = page;
    this.ignoredPatterns = ignoredPatterns;
  }

  async start(): Promise<void> {
    // Capture console errors
    this.page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!this.isIgnored(text)) {
          this.errors.push({
            type: 'console-error',
            message: text,
            timestamp: Date.now(),
            url: this.page.url(),
          });
        }
      }
    });

    // Capture unhandled exceptions
    this.page.on('pageerror', (error: Error) => {
      if (!this.isIgnored(error.message)) {
        this.errors.push({
          type: 'unhandled-exception',
          message: error.message,
          timestamp: Date.now(),
          stack: error.stack,
          url: this.page.url(),
        });
      }
    });

    // Capture network failures (5xx responses)
    this.page.on('response', (response: Response) => {
      if (response.status() >= 500) {
        this.errors.push({
          type: 'network-failure',
          message: `${response.status()} ${response.statusText()} - ${response.url()}`,
          timestamp: Date.now(),
          url: response.url(),
        });
      }
    });

    // Detect page crashes
    this.page.on('crash', () => {
      this.errors.push({
        type: 'crash',
        message: 'Page crashed',
        timestamp: Date.now(),
        url: this.page.url(),
      });
    });
  }

  private isIgnored(message: string): boolean {
    return this.ignoredPatterns.some((pattern) => pattern.test(message));
  }

  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  getErrorsByType(type: ErrorEntry['type']): ErrorEntry[] {
    return this.errors.filter((e) => e.type === type);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  clear(): void {
    this.errors = [];
  }

  getReport(): string {
    if (this.errors.length === 0) return 'No errors detected.';

    return this.errors
      .map((e) => `[${e.type}] ${e.message} (at ${e.url || 'unknown'})`)
      .join('\n');
  }
}
```

### Action Logger

Create a logger that records every action taken during chaos testing for reproducibility:

```typescript
interface ActionEntry {
  action: string;
  target?: string;
  data?: unknown;
  timestamp: number;
  seed?: number;
}

export class ActionLogger {
  private actions: ActionEntry[] = [];
  private readonly seed: number;

  constructor(seed?: number) {
    this.seed = seed || Date.now();
  }

  log(action: string, target?: string, data?: unknown): void {
    this.actions.push({
      action,
      target,
      data,
      timestamp: Date.now(),
      seed: this.seed,
    });
  }

  getActions(): ActionEntry[] {
    return [...this.actions];
  }

  getSeed(): number {
    return this.seed;
  }

  getReplayScript(): string {
    return this.actions
      .map((a) => {
        if (a.target) {
          return `// ${a.action} on ${a.target}${a.data ? ` with ${JSON.stringify(a.data)}` : ''}`;
        }
        return `// ${a.action}`;
      })
      .join('\n');
  }

  clear(): void {
    this.actions = [];
  }
}
```

### Seeded Random Number Generator

Reproducible randomness is essential for chaos testing:

```typescript
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Mulberry32 PRNG
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
```

### Custom Test Fixture

```typescript
import { test as base, expect } from '@playwright/test';
import { ErrorMonitor } from '../helpers/error-monitor';
import { ActionLogger } from '../helpers/action-logger';
import { SeededRandom } from '../helpers/random-data';

interface ChaosFixtures {
  errorMonitor: ErrorMonitor;
  actionLogger: ActionLogger;
  random: SeededRandom;
  assertNoErrors: () => void;
  assertPageResponsive: () => Promise<void>;
}

export const test = base.extend<ChaosFixtures>({
  errorMonitor: async ({ page }, use) => {
    const monitor = new ErrorMonitor(page, [
      /favicon\.ico/,
      /ResizeObserver loop/,
    ]);
    await monitor.start();
    await use(monitor);
  },

  actionLogger: async ({}, use) => {
    const seed = parseInt(process.env.CHAOS_SEED || '') || Date.now();
    const logger = new ActionLogger(seed);
    await use(logger);
  },

  random: async ({ actionLogger }, use) => {
    const random = new SeededRandom(actionLogger.getSeed());
    await use(random);
  },

  assertNoErrors: async ({ errorMonitor }, use) => {
    const checker = () => {
      const errors = errorMonitor.getErrors();
      if (errors.length > 0) {
        throw new Error(
          `Chaos test produced ${errors.length} errors:\n${errorMonitor.getReport()}`
        );
      }
    };
    await use(checker);
  },

  assertPageResponsive: async ({ page }, use) => {
    const checker = async () => {
      // Verify the page is not frozen by checking if we can evaluate JS
      const isResponsive = await Promise.race([
        page.evaluate(() => true).then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
      ]);

      if (!isResponsive) {
        throw new Error('Page is unresponsive after chaos testing');
      }

      // Verify the page has visible content (not a blank/error screen)
      const bodyContent = await page.evaluate(
        () => document.body.innerText.trim().length
      );
      if (bodyContent === 0) {
        throw new Error('Page appears blank after chaos testing');
      }
    };
    await use(checker);
  },
});

export { expect };
```

## Rapid Click and Interaction Testing

The most common angry user behavior is rapid, repeated clicking on buttons and interactive elements.

```typescript
import { test, expect } from '../fixtures/chaos.fixture';

test.describe('Rapid Click Testing', () => {
  test('double-clicking submit button does not create duplicate submissions', async ({
    page,
    errorMonitor,
    assertNoErrors,
  }) => {
    await page.goto('/checkout');

    // Fill in required fields
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');

    // Track form submissions
    const submissions: unknown[] = [];
    await page.route('**/api/orders', async (route) => {
      submissions.push(route.request().postDataJSON());
      await route.continue();
    });

    // Double-click the submit button
    const submitButton = page.getByRole('button', { name: /place order/i });
    await submitButton.dblclick();

    await new Promise((r) => setTimeout(r, 2000));

    // Should only submit once despite double-click
    expect(submissions.length).toBeLessThanOrEqual(1);
    assertNoErrors();
  });

  test('rapid clicking submit 20 times creates at most one submission', async ({
    page,
    errorMonitor,
    assertNoErrors,
    assertPageResponsive,
  }) => {
    await page.goto('/checkout');

    await page.getByLabel('Name').fill('Rapid Clicker');
    await page.getByLabel('Email').fill('rapid@example.com');

    const submissions: unknown[] = [];
    await page.route('**/api/orders', async (route) => {
      submissions.push(route.request().postDataJSON());
      await route.continue();
    });

    const submitButton = page.getByRole('button', { name: /place order/i });

    // Click 20 times as fast as possible
    for (let i = 0; i < 20; i++) {
      await submitButton.click({ force: true, delay: 0 }).catch(() => {
        // Button may become disabled or hidden
      });
    }

    await new Promise((r) => setTimeout(r, 3000));

    expect(submissions.length).toBeLessThanOrEqual(1);
    await assertPageResponsive();
    assertNoErrors();
  });

  test('rapid clicking on navigation links does not break routing', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    await page.goto('/dashboard');

    const navLinks = page.getByRole('navigation').getByRole('link');
    const linkCount = await navLinks.count();

    // Rapidly click different navigation links
    for (let i = 0; i < Math.min(linkCount * 3, 30); i++) {
      const index = i % linkCount;
      await navLinks.nth(index).click({ force: true }).catch(() => {});
      // No wait between clicks -- simulating an impatient user
    }

    // Allow navigation to settle
    await new Promise((r) => setTimeout(r, 2000));

    await assertPageResponsive();

    // Page should be on a valid route
    const url = page.url();
    expect(url).not.toContain('undefined');
    expect(url).not.toContain('null');
  });

  test('clicking disabled button does not trigger action', async ({
    page,
    assertNoErrors,
  }) => {
    await page.goto('/checkout');

    // Do not fill required fields, so the button should be disabled
    const submitButton = page.getByRole('button', { name: /place order/i });

    const submissions: unknown[] = [];
    await page.route('**/api/orders', async (route) => {
      submissions.push(route.request().postDataJSON());
      await route.continue();
    });

    // Force-click the disabled button multiple times
    for (let i = 0; i < 10; i++) {
      await submitButton.click({ force: true }).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 2000));

    expect(submissions).toHaveLength(0);
    assertNoErrors();
  });
});
```

## Form Abuse Testing

Test form fields with adversarial input that users may accidentally or intentionally provide.

```typescript
import { test, expect } from '../fixtures/chaos.fixture';

test.describe('Form Field Abuse', () => {
  const PASTE_BOMBS = {
    longString: 'A'.repeat(100000),
    unicodeMadness: '\u202E\u200B\u200C\u200D\uFEFF'.repeat(1000),
    sqlInjection: "'; DROP TABLE users; --",
    xssPayload: '<script>alert("xss")</script><img src=x onerror=alert(1)>',
    controlCharacters: '\x00\x01\x02\x03\x04\x05\x06\x07\x08'.repeat(100),
    emojiFlood: String.fromCodePoint(0x1f4a9).repeat(10000),
    rtlOverride: '\u202Ethis text is reversed\u202C'.repeat(500),
    nullBytes: 'normal\x00hidden\x00data'.repeat(1000),
    nestedHtml: '<div>'.repeat(1000) + 'content' + '</div>'.repeat(1000),
    jsonPayload: '{"__proto__":{"admin":true}}'.repeat(100),
  };

  for (const [name, value] of Object.entries(PASTE_BOMBS)) {
    test(`form handles paste bomb: ${name}`, async ({
      page,
      errorMonitor,
      assertPageResponsive,
    }) => {
      await page.goto('/profile/edit');

      const nameField = page.getByLabel('Display Name');

      // Paste the adversarial content
      await nameField.fill(value);

      // Try to submit
      await page.getByRole('button', { name: /save/i }).click();

      await new Promise((r) => setTimeout(r, 2000));

      // Application should either reject the input or handle it gracefully
      await assertPageResponsive();

      // Should not have unhandled errors
      const criticalErrors = errorMonitor
        .getErrors()
        .filter((e) => e.type === 'unhandled-exception' || e.type === 'crash');
      expect(criticalErrors).toHaveLength(0);
    });
  }

  test('pasting into every field on a form does not crash', async ({
    page,
    assertPageResponsive,
  }) => {
    await page.goto('/settings');

    // Find all input fields
    const inputs = page.locator('input:visible, textarea:visible, select:visible');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      const inputType = await input.getAttribute('type');

      if (tagName === 'select') {
        // Select a random option
        const options = await input.locator('option').allTextContents();
        if (options.length > 0) {
          await input.selectOption({ index: 0 }).catch(() => {});
        }
      } else if (inputType === 'checkbox' || inputType === 'radio') {
        await input.click({ force: true }).catch(() => {});
      } else {
        await input.fill('A'.repeat(50000)).catch(() => {});
      }
    }

    await assertPageResponsive();
  });

  test('special characters in search field do not cause errors', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    await page.goto('/search');

    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    const specialInputs = [
      '((((((',
      '))))))))',
      '[[[[]]]]]',
      '****???+++',
      '\\\\\\\\',
      '//////',
      '<<<>>>',
      '${process.env.SECRET}',
      '{{constructor.constructor("return this")()}}',
      '%00%0d%0a',
      '../../../etc/passwd',
      'AAAA%08%08%08%08',
    ];

    for (const input of specialInputs) {
      await searchInput.fill(input);
      await page.keyboard.press('Enter');
      await new Promise((r) => setTimeout(r, 500));

      await assertPageResponsive();
    }

    const criticalErrors = errorMonitor
      .getErrors()
      .filter((e) => e.type !== 'network-failure');
    expect(criticalErrors).toHaveLength(0);
  });

  test('rapid field focus cycling does not cause layout thrashing', async ({
    page,
    assertPageResponsive,
  }) => {
    await page.goto('/profile/edit');

    const inputs = page.locator('input:visible, textarea:visible');
    const inputCount = await inputs.count();

    // Rapidly Tab through all fields multiple times
    for (let cycle = 0; cycle < 5; cycle++) {
      for (let i = 0; i < inputCount; i++) {
        await page.keyboard.press('Tab');
      }
    }

    await assertPageResponsive();
  });
});
```

## Navigation Abuse Testing

Test what happens when users rapidly navigate back and forward, open deep links, or use the browser history aggressively.

```typescript
import { test, expect } from '../fixtures/chaos.fixture';

test.describe('Navigation Abuse', () => {
  test('back/forward button mashing does not break routing', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    // Build up some navigation history
    await page.goto('/dashboard');
    await page.goto('/profile');
    await page.goto('/settings');
    await page.goto('/tasks');
    await page.goto('/dashboard');

    // Mash back and forward buttons
    for (let i = 0; i < 20; i++) {
      if (i % 3 === 0) {
        await page.goForward().catch(() => {});
      } else {
        await page.goBack().catch(() => {});
      }
      // No delay between navigations
    }

    await new Promise((r) => setTimeout(r, 2000));

    await assertPageResponsive();

    const criticalErrors = errorMonitor
      .getErrors()
      .filter((e) => e.type === 'unhandled-exception' || e.type === 'crash');
    expect(criticalErrors).toHaveLength(0);
  });

  test('random navigation across all app routes', async ({
    page,
    random,
    actionLogger,
    errorMonitor,
    assertPageResponsive,
  }) => {
    const routes = [
      '/dashboard',
      '/profile',
      '/settings',
      '/tasks',
      '/tasks/new',
      '/search',
      '/notifications',
      '/help',
      '/about',
    ];

    await page.goto('/dashboard');

    for (let i = 0; i < 30; i++) {
      const route = random.pick(routes);
      actionLogger.log('navigate', route);

      await page.goto(route).catch(() => {});
      await new Promise((r) => setTimeout(r, 200));
    }

    await assertPageResponsive();

    const crashes = errorMonitor.getErrorsByType('crash');
    expect(crashes).toHaveLength(0);
  });

  test('refreshing mid-navigation does not corrupt state', async ({
    page,
    assertPageResponsive,
  }) => {
    await page.goto('/tasks');

    // Start filling a form
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel('Task Title').fill('Half-completed task');

    // Refresh mid-action
    await page.reload();

    await assertPageResponsive();

    // Page should be in a clean state, not a half-broken form
    const url = page.url();
    expect(url).toContain('/tasks');
  });

  test('opening the same page in rapid succession', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    // Rapidly navigate to the same page
    for (let i = 0; i < 15; i++) {
      await page.goto('/dashboard', { waitUntil: 'commit' }).catch(() => {});
    }

    await page.waitForLoadState('domcontentloaded');
    await assertPageResponsive();

    const crashes = errorMonitor.getErrorsByType('crash');
    expect(crashes).toHaveLength(0);
  });
});
```

## Configurable Chaos Monkey

Build a reusable chaos monkey that can be aimed at any page to perform random interactions.

```typescript
import { Page, Locator } from '@playwright/test';
import { SeededRandom } from './random-data';
import { ActionLogger } from './action-logger';

interface ChaosMonkeyConfig {
  duration: number; // milliseconds
  actionsPerSecond: number;
  enableClicking: boolean;
  enableTyping: boolean;
  enableNavigation: boolean;
  enableScrolling: boolean;
  enableResizing: boolean;
  enableKeyboard: boolean;
  seed: number;
}

const DEFAULT_CONFIG: ChaosMonkeyConfig = {
  duration: 30000,
  actionsPerSecond: 5,
  enableClicking: true,
  enableTyping: true,
  enableNavigation: true,
  enableScrolling: true,
  enableResizing: true,
  enableKeyboard: true,
  seed: Date.now(),
};

export class ChaosMonkey {
  private readonly page: Page;
  private readonly config: ChaosMonkeyConfig;
  private readonly random: SeededRandom;
  private readonly logger: ActionLogger;
  private running = false;

  constructor(page: Page, config: Partial<ChaosMonkeyConfig> = {}) {
    this.page = page;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.random = new SeededRandom(this.config.seed);
    this.logger = new ActionLogger(this.config.seed);
  }

  async unleash(): Promise<ActionLogger> {
    this.running = true;
    const startTime = Date.now();
    const interval = 1000 / this.config.actionsPerSecond;

    while (this.running && Date.now() - startTime < this.config.duration) {
      const action = this.pickRandomAction();
      try {
        await action();
      } catch {
        // Chaos actions may fail -- that is expected
      }
      await new Promise((r) => setTimeout(r, interval));
    }

    this.running = false;
    return this.logger;
  }

  stop(): void {
    this.running = false;
  }

  private pickRandomAction(): () => Promise<void> {
    const actions: Array<() => Promise<void>> = [];

    if (this.config.enableClicking) {
      actions.push(() => this.randomClick());
    }
    if (this.config.enableTyping) {
      actions.push(() => this.randomType());
    }
    if (this.config.enableScrolling) {
      actions.push(() => this.randomScroll());
    }
    if (this.config.enableKeyboard) {
      actions.push(() => this.randomKeyPress());
    }
    if (this.config.enableResizing) {
      actions.push(() => this.randomResize());
    }

    return this.random.pick(actions);
  }

  private async randomClick(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) return;

    const x = this.random.nextInt(0, viewport.width);
    const y = this.random.nextInt(0, viewport.height);

    this.logger.log('click', `(${x}, ${y})`);
    await this.page.mouse.click(x, y);
  }

  private async randomType(): Promise<void> {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*() ';
    const length = this.random.nextInt(1, 20);
    let text = '';
    for (let i = 0; i < length; i++) {
      text += chars[this.random.nextInt(0, chars.length - 1)];
    }

    this.logger.log('type', undefined, text);
    await this.page.keyboard.type(text, { delay: 10 });
  }

  private async randomScroll(): Promise<void> {
    const deltaX = this.random.nextInt(-500, 500);
    const deltaY = this.random.nextInt(-1000, 1000);

    this.logger.log('scroll', `(${deltaX}, ${deltaY})`);
    await this.page.mouse.wheel(deltaX, deltaY);
  }

  private async randomKeyPress(): Promise<void> {
    const keys = [
      'Enter',
      'Escape',
      'Tab',
      'Backspace',
      'Delete',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'F5',
    ];
    const key = this.random.pick(keys);

    this.logger.log('keypress', key);
    await this.page.keyboard.press(key);
  }

  private async randomResize(): Promise<void> {
    const width = this.random.nextInt(320, 1920);
    const height = this.random.nextInt(480, 1080);

    this.logger.log('resize', `${width}x${height}`);
    await this.page.setViewportSize({ width, height });
  }
}
```

### Using the Chaos Monkey in Tests

```typescript
import { test, expect } from '../fixtures/chaos.fixture';
import { ChaosMonkey } from '../helpers/chaos-monkey';

test.describe('Chaos Monkey Testing', () => {
  test('dashboard survives 30 seconds of chaos', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const monkey = new ChaosMonkey(page, {
      duration: 30000,
      actionsPerSecond: 5,
      seed: 12345, // Fixed seed for reproducibility
    });

    const actionLog = await monkey.unleash();

    // After chaos, page should still be responsive
    await assertPageResponsive();

    const crashes = errorMonitor.getErrorsByType('crash');
    const unhandled = errorMonitor.getErrorsByType('unhandled-exception');

    if (crashes.length > 0 || unhandled.length > 0) {
      console.log('Chaos seed:', actionLog.getSeed());
      console.log('Action replay:\n', actionLog.getReplayScript());
    }

    expect(crashes).toHaveLength(0);
    expect(unhandled).toHaveLength(0);
  });

  test('form page survives typing-focused chaos', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    await page.goto('/profile/edit');

    const monkey = new ChaosMonkey(page, {
      duration: 15000,
      actionsPerSecond: 10,
      enableClicking: true,
      enableTyping: true,
      enableNavigation: false, // Stay on the form page
      enableScrolling: false,
      enableResizing: false,
      enableKeyboard: true,
      seed: 67890,
    });

    await monkey.unleash();

    await assertPageResponsive();

    const crashes = errorMonitor.getErrorsByType('crash');
    expect(crashes).toHaveLength(0);
  });

  test('targeted monkey testing on modal dialogs', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    await page.goto('/dashboard');

    // Open a modal
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const monkey = new ChaosMonkey(page, {
      duration: 10000,
      actionsPerSecond: 8,
      enableNavigation: false,
      enableResizing: false,
      seed: 11111,
    });

    await monkey.unleash();

    await assertPageResponsive();

    // Modal should either still be open or have closed gracefully
    // It should NOT have left orphaned overlays or broken z-index
    const overlays = page.locator('[data-overlay], .modal-backdrop, [role="dialog"]');
    const overlayCount = await overlays.count();
    expect(overlayCount).toBeLessThanOrEqual(1);

    const crashes = errorMonitor.getErrorsByType('crash');
    expect(crashes).toHaveLength(0);
  });
});
```

## Viewport and Resize Spam

Test what happens when the viewport is resized rapidly, simulating users dragging browser windows aggressively.

```typescript
import { test, expect } from '../fixtures/chaos.fixture';

test.describe('Resize and Orientation Spam', () => {
  test('rapid resizing does not break layout', async ({
    page,
    errorMonitor,
    assertPageResponsive,
  }) => {
    await page.goto('/dashboard');

    const sizes = [
      { width: 1920, height: 1080 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
      { width: 320, height: 480 },
      { width: 2560, height: 1440 },
      { width: 500, height: 300 },
    ];

    for (let cycle = 0; cycle < 3; cycle++) {
      for (const size of sizes) {
        await page.setViewportSize(size);
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    await new Promise((r) => setTimeout(r, 1000));

    await assertPageResponsive();

    // Check for overflow issues
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Some overflow may be expected on very small viewports, but check for gross overflow
    if (hasHorizontalOverflow) {
      const overflowAmount = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
      });
      expect(overflowAmount).toBeLessThan(100);
    }

    const crashes = errorMonitor.getErrorsByType('crash');
    expect(crashes).toHaveLength(0);
  });

  test('orientation switching simulation does not break responsive design', async ({
    page,
    assertPageResponsive,
  }) => {
    await page.goto('/dashboard');

    // Simulate rapid orientation switches (portrait <-> landscape)
    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        await page.setViewportSize({ width: 375, height: 812 });
      } else {
        await page.setViewportSize({ width: 812, height: 375 });
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    await assertPageResponsive();
  });
});
```

## Multi-Tab Interaction Testing

Simulate users who open the application in multiple tabs and interact with them simultaneously.

```typescript
import { test, expect } from '../fixtures/chaos.fixture';

test.describe('Multi-Tab Interactions', () => {
  test('opening same page in multiple tabs does not corrupt state', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const pages = await Promise.all(
      Array.from({ length: 5 }, () => context.newPage())
    );

    // Navigate all tabs to the same page
    await Promise.all(pages.map((page) => page.goto('/dashboard')));

    // Perform actions in different tabs
    await pages[0].getByRole('button', { name: /create/i }).click().catch(() => {});
    await pages[1].getByRole('button', { name: /create/i }).click().catch(() => {});

    // All tabs should still be responsive
    for (const page of pages) {
      const isResponsive = await Promise.race([
        page.evaluate(() => true).then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
      ]);
      expect(isResponsive).toBe(true);
    }

    await context.close();
  });

  test('logging out in one tab reflects in other tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/dashboard');
    await page2.goto('/dashboard');

    // Log out in page1
    await page1.getByRole('button', { name: /logout|sign out/i }).click().catch(() => {});

    await new Promise((r) => setTimeout(r, 2000));

    // Page2 should detect the logout (via storage events or polling)
    await page2.reload();

    // Should redirect to login or show logged-out state
    const url = page2.url();
    const isLoggedOut =
      url.includes('login') ||
      url.includes('signin') ||
      (await page2
        .getByRole('button', { name: /login|sign in/i })
        .isVisible()
        .catch(() => false));

    expect(isLoggedOut).toBe(true);

    await context.close();
  });
});
```

## Configuration

### Playwright Configuration for Chaos Testing

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/chaos',
  timeout: 120000, // Long timeout for chaos tests
  retries: 0, // Do not retry chaos tests -- failures should be investigated
  workers: 1, // Sequential to avoid resource contention
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on', // Always capture traces for chaos tests
    screenshot: 'on', // Always capture screenshots
    video: 'on', // Record video for visual debugging
  },
  projects: [
    {
      name: 'chaos-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chaos-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

### Environment Variables

```bash
# .env.test
BASE_URL=http://localhost:3000
CHAOS_SEED=12345
CHAOS_DURATION_MS=30000
CHAOS_ACTIONS_PER_SECOND=5
CHAOS_ENABLE_VIDEO=true
```

## Best Practices

1. **Always use seeded randomness** -- Every chaos test must use a seeded random number generator. When a test fails, the seed allows exact replay of the failure sequence. Log the seed at the start of every test run.

2. **Log every action** -- Use the ActionLogger to record every click, keystroke, and navigation during a chaos run. Without a detailed action log, reproducing failures is nearly impossible.

3. **Start with short durations** -- Begin with 5-10 second chaos runs to establish a baseline. Once the application passes short-duration tests consistently, gradually increase to 30, 60, and 120 seconds.

4. **Monitor memory consumption** -- Aggressive user interactions can cause memory leaks from orphaned event listeners, uncollected DOM nodes, or growing state stores. Add memory usage assertions to long-running chaos tests.

5. **Test both authenticated and unauthenticated states** -- Angry user behavior is not limited to logged-in users. Test chaos scenarios on public pages, login forms, and signup flows.

6. **Isolate chaos tests from functional tests** -- Chaos tests should have their own test suite and configuration. Do not mix them with functional regression tests, as their long durations and non-deterministic nature will slow down the CI pipeline.

7. **Capture video and traces always** -- Unlike functional tests where video is optional, chaos tests should always record video and traces. The visual record is invaluable for understanding what went wrong.

8. **Assert application recovery** -- After a chaos run, verify that the application can recover to a normal state. Navigate to a known page, perform a standard action, and confirm it works correctly.

9. **Test with realistic data** -- An application with 10,000 items in a list behaves differently under chaos than one with 10 items. Use production-like data volumes in chaos tests.

10. **Include mobile viewports** -- Mobile users are more likely to exhibit "angry" behavior due to touch lag, small tap targets, and frustrating mobile interactions. Always include mobile viewports in chaos testing.

11. **Run chaos tests on every major feature branch** -- Chaos tests are most valuable when run against new features before they reach production. Add them to the PR validation pipeline.

12. **Track chaos test results over time** -- Maintain a log of chaos test pass rates, common failure modes, and the longest duration without failure. Use this data to measure application resilience improvements.

## Anti-Patterns to Avoid

1. **Running chaos tests without error monitoring** -- A chaos test that does not check for console errors, unhandled exceptions, or crashes provides no signal. Always attach an ErrorMonitor to every chaos test.

2. **Using truly random seeds** -- If every test run uses a different random seed and you do not log the seed, failures become unreproducible. Always log the seed and provide a mechanism to replay with a specific seed.

3. **Expecting zero visual glitches** -- Rapid interactions will cause momentary visual glitches (flickering, partial renders, brief blank states). The goal is to ensure the application recovers, not that every frame is perfect. Do not assert on transient visual state.

4. **Testing only one page** -- Chaos testing a single page catches only that page's issues. Cross-page navigation chaos reveals router bugs, state management leaks, and context loss that single-page tests miss.

5. **Setting timeouts too short** -- Chaos tests need long timeouts because they perform many actions that each require processing time. A 30-second test with a 10-second timeout will always fail. Set timeouts to at least 4 times the chaos duration.

6. **Not cleaning up between chaos runs** -- If a chaos test corrupts the database or local storage, subsequent tests will fail for unrelated reasons. Always reset application state between chaos test runs.

7. **Mixing chaos tests with assertion-heavy functional tests** -- Chaos tests verify resilience, not correctness. Asserting specific UI states during a chaos run is fragile and misleading. Keep resilience assertions (page is responsive, no crashes) separate from functional assertions (button shows correct text).

## Debugging Tips

1. **Replay with the recorded seed** -- When a chaos test fails, re-run it with the same seed to reproduce the exact sequence of actions. If the failure is intermittent even with the same seed, the bug is timing-dependent.

2. **Use the Playwright trace viewer** -- The trace viewer shows every action, network request, and DOM snapshot. Scrub through the timeline to find the exact moment the application broke.

3. **Watch the video recording** -- The recorded video often reveals the failure cause faster than log analysis. Look for visual indicators like overlapping modals, broken layouts, or flash-of-error-content.

4. **Binary search the chaos duration** -- If a 60-second chaos test fails, try 30 seconds. If that passes, try 45 seconds. This narrows down when during the chaos run the application begins to fail.

5. **Check for event listener leaks** -- After a chaos run, use DevTools Performance tab or `getEventListeners()` to check for accumulated event listeners on DOM elements. Listener leaks are a common cause of post-chaos sluggishness.

6. **Monitor React/framework error boundaries** -- If the application uses React error boundaries (or equivalent), check whether errors were caught but silently swallowed. An error boundary hiding a crash is still a bug.

7. **Inspect the network tab for duplicate requests** -- Rapid clicking on action buttons may trigger duplicate API calls even if the UI appears to handle it correctly. Check the network log for multiple identical requests.

8. **Test in production mode** -- Development mode adds runtime checks, error overlays, and hot reloading that can mask or hide chaos-induced failures. Always run chaos tests against a production build.

9. **Profile CPU usage during chaos** -- If the page becomes unresponsive during chaos, profile CPU usage to identify expensive event handlers, synchronous layouts, or excessive re-renders triggered by rapid interactions.

10. **Check for race conditions in state management** -- Rapid interactions often trigger race conditions in state management libraries. Enable strict mode or concurrent mode warnings in your framework to detect unsafe state updates during chaos runs.
