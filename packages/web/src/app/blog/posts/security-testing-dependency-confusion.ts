import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Dependency Confusion: How QA Teams Catch Registry Mixups',
  description: 'Security testing dependency confusion guide for detecting registry mixups, unsafe package names, CI install drift, and source confusion before attackers do.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Security Testing Dependency Confusion: How QA Teams Catch Registry Mixups

Security testing dependency confusion means proving that your build, test, and deployment systems install internal packages from the intended private registry, not from a public package with the same or more attractive name. The risk appears when package names, registry configuration, lockfiles, and CI credentials do not make the source of each dependency unambiguous.

QA and test-automation engineers can catch this class of supply-chain bug without running dangerous public publishing experiments. The workflow is to inventory internal package names, verify registry routing, test clean installs in CI-like environments, block ambiguous configuration, and review dependency changes as part of every pull request. The goal is not to exploit your own company. The goal is to prove that a typo, missing scope mapping, or unsafe extra index cannot redirect resolution.

Dependency confusion belongs in the same security regression discipline as token and key handling. If your team is already testing identity-sensitive behavior such as [Testing JWT Key Rotation and JWKS Cache](/blog/testing-jwt-key-rotation-jwks-cache), bring the same evidence-first mindset to package resolution. AI-assisted review can help maintain the inventory, but it must be constrained by the secure review practices in [AI-Augmented Software Testing 2026 Guide](/blog/ai-augmented-software-testing-2026-guide).

## Model the Attack as a Resolution Failure

Dependency confusion is easiest to test when you describe it as a resolution failure. A build asks for \`internal-logger\`. The package manager searches one or more registries. If a public registry can satisfy that name, the build may install the wrong artifact unless configuration, scoping, lockfiles, or repository policy prevents it. The exact behavior depends on the ecosystem and package manager, so tests should verify your configured path rather than assume universal priority rules.

| Ecosystem area | Confusion trigger | Safer expectation |
|---|---|---|
| npm package names | Unscoped internal name also exists publicly | Internal packages use a controlled scope |
| npm registry config | Missing \`@scope:registry\` mapping | Scope maps to private registry in project config |
| Python installs | Public and private indexes both searched | Internal packages resolve only through intended index or mirror |
| CI environment | Developer machine has config, runner does not | Clean runner install proves registry routing |
| Lockfile review | New dependency source ignored | Pull request highlights name, version, and source |
| Build logs | Registry URL omitted | Install logs or metadata can be audited safely |

The test target is not just the developer workstation. CI runners, release jobs, Docker builds, ephemeral preview environments, and AI coding-agent sandboxes may have different config files and environment variables. A package path that is safe locally can be unsafe in a clean container.

## Inventory Internal Names Before Scanning Registries

Start with an internal package inventory. Pull names from \`package.json\`, lockfiles, Python requirement files, monorepo package manifests, build scripts, Dockerfiles, and internal documentation. Mark which names are supposed to be private and which registry should own them. The inventory becomes the input for automated checks.

\`\`\`json
{
  "internalPackages": [
    {
      "name": "@acme/auth-client",
      "ecosystem": "npm",
      "registry": "https://npm.pkg.github.com"
    },
    {
      "name": "@acme/test-fixtures",
      "ecosystem": "npm",
      "registry": "https://npm.pkg.github.com"
    },
    {
      "name": "acme-build-tools",
      "ecosystem": "python",
      "registry": "https://packages.example.com/simple"
    }
  ]
}
\`\`\`

This file is not a secret. It describes expected routing, not credentials. Keeping it in the repository gives test automation and AI reviewers a stable source of truth. Review every addition to the list. A new unscoped internal name should trigger a conversation because unscoped names are easier to collide with public packages.

## Verify npm Scope Routing in the Repository

npm scopes are designed to group related packages, and npm documentation describes associating a scope with a registry. The repository should include the scope mapping needed by clean environments. A developer-only global \`.npmrc\` is not enough because CI may not have it.

\`\`\`ini
@acme:registry=https://npm.pkg.github.com
\`\`\`

The exact authentication lines depend on your registry provider and secret strategy. Do not commit tokens. The test should check that scope routing exists in project configuration and that CI injects credentials through environment secrets. Official npm scope documentation: https://docs.npmjs.com/cli/v9/using-npm/scope

\`\`\`ts
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

function readProjectNpmrc(): string {
  return fs.readFileSync('.npmrc', 'utf8');
}

describe('npm registry routing', () => {
  it('routes the internal scope to the private registry', () => {
    const npmrc = readProjectNpmrc();

    expect(npmrc).toContain('@acme:registry=https://npm.pkg.github.com');
    expect(npmrc).not.toMatch(/^registry=https:\\/\\/registry\\.npmjs\\.org\\/?$/m);
  });
});
\`\`\`

That second assertion may not fit every repository. Some projects legitimately use npmjs.org as the default registry for public dependencies while mapping internal scopes separately. Adjust the policy to your architecture. The important rule is that internal scoped packages have explicit routing and the test encodes the intended policy.

## Check Whether Internal Names Exist Publicly

Public-name scanning is a useful signal. It should be read-only and rate-limited. Do not publish placeholder packages to public registries from a test job unless your legal and security teams have approved the reservation strategy. A safer automated check queries public package metadata and flags any internal name that resolves publicly.

\`\`\`ts
type InternalPackage = {
  name: string;
  ecosystem: 'npm';
};

async function npmPackageExistsPublicly(name: string): Promise<boolean> {
  const encoded = encodeURIComponent(name);
  const response = await fetch(\`https://registry.npmjs.org/\${encoded}\`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) return false;
  if (response.ok) return true;

  throw new Error(\`npm registry lookup failed for \${name}: \${response.status}\`);
}

export async function findPublicNameCollisions(
  packages: InternalPackage[],
): Promise<string[]> {
  const collisions: string[] = [];

  for (const pkg of packages) {
    if (await npmPackageExistsPublicly(pkg.name)) {
      collisions.push(pkg.name);
    }
  }

  return collisions;
}
\`\`\`

A collision is not automatically an exploitable vulnerability. A scoped internal package may intentionally exist in both public and private registries under controlled ownership. But a surprising collision deserves review. Ask who owns the public package, whether the internal dependency is scoped, and whether the lockfile pins the expected source.

| Scan result | Interpretation | Follow-up |
|---|---|---|
| Internal scoped name absent publicly | Lower collision signal | Still verify scope routing |
| Internal unscoped name absent publicly | Name could still be claimed later | Prefer rename or reserved namespace plan |
| Internal name exists publicly under company owner | May be intentional reservation | Confirm ownership and publish policy |
| Internal name exists publicly under unknown owner | High-risk ambiguity | Block release until routing is proven |
| Registry lookup fails | Unknown result | Retry later, do not mark safe |

Treat registry availability as a moving fact. A name that is absent today may be registered tomorrow. That is why routing tests and lockfile review matter more than one-time scans.

## Test Clean Installs in a CI-Like Container

Dependency confusion often hides behind local state. A developer's machine may have cached packages, global registry mappings, or an authenticated session. A clean install test removes that comfort. Run it in a fresh container or clean runner with only the repository configuration and CI secrets.

\`\`\`yaml
name: dependency-resolution-check

on:
  pull_request:

jobs:
  npm-install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
        env:
          NODE_AUTH_TOKEN: \${{ secrets.PACKAGE_READ_TOKEN }}
\`\`\`

This job proves the lockfile and registry config work from a clean environment. It does not prove that future dependency edits are safe, so pair it with dependency review. GitHub documents a dependency review action that can report dependency changes in pull requests and enforce policies for vulnerabilities and licenses: https://docs.github.com/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review

## Review Lockfiles for Source Drift

Lockfiles are security artifacts. They record resolved versions and often include registry URLs or integrity metadata. A pull request that changes a lockfile without a matching manifest change deserves attention. So does a lockfile change that moves an internal package from a private host to a public host.

\`\`\`ts
import fs from 'node:fs';

type SuspiciousResolution = {
  packageName: string;
  resolved: string;
};

export function findNpmLockSourceDrift(lockfilePath: string): SuspiciousResolution[] {
  const lock = JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as {
    packages?: Record<string, { resolved?: string }>;
  };
  const findings: SuspiciousResolution[] = [];

  for (const [path, meta] of Object.entries(lock.packages ?? {})) {
    if (!path.includes('node_modules/@acme/')) continue;
    const resolved = meta.resolved ?? '';
    if (resolved && !resolved.startsWith('https://npm.pkg.github.com/')) {
      findings.push({ packageName: path, resolved });
    }
  }

  return findings;
}
\`\`\`

This script is intentionally repository-specific. Replace \`@acme\` and the registry host with your own policy. Do not generalize it into a magical supply-chain scanner. The value is that your team encodes exactly where internal packages may resolve from and fails review when the lockfile disagrees.

## Handle Python Indexes With Extra Care

Python projects can become vulnerable when an install configuration asks pip to use more than one index and an internal package name is also available from a public index. pip documents \`--index-url\`, \`--extra-index-url\`, and \`--no-index\` for package discovery. The safe test posture is to verify the intended index behavior in your project rather than assume priority protects you. Official pip install documentation: https://pip.pypa.io/en/latest/cli/pip_install/

\`\`\`ini
[global]
index-url = https://packages.example.com/simple

[install]
no-cache-dir = false
\`\`\`

If your project uses a private mirror that proxies approved public packages, prefer resolving through that controlled source. If your project uses an extra index, document why, test the internal package names, and review whether an attacker-controlled public package could satisfy the same requirement. Avoid putting credentials directly in committed config files.

\`\`\`bash
python -m pip config list
python -m pip install --no-deps --index-url https://packages.example.com/simple acme-build-tools==1.4.2
\`\`\`

Use harmless internal test packages for install checks when possible. Never run a security test that installs an unknown public collision into a privileged CI environment. If you need to inspect metadata, query registries from a locked-down job and treat the result as untrusted input.

## Add Dependency-Confusion Cases to Threat Modeling

Threat modeling does not need to be heavyweight. For every service with private packages, answer a small set of questions and convert the answers into tests. QA engineers can own the testability of those answers even when security owns the broader supply-chain policy.

| Question | Bad answer | Test or control |
|---|---|---|
| Are internal packages scoped or namespaced? | Several unscoped names | Inventory flags unscoped internal names |
| Is scope routing stored in the repo? | Only global developer config | \`.npmrc\` policy test |
| Can clean CI install without local cache? | Unknown | Fresh runner install job |
| Are public collisions monitored? | One-time manual check | Scheduled read-only registry lookup |
| Are lockfile sources reviewed? | Diff ignored | Source-drift script and PR review |
| Are tokens least-privilege? | Publish token used for install | CI uses read-only package token |

This table also helps AI reviewers. Paste it into the review prompt and ask the agent to identify which answers the pull request changes. If a new package appears in \`package.json\`, the agent should look for registry routing and lockfile source evidence, not just known CVEs.

## Capture Package-Manager State Without Leaking Secrets

When a dependency confusion test fails, the first question is usually, “Which registry did the package manager think it was using?” Capture enough state to answer that question, but never dump full config files that may include tokens. Redact credentials and print only hostnames, scope mappings, project config paths, and the package manager command that ran.

For npm projects, a safe diagnostic can read the project \`.npmrc\` and extract registry lines while rejecting token lines. For Python projects, capture \`pip config list\` output only after checking that credentials are not present in the printed values. If credentials appear in URLs, fix the secret injection pattern before publishing logs.

\`\`\`ts
import fs from 'node:fs';

export function safeNpmRegistryDiagnostics(npmrcPath = '.npmrc'): string[] {
  const npmrc = fs.existsSync(npmrcPath)
    ? fs.readFileSync(npmrcPath, 'utf8')
    : '';

  return npmrc
    .split('\\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .filter((line) => line.includes('registry='))
    .filter((line) => !line.includes('_authToken'))
    .map((line) => line.replace(/\\/\\/[A-Za-z0-9._~:-]+@/g, '//<redacted>@'));
}
\`\`\`

Add a unit test for the diagnostic itself. Security tests that leak secrets create a second incident while investigating the first. The expected output should show routing, not authentication material.

\`\`\`ts
import { expect, it } from 'vitest';
import { safeNpmRegistryDiagnostics } from './safe-npm-diagnostics';

it('prints registry routing without token lines', () => {
  const lines = safeNpmRegistryDiagnostics('tests/fixtures/npmrc-with-token');

  expect(lines).toContain('@acme:registry=https://npm.pkg.github.com');
  expect(lines.join('\\n')).not.toContain('_authToken');
  expect(lines.join('\\n')).not.toContain('secret-token');
});
\`\`\`

This diagnostic belongs in failing CI output, not in every successful job. Keep logs small. The reviewer needs to know whether \`@acme\` maps to the private registry in the environment that failed. They do not need every npm default.

## Teach AI Reviewers the Difference Between Vulnerability and Source

Many automated dependency reviews focus on known vulnerabilities. That is necessary, but dependency confusion can exist even when the public package has no known CVE. The failure is that the build trusted the wrong source. An AI reviewer needs a prompt that separates source trust from vulnerability databases.

\`\`\`text
Review this dependency change for dependency confusion risk.

Inputs:
- package manifests and lockfiles
- .npmrc, pip.conf, Dockerfiles, and CI workflow snippets
- internal package inventory with allowed registries

Look for:
- new internal-looking names that are unscoped or unowned
- private scopes without project-level registry routing
- lockfile source URLs that do not match allowed registries
- Docker or release jobs that install without registry config
- use of additional package indexes without documented reason

Do not report only CVEs. This review is about package source ambiguity.
\`\`\`

The phrase “internal-looking” needs local examples. For one company it may mean the company prefix, product abbreviations, or repository names. For another it may mean all packages under a scope. Give the agent examples from your inventory so it does not invent naming policy.

| Review evidence | Good agent conclusion | Bad agent conclusion |
|---|---|---|
| New \`@acme/payments-sdk\` plus scope routing | Confirm source path and inspect lockfile | “Scoped package, always safe” |
| New \`acme-payments-sdk\` unscoped | Flag collision and naming review | “No CVE found, safe” |
| Lockfile resolved URL changed | Ask why source changed | Ignore because version stayed same |
| Dockerfile omits config file | Flag release-install drift | Trust PR job success |
| Extra Python index added | Ask for routing rationale | Assume private index has priority |

This is also where QA should insist on evidence. If the agent says a package resolves privately, it should quote the config line or lockfile source it used. If it cannot find that evidence, the finding should say “unproven,” not “safe.”

## Include Build Scripts in the Attack Surface

Registry confusion is not limited to top-level dependency manifests. Build scripts can run install commands in subdirectories, generate temporary projects, fetch plugins, or build Docker images that have their own package-manager config. A pull request that changes \`scripts/release.sh\`, \`Dockerfile\`, \`Makefile\`, or a workspace generator can silently bypass the safe path.

Search for install commands as part of the test inventory. The goal is not to forbid every install command. The goal is to ensure every install path uses the same source policy.

\`\`\`bash
rg \\"npm (ci|install)|pnpm install|yarn install|pip install|poetry install\\" .
\`\`\`

For each result, classify the environment. Is it a developer helper, a CI job, a Docker build, a release step, or a code-generation task? Release and Docker paths deserve the strictest checks because they produce artifacts that customers run. Developer helpers still matter because they can poison local lockfile updates.

| Install location | Typical hidden risk | QA check |
|---|---|---|
| Root CI workflow | Missing package token | Clean install job fails early |
| Dockerfile | \`.npmrc\` not copied or secret not mounted | Build proves scope routing before install |
| Subpackage script | Workspace config not inherited | Script-level install uses project policy |
| Release script | Different registry env vars | Release dry run prints sanitized routing |
| Code generator | Temporary manifest with internal name | Generated manifest is scanned |

This section often uncovers the real bug. Teams harden the main pull-request job but forget a release container that installs dependencies from a different working directory. Add those alternate install paths to the regression suite.

## Simulate a Safe Collision Without Touching Public Registries

You can test the failure mode by using two controlled registries inside a disposable environment. For npm, many teams use an internal registry proxy or a local test registry in security labs. The point is to create the same name in two registries you control, configure a test project ambiguously, and prove your policy check blocks that configuration. Do not publish misleading packages to public registries from automated tests.

\`\`\`text
Safe lab scenario:
1. Create package @acme/confusion-canary in controlled-private-registry.
2. Create package @acme/confusion-canary in controlled-public-like-registry.
3. Configure a disposable project without @acme scope routing.
4. Run install in an isolated network.
5. Assert the policy test fails before application tests execute.
\`\`\`

The canary package should not run install scripts, exfiltrate environment variables, or contact external systems. Security tests should prove controls without creating new risk. If your organization requires deeper exploitation testing, run it under a formal security assessment process with isolated credentials and legal approval.

## What People Get Wrong About Dependency Confusion

The first mistake is believing lockfiles alone solve the problem. Lockfiles reduce surprise during repeat installs, but they are edited in pull requests, regenerated during upgrades, and sometimes absent in libraries. A lockfile with the wrong source faithfully preserves the wrong source. Review the source, not just the presence of the file.

The second mistake is assuming private registry authentication means resolution is safe. Authentication proves the runner can access the private registry. It does not prove the package manager will choose that registry for every internal name. Scope mappings, index settings, and mirrors define the path.

The third mistake is asking AI agents to “check dependencies” without a policy file. The agent may find CVEs and license changes, but dependency confusion is about names and sources. Give it the internal package inventory, allowed registries, and examples of suspicious lockfile drift. Otherwise it will miss the issue or produce generic supply-chain advice.

## Failure Mode: The Release Job Uses Different Registry Config

A realistic incident pattern is a pull-request job that passes while the release job installs differently. The PR job may use repository \`.npmrc\`, but the release Dockerfile may copy only \`package.json\` and \`package-lock.json\` before running \`npm ci\`. If the Docker build context excludes \`.npmrc\`, internal packages may fail to install or resolve through a default public registry path.

Diagnose it by comparing the actual files present at install time. Add a Docker build test that prints sanitized npm configuration and fails if required scope routing is absent. Do not print tokens. Print only registry hostnames and scope mappings.

\`\`\`dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm config get @acme:registry
RUN npm ci
COPY . .
RUN npm test
\`\`\`

If your build intentionally injects \`.npmrc\` as a secret rather than copying it, test that path with your build system's documented secret mechanism. The invariant is the same: the release install must prove scope routing before it can fetch dependencies.

## Turn Findings Into Release Gates

Dependency-confusion testing should have clear gates. Low-severity findings can open tickets. High-severity findings should block release. A high-severity finding is not just “a public package exists.” It is “an internal name exists publicly, routing is ambiguous in CI, and the lockfile or clean install does not prove the private source.”

\`\`\`ts
type ConfusionFinding = {
  internalName: string;
  publicCollision: boolean;
  explicitPrivateRouting: boolean;
  lockfilePrivateSource: boolean;
};

export function shouldBlockRelease(finding: ConfusionFinding): boolean {
  return (
    finding.publicCollision &&
    (!finding.explicitPrivateRouting || !finding.lockfilePrivateSource)
  );
}
\`\`\`

Document the gate in language that developers understand. “Blocked because \`@acme/auth-client\` resolves publicly and this PR removed private scope routing” is actionable. “Supply-chain risk detected” is not.

## Maintenance Cadence for Registry Safety

Run the fast checks on every pull request that changes manifests, lockfiles, build scripts, Dockerfiles, or CI configuration. Run public collision scans on a schedule because registry state changes outside your repository. Review the internal inventory whenever a new package is created, renamed, open-sourced, or moved between registries.

Keep ownership clear. Platform engineering may own registry configuration, security may own policy, and QA may own regression tests. Without ownership, dependency-confusion checks become a one-time audit artifact. With ownership, they become a normal part of release readiness.

Also test package retirement. When an internal package is renamed or deleted, remove it from manifests, but keep its name in a watch list if old release branches, Docker images, or customer deployment templates may still install it. Retired names can be attractive targets because nobody expects them to change. A scheduled read-only lookup can alert the team if a formerly private name appears publicly after deletion.

Renames deserve special care. A pull request that replaces \`@acme/legacy-auth\` with \`@acme/auth-client\` should prove the new package resolves privately and the old one is no longer referenced by build scripts. Search only manifests is not enough. Release scripts, examples, templates, and generated projects can keep stale names alive.

## Frequently Asked Questions

### Is dependency confusion only an npm problem?

No. npm made the pattern widely discussed, but the underlying issue can affect any ecosystem where builds search multiple package sources and internal names can collide with public names. Python, JavaScript, and other package ecosystems need source-routing review. The exact controls differ, so test the package manager and registry configuration your project actually uses.

### Should we reserve all internal package names publicly?

Do not make that an automated QA test without security and legal approval. Name reservation can reduce collision risk when done under verified company ownership, but publishing placeholders to public registries has operational and policy implications. Safer first steps are internal namespaces, explicit private registry routing, lockfile source checks, clean CI installs, and scheduled read-only collision monitoring.

### Can a lockfile prevent dependency confusion?

A correct lockfile helps, but it is not sufficient by itself. Lockfiles can be changed, regenerated, omitted from libraries, or produced from unsafe configuration. Review whether internal packages resolve from allowed registries, and test clean installs using repository and CI configuration. Treat the lockfile as evidence to inspect, not as a guarantee.

### What should QA add to the pull request checklist?

Add checks for manifest changes, lockfile source drift, internal package names, registry routing files, Docker install paths, and CI secret usage. If a PR adds or renames an internal package, require evidence that a clean environment installs it from the intended private registry. For high-risk changes, block release until the source path is unambiguous.
`,
};
