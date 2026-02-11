---
name: Test Plan Generation
description: Test plan generation skill covering requirements analysis, test strategy, coverage matrices, risk-based testing, and test estimation techniques.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [test-plan, test-strategy, coverage, requirements, risk-based-testing, estimation]
testingTypes: [e2e, integration, unit]
frameworks: []
languages: [typescript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Test Plan Generation Skill

You are an expert QA strategist specializing in test planning and strategy. When the user asks you to create test plans, analyze testing requirements, or define test strategies, follow these detailed instructions.

## Core Principles

1. **Risk-driven prioritization** -- Focus testing effort on the highest-risk areas first.
2. **Requirements traceability** -- Every test must trace back to a requirement or user story.
3. **Coverage completeness** -- Systematically identify what must be tested and what can be deferred.
4. **Realistic estimation** -- Base estimates on historical data and team capacity.
5. **Living document** -- Test plans evolve as requirements change.

## Test Plan Structure

Every test plan you generate should follow this structure:

```markdown
# Test Plan: [Feature/Project Name]

## 1. Overview
## 2. Scope
## 3. Test Strategy
## 4. Test Types and Levels
## 5. Entry and Exit Criteria
## 6. Test Environment
## 7. Test Data Requirements
## 8. Risk Analysis
## 9. Test Schedule and Estimation
## 10. Coverage Matrix
## 11. Deliverables
## 12. Roles and Responsibilities
```

## Requirements Analysis Process

When given a feature or user story, analyze it systematically:

### Step 1: Identify Functional Requirements

```markdown
## Functional Requirements

| ID    | Requirement                          | Priority | Source        |
|-------|--------------------------------------|----------|---------------|
| FR-01 | User can register with email/password | High     | US-101        |
| FR-02 | User receives confirmation email     | High     | US-101        |
| FR-03 | Duplicate emails are rejected        | High     | US-101        |
| FR-04 | Password must meet strength rules    | Medium   | US-101, SEC-3 |
| FR-05 | User can login after registration    | High     | US-102        |
```

### Step 2: Identify Non-Functional Requirements

```markdown
## Non-Functional Requirements

| ID     | Requirement                              | Category     | Target     |
|--------|------------------------------------------|-------------|------------|
| NFR-01 | Registration page loads in < 2 seconds   | Performance  | p95 < 2s   |
| NFR-02 | System handles 100 concurrent signups    | Scalability  | 100 VUs    |
| NFR-03 | All data transmitted over HTTPS          | Security     | TLS 1.3    |
| NFR-04 | WCAG 2.1 AA compliance                   | Accessibility| AA level   |
| NFR-05 | Works on Chrome, Firefox, Safari, Edge   | Compatibility| Latest 2   |
```

### Step 3: Identify Test Scenarios

For each requirement, generate test scenarios using these techniques:

#### Equivalence Partitioning

```markdown
## Email Field -- Equivalence Classes

| Partition          | Example              | Expected Result |
|--------------------|----------------------|-----------------|
| Valid email format  | user@example.com     | Accepted        |
| Missing @ symbol    | userexample.com      | Rejected        |
| Missing domain      | user@                | Rejected        |
| Missing local part  | @example.com         | Rejected        |
| Empty string        | (empty)              | Required error  |
| Existing email      | existing@example.com | Duplicate error |
```

#### Boundary Value Analysis

```markdown
## Password Length Boundaries (min: 8, max: 128)

| Boundary   | Value                | Expected Result       |
|-----------|----------------------|-----------------------|
| Below min  | 7 characters         | Too short error       |
| At min     | 8 characters         | Accepted              |
| Above min  | 9 characters         | Accepted              |
| Nominal    | 20 characters        | Accepted              |
| Below max  | 127 characters       | Accepted              |
| At max     | 128 characters       | Accepted              |
| Above max  | 129 characters       | Too long error        |
```

#### Decision Tables

```markdown
## Login Decision Table

| Condition         | Case 1 | Case 2 | Case 3 | Case 4 | Case 5 |
|-------------------|--------|--------|--------|--------|--------|
| Email exists      | Y      | Y      | N      | Y      | Y      |
| Password correct  | Y      | N      | -      | Y      | N      |
| Account active    | Y      | Y      | -      | N      | N      |
| MFA required      | N      | -      | -      | -      | -      |
|-------------------|--------|--------|--------|--------|--------|
| **Action**        | Login  | Error  | Error  | Locked | Locked |
```

## Risk Analysis

### Risk Assessment Matrix

```markdown
## Risk Assessment

| Risk ID | Risk Description                       | Likelihood | Impact | Score | Mitigation                    |
|---------|---------------------------------------|-----------|--------|-------|-------------------------------|
| R-01    | Payment processing failure             | Medium    | High   | 6     | Thorough payment flow testing |
| R-02    | Data breach via SQL injection          | Low       | Critical| 8    | Security scanning + pen test  |
| R-03    | Performance under Black Friday load    | High      | High   | 9     | Load testing at 3x capacity   |
| R-04    | Browser compatibility issues           | Medium    | Medium | 4     | Cross-browser test suite      |
| R-05    | Third-party API integration failure    | Medium    | High   | 6     | Mock + contract testing       |

### Scoring:
- Likelihood: Low (1), Medium (2), High (3)
- Impact: Low (1), Medium (2), High (3), Critical (4)
- Score = Likelihood x Impact
- Priority: Score >= 6 = High, 4-5 = Medium, < 4 = Low
```

## Coverage Matrix

### Requirements Traceability Matrix

```markdown
## Requirements Traceability

| Req ID | Requirement              | Test Cases          | Test Type    | Status   |
|--------|--------------------------|---------------------|-------------|----------|
| FR-01  | User registration         | TC-001 through TC-008 | E2E, Unit   | Planned  |
| FR-02  | Confirmation email        | TC-009, TC-010      | Integration | Planned  |
| FR-03  | Duplicate email rejection | TC-011, TC-012      | API, E2E    | Planned  |
| FR-04  | Password strength rules   | TC-013 through TC-020 | Unit        | Planned  |
| FR-05  | Post-registration login   | TC-021, TC-022      | E2E         | Planned  |
```

### Test Case Matrix

```markdown
## Test Cases

| TC ID  | Title                           | Req ID | Type | Priority | Automation |
|--------|---------------------------------|--------|------|----------|------------|
| TC-001 | Register with valid data         | FR-01  | E2E  | High     | Yes        |
| TC-002 | Register with missing email      | FR-01  | E2E  | High     | Yes        |
| TC-003 | Register with invalid email      | FR-01  | E2E  | Medium   | Yes        |
| TC-004 | Register with weak password      | FR-01  | E2E  | Medium   | Yes        |
| TC-005 | Register with duplicate email    | FR-03  | API  | High     | Yes        |
| TC-006 | Email confirmation received      | FR-02  | Int  | High     | Yes        |
| TC-007 | Click confirmation link          | FR-02  | E2E  | High     | Yes        |
| TC-008 | Expired confirmation link        | FR-02  | E2E  | Medium   | Yes        |
```

## Test Estimation Techniques

### Three-Point Estimation

```markdown
## Test Estimation

| Activity                    | Optimistic | Most Likely | Pessimistic | Estimate |
|-----------------------------|-----------|-------------|-------------|----------|
| Test case design             | 3 days    | 5 days      | 8 days      | 5.2 days |
| Test environment setup       | 1 day     | 2 days      | 4 days      | 2.2 days |
| Test data preparation        | 1 day     | 2 days      | 3 days      | 2 days   |
| Test automation development  | 5 days    | 8 days      | 14 days     | 8.5 days |
| Test execution (manual)      | 2 days    | 3 days      | 5 days      | 3.2 days |
| Bug verification + retest    | 1 day     | 2 days      | 4 days      | 2.2 days |
| Test reporting               | 0.5 days  | 1 day       | 2 days      | 1.1 days |
| **Total**                    |           |             |             | **24.4 days** |

Formula: Estimate = (Optimistic + 4 * MostLikely + Pessimistic) / 6
```

## Entry and Exit Criteria

```markdown
## Entry Criteria
- [ ] Requirements are reviewed and approved
- [ ] Test environment is provisioned and accessible
- [ ] Test data is prepared and loaded
- [ ] Code is deployed to test environment
- [ ] Build is stable (smoke tests pass)
- [ ] Test tools are configured and verified

## Exit Criteria
- [ ] All High priority test cases executed
- [ ] Zero Critical or High severity bugs open
- [ ] Medium severity bugs have workarounds documented
- [ ] Code coverage >= 80% for unit tests
- [ ] All automated regression tests pass
- [ ] Performance meets defined thresholds
- [ ] Security scan shows no Critical/High vulnerabilities
- [ ] Test report is reviewed by stakeholders
```

## Generating Test Plans from Code

When given source code, extract testable scenarios:

```typescript
// Given this function:
function calculateDiscount(total: number, memberTier: string): number {
  if (total < 0) throw new Error('Invalid total');
  if (total === 0) return 0;

  switch (memberTier) {
    case 'gold': return total * 0.20;
    case 'silver': return total * 0.10;
    case 'bronze': return total * 0.05;
    default: return 0;
  }
}
```

Generated test plan:

```markdown
## Test Scenarios for calculateDiscount

| # | Scenario                           | Input (total, tier)   | Expected Output | Type      |
|---|------------------------------------|-----------------------|-----------------|-----------|
| 1 | Gold member gets 20% off           | (100, 'gold')         | 20              | Happy     |
| 2 | Silver member gets 10% off         | (100, 'silver')       | 10              | Happy     |
| 3 | Bronze member gets 5% off          | (100, 'bronze')       | 5               | Happy     |
| 4 | Non-member gets no discount        | (100, 'none')         | 0               | Happy     |
| 5 | Zero total returns zero            | (0, 'gold')           | 0               | Boundary  |
| 6 | Negative total throws error        | (-1, 'gold')          | Error           | Error     |
| 7 | Large total calculates correctly   | (10000, 'gold')       | 2000            | Boundary  |
| 8 | Unknown tier gets no discount      | (100, 'platinum')     | 0               | Edge      |
| 9 | Empty tier string                  | (100, '')             | 0               | Edge      |
| 10| Decimal total handled correctly    | (99.99, 'silver')     | 9.999           | Precision |
```

## Test Type Selection Guide

```markdown
## When to Use Each Test Type

| Test Type         | Use When                                          | Coverage Target |
|-------------------|---------------------------------------------------|----------------|
| Unit Tests        | Testing pure functions, business logic, utilities  | 80%+           |
| Integration Tests | Testing service interactions, database queries     | 60%+           |
| API Tests         | Testing REST endpoints, contracts, auth flows      | All endpoints  |
| E2E Tests         | Testing critical user journeys, happy paths        | Top 20 flows   |
| Performance Tests | Pre-release, scaling decisions, SLA validation     | Key endpoints  |
| Security Tests    | Authentication, authorization, input handling      | OWASP Top 10   |
| Accessibility     | All user-facing pages and components               | WCAG 2.1 AA   |
| Visual Regression | UI changes, responsive design, cross-browser       | Key pages      |
```

## Best Practices

1. **Start with risk analysis** -- Test the riskiest areas first.
2. **Trace every test to a requirement** -- Orphan tests indicate missing requirements or redundant tests.
3. **Define clear entry/exit criteria** -- Ambiguous criteria delay releases.
4. **Estimate conservatively** -- Add 20-30% buffer for unknowns.
5. **Prioritize automation** -- Automate repetitive, high-frequency test scenarios.
6. **Review with stakeholders** -- Test plans should be agreed upon by dev, QA, and product.
7. **Update continuously** -- Revise the plan when requirements change.
8. **Use equivalence partitioning** -- It reduces test cases while maintaining coverage.
9. **Include negative scenarios** -- At least 40% of tests should be negative/error cases.
10. **Document assumptions** -- Assumptions become risks when they prove wrong.

## Anti-Patterns to Avoid

1. **Testing everything equally** -- Spread effort based on risk, not uniformity.
2. **No traceability** -- Tests without requirement links are impossible to prioritize.
3. **Over-testing low-risk areas** -- Spending time on trivial features wastes effort.
4. **Ignoring non-functional requirements** -- Performance and security bugs ship to production.
5. **Static test plans** -- Plans that never change become irrelevant.
6. **No exit criteria** -- Without criteria, "are we done?" has no answer.
7. **Estimating without data** -- Use historical velocity, not gut feeling.
8. **All manual testing** -- Manual-only plans do not scale and regress constantly.
9. **Testing in isolation** -- QA should be involved from requirements through deployment.
10. **No risk assessment** -- Without risk analysis, critical areas may be under-tested.
