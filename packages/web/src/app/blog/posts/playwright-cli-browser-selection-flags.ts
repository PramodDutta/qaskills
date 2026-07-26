import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright CLI Browser Selection Flags',
  description:
    'playwright cli browser selection flags: select Chrome, Firefox, WebKit, or Edge for each CLI session. Repo evidence maps checks and CI-safe steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright cli browser selection flags',
  keywords: [
    'playwright cli browser selection flags',
    'playwright cli chrome flag',
    'playwright cli firefox browser',
    'playwright cli webkit session',
    'playwright cli msedge',
    'cross browser cli automation',
    'select browser from terminal',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-projects-multi-browser-guide-2026',
    'cross-browser-testing-guide',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://playwright.dev/docs/browsers',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/SKILL.md',
    'seed-skills/playwright-cli/references/session-management.md',
  ],
  content: `Playwright CLI browser selection flags choose the browser for a new CLI session: \`--browser=chrome\`, \`firefox\`, \`webkit\`, or \`msedge\`. Give each browser a unique session name, prove what launched, run the same user check, and save a result row. One unmarked default run is not cross-browser coverage, even when the page looks correct.

## What Does Playwright CLI Browser Selection Flags Control?

Playwright CLI browser selection flags control which supported browser or channel opens for one new CLI session. The choice shapes rendering, input, browser APIs, installed binary needs, and the result row that QA records.

The official [Playwright CLI agent guide](https://playwright.dev/docs/getting-started-cli) lists four current values: \`chrome\`, \`firefox\`, \`webkit\`, and \`msedge\`. Pass the value to \`open\` when the session starts.

The flag is launch input, not an assertion. A command can return while the wrong old session remains active, so the test must prove both session identity and browser choice.

\`seed-skills/playwright-cli/SKILL.md\` defines the command-first browser workflow. It asks the agent to open a page, inspect a snapshot, use stable refs, save proof, and close the browser at the end.

\`seed-skills/playwright-cli/references/session-management.md\` defines named sessions for separate browser work. Its pattern uses \`-s=name\` before each command so later actions reach the intended session.

This workflow does not replace Playwright Test projects. The [multi-browser projects guide](/blog/playwright-projects-multi-browser-guide-2026) is better when a maintained suite must fan out the same test code on every commit.

The flags also do not claim that Chrome and Chromium are identical. Browser channels and Playwright's bundled engine builds can differ in media, policy, release timing, and headless behavior.

Use one fixed page, viewport, account state, and check on the same clean application build for the comparison. If every browser receives different data or steps, the result table cannot isolate a browser-specific fault.

The [QA skills directory](/skills) has wider cross-browser plans, but this check should answer one small question. Which browser ran this session, and did the same named user outcome pass?

A good Playwright CLI browser selection flags record contains the full command, value, session name, browser proof, screenshot, app result, and cleanup status. Those facts keep a default run from being relabeled after the job.

## How Does Playwright CLI Chrome Flag Work?

The playwright cli chrome flag asks the CLI to open the installed Chrome channel for a new session. Pair it with a unique name so later commands cannot fall back to another browser.

The flag should appear on the \`open\` call rather than a later snapshot or click. Browser choice is fixed when the session launches and cannot be changed in place by naming another value.

Start with \`playwright-cli -s=chrome-check open <url> --browser=chrome\`. Save command output, then request a snapshot or evaluate safe browser facts through that same named session.

The public [Playwright CLI repository](https://github.com/microsoft/playwright-cli) says sessions keep browser state between CLI calls. That makes unique names vital when several engines run on one host.

A name such as \`chrome-check\` makes the intent visible, but the name alone proves nothing. Also save a user agent or other documented browser fact from the live page.

Browser proof should come from more than the requested flag and session label. Record the safe user agent, browser version reported by the tool, and launch output in one row. Those facts can reveal a stale session, a channel fallback, or a worker image that changed between runs.

Keep the proof check ahead of product actions. If the facts do not match the requested row, stop that row and save a launch-mismatch result. Continuing to click would create app output for a browser that the matrix did not ask to test.

Do not match only the word Chrome in a user agent and infer an exact release channel. Save the full safe string, the CLI value, installed browser version, and runner operating system.

Close the named session after its row completes. Keeping it open while another browser starts can be useful for side-by-side work, but each later command must still carry its own name.

The [Playwright CLI complete guide](/blog/playwright-cli-complete-guide-2026) covers setup and normal actions. Browser selection adds a launch matrix on top of that same command flow.

If Chrome is missing or blocked by company policy, classify the row as an environment limit. Do not silently run a default browser and mark the Chrome row as passed.

Playwright CLI browser selection flags are trustworthy when the command and live proof agree. A mismatch should stop the row before any product result is compared.

## Playwright CLI Firefox Browser: Repository Evidence

The playwright cli firefox browser path begins with the explicit \`--browser=firefox\` value. The local skill and session reference both require the same name on later commands that inspect or close it.

\`seed-skills/playwright-cli/SKILL.md\` tells agents to save screenshots with clear paths. Use a browser label in each file name so Chrome output cannot overwrite the Firefox proof.

The file also recommends a fresh snapshot before interactions and after page changes. That rule keeps browser-specific page structure tied to the refs used for each Firefox action.

\`seed-skills/playwright-cli/references/session-management.md\` shows parallel named sessions as isolated work. Apply the pattern with names such as \`firefox-check\`, \`webkit-check\`, and \`edge-check\`.

Do not reuse a ref from Chrome in Firefox. Even when the page has the same accessible names, refs belong to the current browser session and current snapshot.

The official [Playwright browser guide](https://playwright.dev/docs/browsers) notes that Playwright's Firefox build relies on patches and is not the ordinary branded Firefox binary. Record the actual tool version instead of making a loose browser claim.

Run the same user outcome and same data setup as the Chrome row. A check that searches in one browser but only opens the home page in another gives no fair comparison.

Keep one expected screenshot per browser and a small text result. Pixel output may differ for valid reasons, while a role, status, or saved value can state the shared product need.

The [cross-browser testing guide](/blog/cross-browser-testing-guide) helps choose a larger browser and device set. This focused flow proves only the named CLI values used in its own matrix.

A Playwright CLI browser selection flags report should mark a missing binary, failed launch, app fault, and cleanup fault as separate states. One red label hides where the row actually stopped.

## When Should QA Teams Use Playwright CLI Webkit Session?

A playwright cli webkit session fits a quick check of WebKit rendering and interaction during local exploration. It is useful when a bug report points to Safari-like engine behavior or a change affects browser layout.

Use it for a small user flow before writing or changing a maintained test. The session can expose a different page state, focus rule, input result, or browser API path.

Use a Playwright Test project when the same WebKit check must run often in CI. A project gives source control, reports, fixtures, retries policy, and one command for the suite.

Use the CLI session when a person or agent needs to inspect live snapshots between actions. The short feedback loop helps explain a fault before code is changed.

Name the session and keep its data separate from Chrome or Firefox. Shared login and cart state can create a fake browser difference when one row inherits another row's work.

Use the same viewport when the question is engine behavior. If the goal is device emulation, record the device and viewport as separate inputs rather than crediting every change to WebKit.

Use a control page with stable content when launch itself is under test. Then move to the product route and run one clear check with fixed data.

The [Playwright practices article](/blog/playwright-testing-best-practices-2026) supports stable setup and user-facing checks. Those rules matter more when four browser rows must be compared.

Do not call WebKit a full test of every Safari release or platform detail. State the Playwright and host versions so the result remains precise.

Playwright CLI browser selection flags are best for focused discovery and proof. Promote high-value results into projects rather than relying on a long manual command transcript forever.

## Playwright CLI Msedge: Failure Modes and Diagnostics

Playwright cli msedge asks for the installed Microsoft Edge channel. A row should fail as unavailable when that browser is not installed or host policy blocks its launch.

The browser guide says Playwright can use recent Chrome and Edge channels available on the machine, but does not install them by default. Check the runner image before blaming app code.

The most common test defect is letting the default session leak between rows. A later command without \`-s=edge-check\` may act on Chrome while the report says Edge.

Another defect is giving several sessions the same name. The command then reaches existing state instead of proving a fresh engine and clean profile.

Product failures appear when the selected Edge session launches, the target is found, and the shared user check fails. Keep the page snapshot, screenshot, browser facts, and action result.

Environment failures include missing Edge, company browser policy, display setup, damaged install, and unsupported runner image. Mark these facts before changing the test or product.

Headless and headed modes can also differ from each other. Keep display mode fixed across the matrix or record it as a separate test factor.

Matrix order can reveal leaked state even when each row passes alone. Run the same set once in forward order and once in reverse on a test worker, then compare result and cleanup states. A row that changes with order often shares a profile, account record, port, or output path.

This order check belongs in harness validation rather than each pull request. Once it proves isolation, daily CI can use one fixed order and keep the smaller result set. Repeat the validation when session code, worker images, or data reset rules change.

Do not fall back from \`msedge\` to Chrome without an explicit skipped or fallback state. Both use Chromium roots, but the requested channel is part of the test contract.

The [cross-browser guide](/blog/cross-browser-testing-guide) can set browser support policy. The CLI row should report exactly what ran rather than expand or shrink that policy on its own.

A Playwright CLI browser selection flags diagnostic should stop after a launch mismatch. Product checks have no valid browser context until the intended engine and named session are proven.

## Cross Browser CLI Automation: Evidence and CI Assertions

Cross browser cli automation should save one result object for each browser value. Each object needs the command, session, browser proof, app check, screenshot, and cleanup result.

Run rows from the same build and safe data seed. If a mutable account must be used, reset it before each browser so order does not shape the result.

The first code block launches two isolated sessions and saves distinct proof files. It follows the named session pattern in \`seed-skills/playwright-cli/references/session-management.md\`.

\`\`\`bash
set -eu

playwright-cli -s=firefox-check open https://qaskills.sh --browser=firefox
playwright-cli -s=firefox-check snapshot > artifacts/firefox-snapshot.txt
playwright-cli -s=firefox-check screenshot --filename=artifacts/firefox-home.png

playwright-cli -s=webkit-check open https://qaskills.sh --browser=webkit
playwright-cli -s=webkit-check snapshot > artifacts/webkit-snapshot.txt
playwright-cli -s=webkit-check screenshot --filename=artifacts/webkit-home.png
\`\`\`

Never share output file names between rows. An overwrite can make every report point at the last browser even when earlier sessions failed.

The second block applies one check to all four values and always closes its named session. It records unavailable and failed rows rather than hiding them.

\`\`\`bash
set -u

for browser in chrome firefox webkit msedge; do
  session="\${browser}-check"
  status="passed"

  if ! playwright-cli -s="$session" open https://qaskills.sh --browser="$browser"; then
    status="launch-failed"
  elif ! playwright-cli -s="$session" snapshot > "artifacts/\${browser}.txt"; then
    status="check-failed"
  fi

  playwright-cli -s="$session" screenshot \
    --filename="artifacts/\${browser}.png" || true
  playwright-cli -s="$session" close || status="cleanup-failed"
  printf '%s,%s,%s\n' "$browser" "$session" "$status" >> artifacts/results.csv
done
\`\`\`

A real product check should do more than request a snapshot. Add one stable route, user action, and visible or stored result that matters for the current change.

Record user agent or other safe live browser facts after launch. Compare those facts with the requested value before accepting the product status.

Choose one product claim that has the same meaning in all four engines. A saved form value, visible status, route change, or item count is stronger than a screenshot alone. Keep browser-specific image proof as context, while the shared claim supplies the matrix pass rule.

When an engine needs a known exception, put that exception in the support policy rather than weakening the shared claim inside the loop. The result row should state the expected difference, its owner, and the issue or standard that allows it.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) supplies the command workflow, while CI owns the result parser and support policy. Keep those two roles clear in reports.

Playwright CLI browser selection flags pass the evidence gate when every required row proves its engine, runs the shared check, saves distinct artifacts, and closes cleanly. Unsupported rows must match an approved skip rule rather than vanish.

## Select Browser From Terminal Comparison Table

Select browser from terminal choices should match the product support need and installed runner image. The four values below share a CLI shape but do not share the same binary source.

| Browser value | Use when | Expected evidence | Main risk |
|---|---|---|---|
| \`chrome\` | Check the installed Google Chrome channel | Command, value, session, browser facts, screenshot, and result | Default Chromium is mistaken for Chrome |
| \`firefox\` | Check Playwright's patched Firefox build | Command, value, session, version, screenshot, and result | Branded Firefox behavior is claimed |
| \`webkit\` | Check WebKit engine rendering and input | Command, value, session, host facts, screenshot, and result | WebKit is claimed as every Safari platform |
| \`msedge\` | Check the installed Microsoft Edge channel | Command, value, session, browser facts, screenshot, and result | Missing Edge silently falls back to Chrome |

Chrome is useful when production users rely on the stable branded channel or its media support. It should be named and proven rather than inferred from a Chromium-based user agent.

Firefox broadens engine coverage and may show different layout or input behavior. Record the Playwright build because it is not a generic system Firefox run.

WebKit adds another engine path and is valuable for early browser faults. Keep host and Playwright versions beside the result so claims stay bounded.

Edge is useful where enterprise or customer policy makes that channel part of support. A policy-controlled local browser may behave differently from a clean CI image.

Use the [multi-browser guide](/blog/playwright-projects-multi-browser-guide-2026) when this table becomes a repeated suite. The Playwright CLI browser selection flags remain ideal for quick checks and focused fault study.

## How Do You Implement Playwright CLI Browser Selection Flags?

Implement Playwright CLI browser selection flags as a fixed matrix with unique names, shared setup, live browser proof, one product check, and clean close. The steps make false coverage hard to report.

1. Read \`seed-skills/playwright-cli/SKILL.md\`, choose the supported browser values, and record the CLI, Playwright, operating system, and installed browser versions.
2. Give each browser a unique session name, reset the safe test data, and pass its explicit \`--browser\` value on the first \`open\` call.
3. Capture a fresh snapshot and safe browser facts, then reject the row when live evidence does not match the requested engine or channel.
4. Run the same user action and outcome check, save a browser-labeled screenshot and text record, and classify product, test, or environment faults.
5. Close the named session, verify it no longer appears, and keep cleanup failure separate from launch and product result status.
6. Run the matrix locally and in CI, apply explicit skip policy for unavailable channels, and promote stable high-value checks into Playwright Test projects.

Start with a launch-only control page for all four values. This proves the worker image and naming rules before product code adds another source of failure.

Then use one product path with fixed data and a clear status. Run browsers in a known order, but reset state so changing that order does not change outcomes.

Test the missing-browser branch on a worker without one branded channel. The row must show unavailable or launch-failed and must not borrow a default session.

Test a name collision by trying to open two engines under one name. The harness should reject the setup before it records any shared product result.

Define required, optional, and blocked rows for each CI image before the matrix starts. A missing required browser fails setup, an optional browser records an approved skip, and a blocked channel must not launch. This policy makes host limits clear without turning absence into a product pass.

Publish the resolved row policy beside the result matrix. Reviewers can then tell whether three green rows satisfy the job or whether a fourth row vanished. Keep policy changes in source control so browser coverage cannot shrink through an unreviewed runner edit.

Use the [CLI guide](/blog/playwright-cli-complete-guide-2026) for normal commands and the [testing practices guide](/blog/playwright-testing-best-practices-2026) for suite design. Keep each matrix artifact labeled with browser and session.

Finally, close all named sessions and list the worker state. A matrix is incomplete when the result rows pass but one browser process stays live.

## Frequently Asked Questions

### What is the safest way to use playwright cli chrome flag?

Pass \`--browser=chrome\` on a new, uniquely named session and save live browser facts before checking the product. Keep the same name on every later command, label all artifacts, and close that session afterward. If Chrome is missing or blocked, report an environment limit instead of using the default browser.

### How do you verify playwright cli firefox browser?

Open a fresh Firefox-named session with the explicit flag, capture its snapshot and version facts, then run the same user check used for other rows. Save a Firefox-labeled screenshot and result. Do not reuse Chrome refs or claim that Playwright's patched Firefox build is an ordinary branded Firefox binary.

### When should a QA team choose playwright cli webkit session?

Choose it for quick study of WebKit layout, focus, input, or browser API behavior before changing a maintained test. Use a Playwright Test project when the check must run on each commit. Keep viewport, data, and user steps equal across browsers so engine behavior remains the main changed factor.

### What causes failures in playwright cli msedge?

Common causes are a missing Edge install, enterprise browser policy, wrong named session, shared profile state, bad display setup, or a silent default-browser fallback. Prove the launched channel before checking the app. Then separate environment, test harness, product, and cleanup faults in the saved result row.

### Which evidence should cross browser cli automation retain?

Retain the full safe command, browser value, session name, CLI and browser versions, operating system, viewport, user agent evidence, test data key, screenshot, shared check result, and cleanup status. Use distinct file names per row. Redact tokens and account data while keeping facts needed for comparison.

### How should CI handle select browser from terminal?

CI should use a known image, verify required browser installs, create one named session per value, run a fixed check, and attach a labeled result matrix. Missing required channels must fail or follow an approved skip rule. The [cross-browser guide](/blog/cross-browser-testing-guide) should define the wider support policy.

## Conclusion

Playwright CLI browser selection flags provide valid coverage only when each new named session uses an explicit value, live facts prove the engine, every row runs the same check, and cleanup succeeds. Adopt the matrix after launch, missing-browser, name-collision, shared-data, product-fault, and CI cases all report the right state.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then browse the [QA skills directory](/skills) before moving stable browser rows into a maintained multi-project suite.`,
};
