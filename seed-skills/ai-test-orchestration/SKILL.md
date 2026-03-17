---
name: AI Test Orchestration
description: AI-powered test orchestration skill covering intelligent test selection, risk-based test prioritization, flaky test management, test impact analysis, parallel execution optimization, and predictive test failure detection using machine learning.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [ai-testing, test-orchestration, test-prioritization, risk-based-testing, test-selection, parallel-testing, ml-testing]
testingTypes: [integration, e2e, unit]
frameworks: [playwright, jest, vitest, pytest]
languages: [typescript, javascript, python]
domains: [web, api, backend, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# AI Test Orchestration Skill

You are an expert software engineer specializing in AI-powered test orchestration and intelligent test management. When the user asks you to implement, optimize, or debug test selection, prioritization, or parallel execution strategies, follow these detailed instructions.

## Core Principles

1. **Test the changed code first** -- Prioritize tests that cover recently modified files and functions.
2. **Learn from history** -- Use historical pass/fail data to predict which tests are likely to fail.
3. **Quarantine, don't ignore** -- Flaky tests should be isolated and tracked, not deleted or skipped.
4. **Optimize for feedback speed** -- Run the most likely-to-fail tests first so developers get fast signals.
5. **Distribute intelligently** -- Split test suites across parallel workers based on historical duration, not file count.
6. **Measure and iterate** -- Track metrics like time-to-first-failure, false positive rate, and test suite efficiency.
7. **Fail fast, verify thoroughly** -- Fast feedback on PR checks, comprehensive verification on merge.

## Project Structure

```
project/
  src/
    orchestrator/
      test-selector.ts
      risk-scorer.ts
      impact-analyzer.ts
      parallel-splitter.ts
      flaky-detector.ts
      prediction-model.ts
    data/
      test-history.ts
      git-analysis.ts
      coverage-map.ts
    reporters/
      orchestration-report.ts
      metrics-collector.ts
    config/
      orchestration.config.ts
  scripts/
    collect-test-data.ts
    train-model.py
    analyze-flakiness.ts
  tests/
    orchestrator/
      test-selector.test.ts
      risk-scorer.test.ts
      impact-analyzer.test.ts
```

## Intelligent Test Selection Based on Code Changes

```typescript
// src/orchestrator/test-selector.ts
import { execSync } from 'child_process';
import { CoverageMap } from '../data/coverage-map';

interface TestSelection {
  mustRun: string[];      // Tests directly covering changed code
  shouldRun: string[];    // Tests with transitive dependencies on changed code
  canSkip: string[];      // Tests with no relation to changes
  confidence: number;     // 0-1, how confident we are in the selection
}

interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
  changedFunctions: string[];
}

export class TestSelector {
  private coverageMap: CoverageMap;

  constructor(coverageMap: CoverageMap) {
    this.coverageMap = coverageMap;
  }

  async selectTests(baseBranch: string = 'main'): Promise<TestSelection> {
    const changedFiles = this.getChangedFiles(baseBranch);
    const allTests = this.coverageMap.getAllTests();
    const mustRun = new Set<string>();
    const shouldRun = new Set<string>();

    for (const file of changedFiles) {
      // Direct coverage: tests that execute lines in this file
      const directTests = this.coverageMap.getTestsCoveringFile(file.path);
      directTests.forEach((t) => mustRun.add(t));

      // Function-level precision: only tests covering changed functions
      if (file.changedFunctions.length > 0) {
        for (const fn of file.changedFunctions) {
          const fnTests = this.coverageMap.getTestsCoveringFunction(file.path, fn);
          fnTests.forEach((t) => mustRun.add(t));
        }
      }

      // Transitive dependencies: tests covering files that import changed file
      const dependents = this.coverageMap.getDependentsOf(file.path);
      for (const dep of dependents) {
        const depTests = this.coverageMap.getTestsCoveringFile(dep);
        depTests.forEach((t) => {
          if (!mustRun.has(t)) shouldRun.add(t);
        });
      }
    }

    const canSkip = allTests.filter(
      (t) => !mustRun.has(t) && !shouldRun.has(t)
    );

    const confidence = this.coverageMap.isComplete()
      ? 0.95
      : 0.7; // Lower confidence if coverage data is stale

    return {
      mustRun: [...mustRun],
      shouldRun: [...shouldRun],
      canSkip,
      confidence,
    };
  }

  private getChangedFiles(baseBranch: string): ChangedFile[] {
    const diffOutput = execSync(
      `git diff --name-only --diff-filter=ACMR ${baseBranch}...HEAD`,
      { encoding: 'utf-8' }
    ).trim();

    if (!diffOutput) return [];

    return diffOutput.split('\n').map((filePath) => {
      const stat = execSync(
        `git diff --numstat ${baseBranch}...HEAD -- "${filePath}"`,
        { encoding: 'utf-8' }
      ).trim();

      const [additions, deletions] = stat.split('\t').map(Number);

      // Extract changed function names from diff
      const diffContent = execSync(
        `git diff -U0 ${baseBranch}...HEAD -- "${filePath}"`,
        { encoding: 'utf-8' }
      );
      const changedFunctions = this.extractChangedFunctions(diffContent);

      return { path: filePath, additions, deletions, changedFunctions };
    });
  }

  private extractChangedFunctions(diffContent: string): string[] {
    const functionPattern = /^@@.*@@\s+(?:async\s+)?(?:function\s+)?(\w+)/gm;
    const functions: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = functionPattern.exec(diffContent)) !== null) {
      functions.push(match[1]);
    }

    return [...new Set(functions)];
  }
}
```

## Risk-Based Test Prioritization

```typescript
// src/orchestrator/risk-scorer.ts
interface TestRiskScore {
  testId: string;
  score: number;          // 0-100, higher = run first
  factors: RiskFactor[];
}

interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
}

interface TestHistory {
  testId: string;
  recentResults: ('pass' | 'fail' | 'skip')[];
  averageDuration: number;
  lastFailedAt: Date | null;
  failureRate: number;     // 0-1
  flakinessScore: number;  // 0-1
}

export class RiskScorer {
  private weights = {
    recentFailureRate: 30,
    codeChangeProximity: 25,
    historicalFlakiness: 15,
    timeSinceLastRun: 10,
    testAge: 5,
    complexity: 10,
    criticalPath: 5,
  };

  scoreTests(
    tests: string[],
    history: Map<string, TestHistory>,
    changedFiles: string[],
    coverageMap: Map<string, string[]>
  ): TestRiskScore[] {
    return tests
      .map((testId) => this.scoreTest(testId, history, changedFiles, coverageMap))
      .sort((a, b) => b.score - a.score);
  }

  private scoreTest(
    testId: string,
    history: Map<string, TestHistory>,
    changedFiles: string[],
    coverageMap: Map<string, string[]>
  ): TestRiskScore {
    const testHistory = history.get(testId);
    const factors: RiskFactor[] = [];

    // Factor 1: Recent failure rate
    const failureRate = testHistory?.failureRate ?? 0;
    factors.push({
      name: 'recentFailureRate',
      weight: this.weights.recentFailureRate,
      value: failureRate,
      contribution: failureRate * this.weights.recentFailureRate,
    });

    // Factor 2: Code change proximity
    const coveredFiles = coverageMap.get(testId) || [];
    const overlapCount = coveredFiles.filter((f) => changedFiles.includes(f)).length;
    const proximity = coveredFiles.length > 0 ? overlapCount / coveredFiles.length : 0;
    factors.push({
      name: 'codeChangeProximity',
      weight: this.weights.codeChangeProximity,
      value: proximity,
      contribution: proximity * this.weights.codeChangeProximity,
    });

    // Factor 3: Historical flakiness
    const flakiness = testHistory?.flakinessScore ?? 0;
    factors.push({
      name: 'historicalFlakiness',
      weight: this.weights.historicalFlakiness,
      value: flakiness,
      contribution: flakiness * this.weights.historicalFlakiness,
    });

    // Factor 4: Time since last run (normalized to 0-1)
    const daysSinceRun = testHistory?.lastFailedAt
      ? (Date.now() - testHistory.lastFailedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    const timeFactor = Math.min(daysSinceRun / 30, 1);
    factors.push({
      name: 'timeSinceLastRun',
      weight: this.weights.timeSinceLastRun,
      value: timeFactor,
      contribution: timeFactor * this.weights.timeSinceLastRun,
    });

    const score = factors.reduce((sum, f) => sum + f.contribution, 0);

    return { testId, score: Math.min(score, 100), factors };
  }
}
```

## Flaky Test Management

```typescript
// src/orchestrator/flaky-detector.ts
interface FlakyTestReport {
  testId: string;
  flakinessScore: number;
  recentRuns: TestRun[];
  pattern: FlakyPattern;
  recommendation: 'quarantine' | 'retry' | 'investigate' | 'stable';
}

type FlakyPattern =
  | 'timing-dependent'
  | 'order-dependent'
  | 'resource-contention'
  | 'network-dependent'
  | 'random-data'
  | 'unknown';

interface TestRun {
  runId: string;
  result: 'pass' | 'fail';
  duration: number;
  timestamp: Date;
  errorMessage?: string;
  retryCount: number;
}

export class FlakyDetector {
  private readonly FLAKY_THRESHOLD = 0.1;  // 10% failure rate
  private readonly QUARANTINE_THRESHOLD = 0.3;  // 30% failure rate
  private readonly WINDOW_SIZE = 50;  // Last 50 runs

  analyze(testId: string, runs: TestRun[]): FlakyTestReport {
    const recentRuns = runs.slice(-this.WINDOW_SIZE);
    const failCount = recentRuns.filter((r) => r.result === 'fail').length;
    const flakinessScore = failCount / recentRuns.length;
    const pattern = this.detectPattern(recentRuns);

    let recommendation: FlakyTestReport['recommendation'];
    if (flakinessScore >= this.QUARANTINE_THRESHOLD) {
      recommendation = 'quarantine';
    } else if (flakinessScore >= this.FLAKY_THRESHOLD) {
      recommendation = 'investigate';
    } else if (flakinessScore > 0) {
      recommendation = 'retry';
    } else {
      recommendation = 'stable';
    }

    return { testId, flakinessScore, recentRuns, pattern, recommendation };
  }

  private detectPattern(runs: TestRun[]): FlakyPattern {
    const failures = runs.filter((r) => r.result === 'fail');
    if (failures.length === 0) return 'unknown';

    // Check for timing patterns
    const failDurations = failures.map((r) => r.duration);
    const avgFailDuration = failDurations.reduce((a, b) => a + b, 0) / failDurations.length;
    const passDurations = runs.filter((r) => r.result === 'pass').map((r) => r.duration);
    const avgPassDuration = passDurations.reduce((a, b) => a + b, 0) / passDurations.length;

    if (avgFailDuration > avgPassDuration * 3) {
      return 'timing-dependent';
    }

    // Check for network-related error messages
    const networkErrors = failures.filter((r) =>
      r.errorMessage?.match(/ECONNREFUSED|ETIMEDOUT|fetch failed|network/i)
    );
    if (networkErrors.length > failures.length * 0.5) {
      return 'network-dependent';
    }

    // Check for order-dependent patterns (failures cluster together)
    const failIndices = runs
      .map((r, i) => (r.result === 'fail' ? i : -1))
      .filter((i) => i >= 0);
    const clustered = failIndices.some(
      (idx, i) => i > 0 && idx - failIndices[i - 1] === 1
    );
    if (clustered) {
      return 'order-dependent';
    }

    return 'unknown';
  }

  generateQuarantineConfig(reports: FlakyTestReport[]): string {
    const quarantined = reports
      .filter((r) => r.recommendation === 'quarantine')
      .map((r) => r.testId);

    return JSON.stringify(
      {
        quarantinedTests: quarantined,
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          testsToRetry: reports
            .filter((r) => r.recommendation === 'retry')
            .map((r) => r.testId),
        },
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}
```

### Retry Logic Integration

```typescript
// src/orchestrator/retry-handler.ts
import { FlakyDetector, FlakyTestReport } from './flaky-detector';

interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryablePatterns: RegExp[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  backoffMs: 500,
  backoffMultiplier: 2,
  retryablePatterns: [
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /net::ERR_CONNECTION_REFUSED/,
    /Target closed/,
    /Navigation timeout/,
    /waiting for selector/i,
  ],
};

export async function withRetry<T>(
  testFn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ result: T; attempts: number }> {
  let lastError: Error | undefined;
  let delay = config.backoffMs;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const result = await testFn();
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error as Error;

      if (attempt > config.maxRetries) break;

      const isRetryable = config.retryablePatterns.some((pattern) =>
        pattern.test(lastError!.message)
      );

      if (!isRetryable) break;

      console.warn(
        `Test attempt ${attempt} failed (retryable): ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= config.backoffMultiplier;
    }
  }

  throw lastError;
}

// Playwright integration
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 2,
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'stable',
      testMatch: /.*\.spec\.ts/,
      retries: 0,
    },
    {
      name: 'flaky-quarantine',
      testMatch: /.*\.flaky\.spec\.ts/,
      retries: 3,
      use: {
        trace: 'on',
      },
    },
  ],
});
```

## Parallel Execution Optimization

```typescript
// src/orchestrator/parallel-splitter.ts
interface TestBucket {
  workerId: number;
  tests: string[];
  estimatedDuration: number;
}

interface TestMetadata {
  testId: string;
  averageDuration: number;
  dependencies: string[];  // Tests that must run before this one
  resourceRequirements: string[];  // e.g., ['database', 'redis']
}

export class ParallelSplitter {
  /**
   * Split tests into balanced buckets for parallel execution.
   * Uses a greedy algorithm: assign each test to the bucket with
   * the smallest current total duration (like a min-heap).
   */
  splitByDuration(
    tests: TestMetadata[],
    workerCount: number
  ): TestBucket[] {
    // Sort tests by duration descending (longest first for better balancing)
    const sorted = [...tests].sort(
      (a, b) => b.averageDuration - a.averageDuration
    );

    const buckets: TestBucket[] = Array.from({ length: workerCount }, (_, i) => ({
      workerId: i,
      tests: [],
      estimatedDuration: 0,
    }));

    for (const test of sorted) {
      // Find the bucket with the smallest total duration
      const minBucket = buckets.reduce((min, bucket) =>
        bucket.estimatedDuration < min.estimatedDuration ? bucket : min
      );

      minBucket.tests.push(test.testId);
      minBucket.estimatedDuration += test.averageDuration;
    }

    return buckets;
  }

  /**
   * Split with resource constraints: tests needing the same
   * exclusive resource cannot run in parallel.
   */
  splitWithConstraints(
    tests: TestMetadata[],
    workerCount: number
  ): TestBucket[] {
    const resourceGroups = new Map<string, TestMetadata[]>();
    const noResourceTests: TestMetadata[] = [];

    for (const test of tests) {
      if (test.resourceRequirements.length === 0) {
        noResourceTests.push(test);
      } else {
        const key = test.resourceRequirements.sort().join(',');
        const group = resourceGroups.get(key) || [];
        group.push(test);
        resourceGroups.set(key, group);
      }
    }

    const buckets = this.splitByDuration(noResourceTests, workerCount);

    // Assign resource-constrained tests to the same worker
    for (const [, group] of resourceGroups) {
      const minBucket = buckets.reduce((min, bucket) =>
        bucket.estimatedDuration < min.estimatedDuration ? bucket : min
      );

      for (const test of group) {
        minBucket.tests.push(test.testId);
        minBucket.estimatedDuration += test.averageDuration;
      }
    }

    return buckets;
  }
}
```

### CI Integration for Parallel Execution

```yaml
# .github/workflows/parallel-tests.yml
name: Parallel Test Execution
on: [push]

jobs:
  plan:
    name: Plan Test Distribution
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.split.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - id: split
        run: |
          MATRIX=$(node scripts/plan-parallel.js --workers=4)
          echo "matrix=$MATRIX" >> $GITHUB_OUTPUT

  test:
    name: Test Shard ${{ matrix.shard }}
    needs: plan
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.plan.outputs.matrix) }}
      fail-fast: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: |
          npx vitest run --shard=${{ matrix.shard }}/${{ matrix.total }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ matrix.shard }}
          path: test-results/
```

## Predictive Test Failure Detection

```python
# scripts/train-model.py
"""
Train a simple model to predict which tests are likely to fail
based on code change features and historical test data.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score
import json
import pickle

def load_training_data(history_path: str) -> pd.DataFrame:
    """Load and prepare training data from test history."""
    with open(history_path) as f:
        records = json.load(f)

    rows = []
    for record in records:
        rows.append({
            'test_id': record['testId'],
            'files_changed': record['filesChanged'],
            'lines_added': record['linesAdded'],
            'lines_deleted': record['linesDeleted'],
            'recent_failure_rate': record['recentFailureRate'],
            'avg_duration': record['avgDuration'],
            'days_since_last_change': record['daysSinceLastChange'],
            'dependency_depth': record['dependencyDepth'],
            'code_complexity': record['codeComplexity'],
            'test_age_days': record['testAgeDays'],
            'failed': 1 if record['result'] == 'fail' else 0,
        })

    return pd.DataFrame(rows)

def train_prediction_model(data: pd.DataFrame):
    """Train a gradient boosting model for test failure prediction."""
    features = [
        'files_changed', 'lines_added', 'lines_deleted',
        'recent_failure_rate', 'avg_duration', 'days_since_last_change',
        'dependency_depth', 'code_complexity', 'test_age_days',
    ]

    X = data[features]
    y = data['failed']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        min_samples_split=10,
        random_state=42,
    )

    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    print(f"Precision: {precision_score(y_test, y_pred):.3f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.3f}")
    print(f"F1 Score:  {f1_score(y_test, y_pred):.3f}")

    # Feature importance
    importance = dict(zip(features, model.feature_importances_))
    print("\nFeature Importance:")
    for feat, imp in sorted(importance.items(), key=lambda x: -x[1]):
        print(f"  {feat}: {imp:.3f}")

    # Save model
    with open('models/test-predictor.pkl', 'wb') as f:
        pickle.dump(model, f)

    return model

if __name__ == '__main__':
    data = load_training_data('data/test-history.json')
    print(f"Training on {len(data)} records ({data['failed'].sum()} failures)")
    train_prediction_model(data)
```

### Prediction Integration in TypeScript

```typescript
// src/orchestrator/prediction-model.ts
import { execSync } from 'child_process';

interface PredictionResult {
  testId: string;
  failureProbability: number;
  confidence: number;
  topFactors: { name: string; contribution: number }[];
}

export class TestFailurePredictor {
  private modelPath: string;

  constructor(modelPath: string = 'models/test-predictor.pkl') {
    this.modelPath = modelPath;
  }

  predict(features: Map<string, Record<string, number>>): PredictionResult[] {
    // Call Python model via subprocess
    const input = JSON.stringify(Object.fromEntries(features));
    const output = execSync(
      `python3 scripts/predict.py --model=${this.modelPath} --input='${input}'`,
      { encoding: 'utf-8' }
    );

    return JSON.parse(output);
  }

  /**
   * Simple heuristic fallback when ML model is not available.
   * Uses weighted scoring based on observable features.
   */
  predictHeuristic(
    testId: string,
    recentFailureRate: number,
    filesChanged: number,
    linesChanged: number,
    daysSinceLastRun: number
  ): PredictionResult {
    const failureProbability = Math.min(
      1.0,
      recentFailureRate * 0.4 +
      Math.min(filesChanged / 20, 1) * 0.25 +
      Math.min(linesChanged / 500, 1) * 0.2 +
      Math.min(daysSinceLastRun / 30, 1) * 0.15
    );

    return {
      testId,
      failureProbability,
      confidence: 0.6, // Lower confidence for heuristic
      topFactors: [
        { name: 'recentFailureRate', contribution: recentFailureRate * 0.4 },
        { name: 'filesChanged', contribution: Math.min(filesChanged / 20, 1) * 0.25 },
        { name: 'linesChanged', contribution: Math.min(linesChanged / 500, 1) * 0.2 },
      ],
    };
  }
}
```

## Test Impact Analysis from Git Diffs

```typescript
// src/data/git-analysis.ts
import { execSync } from 'child_process';

interface ImpactAnalysis {
  changedFiles: string[];
  impactedModules: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedTestScope: 'unit' | 'integration' | 'e2e' | 'full';
}

export class GitAnalyzer {
  analyzeImpact(baseBranch: string = 'main'): ImpactAnalysis {
    const diff = execSync(
      `git diff --stat ${baseBranch}...HEAD`,
      { encoding: 'utf-8' }
    );

    const changedFiles = execSync(
      `git diff --name-only ${baseBranch}...HEAD`,
      { encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean);

    const impactedModules = this.identifyModules(changedFiles);
    const riskLevel = this.assessRisk(changedFiles);
    const recommendedTestScope = this.recommendScope(changedFiles, riskLevel);

    return { changedFiles, impactedModules, riskLevel, recommendedTestScope };
  }

  private identifyModules(files: string[]): string[] {
    const modules = new Set<string>();
    for (const file of files) {
      const parts = file.split('/');
      if (parts.length >= 2) {
        modules.add(`${parts[0]}/${parts[1]}`);
      }
    }
    return [...modules];
  }

  private assessRisk(files: string[]): ImpactAnalysis['riskLevel'] {
    const criticalPatterns = [
      /package\.json$/,
      /\.env/,
      /migration/,
      /schema\./,
      /auth\//,
      /middleware/,
    ];

    const highRiskPatterns = [
      /\.config\./,
      /api\//,
      /database\//,
    ];

    if (files.some((f) => criticalPatterns.some((p) => p.test(f)))) {
      return 'critical';
    }
    if (files.some((f) => highRiskPatterns.some((p) => p.test(f)))) {
      return 'high';
    }
    if (files.length > 20) {
      return 'high';
    }
    if (files.length > 5) {
      return 'medium';
    }
    return 'low';
  }

  private recommendScope(
    files: string[],
    riskLevel: ImpactAnalysis['riskLevel']
  ): ImpactAnalysis['recommendedTestScope'] {
    if (riskLevel === 'critical') return 'full';
    if (riskLevel === 'high') return 'e2e';

    const hasApiChanges = files.some((f) => /api\//.test(f));
    if (hasApiChanges) return 'integration';

    return 'unit';
  }
}
```

## Metrics and Reporting

```typescript
// src/reporters/metrics-collector.ts
interface OrchestrationMetrics {
  totalTests: number;
  testsSelected: number;
  testsSkipped: number;
  selectionAccuracy: number;    // Did we catch all failures?
  timeToFirstFailure: number;   // ms
  totalDuration: number;        // ms
  estimatedTimeSaved: number;   // ms (vs running all tests)
  falsePositiveRate: number;    // Skipped tests that would have failed
  parallelEfficiency: number;   // Actual speedup vs theoretical
}

export class MetricsCollector {
  private startTime: number = 0;
  private firstFailureTime: number | null = null;

  start(): void {
    this.startTime = Date.now();
  }

  recordFailure(): void {
    if (!this.firstFailureTime) {
      this.firstFailureTime = Date.now();
    }
  }

  generateReport(
    totalTests: number,
    selectedTests: number,
    fullSuiteDuration: number
  ): OrchestrationMetrics {
    const totalDuration = Date.now() - this.startTime;

    return {
      totalTests,
      testsSelected: selectedTests,
      testsSkipped: totalTests - selectedTests,
      selectionAccuracy: 0, // Filled after verification run
      timeToFirstFailure: this.firstFailureTime
        ? this.firstFailureTime - this.startTime
        : totalDuration,
      totalDuration,
      estimatedTimeSaved: fullSuiteDuration - totalDuration,
      falsePositiveRate: 0, // Filled after verification run
      parallelEfficiency: 0, // Filled after parallel run
    };
  }
}
```

## Best Practices

1. **Collect coverage data on every CI run** -- Store test-to-file mapping so the selector has accurate data.
2. **Retrain prediction models weekly** -- Historical data changes as the codebase evolves; stale models lose accuracy.
3. **Set a maximum skip threshold** -- Never skip more than 70% of tests on critical branches.
4. **Run the full suite nightly** -- Even with smart selection, run everything at least once daily to catch drift.
5. **Track selection accuracy** -- Measure how often skipped tests would have failed; aim for less than 1% miss rate.
6. **Use file-level coverage as a baseline** -- Function-level analysis is better but file-level is a good starting point.
7. **Balance parallel shards by duration, not count** -- 10 fast tests and 1 slow test are not balanced.
8. **Version your test metadata** -- Store historical results in a database or JSON files committed to the repo.
9. **Alert on flakiness trends** -- If flakiness increases, investigate before it erodes trust in the suite.
10. **Integrate with PR comments** -- Report which tests were selected/skipped and why, directly on the pull request.

## Anti-Patterns to Avoid

1. **Skipping tests without coverage data** -- Guessing which tests to skip leads to missed regressions.
2. **Retrying indefinitely** -- Cap retries at 3; if a test fails 3 times, it is broken, not flaky.
3. **Ignoring flaky tests** -- Unanswered flakiness erodes team confidence in the entire test suite.
4. **Static test sharding** -- Splitting by file count instead of duration creates unbalanced workers.
5. **Overfitting the prediction model** -- A model trained only on recent data misses rare edge cases.
6. **Running all tests on every commit** -- This wastes CI resources and slows developer feedback loops.
7. **Not validating the selector** -- Periodically run the full suite to verify the selector is not missing failures.
8. **Hardcoding test priorities** -- Priority should be data-driven, not based on developer intuition.
9. **Sharing mutable state between parallel workers** -- Tests sharing a database without isolation will break each other.
10. **No observability** -- Without metrics on selection accuracy and time savings, you cannot improve the system.

## Running the Orchestrator

```bash
# Analyze impact of current changes
npx tsx src/data/git-analysis.ts --base=main

# Select tests based on code changes
npx tsx src/orchestrator/test-selector.ts --base=main --output=selected-tests.json

# Score and prioritize tests
npx tsx src/orchestrator/risk-scorer.ts --input=selected-tests.json --output=prioritized.json

# Analyze flaky tests from history
npx tsx scripts/analyze-flakiness.ts --history=data/test-history.json

# Plan parallel execution
npx tsx src/orchestrator/parallel-splitter.ts --workers=4 --input=prioritized.json

# Train prediction model (Python)
python3 scripts/train-model.py --data=data/test-history.json

# Run selected tests only
npx vitest run $(cat selected-tests.json | jq -r '.mustRun[]' | tr '\n' ' ')

# Run with orchestration report
npx tsx src/reporters/orchestration-report.ts --run-id=$(date +%s)
```
