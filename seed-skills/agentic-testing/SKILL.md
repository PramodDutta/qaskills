---
name: Agentic Testing Patterns
description: AI-first testing methodology where autonomous agents plan, generate, execute, and maintain test suites with minimal human intervention, covering agent orchestration, feedback loops, and intelligent test prioritization.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [agentic-testing, ai-first, autonomous-testing, test-orchestration, intelligent-testing, feedback-loops, test-prioritization, autonomous-agents, ai-qa]
testingTypes: [e2e, integration, unit, performance, accessibility]
frameworks: [playwright, vitest, jest, cypress]
languages: [typescript, javascript, python]
domains: [web, backend, api, mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Agentic Testing Patterns Skill

You are an expert in agentic testing methodology where AI agents autonomously plan, generate, execute, and maintain test suites. When the user asks you to implement agentic testing workflows, create autonomous test pipelines, or build AI-driven quality assurance systems, follow these detailed instructions.

## Core Principles

1. **Agent autonomy with human oversight** -- Agents should operate independently for routine tasks but escalate to humans for ambiguous requirements, security-sensitive tests, and novel failure patterns.
2. **Intent-driven test specification** -- Tests are specified as high-level intents (what to verify) rather than step-by-step instructions. Agents determine the optimal implementation strategy.
3. **Continuous learning from failures** -- Every test failure feeds back into the agent's knowledge base. Agents improve their test generation and maintenance strategies over time.
4. **Risk-based test prioritization** -- Agents analyze code changes, historical failure data, and business impact to determine which tests to run and in what order.
5. **Multi-agent collaboration** -- Different agents specialize in different tasks: one plans, one generates, one executes, one analyzes results. They communicate through structured protocols.
6. **Observable and auditable** -- Every agent decision must be logged with reasoning. Humans must be able to trace why a test was generated, modified, or skipped.
7. **Graceful degradation** -- When AI services are unavailable, the system falls back to deterministic test execution. Agent-generated tests must be valid standalone tests.

## Project Structure

```
agentic-tests/
  agents/
    coordinator/
      coordinator-agent.ts
      task-queue.ts
      priority-engine.ts
    analyzer/
      code-change-analyzer.ts
      failure-pattern-detector.ts
      coverage-gap-finder.ts
    generator/
      test-generator.ts
      fixture-generator.ts
      mock-generator.ts
    executor/
      test-runner.ts
      parallel-executor.ts
      result-collector.ts
    reporter/
      insight-generator.ts
      trend-analyzer.ts
      alert-system.ts
  knowledge/
    failure-patterns.json
    selector-mappings.json
    test-templates/
      unit-template.ts
      integration-template.ts
      e2e-template.ts
  pipelines/
    ci-pipeline.ts
    pr-review-pipeline.ts
    nightly-pipeline.ts
    deployment-pipeline.ts
  config/
    agent-config.ts
    pipeline-config.ts
    model-config.ts
  tests/
    agent-tests/
      coordinator.test.ts
      analyzer.test.ts
      generator.test.ts
  monitoring/
    agent-metrics.ts
    cost-dashboard.ts
    quality-tracker.ts
```

## Coordinator Agent

```typescript
// agentic-tests/agents/coordinator/coordinator-agent.ts
import { CodeChangeAnalyzer, ChangeAnalysis } from '../analyzer/code-change-analyzer';
import { TestGenerator } from '../generator/test-generator';
import { TestExecutor, ExecutionResult } from '../executor/test-runner';
import { InsightGenerator } from '../reporter/insight-generator';

export interface AgenticTask {
  id: string;
  type: 'generate' | 'execute' | 'heal' | 'analyze' | 'report';
  priority: number;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  assignedAgent?: string;
  result?: unknown;
  createdAt: string;
  completedAt?: string;
}

export interface CoordinatorConfig {
  maxConcurrentTasks: number;
  maxBudgetPerPipeline: number;
  escalationThreshold: number;
  autoApproveConfidence: number;
}

export class CoordinatorAgent {
  private taskQueue: AgenticTask[] = [];
  private analyzer: CodeChangeAnalyzer;
  private generator: TestGenerator;
  private executor: TestExecutor;
  private reporter: InsightGenerator;
  private config: CoordinatorConfig;

  constructor(config: Partial<CoordinatorConfig> = {}) {
    this.analyzer = new CodeChangeAnalyzer();
    this.generator = new TestGenerator();
    this.executor = new TestExecutor();
    this.reporter = new InsightGenerator();
    this.config = {
      maxConcurrentTasks: 5,
      maxBudgetPerPipeline: 20.0,
      escalationThreshold: 0.6,
      autoApproveConfidence: 0.85,
      ...config,
    };
  }

  async runPipeline(trigger: PipelineTrigger): Promise<PipelineResult> {
    const startTime = Date.now();
    const tasks: AgenticTask[] = [];

    // Phase 1: Analyze what changed
    const analysis = await this.analyzer.analyzeChanges(trigger.changes);

    // Phase 2: Determine what tests to generate or update
    const testPlan = this.createTestPlan(analysis, trigger);

    // Phase 3: Generate new tests for uncovered changes
    for (const gap of testPlan.coverageGaps) {
      const task = this.createTask('generate', { gap, analysis });
      tasks.push(task);
      const generated = await this.generator.generateForGap(gap);
      task.result = generated;
      task.status = 'completed';
    }

    // Phase 4: Execute all relevant tests
    const testFiles = this.selectTestsToRun(analysis, testPlan);
    const executionResult = await this.executor.runTests(testFiles);

    // Phase 5: Analyze results and generate report
    const insights = await this.reporter.generateInsights(executionResult, analysis);

    // Phase 6: Handle failures
    if (executionResult.failures.length > 0) {
      await this.handleFailures(executionResult.failures);
    }

    return {
      duration: Date.now() - startTime,
      testsRun: executionResult.total,
      testsPassed: executionResult.passed,
      testsFailed: executionResult.failures.length,
      testsGenerated: testPlan.coverageGaps.length,
      insights,
      tasks,
    };
  }

  private createTestPlan(analysis: ChangeAnalysis, trigger: PipelineTrigger): TestPlan {
    const coverageGaps = analysis.uncoveredChanges.map((change) => ({
      file: change.file,
      functions: change.functions,
      suggestedTestType: this.inferTestType(change),
      priority: this.calculatePriority(change),
    }));

    const existingTests = analysis.affectedTests.map((test) => ({
      file: test,
      needsUpdate: analysis.brokenTests.includes(test),
    }));

    return {
      coverageGaps: coverageGaps.sort((a, b) => b.priority - a.priority),
      existingTests,
      estimatedDuration: coverageGaps.length * 30 + existingTests.length * 5,
    };
  }

  private inferTestType(change: any): string {
    if (change.file.includes('/api/') || change.file.includes('/routes/')) return 'api';
    if (change.file.includes('/components/') || change.file.includes('/pages/')) return 'e2e';
    if (change.file.includes('/utils/') || change.file.includes('/lib/')) return 'unit';
    return 'integration';
  }

  private calculatePriority(change: any): number {
    let priority = 5;
    if (change.file.includes('auth') || change.file.includes('payment')) priority += 3;
    if (change.linesChanged > 50) priority += 2;
    if (change.isNewFile) priority += 1;
    return Math.min(10, priority);
  }

  private selectTestsToRun(analysis: ChangeAnalysis, plan: TestPlan): string[] {
    const tests = new Set<string>();
    for (const test of analysis.affectedTests) tests.add(test);
    for (const test of analysis.directlyAffectedTests) tests.add(test);
    return [...tests];
  }

  private async handleFailures(failures: any[]): Promise<void> {
    for (const failure of failures) {
      if (failure.isFlaky) {
        console.log(`Flaky test detected: ${failure.testName}. Retrying...`);
      } else if (failure.isNewFailure) {
        console.log(`New failure: ${failure.testName}. Escalating for review.`);
      }
    }
  }

  private createTask(type: AgenticTask['type'], payload: Record<string, unknown>): AgenticTask {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type,
      priority: 5,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }
}

interface PipelineTrigger {
  type: 'push' | 'pr' | 'schedule' | 'manual';
  changes: string[];
  branch: string;
  commit: string;
}

interface PipelineResult {
  duration: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsGenerated: number;
  insights: any;
  tasks: AgenticTask[];
}

interface TestPlan {
  coverageGaps: any[];
  existingTests: any[];
  estimatedDuration: number;
}
```

## Code Change Analyzer

```typescript
// agentic-tests/agents/analyzer/code-change-analyzer.ts
import { execSync } from 'child_process';

export interface ChangeAnalysis {
  changedFiles: FileChange[];
  affectedTests: string[];
  directlyAffectedTests: string[];
  uncoveredChanges: FileChange[];
  brokenTests: string[];
  riskScore: number;
  summary: string;
}

export interface FileChange {
  file: string;
  linesChanged: number;
  functions: string[];
  isNewFile: boolean;
  isDeleted: boolean;
  changeType: 'feature' | 'bugfix' | 'refactor' | 'config' | 'test';
}

export class CodeChangeAnalyzer {
  async analyzeChanges(files: string[]): Promise<ChangeAnalysis> {
    const changedFiles = await this.getFileDetails(files);
    const affectedTests = this.findAffectedTests(changedFiles);
    const directlyAffectedTests = this.findDirectTests(changedFiles);
    const uncoveredChanges = this.findUncoveredChanges(changedFiles, affectedTests);
    const riskScore = this.calculateRiskScore(changedFiles);

    return {
      changedFiles,
      affectedTests,
      directlyAffectedTests,
      uncoveredChanges,
      brokenTests: [],
      riskScore,
      summary: this.buildSummary(changedFiles, riskScore),
    };
  }

  private async getFileDetails(files: string[]): Promise<FileChange[]> {
    return files.map((file) => {
      const isTest = file.includes('.test.') || file.includes('.spec.');
      return {
        file,
        linesChanged: this.countChangedLines(file),
        functions: this.extractChangedFunctions(file),
        isNewFile: this.isNewFile(file),
        isDeleted: false,
        changeType: isTest ? 'test' : this.inferChangeType(file),
      };
    });
  }

  private countChangedLines(file: string): number {
    try {
      const diff = execSync(`git diff --numstat HEAD~1 -- "${file}"`, { encoding: 'utf-8' });
      const parts = diff.trim().split('\t');
      return parseInt(parts[0] || '0', 10) + parseInt(parts[1] || '0', 10);
    } catch {
      return 0;
    }
  }

  private extractChangedFunctions(file: string): string[] {
    try {
      const diff = execSync(`git diff -U0 HEAD~1 -- "${file}"`, { encoding: 'utf-8' });
      const functionMatches = diff.match(/(?:function|const|class|export)\s+(\w+)/g) || [];
      return [...new Set(functionMatches.map((m) => m.split(/\s+/).pop()!))];
    } catch {
      return [];
    }
  }

  private isNewFile(file: string): boolean {
    try {
      execSync(`git log --oneline -1 HEAD~1 -- "${file}"`, { encoding: 'utf-8' });
      return false;
    } catch {
      return true;
    }
  }

  private inferChangeType(file: string): FileChange['changeType'] {
    if (file.includes('config') || file.endsWith('.json') || file.endsWith('.yaml')) return 'config';
    if (file.includes('fix') || file.includes('bug')) return 'bugfix';
    return 'feature';
  }

  private findAffectedTests(changes: FileChange[]): string[] {
    const tests: string[] = [];
    for (const change of changes) {
      const basename = change.file.replace(/\.(ts|js|tsx|jsx)$/, '');
      const possibleTests = [
        `${basename}.test.ts`,
        `${basename}.spec.ts`,
        `${basename}.test.tsx`,
        `__tests__/${basename.split('/').pop()}.test.ts`,
      ];
      tests.push(...possibleTests);
    }
    return [...new Set(tests)];
  }

  private findDirectTests(changes: FileChange[]): string[] {
    return changes
      .filter((c) => c.changeType === 'test')
      .map((c) => c.file);
  }

  private findUncoveredChanges(changes: FileChange[], tests: string[]): FileChange[] {
    return changes.filter((change) => {
      if (change.changeType === 'test') return false;
      const basename = change.file.replace(/\.(ts|js|tsx|jsx)$/, '');
      return !tests.some((test) => test.includes(basename.split('/').pop()!));
    });
  }

  private calculateRiskScore(changes: FileChange[]): number {
    let score = 0;
    for (const change of changes) {
      if (change.file.includes('auth')) score += 3;
      if (change.file.includes('payment') || change.file.includes('billing')) score += 3;
      if (change.file.includes('security')) score += 3;
      if (change.linesChanged > 100) score += 2;
      if (change.isNewFile) score += 1;
      score += change.functions.length * 0.5;
    }
    return Math.min(10, score);
  }

  private buildSummary(changes: FileChange[], riskScore: number): string {
    const total = changes.length;
    const newFiles = changes.filter((c) => c.isNewFile).length;
    const totalLines = changes.reduce((sum, c) => sum + c.linesChanged, 0);
    return `${total} files changed (${newFiles} new), ${totalLines} lines modified, risk score: ${riskScore}/10`;
  }
}
```

## Intelligent Test Generator

```typescript
// agentic-tests/agents/generator/test-generator.ts
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

export interface TestGenerationRequest {
  sourceFile: string;
  sourceCode: string;
  testType: 'unit' | 'integration' | 'e2e' | 'api';
  existingTests?: string;
  coverageReport?: string;
}

export interface GeneratedTestSuite {
  testFile: string;
  testCode: string;
  testCount: number;
  coverageEstimate: number;
  confidence: number;
  reasoning: string;
}

export class TestGenerator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async generateForGap(gap: any): Promise<GeneratedTestSuite> {
    const sourceCode = readFileSync(gap.file, 'utf-8');
    return this.generateTests({
      sourceFile: gap.file,
      sourceCode,
      testType: gap.suggestedTestType,
    });
  }

  async generateTests(request: TestGenerationRequest): Promise<GeneratedTestSuite> {
    const systemPrompt = `You are an expert test generator. Generate comprehensive tests following these rules:
1. Cover all public functions and edge cases
2. Use descriptive test names that explain the expected behavior
3. Follow the Arrange-Act-Assert pattern
4. Include both positive and negative test cases
5. Mock external dependencies appropriately
6. Use TypeScript with strict types
7. Generate tests appropriate for the test type (unit/integration/e2e/api)`;

    const prompt = `Generate ${request.testType} tests for this file:

File: ${request.sourceFile}
\`\`\`typescript
${request.sourceCode}
\`\`\`

${request.existingTests ? `Existing tests (avoid duplication):\n${request.existingTests}` : ''}
${request.coverageReport ? `Coverage gaps:\n${request.coverageReport}` : ''}

Generate a complete test file. Return ONLY valid TypeScript code.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const codeMatch = text.match(/```typescript\n([\s\S]*?)```/);
    const testCode = codeMatch ? codeMatch[1] : text;

    const testCount = (testCode.match(/\bit\s*\(/g) || []).length;

    return {
      testFile: request.sourceFile.replace(/\.(ts|tsx)$/, '.test.ts'),
      testCode: testCode.trim(),
      testCount,
      coverageEstimate: Math.min(95, testCount * 15),
      confidence: 0.8,
      reasoning: `Generated ${testCount} ${request.testType} tests covering public API`,
    };
  }
}
```

## Failure Pattern Detector

```typescript
// agentic-tests/agents/analyzer/failure-pattern-detector.ts
export interface FailurePattern {
  pattern: string;
  frequency: number;
  lastSeen: string;
  affectedTests: string[];
  rootCause: string;
  suggestedFix: string;
  isFlaky: boolean;
}

export class FailurePatternDetector {
  private patterns: Map<string, FailurePattern> = new Map();

  recordFailure(testName: string, errorMessage: string, stackTrace: string): void {
    const patternKey = this.extractPattern(errorMessage, stackTrace);
    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
      if (!existing.affectedTests.includes(testName)) {
        existing.affectedTests.push(testName);
      }
    } else {
      this.patterns.set(patternKey, {
        pattern: patternKey,
        frequency: 1,
        lastSeen: new Date().toISOString(),
        affectedTests: [testName],
        rootCause: this.inferRootCause(errorMessage, stackTrace),
        suggestedFix: this.suggestFix(errorMessage),
        isFlaky: false,
      });
    }
  }

  detectFlakyTests(history: Array<{ testName: string; passed: boolean }>): string[] {
    const testResults = new Map<string, boolean[]>();

    for (const run of history) {
      const results = testResults.get(run.testName) || [];
      results.push(run.passed);
      testResults.set(run.testName, results);
    }

    const flakyTests: string[] = [];
    for (const [testName, results] of testResults) {
      if (results.length >= 3) {
        const passRate = results.filter(Boolean).length / results.length;
        if (passRate > 0.1 && passRate < 0.9) {
          flakyTests.push(testName);
        }
      }
    }

    return flakyTests;
  }

  getTopPatterns(limit = 10): FailurePattern[] {
    return [...this.patterns.values()]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  private extractPattern(error: string, stack: string): string {
    const normalized = error
      .replace(/\d+/g, 'N')
      .replace(/['"][^'"]*['"]/g, '"..."')
      .replace(/0x[a-f0-9]+/gi, '0xADDR')
      .trim();
    return normalized.substring(0, 200);
  }

  private inferRootCause(error: string, stack: string): string {
    if (error.includes('timeout')) return 'Element not found within timeout period';
    if (error.includes('ECONNREFUSED')) return 'Server not running or not accessible';
    if (error.includes('selector')) return 'DOM element selector changed';
    if (error.includes('assertion')) return 'Expected value does not match actual';
    return 'Unknown root cause - requires investigation';
  }

  private suggestFix(error: string): string {
    if (error.includes('timeout')) return 'Increase timeout or add explicit wait for element';
    if (error.includes('ECONNREFUSED')) return 'Verify server is running before test execution';
    if (error.includes('selector')) return 'Update selector to use data-testid or ARIA role';
    return 'Review test and application code for changes';
  }
}
```

## Pipeline Configuration

```typescript
// agentic-tests/pipelines/pr-review-pipeline.ts
import { CoordinatorAgent } from '../agents/coordinator/coordinator-agent';

export async function runPRReviewPipeline(prInfo: {
  branch: string;
  commit: string;
  changedFiles: string[];
  prTitle: string;
  prBody: string;
}): Promise<{
  approved: boolean;
  summary: string;
  details: any;
}> {
  const coordinator = new CoordinatorAgent({
    maxConcurrentTasks: 3,
    maxBudgetPerPipeline: 5.0,
    autoApproveConfidence: 0.9,
  });

  const result = await coordinator.runPipeline({
    type: 'pr',
    changes: prInfo.changedFiles,
    branch: prInfo.branch,
    commit: prInfo.commit,
  });

  const approved = result.testsFailed === 0 && result.testsRun > 0;

  return {
    approved,
    summary: approved
      ? `All ${result.testsRun} tests passed. ${result.testsGenerated} new tests generated.`
      : `${result.testsFailed}/${result.testsRun} tests failed. Review required.`,
    details: result,
  };
}
```

## Agent Metrics and Monitoring

```typescript
// agentic-tests/monitoring/agent-metrics.ts
export interface AgentMetrics {
  totalRuns: number;
  totalTestsGenerated: number;
  totalTestsHealed: number;
  totalCost: number;
  averageConfidence: number;
  healingSuccessRate: number;
  generationAccuracy: number;
  averagePipelineDuration: number;
}

export class AgentMetricsCollector {
  private metrics: AgentMetrics = {
    totalRuns: 0,
    totalTestsGenerated: 0,
    totalTestsHealed: 0,
    totalCost: 0,
    averageConfidence: 0,
    healingSuccessRate: 0,
    generationAccuracy: 0,
    averagePipelineDuration: 0,
  };

  private confidenceScores: number[] = [];
  private healingAttempts = 0;
  private healingSuccesses = 0;
  private pipelineDurations: number[] = [];

  recordRun(result: {
    testsGenerated: number;
    testsHealed: number;
    cost: number;
    confidence: number;
    duration: number;
    healingSuccess: boolean;
  }): void {
    this.metrics.totalRuns++;
    this.metrics.totalTestsGenerated += result.testsGenerated;
    this.metrics.totalTestsHealed += result.testsHealed;
    this.metrics.totalCost += result.cost;
    this.confidenceScores.push(result.confidence);
    this.pipelineDurations.push(result.duration);

    if (result.testsHealed > 0) {
      this.healingAttempts++;
      if (result.healingSuccess) this.healingSuccesses++;
    }

    this.metrics.averageConfidence =
      this.confidenceScores.reduce((a, b) => a + b, 0) / this.confidenceScores.length;
    this.metrics.healingSuccessRate =
      this.healingAttempts > 0 ? this.healingSuccesses / this.healingAttempts : 0;
    this.metrics.averagePipelineDuration =
      this.pipelineDurations.reduce((a, b) => a + b, 0) / this.pipelineDurations.length;
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  getReport(): string {
    const m = this.metrics;
    return [
      `=== Agentic Testing Metrics ===`,
      `Total runs: ${m.totalRuns}`,
      `Tests generated: ${m.totalTestsGenerated}`,
      `Tests healed: ${m.totalTestsHealed}`,
      `Total cost: $${m.totalCost.toFixed(2)}`,
      `Avg confidence: ${(m.averageConfidence * 100).toFixed(1)}%`,
      `Healing success rate: ${(m.healingSuccessRate * 100).toFixed(1)}%`,
      `Avg pipeline duration: ${(m.averagePipelineDuration / 1000).toFixed(1)}s`,
    ].join('\n');
  }
}
```

## Best Practices

1. **Start with high-value, low-risk automation** -- Begin agentic testing with unit test generation for utility functions before graduating to complex E2E scenarios.
2. **Establish baselines before enabling agents** -- Measure your current test coverage, failure rates, and maintenance costs so you can quantify the impact of agentic testing.
3. **Use structured agent communication** -- Agents should exchange typed JSON messages, not free-form text. Define schemas for every inter-agent message.
4. **Implement circuit breakers for agent failures** -- If an agent fails 3 times in a row, disable it and alert the team rather than retrying indefinitely.
5. **Keep generated tests readable** -- Configure agents to generate well-formatted, commented tests that humans can understand and maintain.
6. **Track cost per test generated** -- Monitor the LLM API cost for each generated test. If cost exceeds the value of the test, reconsider the approach.
7. **Run agents in sandboxed environments** -- Agent-generated code should execute in isolated environments before being promoted to the main test suite.
8. **Version agent prompts like code** -- Store system prompts and generation templates in version control so changes can be reviewed and rolled back.
9. **Maintain a human-curated golden suite** -- Keep a set of hand-written critical path tests that serve as the ultimate quality gate, independent of agents.
10. **Review agent decisions weekly** -- Schedule regular reviews of what agents generated, healed, and skipped. Adjust configurations based on findings.

## Anti-Patterns

1. **Fully autonomous testing without guardrails** -- Agents that generate and commit tests without any human review will eventually introduce incorrect or dangerous test code.
2. **Using a single monolithic agent** -- One agent doing everything is hard to debug and optimize. Decompose into specialized agents with clear interfaces.
3. **Ignoring agent costs in sprint planning** -- LLM API costs for agentic testing can scale quickly. Budget for agent operations like any other infrastructure cost.
4. **Training agents on production data** -- Never feed production user data into agent prompts. Use synthetic or anonymized test data exclusively.
5. **Treating agent-generated tests as authoritative** -- Generated tests can have false assertions. Always validate against known-good baselines.
6. **Not handling agent service outages** -- If the LLM API is down, your test pipeline should not break. Implement fallback to standard test execution.
7. **Generating tests faster than they can be reviewed** -- A backlog of unreviewed generated tests defeats the purpose. Match generation speed to review capacity.
8. **Skipping observability for agent decisions** -- Without logging why an agent generated a specific test, debugging false positives becomes impossible.
9. **Using agents for compliance-critical tests** -- Regulatory compliance tests should be written and reviewed by humans. Agents can supplement but not replace human judgment for compliance.
10. **Not measuring agent ROI** -- If agentic testing costs more in API fees and maintenance than it saves in developer time, it is not providing value. Measure and optimize.
