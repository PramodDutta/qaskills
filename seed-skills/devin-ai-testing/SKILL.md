---
name: Autonomous Agent Testing
description: Testing patterns for autonomous AI coding agents like Devin and SWE-Agent including task verification, output validation, sandboxed execution, regression testing for agent behavior, and safety guardrails for autonomous code generation.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [autonomous-agents, devin, swe-agent, agent-testing, task-verification, sandboxed-execution, safety-guardrails, code-review, output-validation, ai-coding]
testingTypes: [e2e, integration, unit, security]
frameworks: [vitest, jest, playwright]
languages: [typescript, javascript, python]
domains: [ai, backend, web, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Autonomous Agent Testing Skill

You are an expert in testing autonomous AI coding agents. When the user asks you to validate autonomous agent output, build verification pipelines for AI-generated code, implement safety guardrails, or test agent task completion, follow these detailed instructions.

## Core Principles

1. **Output verification over process observation** -- Test what the agent produced (code, tests, configurations), not how it produced it. The output must meet specifications regardless of the generation process.
2. **Sandboxed execution** -- Never run agent-generated code in production environments. Always execute in isolated sandboxes with limited permissions.
3. **Multi-layer validation** -- Validate agent output at multiple levels: syntax checking, type checking, test execution, security scanning, and human review.
4. **Task specification clarity** -- Autonomous agents are only as good as their task descriptions. Test that the agent correctly interprets ambiguous or incomplete specifications.
5. **Regression testing for agent behavior** -- Track agent performance across versions. When the underlying model changes, verify that task completion quality does not degrade.
6. **Safety guardrails** -- Implement hard limits on what agents can access, modify, and execute. Restrict file system access, network calls, and system commands.
7. **Determinism where possible** -- For reproducible testing, pin agent model versions, temperature settings, and random seeds to reduce output variability.

## Project Structure

```
agent-testing/
  tasks/
    definitions/
      simple-function.task.yaml
      api-endpoint.task.yaml
      bug-fix.task.yaml
      refactoring.task.yaml
      test-writing.task.yaml
    expected-outputs/
      simple-function/
        expected-code.ts
        expected-tests.ts
      api-endpoint/
        expected-route.ts
        expected-handler.ts
  validators/
    syntax-validator.ts
    type-validator.ts
    test-runner-validator.ts
    security-scanner.ts
    style-validator.ts
    output-comparator.ts
  sandbox/
    docker-sandbox.ts
    permission-manager.ts
    resource-limiter.ts
    network-policy.ts
  runners/
    task-runner.ts
    batch-runner.ts
    regression-runner.ts
  safety/
    guardrails.ts
    file-access-policy.ts
    command-allowlist.ts
    secret-detector.ts
  metrics/
    task-completion-tracker.ts
    quality-scorer.ts
    cost-tracker.ts
  reports/
    agent-report.ts
    comparison-report.ts
  config/
    agent-config.ts
    sandbox-config.ts
```

## Task Definition Format

```yaml
# tasks/definitions/simple-function.task.yaml
id: task-001
name: "Implement debounce function"
description: |
  Create a TypeScript debounce function that:
  1. Takes a function and delay in milliseconds
  2. Returns a debounced version of the function
  3. Supports cancellation via a cancel() method
  4. Preserves the 'this' context
  5. Passes all arguments to the original function
type: code-generation
language: typescript
difficulty: medium
expected_files:
  - path: src/utils/debounce.ts
    must_contain:
      - "export function debounce"
      - "cancel"
      - "clearTimeout"
  - path: src/utils/debounce.test.ts
    must_contain:
      - "describe"
      - "it("
      - "expect"
constraints:
  max_files_modified: 3
  max_lines_of_code: 100
  no_external_dependencies: true
  must_pass_typecheck: true
  must_pass_tests: true
  must_pass_lint: true
verification:
  syntax: true
  types: true
  tests: true
  security: true
  style: true
timeout_minutes: 10
```

## Output Validator Pipeline

```typescript
// validators/output-comparator.ts
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

export interface ValidationResult {
  step: string;
  passed: boolean;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface AgentOutput {
  taskId: string;
  files: Array<{ path: string; content: string }>;
  commands: string[];
  duration: number;
  agentVersion: string;
}

export class OutputValidator {
  async validateAll(output: AgentOutput, taskDef: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Step 1: File existence check
    results.push(this.validateFileExistence(output, taskDef));

    // Step 2: Syntax check
    results.push(await this.validateSyntax(output));

    // Step 3: Type check
    results.push(await this.validateTypes(output));

    // Step 4: Content requirements
    results.push(...this.validateContentRequirements(output, taskDef));

    // Step 5: Security scan
    results.push(await this.validateSecurity(output));

    // Step 6: Test execution
    results.push(await this.validateTests(output));

    // Step 7: Constraint compliance
    results.push(...this.validateConstraints(output, taskDef));

    // Step 8: Style check
    results.push(await this.validateStyle(output));

    return results;
  }

  private validateFileExistence(output: AgentOutput, taskDef: any): ValidationResult {
    const expectedFiles = taskDef.expected_files.map((f: any) => f.path);
    const generatedFiles = output.files.map((f) => f.path);
    const missing = expectedFiles.filter((f: string) => !generatedFiles.includes(f));

    return {
      step: 'file-existence',
      passed: missing.length === 0,
      details: missing.length === 0
        ? `All ${expectedFiles.length} expected files present`
        : `Missing files: ${missing.join(', ')}`,
      severity: 'critical',
    };
  }

  private async validateSyntax(output: AgentOutput): Promise<ValidationResult> {
    try {
      for (const file of output.files) {
        if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
          // Use TypeScript compiler API for syntax check
          const ts = await import('typescript');
          const sourceFile = ts.createSourceFile(
            file.path,
            file.content,
            ts.ScriptTarget.Latest,
            true
          );
          const diagnostics = sourceFile.parseDiagnostics || [];
          if (diagnostics.length > 0) {
            return {
              step: 'syntax',
              passed: false,
              details: `Syntax errors in ${file.path}: ${diagnostics.length} error(s)`,
              severity: 'critical',
            };
          }
        }
      }
      return { step: 'syntax', passed: true, details: 'All files pass syntax check', severity: 'critical' };
    } catch (error: any) {
      return { step: 'syntax', passed: false, details: error.message, severity: 'critical' };
    }
  }

  private async validateTypes(output: AgentOutput): Promise<ValidationResult> {
    try {
      execSync('npx tsc --noEmit', { cwd: '/tmp/sandbox', encoding: 'utf-8' });
      return { step: 'types', passed: true, details: 'Type checking passed', severity: 'critical' };
    } catch (error: any) {
      return { step: 'types', passed: false, details: `Type errors: ${error.stdout}`, severity: 'critical' };
    }
  }

  private validateContentRequirements(output: AgentOutput, taskDef: any): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const expected of taskDef.expected_files) {
      const file = output.files.find((f) => f.path === expected.path);
      if (!file) continue;

      for (const requirement of expected.must_contain || []) {
        const passed = file.content.includes(requirement);
        results.push({
          step: `content-${expected.path}`,
          passed,
          details: passed
            ? `Found required content: "${requirement}"`
            : `Missing required content: "${requirement}" in ${expected.path}`,
          severity: 'warning',
        });
      }
    }

    return results;
  }

  private async validateSecurity(output: AgentOutput): Promise<ValidationResult> {
    const issues: string[] = [];

    for (const file of output.files) {
      // Check for hardcoded secrets
      if (/(?:password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{8,}/i.test(file.content)) {
        issues.push(`Potential hardcoded secret in ${file.path}`);
      }

      // Check for dangerous patterns
      if (/eval\s*\(/.test(file.content)) {
        issues.push(`eval() usage in ${file.path}`);
      }

      if (/exec(?:Sync)?\s*\(/.test(file.content) && !file.path.includes('test')) {
        issues.push(`Shell execution in non-test file ${file.path}`);
      }

      // Check for unrestricted file access
      if (/(?:readFileSync|writeFileSync|fs\.)\s*\([^)]*(?:\/etc|\/proc|\/sys|\.env)/.test(file.content)) {
        issues.push(`Sensitive file access in ${file.path}`);
      }
    }

    return {
      step: 'security',
      passed: issues.length === 0,
      details: issues.length === 0 ? 'No security issues detected' : issues.join('; '),
      severity: 'critical',
    };
  }

  private async validateTests(output: AgentOutput): Promise<ValidationResult> {
    try {
      const result = execSync('npx vitest run --reporter=json', {
        cwd: '/tmp/sandbox',
        encoding: 'utf-8',
        timeout: 60000,
      });

      const parsed = JSON.parse(result);
      const passed = parsed.numPassedTests || 0;
      const failed = parsed.numFailedTests || 0;

      return {
        step: 'tests',
        passed: failed === 0 && passed > 0,
        details: `${passed} tests passed, ${failed} failed`,
        severity: 'critical',
      };
    } catch (error: any) {
      return { step: 'tests', passed: false, details: `Test execution failed: ${error.message}`, severity: 'critical' };
    }
  }

  private validateConstraints(output: AgentOutput, taskDef: any): ValidationResult[] {
    const results: ValidationResult[] = [];
    const constraints = taskDef.constraints || {};

    if (constraints.max_files_modified) {
      const passed = output.files.length <= constraints.max_files_modified;
      results.push({
        step: 'constraint-files',
        passed,
        details: `Files: ${output.files.length}/${constraints.max_files_modified}`,
        severity: 'warning',
      });
    }

    if (constraints.max_lines_of_code) {
      const totalLines = output.files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
      const passed = totalLines <= constraints.max_lines_of_code;
      results.push({
        step: 'constraint-lines',
        passed,
        details: `Lines: ${totalLines}/${constraints.max_lines_of_code}`,
        severity: 'warning',
      });
    }

    if (constraints.no_external_dependencies) {
      const hasNewDeps = output.files.some((f) =>
        f.path === 'package.json' && f.content.includes('"dependencies"')
      );
      results.push({
        step: 'constraint-deps',
        passed: !hasNewDeps,
        details: hasNewDeps ? 'New dependencies added' : 'No new dependencies',
        severity: 'warning',
      });
    }

    return results;
  }

  private async validateStyle(output: AgentOutput): Promise<ValidationResult> {
    try {
      execSync('npx prettier --check .', { cwd: '/tmp/sandbox', encoding: 'utf-8' });
      return { step: 'style', passed: true, details: 'Code style passes', severity: 'info' };
    } catch {
      return { step: 'style', passed: false, details: 'Code style violations detected', severity: 'info' };
    }
  }
}
```

## Safety Guardrails

```typescript
// safety/guardrails.ts
export interface GuardrailConfig {
  allowedFileExtensions: string[];
  blockedPaths: string[];
  allowedCommands: string[];
  maxFileSize: number;
  maxTotalFiles: number;
  networkAllowed: boolean;
  allowedDomains: string[];
}

const DEFAULT_GUARDRAILS: GuardrailConfig = {
  allowedFileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml', '.md', '.css'],
  blockedPaths: ['/etc', '/proc', '/sys', '/root', '.env', '.ssh', 'node_modules'],
  allowedCommands: ['npm', 'npx', 'node', 'tsc', 'vitest', 'eslint', 'prettier'],
  maxFileSize: 1024 * 1024, // 1MB
  maxTotalFiles: 50,
  networkAllowed: false,
  allowedDomains: [],
};

export class Guardrails {
  private config: GuardrailConfig;

  constructor(config: Partial<GuardrailConfig> = {}) {
    this.config = { ...DEFAULT_GUARDRAILS, ...config };
  }

  validateFileAccess(path: string): { allowed: boolean; reason?: string } {
    for (const blocked of this.config.blockedPaths) {
      if (path.includes(blocked)) {
        return { allowed: false, reason: `Access to ${blocked} is blocked` };
      }
    }

    const ext = '.' + path.split('.').pop();
    if (!this.config.allowedFileExtensions.includes(ext)) {
      return { allowed: false, reason: `File extension ${ext} is not allowed` };
    }

    return { allowed: true };
  }

  validateCommand(command: string): { allowed: boolean; reason?: string } {
    const executable = command.split(' ')[0];
    if (!this.config.allowedCommands.includes(executable)) {
      return { allowed: false, reason: `Command ${executable} is not in allowlist` };
    }

    // Block dangerous flags
    if (command.includes('--force') || command.includes('-rf') || command.includes('sudo')) {
      return { allowed: false, reason: 'Dangerous command flags detected' };
    }

    return { allowed: true };
  }

  validateFileContent(content: string): { allowed: boolean; issues: string[] } {
    const issues: string[] = [];

    if (content.length > this.config.maxFileSize) {
      issues.push(`File exceeds maximum size: ${content.length} > ${this.config.maxFileSize}`);
    }

    // Detect potential secrets
    const secretPatterns = [
      /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9+/=]{20,}['"]/gi,
      /(?:sk|pk)[-_](?:live|test)[-_][A-Za-z0-9]{20,}/g,
      /ghp_[A-Za-z0-9]{36}/g,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        issues.push('Potential secret or API key detected in file content');
        break;
      }
    }

    return { allowed: issues.length === 0, issues };
  }
}
```

## Regression Test Runner

```typescript
// runners/regression-runner.ts
import { OutputValidator } from '../validators/output-comparator';
import { readFileSync } from 'fs';

export interface RegressionResult {
  taskId: string;
  currentVersion: string;
  baselineVersion: string;
  qualityDelta: number;
  completionRateDelta: number;
  newRegressions: string[];
  newImprovements: string[];
}

export class RegressionRunner {
  private validator: OutputValidator;

  constructor() {
    this.validator = new OutputValidator();
  }

  async compareVersions(
    currentOutputs: any[],
    baselineOutputs: any[],
    taskDefs: any[]
  ): Promise<RegressionResult[]> {
    const results: RegressionResult[] = [];

    for (const taskDef of taskDefs) {
      const current = currentOutputs.find((o) => o.taskId === taskDef.id);
      const baseline = baselineOutputs.find((o) => o.taskId === taskDef.id);

      if (!current || !baseline) continue;

      const currentResults = await this.validator.validateAll(current, taskDef);
      const baselineResults = await this.validator.validateAll(baseline, taskDef);

      const currentScore = currentResults.filter((r) => r.passed).length / currentResults.length;
      const baselineScore = baselineResults.filter((r) => r.passed).length / baselineResults.length;

      const regressions = currentResults
        .filter((r) => !r.passed)
        .filter((r) => baselineResults.find((b) => b.step === r.step)?.passed)
        .map((r) => r.step);

      const improvements = currentResults
        .filter((r) => r.passed)
        .filter((r) => !baselineResults.find((b) => b.step === r.step)?.passed)
        .map((r) => r.step);

      results.push({
        taskId: taskDef.id,
        currentVersion: current.agentVersion,
        baselineVersion: baseline.agentVersion,
        qualityDelta: Math.round((currentScore - baselineScore) * 100),
        completionRateDelta: 0,
        newRegressions: regressions,
        newImprovements: improvements,
      });
    }

    return results;
  }
}
```

## Best Practices

1. **Always validate in sandboxes** -- Never execute agent-generated code with full system access. Use Docker containers or VMs with restricted permissions.
2. **Implement multi-layer validation** -- Check syntax, types, tests, security, and style independently. A file can pass syntax but fail security.
3. **Define tasks precisely** -- Ambiguous task definitions produce ambiguous outputs. Specify expected files, required patterns, and constraints clearly.
4. **Track agent performance across versions** -- When the underlying LLM model changes, re-run your task suite to detect quality regressions.
5. **Scan for secrets in generated code** -- Autonomous agents may inadvertently include credentials, API keys, or sensitive paths in generated code.
6. **Set resource limits** -- Limit execution time, memory, disk space, and network access for sandboxed environments.
7. **Require tests for generated code** -- If the agent generates a function, it should also generate tests. Validate that the tests actually test the function.
8. **Human review for production code** -- Autonomous agents can write functional code, but human review is required before merging to production.
9. **Version your task definitions** -- Task definitions are specifications. Version them alongside your codebase.
10. **Monitor cost per task** -- Track LLM API costs for each task to identify expensive patterns and optimize agent prompts.

## Anti-Patterns

1. **Running agent code with production credentials** -- Agent-generated code should never have access to production databases, APIs, or credentials.
2. **Trusting generated tests without verification** -- An agent may write tests that always pass by testing trivial assertions or mocking too aggressively.
3. **Not scanning for security issues** -- Autonomous agents can generate code with SQL injection vulnerabilities, XSS issues, or insecure file operations.
4. **Using the same model for generation and evaluation** -- The model that generated the code has the same blind spots when evaluating it. Use a different model or human review.
5. **Not enforcing file access restrictions** -- Without guardrails, agents may read or modify files outside the project scope.
6. **Skipping regression testing after model updates** -- LLM model updates can silently change code generation quality. Always re-run task suites after updates.
7. **Allowing unlimited execution time** -- Tasks without timeouts can run indefinitely, consuming resources. Set per-task time limits.
8. **Not tracking agent decision history** -- Without logs of what the agent did and why, debugging task failures is impossible.
9. **Deploying agent-generated code without CI** -- Agent output should go through the same CI pipeline as human-written code: lint, test, security scan, review.
10. **Measuring only task completion, not quality** -- An agent that completes 100% of tasks with buggy code is worse than one that completes 80% with high quality. Measure both.
