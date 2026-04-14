---
name: Test Strategy Design
description: Comprehensive test strategy design methodology covering risk-based testing, test pyramid optimization, coverage planning, environment strategy, data management, and test automation ROI analysis for enterprise and startup contexts.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [test-strategy, risk-based-testing, test-pyramid, coverage-planning, test-planning, test-management, qa-strategy, test-architecture, quality-strategy]
testingTypes: [unit, integration, e2e, api, performance, security, accessibility]
frameworks: [playwright, vitest, jest, cypress, selenium]
languages: [typescript, javascript, python, java]
domains: [web, backend, api, mobile, enterprise]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Test Strategy Design Skill

You are an expert in test strategy design. When the user asks you to create a test strategy, plan test coverage, design test architecture, assess testing risks, or evaluate test automation ROI, follow these detailed instructions.

## Core Principles

1. **Risk-driven prioritization** -- Test the highest-risk areas first. Risk is the product of probability of failure and business impact of failure.
2. **Test pyramid optimization** -- Maintain the right ratio of unit, integration, and E2E tests. More fast tests at the base, fewer slow tests at the top.
3. **Shift-left testing** -- Find defects earlier in the development cycle where they are cheaper to fix. Integrate testing into design and development phases.
4. **Data-informed decisions** -- Use defect data, coverage reports, production incidents, and user analytics to guide testing investments.
5. **Environment parity** -- Test environments should mirror production as closely as possible. Differences between environments are a source of escaped defects.
6. **Sustainable automation** -- Automate tests that provide recurring value. Not every test is worth automating; some are better executed manually.
7. **Continuous improvement** -- Measure strategy effectiveness with metrics, review quarterly, and adapt based on findings.

## Project Structure

```
test-strategy/
  assessment/
    current-state-analysis.ts
    risk-assessment.ts
    gap-analysis.ts
    maturity-model.ts
  planning/
    test-pyramid-calculator.ts
    coverage-planner.ts
    resource-allocator.ts
    timeline-builder.ts
  metrics/
    quality-metrics.ts
    automation-roi.ts
    defect-analytics.ts
    coverage-tracker.ts
  templates/
    strategy-document.md
    test-plan-template.md
    risk-register.md
    coverage-matrix.md
  tools/
    test-data-strategy.ts
    environment-planner.ts
    tool-selection-matrix.ts
```

## Risk Assessment Engine

```typescript
// assessment/risk-assessment.ts
export interface RiskItem {
  id: string;
  feature: string;
  probability: number; // 1-5
  impact: number; // 1-5
  riskScore: number;
  mitigationStrategy: string;
  testingApproach: string;
  automationPriority: 'critical' | 'high' | 'medium' | 'low';
}

export interface RiskMatrix {
  items: RiskItem[];
  overallRisk: number;
  criticalPaths: string[];
  recommendations: string[];
}

export function assessRisks(features: Array<{
  name: string;
  complexity: number;
  changeFrequency: number;
  userImpact: number;
  hasTests: boolean;
  lastIncident?: string;
}>): RiskMatrix {
  const items: RiskItem[] = features.map((feature) => {
    const probability = calculateProbability(feature);
    const impact = feature.userImpact;
    const riskScore = probability * impact;

    return {
      id: feature.name.toLowerCase().replace(/\s+/g, '-'),
      feature: feature.name,
      probability,
      impact,
      riskScore,
      mitigationStrategy: getMitigationStrategy(riskScore),
      testingApproach: getTestingApproach(riskScore, feature),
      automationPriority: getAutomationPriority(riskScore),
    };
  });

  const sorted = items.sort((a, b) => b.riskScore - a.riskScore);
  const overallRisk = sorted.reduce((sum, item) => sum + item.riskScore, 0) / sorted.length;
  const criticalPaths = sorted.filter((i) => i.riskScore >= 15).map((i) => i.feature);

  return {
    items: sorted,
    overallRisk,
    criticalPaths,
    recommendations: generateRecommendations(sorted, overallRisk),
  };
}

function calculateProbability(feature: any): number {
  let score = 1;
  if (feature.complexity > 3) score += 1;
  if (feature.changeFrequency > 3) score += 1;
  if (!feature.hasTests) score += 1;
  if (feature.lastIncident) score += 1;
  return Math.min(5, score);
}

function getMitigationStrategy(riskScore: number): string {
  if (riskScore >= 20) return 'Comprehensive automation with monitoring and alerting';
  if (riskScore >= 15) return 'Full regression suite with performance testing';
  if (riskScore >= 10) return 'Targeted automation for critical paths';
  if (riskScore >= 5) return 'Unit tests with selective integration tests';
  return 'Basic unit test coverage';
}

function getTestingApproach(riskScore: number, feature: any): string {
  if (riskScore >= 15) return 'E2E + Integration + Unit + Performance + Security';
  if (riskScore >= 10) return 'E2E + Integration + Unit';
  if (riskScore >= 5) return 'Integration + Unit';
  return 'Unit tests';
}

function getAutomationPriority(riskScore: number): RiskItem['automationPriority'] {
  if (riskScore >= 20) return 'critical';
  if (riskScore >= 15) return 'high';
  if (riskScore >= 10) return 'medium';
  return 'low';
}

function generateRecommendations(items: RiskItem[], overallRisk: number): string[] {
  const recommendations: string[] = [];
  const criticalCount = items.filter((i) => i.riskScore >= 15).length;

  if (criticalCount > 0) {
    recommendations.push(`${criticalCount} critical risk areas identified. Prioritize automation for these features.`);
  }
  if (overallRisk > 10) {
    recommendations.push('Overall risk is high. Consider increasing QA investment and test coverage.');
  }

  const untested = items.filter((i) => i.testingApproach.includes('Unit') && i.riskScore > 10);
  if (untested.length > 0) {
    recommendations.push(`${untested.length} medium-risk features have minimal testing. Add integration tests.`);
  }

  return recommendations;
}
```

## Test Pyramid Calculator

```typescript
// planning/test-pyramid-calculator.ts
export interface PyramidMetrics {
  unit: { count: number; percentage: number; executionTimeMs: number };
  integration: { count: number; percentage: number; executionTimeMs: number };
  e2e: { count: number; percentage: number; executionTimeMs: number };
  ratio: string;
  isHealthy: boolean;
  recommendations: string[];
}

export function analyzeTestPyramid(tests: {
  unit: number;
  integration: number;
  e2e: number;
  unitTimeMs: number;
  integrationTimeMs: number;
  e2eTimeMs: number;
}): PyramidMetrics {
  const total = tests.unit + tests.integration + tests.e2e;
  const unitPct = total > 0 ? (tests.unit / total) * 100 : 0;
  const integrationPct = total > 0 ? (tests.integration / total) * 100 : 0;
  const e2ePct = total > 0 ? (tests.e2e / total) * 100 : 0;

  const recommendations: string[] = [];
  let isHealthy = true;

  // Ideal pyramid: 70% unit, 20% integration, 10% E2E
  if (unitPct < 50) {
    recommendations.push(`Unit tests are ${unitPct.toFixed(0)}% (target: 70%). Add more unit tests.`);
    isHealthy = false;
  }
  if (integrationPct > 40) {
    recommendations.push(`Integration tests are ${integrationPct.toFixed(0)}% (target: 20%). Consider converting some to unit tests.`);
    isHealthy = false;
  }
  if (e2ePct > 20) {
    recommendations.push(`E2E tests are ${e2ePct.toFixed(0)}% (target: 10%). Too many E2E tests slow CI/CD.`);
    isHealthy = false;
  }

  // Check execution time balance
  const totalTime = tests.unitTimeMs + tests.integrationTimeMs + tests.e2eTimeMs;
  if (tests.e2eTimeMs > totalTime * 0.7) {
    recommendations.push('E2E tests consume >70% of execution time. Optimize or parallelize.');
  }

  return {
    unit: { count: tests.unit, percentage: Math.round(unitPct), executionTimeMs: tests.unitTimeMs },
    integration: { count: tests.integration, percentage: Math.round(integrationPct), executionTimeMs: tests.integrationTimeMs },
    e2e: { count: tests.e2e, percentage: Math.round(e2ePct), executionTimeMs: tests.e2eTimeMs },
    ratio: `${Math.round(unitPct)}:${Math.round(integrationPct)}:${Math.round(e2ePct)}`,
    isHealthy,
    recommendations,
  };
}
```

## Automation ROI Calculator

```typescript
// metrics/automation-roi.ts
export interface ROIAnalysis {
  totalInvestment: number;
  annualSavings: number;
  breakEvenMonths: number;
  threeYearROI: number;
  costPerExecution: { manual: number; automated: number };
  recommendation: string;
}

export function calculateAutomationROI(params: {
  manualExecutionTimeHours: number;
  executionsPerMonth: number;
  qaHourlyRate: number;
  automationDevelopmentHours: number;
  automationMaintenanceHoursPerMonth: number;
  automatedExecutionTimeHours: number;
  toolCostPerMonth: number;
  sdetHourlyRate: number;
}): ROIAnalysis {
  const {
    manualExecutionTimeHours,
    executionsPerMonth,
    qaHourlyRate,
    automationDevelopmentHours,
    automationMaintenanceHoursPerMonth,
    automatedExecutionTimeHours,
    toolCostPerMonth,
    sdetHourlyRate,
  } = params;

  // Monthly costs
  const manualMonthlyCost = manualExecutionTimeHours * executionsPerMonth * qaHourlyRate;
  const automatedMonthlyCost =
    (automationMaintenanceHoursPerMonth * sdetHourlyRate) +
    (automatedExecutionTimeHours * executionsPerMonth * sdetHourlyRate * 0.1) +
    toolCostPerMonth;

  // Initial investment
  const totalInvestment = automationDevelopmentHours * sdetHourlyRate;

  // Monthly savings
  const monthlySavings = manualMonthlyCost - automatedMonthlyCost;
  const annualSavings = monthlySavings * 12;

  // Break-even
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(totalInvestment / monthlySavings) : Infinity;

  // 3-year ROI
  const threeYearSavings = annualSavings * 3;
  const threeYearROI = ((threeYearSavings - totalInvestment) / totalInvestment) * 100;

  // Cost per execution
  const manualCostPerExecution = manualExecutionTimeHours * qaHourlyRate;
  const automatedCostPerExecution = automatedMonthlyCost / executionsPerMonth;

  let recommendation: string;
  if (breakEvenMonths <= 6) {
    recommendation = 'Strong ROI. Automate immediately.';
  } else if (breakEvenMonths <= 12) {
    recommendation = 'Good ROI. Proceed with automation.';
  } else if (breakEvenMonths <= 24) {
    recommendation = 'Moderate ROI. Automate high-frequency tests first.';
  } else {
    recommendation = 'Low ROI. Consider partial automation or manual testing.';
  }

  return {
    totalInvestment: Math.round(totalInvestment),
    annualSavings: Math.round(annualSavings),
    breakEvenMonths,
    threeYearROI: Math.round(threeYearROI),
    costPerExecution: {
      manual: Math.round(manualCostPerExecution * 100) / 100,
      automated: Math.round(automatedCostPerExecution * 100) / 100,
    },
    recommendation,
  };
}
```

## Coverage Planning Matrix

```typescript
// planning/coverage-planner.ts
export interface CoverageTarget {
  feature: string;
  unitCoverage: number;
  integrationCoverage: number;
  e2eCoverage: number;
  manualTestCases: number;
  automationStatus: 'not-started' | 'in-progress' | 'complete';
  estimatedEffort: number; // person-days
}

export function generateCoveragePlan(
  features: Array<{
    name: string;
    risk: 'critical' | 'high' | 'medium' | 'low';
    complexity: number;
    currentCoverage: number;
  }>
): CoverageTarget[] {
  return features.map((feature) => {
    const targets = getCoverageTargets(feature.risk);

    return {
      feature: feature.name,
      unitCoverage: targets.unit,
      integrationCoverage: targets.integration,
      e2eCoverage: targets.e2e,
      manualTestCases: targets.manual,
      automationStatus: feature.currentCoverage > 50 ? 'in-progress' : 'not-started',
      estimatedEffort: calculateEffort(feature.complexity, feature.currentCoverage, targets),
    };
  });
}

function getCoverageTargets(risk: string): {
  unit: number; integration: number; e2e: number; manual: number;
} {
  switch (risk) {
    case 'critical':
      return { unit: 90, integration: 80, e2e: 70, manual: 10 };
    case 'high':
      return { unit: 80, integration: 60, e2e: 50, manual: 5 };
    case 'medium':
      return { unit: 70, integration: 40, e2e: 30, manual: 3 };
    case 'low':
      return { unit: 50, integration: 20, e2e: 10, manual: 0 };
    default:
      return { unit: 60, integration: 30, e2e: 20, manual: 2 };
  }
}

function calculateEffort(
  complexity: number,
  currentCoverage: number,
  targets: { unit: number; integration: number; e2e: number }
): number {
  const coverageGap = Math.max(0, targets.unit - currentCoverage);
  const baseEffort = complexity * 0.5;
  const coverageFactor = coverageGap / 100;
  return Math.ceil(baseEffort * (1 + coverageFactor));
}
```

## Test Environment Strategy

```typescript
// tools/environment-planner.ts
export interface EnvironmentPlan {
  name: string;
  purpose: string;
  dataStrategy: string;
  refreshCadence: string;
  cost: string;
  ownership: string;
}

export const environmentStrategy: EnvironmentPlan[] = [
  {
    name: 'Local Development',
    purpose: 'Developer testing with mocked dependencies',
    dataStrategy: 'In-memory database with seed data',
    refreshCadence: 'On every test run',
    cost: 'Zero (runs locally)',
    ownership: 'Individual developers',
  },
  {
    name: 'CI Environment',
    purpose: 'Automated test execution in pipeline',
    dataStrategy: 'Docker-based database with migration scripts',
    refreshCadence: 'Every pipeline run (ephemeral)',
    cost: 'CI compute minutes',
    ownership: 'DevOps team',
  },
  {
    name: 'Staging',
    purpose: 'Pre-production validation and E2E testing',
    dataStrategy: 'Anonymized production data subset',
    refreshCadence: 'Weekly refresh from production',
    cost: 'Cloud infrastructure (reduced size)',
    ownership: 'QA team',
  },
  {
    name: 'Performance',
    purpose: 'Load and performance testing',
    dataStrategy: 'Production-scale synthetic data',
    refreshCadence: 'Before each performance test cycle',
    cost: 'Production-equivalent infrastructure',
    ownership: 'Performance engineering',
  },
];
```

## Test Tool Selection Matrix

```typescript
// tools/tool-selection-matrix.ts
export interface ToolEvaluation {
  tool: string;
  category: string;
  scores: {
    teamSkillFit: number;    // 1-5
    techStackFit: number;    // 1-5
    communitySupport: number; // 1-5
    ciIntegration: number;   // 1-5
    costEfficiency: number;  // 1-5
    aiAgentSupport: number;  // 1-5
  };
  totalScore: number;
  recommendation: string;
}

export function evaluateTools(
  tools: Array<{
    tool: string;
    category: string;
    scores: Record<string, number>;
  }>,
  weights: Record<string, number> = {
    teamSkillFit: 2,
    techStackFit: 2,
    communitySupport: 1,
    ciIntegration: 1.5,
    costEfficiency: 1,
    aiAgentSupport: 1.5,
  }
): ToolEvaluation[] {
  return tools.map((t) => {
    const totalScore = Object.entries(t.scores).reduce(
      (sum, [key, value]) => sum + value * (weights[key] || 1),
      0
    );

    return {
      ...t,
      scores: t.scores as any,
      totalScore: Math.round(totalScore * 100) / 100,
      recommendation: totalScore > 35 ? 'Recommended' : totalScore > 25 ? 'Consider' : 'Not recommended',
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}
```

## Quality Metrics Dashboard Specification

```typescript
// metrics/quality-metrics.ts
export interface QualityDashboard {
  overview: {
    defectEscapeRate: number;
    automationCoverage: number;
    testPassRate: number;
    meanTimeToDetect: number;  // hours
    meanTimeToFix: number;     // hours
    flakyTestPercentage: number;
  };
  trends: Array<{
    week: string;
    passRate: number;
    coverage: number;
    executionTime: number;
    newDefects: number;
  }>;
  riskMap: Array<{
    feature: string;
    risk: number;
    coverage: number;
    defectCount: number;
  }>;
}

export function calculateDefectEscapeRate(
  defectsFoundInTesting: number,
  defectsFoundInProduction: number
): number {
  const total = defectsFoundInTesting + defectsFoundInProduction;
  if (total === 0) return 0;
  return (defectsFoundInProduction / total) * 100;
}

export function calculateAutomationROI(params: {
  manualHoursPerWeek: number;
  automatedHoursPerWeek: number;
  automationBuildHours: number;
  maintenanceHoursPerWeek: number;
  qaHourlyRate: number;
}): {
  weeklySavings: number;
  breakEvenWeeks: number;
  annualROI: number;
} {
  const weeklySavings = (params.manualHoursPerWeek - params.automatedHoursPerWeek - params.maintenanceHoursPerWeek) * params.qaHourlyRate;
  const totalInvestment = params.automationBuildHours * params.qaHourlyRate;
  const breakEvenWeeks = weeklySavings > 0 ? Math.ceil(totalInvestment / weeklySavings) : Infinity;
  const annualROI = ((weeklySavings * 52 - totalInvestment) / totalInvestment) * 100;

  return { weeklySavings, breakEvenWeeks, annualROI: Math.round(annualROI) };
}
```

## Strategy Document Template

A test strategy document should contain the following sections organized for both technical and non-technical audiences.

The Executive Summary provides a one-paragraph overview of the testing approach, key risks, and resource requirements. The Scope section defines what will and will not be tested, along with the assumptions and constraints. The Risk Assessment section lists the top risks with their probability, impact, and mitigation strategies.

The Test Approach section describes the test pyramid distribution, automation versus manual split, and which test types apply to which features. The Environment Strategy section defines each test environment, its purpose, data strategy, and ownership. The Tool Stack section lists the selected tools with justification for each choice.

The Timeline and Milestones section provides a phased plan with concrete deliverables for each phase. The Resource Requirements section specifies the team composition, skill requirements, and estimated effort. The Success Criteria section defines measurable thresholds for quality, coverage, and execution time.

The Reporting and Communication section describes how test results will be communicated, to whom, and at what frequency. The Risk Register tracks identified risks with their status and mitigation progress.

## Best Practices

1. **Start with risk assessment** -- Before writing any test, assess what can go wrong and what the impact would be. Let risk drive your testing investments.
2. **Document the strategy** -- A test strategy should be a living document reviewed quarterly. Include scope, approach, tools, environments, and exit criteria.
3. **Maintain the test pyramid** -- Regularly audit your test distribution. If E2E tests exceed 20% of your suite, investigate which can be pushed down to integration or unit level.
4. **Calculate ROI before automating** -- Not every test is worth automating. Calculate the break-even point and prioritize high-frequency, high-value test cases.
5. **Align strategy with business goals** -- Testing investments should map to business risks. Test payment flows more than about-page content.
6. **Plan for test data** -- Test data management is often the hardest part. Design a data strategy that includes creation, isolation, and cleanup.
7. **Design for parallel execution** -- From day one, ensure tests are independent so they can run in parallel as the suite grows.
8. **Include non-functional testing** -- Performance, security, and accessibility testing should be part of the strategy, not afterthoughts.
9. **Measure and report** -- Track defect escape rate, test coverage, automation coverage, and test execution time. Report trends monthly.
10. **Plan for maintenance** -- Budget 20-30% of initial automation effort for ongoing maintenance. Tests are code and need upkeep.

## Anti-Patterns

1. **Testing everything equally** -- Not all features have equal risk. Testing low-risk features as thoroughly as high-risk ones wastes resources.
2. **Ice cream cone anti-pattern** -- More E2E tests than unit tests creates slow, brittle, expensive test suites. Invert the pyramid.
3. **No strategy document** -- Testing without a documented strategy leads to ad-hoc, inconsistent coverage with gaps in critical areas.
4. **Ignoring maintenance costs** -- Automating 1000 tests without budgeting for maintenance leads to a suite of broken, ignored tests.
5. **Copy-pasting strategies** -- Every project has unique risks. Using a generic strategy template without customization misses critical context.
6. **Not involving developers** -- Test strategy is a team responsibility. Strategies created by QA in isolation miss developer perspectives on risk and testability.
7. **Measuring only coverage percentage** -- 80% code coverage with weak assertions provides false confidence. Measure mutation testing scores too.
8. **Not reviewing production incidents** -- Every production incident should feed back into the test strategy. If a bug escaped, the strategy has a gap.
9. **Over-automating UI tests** -- UI tests are expensive to maintain. Automate business-critical paths and use exploratory testing for the rest.
10. **Ignoring test environment costs** -- Test environments have infrastructure costs. Plan for environments as part of the testing budget.
