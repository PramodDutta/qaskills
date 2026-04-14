---
name: Vibe Testing Methodology
description: Natural language test automation methodology where tests are written as plain English instructions, leveraging AI agents to interpret intent, generate executable tests, and maintain test suites without traditional code-based selectors or assertions.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [vibe-testing, natural-language, plain-english, intent-based, codeless-testing, ai-testing, no-code, test-automation, declarative-testing]
testingTypes: [e2e, integration, accessibility, visual]
frameworks: [playwright, cypress, testrigor]
languages: [typescript, javascript]
domains: [web, mobile, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Vibe Testing Methodology Skill

You are an expert in vibe testing, the methodology where tests are expressed as natural language instructions that AI agents interpret and execute. When the user asks you to implement vibe testing workflows, create natural language test specifications, or build intent-based test automation systems, follow these detailed instructions.

## Core Principles

1. **Intent over implementation** -- Tests describe what to verify, not how to verify it. The AI agent determines the optimal selectors, waits, and assertions at runtime.
2. **Natural language as the test specification** -- Tests are written in plain English that non-technical stakeholders can read, write, and review.
3. **Dynamic selector resolution** -- Instead of hardcoded selectors, the AI analyzes the page structure at runtime to find the right elements based on natural language descriptions.
4. **Self-maintaining tests** -- When the UI changes, vibe tests adapt automatically because they match on intent rather than specific DOM structures.
5. **Accessibility-first interaction** -- Vibe testing naturally aligns with accessibility because it interacts with elements the way a user would describe them, using labels and roles.
6. **Gradual formalization** -- Start with loose natural language tests for exploration, then progressively add more specific assertions as the application stabilizes.
7. **Transparent execution** -- Every interpreted step must be logged with the actual selector used, the action taken, and the assertion applied so failures are debuggable.

## Project Structure

```
vibe-tests/
  specs/
    auth/
      login.vibe.md
      registration.vibe.md
      password-reset.vibe.md
    checkout/
      add-to-cart.vibe.md
      payment.vibe.md
      order-confirmation.vibe.md
    dashboard/
      navigation.vibe.md
      settings.vibe.md
  engine/
    interpreter.ts
    action-resolver.ts
    assertion-resolver.ts
    element-finder.ts
    step-executor.ts
  runners/
    vibe-runner.ts
    parallel-runner.ts
    ci-runner.ts
  reporters/
    execution-log.ts
    step-trace.ts
    failure-analyzer.ts
  config/
    vibe-config.ts
    ai-config.ts
  fixtures/
    test-data.ts
    environment.ts
```

## Vibe Test Specification Format

```markdown
<!-- specs/auth/login.vibe.md -->
# Login Flow

## Setup
- Navigate to the login page
- Ensure the page has loaded completely

## Test: Successful login with valid credentials
1. Enter "testuser@example.com" in the email field
2. Enter "SecurePassword123" in the password field
3. Click the login button
4. Verify you are redirected to the dashboard
5. Verify the welcome message contains "testuser"

## Test: Failed login with wrong password
1. Enter "testuser@example.com" in the email field
2. Enter "WrongPassword" in the password field
3. Click the login button
4. Verify an error message appears
5. Verify the error mentions invalid credentials
6. Verify you remain on the login page

## Test: Login form validation
1. Click the login button without filling any fields
2. Verify the email field shows a validation error
3. Enter "not-an-email" in the email field
4. Verify the email field shows an invalid format error
5. Clear the email field
6. Enter "valid@email.com" in the email field
7. Verify the email validation error disappears

## Cleanup
- If logged in, click the logout button
```

## Vibe Test Interpreter

```typescript
// vibe-tests/engine/interpreter.ts
import Anthropic from '@anthropic-ai/sdk';

export interface VibeStep {
  raw: string;
  action: 'navigate' | 'click' | 'fill' | 'select' | 'assert' | 'wait' | 'clear' | 'hover' | 'scroll';
  target?: string;
  value?: string;
  assertion?: {
    type: 'visible' | 'text' | 'url' | 'hidden' | 'enabled' | 'disabled' | 'contains';
    expected?: string;
  };
  confidence: number;
}

export interface VibeTest {
  name: string;
  setup: string[];
  steps: string[];
  cleanup: string[];
}

export class VibeInterpreter {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  parseSpecFile(content: string): VibeTest[] {
    const tests: VibeTest[] = [];
    const sections = content.split(/^## /m).filter(Boolean);

    let setup: string[] = [];
    let cleanup: string[] = [];

    for (const section of sections) {
      const lines = section.trim().split('\n');
      const heading = lines[0].trim();

      if (heading.toLowerCase().startsWith('setup')) {
        setup = this.extractSteps(lines.slice(1));
      } else if (heading.toLowerCase().startsWith('cleanup')) {
        cleanup = this.extractSteps(lines.slice(1));
      } else if (heading.toLowerCase().startsWith('test:')) {
        const testName = heading.replace(/^test:\s*/i, '').trim();
        const steps = this.extractSteps(lines.slice(1));
        tests.push({ name: testName, setup: [...setup], steps, cleanup: [...cleanup] });
      }
    }

    return tests;
  }

  async interpretStep(step: string, pageContext?: string): Promise<VibeStep> {
    const prompt = `Interpret this natural language test step into a structured action:

Step: "${step}"
${pageContext ? `Page context: ${pageContext}` : ''}

Return JSON: {"action": "navigate|click|fill|select|assert|wait|clear|hover|scroll", "target": "description of element", "value": "value if applicable", "assertion": {"type": "visible|text|url|hidden|contains", "expected": "value"}, "confidence": 0-1}`;

    const response = await this.client.messages.create({
      model: 'claude-haiku-35-20241022',
      max_tokens: 256,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return this.fallbackInterpret(step);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return { raw: step, ...parsed };
  }

  private extractSteps(lines: string[]): string[] {
    return lines
      .map((line) => line.replace(/^[\d]+\.\s*/, '').replace(/^-\s*/, '').trim())
      .filter((line) => line.length > 0);
  }

  private fallbackInterpret(step: string): VibeStep {
    const lower = step.toLowerCase();

    if (lower.startsWith('navigate') || lower.startsWith('go to') || lower.startsWith('open')) {
      return { raw: step, action: 'navigate', target: step, confidence: 0.7 };
    }
    if (lower.startsWith('click') || lower.startsWith('press') || lower.startsWith('tap')) {
      return { raw: step, action: 'click', target: step.replace(/^(click|press|tap)\s+(on\s+)?/i, ''), confidence: 0.7 };
    }
    if (lower.startsWith('enter') || lower.startsWith('type') || lower.startsWith('fill')) {
      const match = step.match(/["']([^"']+)["']\s+(?:in|into)\s+(.+)/i);
      return { raw: step, action: 'fill', target: match?.[2] || '', value: match?.[1] || '', confidence: 0.6 };
    }
    if (lower.startsWith('verify') || lower.startsWith('check') || lower.startsWith('ensure') || lower.startsWith('confirm')) {
      return { raw: step, action: 'assert', target: step, assertion: { type: 'visible' }, confidence: 0.6 };
    }
    if (lower.startsWith('wait')) {
      return { raw: step, action: 'wait', target: step, confidence: 0.7 };
    }
    if (lower.startsWith('clear')) {
      return { raw: step, action: 'clear', target: step.replace(/^clear\s+(the\s+)?/i, ''), confidence: 0.7 };
    }

    return { raw: step, action: 'assert', target: step, confidence: 0.3 };
  }
}
```

## Element Finder (AI-Powered)

```typescript
// vibe-tests/engine/element-finder.ts
import { Page, Locator } from '@playwright/test';

export interface FoundElement {
  locator: Locator;
  selector: string;
  confidence: number;
  method: 'role' | 'testid' | 'label' | 'text' | 'placeholder' | 'css';
}

export class ElementFinder {
  async findElement(page: Page, description: string): Promise<FoundElement> {
    const strategies: Array<() => Promise<FoundElement | null>> = [
      () => this.findByRole(page, description),
      () => this.findByTestId(page, description),
      () => this.findByLabel(page, description),
      () => this.findByText(page, description),
      () => this.findByPlaceholder(page, description),
      () => this.findByAccessibilityTree(page, description),
    ];

    for (const strategy of strategies) {
      const result = await strategy();
      if (result && result.confidence > 0.5) {
        return result;
      }
    }

    throw new Error(`Could not find element matching: "${description}"`);
  }

  private async findByRole(page: Page, description: string): Promise<FoundElement | null> {
    const roleMap: Record<string, string> = {
      button: 'button', link: 'link', input: 'textbox', field: 'textbox',
      checkbox: 'checkbox', radio: 'radio', dropdown: 'combobox', select: 'combobox',
      heading: 'heading', tab: 'tab', menu: 'menu', dialog: 'dialog',
      alert: 'alert', navigation: 'navigation', search: 'searchbox',
    };

    for (const [keyword, role] of Object.entries(roleMap)) {
      if (description.toLowerCase().includes(keyword)) {
        const nameMatch = description.match(/["']([^"']+)["']/);
        const name = nameMatch ? nameMatch[1] : undefined;

        const locator = name
          ? page.getByRole(role as any, { name: new RegExp(name, 'i') })
          : page.getByRole(role as any);

        try {
          const count = await locator.count();
          if (count === 1) {
            return { locator, selector: `getByRole('${role}', { name: '${name || ''}' })`, confidence: 0.9, method: 'role' };
          }
        } catch {}
      }
    }

    return null;
  }

  private async findByTestId(page: Page, description: string): Promise<FoundElement | null> {
    const words = description.toLowerCase().split(/\s+/);
    const possibleIds = [
      words.join('-'),
      words.join('_'),
      words.filter((w) => !['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for'].includes(w)).join('-'),
    ];

    for (const id of possibleIds) {
      const locator = page.getByTestId(id);
      try {
        const count = await locator.count();
        if (count === 1) {
          return { locator, selector: `getByTestId('${id}')`, confidence: 0.85, method: 'testid' };
        }
      } catch {}
    }

    return null;
  }

  private async findByLabel(page: Page, description: string): Promise<FoundElement | null> {
    const labelMatch = description.match(/(?:the\s+)?["']?([^"']+?)["']?\s+(?:field|input|box)/i);
    if (labelMatch) {
      const locator = page.getByLabel(new RegExp(labelMatch[1], 'i'));
      try {
        const count = await locator.count();
        if (count === 1) {
          return { locator, selector: `getByLabel('${labelMatch[1]}')`, confidence: 0.8, method: 'label' };
        }
      } catch {}
    }
    return null;
  }

  private async findByText(page: Page, description: string): Promise<FoundElement | null> {
    const textMatch = description.match(/["']([^"']+)["']/);
    if (textMatch) {
      const locator = page.getByText(textMatch[1], { exact: false });
      try {
        const count = await locator.count();
        if (count === 1) {
          return { locator, selector: `getByText('${textMatch[1]}')`, confidence: 0.7, method: 'text' };
        }
      } catch {}
    }
    return null;
  }

  private async findByPlaceholder(page: Page, description: string): Promise<FoundElement | null> {
    const keywords = description.toLowerCase();
    const placeholderGuesses = [
      keywords.includes('email') ? 'email' : null,
      keywords.includes('password') ? 'password' : null,
      keywords.includes('search') ? 'search' : null,
      keywords.includes('name') ? 'name' : null,
    ].filter(Boolean);

    for (const guess of placeholderGuesses) {
      const locator = page.getByPlaceholder(new RegExp(guess!, 'i'));
      try {
        const count = await locator.count();
        if (count === 1) {
          return { locator, selector: `getByPlaceholder('${guess}')`, confidence: 0.65, method: 'placeholder' };
        }
      } catch {}
    }

    return null;
  }

  private async findByAccessibilityTree(page: Page, description: string): Promise<FoundElement | null> {
    const snapshot = await page.accessibility.snapshot();
    if (!snapshot) return null;

    const matches = this.searchTree(snapshot, description.toLowerCase());
    if (matches.length > 0) {
      const bestMatch = matches[0];
      const locator = page.getByRole(bestMatch.role as any, { name: bestMatch.name });
      return {
        locator,
        selector: `getByRole('${bestMatch.role}', { name: '${bestMatch.name}' })`,
        confidence: 0.6,
        method: 'role',
      };
    }

    return null;
  }

  private searchTree(node: any, query: string): any[] {
    const matches: any[] = [];
    if (node.name && node.name.toLowerCase().includes(query)) {
      matches.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        matches.push(...this.searchTree(child, query));
      }
    }
    return matches;
  }
}
```

## Vibe Test Runner

```typescript
// vibe-tests/runners/vibe-runner.ts
import { test, expect, Page } from '@playwright/test';
import { VibeInterpreter, VibeTest, VibeStep } from '../engine/interpreter';
import { ElementFinder } from '../engine/element-finder';
import { readFileSync } from 'fs';

export class VibeTestRunner {
  private interpreter: VibeInterpreter;
  private finder: ElementFinder;
  private executionLog: Array<{ step: string; result: string; selector?: string; duration: number }> = [];

  constructor() {
    this.interpreter = new VibeInterpreter();
    this.finder = new ElementFinder();
  }

  registerTests(specFile: string): void {
    const content = readFileSync(specFile, 'utf-8');
    const tests = this.interpreter.parseSpecFile(content);

    for (const vibeTest of tests) {
      test(vibeTest.name, async ({ page }) => {
        // Execute setup steps
        for (const step of vibeTest.setup) {
          await this.executeStep(page, step);
        }

        // Execute test steps
        for (const step of vibeTest.steps) {
          await this.executeStep(page, step);
        }

        // Execute cleanup steps
        for (const step of vibeTest.cleanup) {
          try {
            await this.executeStep(page, step);
          } catch {
            // Cleanup failures should not fail the test
          }
        }
      });
    }
  }

  private async executeStep(page: Page, step: string): Promise<void> {
    const startTime = Date.now();
    const interpreted = await this.interpreter.interpretStep(step);

    try {
      switch (interpreted.action) {
        case 'navigate':
          await this.executeNavigate(page, interpreted);
          break;
        case 'click':
          await this.executeClick(page, interpreted);
          break;
        case 'fill':
          await this.executeFill(page, interpreted);
          break;
        case 'assert':
          await this.executeAssert(page, interpreted);
          break;
        case 'wait':
          await this.executeWait(page, interpreted);
          break;
        case 'clear':
          await this.executeClear(page, interpreted);
          break;
        case 'hover':
          await this.executeHover(page, interpreted);
          break;
        default:
          throw new Error(`Unknown action: ${interpreted.action}`);
      }

      this.executionLog.push({
        step,
        result: 'passed',
        duration: Date.now() - startTime,
      });
    } catch (error: any) {
      this.executionLog.push({
        step,
        result: `failed: ${error.message}`,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  private async executeNavigate(page: Page, step: VibeStep): Promise<void> {
    const urlMatch = step.target?.match(/(https?:\/\/[^\s]+|\/[^\s]*)/);
    if (urlMatch) {
      await page.goto(urlMatch[1]);
    } else if (step.target?.toLowerCase().includes('login')) {
      await page.goto('/login');
    } else if (step.target?.toLowerCase().includes('dashboard')) {
      await page.goto('/dashboard');
    } else {
      await page.goto('/');
    }
    await page.waitForLoadState('networkidle');
  }

  private async executeClick(page: Page, step: VibeStep): Promise<void> {
    const element = await this.finder.findElement(page, step.target || step.raw);
    await element.locator.click();
  }

  private async executeFill(page: Page, step: VibeStep): Promise<void> {
    const element = await this.finder.findElement(page, step.target || step.raw);
    await element.locator.fill(step.value || '');
  }

  private async executeAssert(page: Page, step: VibeStep): Promise<void> {
    if (step.assertion?.type === 'url') {
      await expect(page).toHaveURL(new RegExp(step.assertion.expected || ''));
    } else if (step.assertion?.type === 'visible' && step.target) {
      const element = await this.finder.findElement(page, step.target);
      await expect(element.locator).toBeVisible();
    } else if (step.assertion?.type === 'hidden' && step.target) {
      const element = await this.finder.findElement(page, step.target);
      await expect(element.locator).toBeHidden();
    } else if (step.assertion?.type === 'contains' && step.target) {
      const element = await this.finder.findElement(page, step.target);
      await expect(element.locator).toContainText(step.assertion.expected || '');
    } else if (step.assertion?.type === 'text' && step.target) {
      const element = await this.finder.findElement(page, step.target);
      await expect(element.locator).toHaveText(step.assertion.expected || '');
    }
  }

  private async executeWait(page: Page, step: VibeStep): Promise<void> {
    const timeMatch = step.raw.match(/(\d+)\s*(seconds?|s|ms|milliseconds?)/i);
    if (timeMatch) {
      const ms = timeMatch[2].startsWith('s') ? parseInt(timeMatch[1]) * 1000 : parseInt(timeMatch[1]);
      await page.waitForTimeout(ms);
    } else {
      await page.waitForLoadState('networkidle');
    }
  }

  private async executeClear(page: Page, step: VibeStep): Promise<void> {
    const element = await this.finder.findElement(page, step.target || step.raw);
    await element.locator.clear();
  }

  private async executeHover(page: Page, step: VibeStep): Promise<void> {
    const element = await this.finder.findElement(page, step.target || step.raw);
    await element.locator.hover();
  }

  getExecutionLog() {
    return [...this.executionLog];
  }
}
```

## Best Practices

1. **Write vibe tests from the user's perspective** -- Use language like "click the login button" not "click #btn-login". This makes tests readable by product managers and designers.
2. **Start with the most critical user journeys** -- Vibe testing excels at high-level flow testing. Save detailed edge-case testing for coded tests.
3. **Use quoted strings for exact values** -- Write 'Enter "test@example.com" in the email field' so the interpreter clearly distinguishes values from descriptions.
4. **Log every interpreted step** -- Transparent execution logging is essential for debugging. Always record what selector was used and what action was taken.
5. **Set confidence thresholds for element finding** -- Require at least 0.6 confidence before interacting with an element. Below that, flag for human review.
6. **Combine vibe tests with traditional assertions** -- Use vibe testing for navigation and interaction, then add specific coded assertions for critical business logic.
7. **Keep spec files focused** -- Each vibe spec file should cover one feature or user journey. Avoid mixing unrelated tests in a single file.
8. **Version your spec files** -- Store vibe test specs in version control alongside application code so tests evolve with the product.
9. **Run vibe tests against staging first** -- Natural language interpretation can produce unexpected results. Validate against staging before running in CI.
10. **Provide page context to the interpreter** -- When possible, pass the current page's accessibility snapshot to help the interpreter make better decisions.

## Anti-Patterns

1. **Writing vibe tests with implementation details** -- "Click the div with class btn-primary" defeats the purpose. Write "Click the submit button" instead.
2. **Relying solely on vibe tests for critical paths** -- Vibe tests are great for exploration and broad coverage but should be backed by precise coded tests for critical functionality.
3. **Not reviewing execution logs** -- If you do not review how vibe tests were interpreted, you may miss cases where the wrong element was selected.
4. **Using vibe testing for performance assertions** -- Natural language is not precise enough for performance thresholds. Use coded tests for timing-sensitive checks.
5. **Writing ambiguous step descriptions** -- "Check the thing" is too vague. "Verify the success message is visible" gives the interpreter clear intent.
6. **Skipping setup and cleanup sections** -- Vibe tests need state management just like coded tests. Always define setup and cleanup steps.
7. **Not handling element-not-found gracefully** -- When the finder cannot locate an element, provide helpful error messages with the accessibility snapshot for debugging.
8. **Using vibe tests for data-driven testing** -- Parameterized tests with many data variations are better handled by coded tests with test.each patterns.
9. **Ignoring confidence scores** -- Low-confidence matches often indicate ambiguous descriptions or missing elements. Address the root cause instead of lowering thresholds.
10. **Not combining with visual testing** -- Vibe tests verify behavior but not appearance. Add visual regression testing for layout and style verification.
