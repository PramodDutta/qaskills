---
name: AI Test Generation Patterns
description: Systematic patterns for prompting AI coding agents to generate high-quality tests including prompt engineering for test creation, coverage-driven generation, mutation-aware testing, and review checklists for AI-generated test code.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [ai-testing, test-generation, prompt-engineering, coverage-driven, mutation-testing, code-review, automated-testing, llm-testing, ai-code-generation]
testingTypes: [unit, integration, e2e, api]
frameworks: [vitest, jest, playwright, pytest, cypress]
languages: [typescript, javascript, python]
domains: [web, backend, api, mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# AI Test Generation Patterns Skill

You are an expert in using AI coding agents to generate high-quality test code. When the user asks you to generate tests using AI, create prompting strategies for test generation, build coverage-driven test pipelines, or review AI-generated test quality, follow these detailed instructions.

## Core Principles

1. **Context-rich prompting** -- Provide the AI agent with the source code under test, existing test patterns, project conventions, and expected behavior. More context produces better tests.
2. **Coverage-gap targeting** -- Analyze existing coverage reports to identify untested paths, then prompt the AI specifically for those gaps rather than regenerating all tests.
3. **Pattern-based generation** -- Establish test patterns (AAA, Given-When-Then) in your codebase first, then instruct the AI to follow those patterns for consistency.
4. **Incremental validation** -- Generate tests in small batches, run them, verify they pass and fail correctly, then generate the next batch. Never generate an entire suite without validation.
5. **Mutation-aware testing** -- Use mutation testing results to identify weak test assertions and prompt the AI to strengthen them with more specific checks.
6. **Human review gates** -- Every AI-generated test must pass human review. AI excels at generating structure but can miss business logic nuances.
7. **Prompt versioning** -- Version your generation prompts alongside your code. When test patterns change, update prompts accordingly.

## Project Structure

```
test-generation/
  prompts/
    unit-test-prompt.md
    integration-test-prompt.md
    e2e-test-prompt.md
    api-test-prompt.md
    edge-case-prompt.md
  templates/
    vitest-unit.template.ts
    playwright-e2e.template.ts
    api-test.template.ts
  analyzers/
    coverage-analyzer.ts
    mutation-analyzer.ts
    complexity-analyzer.ts
  generators/
    prompt-builder.ts
    batch-generator.ts
    test-validator.ts
  review/
    quality-checker.ts
    anti-pattern-detector.ts
    assertion-strength-analyzer.ts
  config/
    generation-config.ts
    model-config.ts
```

## Prompt Builder for Test Generation

```typescript
// test-generation/generators/prompt-builder.ts
export interface PromptContext {
  sourceCode: string;
  sourceFile: string;
  existingTests?: string;
  coverageReport?: string;
  testPatterns?: string;
  projectConventions?: string;
  focusAreas?: string[];
}

export interface GenerationPrompt {
  system: string;
  user: string;
  expectedFormat: string;
}

export class TestPromptBuilder {
  buildUnitTestPrompt(context: PromptContext): GenerationPrompt {
    const system = `You are a senior test engineer generating unit tests.
Follow these rules strictly:
1. Use the Arrange-Act-Assert (AAA) pattern for every test
2. Name tests using the pattern: "should [expected behavior] when [condition]"
3. Test one behavior per test function
4. Mock all external dependencies
5. Include edge cases: null, undefined, empty strings, boundary values
6. Include error cases: invalid inputs, thrown exceptions
7. Use TypeScript strict types for all test code
8. Do NOT use any as a type
9. Generate descriptive assertion messages
10. Group related tests in describe blocks`;

    const user = this.buildUserPrompt(context, 'unit');

    return {
      system,
      user,
      expectedFormat: 'typescript',
    };
  }

  buildIntegrationTestPrompt(context: PromptContext): GenerationPrompt {
    const system = `You are a senior test engineer generating integration tests.
Follow these rules strictly:
1. Test the interaction between two or more components
2. Use real implementations for the components under test
3. Mock only external services (APIs, databases, file systems)
4. Set up realistic test data that represents production scenarios
5. Test both success and failure paths for each integration point
6. Verify side effects (database writes, cache updates, event emissions)
7. Clean up test data in afterEach/afterAll hooks
8. Test timeout and retry behavior for network calls
9. Use factories or builders for complex test data
10. Assert on the complete response shape, not just one field`;

    const user = this.buildUserPrompt(context, 'integration');

    return {
      system,
      user,
      expectedFormat: 'typescript',
    };
  }

  buildE2ETestPrompt(context: PromptContext): GenerationPrompt {
    const system = `You are a senior test engineer generating Playwright E2E tests.
Follow these rules strictly:
1. Use Page Object Model pattern
2. Prefer getByRole, getByTestId, getByLabel over CSS selectors
3. Use web-first assertions: expect(locator).toBeVisible()
4. Never use page.waitForTimeout() - use proper wait conditions
5. Handle loading states explicitly
6. Test the complete user journey, not individual UI elements
7. Include accessibility assertions where relevant
8. Clean up test state (logout, clear data) in afterEach
9. Capture screenshots on failure for debugging
10. Test on at least desktop and mobile viewports`;

    const user = this.buildUserPrompt(context, 'e2e');

    return {
      system,
      user,
      expectedFormat: 'typescript',
    };
  }

  private buildUserPrompt(context: PromptContext, testType: string): string {
    let prompt = `Generate ${testType} tests for the following code:\n\n`;
    prompt += `### Source File: ${context.sourceFile}\n`;
    prompt += `\`\`\`typescript\n${context.sourceCode}\n\`\`\`\n\n`;

    if (context.existingTests) {
      prompt += `### Existing Tests (follow this pattern):\n`;
      prompt += `\`\`\`typescript\n${context.existingTests}\n\`\`\`\n\n`;
    }

    if (context.coverageReport) {
      prompt += `### Coverage Gaps (focus on these):\n${context.coverageReport}\n\n`;
    }

    if (context.projectConventions) {
      prompt += `### Project Conventions:\n${context.projectConventions}\n\n`;
    }

    if (context.focusAreas?.length) {
      prompt += `### Focus Areas:\n`;
      for (const area of context.focusAreas) {
        prompt += `- ${area}\n`;
      }
      prompt += '\n';
    }

    prompt += `Generate a complete test file. Include all imports. Do not skip any test cases.`;

    return prompt;
  }
}
```

## Coverage-Driven Generation

```typescript
// test-generation/analyzers/coverage-analyzer.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CoverageGap {
  file: string;
  uncoveredLines: number[];
  uncoveredBranches: Array<{ line: number; branch: string }>;
  uncoveredFunctions: string[];
  currentCoverage: number;
  targetCoverage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class CoverageAnalyzer {
  analyzeCoverageReport(reportPath: string): CoverageGap[] {
    if (!existsSync(reportPath)) {
      throw new Error(`Coverage report not found: ${reportPath}`);
    }

    const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
    const gaps: CoverageGap[] = [];

    for (const [file, data] of Object.entries(report) as [string, any][]) {
      const uncoveredLines = this.findUncoveredLines(data.s);
      const uncoveredBranches = this.findUncoveredBranches(data.b, data.branchMap);
      const uncoveredFunctions = this.findUncoveredFunctions(data.f, data.fnMap);

      if (uncoveredLines.length > 0 || uncoveredBranches.length > 0 || uncoveredFunctions.length > 0) {
        const totalStatements = Object.keys(data.s).length;
        const coveredStatements = Object.values(data.s as Record<string, number>).filter((v) => v > 0).length;
        const currentCoverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;

        gaps.push({
          file,
          uncoveredLines,
          uncoveredBranches,
          uncoveredFunctions,
          currentCoverage: Math.round(currentCoverage),
          targetCoverage: 80,
          priority: this.calculatePriority(file, currentCoverage, uncoveredFunctions),
        });
      }
    }

    return gaps.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  buildCoveragePrompt(gap: CoverageGap): string {
    let prompt = `The following areas in ${gap.file} need test coverage:\n\n`;

    if (gap.uncoveredFunctions.length > 0) {
      prompt += `**Uncovered functions:**\n`;
      for (const fn of gap.uncoveredFunctions) {
        prompt += `- ${fn}\n`;
      }
      prompt += '\n';
    }

    if (gap.uncoveredBranches.length > 0) {
      prompt += `**Uncovered branches:**\n`;
      for (const branch of gap.uncoveredBranches) {
        prompt += `- Line ${branch.line}: ${branch.branch}\n`;
      }
      prompt += '\n';
    }

    if (gap.uncoveredLines.length > 0) {
      prompt += `**Uncovered lines:** ${gap.uncoveredLines.join(', ')}\n\n`;
    }

    prompt += `Current coverage: ${gap.currentCoverage}%. Target: ${gap.targetCoverage}%.\n`;
    prompt += `Focus on testing the uncovered functions and branches above.`;

    return prompt;
  }

  private findUncoveredLines(statements: Record<string, number>): number[] {
    return Object.entries(statements)
      .filter(([, count]) => count === 0)
      .map(([id]) => parseInt(id, 10));
  }

  private findUncoveredBranches(
    branches: Record<string, number[]>,
    branchMap: Record<string, any>
  ): Array<{ line: number; branch: string }> {
    const uncovered: Array<{ line: number; branch: string }> = [];
    for (const [id, counts] of Object.entries(branches)) {
      counts.forEach((count, index) => {
        if (count === 0 && branchMap[id]) {
          uncovered.push({
            line: branchMap[id].loc?.start?.line || 0,
            branch: `Branch ${index} of ${branchMap[id].type}`,
          });
        }
      });
    }
    return uncovered;
  }

  private findUncoveredFunctions(
    functions: Record<string, number>,
    fnMap: Record<string, any>
  ): string[] {
    return Object.entries(functions)
      .filter(([, count]) => count === 0)
      .map(([id]) => fnMap[id]?.name || `anonymous@${id}`)
      .filter((name) => name !== 'anonymous@undefined');
  }

  private calculatePriority(
    file: string,
    coverage: number,
    uncoveredFunctions: string[]
  ): CoverageGap['priority'] {
    if (file.includes('auth') || file.includes('security') || file.includes('payment')) {
      return 'critical';
    }
    if (coverage < 30) return 'high';
    if (coverage < 60 || uncoveredFunctions.length > 5) return 'medium';
    return 'low';
  }
}
```

## Test Quality Checker

```typescript
// test-generation/review/quality-checker.ts
export interface QualityReport {
  score: number;
  issues: QualityIssue[];
  suggestions: string[];
  passesReview: boolean;
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  rule: string;
}

export class TestQualityChecker {
  check(testCode: string): QualityReport {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];

    // Check for common anti-patterns
    this.checkForEmptyTests(testCode, issues);
    this.checkForWeakAssertions(testCode, issues);
    this.checkForHardcodedValues(testCode, issues);
    this.checkForMissingErrorTests(testCode, issues);
    this.checkForProperMocking(testCode, issues);
    this.checkForTestIsolation(testCode, issues);
    this.checkForDescriptiveNames(testCode, issues);
    this.checkForAsyncHandling(testCode, issues);
    this.checkForMagicNumbers(testCode, issues);
    this.checkForProperCleanup(testCode, issues);

    // Generate suggestions
    if (!testCode.includes('describe(')) {
      suggestions.push('Group related tests in describe blocks for better organization');
    }
    if (!testCode.includes('beforeEach') && !testCode.includes('beforeAll')) {
      suggestions.push('Consider using setup hooks for common test initialization');
    }
    if ((testCode.match(/it\(/g) || []).length < 3) {
      suggestions.push('Consider adding more test cases for better coverage');
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

    return {
      score,
      issues,
      suggestions,
      passesReview: score >= 60 && errorCount === 0,
    };
  }

  private checkForEmptyTests(code: string, issues: QualityIssue[]): void {
    const emptyTestRegex = /it\([^)]+,\s*(?:async\s*)?\(\)\s*=>\s*\{\s*\}\)/g;
    const matches = code.match(emptyTestRegex);
    if (matches) {
      issues.push({
        severity: 'error',
        message: `Found ${matches.length} empty test(s) with no assertions`,
        rule: 'no-empty-tests',
      });
    }
  }

  private checkForWeakAssertions(code: string, issues: QualityIssue[]): void {
    const weakPatterns = [
      { pattern: /expect\(\w+\)\.toBeTruthy\(\)/g, message: 'toBeTruthy() is too permissive - use specific assertion' },
      { pattern: /expect\(\w+\)\.toBeDefined\(\)/g, message: 'toBeDefined() only checks not-undefined - verify actual value' },
      { pattern: /expect\(\w+\)\.not\.toBeNull\(\)/g, message: 'not.toBeNull() is weak - assert the expected value' },
    ];

    for (const { pattern, message } of weakPatterns) {
      const matches = code.match(pattern);
      if (matches && matches.length > 2) {
        issues.push({ severity: 'warning', message: `${message} (found ${matches.length} instances)`, rule: 'strong-assertions' });
      }
    }
  }

  private checkForHardcodedValues(code: string, issues: QualityIssue[]): void {
    if (code.includes('localhost:') && !code.includes('process.env')) {
      issues.push({
        severity: 'warning',
        message: 'Hardcoded localhost URLs found. Use environment variables or config.',
        rule: 'no-hardcoded-urls',
      });
    }
  }

  private checkForMissingErrorTests(code: string, issues: QualityIssue[]): void {
    const hasErrorTests = code.includes('toThrow') || code.includes('rejects') || code.includes('error') || code.includes('invalid');
    if (!hasErrorTests) {
      issues.push({
        severity: 'warning',
        message: 'No error handling tests found. Add tests for invalid inputs and error cases.',
        rule: 'error-coverage',
      });
    }
  }

  private checkForProperMocking(code: string, issues: QualityIssue[]): void {
    if (code.includes('vi.fn()') || code.includes('jest.fn()')) {
      const mockCalls = (code.match(/vi\.fn\(\)|jest\.fn\(\)/g) || []).length;
      const mockVerifications = (code.match(/toHaveBeenCalled|toHaveBeenCalledWith/g) || []).length;
      if (mockCalls > mockVerifications * 2) {
        issues.push({
          severity: 'warning',
          message: 'Mocks created but not all verified. Ensure mocks are asserted.',
          rule: 'verify-mocks',
        });
      }
    }
  }

  private checkForTestIsolation(code: string, issues: QualityIssue[]): void {
    if (code.includes('let ') && !code.includes('beforeEach')) {
      const mutableVars = (code.match(/^\s*let\s+\w+/gm) || []).length;
      if (mutableVars > 2) {
        issues.push({
          severity: 'warning',
          message: 'Mutable variables without beforeEach reset. Tests may not be isolated.',
          rule: 'test-isolation',
        });
      }
    }
  }

  private checkForDescriptiveNames(code: string, issues: QualityIssue[]): void {
    const shortTests = code.match(/it\(['"]([^'"]{1,15})['"]/g);
    if (shortTests && shortTests.length > 0) {
      issues.push({
        severity: 'info',
        message: `${shortTests.length} test(s) have very short names. Use descriptive names explaining expected behavior.`,
        rule: 'descriptive-names',
      });
    }
  }

  private checkForAsyncHandling(code: string, issues: QualityIssue[]): void {
    if (code.includes('Promise') || code.includes('async')) {
      if (!code.includes('await') && !code.includes('.resolves') && !code.includes('.rejects')) {
        issues.push({
          severity: 'error',
          message: 'Async code detected but no await or promise assertions found. Tests may not wait for async operations.',
          rule: 'async-handling',
        });
      }
    }
  }

  private checkForMagicNumbers(code: string, issues: QualityIssue[]): void {
    const magicNumbers = code.match(/expect\([^)]+\)\.\w+\((?!['"`true|false|null|undefined|0|1|-1)\d{2,}\)/g);
    if (magicNumbers && magicNumbers.length > 3) {
      issues.push({
        severity: 'info',
        message: 'Multiple magic numbers in assertions. Consider extracting to named constants.',
        rule: 'no-magic-numbers',
      });
    }
  }

  private checkForProperCleanup(code: string, issues: QualityIssue[]): void {
    const hasSetup = code.includes('beforeEach') || code.includes('beforeAll');
    const hasCleanup = code.includes('afterEach') || code.includes('afterAll');
    if (hasSetup && !hasCleanup) {
      issues.push({
        severity: 'warning',
        message: 'Setup hooks found without cleanup hooks. Consider adding afterEach/afterAll for cleanup.',
        rule: 'proper-cleanup',
      });
    }
  }
}
```

## Batch Test Generator

```typescript
// test-generation/generators/batch-generator.ts
import Anthropic from '@anthropic-ai/sdk';
import { TestPromptBuilder, PromptContext } from './prompt-builder';
import { TestQualityChecker, QualityReport } from '../review/quality-checker';
import { readFileSync } from 'fs';

export interface BatchResult {
  file: string;
  testCode: string;
  quality: QualityReport;
  tokensUsed: number;
  generationTimeMs: number;
}

export class BatchTestGenerator {
  private client: Anthropic;
  private promptBuilder: TestPromptBuilder;
  private qualityChecker: TestQualityChecker;

  constructor() {
    this.client = new Anthropic();
    this.promptBuilder = new TestPromptBuilder();
    this.qualityChecker = new TestQualityChecker();
  }

  async generateBatch(
    files: string[],
    testType: 'unit' | 'integration' | 'e2e' | 'api',
    conventions?: string
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const file of files) {
      const sourceCode = readFileSync(file, 'utf-8');
      const context: PromptContext = {
        sourceCode,
        sourceFile: file,
        projectConventions: conventions,
      };

      const prompt = testType === 'unit'
        ? this.promptBuilder.buildUnitTestPrompt(context)
        : testType === 'e2e'
          ? this.promptBuilder.buildE2ETestPrompt(context)
          : this.promptBuilder.buildIntegrationTestPrompt(context);

      const startTime = Date.now();

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const codeMatch = text.match(/```typescript\n([\s\S]*?)```/);
      const testCode = codeMatch ? codeMatch[1] : text;

      const quality = this.qualityChecker.check(testCode);
      const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

      results.push({
        file,
        testCode: testCode.trim(),
        quality,
        tokensUsed,
        generationTimeMs: Date.now() - startTime,
      });
    }

    return results;
  }
}
```

## Example: Using the Generation Pipeline

```typescript
// example-usage.ts
import { TestPromptBuilder } from './generators/prompt-builder';
import { CoverageAnalyzer } from './analyzers/coverage-analyzer';
import { BatchTestGenerator } from './generators/batch-generator';

async function generateTestsForProject() {
  // Step 1: Analyze coverage gaps
  const coverageAnalyzer = new CoverageAnalyzer();
  const gaps = coverageAnalyzer.analyzeCoverageReport('./coverage/coverage-final.json');

  console.log(`Found ${gaps.length} coverage gaps`);
  const criticalGaps = gaps.filter((g) => g.priority === 'critical' || g.priority === 'high');
  console.log(`${criticalGaps.length} critical/high priority gaps`);

  // Step 2: Generate tests for high-priority gaps
  const generator = new BatchTestGenerator();
  const results = await generator.generateBatch(
    criticalGaps.map((g) => g.file),
    'unit',
    'Use vitest, follow AAA pattern, use vi.mock for dependencies'
  );

  // Step 3: Review quality
  for (const result of results) {
    console.log(`${result.file}: Score ${result.quality.score}/100`);
    if (result.quality.passesReview) {
      console.log('  PASS - Ready for human review');
    } else {
      console.log('  NEEDS WORK:', result.quality.issues.map((i) => i.message).join('; '));
    }
  }
}
```

## Best Practices

1. **Provide the source code in every generation prompt** -- AI agents cannot infer implementation details from function names alone. Always include the full source code being tested.
2. **Include existing test patterns in context** -- Show the agent 2-3 examples of your existing tests so it matches your project's style and conventions.
3. **Generate tests incrementally, not all at once** -- Generate tests for one file at a time, validate them, then move to the next. Batch generation without validation produces low-quality tests.
4. **Use coverage reports to target generation** -- Do not regenerate tests that already exist. Analyze coverage gaps and generate only for uncovered code paths.
5. **Review AI-generated assertions carefully** -- AI agents often generate assertions that are too loose (toBeDefined) or test implementation details rather than behavior.
6. **Set up automated quality checks** -- Run the quality checker on all generated tests before human review to catch common anti-patterns automatically.
7. **Keep prompts under version control** -- Store generation prompts in your repository so the entire team uses consistent prompts and changes are tracked.
8. **Test the tests with mutation testing** -- After generating tests, run mutation testing to verify the generated assertions actually detect bugs.
9. **Establish a generation budget** -- Set a maximum number of tokens or dollars per generation session to prevent runaway costs.
10. **Document which tests are AI-generated** -- Add a comment or metadata to generated tests so reviewers know to scrutinize them more carefully.

## Anti-Patterns

1. **Generating tests without source code context** -- Prompting with only function signatures produces tests that compile but do not meaningfully verify behavior.
2. **Accepting all generated tests without review** -- AI-generated tests can have incorrect assertions, hardcoded values, and logic errors. Always review before committing.
3. **Using temperature > 0 for test generation** -- Non-deterministic generation produces inconsistent results. Use temperature 0 for reproducible test generation.
4. **Generating tests for trivial code** -- Do not waste tokens generating tests for simple getters, setters, or pass-through functions. Focus on complex logic.
5. **Ignoring the quality checker output** -- Automated quality checks catch 80% of common issues. Skipping them leads to low-quality tests entering the codebase.
6. **Regenerating existing tests** -- Before generating, check if tests already exist. Duplicate tests waste resources and create maintenance burden.
7. **Using AI-generated tests as the sole quality gate** -- AI-generated tests complement but do not replace human-written critical path tests.
8. **Not validating that generated tests actually run** -- A test that does not compile or throws at runtime provides zero value. Always execute generated tests before committing.
9. **Generating E2E tests for unstable UIs** -- If the UI is changing rapidly, generated E2E tests will break immediately. Wait for UI stabilization.
10. **Trusting AI-generated mock implementations** -- AI agents often create mocks that do not accurately represent the real dependency behavior. Verify mocks against actual service contracts.
