---
name: Automation Interview Prep
description: Prepare for SDET and automation interviews round by round, covering coding screens, framework design, API testing tasks, scenario questions, and STAR stories built from real testing work.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [interview, sdet, career, preparation, star-method]
testingTypes: [career]
frameworks: [playwright, selenium]
languages: [markdown]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Automation Interview Prep

## When to Use This Skill

Use this skill when the user:
- Has an SDET, QA Automation, or Test Engineer interview scheduled
- Mentions: "SDET interview", "automation interview", "QA interview questions", "framework design round"
- Wants STAR stories built from their testing experience
- Needs a preparation plan matched to a specific company's loop

## Core Capabilities

- Map the standard SDET loop and prepare each round separately
- Generate STAR stories from defect catches, flake hunts, and framework work
- Drill framework-design narration with trade-off vocabulary
- Prepare API-testing tasks and test-the-function exercises
- Build answers for the scenario classics without sounding scripted
- Produce a question list to ask interviewers that signals seniority

## The Standard SDET Loop

| Round | What actually happens | Preparation focus |
|---|---|---|
| Recruiter screen | Stack verification, salary bands, notice period | 90-second experience summary, exact tool years |
| Coding screen | Easy/medium algorithms or string/array work in your language | 20-30 problems, narrate while coding |
| Framework design | "Design test automation for X" on a whiteboard/doc | Architecture narration with trade-offs |
| API/practical | Test this endpoint, review this test code, find the bugs | Postman/code fluency, boundary thinking out loud |
| Scenario | "How would you test a login page / payment flow / search" | Structured decomposition, not feature listing |
| Behavioral | STAR stories, conflict, quality advocacy | 6 prepared stories with numbers |

## Coding Screen Reality

SDET coding bars sit below SWE bars at most companies but are rising. Cover:

- Strings and arrays: reversal, deduplication, frequency counts, two pointers
- Maps and sets: first non-repeating character, anagram grouping
- Simple recursion and iteration conversions
- Language fluency: collections, string methods, error handling in YOUR primary language

Narrate constantly. SDET interviewers weight communication above optimal complexity; a clean O(n log n) explained well beats a silent O(n).

## Framework Design Round

The question is some form of: "You join us; there is no automation. Design it."

Structure the answer in this order, and name a trade-off at every step:

1. **What to automate first**: risk-ranked smoke path, not everything ("I start with the 10 flows that block release, because ROI concentrates there")
2. **Layer split**: API tests for logic breadth, UI for critical journeys ("pushing checks down the pyramid keeps runtime sane")
3. **Structure**: Page objects/fixtures/factories, test data strategy, config per environment
4. **Execution**: parallelization, CI trigger points (PR vs nightly), sharding
5. **Trust**: retry policy, flake quarantine, reporting humans read
6. **Adoption**: code review for tests, docs, who writes tests besides you

Interviewers pass candidates who justify choices, not candidates who name the most tools. "Playwright because trace files cut my debugging time in half" beats a feature list.

## The Scenario Classics

"How would you test a login page?" is a filter for structured thinking:

1. Clarify scope first (which auth methods? SSO? rate limiting? mobile?)
2. Functional: valid/invalid matrix, case sensitivity, whitespace, unicode
3. Boundaries: field lengths, empty, paste behavior
4. Security-adjacent: lockout policy, error-message information leakage, password masking (note: deep pentest is its own discipline)
5. Non-functional: latency, concurrent sessions, accessibility of the form
6. State: remember-me, expired sessions, back-button after logout

Announcing the categories before diving in is the pass signal.

## STAR Story Bank

Build six stories minimum, each with a number in the Result:

| Story slot | Source material |
|---|---|
| The big catch | A defect you found that would have cost real money/users |
| The flake hunt | A flaky suite you stabilized, with the root causes |
| The framework decision | A tool/architecture choice you made and defended |
| The conflict | Developer pushed back on a bug; how it resolved |
| The miss | A defect that escaped YOU, and what changed after |
| The advocacy | You changed a process (gating, coverage rule, review) |

The miss story matters most. Interviewers distrust candidates with no failure story; the recovery is the demonstration of seniority.

## Questions That Signal Seniority

Ask two or three of:

- "What percent of regression is automated today, and do engineers trust it enough to gate merges?"
- "Who owns test infrastructure when it breaks at 9 AM on release day?"
- "What is the current flake rate, and is anyone's job to reduce it?"
- "How is AI changing your testing work this year?"

Each one signals you have lived the failure modes the team is hiring against.

## For QA and Testing Roles

Round-zero preparation: re-read your own resume as the interviewer will. Every tool listed is fair game for "walk me through how you used X"; every metric will get "how was that measured?" Practice defending your top three claims out loud once before the loop. Candidates fail more interviews on their own unprepared resume claims than on algorithm difficulty.
