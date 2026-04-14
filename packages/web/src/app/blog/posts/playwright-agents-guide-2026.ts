import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Agents Explained: Planner, Generator, and Healer',
  description:
    'Deep dive into Playwright AI-powered agents architecture with the Planner, Generator, and Healer pattern for self-healing test automation, intelligent test generation, and adaptive testing strategies in 2026.',
  date: '2026-04-13',
  category: 'Guide',
  content: `
## The Rise of AI-Powered Test Agents

Traditional test automation follows a simple pattern: a developer writes a test, the test runs against the application, and it either passes or fails. When it fails because a CSS selector changed or a button moved, a developer manually fixes the test. This cycle of write-break-fix has been the dominant workflow for over a decade.

In 2026, a new architecture is emerging that fundamentally changes this dynamic: the Planner-Generator-Healer agent pattern. Instead of humans writing every test and fixing every failure, specialized AI agents handle different phases of the testing lifecycle. The Planner decides what to test, the Generator creates the test code, and the Healer fixes tests when they break.

This guide explains how each agent works, how they collaborate, and how to implement this architecture using Playwright and modern LLMs.

## Understanding the Three-Agent Architecture

The Planner-Generator-Healer pattern draws inspiration from microservice architecture. Instead of one monolithic system handling all testing concerns, three specialized agents each handle a distinct responsibility. They communicate through structured interfaces, allowing each agent to be optimized, replaced, or upgraded independently.

### The Planner Agent

The Planner agent is responsible for deciding what needs to be tested. It takes high-level inputs like user stories, product requirements, or natural language descriptions and produces structured test plans.

A test plan includes the test title, preconditions that must be met before testing begins, a sequence of concrete steps mapping to browser actions, expected outcomes for each step, and a priority level based on business risk.

The Planner does not generate code. It produces a structured specification that the Generator can consume. This separation is crucial because planning requires understanding business context while code generation requires understanding framework APIs. By separating these concerns, each agent can be optimized for its specific task.

The Planner works best when it has access to the application's sitemap or route structure, existing test coverage data showing which areas are already tested, historical bug data revealing which features are most prone to defects, and user analytics showing which features are most frequently used.

### The Generator Agent

The Generator agent takes structured test plans from the Planner and produces executable Playwright test code. It is responsible for choosing appropriate selectors using a prioritized hierarchy: test IDs first, then ARIA roles, then text content, and CSS selectors only as a last resort.

The Generator also creates Page Object Models when tests touch new pages, sets up required test fixtures and data, writes assertions that verify the expected outcomes from the plan, and handles asynchronous operations with proper wait conditions.

A well-configured Generator follows the project's existing code conventions. It examines existing test files for patterns like import styles, assertion libraries, helper function usage, and naming conventions, then generates new tests that match.

The Generator can also produce page objects alongside tests. When it encounters a page that has no existing page object, it can analyze the page's accessibility tree and generate a class with locator properties for all interactive elements, action methods for common user flows, and assertion methods for page state verification.

### The Healer Agent

The Healer agent is the most novel component. When a test fails due to a selector change, layout modification, or renamed element, the Healer analyzes the failure and attempts to fix the test automatically.

The Healer's process works as follows. First, it receives the failure context including the test name, the failed step, the error message, and the selector that failed. Second, it captures the current page state, primarily through the accessibility tree snapshot which provides a structured representation of all elements on the page. Third, it analyzes the snapshot to find the element that the original selector was trying to target, trying alternative selectors in priority order. Fourth, it returns the healed selector along with a confidence score.

The confidence score is critical. A high confidence score (above 0.8) means the Healer is certain it found the right element. A medium score (0.5 to 0.8) means it found a likely match but human verification is recommended. A low score (below 0.5) means the Healer could not reliably identify the element and the test needs manual attention.

## Implementing the Architecture with Playwright

The implementation uses Playwright's built-in capabilities extensively. Playwright's accessibility tree API provides the structured page data that the Healer needs. Its locator API supports the selector hierarchy that the Generator follows. And its test runner provides the execution infrastructure for running and reporting tests.

### Self-Healing in Practice

Self-healing works at the locator level. When a Playwright locator fails to find an element within the timeout period, the self-healing wrapper catches the error, captures the current page state, sends it to the Healer agent, and retries with the healed selector.

This process adds latency to failing tests, typically 2-5 seconds per healing attempt due to the LLM API call. For this reason, healing should be configured with a maximum number of attempts per test, usually 3. If the Healer cannot fix a test in 3 attempts, it should fail normally and be flagged for human intervention.

### The Selector Resilience Hierarchy

The Generator and Healer both follow a prioritized selector strategy. The priority order from most to least resilient is: data-testid attributes which are explicitly added for testing and survive UI refactors, ARIA roles with names which are semantic and tied to the element's purpose rather than its appearance, label text which is user-visible and relatively stable, visible text content which changes less frequently than DOM structure, placeholder text for form inputs, and CSS selectors which are the most brittle option.

This hierarchy is not arbitrary. Test IDs are explicitly maintained by developers and only change intentionally. ARIA roles are tied to accessibility requirements and rarely change without deliberate redesign. CSS selectors, by contrast, change whenever a developer reorganizes the component structure, renames a class, or refactors the markup.

## Orchestrating the Agents

The three agents work together through an orchestrator that manages the workflow. For a typical test generation session, the orchestrator receives user stories or feature descriptions, passes them to the Planner to create test plans, sends each plan to the Generator for code creation, writes the generated tests to the file system, executes the tests to validate they work, and feeds any failures to the Healer for resolution.

For ongoing test maintenance, the orchestrator monitors test execution results, identifies tests that fail due to selector or UI changes, sends failure contexts to the Healer, applies healed selectors if confidence is high enough, and reports healing statistics for team review.

### Cost Management

AI agent operations consume LLM API tokens, and costs can scale quickly. A single test generation costs approximately 2,000 to 5,000 tokens. A healing operation costs 1,000 to 3,000 tokens. A planning operation costs 1,500 to 4,000 tokens.

For a team generating 50 tests per week and healing 20 failures, monthly token costs typically range from 50 to 200 dollars depending on the model used. Using faster, cheaper models like Claude Haiku for healing operations and more capable models like Claude Sonnet for planning and generation is a common cost optimization strategy.

## Setting Up the System

To implement the Planner-Generator-Healer pattern, you need a Playwright project with TypeScript configured, an API key for an LLM provider, and a SKILL.md file that encodes the testing conventions for your project.

The SKILL.md file is particularly important. It tells AI agents how to write tests for your specific project, including which framework patterns to follow, which selectors to prefer, and which assertion styles to use. QASkills provides pre-built skills for Playwright testing that encode these conventions.

Install the Playwright Agents skill to your project with qaskills add playwright-agents. This gives your AI coding agent the knowledge to implement the three-agent architecture following best practices.

## Real-World Results

Teams adopting the Planner-Generator-Healer pattern report several measurable improvements. Test creation speed increases by 3 to 5 times compared to manual test writing. Test maintenance effort decreases by 40 to 60 percent due to self-healing. Selector-related test failures decrease by 70 to 80 percent. And coverage of new features increases because the lower cost of test creation means more features get tested.

However, these benefits come with caveats. Generated tests require human review before being added to the official suite. The Healer should not be trusted blindly since low-confidence healings can mask real bugs. And the system requires initial investment in setting up the infrastructure and tuning the agents for your specific application.

## Limitations and When Not to Use This Pattern

The Planner-Generator-Healer pattern is not appropriate for all testing scenarios. Security testing requires domain expertise that AI agents may lack. Performance testing with precise timing requirements is not well-suited to natural language specification. Compliance testing where every test must be reviewed and approved by a human does not benefit from automated generation.

Additionally, the pattern works best for applications with stable UI patterns. If your application is in early-stage development with rapidly changing UI, the Generator will produce tests that immediately need healing, wasting resources. Wait for UI components to stabilize before investing in automated test generation.

## Getting Started

The fastest way to start is to add the Playwright Agents skill to your AI coding agent and experiment with generating tests for a single user flow. Start with a login flow or a simple CRUD operation. Review the generated code, run it, and observe how the Healer handles intentional UI changes.

Once you are comfortable with the pattern, expand to more complex flows and integrate the orchestrator into your CI/CD pipeline. The investment pays off as your test suite grows and maintenance becomes the dominant cost.

## Building Your First Agent Pipeline

To implement the three-agent architecture in your project, follow these steps.

Step 1: Install the QASkills Playwright Agents skill. This gives your AI coding agent the knowledge to generate the agent infrastructure code.

Step 2: Create the agent directory structure. Set up directories for planner, generator, healer, and orchestrator code. Each agent should have its own module with a clear interface.

Step 3: Implement the Planner first. The Planner takes user stories or feature descriptions and produces structured test plans. Start with a simple implementation that converts natural language into a JSON test plan with steps, expected outcomes, and preconditions.

Step 4: Build the Generator. The Generator takes test plans and produces executable Playwright code. Configure it to follow your project's existing test patterns by providing example tests as context.

Step 5: Add the Healer. The Healer only activates when tests fail. Start with a simple implementation that captures the accessibility tree on failure and suggests alternative selectors.

Step 6: Wire them together with the Orchestrator. The Orchestrator manages the workflow: receive user stories, plan tests, generate code, execute tests, and heal failures.

Step 7: Add cost tracking from day one. Log every LLM API call with its token count and cost. Set a per-run budget limit and stop processing when the limit is reached.

## Comparing Agent Approaches

Several approaches to AI-powered test automation have emerged. Understanding the differences helps you choose the right strategy.

The Planner-Generator-Healer pattern described in this guide is a specialized architecture where each agent handles a specific phase of the testing lifecycle. It works well for teams that want fine-grained control over each phase and want to optimize individual agents independently.

The monolithic agent approach uses a single AI model to handle all testing tasks. This is simpler to implement but harder to optimize and debug. When the agent produces a bad test, it is difficult to determine whether the planning, generation, or healing phase failed.

The collaborative agent approach uses multiple agents that negotiate and discuss testing decisions. This can produce more creative solutions but is slower and more expensive due to the multi-agent communication overhead.

For most teams, the Planner-Generator-Healer pattern offers the best balance of control, cost-efficiency, and maintainability.

## Performance Benchmarks

Teams that have adopted the Planner-Generator-Healer pattern report the following benchmarks.

Test generation speed: The Planner produces a test plan in 2 to 5 seconds. The Generator produces executable test code in 5 to 15 seconds per test. Total time from user story to running test is typically 30 to 60 seconds.

Healing accuracy: With a confidence threshold of 0.8, the Healer correctly identifies the replacement selector approximately 85% of the time. Lowering the threshold to 0.6 increases healing attempts but reduces accuracy to about 70%.

Cost per test: Generating a new test costs approximately 0.02 to 0.05 dollars in API fees. Healing a broken test costs approximately 0.01 to 0.03 dollars. For a team generating 50 tests per week and healing 30 failures, monthly API costs are typically 50 to 150 dollars.

Maintenance time reduction: Teams report a 40 to 60% reduction in time spent fixing broken E2E tests after adopting self-healing, with the savings increasing as the test suite grows.

## Advanced Topics

### Multi-Model Strategy

Not all agents need to use the same AI model. A cost-effective approach is to use a powerful model like Claude Sonnet for planning (which requires reasoning about business logic), a capable but faster model for generation (which requires code output quality), and a small, fast model like Claude Haiku for healing (which requires quick selector resolution).

This multi-model strategy can reduce costs by 40 to 60 percent while maintaining quality where it matters most.

### Batch Healing

When a UI redesign breaks many tests at once, healing them one-by-one is inefficient because the Healer makes the same analysis repeatedly for similar failures. Batch healing groups failures by page, analyzes the page once, and applies fixes to all affected tests simultaneously. This reduces the number of LLM calls from N (one per failure) to approximately N/5 (one per page).

### Test Plan Versioning

As your application evolves, test plans should evolve too. Version test plans alongside your application code so you can track which plans cover which features, identify plans that are outdated when features change, and generate new plans when features are added or modified.

## Integration with QASkills

QASkills provides several skills that support the Planner-Generator-Healer architecture. The Playwright Agents skill encodes the three-agent pattern with complete implementation examples. The Agentic Testing skill covers broader patterns for AI-driven test automation. And the AI Test Generation skill focuses specifically on prompting strategies for generating high-quality test code.

Install these skills to give your AI coding agent the specialized knowledge needed to implement and maintain the agent architecture effectively.

## Frequently Asked Questions

### How much does it cost to run the three-agent architecture?

The cost depends on the scale of usage. For a team generating 20 to 50 tests per week and healing 10 to 30 failures, expect monthly LLM API costs of 50 to 200 dollars. The largest cost factor is the Generator, which produces the most tokens per invocation. Using a multi-model strategy (expensive model for planning, cheaper model for healing) can reduce costs by 40 to 60 percent.

### Can the Healer fix tests broken by business logic changes?

No. The Healer specializes in fixing selector and layout changes. When business logic changes (for example, a checkout flow adds a new step), the Planner needs to generate a new test plan and the Generator needs to create updated test code. The Healer handles the mechanical maintenance while humans handle the logical maintenance.

### How do I prevent the agents from generating incorrect tests?

Three safeguards work together. First, set confidence thresholds: only accept generated tests with confidence scores above 0.8 for automatic inclusion. Second, require human review for all generated tests before they enter the official suite. Third, run generated tests in a sandbox environment to verify they pass before committing.

### Is the three-agent pattern compatible with existing test suites?

Yes. The architecture is additive, not replacement. You can run the agents alongside your existing hand-written tests. The Healer can maintain both agent-generated and human-written tests. Many teams start by enabling the Healer for their existing suite and only later enable the Planner and Generator for new test creation.

### What happens when the AI model is updated?

Model updates can change the quality and style of generated code. After a model update, re-run your test generation on a set of reference tasks and compare the output quality against the previous version. If quality degrades, adjust your prompts or switch to a pinned model version.

### How long does it take to set up the infrastructure?

A minimal implementation with a simple Planner, Generator, and Healer can be built in 2 to 3 days by a developer familiar with Playwright and LLM APIs. A production-ready implementation with cost tracking, confidence calibration, batch healing, and CI integration typically takes 2 to 4 weeks.

## Conclusion

The Planner-Generator-Healer pattern represents a fundamental shift in how test automation is maintained. By distributing responsibilities across specialized agents, teams can generate tests faster, maintain them with less effort, and achieve broader coverage. While the pattern requires initial setup and ongoing cost management, the productivity gains make it a compelling investment for teams maintaining medium to large test suites.

The key to success is starting small, measuring results, and expanding gradually. Not every test needs to be generated by agents, and not every failure needs automatic healing. The pattern works best as a supplement to human-written critical path tests, handling the routine maintenance that consumes the most developer time.

## Recommended Reading and Resources

For teams looking to implement the Planner-Generator-Healer pattern, the following resources provide additional depth.

The QASkills Playwright Agents skill provides a complete, installable implementation with TypeScript code examples for all three agents, the orchestrator, and cost tracking. Install it with qaskills add playwright-agents to get started immediately.

The Playwright documentation covers the accessibility tree API, locator strategies, and test runner configuration that form the foundation of the agent architecture. Understanding these APIs deeply is essential for tuning agent behavior.

The Agentic Testing skill from QASkills covers the broader patterns of AI-driven test automation beyond the three-agent architecture, including multi-agent orchestration, feedback loops, and CI/CD integration.

For teams interested in the underlying AI capabilities, studying prompt engineering patterns for code generation will help you optimize the system prompts used by each agent. The AI Test Generation skill covers these patterns in detail.
`,
};
