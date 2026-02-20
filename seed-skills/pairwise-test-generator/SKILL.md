---
name: Pairwise Test Generator
description: Generate optimized test combinations using pairwise (all-pairs) testing algorithms to achieve maximum coverage with minimum test cases across multiple input parameters
version: 1.0.0
author: Pramod
license: MIT
tags: [pairwise-testing, combinatorial, all-pairs, test-optimization, parameter-testing, orthogonal-array, test-reduction]
testingTypes: [unit, integration]
frameworks: [jest, vitest, pytest]
languages: [typescript, javascript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Pairwise Test Generator Skill

You are an expert QA engineer specializing in combinatorial test design and pairwise (all-pairs) testing. When the user asks you to generate optimized test combinations, reduce test suite size while maintaining coverage, or implement pairwise testing strategies, follow these detailed instructions.

## Core Principles

1. **Coverage over exhaustion** -- Pairwise testing guarantees that every pair of parameter values is tested at least once, catching the vast majority of defects without requiring exhaustive combinations.
2. **Parameter independence assumption** -- Pairwise testing assumes most defects are caused by interactions between at most two parameters. When three-way or higher interactions are suspected, increase the coverage strength.
3. **Constraint awareness** -- Real systems have invalid parameter combinations. Always model constraints explicitly rather than generating impossible test configurations.
4. **Traceability** -- Every generated test case should be traceable back to the parameter pairs it covers. This enables impact analysis when parameters change.
5. **Incremental refinement** -- Start with 2-way (pairwise) coverage and selectively increase to 3-way or higher for critical parameter subsets based on risk analysis.
6. **Reproducibility** -- Pairwise generation algorithms should produce deterministic output given the same inputs. Seed random elements to ensure test suites are reproducible across runs.

## Project Structure

```
tests/
  combinatorial/
    parameters/
      login-form.params.ts
      checkout-flow.params.ts
      search-filters.params.ts
    constraints/
      login-form.constraints.ts
      checkout-flow.constraints.ts
    generated/
      login-form.pairwise.ts
      checkout-flow.pairwise.ts
      search-filters.pairwise.ts
    generators/
      pairwise-generator.ts
      constraint-handler.ts
      coverage-analyzer.ts
    runners/
      parameterized-runner.ts
  utils/
    combination-utils.ts
    coverage-report.ts
pairwise.config.ts
```

## Understanding Pairwise Testing

### The Combinatorial Explosion Problem

Consider a login form with five parameters, each having multiple values:

| Parameter | Values | Count |
|-----------|--------|-------|
| Browser | Chrome, Firefox, Safari, Edge | 4 |
| OS | Windows, macOS, Linux | 3 |
| Language | English, Spanish, French, German | 4 |
| Auth Method | Password, SSO, MFA | 3 |
| Screen Size | Mobile, Tablet, Desktop | 3 |

Exhaustive testing requires 4 x 3 x 4 x 3 x 3 = 432 test cases. Pairwise testing covers all parameter pairs in approximately 16-20 test cases -- a reduction of over 95%.

### The Mathematical Foundation

Pairwise testing is based on the principle that most software defects are triggered by the interaction of at most two factors. Research by Kuhn, Wallace, and Gallo at NIST found that 93% of defects in the systems studied were triggered by interactions of two or fewer parameters, and 98% by interactions of three or fewer.

## Pairwise Algorithm Implementation

### Core Pairwise Generator in TypeScript

```typescript
interface Parameter {
  name: string;
  values: (string | number | boolean)[];
}

interface Constraint {
  description: string;
  condition: (combination: Record<string, any>) => boolean;
}

interface PairwiseConfig {
  parameters: Parameter[];
  constraints?: Constraint[];
  coverageStrength?: number; // 2 = pairwise, 3 = 3-way, etc.
  seed?: number;
}

interface TestCombination {
  id: number;
  values: Record<string, any>;
  coveredPairs: string[];
}

class PairwiseGenerator {
  private parameters: Parameter[];
  private constraints: Constraint[];
  private strength: number;
  private uncoveredPairs: Set<string>;
  private allPairs: Set<string>;

  constructor(config: PairwiseConfig) {
    this.parameters = config.parameters;
    this.constraints = config.constraints || [];
    this.strength = config.coverageStrength || 2;
    this.uncoveredPairs = new Set();
    this.allPairs = new Set();
    this.initializePairs();
  }

  private initializePairs(): void {
    // Generate all parameter pairs that need coverage
    for (let i = 0; i < this.parameters.length; i++) {
      for (let j = i + 1; j < this.parameters.length; j++) {
        const paramA = this.parameters[i];
        const paramB = this.parameters[j];

        for (const valA of paramA.values) {
          for (const valB of paramB.values) {
            const pair = this.encodePair(paramA.name, valA, paramB.name, valB);
            this.allPairs.add(pair);
            this.uncoveredPairs.add(pair);
          }
        }
      }
    }
  }

  private encodePair(
    param1: string,
    val1: any,
    param2: string,
    val2: any
  ): string {
    return `${param1}=${val1}|${param2}=${val2}`;
  }

  private getCoveredPairs(combination: Record<string, any>): string[] {
    const covered: string[] = [];
    const paramNames = Object.keys(combination);

    for (let i = 0; i < paramNames.length; i++) {
      for (let j = i + 1; j < paramNames.length; j++) {
        const pair = this.encodePair(
          paramNames[i],
          combination[paramNames[i]],
          paramNames[j],
          combination[paramNames[j]]
        );
        if (this.uncoveredPairs.has(pair)) {
          covered.push(pair);
        }
      }
    }

    return covered;
  }

  private satisfiesConstraints(combination: Record<string, any>): boolean {
    return this.constraints.every((constraint) => constraint.condition(combination));
  }

  private generateCandidate(): Record<string, any> {
    const combination: Record<string, any> = {};
    for (const param of this.parameters) {
      combination[param.name] = param.values[
        Math.floor(Math.random() * param.values.length)
      ];
    }
    return combination;
  }

  generate(): TestCombination[] {
    const testCases: TestCombination[] = [];
    let attempts = 0;
    const maxAttempts = this.allPairs.size * 100;

    while (this.uncoveredPairs.size > 0 && attempts < maxAttempts) {
      let bestCandidate: Record<string, any> | null = null;
      let bestCoverage: string[] = [];

      // Generate multiple candidates and pick the one covering the most pairs
      const candidateCount = Math.min(50, this.parameters.length * 10);
      for (let c = 0; c < candidateCount; c++) {
        const candidate = this.generateCandidate();

        if (!this.satisfiesConstraints(candidate)) continue;

        const covered = this.getCoveredPairs(candidate);
        if (covered.length > bestCoverage.length) {
          bestCandidate = candidate;
          bestCoverage = covered;
        }
      }

      if (bestCandidate && bestCoverage.length > 0) {
        testCases.push({
          id: testCases.length + 1,
          values: bestCandidate,
          coveredPairs: bestCoverage,
        });

        for (const pair of bestCoverage) {
          this.uncoveredPairs.delete(pair);
        }
      }

      attempts++;
    }

    return testCases;
  }

  getCoverageReport(testCases: TestCombination[]): CoverageReport {
    const coveredPairs = new Set<string>();
    for (const tc of testCases) {
      for (const pair of tc.coveredPairs) {
        coveredPairs.add(pair);
      }
    }

    return {
      totalPairs: this.allPairs.size,
      coveredPairs: coveredPairs.size,
      uncoveredPairs: this.allPairs.size - coveredPairs.size,
      coveragePercentage:
        (coveredPairs.size / this.allPairs.size) * 100,
      testCaseCount: testCases.length,
      reductionFromExhaustive: this.calculateExhaustiveCount(),
      reductionPercentage: 0,
    };
  }

  private calculateExhaustiveCount(): number {
    return this.parameters.reduce((total, param) => total * param.values.length, 1);
  }
}

interface CoverageReport {
  totalPairs: number;
  coveredPairs: number;
  uncoveredPairs: number;
  coveragePercentage: number;
  testCaseCount: number;
  reductionFromExhaustive: number;
  reductionPercentage: number;
}
```

### Using the Generator

```typescript
const config: PairwiseConfig = {
  parameters: [
    { name: 'browser', values: ['Chrome', 'Firefox', 'Safari', 'Edge'] },
    { name: 'os', values: ['Windows', 'macOS', 'Linux'] },
    { name: 'language', values: ['English', 'Spanish', 'French', 'German'] },
    { name: 'authMethod', values: ['Password', 'SSO', 'MFA'] },
    { name: 'screenSize', values: ['Mobile', 'Tablet', 'Desktop'] },
  ],
  constraints: [
    {
      description: 'Safari only runs on macOS',
      condition: (combo) =>
        combo.browser !== 'Safari' || combo.os === 'macOS',
    },
    {
      description: 'Edge is not available on Linux',
      condition: (combo) =>
        combo.browser !== 'Edge' || combo.os !== 'Linux',
    },
  ],
};

const generator = new PairwiseGenerator(config);
const testCases = generator.generate();
const report = generator.getCoverageReport(testCases);

console.log(`Generated ${testCases.length} test cases`);
console.log(`Coverage: ${report.coveragePercentage.toFixed(1)}%`);
console.log(`Exhaustive would require: ${report.reductionFromExhaustive} cases`);
```

## Parameter Identification from Specifications

### Extracting Parameters from UI Requirements

```typescript
interface UISpecification {
  formFields: FormField[];
  environmentFactors: EnvironmentFactor[];
  userRoles: string[];
}

interface FormField {
  name: string;
  type: 'text' | 'select' | 'radio' | 'checkbox' | 'number';
  validValues: any[];
  boundaryValues?: any[];
}

interface EnvironmentFactor {
  name: string;
  values: string[];
}

function extractParametersFromSpec(spec: UISpecification): Parameter[] {
  const parameters: Parameter[] = [];

  // Form fields become test parameters
  for (const field of spec.formFields) {
    const values: any[] = [...field.validValues];

    // Add boundary values for numeric fields
    if (field.boundaryValues) {
      values.push(...field.boundaryValues);
    }

    // Always include an "empty/invalid" value for negative testing
    if (field.type === 'text') values.push('');
    if (field.type === 'number') values.push(-1);

    parameters.push({ name: field.name, values });
  }

  // Environment factors
  for (const factor of spec.environmentFactors) {
    parameters.push({ name: factor.name, values: factor.values });
  }

  // User roles
  if (spec.userRoles.length > 0) {
    parameters.push({ name: 'userRole', values: spec.userRoles });
  }

  return parameters;
}

// Example: E-commerce checkout specification
const checkoutSpec: UISpecification = {
  formFields: [
    {
      name: 'paymentMethod',
      type: 'select',
      validValues: ['credit_card', 'debit_card', 'paypal', 'apple_pay'],
    },
    {
      name: 'shippingMethod',
      type: 'radio',
      validValues: ['standard', 'express', 'overnight'],
    },
    {
      name: 'couponCode',
      type: 'text',
      validValues: ['VALID10', 'EXPIRED20', 'NONE'],
    },
    {
      name: 'giftWrap',
      type: 'checkbox',
      validValues: [true, false],
    },
  ],
  environmentFactors: [
    { name: 'currency', values: ['USD', 'EUR', 'GBP'] },
    { name: 'locale', values: ['en-US', 'es-ES', 'de-DE'] },
  ],
  userRoles: ['guest', 'registered', 'premium'],
};

const parameters = extractParametersFromSpec(checkoutSpec);
```

## Constraint Handling

### Modeling Complex Constraints

```typescript
type ConstraintType = 'exclude' | 'require' | 'conditional';

interface TypedConstraint {
  type: ConstraintType;
  description: string;
  parameters: string[];
  condition: (combination: Record<string, any>) => boolean;
}

class ConstraintManager {
  private constraints: TypedConstraint[] = [];

  // Exclude a specific combination
  exclude(
    description: string,
    paramA: string,
    valueA: any,
    paramB: string,
    valueB: any
  ): this {
    this.constraints.push({
      type: 'exclude',
      description,
      parameters: [paramA, paramB],
      condition: (combo) =>
        !(combo[paramA] === valueA && combo[paramB] === valueB),
    });
    return this;
  }

  // Require that if paramA has valueA, paramB must have valueB
  require(
    description: string,
    paramA: string,
    valueA: any,
    paramB: string,
    valueB: any
  ): this {
    this.constraints.push({
      type: 'require',
      description,
      parameters: [paramA, paramB],
      condition: (combo) =>
        combo[paramA] !== valueA || combo[paramB] === valueB,
    });
    return this;
  }

  // Add a custom conditional constraint
  conditional(
    description: string,
    parameters: string[],
    condition: (combo: Record<string, any>) => boolean
  ): this {
    this.constraints.push({
      type: 'conditional',
      description,
      parameters,
      condition,
    });
    return this;
  }

  getConstraints(): Constraint[] {
    return this.constraints.map((c) => ({
      description: c.description,
      condition: c.condition,
    }));
  }

  validate(combination: Record<string, any>): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    for (const constraint of this.constraints) {
      if (!constraint.condition(combination)) {
        violations.push(constraint.description);
      }
    }
    return { valid: violations.length === 0, violations };
  }
}

// Usage
const constraints = new ConstraintManager()
  .exclude(
    'Safari not available on Windows',
    'browser', 'Safari', 'os', 'Windows'
  )
  .exclude(
    'Safari not available on Linux',
    'browser', 'Safari', 'os', 'Linux'
  )
  .require(
    'Apple Pay requires macOS or iOS',
    'paymentMethod', 'apple_pay', 'os', 'macOS'
  )
  .conditional(
    'MFA not available for guest users',
    ['authMethod', 'userRole'],
    (combo) => combo.authMethod !== 'MFA' || combo.userRole !== 'guest'
  )
  .conditional(
    'Express shipping not available for international orders',
    ['shippingMethod', 'locale'],
    (combo) =>
      combo.shippingMethod !== 'express' ||
      combo.locale === 'en-US'
  );
```

## Coverage Strength Analysis

### Comparing 2-Way, 3-Way, and Higher-Order Coverage

```typescript
interface CoverageStrengthAnalysis {
  strength: number;
  totalTuples: number;
  estimatedTestCases: number;
  estimatedDefectDetection: number;
}

function analyzeCoverageStrengths(
  parameters: Parameter[]
): CoverageStrengthAnalysis[] {
  const analyses: CoverageStrengthAnalysis[] = [];

  for (let strength = 2; strength <= Math.min(parameters.length, 4); strength++) {
    const totalTuples = countTuples(parameters, strength);
    const estimatedTests = estimateTestCases(parameters, strength);
    const estimatedDetection = getEstimatedDetection(strength);

    analyses.push({
      strength,
      totalTuples,
      estimatedTestCases: estimatedTests,
      estimatedDefectDetection: estimatedDetection,
    });
  }

  return analyses;
}

function countTuples(parameters: Parameter[], strength: number): number {
  let total = 0;
  const indices = Array.from({ length: parameters.length }, (_, i) => i);
  const combos = getCombinations(indices, strength);

  for (const combo of combos) {
    let tupleCount = 1;
    for (const idx of combo) {
      tupleCount *= parameters[idx].values.length;
    }
    total += tupleCount;
  }

  return total;
}

function getCombinations(arr: number[], size: number): number[][] {
  if (size === 0) return [[]];
  if (arr.length === 0) return [];

  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, size - 1).map((c) => [first, ...c]);
  const withoutFirst = getCombinations(rest, size);
  return [...withFirst, ...withoutFirst];
}

function estimateTestCases(parameters: Parameter[], strength: number): number {
  // Rough estimate based on the largest parameter set
  const maxValues = Math.max(...parameters.map((p) => p.values.length));
  return Math.ceil(Math.pow(maxValues, strength) * Math.log2(parameters.length));
}

function getEstimatedDetection(strength: number): number {
  // Based on NIST research data
  const detectionRates: Record<number, number> = {
    2: 93,  // 93% of defects caught by 2-way
    3: 98,  // 98% by 3-way
    4: 99.5, // 99.5% by 4-way
  };
  return detectionRates[strength] || 100;
}

// Usage
const analyses = analyzeCoverageStrengths(parameters);
for (const analysis of analyses) {
  console.log(`${analysis.strength}-way coverage:`);
  console.log(`  Total tuples: ${analysis.totalTuples}`);
  console.log(`  Estimated test cases: ${analysis.estimatedTestCases}`);
  console.log(`  Estimated defect detection: ${analysis.estimatedDefectDetection}%`);
}
```

## Integration with Test Frameworks

### Vitest Parameterized Tests

```typescript
import { describe, it, expect } from 'vitest';

// Generated pairwise test data
const loginTestCases = [
  { browser: 'Chrome', os: 'Windows', auth: 'Password', lang: 'English' },
  { browser: 'Firefox', os: 'macOS', auth: 'SSO', lang: 'Spanish' },
  { browser: 'Safari', os: 'macOS', auth: 'MFA', lang: 'French' },
  { browser: 'Edge', os: 'Windows', auth: 'SSO', lang: 'German' },
  { browser: 'Chrome', os: 'Linux', auth: 'MFA', lang: 'Spanish' },
  { browser: 'Firefox', os: 'Windows', auth: 'Password', lang: 'French' },
  { browser: 'Chrome', os: 'macOS', auth: 'SSO', lang: 'German' },
  { browser: 'Edge', os: 'macOS', auth: 'Password', lang: 'English' },
  { browser: 'Firefox', os: 'Linux', auth: 'Password', lang: 'German' },
  { browser: 'Chrome', os: 'Windows', auth: 'MFA', lang: 'French' },
];

describe('Login Form - Pairwise Tests', () => {
  it.each(loginTestCases)(
    'should login with $browser on $os using $auth in $lang',
    async ({ browser, os, auth, lang }) => {
      // Setup environment
      const env = setupTestEnvironment({ browser, os, lang });

      // Perform login based on auth method
      const loginResult = await performLogin(env, {
        method: auth,
        credentials: getTestCredentials(auth),
      });

      // Verify successful login
      expect(loginResult.success).toBe(true);
      expect(loginResult.sessionToken).toBeDefined();

      // Verify UI is rendered correctly for the locale
      expect(loginResult.locale).toBe(lang);

      await env.cleanup();
    }
  );
});

// Helper to format pairwise data for it.each
function formatForTestEach(
  testCases: TestCombination[]
): Record<string, any>[] {
  return testCases.map((tc) => tc.values);
}
```

### Jest Parameterized Tests

```typescript
import { PairwiseGenerator, PairwiseConfig } from '../generators/pairwise-generator';

const searchConfig: PairwiseConfig = {
  parameters: [
    { name: 'query', values: ['valid-term', '', 'special-chars-!@#', 'very-long-' + 'x'.repeat(200)] },
    { name: 'category', values: ['all', 'electronics', 'clothing', 'books'] },
    { name: 'sortBy', values: ['relevance', 'price-asc', 'price-desc', 'newest'] },
    { name: 'inStock', values: [true, false] },
    { name: 'priceRange', values: ['any', '0-50', '50-100', '100-500', '500+'] },
  ],
};

const generator = new PairwiseGenerator(searchConfig);
const testCases = generator.generate();

describe('Search Feature - Pairwise Combinations', () => {
  test.each(testCases.map((tc) => [tc.id, tc.values]))(
    'Test case #%i: %o',
    async (id, params: Record<string, any>) => {
      const response = await searchAPI({
        query: params.query,
        category: params.category,
        sortBy: params.sortBy,
        inStock: params.inStock,
        priceRange: params.priceRange,
      });

      // Validate response structure regardless of parameters
      expect(response).toHaveProperty('results');
      expect(response).toHaveProperty('totalCount');
      expect(response).toHaveProperty('facets');

      // Validate sorting is applied correctly
      if (params.sortBy === 'price-asc' && response.results.length > 1) {
        for (let i = 1; i < response.results.length; i++) {
          expect(response.results[i].price).toBeGreaterThanOrEqual(
            response.results[i - 1].price
          );
        }
      }

      // Validate stock filtering
      if (params.inStock) {
        response.results.forEach((item: any) => {
          expect(item.inStock).toBe(true);
        });
      }

      // Validate category filtering
      if (params.category !== 'all') {
        response.results.forEach((item: any) => {
          expect(item.category).toBe(params.category);
        });
      }
    }
  );
});
```

### Pytest Parameterized Tests

```python
import pytest
from typing import List, Dict, Any
from itertools import combinations

class PairwiseGenerator:
    """Simple pairwise test generator for Python."""

    def __init__(self, parameters: Dict[str, List[Any]]):
        self.parameters = parameters
        self.param_names = list(parameters.keys())

    def generate(self) -> List[Dict[str, Any]]:
        """Generate pairwise test combinations."""
        uncovered_pairs = set()
        for i, name_a in enumerate(self.param_names):
            for name_b in self.param_names[i + 1:]:
                for val_a in self.parameters[name_a]:
                    for val_b in self.parameters[name_b]:
                        uncovered_pairs.add((name_a, str(val_a), name_b, str(val_b)))

        test_cases = []
        max_attempts = len(uncovered_pairs) * 50

        import random
        random.seed(42)

        attempts = 0
        while uncovered_pairs and attempts < max_attempts:
            best_candidate = None
            best_coverage = 0

            for _ in range(50):
                candidate = {
                    name: random.choice(values)
                    for name, values in self.parameters.items()
                }

                coverage = sum(
                    1 for pair in uncovered_pairs
                    if (candidate.get(pair[0]) == self._parse(pair[1])
                        and candidate.get(pair[2]) == self._parse(pair[3]))
                )

                if coverage > best_coverage:
                    best_candidate = candidate
                    best_coverage = coverage

            if best_candidate and best_coverage > 0:
                test_cases.append(best_candidate)
                uncovered_pairs = {
                    pair for pair in uncovered_pairs
                    if not (best_candidate.get(pair[0]) == self._parse(pair[1])
                            and best_candidate.get(pair[2]) == self._parse(pair[3]))
                }

            attempts += 1

        return test_cases

    def _parse(self, value: str) -> Any:
        if value == "True":
            return True
        if value == "False":
            return False
        try:
            return int(value)
        except ValueError:
            return value


# Define parameters
search_params = {
    "query_type": ["simple", "phrase", "wildcard", "empty"],
    "category": ["all", "electronics", "books"],
    "sort": ["relevance", "price_asc", "price_desc"],
    "page_size": [10, 25, 50],
    "authenticated": [True, False],
}

# Generate pairwise combinations
generator = PairwiseGenerator(search_params)
pairwise_cases = generator.generate()


@pytest.mark.parametrize(
    "test_params",
    pairwise_cases,
    ids=[f"case_{i}" for i in range(len(pairwise_cases))],
)
def test_search_pairwise(test_params, api_client):
    """Test search with pairwise parameter combinations."""
    response = api_client.search(
        query=get_query_for_type(test_params["query_type"]),
        category=test_params["category"],
        sort=test_params["sort"],
        page_size=test_params["page_size"],
    )

    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) <= test_params["page_size"]
```

## Browser/OS/Device Combination Matrices

### Cross-Browser Testing Matrix

```typescript
const crossBrowserConfig: PairwiseConfig = {
  parameters: [
    {
      name: 'browser',
      values: ['chrome-latest', 'chrome-previous', 'firefox-latest',
               'firefox-previous', 'safari-latest', 'edge-latest'],
    },
    {
      name: 'os',
      values: ['windows-11', 'windows-10', 'macos-sonoma',
               'macos-ventura', 'ubuntu-22.04'],
    },
    {
      name: 'viewport',
      values: ['1920x1080', '1366x768', '1440x900', '375x812', '768x1024'],
    },
    {
      name: 'connection',
      values: ['fast-4g', 'slow-3g', 'offline'],
    },
    {
      name: 'colorScheme',
      values: ['light', 'dark'],
    },
    {
      name: 'reducedMotion',
      values: ['no-preference', 'reduce'],
    },
  ],
  constraints: [
    {
      description: 'Safari only on macOS',
      condition: (combo) =>
        !combo.browser.startsWith('safari') || combo.os.startsWith('macos'),
    },
    {
      description: 'Edge not on Ubuntu',
      condition: (combo) =>
        !combo.browser.startsWith('edge') || !combo.os.startsWith('ubuntu'),
    },
  ],
};

const browserGenerator = new PairwiseGenerator(crossBrowserConfig);
const browserTests = browserGenerator.generate();

// Generate Playwright test configuration dynamically
function generatePlaywrightProjects(testCases: TestCombination[]) {
  return testCases.map((tc) => {
    const values = tc.values;
    const [width, height] = values.viewport.split('x').map(Number);

    return {
      name: `tc-${tc.id}-${values.browser}-${values.os}`,
      use: {
        browserName: values.browser.split('-')[0] as 'chromium' | 'firefox' | 'webkit',
        viewport: { width, height },
        colorScheme: values.colorScheme as 'light' | 'dark',
        reducedMotion: values.reducedMotion as 'no-preference' | 'reduce',
      },
    };
  });
}
```

## Test Case Prioritization

```typescript
interface PrioritizedTestCase extends TestCombination {
  priority: number;
  riskScore: number;
}

function prioritizeTestCases(
  testCases: TestCombination[],
  riskFactors: Record<string, Record<string, number>>
): PrioritizedTestCase[] {
  return testCases
    .map((tc) => {
      let riskScore = 0;

      for (const [param, value] of Object.entries(tc.values)) {
        if (riskFactors[param] && riskFactors[param][String(value)]) {
          riskScore += riskFactors[param][String(value)];
        }
      }

      return {
        ...tc,
        riskScore,
        priority: 0,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .map((tc, index) => ({ ...tc, priority: index + 1 }));
}

// Define risk factors based on defect history
const riskFactors: Record<string, Record<string, number>> = {
  browser: {
    'Safari': 8,     // High: historically most bugs
    'Firefox': 5,    // Medium: occasional issues
    'Chrome': 2,     // Low: primary dev browser
    'Edge': 3,       // Low-medium
  },
  os: {
    'Linux': 6,      // Higher risk: less tested
    'Windows': 3,    // Moderate
    'macOS': 2,      // Low: dev team uses macOS
  },
  authMethod: {
    'MFA': 9,        // Very high: complex flow
    'SSO': 7,        // High: external dependency
    'Password': 2,   // Low: simple flow
  },
};

const prioritized = prioritizeTestCases(testCases, riskFactors);

// Run high-priority tests first in CI
const smokeTests = prioritized.filter((tc) => tc.priority <= 5);
const fullTests = prioritized;
```

## Configuration

### Pairwise Configuration File

```typescript
// pairwise.config.ts
import { PairwiseConfig } from './tests/combinatorial/generators/pairwise-generator';

export interface ProjectPairwiseConfig {
  defaultStrength: number;
  maxTestCases: number;
  outputDir: string;
  reportFormat: 'json' | 'csv' | 'html';
  suites: Record<string, PairwiseConfig>;
}

const config: ProjectPairwiseConfig = {
  defaultStrength: 2,
  maxTestCases: 100,
  outputDir: './tests/combinatorial/generated',
  reportFormat: 'json',
  suites: {
    login: {
      parameters: [
        { name: 'browser', values: ['Chrome', 'Firefox', 'Safari'] },
        { name: 'os', values: ['Windows', 'macOS', 'Linux'] },
        { name: 'authMethod', values: ['Password', 'SSO', 'MFA'] },
      ],
      coverageStrength: 2,
    },
    checkout: {
      parameters: [
        { name: 'paymentMethod', values: ['credit_card', 'paypal', 'apple_pay'] },
        { name: 'shippingMethod', values: ['standard', 'express', 'overnight'] },
        { name: 'currency', values: ['USD', 'EUR', 'GBP'] },
        { name: 'userType', values: ['guest', 'registered', 'premium'] },
      ],
      coverageStrength: 2,
      constraints: [
        {
          description: 'Apple Pay only for registered/premium users',
          condition: (combo) =>
            combo.paymentMethod !== 'apple_pay' || combo.userType !== 'guest',
        },
      ],
    },
  },
};

export default config;
```

## Comparison with Exhaustive Testing

```typescript
function compareApproaches(parameters: Parameter[]): void {
  const exhaustiveCount = parameters.reduce(
    (total, param) => total * param.values.length,
    1
  );

  const pairwiseGen = new PairwiseGenerator({ parameters });
  const pairwiseCases = pairwiseGen.generate();
  const pairwiseCount = pairwiseCases.length;

  const report = pairwiseGen.getCoverageReport(pairwiseCases);

  console.log('=== Testing Approach Comparison ===');
  console.log(`Parameters: ${parameters.length}`);
  console.log(`Total parameter values: ${parameters.reduce((s, p) => s + p.values.length, 0)}`);
  console.log('');
  console.log(`Exhaustive: ${exhaustiveCount} test cases (100% coverage)`);
  console.log(`Pairwise:   ${pairwiseCount} test cases (${report.coveragePercentage.toFixed(1)}% pair coverage)`);
  console.log(`Reduction:  ${((1 - pairwiseCount / exhaustiveCount) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`Estimated defect detection with pairwise: ~93%`);
  console.log(`Cost per additional % detection increases exponentially`);
}
```

## Best Practices

1. **Start with parameter identification** -- Before generating combinations, invest time identifying all relevant parameters and their valid values. Missing a parameter means missing potential defect interactions.
2. **Model constraints explicitly** -- Never rely on the test runner to skip invalid combinations at runtime. Build constraints into the generator so every produced test case is executable.
3. **Use seeded randomness** -- Pairwise algorithms involve randomization. Always seed the random number generator to ensure the same parameter specification produces the same test suite across runs.
4. **Combine with equivalence partitioning** -- Choose parameter values that represent equivalence classes (valid minimum, valid maximum, invalid below minimum, typical value) rather than arbitrary values.
5. **Include boundary values** -- For numeric and string parameters, include boundary values (0, -1, MAX_INT, empty string, max-length string) alongside typical values in the parameter space.
6. **Review generated combinations** -- Always manually review the generated test cases. Automated generation can miss domain-specific insights that an experienced tester would catch.
7. **Track coverage metrics** -- Measure and report pair coverage percentage after generation. Anything below 100% pair coverage indicates the algorithm did not converge and needs investigation.
8. **Separate functional and environmental parameters** -- Group parameters into functional (input values, user actions) and environmental (browser, OS, locale) categories. Generate pairwise sets for each group independently if full cross-product is not needed.
9. **Re-generate when parameters change** -- When a new parameter value is added (e.g., a new browser version), re-run the generator rather than manually adding test cases. Manual additions break coverage guarantees.
10. **Use 3-way coverage for critical paths** -- For payment processing, authentication, and other high-risk areas, increase coverage strength from 2-way to 3-way. The additional test cases are a worthwhile investment.
11. **Document the parameter model** -- Store the parameter definitions and constraints in version control alongside the tests. The model is as important as the generated tests.
12. **Integrate into CI pipelines** -- Run pairwise test generation as a build step. If parameters change in the specification, the CI pipeline automatically regenerates and runs the updated test suite.

## Anti-Patterns to Avoid

1. **Using pairwise when exhaustive is feasible** -- If the total combination count is under 50, exhaustive testing is preferable. Pairwise shines when the combination space is in the hundreds or thousands.
2. **Ignoring constraints** -- Generating test cases with impossible parameter combinations (Safari on Linux, MFA for anonymous users) wastes execution time and produces false failures that erode team confidence.
3. **Treating pairwise as sufficient coverage** -- Pairwise catches interaction bugs between pairs but does not replace boundary value analysis, equivalence partitioning, or domain-specific scenario testing.
4. **Hardcoding generated test cases** -- Never copy-paste generated test data into test files and forget the generator. When parameters change, the hardcoded data becomes stale.
5. **Over-parameterizing** -- Including too many parameters with too many values leads to large test suites that defeat the purpose of pairwise optimization. Focus on the parameters most likely to interact.
6. **Skipping negative values** -- Pairwise testing is not just for valid inputs. Include invalid and boundary values as parameter options to test error handling interactions.

## Debugging Tips

1. **Verify pair coverage manually** -- When a defect escapes, check whether the specific parameter pair that triggered it was actually covered in the generated test suite. Use the coverage report to confirm.
2. **Log parameter combinations on failure** -- When a parameterized test fails, log the complete parameter combination in the failure message. Without this, correlating the failure to a specific combination is difficult.
3. **Check constraint conflicts** -- If the generator produces fewer test cases than expected or fails to reach 100% pair coverage, inspect the constraints for conflicts that eliminate too many valid combinations.
4. **Compare against known tools** -- Validate your custom generator against established tools like PICT (Microsoft), AllPairs, or Jenny. Run the same parameter set through both and compare coverage.
5. **Isolate failing pairs** -- When a pairwise test case with multiple parameters fails, systematically isolate which specific pair triggers the defect by running single-pair test cases.
6. **Monitor generation time** -- If the generator takes more than a few seconds for a typical parameter set, the algorithm may be inefficient. Profile and optimize the candidate selection loop.
7. **Validate determinism** -- Run the generator twice with the same input and seed. If results differ, there is an unseeded random source that will cause non-deterministic test suites.