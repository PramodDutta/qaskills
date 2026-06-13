import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP + Cursor mcp.json: Troubleshooting Connection 2026',
  description:
    'Diagnose and fix Playwright MCP server connection issues in Cursor 2026: ENOENT npx, server not responding, no tools listed, Windows vs Mac paths, version mismatch, logs.',
  date: '2026-06-06',
  category: 'Reference',
  content: `
# Playwright MCP + Cursor mcp.json: Troubleshooting Connection 2026

Most Playwright MCP + Cursor failures come from one of six root causes: \\\`npx\\\` not on PATH, a missing browser binary, an out-of-date Cursor, a Windows path escape problem, a JSON syntax error in \\\`mcp.json\\\`, or a stale child process holding the user-data-dir. The symptoms surface as "server not responding", "no tools listed", or a silent empty MCP panel. This troubleshooting reference walks each cause to ground, gives the bash and PowerShell commands to confirm the diagnosis, and ships a known-good \\\`mcp.json\\\` you can copy back over a broken one.

Every section below opens with the error message you will see, follows with the actual underlying cause, and closes with the minimum command sequence to fix it. We assume you already attempted the install path in [Playwright MCP install in Cursor](/blog/playwright-mcp-server-install-cursor-2026-step-by-step) and something went wrong. For the broader flag and configuration reference, see [Playwright MCP setup + configuration](/blog/playwright-mcp-server-setup-configuration-2026-reference). For the MCP protocol context, [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) is a good starting point.

## Key Takeaways

- **Check the Cursor log first**; it pinpoints 90% of failures.
- **ENOENT npx** is almost always a PATH issue with GUI-launched apps.
- **No tools listed** usually means the server crashed during initialization.
- **Windows paths** require double-escaped backslashes in JSON.
- **Cursor must fully quit** after every \\\`mcp.json\\\` change.

---

## 1. Always Start at the Log

Before any other diagnostic, tail the Cursor log:

\\\`\\\`\\\`bash
# macOS
tail -f ~/Library/Logs/Cursor/main.log

# Linux
tail -f ~/.config/Cursor/logs/main.log
\\\`\\\`\\\`

\\\`\\\`\\\`powershell
# Windows PowerShell
Get-Content -Wait "$env:APPDATA\\\\Cursor\\\\logs\\\\main.log"
\\\`\\\`\\\`

Quit and relaunch Cursor with the log tailed. Every MCP error prints a recognizable prefix:

\\\`\\\`\\\`
[mcp] starting server: playwright
[mcp] error: ENOENT: spawn npx
[mcp] server exit code 1
[mcp] no tools listed for playwright
\\\`\\\`\\\`

Copy the exact error line; it is the fastest diagnostic step.

## 2. Error: ENOENT: spawn npx

### Symptom

\\\`\\\`\\\`
Error: spawn npx ENOENT
\\\`\\\`\\\`

The MCP panel in Cursor shows the server with a red dot and no tools.

### Cause

Cursor launched from \\\`/Applications\\\` (macOS) or the Start Menu (Windows) does not inherit the shell PATH. \\\`npx\\\` exists in your terminal but not in the GUI app's environment.

### Fix

Use the full path to \\\`npx\\\` in \\\`mcp.json\\\`:

\\\`\\\`\\\`bash
# macOS / Linux: find the absolute path
which npx
# /usr/local/bin/npx  or  /opt/homebrew/bin/npx
\\\`\\\`\\\`

\\\`\\\`\\\`powershell
# Windows
where.exe npx
# C:\\\\Program Files\\\\nodejs\\\\npx.cmd
\\\`\\\`\\\`

Update \\\`mcp.json\\\`:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\\\`\\\`\\\`

On Windows, double-escape backslashes:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "C:\\\\\\\\Program Files\\\\\\\\nodejs\\\\\\\\npx.cmd",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
\\\`\\\`\\\`

Quit Cursor fully and relaunch.

## 3. Error: Server Not Responding

### Symptom

The MCP panel shows the server in a "starting" state forever, eventually flipping to red.

### Cause Map

| Sub-cause | How to confirm |
|---|---|
| Browser binary missing | log: \\\`Error: Executable doesn't exist at /Users/.../chromium\\\` |
| Cursor version too old | log: \\\`Error: protocol version mismatch\\\` |
| Network blocked | log: \\\`Error: ETIMEDOUT registry.npmjs.org\\\` |
| Stale lockfile | log: \\\`SingletonLock: file exists\\\` |

### Fix For Each Sub-cause

Missing browser binary:

\\\`\\\`\\\`bash
npx playwright install --with-deps chromium
\\\`\\\`\\\`

Old Cursor:

\\\`\\\`\\\`bash
# Confirm version
cursor --version
# If less than 0.45, upgrade via the in-app updater or reinstall
\\\`\\\`\\\`

Network blocked (corporate proxy):

\\\`\\\`\\\`bash
npm config set proxy http://corp-proxy:3128
npm config set https-proxy http://corp-proxy:3128
\\\`\\\`\\\`

Stale lock (Chromium profile lock):

\\\`\\\`\\\`bash
# macOS / Linux
rm -f ~/.cache/playwright-mcp-profile/SingletonLock
rm -f ~/.cache/playwright-mcp-profile/SingletonCookie
rm -f ~/.cache/playwright-mcp-profile/SingletonSocket
\\\`\\\`\\\`

## 4. Error: No Tools Listed

### Symptom

Server shows green dot but the tools list under it is empty.

### Cause

The server initialized far enough to register but crashed before publishing its tool catalog. This is almost always a Playwright-side launch failure.

### Diagnose

Run the same command Cursor would, in a terminal:

\\\`\\\`\\\`bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \\\\
  npx -y @playwright/mcp@latest --stdio
\\\`\\\`\\\`

If the output is empty or shows an error, the issue is reproducible outside Cursor. Common output:

\\\`\\\`\\\`
Error: Failed to launch browser. Error: Executable doesn't exist at /home/user/.cache/ms-playwright/chromium-1129/chrome-linux/chrome
\\\`\\\`\\\`

Fix:

\\\`\\\`\\\`bash
npx playwright install chromium
\\\`\\\`\\\`

## 5. Error: JSON Syntax in mcp.json

### Symptom

Cursor silently ignores the new server. The MCP panel does not list \\\`playwright\\\` at all.

### Cause

Trailing comma, missing brace, smart-quote curly characters (a frequent pasting hazard from blog posts).

### Diagnose

\\\`\\\`\\\`bash
# Validate JSON
jq . ~/.cursor/mcp.json
\\\`\\\`\\\`

If \\\`jq\\\` errors, the file is invalid. The error line and column point to the issue.

Common breakage:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest",]
    },
  }
}
\\\`\\\`\\\`

Two trailing commas; remove them:

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

## 6. Windows-Specific: Path Escaping

### Symptom

\\\`\\\`\\\`
Error: ENOENT: no such file or directory, spawn C:Program Filesnodejsnpx.cmd
\\\`\\\`\\\`

The backslashes are gone because JSON ate them.

### Fix

Double-escape every backslash:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "C:\\\\\\\\Program Files\\\\\\\\nodejs\\\\\\\\npx.cmd",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--user-data-dir=C:\\\\\\\\Users\\\\\\\\me\\\\\\\\.cache\\\\\\\\pw-mcp"
      ]
    }
  }
}
\\\`\\\`\\\`

In editor: each backslash becomes \\\`\\\\\\\\\\\`. In the rendered string Cursor sees: each becomes \\\`\\\\\\\`.

Alternative: use forward slashes, which Node accepts on Windows:

\\\`\\\`\\\`json
{
  "command": "C:/Program Files/nodejs/npx.cmd"
}
\\\`\\\`\\\`

## 7. Cursor Did Not Pick Up the Change

### Symptom

You edited \\\`mcp.json\\\` and the server still uses the old config (or is still absent).

### Cause

You closed the chat panel but left Cursor running. Or you quit Cursor but a background helper process is still alive.

### Fix

Full quit:

\\\`\\\`\\\`bash
# macOS
osascript -e 'quit app "Cursor"'

# Linux
pkill -f Cursor

# Windows
taskkill /F /IM Cursor.exe
\\\`\\\`\\\`

Confirm no Cursor processes remain:

\\\`\\\`\\\`bash
ps aux | grep -i cursor | grep -v grep
\\\`\\\`\\\`

Relaunch.

## 8. Version Mismatch Cursor <-> @playwright/mcp

### Symptom

The MCP server starts and lists tools, but every tool call returns an error like:

\\\`\\\`\\\`
Error: unknown tool: browser_navigate
\\\`\\\`\\\`

### Cause

\\\`@playwright/mcp\\\` renamed or restructured tools between versions, and Cursor's host expects an older shape.

### Fix

Pin to a known-good version while you upgrade Cursor:

\\\`\\\`\\\`json
{
  "args": ["-y", "@playwright/mcp@0.0.30"]
}
\\\`\\\`\\\`

Then upgrade Cursor itself. Once Cursor is current, return \\\`@playwright/mcp@latest\\\`.

## 9. macOS-Specific: Gatekeeper Blocks Chromium

### Symptom

\\\`\\\`\\\`
Error: Chromium quit unexpectedly. Cannot be opened because the developer cannot be verified.
\\\`\\\`\\\`

### Cause

macOS Gatekeeper blocked the Chromium binary on first launch.

### Fix

\\\`\\\`\\\`bash
xattr -dr com.apple.quarantine ~/.cache/ms-playwright/chromium-*
\\\`\\\`\\\`

Or, if your org policy allows, run \\\`npx playwright install --force chromium\\\` while signed in via Terminal so the binary is unquarantined automatically.

## 10. Linux-Specific: Missing System Libraries

### Symptom

\\\`\\\`\\\`
error while loading shared libraries: libnss3.so: cannot open shared object file
\\\`\\\`\\\`

### Cause

The Linux distro lacks libraries Chromium needs.

### Fix

\\\`\\\`\\\`bash
sudo npx playwright install-deps chromium
# or
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
\\\`\\\`\\\`

## 11. Quick Sanity Script

Run end-to-end outside Cursor:

\\\`\\\`\\\`bash
#!/usr/bin/env bash
set -e

echo "Step 1: Node version"
node --version

echo "Step 2: npx resolves @playwright/mcp"
npx -y @playwright/mcp@latest --version

echo "Step 3: Chromium installed"
npx playwright install --dry-run chromium

echo "Step 4: tools/list smoke"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \\\\
  npx -y @playwright/mcp@latest --headless --stdio | \\\\
  jq -r '.result.tools[].name' | head -5

echo "All checks passed"
\\\`\\\`\\\`

If this script passes outside Cursor and Cursor still fails, the problem is purely in \\\`mcp.json\\\` or the Cursor process state.

## 12. Known-Good mcp.json

When in doubt, copy this exact file:

\\\`\\\`\\\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ]
    }
  }
}
\\\`\\\`\\\`

This is the minimum that works on every supported platform with a default Node 20 install. Add flags one at a time after this baseline is green.

## 13. Symptom-to-Cause Quick Table

| Symptom | Most likely cause |
|---|---|
| ENOENT spawn npx | npx not on Cursor's PATH |
| Server not responding | browser binary missing |
| No tools listed | server crashed during init |
| Server absent from panel | JSON syntax error |
| ENOENT on Windows path | backslashes not escaped |
| Stale config | Cursor not fully quit |
| Unknown tool errors | version mismatch |
| Gatekeeper block | macOS quarantine on Chromium |
| libnss3 missing | Linux deps not installed |

## 14. Persistent State to Clean

When in deep trouble, nuke state and start over:

\\\`\\\`\\\`bash
# Remove cached MCP package
rm -rf ~/.npm/_npx

# Remove Playwright browsers (will re-download)
rm -rf ~/.cache/ms-playwright

# Remove your MCP profile dirs
rm -rf ~/.cache/playwright-mcp-*

# Re-install
npx -y @playwright/mcp@latest --version
npx playwright install chromium
\\\`\\\`\\\`

Then relaunch Cursor.

## 15. Last Resort: Run the Server Outside Cursor

If nothing works, run the MCP server in a terminal and use it from a thin client to confirm it works at all:

\\\`\\\`\\\`bash
npx -y @playwright/mcp@latest --stdio
\\\`\\\`\\\`

In another terminal, send a request:

\\\`\\\`\\\`bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | nc -U /tmp/mcp.sock
\\\`\\\`\\\`

A successful tools list outside Cursor confirms the package is healthy and the problem is purely on the Cursor side.

## Frequently Asked Questions

### Cursor used to work. What changed?

Most often, an OS update changed the default PATH for GUI apps, or a Cursor auto-update bumped the host while \\\`@playwright/mcp@latest\\\` shifted under it. Pin a version and tail the log.

### How do I report a bug to the Playwright MCP team?

Capture the log line (\\\`tail -n 200 ~/Library/Logs/Cursor/main.log\\\`), your \\\`mcp.json\\\`, your \\\`node --version\\\`, and your OS. File on the \\\`microsoft/playwright-mcp\\\` GitHub repo with all three.

### My mcp.json has both global and project entries; which wins?

Project entries (\\\`.cursor/mcp.json\\\` next to your repo) override global (\\\`~/.cursor/mcp.json\\\`). The merge is per-server-name, so a project entry replaces only the server with the same key.

### Why does the server take 30 seconds to start the first time?

First launch downloads the \\\`@playwright/mcp\\\` package and the Chromium binary (about 150 MB). Subsequent launches use the npm cache and finish in 1-2 seconds. Install once globally to remove the first-launch delay: \\\`npm install -g @playwright/mcp@latest\\\`.

### Can I see what Cursor's MCP host is doing in real time?

Yes, tail the main log while reproducing. For more detail, set \\\`CURSOR_LOG_LEVEL=debug\\\` in your shell before launching Cursor from the terminal (\\\`open -a Cursor\\\` on macOS). The verbose log captures every JSON-RPC frame.

### Does VPN or a firewall cause this?

Yes. The MCP server itself does not need outbound network at runtime (after initial download), but the browser it launches may. If your VPN inspects TLS, you may also need \\\`--ignore-https-errors\\\` or a CA installed in the Playwright browser bundle.

### Is there a way to test mcp.json without launching Cursor?

Yes. \\\`npx @anthropic-ai/mcp-cli\\\` (or any compatible CLI) can spawn the same server with the same args and exercise tools. Useful for CI smoke tests.

## Conclusion + CTA

Six root causes account for nearly every Playwright MCP + Cursor failure: PATH, browser binary, Cursor version, Windows escapes, JSON syntax, and stale process state. Tail the log, classify the error, copy the known-good \\\`mcp.json\\\`, then rebuild your customizations on top once the baseline is green. For the original install steps, return to [Playwright MCP install in Cursor](/blog/playwright-mcp-server-install-cursor-2026-step-by-step). For configuration after the connection is stable, see [Playwright MCP setup + configuration](/blog/playwright-mcp-server-setup-configuration-2026-reference) and the [skills directory](/skills) for skills that pair well with the MCP install. Compare MCP host options on the [compare page](/compare).
`,
};
