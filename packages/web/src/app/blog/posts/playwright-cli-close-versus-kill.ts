import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright CLI Close Versus Kill',
  description:
    'playwright cli close versus kill: choose close, close-all, or kill-all without orphaned sessions. Repo evidence maps checks and CI-safe steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Troubleshooting',
  primaryKeyword: 'playwright cli close versus kill',
  keywords: [
    'playwright cli close versus kill',
    'playwright cli close all',
    'playwright cli kill all',
    'stop playwright cli sessions',
    'playwright zombie browser process',
    'close browser daemon terminal',
    'playwright cli cleanup commands',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-cli-sessions-dashboard-attach-guide-2026',
    'playwright-target-page-context-closed-fix',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/SKILL.md',
    'seed-skills/playwright-cli/references/session-management.md',
  ],
  content: `Playwright CLI close versus kill is a choice about scope and force. Use \`close\` for the current named browser, \`close-all\` for a clean end to all normal sessions, and \`kill-all\` only when a browser process will not stop. Save failure proof first, list sessions afterward, and keep profile deletion as a separate step.

## What Does Playwright CLI Close Versus Kill Control?

Playwright CLI close versus kill controls how an active CLI browser or its backing process ends. The safe choice depends on whether one session, every session, or a stuck process owns the fault.

The basic \`close\` command acts on the session selected by \`-s=name\` or the default session. It ends that browser without asking the CLI to stop every other agent's work.

\`close-all\` asks the CLI to close all browsers through its normal session path. It is the right final step after a planned local run when all open sessions belong to that task.

\`kill-all\` is a force tool for browser processes that ignore normal cleanup. It can end useful sessions at once, so it should come after proof is saved and normal close has failed.

The local contract in \`seed-skills/playwright-cli/SKILL.md\` says to close the browser when the task ends. It also gives named sessions as the way to keep work from different tasks apart.

\`seed-skills/playwright-cli/references/session-management.md\` expands that rule with list, close, close-all, and kill-all flows. The file treats process cleanup and stored session data as related but different jobs.

This choice does not fix a page crash, bad locator, or failed product check. The [Playwright CLI guide](/blog/playwright-cli-complete-guide-2026) covers browser work, while cleanup starts only after the needed result and proof have been saved.

The command also does not remove all profile data by default. A named \`delete-data\` call is the clear path when the test must erase cookies and other saved state.

Use the [QA skills directory](/skills) for full test plans, but keep the cleanup rule easy to state. Normal work gets a normal close, and force is reserved for a process that will not leave.

A reviewable playwright cli close versus kill result contains the session list before and after cleanup, command exit status, and artifact paths. That record proves the chosen scope instead of merely showing that one shell command returned.

## How Does Playwright CLI Close All Work?

Playwright CLI close all sends a normal cleanup request for each active CLI browser session. It is broader than named \`close\`, yet less forceful than ending browser processes without their usual shutdown path.

The official [coding agent CLI guide](https://playwright.dev/docs/getting-started-cli) lists \`playwright-cli list\`, \`close-all\`, \`kill-all\`, and named \`delete-data\` as separate session tools. That split is the core behavior a cleanup test should prove.

Start by listing sessions and saving the output. Session names make scope visible and can show when another task still owns a browser that should not be closed.

For one task, pass the same \`-s=name\` value to all work and use named \`close\` at the end. This is safer than \`close-all\` when several agents share the same machine.

For a fully owned worker, \`close-all\` can be the normal teardown step. The command should return, and a new list should show no active browser from that worker.

Normal close gives the browser time to end pages, contexts, pipes, and its stored in-memory session. A process may still take a short, measured time to vanish after the command returns.

Set a small wait loop around the post-close list rather than one fixed sleep. Poll until the session is gone or a clear deadline ends, then save each observed state.

Do not run \`delete-data\` just to make the list empty. Data cleanup changes later login state and can erase proof that a session used the wrong account or profile.

The [sessions and dashboard guide](/blog/playwright-cli-sessions-dashboard-attach-guide-2026) helps a person see which session is still live. The automated gate should still use list output and process facts for its final check.

In the playwright cli close versus kill flow, \`close-all\` is a success only when all owned sessions end without force. A zero exit with one listed browser still needs a fault result.

## Playwright CLI Kill All: Repository Evidence

Playwright CLI kill all is named as the force step in both repository files. \`seed-skills/playwright-cli/SKILL.md\` places it after the normal session commands rather than presenting it as routine teardown.

The session reference gives a clear escalation path: close one named session, close all sessions when the whole workspace is done, and use kill-all for a stuck browser or daemon. Follow that order in tests and docs.

The public [Playwright CLI repository](https://github.com/microsoft/playwright-cli) uses the same words for these commands. It says close-all closes all browsers and kill-all forcefully kills all browser processes.

The upstream [CLI skill file](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md) also keeps list, close-all, and forceful kill as separate actions. This source supports the local copy without adding a hidden fourth cleanup mode.

Force may skip normal browser work and can cut off screenshots, traces, downloads, or logs still being written. Save and flush test proof before using it, even when the screen looks frozen.

Kill can also affect sessions owned by another task in the same CLI process group. A shared workstation needs an owner check and a warning before the broad command runs.

After kill-all, list sessions again and inspect process state. The list proves the CLI view, while the process check catches a child that stayed alive after its session record vanished.

Do not call a forced exit a product failure without more facts. The root cause may be browser code, the CLI daemon, a blocked pipe, a lost display, or a test that left an open page.

The [target page closed guide](/blog/playwright-target-page-context-closed-fix) helps sort early page closure from teardown. Keep that diagnosis apart from the cleanup command that removes the final process.

A playwright cli close versus kill report should mark whether force was needed. Over time, that field can reveal a cleanup leak even when every test assertion passed.

## When Should QA Teams Use Stop Playwright CLI Sessions?

Stop playwright cli sessions after the task has saved all needed proof and no later step needs the same browser state. End the smallest owned scope first so other work can continue.

Use named close after one agent finishes a session but other named sessions must remain. This is the normal choice on a shared developer host or a long-running test lab.

Use close-all when the current worker owns all sessions and the whole job is complete. It is also useful in a final cleanup hook after each named session had a fair chance to close.

Use kill-all only after normal close reaches a deadline or the CLI cannot answer. Record the stuck list, command output, process details, and artifacts before the force step.

Use delete-data when stored profile state must be removed for privacy or test reset. It should be a named, reviewed step because ending a browser and erasing its data prove different things.

Use a runner fixture instead when Playwright Test owns the browser. Mixing a standalone CLI cleanup command into a test runner process can hide which tool created and owns the page.

Use a process manager for a long-lived service that starts browsers outside the CLI. The CLI should not be asked to kill processes that are not part of its session contract.

Keep one control case with two named sessions. Close the first, prove the second still works, then close the second and show that the final list is empty.

The [Playwright practices guide](/blog/playwright-testing-best-practices-2026) supports clean test ownership. Clear ownership makes cleanup faults much easier to assign to product, test, tool, or host.

Playwright CLI close versus kill is a poor substitute for job isolation. When hostile or unrelated work shares one account, use separate workers rather than trusting a broad kill command to respect task lines.

## Playwright Zombie Browser Process: Failure Modes and Diagnostics

A playwright zombie browser process is any CLI-owned browser child that remains after its session should have ended. Prove it with session and process facts instead of labeling every open browser as a zombie.

The first test defect is using \`close\` without the right session name. The command may close the default browser while the named fault session stays live.

The next defect is running \`close-all\` before traces or screenshots finish. Cleanup may remove the very page and stream needed to explain why the test failed.

A real tool fault can leave a child process after close-all returns. Save the CLI list, process identifier, parent identifier, elapsed time, and final exit state for a useful issue.

The process may also be alive by design because another session shares its daemon. Check the session map before deciding that one common parent should have exited.

Host faults include a frozen browser, blocked file system, lost display server, or resource limit. These cases can make a correct close request wait without showing a product bug.

Use a bounded poll with a clear deadline and no unending retry. At the deadline, attach facts and move to kill-all so CI does not hang forever.

If force also fails, let the job fail and ask the host process manager to clean the worker. Repeating kill-all without a new fact gives no better proof.

Process identity needs care when a daemon starts more than one browser child. Capture the parent chain, start time, owner, and command before close, then compare the same fields after the deadline. A reused process ID without its start time can point at a new and unrelated process.

The diagnostic should also mark each shutdown phase with a monotonic clock. Wall time is useful in a report, but it can shift during a job and distort the measured delay. Phase timing separates a slow normal close from a force command that returned while termination was still in progress.

Operating systems expose process ancestry and termination state through different tools and permission levels. Keep the required contract platform neutral, then store the native diagnostic command and its output as supplemental proof. A container namespace can also hide host descendants, so the worker manager may need to confirm final cleanup outside the job.

The [page and context closed guide](/blog/playwright-target-page-context-closed-fix) is useful when teardown began too soon. A page that was closed by test code is not the same fault as a browser that survives every cleanup step.

In a playwright cli close versus kill test, classify the owner before the result. Product code, test teardown, CLI session code, and host limits need different fixes.

## Close Browser Daemon Terminal: Evidence and CI Assertions

Close browser daemon terminal checks need a before list, command transcript, after list, exit status, and retained test proof. Add process details only when normal session facts show that a browser stayed behind.

Do not parse a human dashboard for CI status. The list command is a smaller and more stable source for session names and current state.

The first code block uses named close before any broad action. It keeps another session live as a control and makes the expected scope plain.

\`\`\`bash
set -eu

playwright-cli -s=checkout open https://qaskills.sh
playwright-cli -s=control open https://qaskills.sh/blog
playwright-cli list > sessions-before.txt

playwright-cli -s=checkout screenshot --filename=checkout-final.png
playwright-cli -s=checkout close
playwright-cli list > sessions-after-named-close.txt

grep -q 'control' sessions-after-named-close.txt
if grep -q 'checkout' sessions-after-named-close.txt; then
  exit 1
fi
\`\`\`

The success check proves both absence and survival. If it checked only that checkout vanished, an accidental close-all could pass while destroying the control session.

The second block records graceful cleanup before it allows force. It follows the escalation described by \`seed-skills/playwright-cli/references/session-management.md\`.

\`\`\`bash
set +e
playwright-cli close-all > close-all.txt 2>&1
close_status=$?
playwright-cli list > sessions-after-close-all.txt 2>&1
set -e

if test -s sessions-after-close-all.txt; then
  cp sessions-after-close-all.txt stuck-sessions.txt
  playwright-cli kill-all > kill-all.txt 2>&1
  playwright-cli list > sessions-after-kill-all.txt
  test ! -s sessions-after-kill-all.txt
fi

printf 'close_status=%s\n' "$close_status" > cleanup-status.txt
\`\`\`

Adjust the empty-list check to the actual stable output format used by the installed version. Pin or record that version so text changes do not look like browser leaks.

Attach the files even on a clean result, but bound logs and remove URLs with secrets. A simple empty after-list plus zero status is useful proof of normal cleanup.

The [Playwright CLI skill route](/skills/Pramod/playwright-cli) gives agents the command set used here. CI still needs its own exact checks because a skill instruction is not a runtime result.

Playwright CLI close versus kill passes this gate when normal cleanup works or a documented force branch removes a proven stuck process. A job should stay red when force was unexpected, even if the worker is clean at the end.

## Playwright CLI Cleanup Commands Comparison Table

Playwright cli cleanup commands differ by target, data effect, and force. The table keeps those choices visible before a teardown hook turns them into one vague cleanup action.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| \`close\` | End the selected named or default browser | Before and after list, name, status, and artifacts | Wrong session name leaves the fault browser live |
| \`close-all\` | End every session on a fully owned worker | All names before, empty owned set after, and status | Broad scope closes another task or leaves a child |
| \`kill-all\` | Force a stuck CLI browser process to end | Failed close proof, process facts, kill result, and final list | Useful state is lost or unrelated work is stopped |
| \`delete-data\` | Remove saved profile data after process cleanup | Named session, policy reason, result, and path scope | Login state or failure proof is erased too soon |

Named close has the smallest blast area and should be the usual first choice. It also gives the cleanest control test because another named session can remain live.

Close-all is safe only when ownership is clear. A CI worker made for one job is a better setting than a shared desktop with active browser agents.

Kill-all is an escape path, not a faster form of close-all. Track every use so repeated force does not hide a tool or teardown leak.

Delete-data belongs to privacy and reset policy. Keep it after proof retention and do not assume normal close must erase a profile.

Browse the [QA skills directory](/skills) for related browser checks, then keep this matrix near teardown code. The playwright cli close versus kill choice should be clear during review, not inferred after a lost trace.

## How Do You Implement Playwright CLI Close Versus Kill?

Implement playwright cli close versus kill with named ownership, an evidence step, a normal close deadline, and one force branch. The procedure should leave the worker clean without hiding why force was needed.

1. Read \`seed-skills/playwright-cli/SKILL.md\`, choose a unique session name, and record the CLI version, worker identity, and expected session owner.
2. Open the test page in that named session, run the user flow, and save screenshots, logs, traces, and command status before any cleanup begins.
3. List all sessions, close the owned session, and poll the list until its name is absent or the measured normal-close deadline ends.
4. Use close-all only when the worker owns every remaining session, then attach the before list, after list, output, exit status, and elapsed time.
5. If a proven CLI browser remains, save process facts, run kill-all once, and require both an empty owned session set and no live child process.
6. Run the same flow in CI, verify the control session rule, apply any separate delete-data policy, and publish whether force was required.

Test the green path with one named session and no force. Its cleanup record should be short, and every planned artifact should exist before the browser ends.

Test the scope path with two sessions and close only one. The second must still answer a snapshot or URL check after the first has gone.

Test the stuck path with a controlled fake or child wrapper rather than a random real hang. The harness should hit its deadline, retain facts, use force, and keep the job status red.

Run the flow on each CI operating system that owns browser workers. Process names and signals can vary, but the required final state remains no owned session and no live owned child.

Use the [sessions dashboard article](/blog/playwright-cli-sessions-dashboard-attach-guide-2026) for local review and the [CLI guide](/blog/playwright-cli-complete-guide-2026) for setup. CI should rely on commands and saved facts rather than a person watching a screen.

Finally, run cleanup twice and require the second pass to be safe. An idempotent teardown prevents a later hook from masking the first result with a new error.

## Frequently Asked Questions

### What is the safest way to use playwright cli close all?

Use close-all only on a worker where the current job owns every listed session. Save screenshots and traces first, record the before list, then poll the after list to a deadline. On shared hosts, prefer a named close so another task's browser and in-memory state remain intact.

### How do you verify playwright cli kill all?

Create a controlled stuck-process case, save the failed normal-close output, then call kill-all once. Verify that the final CLI list has no owned session and the tracked browser child is gone. Keep the job red if force was unexpected, because a clean worker does not erase the cleanup fault.

### When should a QA team choose stop playwright cli sessions?

Stop a named session when its task and proof collection are complete, and use close-all only when the whole owned worker is done. Choose a runner fixture when Playwright Test owns the browser. Use a host process manager when the browser was launched outside the CLI session contract.

### What causes failures in playwright zombie browser process?

Common causes include a wrong session name, blocked pipes, a frozen browser, shared daemon ownership, lost display service, or teardown that starts while artifacts are still open. Compare the session map with parent and child process facts. That check prevents a valid shared process from being mislabeled as a zombie.

### Which evidence should close browser daemon terminal retain?

Retain the CLI version, worker and session names, before and after lists, close output, exit status, elapsed time, artifact paths, and any tracked process identifiers. If force runs, add the reason, pre-kill state, kill output, and final state. Redact secret query values from saved URLs.

### How should CI handle playwright cli cleanup commands?

CI should use unique named sessions, save test proof before teardown, and poll normal close to a firm deadline. Escalate once, attach every cleanup record, and fail when force was not expected. The [testing practices guide](/blog/playwright-testing-best-practices-2026) can set the wider isolation and artifact policy.

## Conclusion

Playwright CLI close versus kill is safe when command scope matches session ownership, proof is saved first, normal close gets a bounded chance, and force remains visible. Adopt the flow only after named, shared-session, stuck-process, repeat-cleanup, and CI cases all leave the expected final state.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then use the [QA skills directory](/skills) to pair process cleanup with the right browser and product checks.`,
};
