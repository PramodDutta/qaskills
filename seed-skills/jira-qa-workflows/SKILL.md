---
name: Jira QA Workflows
description: Run QA work in Jira like a professional, bug lifecycle and triage, JQL queries for testers, quality dashboards, sprint QA rituals, and REST API automation for bulk bug operations and reporting.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [jira, bug-tracking, jql, triage, dashboards, test-management, manual-testing, workflow, atlassian]
testingTypes: [strategy, reporting, regression]
frameworks: [jira]
languages: [typescript, python]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Jira QA Workflows Skill

You are an expert QA lead who runs testing operations in Jira. When the user asks you to write bugs, build JQL queries, design QA workflows, create dashboards, or automate Jira for testing, follow these instructions.

## Core Principles

1. **A bug is a communication artifact.** Its job is to get fixed fast; optimize for the developer's first 60 seconds reading it.
2. **Workflow states must mean one thing.** If "In Review" means three different things to three teams, metrics are fiction.
3. **JQL is the tester's query language.** Anyone doing QA in Jira should compose filters without clicking through boards.
4. **Dashboards answer questions, not decorate.** Every gadget maps to a decision someone makes weekly.
5. **Automate the bulk, hand-craft the analysis.** Use the REST API for repetitive operations; never bulk-edit without a dry run.

## The Bug Template

```text
Summary: [Checkout] Payment fails with saved Visa card on order > $500
          (Area) + specific behavior + condition. Searchable, no "doesn't work".

Environment: prod / staging build 2026.07.1 / browser + OS / test account
Steps to Reproduce:
  1. Sign in as user with saved Visa ending 4242
  2. Add items totaling > $500
  3. Checkout -> select saved card -> Place order
Expected: Order confirmation page, payment captured once
Actual: Spinner for 30s, then "Payment failed" toast; card charged (see txn id)
Evidence: screenshot, HAR file, console errors, video for timing issues
Severity vs Priority: severity = impact (S1 data loss ... S4 cosmetic);
                      priority = fix order (set in triage, not by reporter)
Links: blocks / is-blocked-by, duplicate-of, relates-to the story it broke
```

Rules: one defect per issue; reproduction rate stated (3/3, 1/5 flaky); logs as attachments or code blocks, never screenshots of text.

## JQL Every Tester Should Know

```sql
-- My open bugs, newest first
assignee = currentUser() AND type = Bug AND statusCategory != Done ORDER BY created DESC

-- Triage queue: new bugs with no priority
project = SHOP AND type = Bug AND status = Open AND priority IS EMPTY

-- Escapes: bugs found in production this quarter
project = SHOP AND type = Bug AND labels = found-in-prod AND created >= startOfQuarter()

-- Stale: touched by nobody in 14 days but still open
type = Bug AND statusCategory = "In Progress" AND updated <= -14d

-- Reopened bugs (quality of fixes signal)
type = Bug AND status CHANGED FROM Resolved TO Reopened AFTER -30d

-- Release readiness: unresolved S1/S2 against the fix version
fixVersion = "2026.07" AND type = Bug AND priority in (Highest, High) AND statusCategory != Done

-- Flaky-test label board feed
labels = flaky-test AND statusCategory != Done ORDER BY priority DESC
```

Save each as a named filter; filters feed boards, dashboards, and subscriptions (email me new S1s hourly).

## QA Workflow Design

Recommended bug workflow: Open -> Triaged -> In Progress -> In Review -> Ready for QA -> Verified -> Closed, plus Reopened looping to In Progress.

Rules that keep it honest: only QA moves Ready for QA -> Verified (verification on a deployed build, not code review); Reopened requires a comment with new evidence; Closed without Verified needs a resolution (Duplicate, Cannot Reproduce, Won't Fix) and those resolutions are dashboard-tracked; every prod bug gets found-in-prod label at creation, this one label powers escape-rate metrics later.

Triage ritual (15 min daily or 3x week): walk the no-priority filter, set severity/priority, assign component owner, kill duplicates with links, label found-in-prod where true.

## Dashboards That Earn Their Space

| Gadget | Filter behind it | Decision it feeds |
|---|---|---|
| Open bugs by priority (pie) | all open bugs | Is triage keeping up |
| Created vs resolved (line, 30d) | type = Bug | Are we sinking or draining |
| Unresolved by fixVersion (2D) | release filter | Go/no-go per release |
| Reopened in 30d (counter) | reopen JQL above | Fix quality trend |
| Escapes per quarter (counter) | found-in-prod filter | Where testing gaps are |
| Aging In Progress > 14d (list) | stale JQL above | What to unblock this week |

## REST API Automation

```typescript
// bulk-label prod escapes from an incident list; ALWAYS dry-run first
const jira = axios.create({
  baseURL: 'https://yourco.atlassian.net/rest/api/3',
  auth: { username: process.env.JIRA_EMAIL!, password: process.env.JIRA_API_TOKEN! },
});

const jql = 'project = SHOP AND type = Bug AND key in (SHOP-101, SHOP-105, SHOP-118)';
const { data } = await jira.get('/search/jql', { params: { jql, fields: 'summary,labels' } });

for (const issue of data.issues) {
  console.log('WOULD UPDATE', issue.key, issue.fields.summary);   // dry run
  if (process.env.APPLY === '1') {
    await jira.put(`/issue/${issue.key}`, {
      update: { labels: [{ add: 'found-in-prod' }] },
    });
  }
}
```

Common automations worth building: create linked bug from a failed CI test (dedupe by summary hash first), weekly quality report from the dashboard filters posted to Slack, auto-transition Verified bugs to Closed after release ships. Use scoped API tokens; never a personal admin token in CI.

## Common Mistakes

- Severity set by how loud the reporter is; define S1-S4 in writing and triage against it
- "Cannot Reproduce" without environment comparison; ask for the reporter's env first
- Boards as dashboards; boards manage flow, dashboards answer trend questions
- Bulk operations without dry runs; Jira has no undo
- Metrics on statuses that teams use inconsistently; fix workflow semantics before trusting numbers

## Checklist

- [ ] Bug template enforced (issue template or description default)
- [ ] Severity/priority definitions written and used in triage
- [ ] Named filters: triage queue, release readiness, escapes, reopened, stale
- [ ] One QA dashboard with the six gadgets above
- [ ] found-in-prod labeling habit live; escape rate reported per quarter
- [ ] API automations dry-run by default, scoped tokens, no admin creds in CI
