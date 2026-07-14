import type { SeoClusterArticle } from './seo-cluster-article';

export const playwrightCliChildren2026: SeoClusterArticle[] = [
  {
    slug: 'playwright-cli-install-quickstart-2026',
    clusterId: 'playwright-cli',
    post: {
      title: 'How to Install Playwright CLI Skills in Codex and Claude Code',
      description:
        'Install Playwright CLI skills for Codex and Claude Code, verify agent discovery, run a browser smoke test, and fix common skill setup failures.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/playwright-cli.png',
      imageAlt:
        'Playwright CLI installation and agent skill discovery workflow for Codex and Claude Code',
      primaryKeyword: 'playwright cli install skills',
      keywords: [
        'playwright cli install skills',
        'playwright cli codex',
        'playwright cli claude code',
        'playwright agent skills',
        '@playwright/cli',
        'playwright-cli skill setup',
        'playwright browser skill',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-cli-complete-guide-2026',
      relatedSlugs: [
        'playwright-cli-complete-guide-2026',
        'playwright-cli-accessibility-snapshots-guide-2026',
        'playwright-cli-sessions-dashboard-attach-guide-2026',
        'playwright-cli-debug-tests-traces-agents-guide-2026',
      ],
      sources: [
        'https://playwright.dev/agent-cli/installation',
        'https://playwright.dev/agent-cli/quick-start',
        'https://playwright.dev/agent-cli/skills',
        'https://playwright.dev/agent-cli/configuration',
        'https://playwright.dev/docs/release-notes',
        'https://github.com/microsoft/playwright-cli/releases',
      ],
      content: `To install Playwright CLI skills for Codex or Claude Code, run \`npm install -g @playwright/cli@latest\`, then \`playwright-cli install --skills\`. Verify the executable and installed skill with \`playwright-cli --help\`; current official CLI releases print the skill path so an agent can discover it. Codex and Claude Code use the same Playwright installer command. Playwright does not document separate \`--codex\` or \`--claude\` flags. Node.js 20 or newer is required.

The skill supplies structured instructions for the dedicated \`playwright-cli\` browser interface. It does not install Playwright Test, and it does not turn \`npx playwright test\` into the agent CLI. This guide verifies both layers, proves the setup with a safe browser task, and isolates failures in the executable, skill discovery, browser launch, or agent permissions.

## Understand the Two-Layer Installation

The package is \`@playwright/cli\`, and its executable is \`playwright-cli\`. Playwright describes it as a command-line browser automation interface designed for coding agents. It exposes compact commands such as \`open\`, \`snapshot\`, \`click\`, \`fill\`, and \`screenshot\`. After an action, it returns page information and a link to an accessibility-tree snapshot. An agent reads that snapshot, chooses an element reference, acts, and reads the refreshed state.

The installed skill is the second layer. It gives a compatible agent structured reference material for workflows such as browser session management, request mocking, storage state, test generation, test debugging, tracing, video recording, and inspecting attributes. The skill calls the executable; it is not another browser driver and does not bundle a separate model. If \`playwright-cli --help\` fails, fix the executable first. If help works but an agent ignores the workflow, investigate skill discovery and the agent's tool permissions.

That design is different from Playwright Test. The command \`npx playwright test\` discovers and executes test files using the Playwright Test runner. It supports projects, fixtures, retries, reporters, and test configuration. The agent CLI controls a live browser across terminal calls. One can help debug the other, but installing \`@playwright/cli\` does not replace \`@playwright/test\`, and installing the test package does not automatically give an agent the dedicated \`playwright-cli\` workflow.

The distinction matters because older articles often use "Playwright CLI" to mean every command beginning with \`npx playwright\`. In the 1.61-era documentation, \`playwright-cli\` has its own installation, snapshots, sessions, dashboard, attach modes, storage controls, tracing commands, and skills. Use the [complete Playwright CLI guide](/blog/playwright-cli-complete-guide-2026) when you need the broader capability map.

## Prerequisites

The official installation page lists two prerequisites:

- Node.js 20 or newer.
- A coding agent such as Claude Code, Codex, or another agent that supports locally installed skills and can run terminal commands.

Confirm Node before diagnosing Playwright:

\`\`\`bash
node --version
npm --version
\`\`\`

A version beginning with \`v20\` or a later major meets the documented runtime requirement. The agent is not technically required to type commands yourself, but it is the intended consumer. If your environment blocks global package installation, use the documented npx route for discovery or configure an approved global npm prefix rather than using an unsafe permission workaround.

You also need normal browser-launch permissions. Linux containers may lack operating-system libraries, corporate machines may block browser downloads, and remote shells may not have a display for headed mode. Those are environment constraints, not evidence that the CLI command names are wrong.

## Choose an Installation Path

| Situation | Official entry point | What it changes | Recommended use |
|---|---|---|---|
| You use the CLI regularly | \`npm install -g @playwright/cli@latest\` | Adds \`playwright-cli\` to your executable path | Best default for coding agents and repeated local work |
| You cannot or do not want to install globally | \`npx playwright-cli --help\` | Resolves the executable through npx | Good for evaluation and command discovery |
| The browser cannot download on first launch | \`playwright-cli install-browser\` | Explicitly installs default Chromium | Use after the CLI itself works |
| A Linux host needs browser dependencies | \`playwright-cli install-browser --with-deps\` | Installs browser plus documented system dependencies | Use in a controlled machine or container with required privileges |
| Codex or Claude Code needs structured Playwright guidance | \`playwright-cli install --skills\` | Installs local Playwright skill files | Preferred setup for repeat browser work |
| Skill discovery is unavailable or intentionally disabled | \`playwright-cli --help\` | Exposes commands and, in current releases, the installed skill path | Supported skills-less fallback |

Global installation is the clearest path because every later example can use the same \`playwright-cli\` executable. The npx form is official, but do not alternate randomly between a global latest install and a cached npx resolution while troubleshooting. First identify which executable and version your shell is invoking.

## Install the CLI, Then Install Its Skills

Install the package, install its local skill material, then ask the executable for help:

\`\`\`bash
npm install -g @playwright/cli@latest
playwright-cli install --skills
playwright-cli --help
\`\`\`

Successful help output proves three executable-level facts: npm resolved the package, the executable was linked into a directory on your \`PATH\`, and Node could start it. Current official \`playwright-cli\` release notes also say help prints the installed agent skill path, allowing coding agents to find it without being told. Confirm that path is present after \`install --skills\`; do not invent a location or manually copy files before checking what your installed release reports.

This still does not prove a browser can launch or that a particular agent loaded the skill. Keep those gates separate. The shell can run the executable while Codex lacks terminal permission. Claude Code can see a skill while a corporate proxy blocks the first browser download. A browser can launch while the agent starts in a different workspace or process environment and never discovers the installed reference.

If your team pins tool versions for reproducibility, replace \`@latest\` with the version approved by the team. This article describes behavior documented alongside Playwright 1.61. Verify a pinned older package's own help before assuming it includes sessions, dashboard attachment, or agent debugging introduced in newer releases.

Do not substitute this command:

\`\`\`bash
npm install -D @playwright/test
npx playwright test
\`\`\`

That is a valid Playwright Test setup, but it installs and runs the test runner. It does not install the dedicated agent skill described here. A project can legitimately contain \`@playwright/test\` while the developer also has \`@playwright/cli\` and its skill installed.

## Let the CLI Install Its Browser

On first use, the agent CLI downloads a browser automatically. For the shortest quickstart, simply run \`open\` and let that happen. An explicit installation is useful when preparing a machine image, diagnosing a download separately, or selecting a non-default engine:

\`\`\`bash
playwright-cli install-browser
playwright-cli install-browser firefox
playwright-cli install-browser --with-deps
\`\`\`

The first command installs default Chromium. The second explicitly installs Firefox. The third includes operating-system dependencies and is chiefly relevant on Linux. The same command also documents \`--dry-run\`, \`--list\`, \`--force\`, \`--only-shell\`, and \`--no-shell\`. Use \`--dry-run\` to inspect intended work and \`--list\` to inspect available browser installations before forcing a reinstall.

This is another point where command families are easy to confuse. The agent CLI uses \`playwright-cli install-browser\`. The Playwright Test/library CLI uses \`npx playwright install\`. Both install Playwright-managed browsers, but they belong to different executables and should not be presented as interchangeable syntax.

## Run Your First Headed Browser Session

Use Playwright's TodoMVC demo because its state and controls make the snapshot loop easy to see:

\`\`\`bash
playwright-cli open https://demo.playwright.dev/todomvc/ --headed
playwright-cli type "Buy groceries"
playwright-cli press Enter
playwright-cli type "Water flowers"
playwright-cli press Enter
playwright-cli screenshot
\`\`\`

The \`--headed\` flag makes the browser visible. Headless is the documented default, so omit the flag in an unattended agent workflow. After \`open\`, the terminal output includes the page URL, page title, and a path under \`.playwright-cli/\` for a YAML snapshot. After each interaction, the output reflects the current page again.

The official quickstart later checks an item using a ref such as \`e21\`. Treat that number as example output, not a permanent selector. Read the snapshot produced by your own session, locate the checkbox's current \`[ref=eN]\`, and use that current value:

\`\`\`bash
playwright-cli snapshot
playwright-cli check e21
playwright-cli screenshot --filename=todo-complete.png
\`\`\`

If your snapshot says \`e18\` instead, use \`e18\`. Element refs are assigned from a particular snapshot and can be invalidated when the page changes. Hard-coding a ref copied from documentation is one of the fastest ways to make a correct installation look broken. The [snapshot and element-reference guide](/blog/playwright-cli-accessibility-snapshots-guide-2026) explains this lifecycle in depth.

## Understand What the Session Preserves

The default browser profile is in memory. Cookies and storage survive from one CLI command to the next while that session remains open, but they are lost when the browser closes. This continuity is why six separate shell commands can operate on one TodoMVC page rather than launching six independent browsers.

Named sessions isolate parallel work. For example, an agent can reserve a stable name through its environment:

\`\`\`bash
PLAYWRIGHT_CLI_SESSION=todo-app claude .
\`\`\`

Every agent CLI command launched in that agent process then uses the \`todo-app\` browser instance. Session naming is not required for a first manual walkthrough, but it prevents collisions when multiple agents or roles use the same workstation. For persistent profiles, dashboard monitoring, cleanup commands, and connection choices, continue to the [sessions, dashboard, and attach guide](/blog/playwright-cli-sessions-dashboard-attach-guide-2026).

## Verify Skill Use in Codex and Claude Code

The installation command is identical for both agents:

\`\`\`bash
playwright-cli install --skills
playwright-cli --help
\`\`\`

Do not look for a second Playwright command that registers the skill with a vendor-specific flag. The install writes local skill material, while the agent decides how and when locally installed skills enter context. Playwright's current help output is the authoritative way to find the installed skill path. Agent product settings, workspace trust, sandbox policy, and session startup determine whether that material can be read and whether its terminal commands can run.

### Validate the skill in Codex

Open the Codex task in the workspace where you intend to test. Ask for a bounded browser action and name \`playwright-cli\` explicitly on the first verification. The expected behavior is not a particular sentence from the model; it is a sequence grounded in real tool output: inspect available guidance or help, launch the dedicated executable, read the returned snapshot, and save requested evidence.

Use a prompt such as:

\`\`\`text
Use the installed Playwright CLI skill and playwright-cli to inspect
https://demo.playwright.dev/todomvc/. Confirm the page title, add one todo,
read the fresh snapshot, and save a screenshot. Do not use npx playwright test.
\`\`\`

If Codex does not surface the skill, use Playwright's documented skills-less fallback: tell it to run \`playwright-cli --help\` and use the dedicated CLI. That proves whether the blocker is skill discovery or command execution. Do not compensate by giving the agent invented syntax. Also check whether Codex has permission to execute the global binary and write artifacts in the workspace.

### Validate the skill in Claude Code

Use the same bounded prompt in Claude Code. Playwright's documentation explicitly shows starting Claude with a named browser session:

\`\`\`bash
PLAYWRIGHT_CLI_SESSION=todo-app claude .
\`\`\`

That environment variable selects the browser session for commands launched by that agent process; it does not install the skill. Run \`playwright-cli install --skills\` first. A named session is useful during validation because it prevents another agent using the default session from changing the page underneath Claude's snapshot/ref loop.

If Claude can describe the skill but cannot launch a browser, the skill is already discovered. Investigate terminal approval, \`PATH\`, browser download, display mode, or network policy instead of reinstalling reference files. If manual \`playwright-cli open\` works in your shell but not in Claude Code, compare the shell environment available to the agent.

### Judge behavior, not skill-name recitation

A successful smoke test should satisfy all of these observations:

- The agent uses \`playwright-cli\`, not \`npx playwright test\`, for live browser control.
- It reads current page or snapshot output before choosing a generated ref.
- It treats refs as short-lived and re-observes after page changes.
- It writes the requested screenshot or snapshot and reports the actual path.
- It stays within the target and data boundaries in the prompt.

The skill can work even if the agent does not announce its name. Conversely, saying "I loaded the Playwright skill" proves nothing without executable output and browser evidence.

A precise first task is better than "test this site." State the target, scope, evidence, and boundaries. For example:

\`\`\`text
Use playwright-cli to test the add, complete, and filter flows on
https://demo.playwright.dev/todomvc/. Read a fresh snapshot before using
element refs. Capture a screenshot for each failed scenario. Do not modify
application data outside this demo.
\`\`\`

The wording makes the interface explicit and gives the agent an observable completion condition. The official Playwright skill teaches tool operation; a team QA skill can add application-specific risk, evidence, and review rules. For reusable QA context beyond the browser tool itself, browse the [QASkills directory](/skills) or install the [Playwright CLI skill](/skills/Pramod/playwright-cli).

## A Reliable First-Run Checklist

Run the setup as a sequence of narrow gates:

1. Confirm Node 20 or newer.
2. Install \`@playwright/cli\` and confirm \`playwright-cli --help\`.
3. Run \`playwright-cli install --skills\` and verify the skill path through help.
4. Open the demo manually and allow the first browser download.
5. Confirm the terminal prints a page URL, title, and snapshot path.
6. Ask Codex or Claude Code to perform one bounded action with \`playwright-cli\`.
7. Confirm it reads a fresh snapshot and produces the requested artifact.
8. Give each concurrent agent a named session before parallel use.

This order preserves the failure boundary. If help fails, investigate npm and \`PATH\`. If help works but \`open\` fails, investigate browser download, host libraries, proxy, or launch policy. If manual commands work but an agent fails, investigate the agent's shell, permissions, skill discovery, prompt, or session selection.

## Common Mistakes

### Installing the wrong package

\`@playwright/test\` is the test runner package; \`@playwright/cli\` provides the dedicated agent executable. Install the package that matches the workflow rather than inferring from the word "CLI."

### Running \`npx playwright test\` as the browser quickstart

That command expects tests and configuration. The agent quickstart begins with \`playwright-cli open <url>\`. The test runner appears in this cluster only when a test is deliberately paused with \`--debug=cli\` for agent attachment.

### Looking for separate Codex and Claude installer flags

The documented command is \`playwright-cli install --skills\`. Agent-specific skill discovery happens after installation; do not invent \`--codex\`, \`--claude\`, or an MCP registration step.

### Assuming skill installation grants browser permission

The skill teaches commands. The host agent still needs permission to execute the binary, access the target, launch a browser, and write artifacts. Diagnose those controls separately.

### Assuming browsers always install during npm installation

The agent CLI documents automatic browser download on first use, not necessarily during \`npm install -g\`. A successful package install can therefore be followed by a browser download on the first \`open\`.

### Copying an element ref from a guide

Refs belong to current snapshot output. Read your snapshot after navigation or mutation and use the value it reports. Do not treat \`e21\` as a cross-run ID.

### Using \`--headed\` in a displayless environment

Headed mode is useful for learning and human observation. Headless is the default and is normally appropriate for remote shells or containers without a display server.

### Using a persistent profile for every task

Persistence can retain authentication and application state, but it also carries contamination between runs. Begin with the isolated in-memory default. Opt into \`--persistent\` or a custom \`--profile\` only when state survival is intentional.

### Giving several agents the default session

Concurrent commands can navigate or mutate the same browser unexpectedly. Assign named sessions or the \`PLAYWRIGHT_CLI_SESSION\` environment variable before parallel work.

## Troubleshooting Skill Installation and Browser Launch

| Symptom | Likely boundary | What to check |
|---|---|---|
| \`playwright-cli: command not found\` | Executable path | Re-run npm's global install, inspect npm's global binary location, and start a fresh shell |
| Node version error or startup syntax error | Runtime | Confirm \`node --version\` is 20 or newer in the same shell the agent uses |
| \`install --skills\` succeeds but help does not expose a skill path | CLI version or incomplete install | Confirm the current executable, update the approved package, and rerun the documented installer |
| Manual commands work but Codex or Claude ignores the skill | Agent discovery or permissions | Confirm local-skill support and read access; explicitly direct the agent to \`playwright-cli --help\` as the supported fallback |
| Help works, but \`open\` cannot download a browser | Network or package registry policy | Check proxy, TLS inspection, outbound access, and try the explicit documented \`install-browser\` command |
| Browser reports missing libraries on Linux | Host dependencies | Use \`install-browser --with-deps\` in an approved environment or add the listed dependencies to the image |
| Headed launch fails on a server | Display environment | Omit \`--headed\` and use default headless mode |
| A ref cannot be found | Stale snapshot | Run \`playwright-cli snapshot\` and use a ref from the newest state |
| An agent opens the wrong page or sees another agent's login | Session collision | Set a unique session name and list or close stale sessions |
| The command behaves unlike this guide | Version mismatch | Check executable help and package version; do not assume an old cached npx package has 1.61-era features |

Avoid \`sudo npm install -g\` as an automatic response to every permission failure. It can leave root-owned npm caches or project files and expands the trust boundary. Prefer a user-writable npm prefix, a managed tool image, or the documented npx path according to your organization's Node setup.

## Frequently Asked Questions

### Is \`playwright-cli\` the same as \`npx playwright test\`?

No. \`playwright-cli\` is the dedicated browser automation interface for coding agents. \`npx playwright test\` is the Playwright Test runner. The runner can pause a test with \`--debug=cli\`, at which point the agent CLI attaches to that paused browser, but they remain separate command surfaces. See the [agent debugging and trace guide](/blog/playwright-cli-debug-tests-traces-agents-guide-2026) for that bridge.

### Do I need to install a browser separately?

Usually not for a first run. The official agent CLI installation guide says a browser downloads automatically on first use. Use \`playwright-cli install-browser\` when you want an explicit preinstall or need to diagnose browser setup independently.

### Which browser is the default?

The installation page identifies default Chromium for \`install-browser\`, while the configuration guide shows Chrome as the default selection for \`open --browser\`. Follow the help shown by your installed version when the distinction between bundled Chromium and a Chrome channel matters, and specify \`--browser=firefox\`, \`--browser=webkit\`, or \`--browser=msedge\` when you need an explicit engine or channel.

### Do Codex and Claude Code need different Playwright skill commands?

No. Run \`playwright-cli install --skills\` once in the intended environment. Each host then applies its own local-skill discovery and terminal policy. Use \`playwright-cli --help\` to verify the installed skill path and as the documented fallback when automatic discovery is unavailable.

### Are Playwright skills required?

No. Playwright documents a skills-less mode in which the agent checks \`playwright-cli --help\`. Installing skills supplies structured guidance and usually reduces command-discovery overhead; it does not alter the web application or replace the browser executable.

### Where does the CLI write snapshots and screenshots?

Automatic output is reported by each command, with examples under \`.playwright-cli/\`. Use explicit filename options where the command supports them when an artifact is part of a review or handoff. Always read the path printed by your installed version instead of assuming a timestamped filename.

### Does the default session keep me logged in forever?

No. The default in-memory profile preserves cookies and storage between commands while the browser remains open, then loses them when it closes. Persistent profiles and state-save/state-load workflows are explicit choices and deserve separate credential-handling rules.

### What should I read after the quickstart?

Read the [snapshot guide](/blog/playwright-cli-accessibility-snapshots-guide-2026) before building ref-heavy agent flows, the [sessions and attach guide](/blog/playwright-cli-sessions-dashboard-attach-guide-2026) before parallel or authenticated work, and the [debugging guide](/blog/playwright-cli-debug-tests-traces-agents-guide-2026) before connecting the CLI to failing Playwright tests.

## Official References and Next Steps

The commands in this tutorial are grounded in Playwright's official [agent CLI installation](https://playwright.dev/agent-cli/installation), [quickstart](https://playwright.dev/agent-cli/quick-start), [skills](https://playwright.dev/agent-cli/skills), and [configuration](https://playwright.dev/agent-cli/configuration) pages. Release-specific interoperability and agent debugging behavior is documented in the official [Playwright release notes](https://playwright.dev/docs/release-notes), while the official [playwright-cli releases](https://github.com/microsoft/playwright-cli/releases) document current help-based skill discovery.

Once the TodoMVC walkthrough works, keep the next task narrow: assign a named session, open a non-production environment, read a fresh snapshot, perform one reversible scenario, and save evidence. That proves the full agent loop without confusing browser control with test execution or granting broader access than the task requires.`,
    },
  },
  {
    slug: 'playwright-cli-accessibility-snapshots-guide-2026',
    clusterId: 'playwright-cli',
    post: {
      title: 'Playwright CLI Accessibility Snapshots and Element References Explained',
      description:
        'Understand Playwright CLI accessibility snapshots, use short-lived element refs safely, scope agent context, and troubleshoot stale or missing references.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-cli.png',
      imageAlt:
        'Playwright CLI accessibility snapshot with semantic elements and current browser references',
      primaryKeyword: 'playwright cli snapshot',
      keywords: [
        'playwright cli snapshot',
        'playwright accessibility snapshot',
        'playwright element refs',
        'playwright agent accessibility tree',
        'playwright-cli snapshot depth',
        'playwright cli selectors',
        'playwright agent browser automation',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-cli-complete-guide-2026',
      relatedSlugs: [
        'playwright-cli-complete-guide-2026',
        'playwright-cli-install-quickstart-2026',
        'playwright-cli-sessions-dashboard-attach-guide-2026',
        'playwright-cli-debug-tests-traces-agents-guide-2026',
      ],
      sources: [
        'https://playwright.dev/agent-cli/snapshots',
        'https://playwright.dev/agent-cli/quick-start',
        'https://playwright.dev/agent-cli/capabilities',
        'https://playwright.dev/docs/release-notes',
      ],
      content: `A Playwright CLI snapshot is a YAML accessibility-tree view of the current page, with short-lived refs such as \`e5\` attached to interactive elements. Read the newest snapshot, choose the ref for the element the agent just observed, perform one action such as \`playwright-cli click e5\`, and read the new snapshot returned afterward. Refs are stable only within their snapshot and can become invalid when the page changes. A snapshot is not a screenshot, a CSS selector, or a complete accessibility audit.

That observe-act-observe loop is the core of the dedicated \`playwright-cli\` agent interface. It gives a coding agent a compact semantic representation instead of making it infer every control from pixels or send a large page DOM through its context. This guide explains what the output guarantees, where it does not, and how to use refs without creating brittle browser workflows.

## What a Playwright CLI Snapshot Contains

After each browser command, \`playwright-cli\` reports the current page URL and title plus a link to a timestamped snapshot under \`.playwright-cli/\`. The file represents the page as an accessibility tree. Headings, text, lists, form controls, links, and other semantic nodes appear in a concise nested structure. Interactive nodes receive refs that another CLI command can target.

A simplified TodoMVC snapshot looks like this:

\`\`\`yaml
- heading "todos" [level=1]
- textbox "What needs to be done?" [ref=e5]
- listitem:
  - checkbox "Toggle Todo" [ref=e10]
  - text: "Buy groceries"
- contentinfo:
  - text: "1 item left"
  - link "All" [ref=e20]
  - link "Active" [ref=e21]
  - link "Completed" [ref=e22]
\`\`\`

The text and roles help an agent understand intent. The ref is an action handle for that observed state. \`e5\` is not derived from an HTML id and does not promise to be \`e5\` in another browser, session, page state, or later snapshot. The official documentation defines the format as \`e\` followed by a number, unique within one snapshot, and assigned to interactive elements.

Automatic snapshots are also evidence about what the accessibility layer exposes. If a control appears as an unnamed button, the output tells you the agent and assistive technology lack a meaningful accessible name. That signal is useful, but it is only one part of accessibility quality.

## Snapshot, Screenshot, ARIA Assertion, or DOM Query?

Several Playwright features use similar language. Choose by the question you need to answer:

| Need | Best tool | Output | Important limitation |
|---|---|---|---|
| Let an agent understand and target semantic controls | \`playwright-cli snapshot\` | YAML accessibility tree with refs | Refs are tied to current observed state |
| Verify pixels, layout, canvas, or visual overlap | \`playwright-cli screenshot\` | Image artifact | Pixels do not explain roles or accessible names |
| Assert an accessibility-tree contract in a test file | \`expect(locator).toMatchAriaSnapshot()\` | Test assertion and diff | This is a Playwright Test/API feature, not an agent ref |
| Inspect a property not represented in the snapshot | \`playwright-cli eval\` or a documented locator form | Evaluated page data or direct target | Requires a deliberate query and stronger review |
| Find a stable element across repeatable scripted runs | User-facing Playwright locator or test id | Locator expression | It is not a ref to the exact element just observed |

Playwright 1.60 expanded the programmatic ARIA snapshot API with page-level snapshots and optional boxes for AI consumption. That release-note feature does not change the basic agent CLI contract: the CLI's \`snapshot\` command returns an accessibility representation and refs for interaction. Do not claim that every CLI snapshot includes bounding boxes, and do not paste an agent ref into a Playwright Test locator.

For a map, canvas editor, or custom widget with no accessible element, a semantic snapshot may not expose an actionable target. The agent CLI has a separate vision capability with screenshots and coordinate commands. Use that only when the interface genuinely lacks a semantic target; it is not a reason to skip accessible markup in an application you control.

## The Correct Ref Lifecycle

The safest mental model is a lease, not an identity. A ref gives the agent permission to address the element represented in the current observation. A navigation, reload, route change, dialog transition, list update, or other page mutation may invalidate that lease. The next command returns an updated snapshot from which the next ref should be selected.

Use this sequence:

1. Observe the current page output.
2. Open or read the linked snapshot.
3. Match the intended control by role, accessible name, surrounding text, and state.
4. Use its current ref in one action.
5. Inspect the returned page state and snapshot.
6. Re-plan from the new state rather than assuming the previous ref map survived.

Here is a manual version of the loop:

\`\`\`bash
playwright-cli open https://demo.playwright.dev/todomvc/ --headed
playwright-cli snapshot --filename=empty-list.yaml

# Read empty-list.yaml and use the textbox ref reported there.
playwright-cli fill e5 "Review accessibility tree"
playwright-cli press Enter

# The page changed. Capture and read a new ref map before checking the item.
playwright-cli snapshot --filename=one-item.yaml
playwright-cli check e10
\`\`\`

The example refs mirror the shape in the official documentation, but your values are output, not inputs to memorize. If \`one-item.yaml\` assigns the checkbox \`e12\`, use \`e12\`. A robust agent instruction says "use the checkbox ref from the latest snapshot," not "always check e10."

This behavior is intentionally different from a maintained test. A Playwright Test locator such as \`page.getByRole('checkbox', { name: 'Toggle Todo' })\` stores the logic needed to find an element again and benefits from auto-waiting. A ref points to the exact element the agent just saw, which is efficient for an interactive terminal loop but unsuitable as a permanent selector in source code.

## Take an On-Demand Snapshot

Every command normally returns a snapshot link, but an explicit \`snapshot\` is useful before a risky action, after waiting for an external state change, or when you want a named artifact:

\`\`\`bash
playwright-cli snapshot
playwright-cli snapshot --filename=before-submit.yaml
playwright-cli snapshot "#main"
playwright-cli snapshot e34
playwright-cli snapshot --depth=4
\`\`\`

These forms are documented for a full page, custom filename, CSS-selector scope, element-ref scope, and depth limit. Scoping and depth are context-budget controls, not merely formatting preferences. A large application shell can contain hundreds of navigation, menu, and table nodes unrelated to one form. A snapshot of \`#main\`, a known panel, or a current ref reduces noise and the chance that an agent chooses a same-named control elsewhere.

Scope only after you understand the page. An overly narrow selector can hide a validation summary, modal, toast, or navigation outcome that determines whether the action succeeded. Start broad enough to establish context, narrow for a focused interaction, then inspect a broad result when success can appear outside that region.

Depth has a similar tradeoff. A small value can make a deeply nested control disappear even though it is present and accessible. Increase depth or remove the limit before concluding that a control has no semantics.

## Use Refs, CSS, or Playwright Locators Deliberately

The CLI accepts refs, CSS selectors, and Playwright locator strings for interaction. The official snapshot guidance prefers refs because they identify the element the agent just observed:

\`\`\`bash
# Ref selected from the latest snapshot
playwright-cli click e10

# CSS alternatives
playwright-cli click "[data-testid='submit']"

# User-facing Playwright locator alternative
playwright-cli click "getByRole('button', { name: 'Submit' })"
\`\`\`

Use a ref for an immediate action after observation. Use a user-facing locator when you need to express semantic intent and no usable ref is present, or when a reviewed workflow intentionally avoids depending on one generated snapshot. Use CSS when the application exposes a reliable contract such as a test id and the semantic representation is insufficient. Avoid deep structural CSS copied from browser developer tools; it usually encodes implementation details rather than user intent.

The key is not to mix lifetimes accidentally. A ref is strongest as an ephemeral handle. A locator is strongest as repeatable lookup logic. A selector can be strong when it targets an explicit test contract, but weak when it depends on nesting or generated class names.

## Make Snapshot Output Efficient for Agents

Long output consumes agent context and can distract planning. Apply reductions in this order:

1. Start with the automatic full-page snapshot to establish page identity and major regions.
2. Scope to the feature area by selector or current ref.
3. Limit depth only when nesting, rather than page breadth, is the source of noise.
4. Give important artifacts descriptive filenames.
5. Use raw output for shell processing only when page metadata is not needed.

The documented raw form strips page information and returns command output directly:

\`\`\`bash
playwright-cli snapshot --raw | grep "button"
\`\`\`

That can answer a narrow question, but grep is not a substitute for understanding hierarchy. Two "Delete" buttons may belong to different rows, and a text match alone discards the surrounding structure needed to choose safely. For consequential actions, inspect the relevant subtree rather than filtering to one line.

Token efficiency should never mean omitting evidence. Keep a named before snapshot, a named screenshot when visual state matters, and a final snapshot showing the outcome for workflows that will be reviewed. Artifacts make an agent's claim independently inspectable.

## What Snapshots Reveal About Accessibility

The tree exposes roles, accessible names, heading levels, control states, and semantic grouping as the browser presents them. It can reveal high-value defects:

- An icon button has no accessible name.
- A visual heading is exposed as plain text.
- Two controls have the same ambiguous name.
- A custom checkbox is not exposed as a checkbox.
- Error text appears visually but is absent from the semantic subtree being inspected.
- Focus lands on a control different from the one the agent expected.

However, a clean-looking snapshot does not establish WCAG conformance. It does not by itself evaluate color contrast, keyboard order across the whole flow, motion, target size, captions, cognitive clarity, zoom behavior, or every name-role-value rule. Nor does it replace testing with screen readers and keyboard-only interaction. Treat the snapshot as an accessibility-informed interaction model and one source of test evidence.

If your goal is a repeatable tree contract, implement reviewed ARIA snapshot assertions in Playwright Test. If your goal is automated rule detection, use an accessibility engine designed for that purpose. If your goal is agent navigation, use the CLI snapshot and current refs. Naming the purpose prevents false confidence.

## Dynamic Pages, Dialogs, and Delayed State

Modern pages can mutate after an action without a full navigation. Search suggestions arrive, a table refreshes, or a client route replaces a panel. The returned snapshot is the new planning point even if the URL did not change. Do not use URL change as the only signal that refs may be stale.

Dialogs are a special case because they can block all further actions. The official snapshot best practices say to check command output for an open dialog and handle it before continuing. If a click reports a dialog, stop the planned sequence, inspect the state, use the documented dialog accept or dismiss capability as appropriate, and then obtain a fresh snapshot.

For state that changes outside a CLI action, such as a background job finishing, take an explicit snapshot before interacting again. A stale file on disk does not refresh itself. The timestamped path represents one observation, not a live accessibility tree.

## Turn Snapshot Output into Reviewable Evidence

A useful snapshot artifact needs context beyond its YAML. Record the session, scenario, page URL, action that preceded it, and question the snapshot is meant to answer. A file named \`before-submit.yaml\` is valuable only if a reviewer can connect it to the right role and run. In parallel work, include the role or task identifier in the filename and artifact report.

Preserve both sides of an important transition when the claim depends on change. The before snapshot establishes available controls and state; the after snapshot establishes the semantic outcome. Add a screenshot when visual layout or styling is part of the claim. This combination lets a reviewer distinguish "the agent clicked a ref" from "the intended user-visible and accessibility-visible result occurred."

Do not line-diff timestamped CLI snapshots and call every changed ref a regression. Ref numbers are ephemeral, and unrelated dynamic content can move. Compare roles, accessible names, states, hierarchy, and expected user outcomes. If the semantic structure must become a stable, automated contract, encode a focused ARIA snapshot assertion in reviewed Playwright Test code rather than turning raw agent artifacts into an accidental golden file.

Finally, apply the same data controls used for screenshots and traces. Accessibility output can contain account names, entered form values, messages, and other page text. Retain only what the investigation requires and avoid publishing snapshots from production sessions.

## Common Mistakes

### Treating refs as stable selectors

Saving \`e42\` in a script or prompt assumes an internal assignment will repeat. Save user intent in a test locator; read refs from current output in an agent loop.

### Using a ref from another session

Refs are scoped to a snapshot, and sessions have separate browser instances and state. A ref from an admin session has no defined meaning in a user session.

### Acting from an old snapshot after the page changes

The previous file remains readable, which can make it look authoritative. Its contents describe history. Use the snapshot returned by the most recent state-changing command.

### Calling the snapshot an accessibility audit

The tree can surface semantic problems, but it is not a comprehensive standards evaluation. Report exactly what was inspected.

### Confusing CLI snapshots with test assertions

\`playwright-cli snapshot\` produces an agent observation and refs. \`toMatchAriaSnapshot\` compares an expected semantic structure in test code. They solve related but different problems.

### Limiting depth too aggressively

If a target vanishes after \`--depth=2\`, the depth limit may have hidden it. Re-run without the limit before blaming application accessibility.

### Scoping away success or error feedback

A form-only snapshot may exclude a toast or page-level error summary. Inspect the region where the product communicates the result, not only the region where the action began.

### Choosing by visible text alone

Repeated labels are common. Consider role, accessible name, parent region, state, and surrounding content before selecting a ref.

## Troubleshooting Snapshot and Ref Problems

| Symptom | Probable cause | Correct next step |
|---|---|---|
| "Ref not found" after a click or navigation | Ref came from an older state | Run a new snapshot and select the target again |
| Expected button is absent | Depth or selector scope is too narrow | Remove \`--depth\` or widen the scoped region |
| Control appears without a useful name | Application accessibility defect | Confirm in the DOM/accessibility tools and fix the product's semantic labeling |
| Snapshot is extremely large | Whole-page output includes unrelated shell content | Scope to the relevant selector/ref and use a sensible depth |
| Several identical names appear | Context is ambiguous | Inspect parent regions or use a reviewed role/test-id locator |
| Screenshot shows a control that snapshot omits | Canvas/custom widget or missing semantics | Prefer fixing semantics; use vision mode only when the UI genuinely requires coordinates |
| Ref works in one terminal but not another | Commands target different sessions | Name the session explicitly and verify active sessions |
| Snapshot does not show a background update | File is a past observation | Run \`playwright-cli snapshot\` again after the external change |
| Commands stop after a modal action | A browser dialog is blocking | Handle the reported dialog, then re-snapshot |

If a missing element is safety-critical, do not fall back immediately to arbitrary \`eval\` code or a guessed coordinate. First remove snapshot limits, confirm the correct tab and session, inspect visual state, and determine whether the application has an accessibility defect. A fallback should be an explicit engineering decision, not an agent's silent escape hatch.

## Frequently Asked Questions

### Does every \`playwright-cli\` command create a snapshot?

The official model says commands return current page information and a snapshot link, making the latest command output the normal next observation. Use explicit \`playwright-cli snapshot\` when you need an on-demand, scoped, depth-limited, or named file.

### How long is an element ref valid?

It is valid within the state represented by its snapshot and may be invalidated when the page changes. Treat every navigation or mutation as a reason to use the newly returned snapshot. Do not assign a time duration such as "five minutes"; validity is about page state, not elapsed time.

### Are refs more reliable than CSS selectors?

For the immediate next action, Playwright recommends refs because they point to the exact element the agent just saw. For a maintained test that must rediscover an element on later runs, user-facing locators or explicit test ids are the appropriate durable contracts.

### Can I snapshot only one component?

Yes. The documented command accepts a CSS selector or an element ref as a scope, for example \`playwright-cli snapshot "#main"\` or \`playwright-cli snapshot e34\`. Ensure the scope does not hide outcome messages you need to verify.

### What does \`--depth\` do?

It limits tree depth to reduce nested output. It does not wait for more content or improve accessibility. A low depth can omit deeply nested targets, so remove the limit during diagnosis.

### Is a snapshot the same as a screenshot?

No. A snapshot is semantic YAML derived from the accessibility tree; a screenshot is a pixel image. Use both when a scenario requires semantic targeting and visual evidence.

### Can a snapshot prove my site is accessible?

No. It can expose useful roles, names, and structure and can reveal defects, but full accessibility assessment also needs automated rules, keyboard testing, visual checks, assistive-technology testing, and human judgment against applicable requirements.

### Why did the ref number change even though the label did not?

Refs are generated for a snapshot rather than assigned as permanent element identities. A re-render or different tree composition can produce a different number for the same user-facing control. Match intent from current semantics instead of comparing ref numbers.

### How do snapshots help debug a failed Playwright Test?

Run the test with \`npx playwright test --debug=cli\`, attach the dedicated CLI to the session name printed by the runner, and call \`playwright-cli snapshot\` on the paused state. The [debugging and trace guide](/blog/playwright-cli-debug-tests-traces-agents-guide-2026) covers that workflow without confusing live refs with post-run trace snapshots.

## Related Playwright CLI Guides

Start with [installing Playwright CLI](/blog/playwright-cli-install-quickstart-2026) if the executable or browser is not ready. Use the [complete Playwright CLI guide](/blog/playwright-cli-complete-guide-2026) for the full command landscape, and the [sessions, dashboard, and attach guide](/blog/playwright-cli-sessions-dashboard-attach-guide-2026) when refs appear to cross browser instances. For reusable agent instructions, explore the [QASkills directory](/skills) and the dedicated [Playwright CLI skill](/skills/Pramod/playwright-cli).

The authoritative behavior is documented in Playwright's official [snapshots guide](https://playwright.dev/agent-cli/snapshots), [agent quickstart](https://playwright.dev/agent-cli/quick-start), [capability map](https://playwright.dev/agent-cli/capabilities), and [release notes](https://playwright.dev/docs/release-notes). The operational rule is simple: observe the current semantic state, act through a target grounded in that observation, and verify the new state before continuing.`,
    },
  },
  {
    slug: 'playwright-cli-sessions-dashboard-attach-guide-2026',
    clusterId: 'playwright-cli',
    post: {
      title: 'Run Parallel Playwright CLI Sessions with PLAYWRIGHT_CLI_SESSION',
      description:
        'Run coding agents in isolated Playwright CLI browser sessions, monitor them in the dashboard, attach to existing browsers, and clean up state safely.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/playwright-cli.png',
      imageAlt: 'Named Playwright CLI browser sessions running in parallel with a visual dashboard',
      primaryKeyword: 'playwright cli parallel sessions',
      keywords: [
        'playwright cli parallel sessions',
        'PLAYWRIGHT_CLI_SESSION',
        'playwright cli named sessions',
        'playwright cli dashboard',
        'playwright-cli attach',
        'parallel browser agents',
        'playwright persistent profile',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-cli-complete-guide-2026',
      relatedSlugs: [
        'playwright-cli-complete-guide-2026',
        'playwright-cli-install-quickstart-2026',
        'playwright-cli-accessibility-snapshots-guide-2026',
        'playwright-cli-debug-tests-traces-agents-guide-2026',
      ],
      sources: [
        'https://playwright.dev/agent-cli/sessions',
        'https://playwright.dev/agent-cli/commands/attach',
        'https://playwright.dev/agent-cli/configuration',
        'https://playwright.dev/docs/release-notes',
      ],
      content: `Give every concurrent coding agent a unique \`PLAYWRIGHT_CLI_SESSION\` value before it starts. For example, launch one Claude Code process with \`PLAYWRIGHT_CLI_SESSION=admin claude .\` and another with \`PLAYWRIGHT_CLI_SESSION=buyer claude .\`. Every \`playwright-cli\` command from each agent then targets its own browser instance, including separate cookies, localStorage, navigation history, and console log. Use \`playwright-cli show\` to watch both sessions and \`playwright-cli list\` to verify their names.

That is the practical answer to parallel Playwright CLI sessions. Session names prevent agents from navigating, authenticating, or clicking in the same default browser. They do not isolate your application's backend data, make shared test accounts safe, or automatically persist login after a browser closes. This guide separates browser isolation, profile persistence, dashboard observation, and attachment so each is used for the problem it actually solves.

## Why the Default Session Fails Under Parallel Agents

The dedicated agent CLI maintains browser state across terminal calls. That continuity is essential: an agent can open a page, read a snapshot, fill a field, and click a ref in later commands. Without a session boundary, however, concurrent agents can share the default instance. Agent A may read a checkout snapshot just before Agent B navigates the page to account settings. Agent A's next ref is now stale or, worse, points into a state it did not intend to change.

Named sessions create separate browser instances. Playwright's official sessions guide says each session has its own cookies, localStorage, navigation history, and console log. The browser-level separation supports role-based exploration, simultaneous feature checks, and multiple autonomous agents on one workstation.

It is still possible for two isolated browsers to modify the same server-side customer, cart, or database row. Session isolation is not data isolation. Give parallel roles distinct test users and records, or design the scenario so shared backend state is intentional and synchronized.

## Set PLAYWRIGHT_CLI_SESSION Before Each Agent Starts

Playwright documents this environment form:

\`\`\`bash
PLAYWRIGHT_CLI_SESSION=todo-app claude .
\`\`\`

All \`playwright-cli\` commands in that agent process use the \`todo-app\` browser instance. The name should identify purpose rather than a human's name: \`admin-settings\`, \`buyer-checkout\`, \`anonymous-search\`, or a task identifier is easier to operate than \`agent-2\`.

For two Claude Code processes, start them from separate terminals with separate values:

\`\`\`bash
# Terminal A
PLAYWRIGHT_CLI_SESSION=admin-settings claude .

# Terminal B
PLAYWRIGHT_CLI_SESSION=buyer-checkout claude .
\`\`\`

For Codex or another compatible coding agent, put \`PLAYWRIGHT_CLI_SESSION\` in the environment inherited by that agent instead of inventing a Playwright agent-specific flag. The variable is consumed by \`playwright-cli\`; how a host agent process receives environment variables is a host configuration concern. Verify the result with \`playwright-cli list\` rather than assuming the launcher propagated it.

An agent prompt should reinforce the boundary: "Use only your assigned Playwright CLI session, do not close other sessions, and report the session name with artifacts." The environment variable supplies the default; explicit instructions prevent an agent from using global cleanup as a convenience.

## Environment Variable or Explicit -s?

Both mechanisms name a session, but they fit different operating patterns:

| Situation | Mechanism | Example | Why choose it |
|---|---|---|---|
| One agent process runs many CLI commands | Environment | \`PLAYWRIGHT_CLI_SESSION=buyer claude .\` | Removes repeated flags and keeps the whole agent on one browser |
| A human switches among sessions in one shell | Per-command option | \`playwright-cli -s=admin snapshot\` | Makes the target visible on each command |
| A one-off second browser is needed | Per-command option on open | \`playwright-cli -s=example open https://example.com --persistent\` | Creates or addresses a named browser without changing shell defaults |
| A browser launched elsewhere must be controlled | \`attach\` | \`playwright-cli attach --cdp=chrome -s=debug-session\` | Connects instead of launching a new browser |
| A human needs to observe all agents | Dashboard | \`playwright-cli show\` | Displays live sessions; it does not assign isolation |

The option can appear as \`-s=name\` in the official session examples. Release-note debugging output also shows the longer \`--session\` form. Follow the syntax printed by your installed \`playwright-cli --help\`, especially when operating a pinned older CLI release.

Do not set one global \`PLAYWRIGHT_CLI_SESSION\` value for an entire CI worker and then launch several agents that inherit it. That recreates the collision under a non-default name. Assign a unique value at each process boundary.

## Allocate Session Names Before Parallel Work

Treat session names as a small concurrency contract. The orchestrator, human lead, or parent workflow should allocate them before agents begin, record which role owns each name, and define who may close it. Agents should not derive a generic name such as \`test\` independently because two otherwise isolated tasks can choose the same value.

A practical naming scheme combines role and task scope, for example \`admin-billing-1042\` and \`member-billing-1042\`. Avoid putting access tokens, email addresses, or other secrets in the name because it appears in process environments, terminal output, lists, and the dashboard.

Verify routing at the start rather than after a collision:

\`\`\`bash
playwright-cli list
playwright-cli -s=admin-billing-1042 snapshot
playwright-cli -s=member-billing-1042 snapshot
\`\`\`

At first launch, a named session may not appear until that agent opens or attaches a browser. Use a simple readiness barrier: each worker opens its assigned non-production target, reports the session name and page title, and waits until the coordinator confirms all roles are distinct. Only then should destructive or order-dependent scenarios begin.

Artifact names need the same care. \`checkout.png\` from four sessions is ambiguous and may overwrite prior evidence in a shared directory. Include role and scenario in explicit screenshot filenames, then report which session produced each path. Session isolation protects browser state; unique artifact ownership protects the audit trail.

For a handoff, stop the original writer, tell the receiving agent the exact session name, and require a fresh snapshot. Do not let two agents alternate commands informally against one browser while both plan from private, outdated context.

## Build an Isolated Admin and User Workflow

You can also address roles explicitly without an agent launcher. The official session workflow uses separate names and separate state files:

\`\`\`bash
# Admin browser
playwright-cli -s=admin open https://app.example.com --persistent
playwright-cli -s=admin state-load admin-auth.json
playwright-cli -s=admin goto /admin/settings

# User browser
playwright-cli -s=user open https://app.example.com --persistent
playwright-cli -s=user state-load user-auth.json
playwright-cli -s=user goto /dashboard

# Observe both browsers
playwright-cli show
\`\`\`

This is browser-role isolation, not a complete authorization test by itself. The admin and user state files must contain the intended accounts, and the backend must enforce authorization. Add negative checks from the user browser and confirm server behavior rather than treating two different dashboards as proof.

State files contain authentication material. Keep them out of source control, scope accounts to non-production environments, and control artifact retention. A named session improves routing but does not make credentials non-sensitive.

## Choose the Right Profile Lifetime

Sessions and profiles are related but not synonymous. A session is the running browser identity addressed by a name. The profile determines how browser data survives.

| Profile mode | Command | Lifetime | Appropriate use |
|---|---|---|---|
| In-memory default | \`playwright-cli open https://example.com\` | Persists across commands, lost when browser closes | Clean exploratory tasks and most isolated agent runs |
| Persistent | \`playwright-cli open https://example.com --persistent\` | Saved to the documented platform cache and survives restart | Deliberate reusable login or extension state |
| Custom directory | \`playwright-cli open https://example.com --profile=./my-profile\` | Stored at the selected path | Controlled per-project profile ownership |
| Saved storage state | \`playwright-cli state-save auth-state.json\` | Explicit file loaded into a later session | Reviewable transfer of cookies/storage without reusing a whole profile |

Start parallel agents in the in-memory default unless persistence is a requirement. If several sessions use the same persistent profile or custom directory, they can reintroduce state coupling and file contention. Give each role an intentional profile location or, preferably, load distinct reviewed state into isolated sessions.

The default profile behavior also explains why closing a session loses an in-memory login. If that is unexpected, the fix is not to leave abandoned browsers running forever. Choose explicit persistence or save state, then define cleanup and credential rotation.

## Observe Parallel Sessions in the Dashboard

Run:

\`\`\`bash
playwright-cli show
\`\`\`

The dashboard displays a grid of active sessions with live screencasts, names, URLs, and titles. Selecting a session opens a detail view with tabs, navigation controls, and remote mouse/keyboard input. Playwright documents dashboard use for watching background agents, taking over for CAPTCHA or 2FA, and closing stale sessions or deleting data.

Observation is not ownership. A human intervention can change the state underneath an agent's latest snapshot. After manual takeover, tell the agent to obtain a fresh snapshot before continuing. The same rule applies when DevTools or another attached client changes the page.

Playwright 1.59 release notes add a related test-runner integration: setting \`PLAYWRIGHT_DASHBOARD=1\` makes \`@playwright/test\` browsers visible in the dashboard. That variable is not a replacement for \`PLAYWRIGHT_CLI_SESSION\`. The first exposes test browsers for observation; the second routes agent CLI commands to a named session.

## Manage Session Lifecycle Without Harming Other Agents

Use the documented management commands:

\`\`\`bash
playwright-cli list
playwright-cli -s=name close
playwright-cli -s=name delete-data
playwright-cli close-all
playwright-cli kill-all
\`\`\`

\`list\` is the first diagnostic. \`close\` ends one named browser. \`delete-data\` removes stored profile data for that name. \`close-all\` intentionally closes every browser controlled by the CLI. \`kill-all\` is the force option for unresponsive browsers.

In parallel work, default to targeted cleanup. An agent assigned \`buyer-checkout\` should close \`buyer-checkout\`, not call \`close-all\`. Reserve \`kill-all\` for an operator who has confirmed that disrupting every active session is acceptable. Global cleanup can destroy another agent's unsaved evidence or interrupt a paused test being debugged.

A useful task contract includes cleanup ownership: which session the agent may close, whether profile data should be deleted, and which artifacts must remain. That avoids both leaked browsers and overbroad cleanup.

## Attach Instead of Launching a New Browser

\`attach\` connects the CLI to an existing browser. It is appropriate when the browser was bound by Playwright, exposes a CDP endpoint, runs as a Playwright server, or must reuse an existing extension-enabled profile.

| Existing target | Official command | Use when |
|---|---|---|
| Chrome with remote debugging enabled | \`playwright-cli attach --cdp=chrome\` | You need a running Chrome by channel name |
| CDP URL | \`playwright-cli attach --cdp=http://localhost:9222\` | Chromium, Edge, Electron, or a service exposes a known endpoint |
| Playwright server | \`playwright-cli attach --endpoint=ws://localhost:3000\` | A remote Playwright endpoint owns the browser |
| Browser with Playwright Extension | \`playwright-cli attach --extension\` | You need existing tabs, SSO/2FA state, or installed extensions |
| Bound Playwright browser | \`playwright-cli attach my-session\` | Code used \`browser.bind('my-session', ...)\` and printed that name |

Attach creates a CLI session. Name it when the default would collide:

\`\`\`bash
playwright-cli attach --cdp=chrome -s=debug-session
playwright-cli -s=debug-session snapshot
playwright-cli -s=debug-session screenshot --filename=current-state.png
\`\`\`

Attaching does not create isolation inside the target browser. If you connect to a developer's daily Chrome, the CLI can see and modify that browser's tabs and authenticated state. Extension mode is convenient for SSO and 2FA precisely because it reuses sensitive state. Get explicit authorization, avoid production changes, and save only necessary artifacts.

## Bound Browsers in Playwright 1.61-Era Workflows

Playwright 1.59 introduced \`browser.bind()\` interoperability, which remains relevant with 1.61. A Playwright client can make a launched browser available to \`playwright-cli\`, MCP, or another client:

\`\`\`typescript
const { endpoint } = await browser.bind('my-session', {
  workspaceDir: '/my/project',
});
\`\`\`

The CLI connects by the published name and then addresses that session:

\`\`\`bash
playwright-cli attach my-session
playwright-cli -s=my-session snapshot
\`\`\`

Multiple clients can connect to a bound browser. That capability is collaboration, not concurrency control. Two writers can still interfere with the same page. Assign one actor as the driver, use other clients for observation or a coordinated handoff, and force a fresh snapshot after control changes.

## Secure CDP, Extension, and Remote Attachment

A CDP endpoint grants powerful browser control. Do not expose a remote-debugging port to an untrusted network. The official remote example uses an SSH tunnel before attaching to \`http://localhost:9222\`; keep the remote endpoint bound and protected according to your infrastructure policy.

Channel attachment requires remote debugging to be enabled in the target Chrome or Edge through \`chrome://inspect/#remote-debugging\`. If that setting is off, retrying the same attach command will not fix it. Extension attachment requires the Playwright Extension in the target profile. A Playwright server endpoint must be reachable and compatible.

Use separate non-production profiles for automation whenever possible. Existing-browser attachment should be an explicit exception for workflows that genuinely need installed extensions, a human-completed authentication step, or an already running remote browser.

## Common Mistakes

### Reusing one environment value for every agent

The variable only isolates agents when values differ. \`admin\` and \`buyer\` create boundaries; two processes inheriting \`shared\` collide in the same named session.

### Assuming sessions isolate backend data

Separate cookies do not create separate orders or database tenants. Provision distinct server-side test data for parallel scenarios.

### Sharing one persistent profile across session names

Different session labels cannot make a shared profile directory independent. Use isolated profiles or distinct state files.

### Using the dashboard as a session selector

\`show\` observes and controls sessions visually. Set \`PLAYWRIGHT_CLI_SESSION\` or \`-s\` to route agent commands.

### Continuing with old refs after human takeover

Manual dashboard input changes page state. The agent must snapshot again before using refs from its earlier observation.

### Calling close-all from one worker

Global cleanup interrupts every session. Close the assigned name unless an operator intentionally ends the whole pool.

### Attaching to a daily browser without consent

CDP and extension attachment can expose live accounts and tabs. Use an authorized automation profile and minimize retained evidence.

### Confusing PLAYWRIGHT_DASHBOARD with PLAYWRIGHT_CLI_SESSION

The dashboard variable exposes Playwright Test browsers for observation. The CLI session variable selects the named browser for agent commands.

## Troubleshooting Parallel Sessions and Attach

| Symptom | Likely cause | Corrective action |
|---|---|---|
| Two agents keep navigating the same page | They inherited the same or default session | Assign unique environment values before launching each agent and verify with \`list\` |
| A session is missing from \`list\` | Agent has not opened/attached a browser, or environment did not propagate | Confirm the agent shell sees the variable and run an initial \`open\` |
| Login disappears after close | Session used the in-memory default | Use explicit persistence or save/load reviewed storage state |
| Roles see each other's authentication | Same profile/state file was reused | Separate profile directories and credentials; delete contaminated data |
| Dashboard shows a session but refs fail | Human or another client changed state | Capture a new snapshot in the named session |
| \`attach --cdp=chrome\` cannot connect | Remote debugging is disabled or wrong channel | Enable it in the target browser and confirm the documented channel |
| CDP URL attach times out | Endpoint is unreachable or tunnel is absent | Validate local reachability and establish the authorized SSH tunnel |
| Extension attach fails | Extension missing from target profile or wrong channel | Install/enable the Playwright Extension and specify the correct channel |
| A browser will not close normally | Process is unresponsive | Try targeted close first; use \`kill-all\` only after assessing all sessions |

When diagnosing, keep the axes separate: session routing, profile data, target browser connectivity, and host-agent environment. Reinstalling the CLI will not fix two agents assigned the same name, and deleting profile data will not enable a closed CDP port.

## Frequently Asked Questions

### What does PLAYWRIGHT_CLI_SESSION do?

It selects the named browser instance used by \`playwright-cli\` commands in that process environment. Playwright documents it as a way to configure a coding agent so all of its commands use one session.

### Can two agents use the same session safely?

Only if their actions are deliberately coordinated and one is not planning from stale state. For normal parallel work, give each agent a unique session. Shared observation through the dashboard or a bound browser does not make concurrent writes safe.

### Does each session get separate cookies and localStorage?

Yes. The official sessions guide states that each named session has its own browser instance, cookies, localStorage, navigation history, and console log. Backend accounts and records still need independent test data.

### Should parallel agents use persistent profiles?

Not by default. In-memory sessions reduce cross-run contamination. Use persistence when restart survival is a requirement, and assign profiles so agents do not share the same directory accidentally.

### How do I see every running agent browser?

Run \`playwright-cli show\` for the visual dashboard and \`playwright-cli list\` for terminal inventory. The dashboard supports live observation and manual takeover; list is better for scripts and routing diagnosis.

### What is the difference between attach and a named session?

A named session identifies a browser instance to CLI commands. \`attach\` is one way to create that session by connecting to a browser launched elsewhere. A normal \`open\` creates a new browser instead.

### Can I attach to Chrome where I am already logged in?

Yes, using documented CDP channel or extension modes when remote debugging or the extension is configured. This exposes sensitive browser state, so use explicit authorization and preferably a dedicated profile rather than a daily personal browser.

### How do I debug a Playwright Test in a named CLI session?

Run the test with \`npx playwright test --debug=cli\`, read the generated session name from its output, and attach using that exact name. Do not force a preselected parallel session name onto the paused test. Follow the [agent test debugging guide](/blog/playwright-cli-debug-tests-traces-agents-guide-2026) for the complete sequence.

### When should I use close-all or kill-all?

Use \`close-all\` only when intentionally ending every CLI browser. Use \`kill-all\` for unresponsive processes after checking the impact. Parallel agents should normally close only their assigned session.

## Related Guides and Official References

Install the executable and agent guidance with [Playwright CLI skills for Codex and Claude Code](/blog/playwright-cli-install-quickstart-2026), and learn current refs in the [accessibility snapshots guide](/blog/playwright-cli-accessibility-snapshots-guide-2026). The [Playwright CLI complete guide](/blog/playwright-cli-complete-guide-2026) maps the wider interface. For reusable agent policy, browse [QA skills](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli).

The commands and lifecycle rules above come from Playwright's official [sessions and dashboard](https://playwright.dev/agent-cli/sessions), [attach](https://playwright.dev/agent-cli/commands/attach), [configuration](https://playwright.dev/agent-cli/configuration), and [release notes](https://playwright.dev/docs/release-notes). The durable operating rule is to give each agent a unique session, each role intentional data, every attached browser an owner, and every handoff a fresh observation.`,
    },
  },
  {
    slug: 'playwright-cli-debug-tests-traces-agents-guide-2026',
    clusterId: 'playwright-cli',
    post: {
      title: 'Debug Playwright Tests with --debug=cli and Agent Trace Commands',
      description:
        'Pause a Playwright test for agent attachment, inspect it with playwright-cli, analyze trace.zip from the terminal, and record separate agent session traces.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-cli.png',
      imageAlt:
        'Playwright CLI attached to a paused test with trace evidence and debugging controls',
      primaryKeyword: 'playwright debug cli',
      keywords: [
        'playwright debug cli',
        'playwright --debug=cli',
        'playwright agent debugging',
        'playwright trace commands',
        'npx playwright trace',
        'playwright-cli tracing-start',
        'debug playwright test with agent',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-cli-complete-guide-2026',
      relatedSlugs: [
        'playwright-cli-complete-guide-2026',
        'playwright-cli-install-quickstart-2026',
        'playwright-cli-accessibility-snapshots-guide-2026',
        'playwright-cli-sessions-dashboard-attach-guide-2026',
      ],
      sources: [
        'https://playwright.dev/agent-cli/commands/test-debugging',
        'https://playwright.dev/agent-cli/commands/tracing',
        'https://playwright.dev/docs/test-cli',
        'https://playwright.dev/docs/release-notes',
      ],
      content: `Run a failing test with \`npx playwright test tests/example.spec.ts --debug=cli\`, copy the session name printed by the paused runner, and connect with \`playwright-cli attach <session-name>\`. Then use \`snapshot\`, \`console error\`, \`network\`, \`step-over\`, and \`resume\` against the live test. For a completed run, analyze its \`trace.zip\` with \`npx playwright trace open\`, \`actions\`, \`action\`, \`snapshot\`, and \`close\`. These are distinct live and post-run workflows.

There is a third trace path for an ordinary agent-controlled browser: \`playwright-cli tracing-start\` and \`tracing-stop\`. Keeping those three surfaces separate is the main requirement for correct 1.61-era debugging. This guide shows when each one applies, how to preserve evidence, and how an agent should turn observations into a minimal, reviewable fix rather than guessing from the final error line.

## Four Similar-Looking Tools, Four Different Jobs

Playwright now exposes several terminal debugging paths. The word "trace" appears in more than one, and \`--debug=cli\` deliberately bridges two executables. Use this reference before choosing commands:

| Goal | Start command | Follow-up interface | Best for |
|---|---|---|---|
| Inspect a test while it is paused | \`npx playwright test --debug=cli\` | \`playwright-cli attach <printed-name>\` plus live commands | Current DOM, console, network, stepping, and breakpoints |
| Analyze a saved test trace without a GUI | \`npx playwright trace open path/to/trace.zip\` | \`npx playwright trace actions/action/snapshot/close\` | Agent-friendly postmortem analysis |
| Record an ad hoc agent browser flow | \`playwright-cli tracing-start\` | Agent CLI actions, then \`tracing-stop\` | Evidence for a manual or autonomous browser scenario |
| Explore a saved trace visually | \`npx playwright show-trace path/to/trace.zip\` | Trace Viewer UI | Human timeline, DOM, screenshot, network, and console review |

Only the first row uses \`--debug=cli\`. Only the second uses the newer \`npx playwright trace\` command family for terminal analysis. The third records the dedicated CLI's current browser session. The fourth opens a visual viewer. A trace archive can be useful in more than one workflow, but the commands are not aliases.

The dedicated \`playwright-cli\` package must be installed for live attachment and ad hoc session commands. Playwright Test must be installed in the test project for \`npx playwright test\`, \`npx playwright trace\`, and \`show-trace\`. Follow [the Playwright CLI skills setup](/blog/playwright-cli-install-quickstart-2026) if the agent executable is missing.

## Start a Test with --debug=cli

Run the narrowest failing test you can identify:

\`\`\`bash
npx playwright test tests/checkout.spec.ts --debug=cli
\`\`\`

The runner pauses at the start and prints debugging instructions with a generated session name. The official examples show names such as \`playwright-test-1\` and \`tw-87b59e\`; your output is authoritative. Do not hard-code either example in a script or assume the next run will reuse it.

Keep that runner process alive. In another terminal, attach using the exact value it printed:

\`\`\`bash
playwright-cli attach tw-87b59e
playwright-cli --session=tw-87b59e snapshot
playwright-cli --session=tw-87b59e console error
playwright-cli --session=tw-87b59e screenshot --filename=paused-test.png
\`\`\`

The release notes show the long \`--session\` form in generated instructions; the agent CLI documentation also uses a default attached session and the \`-s\` shorthand. Copy the command form printed by your installed version when possible. The generated name is more important than choosing short or long option spelling.

At this point, the browser belongs to the paused test. You are not launching an independent page and replaying an approximation. Fixtures, storage, routes, test data, browser project, and application state created by the test remain available. That fidelity is why live attachment is valuable for failures that disappear when reproduced manually.

## Inspect Before You Resume

Start with non-mutating observations:

\`\`\`bash
playwright-cli snapshot
playwright-cli console error
playwright-cli eval "() => document.title"
playwright-cli screenshot --filename=debug-state.png
\`\`\`

The snapshot exposes the paused page's accessibility tree and current refs. Console filtering can reveal uncaught application errors. A narrow \`eval\` can inspect a property that snapshots do not represent. A screenshot records visual state. Add \`playwright-cli network\` when the failure may depend on a request, response, redirect, or missing resource.

Prefer observation before mutation. Clicking a control, editing storage, or evaluating code that changes the page can destroy the evidence you are trying to explain. If you deliberately perturb state to test a hypothesis, label that evidence as an experiment rather than the original failure.

Refs in the paused snapshot are still short-lived. After stepping a navigation or action, read the new snapshot before using another ref. The [accessibility snapshots and refs guide](/blog/playwright-cli-accessibility-snapshots-guide-2026) explains why a ref copied before \`step-over\` may no longer identify a target afterward.

## Control Test Execution

The agent debugger documents three execution controls:

\`\`\`bash
playwright-cli step-over
playwright-cli resume
playwright-cli pause-at tests/checkout.spec.ts:42
\`\`\`

\`step-over\` advances to the next action, making it the safest way to correlate one test operation with one change in page, network, or console state. \`resume\` continues execution, so use it when you have a breakpoint or are ready for the test to proceed. \`pause-at\` sets a source location where execution should pause.

A disciplined loop is:

1. Snapshot and inspect console/network at the current pause.
2. Record a hypothesis about the next action.
3. Run \`step-over\`.
4. Compare page state and diagnostics.
5. Repeat until the first divergence from expected behavior.
6. Capture evidence before experimenting with a fix.

Do not step through every line simply because the controls exist. If the failure is an assertion against a missing success message, focus on the action that should create it, the triggering request, and the resulting page state. The goal is the earliest causal divergence, not the largest artifact set.

## Record a Trace During Live Agent Debugging

The official flaky-test workflow starts a trace after attachment, steps the test, and then stops recording:

\`\`\`bash
playwright-cli tracing-start
playwright-cli resume
playwright-cli snapshot
playwright-cli console
playwright-cli network
playwright-cli screenshot --filename=before-failure.png
playwright-cli tracing-stop
\`\`\`

This records the attached browser activity observed during that interval. Start before the actions you need and stop while the session is still available. A trace that begins after the failure cannot recover earlier DOM snapshots or network activity that were never recorded.

The live debugger and trace complement each other. Live commands answer an immediate question and can control execution. The saved trace preserves a timeline for later review. Always retain the original test failure output as well, because a debugging run may have different timing from the failing CI attempt.

## Generate a Playwright Test Trace for Postmortem Work

If a failure already happened, a trace from that exact attempt is usually stronger evidence than rerunning immediately. Playwright Test accepts the documented \`--trace <mode>\` option. For a focused reproduction, force tracing on:

\`\`\`bash
npx playwright test tests/checkout.spec.ts --trace=on
\`\`\`

The test CLI supports modes including \`on\`, \`off\`, \`on-first-retry\`, \`on-all-retries\`, \`retain-on-failure\`, \`retain-on-first-failure\`, and \`retain-on-failure-and-retries\`. A CI policy usually prefers a failure/retry retention mode to avoid recording every successful test. A local one-test reproduction can use \`on\` for certainty.

Read the runner output or report to locate the actual \`trace.zip\`. Do not assume every project writes the same directory; output paths can vary by project, test, retry, and configuration. Copy the archive before a cleanup step removes test results.

Playwright 1.61 traces and HAR recordings include WebSocket requests, which matters for failures in live updates, collaborative applications, and subscription-driven UIs. That improves evidence but can also increase artifact sensitivity and size.

## Analyze trace.zip from the Terminal

Playwright's release notes document an agent-oriented trace command sequence:

\`\`\`bash
npx playwright trace open test-results/example-has-title-chromium/trace.zip
npx playwright trace actions --grep="expect"
npx playwright trace action 9
npx playwright trace snapshot 9 --name after
npx playwright trace close
\`\`\`

\`open\` selects and summarizes the archive. \`actions\` lists its actions, and \`--grep\` narrows that list. \`action 9\` displays details for the numbered action, including its error and available snapshots. \`snapshot 9 --name after\` prints the named before/after state when available. \`close\` ends the trace analysis session.

The number \`9\` is sample output from the official release notes, not a universal failure index. Run \`actions\`, find the relevant row in your trace, and use its number. An assertion may have before and after snapshots, while another operation may expose a different set. Follow the availability reported by \`action <number>\`.

A useful narrowing strategy is:

- Grep for \`expect\` to locate failing assertions.
- Inspect the failed assertion's expected and received values.
- Read its before and after snapshots.
- Move backward to the action that should have produced the expected state.
- Compare timing and network evidence in Trace Viewer when terminal output is insufficient.

Terminal analysis is especially useful for coding agents because it returns compact text rather than requiring visual navigation through a large trace. It does not make the GUI obsolete. Open the same archive with \`npx playwright show-trace\` when layout, screenshots, request bodies, timing bars, or source context require human inspection.

## Record an Ordinary playwright-cli Session

Not every failure begins in a Playwright Test file. For exploratory automation or an agent verification flow, record the dedicated CLI session directly:

\`\`\`bash
playwright-cli tracing-start
playwright-cli goto https://demo.playwright.dev/todomvc/
playwright-cli type "Trace this todo"
playwright-cli press Enter
playwright-cli screenshot --filename=trace-result.png
playwright-cli tracing-stop
\`\`\`

The official tracing guide reports the default archive at \`.playwright-cli/trace.zip\`. View it with:

\`\`\`bash
npx playwright show-trace .playwright-cli/trace.zip
\`\`\`

This trace describes agent CLI actions, not a hidden Playwright Test run. It will not contain test fixtures, assertion metadata, or steps that never occurred in that browser session. Name and store evidence so reviewers know whether an archive came from a CI test attempt, a live attached debugging interval, or a manual agent reproduction.

## A Practical Failure Triage Sequence

Use evidence cost and fidelity to choose the path:

1. Preserve the original error, report, screenshot, video, and trace from the failing attempt.
2. If a trace exists, use \`npx playwright trace\` for compact postmortem analysis before rerunning.
3. If the trace lacks the decisive state, rerun only the affected test with \`--debug=cli\`.
4. Attach using the printed session name and inspect before resuming.
5. Step to the earliest action where actual state diverges.
6. Record a narrow live trace if the transition needs a shareable timeline.
7. Make the smallest code or product change supported by evidence.
8. Run the test normally and under its relevant project/retry conditions.

This order avoids destroying a rare flaky failure with a clean local rerun. It also keeps the agent from editing test waits or selectors before establishing whether the product, test, environment, or data is wrong.

## Compare Failing and Passing Attempts

A flaky test often needs two timelines: the failing attempt and a nearby passing retry under the same project and data conditions. Compare the earliest action whose duration, request outcome, console state, or after-snapshot differs. The final assertion may be identical in both traces while the real divergence occurred several actions earlier.

Keep the comparison controlled. Confirm browser project, test parameters, retry index, worker context, application revision, and environment before attributing a difference to timing. A trace from local Chromium and one from a failing CI WebKit project can suggest hypotheses, but it is not an isolated experiment.

Playwright's failure-and-retry trace modes are useful because they can retain evidence around the attempts that matter. Still, artifact presence does not prove causality. Build a short evidence table with the action, failing observation, passing observation, and proposed mechanism. Then change one condition and rerun. This prevents an agent from selecting the most visually obvious difference while ignoring a data collision or upstream request failure.

If only the failing trace exists, preserve it before generating new attempts. A passing rerun is comparison evidence, not a replacement for the original failure. If only a passing trace exists, do not invent the missing state; reproduce under matching conditions or report that the root cause remains unconfirmed.

## From Evidence to a Safe Fix

Classify the cause before changing code:

| Evidence | Likely class | Better response than adding a delay |
|---|---|---|
| Snapshot shows the expected control under a different accessible name | Locator or product accessibility contract changed | Confirm intended UI, then update product semantics or locator |
| Network shows a failed API response | Product, environment, or test data issue | Fix request/data/environment and assert the meaningful outcome |
| Action starts before prerequisite UI is ready | Missing web-first condition | Wait through a locator assertion tied to user-visible readiness |
| Test passes alone but trace shows shared account state | Isolation defect | Provision unique data or reset state; do not increase timeout |
| Console shows an uncaught exception before assertion | Product defect | Fix the application error and retain a regression test |
| Before/after snapshots show click had no state effect | Wrong target, overlay, or disabled control | Improve targeting and verify actionability rather than force-clicking |

An agent should report the evidence chain: failing action, relevant state before, observed event, state after, root-cause hypothesis, and validation. "Increased timeout and it passed" is not a diagnosis unless evidence proves the operation legitimately needs the new budget.

## Common Mistakes

### Treating --debug=cli as an agent browser launcher

It is an option on \`npx playwright test\`. It pauses a test and prints a target for the separate \`playwright-cli\` executable to attach to.

### Hard-coding the generated session name

Read each run's output. Names in documentation are examples and can change between attempts.

### Letting the runner process exit before attachment

The paused test must remain alive. Use another terminal or an agent process to connect while the original command waits.

### Resuming before collecting original state

Once execution continues, the page and evidence may change. Snapshot, console, network, and screenshot first.

### Reusing refs after step-over

The test action may navigate or re-render. Read the refreshed snapshot before selecting the next ref.

### Calling npx playwright trace without a trace archive

The terminal analyzer reads a saved \`trace.zip\`. Enable an appropriate trace mode before the run or retrieve the artifact from CI.

### Confusing trace analysis with Trace Viewer

\`npx playwright trace\` exposes agent-friendly terminal subcommands. \`npx playwright show-trace\` opens the visual viewer.

### Recording the wrong interval

Starting \`tracing-start\` after the failure cannot reconstruct previous actions. Define the suspect transition and start before it.

### Publishing secrets in trace artifacts

Traces can contain DOM, network, console, and source information. Treat them as sensitive test artifacts, redact where appropriate, and apply retention controls.

## Troubleshooting --debug=cli and Trace Commands

| Symptom | Likely cause | Next check |
|---|---|---|
| \`--debug=cli\` is rejected | Playwright Test version is too old or wrong executable is running | Confirm project Playwright version and \`npx playwright test --help\` |
| Test waits but no agent is attached | Generated session name was missed | Read the runner's debugging instructions and copy the exact attach command |
| Attach says target not found | Runner exited, name is wrong, or target belongs elsewhere | Confirm the paused process is alive and use current output |
| Snapshot is unrelated to the failure | Wrong CLI session is active | Address the generated debug session explicitly |
| Step command has no target | CLI is not attached to a paused test | Attach first; ordinary sessions do not expose test debugger controls |
| No \`trace.zip\` exists | Tracing was not enabled or artifact was cleaned | Use a supported trace mode and preserve test results |
| \`trace action 9\` is invalid | Example index was copied | Run \`trace actions\` and choose an index from your archive |
| Requested before/after snapshot is unavailable | That action did not record the named snapshot | Inspect \`trace action <n>\` for available names |
| Debug run passes while CI failed | Timing, data, project, or environment differs | Analyze original CI trace and reproduce the same conditions |
| Trace is too sensitive to share | DOM/network/source contains protected data | Restrict access, redact or reproduce with safe data, and enforce retention |

If commands differ from this guide, use help from the installed Playwright Test and agent CLI versions. Do not blend a latest global \`playwright-cli\` with an old project runner and assume every newer bridge command is available.

## Frequently Asked Questions

### What exactly does --debug=cli do?

It runs Playwright Test in CLI debugger mode, pauses execution, and prints a session name that \`playwright-cli\` can attach to. It is designed for agentic debugging without requiring the Inspector GUI.

### Is --debug=cli the same as --debug?

No. The traditional \`--debug\` path defaults to Playwright Inspector. The \`cli\` mode exposes the paused test to the dedicated agent CLI. Use the explicit mode when an agent will debug from terminal commands.

### Do I run attach in the same terminal?

Use another terminal or agent process so the paused test command remains running. Attach to the exact name printed by that process.

### When should I use step-over instead of resume?

Use \`step-over\` when isolating the first bad transition and comparing state action by action. Use \`resume\` when you have collected current evidence and want execution to continue, often toward a breakpoint.

### What is npx playwright trace?

It is the terminal trace-analysis command family documented in Playwright's release notes. After opening a trace archive, an agent can list actions, inspect one action, print its available snapshot, and close the analysis session.

### How is npx playwright trace different from tracing-start?

\`npx playwright trace\` reads an existing Playwright Test trace. \`playwright-cli tracing-start\` begins recording the current agent CLI browser session. One analyzes; the other records.

### Can I still use Trace Viewer?

Yes. Run \`npx playwright show-trace path/to/trace.zip\` for visual timeline analysis. Terminal commands are efficient for agents; the viewer is often better for humans inspecting screenshots, timing, DOM, and network detail.

### Should I enable trace=on for the whole CI suite?

Usually choose a failure or retry retention mode to control storage and sensitive data. Use \`on\` for a focused reproduction when recording every attempt is intentional. Match policy to flake frequency, artifact cost, and compliance requirements.

### Can the debugger change the paused page?

Yes. CLI interactions and mutating \`eval\` calls can alter state. Observe first, label experiments, and rerun from a clean fixture before treating modified-state behavior as the original failure.

### Does Playwright 1.61 add anything relevant to traces?

Yes. The 1.61 release notes say HAR and trace recordings include WebSocket requests. The CLI debugger and terminal trace-analysis workflow were introduced earlier and remain part of the current workflow.

## Related Guides and Official Sources

Use the [complete Playwright CLI guide](/blog/playwright-cli-complete-guide-2026) for the wider agent command model, [install Playwright CLI skills](/blog/playwright-cli-install-quickstart-2026) before attaching, and review [snapshot ref lifetime](/blog/playwright-cli-accessibility-snapshots-guide-2026) before stepping. For concurrent debugging without browser collisions, follow the [parallel sessions guide](/blog/playwright-cli-sessions-dashboard-attach-guide-2026). Browse [QA skills](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli) for reusable agent workflows.

The exact commands are documented by Playwright in the official [test debugging](https://playwright.dev/agent-cli/commands/test-debugging), [agent session tracing](https://playwright.dev/agent-cli/commands/tracing), [test CLI](https://playwright.dev/docs/test-cli), and [release notes](https://playwright.dev/docs/release-notes). Preserve the original artifact, choose the live or postmortem surface deliberately, and let the earliest supported divergence drive the fix.`,
    },
  },
];
