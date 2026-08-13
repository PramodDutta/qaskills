---
name: QA Project Portfolio Builder
description: Turn test suites, frameworks, and bug hunts into a portfolio recruiters actually open, with case studies, linkable repos, live demo suites, and writeups structured like incident reports.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [portfolio, career, qa-projects, github, case-study]
testingTypes: [career]
frameworks: [playwright]
languages: [markdown]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# QA Project Portfolio Builder

## When to Use This Skill

Use this skill when the user:
- Wants a QA portfolio for job applications or freelancing
- Mentions: "QA portfolio", "testing projects for resume", "SDET portfolio", "what projects should I build"
- Has work experience but nothing public to show
- Is a career changer needing checkable proof of testing skill

## Core Capabilities

- Select portfolio projects that map to target roles
- Structure each project as a case study, not a code dump
- Rebuild proprietary work as public equivalents without violating employers' confidentiality
- Write READMEs that convert screeners into interviewers
- Sequence a from-zero portfolio for career changers
- Wire live CI so the portfolio proves itself

## Why Most QA Portfolios Fail

Screeners open one link for roughly thirty seconds. They find: a fork of a tutorial repo, ten empty example tests against a todo app, no README, no CI, last commit eight months ago. That portfolio subtracts credibility.

A working portfolio is three artifacts, each complete, each answering a hiring question:

| Artifact | Hiring question it answers |
|---|---|
| A framework repo with CI | Can they build automation others could use? |
| A bug-hunt writeup | Can they actually find problems? |
| A test-strategy document | Can they think beyond individual tests? |

Three complete artifacts beat ten fragments. Depth reads as competence; breadth reads as tutorials.

## Artifact 1: The Framework Repo

Target a real public application (a demo e-commerce site, a public API), then build:

```
repo/
  README.md            <- the sales page (see below)
  playwright.config.ts <- environments, projects, retries explained in comments
  tests/
    e2e/               <- 10-15 tests on the critical paths, POM structure
    api/               <- API layer tests, shared auth/data setup
  pages/               <- page objects with locator strategy visible
  fixtures/            <- auth state, test data factories
  .github/workflows/   <- CI running on push, badge green
```

README structure that converts:

1. One paragraph: what is tested and why these flows
2. Two-command quickstart (`npm ci && npx playwright test`)
3. Architecture: why POM here, why fixtures, why this data strategy
4. One honest trade-offs section ("no visual tests because X; next I would add Y")
5. CI badge linking to a green run

The trade-offs section does the most work; it reads as engineering judgment, which is the thing being hired.

## Artifact 2: The Bug-Hunt Writeup

Pick a real public product, spend two focused hours, document 3-5 genuine findings:

- Steps to reproduce, expected vs actual, environment
- Severity reasoning (why this matters to a user or the business)
- One screenshot or short clip each
- A closing note on method: which charters/heuristics you ran

Publish as a blog post, a repo markdown, or a PDF. Rules: no security probing beyond normal usage, no public shaming (redact or notify where appropriate), no fabricated findings. One real payment-flow papercut outweighs ten cosmetic nits.

## Artifact 3: The Test Strategy Document

For an imagined (or rebuilt) product, write 2-3 pages: scope and risks, what gets automated at which layer, what stays manual/exploratory, environments and data, entry/exit criteria, flake policy, tooling with justification. This is the document that separates senior applications; almost no candidate has one.

## Rebuilding Proprietary Work Legally

You cannot publish your employer's suite. You can rebuild the PATTERN:

1. Identify what made the work valuable (a data-factory design, a parallel auth strategy, a contract-testing setup)
2. Re-implement that pattern against a public target with fresh code
3. In the case study, describe the original context in de-identified terms ("a payments platform processing X-scale transactions")

Never copy code, config, or data from employer systems. The pattern is yours; the artifacts are theirs.

## Career-Changer Sequence

From zero, in order, each 1-2 weeks part-time:

1. Bug-hunt writeup (needs no code; proves testing instinct immediately)
2. API test suite with Postman/Newman or Playwright API on a public API, CI attached
3. Small E2E suite (10 tests, POM) on a demo store
4. The strategy doc tying all three together

Ship each fully before starting the next; an unfinished portfolio project is invisible, a finished small one is proof.

## Presenting the Portfolio

- Resume: one Projects section line per artifact, each with outcome ("15-test Playwright suite, CI, sub-8-minute runs")
- LinkedIn: pin the framework repo and the writeup as featured
- Applications: lead with the single strongest artifact for that posting (API-heavy role gets the API suite)
- Interviews: offer to screen-share the repo; walking an interviewer through your own CI run is the strongest ten minutes available to a candidate

## For QA and Testing Roles

Recency is part of the proof: a green CI badge dated this week says maintained; the same badge dated last year says abandoned. Schedule the CI weekly (a cron trigger costs nothing) so the portfolio keeps proving itself while you job-hunt. And keep exactly one AI note honest: if agents helped generate tests, say so in the README and describe your review process; hiring teams now check for uncritically pasted AI output, and disclosed-plus-reviewed reads as modern practice.
