import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bug Bash Facilitation Guide',
  description:
    'Facilitate a high-signal bug bash with focused charters, tester roles, triage rules, automation hooks, and follow-up that improves releases.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Bug Bash Facilitation Guide

The best bug bash does not feel like thirty people randomly clicking through a feature while a chat channel fills with duplicate screenshots. It feels like a short, focused investigation where each tester knows their charter, evidence is captured consistently, duplicates are merged quickly, and the team leaves with release decisions instead of a pile of vague tickets.

A bug bash is a facilitated testing event. It is not a substitute for regression automation, accessibility checks, performance testing, or security review. It is a way to bring diverse product knowledge to a risky change at the moment when broad human exploration has leverage. For planning the surrounding release strategy, use the [test planning strategy guide](/blog/test-planning-strategy-guide). For deeper exploratory technique and AI-assisted note taking, see the [exploratory testing with AI agents guide](/blog/exploratory-testing-ai-agents-guide).

## Pick a Release Question

Do not start by inviting everyone to "test the app." Start with the release question. What uncertainty is the bug bash supposed to reduce? Maybe the new onboarding flow crosses billing, identity, and email. Maybe the mobile redesign changed navigation patterns. Maybe a migration changed permissions and the team wants domain experts to try real workflows.

Strong release questions are concrete:

| Weak invitation | Better release question |
|---|---|
| Test checkout | Can a new customer complete checkout with discounts, taxes, and failed payment recovery? |
| Try the dashboard | Do role-specific dashboard widgets show correct data after org switching? |
| Look for bugs in settings | Can admins safely update security settings without locking out normal users? |
| Test the migration | Did migrated projects preserve owners, members, attachments, and audit history? |

The release question determines who participates, what data is needed, which environments are safe, and how bugs are triaged. Without it, a bug bash becomes noisy coverage theater.

## Design Charters Before the Calendar Invite

A charter is a focused mission for a tester or pair. It should name the persona, starting state, workflow, and bug types of interest. Good charters reduce duplicate exploration while preserving freedom to investigate.

| Charter | Persona | Focus |
|---|---|---|
| New buyer checkout recovery | First-time customer | Payment decline, retry, tax recalculation, receipt email |
| Admin permission downgrade | Workspace owner | Role changes, disabled actions, audit entries |
| Mobile interrupted session | Returning user on phone | Backgrounding, lost network, resume state |
| Data migration spot check | Support specialist | Old project data, attachments, comments, ownership |
| Accessibility keyboard pass | Keyboard-only user | Focus order, modal traps, visible labels |

Keep charters short. A tester should be able to read one in under a minute and start. If the charter requires a long briefing, it is probably trying to cover too much.

\`\`\`markdown
## Charter: Admin permission downgrade

Persona: Workspace owner
Environment: staging
Seed account: owner-plus-viewer@example.test
Mission: Change a member from Admin to Viewer, then verify the UI and API prevent admin-only actions.
Watch for:
- Delete and invite actions still visible after downgrade
- API accepting stale admin permissions
- Audit log missing the role change
- Email notification sent to the wrong person
Evidence: screenshot, network request, user id, workspace id, timestamp
\`\`\`

The evidence line matters. It prevents tickets that say "permissions weird after change" with no way to reproduce the state.

## Prepare Data Like a Test Lead

Bug bashes fail when participants spend half the session finding accounts, resetting passwords, or asking which environment to use. Prepare seeded data, access, known limitations, and reset instructions before the event.

Preparation checklist:

| Area | What to prepare | Failure if skipped |
|---|---|---|
| Accounts | Named users for each role and persona | Everyone tests as the same admin |
| Data | Projects, orders, files, invoices, comments | Testers cannot reach boundary cases |
| Environment | Stable staging build and version id | Reports cannot be tied to a release candidate |
| Observability | Logs, request ids, feature flag state | Engineers cannot debug findings |
| Triage board | Labels, template, severity rules | Bugs arrive in inconsistent formats |

Seed data should include realistic edge cases: long names, old records, disabled users, multiple tenants, partial payments, archived objects, and permissions that differ by role. Do not rely on participants to create all setup manually during the session.

## Run the Session With Tight Cadence

A ninety-minute bug bash often works better than a half-day event. People maintain focus, the facilitator can triage in real time, and engineers can start reproducing high-severity issues before memories fade.

A practical cadence:

| Time | Activity | Facilitator job |
|---|---|---|
| 0-10 min | Context, release question, severity rules | Keep briefing short and concrete |
| 10-55 min | Chartered exploration | Watch duplicates, unblock data issues |
| 55-70 min | Triage sweep | Confirm severity and owner |
| 70-85 min | Retest top issues or fill gaps | Redirect testers to uncovered charters |
| 85-90 min | Closeout | State release impact and next actions |

Use one live channel for coordination and one system of record for bugs. Chat is for fast clarification. Tickets are for decisions.

## Bug Reports That Engineers Can Act On

The report template should be strict enough to make bugs reproducible and light enough that people use it. A bug bash is not the time for a twelve-field enterprise defect form. Capture the evidence that matters.

\`\`\`yaml
title: Viewer can still delete project after role downgrade
release_candidate: web-2026.07.10-rc3
charter: Admin permission downgrade
severity: high
environment: staging
account: owner-plus-viewer@example.test
workspace_id: ws_qa_bash_17
steps:
  - Sign in as workspace owner
  - Change user viewer@example.test from Admin to Viewer
  - Sign in as viewer@example.test in a fresh browser context
  - Open Project Settings for Roadmap Migration
  - Click Delete Project
expected: Delete action is hidden or API returns 403
actual: Delete dialog opens and DELETE /api/projects/prj_17 returns 200
evidence:
  screenshot: bugbash/high/viewer-delete-dialog.png
  request_id: req_01JZK4M8TE
  recording: bugbash/high/viewer-delete.webm
\`\`\`

Notice the report includes both UI and API evidence. That helps engineering know whether the issue is only presentation or a real authorization failure.

## Automate the Boring Parts

Automation can support a bug bash without turning it into a scripted regression run. Use scripts to create tickets, attach labels, collect environment metadata, and prevent missing fields. The example below uses Octokit to create a GitHub issue from a normalized bug report.

\`\`\`typescript
import { Octokit } from '@octokit/rest';
import fs from 'node:fs/promises';

type BugBashReport = {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  release_candidate: string;
  charter: string;
  steps: string[];
  expected: string;
  actual: string;
  evidence: Record<string, string>;
};

const report: BugBashReport = JSON.parse(
  await fs.readFile('bugbash/reports/viewer-delete-project.json', 'utf8')
);

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

await octokit.issues.create({
  owner: 'acme',
  repo: 'saas-web',
  title: report.title,
  labels: ['bug-bash', 'severity:' + report.severity, 'rc:' + report.release_candidate],
  body: [
    'Charter: ' + report.charter,
    '',
    'Steps:',
    ...report.steps.map((step, index) => String(index + 1) + '. ' + step),
    '',
    'Expected: ' + report.expected,
    'Actual: ' + report.actual,
    '',
    'Evidence:',
    ...Object.entries(report.evidence).map(([key, value]) => '- ' + key + ': ' + value),
  ].join('\\n'),
});
\`\`\`

Small automation like this keeps reports consistent and gives the facilitator a real-time view of severity distribution. It also makes follow-up easier because the issue tracker is already populated before the closeout.

## Triage While the Room Is Still Warm

Triage should happen during the bash, not two days later. The facilitator or triage captain should merge duplicates, reject non-bugs politely, assign severity, and flag release blockers while testers are still available to clarify.

Severity rules should be visible:

| Severity | Bug bash meaning | Release implication |
|---|---|---|
| Critical | Data loss, security breach, payment failure, complete workflow block | Blocks release |
| High | Major role, tenant, checkout, or migration failure with workaround unclear | Usually blocks release |
| Medium | Important workflow issue with workaround | Fix or explicitly accept |
| Low | Cosmetic, copy, minor usability issue | Backlog unless clustered |

Do not let severity become a debate about effort. A one-line authorization bug can be critical. A complex animation bug can be low. Severity is about user and business impact.

## Follow-Up Is the Product

The value of a bug bash is not the event. It is what changes after the event. Within twenty-four hours, publish a summary: number of findings, blockers, duplicate count, charters covered, charters missed, release decision, owners, and retest plan.

Useful follow-up table:

| Finding type | Follow-up action |
|---|---|
| Release blocker | Owner, fix branch, retest charter, decision deadline |
| Duplicate cluster | Root-cause investigation, not five independent fixes |
| Missed automated regression | Add or update automated test after fix |
| Environment issue | Improve seed data or access before next bash |
| Uncovered charter | Schedule targeted exploratory session |

The automation hook matters here too. Every high or critical bug fixed from a bash should produce a regression test or a documented reason why automation is not appropriate. Otherwise the team pays for the same discovery again.

## Remote and Hybrid Facilitation

Remote bug bashes can work well if the facilitator is stricter about structure. Put charters, accounts, links, and severity rules in one document. Use breakout rooms for pairs. Ask testers to post ticket links, not long chat descriptions. Keep a visible triage board sorted by severity.

For hybrid events, avoid letting the physical room become the real conversation while remote participants lag behind. The facilitator should repeat decisions in the shared channel and keep the issue tracker as the source of truth.

## Choosing Participants by Knowledge Gap

Participant selection should follow the release question. If the risk is migration correctness, invite support or customer success people who know old customer data patterns. If the risk is accessibility, include someone who can test keyboard and assistive technology behavior. If the risk is billing, include a finance or operations stakeholder who understands invoices, taxes, and refunds.

Avoid filling the room with only engineers who built the feature. They know the intended path too well. Also avoid inviting a large unfocused audience because it feels inclusive. A bug bash asks for concentration. People without a charter often duplicate shallow findings or drift into opinions that belong in product review rather than defect triage.

Give each participant a reason to be there. A designer can look for confusing state transitions. A support specialist can test real complaint patterns. A developer can inspect network and logs while reproducing. A QA engineer can push boundaries and document evidence. When roles are clear, the facilitator spends less time redirecting and more time extracting signal.

Rotate participants across bashes. The same expert group will develop blind spots over time. Bringing in someone from onboarding, security, documentation, or sales engineering can reveal workflows the core squad no longer sees.

Set expectations with managers too. A bug bash participant needs protected time, not a calendar invite they attend while answering messages. The event is short, but the value comes from focused attention. Half-present testers create low-quality reports and miss the subtle failures the session was meant to find.

For critical releases, assign backup participants. If the only billing expert is pulled into an incident, the billing charter should not disappear. A facilitator who plans coverage like this treats the bash as release work, not a social testing hour.

That seriousness also makes participants more willing to prepare before joining.

Prepared testers find deeper bugs in less time.

They also write clearer evidence.

That evidence speeds fixes.

## Using AI Agents Without Losing Human Judgment

AI agents can help a bug bash, but they should support facilitation rather than replace testers. Useful jobs include summarizing duplicate reports, turning notes into cleaner reproduction steps, generating edge-case ideas from a charter, or checking whether a new bug resembles an existing ticket. The facilitator remains responsible for severity and release impact.

Before the session, an agent can expand each charter with prompts for testers: boundary values, role transitions, interruption ideas, localization checks, and data combinations. Treat those as suggestions, not a script. A human tester should still follow interesting behavior when the product surprises them.

During the session, an agent can watch the issue feed and flag likely duplicates based on title, route, account, error message, and screenshot text. That saves the triage captain time, but duplicates should still be confirmed by a person. Two tickets that look similar may have different root causes, especially around permissions and tenant context.

After the session, AI is useful for summarizing findings into clusters: migration data issues, role enforcement issues, mobile layout issues, copy confusion, and environment setup problems. Those clusters help the team identify systemic work. A dozen low-severity copy bugs might point to missing content review. Three permission bugs in different screens might point to a shared authorization helper.

Be careful with sensitive evidence. Do not paste real customer data, secrets, or private logs into an external AI tool. Use approved internal tooling, redact evidence, or keep summarization local. Bug bash artifacts can contain screenshots, account ids, emails, and request details that deserve the same handling as normal defect evidence.

The best use of AI is follow-through. After a high-severity bug is fixed, an agent can draft a regression test skeleton from the reproduction steps, but an engineer or SDET should adapt it to the right layer. Some bash bugs belong in API tests, some in UI tests, some in migration checks, and some in monitoring. The tool can accelerate the draft. The testing strategy still needs human judgment.

## Measuring Whether the Bash Was Worth It

Count findings, but do not stop there. A useful bug bash metric set separates noise from signal. Track confirmed defects, duplicate rate, severity distribution, charters covered, blockers found, automation follow-ups created, and time from report to triage decision. These numbers tell you whether facilitation improved the release or merely created activity.

High duplicate rate can mean the bug is obvious and severe, or it can mean charters overlapped too much. Low finding count can mean the feature is healthy, or it can mean test data prevented meaningful exploration. Interpret metrics with session notes.

The most important measure is release impact. Did the bash block a risky release, confirm readiness, reveal a missing automated check, or improve support documentation? If the answer is unclear, the next bash needs a sharper release question.

## Frequently Asked Questions

### How many people should join a bug bash?

Enough to cover the charters without creating duplicate noise. Six to twelve focused participants often beats thirty unfocused participants. Add product, support, design, engineering, QA, and domain experts only when each has a charter.

### Should developers test their own feature during the bash?

Yes, but not only their own feature. Developers are excellent at spotting technical edge cases, logs, and integration failures. Pair them with product or support testers to avoid everyone following the implementation's happy path.

### What should the facilitator do when duplicates flood in?

Create a canonical ticket, link duplicates immediately, and redirect testers to uncovered charters. Duplicate clusters are still useful because they show severity or discoverability, but they should not consume the whole session.

### Is a bug bash useful if we already have strong automation?

Yes, when the release has workflow, usability, data migration, permission, or cross-functional risk. Automation checks known expectations. A bug bash explores whether humans can still find surprising failures in realistic use.

### When should a bug found in a bash become an automated test?

When the bug represents a durable product rule, a release blocker, a permission boundary, a data migration guarantee, or a workflow that is likely to regress. Cosmetic one-offs may not deserve automation, but high-impact failures usually do.
`,
};
