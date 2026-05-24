import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Tags and Tagging Best Practices',
  description:
    'Master Robot Framework tags for test selection, reporting, and CI orchestration. Best practices, naming conventions, force tags, default tags, and patterns.',
  date: '2026-05-14',
  category: 'Reference',
  content: `
# Robot Framework Tags and Tagging Best Practices

Tags are one of Robot Framework's most underused but most powerful features. They let you organize tests across multiple dimensions (smoke vs regression, feature area, browser target, risk level, owner team), then select arbitrary subsets at runtime with boolean expressions. A well-tagged suite scales from one engineer to one hundred without becoming a tangled mess - you can run "all smoke tests on Chrome owned by team-checkout" with a single CLI flag. A poorly-tagged suite degenerates into copy-pasted test files and frustrating CI configurations.

This reference covers everything you need to know about Robot Framework tags in 2026: syntax, naming conventions, force tags vs default tags vs test-level tags, the boolean expression language for selecting tests, integration with reporting tools, and battle-tested conventions from production teams. Examples illustrate single-dimensional, multi-dimensional, and hierarchical tagging schemes. By the end you'll be ready to set up a tagging strategy that scales with your team and survives organizational change.

## Key Takeaways

- Tags decouple test selection from file structure
- Use lowercase-with-hyphens for consistency
- Multiple dimensions: priority, feature, owner, target
- Force Tags applies to all tests in a suite
- Default Tags applies unless overridden
- Boolean expressions: tagA AND tagB, tagA OR tagB, NOT tagC
- Reports group by tag for easy navigation

---

## Basic Tag Syntax

\`\`\`robot
*** Test Cases ***
Login Smoke
    [Tags]    smoke    auth
    Open Browser    \${URL}/login    chrome
    Login    user    pass
    Close Browser

Search Regression
    [Tags]    regression    search
    Open Browser    \${URL}/search    chrome
    Search Term    laptop
    Close Browser
\`\`\`

Run only smoke: \`robot --include smoke tests/\`. Run all but smoke: \`robot --exclude smoke tests/\`.

## Force Tags

Apply a tag to every test in a file:

\`\`\`robot
*** Settings ***
Force Tags    e2e    chrome

*** Test Cases ***
Test One
    [Tags]    smoke
    # Has tags: e2e, chrome, smoke

Test Two
    [Tags]    regression
    # Has tags: e2e, chrome, regression
\`\`\`

## Default Tags

Like Force Tags but can be overridden:

\`\`\`robot
*** Settings ***
Default Tags    smoke

*** Test Cases ***
Test One
    # Has tag: smoke (inherited)

Test Two
    [Tags]    regression
    # Has tag: regression (overrides default)
\`\`\`

## Boolean Selection

\`\`\`bash
# AND
robot --include smokeANDauth tests/

# OR
robot --include smokeORregression tests/

# NOT
robot --include smokeNOTslow tests/

# Combined
robot --include "(smokeORregression)ANDchrome" tests/
\`\`\`

Use double quotes around expressions with spaces or special chars.

## Wildcards

\`\`\`bash
robot --include "team-*" tests/
robot --include "browser-*" tests/
\`\`\`

Matches all tags starting with team- or browser-.

## Naming Conventions

Choose a convention and stick to it. Lowercase-with-hyphens is the most readable:

| Convention | Example | Notes |
|-----------|---------|-------|
| lowercase-hyphens | smoke, team-checkout | Recommended |
| camelCase | smokeTest, teamCheckout | Less readable |
| UPPERCASE | SMOKE, CHECKOUT | Visually loud |
| With prefix | tier:smoke, area:auth | Useful for many dimensions |

## Multi Dimensional Tagging

A test might have tags for priority, feature, browser, team:

\`\`\`robot
*** Test Cases ***
Checkout Smoke In Chrome
    [Tags]    smoke    feature-checkout    browser-chrome    team-pay    priority-1
    ...
\`\`\`

Then queries become powerful:

\`\`\`bash
# All checkout-related smoke tests
robot --include "smokeANDfeature-checkout" tests/

# Anything owned by team-pay
robot --include team-pay tests/

# Smoke priority-1 only
robot --include "smokeANDpriority-1" tests/
\`\`\`

## Tag Categories

| Category | Examples | Purpose |
|---------|----------|---------|
| Priority | smoke, regression, critical | Test importance |
| Feature | feature-auth, feature-checkout | Area of code |
| Browser | browser-chrome, browser-firefox | Target |
| Owner | team-frontend, team-backend | Responsibility |
| Risk | flaky, slow, unstable | Health |
| Environment | dev, staging, prod | Where it runs |
| Type | api, ui, db, e2e | Layer |

## Tagging Strategy

Start small and grow. Tier 1: smoke, regression. Tier 2: add feature areas. Tier 3: add ownership. Tier 4: add browser/env targets.

\`\`\`robot
*** Settings ***
Force Tags    feature-checkout    team-pay

*** Test Cases ***
Add To Cart
    [Tags]    smoke
    ...

Apply Discount
    [Tags]    regression
    ...

Refund Order
    [Tags]    regression    priority-1
    ...
\`\`\`

## CI Strategy

\`\`\`yaml
# PR build - fast smoke
- run: robot --include smoke --outputdir results tests/

# Main build - full regression
- run: robot --include "smokeORregression" --outputdir results tests/

# Nightly - everything including slow tests
- run: robot --outputdir results tests/

# Weekly - critical regression with extra browsers
- run: robot --include "regressionANDpriority-1" --variable BROWSER:firefox tests/
\`\`\`

## Reports By Tag

Generate stats per tag in HTML reports:

\`\`\`bash
robot --tagstatcombine "team-pay" --tagstatcombine "feature-checkout" tests/
\`\`\`

The report shows pass/fail rates per tag combination.

## Custom Tag Links

In the HTML report, you can make tags clickable to your bug tracker:

\`\`\`bash
robot --tagstatlink "bug-(\\\\d+):https://jira.example.com/browse/PROJ-\\\\1:JIRA Ticket" tests/
\`\`\`

Then a tag like bug-1234 becomes a link to JIRA.

## Excluding Slow Tests

For PR builds, exclude tests that take too long:

\`\`\`bash
robot --exclude slow tests/
\`\`\`

Tag tests as slow when they exceed your speed budget:

\`\`\`robot
*** Test Cases ***
End To End Bulk Order
    [Tags]    slow    e2e
    [Documentation]    Takes 5+ minutes
    ...
\`\`\`

## Skipping Tests Temporarily

\`\`\`robot
*** Test Cases ***
Broken Test
    [Tags]    skip-broken
    [Documentation]    BROKEN: investigate flaky timeout
    ...
\`\`\`

\`\`\`bash
robot --exclude skip-broken tests/
\`\`\`

Better than commenting out - keeps the test visible.

## Tagging For Reporting

Tag tests with their TestRail or Jira case ID:

\`\`\`robot
*** Test Cases ***
User Can Reset Password
    [Tags]    tc-12345    feature-auth    regression
    ...
\`\`\`

A listener can read the tc- prefix and report results back to TestRail.

## Tagging With Variables

\`\`\`robot
*** Variables ***
\${OWNER}    team-payments

*** Settings ***
Force Tags    \${OWNER}

*** Test Cases ***
Refund Flow
    [Tags]    regression
    # Has tags: team-payments, regression
\`\`\`

## Inheriting Tags From Suite

\`\`\`robot
# suite_setup.robot
*** Settings ***
Force Tags    feature-checkout

# Has all tests tagged with feature-checkout
\`\`\`

## Tag Cleanup

Periodically audit your tags. Common issues:

\`\`\`bash
# List all tags in use
robot --dryrun --output tag_audit.xml tests/
\`\`\`

Then parse the output to count tag usage. Tags used by only 1 or 2 tests probably aren't worth keeping. Tags missing from new tests indicate convention drift.

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Tags as documentation | Hard to query | Use [Documentation] |
| Too many dimensions | Cognitive overload | Limit to 3-5 axes |
| Inconsistent casing | Breaks selection | Pick one convention |
| Untagged tests | Can't select smoke | Force Tags at suite level |
| TODO as a tag | Vague | Use skip-broken or specific issue ID |

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Checkout regression suite
Force Tags       feature-checkout    team-pay
Library          SeleniumLibrary

*** Test Cases ***
Add Single Item To Cart
    [Tags]    smoke    priority-1    layer-ui
    ...

Apply Promo Code
    [Tags]    regression    priority-2    layer-ui
    ...

Refund Full Order
    [Tags]    regression    priority-1    layer-api
    ...

Tax Calculation Across States
    [Tags]    regression    priority-2    layer-api    slow
    ...

Subscription Renewal Webhook
    [Tags]    regression    priority-1    layer-api    integration
    ...

Apple Pay Mobile Checkout
    [Tags]    regression    priority-1    layer-ui    browser-mobile-safari    slow
    ...

Refund After Chargeback
    [Tags]    regression    priority-1    layer-api    tc-PAY-2233    bug-known-12345
    [Documentation]    Reported in PAY-2233; pending fix from team-pay
    ...
\`\`\`

Query examples:

\`\`\`bash
# Smoke only
robot --include smoke tests/checkout/

# All priority-1
robot --include priority-1 tests/checkout/

# API layer only (excluding slow)
robot --include "layer-apiANDNOTslow" tests/checkout/

# Mobile browser tests
robot --include "browser-mobile-*" tests/checkout/
\`\`\`

## Tagging At Scale

For a 5000-test suite with 50 engineers:

| Decision | Convention |
|----------|-----------|
| Priority tags | smoke (run on every PR), regression (run on main), nightly (run nightly) |
| Feature tags | feature-{area} matching code modules |
| Owner tags | team-{name} matching org chart |
| Risk tags | flaky, slow, unstable |
| Environment tags | dev, staging, prod (which envs the test is valid for) |

## CI Configuration With Tags

\`\`\`yaml
name: Tagged Test Runs
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * *'
jobs:
  smoke:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: robot --include smoke tests/

  regression:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: robot --include "smokeORregression" tests/

  nightly:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: robot tests/
\`\`\`

## Conclusion

Tags are how Robot Framework scales from a handful of tests to thousands. The combination of file-level Force Tags, test-level [Tags], and CI-level --include/--exclude expressions gives you total control over which tests run when. A well-designed tagging scheme makes test selection a matter of one CLI flag, while a poorly-designed one forces developers to maintain multiple parallel suites.

Spend an hour designing your tag taxonomy before writing your hundredth test. Document the convention in your repo's CLAUDE.md or README. Force the team to use it via PR review. Within a quarter you'll have a suite that gives every stakeholder exactly the tests they care about, when they care about them. Explore the [skills directory](/skills) or read the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) for related orchestration patterns.
`,
};
