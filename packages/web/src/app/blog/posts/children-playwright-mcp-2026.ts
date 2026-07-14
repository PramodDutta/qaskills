import type { SeoClusterArticle } from './seo-cluster-article';

export const playwrightMcpChildren2026: SeoClusterArticle[] = [
  {
    slug: 'playwright-mcp-json-configuration-reference',
    clusterId: 'playwright-mcp',
    post: {
      title: 'Playwright MCP Server Configuration Reference for QA Teams',
      description:
        'Configure Playwright MCP for QA with documented CLI flags, environment variables, JSON schema, capabilities, browsers, timeouts, output, and network controls.',
      date: '2026-06-03',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-mcp.png',
      imageAlt:
        'Configuration layers connecting a QA team, an MCP client, and a Playwright-controlled browser',
      primaryKeyword: 'playwright mcp configuration',
      keywords: [
        'playwright mcp configuration',
        'playwright mcp server configuration',
        '@playwright/mcp options',
        'playwright mcp config file',
        'playwright mcp environment variables',
        'playwright mcp capabilities',
        'playwright mcp headless configuration',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-mcp-browser-automation-guide',
      relatedSlugs: [
        'playwright-mcp-browser-automation-guide',
        'playwright-mcp-testing-capability-guide-2026',
        'playwright-mcp-profile-modes-guide-2026',
        'playwright-mcp-security-best-practices-2026',
      ],
      sources: [
        'https://playwright.dev/mcp/configuration/options',
        'https://playwright.dev/mcp/capabilities',
        'https://playwright.dev/mcp/configuration/user-profile',
        'https://github.com/microsoft/playwright-mcp#configuration',
        'https://github.com/microsoft/playwright-mcp#configuration-file',
      ],
      content: `Playwright MCP configuration has three supported layers: arguments in the MCP client's \`args\` array, \`PLAYWRIGHT_MCP_*\` environment variables, and an advanced JSON file passed with \`--config\`. Start with \`npx @playwright/mcp@latest\`, add only the browser, profile, capability, timeout, output, and network settings your QA job needs, then verify the resolved setup. Headed Chrome, a persistent profile, core tools, 5-second actions, and 60-second navigation are the important documented defaults to review before a team standardizes its configuration.

For the complete browser workflow, begin with the [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide). The adjacent decisions are covered in the [testing capability guide](/blog/playwright-mcp-testing-capability-guide-2026), [profile mode guide](/blog/playwright-mcp-profile-modes-guide-2026), and [security guide](/blog/playwright-mcp-security-best-practices-2026). Teams building reusable agent instructions can browse [/skills](/skills), use the author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli), and compare the MCP workflow with the existing [Playwright test agents in Claude Code article](/blog/playwright-test-agents-claude-code).

## Build a Configuration from the Job Backward

A useful configuration begins with a test job, not with a copy of every available switch. A developer watching an exploratory session may want headed Chrome and a persistent login. A CI-like investigation may want headless Chromium, an isolated profile, explicit timeouts, a fixed viewport, and a dedicated artifact directory. A form-validation agent may need the \`testing\` capability but not coordinate-based vision, PDF export, storage mutation, or DevTools recording.

The official [Playwright MCP configuration reference](https://playwright.dev/mcp/configuration/options) separates browser launch, server transport, state, network, output, and code-generation controls. The [capability reference](https://playwright.dev/mcp/capabilities) adds another important rule: core browser tools are always enabled, while specialized groups are opt-in. That makes a short configuration preferable to an indiscriminate "enable everything" setup. Every extra capability adds tool schemas to the model's context and expands what the agent can ask the server to do.

Write down these six decisions before choosing syntax:

1. Which browser or channel represents the target: Chrome, Firefox, WebKit, or Edge?
2. Must a human see the browser, or should it run headless?
3. Should authentication survive server restarts, start clean, or come from an existing browser tab?
4. Which non-core capabilities are required for the task?
5. Where should screenshots, logs, videos, and saved sessions go?
6. Which origins, files, permissions, proxy, and transport boundaries apply?

Those answers produce a configuration that another QA engineer can review. They also make failures diagnosable. If one giant configuration changes profile mode, browser engine, proxy, origin policy, and timeout together, a failure provides little evidence about which choice caused it.

## Choose the Right Configuration Surface

Playwright exposes the same major controls through several surfaces, but the surfaces solve different operational problems.

| Surface | Best use | Example | Review concern |
|---|---|---|---|
| MCP client \`args\` | Small, visible, client-specific setup | \`--headless\`, \`--browser=firefox\` | Long arrays become hard to compare and explain |
| MCP client \`env\` | Deployment-supplied values or client config that favors environment variables | \`PLAYWRIGHT_MCP_HEADLESS=true\` | Secret and environment handling depends on the MCP client |
| Playwright MCP JSON file | Structured browser, server, timeout, network, and capability policy | \`--config ./playwright-mcp.config.json\` | The file path and file contents must travel together |
| Server plus URL client entry | A separately managed local or remote HTTP process | \`http://localhost:8931/mcp\` | Binding, authorization, and network exposure need explicit review |

Use one dominant surface for team policy. A compact \`args\` array is easy to paste into an MCP client. A JSON file is easier to review once nested settings such as \`contextOptions\`, \`network.allowedOrigins\`, or separate action, navigation, and expectation timeouts appear. Environment variables are useful when the execution environment owns a value, but they are less self-explanatory in a code review.

The official docs provide both CLI option names and corresponding environment variable names. They do not make an unlabeled mixture easier to operate. If a team combines a config file, arguments, and environment values, document why each layer exists and verify the effective result instead of relying on memory about precedence.

## Start with a Minimal MCP Client Entry

The standard server entry has only a command and package argument:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
\`\`\`

That baseline launches the documented default browser in headed mode and exposes core tools. It is appropriate for confirming that the MCP client can start the package, list tools, navigate, snapshot, and interact. Do not add a proxy, custom executable, storage state, unrestricted file access, or HTTP listener merely to prove installation.

For a repeatable headless QA session, extend the same entry deliberately:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headless",
        "--browser=firefox",
        "--viewport-size=1440x900",
        "--caps=testing",
        "--timeout-action=7000",
        "--timeout-navigation=60000",
        "--console-level=warning",
        "--output-dir=./artifacts/playwright-mcp"
      ]
    }
  }
}
\`\`\`

Every setting in this example has a documented role. \`--headless\` changes visibility, \`--browser=firefox\` changes the engine, \`--viewport-size\` fixes the browser viewport, \`--caps=testing\` exposes assertion and locator-generation tools, the timeout flags bound actions and navigation separately, \`--console-level=warning\` filters returned console messages by severity, and \`--output-dir\` chooses where output files are saved.

This is a reference configuration, not a universal recommendation. If production users run Chrome, changing the smoke job to Firefox may reduce representativeness. If a test intentionally waits for a slow local build, seven seconds may be too short. If a human is reviewing an exploratory flow, removing \`--headless\` may be more useful than preserving unattended defaults.

## Select Browser, Display, Device, and Viewport

The browser flag accepts \`chrome\`, \`firefox\`, \`webkit\`, or \`msedge\` in the current [configuration options](https://playwright.dev/mcp/configuration/options). Chrome is the documented default. The JSON config uses Playwright browser names \`chromium\`, \`firefox\`, or \`webkit\`, so do not blindly copy a CLI channel value into \`browser.browserName\`.

Playwright MCP is headed by default. That is useful locally because a QA engineer can observe navigation, consent screens, dialogs, and accidental actions. Add \`--headless\` when a display is unavailable or human observation is not part of the job. Headless does not automatically make a workflow isolated, restricted, or suitable for production exposure; it only changes how the browser is displayed.

Use \`--device="iPhone 15"\` when a named device profile is the real requirement. Use \`--viewport-size=1280x720\` when only viewport dimensions need to be stable. A viewport is not a complete device profile: it does not by itself express every property bundled into device emulation. The current docs also expose \`--mobile\` for a generic mobile profile and state that it cannot be combined with \`--device\`. Pick one model rather than layering contradictory emulation settings.

Corporate and lab networks can use \`--proxy-server\` with \`--proxy-bypass\`. Treat the bypass list as routing configuration, not as a destination authorization policy. The separate origin controls are discussed in the security article because Playwright explicitly warns that those controls do not form a security boundary.

## Enable Capabilities by Test Purpose

The default \`core\` capability covers navigation, snapshots, common interaction, form input, screenshots, console and network inspection, tabs, waiting, page evaluation, and browser closure. The current [capability table](https://playwright.dev/mcp/capabilities) documents these additional groups:

- \`network\` for request routing, route inspection, unroute, and online/offline state.
- \`storage\` for cookies, localStorage, sessionStorage, and storage-state save or restore.
- \`testing\` for four focused verification tools and locator generation.
- \`vision\` for coordinate-based mouse operations with a vision-capable model.
- \`pdf\` for PDF export.
- \`devtools\` for tracing, video, chapter markers, and resuming paused execution.
- \`config\` for resolved-configuration introspection through \`browser_get_config\`.

Capabilities are comma-separated in \`--caps\`. A testing flow that also restores authentication can use \`--caps=testing,storage\`. A debugging flow can use \`--caps=devtools\`. Avoid enabling vision merely because screenshots exist: ordinary screenshots and accessibility snapshots are part of core operation, while the vision capability adds coordinate-driven mouse tools.

The \`config\` capability is particularly useful during rollout. Enable it temporarily, call \`browser_get_config\`, and compare the resolved values with the team's intended browser, profile, output, and network policy. This is stronger evidence than inspecting one file while an environment variable or client-specific argument may also be present.

## Move Advanced Policy into a JSON File

Once nested values appear, use the documented \`--config\` entry point. The MCP client remains small:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--config",
        "./playwright-mcp.config.json"
      ]
    }
  }
}
\`\`\`

The referenced file can express the same policy structurally:

\`\`\`json
{
  "browser": {
    "browserName": "chromium",
    "isolated": true,
    "launchOptions": {
      "headless": true
    },
    "contextOptions": {
      "viewport": {
        "width": 1440,
        "height": 900
      }
    }
  },
  "capabilities": ["core", "testing"],
  "outputDir": "./artifacts/playwright-mcp",
  "console": {
    "level": "warning"
  },
  "network": {
    "allowedOrigins": [
      "https://qa.example.com",
      "https://identity.example.com",
      "http://localhost:*"
    ]
  },
  "timeouts": {
    "action": 7000,
    "navigation": 60000,
    "expect": 5000
  },
  "testIdAttribute": "data-testid"
}
\`\`\`

The JSON schema allows normal Playwright \`launchOptions\` and \`contextOptions\`, so it is the right surface for structured launch and context behavior. It also distinguishes three timeout categories. An action timeout bounds operations such as interactions, a navigation timeout covers page navigation, and an expectation timeout applies to testing assertions. Increasing all three to an arbitrarily large number hides whether the application, environment, or locator is actually unhealthy.

The origin entries in a config file are arrays. The CLI \`--allowed-origins\` and \`--blocked-origins\` forms use semicolon-separated origins. The documented config format supports a full origin such as \`https://example.com:8080\` and a wildcard port such as \`http://localhost:*\`. Do not infer undocumented wildcard-host semantics.

## Use Environment Variables without Hiding Intent

Every major CLI option in the official reference has a \`PLAYWRIGHT_MCP_*\` counterpart. An MCP client entry can supply values through its environment map when that client supports it:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {
        "PLAYWRIGHT_MCP_BROWSER": "webkit",
        "PLAYWRIGHT_MCP_HEADLESS": "true",
        "PLAYWRIGHT_MCP_ISOLATED": "true",
        "PLAYWRIGHT_MCP_CAPS": "testing",
        "PLAYWRIGHT_MCP_OUTPUT_DIR": "./artifacts/playwright-mcp"
      }
    }
  }
}
\`\`\`

This is useful when a deployment system already supplies environment configuration. Keep ordinary policy values separate from credentials, and remember that the MCP client's treatment of environment values is outside Playwright MCP itself. A checked-in example should use safe placeholders and should not expose tokens, passwords, profile data, or storage-state content.

Environment configuration becomes difficult to audit when values come from several shell profiles, IDE settings, and process managers. For a QA team, maintain a documented expected configuration and use resolved-config introspection or controlled startup logs to prove what ran. "It is probably inherited" is not an acceptable explanation for a browser receiving a proxy, permission, or unrestricted file setting.

## Configure State and Startup Separately

Profile mode is configuration, but it deserves an explicit decision. The current [profile documentation](https://playwright.dev/mcp/configuration/user-profile) says Playwright MCP uses a persistent profile by default. Add \`--isolated\` for fresh in-memory sessions. Combine isolation with \`--storage-state=./auth-state.json\` when a clean browser should start from a controlled cookie and localStorage snapshot. Use \`--user-data-dir\` only when a specific persistent profile directory is intentional.

Page initialization is a different mechanism. \`--init-script\` adds JavaScript before a page's own scripts. \`--init-page\` evaluates a TypeScript module against the Playwright page object at startup. These hooks can change browser APIs, permissions, geolocation, or page setup, so review them as executable code, not harmless configuration. Keep them short, versioned, and specific to a documented test need.

The \`--grant-permissions\` option can grant browser-context permissions such as geolocation or clipboard access. Do not grant a broad set preemptively. A test that does not exercise clipboard behavior does not need clipboard permissions, and permission differences can change the behavior being tested.

## Separate Local stdio from an HTTP Server

The normal MCP client entry starts Playwright MCP as a local process. For headed browsers on systems where the client worker lacks a display, the official docs show a standalone server:

\`\`\`bash
npx @playwright/mcp@latest --port 8931
\`\`\`

The client then connects to the MCP endpoint:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp"
    }
  }
}
\`\`\`

This changes the trust model. \`--host\` defaults to localhost; \`--host 0.0.0.0\` binds to all interfaces. The JSON \`server.allowedHosts\` field is described as DNS-rebinding protection, not CORS. Do not expose a server merely because the client syntax works. Authentication, authorization, network placement, session handling, and least privilege are deployment responsibilities, and the Playwright repository states plainly that Playwright MCP is not a security boundary.

\`--shared-browser-context\` reuses one browser context across connected HTTP clients. That may be useful for a deliberately shared session, but it also means clients can affect the same browser state. Leave it off when client isolation is the expectation. Configuration should make sharing explicit rather than introducing it as a troubleshooting shortcut.

## Keep Artifacts and Generated Code Reviewable

\`--output-dir\` chooses the output directory. \`--output-mode\` selects file or standard output for snapshots, console messages, and network logs, with standard output documented as the default. \`--save-session\` preserves session data in the output directory, and \`--save-video\` can enable automatic video with a specified size. Output can contain URLs, page text, logs, screenshots, and session material, so retention and access should match the sensitivity of the tested environment.

\`--codegen=typescript\` is the documented default; \`none\` disables code generation. Use TypeScript generation when the job is to convert exploration into reviewable test code. Disable it when generated snippets add no value to the task. The testing guide explains the distinction between performing an MCP verification and assembling generated snippets into a maintained Playwright Test file.

## Diagnose Configuration without Guessing

Use a layered check when behavior differs from intent:

1. Reduce the server entry to \`@playwright/mcp@latest\` and confirm the MCP client can start it.
2. Add \`--caps=config\` and inspect \`browser_get_config\` if the current package exposes it.
3. Confirm browser, headed/headless mode, profile mode, and capabilities first.
4. Confirm action, navigation, and expectation timeouts separately.
5. Inspect proxy, allowed origins, blocked origins, service-worker behavior, and permissions.
6. Confirm the output directory exists where the server process expects it and is writable.
7. Add initialization scripts last, because they can materially change page behavior.

If Firefox fails while the baseline Chrome configuration works, the transport is probably not the first suspect. If a persistent login disappears only with \`--isolated\`, that is expected state behavior. If an assertion tool is absent while navigation works, inspect \`--caps=testing\` rather than reinstalling the server. If a page's asset requests are denied after an allowlist is added, enumerate the required origins instead of disabling the policy globally.

## Version Notes and Configuration Limits

This reference reflects the official Playwright MCP documentation available on July 14, 2026 and intentionally uses \`@playwright/mcp@latest\` in examples because that is the official setup form. For reproducible team environments, pin a reviewed package version and compare that version's help and release notes before adopting newer options. The web documentation can describe capabilities that an older pinned package does not expose.

Several limits are easy to miss. Core tools cannot be disabled through the capability list. Headless mode is not isolation. A persistent profile is not a test fixture. Origin allowlists and blocklists do not cover redirects and are explicitly not security boundaries. File-access restriction is a convenience guardrail, not a sandbox. Secret replacement is a response-masking convenience, not a credential vault. HTTP transport adds deployment obligations that a local stdio process does not remove but usually narrows.

The configuration schema and CLI surface evolve. Validate a setting against the current [official options page](https://playwright.dev/mcp/configuration/options), not a third-party flag list, and avoid inventing commands from similar Playwright products. \`@playwright/mcp\`, Playwright Test, and Playwright CLI are related interfaces with different commands and defaults.

## FAQ: Configuration

### What is the minimum Playwright MCP configuration?

Use an MCP server entry with \`command: "npx"\` and \`args: ["@playwright/mcp@latest"]\`. That starts the official package with its defaults and core tools. Add flags only after the baseline can start, list tools, and drive a page.

### Should a QA team use CLI arguments or a JSON config file?

Use arguments for a short, client-local setup. Use a JSON file when the policy includes nested launch options, context options, structured network lists, separate timeout classes, or a reviewed capability set. Keep the client entry responsible for locating that file.

### How do I make Playwright MCP run headless?

Add \`--headless\` to the MCP server arguments or set \`PLAYWRIGHT_MCP_HEADLESS=true\`. In a JSON config file, set \`browser.launchOptions.headless\` to \`true\`. Headless changes display behavior only.

### Why are testing tools missing even though browser navigation works?

Navigation is part of the always-enabled core capability. The verification and locator-generation tools require \`--caps=testing\` or \`testing\` in the config file's \`capabilities\` array. Restart the MCP server after changing its startup configuration.

### Can I configure different action and navigation timeouts?

Yes. Use \`--timeout-action\` and \`--timeout-navigation\`, or set \`timeouts.action\` and \`timeouts.navigation\` in a JSON config. The config schema also supports \`timeouts.expect\` for testing assertions.

### Does allowedOrigins secure a Playwright MCP deployment?

No. It limits browser requests as a guardrail, but the official repository warns that origin filters do not affect redirects and do not form a security boundary. Use client permissions, process isolation, network controls, and authenticated transport where appropriate.

### How can I see which configuration Playwright MCP resolved?

Enable the \`config\` capability and use \`browser_get_config\` when supported by the installed version. Compare its result with the team's expected browser, state, output, timeout, and network settings instead of checking only one input layer.

### Is \`--isolated\` the same as headless mode?

No. \`--isolated\` keeps profile state in memory and discards it when the session closes. \`--headless\` controls whether the browser UI is displayed. A server can be headed and isolated, or headless and persistent.

### When should I use a standalone HTTP endpoint?

Use it when the browser process must run separately, such as a headed browser with access to a display that the IDE worker lacks. Keep localhost as the default binding unless a reviewed deployment requires broader access, and secure any non-local endpoint as an MCP service rather than treating the port as trusted by default.
`,
    },
  },
  {
    slug: 'playwright-mcp-testing-capability-guide-2026',
    clusterId: 'playwright-mcp',
    post: {
      title: 'Playwright MCP Testing Capability: Assertions and Test Generation',
      description:
        'Enable Playwright MCP testing tools, verify elements, text, lists, and values, generate locators, and convert browser exploration into reviewable tests.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/playwright-mcp.png',
      imageAlt:
        'An AI agent verifying an accessible web page and generating a Playwright test from browser evidence',
      primaryKeyword: 'playwright mcp testing capability',
      keywords: [
        'playwright mcp testing capability',
        'playwright mcp assertions',
        'playwright mcp test generation',
        'browser_verify_element_visible',
        'browser_generate_locator',
        'playwright mcp testing tools',
        'playwright mcp generated test code',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-mcp-browser-automation-guide',
      relatedSlugs: [
        'playwright-mcp-browser-automation-guide',
        'playwright-mcp-json-configuration-reference',
        'playwright-mcp-profile-modes-guide-2026',
        'playwright-mcp-security-best-practices-2026',
      ],
      sources: [
        'https://playwright.dev/mcp/tools/assertions',
        'https://playwright.dev/mcp/capabilities',
        'https://playwright.dev/mcp/snapshots',
        'https://playwright.dev/mcp/tools/interaction',
        'https://playwright.dev/mcp/tools/forms',
      ],
      content: `The Playwright MCP testing capability is an opt-in tool group enabled with \`--caps=testing\`. It adds four focused assertions, \`browser_verify_element_visible\`, \`browser_verify_text_visible\`, \`browser_verify_list_visible\`, and \`browser_verify_value\`, plus \`browser_generate_locator\`. A QA agent can explore a real page with core browser tools, make explicit checks, and collect generated Playwright code grounded in the observed UI. It does not replace test design, Playwright Test configuration, fixtures, or human review; it turns browser evidence into a stronger starting point for durable automated tests.

Use the [complete Playwright MCP guide](/blog/playwright-mcp-browser-automation-guide) for the protocol and browser loop, then pair this tutorial with the [server configuration reference](/blog/playwright-mcp-json-configuration-reference), [profile-mode decision guide](/blog/playwright-mcp-profile-modes-guide-2026), and [MCP security practices](/blog/playwright-mcp-security-best-practices-2026). For reusable QA instructions, browse the [/skills directory](/skills) and the author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli). If the output will become a maintained suite, the existing [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026) supplies broader test-runner context.

## What the Testing Capability Actually Adds

Core Playwright MCP already lets an agent navigate, read accessibility snapshots, click, type, fill forms, wait, inspect console and network activity, take screenshots, and run supported page interactions. The testing capability adds a compact vocabulary for stating expected outcomes and requesting reusable locators. The official [capability reference](https://playwright.dev/mcp/capabilities) lists exactly five testing tools, so a team can reason about the surface without treating every browser action as an assertion.

That distinction is practical. Clicking Submit proves only that a click was attempted. A fresh snapshot may show the page changed, but the test job still needs a named claim: a Dashboard heading is visible, a validation message appears, a list contains expected items, or an input holds the expected value. The verification tools express those claims directly and return a success or failure that the agent can use to continue, diagnose, or stop.

The locator generator solves a different problem. It accepts the current snapshot reference for an element and returns a Playwright locator such as \`page.getByRole('button', { name: 'Submit' })\` or \`page.getByLabel('Email')\`. It does not assert anything by itself. Its value is converting the exact element the agent just observed into code that can be reviewed and placed in a test.

| Tool | Input | Best search job | Generated-code role |
|---|---|---|---|
| \`browser_verify_element_visible\` | ARIA \`role\` and \`accessibleName\` | Confirm a specific semantic control or heading is visible | Produces a visibility expectation grounded in role and name |
| \`browser_verify_text_visible\` | Visible \`text\` | Confirm a message, status, label, or content fragment appears | Produces a text visibility expectation |
| \`browser_verify_list_visible\` | List \`label\` and expected \`items\` | Confirm a named list contains a defined set of visible items | Produces a list-oriented check |
| \`browser_verify_value\` | Element \`type\`, description, current \`target\`, and expected \`value\` | Confirm an input's current value | Produces a value expectation tied to the observed field |
| \`browser_generate_locator\` | Current element \`target\` and optional description | Turn an observed element into maintainable locator code | Returns a locator, not an assertion |

These are focused helpers, not an exhaustive assertion library. There is no documented testing-capability tool for every matcher available in Playwright Test. When a scenario requires an unsupported condition, keep the distinction clear: use browser observation to gather evidence, then write and review the appropriate Playwright Test assertion rather than inventing an MCP tool name.

## Enable Testing without Enabling Everything

Add \`testing\` to the server's capability list. The shortest official configuration is:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--caps=testing"]
    }
  }
}
\`\`\`

Core remains enabled automatically. The resulting surface includes the normal browser tools plus the five testing tools. You do not need \`vision\` to verify accessible elements, text, lists, or values. You do not need \`devtools\` unless the same job also records traces or video. You do not need \`storage\` unless the workflow manages cookies, localStorage, sessionStorage, or storage-state files.

An authenticated test-generation session may legitimately combine capabilities:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./auth-state.json",
        "--caps=testing,storage",
        "--output-dir=./artifacts/playwright-mcp"
      ]
    }
  }
}
\`\`\`

Here, \`--isolated\` starts an in-memory profile, \`--storage-state\` seeds cookies and localStorage from a file, and \`storage\` exposes state-management tools. Those choices are independent from testing. If the scenario is public and unauthenticated, omit the state configuration. If the agent only needs the startup state and never calls storage tools, evaluate whether exposing the storage capability is necessary.

After changing capabilities, restart the MCP server through the client. If navigation works but \`browser_verify_text_visible\` is unavailable, the server is running core tools without the testing group. Diagnose the resolved startup configuration instead of asking the model to approximate the missing tool.

## Use an Observe, Act, Verify Loop

Reliable test generation starts with current page evidence. Playwright MCP's [snapshot documentation](https://playwright.dev/mcp/snapshots) says interactive elements receive references such as \`e5\`, and those refs are valid only until the page changes. Navigation and DOM updates can produce new refs. The agent therefore needs a loop, not a script assembled from stale identifiers:

1. Navigate or request \`browser_snapshot\`.
2. Identify the current semantic element and ref.
3. Perform one meaningful action.
4. Read the returned fresh snapshot.
5. State the expected outcome through the narrowest verification tool.
6. Generate a locator only from a ref in current output.
7. Repeat until the user flow and its important branches are covered.

This sequence prevents a common generation error: copying \`e10\` from an earlier snapshot and assuming it still targets the same checkbox after a list item was inserted. Snapshot refs are excellent interaction handles because they point to what the model just saw, but they are not test selectors to save in source code. The generated role, label, text, or test-id locator is the durable candidate.

The loop also forces the agent to distinguish evidence from expectation. A snapshot showing "Order submitted" is evidence. Calling \`browser_verify_text_visible\` with that text records the expected outcome. Generating a locator for the Submit button helps reproduce the action later. Each artifact answers a different review question.

## Verify Semantic Elements by Role and Name

\`browser_verify_element_visible\` takes an ARIA role and accessible name. Use it for controls and landmarks whose identity is semantic: buttons, links, headings, textboxes, checkboxes, or similar accessible elements. The official [testing and assertions page](https://playwright.dev/mcp/tools/assertions) shows checks such as a heading named Dashboard and a button named Submit.

A compact tool transcript looks like this:

\`\`\`text
browser_navigate { url: "https://app.example.com/login" }
browser_verify_element_visible { role: "heading", accessibleName: "Sign in" }
browser_verify_element_visible { role: "textbox", accessibleName: "Email" }
\`\`\`

This is stronger than asking whether "the login page looks right." The role/name pair identifies the expected accessible contract. If a heading is visually present but has no heading semantics, the verification can expose an accessibility and testability gap instead of silently accepting pixels.

Choose a name a user or assistive technology can actually perceive. Do not create a role/name pair from internal implementation details. If the page has two visible buttons named Continue, the query may be ambiguous and the product may need a more specific accessible name or a narrower workflow state before verification.

Use this tool for presence, not for every property. It verifies visibility of the named semantic element. It does not claim the control is enabled, has a particular CSS color, or sent the correct network request. Add those checks in the maintained suite when they are part of the risk.

## Verify Text, Lists, and Field Values Deliberately

\`browser_verify_text_visible\` is appropriate for user-facing messages: validation feedback, toast content, empty states, totals, and status text. Prefer meaningful text over incidental copy. "Payment declined" is usually a behavior contract; a marketing subtitle may not be. If content is localized or intentionally dynamic, the final test design may need a different assertion even if visible-text verification is useful during exploration.

\`browser_verify_list_visible\` takes the accessible label of a list and an array of expected item strings. It is useful when the list itself has a stable identity and its visible contents are the outcome: a Todo list, search results shortlist, navigation menu, or selected products. Decide whether order matters to the product and verify the maintained test accordingly; do not infer matcher semantics beyond what the current MCP result demonstrates.

\`browser_verify_value\` takes the element type, a human-readable description, the current snapshot target, and a string value. It is designed for a form field the agent has just observed. Because its target can be a short-lived snapshot reference, request or read a fresh snapshot before calling it. This is particularly useful after autofill, formatting, a form reset, or an edit flow where visible text elsewhere on the page is not enough to prove the input's actual value.

The four checks can express a form-validation matrix without vague narration:

\`\`\`text
browser_click { target: "e9" }
browser_verify_text_visible { text: "Email is required" }

browser_type { target: "e3", text: "not-an-email" }
browser_click { target: "e9" }
browser_verify_text_visible { text: "Please enter a valid email" }

browser_type { target: "e3", text: "alice@example.com" }
browser_verify_value { type: "textbox", element: "Email field", target: "e3", value: "alice@example.com" }
\`\`\`

The refs shown are illustrative and must come from the active session. A publication-ready test plan should also cover success, server errors, disabled or duplicate submission, and field-state transitions when those risks apply. The testing capability helps make each observed claim explicit; it does not decide the complete scenario inventory.

## Generate Locators from the Element You Observed

After the agent identifies an element in a current snapshot, call \`browser_generate_locator\` with its current target:

\`\`\`text
browser_snapshot
  - textbox "Email" [ref=e3]
  - button "Submit" [ref=e15]

browser_generate_locator { element: "Email field", target: "e3" }
  page.getByLabel('Email')

browser_generate_locator { element: "Submit button", target: "e15" }
  page.getByRole('button', { name: 'Submit' })
\`\`\`

The result is a candidate locator grounded in the rendered page, not a selector guessed from source code. Review it for uniqueness, user-facing semantics, and stability. A role/name locator may be ideal for a clear control. A label locator may be ideal for a form field. If the generated locator depends on text that product owners change frequently, the reviewer can choose a different documented locator strategy in the test file.

Do not put \`e3\` or \`e15\` in the Playwright Test source. Those are MCP snapshot references with short lifetimes. The generated locator is intended to bridge exploration and code. If the DOM changes before generation, obtain a fresh snapshot and target the new ref rather than forcing the old one.

## Convert a Todo Flow into a Test Candidate

The official assertions guide demonstrates TodoMVC because one short flow includes input, submission, list content, a checkbox, and a count. A disciplined agent transcript can look like this:

\`\`\`text
browser_navigate { url: "https://demo.playwright.dev/todomvc" }
browser_type { target: "e5", text: "Buy groceries", submit: true }
browser_verify_text_visible { text: "Buy groceries" }
browser_click { target: "e10" }
browser_verify_text_visible { text: "0 items left" }
\`\`\`

The exact refs must come from the snapshots returned in that session. With TypeScript code generation enabled, the documented workflow yields action and expectation snippets that can be assembled into a test. A reviewed candidate is:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('adds and completes a todo', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');

  const newTodo = page.getByPlaceholder('What needs to be done?');
  await newTodo.fill('Buy groceries');
  await newTodo.press('Enter');

  await expect(page.getByText('Buy groceries')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Toggle Todo' }).click();
  await expect(page.getByText('0 items left')).toBeVisible();
});
\`\`\`

This code is a test candidate, not proof that the repository is ready to merge it. The team still chooses the file location, base URL strategy, project configuration, fixtures, test data, tags, retries, reporting, and cleanup. Run the spec in the project's Playwright Test environment. A successful MCP exploration does not prove the generated test passes under every configured browser or in CI.

## Design Assertions around User Outcomes

Generated tests become brittle when they record every intermediate detail. Select assertions that prove the behavior promised by the story. For a login flow, a stable authenticated landmark and the intended destination may be stronger than checking three incidental labels. For a filter, the result list and count may matter more than the button's temporary class. For validation, check the message and whether correction allows progress.

Use a small assertion portfolio:

- One entry assertion confirms the scenario began in the expected state.
- One assertion after a meaningful transition confirms the intended outcome.
- One state assertion covers data that can be silently wrong, such as a field value or list content.
- One negative assertion or branch covers the most likely failure mode, written in Playwright Test if no focused MCP helper expresses it.

The testing tools emphasize visible user state. That is useful but not sufficient for every layer. A successful UI message does not prove an analytics event, database record, email, or downstream side effect occurred. Keep API, contract, persistence, accessibility, visual, and observability checks at the layer where their evidence is authoritative.

## Review Generated Code before It Becomes Coverage

A reviewer should be able to trace each generated line back to an observed action or required outcome. Check these points before accepting a spec:

1. The title describes behavior, not the implementation sequence.
2. Navigation uses the project's approved URL or base-URL pattern.
3. Locators express stable user-facing semantics and are unique in the tested state.
4. Snapshot refs do not appear in source code.
5. Assertions prove requirements rather than decorative content.
6. Test data is controlled and does not depend on a developer's persistent profile.
7. Authentication state is created or loaded through an approved fixture or state file.
8. The test leaves shared data in a known state or uses isolated data.
9. No credentials, tokens, cookies, or sensitive response content are embedded in code or artifacts.
10. The spec is run through the repository's formatter, type checker, and Playwright Test command.

This review is where an exploratory transcript becomes engineering. MCP makes the browser observable to an agent and can remove locator guesswork. It cannot know which application contracts are stable, which accounts are safe, or which side effects require cleanup unless the team supplies that context.

## Use Failures as Evidence, Not Regeneration Prompts

When a verification fails, preserve the failure boundary. A missing heading may indicate wrong navigation, delayed loading, an inaccessible heading, incorrect expected copy, authentication failure, or a product defect. Read the fresh snapshot, console messages, and relevant network evidence before changing the expectation.

Do not ask the agent to regenerate locators repeatedly until a test turns green. That can convert a meaningful failure into a weak assertion. If the expected Submit button is gone, generating a locator for the nearest visible button does not establish equivalent behavior. Return to the requirement and current page state.

Likewise, do not increase timeouts as the first response to every intermittent result. The server's action, navigation, and expectation timeouts are separate configuration choices. Determine whether the application has a real asynchronous condition the test can observe. A fixed long delay makes generation slower without proving readiness.

## Capability Version and Limitations

This guide reflects the official Playwright MCP pages available on July 14, 2026. The testing group currently documents four verification tools and one locator generator. It requires explicit capability enablement even though core browser actions work without it. Teams that pin \`@playwright/mcp\` should confirm the installed release exposes the same tool names and parameters before using prompts or templates built for \`@latest\`.

The capability is intentionally narrower than Playwright Test's full assertion and runner surface. It does not replace projects, fixtures, hooks, reporters, retries, sharding, trace policy, or repository test configuration. Its generated snippets must be assembled into a test and executed in the target project. Visible state checks cannot prove backend persistence or external side effects by themselves.

Snapshot refs are session evidence, not stable locators. Generated code is only as strong as the observed state and the review criteria. An extension-backed personal browser can contaminate generated scenarios with existing data; a persistent profile can hide login prerequisites; an isolated profile can reveal missing setup. Choose profile mode before treating a generated flow as reproducible.

## FAQ: Testing Capability

### How do I enable the Playwright MCP testing capability?

Add \`--caps=testing\` to the server arguments, set \`PLAYWRIGHT_MCP_CAPS=testing\`, or include \`testing\` in the JSON config's \`capabilities\` array. Restart the MCP server so the client receives the updated tool list.

### Which assertion tools does the testing capability provide?

It provides \`browser_verify_element_visible\`, \`browser_verify_text_visible\`, \`browser_verify_list_visible\`, and \`browser_verify_value\`. It also provides \`browser_generate_locator\`, which generates locator code but is not itself an assertion.

### Does Playwright MCP write a complete test file automatically?

The official workflow shows generated action and expectation snippets being assembled into a Playwright test. Treat the result as code to place, format, run, and review in the repository; do not assume a tool transcript alone created maintained coverage.

### Can I use a snapshot ref as a locator in my test?

No. A ref such as \`e15\` is scoped to current snapshot state and can change after navigation or DOM updates. Use it for the live MCP call, then generate or write a durable Playwright locator for the test source.

### When should I use browser_verify_element_visible instead of text verification?

Use element visibility when role and accessible name are part of the contract, such as a button, link, heading, or textbox. Use text visibility when the outcome is a message or content string without a more useful semantic element identity.

### Can the testing capability verify an input value?

Yes. Call \`browser_verify_value\` with the element type, a human-readable description, the current target, and the expected string value. Obtain the target from fresh page output because snapshot references can become invalid after the page changes.

### Is vision capability required for assertions and test generation?

No. The testing tools operate with structured page state and refs. Enable vision only when the workflow specifically requires coordinate-based mouse interactions with a vision-capable model.

### Why did a generated locator stop matching later?

The page's accessible name, role, label, test data, or structure may have changed, or the original locator may not have been unique outside the exploration state. Reproduce the target state, inspect a current snapshot, and review the locator against the intended user contract before changing it.

### Should generated tests use a persistent profile?

Not by default. Persistent state can make exploration convenient but can hide setup and data dependencies. Use controlled fixtures or reviewed storage state for reproducible tests, and use an isolated profile when a clean starting point is part of the scenario.
`,
    },
  },
  {
    slug: 'playwright-mcp-profile-modes-guide-2026',
    clusterId: 'playwright-mcp',
    post: {
      title: 'Playwright MCP Persistent, Isolated, and Browser Extension Profiles',
      description:
        'Choose Playwright MCP persistent, isolated, or browser-extension state for QA, including storage-state setup, parallel sessions, and profile risks.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-mcp.png',
      imageAlt:
        'Three Playwright MCP browser state paths showing persistent storage, an isolated context, and an attached browser tab',
      primaryKeyword: 'playwright mcp isolated profile',
      keywords: [
        'playwright mcp isolated profile',
        'playwright mcp persistent profile',
        'playwright mcp browser extension',
        'playwright mcp storage state',
        'playwright mcp user data dir',
        'playwright mcp profile modes',
        'playwright mcp authentication state',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-mcp-browser-automation-guide',
      relatedSlugs: [
        'playwright-mcp-browser-automation-guide',
        'playwright-mcp-json-configuration-reference',
        'playwright-mcp-testing-capability-guide-2026',
        'playwright-mcp-security-best-practices-2026',
      ],
      sources: [
        'https://playwright.dev/mcp/configuration/user-profile',
        'https://playwright.dev/mcp/configuration/browser-extension',
        'https://playwright.dev/mcp/tools/storage',
        'https://github.com/microsoft/playwright-mcp#user-profile',
        'https://github.com/microsoft/playwright/blob/main/packages/extension/README.md',
      ],
      content: `Use a Playwright MCP isolated profile when every QA session should begin from controlled state and discard changes when the browser closes. Use the default persistent profile when repeated local work should retain login state, cookies, and localStorage. Use browser-extension mode only when the agent intentionally needs an existing Chrome or Edge tab, authenticated session, or installed extension. The choice determines reproducibility, parallelism, and exposure: isolation favors repeatable tests, persistence favors continuity, and extension attachment favors convenience while sharing the richest personal browser state.

The broader architecture is in the [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide). Before selecting state, review the [server configuration reference](/blog/playwright-mcp-json-configuration-reference), [assertion and generation workflow](/blog/playwright-mcp-testing-capability-guide-2026), and [security best practices](/blog/playwright-mcp-security-best-practices-2026). Teams can add domain-specific guidance from [/skills](/skills), compare with the author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli), and connect these choices to the existing [Playwright test agents in Claude Code guide](/blog/playwright-test-agents-claude-code).

## Make State a Test-Design Decision

Profile selection is not a cosmetic startup preference. It decides where the browser gets authentication, what survives a restart, whether previous work can influence the current result, and how easily two agents can run at once. A scenario that passes only because a developer logged in yesterday is different from one that starts from a reviewed storage-state fixture. A checkout flow run in a browser containing personal addresses and payment state has a different risk from the same flow in a fresh test account.

The official [Profile & State documentation](https://playwright.dev/mcp/configuration/user-profile) presents three modes:

- Persistent is the MCP default and keeps login state, cookies, and localStorage between sessions.
- Isolated starts each session without saved profile state and loses session storage when the browser closes.
- Browser extension connects to tabs in an existing browser rather than launching a separate profile.

Ask four questions before choosing:

1. Must the initial state be reproducible by another engineer or CI worker?
2. Is interactive SSO or 2FA impossible or undesirable to repeat in a separate automation profile?
3. Can the session touch personal, production, or otherwise sensitive browser state?
4. Will multiple MCP clients run concurrently against the same workspace?

The answers usually make the mode clear. Reproducible regression generation points to isolated state. Long local investigations with a dedicated test identity may use persistence. A one-off task that depends on an already authenticated enterprise tab may require extension mode, but only with explicit scope and human awareness.

## Compare the Three Profile Models

| Mode | State source | State after browser close | Parallel behavior | Best fit | Main risk |
|---|---|---|---|---|---|
| Persistent, default | Playwright MCP-managed profile or custom \`--user-data-dir\` | Cookies, login state, and localStorage remain on disk | One browser instance can use a persistent profile at a time | Repeated local exploration with a dedicated account | Hidden carry-over can mask setup or contaminate results |
| Isolated | Fresh in-memory context, optionally seeded by \`--storage-state\` | Session changes are discarded | Separate sessions avoid a shared persistent-profile lock | Reproducible QA, generation, and parallel agents | Required setup must be supplied explicitly |
| Browser extension | Selected tab in an existing Chrome or Edge profile | State remains part of that existing browser | Behavior depends on selected tabs and active browser state | SSO, 2FA, existing tabs, installed extensions | Agent can act inside a high-value personal or work session |

No row is universally superior. "Persistent" does not mean more reliable, and "isolated" does not mean unauthenticated. An isolated context can start authenticated from storage state. Extension mode does not copy a session into a clean profile; it attaches to the browser state already in use.

## Persistent Mode: Continuity by Default

Playwright MCP preserves profile state by default. The official docs say each project receives a separate profile automatically based on the workspace. The Microsoft repository further documents managed cache locations by platform and allows an override with \`--user-data-dir\`. In practice, the important contract is not the exact cache path but that authentication and local browser data can survive closing and reopening the MCP server for the same project context.

The minimum persistent configuration is simply the normal entry:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
\`\`\`

Choose a custom directory only when ownership and lifecycle are explicit:

\`\`\`json
{
  "mcpServers": {
    "playwright-qa": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--user-data-dir=./.playwright-mcp/qa-profile"
      ]
    }
  }
}
\`\`\`

This directory is browser state, not ordinary test output. It can contain authenticated cookies and origin data. Do not commit it, attach it to a bug without review, or share it as a convenient login fixture. Give it a dedicated test identity and a documented cleanup or rotation procedure.

Persistent mode is useful for a multi-day exploratory investigation. An engineer can authenticate once, reproduce a problem, close the client, and continue later without repeating login. It also helps when repeated setup is expensive but the state is safe and intentionally retained.

The same continuity can invalidate a test conclusion. A feature flag in localStorage, a dismissed onboarding dialog, a cart item, or an expired-but-present cookie can make the page differ from a new user's page. Before reporting a defect or generating a regression test, record the profile mode and determine whether retained state is part of the scenario.

## Avoid Persistent-Profile Concurrency Conflicts

The official Microsoft repository warns that a persistent profile can be used by only one browser instance at a time. Two MCP clients sharing the same workspace-derived profile can conflict. This is a browser-profile ownership constraint, not a reason to kill random processes or delete state while another session is active.

For concurrent agents, choose one of these patterns:

- Start each agent with \`--isolated\` when no disk persistence is needed.
- Assign a distinct \`--user-data-dir\` to each persistent client.
- Serialize access to one persistent browser when sharing its exact state is intentional.
- Use separate test identities and data even when browser directories are separate.

Distinct profile directories solve the file ownership collision, but they do not isolate server-side accounts. If two agents sign into the same test user, they can still change the same cart, draft, preferences, or session records. Browser isolation and test-data isolation are separate controls.

Do not use extension mode as a workaround for profile locking. That changes the test to an existing browser and can expose broader state. Resolve concurrency at the profile and account level instead.

## Isolated Mode: A Clean, In-Memory Session

Add \`--isolated\` when browser profile changes should not be saved to disk. The documented mode starts each session fresh; when MCP closes the browser, its session storage is lost. This makes the starting state visible and the ending state disposable, which is usually the strongest default for repeatable QA exploration and test generation.

\`\`\`json
{
  "mcpServers": {
    "playwright-isolated": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--caps=testing"
      ]
    }
  }
}
\`\`\`

Isolation exposes missing prerequisites quickly. If the app requires a seeded organization, feature flag, consent cookie, or login fixture, the first snapshot will reveal that setup rather than inheriting it silently. The agent can then follow an approved setup flow or load reviewed state.

"In memory" does not mean "no side effects." The browser can still submit forms, create records, trigger messages, or mutate remote systems. Closing the browser discards local profile state; it does not roll back application data. Use test accounts, disposable records, mocked services, or cleanup procedures where the scenario has external effects.

Isolation also does not create a security sandbox. The Playwright repository labels its file restrictions and origin controls as convenience guardrails, and Playwright MCP itself is not a security boundary. An isolated profile limits state carry-over; client permissions, process containment, network policy, and target authorization still matter.

## Seed an Isolated Session with Storage State

An isolated profile can begin authenticated. Pass a storage-state file at startup:

\`\`\`json
{
  "mcpServers": {
    "playwright-authenticated-test": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./test-state/qa-user.json",
        "--caps=testing"
      ]
    }
  }
}
\`\`\`

The [storage documentation](https://playwright.dev/mcp/tools/storage) defines storage state as cookies plus localStorage saved to a JSON file. It is the primary documented mechanism for carrying authentication into another session. It does not preserve every possible browser artifact, and sessionStorage is session-scoped rather than part of the persisted storage-state description.

A safe workflow has a clear producer and consumer:

1. Authenticate with a dedicated QA account through an approved setup.
2. Save state to a controlled file.
3. Store it outside source control unless the contents are demonstrably non-sensitive.
4. Start isolated consumers with \`--storage-state\`.
5. Rotate or regenerate state when credentials, roles, or sessions change.
6. Revoke the underlying session if the file is exposed.

The \`storage\` capability also exposes \`browser_storage_state\` and \`browser_set_storage_state\` for save and restore during a connected workflow:

\`\`\`text
browser_storage_state
  State saved to: auth-state.json

browser_set_storage_state { path: "./auth-state.json" }
browser_navigate { url: "https://app.example.com/dashboard" }
browser_snapshot
\`\`\`

Enable \`--caps=storage\` when the agent needs those tools. Startup with \`--storage-state\` is a server configuration choice; it does not require the agent to manipulate individual cookies or storage keys during every task.

Treat the file as a credential-bearing artifact even if it contains no password. Session cookies can authorize access. Never paste its contents into a model prompt, console transcript, article, or ticket. Scope the account and session so compromise has limited impact.

## Browser Extension Mode: Attach to Existing State

Extension mode connects Playwright MCP to an existing browser rather than launching a new browser profile. The current [connecting-to-browsers guide](https://playwright.dev/mcp/configuration/browser-extension) documents Chrome and Edge use cases: reusing SSO or 2FA authentication, interacting with pages that depend on installed extensions, and automating tabs already open.

The server configuration is short:

\`\`\`json
{
  "mcpServers": {
    "playwright-extension": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--extension"]
    }
  }
}
\`\`\`

Install the official Playwright Extension in the target Chrome or Edge browser first. On first interaction, the extension presents a tab-selection page so the user can choose which tab the model will control. That selection is an important consent boundary: close unrelated tabs, choose the narrowest target, and remain aware that navigation from the selected tab can reach other origins allowed by the active session.

The official extension README says connection approval is required by default. It also documents a unique \`PLAYWRIGHT_MCP_EXTENSION_TOKEN\` displayed by the extension, which can bypass repeated approval when placed in the server environment:

\`\`\`json
{
  "mcpServers": {
    "playwright-extension": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--extension"],
      "env": {
        "PLAYWRIGHT_MCP_EXTENSION_TOKEN": "replace-with-token-from-extension-ui"
      }
    }
  }
}
\`\`\`

Do not commit the real token. Bypassing a repeated approval prompt trades friction for standing authorization between the server and browser profile. Use the manual approval flow when repeated unattended attachment is not required, and protect or rotate the token according to the value of the browser profile it can reach.

Extension mode should be exceptional for destructive QA. An agent attached to a normal work profile may have access to email, admin consoles, production dashboards, cloud tools, and stored sessions. A prompt that says "test checkout" is not enough scope if the tab can navigate into a real account. Prefer a separate browser profile containing only dedicated test identities.

## Do Not Confuse Extension, CDP, and Persistent Profiles

Playwright MCP also supports connecting to a running Chromium-family browser through \`--cdp-endpoint\`, including documented Chrome or Edge channels and explicit CDP URLs. That is a connection mechanism, not one of the three state-policy recommendations in this guide. It attaches to whatever state the target browser exposes through that connection.

A custom \`--user-data-dir\` still launches a Playwright-managed persistent browser with the specified profile directory. \`--extension\` uses the installed extension and selected existing tabs. \`--cdp-endpoint\` connects through Chrome DevTools Protocol. These choices are not interchangeable flags for "keep me logged in."

State ownership determines the right option:

- Use a custom user-data directory when Playwright MCP should own a dedicated persistent automation profile.
- Use extension mode when the required state belongs to an existing interactive browser and tab selection is part of the workflow.
- Use CDP when an existing Chromium endpoint is already managed and explicitly exposed for automation.
- Use isolated state when reproducibility matters more than retaining browser-local changes.

The JSON schema notes that browser configuration is ignored when extension mode is selected. That is coherent: Playwright MCP is not launching the attached browser with a new viewport, executable, or profile. Test the state that actually exists rather than assuming launch options reconfigured it.

## Match Profiles to Common QA Jobs

### Regression scenario generation

Use isolated mode, a dedicated account, and reviewed storage state if authentication is required. The goal is a flow another worker can reproduce without inheriting the explorer's profile.

### Multi-day exploratory investigation

Use a dedicated persistent profile when retaining state is part of the investigation. Record the profile choice in evidence, and reset it before testing first-run behavior.

### Enterprise SSO behind interactive controls

Use extension mode only if a separate automated login or storage-state fixture is unavailable or prohibited. Select one test tab, use a dedicated browser profile, and keep human approval unless unattended attachment is an explicit requirement.

### Parallel agent exploration

Use isolated mode for each client or distinct persistent profile directories. Give agents separate application data where their actions can collide server-side.

### Onboarding and new-user validation

Use isolated mode without saved state. A persistent profile may already contain consent, feature, or onboarding markers and produce a false pass.

### Installed-extension compatibility testing

Use browser-extension mode when the page genuinely depends on extensions installed in that existing browser. Document which extensions and versions are part of the scenario because they are external state.

## Reset and Rotate State Intentionally

Closing an isolated browser resets its local session by design. Resetting a persistent session requires retiring or clearing its profile state, and the official repository says the managed profile can be deleted between sessions to clear offline state. Do that only when no browser owns the profile and when losing the retained login is intended.

For a custom \`--user-data-dir\`, make cleanup a named team operation rather than an ad hoc deletion during a run. For storage-state files, rotate on expiry, role changes, credential changes, suspected exposure, or environment reset. For extension mode, sign out or close the dedicated browser profile when the authorized task is over, and remove any unattended extension token that is no longer needed.

Reset browser state and reset server-side test data separately. Clearing cookies does not delete a created order. Deleting a profile does not revoke every server session unless the application does so. A complete cleanup plan identifies browser state, application records, external messages, and credentials.

## Profile Mode Limits and Version Notes

This guide reflects official Playwright MCP documentation available on July 14, 2026. It describes MCP behavior, not Playwright CLI session behavior; the CLI has different defaults and session controls. Examples use \`@playwright/mcp@latest\`, while teams that need reproducibility should pin and validate a reviewed version.

Persistent profile paths and workspace-derived naming are implementation details that can evolve. Use \`--user-data-dir\` when a stable, team-owned directory is required rather than scripting against an assumed managed cache name. A persistent profile remains single-owner even if multiple clients know its path.

Storage state covers cookies and localStorage in the official MCP storage workflow, not every property of a full interactive browser. It can expire or become invalid when the server revokes a session. Extension mode is limited to supported Chromium-family browsers and depends on the official extension. None of the modes undoes remote side effects, prevents prompt-driven destructive actions, or substitutes for process and network security.

## FAQ: Profile Selection

### Is Playwright MCP persistent or isolated by default?

Playwright MCP uses a persistent profile by default, preserving login state, cookies, and localStorage between sessions. Add \`--isolated\` when the profile should remain in memory and be discarded on browser close.

### When should I use a Playwright MCP isolated profile?

Use it for reproducible QA, clean first-run checks, parallel agent sessions, and test generation that should not depend on previous browsing. Seed approved authentication with \`--storage-state\` when a fresh but logged-in start is required.

### Can an isolated profile still be authenticated?

Yes. Pass \`--storage-state=./path/to/state.json\` to load cookies and localStorage at startup, or enable the storage capability and restore state through its documented tool. Protect that file as an authentication artifact.

### Why do two persistent MCP sessions conflict?

A persistent browser profile can be owned by only one browser instance at a time. Run additional clients in isolated mode or give each a distinct \`--user-data-dir\`. Also separate their application accounts or data if server-side actions can collide.

### Does browser extension mode copy my login into an isolated browser?

No. It attaches to selected tabs in the existing Chrome or Edge browser and reuses that browser's sessions, cookies, and extensions. The state remains part of the existing browser profile.

### What is the difference between storage state and a user-data directory?

Storage state is a portable JSON representation of cookies and localStorage used to seed a context. A user-data directory is a persistent browser profile containing broader browser data and is owned by a launched browser instance.

### Is the Playwright extension token safe to commit?

No. The token can bypass repeated connection approval for that browser profile. Keep the real value out of source control and shared examples, restrict access to it, and remove or rotate it when unattended connection is no longer required.

### Does closing an isolated browser roll back test data?

No. It discards browser-local profile state. Orders, records, emails, uploads, and other remote side effects remain unless the application, test environment, or cleanup workflow removes them.

### Should test generation use my everyday browser profile?

Avoid it. An everyday profile contains unrelated sessions and personalized state that can alter results and expand exposure. Prefer isolated mode with controlled state or a dedicated persistent or extension browser profile used only for QA.
`,
    },
  },
  {
    slug: 'playwright-mcp-security-best-practices-2026',
    clusterId: 'playwright-mcp',
    post: {
      title: 'Playwright MCP Security Best Practices for Files, Origins, and Secrets',
      description:
        'Harden Playwright MCP file access, browser origins, profiles, secrets, artifacts, transports, sessions, and authorization with official security guidance.',
      date: '2026-03-24',
      updated: '2026-07-14',
      category: 'Security',
      image: '/blog/pillars/playwright-mcp.png',
      imageAlt:
        'Layered security controls around a Playwright MCP server, browser origins, workspace files, and QA credentials',
      primaryKeyword: 'playwright mcp security',
      keywords: [
        'playwright mcp security',
        'playwright mcp allowed origins',
        'playwright mcp file access',
        'playwright mcp secrets',
        'playwright mcp security best practices',
        'playwright mcp http security',
        'mcp browser automation security',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-mcp-browser-automation-guide',
      relatedSlugs: [
        'playwright-mcp-browser-automation-guide',
        'playwright-mcp-json-configuration-reference',
        'playwright-mcp-testing-capability-guide-2026',
        'playwright-mcp-profile-modes-guide-2026',
      ],
      sources: [
        'https://github.com/microsoft/playwright-mcp#security',
        'https://github.com/microsoft/playwright-mcp#configuration',
        'https://playwright.dev/mcp/configuration/options',
        'https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices',
        'https://modelcontextprotocol.io/docs/tutorials/security/authorization',
      ],
      content: `Playwright MCP security requires defense in depth because the official project explicitly says it is not a security boundary. Keep the server local through stdio when possible, run it with minimal OS and client permissions, prefer an isolated test profile, retain default workspace file restrictions, allow only required browser origins, protect state and output artifacts, and expose only necessary capabilities. For HTTP deployments, add real authentication and authorization, validate every request and token audience, minimize scopes, and never use an MCP session ID or Playwright origin filter as a substitute for access control.

Start with the [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide), then align controls with the [configuration reference](/blog/playwright-mcp-json-configuration-reference), [testing capability guide](/blog/playwright-mcp-testing-capability-guide-2026), and [profile-mode guide](/blog/playwright-mcp-profile-modes-guide-2026). The [/skills directory](/skills) and author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli) can supply reusable QA operating rules. For a maintained-suite perspective, read the existing [Playwright test agents in Claude Code guide](/blog/playwright-test-agents-claude-code).

## Begin with the Actual Trust Boundaries

Playwright MCP sits between an MCP client, a model-driven workflow, a browser, the local file system, target applications, output files, and sometimes a network endpoint. Each boundary has different controls. Browser origin filtering does not authenticate an MCP client. A secret-masking file does not stop the browser from sending a credential to an unintended page. An isolated profile does not prevent a form submission from changing remote data. A localhost listener is not automatically safe from every local process or DNS-rebinding scenario.

The official [MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) cover local server compromise, HTTP authorization, session hijacking, token passthrough, confused deputy risks, server-side request forgery during OAuth discovery, URL validation, and scope minimization. The Playwright-specific configuration adds useful file, origin, profile, output, permission, and browser-process controls. A defensible deployment combines both layers.

Inventory these assets before configuration:

1. Workspace files the MCP client and server process can read or write.
2. Browser-accessible origins, including identity providers, APIs, CDNs, and localhost ports.
3. Accounts, cookies, localStorage, extension state, and storage-state files.
4. Screenshots, console output, network logs, videos, traces, and saved sessions.
5. Local process privileges, environment variables, and network reachability.
6. HTTP credentials, authorization scopes, session IDs, and downstream API tokens.
7. Remote side effects the browser can trigger in test or production systems.

Security review then becomes concrete. "The MCP is internal" is not a control. "The process runs as a non-privileged QA user, through direct stdio, with one workspace root, an isolated profile, two allowed origins, no unrestricted file access, and a disposable test account" is reviewable.

## Apply Controls in Layers

| Layer | Playwright or MCP control | What it reduces | What it does not prove |
|---|---|---|---|
| MCP client and process | Explicit startup consent, sandboxing, minimal OS privileges | Arbitrary local file, process, and network impact | That browser actions are safe or authorized |
| Transport | Direct stdio, or authenticated and authorized HTTP | Unwanted clients calling tools | That a valid client should perform every requested action |
| Browser state | \`--isolated\`, dedicated account, reviewed storage state | Cross-session contamination and personal-session exposure | Rollback of server-side effects |
| File access | Default workspace-root restriction, client file permissions | Accidental reads and uploads outside intended roots | A secure sandbox against a determined bypass |
| Browser network | \`--allowed-origins\`, \`--blocked-origins\`, egress policy | Accidental requests to unapproved origins | Redirect protection, MCP authentication, or full SSRF prevention |
| Tool surface | Only required opt-in capabilities | Unnecessary tool choices and privileged workflows | Removal of always-enabled core behavior |
| Sensitive output | \`--secrets\` masking, controlled output directory, retention | Accidental plaintext exposure in responses and artifacts | Secret storage, access control, or guaranteed redaction |
| Authorization | Audience-bound tokens, per-request validation, narrow scopes | Token reuse, confused deputy behavior, privilege expansion | Host and browser isolation |

No single row closes the system. The table is useful during incident review too: if a storage-state file leaks through an artifact, origin filtering did not fail; artifact permissions and credential lifecycle did.

## Prefer Direct stdio for a Local QA Tool

For a local MCP client, the normal configuration starts the official package as a child process and communicates through stdio:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--caps=testing",
        "--output-dir=./artifacts/playwright-mcp"
      ]
    }
  }
}
\`\`\`

The MCP security guide recommends stdio for local servers because it limits access to the client that owns the process. It also requires clients that offer one-click local server installation to show the exact command without truncation, explain that code will run on the user's machine, require explicit approval, and allow cancellation. Review both the package name and every argument before approving startup.

Local does not mean harmless. The server runs with the privileges of the client process unless the operating environment restricts it. The MCP guidance recommends sandboxing local servers, limiting file system and network access, using minimal default privileges, and requiring explicit grants for additional access. Run the client and server as a non-administrative identity. Do not solve a browser launch problem by running the entire IDE or agent as root.

Pin a reviewed package version in controlled environments rather than accepting new executable code without review on every start. The official examples use \`@latest\`, but reproducible security posture requires knowing which release was approved. Update intentionally after reading official changes and rerunning the threat-focused checks in this article.

## Treat HTTP as a Service Deployment

Playwright MCP can listen on a port, and the official configuration guide shows \`http://localhost:8931/mcp\`. The default host is localhost; \`--host 0.0.0.0\` binds to all interfaces. The latter is not a routine local configuration. It creates a reachable service whose network placement, authentication, authorization, encryption, logging, rate control, and lifecycle must be designed.

The Playwright server's \`allowedHosts\` setting is documented as DNS-rebinding protection, not CORS or user authorization. Do not set it to \`*\` to make an unexplained connection problem disappear. Keep the binding at loopback for a same-machine client. If another machine must connect, place the endpoint behind a reviewed service boundary that implements the current MCP authorization requirements.

The MCP security guidance is explicit about stateful HTTP servers:

- Verify authorization on every inbound request.
- Never use an MCP session ID as authentication.
- Generate secure, non-deterministic session IDs.
- Bind session state to user-specific information when authorization is present.
- Rotate or expire sessions to reduce hijacking impact.
- Restrict HTTP transport with an authorization token or appropriately restricted IPC when applicable.

A URL in an MCP client config proves only where the client connects. It does not add authentication. Do not publish the raw Playwright MCP port on a shared network and assume origin allowlists protect it; those filters govern browser requests, not who may call MCP tools.

## Keep File Access at the Workspace Boundary

The Playwright repository documents a default file policy: access is restricted to MCP workspace roots, or the current working directory when no roots are configured, and navigation to \`file://\` URLs is blocked. The \`--allow-unrestricted-file-access\` flag expands access outside those roots and permits unrestricted \`file://\` navigation.

Leave that flag off. Place upload fixtures, download destinations, initialization scripts, storage-state files, and output directories inside narrowly scoped workspace locations with OS permissions appropriate to the test. Start the MCP client in the intended project rather than a broad home directory. Review workspace roots supplied by the client because they determine the convenience boundary.

The official config schema warns that \`allowUnrestrictedFileAccess\` is a convenience defense against accidental wandering, not a secure boundary. A deliberate attempt can work around it, so true protection comes from client permissions and process isolation. If the server process cannot read SSH keys, cloud credentials, or unrelated repositories at the operating-system layer, a tool mistake has less to expose.

File uploads deserve a separate check. A browser may need one fixture, not the entire downloads folder. Use synthetic files without customer data. Validate the application's file-size, type, and content behavior with purpose-built fixtures. Do not grant broader host access merely because a test prompt says "upload the latest report."

## Restrict Browser Origins without Overclaiming

\`--allowed-origins\` accepts a semicolon-separated list of trusted origins the browser may request. \`--blocked-origins\` uses the same separator, and the blocklist is evaluated first. In the JSON config, \`network.allowedOrigins\` and \`network.blockedOrigins\` are arrays. The documented matching forms include a full origin and a wildcard port such as \`http://localhost:*\`.

A restrictive local test configuration can look like this:

\`\`\`json
{
  "browser": {
    "browserName": "chromium",
    "isolated": true,
    "launchOptions": {
      "headless": true
    }
  },
  "capabilities": ["core", "testing"],
  "network": {
    "allowedOrigins": [
      "https://qa.example.com",
      "https://identity.example.com",
      "http://localhost:*"
    ],
    "blockedOrigins": [
      "http://169.254.169.254"
    ]
  },
  "allowUnrestrictedFileAccess": false,
  "outputDir": "./artifacts/playwright-mcp",
  "console": {
    "level": "warning"
  }
}
\`\`\`

Map the target page's real dependencies before rollout. Authentication may redirect to an identity origin. Scripts, fonts, images, and API calls may use separate origins. Start in a disposable environment, observe required network destinations, approve each by purpose, and retest failure behavior. Do not add broad wildcards that the official matcher does not document.

The warning matters: Playwright says allowed and blocked origins are not a security boundary and do not affect redirects. A URL allowed at the first hop can redirect elsewhere. Use network egress controls, proxy policy, and environment isolation for a stronger destination boundary. The browser list is useful defense in depth, not complete SSRF protection and not authorization for the target system.

\`--block-service-workers\` can reduce service-worker interference and stop those workers from handling requests in the test context. It may also change the application behavior being tested. Enable it when the security or determinism model requires that tradeoff, and document that the resulting run does not cover service-worker behavior.

## Separate Browser Origin Policy from MCP SSRF Controls

The MCP security guide describes SSRF risks during OAuth metadata discovery. A malicious server can direct an MCP client toward internal IP ranges, cloud metadata, localhost services, or redirect chains. Those protocol-level fetches are not the same as the Playwright-controlled page's origin requests.

For server-side MCP clients, the official guidance recommends production HTTPS, blocking private and reserved ranges where appropriate, validating every redirect target, considering an egress proxy, and accounting for DNS time-of-check/time-of-use behavior. It also warns against hand-writing IP validation because alternate encodings and IPv4-mapped IPv6 addresses are easy to mishandle.

Apply the right control to each path:

- Playwright allowed origins constrain browser requests as a convenience guardrail.
- Deployment egress policy constrains where the process and browser can connect.
- MCP client SSRF protections validate OAuth discovery and redirect destinations.
- Authorization determines which clients and users may invoke the service.

Conflating these paths creates gaps. Blocking a browser request to a metadata IP does not prove the MCP client's OAuth discovery code cannot reach it. Validating an access token does not prevent an authorized browser task from navigating to an unintended business system.

## Use Dedicated Profiles and Test Identities

An isolated profile is the safest general starting point because it avoids carrying cookies and localStorage from earlier sessions. It still needs a dedicated test account and controlled target. If authentication is seeded with \`--storage-state\`, protect the JSON file as a credential because its cookies may authorize access.

A persistent profile accumulates authenticated state on disk. Give it a dedicated QA identity, separate it from personal browsing, and define reset and retirement procedures. Do not attach a persistent profile directory to a ticket or commit it as a test fixture.

Browser-extension mode has the broadest state exposure because it reuses selected tabs, logged-in sessions, cookies, and installed extensions from an existing Chrome or Edge profile. Prefer a separate browser profile containing only test accounts. Keep default per-connection approval when practical. If the documented extension token is used to bypass approval, protect it as an authorization secret and remove it when unattended attachment is no longer needed.

Profile isolation does not authorize destructive work. Use environments and accounts that cannot reach production, or enforce role and network restrictions that make unintended production access impossible. A prompt prohibition is weaker than a credential that lacks production privileges.

## Minimize Capabilities and Permissions

Core browser automation is always enabled in the current capability model. Additional \`network\`, \`storage\`, \`testing\`, \`vision\`, \`pdf\`, \`devtools\`, and \`config\` groups are opt-in. Enable only what the task requires. A visibility-check job does not need storage mutation, network routing, video recording, coordinate input, and PDF generation together.

This follows the MCP security guide's scope-minimization principle: begin with low-risk access and elevate only for a specific operation. Tool capabilities and OAuth scopes are not the same mechanism, but both should express least privilege. For remote authorization, avoid wildcard or omnibus scopes, issue precise elevation challenges, log elevation events, and enforce authorization server-side rather than trusting a scope string without policy.

Browser permissions should be narrow too. The Playwright option \`--grant-permissions\` can grant geolocation or clipboard access. Grant only the permission the scenario tests, to the dedicated context, for the duration required. Do not combine \`--ignore-https-errors\`, unrestricted files, broad origins, extensive browser permissions, and \`--no-sandbox\` as a generic compatibility preset. Each removes or weakens a different signal or control.

The \`--no-sandbox\` flag disables browser sandboxing for process types that normally use it. Do not add it by default. If a constrained container requires it, compensate with a reviewed container boundary and minimal host privileges, and record the limitation in test evidence.

## Handle Secrets as Credentials, Not Prompt Text

Playwright MCP accepts \`--secrets <path>\` for a dotenv-format file. Its official config-schema comment explains that matching plaintext is replaced in tool responses to reduce accidental model exposure. It also says this is a convenience, not a security feature. Redaction can reduce one output path; it is not a vault, an access-control system, or proof that every artifact is clean.

A secrets file should contain placeholders in documentation and real values only in a protected runtime file:

\`\`\`dotenv
QA_USERNAME=replace-at-runtime
QA_PASSWORD=replace-at-runtime
\`\`\`

Reference it without embedding values in the MCP client config:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--secrets=./.secrets/playwright-mcp.env"
      ]
    }
  }
}
\`\`\`

Restrict file permissions, exclude the real file from source control, use dedicated low-privilege accounts, and rotate credentials after suspected exposure. Inspect screenshots, videos, traces, downloaded files, console messages, network logs, saved sessions, and storage state independently. A masking feature for text responses cannot guarantee secrets are absent from images or files.

Never place a password, bearer token, extension token, storage-state JSON, or cookie value directly in a prompt. Model and client logs may preserve prompts. Prefer an approved secret-injection path where the model does not need the plaintext value, and keep audit logs useful without recording credentials.

## Control Output and Retention

\`--output-dir\` centralizes MCP artifacts. That makes access and cleanup easier if the directory is dedicated, permission-restricted, and outside public web roots. \`--save-session\`, output-to-file mode, video, screenshots, console export, network output, and traces can increase the amount of sensitive state retained.

Adopt an artifact policy before enabling them:

1. Classify the target environment and likely page data.
2. Save only evidence needed for the test decision.
3. Redact or avoid customer and employee data at the source.
4. Limit directory access to the QA job and reviewers.
5. Set a retention period and delete expired evidence safely.
6. Review artifacts before attaching them to an issue or external system.
7. Record which artifacts were omitted because they could expose secrets.

The \`outputMaxSize\` configuration can evict old output by threshold, but capacity management is not a complete retention or secure-deletion policy. Use deployment storage controls appropriate to the data sensitivity.

## Implement Remote Authorization Correctly

When Playwright MCP is placed behind a remote MCP service, follow the current authorization and security documents rather than passing arbitrary bearer tokens through. The MCP guidance forbids token passthrough: a server must not accept a token not issued for itself and forward that same token to a downstream API.

Validate that inbound tokens are intended for the MCP server, including audience binding. If the server calls another API, obtain a separate downstream token through the correct authorization relationship. This prevents one token from silently crossing trust boundaries and preserves service-specific logging and controls.

For proxy servers using a static client ID with a third-party authorization server, the security guide requires per-client consent. Consent must identify the requesting MCP client, requested third-party scopes, and registered redirect URI; protect against CSRF; validate redirect URIs exactly; and bind consent to the specific client. Use well-tested authorization libraries rather than implementing token validation by hand.

Keep scopes narrow and progressive. A browser-read or low-risk discovery workflow should not receive file-wide, database-wide, and administrative access because a future task might need them. Log scope elevation with correlation identifiers and accept reduced-scope tokens when policy allows.

## Run a Security Acceptance Review

Before enabling Playwright MCP for a team, verify observable controls:

- The exact startup command and package version are approved.
- The process runs without administrator privileges in a restricted environment.
- Direct stdio is used unless HTTP has a documented requirement.
- Any HTTP endpoint authenticates and authorizes every request and is not exposed by accident.
- The workspace root contains only files needed for the task.
- Unrestricted file access and \`file://\` navigation remain disabled.
- The profile is isolated or dedicated; personal browser state is not attached.
- Storage-state and extension tokens are protected and revocable.
- Browser origins are enumerated, tested, and backed by egress controls.
- Only required capabilities and permissions are enabled.
- Output directories, artifact types, and retention are controlled.
- The target account cannot perform actions outside the approved QA scope.
- Remote token audiences, downstream tokens, sessions, and scopes follow MCP guidance.

Test denied paths too. Confirm an out-of-root upload cannot proceed through the normal workflow, an unapproved origin is blocked, an unauthorized HTTP request is rejected by the service boundary, a low-scope identity cannot invoke privileged operations, and artifact access is limited. A configuration review without negative tests proves intent, not enforcement.

## Security Limits and Version Check

This article reflects official Playwright MCP and MCP security documentation available on July 14, 2026. Examples use current option names and the official \`@latest\` setup form. Security-sensitive teams should pin an approved release, monitor official changes, and rerun acceptance checks after updates because tool surfaces, defaults, extension behavior, and configuration fields can evolve.

Playwright MCP remains a browser automation server, not a sandbox or policy engine. Its file restriction, origin lists, and secret replacement are explicitly convenience defenses. Origin controls do not cover redirects. Isolated profiles do not roll back remote side effects. Secret masking does not sanitize every artifact. stdio narrows local access but does not make an over-privileged process safe. HTTP authorization does not make every authorized browser action appropriate.

The secure design places hard controls outside the model-driven loop: OS permissions, process isolation, network egress, dedicated identities, environment separation, authenticated transport, server-side authorization, narrow scopes, and artifact access. Prompts and team instructions then add operational intent on top of those boundaries.

## FAQ: Security Operations

### Is Playwright MCP a security boundary?

No. The official project states that it is not. Treat file restrictions, origin filters, and secret masking as defense-in-depth conveniences, and rely on client permissions, process isolation, network policy, dedicated identities, and authorization for enforceable boundaries.

### Should I enable allow-unrestricted-file-access for uploads?

Normally no. Put approved synthetic fixtures inside a narrow workspace root and keep the default restriction. If a rare workflow needs another directory, grant access at the client or operating-system layer as narrowly and temporarily as possible rather than opening the whole file system.

### Do allowed origins stop all navigation to other sites?

No. The official warning says origin allowlists and blocklists do not affect redirects and are not a security boundary. Combine them with egress controls, isolated environments, and explicit target authorization.

### Does the secrets file securely store credentials?

No. Playwright MCP uses its values to replace matching plaintext in tool responses as a convenience. Protect the dotenv file separately, avoid exposing values to prompts, and inspect images, logs, state files, and other artifacts that text masking may not cover.

### Is localhost HTTP as safe as direct stdio?

They have different exposure. Direct stdio limits communication to the owning client process. A localhost HTTP listener can be reached by other local processes and needs attention to DNS rebinding and authorization architecture. Prefer stdio unless a separate server is required.

### Can an MCP session ID authenticate an HTTP client?

No. The MCP security guidance says servers must not use sessions for authentication and must verify authorization on every inbound request. Session IDs should be secure, non-deterministic, user-bound where appropriate, and rotated or expired.

### Why should token audience validation matter for a browser server?

A remote MCP service must accept only tokens issued for itself. Without audience binding, a token intended for another resource may be reused, controls can be bypassed, and confused-deputy behavior becomes possible. Downstream APIs should receive separate tokens, not the client's MCP token.

### Does an isolated profile prevent production changes?

No. It discards local browser profile changes when the browser closes. A submitted production form, created record, sent email, or external API action remains. Prevent production access with accounts, roles, network boundaries, and environment controls.

### Should I use the browser extension with my normal work profile?

Avoid it for QA automation. Extension mode reuses existing tabs, sessions, cookies, and installed extensions. Use a dedicated browser profile and test identities, select only the intended tab, and keep connection approval unless unattended attachment is explicitly reviewed.
`,
    },
  },
];
