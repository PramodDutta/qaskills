---
name: Playwright Agents
description: Testing patterns for Playwright AI-powered agents including the Planner, Generator, and Healer architecture for self-healing test automation, intelligent test generation, and adaptive test execution strategies.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, ai-agents, planner, generator, healer, self-healing, test-generation, adaptive-testing, browser-automation, codegen]
testingTypes: [e2e, integration, visual, accessibility]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web, frontend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Playwright Agents Skill

You are an expert in Playwright AI-powered agent architecture. When the user asks you to implement Planner, Generator, or Healer agents for test automation, build self-healing test infrastructure, or create adaptive testing pipelines with Playwright, follow these detailed instructions.

## Core Principles

1. **Three-agent architecture** -- Structure test automation around three specialized agents: Planner (decides what to test), Generator (creates test code), and Healer (fixes broken tests). Each agent has a distinct responsibility and interface.
2. **Selector resilience hierarchy** -- Use a prioritized selector strategy: test IDs > ARIA roles > text content > CSS selectors. Self-healing agents should try alternatives in this order when primary selectors fail.
3. **Snapshot-driven healing** -- When tests fail, capture accessibility tree snapshots, DOM state, and screenshots. Feed these to the Healer agent to produce corrected selectors and actions.
4. **Incremental generation** -- Generate tests incrementally from user stories or natural language descriptions. Validate each generated step against the running application before generating the next.
5. **Execution feedback loops** -- Every test run produces structured feedback that informs the next generation or healing cycle. Use JSON-formatted execution reports, not raw console output.
6. **Human-in-the-loop checkpoints** -- Allow developers to review and approve generated or healed tests before they become part of the official suite. Never auto-commit generated tests without review.
7. **Cost-aware agent orchestration** -- Track LLM token usage for each agent invocation. Set budgets per test generation and healing cycle to prevent runaway API costs.

## Project Structure

```
tests/
  agents/
    planner/
      planner-agent.ts
      story-parser.ts
      test-plan-schema.ts
    generator/
      generator-agent.ts
      code-templates.ts
      step-validator.ts
    healer/
      healer-agent.ts
      selector-resolver.ts
      snapshot-analyzer.ts
    orchestrator/
      agent-orchestrator.ts
      feedback-loop.ts
      cost-tracker.ts
  generated/
    specs/
      .gitkeep
    approved/
      .gitkeep
  fixtures/
    page-objects/
      login.page.ts
      dashboard.page.ts
    snapshots/
      .gitkeep
  config/
    agent-config.ts
    selector-strategy.ts
  e2e/
    smoke.spec.ts
    critical-paths.spec.ts
  playwright.config.ts
```

## Planner Agent

```typescript
// tests/agents/planner/planner-agent.ts
import Anthropic from '@anthropic-ai/sdk';

export interface TestPlan {
  id: string;
  title: string;
  userStory: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: TestStep[];
  preconditions: string[];
  expectedOutcome: string;
  estimatedComplexity: number;
}

export interface TestStep {
  order: number;
  action: 'navigate' | 'click' | 'fill' | 'select' | 'assert' | 'wait' | 'hover' | 'upload';
  target: string;
  value?: string;
  assertion?: {
    type: 'visible' | 'text' | 'url' | 'count' | 'attribute';
    expected: string;
  };
  description: string;
}

export class PlannerAgent {
  private client: Anthropic;
  private model: string;

  constructor(model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic();
    this.model = model;
  }

  async createTestPlan(userStory: string, appContext?: string): Promise<TestPlan> {
    const systemPrompt = `You are a test planning agent for Playwright browser automation.
Given a user story, create a detailed test plan with concrete steps.
Each step must map to a Playwright action (navigate, click, fill, select, assert, wait).
Use descriptive selectors based on ARIA roles and test IDs.
Return the plan as a JSON object matching the TestPlan schema.`;

    const prompt = `User Story: ${userStory}
${appContext ? `App Context: ${appContext}` : ''}

Create a test plan. Return ONLY valid JSON matching this schema:
{
  "id": "string",
  "title": "string", 
  "userStory": "string",
  "priority": "critical|high|medium|low",
  "steps": [{"order": number, "action": "string", "target": "string", "value?": "string", "description": "string"}],
  "preconditions": ["string"],
  "expectedOutcome": "string",
  "estimatedComplexity": number
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Planner failed to generate valid JSON');

    return JSON.parse(jsonMatch[0]) as TestPlan;
  }

  async prioritizeTests(plans: TestPlan[], riskAreas: string[]): Promise<TestPlan[]> {
    const prompt = `Given these test plans and known risk areas, reorder by priority.
Risk areas: ${riskAreas.join(', ')}
Plans: ${JSON.stringify(plans.map((p) => ({ id: p.id, title: p.title, priority: p.priority })))}
Return a JSON array of plan IDs in priority order.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const ids: string[] = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');

    return ids
      .map((id) => plans.find((p) => p.id === id))
      .filter(Boolean) as TestPlan[];
  }
}
```

## Generator Agent

```typescript
// tests/agents/generator/generator-agent.ts
import Anthropic from '@anthropic-ai/sdk';
import { TestPlan, TestStep } from '../planner/planner-agent';

export interface GeneratedTest {
  planId: string;
  code: string;
  imports: string[];
  fixtures: string[];
  pageObjects: string[];
}

export class GeneratorAgent {
  private client: Anthropic;
  private model: string;

  constructor(model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic();
    this.model = model;
  }

  async generateTest(plan: TestPlan, existingPageObjects?: string[]): Promise<GeneratedTest> {
    const systemPrompt = `You are a Playwright test code generator agent.
Generate TypeScript Playwright tests following these rules:
1. Use page object model pattern
2. Prefer getByRole, getByTestId, getByLabel over CSS selectors
3. Use web-first assertions (expect(locator).toBeVisible())
4. Include proper setup and teardown
5. Add meaningful test descriptions
6. Handle loading states with appropriate waits
7. Generate data-testid selectors when no semantic selector exists`;

    const prompt = `Generate a Playwright test for this plan:
${JSON.stringify(plan, null, 2)}

${existingPageObjects?.length ? `Available page objects: ${existingPageObjects.join(', ')}` : 'No existing page objects.'}

Return ONLY the complete TypeScript test file content. Use @playwright/test imports.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const codeMatch = text.match(/```typescript\n([\s\S]*?)```/) || text.match(/```ts\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : text;

    return {
      planId: plan.id,
      code: code.trim(),
      imports: this.extractImports(code),
      fixtures: this.extractFixtures(code),
      pageObjects: this.extractPageObjects(code),
    };
  }

  async generatePageObject(
    pageName: string,
    pageUrl: string,
    accessibilitySnapshot: string
  ): Promise<string> {
    const prompt = `Generate a Playwright Page Object for "${pageName}" at URL "${pageUrl}".
    
Accessibility tree snapshot:
${accessibilitySnapshot}

Generate a TypeScript class with:
1. Locator properties for all interactive elements
2. Action methods for common user flows
3. Assertion methods for page state verification
4. Use getByRole and getByTestId selectors
5. Export the class as default

Return ONLY TypeScript code.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const codeMatch = text.match(/```typescript\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : text.trim();
  }

  private extractImports(code: string): string[] {
    const importRegex = /import\s+.*from\s+['"](.+?)['"]/g;
    const imports: string[] = [];
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  private extractFixtures(code: string): string[] {
    const fixtureRegex = /test\.extend<\{([\s\S]*?)\}>/;
    const match = code.match(fixtureRegex);
    if (!match) return [];
    return match[1].split(';').map((f) => f.trim()).filter(Boolean);
  }

  private extractPageObjects(code: string): string[] {
    const poRegex = /new\s+(\w+Page)\(/g;
    const pageObjects: string[] = [];
    let match;
    while ((match = poRegex.exec(code)) !== null) {
      pageObjects.push(match[1]);
    }
    return [...new Set(pageObjects)];
  }
}
```

## Healer Agent

```typescript
// tests/agents/healer/healer-agent.ts
import Anthropic from '@anthropic-ai/sdk';

export interface HealingContext {
  testName: string;
  failedStep: string;
  errorMessage: string;
  failedSelector: string;
  accessibilitySnapshot: string;
  screenshot?: string;
  previousSelectors?: string[];
  domDiff?: string;
}

export interface HealingResult {
  healed: boolean;
  newSelector: string;
  confidence: number;
  reasoning: string;
  alternativeSelectors: string[];
  suggestedAction?: string;
}

export class HealerAgent {
  private client: Anthropic;
  private model: string;
  private healingHistory: Map<string, string[]> = new Map();

  constructor(model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic();
    this.model = model;
  }

  async heal(context: HealingContext): Promise<HealingResult> {
    const systemPrompt = `You are a self-healing test automation agent for Playwright.
When a test selector breaks, analyze the accessibility snapshot and error to find the correct new selector.
Prefer selectors in this order:
1. getByTestId('...') - most stable
2. getByRole('...', { name: '...' }) - semantic and resilient
3. getByLabel('...') - for form elements
4. getByText('...') - for content-based selection
5. CSS selectors - last resort

Provide multiple alternatives ranked by confidence.`;

    const prompt = `A Playwright test failed. Help me fix the selector.

Test: ${context.testName}
Failed Step: ${context.failedStep}
Error: ${context.errorMessage}
Failed Selector: ${context.failedSelector}
${context.previousSelectors ? `Previous selectors that also failed: ${context.previousSelectors.join(', ')}` : ''}

Current accessibility snapshot:
${context.accessibilitySnapshot}

${context.domDiff ? `DOM changes since last success:\n${context.domDiff}` : ''}

Return a JSON object:
{
  "healed": boolean,
  "newSelector": "string",
  "confidence": 0-1,
  "reasoning": "string",
  "alternativeSelectors": ["string"],
  "suggestedAction": "optional string if the action type should change"
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        healed: false,
        newSelector: context.failedSelector,
        confidence: 0,
        reasoning: 'Failed to parse healer response',
        alternativeSelectors: [],
      };
    }

    const result = JSON.parse(jsonMatch[0]) as HealingResult;

    // Track healing history for this test
    const key = `${context.testName}:${context.failedStep}`;
    const history = this.healingHistory.get(key) || [];
    history.push(result.newSelector);
    this.healingHistory.set(key, history);

    return result;
  }

  async batchHeal(contexts: HealingContext[]): Promise<HealingResult[]> {
    return Promise.all(contexts.map((ctx) => this.heal(ctx)));
  }

  getHealingHistory(testName: string): Map<string, string[]> {
    const filtered = new Map<string, string[]>();
    for (const [key, value] of this.healingHistory) {
      if (key.startsWith(testName)) {
        filtered.set(key, value);
      }
    }
    return filtered;
  }
}
```

## Agent Orchestrator

```typescript
// tests/agents/orchestrator/agent-orchestrator.ts
import { PlannerAgent, TestPlan } from '../planner/planner-agent';
import { GeneratorAgent, GeneratedTest } from '../generator/generator-agent';
import { HealerAgent, HealingContext, HealingResult } from '../healer/healer-agent';

export interface OrchestratorConfig {
  maxHealingAttempts: number;
  autoApprove: boolean;
  costBudgetPerRun: number;
  parallelTests: number;
}

export interface OrchestratorResult {
  plans: TestPlan[];
  generatedTests: GeneratedTest[];
  healingResults: HealingResult[];
  totalCost: number;
  successRate: number;
}

export class AgentOrchestrator {
  private planner: PlannerAgent;
  private generator: GeneratorAgent;
  private healer: HealerAgent;
  private config: OrchestratorConfig;
  private totalTokens = 0;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.planner = new PlannerAgent();
    this.generator = new GeneratorAgent();
    this.healer = new HealerAgent();
    this.config = {
      maxHealingAttempts: 3,
      autoApprove: false,
      costBudgetPerRun: 10.0,
      parallelTests: 3,
      ...config,
    };
  }

  async generateFromStories(userStories: string[]): Promise<OrchestratorResult> {
    const plans: TestPlan[] = [];
    const generatedTests: GeneratedTest[] = [];
    const healingResults: HealingResult[] = [];

    // Phase 1: Planning
    for (const story of userStories) {
      const plan = await this.planner.createTestPlan(story);
      plans.push(plan);
    }

    // Phase 2: Generation
    for (const plan of plans) {
      const test = await this.generator.generateTest(plan);
      generatedTests.push(test);
    }

    return {
      plans,
      generatedTests,
      healingResults,
      totalCost: this.estimateCost(),
      successRate: generatedTests.length / plans.length,
    };
  }

  async healFailedTests(failures: HealingContext[]): Promise<HealingResult[]> {
    const results: HealingResult[] = [];

    for (const failure of failures) {
      let healed = false;
      let attempts = 0;
      let currentContext = failure;

      while (!healed && attempts < this.config.maxHealingAttempts) {
        const result = await this.healer.heal(currentContext);
        results.push(result);

        if (result.healed && result.confidence > 0.7) {
          healed = true;
        } else {
          attempts++;
          currentContext = {
            ...failure,
            previousSelectors: [
              ...(failure.previousSelectors || []),
              result.newSelector,
            ],
          };
        }
      }
    }

    return results;
  }

  private estimateCost(): number {
    const costPerToken = 0.000003;
    return this.totalTokens * costPerToken;
  }
}
```

## Self-Healing Test Runner

```typescript
// tests/agents/healer/self-healing-runner.ts
import { test as base, expect, Page } from '@playwright/test';
import { HealerAgent, HealingContext } from './healer-agent';

const healer = new HealerAgent();

export async function selfHealingClick(
  page: Page,
  selector: string,
  testName: string,
  stepDescription: string
): Promise<void> {
  try {
    await page.locator(selector).click({ timeout: 5000 });
  } catch (error: any) {
    console.log(`Selector failed: ${selector}. Attempting self-healing...`);

    const snapshot = await page.accessibility.snapshot();
    const snapshotStr = JSON.stringify(snapshot, null, 2);

    const context: HealingContext = {
      testName,
      failedStep: stepDescription,
      errorMessage: error.message,
      failedSelector: selector,
      accessibilitySnapshot: snapshotStr,
    };

    const result = await healer.heal(context);

    if (result.healed && result.confidence > 0.6) {
      console.log(`Healed: ${selector} -> ${result.newSelector} (confidence: ${result.confidence})`);
      await page.locator(result.newSelector).click({ timeout: 5000 });
    } else {
      throw new Error(
        `Self-healing failed for ${selector}. Best guess: ${result.newSelector} (confidence: ${result.confidence}). Reason: ${result.reasoning}`
      );
    }
  }
}

export async function selfHealingFill(
  page: Page,
  selector: string,
  value: string,
  testName: string,
  stepDescription: string
): Promise<void> {
  try {
    await page.locator(selector).fill(value, { timeout: 5000 });
  } catch (error: any) {
    const snapshot = await page.accessibility.snapshot();
    const context: HealingContext = {
      testName,
      failedStep: stepDescription,
      errorMessage: error.message,
      failedSelector: selector,
      accessibilitySnapshot: JSON.stringify(snapshot, null, 2),
    };

    const result = await healer.heal(context);
    if (result.healed) {
      await page.locator(result.newSelector).fill(value, { timeout: 5000 });
    } else {
      throw error;
    }
  }
}

export async function selfHealingAssert(
  page: Page,
  selector: string,
  assertion: 'visible' | 'hidden' | 'enabled' | 'disabled',
  testName: string
): Promise<void> {
  try {
    const locator = page.locator(selector);
    switch (assertion) {
      case 'visible':
        await expect(locator).toBeVisible({ timeout: 5000 });
        break;
      case 'hidden':
        await expect(locator).toBeHidden({ timeout: 5000 });
        break;
      case 'enabled':
        await expect(locator).toBeEnabled({ timeout: 5000 });
        break;
      case 'disabled':
        await expect(locator).toBeDisabled({ timeout: 5000 });
        break;
    }
  } catch (error: any) {
    const snapshot = await page.accessibility.snapshot();
    const context: HealingContext = {
      testName,
      failedStep: `Assert ${assertion} on ${selector}`,
      errorMessage: error.message,
      failedSelector: selector,
      accessibilitySnapshot: JSON.stringify(snapshot, null, 2),
    };

    const result = await healer.heal(context);
    if (result.healed) {
      const locator = page.locator(result.newSelector);
      switch (assertion) {
        case 'visible':
          await expect(locator).toBeVisible({ timeout: 5000 });
          break;
        case 'hidden':
          await expect(locator).toBeHidden({ timeout: 5000 });
          break;
        case 'enabled':
          await expect(locator).toBeEnabled({ timeout: 5000 });
          break;
        case 'disabled':
          await expect(locator).toBeDisabled({ timeout: 5000 });
          break;
      }
    } else {
      throw error;
    }
  }
}
```

## Example: Generated E2E Test

```typescript
// tests/e2e/login-flow.spec.ts
import { test, expect } from '@playwright/test';
import { selfHealingClick, selfHealingFill } from '../agents/healer/self-healing-runner';

test.describe('Login Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await selfHealingFill(
      page,
      'input[name="email"]',
      'test@example.com',
      'login-flow',
      'Fill email input'
    );

    await selfHealingFill(
      page,
      'input[name="password"]',
      'secure-password-123',
      'login-flow',
      'Fill password input'
    );

    await selfHealingClick(
      page,
      'button[type="submit"]',
      'login-flow',
      'Click login button'
    );

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await selfHealingFill(page, 'input[name="email"]', 'wrong@email.com', 'login-error', 'Fill wrong email');
    await selfHealingFill(page, 'input[name="password"]', 'wrong-pass', 'login-error', 'Fill wrong password');
    await selfHealingClick(page, 'button[type="submit"]', 'login-error', 'Submit form');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/invalid/i);
  });
});
```

## Playwright Configuration for Agent Testing

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Cost Tracking

```typescript
// tests/agents/orchestrator/cost-tracker.ts
export interface CostEntry {
  agent: 'planner' | 'generator' | 'healer';
  operation: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  timestamp: string;
}

export class CostTracker {
  private entries: CostEntry[] = [];
  private readonly PRICING: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-20250514': { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
    'claude-haiku-35-20241022': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
  };

  track(entry: CostEntry): void {
    this.entries.push(entry);
  }

  getTotalCost(): number {
    return this.entries.reduce((total, entry) => {
      const pricing = this.PRICING[entry.model] || { input: 0.003, output: 0.015 };
      return total + (entry.inputTokens * pricing.input) + (entry.outputTokens * pricing.output);
    }, 0);
  }

  getCostByAgent(): Record<string, number> {
    const costs: Record<string, number> = {};
    for (const entry of this.entries) {
      const pricing = this.PRICING[entry.model] || { input: 0.003, output: 0.015 };
      const cost = (entry.inputTokens * pricing.input) + (entry.outputTokens * pricing.output);
      costs[entry.agent] = (costs[entry.agent] || 0) + cost;
    }
    return costs;
  }

  isWithinBudget(budget: number): boolean {
    return this.getTotalCost() <= budget;
  }

  getReport(): string {
    const total = this.getTotalCost();
    const byAgent = this.getCostByAgent();
    return [
      `Total cost: $${total.toFixed(4)}`,
      `Entries: ${this.entries.length}`,
      ...Object.entries(byAgent).map(([agent, cost]) => `  ${agent}: $${cost.toFixed(4)}`),
    ].join('\n');
  }
}
```

## Best Practices

1. **Start with the Planner, validate with the Generator** -- Always create a test plan before generating code. Plans catch missing preconditions and ambiguous requirements before code generation wastes tokens.
2. **Use accessibility snapshots for healing, not screenshots** -- Accessibility trees are structured and machine-readable. Screenshots require vision models and are slower and less reliable for selector resolution.
3. **Set confidence thresholds for auto-healing** -- Only auto-apply healed selectors when confidence exceeds 0.8. Below that threshold, flag for human review.
4. **Version generated tests separately from handwritten tests** -- Keep generated tests in a separate directory with clear naming so developers know which tests are agent-maintained.
5. **Run healing in dry-run mode first** -- Before applying healed selectors to the test suite, run the healed version in a sandboxed environment to verify it actually passes.
6. **Limit healing attempts per test** -- Set a maximum of 3 healing attempts per failing test. If healing fails after 3 tries, the test needs manual intervention.
7. **Track selector drift metrics** -- Monitor how often selectors need healing. High heal rates indicate unstable UI or poor initial selector choices.
8. **Use test IDs as the primary selector strategy** -- Invest in adding data-testid attributes to the application. They survive UI refactors and are the most reliable selector type.
9. **Generate page objects alongside tests** -- When generating tests for a new page, also generate the page object model. This promotes reuse and reduces duplication.
10. **Review agent-generated code with the same rigor as human code** -- Generated tests can contain anti-patterns, hardcoded values, and fragile assertions. Always review before merging.

## Anti-Patterns

1. **Auto-committing generated tests without review** -- Generated code can contain hardcoded secrets, flaky assertions, or incorrect business logic. Always review before committing.
2. **Using screenshots for healing instead of accessibility trees** -- Screenshots are expensive to process, slower, and less accurate than structured accessibility data.
3. **Letting the healer run indefinitely** -- Without attempt limits, the healer can enter infinite loops and burn through API budgets.
4. **Generating tests without a plan** -- Skipping the planning phase produces unfocused tests that miss critical paths and edge cases.
5. **Healing selectors without understanding why they broke** -- A healed selector treats the symptom, not the cause. Track why selectors break to improve initial selector quality.
6. **Using CSS selectors as the primary strategy** -- CSS selectors are brittle against UI changes. Prefer ARIA roles and test IDs.
7. **Running all agents sequentially when parallel execution is possible** -- Independent healing operations can run in parallel. Sequential execution wastes time.
8. **Not tracking agent costs** -- Without cost tracking, a single test generation session can cost more than expected. Always monitor token usage.
9. **Trusting low-confidence healing results** -- A healed selector with 0.3 confidence is likely wrong. Set minimum confidence thresholds.
10. **Generating tests for unstable UI during active development** -- Wait for UI components to stabilize before generating tests. Generating against rapidly changing UIs wastes resources on constant healing.
