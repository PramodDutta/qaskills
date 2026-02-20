---
name: Mutation Test Generator
description: Generate and run mutation tests to measure test suite effectiveness by introducing code mutations and verifying detection rates.
version: 1.0.0
author: Pramod
license: MIT
tags: [mutation-testing, stryker, test-quality, code-coverage, test-effectiveness]
testingTypes: [unit, code-quality]
frameworks: [jest, vitest]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Mutation Test Generator

You are an expert QA engineer specializing in mutation testing to measure and improve test suite effectiveness. When the user provides source code and its corresponding test suite, you generate targeted mutations, predict which tests should catch each mutation, and identify gaps where surviving mutants indicate weak or missing tests. You guide the user from Stryker configuration through mutation analysis to actionable test improvements.

## Core Principles

1. **Code coverage lies, mutation score does not** -- A test suite can achieve 100% line coverage while catching zero real bugs. Mutation testing measures whether tests actually verify behavior, not just execute code paths.
2. **Mutants model real faults** -- Each mutation operator (replacing `>` with `>=`, removing a function call, changing `true` to `false`) simulates a category of real-world developer mistake. Surviving mutants represent bugs your tests would miss.
3. **Kill rate is the metric** -- The mutation score is `killed_mutants / total_mutants * 100`. A healthy, well-tested codebase achieves 80% or higher. Below 60% indicates serious gaps.
4. **Equivalent mutants are noise** -- Some mutations produce functionally identical code. These cannot be killed and should be identified and excluded from the score rather than chased with additional tests.
5. **Incremental mutation testing** -- Running mutations on the entire codebase is expensive. Focus mutation testing on changed files, critical business logic, and code with high cyclomatic complexity.
6. **Test improvement over test addition** -- When a mutant survives, the first question should be whether an existing test can be strengthened with a better assertion, not whether a new test needs to be written.
7. **Mutation testing complements, not replaces, other techniques** -- Use mutation testing alongside code coverage, boundary value analysis, and code review. No single technique catches everything.

## Project Structure

Organize mutation testing configuration and results:

```
project/
  src/
    services/
      payment-service.ts
      user-service.ts
      order-service.ts
    utils/
      calculator.ts
      validator.ts
  tests/
    unit/
      services/
        payment-service.test.ts
        user-service.test.ts
        order-service.test.ts
      utils/
        calculator.test.ts
        validator.test.ts
  mutation/
    reports/
      .gitkeep
    stryker.config.ts
    mutation-analysis.md
    survivor-triage.md
  .stryker-tmp/        # Gitignored, Stryker working directory
  stryker.config.mjs   # Root config (alternative location)
```

## Detailed Guide: Understanding Mutation Operators

### Core Mutation Operators

Mutation operators are transformations applied to source code to create mutants. Each operator targets a specific class of potential bugs.

```typescript
// Arithmetic Operator Replacement
// Original:
const total = price * quantity;
// Mutants:
const total = price + quantity;  // ArithmeticOperator: * -> +
const total = price - quantity;  // ArithmeticOperator: * -> -
const total = price / quantity;  // ArithmeticOperator: * -> /
const total = price % quantity;  // ArithmeticOperator: * -> %

// Conditional Boundary Replacement
// Original:
if (age >= 18) { /* adult */ }
// Mutants:
if (age > 18) { /* adult */ }   // ConditionalBoundary: >= -> >
if (age < 18) { /* adult */ }   // ConditionalBoundary: >= -> <
if (age <= 18) { /* adult */ }  // ConditionalBoundary: >= -> <=

// Equality Operator Replacement
// Original:
if (status === 'active') { /* proceed */ }
// Mutants:
if (status !== 'active') { /* proceed */ }  // EqualityOperator: === -> !==

// Logical Operator Replacement
// Original:
if (isAdmin && isActive) { /* allow */ }
// Mutants:
if (isAdmin || isActive) { /* allow */ }  // LogicalOperator: && -> ||

// Unary Operator Removal/Replacement
// Original:
return !isValid;
// Mutants:
return isValid;  // UnaryOperator: removed negation

// Block Statement Removal
// Original:
if (error) {
  logError(error);
  notifyAdmin(error);
}
// Mutants:
if (error) {
  // Block removed -- tests should detect missing side effects
}

// String Literal Mutation
// Original:
const message = 'Payment successful';
// Mutants:
const message = '';           // StringLiteral: emptied
const message = 'Stryker was here!';  // StringLiteral: replaced

// Array Declaration Mutation
// Original:
const defaults = [1, 2, 3];
// Mutants:
const defaults = [];  // ArrayDeclaration: emptied

// Boolean Literal Replacement
// Original:
const isEnabled = true;
// Mutants:
const isEnabled = false;  // BooleanLiteral: true -> false

// Return Value Mutation
// Original:
function getDiscount(): number { return 0.1; }
// Mutants:
function getDiscount(): number { return 0; }  // ReturnValue: replaced with falsy
```

### Identifying Which Tests Should Kill Each Mutant

```typescript
interface Mutant {
  id: string;
  operator: string;
  originalCode: string;
  mutatedCode: string;
  file: string;
  line: number;
  column: number;
  status: 'killed' | 'survived' | 'timeout' | 'no-coverage' | 'equivalent';
}

interface MutantAnalysis {
  mutant: Mutant;
  expectedKillerTests: string[];
  actualKillerTests: string[];
  analysisNotes: string;
  improvementSuggestion?: string;
}

function analyzeSurvivor(mutant: Mutant): MutantAnalysis {
  const analysis: MutantAnalysis = {
    mutant,
    expectedKillerTests: [],
    actualKillerTests: [],
    analysisNotes: '',
  };

  switch (mutant.operator) {
    case 'ArithmeticOperator':
      analysis.analysisNotes =
        'An arithmetic operator mutation survived. This means no test verifies ' +
        'the computed result with a specific expected value. Tests may be checking ' +
        'only that a value is returned, not that it is correct.';
      analysis.improvementSuggestion =
        'Add an assertion that checks the exact computed value, not just its type or presence.';
      break;

    case 'ConditionalBoundary':
      analysis.analysisNotes =
        'A boundary condition mutation survived. This means no test exercises the ' +
        'exact boundary value. Tests may pass values well inside the range but never ' +
        'at the edge.';
      analysis.improvementSuggestion =
        'Add tests for the exact boundary value and one step on either side.';
      break;

    case 'EqualityOperator':
      analysis.analysisNotes =
        'An equality operator mutation survived. This means the test suite does not ' +
        'distinguish between a match and a non-match for this comparison.';
      analysis.improvementSuggestion =
        'Add a test with an input that matches the condition and another that does not.';
      break;

    case 'BlockStatement':
      analysis.analysisNotes =
        'A block statement removal survived. This means the side effects of the ' +
        'block are not verified by any test. The code inside the block could be ' +
        'deleted without any test failing.';
      analysis.improvementSuggestion =
        'Add assertions that verify the side effects of the removed block ' +
        '(state changes, function calls, emitted events).';
      break;

    default:
      analysis.analysisNotes = `A ${mutant.operator} mutation survived. Review the original and mutated code to determine what assertion is missing.`;
  }

  return analysis;
}
```

## Detailed Guide: Stryker Configuration

### Basic Stryker Configuration for TypeScript

```javascript
// stryker.config.mjs
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'pnpm',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
    dir: '.',
  },
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
    '!src/types/**/*.ts',
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail CI if mutation score drops below 50%
  },
  concurrency: 4,
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
  mutator: {
    excludedMutations: [
      'StringLiteral', // Often produces equivalent mutants in log messages
    ],
  },
  ignorePatterns: ['dist', 'node_modules', '.stryker-tmp', 'reports'],
  htmlReporter: {
    fileName: 'mutation/reports/mutation-report.html',
  },
  jsonReporter: {
    fileName: 'mutation/reports/mutation-report.json',
  },
};

export default config;
```

### Targeted Mutation Configuration for Specific Files

```javascript
// stryker.config.mjs - Targeting specific high-risk files
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'pnpm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    // Only mutate critical business logic
    'src/services/payment-service.ts',
    'src/services/order-service.ts',
    'src/utils/calculator.ts',
    'src/utils/validator.ts',
  ],
  thresholds: {
    high: 90,  // Higher threshold for critical code
    low: 75,
    break: 70,
  },
};

export default config;
```

### Jest Runner Configuration

```javascript
// stryker.config.mjs - Using Jest
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'pnpm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.ts',
    enableFindRelatedTests: true, // Crucial for performance
  },
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
};

export default config;
```

## Detailed Guide: Generating Targeted Mutations

### Analyzing Code for High-Value Mutation Targets

```typescript
interface MutationTarget {
  file: string;
  line: number;
  code: string;
  operators: string[];
  estimatedValue: 'high' | 'medium' | 'low';
  reason: string;
}

function identifyHighValueTargets(sourceCode: string, filePath: string): MutationTarget[] {
  const targets: MutationTarget[] = [];
  const lines = sourceCode.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Conditional boundaries are high-value targets
    if (/[<>]=?\s/.test(line) && !line.startsWith('//') && !line.startsWith('*')) {
      targets.push({
        file: filePath,
        line: lineNum,
        code: line,
        operators: ['ConditionalBoundary', 'EqualityOperator'],
        estimatedValue: 'high',
        reason: 'Boundary conditions are common sources of off-by-one errors',
      });
    }

    // Arithmetic operations in business logic
    if (/[+\-*/](?!=)/.test(line) && !line.startsWith('//') && !line.includes('++') && !line.includes('--')) {
      targets.push({
        file: filePath,
        line: lineNum,
        code: line,
        operators: ['ArithmeticOperator'],
        estimatedValue: 'high',
        reason: 'Arithmetic operations directly affect computed values',
      });
    }

    // Boolean logic
    if (/&&|\|\|/.test(line)) {
      targets.push({
        file: filePath,
        line: lineNum,
        code: line,
        operators: ['LogicalOperator'],
        estimatedValue: 'high',
        reason: 'Logical operator errors change control flow',
      });
    }

    // Return statements with values
    if (/return\s+.+;/.test(line)) {
      targets.push({
        file: filePath,
        line: lineNum,
        code: line,
        operators: ['ReturnValue'],
        estimatedValue: 'medium',
        reason: 'Return value mutations test whether callers verify results',
      });
    }

    // Negation operators
    if (/!\w/.test(line) && !line.includes('!==') && !line.includes('!=')) {
      targets.push({
        file: filePath,
        line: lineNum,
        code: line,
        operators: ['UnaryOperator'],
        estimatedValue: 'medium',
        reason: 'Negation removal is a common real-world bug pattern',
      });
    }
  }

  return targets;
}
```

### Manual Mutation Testing Without Stryker

When Stryker is not available or when you need to test specific mutations manually:

```typescript
// src/services/payment-service.ts
export class PaymentService {
  calculateTotal(items: Array<{ price: number; quantity: number }>): number {
    let total = 0;
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error('Quantity must be positive');
      }
      total += item.price * item.quantity;
    }
    return Math.round(total * 100) / 100;
  }

  applyDiscount(total: number, discountPercent: number): number {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount must be between 0 and 100');
    }
    return Math.round(total * (1 - discountPercent / 100) * 100) / 100;
  }

  calculateTax(subtotal: number, taxRate: number): number {
    if (taxRate < 0) {
      throw new Error('Tax rate cannot be negative');
    }
    return Math.round(subtotal * taxRate * 100) / 100;
  }
}

// tests/unit/services/payment-service.test.ts
import { describe, it, expect } from 'vitest';
import { PaymentService } from '../../../src/services/payment-service';

describe('PaymentService', () => {
  const service = new PaymentService();

  describe('calculateTotal', () => {
    it('should calculate total for single item', () => {
      const result = service.calculateTotal([{ price: 10.0, quantity: 2 }]);
      // This assertion kills ArithmeticOperator mutants:
      // * -> + would give 12, * -> - would give 8, * -> / would give 5
      expect(result).toBe(20.0);
    });

    it('should calculate total for multiple items', () => {
      const result = service.calculateTotal([
        { price: 10.0, quantity: 2 },
        { price: 5.5, quantity: 3 },
      ]);
      // Kills ArithmeticOperator on += (changing to -= would give -36.5)
      expect(result).toBe(36.5);
    });

    it('should throw for zero quantity', () => {
      // Kills ConditionalBoundary: <= -> < (quantity 0 would pass with <)
      expect(() => service.calculateTotal([{ price: 10, quantity: 0 }])).toThrow(
        'Quantity must be positive'
      );
    });

    it('should throw for negative quantity', () => {
      // Kills ConditionalBoundary: <= -> >= (negative would pass with >=)
      expect(() => service.calculateTotal([{ price: 10, quantity: -1 }])).toThrow(
        'Quantity must be positive'
      );
    });

    it('should accept quantity of 1', () => {
      // Boundary test: ensures <= 0 check does not reject 1
      const result = service.calculateTotal([{ price: 10, quantity: 1 }]);
      expect(result).toBe(10.0);
    });

    it('should return 0 for empty items array', () => {
      // Kills ReturnValue mutation that might return non-zero
      const result = service.calculateTotal([]);
      expect(result).toBe(0);
    });

    it('should handle floating point precision', () => {
      const result = service.calculateTotal([{ price: 0.1, quantity: 3 }]);
      // Math.round ensures this is 0.3, not 0.30000000000000004
      expect(result).toBe(0.3);
    });
  });

  describe('applyDiscount', () => {
    it('should apply 10% discount', () => {
      const result = service.applyDiscount(100, 10);
      // Kills ArithmeticOperator on both - and / in the formula
      expect(result).toBe(90.0);
    });

    it('should apply 0% discount (no change)', () => {
      const result = service.applyDiscount(100, 0);
      // Kills boundary mutation on < 0 check
      expect(result).toBe(100.0);
    });

    it('should apply 100% discount (free)', () => {
      const result = service.applyDiscount(100, 100);
      // Kills boundary mutation on > 100 check
      expect(result).toBe(0.0);
    });

    it('should reject negative discount', () => {
      expect(() => service.applyDiscount(100, -1)).toThrow(
        'Discount must be between 0 and 100'
      );
    });

    it('should reject discount over 100', () => {
      expect(() => service.applyDiscount(100, 101)).toThrow(
        'Discount must be between 0 and 100'
      );
    });

    it('should handle fractional discount', () => {
      const result = service.applyDiscount(100, 33.33);
      expect(result).toBe(66.67);
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax correctly', () => {
      const result = service.calculateTax(100, 0.08);
      expect(result).toBe(8.0);
    });

    it('should return 0 tax for 0 rate', () => {
      const result = service.calculateTax(100, 0);
      expect(result).toBe(0);
    });

    it('should reject negative tax rate', () => {
      expect(() => service.calculateTax(100, -0.05)).toThrow(
        'Tax rate cannot be negative'
      );
    });

    it('should handle 0 subtotal', () => {
      const result = service.calculateTax(0, 0.08);
      expect(result).toBe(0);
    });
  });
});
```

## Detailed Guide: Analyzing Mutation Results

### Interpreting the Mutation Report

```typescript
interface MutationReport {
  files: Record<string, FileMutationResult>;
  totalMutants: number;
  killed: number;
  survived: number;
  timeout: number;
  noCoverage: number;
  equivalent: number;
  mutationScore: number;
}

interface FileMutationResult {
  mutants: Mutant[];
  mutationScore: number;
  survivorCount: number;
}

function triageSurvivors(report: MutationReport): MutantAnalysis[] {
  const analyses: MutantAnalysis[] = [];

  for (const [file, result] of Object.entries(report.files)) {
    const survivors = result.mutants.filter((m) => m.status === 'survived');

    for (const survivor of survivors) {
      const analysis = analyzeSurvivor(survivor);

      // Classify equivalent mutants
      if (isLikelyEquivalent(survivor)) {
        survivor.status = 'equivalent';
        analysis.analysisNotes = 'Likely equivalent mutant. The mutation does not change observable behavior.';
      }

      analyses.push(analysis);
    }
  }

  // Sort by estimated value: high-value survivors first
  return analyses.sort((a, b) => {
    const priority: Record<string, number> = {
      ArithmeticOperator: 1,
      ConditionalBoundary: 2,
      EqualityOperator: 3,
      LogicalOperator: 4,
      BlockStatement: 5,
      ReturnValue: 6,
      StringLiteral: 10,
    };
    return (priority[a.mutant.operator] ?? 8) - (priority[b.mutant.operator] ?? 8);
  });
}

function isLikelyEquivalent(mutant: Mutant): boolean {
  // Common patterns that produce equivalent mutants
  const equivalentPatterns = [
    // Logging statements: changing the log message does not affect behavior
    /console\.(log|warn|info|debug|error)\(/,
    // Comments in template literals
    /\/\//,
    // Unreachable code after return/throw
    /^\s*(return|throw)\s/,
  ];

  return equivalentPatterns.some((pattern) => pattern.test(mutant.originalCode));
}
```

### Generating Test Improvements from Survivors

```typescript
function generateTestImprovement(analysis: MutantAnalysis): string {
  const { mutant } = analysis;

  const testTemplate = `
// File: ${mutant.file}, Line: ${mutant.line}
// Mutation: ${mutant.operator}
// Original: ${mutant.originalCode}
// Mutated:  ${mutant.mutatedCode}
//
// This mutation survived because no test verifies the exact behavior
// affected by this change. Add or strengthen a test as follows:

it('should [specific behavior description]', () => {
  // Arrange: Set up inputs that exercise line ${mutant.line}
  // Act: Call the function under test
  // Assert: Verify the EXACT expected result
  //
  // The assertion must fail if "${mutant.originalCode}"
  // is changed to "${mutant.mutatedCode}"
});
`;

  return testTemplate;
}

function generateSurvivorReport(analyses: MutantAnalysis[]): string {
  const sections: string[] = ['# Mutation Survivor Triage Report\n'];

  const byFile = new Map<string, MutantAnalysis[]>();
  for (const a of analyses) {
    const existing = byFile.get(a.mutant.file) ?? [];
    existing.push(a);
    byFile.set(a.mutant.file, existing);
  }

  for (const [file, fileAnalyses] of byFile) {
    sections.push(`## ${file}\n`);
    sections.push(`Surviving mutants: ${fileAnalyses.length}\n`);

    for (const analysis of fileAnalyses) {
      sections.push(`### Line ${analysis.mutant.line}: ${analysis.mutant.operator}`);
      sections.push(`- Original: \`${analysis.mutant.originalCode}\``);
      sections.push(`- Mutated: \`${analysis.mutant.mutatedCode}\``);
      sections.push(`- Analysis: ${analysis.analysisNotes}`);
      if (analysis.improvementSuggestion) {
        sections.push(`- Suggestion: ${analysis.improvementSuggestion}`);
      }
      sections.push('');
    }
  }

  return sections.join('\n');
}
```

## Detailed Guide: CI Integration

### GitHub Actions Workflow for Mutation Testing

```yaml
# .github/workflows/mutation-testing.yml
name: Mutation Testing
on:
  pull_request:
    paths:
      - 'src/**/*.ts'
      - 'tests/**/*.ts'
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  mutation-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run mutation tests
        run: pnpm exec stryker run
        timeout-minutes: 30

      - name: Upload mutation report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: mutation-report
          path: mutation/reports/

      - name: Comment PR with mutation score
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(
              fs.readFileSync('mutation/reports/mutation-report.json', 'utf8')
            );
            const score = (report.mutationScore || 0).toFixed(1);
            const body = `## Mutation Testing Results\n\nMutation Score: **${score}%**\n\nKilled: ${report.killed} | Survived: ${report.survived} | Timeout: ${report.timeout} | No Coverage: ${report.noCoverage}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

### Incremental Mutation Testing on Changed Files

```typescript
// scripts/incremental-mutation.ts
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

function getChangedFiles(): string[] {
  const output = execSync('git diff --name-only HEAD~1 -- "src/**/*.ts"', {
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .filter((f) => f.trim().length > 0)
    .filter((f) => !f.endsWith('.d.ts') && !f.endsWith('.test.ts'));
}

function generateIncrementalConfig(files: string[]): void {
  const config = {
    packageManager: 'pnpm',
    reporters: ['clear-text', 'json'],
    testRunner: 'vitest',
    coverageAnalysis: 'perTest',
    mutate: files,
    thresholds: { high: 80, low: 60, break: 50 },
    jsonReporter: { fileName: 'mutation/reports/incremental-report.json' },
  };

  writeFileSync(
    '.stryker-incremental.config.mjs',
    `export default ${JSON.stringify(config, null, 2)};`
  );
}

const changedFiles = getChangedFiles();
if (changedFiles.length > 0) {
  console.log(`Running mutation tests on ${changedFiles.length} changed files`);
  generateIncrementalConfig(changedFiles);
  execSync('pnpm exec stryker run --configFile .stryker-incremental.config.mjs', {
    stdio: 'inherit',
  });
} else {
  console.log('No source files changed. Skipping mutation testing.');
}
```

## Detailed Guide: Weak Tests vs. Strong Tests

### Recognizing Weak Assertions

The most common reason mutants survive is weak assertions. Here is how to recognize and fix them:

```typescript
// WEAK: Only checks existence, not correctness
expect(result).toBeDefined();
expect(result).not.toBeNull();
expect(result).toBeTruthy();

// WEAK: Only checks type, not value
expect(typeof result).toBe('number');
expect(result).toBeInstanceOf(Array);

// WEAK: Only checks approximate range
expect(result).toBeGreaterThan(0);
expect(result).toBeLessThan(1000);

// STRONG: Checks exact expected value
expect(result).toBe(42);
expect(result).toEqual({ id: 'abc', total: 99.95 });

// STRONG: Checks error message content
expect(() => fn(-1)).toThrow('Value must be positive');

// STRONG: Checks array contents precisely
expect(result).toEqual([1, 2, 3]);
expect(result).toHaveLength(3);
```

### Example: Strengthening a Test Suite

```typescript
// Source code being tested
export function calculateShipping(weight: number, distance: number): number {
  if (weight <= 0 || distance <= 0) {
    throw new Error('Weight and distance must be positive');
  }

  const baseRate = 5.0;
  const weightRate = weight * 0.5;
  const distanceRate = distance * 0.1;
  const total = baseRate + weightRate + distanceRate;

  // Free shipping for orders with total shipping under $10
  if (total < 10) {
    return 0;
  }

  return Math.round(total * 100) / 100;
}

// BEFORE: Weak tests (mutation score ~40%)
describe('calculateShipping - WEAK', () => {
  it('calculates shipping', () => {
    const result = calculateShipping(10, 50);
    expect(result).toBeDefined(); // Survives all arithmetic mutations
  });

  it('handles invalid input', () => {
    expect(() => calculateShipping(-1, 10)).toThrow(); // Survives boundary mutations
  });
});

// AFTER: Strong tests (mutation score ~95%)
describe('calculateShipping - STRONG', () => {
  it('calculates shipping as base + weight*0.5 + distance*0.1', () => {
    // 5.0 + (10 * 0.5) + (50 * 0.1) = 5 + 5 + 5 = 15
    expect(calculateShipping(10, 50)).toBe(15.0);
  });

  it('returns free shipping when total is under $10', () => {
    // 5.0 + (1 * 0.5) + (1 * 0.1) = 5.6 < 10 -> free
    expect(calculateShipping(1, 1)).toBe(0);
  });

  it('charges shipping when total equals $10 or more', () => {
    // 5.0 + (2 * 0.5) + (40 * 0.1) = 5 + 1 + 4 = 10 -> charged
    expect(calculateShipping(2, 40)).toBe(10.0);
  });

  it('rejects zero weight', () => {
    expect(() => calculateShipping(0, 10)).toThrow('Weight and distance must be positive');
  });

  it('rejects negative weight', () => {
    expect(() => calculateShipping(-1, 10)).toThrow('Weight and distance must be positive');
  });

  it('rejects zero distance', () => {
    expect(() => calculateShipping(10, 0)).toThrow('Weight and distance must be positive');
  });

  it('accepts weight of 1 (boundary)', () => {
    expect(calculateShipping(1, 100)).toBe(15.5);
  });

  it('rounds to two decimal places', () => {
    // 5.0 + (3 * 0.5) + (7 * 0.1) = 5 + 1.5 + 0.7 = 7.2 < 10 -> free
    expect(calculateShipping(3, 7)).toBe(0);
  });
});
```

## Configuration

### Package Installation

```bash
# For Vitest projects
pnpm add -D @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker

# For Jest projects
pnpm add -D @stryker-mutator/core @stryker-mutator/jest-runner @stryker-mutator/typescript-checker

# Initialize configuration
pnpm exec stryker init
```

### TypeScript Checker Configuration

```javascript
// stryker.config.mjs - With TypeScript checking
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'pnpm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  mutate: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts'],
  // TypeScript checker eliminates compile-error mutants before running tests
  // This significantly speeds up mutation testing
};

export default config;
```

### Vitest Configuration for Mutation Testing Compatibility

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
    watch: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

## Best Practices

1. **Start with critical business logic** -- Do not run mutation testing on the entire codebase initially. Start with the files that handle payments, authentication, authorization, and data validation. These are the highest-risk areas where surviving mutants indicate real danger.

2. **Set a mutation score threshold in CI** -- Use Stryker's `thresholds.break` option to fail the build when the mutation score drops below a minimum. Start with a conservative threshold (50%) and gradually increase it as the team improves tests.

3. **Triage survivors systematically** -- Not all surviving mutants are equally important. Prioritize by mutation operator (arithmetic and conditional boundary survivors are more dangerous than string literal survivors) and by file criticality.

4. **Exclude equivalent mutants** -- Mark confirmed equivalent mutants in your configuration so they do not pollute the score. Document why each mutant is equivalent.

5. **Use per-test coverage analysis** -- Configure Stryker with `coverageAnalysis: 'perTest'`. This dramatically reduces run time by only executing the tests relevant to each mutant instead of the entire suite.

6. **Run incremental mutations in CI, full mutations on schedule** -- Run mutations only on changed files in pull request pipelines. Run full mutations weekly to catch regression in mutation score.

7. **Write killer tests, not killer assertions** -- When strengthening a test to kill a mutant, add a specific assertion about the exact value, not a general assertion about the type or presence of a result.

8. **Monitor mutation score trends** -- Track the mutation score over time. A declining score indicates that new code is being added with weak tests.

9. **Do not chase 100% mutation score** -- Equivalent mutants make 100% unachievable. Aim for 80%+ on critical code and 60%+ on the overall codebase.

10. **Combine with code coverage** -- Use code coverage to find untested code, then use mutation testing to verify that the tested code is actually tested well. Coverage finds quantity gaps; mutation testing finds quality gaps.

11. **Review mutation reports in code review** -- Include the mutation report as part of the pull request review process. Surviving mutants in new code should be addressed before merging.

12. **Educate the team on mutation operators** -- Developers who understand what mutations are being applied write better initial tests. Publish a guide to the mutation operators used in your configuration.

## Anti-Patterns to Avoid

1. **Running mutation tests on every commit** -- Full mutation testing is computationally expensive. Running it on every commit wastes CI resources and slows down the feedback loop. Use incremental mutation testing for pull requests.

2. **Ignoring equivalent mutants** -- Failing to identify and exclude equivalent mutants inflates the number of "surviving" mutants and makes the metric noisy. Regularly review survivors and mark equivalents.

3. **Adding trivial tests to kill mutants** -- Writing `expect(result).not.toBeUndefined()` to kill a return value mutant is not meaningful. The test must verify the correct value, not just the presence of a value.

4. **Mutating test files** -- Never include test files in the mutation scope. This produces meaningless results and wastes computation.

5. **Using mutation testing without code coverage** -- Mutation testing on uncovered code always produces "no coverage" results. Run code coverage first to identify untested areas, then run mutation testing on the covered code.

6. **Setting the threshold too high too soon** -- A team new to mutation testing should not immediately set `thresholds.break: 80`. Start low and increase gradually as the team develops the discipline.

7. **Treating all mutation operators equally** -- A surviving `StringLiteral` mutation in a log message is far less dangerous than a surviving `ConditionalBoundary` mutation in an authorization check. Prioritize by operator and context.

8. **Not configuring timeout properly** -- Mutation testing can produce infinite loops. Configure `timeoutMS` and `timeoutFactor` to kill hung mutants promptly.

9. **Running mutations on generated code** -- Auto-generated files (GraphQL types, API clients, Prisma models) should be excluded from mutation testing. They are not hand-written and their correctness is the responsibility of the generator.

10. **Discarding the mutation report after the pipeline** -- Archive mutation reports and compare them over time. The historical trend is as valuable as any single report.

## Debugging Tips

1. **When Stryker is extremely slow**, check the `coverageAnalysis` setting. Switching from `'off'` to `'perTest'` can reduce run time by 10x because only relevant tests are executed for each mutant.

2. **When many mutants have "no coverage" status**, your test suite has gaps. Run a standard code coverage report to identify untested lines, write tests for them, and then re-run mutation testing.

3. **When the same mutation operator survives across many files**, the test suite has a systematic weakness. For example, if `ConditionalBoundary` mutants survive everywhere, the team is not writing boundary value tests consistently.

4. **When Stryker fails to start**, verify the test runner package is installed (`@stryker-mutator/vitest-runner` or `@stryker-mutator/jest-runner`) and that the config file path is correct.

5. **When mutants time out instead of being killed**, the mutation creates an infinite loop. This is a legitimate "kill" (the test would hang). Stryker counts timeouts as killed by default. Verify this in your configuration.

6. **When the mutation score is artificially high**, check for equivalent mutants. A high score with many equivalent mutants is misleading. Review the survivors and equivalents manually.

7. **When tests fail during mutation testing but pass normally**, the tests may have shared state or ordering dependencies. Mutation testing runs tests in isolation. Fix the test dependencies first.

8. **When the TypeScript checker rejects too many mutants**, it may be overly strict. Consider relaxing the checker or using `--checkers []` to disable it and rely solely on test execution.

9. **When CI runs exceed the time limit**, reduce the mutation scope to high-risk files only. Use the `mutate` array to target specific directories or files.

10. **When team members resist mutation testing**, start with a single critical module. Demonstrate the value by showing a surviving mutant that represents a real untested scenario. Concrete examples persuade better than abstract metrics.
