import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Troubleshoot Playwright MCP in Cursor: The 2026 Fix Guide',
  description:
    'Fix Playwright MCP in Cursor: mcp.json errors, server not starting, npx failures, connection issues, red dots, and zero tools. Copy-paste configs and fixes.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# Troubleshoot Playwright MCP in Cursor (2026)

The Playwright MCP server turns Cursor into a browser-driving agent: it can navigate pages, click elements, fill forms, take screenshots, and read accessibility snapshots, all from a chat prompt. When it works, it is one of the most powerful additions to an AI-assisted QA workflow. When it does not work, you stare at a red dot next to "playwright" in Cursor's MCP settings, a "0 tools enabled" label, or a chat that flatly says "I don't have browser tools." This guide is a focused, reproducible troubleshooting reference for getting \`@playwright/mcp\` running inside Cursor in 2026.

We will work through the entire failure surface in order: where \`mcp.json\` lives and why Cursor sometimes reads the wrong one, the exact JSON schema Cursor expects (which differs subtly from Claude Desktop's), the \`npx\` and Node-version problems that silently kill the server, PATH issues that only bite GUI-launched apps, the green-dot-but-zero-tools state, browser-binary and headless errors, and the proxy and firewall walls that block the first launch. Every fix is copy-pasteable, and a consolidated symptom-to-fix table sits near the end so you can jump straight to your error. If you would rather start from a known-good configuration, the [playwright-mcp skill](/skills) on QASkills ships a verified Cursor setup. Let's get your red dot to turn green.

## How Cursor Loads MCP Servers (and Where the Config Lives)

Most Cursor MCP problems are actually config-location problems. Cursor reads MCP server definitions from two places, and editing the wrong one is the number-one cause of "I saved my config but nothing changed."

- **Project config:** \`.cursor/mcp.json\` in your project root. Applies only to that project. This is the recommended location for team-shared, repo-specific servers.
- **Global config:** \`~/.cursor/mcp.json\` in your home directory. Applies to every project you open.

If both exist, the project file takes precedence for that project. After editing either file you must **reload the MCP servers** -- Cursor does not always hot-reload. Open Settings, go to the MCP/Tools section, and toggle the server off and on, or restart Cursor entirely.

First, confirm which file Cursor is actually reading:

\`\`\`bash
# Project-level config (preferred)
ls -la .cursor/mcp.json

# Global config
ls -la ~/.cursor/mcp.json

# See what is inside (use a real editor, but this confirms it exists + is valid)
python3 -m json.tool .cursor/mcp.json
\`\`\`

That last command is doing double duty: \`python3 -m json.tool\` will fail loudly if the JSON is malformed. A trailing comma or a missing brace will make Cursor silently ignore the entire file, leaving you with no servers and no error message. Validating the JSON before anything else saves enormous time.

## The Correct mcp.json Schema for Cursor

Cursor expects a top-level \`mcpServers\` object. Each key is a server name (you choose it); each value describes how to launch the server. The most common and reliable form runs the server over stdio via \`npx\`:

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

That is the entire minimum viable config. The \`-y\` flag is **not optional** -- it tells \`npx\` to auto-confirm the install of \`@playwright/mcp\` without an interactive prompt. Without \`-y\`, \`npx\` may hang waiting for a "y/n" that never comes (because Cursor launches it non-interactively), and the server never starts. This single missing flag accounts for a huge share of "server hangs forever" reports.

If you want to pin a version for reproducibility (recommended for teams), replace \`@latest\` with an explicit version:

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

A frequent mistake is borrowing a Claude Desktop config that uses a different top-level key or nests things differently. Cursor specifically wants \`mcpServers\` at the root, \`command\` as a string, and \`args\` as an array of strings. Anything else and the server will not register.

## Fixing "command not found" and npx Failures

When the server's red dot persists, the fastest diagnostic is to run the exact command Cursor would run, yourself, in a terminal:

\`\`\`bash
# Run the MCP server manually. It should print startup output and wait.
npx -y @playwright/mcp@latest --help
\`\`\`

Three outcomes, three fixes:

**1. \`npx: command not found\`.** Node/npm is not installed or not on PATH. Install Node 18 or newer (20 LTS recommended) and verify:

\`\`\`bash
node --version   # must be >= 18; v20.x is the safe target
npm --version
which npx        # must print a path, e.g. /usr/local/bin/npx
\`\`\`

**2. It hangs with no output.** You forgot \`-y\`, or a corporate proxy is blocking the npm registry. Confirm npm can reach the registry:

\`\`\`bash
npm ping                                   # checks registry connectivity
npm config get registry                    # should be https://registry.npmjs.org/
\`\`\`

**3. It errors about an old Node version.** \`@playwright/mcp\` requires a modern Node. If \`node --version\` shows v16 or earlier, upgrade. On macOS with Homebrew: \`brew install node@20 && brew link node@20\`. With nvm: \`nvm install 20 && nvm alias default 20\`.

If the manual command works perfectly but Cursor still shows red, the problem is almost certainly PATH visibility -- covered next.

## The GUI PATH Problem (macOS and Linux)

This is the most insidious Cursor MCP issue and it fools experienced engineers. When you install Node via \`nvm\`, \`fnm\`, \`asdf\`, or Homebrew, the PATH entry that makes \`node\`/\`npx\` findable is added to your **shell** startup file (\`.zshrc\`, \`.bashrc\`). But Cursor, when launched from the Dock or Applications folder, **does not source your shell config**. So your terminal finds \`npx\` perfectly, while Cursor's spawned process cannot, and the server fails with "command not found" -- even though it works for you by hand.

There are three reliable fixes, in order of preference:

**Fix 1 -- Use an absolute path to npx.** Find it and hardcode it:

\`\`\`bash
which npx
# example output: /Users/you/.nvm/versions/node/v20.11.0/bin/npx
\`\`\`

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "/Users/you/.nvm/versions/node/v20.11.0/bin/npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\`\`\`

**Fix 2 -- Launch Cursor from the terminal** so it inherits your full PATH:

\`\`\`bash
# macOS: opening from a terminal that has the right PATH
open -a Cursor
\`\`\`

**Fix 3 -- Install Node at a system location** that GUI apps always see (\`/usr/local/bin\` or \`/opt/homebrew/bin\`), so no shell sourcing is required. Fix 1 is the most robust because it removes all ambiguity.

## Green Dot but Zero Tools

A particularly confusing state: the server shows a **green** dot (Cursor connected to the process) but the tool count is **0**, and the agent insists it has no browser tools. The process started, but no tools were exposed. Common causes:

- **Tools are disabled in the UI.** Cursor lets you toggle individual tools per server. Open the MCP settings, expand the \`playwright\` server, and make sure the tools are enabled (toggled on). A freshly added server sometimes lands with tools off.
- **A \`--caps\` filter is hiding everything.** If your args include a capability filter that does not match any real capability, you get zero tools. Remove any \`--caps\` argument while debugging:

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

- **A crash during initialization.** The process can connect and then crash while enumerating tools (often because the browser binary is missing). Check the logs -- next section.

After re-enabling tools or stripping bad args, toggle the server off and on so Cursor re-queries the tool list.

## Reading Cursor's MCP Logs

You cannot fix what you cannot see. Cursor writes MCP output to its Output panel. Open the Command Palette (Cmd/Ctrl+Shift+P), run "Developer: Show Logs" or open the Output panel and select the MCP channel. Look for the actual stderr from the spawned server. You will typically see one of these tell-tale lines:

| Log line contains | Meaning | Fix |
|---|---|---|
| \`command not found\` / \`ENOENT\` | npx/node not on Cursor's PATH | Use absolute path to npx |
| \`Executable doesn't exist\` | Browser binary not installed | \`npx playwright install chromium\` |
| \`ETIMEDOUT\` / \`ECONNREFUSED\` | Proxy/firewall blocking download | Set HTTPS_PROXY or pre-install |
| \`EACCES\` | Permission denied on cache dir | Fix ownership of \`~/.cache/ms-playwright\` |
| \`Unexpected token\` in JSON | Malformed \`mcp.json\` | Validate with \`python3 -m json.tool\` |

If the Output panel is empty, the server may not be launching at all -- which points back to a config-location or JSON-validity problem.

## Browser Binary and Headless Errors

\`@playwright/mcp\` needs an actual browser to drive. If you see \`Executable doesn't exist\` or \`browserType.launch: ... Failed to launch\`, the Chromium binary Playwright expects is not installed in the cache. Install it:

\`\`\`bash
# Install the Chromium build Playwright drives.
npx playwright install chromium

# On Linux, also install the OS-level shared libraries it needs.
npx playwright install-deps chromium
\`\`\`

On headless Linux servers and CI runners, missing system libraries (\`libnss3\`, \`libatk\`, etc.) cause launch failures even when the binary exists. \`install-deps\` handles those. To force headless mode (useful on servers with no display) and target a specific browser, add args:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless", "--browser", "chromium"]
    }
  }
}
\`\`\`

Use \`--headless\` when there is no GUI; omit it locally if you want to watch the browser drive in real time.

## Proxy, Firewall, and Corporate Network Walls

On corporate networks, the very first launch fails because either npm cannot download \`@playwright/mcp\` or Playwright cannot download the Chromium binary -- both go through your proxy. Configure both layers:

\`\`\`bash
# npm proxy (for downloading the MCP package)
npm config set proxy http://proxy.corp.example.com:8080
npm config set https-proxy http://proxy.corp.example.com:8080

# Playwright browser download proxy (env var)
export HTTPS_PROXY=http://proxy.corp.example.com:8080
npx playwright install chromium
\`\`\`

If your proxy uses a self-signed certificate, npm may reject the TLS handshake. The correct fix is to point npm at your corporate CA bundle rather than disabling TLS verification:

\`\`\`bash
npm config set cafile /path/to/corp-ca-bundle.pem
\`\`\`

Once the package and browser are downloaded and cached, subsequent launches do not need the network, so a one-time pre-install on a permissive network is a valid workaround for locked-down machines.

## A Known-Good Cursor Configuration

When in doubt, reset to a minimal verified config, validate it, restart Cursor, and confirm the tools appear. Project-level \`.cursor/mcp.json\`:

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

Verification sequence:

\`\`\`bash
# 1. Validate the JSON (silent = valid; error = fix it)
python3 -m json.tool .cursor/mcp.json

# 2. Prove the command runs outside Cursor
npx -y @playwright/mcp@latest --help

# 3. Make sure a browser is installed
npx playwright install chromium

# 4. Fully restart Cursor, then check Settings -> MCP -> playwright shows green + N tools
\`\`\`

After this, ask Cursor's agent something like "navigate to example.com and tell me the page title." If it drives the browser, you are done.

## Windows-Specific Gotchas

Cursor on Windows has its own failure modes that do not appear on macOS or Linux. The most common is the \`npx\` resolution problem: on Windows, the executable is technically \`npx.cmd\`, and some Cursor versions need the command spelled out or wrapped through \`cmd\`. If the bare \`npx\` command fails to launch on Windows, wrap it:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest"]
    }
  }
}
\`\`\`

The \`cmd /c\` wrapper forces Windows to resolve \`npx\` through the command interpreter, which sidesteps the \`.cmd\` extension issue. A second Windows pitfall is path separators in any file-path argument (like \`--output-dir\` or \`--storage-state\`): use forward slashes or escaped backslashes inside JSON, since a single backslash is a JSON escape character. Write \`"C:/Users/you/pw"\` or \`"C:\\\\Users\\\\you\\\\pw"\`, never \`"C:\\Users\\you\\pw"\`. A lone backslash will silently corrupt the path and the server will fail to find your file.

## Verifying Tools Actually Work End-to-End

A green dot and a non-zero tool count prove the server connected and registered tools, but not that the browser actually drives. The final verification is to ask Cursor's agent to perform a real browser action and confirm it succeeds. Use a deterministic prompt that exercises navigation and a read:

\`\`\`text
Navigate to https://example.com, then tell me the exact text of the page's main heading.
\`\`\`

If the agent reports back "Example Domain," the full chain works: Cursor reached the server, the server launched the browser, navigation succeeded, and the accessibility snapshot returned readable content. If instead the agent says it lacks browser tools, the tools are not actually enabled despite the count -- re-toggle the server. If it errors mid-navigation, you have a browser-launch problem (missing binary or libraries) rather than a connection problem, which points you back to the \`npx playwright install\` step. This behavioral check catches the subtle "connected but not functional" state that the dot color alone hides.

## Symptom-to-Fix Quick Reference

| Symptom in Cursor | Most likely cause | Fix |
|---|---|---|
| Red dot, no logs | Wrong \`mcp.json\` location or invalid JSON | Confirm \`.cursor/mcp.json\`; validate JSON |
| Server hangs, never connects | Missing \`-y\` flag on npx | Add \`-y\` as first arg |
| \`command not found\` in logs | GUI PATH does not include node | Use absolute path to npx |
| Green dot, 0 tools | Tools disabled or bad \`--caps\` | Enable tools; remove \`--caps\` |
| \`Executable doesn't exist\` | Browser binary missing | \`npx playwright install chromium\` |
| Launch fails on Linux server | Missing OS libraries | \`npx playwright install-deps\` |
| Timeout on first run | Proxy blocking downloads | Set proxy + pre-install browser |
| Saved config, nothing changed | Cursor did not reload | Toggle server off/on or restart |

## Frequently Asked Questions

### Where does Cursor look for mcp.json?

Cursor reads two files: a project-level \`.cursor/mcp.json\` in your repository root and a global \`~/.cursor/mcp.json\` in your home directory. When both exist, the project file wins for that project. Editing the wrong one is the most common reason a saved config seems to do nothing -- always confirm with \`ls -la .cursor/mcp.json\` and reload the server afterward, since Cursor does not reliably hot-reload changes.

### Why does my Playwright MCP server hang and never connect?

The usual culprit is a missing \`-y\` flag in your npx args. Cursor launches the server non-interactively, so without \`-y\` the \`npx\` install prompt waits forever for a confirmation that never arrives, and the server never starts. Make your args \`["-y", "@playwright/mcp@latest"]\`. If it still hangs, a corporate proxy may be blocking the npm registry -- verify with \`npm ping\`.

### It works in my terminal but Cursor says command not found. Why?

This is the GUI PATH problem. Node installed via nvm, fnm, asdf, or Homebrew adds itself to your shell startup file, but Cursor launched from the Dock does not source that file, so it cannot find \`npx\`. Fix it by hardcoding the absolute path: run \`which npx\`, then set that full path as \`command\` in \`mcp.json\`. Alternatively, launch Cursor from a terminal so it inherits your PATH.

### The server shows green but reports zero tools. What is wrong?

A green dot means Cursor connected to the process, but zero tools means none were exposed. Check that the individual tools are toggled on in Cursor's MCP settings -- new servers sometimes land with tools disabled. Also remove any \`--caps\` capability filter from your args while debugging, since a filter matching nothing yields zero tools. If neither helps, the process likely crashed during init because the browser binary is missing.

### How do I install the browser that Playwright MCP needs?

Run \`npx playwright install chromium\` to download the Chromium build Playwright drives. On headless Linux servers and CI runners, also run \`npx playwright install-deps chromium\` to install the OS-level shared libraries (libnss3, libatk, and others) that the browser needs to launch. Without these, you will see "Executable doesn't exist" or "Failed to launch" errors even when the npm package installed correctly.

### How do I run Playwright MCP behind a corporate proxy?

Configure both layers. Set npm's proxy with \`npm config set proxy\` and \`npm config set https-proxy\` so it can download the package, and export \`HTTPS_PROXY\` before running \`npx playwright install chromium\` so the browser download succeeds. For self-signed proxy certificates, point npm at your corporate CA bundle using \`npm config set cafile\` rather than disabling TLS verification. Once cached, later launches need no network.

### How can I see what the MCP server is actually doing?

Open Cursor's Output panel via the Command Palette ("Developer: Show Logs" or the Output panel's MCP channel). It surfaces the spawned server's stderr, where you will see the real error -- ENOENT for PATH problems, "Executable doesn't exist" for a missing browser, ETIMEDOUT for proxy issues, or a JSON parse error for a malformed config. An empty panel usually means the server never launched, pointing back to a config-location or JSON-validity issue.

### Should I pin the Playwright MCP version in mcp.json?

For teams and CI, yes. Replace \`@playwright/mcp@latest\` with an explicit version like \`@playwright/mcp@0.0.41\` so every developer and every pipeline runs the identical server build. This prevents the "works on my machine" drift that happens when \`@latest\` silently upgrades and changes tool behavior. For quick personal experiments \`@latest\` is fine, but reproducibility wins once more than one person is involved.

## Conclusion

Nearly every Playwright MCP failure in Cursor reduces to one of five root causes: the config is in the wrong place or is invalid JSON, the \`-y\` flag is missing, Cursor's GUI process cannot see your Node install on PATH, the browser binary is not installed, or a proxy is blocking the first download. Work the problem in that order -- validate the JSON, run the command by hand, hardcode the absolute path to \`npx\`, install Chromium, then handle the proxy -- and you will resolve the overwhelming majority of red dots in minutes.

Keep the symptom-to-fix table above bookmarked for the next time the dot goes red. For a verified, drop-in Cursor configuration plus the broader agentic-testing toolkit, grab the [playwright-mcp skill](/skills) from QASkills, browse the full [skills catalog](/skills), or read more setup walkthroughs on the [QASkills blog](/blog).
`,
};
