---
name: Test Debt Calculator
description: Quantify and prioritize test technical debt by analyzing coverage gaps, flaky test ratios, outdated assertions, and missing test categories across codebases.
version: 1.0.0
author: Pramod
license: MIT
tags: [test-debt, technical-debt, metrics, prioritization, test-health, maintenance]
testingTypes: [code-quality]
frameworks: [jest, vitest, pytest]
languages: [typescript, javascript, python, java]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Test Debt Calculator

Test technical debt is the accumulated cost of shortcuts, neglect, and decay in a test suite over time. Unlike application technical debt, test debt is insidious because it silently erodes confidence in deployments without producing visible bugs. A team with 80% code coverage might still have massive test debt if that coverage is concentrated on trivial paths, if 15% of tests are flaky, or if assertions are testing implementation details rather than behavior. This skill provides a systematic framework for quantifying test debt across multiple dimensions, prioritizing remediation efforts, and integrating debt tracking into your development workflow so that test quality improves continuously rather than degrading silently.

## Core Principles

### 1. Test Debt Is Measurable

Test debt is not a vague feeling; it is a collection of concrete, measurable metrics. Coverage gaps, flaky test ratios, test execution time regression, assertion staleness, and missing test categories can all be quantified with automated tooling. The first step to reducing test debt is measuring it with precision.

### 2. Not All Debt Is Equal

A missing integration test for a payment processing endpoint is fundamentally different from a missing unit test for a string formatting utility. Test debt must be weighted by the risk and business impact of the uncovered or poorly covered code. A risk-weighted model ensures remediation effort goes where it matters most.

### 3. Debt Accumulates Compounding Interest

Ignoring test debt does not keep it constant; it grows. Flaky tests slow down CI, which encourages developers to skip tests, which creates more coverage gaps, which leads to more production bugs, which erodes trust in testing itself. Breaking this cycle requires proactive measurement and remediation before the debt compounds beyond the team's capacity to address it.

### 4. Track Trends, Not Snapshots

A single debt measurement tells you where you are. Trend data tells you where you are heading. Track test debt metrics over time to distinguish between "we have debt but it is shrinking" and "we have debt and it is growing." Trend direction is more important than absolute numbers.

### 5. Automate the Calculation

Manual test debt assessments happen infrequently and become outdated quickly. Automated calculation integrated into CI ensures that every pull request and every sprint has up-to-date debt metrics available without any manual effort.

## Project Structure

```
test-debt-calculator/
  src/
    analyzers/
      coverage-analyzer.ts
      flaky-analyzer.ts
      staleness-analyzer.ts
      category-analyzer.ts
      complexity-analyzer.ts
      duration-analyzer.ts
    collectors/
      jest-collector.ts
      vitest-collector.ts
      pytest-collector.ts
    scoring/
      debt-scorer.ts
      risk-weights.ts
      priority-calculator.ts
    reporters/
      console-reporter.ts
      json-reporter.ts
      markdown-reporter.ts
      dashboard-reporter.ts
    config/
      debt-config.ts
      thresholds.ts
    index.ts
  scripts/
    calculate-debt.ts
    generate-report.ts
    compare-snapshots.ts
  tests/
    analyzers/
    scoring/
    reporters/
  package.json
  tsconfig.json
  debt-config.json
```

The `src/analyzers/` directory contains one analyzer per debt dimension. The `src/collectors/` directory provides framework-specific adapters for extracting raw data from Jest, Vitest, and Pytest. The `src/scoring/` directory contains the composite scoring logic and risk weight configuration. The `src/reporters/` directory formats debt reports for various output targets.

## Debt Dimensions

Test debt is not a single number. It is a multi-dimensional assessment across these categories:

### 1. Coverage Gaps

Coverage gap analysis goes beyond simple percentage checks. It identifies which specific files and functions lack coverage, weights them by business risk, and produces a prioritized list of gaps to address:

```typescript
// src/analyzers/coverage-analyzer.ts

interface CoverageGap {
  file: string;
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  uncoveredLines: number[];
  uncoveredBranches: string[];
  riskScore: number;
}

interface CoverageDebtReport {
  totalFiles: number;
  filesWithoutTests: number;
  averageLineCoverage: number;
  averageBranchCoverage: number;
  criticalGaps: CoverageGap[];
  debtScore: number;
}

interface CoverageData {
  [filePath: string]: {
    lines: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    lineMap: Record<string, number>;
    branchMap: Record<string, [number, number]>;
  };
}

export function analyzeCoverageDebt(
  coverageData: CoverageData,
  riskWeights: Map<string, number>
): CoverageDebtReport {
  const gaps: CoverageGap[] = [];
  let totalLineCoverage = 0;
  let totalBranchCoverage = 0;
  let filesWithoutTests = 0;

  const files = Object.entries(coverageData);

  for (const [filePath, coverage] of files) {
    const linePct = coverage.lines.pct;
    const branchPct = coverage.branches.pct;
    const functionPct = coverage.functions.pct;

    if (linePct === 0 && functionPct === 0) {
      filesWithoutTests++;
    }

    totalLineCoverage += linePct;
    totalBranchCoverage += branchPct;

    const uncoveredLines = Object.entries(coverage.lineMap)
      .filter(([, hits]) => hits === 0)
      .map(([line]) => parseInt(line, 10));

    const uncoveredBranches = Object.entries(coverage.branchMap)
      .filter(([, [taken, notTaken]]) => taken === 0 || notTaken === 0)
      .map(([branchId]) => branchId);

    const riskWeight = calculateFileRiskWeight(filePath, riskWeights);
    const gapScore = calculateGapScore(linePct, branchPct, functionPct, riskWeight);

    if (gapScore > 0.3) {
      gaps.push({
        file: filePath,
        lineCoverage: linePct,
        branchCoverage: branchPct,
        functionCoverage: functionPct,
        uncoveredLines,
        uncoveredBranches,
        riskScore: gapScore,
      });
    }
  }

  gaps.sort((a, b) => b.riskScore - a.riskScore);

  const avgLine = files.length > 0 ? totalLineCoverage / files.length : 0;
  const avgBranch = files.length > 0 ? totalBranchCoverage / files.length : 0;

  return {
    totalFiles: files.length,
    filesWithoutTests,
    averageLineCoverage: Math.round(avgLine * 100) / 100,
    averageBranchCoverage: Math.round(avgBranch * 100) / 100,
    criticalGaps: gaps.slice(0, 20),
    debtScore: calculateCoverageDebtScore(avgLine, avgBranch, filesWithoutTests, files.length),
  };
}

function calculateFileRiskWeight(filePath: string, riskWeights: Map<string, number>): number {
  for (const [pattern, weight] of riskWeights) {
    if (filePath.includes(pattern)) {
      return weight;
    }
  }
  return 1.0;
}

function calculateGapScore(
  linePct: number,
  branchPct: number,
  functionPct: number,
  riskWeight: number
): number {
  const coverageDeficit =
    (100 - linePct) * 0.4 + (100 - branchPct) * 0.4 + (100 - functionPct) * 0.2;
  return (coverageDeficit / 100) * riskWeight;
}

function calculateCoverageDebtScore(
  avgLine: number,
  avgBranch: number,
  filesWithoutTests: number,
  totalFiles: number
): number {
  const coverageDebt = ((100 - avgLine) * 0.5 + (100 - avgBranch) * 0.5) / 100;
  const untestedFileRatio = totalFiles > 0 ? filesWithoutTests / totalFiles : 0;
  return Math.min(1, coverageDebt * 0.7 + untestedFileRatio * 0.3);
}
```

### 2. Flaky Test Ratio

Flaky tests are the most damaging form of test debt because they undermine trust in the entire suite. The flaky analyzer tracks tests that produce inconsistent results across multiple runs:

```typescript
// src/analyzers/flaky-analyzer.ts

interface FlakyTestRecord {
  testName: string;
  testFile: string;
  totalRuns: number;
  failures: number;
  flakyRate: number;
  lastFlakeDate: string;
  averageRetries: number;
  estimatedWastedMinutes: number;
}

interface FlakyDebtReport {
  totalTests: number;
  flakyTests: number;
  flakyRate: number;
  totalWastedMinutes: number;
  worstOffenders: FlakyTestRecord[];
  debtScore: number;
}

interface TestRunRecord {
  testName: string;
  testFile: string;
  passed: boolean;
  retries: number;
  duration: number;
  timestamp: string;
}

export function analyzeFlakyDebt(
  testRunHistory: TestRunRecord[],
  lookbackDays: number = 30
): FlakyDebtReport {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  const cutoffStr = cutoffDate.toISOString();

  const recentRuns = testRunHistory.filter((run) => run.timestamp >= cutoffStr);

  const testGroups = new Map<string, TestRunRecord[]>();
  for (const run of recentRuns) {
    const key = `${run.testFile}::${run.testName}`;
    if (!testGroups.has(key)) {
      testGroups.set(key, []);
    }
    testGroups.get(key)!.push(run);
  }

  const flakyRecords: FlakyTestRecord[] = [];
  let totalTests = 0;
  let totalWastedMinutes = 0;

  for (const [key, runs] of testGroups) {
    totalTests++;
    const failures = runs.filter((r) => !r.passed).length;
    const flakyRate = runs.length > 1 ? failures / runs.length : 0;

    const hasPasses = runs.some((r) => r.passed);
    const hasFailures = runs.some((r) => !r.passed);
    const isFlaky = hasPasses && hasFailures;

    if (isFlaky && flakyRate > 0.05) {
      const totalRetries = runs.reduce((sum, r) => sum + r.retries, 0);
      const avgDuration = runs.reduce((sum, r) => sum + r.duration, 0) / runs.length;
      const wastedMinutes = (totalRetries * avgDuration) / 60000;

      const [testFile, testName] = key.split('::');

      const lastFlake = runs
        .filter((r) => !r.passed)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

      flakyRecords.push({
        testName,
        testFile,
        totalRuns: runs.length,
        failures,
        flakyRate: Math.round(flakyRate * 1000) / 1000,
        lastFlakeDate: lastFlake?.timestamp || '',
        averageRetries: Math.round((totalRetries / runs.length) * 10) / 10,
        estimatedWastedMinutes: Math.round(wastedMinutes),
      });

      totalWastedMinutes += wastedMinutes;
    }
  }

  flakyRecords.sort((a, b) => b.flakyRate - a.flakyRate);

  const flakyCount = flakyRecords.length;
  const overallFlakyRate = totalTests > 0 ? flakyCount / totalTests : 0;

  return {
    totalTests,
    flakyTests: flakyCount,
    flakyRate: Math.round(overallFlakyRate * 1000) / 1000,
    totalWastedMinutes: Math.round(totalWastedMinutes),
    worstOffenders: flakyRecords.slice(0, 15),
    debtScore: calculateFlakyDebtScore(overallFlakyRate, totalWastedMinutes),
  };
}

function calculateFlakyDebtScore(flakyRate: number, wastedMinutes: number): number {
  const rateScore = Math.min(1, flakyRate / 0.1);
  const wasteScore = Math.min(1, wastedMinutes / 60);
  return rateScore * 0.6 + wasteScore * 0.4;
}
```

### 3. Test Staleness

Stale tests are tests that have not been updated despite changes to their corresponding source files. They may pass but test outdated behavior:

```typescript
// src/analyzers/staleness-analyzer.ts

interface StaleTestRecord {
  testFile: string;
  lastModified: string;
  daysSinceModification: number;
  sourceFileLastModified: string;
  daysBehindSource: number;
  assertions: number;
  stalenessScore: number;
}

interface StalenessDebtReport {
  totalTestFiles: number;
  staleTestFiles: number;
  averageAgeDays: number;
  testsLaggingSource: number;
  worstOffenders: StaleTestRecord[];
  debtScore: number;
}

interface FileMetadata {
  path: string;
  lastModified: string;
  assertions: number;
  correspondingSourceFile?: string;
  sourceLastModified?: string;
}

export function analyzeStalenessDebt(
  testFileMetadata: FileMetadata[],
  maxAcceptableAgeDays: number = 180,
  maxAcceptableLagDays: number = 90
): StalenessDebtReport {
  const now = new Date();
  const staleRecords: StaleTestRecord[] = [];
  let totalAgeDays = 0;
  let testsLaggingSource = 0;

  for (const meta of testFileMetadata) {
    const lastModDate = new Date(meta.lastModified);
    const daysSinceModification = Math.floor(
      (now.getTime() - lastModDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    totalAgeDays += daysSinceModification;

    let daysBehindSource = 0;
    if (meta.sourceLastModified) {
      const sourceModDate = new Date(meta.sourceLastModified);
      if (sourceModDate > lastModDate) {
        daysBehindSource = Math.floor(
          (sourceModDate.getTime() - lastModDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysBehindSource > maxAcceptableLagDays) {
          testsLaggingSource++;
        }
      }
    }

    const stalenessScore = calculateStalenessScore(
      daysSinceModification,
      daysBehindSource,
      maxAcceptableAgeDays,
      maxAcceptableLagDays
    );

    if (stalenessScore > 0.4) {
      staleRecords.push({
        testFile: meta.path,
        lastModified: meta.lastModified,
        daysSinceModification,
        sourceFileLastModified: meta.sourceLastModified || 'N/A',
        daysBehindSource,
        assertions: meta.assertions,
        stalenessScore,
      });
    }
  }

  staleRecords.sort((a, b) => b.stalenessScore - a.stalenessScore);

  const averageAge =
    testFileMetadata.length > 0
      ? Math.round(totalAgeDays / testFileMetadata.length)
      : 0;

  return {
    totalTestFiles: testFileMetadata.length,
    staleTestFiles: staleRecords.length,
    averageAgeDays: averageAge,
    testsLaggingSource,
    worstOffenders: staleRecords.slice(0, 15),
    debtScore: calculateOverallStalenessDebt(
      staleRecords.length,
      testFileMetadata.length,
      testsLaggingSource,
      averageAge,
      maxAcceptableAgeDays
    ),
  };
}

function calculateStalenessScore(
  ageDays: number,
  lagDays: number,
  maxAge: number,
  maxLag: number
): number {
  const ageRatio = Math.min(1, ageDays / maxAge);
  const lagRatio = Math.min(1, lagDays / maxLag);
  return ageRatio * 0.4 + lagRatio * 0.6;
}

function calculateOverallStalenessDebt(
  staleCount: number,
  totalCount: number,
  laggingCount: number,
  averageAge: number,
  maxAge: number
): number {
  const staleRatio = totalCount > 0 ? staleCount / totalCount : 0;
  const lagRatio = totalCount > 0 ? laggingCount / totalCount : 0;
  const ageRatio = Math.min(1, averageAge / maxAge);
  return staleRatio * 0.3 + lagRatio * 0.5 + ageRatio * 0.2;
}
```

### 4. Missing Test Category Analysis

A healthy test suite has a balanced distribution across test categories. Category analysis identifies gaps in the test pyramid:

```typescript
// src/analyzers/category-analyzer.ts

type TestCategory =
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'api'
  | 'accessibility'
  | 'performance'
  | 'security';

interface CategoryGap {
  category: TestCategory;
  expectedMinimum: number;
  actualCount: number;
  deficit: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedTests: string[];
}

interface CategoryDebtReport {
  categoryCounts: Record<TestCategory, number>;
  totalTests: number;
  gaps: CategoryGap[];
  testPyramidScore: number;
  debtScore: number;
}

interface TestCategoryConfig {
  expectedDistribution: Record<TestCategory, { minPercentage: number; weight: number }>;
}

interface ClassifiedTest {
  name: string;
  file: string;
  category: TestCategory;
}

export function analyzeCategoryDebt(
  classifiedTests: ClassifiedTest[],
  config: TestCategoryConfig
): CategoryDebtReport {
  const categoryCounts: Record<TestCategory, number> = {
    unit: 0,
    integration: 0,
    e2e: 0,
    api: 0,
    accessibility: 0,
    performance: 0,
    security: 0,
  };

  for (const test of classifiedTests) {
    categoryCounts[test.category]++;
  }

  const totalTests = classifiedTests.length;
  const gaps: CategoryGap[] = [];

  for (const [category, expected] of Object.entries(config.expectedDistribution)) {
    const cat = category as TestCategory;
    const actualCount = categoryCounts[cat];
    const expectedCount = Math.ceil(totalTests * (expected.minPercentage / 100));

    if (actualCount < expectedCount) {
      const deficit = expectedCount - actualCount;
      const deficitRatio = expectedCount > 0 ? deficit / expectedCount : 0;

      let priority: CategoryGap['priority'];
      if (deficitRatio > 0.8) priority = 'critical';
      else if (deficitRatio > 0.5) priority = 'high';
      else if (deficitRatio > 0.25) priority = 'medium';
      else priority = 'low';

      gaps.push({
        category: cat,
        expectedMinimum: expectedCount,
        actualCount,
        deficit,
        priority,
        suggestedTests: generateSuggestions(cat, deficit),
      });
    }
  }

  gaps.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const pyramidScore = calculateTestPyramidScore(categoryCounts, totalTests);

  return {
    categoryCounts,
    totalTests,
    gaps,
    testPyramidScore: pyramidScore,
    debtScore: calculateCategoryDebtScore(gaps, config),
  };
}

function calculateTestPyramidScore(
  counts: Record<TestCategory, number>,
  total: number
): number {
  if (total === 0) return 0;

  const unitRatio = counts.unit / total;
  const integrationRatio = counts.integration / total;
  const e2eRatio = counts.e2e / total;

  const unitDeviation = Math.abs(0.7 - unitRatio);
  const integrationDeviation = Math.abs(0.2 - integrationRatio);
  const e2eDeviation = Math.abs(0.1 - e2eRatio);

  const totalDeviation = unitDeviation + integrationDeviation + e2eDeviation;
  return Math.max(0, 1 - totalDeviation);
}

function calculateCategoryDebtScore(
  gaps: CategoryGap[],
  config: TestCategoryConfig
): number {
  if (gaps.length === 0) return 0;

  let weightedDeficit = 0;
  let totalWeight = 0;

  for (const gap of gaps) {
    const weight = config.expectedDistribution[gap.category]?.weight || 1;
    const deficitRatio = gap.expectedMinimum > 0 ? gap.deficit / gap.expectedMinimum : 0;
    weightedDeficit += deficitRatio * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.min(1, weightedDeficit / totalWeight) : 0;
}

function generateSuggestions(category: TestCategory, deficit: number): string[] {
  const suggestions: Record<TestCategory, string[]> = {
    unit: [
      'Add unit tests for utility functions and data transformations',
      'Test input validation logic in isolation',
      'Cover error handling paths with specific assertions',
      'Test pure functions with boundary value analysis',
    ],
    integration: [
      'Add database integration tests for CRUD operations',
      'Test API endpoint request/response cycles end-to-end',
      'Cover third-party service integrations with contract tests',
      'Test middleware chains with realistic request objects',
    ],
    e2e: [
      'Add critical user flow tests for authentication',
      'Cover checkout and payment processing flows',
      'Test cross-page navigation and deep linking',
      'Verify form submission and validation feedback',
    ],
    api: [
      'Test API contract compliance with schema validation',
      'Cover error response formats and status codes',
      'Verify rate limiting behavior under load',
      'Test pagination, filtering, and sorting parameters',
    ],
    accessibility: [
      'Add axe-core automated accessibility checks',
      'Test keyboard navigation for all interactive elements',
      'Verify screen reader compatibility with ARIA attributes',
      'Check color contrast compliance with WCAG standards',
    ],
    performance: [
      'Add load time benchmarks for critical pages',
      'Test API response time against SLA thresholds',
      'Measure memory usage patterns under sustained load',
      'Profile database query performance for common operations',
    ],
    security: [
      'Test authentication bypass scenarios systematically',
      'Verify input sanitization against injection attacks',
      'Check authorization enforcement on all API endpoints',
      'Test CSRF and XSS protections in form submissions',
    ],
  };

  return suggestions[category]?.slice(0, Math.min(deficit, 4)) || [];
}
```

## Composite Debt Score

The composite scorer combines all dimension scores into a single weighted assessment with trend analysis:

```typescript
// src/scoring/debt-scorer.ts

interface DebtDimension {
  name: string;
  score: number;
  weight: number;
  details: Record<string, unknown>;
}

interface CompositeDebtReport {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: DebtDimension[];
  trend: 'improving' | 'stable' | 'degrading' | 'unknown';
  recommendations: string[];
  estimatedRemediationHours: number;
}

export function calculateCompositeDebt(
  dimensions: DebtDimension[],
  previousScore?: number
): CompositeDebtReport {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const weightedScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const overallScore =
    totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) / 100 : 0;

  const grade = scoreToGrade(overallScore);
  const trend = determineTrend(overallScore, previousScore);
  const recommendations = generateRecommendations(dimensions);
  const estimatedHours = estimateRemediationEffort(dimensions);

  return {
    overallScore,
    grade,
    dimensions,
    trend,
    recommendations,
    estimatedRemediationHours: estimatedHours,
  };
}

function scoreToGrade(score: number): CompositeDebtReport['grade'] {
  if (score <= 0.1) return 'A';
  if (score <= 0.25) return 'B';
  if (score <= 0.45) return 'C';
  if (score <= 0.65) return 'D';
  return 'F';
}

function determineTrend(
  current: number,
  previous?: number
): CompositeDebtReport['trend'] {
  if (previous === undefined) return 'unknown';
  const delta = current - previous;
  if (delta < -0.05) return 'improving';
  if (delta > 0.05) return 'degrading';
  return 'stable';
}

function generateRecommendations(dimensions: DebtDimension[]): string[] {
  const recommendations: string[] = [];
  const sorted = [...dimensions].sort(
    (a, b) => b.score * b.weight - a.score * a.weight
  );

  for (const dim of sorted.slice(0, 3)) {
    if (dim.score > 0.5) {
      recommendations.push(
        `[CRITICAL] ${dim.name}: Score ${(dim.score * 100).toFixed(0)}% debt. Immediate action required.`
      );
    } else if (dim.score > 0.25) {
      recommendations.push(
        `[HIGH] ${dim.name}: Score ${(dim.score * 100).toFixed(0)}% debt. Schedule remediation this sprint.`
      );
    } else if (dim.score > 0.1) {
      recommendations.push(
        `[MEDIUM] ${dim.name}: Score ${(dim.score * 100).toFixed(0)}% debt. Add to backlog.`
      );
    }
  }

  return recommendations;
}

function estimateRemediationEffort(dimensions: DebtDimension[]): number {
  let totalHours = 0;
  for (const dim of dimensions) {
    const debtPercentage = dim.score * 100;
    const hoursForDimension = (debtPercentage / 10) * 4 * dim.weight;
    totalHours += hoursForDimension;
  }
  return Math.round(totalHours);
}
```

## Risk Weight Configuration

Risk weights ensure that test debt in critical code paths receives proportionally more attention:

```typescript
// src/scoring/risk-weights.ts

export interface RiskWeightConfig {
  filePatterns: Array<{
    pattern: string;
    weight: number;
    reason: string;
  }>;
  dimensionWeights: {
    coverage: number;
    flaky: number;
    staleness: number;
    categories: number;
    complexity: number;
    duration: number;
  };
}

export const DEFAULT_RISK_WEIGHTS: RiskWeightConfig = {
  filePatterns: [
    { pattern: 'payment', weight: 3.0, reason: 'Revenue-critical payment processing' },
    { pattern: 'auth', weight: 2.5, reason: 'Security-critical authentication logic' },
    { pattern: 'checkout', weight: 2.5, reason: 'Revenue-critical checkout flow' },
    { pattern: 'billing', weight: 2.0, reason: 'Financial data handling' },
    { pattern: 'api/middleware', weight: 2.0, reason: 'Cross-cutting API concerns' },
    { pattern: 'database', weight: 1.8, reason: 'Data integrity layer' },
    { pattern: 'migration', weight: 1.5, reason: 'Schema change management' },
    { pattern: 'webhook', weight: 1.5, reason: 'External integration reliability' },
    { pattern: 'cron', weight: 1.3, reason: 'Background job reliability' },
    { pattern: 'utils', weight: 0.5, reason: 'Low-risk utility functions' },
    { pattern: 'types', weight: 0.3, reason: 'Type definitions rarely need tests' },
    { pattern: 'constants', weight: 0.2, reason: 'Static constants rarely change' },
  ],
  dimensionWeights: {
    coverage: 0.25,
    flaky: 0.25,
    staleness: 0.15,
    categories: 0.15,
    complexity: 0.10,
    duration: 0.10,
  },
};
```

## Reporting

### Markdown Report Generator

```typescript
// src/reporters/markdown-reporter.ts

import type { CompositeDebtReport } from '../scoring/debt-scorer';

export function generateMarkdownReport(report: CompositeDebtReport): string {
  const lines: string[] = [];

  lines.push('# Test Debt Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Overall Score:** ${(report.overallScore * 100).toFixed(1)}% debt`);
  lines.push(`**Grade:** ${report.grade}`);
  lines.push(`**Trend:** ${report.trend}`);
  lines.push(`**Estimated Remediation:** ${report.estimatedRemediationHours} hours`);
  lines.push('');

  lines.push('## Dimensions');
  lines.push('');
  lines.push('| Dimension | Score | Weight | Weighted Impact |');
  lines.push('|-----------|-------|--------|-----------------|');

  for (const dim of report.dimensions) {
    const impact = (dim.score * dim.weight * 100).toFixed(1);
    const score = (dim.score * 100).toFixed(1);
    lines.push(`| ${dim.name} | ${score}% | ${dim.weight} | ${impact}% |`);
  }

  lines.push('');
  lines.push('## Recommendations');
  lines.push('');

  for (const rec of report.recommendations) {
    lines.push(`- ${rec}`);
  }

  return lines.join('\n');
}
```

### CI Integration Script

```typescript
// scripts/calculate-debt.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { analyzeCoverageDebt } from '../src/analyzers/coverage-analyzer';
import { analyzeFlakyDebt } from '../src/analyzers/flaky-analyzer';
import { analyzeStalenessDebt } from '../src/analyzers/staleness-analyzer';
import { analyzeCategoryDebt } from '../src/analyzers/category-analyzer';
import { calculateCompositeDebt } from '../src/scoring/debt-scorer';
import { DEFAULT_RISK_WEIGHTS } from '../src/scoring/risk-weights';
import { generateMarkdownReport } from '../src/reporters/markdown-reporter';

async function main(): Promise<void> {
  const snapshotPath = 'debt-snapshot.json';

  let previousScore: number | undefined;
  if (existsSync(snapshotPath)) {
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    previousScore = snapshot.overallScore;
  }

  const coverageData = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf-8'));
  const testRunHistory = JSON.parse(readFileSync('test-run-history.json', 'utf-8'));
  const testFileMetadata = JSON.parse(readFileSync('test-file-metadata.json', 'utf-8'));
  const classifiedTests = JSON.parse(readFileSync('classified-tests.json', 'utf-8'));

  const riskWeights = new Map(
    DEFAULT_RISK_WEIGHTS.filePatterns.map((p) => [p.pattern, p.weight])
  );

  const coverageDebt = analyzeCoverageDebt(coverageData, riskWeights);
  const flakyDebt = analyzeFlakyDebt(testRunHistory, 30);
  const stalenessDebt = analyzeStalenessDebt(testFileMetadata);
  const categoryDebt = analyzeCategoryDebt(classifiedTests, {
    expectedDistribution: {
      unit: { minPercentage: 60, weight: 1.0 },
      integration: { minPercentage: 20, weight: 1.5 },
      e2e: { minPercentage: 5, weight: 2.0 },
      api: { minPercentage: 10, weight: 1.5 },
      accessibility: { minPercentage: 2, weight: 1.0 },
      performance: { minPercentage: 2, weight: 1.0 },
      security: { minPercentage: 1, weight: 2.0 },
    },
  });

  const weights = DEFAULT_RISK_WEIGHTS.dimensionWeights;

  const composite = calculateCompositeDebt(
    [
      { name: 'Coverage Gaps', score: coverageDebt.debtScore, weight: weights.coverage, details: coverageDebt as unknown as Record<string, unknown> },
      { name: 'Flaky Tests', score: flakyDebt.debtScore, weight: weights.flaky, details: flakyDebt as unknown as Record<string, unknown> },
      { name: 'Test Staleness', score: stalenessDebt.debtScore, weight: weights.staleness, details: stalenessDebt as unknown as Record<string, unknown> },
      { name: 'Category Gaps', score: categoryDebt.debtScore, weight: weights.categories, details: categoryDebt as unknown as Record<string, unknown> },
    ],
    previousScore
  );

  const markdownReport = generateMarkdownReport(composite);
  writeFileSync('test-debt-report.md', markdownReport, 'utf-8');
  writeFileSync(
    snapshotPath,
    JSON.stringify(
      { overallScore: composite.overallScore, timestamp: new Date().toISOString() },
      null,
      2
    ),
    'utf-8'
  );

  console.log(`Test Debt Grade: ${composite.grade}`);
  console.log(`Overall Score: ${(composite.overallScore * 100).toFixed(1)}% debt`);
  console.log(`Trend: ${composite.trend}`);
  console.log(`Estimated Remediation: ${composite.estimatedRemediationHours} hours`);

  const threshold = parseFloat(process.env.DEBT_THRESHOLD || '0.5');
  if (composite.overallScore > threshold) {
    console.error(
      `Test debt score ${composite.overallScore.toFixed(2)} exceeds threshold ${threshold}`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Debt calculation failed:', error);
  process.exit(1);
});
```

## GitHub Actions Integration

```yaml
name: Test Debt Analysis

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday at 9 AM UTC

jobs:
  debt-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm test -- --coverage --coverageReporters=json

      - name: Calculate test debt
        run: tsx scripts/calculate-debt.ts
        env:
          DEBT_THRESHOLD: '0.5'

      - name: Comment PR with debt report
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('test-debt-report.md', 'utf-8');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: report,
            });
```

## Best Practices

1. **Run debt calculations on every pull request.** Integrate the debt calculator into your CI pipeline so that every PR shows its impact on test debt. This prevents gradual accumulation and creates accountability.

2. **Set debt thresholds and enforce them in CI.** Define a maximum acceptable debt score and fail the CI build if it is exceeded. Start with a lenient threshold and tighten it gradually as the team reduces existing debt.

3. **Weight dimensions by business impact.** Coverage gaps in payment processing code matter more than coverage gaps in utility functions. Configure risk weights to reflect your domain's risk profile.

4. **Track debt trends over time, not just current state.** A score of 0.3 that was 0.5 last month is a success story. Store snapshots and compare across runs to recognize progress and identify regression.

5. **Distinguish between intentional and accidental debt.** Some test debt is a conscious decision. Document intentional debt separately from accidental debt so that the team does not waste effort re-evaluating accepted trade-offs.

6. **Review the debt report in sprint retrospectives.** Make test debt a recurring agenda item. Teams that discuss debt regularly reduce it faster than teams that only measure it.

7. **Prioritize flaky test remediation above all else.** Flaky tests have the highest compound interest rate because they erode developer trust in the entire test suite. Fix flaky tests before adding new coverage.

8. **Use the test pyramid as a diagnostic tool.** If your category analysis reveals an inverted pyramid with more e2e tests than unit tests, your suite is likely slow, brittle, and expensive to maintain.

9. **Correlate debt scores with production incidents.** Track whether modules with high test debt scores produce more production bugs. This data justifies remediation investment to stakeholders and product managers.

10. **Automate test classification.** Manually categorizing tests as unit, integration, or e2e is error-prone. Use file path conventions, test runner tags, or AST analysis to automate classification consistently.

11. **Set per-module debt budgets.** Different modules may have different acceptable debt levels. Core modules should have near-zero debt; experimental features may tolerate higher debt temporarily.

12. **Include test duration in the debt calculation.** A test suite that takes 45 minutes to run has duration debt. Slow suites discourage frequent testing and slow down CI feedback loops.

## Anti-Patterns to Avoid

**Optimizing for coverage percentage alone.** A codebase can have 90% line coverage and still have massive test debt if that coverage consists of trivial assertions, tests implementation details, or ignores branch coverage entirely. Coverage is one input to the debt calculation, not the entire picture.

**Treating all test files equally.** A stale test file for a payment processing module is far more concerning than a stale test for a logging utility. Always apply risk-weighted scoring so that remediation effort targets the highest-impact areas first.

**Calculating debt without acting on it.** Measurement without remediation is just overhead. Every debt report should produce actionable work items with clear ownership and timelines. If reports accumulate without action, they lose credibility.

**Using debt calculations to blame individuals.** Debt accumulates over time through collective decisions and organizational pressures. Using debt metrics punitively discourages transparency and encourages gaming the metrics rather than improving quality.

**Ignoring the test pyramid.** A suite with 500 e2e tests and 50 unit tests will be slow, brittle, and expensive to maintain. Category analysis should inform architectural decisions about where to invest testing effort.

**Setting unrealistic debt targets.** Zero debt is not achievable or desirable. Some debt is a rational trade-off. Set targets that are ambitious but achievable, and adjust them based on team capacity and business priorities.

**Running debt calculations only quarterly.** Infrequent measurement leads to surprise debt spikes. Integrate debt calculation into CI for continuous visibility so that debt never accumulates unnoticed.

## Debugging Tips

**Coverage data is missing or incomplete.** Verify that your test runner is configured to collect coverage. For Jest, add `--coverage --coverageReporters=json` to your test command. For Vitest, configure `coverage.reporter` to include `json`. Ensure the output file path matches what the debt calculator expects.

**Flaky analysis shows zero flaky tests.** The flaky analyzer requires historical run data across multiple executions. A single test run cannot identify flaky tests. Collect and store test run records across at least 10-20 CI runs before expecting meaningful flaky analysis results.

**Staleness scores seem too high.** Check the `maxAcceptableAgeDays` parameter. For rapidly evolving codebases, 90 days may be appropriate. For stable libraries, 365 days may be more realistic. Calibrate thresholds to match your development velocity.

**Category classification is inaccurate.** Review the classification logic. File path-based classification works well for conventional project structures but fails for non-standard layouts. Consider adding explicit tags or annotations to test files for accurate categorization.

**Debt score does not correlate with team perception.** Calibrate the dimension weights. If the team perceives flaky tests as the biggest problem but coverage gaps score higher, increase the flaky dimension weight. The model should reflect your team's lived experience.

**CI build fails on debt threshold.** If the threshold is newly introduced, start with a lenient value such as 0.7 and tighten it by 0.05 each sprint. This gives the team time to reduce existing debt without blocking all development work.
