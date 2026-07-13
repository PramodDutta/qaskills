import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright UI Mode “Port Already in Use” Fix',
  description:
    'Fix Playwright UI Mode port already in use errors by finding the listener, choosing a safe port, and preventing stale test processes from returning.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright UI Mode “Port Already in Use” Fix

The terminal says “Listening on http://localhost:9323,” yet the browser never reaches the Playwright interface. A second launch then fails with “address already in use.” That sequence usually means UI Mode is not the first process trying to own its HTTP listener. A previous Playwright process, an HTML report server, a container forward, or an unrelated development tool is already bound to the same address.

This is an operating-system resource problem before it is a Playwright problem. The reliable fix is to identify the process that owns the listening socket, decide whether it is legitimate, and then either stop it or give the new UI session a different port. Guessing with repeated restarts can hide the actual owner and occasionally kills work that should have stayed alive.

This guide covers the diagnosis on macOS, Linux, and Windows, explains why the collision often reappears in agent-driven workflows, and gives a small verification harness that proves a port is available before a long test command starts.

## What UI Mode is trying to bind

Playwright Test UI Mode starts a local web application for exploring, running, and debugging tests. The command is normally \`npx playwright test --ui\`. The interface needs a TCP listener, so the operating system must grant exclusive use of an address and port combination such as \`127.0.0.1:9323\`.

Port numbers are not globally owned. They are scoped by protocol, network namespace, and bind address. A listener on IPv6 \`[::]:9323\` may also cover IPv4 connections, depending on the platform. A server bound to \`0.0.0.0:9323\` occupies every IPv4 interface, while one bound only to \`127.0.0.1:9323\` does not claim a machine's LAN address. This detail explains cases where a superficial check of localhost looks empty even though a wildcard listener blocks the launch.

| Listener state | Meaning | Practical consequence |
|---|---|---|
| \`127.0.0.1:9323\` | IPv4 loopback only | Local programs can connect, remote hosts cannot |
| \`0.0.0.0:9323\` | Every IPv4 interface | Conflicts with any new IPv4 bind on port 9323 |
| \`[::1]:9323\` | IPv6 loopback only | May coexist with IPv4 on some systems |
| \`[::]:9323\` | Every IPv6 interface | Can also reserve IPv4 through dual-stack behavior |
| Container-published port | Host forwards to a container listener | The owner may appear as Docker or a virtualization process |

The displayed URL is where the client should connect, not necessarily the complete bind configuration. Inspect the actual listener when the error and displayed address appear inconsistent.

## Find the process holding the port

On macOS and Linux, \`lsof\` gives a readable first answer. Replace 9323 with the port named in the error:

\`\`\`bash
lsof -nP -iTCP:9323 -sTCP:LISTEN
\`\`\`

The useful columns are command, PID, user, and name. Do not jump directly to \`kill -9\`. First inspect the command line for that PID:

\`\`\`bash
ps -p 48122 -o pid=,ppid=,etime=,command=
\`\`\`

The parent PID and elapsed time help distinguish a forgotten Playwright child from an active service. On Linux, \`ss -ltnp 'sport = :9323'\` is another strong option, although process details can require suitable permissions. On Windows PowerShell, use \`Get-NetTCPConnection -LocalPort 9323 -State Listen\`, then pass its \`OwningProcess\` value to \`Get-Process -Id <pid>\`. Older Windows environments can use \`netstat -ano | findstr :9323\` followed by \`tasklist /FI "PID eq <pid>"\`.

An empty result does not always clear Playwright. Check that the error is current, that the searched port is correct, and that IPv6 is included. A process may also exit between the failed bind and your inspection. In that case, immediately rerun UI Mode once. If it succeeds, the collision was transient; if it fails with a different PID each time, a supervisor is restarting the owner.

## Decide whether to stop or preserve the listener

A stale process is one that no longer serves an intended session. A long-running service, another engineer's remote session, or a container dependency is not stale merely because it blocks your preferred number.

Use a graceful signal for a process you own. On Unix, \`kill <pid>\` sends SIGTERM by default. Wait briefly, rerun \`lsof\`, and escalate only if the process ignores termination and you understand why. On Windows, \`Stop-Process -Id <pid>\` is the normal PowerShell route. Closing the terminal or UI browser does not guarantee the Node process exits, especially when a task runner, IDE, or agent owns it.

| Observed owner | Safer action | Reason |
|---|---|---|
| Old \`playwright test --ui\` under your user | Terminate gracefully | It is an abandoned duplicate session |
| \`playwright show-report\` you still need | Move UI Mode to another port | The report server contains useful state |
| Docker Desktop or a container proxy | Inspect published ports first | Killing the proxy can disrupt several services |
| IDE test extension | Stop the test run through the IDE | Its supervisor may immediately respawn the child |
| Unknown process owned by another user | Choose another port or contact the owner | Ownership and impact are not established |
| CI worker process | Fix job isolation | Manual cleanup will not prevent the next collision |

Avoid broad commands such as killing every Node process. A development machine often runs language servers, application servers, package watchers, and test workers under the same executable name. PID-specific cleanup is slower by seconds and safer by hours.

## Launch UI Mode on an explicit port

Playwright exposes UI host and port command-line options. After confirming that a different port is free, launch the interface explicitly:

\`\`\`bash
npx playwright test --ui --ui-port=9324 --ui-host=127.0.0.1
\`\`\`

Binding to loopback is a sensible default for a debugging interface. Use \`--ui-host=0.0.0.0\` only when a container, virtual machine, or remote development setup requires external access, and protect the surrounding network appropriately. A wildcard bind changes exposure as well as conflict behavior.

If your installed Playwright version rejects an option, check \`npx playwright test --help\` for the version in that repository. Do not assume a globally installed CLI and the project's package version accept identical flags. Running through \`npx\` from the workspace helps select the local dependency.

An explicit port is especially useful when UI Mode and the HTML reporter are used together. The HTML report server commonly uses port 9323, so assigning UI Mode 9324 makes ownership obvious. Document the convention in a repository script if the team frequently operates both.

## Prove availability before starting a session

A process-list check has a race: another process can bind after the check and before Playwright starts. The final authority is still Playwright's bind attempt. Nevertheless, a small Node script produces a clearer preflight failure in agent workflows and can select a known fallback.

\`\`\`javascript
// scripts/check-ui-port.mjs
import net from 'node:net';

const port = Number(process.env.PW_UI_PORT ?? 9324);
const host = process.env.PW_UI_HOST ?? '127.0.0.1';

const server = net.createServer();

server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(\`Playwright UI port \${host}:\${port} is already occupied\`);
    process.exitCode = 2;
    return;
  }
  console.error(error);
  process.exitCode = 1;
});

server.once('listening', () => {
  console.log(\`Port \${host}:\${port} is available\`);
  server.close();
});

server.listen({ host, port, exclusive: true });
\`\`\`

Run \`node scripts/check-ui-port.mjs\`, then start UI Mode with the same host and port. This script uses Node's real \`net.Server.listen\` API and reports \`EADDRINUSE\`, the same error class encountered by an HTTP server. It should not stay running, because holding the socket would prevent Playwright from acquiring it.

For a team script, make the selected value visible rather than silently scanning hundreds of ports. Automatic selection sounds convenient, but it produces confusing bookmarks and makes container port mappings unreliable. A short ordered list, for example 9324 for UI Mode and 9323 for HTML reports, is easier to support.

## Why the port returns after cleanup

When the same PID or command returns seconds after termination, something else owns its lifecycle. Common supervisors include an IDE test adapter, \`npm run\` watcher, Turborepo task, Docker Compose restart policy, system service, and a coding agent that retries failed commands.

Look upward in the process tree. On Unix, the PPID from \`ps\` points to the direct parent. Continue until you reach the terminal, IDE, container daemon, or service manager that initiated the chain. Stop the run at that level. Killing only the leaf is ineffective when the parent treats its exit as a crash.

A second cause is shell interruption. Closing a terminal tab or sending Ctrl+C normally propagates a signal, but wrappers can mishandle it. If this happens consistently, test the package script without its task runner and check whether the wrapper forwards SIGINT and SIGTERM. The problem is then process supervision, not a shortage of ports.

Temporary collisions also arise from parallel agents. Two agents working in separate worktrees still share the host's network namespace unless they run in isolated containers. A checked-in default port therefore behaves like a global mutex. Allocate ports per worker, pass them as environment variables, and include the worker identity in logs.

## Containers, SSH forwarding, and remote workspaces

Remote environments add at least two listeners: the server inside the workspace and the forwarder on the client. A browser error on the laptop can reflect either side. Check the port inside the container or remote host first, then inspect the local forwarded port.

For Docker, a mapping such as \`9324:9324\` requires Playwright to listen on an address reachable from outside the container, usually \`0.0.0.0\`. The host side must also be free. Changing only the container port without changing the published mapping produces a dead route. Conversely, publishing \`9325:9324\` means the browser uses host port 9325 while Playwright listens on container port 9324.

| Environment | Server bind | Client URL | Collision to inspect |
|---|---|---|---|
| Local workstation | \`127.0.0.1:9324\` | \`http://127.0.0.1:9324\` | Local OS listener |
| Docker with \`9325:9324\` | \`0.0.0.0:9324\` in container | \`http://127.0.0.1:9325\` | Both container 9324 and host 9325 |
| SSH \`-L 9325:127.0.0.1:9324\` | Remote \`127.0.0.1:9324\` | Local \`http://127.0.0.1:9325\` | Remote server and local SSH forward |
| Cloud IDE forwarded port | Workspace-specific bind | Provider URL or localhost | Workspace listener plus forwarding service |

In a shared remote machine, loopback does not imply private to one user. Other users on that host may connect. Prefer the platform's authenticated forwarding mechanism and close debug servers after use.

## Separate UI Mode from Trace Viewer failures

UI Mode, the HTML report server, and Trace Viewer all present browser interfaces, so reports often collapse them into “the Playwright port error.” Their launch commands and lifecycles differ. Capture the exact command and the first bind-related stack line before changing configuration.

Trace Viewer can be opened from a trace archive with \`npx playwright show-trace path/to/trace.zip\`. It may choose or expose a local endpoint depending on how it is launched and the installed version. If the debugging need is trace-specific, the [Playwright Trace Viewer guide](/blog/playwright-trace-viewer-guide-2026) explains trace capture and inspection without conflating it with the test explorer.

UI Mode itself has behavior beyond server startup, including project filtering, watch behavior, locator exploration, and test selection. Once the socket issue is fixed, the [complete Playwright UI Mode guide](/blog/playwright-ui-mode-guide-2026) is the better reference for using the interface rather than troubleshooting its listener.

## Make port ownership predictable in a repository

The lasting remedy is a convention, not a heroic cleanup command. Add a package script with an explicit UI port, keep report serving on a separate documented number, and parameterize the value for parallel workers. Include the address in startup logs so screenshots and bug reports identify the endpoint.

A useful runbook asks four questions: Which command failed? Which exact address was requested? Which PID currently owns it? Which parent started that PID? Those answers turn an intermittent complaint into a reproducible resource conflict.

Do not reserve a port by running a dummy server before Playwright. That guarantees the collision you meant to avoid. Likewise, do not treat \`TIME_WAIT\` connections as listening servers. \`TIME_WAIT\` is a normal TCP cleanup state and generally does not mean another application owns a listening socket. Filter diagnostics for \`LISTEN\` or \`LISTENING\`.

For CI, question whether UI Mode belongs in the job at all. It is an interactive debugging surface. Standard headless test execution plus retained traces and HTML reports usually fits automation better. If a remote debugging job deliberately runs UI Mode, isolate workers with containers or unique ports and give the job a timeout that cleans up its process tree.

## Capture evidence from an intermittent bind failure

Port collisions that vanish on retry need evidence collected at the moment of failure. Wrap the local UI command in a small team runbook rather than a retry loop. Record the timestamp, requested host and port, current working directory, Playwright package version, process ID of the failed launcher, and listener owner returned by the operating system. On a shared machine, record usernames only where policy permits and never dump complete process environments, which can contain tokens.

Correlate the listener with recent commands. A Playwright report server started from another terminal may have the same executable and similar arguments, so the working directory is useful. On Linux, the process file-system entries can expose its current directory when permissions allow. On macOS, process inspection tools can show open files that point to the repository. Windows Process Explorer provides comparable ownership detail. The goal is to identify lifecycle, not collect a forensic archive of unrelated developer activity.

If the owner exits too quickly to inspect, sample listening sockets while reproducing the launch and retain only matching port lines. A rapidly changing PID suggests a supervisor crash loop. A stable PID suggests one long-running owner. Different conclusions lead to different fixes: repair the supervisor configuration for the former, or allocate a separate endpoint for the latter.

Also capture the exact error code. EADDRINUSE means the address is occupied, while EACCES indicates permission or platform policy, and EADDRNOTAVAIL indicates the requested host address is not configured locally. These errors can appear near the same startup line but should not share a remedy. Changing ports will not make a nonexistent host address valid.

After applying a fix, verify more than initial startup. Open the UI, run one small test, stop the process normally, and confirm the listener disappears. Repeat the full sequence once. This catches wrappers that launch correctly but fail to clean up children. If Ctrl+C leaves the socket behind, record the remaining parent-child chain and fix signal forwarding in the script that owns the process.

Teams with frequent parallel sessions can maintain a short allocation table in developer documentation. Keep it advisory rather than pretending TCP ports can be reserved in source control. For automated workers, derive a bounded port from an assigned worker number and reject duplicate worker identities early. Log both the logical worker and actual listener so a future collision can be traced without guesswork.

Finally, avoid adding automatic force-kill behavior to a package script. A script cannot reliably know that a listener belongs to an abandoned session just from its port. An explicit diagnostic command that prints ownership is safe; termination should remain a deliberate act by the process owner or the supervisor responsible for it.

## Frequently Asked Questions

### Why does Playwright mention port 9323 when I did not configure it?

That port is commonly associated with Playwright's local web interfaces, particularly report serving. The exact selection depends on the command and installed version. Read the failing command's output and its help text, then inspect the named port rather than assuming which component selected it.

### Can I use port 0 and let the operating system choose?

Yes. Current Playwright accepts \`--ui-port=0\` and uses any free port. It is convenient for a local session, but a stable explicit port remains easier when a container mapping, SSH forward, bookmark, or external automation must know the endpoint in advance.

### Why does killing the listener not fix the next launch?

Its parent process probably restarts it, or two automation workers keep choosing the same port. Inspect the process tree and stop the supervisor, then assign distinct ports when sessions are meant to coexist.

### Is a port in TIME_WAIT responsible for EADDRINUSE?

Usually not for this scenario. Look specifically for a listening socket. A recently closed TCP connection in TIME_WAIT is different from a process actively accepting connections.

### Should UI Mode listen on 0.0.0.0 inside Docker?

It often must bind to all container interfaces so the published host port can reach it. Expose that port only through a trusted local or authenticated development path, because a debugging UI should not be casually reachable from an untrusted network.
`,
};
