import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Server Configuration: Complete Reference 2026',
  description: 'Configure the Playwright MCP server for Claude Code, Cursor, Codex, and other AI agents. CLI flags, environment variables, network modes, and security options.',
  date: '2026-05-04',
  category: 'Reference',
  content: `
# Playwright MCP Server Configuration: Complete Reference 2026

The Playwright MCP server is the bridge between AI agents and Chromium. It exposes browser actions (navigate, click, fill, snapshot) as Model Context Protocol tools and answers in the same structured format every modern AI assistant understands. Configuration choices determine which browsers are available, whether sessions persist, how network traffic is filtered, and whether the server is sandboxed enough to expose to untrusted prompts. This reference covers every flag, environment variable, and config file option for the \`@playwright/mcp\` package in 2026.

If you have not connected Playwright MCP before, the [MCP for QA Engineers](/blog/mcp-for-qa-engineers-guide) guide walks through the conceptual setup. For the snapshot format the server emits, see [Playwright MCP Accessibility Snapshots Reference](/blog/playwright-mcp-accessibility-snapshots-reference). The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants connect to the right server with the right tools enabled.

## Installation

\`\`\`bash
# Global install for system-wide use
pnpm add -g @playwright/mcp

# Or run on demand
npx @playwright/mcp@latest --port 8931
\`\`\`

The \`latest\` tag tracks the same release cadence as the \`@playwright/test\` package. Pinning to a specific version is fine for production: \`@playwright/mcp@0.7.0\`.

## Launching the server

The server speaks stdio by default; it can also run as a SSE or websocket service for remote connections.

\`\`\`bash
# stdio mode (default; preferred for Claude Code and Cursor)
npx @playwright/mcp

# HTTP/SSE mode on port 8931
npx @playwright/mcp --port 8931

# Specify config file
npx @playwright/mcp --config ./mcp.config.json
\`\`\`

Stdio mode is the lowest-latency, simplest configuration. The host AI assistant spawns the server as a subprocess and exchanges JSON-RPC frames on stdin and stdout. HTTP mode is useful when the assistant runs in a different container or VM.

## CLI flags

The full flag reference for version 0.7.0+:

| Flag | Default | Purpose |
|---|---|---|
| \`--port <num>\` | (stdio) | Run HTTP server on the given port |
| \`--host <addr>\` | \`localhost\` | Bind address for HTTP mode |
| \`--browser <name>\` | \`chromium\` | One of chromium, chrome, msedge, firefox, webkit |
| \`--device <name>\` | (none) | Apply a device descriptor at launch |
| \`--executable-path <path>\` | (auto) | Path to a custom browser binary |
| \`--headless\` | true | Run headless (set false for visible window) |
| \`--vision\` | false | Enable screenshot tools |
| \`--isolated\` | false | New context per session, no persistent state |
| \`--user-data-dir <path>\` | (temp) | Persistent profile location |
| \`--cdp-endpoint <url>\` | (none) | Connect to existing browser over CDP |
| \`--proxy-server <url>\` | (none) | HTTP proxy for browser requests |
| \`--proxy-bypass <list>\` | (none) | Comma-separated bypass list |
| \`--block-service-workers\` | false | Disable service worker registration |
| \`--allowed-origins <list>\` | (all) | Comma-separated allow list for navigations |
| \`--blocked-origins <list>\` | (none) | Comma-separated block list |
| \`--ignore-https-errors\` | false | Bypass TLS validation (testing only) |
| \`--no-sandbox\` | false | Disable Chromium sandbox (Docker) |
| \`--storage-state <path>\` | (none) | Initial storage state JSON |
| \`--save-trace\` | false | Auto-save trace per session |
| \`--output-dir <path>\` | \`./mcp-output\` | Where traces and downloads land |
| \`--save-session\` | false | Persist session log to output-dir |
| \`--config <path>\` | (none) | Load config from JSON file |
| \`--caps <list>\` | (all) | Comma-separated capability filter |

## Capability filtering

By default the server exposes every capability: navigation, click, fill, snapshot, screenshot, network, console, dialog, and file. For a hardened deployment, restrict capabilities to the minimum the assistant needs.

\`\`\`bash
npx @playwright/mcp --caps core,navigation,snapshot
\`\`\`

Capability groups:

| Group | Includes |
|---|---|
| \`core\` | \`browser_install\`, \`browser_close\`, \`browser_resize\` |
| \`navigation\` | \`browser_navigate\`, \`browser_navigate_back\`, \`browser_navigate_forward\` |
| \`interaction\` | \`browser_click\`, \`browser_fill\`, \`browser_press_key\`, \`browser_select_option\`, \`browser_hover\`, \`browser_drag\` |
| \`snapshot\` | \`browser_snapshot\` |
| \`screenshot\` | \`browser_take_screenshot\` |
| \`network\` | \`browser_network_requests\`, \`browser_network_request\` |
| \`console\` | \`browser_console_messages\` |
| \`dialog\` | \`browser_handle_dialog\` |
| \`file\` | \`browser_file_upload\` |
| \`tabs\` | \`browser_tabs\` |
| \`evaluate\` | \`browser_evaluate\` (dangerous; runs arbitrary JS) |
| \`pdf\` | \`browser_pdf_save\` |
| \`testing\` | \`browser_run_code_unsafe\` (extremely dangerous) |

Always omit \`evaluate\` and \`testing\` for prompts you do not fully trust.

## Config file format

For repeatable deployments, store options in a JSON file.

\`\`\`json
{
  "browser": "chromium",
  "headless": true,
  "isolated": true,
  "vision": true,
  "caps": ["core", "navigation", "interaction", "snapshot", "screenshot"],
  "outputDir": "./mcp-output",
  "saveTrace": true,
  "context": {
    "viewport": { "width": 1280, "height": 720 },
    "deviceScaleFactor": 1,
    "locale": "en-US",
    "timezoneId": "America/Los_Angeles",
    "userAgent": "Mozilla/5.0 (Macintosh; ...)"
  },
  "allowedOrigins": ["https://qaskills.sh", "https://docs.qaskills.sh"],
  "blockedOrigins": ["https://*.adservice.google.com"]
}
\`\`\`

Pass with \`--config\`:

\`\`\`bash
npx @playwright/mcp --config ./mcp.config.json
\`\`\`

CLI flags override config file values, so you can keep a base config and override per environment.

## Connecting Claude Code

For Claude Code, register the server in \`~/.config/claude-code/mcp.json\` (or the workspace-local equivalent).

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "0"
      }
    }
  }
}
\`\`\`

Restart Claude Code; the \`playwright\` server appears in the MCP server list. The assistant can now call any unfiltered tool.

## Connecting Cursor

Cursor reads MCP from its own settings file.

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--isolated", "--caps", "core,navigation,interaction,snapshot,screenshot"]
    }
  }
}
\`\`\`

The settings file lives at \`~/.cursor/mcp_servers.json\` on macOS. After saving, restart Cursor and the assistant gains browser tools.

## Connecting Codex CLI

Codex CLI accepts MCP via the \`--mcp-server\` flag or its config file.

\`\`\`bash
codex --mcp-server "playwright:npx @playwright/mcp@latest"
\`\`\`

For persistent setup, edit \`~/.codex/config.toml\`:

\`\`\`toml
[[mcp_servers]]
name = "playwright"
command = "npx"
args = ["@playwright/mcp@latest"]
\`\`\`

## Persistent profiles

By default each session starts in a fresh user data directory that the server deletes on shutdown. To preserve cookies, sessions, and cached resources between runs:

\`\`\`bash
npx @playwright/mcp --user-data-dir ./mcp-profile
\`\`\`

The profile directory contains \`Default/Cookies\`, \`Default/Local Storage\`, and the rest of a Chromium profile. Treat it as sensitive; cookies are unencrypted on disk.

## Connecting to an existing browser

Sometimes you want to drive an already-open Chrome (for example, one with logged-in tabs). Launch Chrome with the debug protocol enabled, then connect.

\`\`\`bash
# Launch Chrome with remote debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=./chrome-data

# Connect MCP to it
npx @playwright/mcp --cdp-endpoint http://localhost:9222
\`\`\`

The MCP server uses the running Chrome's CDP rather than spawning its own. Useful for interactive sessions and live debugging.

## Proxies and network controls

For corporate networks or filtered tests:

\`\`\`bash
npx @playwright/mcp \\
  --proxy-server http://proxy.corp:8080 \\
  --proxy-bypass localhost,127.0.0.1
\`\`\`

For controlling what the assistant can reach:

\`\`\`bash
npx @playwright/mcp \\
  --allowed-origins https://qaskills.sh,https://docs.qaskills.sh \\
  --blocked-origins https://api.openai.com
\`\`\`

Allowed origins are an allow-list: any navigation outside the list is rejected with an explanatory error. Use this when running assistants on production data; it prevents prompt injection from leaking the page to attacker-controlled servers.

## Trace and session recording

To capture every action the assistant takes:

\`\`\`bash
npx @playwright/mcp --save-trace --save-session --output-dir ./audit
\`\`\`

Each session produces a trace.zip and a session.log under \`./audit/<session-id>/\`. The session log is a chronological JSON-Lines file of every MCP tool call. The trace.zip opens in Playwright's trace viewer:

\`\`\`bash
npx playwright show-trace ./audit/abc123/trace.zip
\`\`\`

This is invaluable for incident review when an agent did something unexpected.

## Running in Docker

The official image bundles the server and all browser dependencies.

\`\`\`dockerfile
FROM mcr.microsoft.com/playwright:v1.49.0-jammy
WORKDIR /app
RUN npm install -g @playwright/mcp@latest
EXPOSE 8931
CMD ["npx", "@playwright/mcp", "--port", "8931", "--host", "0.0.0.0", "--no-sandbox"]
\`\`\`

\`--no-sandbox\` is required in most Docker setups because the container runs as a non-root user without the kernel capabilities Chromium expects. Run only on trusted networks; the HTTP endpoint has no auth.

## Adding basic auth in HTTP mode

The server has no built-in auth. Wrap it with a reverse proxy:

\`\`\`nginx
location /mcp {
  auth_basic "MCP";
  auth_basic_user_file /etc/nginx/mcp.htpasswd;
  proxy_pass http://localhost:8931;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection upgrade;
}
\`\`\`

Or use Cloudflare Access in front. Never expose the raw MCP port to the public Internet without authentication.

## Environment variables

In addition to flags, the server reads these env vars:

| Variable | Purpose |
|---|---|
| \`PLAYWRIGHT_BROWSERS_PATH\` | Where Playwright caches browsers (\`0\` keeps node_modules) |
| \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD\` | Skip download on install |
| \`PLAYWRIGHT_LAUNCH_OPTIONS\` | JSON of additional launch options |
| \`MCP_DEBUG\` | Enable verbose logs |
| \`MCP_LOG_FILE\` | Redirect logs to a file |

## Vision mode

For agents that need screenshots, enable \`--vision\`. The \`browser_take_screenshot\` tool returns a base64-encoded PNG in the response.

\`\`\`bash
npx @playwright/mcp --vision --caps core,navigation,snapshot,screenshot
\`\`\`

Vision mode increases per-response token cost, so enable only for tasks that genuinely need pixel context.

## Common pitfalls

**Pitfall 1: Forgetting \`--isolated\` in shared sessions.** Without isolation, two agents on the same server share cookies and storage, which leaks state.

**Pitfall 2: Allowing \`evaluate\`.** Any agent can run arbitrary JS in the page when this capability is enabled. Treat it like \`eval()\`.

**Pitfall 3: Open port on 0.0.0.0.** Default bind is localhost. Changing it to 0.0.0.0 in Docker exposes the server to every container on the network. Always front with auth.

**Pitfall 4: Persistent profiles in CI.** Profiles accumulate cookies and trackers that change test behavior across runs. Use \`--isolated\` in CI.

**Pitfall 5: Mismatched Playwright versions.** The server's bundled browser must match the version the host expects. Pin \`@playwright/mcp\` to the same minor as \`@playwright/test\`.

## Anti-patterns

- Exposing the server unauthenticated to a public network.
- Trusting untrusted prompts to drive the browser without an allowed-origins guard.
- Enabling all capabilities for every agent regardless of task.
- Running with \`--no-sandbox\` outside of Docker.
- Keeping the server running for multi-day sessions; restart daily to recycle browsers.

## Conclusion and next steps

Tuning the Playwright MCP server is the difference between a usable assistant and a dangerous one. Pin versions, restrict capabilities, enforce origin allow-lists, and save traces for accountability.

Pair with the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants know the tool surface you exposed. Read the [Playwright MCP Accessibility Snapshots Reference](/blog/playwright-mcp-accessibility-snapshots-reference) to understand the snapshots the server returns. For end-to-end agent workflows, [Playwright Test Agents Planner Generator Healer Guide](/blog/playwright-test-agents-planner-generator-healer-guide) covers the planner/generator/healer pattern.
`,
};
