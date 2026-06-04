import type { BlogPost } from './index';

export const post: BlogPost = {
  title: '@playwright/mcp mcp.json Configuration Reference (2026)',
  description:
    'Complete @playwright/mcp mcp.json reference: every flag, args, headless, browser, isolated, storage-state, plus Cursor, Claude Code, and Windsurf configs.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# @playwright/mcp mcp.json Configuration Reference 2026

The Playwright MCP server (\`@playwright/mcp\`) is the bridge that lets AI coding agents drive a real browser -- navigating, clicking, typing, and reading accessibility snapshots -- through the Model Context Protocol. Wiring it up correctly comes down to one small JSON file, the \`mcp.json\`, and the command-line flags you pass to the server inside it. Get that file right and your agent gains a full browser; get a single key wrong and you face a red dot and zero tools. This is a complete, exhaustive reference for that configuration.

This guide documents the entire surface area: the structure of \`mcp.json\` and the universal \`command\`/\`args\`/\`env\` fields every MCP client shares, then every meaningful \`@playwright/mcp\` flag -- \`--headless\`, \`--browser\`, \`--device\`, \`--viewport-size\`, \`--isolated\`, \`--storage-state\`, \`--caps\`, \`--user-data-dir\`, \`--proxy-server\`, \`--save-trace\`, and more -- each with a runnable JSON snippet. Because each host names its config file slightly differently, we provide ready-to-paste configurations for Cursor, Claude Code, and Windsurf. Two reference tables summarize every flag and every host's config path so you never have to guess. If you want a maintained, copy-paste baseline, the [playwright-mcp skill](/skills) on QASkills bundles these configs. Let's start with the anatomy of the file.

## Anatomy of mcp.json

Across virtually every MCP host, the configuration is a JSON object with a top-level \`mcpServers\` map. Each entry names a server and tells the host how to launch it. The three universal fields are \`command\` (the executable), \`args\` (an array of string arguments), and the optional \`env\` (environment variables passed to the process). The canonical minimal Playwright MCP entry is:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\`\`\`

Three rules govern this object and account for most misconfigurations:

- **\`command\` must be findable.** It is either an absolute path or a binary on the host process's PATH. GUI-launched apps often have a reduced PATH, so an absolute path to \`npx\` is the safest choice.
- **\`args\` is an array of strings**, never a single space-joined string. \`["-y", "@playwright/mcp@latest", "--headless"]\` is correct; \`["-y @playwright/mcp@latest --headless"]\` is not.
- **\`-y\` is mandatory for npx.** It auto-confirms the package install so the non-interactively launched server does not hang waiting for input.

Adding environment variables uses the \`env\` object:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {
        "HTTPS_PROXY": "http://proxy.corp.example.com:8080"
      }
    }
  }
}
\`\`\`

## Pinning the Version

For reproducibility across a team or CI, never rely on \`@latest\` -- it silently upgrades and can change tool behavior overnight. Pin an explicit version in the package spec inside \`args\`:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.41"]
    }
  }
}
\`\`\`

Everyone who opens the project then runs the identical server build. Treat the pinned version like any other dependency: bump it deliberately, test it, commit the change. Reserve \`@latest\` for throwaway personal experiments.

## --headless and --browser

By default the server launches a visible (headed) browser, which is great locally because you can watch the agent work. On servers, CI, and containers with no display, you must force headless mode. The \`--browser\` flag selects the engine -- \`chromium\` (default), \`firefox\`, \`webkit\`, or a branded channel like \`chrome\` or \`msedge\`.

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@latest",
        "--headless",
        "--browser", "chromium"
      ]
    }
  }
}
\`\`\`

To drive your installed Google Chrome rather than Playwright's bundled Chromium build (useful when a site behaves differently on branded Chrome), use the channel:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--browser", "chrome"]
    }
  }
}
\`\`\`

Remember to install the engine you choose: \`npx playwright install firefox\` for Firefox, \`webkit\` for WebKit, and \`install-deps\` on Linux for the OS libraries.

## --device and --viewport-size

To emulate a mobile device -- viewport, user agent, device-scale-factor, and touch -- pass \`--device\` with a known Playwright device descriptor such as "iPhone 15" or "Pixel 7":

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--device", "iPhone 15"]
    }
  }
}
\`\`\`

For a precise desktop viewport instead, use \`--viewport-size\` with a \`width,height\` pair:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--viewport-size", "1440,900"]
    }
  }
}
\`\`\`

Use \`--device\` for mobile emulation and \`--viewport-size\` for exact desktop dimensions; do not combine them, since the device descriptor already sets a viewport.

## --isolated and --user-data-dir

By default the server persists a browser profile to disk between sessions, so cookies and logins survive across runs. For clean, repeatable automation you usually want the opposite -- a fresh in-memory profile every launch. \`--isolated\` gives you that:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--isolated"]
    }
  }
}
\`\`\`

When you do want a persistent profile at a specific location, point \`--user-data-dir\` at a directory:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@latest",
        "--user-data-dir", "/Users/you/.cache/pw-mcp-profile"
      ]
    }
  }
}
\`\`\`

\`--isolated\` and \`--user-data-dir\` express opposite intents -- ephemeral versus persistent -- so pick one based on whether you want sessions to carry over.

## --storage-state: Start Pre-Authenticated

To launch the agent already logged in, pass a Playwright \`storage_state\` JSON file (the same format \`context.storage_state(path=...)\` produces) via \`--storage-state\`. This is the cleanest way to give an MCP agent an authenticated session without scripting a login:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@latest",
        "--isolated",
        "--storage-state", "/Users/you/auth/state.json"
      ]
    }
  }
}
\`\`\`

Pairing \`--isolated\` with \`--storage-state\` is a common idiom: each session starts fresh except for the injected authentication, so tests are repeatable yet logged in.

## --caps: Filtering Exposed Capabilities

The \`--caps\` flag enables optional capability groups beyond the default set -- for example tab management, PDF generation, or browser-install helpers. It is a comma-separated list. Used correctly it unlocks extra tools; used carelessly (filtering to a group name that does not exist) it can leave you with fewer tools than expected.

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--caps", "tabs,pdf"]
    }
  }
}
\`\`\`

While debugging a "zero tools" problem, remove \`--caps\` entirely to fall back to the default capability set, confirm tools appear, then re-add the groups you actually need.

## Network Flags: --proxy-server and --ignore-https-errors

On corporate networks the browser itself must route through a proxy. \`--proxy-server\` configures the browser's proxy (distinct from the \`HTTPS_PROXY\` env var that governs the npm/binary download). For testing against staging environments with self-signed certs, \`--ignore-https-errors\` disables TLS validation inside the browser:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@latest",
        "--proxy-server", "http://proxy.corp.example.com:8080",
        "--ignore-https-errors"
      ]
    }
  }
}
\`\`\`

Use \`--ignore-https-errors\` only against trusted internal environments; never point an MCP agent with TLS validation disabled at the public internet.

## Diagnostic Flags: --save-trace and --output-dir

For debugging what the agent did, \`--save-trace\` records a Playwright trace of the session that you can later open in the Trace Viewer, and \`--output-dir\` controls where traces, screenshots, and downloads land:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@latest",
        "--save-trace",
        "--output-dir", "/Users/you/pw-mcp-artifacts"
      ]
    }
  }
}
\`\`\`

After a session, open the trace with \`npx playwright show-trace /Users/you/pw-mcp-artifacts/<trace>.zip\` to replay every action, network call, and DOM snapshot the agent produced.

## Complete Flag Reference

| Flag | Argument | Default | Purpose |
|---|---|---|---|
| \`--headless\` | (none) | headed | Run without a visible browser window |
| \`--browser\` | engine/channel | chromium | Pick chromium/firefox/webkit/chrome/msedge |
| \`--device\` | descriptor | (none) | Emulate a mobile device (e.g. "iPhone 15") |
| \`--viewport-size\` | \`W,H\` | engine default | Exact desktop viewport dimensions |
| \`--isolated\` | (none) | persistent | Fresh in-memory profile each session |
| \`--user-data-dir\` | path | auto | Persistent profile directory |
| \`--storage-state\` | path | (none) | Start pre-authenticated from a state file |
| \`--caps\` | csv list | default set | Enable optional capability groups |
| \`--proxy-server\` | URL | (none) | Route browser traffic through a proxy |
| \`--ignore-https-errors\` | (none) | off | Disable TLS validation in the browser |
| \`--save-trace\` | (none) | off | Record a Playwright trace of the session |
| \`--output-dir\` | path | temp | Where traces/screenshots/downloads go |

## Host-Specific Configurations

### Cursor

Cursor reads \`.cursor/mcp.json\` (project) or \`~/.cursor/mcp.json\` (global), with the project file taking precedence. Schema:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\`\`\`

### Claude Code

Claude Code is configured via the CLI, which writes the same \`mcpServers\` shape into its config. The fastest path is a single command:

\`\`\`bash
# Add the Playwright MCP server to Claude Code
claude mcp add playwright -- npx -y @playwright/mcp@latest

# Verify it registered and is reachable
claude mcp list
\`\`\`

The equivalent JSON (in Claude Code's \`.mcp.json\` for project scope) is identical to the Cursor schema:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\`\`\`

### Windsurf

Windsurf stores MCP servers in \`~/.codeium/windsurf/mcp_config.json\`. It uses the same top-level \`mcpServers\` map:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\`\`\`

After editing the Windsurf config, open the MCP panel and click refresh so it reloads servers; like the others, it does not always hot-reload.

## Host Config Path Reference

| Host | Config file | Scope | Reload |
|---|---|---|---|
| Cursor | \`.cursor/mcp.json\` | Project | Toggle server / restart |
| Cursor | \`~/.cursor/mcp.json\` | Global | Toggle server / restart |
| Claude Code | \`.mcp.json\` (or \`claude mcp add\`) | Project | Re-run / \`claude mcp list\` |
| Windsurf | \`~/.codeium/windsurf/mcp_config.json\` | Global | Refresh MCP panel |

Note that all four use the identical \`mcpServers\` object shape -- only the file location and reload mechanism differ. A config that works in Cursor works verbatim in Windsurf and Claude Code.

## stdio vs. SSE Transport

Every config shown so far uses the **stdio** transport -- the host launches the server as a child process and communicates over standard input/output. This is the default and the right choice for local development: the host owns the process lifecycle, there is no port to manage, and it works out of the box. The \`command\`/\`args\` fields describe exactly how to spawn that child process.

There is a second mode worth knowing about for advanced setups: running the server as a standalone HTTP/SSE service that multiple clients connect to over a port. In this model you start the server yourself with a \`--port\` flag, and clients connect via a URL rather than spawning a process. This is useful when you want one long-lived browser server shared across several agents, or when the server runs on a remote machine.

\`\`\`bash
# Start a standalone Playwright MCP server on a port
npx @playwright/mcp@latest --port 8931
\`\`\`

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/sse"
    }
  }
}
\`\`\`

Note the shape changes: instead of \`command\`/\`args\`, an SSE-style server entry uses a \`url\` field pointing at the running service. For the vast majority of users, stick with the stdio \`command\`/\`args\` form -- it is simpler, more reliable, and what every host supports natively. Reach for the port-based transport only when you have a concrete need to share or remote a single browser instance.

## Combining Flags: A Production-Ready Example

Real configurations layer several flags. Here is a config tuned for a CI pipeline that needs to be headless, deterministic, pre-authenticated, traced for debugging, and version-pinned -- demonstrating how the flags compose into a single coherent setup:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "/usr/local/bin/npx",
      "args": [
        "-y", "@playwright/mcp@0.0.41",
        "--headless",
        "--browser", "chromium",
        "--isolated",
        "--storage-state", "/ci/auth/state.json",
        "--viewport-size", "1440,900",
        "--save-trace",
        "--output-dir", "/ci/artifacts/pw-mcp"
      ],
      "env": {
        "HTTPS_PROXY": "http://proxy.internal:8080"
      }
    }
  }
}
\`\`\`

Read top to bottom: an absolute \`command\` path (no PATH ambiguity in CI), a pinned version (reproducible), \`--headless\` (no display on the runner), \`--isolated\` plus \`--storage-state\` (fresh profile but logged in), an exact viewport (stable screenshots), and \`--save-trace\` to \`--output-dir\` (every session is debuggable from the build artifacts). The \`env\` block routes downloads through the corporate proxy. This is the kind of config you commit once and rely on across hundreds of CI runs.

## Choosing Flags by Scenario

Different goals call for different flag combinations. The table below maps common scenarios to the flags that serve them, so you can assemble a config without reading every flag's description.

| Scenario | Key flags |
|---|---|
| Local interactive exploration | (none) -- headed defaults are ideal |
| CI / headless server | \`--headless\`, \`--browser chromium\` |
| Mobile emulation | \`--device "iPhone 15"\` |
| Deterministic, repeatable runs | \`--isolated\` |
| Pre-authenticated agent | \`--isolated\`, \`--storage-state\` |
| Persistent logged-in profile | \`--user-data-dir\` |
| Corporate network | \`env.HTTPS_PROXY\`, \`--proxy-server\` |
| Debugging agent behavior | \`--save-trace\`, \`--output-dir\` |
| Extra tools (tabs/PDF) | \`--caps tabs,pdf\` |

Start from the row that matches your situation, then add adjacent flags as needed. Most production configs are a blend of two or three rows -- "CI / headless" plus "pre-authenticated" plus "debugging" is the most common combination.

## Validating Any Config

Whatever host you target, validate the JSON before reloading. A trailing comma or missing brace makes the host silently ignore the file:

\`\`\`bash
# Fails loudly on malformed JSON; silent means valid
python3 -m json.tool .cursor/mcp.json

# Prove the exact command launches outside the host
npx -y @playwright/mcp@latest --help

# Ensure the chosen browser engine is installed
npx playwright install chromium
\`\`\`

## Project-Scoped vs. Global Configs

A decision that affects every team is whether to define the Playwright MCP server globally (once, for all your projects) or per-project (committed to a repository so teammates inherit it). Both are valid, and the right choice depends on who needs the server.

A **global** config -- \`~/.cursor/mcp.json\` for Cursor, the user-scope file for Claude Code, Windsurf's single config -- means the server is available in every project you open without any per-repo setup. This suits a server you personally always want, like Playwright MCP if you do browser work across many codebases. The downside is it lives only on your machine; a teammate cloning a repo gets nothing.

A **project** config -- \`.cursor/mcp.json\` or \`.mcp.json\` committed to the repository root -- travels with the code. Anyone who clones the repo and opens it in a supporting host gets the exact same server definition, pinned to the same version. This is the right choice for team projects where browser testing is part of the workflow and you want zero-setup onboarding. The trade-off is that you should pin the version and avoid machine-specific absolute paths in a committed config (or document the PATH requirement), since a hardcoded \`/Users/you/.nvm/...\` path will not exist on a colleague's machine.

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.41", "--headless"]
    }
  }
}
\`\`\`

For committed configs, the portable form above -- bare \`npx\` (relying on each machine's PATH) plus a pinned version -- is the safest, because it makes no assumptions about where Node lives while still guaranteeing everyone runs the identical server build.

## Frequently Asked Questions

### What is the minimum mcp.json for @playwright/mcp?

The minimum is a \`mcpServers\` object with one entry whose \`command\` is \`npx\` and whose \`args\` are \`["-y", "@playwright/mcp@latest"]\`. The \`-y\` flag is required because it auto-confirms the package install, preventing the non-interactively launched server from hanging on a prompt. This same three-line config works identically across Cursor, Claude Code, and Windsurf -- only the file location differs between those hosts.

### How do I run the server headless for CI?

Add \`--headless\` to the \`args\` array, and on Linux runners pair it with \`--browser chromium\` plus an OS-library install via \`npx playwright install-deps chromium\`. Headless mode launches no visible window, which is mandatory on servers and containers without a display. Locally you can omit \`--headless\` so you can watch the agent drive the browser in real time, which is useful when debugging tool behavior.

### What is the difference between --isolated and --user-data-dir?

They express opposite intents. \`--isolated\` starts a fresh, in-memory browser profile on every launch, so no cookies or logins persist -- ideal for clean, repeatable runs. \`--user-data-dir\` points at a directory where the profile is persisted between sessions, so logins and state carry over. Choose \`--isolated\` for deterministic automation and \`--user-data-dir\` when you deliberately want to reuse a logged-in profile across runs.

### How do I make the MCP agent start already logged in?

Generate a Playwright \`storage_state\` JSON file (the same format \`context.storage_state(path=...)\` produces, containing cookies and localStorage), then pass \`--storage-state /path/to/state.json\` in your args. Pairing it with \`--isolated\` is the common idiom: each session starts fresh except for the injected authentication, so the agent is logged in yet every run is repeatable and free of leftover state.

### Do Cursor, Claude Code, and Windsurf use the same config format?

Yes. All three use a top-level \`mcpServers\` map with \`command\`, \`args\`, and optional \`env\` fields, so a working server definition is portable across them verbatim. What differs is the file location -- \`.cursor/mcp.json\` for Cursor, \`.mcp.json\` for Claude Code, and \`~/.codeium/windsurf/mcp_config.json\` for Windsurf -- and how each host reloads after edits. Claude Code also offers a CLI shortcut, \`claude mcp add\`.

### What does the --caps flag control?

\`--caps\` takes a comma-separated list of optional capability groups to enable beyond the default tool set, such as \`tabs\` for tab management or \`pdf\` for PDF generation. It expands the tools the agent can call. Be careful: if you filter to a group name that does not exist, you can end up with fewer tools than expected, so when debugging a "zero tools" issue, strip \`--caps\` first and confirm the defaults appear.

### How do I configure the server behind a corporate proxy?

There are two separate proxy layers. Set the \`HTTPS_PROXY\` environment variable in the \`env\` block so npm and the browser-binary download route through the proxy, and pass \`--proxy-server http://proxy:8080\` in \`args\` so the browser's own traffic is proxied. For self-signed internal certificates you can add \`--ignore-https-errors\`, but only when pointing at trusted internal environments, never the public internet.

### How do I capture a trace of what the agent did?

Add \`--save-trace\` to record a full Playwright trace of the session and \`--output-dir /path\` to choose where it is written. After the session, replay it with \`npx playwright show-trace /path/<trace>.zip\` to inspect every action, network request, console message, and DOM snapshot the agent produced. This is the single most useful diagnostic when an MCP-driven flow behaves unexpectedly and you need to see exactly what happened.

## Conclusion

The \`@playwright/mcp\` configuration is small but expressive. Every host shares the same \`mcpServers\` object with \`command\`, \`args\`, and \`env\`; the power lives in the flags you append to \`args\`. Reach for \`--headless\` and \`--browser\` for CI, \`--device\` or \`--viewport-size\` for form-factor control, \`--isolated\` versus \`--user-data-dir\` to decide whether sessions persist, \`--storage-state\` to start authenticated, \`--caps\` to expand tools, the network flags for corporate environments, and \`--save-trace\` for debugging. Pin your version, validate the JSON, and confirm the command runs by hand before reloading.

Bookmark the two reference tables above and you will rarely need to look anything else up. For a maintained baseline config plus the broader agentic-testing toolkit, grab the [playwright-mcp skill](/skills) from QASkills, explore the full [skills catalog](/skills), or read more MCP configuration walkthroughs on the [QASkills blog](/blog).
`,
};
