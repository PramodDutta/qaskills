import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Server Setup + Configuration 2026 Reference',
  description:
    'Full 2026 @playwright/mcp args reference: --headless, --browser, --viewport-size, --device, --user-data-dir, --output-dir, --caps. Complete JSON+bash setup walkthrough.',
  date: '2026-06-05',
  category: 'Reference',
  content: `
# Playwright MCP Server Setup + Configuration 2026 Reference

The Playwright MCP server is configured through a small but expressive set of command-line flags. Most teams start with the default \\\`npx -y @playwright/mcp@latest\\\` invocation and never touch a flag; they then hit a wall the first time they need a mobile viewport, a Firefox session, or a stable test-results directory for CI. This reference catalogs every supported argument as of 2026, with a runnable example for each flag, default values, and the trade-offs that matter for production QA. It is the document I wish I had open while wiring my first six MCP installs.

The flags fall into five groups: browser selection, viewport and device emulation, profile persistence, output and tracing, and capability scoping. We will walk each group in turn, showing the bash invocation that previews the flag in isolation and the equivalent \\\`mcp.json\\\` snippet that wires it into Cursor, Claude Desktop, or any MCP host. Two reference tables at the end summarize every flag and its default. For the install path before configuration, start with the [Playwright MCP install in Cursor guide](/blog/playwright-mcp-server-install-cursor-2026-step-by-step). For protocol-level context on MCP itself, see [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide).

## Key Takeaways

- **Five flag groups** cover every realistic configuration.
- **--browser and --device** drive emulation; combine for mobile-on-Chrome.
- **--user-data-dir** persists login state across sessions.
- **--output-dir** centralizes screenshots, traces, and recordings.
- **--caps** locks down the toolset for shared or CI installs.

---

## 1. Invocation Shape

Every config begins with the same command and grows by appending flags:

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest [flags...]
\\\`\\\`\\\`

The host launches this as a child process and speaks JSON-RPC over stdio. The flags below are passed through \\\`args\\\` in \\\`mcp.json\\\`:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\\\`\\\`\\\`

Flags are space-separated inside the array. Quote values that contain spaces.

## 2. Browser Selection: --browser

The default engine is bundled Chromium. Override with one of five values:

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --browser=chromium
npx -y @playwright/mcp@latest --browser=chrome
npx -y @playwright/mcp@latest --browser=msedge
npx -y @playwright/mcp@latest --browser=firefox
npx -y @playwright/mcp@latest --browser=webkit
\\\`\\\`\\\`

| Value | Engine | Install required |
|---|---|---|
| \\\`chromium\\\` | Playwright Chromium build | bundled |
| \\\`chrome\\\` | Google Chrome stable | system install |
| \\\`msedge\\\` | Microsoft Edge stable | system install |
| \\\`firefox\\\` | Playwright Firefox build | bundled |
| \\\`webkit\\\` | Playwright WebKit (Safari engine) | bundled |

System browsers (\\\`chrome\\\`, \\\`msedge\\\`) match real user environments better than the bundled builds. They also pick up enterprise managed extensions, which is sometimes exactly what you want for SSO testing and sometimes exactly what you do not want for hermetic test runs.

## 3. Headless Mode: --headless

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --headless
\\\`\\\`\\\`

Default is headed. Headless mode:

- Saves about 200 MB RAM per session.
- Avoids focus-stealing when the agent clicks.
- Is required on Linux CI runners without an X server.
- Hides the visual feedback most useful during initial setup.

Recommended workflow: keep headed locally during development; switch to headless for shared MCP installs in containers and CI.

## 4. Viewport: --viewport-size

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --viewport-size=1920,1080
\\\`\\\`\\\`

Default is 1280x720. Common values:

| Use case | Value |
|---|---|
| Default desktop | 1280,720 |
| Full HD desktop | 1920,1080 |
| MacBook 13 (CSS px) | 1440,900 |
| MacBook 16 (CSS px) | 1536,960 |
| Tablet landscape | 1024,768 |

Combine with \\\`--device\\\` for mobile; if both are set, \\\`--device\\\` wins and \\\`--viewport-size\\\` is ignored.

## 5. Device Emulation: --device

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --device="iPhone 15 Pro"
npx -y @playwright/mcp@latest --device="Pixel 8"
npx -y @playwright/mcp@latest --device="iPad Pro 11"
\\\`\\\`\\\`

The list of supported device names matches Playwright's \\\`devices\\\` registry. Each device preset sets:

- Viewport width and height
- Device pixel ratio
- User agent string
- Touch support flag
- Default browser engine (WebKit for iPhone/iPad)

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright-mobile": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--device=iPhone 15 Pro",
        "--headless"
      ]
    }
  }
}
\\\`\\\`\\\`

Register two MCP entries (one desktop, one mobile) so the agent can choose per-prompt.

## 6. User Data Dir: --user-data-dir

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest \\\\
  --user-data-dir=/tmp/playwright-mcp-profile
\\\`\\\`\\\`

Persists cookies, localStorage, IndexedDB, and service worker registrations across MCP sessions. Without this flag, every session starts fresh and you must log in again.

Best practices:

- Place the path outside the repo, under \\\`/tmp\\\` or \\\`~/.cache\\\`.
- Gitignore the path if you must keep it inside the project.
- Use a dedicated path per environment (staging vs prod).
- Rotate the path quarterly to clear stale cache state.

\\\`\\\`\\\`bash
mkdir -p ~/.cache/pw-mcp-staging ~/.cache/pw-mcp-prod
\\\`\\\`\\\`

## 7. Output Directory: --output-dir

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest \\\\
  --output-dir=./test-results/mcp
\\\`\\\`\\\`

Default is \\\`./test-results\\\`. The MCP server writes here:

- Screenshots from \\\`browser_take_screenshot\\\`
- Trace files when tracing is enabled
- Video recordings if requested
- Console log dumps from \\\`browser_console_messages\\\`

For shared installs, point \\\`--output-dir\\\` at a directory excluded from version control:

\\\`\\\`\\\`bash
echo "test-results/" >> .gitignore
\\\`\\\`\\\`

## 8. Capability Scoping: --caps

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest \\\\
  --caps=navigate,snapshot,screenshot,click,type
\\\`\\\`\\\`

Limits the tools exposed to the agent. Available caps:

| Cap | Tools enabled |
|---|---|
| \\\`navigate\\\` | browser_navigate, browser_navigate_back |
| \\\`snapshot\\\` | browser_snapshot |
| \\\`screenshot\\\` | browser_take_screenshot |
| \\\`click\\\` | browser_click, browser_hover |
| \\\`type\\\` | browser_type, browser_fill_form |
| \\\`select\\\` | browser_select_option |
| \\\`wait\\\` | browser_wait_for |
| \\\`tabs\\\` | browser_tabs |
| \\\`network\\\` | browser_network_request, browser_network_requests |
| \\\`console\\\` | browser_console_messages |
| \\\`evaluate\\\` | browser_evaluate |
| \\\`upload\\\` | browser_file_upload |

Omit \\\`evaluate\\\` from production installs; arbitrary JS evaluation in a real browser context is the largest blast radius in the toolset.

## 9. Allow and Block Lists

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest \\\\
  --allowed-origins=staging.example.com,api.example.com
\\\`\\\`\\\`

Restricts the URLs the agent can navigate. Use for shared installs where the agent should not stray onto external sites:

\\\`\\\`\\\`json
{
  "args": [
    "-y",
    "@playwright/mcp@latest",
    "--allowed-origins=app.staging.example.com",
    "--blocked-origins=*.ads.example.com,*.analytics.com"
  ]
}
\\\`\\\`\\\`

Glob patterns are supported on \\\`--blocked-origins\\\`. Origins not listed in \\\`--allowed-origins\\\` return a 403 from the MCP server.

## 10. Save Trace: --save-trace

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --save-trace
\\\`\\\`\\\`

Records a Playwright trace for every session, written to \\\`--output-dir\\\`. The trace includes:

- Every DOM mutation
- Every network request
- Every screenshot at action boundaries
- Console messages and unhandled errors

Open the trace with:

\\\`\\\`\\\`bash
npx playwright show-trace ./test-results/mcp/trace.zip
\\\`\\\`\\\`

Traces add about 10-30 MB per session. Keep \\\`--save-trace\\\` off by default and enable per-debugging-session via a second MCP entry.

## 11. Save Session: --save-session

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --save-session
\\\`\\\`\\\`

Persists the JSON conversation history with the agent into \\\`--output-dir\\\`. Useful for replaying a flaky generation, sharing reproductions, and feeding back into prompt engineering tooling.

## 12. Network Isolation: --proxy-server

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest \\\\
  --proxy-server=http://corp-proxy:3128
\\\`\\\`\\\`

Routes all browser network through the named proxy. Common values:

- Corporate HTTP proxy
- mitmproxy on \\\`http://localhost:8080\\\` for traffic inspection
- A staging-only proxy that adds auth headers

\\\`\\\`\\\`json
{
  "args": [
    "-y",
    "@playwright/mcp@latest",
    "--proxy-server=http://localhost:8080"
  ]
}
\\\`\\\`\\\`

Combine with mitmweb to inspect every request the agent makes; this is the single best debugging tool when an agent reports "the page did not load" but the URL is correct.

## 13. Timeout: --timeout

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --timeout=30000
\\\`\\\`\\\`

Default action timeout is 30 seconds. Lower for fast-failure during CI; raise for slow-rendering enterprise apps:

| Environment | Recommended |
|---|---|
| Local dev | 30000 |
| Fast CI | 15000 |
| Slow staging | 60000 |
| Enterprise legacy app | 90000 |

## 14. Ignore HTTPS Errors: --ignore-https-errors

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --ignore-https-errors
\\\`\\\`\\\`

Useful for staging environments with self-signed certificates. Never enable on production-facing installs.

## 15. Storage State: --storage-state

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest \\\\
  --storage-state=./auth/staging-user.json
\\\`\\\`\\\`

Loads a previously exported Playwright storage state file. This is faster than \\\`--user-data-dir\\\` for headless CI runs because no profile directory locking is required.

Generate the file once:

\\\`\\\`\\\`typescript
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto('https://staging.example.com/login');
await page.fill('input[name=email]', process.env.E2E_USER!);
await page.fill('input[name=password]', process.env.E2E_PASS!);
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard');
await ctx.storageState({ path: './auth/staging-user.json' });
await browser.close();
\\\`\\\`\\\`

Re-run the script weekly to refresh expiring sessions.

## 16. A Full Production Config

Combining flags for a hardened, traceable, scoped install:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright-staging": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--browser=chromium",
        "--headless",
        "--viewport-size=1440,900",
        "--user-data-dir=/tmp/pw-mcp-staging",
        "--output-dir=./test-results/mcp",
        "--save-trace",
        "--allowed-origins=staging.example.com,api.staging.example.com",
        "--caps=navigate,snapshot,screenshot,click,type,select,wait",
        "--timeout=45000"
      ],
      "env": {
        "BASE_URL": "https://staging.example.com"
      }
    }
  }
}
\\\`\\\`\\\`

## 17. Mobile + Desktop Side-by-Side

Register both engines so the agent can choose:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright-desktop": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--browser=chromium",
        "--viewport-size=1920,1080",
        "--headless"
      ]
    },
    "playwright-mobile": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--device=iPhone 15 Pro",
        "--headless"
      ]
    }
  }
}
\\\`\\\`\\\`

Prompt patterns: "use playwright-desktop to ..." vs "use playwright-mobile to ...".

## 18. Complete Flag Reference Table

| Flag | Default | Example |
|---|---|---|
| \\\`--browser\\\` | chromium | \\\`--browser=firefox\\\` |
| \\\`--headless\\\` | false | \\\`--headless\\\` |
| \\\`--viewport-size\\\` | 1280,720 | \\\`--viewport-size=1920,1080\\\` |
| \\\`--device\\\` | (none) | \\\`--device=iPhone 15 Pro\\\` |
| \\\`--user-data-dir\\\` | ephemeral | \\\`--user-data-dir=/tmp/profile\\\` |
| \\\`--output-dir\\\` | ./test-results | \\\`--output-dir=./out\\\` |
| \\\`--caps\\\` | all | \\\`--caps=navigate,snapshot\\\` |
| \\\`--allowed-origins\\\` | * | \\\`--allowed-origins=staging.com\\\` |
| \\\`--blocked-origins\\\` | (none) | \\\`--blocked-origins=*.ads.com\\\` |
| \\\`--save-trace\\\` | false | \\\`--save-trace\\\` |
| \\\`--save-session\\\` | false | \\\`--save-session\\\` |
| \\\`--proxy-server\\\` | (none) | \\\`--proxy-server=http://p:3128\\\` |
| \\\`--timeout\\\` | 30000 | \\\`--timeout=45000\\\` |
| \\\`--ignore-https-errors\\\` | false | \\\`--ignore-https-errors\\\` |
| \\\`--storage-state\\\` | (none) | \\\`--storage-state=./auth.json\\\` |

## 19. Smoke Test the Configuration

A one-liner smoke test against the configured server:

\\\`\\\`\\\`bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \\\\
  npx -y @playwright/mcp@latest --headless --stdio \\\\
  | jq '.result.tools | length'
\\\`\\\`\\\`

Expected output: a number (current Playwright MCP exposes around 25 tools). Anything other than a positive integer indicates the server did not initialize.

## Frequently Asked Questions

### Which flag has the largest impact on session memory?

\\\`--save-trace\\\`. Tracing buffers DOM mutations and screenshots in memory before flushing to disk; a long session can climb past 1 GB. Disable it when not actively debugging.

### Can I combine --device and --browser?

Partially. \\\`--device\\\` sets the default engine for that device (WebKit for iPhone, Chromium for Pixel). You can override with \\\`--browser=chromium\\\` to run iPhone emulation on Chromium, which catches a different class of bugs.

### Does --user-data-dir leak between agents in a team?

No, as long as each install uses its own path. If you commit the path to \\\`.cursor/mcp.json\\\`, every teammate uses the same directory under their home, isolating profiles per machine.

### Why does --headless behave differently on macOS vs Linux?

The difference is window management, not the headless mode itself. macOS without \\\`--headless\\\` brings the browser window to the foreground on every action. Linux headed mode usually runs in a virtual display and does not steal focus.

### How do I see which flags the running server is using?

The MCP server logs its parsed args on startup. Check the host log: \\\`~/Library/Logs/Cursor/main.log\\\` on macOS, \\\`%APPDATA%\\\\Cursor\\\\logs\\\\main.log\\\` on Windows. The line begins with "Playwright MCP starting with flags: ...".

### Is --proxy-server compatible with --ignore-https-errors?

Yes, and it is a common combination for routing through mitmproxy where the proxy's CA is not in the system trust store.

### Can I change flags without restarting Cursor?

No. The MCP server is a child process and flags are read at spawn time. Edit \\\`mcp.json\\\` then fully quit and relaunch the host.

## Conclusion + CTA

The Playwright MCP server exposes a focused, well-named set of flags that map cleanly onto real QA needs: emulate a device, persist a login, route through a proxy, scope the toolset. Start with the minimal config, add flags as friction shows up, and keep the production config in version control next to the rest of your test infrastructure. For the install path that gets you here, see [Playwright MCP install in Cursor](/blog/playwright-mcp-server-install-cursor-2026-step-by-step). For an agent-driven workflow that uses every flag in this reference, see the [Playwright skills directory](/skills) and the [test agents comparison](/compare).
`,
};
