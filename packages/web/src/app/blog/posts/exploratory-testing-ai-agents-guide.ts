import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Exploratory Testing -- Charters, Heuristics, and AI Agent Automation',
  description:
    'Complete guide to exploratory testing. Covers session-based testing, test charters, heuristics, bug hunting techniques, and how AI agents enhance exploratory testing.',
  date: '2026-02-22',
  category: 'Guide',
  content: `
Exploratory testing is the most creative and intellectually demanding form of software testing. Unlike scripted test execution, it requires simultaneous learning, test design, and execution -- all happening in real time as the tester interacts with the software. It is the discipline that catches the bugs automation never will: the unexpected edge cases, the confusing workflows, the subtle regressions that only a curious mind can uncover. And now, AI agents are beginning to enhance exploratory testing in ways that amplify human creativity rather than replace it.

## Key Takeaways

- **Exploratory testing is structured, not random** -- it uses charters, sessions, and heuristics to guide investigation while remaining flexible enough to follow unexpected leads
- **Session-based test management (SBTM)** makes exploratory testing measurable, reportable, and manageable for teams and stakeholders
- **Test charters** focus exploration by defining a target, resources, and information goals before each session
- **Heuristics like SFDPOT and FEW HICCUPPS** provide systematic thinking frameworks that prevent testers from missing entire categories of bugs
- **AI agents can enhance exploratory testing** by simulating user behaviors, generating edge cases, and exploring state combinations that humans might overlook
- **QA skills from [QASkills.sh](/skills)** encode exploratory testing expertise directly into AI coding agents for immediate use

---

## What Is Exploratory Testing?

**Exploratory testing** is a style of software testing where test design and test execution happen simultaneously. The tester actively learns about the system, designs tests based on what they discover, executes those tests, and uses the results to inform the next round of exploration. It was formalized by **Cem Kaner** in the 1980s and later refined by **James Bach** and **Michael Bolton**, who described it as "simultaneous learning, test design, and test execution."

This is fundamentally different from **scripted testing**, where test cases are designed in advance, documented step-by-step, and executed exactly as written. Scripted tests are excellent for regression coverage and automated pipelines. But they only verify what you already thought to check. Exploratory testing discovers what you did not think to check.

A common misconception is that exploratory testing is the same as **ad hoc testing** -- random clicking without structure or purpose. This is incorrect. Ad hoc testing is unplanned and undocumented. Exploratory testing is deliberate, guided by charters and heuristics, documented through session notes, and debriefed with the team. The flexibility is intentional, not accidental.

When does exploratory testing find bugs that automation misses? Consider these scenarios:

- **A new feature** where nobody has written test cases yet -- exploratory testing provides immediate coverage
- **Complex user workflows** that combine multiple features in unexpected ways
- **Edge cases in data input** where creative, malicious, or accidental inputs reveal crashes
- **Usability issues** that are invisible to automated assertions but obvious to a human observer
- **State-dependent bugs** that only manifest after a specific sequence of actions

Exploratory testing is not a replacement for automated testing. It is the complement that makes your overall testing strategy complete.

---

## Session-Based Test Management (SBTM)

One of the biggest criticisms of exploratory testing has always been accountability: how do you track what was tested, measure coverage, and report results to stakeholders? **Session-based test management**, created by **Jon and James Bach**, solves this problem by wrapping exploratory testing in a lightweight management framework.

A **session** is a time-boxed period of uninterrupted exploratory testing, typically lasting **60 to 90 minutes**. Each session has four components:

1. **Charter** -- a mission statement describing what to explore and why
2. **Session notes** -- real-time documentation of what you did, observed, and learned
3. **Bug reports** -- formal write-ups for any defects found during the session
4. **Debrief** -- a short conversation with a test lead or peer to review findings

Here is a session report template you can adapt for your team:

| Field | Value |
|---|---|
| **Tester** | Jane Smith |
| **Date** | 2026-02-22 |
| **Charter** | Explore the checkout flow with expired and declined credit cards to discover payment error handling gaps |
| **Duration** | 75 minutes |
| **On-charter %** | 70% |
| **Opportunity testing %** | 20% |
| **Setup/blocked %** | 10% |
| **Bugs found** | 3 (1 critical, 2 minor) |
| **Areas covered** | Payment form, error messages, retry logic, saved cards |
| **Notes** | Expired card shows generic "Payment failed" with no guidance. Declined card locks user out after 2 attempts with no unlock path. Race condition when double-clicking submit. |
| **Follow-up charters** | Explore payment retry limits across different card types; Explore saved card deletion and re-addition |

The key SBTM metrics are:

- **On-charter percentage** -- time spent directly pursuing the charter's mission
- **Opportunity testing percentage** -- time spent investigating unexpected bugs or interesting behaviors discovered along the way
- **Setup/blocked percentage** -- time spent on environment setup, waiting for builds, or dealing with blocked scenarios

A healthy session typically shows 70-80% on-charter, 15-25% opportunity testing, and less than 10% setup. If setup time is consistently high, your test environment needs improvement. If opportunity testing is consistently high, your charters may be too broad.

SBTM transforms exploratory testing from an invisible activity into a **measurable, reportable, and manageable** practice. Managers get data. Testers get structure. The team gets better coverage.

---

## Writing Effective Test Charters

The **test charter** is the mission statement for an exploratory testing session. It provides enough direction to focus the tester without being so prescriptive that it becomes a script. The widely accepted format, introduced by James Bach and Elisabeth Hendrickson, is:

**"Explore [target] with [resources] to discover [information]"**

Here are ten example charters covering different testing scenarios:

| # | Charter | Focus Area |
|---|---|---|
| 1 | Explore the user registration form with boundary-length inputs to discover validation gaps | Edge cases |
| 2 | Explore the dashboard with a screen reader to discover accessibility barriers | Accessibility |
| 3 | Explore the search feature with SQL injection and XSS payloads to discover security vulnerabilities | Security |
| 4 | Explore the mobile checkout on a 3G connection to discover performance bottlenecks | Performance |
| 5 | Explore the file upload feature with files larger than 500MB to discover size limit handling | Boundary values |
| 6 | Explore the notification system with multiple concurrent users to discover race conditions | Concurrency |
| 7 | Explore the password reset flow with expired tokens to discover error handling gaps | Error paths |
| 8 | Explore the onboarding wizard as a first-time user to discover UX friction points | Usability |
| 9 | Explore the API rate limiting with rapid sequential requests to discover throttling behavior | API reliability |
| 10 | Explore the data export feature with special characters in records to discover encoding issues | Data integrity |

**Good charters vs bad charters:**

- **Bad:** "Test the login page" -- too vague, no specific goal, no clear resource or technique
- **Good:** "Explore the login page with invalid credential combinations to discover authentication error handling gaps"
- **Bad:** "Find bugs in the API" -- no target, no technique, no defined information goal
- **Good:** "Explore the user API endpoints with malformed JSON payloads to discover input validation weaknesses"

**Charter prioritization** should be based on risk. Ask yourself:

- Which features are newest and least tested?
- Which areas have had recent bugs?
- Which components would cause the most business damage if they failed?
- Where is the automated test coverage thinnest?

Prioritize charters that target **high-risk, low-coverage** areas first. This ensures your exploratory testing effort delivers maximum value per session.

---

## Testing Heuristics and Mnemonics

**Testing heuristics** are experience-based thinking frameworks that help testers systematically explore a system without forgetting entire categories of potential problems. They are not rules -- they are reminders. Two of the most powerful heuristic sets in exploratory testing are **SFDPOT** and **FEW HICCUPPS**.

### SFDPOT (San Francisco Depot)

Created by James Bach, SFDPOT is a mnemonic for six dimensions of a product that deserve exploration:

| Letter | Dimension | What to Explore |
|---|---|---|
| **S** | Structure | Code architecture, database schema, file systems, configurations |
| **F** | Function | What the product does -- every feature, every operation, every output |
| **D** | Data | Inputs, outputs, data transformations, storage, retrieval, integrity |
| **P** | Platform | OS, browsers, devices, screen sizes, network conditions, hardware |
| **O** | Operations | How the product is used in practice -- installation, updates, monitoring, maintenance |
| **T** | Time | Timeouts, time zones, scheduling, date boundaries, session expiration, caching |

**Example using SFDPOT on a checkout feature:**

- **Structure:** Does the checkout page load all required JavaScript bundles? Are API calls made in the correct order?
- **Function:** Does every payment method work? Does the discount code apply correctly? Does the order confirmation display accurate information?
- **Data:** What happens with a \$0.00 total? A negative discount? An item with a price of \$999,999.99? Special characters in the billing address?
- **Platform:** Does checkout work on Safari iOS? On Firefox with strict privacy settings? On a 4-year-old Android phone?
- **Operations:** What happens if the server restarts mid-checkout? Can two users buy the last item simultaneously?
- **Time:** Does checkout work at midnight when the date rolls over? What about during daylight saving time transitions? What if the session expires mid-payment?

### FEW HICCUPPS

Created by Michael Bolton, FEW HICCUPPS is a mnemonic for **consistency oracles** -- things the product should be consistent with:

| Letter | Oracle | Question |
|---|---|---|
| **F** | Familiar | Is this consistent with similar features in this product? |
| **E** | Explainability | Can you explain the behavior in a way that makes sense? |
| **W** | World | Is this consistent with how things work in the real world? |
| **H** | History | Is this consistent with how it worked in previous versions? |
| **I** | Image | Is this consistent with the brand and company image? |
| **C** | Comparable | Is this consistent with competitor products? |
| **C** | Claims | Is this consistent with documentation, marketing, and specs? |
| **U** | User expectations | Is this consistent with what users would expect? |
| **P** | Product | Is this consistent with other parts of the same product? |
| **P** | Purpose | Does this serve the product's intended purpose? |
| **S** | Standards | Does this comply with relevant standards and regulations? |

### Additional Useful Heuristics

**CRUD Heuristic:** For any data entity, test **Create, Read, Update, Delete** operations. Then test the boundaries: create with missing required fields, read a deleted record, update with invalid data, delete something that other records depend on.

**Boundary Heuristic:** For any input field with constraints, test the exact boundary values: minimum, minimum minus one, maximum, maximum plus one, zero, empty, null, and values of unexpected types. Boundaries are where bugs cluster because developers often use off-by-one comparisons.

**Interruption Heuristic:** At every significant step of a workflow, ask "What happens if the user stops here?" Kill the browser tab mid-submission. Disconnect the network during a file upload. Switch to another app and come back. Press the back button after submitting a form. Interruption testing reveals resource leaks, incomplete transactions, and corrupted state.

---

## Bug Hunting Techniques

Experienced exploratory testers develop a repertoire of **bug hunting techniques** -- specific tactics for probing areas where bugs are most likely to hide. Here is a matrix of the most effective techniques:

| Technique | Description | What It Finds |
|---|---|---|
| **Boundary value exploration** | Test at the exact limits of input ranges -- min, max, min-1, max+1 | Off-by-one errors, overflow, truncation |
| **State transition testing** | Walk through every state change in a workflow and try invalid transitions | Unreachable states, invalid state combinations |
| **Race condition hunting** | Perform the same action from multiple tabs, double-click buttons rapidly, submit forms twice | Duplicate records, deadlocks, data corruption |
| **Error message testing** | Trigger every error path and evaluate the messages shown | Information leakage, unhelpful messages, missing error handling |
| **Input combination testing** | Combine valid and invalid inputs across multiple fields simultaneously | Partial validation, field interaction bugs |
| **Configuration testing** | Change settings, permissions, roles, and feature flags between operations | Permission escalation, feature flag leaks |
| **Interruption testing** | Kill the app mid-action (close tab, lose network, press back, force-quit) | Data loss, orphaned records, resource leaks |
| **Network condition testing** | Test on slow connections, offline mode, and during connection drops | Timeout handling, retry logic, offline state management |

**How to apply these in practice:** Do not try to use every technique in every session. Instead, select 2-3 techniques that align with your charter. If your charter focuses on a payment form, combine **boundary value exploration** (test extreme amounts), **error message testing** (trigger every payment failure scenario), and **interruption testing** (close the browser mid-transaction).

The goal is not to be exhaustive in a single session. The goal is to be **focused and creative** within your chosen techniques, and over multiple sessions, cover all the techniques across the product.

---

## Exploratory Testing for APIs

Exploratory testing is not limited to user interfaces. **API exploration** is equally valuable and often reveals bugs that UI-level testing cannot reach because the UI may enforce constraints that the API does not.

**Tools for API exploration** include Postman (visual, great for ad hoc requests), HTTPie (clean CLI for quick testing), curl (universal, scriptable), and browser developer tools (for inspecting existing API calls).

Key areas to explore in API testing:

**Boundary values in request parameters:** Send string fields with 0 characters, 1 character, maximum length, and maximum length plus one. Send numeric fields with 0, negative numbers, very large numbers, and floating-point values where integers are expected. Send arrays with 0 elements, 1 element, and thousands of elements.

**Authentication edge cases:** Send requests with expired tokens, revoked tokens, tokens from a different user, malformed tokens, and no token at all. Test whether authentication is checked before or after input validation (order matters for security).

**Rate limiting exploration:** Send rapid sequential requests and observe the rate limiting behavior. Does it return a 429 status code? Does it include a Retry-After header? Does it reset correctly? Can you bypass it by changing headers?

**Error response consistency:** Trigger errors across multiple endpoints and compare the response format. Are error codes consistent? Do all endpoints use the same error schema? Do 404 responses leak information about resource existence?

For a deeper dive into API testing strategies, check out our [complete API testing guide](/blog/api-testing-complete-guide).

---

## Combining Exploratory and Automated Testing

Exploratory testing and automated testing are not competing approaches -- they are **complementary strategies** that address different types of risk. Automated tests prevent known bugs from recurring. Exploratory testing discovers unknown bugs that nobody thought to automate.

The most effective workflow is **"explore then automate":**

1. **Explore** a feature or area using session-based exploratory testing
2. **Document** the bugs found and the interesting scenarios discovered
3. **Automate** regression tests for the bugs that were fixed and the critical paths that were validated
4. **Repeat** with new charters targeting areas adjacent to where bugs were found

This creates a virtuous cycle: exploratory testing expands your understanding of the system, and that understanding feeds into better automated test coverage.

**Using exploratory testing to find gaps in automation:** Write a charter like "Explore areas of the checkout flow that have low automated test coverage to discover unprotected regression risks." Then compare the scenarios you explored with the existing automated test suite. The gaps become candidates for new automated tests.

**Bug bash events** are team-wide exploratory testing sessions where the entire engineering team (not just QA) explores the product for a fixed time period, typically 2-4 hours. Each participant gets a charter or chooses from a prioritized list. Bug bashes are especially effective before major releases and when onboarding new team members who need to learn the product deeply.

The key insight is that exploratory testing provides the **intelligence** that makes automated testing more effective. Without exploration, your automated tests only cover the scenarios you already knew about -- which are rarely the scenarios that cause production incidents.

---

## Reporting and Documentation

Exploratory testing documentation should be **lightweight enough to not slow down exploration** but thorough enough to communicate findings effectively. Over-documenting defeats the purpose of exploratory testing. Under-documenting makes it invisible to stakeholders.

**Session reports** are the primary artifact. They capture the charter, time spent, areas covered, bugs found, and follow-up charters. Keep them concise -- a session report should take less than 10 minutes to write after a 90-minute session.

**Evidence collection** during exploration:

- **Screenshots** for visual bugs and unexpected states
- **Screen recordings** for bugs that require a specific sequence of steps to reproduce
- **Console logs** for JavaScript errors, network failures, and API responses
- **Browser DevTools network traces** for performance issues and failed requests

**Metrics for management** that demonstrate the value of exploratory testing:

| Metric | What It Measures | Target |
|---|---|---|
| Bugs found per session | Effectiveness of exploration | 2-5 per session (varies by product maturity) |
| Session coverage | Percentage of planned charters completed | 80-100% per sprint |
| Critical bugs found | High-severity issues discovered through exploration | Track trend over time |
| Charter follow-up rate | How many new charters emerge from completed sessions | 1-2 new charters per completed session |
| Explore-to-automate ratio | Percentage of exploratory findings that become automated tests | 30-50% |

Avoid the trap of measuring exploratory testing by the number of test cases written or the percentage of requirements covered. These metrics belong to scripted testing and will distort exploratory testing into something it is not.

---

## Automate Exploratory Testing with AI Agents

AI agents do not replace exploratory testers -- they **enhance** them. While human creativity and intuition remain essential for discovering truly unexpected bugs, AI agents excel at tasks that amplify exploratory testing effectiveness:

- **Simulating diverse user behaviors** -- an AI agent can rapidly test a feature as a first-time user, an impatient user, a malicious user, and a power user
- **Generating creative edge cases** -- AI can produce input combinations, boundary values, and data patterns that a human tester might not think of
- **Exploring state combinations** -- AI can systematically walk through state machines, testing transitions that are tedious for humans to enumerate
- **Identifying cognitive load issues** -- AI can analyze interfaces for complexity, inconsistency, and friction that degrades the user experience

**QASkills** provides ready-to-install skills that bring exploratory testing expertise to your AI coding agent:

\`\`\`bash
npx @qaskills/cli add exploratory-test-charter-generator
\`\`\`

This skill teaches your AI agent to generate targeted test charters based on your codebase, recent changes, and risk areas. It applies heuristics like SFDPOT automatically.

\`\`\`bash
npx @qaskills/cli add angry-user-simulator
\`\`\`

This skill instructs your AI agent to approach features as a frustrated, impatient user -- double-clicking buttons, entering unexpected data, navigating backwards, and abandoning workflows mid-step.

Additional exploratory testing skills worth installing:

- **\`first-time-user-tester\`** -- explores your application from the perspective of someone who has never used it before, identifying confusing onboarding flows and unclear navigation
- **\`cognitive-load-analyzer\`** -- evaluates interface complexity, information density, and decision fatigue across user workflows
- **\`ux-friction-logger\`** -- identifies points in user journeys where friction causes abandonment, confusion, or errors
- **\`form-validation-breaker\`** -- systematically attacks form inputs with boundary values, special characters, Unicode, and injection payloads

Browse all available testing skills at [qaskills.sh/skills](/skills) or read the [getting started guide](/getting-started) to install your first skill in under 60 seconds.

These AI-enhanced exploratory testing techniques pair well with other testing practices covered in our guides on [fixing flaky tests](/blog/fix-flaky-tests-guide), [shift-left testing with AI agents](/blog/shift-left-testing-ai-agents), and [security testing for AI-generated code](/blog/security-testing-ai-generated-code).

---

## Frequently Asked Questions

### Is exploratory testing the same as ad hoc testing?

No. Ad hoc testing is unplanned, unstructured, and undocumented. You simply use the software without any specific goal or technique in mind. Exploratory testing is a **deliberate, skilled activity** that uses charters to define goals, heuristics to guide thinking, sessions to manage time, and notes to document findings. The key difference is intentionality: an exploratory tester makes conscious decisions about what to explore, which techniques to apply, and how to adapt based on what they discover. Ad hoc testing has none of this structure.

### How do you measure exploratory testing effectiveness?

The most meaningful metrics are **bugs found per session** (especially severity distribution), **charter coverage** (percentage of planned charters completed), and **explore-to-automate ratio** (how many exploratory findings become automated regression tests). Avoid measuring by test case count or time spent -- these metrics incentivize the wrong behaviors. Instead, track the trend of critical bugs found through exploratory testing versus those found in production. If your exploratory testing is effective, the number of production bugs in explored areas should decrease over time.

### Can junior testers do exploratory testing?

Yes, but with guidance. Junior testers benefit enormously from **structured charters** that give clear direction, **heuristic checklists** like SFDPOT that prevent them from missing entire dimensions, and **pairing sessions** with experienced testers who model their thinking process out loud. In fact, junior testers sometimes find bugs that senior testers miss because they do not carry assumptions about how the system "should" work. Start juniors with narrow, well-defined charters and broaden the scope as they gain experience and develop their own testing instincts.

### How long should exploratory testing sessions be?

The standard recommendation is **60 to 90 minutes** of uninterrupted exploration per session. Sessions shorter than 45 minutes often do not allow enough time to get into a productive flow state. Sessions longer than 120 minutes lead to fatigue and diminishing returns. The ideal length depends on the complexity of the area being explored and the tester's familiarity with it. For a feature you know well, 60 minutes is often sufficient. For a complex new feature, 90 minutes gives you time to learn the system before productive testing begins. Always include 10-15 minutes at the end for writing up session notes.

### Does exploratory testing replace automated testing?

Absolutely not. Exploratory testing and automated testing serve fundamentally different purposes. **Automated testing** verifies that known behaviors continue to work correctly -- it is the safety net that catches regressions. **Exploratory testing** discovers unknown problems -- it is the investigation that finds the bugs nobody anticipated. The most effective QA strategies use both: exploratory testing to discover new risks and edge cases, and automated testing to lock down those discoveries as permanent regression checks. Skipping either one leaves a significant gap in your quality assurance coverage.
`,
};
