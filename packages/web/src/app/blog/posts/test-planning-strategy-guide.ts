import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Planning -- How to Write a Test Strategy That Actually Works',
  description:
    'Complete guide to test planning and strategy. Covers test plans, risk analysis, scope definition, resource allocation, test estimation, and agile testing strategies.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Most test plans fail not because teams write bad tests, but because they never had a real plan to begin with. They had a document -- a 40-page artifact that someone produced to satisfy an audit requirement or a process gate, then promptly filed away where no one ever looked at it again. A real **test planning** process produces a living strategy that guides daily decisions: what to test, what to skip, where to invest automation, and when to ship. This guide walks you through building a test strategy and test plan that your team will actually use. We cover the distinction between strategy and plan, risk-based prioritization, scope management, estimation techniques, agile adaptations, and the entry and exit criteria that keep releases on track. Whether you are a QA lead writing your first formal plan or an experienced test manager looking to modernize your approach, the frameworks here will help you move from paperwork to genuine **QA planning** that reduces risk and accelerates delivery.

---

## Key Takeaways

- A **test strategy** defines what you will test and why at the organizational level, while a **test plan** defines how and when for a specific project or release
- **Risk-based test planning** ensures you spend the most effort on the features most likely to fail and most costly when they do -- this is the single highest-leverage improvement most teams can make
- Defining explicit **in-scope and out-of-scope** boundaries prevents scope creep and sets realistic expectations with stakeholders
- **Test estimation** is inherently uncertain -- use three-point estimation and complexity weighting to produce ranges rather than false-precision single numbers
- **Agile test planning** replaces heavy upfront documentation with lightweight, sprint-level planning artifacts that evolve with the product
- **Entry and exit criteria** transform subjective "are we done?" conversations into objective, measurable quality gates

---

## What Is a Test Strategy?

A **test strategy** is the high-level document that defines your organization's overall approach to testing. It answers the big-picture questions: What types of testing will you perform? What are the quality goals? Which testing levels matter most for your product? What tools and environments will you use? What risks are you testing against?

The test strategy is not project-specific. It applies across releases, across sprints, and often across multiple products within an organization. Think of it as your testing constitution -- the foundational principles that guide all testing decisions.

A **test plan**, by contrast, is project-specific. It takes the principles from the strategy and applies them to a particular release, feature, or sprint. The plan specifies the concrete details: which features are in scope, who is responsible for what, what the schedule looks like, and what the specific pass/fail criteria are.

Here is how the two relate:

| Aspect | Test Strategy | Test Plan |
|---|---|---|
| **Scope** | Organization or product-wide | Specific project, release, or sprint |
| **Lifespan** | Long-lived, updated infrequently | Short-lived, created per release |
| **Content** | Testing approach, levels, types, tool standards | Specific features, schedule, assignments, criteria |
| **Audience** | QA team, engineering leadership, stakeholders | Project team, developers, QA engineers |
| **Question it answers** | "What and why do we test?" | "How, when, and who tests this specific thing?" |

You need both. A strategy without plans is philosophy without action. Plans without a strategy are tactics without direction. In practice, many teams collapse both into a single document for small projects, and that is perfectly fine -- as long as the strategic thinking still happens.

When you are establishing **QA planning** for the first time, start with the strategy. Define your testing levels (unit, integration, E2E), your automation goals (what percentage of tests should be automated, and at which level), your tooling standards, and your quality metrics. Then create plans for individual releases that inherit from and reference the strategy.

---

## Test Plan Anatomy

A well-structured **test plan template** does not need to be 40 pages. The best plans are concise, scannable, and focused on decisions rather than boilerplate. Here are the essential sections.

**1. Scope and Objectives** -- What are you testing and why? List the features, modules, or user stories in scope. Equally important, list what is explicitly out of scope. State the quality objectives: "Zero critical defects in the payment flow at release" is a clear objective. "Ensure quality" is not.

**2. Test Approach** -- How will you test? Specify the testing levels (unit, integration, E2E), testing types (functional, performance, security, accessibility), and the balance between manual and automated testing. Reference the test strategy for organizational standards.

**3. Resources and Responsibilities** -- Who is doing what? Name the QA engineers, developers responsible for unit tests, and any external testers. Include tool and infrastructure requirements. Specify who owns the test environments, test data, and CI/CD pipeline configuration.

**4. Schedule and Milestones** -- When does testing happen? Align test milestones with development milestones. Include dates for test environment readiness, test case creation, test execution cycles, and regression runs. Build in buffer -- testing always takes longer than planned.

**5. Risks and Mitigations** -- What could go wrong? Identify risks to the testing effort itself (not just product risks): late delivery of features, unavailable test environments, team member absence, third-party API instability. For each risk, document a mitigation plan.

**6. Entry and Exit Criteria** -- When do you start and when are you done? Entry criteria define the conditions that must be met before testing begins. Exit criteria define the conditions for declaring testing complete. These are your quality gates.

**7. Deliverables** -- What will you produce? Typically: test cases, test execution results, defect reports, test summary report, and any automation scripts created during the effort.

Here is a lightweight **test plan template** suitable for agile teams:

\`\`\`markdown
# Test Plan: [Feature/Release Name]

## Scope
- In scope: [Feature A, Feature B, API v2 endpoints]
- Out of scope: [Legacy admin panel, mobile app, performance testing]

## Approach
- Unit tests: Developers, Jest, 80% coverage target for new code
- Integration: QA team, Playwright API tests for all new endpoints
- E2E: QA team, Playwright, critical paths only (login, checkout, dashboard)
- Manual: Exploratory testing for new UI flows

## Resources
- QA Lead: [Name] -- test plan ownership, E2E automation
- QA Engineer: [Name] -- integration tests, exploratory testing
- Dev team: Unit tests, code review of test PRs
- Environment: Staging (shared), dedicated QA env for data-sensitive tests

## Schedule
- Sprint 1-2: Test case design + unit test development
- Sprint 3: Integration and E2E test execution
- Sprint 4: Regression + exploratory + bug fixes
- Release: [Date]

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Staging env instability | High | Medium | Dedicated QA environment as fallback |
| Late feature delivery | Medium | High | Prioritize testing for completed features first |
| Third-party payment API changes | Low | High | Mock payment API for regression suite |

## Entry Criteria
- Feature code merged to staging branch
- Unit tests passing in CI
- Test environment provisioned with seed data

## Exit Criteria
- All critical and high-priority test cases executed
- Zero open P0/P1 defects
- Regression suite passing at 98%+
- Performance benchmarks within 10% of baseline
\`\`\`

This template fits on a single page. It is scannable, actionable, and covers every essential dimension of **test planning** without the bloat. Adjust the sections based on your project size -- a two-week feature might need only scope, approach, and exit criteria.

---

## Risk-Based Test Planning

**Risk-based test planning** is the single most impactful improvement you can make to your QA process. Instead of treating all features as equally important, you allocate testing effort proportionally to the risk each feature carries. High-risk features get exhaustive testing. Low-risk features get smoke-level coverage. The result is better defect detection with the same or less total effort.

### The Risk Identification Workshop

Start with a **risk identification workshop** involving QA, developers, product managers, and architects. The goal is to generate a list of risks for the release. A risk in this context is anything that could go wrong with the software and cause harm to users, the business, or the system.

Prompt the group with these questions:

- What is the most complex feature in this release?
- Where have we had production incidents before?
- What areas of the code have the least test coverage?
- Which features handle money, personal data, or critical workflows?
- What third-party integrations could behave unexpectedly?
- Where are the newest, least-experienced developers working?

### The Risk Matrix

Score each identified risk on two dimensions: **likelihood** (how probable is the failure?) and **impact** (how severe is the consequence?). Use a simple 1-3 scale for each.

| Risk | Likelihood (1-3) | Impact (1-3) | Risk Score | Test Priority |
|---|---|---|---|---|
| Payment processing failure | 2 | 3 | 6 | Critical -- exhaustive testing |
| User registration broken | 1 | 3 | 3 | High -- full regression |
| Dashboard chart rendering | 2 | 1 | 2 | Medium -- smoke test |
| Admin report formatting | 1 | 1 | 1 | Low -- manual spot check |

The **risk score** is simply likelihood multiplied by impact. Map risk scores to test priorities:

- **Score 6-9**: Critical. Exhaustive test coverage. Automated regression. Performance and security testing. Manual exploratory testing
- **Score 3-5**: High. Full functional testing. Automated regression for core paths
- **Score 2**: Medium. Smoke testing plus targeted manual checks
- **Score 1**: Low. Basic validation only. Consider accepting the risk

### Mapping Risks to Test Coverage

For each high-priority risk, define specific test activities:

- **Payment processing failure (score 6)**: 15 automated E2E tests covering all payment methods, edge cases (expired cards, insufficient funds, network timeouts), concurrency scenarios. Load test at 2x expected peak. Manual exploratory testing of the entire checkout flow
- **User registration broken (score 3)**: 8 automated integration tests for the registration API. 3 E2E tests for the registration UI flow. Regression run before every release

This mapping creates a direct link between business risk and testing effort, which makes your **test planning** defensible to stakeholders. When someone asks "why did we spend 40% of our testing time on payments?", you point to the risk matrix.

---

## Defining Test Scope

Scope definition is where most test plans go wrong. A vague scope -- "test the new release" -- guarantees scope creep, missed expectations, and arguments about what should and should not have been tested. Explicit scope boundaries are essential for effective **QA planning**.

### In Scope vs. Out of Scope

For every release, create two explicit lists. The **in-scope** list enumerates the features, modules, and user stories that will be tested. The **out-of-scope** list enumerates what will not be tested and why. The out-of-scope list is the more important of the two, because it manages expectations upfront.

Example:

- **In scope**: New checkout flow (3 payment methods), updated user profile page, API v2 order endpoints, mobile-responsive layout for checkout
- **Out of scope**: Legacy admin panel (no changes this release), email notification templates (unchanged), third-party analytics integration (tested by vendor), performance testing (separate performance test cycle planned for Q3)

### Feature Prioritization

Not all in-scope features receive equal testing. Use the risk matrix from the previous section to prioritize. For features with lower risk scores, define the **minimum viable testing** -- the smallest set of tests that provides acceptable confidence. For high-risk features, define the **comprehensive testing** plan including edge cases, negative paths, and cross-browser verification.

### Regression Scope Per Release

Each release needs a defined **regression scope** -- the set of existing tests you will re-run to verify that the new changes have not broken anything. This is not your entire test suite. It is a curated subset based on:

- **Impact analysis**: Which existing features could be affected by the new changes?
- **Historical regressions**: Which areas have broken during past releases?
- **Critical paths**: Which user journeys must work regardless of what changed?

Start with the critical paths (they always run), add tests for areas connected to the new changes, and include any historically flaky areas. This gives you a focused regression scope that provides high confidence without running thousands of irrelevant tests.

### Handling Scope Creep

Scope creep in testing usually comes from one of three sources: late feature additions, "can you just also test this?" requests from stakeholders, and the QA team's own desire for completeness. Manage it with these practices:

- **Change control**: Any scope addition after the plan is signed off requires an explicit trade-off conversation. "We can add mobile testing for the profile page, but we will need to drop exploratory testing for the admin panel. Which do you prefer?"
- **Buffer allocation**: Reserve 10-15% of your testing capacity for unplanned work. When something unexpected arises, it comes from the buffer -- not from cutting planned coverage
- **Scope freeze date**: Define a date after which no new scope can be added without a formal exception process. This is typically 1-2 weeks before the planned release date

---

## Test Estimation Techniques

Test estimation is difficult because testing inherently involves uncertainty. You do not know how many defects you will find, how long defect investigation will take, or whether the test environment will be stable. Experienced QA leads know this and plan accordingly. Here are the techniques that produce the most realistic **test estimation** results.

### Work Breakdown Structure

Break the testing effort into small, estimable tasks. Instead of estimating "test the checkout feature," break it down:

- Write test cases for checkout flow: 4 hours
- Set up test data for payment scenarios: 2 hours
- Execute happy path tests: 3 hours
- Execute negative/edge case tests: 4 hours
- Regression testing for related modules: 6 hours
- Defect retesting (estimated 5 defects at 30 min each): 2.5 hours
- Test summary and reporting: 1.5 hours

**Total: 23 hours**

The work breakdown structure forces you to think through every activity, which naturally produces better estimates than top-down guessing.

### Three-Point Estimation

For each task, estimate three values:

- **Optimistic (O)**: Best case -- everything goes perfectly, no blockers, no surprises
- **Most Likely (M)**: Realistic case -- normal number of issues and blockers
- **Pessimistic (P)**: Worst case -- environment problems, many defects, unclear requirements

The expected duration is: **(O + 4M + P) / 6**

For example, if you estimate regression testing as optimistic 4 hours, most likely 8 hours, pessimistic 16 hours, the expected duration is (4 + 32 + 16) / 6 = **8.7 hours**. This is the PERT (Program Evaluation and Review Technique) formula, and it naturally weights toward the most likely scenario while accounting for variance.

### Test Case Complexity Weighting

Not all test cases take the same time to execute. Assign complexity weights:

| Complexity | Description | Estimated Time |
|---|---|---|
| **Simple** | Single action, single assertion, no setup | 5 minutes |
| **Medium** | Multiple steps, some data setup, 2-3 assertions | 15 minutes |
| **Complex** | Multi-step workflow, complex data, cross-system | 30 minutes |
| **Very Complex** | End-to-end journey, multiple systems, data cleanup | 60 minutes |

If your test suite has 50 simple, 30 medium, 15 complex, and 5 very complex cases, the total estimated execution time is: (50 x 5) + (30 x 15) + (15 x 30) + (5 x 60) = 250 + 450 + 450 + 300 = **1,450 minutes (about 24 hours)**.

### Why Estimates Are Always Wrong

They are always wrong because testing is an exploration activity with inherent unknowns. Defect density is unpredictable. Environment instability is unpredictable. Requirement clarifications cause rework. The key is not to produce perfect estimates but to **manage the uncertainty**:

- Present estimates as **ranges**, not single numbers: "Regression testing will take 6-10 days, with 8 days as the most likely"
- Track **actual vs. estimated** for every release. Over time, your historical data becomes your best estimation tool
- Build in **explicit buffer** for the unknown: 15-20% for stable projects, 25-30% for new or high-risk projects
- Re-estimate at checkpoints. An estimate made at the start of a project is inherently less accurate than one made halfway through when you have real data

---

## Agile Test Planning

Traditional **test planning** assumed a waterfall lifecycle: requirements are complete, design is frozen, and testing happens in a dedicated phase after development. Agile development shattered those assumptions. In agile, requirements evolve continuously, development and testing happen concurrently, and releases happen weekly or even daily. **Agile test planning** adapts the discipline of test planning to this reality.

### Sprint-Level Test Planning

In agile, the test plan lives at the sprint level. During sprint planning, the QA engineer participates in story estimation and identifies testing needs for each user story. For every story accepted into the sprint, define:

- **Test approach**: Unit tests (dev), integration tests (QA or dev), E2E tests (QA), manual exploratory (QA)
- **Acceptance criteria verification**: How will each acceptance criterion be verified? Automated test, manual check, or both?
- **Test data requirements**: What data needs to exist in the test environment?
- **Dependencies**: Does this story depend on another story being complete before it can be tested?

This is lightweight, takes 15-30 minutes during sprint planning, and produces a clear testing plan for the sprint.

### Definition of Done Including Testing

The **definition of done (DoD)** is agile's equivalent of exit criteria. A story is not done until testing is complete. A strong DoD for testing includes:

- Unit tests written and passing (code coverage threshold met)
- Integration tests written for new API endpoints
- E2E tests updated or created for affected user journeys
- Manual exploratory testing completed
- No open critical or high-severity defects
- Test automation added to the regression suite
- Code reviewed and approved

When testing is embedded in the DoD, it cannot be deferred or skipped. The story simply is not done until the testing criteria are met.

### Testing in CI/CD

**Agile test planning** must account for continuous integration and continuous delivery. Your CI/CD pipeline is the execution engine for your test plan. Structure it as layers:

1. **On every commit**: Unit tests and lint checks (under 5 minutes)
2. **On every pull request**: Unit tests + integration tests + static analysis (under 15 minutes)
3. **On merge to main**: Full integration suite + smoke E2E tests (under 30 minutes)
4. **Nightly**: Complete regression suite + performance benchmarks (can take hours)
5. **Before release**: Full regression + manual exploratory + cross-browser (dedicated test cycle)

Each layer provides a progressively higher level of confidence. Fast feedback loops on commits and PRs catch the majority of regressions immediately. Longer-running suites catch the subtle issues that fast tests miss.

### Waterfall vs. Agile Test Planning

| Aspect | Waterfall Test Planning | Agile Test Planning |
|---|---|---|
| **When planning happens** | Before testing phase begins | Every sprint, continuously |
| **Plan document** | Comprehensive, 20-50 pages | Lightweight, 1-2 pages per sprint |
| **Scope** | Entire release | Sprint increment |
| **Flexibility** | Low -- changes require formal change control | High -- adapts every sprint |
| **Risk management** | Upfront risk analysis for entire project | Ongoing risk assessment per story |
| **Who creates it** | QA lead or test manager | Whole team during sprint planning |
| **Test execution** | Dedicated test phase | Continuous, within each sprint |

Neither approach is inherently better. Waterfall-style planning is appropriate for regulated industries, safety-critical systems, and projects with fixed requirements. Agile planning is appropriate for most web applications, SaaS products, and teams practicing continuous delivery. Many teams use a hybrid: a lightweight strategy document that persists across releases, with sprint-level plans for the tactical details.

---

## Entry and Exit Criteria

**Entry criteria** are the conditions that must be satisfied before testing can begin. **Exit criteria** are the conditions that must be satisfied before testing is declared complete and the software can be released. Together, they form the objective quality gates that replace subjective "I think we are done" conversations.

### Entry Criteria Examples

| Criterion | Description | Why It Matters |
|---|---|---|
| Code complete | All features for the release are merged | Testing incomplete code wastes effort on known-broken functionality |
| Build deployable | The build compiles and deploys to the test environment | Cannot test software that does not run |
| Unit tests passing | All unit tests pass in CI | Unit test failures indicate fundamental issues -- no point running higher-level tests |
| Test environment ready | Environment provisioned with correct configuration and test data | Environment issues block testing and invalidate results |
| Test cases reviewed | Test cases peer-reviewed and approved | Prevents wasted execution on poorly designed tests |
| Requirements stable | No open requirements changes in scope | Testing against moving requirements produces invalid results |

### Exit Criteria Examples

| Criterion | Description | Typical Threshold |
|---|---|---|
| Test execution complete | All planned test cases executed | 100% of critical, 95% of high, 90% of medium |
| Defect resolution | Critical and high defects resolved | Zero open P0, zero open P1 |
| Test pass rate | Percentage of tests passing | 98% overall, 100% for critical paths |
| Code coverage | Automated test coverage metric | 80% line coverage for new code |
| Performance | Response times within acceptable range | P95 latency under 500ms for key endpoints |
| Regression clean | Regression suite passing | 100% of smoke, 98% of full regression |

The specific thresholds depend on your product and risk tolerance. A medical device or financial system might require 100% test execution and zero open defects of any severity. A consumer web application might ship with known low-severity issues and 95% test pass rate. The point is that the criteria are **defined, measurable, and agreed upon before testing begins** -- not invented after testing is done to justify a ship decision.

---

## Test Environment Planning

A perfect test plan executed in a broken environment produces worthless results. **Test environment planning** is the unglamorous but essential practice of ensuring your testing infrastructure supports your test plan.

### Environment Requirements

For each testing level, define the environment requirements:

- **Unit tests**: Local developer machine or CI runner. Minimal dependencies -- databases mocked or in-memory
- **Integration tests**: CI environment with real database (test instance), real message queues, mocked external APIs
- **E2E tests**: Staging environment that mirrors production architecture. Real browser engines (Chromium, Firefox, WebKit). Realistic data volumes
- **Performance tests**: Dedicated performance environment with production-equivalent hardware. Isolated from other testing to prevent interference

### Data Requirements

Test data is frequently the bottleneck in testing. Define your data strategy:

- **Seed data**: Baseline dataset loaded before every test run. Includes users, products, configurations needed for tests to execute
- **Test-specific data**: Data created by individual tests during execution. Must be isolated to prevent test interference
- **Data cleanup**: Strategy for resetting data between test runs. Options: database snapshots and restore, transactional rollback, or delete-and-recreate
- **Sensitive data**: How production data is handled if used for testing. Anonymization, masking, or synthetic data generation requirements

### Tool Requirements

Document the tools required for testing and their access requirements:

- **Test frameworks**: Playwright, Jest, pytest -- version-pinned to avoid compatibility issues
- **CI/CD platform**: GitHub Actions, Jenkins, GitLab CI -- with sufficient runner capacity for parallel execution
- **Test management**: Jira, TestRail, or spreadsheet -- for tracking test cases and results
- **Monitoring**: Log access and APM dashboards for investigating test failures against backend behavior

### Environment Management for Parallel Testing

When multiple teams or test suites need to run simultaneously, environment contention becomes a real problem. Strategies to manage this:

- **Dedicated environments per team**: Each team gets its own environment. High cost, low contention
- **Shared environment with data isolation**: Single environment with namespace-separated data. Lower cost, requires disciplined data management
- **On-demand environments**: Spin up ephemeral environments for each test run using containers or cloud infrastructure. Best isolation, requires infrastructure automation
- **Environment scheduling**: Reserve time slots for environment access. Simple to implement, limits testing flexibility

For most modern teams, **on-demand environments** using Docker Compose or Kubernetes namespaces provide the best balance of isolation, cost, and flexibility. Each pull request can spin up its own environment, run its tests, and tear it down -- eliminating contention entirely.

---

## Automate Test Planning with AI Agents

Manual test planning is time-consuming and error-prone. AI coding agents can accelerate the process by generating test plans from requirements, identifying coverage gaps, and creating test cases from user stories. QA Skills provides installable skills that teach your AI agent how to perform these tasks following best practices.

### Generate Test Plans Automatically

Install the test plan generation skill to have your AI agent create structured test plans from requirements documents, user stories, or feature specifications:

\`\`\`bash
npx @qaskills/cli add test-plan-generation
\`\`\`

This skill teaches your agent to analyze requirements, identify risk areas, define scope boundaries, and produce a complete **test plan template** that you can review and refine. It follows the lightweight plan structure described earlier in this guide.

### Create Test Cases from User Stories

Turn user stories and acceptance criteria into executable test cases:

\`\`\`bash
npx @qaskills/cli add test-case-generator-user-stories
\`\`\`

The agent generates test cases that cover happy paths, negative paths, boundary conditions, and edge cases -- all derived from the acceptance criteria in your user stories. This dramatically reduces the time from story creation to test readiness.

### Manage Test Debt and Regression Gaps

Over time, test suites accumulate debt: outdated tests, missing coverage for new features, and redundant cases that slow execution without adding value. These skills help you manage it:

\`\`\`bash
npx @qaskills/cli add test-debt-calculator
npx @qaskills/cli add regression-suite-bug-reports
\`\`\`

The **test-debt-calculator** skill analyzes your test suite and identifies areas where coverage has fallen behind code changes. The **regression-suite-bug-reports** skill correlates production bug reports with your regression test suite to identify gaps -- if a bug made it to production, your regression suite should have caught it, and this skill identifies exactly where the coverage was missing.

Browse all available QA skills at [/skills](/skills) and get started with the installation guide at [/getting-started](/getting-started). For more on building effective regression suites, see our guide on [regression testing strategies](/blog/regression-testing-strategies-guide).

---

## Frequently Asked Questions

### What is the difference between a test strategy and a test plan?

A **test strategy** is an organization-wide document that defines the overall approach to testing: testing levels, types, tools, and quality goals. It is long-lived and applies across multiple projects and releases. A **test plan** is project-specific and short-lived. It defines the concrete testing activities for a specific release: which features are in scope, who does what, the schedule, and the entry/exit criteria. The strategy provides the principles. The plan applies those principles to a specific context. Most teams need both, though smaller teams often combine them into a single document.

### How do you estimate testing effort accurately?

No estimation technique produces perfectly accurate results, because testing involves inherent uncertainty. The best approach combines multiple techniques: **work breakdown structure** to decompose the effort into small tasks, **three-point estimation** (optimistic, most likely, pessimistic) to produce ranges rather than single numbers, and **historical data** from previous releases to calibrate your estimates against reality. Present estimates as ranges, track actuals versus estimates over time, and build in 15-25% buffer for unknowns. Over multiple releases, your estimates will converge toward accuracy as your historical dataset grows.

### How does test planning work in agile sprints?

In agile, **test planning** happens continuously rather than as a single upfront phase. During sprint planning, the QA engineer reviews each user story, identifies testing needs, and defines the test approach (unit, integration, E2E, manual). Testing criteria are embedded in the definition of done so that stories cannot be marked complete without testing. Sprint-level test plans are lightweight -- typically a few bullet points per story rather than a formal document. The test strategy still exists as a persistent document, but the tactical planning happens every sprint. Retrospectives include testing metrics to continuously improve the planning process.

### What should entry and exit criteria include?

**Entry criteria** should include: code complete and merged, build deployable to the test environment, unit tests passing, test environment provisioned, and test cases reviewed. These conditions ensure testing starts on a solid foundation rather than wasting effort on known-broken builds. **Exit criteria** should include: all critical test cases executed, no open critical or high-severity defects, regression suite passing above a defined threshold (typically 98%), code coverage meeting the target for new code, and performance metrics within acceptable ranges. The specific thresholds depend on your product's risk profile -- regulated or safety-critical software requires stricter criteria than a consumer web application.

### How do you handle test planning when requirements keep changing?

Changing requirements are the norm, not the exception, in modern software development. Manage it with three practices. First, use **risk-based prioritization** so you always test the highest-risk items first -- if scope gets cut, the low-risk items are what you skip. Second, maintain a **scope freeze date** after which new requirements cannot enter the current release without an explicit trade-off conversation. Third, build **buffer** into your test estimates (15-25%) specifically for unplanned work caused by requirement changes. In agile environments, this is naturally handled by sprint boundaries -- new requirements go into the next sprint's test plan rather than disrupting the current one.
`,
};
