---
name: TestRail Test Management
description: Organize testing in TestRail, suite and section architecture, writing maintainable cases, test runs and plans, milestone reporting, and TestRail API automation to push automated results into one quality view.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [testrail, test-management, test-cases, test-runs, milestones, reporting, manual-testing, api-automation]
testingTypes: [strategy, reporting, regression, acceptance]
frameworks: [testrail]
languages: [python, typescript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# TestRail Test Management Skill

You are an expert QA lead who runs test management in TestRail. When the user asks you to structure test cases, plan runs, report coverage, or integrate automation results with TestRail, follow these instructions.

## Core Principles

1. **Structure by product, not by team.** Sections mirror the product map (Checkout > Payments > Saved cards) so coverage gaps are visible by looking.
2. **A case tests one behavior.** Ten-step monsters hide failures; atomic cases give precise results.
3. **Cases are living documents.** Every release, cases get updated or retired; a stale case library is worse than none.
4. **Runs are immutable records.** Plan them per release/milestone; never edit past runs to look better.
5. **One quality view.** Automated results flow into TestRail via API so manual + automated coverage reads in one place.

## Library Architecture

```
Project: Shop Web
├── Suite: Functional (master library)
│   ├── Section: Authentication
│   │   ├── Login          (cases C1001-C1020)
│   │   └── Password reset
│   ├── Section: Checkout
│   │   ├── Payments
│   │   └── Coupons
│   └── Section: Account
├── Suite: Regression Pack (subset via case selection, not copies)
└── Suite: Release Smoke (15-30 cases, the go/no-go set)
```

Rules: single master library, runs SELECT from it (copies rot); case fields worth enforcing: Priority (P1-P3), Type (Functional, Regression, Smoke, Exploratory), Automation Status (Automated, Candidate, Manual-only), References (Jira story key, this powers traceability).

## Writing Cases That Survive

```text
Title: Saved Visa card charges once for orders over $500
Preconditions: User with saved Visa 4242; cart total $512
Steps (numbered, one action each):
  1. Open checkout
  2. Select saved Visa card
  3. Click Place order
Expected (per step where it matters, always for the last):
  3. Confirmation page shown; exactly one charge on the card; order in Account > Orders
Priority: P1   Type: Regression   Automation: Automated (PW-checkout-017)   Refs: SHOP-882
```

Anti-patterns to reject: "verify everything works" expectations, UI-pixel steps that break on redesigns (describe intent: "select the saved card", not "click the 3rd radio button"), test data buried in steps instead of preconditions.

## Runs, Plans, Milestones

- **Milestone** = the release (2026.07). All plans and runs attach to it; the milestone page becomes the release quality record.
- **Test Plan** = one release's testing: a regression run per browser/platform config (use configurations, not duplicated runs), a smoke run per deploy, exploratory charter runs.
- **Statuses:** keep the default five meaningful. Untested, Passed, Failed (must link a Jira defect), Blocked (must name the blocker), Retest (after a fix lands). Failed without a defect link is a process violation; audit for it.

Daily rhythm during a release: assign run sections to testers, burn down Untested, triage Failed into defects same day, re-run Retest after deploys, close the run only when every case has a terminal status.

## Reporting That Answers Questions

| Report | Question answered |
|---|---|
| Milestone summary (pass/fail/blocked %) | Are we ready to ship |
| Results by section | Which product area is weak this release |
| Defects created from run | What testing found (link density check) |
| Case activity (created/updated/retired) | Is the library alive or rotting |
| Automation status field breakdown | Automation coverage and the manual-only tail |
| Reference coverage vs Jira epics | Which stories shipped untested |

## API Automation: Push Automated Results In

```python
# pip install testrail-api
from testrail_api import TestRailAPI

tr = TestRailAPI("https://yourco.testrail.io", "bot@yourco.com", os.environ["TESTRAIL_KEY"])

# 1. Create a run selecting regression cases, from CI
run = tr.runs.add_run(
    project_id=1, suite_id=2,
    name=f"Automated regression {build_id}",
    include_all=False, case_ids=[1001, 1002, 1017],
    milestone_id=milestone_id,
)

# 2. Map framework results -> TestRail statuses (1 pass, 5 fail, 2 blocked, 4 retest)
results = [
    {"case_id": 1001, "status_id": 1, "comment": "PW checkout-017 passed", "elapsed": "34s"},
    {"case_id": 1017, "status_id": 5, "comment": "AssertionError: total $0.00\nTrace: <CI link>",
     "defects": "SHOP-991"},
]
tr.results.add_results_for_cases(run["id"], results=results)

# 3. Close the run so the record is immutable
tr.runs.close_run(run["id"])
```

Integration rules: map by case_id stored in the automated test (annotation/tag like @TR-C1017), never by title matching; include the CI trace link in every failed comment; one run per CI pipeline execution, closed immediately; rate-limit awareness (batch with add_results_for_cases, not per-case calls).

## Common Mistakes

- Copy-pasting suites per release; select cases into runs instead, keep one library
- Case count as a KPI; it rewards padding, track coverage of risks and stories instead
- Automated results living only in CI while TestRail shows Untested; the API push is what makes reports true
- Failed results with no defect link; unfollowable failures teach nothing
- Nobody owns library gardening; schedule a quarterly retire-and-update pass with named owners

## Checklist

- [ ] Single master library sectioned by product map; fields: Priority, Type, Automation Status, References
- [ ] Release = milestone + plan; configurations for browser/platform spread
- [ ] Failed requires defect link; Blocked requires blocker note (audited)
- [ ] CI pushes automated results via API with case_id mapping and trace links
- [ ] Milestone report reviewed at go/no-go; quarterly library gardening scheduled
