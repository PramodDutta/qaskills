---
name: Test Case Generator from User Stories
description: Automatically generate comprehensive test cases from user stories and acceptance criteria using BDD patterns, equivalence partitioning, and risk-based prioritization
version: 1.0.0
author: Pramod
license: MIT
tags: [test-generation, user-stories, bdd, acceptance-criteria, gherkin, test-design, equivalence-partitioning, risk-based]
testingTypes: [bdd, tdd]
frameworks: [cucumber]
languages: [typescript, javascript, python, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Test Case Generator from User Stories Skill

You are an expert QA engineer specializing in systematic test case generation from user stories and acceptance criteria. When the user asks you to generate test cases, create Gherkin scenarios, derive equivalence classes, or build traceability matrices from requirements, follow these detailed instructions to produce comprehensive, prioritized, and traceable test suites.

## Core Principles

1. **Parse before generating** -- Before writing any test case, fully parse the user story format ("As a... I want... So that...") and extract every testable acceptance criterion. Missing this step leads to incomplete coverage.
2. **Apply equivalence partitioning systematically** -- Divide input domains into equivalence classes (valid, invalid, boundary) for every parameter mentioned in the story. Each class needs at least one representative test case.
3. **Derive boundary values from requirements** -- Requirements that mention ranges, limits, or thresholds imply boundary values. Extract and test at the boundary, one below, and one above.
4. **Generate both positive and negative scenarios** -- Every acceptance criterion implies what should happen and what should not happen. Generate explicit negative test cases for every positive scenario.
5. **Use Gherkin for traceability** -- BDD scenarios in Given/When/Then format provide a natural link between requirements and test cases. Every scenario should trace back to a specific acceptance criterion.
6. **Prioritize by risk, not by order** -- Not all test cases have equal value. Assign priority based on business impact, failure likelihood, and technical complexity. High-risk scenarios run first.
7. **Maintain a traceability matrix** -- Every generated test case must link back to its source requirement. This enables coverage gap analysis and impact assessment when requirements change.
8. **Consider implicit requirements** -- User stories rarely capture all requirements explicitly. Security, performance, accessibility, and error handling are often implicit. Generate test cases for these cross-cutting concerns.

## Project Structure

```
tests/
  generated/
    features/
      user-authentication.feature
      shopping-cart.feature
      payment-processing.feature
    step-definitions/
      user-authentication.steps.ts
      shopping-cart.steps.ts
      payment-processing.steps.ts
    equivalence-classes/
      authentication-classes.ts
      cart-classes.ts
      payment-classes.ts
    traceability/
      traceability-matrix.json
      coverage-report.ts
  generators/
    story-parser.ts
    scenario-generator.ts
    equivalence-generator.ts
    boundary-generator.ts
    negative-scenario-generator.ts
    priority-calculator.ts
    traceability-builder.ts
    gherkin-formatter.ts
  fixtures/
    sample-stories.ts
    domain-rules.ts
  utils/
    nlp-helpers.ts
    gherkin-validator.ts
cucumber.config.ts
```

## Configuration

```typescript
// cucumber.config.ts
export default {
  default: {
    paths: ['tests/generated/features/**/*.feature'],
    require: ['tests/generated/step-definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    publishQuiet: true,
  },
};
```

```typescript
// tests/fixtures/sample-stories.ts

export interface UserStory {
  id: string;
  title: string;
  narrative: {
    asA: string;
    iWant: string;
    soThat: string;
  };
  acceptanceCriteria: AcceptanceCriterion[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface AcceptanceCriterion {
  id: string;
  given: string;
  when: string;
  then: string;
  rules?: string[];
}

export const sampleStories: UserStory[] = [
  {
    id: 'US-101',
    title: 'User Registration',
    narrative: {
      asA: 'new visitor',
      iWant: 'to create an account with my email and password',
      soThat: 'I can access personalized features',
    },
    acceptanceCriteria: [
      {
        id: 'AC-101-1',
        given: 'I am on the registration page',
        when: 'I submit a valid email and password',
        then: 'my account is created and I am logged in',
        rules: [
          'Email must be a valid email format',
          'Password must be 8-64 characters',
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          'Email must not already be registered',
        ],
      },
      {
        id: 'AC-101-2',
        given: 'I am on the registration page',
        when: 'I submit an email that is already registered',
        then: 'I see an error message without revealing whether the email exists',
      },
      {
        id: 'AC-101-3',
        given: 'I am on the registration page',
        when: 'I submit a password that does not meet requirements',
        then: 'I see specific validation messages for each unmet requirement',
      },
    ],
    priority: 'critical',
    tags: ['authentication', 'registration'],
  },
  {
    id: 'US-102',
    title: 'Add Item to Shopping Cart',
    narrative: {
      asA: 'logged-in customer',
      iWant: 'to add products to my shopping cart',
      soThat: 'I can purchase them later',
    },
    acceptanceCriteria: [
      {
        id: 'AC-102-1',
        given: 'I am viewing a product detail page',
        when: 'I click "Add to Cart" with a valid quantity',
        then: 'the item is added to my cart and the cart count updates',
        rules: [
          'Quantity must be between 1 and 99',
          'Item must be in stock',
          'Cart total must not exceed 50 items',
        ],
      },
      {
        id: 'AC-102-2',
        given: 'I am viewing a product that is out of stock',
        when: 'I attempt to add it to my cart',
        then: 'the Add to Cart button is disabled and I see an "Out of Stock" message',
      },
    ],
    priority: 'high',
    tags: ['shopping', 'cart'],
  },
];
```

## How-To Guides

### Parsing User Stories and Extracting Testable Criteria

The first step in test generation is systematically parsing user stories to identify all testable aspects.

```typescript
// tests/generators/story-parser.ts

import { UserStory, AcceptanceCriterion } from '../fixtures/sample-stories';

export interface ParsedStory {
  storyId: string;
  actor: string;
  action: string;
  benefit: string;
  criteria: ParsedCriterion[];
  implicitRequirements: string[];
}

export interface ParsedCriterion {
  criterionId: string;
  preconditions: string[];
  trigger: string;
  expectedOutcome: string;
  businessRules: string[];
  inputParameters: InputParameter[];
}

export interface InputParameter {
  name: string;
  type: 'string' | 'number' | 'email' | 'date' | 'enum' | 'boolean';
  constraints: string[];
  extractedFrom: string;
}

/**
 * Parse a user story into structured, testable components.
 */
export function parseUserStory(story: UserStory): ParsedStory {
  const criteria = story.acceptanceCriteria.map((ac) => parseCriterion(ac));

  // Extract implicit requirements that are not stated but should be tested
  const implicitRequirements = deriveImplicitRequirements(story);

  return {
    storyId: story.id,
    actor: story.narrative.asA,
    action: story.narrative.iWant,
    benefit: story.narrative.soThat,
    criteria,
    implicitRequirements,
  };
}

function parseCriterion(ac: AcceptanceCriterion): ParsedCriterion {
  const inputParameters = extractInputParameters(ac);

  return {
    criterionId: ac.id,
    preconditions: [ac.given],
    trigger: ac.when,
    expectedOutcome: ac.then,
    businessRules: ac.rules || [],
    inputParameters,
  };
}

function extractInputParameters(ac: AcceptanceCriterion): InputParameter[] {
  const params: InputParameter[] = [];

  // Parse rules to extract input constraints
  for (const rule of ac.rules || []) {
    // Pattern: "X must be Y-Z characters"
    const charLengthMatch = rule.match(/(\w+)\s+must\s+be\s+(\d+)-(\d+)\s+characters/i);
    if (charLengthMatch) {
      params.push({
        name: charLengthMatch[1].toLowerCase(),
        type: 'string',
        constraints: [`minLength:${charLengthMatch[2]}`, `maxLength:${charLengthMatch[3]}`],
        extractedFrom: rule,
      });
    }

    // Pattern: "X must be a valid email"
    const emailMatch = rule.match(/(\w+)\s+must\s+be\s+a\s+valid\s+email/i);
    if (emailMatch) {
      params.push({
        name: emailMatch[1].toLowerCase(),
        type: 'email',
        constraints: ['validFormat'],
        extractedFrom: rule,
      });
    }

    // Pattern: "X must be between Y and Z"
    const rangeMatch = rule.match(/(\w+)\s+must\s+be\s+between\s+(\d+)\s+and\s+(\d+)/i);
    if (rangeMatch) {
      params.push({
        name: rangeMatch[1].toLowerCase(),
        type: 'number',
        constraints: [`min:${rangeMatch[2]}`, `max:${rangeMatch[3]}`],
        extractedFrom: rule,
      });
    }

    // Pattern: "must contain at least one X"
    const containsMatch = rule.match(/must\s+contain\s+at\s+least\s+one\s+([\w\s]+)/i);
    if (containsMatch) {
      params.push({
        name: containsMatch[1].trim().replace(/\s+/g, '_'),
        type: 'string',
        constraints: [`contains:${containsMatch[1].trim()}`],
        extractedFrom: rule,
      });
    }
  }

  return params;
}

function deriveImplicitRequirements(story: UserStory): string[] {
  const implicit: string[] = [];

  // Security: all forms need CSRF protection
  if (story.acceptanceCriteria.some((ac) => ac.when.includes('submit'))) {
    implicit.push('Form submission must include CSRF token validation');
  }

  // Accessibility: all interactive elements need keyboard support
  implicit.push('All interactive elements must be keyboard accessible');

  // Performance: page load within budget
  implicit.push('Page must load within 3 seconds');

  // Error handling: generic error fallback
  implicit.push('Server errors must show user-friendly error message');

  // Authentication stories need rate limiting
  if (story.tags?.includes('authentication')) {
    implicit.push('Authentication endpoints must have rate limiting');
    implicit.push('Failed attempts must not reveal whether the account exists');
  }

  return implicit;
}
```

### Generating Equivalence Classes

Equivalence partitioning divides input domains into classes where all values in a class are expected to produce the same behavior. This reduces the number of test cases while maintaining coverage.

```typescript
// tests/generators/equivalence-generator.ts

import { InputParameter, ParsedCriterion } from './story-parser';

export interface EquivalenceClass {
  parameterId: string;
  parameterName: string;
  className: string;
  type: 'valid' | 'invalid' | 'boundary';
  representative: string | number;
  description: string;
}

/**
 * Generate equivalence classes for all input parameters of a parsed criterion.
 */
export function generateEquivalenceClasses(
  criterion: ParsedCriterion
): EquivalenceClass[] {
  const classes: EquivalenceClass[] = [];

  for (const param of criterion.inputParameters) {
    classes.push(...generateClassesForParameter(param));
  }

  return classes;
}

function generateClassesForParameter(param: InputParameter): EquivalenceClass[] {
  const classes: EquivalenceClass[] = [];
  const baseName = param.name;

  switch (param.type) {
    case 'email':
      classes.push(
        { parameterId: baseName, parameterName: baseName, className: 'Valid email', type: 'valid', representative: 'user@example.com', description: 'Standard email format' },
        { parameterId: baseName, parameterName: baseName, className: 'Email with subdomain', type: 'valid', representative: 'user@mail.example.com', description: 'Email with subdomain' },
        { parameterId: baseName, parameterName: baseName, className: 'Email with plus alias', type: 'valid', representative: 'user+tag@example.com', description: 'Email with plus addressing' },
        { parameterId: baseName, parameterName: baseName, className: 'Missing @ symbol', type: 'invalid', representative: 'userexample.com', description: 'Email without @ symbol' },
        { parameterId: baseName, parameterName: baseName, className: 'Missing domain', type: 'invalid', representative: 'user@', description: 'Email without domain' },
        { parameterId: baseName, parameterName: baseName, className: 'Missing local part', type: 'invalid', representative: '@example.com', description: 'Email without local part' },
        { parameterId: baseName, parameterName: baseName, className: 'Double dots', type: 'invalid', representative: 'user@example..com', description: 'Domain with consecutive dots' },
        { parameterId: baseName, parameterName: baseName, className: 'Empty string', type: 'invalid', representative: '', description: 'Empty email field' },
      );
      break;

    case 'string': {
      const minLength = extractConstraintValue(param.constraints, 'minLength');
      const maxLength = extractConstraintValue(param.constraints, 'maxLength');

      if (minLength !== null && maxLength !== null) {
        classes.push(
          { parameterId: baseName, parameterName: baseName, className: 'At minimum length', type: 'boundary', representative: 'a'.repeat(minLength), description: `Exactly ${minLength} characters` },
          { parameterId: baseName, parameterName: baseName, className: 'Below minimum', type: 'invalid', representative: 'a'.repeat(Math.max(0, minLength - 1)), description: `${minLength - 1} characters` },
          { parameterId: baseName, parameterName: baseName, className: 'At maximum length', type: 'boundary', representative: 'a'.repeat(maxLength), description: `Exactly ${maxLength} characters` },
          { parameterId: baseName, parameterName: baseName, className: 'Above maximum', type: 'invalid', representative: 'a'.repeat(maxLength + 1), description: `${maxLength + 1} characters` },
          { parameterId: baseName, parameterName: baseName, className: 'Mid-range valid', type: 'valid', representative: 'a'.repeat(Math.floor((minLength + maxLength) / 2)), description: 'Middle of valid range' },
          { parameterId: baseName, parameterName: baseName, className: 'Empty string', type: 'invalid', representative: '', description: 'Empty field' },
        );
      }
      break;
    }

    case 'number': {
      const min = extractConstraintValue(param.constraints, 'min');
      const max = extractConstraintValue(param.constraints, 'max');

      if (min !== null && max !== null) {
        classes.push(
          { parameterId: baseName, parameterName: baseName, className: 'Minimum value', type: 'boundary', representative: min, description: `Exactly ${min}` },
          { parameterId: baseName, parameterName: baseName, className: 'Below minimum', type: 'invalid', representative: min - 1, description: `${min - 1} (below minimum)` },
          { parameterId: baseName, parameterName: baseName, className: 'Maximum value', type: 'boundary', representative: max, description: `Exactly ${max}` },
          { parameterId: baseName, parameterName: baseName, className: 'Above maximum', type: 'invalid', representative: max + 1, description: `${max + 1} (above maximum)` },
          { parameterId: baseName, parameterName: baseName, className: 'Mid-range valid', type: 'valid', representative: Math.floor((min + max) / 2), description: 'Middle of valid range' },
          { parameterId: baseName, parameterName: baseName, className: 'Zero', type: min > 0 ? 'invalid' : 'valid', representative: 0, description: 'Zero value' },
          { parameterId: baseName, parameterName: baseName, className: 'Negative', type: 'invalid', representative: -1, description: 'Negative value' },
        );
      }
      break;
    }
  }

  return classes;
}

function extractConstraintValue(constraints: string[], prefix: string): number | null {
  const constraint = constraints.find((c) => c.startsWith(`${prefix}:`));
  if (!constraint) return null;
  return parseInt(constraint.split(':')[1], 10);
}
```

### Generating Gherkin Scenarios from Parsed Stories

Transform parsed user stories and equivalence classes into Gherkin feature files with complete Given/When/Then scenarios.

```typescript
// tests/generators/gherkin-formatter.ts

import { ParsedStory, ParsedCriterion } from './story-parser';
import { EquivalenceClass, generateEquivalenceClasses } from './equivalence-generator';

/**
 * Generate a complete Gherkin feature file from a parsed user story.
 */
export function generateFeatureFile(story: ParsedStory): string {
  const lines: string[] = [];

  // Feature header
  lines.push(`@${story.storyId.replace(/[^a-zA-Z0-9]/g, '-')}`);
  lines.push(`Feature: ${story.action}`);
  lines.push(`  As a ${story.actor}`);
  lines.push(`  I want ${story.action}`);
  lines.push(`  So that ${story.benefit}`);
  lines.push('');

  // Background (common preconditions)
  const commonPreconditions = extractCommonPreconditions(story.criteria);
  if (commonPreconditions.length > 0) {
    lines.push('  Background:');
    for (const precondition of commonPreconditions) {
      lines.push(`    Given ${precondition}`);
    }
    lines.push('');
  }

  // Generate scenarios for each criterion
  for (const criterion of story.criteria) {
    // Positive scenario
    lines.push(...generatePositiveScenario(criterion));
    lines.push('');

    // Negative scenarios from equivalence classes
    const eqClasses = generateEquivalenceClasses(criterion);
    const invalidClasses = eqClasses.filter((ec) => ec.type === 'invalid');

    for (const invalidClass of invalidClasses) {
      lines.push(...generateNegativeScenario(criterion, invalidClass));
      lines.push('');
    }

    // Boundary scenarios
    const boundaryClasses = eqClasses.filter((ec) => ec.type === 'boundary');
    if (boundaryClasses.length > 0) {
      lines.push(...generateBoundaryScenarioOutline(criterion, boundaryClasses));
      lines.push('');
    }
  }

  // Implicit requirement scenarios
  for (const implicit of story.implicitRequirements) {
    lines.push(`  @implicit @non-functional`);
    lines.push(`  Scenario: ${implicit}`);
    lines.push(`    Given the application is running`);
    lines.push(`    Then ${implicit.toLowerCase()}`);
    lines.push('');
  }

  return lines.join('\n');
}

function generatePositiveScenario(criterion: ParsedCriterion): string[] {
  const lines: string[] = [];

  lines.push(`  @${criterion.criterionId.replace(/[^a-zA-Z0-9]/g, '-')} @positive`);
  lines.push(`  Scenario: ${criterion.trigger} - happy path`);

  for (const precondition of criterion.preconditions) {
    lines.push(`    Given ${precondition}`);
  }

  lines.push(`    When ${criterion.trigger}`);
  lines.push(`    Then ${criterion.expectedOutcome}`);

  for (const rule of criterion.businessRules) {
    lines.push(`    And ${rule}`);
  }

  return lines;
}

function generateNegativeScenario(
  criterion: ParsedCriterion,
  invalidClass: EquivalenceClass
): string[] {
  const lines: string[] = [];

  lines.push(`  @${criterion.criterionId.replace(/[^a-zA-Z0-9]/g, '-')} @negative`);
  lines.push(
    `  Scenario: Reject ${invalidClass.parameterName} - ${invalidClass.className}`
  );

  for (const precondition of criterion.preconditions) {
    lines.push(`    Given ${precondition}`);
  }

  lines.push(
    `    When I provide ${invalidClass.parameterName} as "${invalidClass.representative}"`
  );
  lines.push(
    `    Then I should see a validation error for ${invalidClass.parameterName}`
  );
  lines.push(`    And the ${invalidClass.parameterName} error explains "${invalidClass.description}"`);

  return lines;
}

function generateBoundaryScenarioOutline(
  criterion: ParsedCriterion,
  boundaryClasses: EquivalenceClass[]
): string[] {
  const lines: string[] = [];

  lines.push(`  @${criterion.criterionId.replace(/[^a-zA-Z0-9]/g, '-')} @boundary`);
  lines.push(`  Scenario Outline: Boundary values for ${criterion.trigger}`);

  for (const precondition of criterion.preconditions) {
    lines.push(`    Given ${precondition}`);
  }

  lines.push(`    When I provide <parameter> as "<value>"`);
  lines.push(`    Then the result should be "<expected>"`);
  lines.push('');
  lines.push('    Examples:');
  lines.push('      | parameter | value | expected |');

  for (const boundary of boundaryClasses) {
    lines.push(
      `      | ${boundary.parameterName} | ${boundary.representative} | accepted |`
    );
  }

  return lines;
}

function extractCommonPreconditions(criteria: ParsedCriterion[]): string[] {
  if (criteria.length < 2) return [];

  const allPreconditions = criteria.map((c) => c.preconditions);
  return allPreconditions[0].filter((p) =>
    allPreconditions.every((pList) => pList.includes(p))
  );
}
```

### Generating Cucumber Step Definitions

Create step definition templates that connect Gherkin scenarios to executable test code.

```typescript
// tests/generators/scenario-generator.ts

import { ParsedStory } from './story-parser';

/**
 * Generate Cucumber step definitions for a parsed user story.
 */
export function generateStepDefinitions(story: ParsedStory): string {
  const lines: string[] = [];

  lines.push(`import { Given, When, Then } from '@cucumber/cucumber';`);
  lines.push(`import { expect } from '@playwright/test';`);
  lines.push(`import { page } from '../support/world';`);
  lines.push('');

  const steps = new Set<string>();

  for (const criterion of story.criteria) {
    // Given steps
    for (const precondition of criterion.preconditions) {
      const stepKey = `Given:${precondition}`;
      if (!steps.has(stepKey)) {
        steps.add(stepKey);
        lines.push(`Given('${escapeGherkin(precondition)}', async function () {`);
        lines.push(`  // Navigate to the appropriate page`);
        lines.push(`  await page.goto('/');`);
        lines.push(`  // TODO: Implement precondition setup`);
        lines.push(`});`);
        lines.push('');
      }
    }

    // When steps
    const whenKey = `When:${criterion.trigger}`;
    if (!steps.has(whenKey)) {
      steps.add(whenKey);
      lines.push(`When('${escapeGherkin(criterion.trigger)}', async function () {`);
      lines.push(`  // TODO: Implement action`);
      lines.push(`});`);
      lines.push('');
    }

    // Then steps
    const thenKey = `Then:${criterion.expectedOutcome}`;
    if (!steps.has(thenKey)) {
      steps.add(thenKey);
      lines.push(`Then('${escapeGherkin(criterion.expectedOutcome)}', async function () {`);
      lines.push(`  // TODO: Implement assertion`);
      lines.push(`});`);
      lines.push('');
    }
  }

  // Parameterized steps for equivalence classes
  lines.push(`When('I provide {word} as {string}', async function (parameter: string, value: string) {`);
  lines.push(`  const input = page.getByTestId(\`input-\${parameter}\`);`);
  lines.push(`  await input.clear();`);
  lines.push(`  await input.fill(value);`);
  lines.push(`});`);
  lines.push('');

  lines.push(`Then('I should see a validation error for {word}', async function (parameter: string) {`);
  lines.push(`  const error = page.getByTestId(\`error-\${parameter}\`);`);
  lines.push(`  await expect(error).toBeVisible();`);
  lines.push(`});`);
  lines.push('');

  lines.push(`Then('the {word} error explains {string}', async function (parameter: string, message: string) {`);
  lines.push(`  const error = page.getByTestId(\`error-\${parameter}\`);`);
  lines.push(`  const text = await error.textContent();`);
  lines.push(`  expect(text).toBeTruthy();`);
  lines.push(`});`);

  return lines.join('\n');
}

function escapeGherkin(text: string): string {
  return text.replace(/'/g, "\\'");
}
```

### Building a Risk-Based Priority Calculator

Not all test cases are equally important. This calculator assigns priority based on business impact, failure probability, and complexity.

```typescript
// tests/generators/priority-calculator.ts

export interface RiskAssessment {
  scenarioId: string;
  businessImpact: 1 | 2 | 3 | 4 | 5;  // 5 = critical
  failureLikelihood: 1 | 2 | 3 | 4 | 5; // 5 = very likely
  complexity: 1 | 2 | 3 | 4 | 5;        // 5 = very complex
  riskScore: number;
  priority: 'P0-critical' | 'P1-high' | 'P2-medium' | 'P3-low';
}

export function calculateRiskPriority(
  scenarioId: string,
  storyPriority: 'critical' | 'high' | 'medium' | 'low',
  scenarioType: 'positive' | 'negative' | 'boundary' | 'implicit',
  affectsPayment: boolean,
  affectsAuth: boolean,
  affectsData: boolean
): RiskAssessment {
  // Business impact based on story priority and scenario characteristics
  let businessImpact: 1 | 2 | 3 | 4 | 5 = 1;
  const priorityMap = { critical: 5, high: 4, medium: 3, low: 2 } as const;
  businessImpact = priorityMap[storyPriority] as 1 | 2 | 3 | 4 | 5;

  if (affectsPayment) businessImpact = 5;
  if (affectsAuth) businessImpact = Math.max(businessImpact, 4) as 1 | 2 | 3 | 4 | 5;

  // Failure likelihood based on scenario type
  let failureLikelihood: 1 | 2 | 3 | 4 | 5 = 2;
  switch (scenarioType) {
    case 'boundary':
      failureLikelihood = 4; // Boundary cases are error-prone
      break;
    case 'negative':
      failureLikelihood = 3; // Negative paths are often under-tested
      break;
    case 'implicit':
      failureLikelihood = 3; // Implicit requirements are often missed
      break;
    case 'positive':
      failureLikelihood = 2; // Happy paths are usually tested
      break;
  }

  // Complexity
  let complexity: 1 | 2 | 3 | 4 | 5 = 2;
  if (affectsPayment) complexity = 5;
  if (affectsData && affectsAuth) complexity = 4;

  // Risk score: weighted combination
  const riskScore =
    businessImpact * 0.5 + failureLikelihood * 0.3 + complexity * 0.2;

  // Priority classification
  let priority: RiskAssessment['priority'];
  if (riskScore >= 4.0) priority = 'P0-critical';
  else if (riskScore >= 3.0) priority = 'P1-high';
  else if (riskScore >= 2.0) priority = 'P2-medium';
  else priority = 'P3-low';

  return {
    scenarioId,
    businessImpact,
    failureLikelihood,
    complexity,
    riskScore: Math.round(riskScore * 100) / 100,
    priority,
  };
}
```

### Building a Traceability Matrix

A traceability matrix links every test case to its source requirement, enabling coverage analysis and change impact assessment.

```typescript
// tests/generators/traceability-builder.ts

import { ParsedStory } from './story-parser';
import { EquivalenceClass } from './equivalence-generator';

export interface TraceabilityEntry {
  testCaseId: string;
  storyId: string;
  criterionId: string;
  scenarioType: 'positive' | 'negative' | 'boundary' | 'implicit';
  scenarioTitle: string;
  priority: string;
  equivalenceClass?: string;
  featureFile: string;
  status: 'generated' | 'implemented' | 'passing' | 'failing' | 'skipped';
}

export interface TraceabilityMatrix {
  generated: string;
  totalStories: number;
  totalCriteria: number;
  totalTestCases: number;
  coverageByStory: Record<string, { total: number; implemented: number; passing: number }>;
  entries: TraceabilityEntry[];
}

export function buildTraceabilityMatrix(
  stories: ParsedStory[],
  equivalenceClasses: Map<string, EquivalenceClass[]>
): TraceabilityMatrix {
  const entries: TraceabilityEntry[] = [];
  let testCaseCounter = 1;
  let totalCriteria = 0;

  for (const story of stories) {
    for (const criterion of story.criteria) {
      totalCriteria++;

      // Positive scenario
      entries.push({
        testCaseId: `TC-${String(testCaseCounter++).padStart(3, '0')}`,
        storyId: story.storyId,
        criterionId: criterion.criterionId,
        scenarioType: 'positive',
        scenarioTitle: `${criterion.trigger} - happy path`,
        priority: 'P1-high',
        featureFile: `${story.storyId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.feature`,
        status: 'generated',
      });

      // Equivalence class scenarios
      const classes = equivalenceClasses.get(criterion.criterionId) || [];
      for (const ec of classes) {
        entries.push({
          testCaseId: `TC-${String(testCaseCounter++).padStart(3, '0')}`,
          storyId: story.storyId,
          criterionId: criterion.criterionId,
          scenarioType: ec.type === 'invalid' ? 'negative' : 'boundary',
          scenarioTitle: `${ec.parameterName} - ${ec.className}`,
          priority: ec.type === 'boundary' ? 'P1-high' : 'P2-medium',
          equivalenceClass: ec.className,
          featureFile: `${story.storyId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.feature`,
          status: 'generated',
        });
      }
    }

    // Implicit requirements
    for (const implicit of story.implicitRequirements) {
      entries.push({
        testCaseId: `TC-${String(testCaseCounter++).padStart(3, '0')}`,
        storyId: story.storyId,
        criterionId: 'implicit',
        scenarioType: 'implicit',
        scenarioTitle: implicit,
        priority: 'P2-medium',
        featureFile: `${story.storyId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.feature`,
        status: 'generated',
      });
    }
  }

  // Build coverage summary
  const coverageByStory: Record<string, { total: number; implemented: number; passing: number }> = {};
  for (const entry of entries) {
    if (!coverageByStory[entry.storyId]) {
      coverageByStory[entry.storyId] = { total: 0, implemented: 0, passing: 0 };
    }
    coverageByStory[entry.storyId].total++;
    if (entry.status === 'implemented' || entry.status === 'passing') {
      coverageByStory[entry.storyId].implemented++;
    }
    if (entry.status === 'passing') {
      coverageByStory[entry.storyId].passing++;
    }
  }

  return {
    generated: new Date().toISOString(),
    totalStories: stories.length,
    totalCriteria,
    totalTestCases: entries.length,
    coverageByStory,
    entries,
  };
}
```

### Python Implementation: Generating Test Cases from User Stories

For teams using Python with pytest-bdd, here is the equivalent test generation approach.

```python
# tests/generators/story_parser.py

from dataclasses import dataclass, field
import re


@dataclass
class InputParameter:
    name: str
    param_type: str  # 'string', 'number', 'email', 'date'
    constraints: list[str] = field(default_factory=list)
    extracted_from: str = ""


@dataclass
class ParsedCriterion:
    criterion_id: str
    preconditions: list[str]
    trigger: str
    expected_outcome: str
    business_rules: list[str]
    input_parameters: list[InputParameter]


@dataclass
class ParsedStory:
    story_id: str
    actor: str
    action: str
    benefit: str
    criteria: list[ParsedCriterion]
    implicit_requirements: list[str]


def parse_user_story(story: dict) -> ParsedStory:
    """Parse a user story dictionary into structured components."""
    criteria = []
    for ac in story.get("acceptance_criteria", []):
        params = extract_input_parameters(ac.get("rules", []))
        criteria.append(
            ParsedCriterion(
                criterion_id=ac["id"],
                preconditions=[ac["given"]],
                trigger=ac["when"],
                expected_outcome=ac["then"],
                business_rules=ac.get("rules", []),
                input_parameters=params,
            )
        )

    implicit = derive_implicit_requirements(story)

    return ParsedStory(
        story_id=story["id"],
        actor=story["narrative"]["as_a"],
        action=story["narrative"]["i_want"],
        benefit=story["narrative"]["so_that"],
        criteria=criteria,
        implicit_requirements=implicit,
    )


def extract_input_parameters(rules: list[str]) -> list[InputParameter]:
    """Extract input parameters and their constraints from business rules."""
    params = []

    for rule in rules:
        # Pattern: "X must be Y-Z characters"
        char_match = re.search(
            r"(\w+)\s+must\s+be\s+(\d+)-(\d+)\s+characters", rule, re.IGNORECASE
        )
        if char_match:
            params.append(
                InputParameter(
                    name=char_match.group(1).lower(),
                    param_type="string",
                    constraints=[
                        f"min_length:{char_match.group(2)}",
                        f"max_length:{char_match.group(3)}",
                    ],
                    extracted_from=rule,
                )
            )

        # Pattern: "X must be between Y and Z"
        range_match = re.search(
            r"(\w+)\s+must\s+be\s+between\s+(\d+)\s+and\s+(\d+)", rule, re.IGNORECASE
        )
        if range_match:
            params.append(
                InputParameter(
                    name=range_match.group(1).lower(),
                    param_type="number",
                    constraints=[
                        f"min:{range_match.group(2)}",
                        f"max:{range_match.group(3)}",
                    ],
                    extracted_from=rule,
                )
            )

    return params


def derive_implicit_requirements(story: dict) -> list[str]:
    """Derive implicit requirements from story context."""
    implicit = [
        "All interactive elements must be keyboard accessible",
        "Page must load within 3 seconds",
        "Server errors must show user-friendly error message",
    ]

    tags = story.get("tags", [])
    if "authentication" in tags:
        implicit.append("Authentication endpoints must have rate limiting")

    return implicit
```

```python
# tests/generators/gherkin_generator.py

from story_parser import ParsedStory, ParsedCriterion


def generate_feature_file(story: ParsedStory) -> str:
    """Generate a complete Gherkin feature file from a parsed story."""
    lines = []

    tag = story.story_id.replace(" ", "-")
    lines.append(f"@{tag}")
    lines.append(f"Feature: {story.action}")
    lines.append(f"  As a {story.actor}")
    lines.append(f"  I want {story.action}")
    lines.append(f"  So that {story.benefit}")
    lines.append("")

    for criterion in story.criteria:
        # Positive scenario
        lines.append(f"  @{criterion.criterion_id} @positive")
        lines.append(f"  Scenario: {criterion.trigger} - happy path")
        for pre in criterion.preconditions:
            lines.append(f"    Given {pre}")
        lines.append(f"    When {criterion.trigger}")
        lines.append(f"    Then {criterion.expected_outcome}")
        for rule in criterion.business_rules:
            lines.append(f"    And {rule}")
        lines.append("")

    return "\n".join(lines)
```

### Java Implementation: Generating Test Cases

For Java teams using Cucumber-JVM, the approach translates to the following structure.

```java
// src/test/java/generators/StoryParser.java

package generators;

import java.util.*;
import java.util.regex.*;

public class StoryParser {

    public record InputParameter(
        String name,
        String type,
        List<String> constraints,
        String extractedFrom
    ) {}

    public record ParsedCriterion(
        String criterionId,
        List<String> preconditions,
        String trigger,
        String expectedOutcome,
        List<String> businessRules,
        List<InputParameter> inputParameters
    ) {}

    public record ParsedStory(
        String storyId,
        String actor,
        String action,
        String benefit,
        List<ParsedCriterion> criteria,
        List<String> implicitRequirements
    ) {}

    public static List<InputParameter> extractInputParameters(List<String> rules) {
        List<InputParameter> params = new ArrayList<>();

        for (String rule : rules) {
            // Pattern: "X must be Y-Z characters"
            Matcher charMatch = Pattern.compile(
                "(\\w+)\\s+must\\s+be\\s+(\\d+)-(\\d+)\\s+characters",
                Pattern.CASE_INSENSITIVE
            ).matcher(rule);

            if (charMatch.find()) {
                params.add(new InputParameter(
                    charMatch.group(1).toLowerCase(),
                    "string",
                    List.of(
                        "minLength:" + charMatch.group(2),
                        "maxLength:" + charMatch.group(3)
                    ),
                    rule
                ));
            }

            // Pattern: "X must be between Y and Z"
            Matcher rangeMatch = Pattern.compile(
                "(\\w+)\\s+must\\s+be\\s+between\\s+(\\d+)\\s+and\\s+(\\d+)",
                Pattern.CASE_INSENSITIVE
            ).matcher(rule);

            if (rangeMatch.find()) {
                params.add(new InputParameter(
                    rangeMatch.group(1).toLowerCase(),
                    "number",
                    List.of(
                        "min:" + rangeMatch.group(2),
                        "max:" + rangeMatch.group(3)
                    ),
                    rule
                ));
            }
        }

        return params;
    }
}
```

## Best Practices

1. **Start with acceptance criteria, not implementation** -- Generate test cases from the requirements as written, not from how you think the system works. This prevents tests that merely confirm existing behavior rather than validating intended behavior.

2. **Generate negative scenarios for every positive path** -- If the acceptance criterion says "user can log in with valid credentials," generate explicit scenarios for invalid credentials, expired accounts, locked accounts, and missing fields.

3. **Use Scenario Outlines for data-driven tests** -- When multiple equivalence classes test the same flow with different data, use Gherkin Scenario Outlines with Examples tables rather than duplicating scenarios.

4. **Tag scenarios for selective execution** -- Tag scenarios by priority (@P0, @P1), type (@positive, @negative, @boundary), and feature area (@auth, @cart). This enables targeted test runs in CI.

5. **Review generated scenarios with business stakeholders** -- Gherkin is readable by non-technical stakeholders. Use generated scenarios as a review artifact to validate that all acceptance criteria are covered.

6. **Regenerate when requirements change** -- When acceptance criteria are updated, re-run the generator to identify new test cases and flag obsolete ones. The traceability matrix makes change impact analysis straightforward.

7. **Supplement generated tests with exploratory scenarios** -- Generators cover systematic cases but miss creative edge cases. Augment generated suites with manually written scenarios discovered through exploratory testing.

8. **Keep feature files focused** -- One feature file per user story. Do not combine unrelated stories into a single feature file. This maintains the traceability link between stories and tests.

9. **Validate Gherkin syntax before committing** -- Use a Gherkin linter (cucumber-lint, gherkin-lint) to ensure generated feature files have valid syntax and consistent formatting.

10. **Generate cross-cutting concern tests separately** -- Security, performance, and accessibility tests that apply to all features should be in dedicated feature files, not scattered across individual story features.

## Anti-Patterns to Avoid

1. **Generating tests without reading the story** -- Blindly applying templates without understanding the business context produces irrelevant test cases. Always read and parse the full user story narrative before generating.

2. **Ignoring implicit requirements** -- User stories rarely capture security, performance, and accessibility requirements explicitly. If you only generate tests for stated criteria, you miss critical coverage areas.

3. **Over-generating trivial tests** -- Not every equivalence class needs its own scenario. A password field with 56 boundary values does not need 56 separate scenarios. Use Scenario Outlines and focus on the most informative values.

4. **Generating without prioritizing** -- A flat list of 200 test cases with no priority is unusable. Every generated test must have a risk-based priority that determines execution order.

5. **Treating generated tests as final** -- Generated scenarios are a starting point, not a finished product. They need human review, refinement, and augmentation with domain-specific edge cases that no generator can anticipate.

6. **Duplicating step definitions** -- Generated step definitions should be reusable. "Given I am on the registration page" should be one step definition used across all scenarios, not duplicated in every feature file.

7. **Ignoring the traceability matrix** -- If you generate tests but do not maintain the traceability link to requirements, you lose the ability to assess coverage gaps and change impact.

## Debugging Tips

- **Parser misses parameters**: If the story parser fails to extract input parameters, check the phrasing of business rules. The parser expects specific patterns like "must be X-Y characters" or "must be between X and Y." Adjust regex patterns for your team's writing style.

- **Too many equivalence classes generated**: If the generator produces an overwhelming number of classes, check whether it is generating redundant classes for overlapping constraints. Deduplicate classes with the same representative values.

- **Gherkin syntax errors in generated files**: Ensure that quotes, special characters, and line breaks in acceptance criteria are properly escaped before inserting into Gherkin templates. Use a Gherkin parser to validate output.

- **Cucumber cannot find step definitions**: Generated step definitions use exact string matching. If the Gherkin scenario uses "I submit a valid email and password" but the step definition expects "I submit valid email and password," the step will not match. Normalize articles and prepositions.

- **Traceability matrix shows low coverage**: If coverage appears low, check whether the generator is correctly identifying all acceptance criteria from the source stories. Stories with non-standard formatting (missing Given/When/Then structure) may be partially parsed.

- **Priority calculator assigns everything as P1**: If risk scores are uniformly high, recalibrate the weights and thresholds. Ensure that the business impact, failure likelihood, and complexity inputs vary across scenarios rather than defaulting to maximum values.

- **Generated feature files are too long**: If a single feature file exceeds 200 lines, the source user story may be too large. Consider splitting the story into smaller stories with focused acceptance criteria before generating tests.

- **Step definition collisions**: When multiple feature files generate similar step definitions, Cucumber may raise ambiguous step errors. Use parameterized steps with regular expressions to handle variations rather than creating nearly-identical literal steps.
