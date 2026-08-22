---
name: Automation Tester Resume Optimizer
description: Build an SDET or automation engineer resume around framework ownership, tool-stack evidence, CI/CD integration, and GitHub proof that survives technical screening and recruiter keyword search.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [resume, sdet, automation, career, ats]
testingTypes: [career]
frameworks: [playwright, selenium, cypress]
languages: [markdown]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Automation Tester Resume Optimizer

## When to Use This Skill

Use this skill when the user:
- Is an automation engineer, SDET, or QA engineer with automation work writing a resume
- Mentions: "SDET resume", "automation resume", "Playwright resume", "Selenium resume"
- Is applying to SDET, QA Automation Engineer, Test Automation Engineer, or Quality Platform roles
- Wants their framework work to read as engineering, not test execution

## Core Capabilities

- Position framework ownership as the centerpiece of the resume
- Build a tool matrix that matches recruiter search strings without keyword stuffing
- Quantify automation impact: runtime, flake rate, coverage, release cadence
- Structure GitHub/portfolio proof that screeners actually open
- Calibrate title (SDET vs QA Automation) against the target market
- Handle partial-stack candidates (UI-only, API-only) honestly

## The Automation Resume Hierarchy

Screeners rank automation candidates in this order. Write the resume to climb it:

1. **Built and owned a framework** others use daily
2. **Extended a framework**: new capabilities, integrations, patterns
3. **Wrote tests inside** someone else's framework
4. **Executed and maintained** existing suites

Most resumes bury level-1 evidence under level-3 language. "Wrote automated tests using Playwright" hides "Designed the Playwright framework 8 engineers write tests in today."

## Framework Bullets That Screen You In

| Weak | Strong |
|---|---|
| Automated test cases with Selenium | Built a Java + Selenium framework with Page Object Model and parallel grid execution; 300 tests run in 18 minutes across 4 browsers |
| Used Playwright for E2E testing | Migrated 220 Cypress tests to Playwright with fixtures and storage-state auth; runtime dropped 40%, flake rate from 9% to under 1% |
| Integrated tests with CI | Wired the suite into GitHub Actions with sharding and retry-on-first-failure; PR feedback in 6 minutes, release regression in 25 |
| Maintained automation suite | Ran a flake-hunting rotation: quarantined, root-caused, and fixed 60 flaky tests in one quarter; suite trust restored enough to gate deploys |

The pattern: architecture decision + scale + measured outcome.

## The Tool Matrix

Recruiters search "Playwright TypeScript", "Selenium Java", "API automation REST Assured". Structure skills so the pairs recruiters search actually appear:

```
UI Automation: Playwright (TypeScript), Selenium WebDriver (Java), Cypress
API Automation: REST Assured, Playwright APIRequestContext, Postman + Newman
Framework: Page Object Model, fixtures, data factories, parallel execution
CI/CD: GitHub Actions, Jenkins, Docker, test sharding, reporting (Allure)
Languages: TypeScript, Java, Python, SQL
Practices: contract testing (Pact), visual regression, flake management
```

List only stacks you can defend in a live coding round. The first tool named is the one you get drilled on.

## Metrics That Matter for Automation

- Suite runtime (before -> after your work)
- Flake rate and what you did to move it
- Coverage: percent of regression automated, API endpoints under test
- Feedback speed: time from PR to test verdict
- Release impact: cadence change, manual-regression hours removed
- Adoption: how many engineers write tests in your framework

One adoption metric outweighs three runtime metrics; it proves the framework survived contact with other people.

## GitHub Proof

Screeners open at most one link. Make it a pinned repo with:

- A README that states the stack, the patterns (POM, fixtures, factories), and how to run it in two commands
- A real target app (public demo site or a small app in the repo), not empty example tests
- CI badge with a green run they can click into
- One architecture note: why this structure, what trade-offs

A repo like this converts a "maybe" phone screen into a technical round with a prepared interviewer. Twenty starred tutorials you forked convert nothing.

## Title Calibration

- **SDET**: product companies, coding rounds expected, highest band
- **QA Automation Engineer**: broadest usage, services and product both
- **Test Automation Engineer**: services-market phrasing, common in vendor postings
- **Quality/Test Platform Engineer**: infra-flavored, tooling and CI depth expected

Mirror the posting's title in your headline when your work honestly matches it. If your work is SDET-shaped under a "QA Engineer" title, say so in the summary: "QA Engineer doing SDET-scope work: framework ownership, CI, code review."

## Section Order

```
1. Contact + GitHub + LinkedIn
2. Summary (stack + strongest framework outcome + one adoption/scale number)
3. Skills matrix (grouped pairs as above)
4. Experience (framework-first bullets)
5. Projects (the one good repo, described in two lines)
6. Certifications (if any; they tiebreak only)
7. Education
```

## Summary Formula

`[Role] with [X] years automating [UI/API/mobile] in [primary stack]. Built [framework outcome]. [Scale or adoption metric].`

Example: "SDET with 6 years automating web and API layers in TypeScript. Built the Playwright framework that replaced a 3-day manual regression; 12 engineers ship against it daily."

## For QA and Testing Roles

Two market notes. First, "Playwright" in the skills line currently earns measurably more recruiter searches than Selenium-only profiles; if you have real Playwright work, name it first. Second, AI-assisted testing is entering SDET postings: if you have used AI agents to generate or maintain tests (with your own review process), one honest bullet about it differentiates you today, but be prepared to describe exactly where the agent's output needed correction; interviewers now probe for uncritical AI use.
