import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Install Behind Proxy / China Mirror 2026',
  description:
    'Install Playwright browsers behind a corporate proxy or in China. Configure PLAYWRIGHT_DOWNLOAD_HOST, HTTPS_PROXY, mirrors, and fully offline installs.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# Playwright Install Behind a Proxy or China Mirror in 2026

Installing Playwright on your laptop is usually a one-liner. Installing it inside a locked-down corporate network, behind an authenticating proxy, or from a region where the default download CDN is slow or blocked is a different story entirely. The \`npx playwright install\` step downloads three browser builds -- Chromium, Firefox, and WebKit -- each tens of megabytes, from a Microsoft-hosted CDN. If that CDN is unreachable, throttled, or requires going through a proxy your shell does not know about, the install hangs, times out, or fails with a cryptic socket error. For teams in China, on government networks, or inside enterprises with strict egress rules, this is the single biggest obstacle to adopting Playwright.

The good news is that Playwright was designed with these environments in mind. It honors standard \`HTTPS_PROXY\` and \`HTTP_PROXY\` variables for routing downloads through a corporate proxy, it supports \`PLAYWRIGHT_DOWNLOAD_HOST\` to point the installer at a faster mirror or an internal artifact server, and it can be made to skip downloads entirely so you can vendor the browser binaries yourself for fully offline installs. Get these three levers right and Playwright installs reliably anywhere.

This guide is a complete reference for installing Playwright browsers in restricted environments in 2026. You will learn how proxy variables flow through the installer, how to use \`PLAYWRIGHT_DOWNLOAD_HOST\` to point at a mirror, how to set up an internal binary mirror for an air-gapped network, how to perform a fully offline install by copying a browser cache between machines, and how to verify everything worked. Examples are bash for the install commands and TypeScript for the runtime proxy configuration your tests will need.

---

## Key Takeaways

- **\`HTTPS_PROXY\` / \`HTTP_PROXY\`** route Playwright's browser downloads through a corporate proxy; \`NO_PROXY\` exempts internal hosts.
- **\`PLAYWRIGHT_DOWNLOAD_HOST\`** redirects the installer to a faster mirror or an internal artifact server -- the key to fast installs in China.
- **Per-browser host overrides** (\`PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST\`, etc.) let you mirror only some browsers.
- **\`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD\`** plus a copied cache enables fully offline, air-gapped installs.
- **Runtime proxying** of the *tested site* is separate from install-time proxying and is configured via \`launchOptions.proxy\` in \`playwright.config.ts\`.

---

## How the Playwright Installer Downloads Browsers

When you run \`npx playwright install\`, Playwright reads its bundled browser version manifest, computes the download URL for each browser on your platform, and fetches the archives over HTTPS from its default CDN host. Each archive is then unpacked into the browser cache directory. The installer respects standard Node and OS networking conventions, which is exactly why proxy and mirror environment variables work -- they intercept that HTTPS fetch.

The default download host is a Microsoft-operated CDN. In most parts of the world it is fast. The two situations that break it are: a network that does not allow direct egress to that CDN (you must go through a proxy), and a region where the CDN is geographically far or filtered (you want a closer mirror). Everything in this guide is about controlling that one HTTPS fetch.

\`\`\`bash
# The basic install -- this is the command that needs help in restricted networks
npx playwright install

# Install only the browser you actually test against (smaller download)
npx playwright install chromium

# Also install OS-level dependencies (Linux CI/Docker)
npx playwright install --with-deps chromium
\`\`\`

---

## Installing Behind a Corporate Proxy

If your network requires all outbound HTTPS to go through a proxy, set \`HTTPS_PROXY\` (and usually \`HTTP_PROXY\`) before running the install. Playwright's downloader uses these the same way curl and npm do. Include credentials in the URL if your proxy authenticates, and use \`NO_PROXY\` to exempt any internal hosts you do not want routed through the proxy.

\`\`\`bash
# Route Playwright's browser downloads through an authenticating proxy
export HTTPS_PROXY="http://username:password@proxy.corp.example.com:8080"
export HTTP_PROXY="http://username:password@proxy.corp.example.com:8080"

# Do NOT proxy internal hosts (e.g. an internal mirror)
export NO_PROXY="localhost,127.0.0.1,.corp.example.com"

# Now the install will tunnel through the proxy
npx playwright install --with-deps
\`\`\`

A few practical notes. If your proxy uses a self-signed or internal CA certificate, Node may reject the TLS handshake. Point Node at your CA bundle with \`NODE_EXTRA_CA_CERTS\` rather than disabling TLS verification, which is unsafe:

\`\`\`bash
# Trust the corporate root CA instead of disabling TLS checks
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/corp-root-ca.pem
npx playwright install
\`\`\`

If your password contains special characters, URL-encode them in the proxy URL (for example \`@\` becomes \`%40\`). And remember that \`npm install @playwright/test\` and \`npx playwright install\` are two separate network steps -- npm uses its own proxy config (\`npm config set proxy\`), while the browser download uses the \`HTTPS_PROXY\` variable. You often need both.

| Variable | Controls | Example |
|---|---|---|
| \`HTTPS_PROXY\` | Playwright browser downloads over HTTPS | \`http://proxy:8080\` |
| \`HTTP_PROXY\` | Plain HTTP fetches | \`http://proxy:8080\` |
| \`NO_PROXY\` | Hosts to bypass the proxy | \`localhost,.corp.com\` |
| \`NODE_EXTRA_CA_CERTS\` | Extra trusted CA bundle | \`/path/ca.pem\` |
| npm \`proxy\` config | The \`npm install\` step | \`npm config set proxy ...\` |

---

## Using PLAYWRIGHT_DOWNLOAD_HOST for a Faster Mirror

For users in China or any region far from the default CDN, the most effective fix is not a proxy but a *mirror*. \`PLAYWRIGHT_DOWNLOAD_HOST\` overrides the host the installer fetches browser archives from. Point it at a geographically close mirror and downloads that previously crawled at a few KB/s complete in seconds. Several community and corporate mirrors host the exact archive layout Playwright expects, so you change only the host.

\`\`\`bash
# Point the installer at a mirror close to you (China example)
export PLAYWRIGHT_DOWNLOAD_HOST="https://playwright.azureedge.net.your-mirror.example.cn"
npx playwright install
\`\`\`

You can override the host for specific browsers only, which is useful if you mirror Chromium internally but are happy to pull Firefox and WebKit from the default host:

\`\`\`bash
# Mirror only Chromium; leave the others on the default CDN
export PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST="https://chromium-mirror.example.cn"
npx playwright install
\`\`\`

The per-browser variables are \`PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST\`, \`PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST\`, and \`PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST\`. A specific browser variable takes precedence over the general \`PLAYWRIGHT_DOWNLOAD_HOST\` for that browser. This precedence lets you set a global mirror and then redirect just one browser elsewhere.

| Variable | Scope | Precedence |
|---|---|---|
| \`PLAYWRIGHT_DOWNLOAD_HOST\` | All browsers | Lowest |
| \`PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST\` | Chromium only | Overrides global |
| \`PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST\` | Firefox only | Overrides global |
| \`PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST\` | WebKit only | Overrides global |

---

## Hosting Your Own Internal Mirror

In enterprises with no outbound internet at all, the durable solution is an internal mirror: a server inside your network that holds the Playwright browser archives, populated once from a machine that does have internet access. You then point every developer and CI runner at that internal host via \`PLAYWRIGHT_DOWNLOAD_HOST\`. The mirror just needs to serve files at the same relative paths Playwright requests.

The simplest mirror is a static file server (nginx, an S3-compatible bucket, or an artifact repository like Artifactory or Nexus that supports raw/generic repositories) holding the archive tree. To populate it, download the archives once on an internet-connected machine, then upload them preserving the path structure.

\`\`\`bash
# On an internet-connected machine: fetch archives into the local cache
PLAYWRIGHT_BROWSERS_PATH=./pw-cache npx playwright install chromium

# The cache now holds the unpacked browsers; for a download mirror you serve
# the original .zip archives. Many teams instead mirror the cache directory
# itself and use the offline-copy approach in the next section.
\`\`\`

For an artifact repository, configure a remote/proxy repository that points upstream at the default Playwright CDN. The first request for each archive is fetched from upstream and cached; subsequent requests are served locally. Then internal clients simply set the download host to your repository URL:

\`\`\`bash
# Every internal client points at the Artifactory/Nexus generic repo
export PLAYWRIGHT_DOWNLOAD_HOST="https://artifacts.corp.example.com/playwright"
npx playwright install
\`\`\`

This proxy-repository pattern is the lowest-maintenance option because new Playwright versions are fetched and cached automatically the first time someone requests them.

---

## Fully Offline / Air-Gapped Installs

When a machine has no network access of any kind -- not even to an internal mirror -- you install the npm package from a private registry or vendored \`node_modules\`, tell Playwright to skip the browser download, and copy a pre-populated browser cache onto the machine. The cache is just a directory of unpacked browsers, so it transfers cleanly between machines of the same OS and architecture.

Step one, on a connected machine of the *same platform*, populate a portable cache:

\`\`\`bash
# Populate a portable browser cache on a connected machine
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers npx playwright install chromium firefox webkit

# Archive it for transfer
tar -czf pw-browsers.tar.gz -C /tmp pw-browsers
\`\`\`

Step two, on the air-gapped machine, unpack the cache and tell Playwright not to download anything during \`npm install\`:

\`\`\`bash
# Skip the post-install browser download entirely
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install @playwright/test   # installs the package, downloads no browsers

# Drop the copied cache into place and point Playwright at it
tar -xzf pw-browsers.tar.gz -C /opt
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
\`\`\`

Now \`npx playwright test\` finds the browsers in \`PLAYWRIGHT_BROWSERS_PATH\` and never attempts a download. The two critical rules: the cache must come from the *same OS and CPU architecture* (a Linux x64 cache will not run on macOS arm64), and the Playwright package version on the air-gapped machine must match the version that produced the cache, since browser builds are pinned per release.

\`\`\`bash
# Verify the offline install works without any network
npx playwright install --dry-run   # lists what it would download; should be nothing
npx playwright test --list          # confirms Playwright can launch the cached browsers
\`\`\`

---

## Docker Images for Restricted Networks

In CI and containers, the cleanest approach is the official Playwright Docker image, which ships with the browsers already baked in -- no download step at all. This sidesteps proxy and mirror issues entirely for containerized runs because nothing is fetched at build or run time.

\`\`\`bash
# The official image includes pinned, pre-installed browsers
docker run --rm -v "$(pwd):/work" -w /work \\
  mcr.microsoft.com/playwright:v1.49.0-jammy \\
  npx playwright test
\`\`\`

If you build a custom image inside a restricted network, combine the techniques above: set the proxy or mirror variables in the build, or copy a pre-populated cache into the image. Pinning the image tag to the same version as your \`@playwright/test\` dependency avoids the version-mismatch failures that plague hand-rolled images.

\`\`\`dockerfile
# Dockerfile -- install browsers through a mirror at build time
FROM node:20-bookworm
ENV PLAYWRIGHT_DOWNLOAD_HOST=https://artifacts.corp.example.com/playwright
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium
COPY . .
CMD ["npx", "playwright", "test"]
\`\`\`

---

## Configuring a Proxy for the Tested Site at Runtime

It is important not to confuse two different kinds of proxying. Everything so far has been about the *install-time* download of browser binaries. A completely separate concern is routing the *traffic of the site under test* through a proxy at runtime -- for example, accessing an internal staging site only reachable via a proxy. That is configured in \`playwright.config.ts\` through \`launchOptions.proxy\`, not through environment variables.

\`\`\`typescript
// playwright.config.ts -- proxy the BROWSER's traffic, not the installer
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    launchOptions: {
      proxy: {
        server: 'http://proxy.corp.example.com:8080',
        // Optional credentials if the proxy authenticates
        username: process.env.PROXY_USER,
        password: process.env.PROXY_PASS,
        // Hosts the browser should reach directly
        bypass: 'localhost,127.0.0.1,*.internal',
      },
    },
  },
});
\`\`\`

You can also set the proxy per browser context if only some tests need it:

\`\`\`typescript
// Proxy a single context rather than the whole project
import { test } from '@playwright/test';

test('reaches internal staging via proxy', async ({ browser }) => {
  const context = await browser.newContext({
    proxy: { server: 'http://proxy.corp.example.com:8080' },
  });
  const page = await context.newPage();
  await page.goto('https://staging.internal/health');
  await context.close();
});
\`\`\`

| Concern | Configured by | When it applies |
|---|---|---|
| Downloading browsers | \`HTTPS_PROXY\`, \`PLAYWRIGHT_DOWNLOAD_HOST\` | \`npx playwright install\` |
| Browsing the tested site | \`launchOptions.proxy\` / context \`proxy\` | At test runtime |

---

## Configuring the npm Step Separately

A subtle source of failed installs is forgetting that \`npm install @playwright/test\` and \`npx playwright install\` use *different* proxy configurations. The first is an npm registry operation; the second is a browser-binary download. The \`HTTPS_PROXY\` environment variable covers the browser download, but npm reads its own configuration. If your registry is unreachable directly, set npm's proxy explicitly, or point npm at an internal registry mirror.

\`\`\`bash
# Configure npm's own proxy for the package-install step
npm config set proxy "http://username:password@proxy.corp.example.com:8080"
npm config set https-proxy "http://username:password@proxy.corp.example.com:8080"

# Or point npm at an internal registry mirror entirely
npm config set registry "https://registry.npm.corp.example.com/"

# Then install the package, followed by the browsers
npm install @playwright/test
npx playwright install
\`\`\`

For Python, the equivalent is pip's proxy handling. Pass \`--proxy\` to pip or set the standard variables, and use an internal PyPI mirror via \`--index-url\` when the public index is blocked:

\`\`\`bash
# pip honors HTTPS_PROXY too, or use --proxy and an internal index
pip install --proxy "http://proxy.corp.example.com:8080" playwright
# Or an internal mirror
pip install --index-url https://pypi.corp.example.com/simple playwright
python -m playwright install
\`\`\`

Keeping the package-install proxy and the browser-download proxy in sync -- both pointing at the same proxy or both at internal mirrors -- is the single most reliable way to avoid an install that gets halfway and then stalls on the browser fetch.

## Verifying and Debugging a Restricted Install

When an install fails in a restricted network, work through the checks methodically rather than guessing. First confirm the proxy is reachable and your variables are exported in the *same* shell that runs the install. Second, run the install with debug logging so you can see exactly which URL is being fetched and where it fails. Playwright honors the \`DEBUG\` variable for verbose output.

\`\`\`bash
# Turn on verbose install logging to see the exact download URLs and errors
DEBUG=pw:install npx playwright install chromium
\`\`\`

A \`dry-run\` confirms the resolved download host and what would be fetched without actually downloading, which is the fastest way to verify your \`PLAYWRIGHT_DOWNLOAD_HOST\` took effect:

\`\`\`bash
# Confirm the mirror host is being used before committing to a full download
PLAYWRIGHT_DOWNLOAD_HOST=https://mirror.example.cn \\
  npx playwright install --dry-run
\`\`\`

If the dry-run shows the wrong host, your variable is not set in the active shell or is being overridden by a per-browser variable. If it shows the right host but the download still fails, the issue is network reachability or TLS -- test it directly with curl through the same proxy to isolate whether the problem is Playwright or the network itself.

\`\`\`bash
# Isolate network vs Playwright: can curl reach the host through the proxy?
curl -x "$HTTPS_PROXY" -I "$PLAYWRIGHT_DOWNLOAD_HOST" --cacert "$NODE_EXTRA_CA_CERTS"
\`\`\`

| Symptom | Likely cause | Check |
|---|---|---|
| Hangs then times out | Proxy not applied to download | \`DEBUG=pw:install\` shows direct fetch |
| TLS / cert error | Untrusted internal CA | Set \`NODE_EXTRA_CA_CERTS\` |
| Wrong host in dry-run | Variable not exported | Re-export in the active shell |
| npm fails, browsers fine | npm proxy unset | \`npm config set proxy\` |

## Generating Install and Proxy Skills with AI Agents

Getting all these variables in the right place -- proxy for npm, proxy for the browser download, mirror host, CA certificate, runtime proxy -- is fiddly, and AI coding agents frequently mix up install-time and runtime proxying or suggest disabling TLS verification. A QA skill that encodes the correct setup keeps your agent from generating insecure or non-working configs.

Browse the [Playwright setup and CI skills at qaskills.sh/skills](/skills) and install one to give your agent the right install patterns:

\`\`\`bash
# Install a Playwright environment-setup skill
npx @qaskills/cli add playwright-install-proxy
\`\`\`

For related environment configuration, see our [Docker testing strategies guide](/blog/docker-testing-strategies-guide) and the companion reference on [PLAYWRIGHT_BROWSERS_PATH](/blog/playwright-browsers-path-env-guide) for controlling the browser cache location.

---

## Frequently Asked Questions

### How do I install Playwright browsers behind a corporate proxy?

Set \`HTTPS_PROXY\` (and usually \`HTTP_PROXY\`) to your proxy URL, including credentials if it authenticates, then run \`npx playwright install\`. Playwright's downloader honors these standard variables. Use \`NO_PROXY\` to bypass internal hosts, and if your proxy uses an internal CA, set \`NODE_EXTRA_CA_CERTS\` to your CA bundle rather than disabling TLS. Remember the \`npm install\` step uses npm's own proxy config separately.

### What is PLAYWRIGHT_DOWNLOAD_HOST used for?

\`PLAYWRIGHT_DOWNLOAD_HOST\` overrides the host the installer fetches browser archives from, letting you point at a faster mirror or an internal artifact server. It is the primary fix for slow installs in China and other regions far from the default CDN. Per-browser variants like \`PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST\` override the host for a single browser and take precedence over the global setting.

### How do I install Playwright in China where the CDN is slow?

Point \`PLAYWRIGHT_DOWNLOAD_HOST\` at a mirror geographically close to you that hosts the Playwright archive layout, then run \`npx playwright install\`. Downloads that crawled from the default CDN typically complete in seconds from a local mirror. For teams, hosting an internal proxy repository (Artifactory or Nexus) that caches the archives is the most reliable long-term solution.

### How do I install Playwright on an air-gapped machine with no internet?

On a connected machine of the same OS and architecture, run \`PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers npx playwright install\` and archive the result. On the air-gapped machine, set \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\` before \`npm install\` so no download is attempted, unpack the copied cache, and point \`PLAYWRIGHT_BROWSERS_PATH\` at it. The cache version must match the installed package version.

### Should I disable TLS verification to get past certificate errors?

No. Disabling TLS verification exposes your downloads to tampering. If you hit certificate errors behind a corporate proxy, the cause is usually an internal CA that Node does not trust. Point \`NODE_EXTRA_CA_CERTS\` at your organization's root CA bundle instead. This trusts your specific CA while keeping verification on for everything else, which is the safe approach.

### What is the difference between install-time and runtime proxying?

Install-time proxying (\`HTTPS_PROXY\`, \`PLAYWRIGHT_DOWNLOAD_HOST\`) controls how Playwright downloads browser binaries. Runtime proxying (\`launchOptions.proxy\` in \`playwright.config.ts\` or a context's \`proxy\` option) controls how the launched browser reaches the site under test. They are independent: you might download browsers directly but route the tested site's traffic through a proxy, or vice versa.

### Can I avoid downloads entirely in CI?

Yes. Use the official Playwright Docker image (\`mcr.microsoft.com/playwright:<version>\`), which ships with browsers pre-installed, so no download happens at build or run time. Pin the image tag to the same version as your \`@playwright/test\` dependency to avoid version mismatches. This is the cleanest option for containerized CI in restricted networks.

---

## Conclusion

Installing Playwright in a restricted environment comes down to controlling one HTTPS fetch. Route it through your proxy with \`HTTPS_PROXY\`, speed it up with a mirror via \`PLAYWRIGHT_DOWNLOAD_HOST\`, or skip it entirely with \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD\` and a copied browser cache for air-gapped machines. Trust internal CAs with \`NODE_EXTRA_CA_CERTS\` rather than disabling TLS, keep the package version aligned with any cache or Docker image, and never confuse install-time proxying with the separate \`launchOptions.proxy\` you use to reach the tested site.

With these levers, Playwright installs reliably behind any proxy, from any region, and even with no internet at all. To have your AI coding agent generate the correct, secure setup for your network, install a Playwright environment skill from [qaskills.sh/skills](/skills) and read our companion [PLAYWRIGHT_BROWSERS_PATH reference](/blog/playwright-browsers-path-env-guide).
`,
};
