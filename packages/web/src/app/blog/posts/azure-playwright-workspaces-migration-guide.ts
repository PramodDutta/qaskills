import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Azure Playwright Workspaces Migration Guide for Microsoft Playwright Testing Teams',
  description: 'Use this Playwright Workspaces migration guide to move from Microsoft Playwright Testing with clean auth, CI, reporting, and cost guardrails.',
  date: '2026-09-24',
  category: 'Migration',
  content: `
# Azure Playwright Workspaces Migration Guide for Microsoft Playwright Testing Teams

Microsoft Playwright Testing is retired on March 8, 2026, and the migration path is Azure App Testing Playwright Workspaces. A practical playwright workspaces migration is not a rewrite of your Playwright tests. It is a controlled replacement of the Azure service package, the service config helper, the workspace endpoint, authentication, CI identity, and reporting assumptions.

For most TypeScript Playwright teams, the core change is replacing \`@azure/microsoft-playwright-testing\` and \`getServiceConfig\` with \`@azure/playwright\`, \`@azure/identity\`, and \`createAzurePlaywrightConfig\`. You keep \`@playwright/test\`, keep your existing specs, and run Playwright with \`--config=playwright.service.config.ts\` when the run should use Azure cloud browsers.

The important migration decision is not whether cloud browsers still work. They do. The important decision is how you will authenticate, how many workers you will allow in CI, where reports will be stored, and how you will separate local confidence checks from paid cloud execution. If you already have Playwright running in GitHub Actions, pair this article with [Playwright CI GitHub Actions Complete Guide 2026](/blog/playwright-ci-github-actions-complete-guide-2026). If you are re-evaluating hosted browser economics during the migration, the cost tradeoffs in [Cypress vs Playwright CI Cost 2026](/blog/cypress-vs-playwright-ci-cost-2026) give useful context.

Official references used for the details in this guide:

https://learn.microsoft.com/en-us/rest/api/playwright/includes/retirement-banner
https://github.com/Azure/playwright-workspaces/blob/main/migration-guide.md
https://learn.microsoft.com/en-us/azure/app-testing/playwright-workspaces/overview-what-is-microsoft-playwright-workspaces
https://learn.microsoft.com/en-us/azure/app-testing/playwright-workspaces/quickstart-automate-end-to-end-testing
https://learn.microsoft.com/en-us/azure/app-testing/playwright-workspaces/how-to-use-service-config-file
https://learn.microsoft.com/en-us/azure/app-testing/playwright-workspaces/resource-limits-quotas-capacity
https://azure.microsoft.com/en-us/pricing/details/app-testing/

## Retirement Scope And The New Target

Microsoft Playwright Testing was the preview-era service. Playwright Workspaces is the generally available Azure App Testing resource that now owns the managed browser story. Microsoft documents the old service retirement date as March 8, 2026 and directs teams to create a new Playwright Workspace in Azure App Testing.

This matters because the migration crosses more than a package boundary. Workspace resources move under the Azure App Testing model, portal management moves to the Azure portal, and the service endpoint changes to a region-specific \`PLAYWRIGHT_SERVICE_URL\`. Microsoft also documents a new resource provider shape for Workspaces and an API version of \`2025-09-01\` for custom connection scenarios.

| Area | Microsoft Playwright Testing preview | Playwright Workspaces |
|---|---|---|
| Product status | Retired on March 8, 2026 | Generally available Azure App Testing service |
| JavaScript package | \`@azure/microsoft-playwright-testing\` | \`@azure/playwright\` |
| Main config helper | \`getServiceConfig\` | \`createAzurePlaywrightConfig\` |
| Preferred auth | Service-specific setup often used tokens | Microsoft Entra ID is recommended and default |
| Portal operations | Preview Playwright management surfaces | Azure portal, Azure App Testing resources |
| Reporting direction | Older service reporter assumptions | Playwright Workspaces reporter and Azure Storage |

For QA engineers, the safest migration shape is a feature-flagged config rollout. Keep your normal \`playwright.config.ts\` as the local and default CI config. Add or update \`playwright.service.config.ts\` for cloud execution. Then change one scheduled or manually triggered workflow first. When that proves stable, move smoke, PR, and release suites one at a time.

## Inventory Before You Touch CI

Start by finding every place the old service is referenced. Do not rely only on package names. Older repos often hide service assumptions in custom fixtures, wrapper scripts, Docker images, Azure Pipeline templates, or runbook commands pasted into release docs.

\`\`\`bash
rg "@azure/microsoft-playwright-testing|getServiceConfig|runId|useCloudHostedBrowsers|PLAYWRIGHT_SERVICE" .
\`\`\`

Build a short inventory that separates code changes from operational changes. A migration fails when these are mixed together and nobody knows whether a red run is caused by a package mismatch, an expired token, a missing RBAC role, or an actual product regression.

| Inventory item | What to record | Migration action |
|---|---|---|
| Package manager | npm, pnpm, yarn, lockfile path | Update lockfile in the same PR as package changes |
| Playwright version | \`@playwright/test\` version | Microsoft service limits require Playwright OSS 1.50 or higher |
| Service config | File path and helper used | Replace old helper with \`createAzurePlaywrightConfig\` |
| Authentication | Entra ID, token, service principal, managed identity | Prefer Entra ID for CI unless a short-term token exception is necessary |
| Reporter | HTML, blob, Azure reporter, custom dashboard | Decide whether portal reporting is in scope for phase one |
| Network access | Public staging URL, loopback app, private environment | Configure \`exposeNetwork\` or firewall allow-lists |
| Worker count | Current local and CI workers | Start below quota and scale after first successful run |

The official migration guide marks the Playwright Test Runner with service package as the common path. If you are in that path, your tests probably do not need line-by-line edits. If you manually call \`browser.connect()\`, override \`connectOptions\`, or use .NET NUnit base classes, treat the migration as a small platform project with an owner, a rollback path, and a few paired debugging sessions.

## Package And Config Replacement

For TypeScript projects using Playwright Test, uninstall the preview package and add the GA Workspaces package plus Azure Identity. Microsoft lists \`@azure/playwright\` as the replacement package, and npm currently shows \`@azure/playwright\` version 1.1.6. The quickstart still shows \`latest\` in \`devDependencies\`, but production repos should pin through the lockfile and upgrade intentionally.

\`\`\`bash
npm uninstall @azure/microsoft-playwright-testing
npm install --save-dev @azure/playwright @azure/identity @playwright/test@latest
\`\`\`

The Workspaces package can also be initialized with Microsoft's setup command:

\`\`\`bash
npm init @azure/playwright@latest
\`\`\`

That initializer creates or updates \`playwright.service.config.ts\`. In mature QA repos, I prefer reviewing the generated diff instead of accepting it blindly. The service config should layer Azure connection details on top of your existing Playwright config, not fork your product settings into a second universe.

\`\`\`ts
import { defineConfig } from '@playwright/test';
import { createAzurePlaywrightConfig, ServiceOS } from '@azure/playwright';
import { DefaultAzureCredential } from '@azure/identity';
import baseConfig from './playwright.config';

export default defineConfig(
  baseConfig,
  createAzurePlaywrightConfig(baseConfig, {
    credential: new DefaultAzureCredential(),
    os: ServiceOS.LINUX,
    exposeNetwork: '<loopback>',
    connectTimeout: 3 * 60 * 1000,
    runName: process.env.GITHUB_RUN_ID
      ? 'github-' + process.env.GITHUB_RUN_ID
      : 'local-workspaces-check',
  }),
);
\`\`\`

The official config options include \`serviceAuthType\`, \`os\`, \`runName\`, \`credential\`, \`exposeNetwork\`, and \`connectTimeout\`. The old \`timeout\` option becomes \`connectTimeout\`, \`runId\` is replaced by \`runName\`, and the old \`useCloudHostedBrowsers\` parameter is removed. That last one is a common source of confusion because it sounds like a harmless boolean. In the new model, using the service config is the signal that the run should use the cloud service.

## Endpoint And Authentication

Every Workspaces run needs the region-specific \`PLAYWRIGHT_SERVICE_URL\`. Microsoft's CI quickstart says to copy the endpoint from the Workspaces Get Started page in the Azure portal and store it as a workflow secret. The endpoint is tied to the region you selected when creating the workspace.

\`\`\`bash
# Paste the exact value from the workspace's Get Started page; do not build it by hand
export PLAYWRIGHT_SERVICE_URL="<region-specific endpoint copied from the Azure portal>"
\`\`\`

Do not invent this URL from memory or reuse the preview value. The workspace identifier changed with the new resource, and custom connection scenarios must include the documented \`api-version=2025-09-01\` parameter. If your tests connect manually, audit the exact URL construction instead of assuming the service package will correct it.

Playwright Workspaces supports Microsoft Entra ID and access tokens. Microsoft documents Entra ID as the default and recommended approach. Access tokens are supported, but disabled by default and described as less secure because they behave like long-lived passwords. Reporting also has an important constraint: the Playwright Workspaces reporter supports Microsoft Entra ID authentication, not access-token authentication.

| Auth choice | Best fit | Hidden cost |
|---|---|---|
| Entra ID with GitHub OIDC | Main CI path for GitHub Actions | Requires app registration, federated credentials, and RBAC |
| Entra ID with Azure Pipelines service connection | Azure DevOps pipelines | Requires service connection ownership and workspace role assignment |
| Local Azure CLI credential | Developer validation | Developers must be in the correct tenant and run \`az login\` |
| Access token | Temporary bridge for legacy jobs | Disabled by default, harder to rotate safely, not supported for reporting |

If you must use access tokens for a short bridge period, make the exception explicit in config:

\`\`\`ts
import { defineConfig } from '@playwright/test';
import { createAzurePlaywrightConfig, ServiceAuth } from '@azure/playwright';
import baseConfig from './playwright.config';

export default defineConfig(
  baseConfig,
  createAzurePlaywrightConfig(baseConfig, {
    serviceAuthType: ServiceAuth.ACCESS_TOKEN,
    connectTimeout: 180000,
  }),
);
\`\`\`

Then put \`PLAYWRIGHT_SERVICE_ACCESS_TOKEN\` in your CI secret store, never in repo config, and create a ticket to replace it. A migration that lands with a permanent shared token is technically complete and operationally worse than before.

## GitHub Actions Migration

The GitHub Actions job needs three things: Node dependencies, Azure identity, and the service URL. The workflow below uses the current major versions (\`actions/checkout@v7\`, \`actions/setup-node@v7\`, \`actions/upload-artifact@v7\`, and \`azure/login@v3\`). Microsoft's own sample may still show older ones, which keep working but miss recent fixes.

\`\`\`yaml
name: workspaces-smoke

on:
  workflow_dispatch:
  pull_request:
    paths:
      - 'tests/e2e/**'
      - 'playwright.config.ts'
      - 'playwright.service.config.ts'
      - 'package-lock.json'

permissions:
  id-token: write
  contents: read

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Azure login
        uses: azure/login@v3
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Run cloud Playwright smoke
        env:
          PLAYWRIGHT_SERVICE_URL: \${{ secrets.PLAYWRIGHT_SERVICE_URL }}
        run: npx playwright test tests/e2e/smoke --config=playwright.service.config.ts --workers=8

      - name: Upload local Playwright report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 10
\`\`\`

The job above selects tests by directory, passed as a positional argument. Playwright can also select by title with \`--grep\` (or \`-g\`), which is how tag-based suites work. This selects by title:

\`\`\`bash
npx playwright test --config=playwright.service.config.ts --grep "@smoke" --workers=8
\`\`\`

This selects by path:

\`\`\`bash
npx playwright test tests/e2e/checkout.spec.ts --config=playwright.service.config.ts --workers=8
\`\`\`

When you first migrate, keep the worker count conservative. Playwright Workspaces documents a default quota of 100 parallel workers per workspace, but quota is not the same as a good first-run setting. Start with a smoke suite at 8 or 20 workers, validate authentication and artifacts, then increase based on duration, flake rate, and cost.

## Azure Pipelines Migration

Azure Pipelines teams usually have a service connection already. The Workspaces migration still requires you to point that identity at the new workspace and assign a role that can run tests. Microsoft's quickstart describes Azure Resource Manager service connections for authenticating pipelines.

\`\`\`yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '22.x'

  - script: npm ci
    displayName: Install dependencies

  - task: AzureCLI@2
    displayName: Run Playwright Workspaces tests
    env:
      PLAYWRIGHT_SERVICE_URL: $(PLAYWRIGHT_SERVICE_URL)
    inputs:
      azureSubscription: qa-workspaces-service-connection
      scriptType: pscore
      scriptLocation: inlineScript
      inlineScript: |
        npx playwright test --config=playwright.service.config.ts --workers=20
      addSpnToEnvironment: true

  - task: PublishPipelineArtifact@1
    condition: always()
    inputs:
      targetPath: playwright-report/
      artifact: playwright-report
      publishLocation: pipeline
\`\`\`

If this fails only in Azure Pipelines but passes locally with \`az login\`, assume identity before test code. Check the service connection subscription, tenant, workspace RBAC assignment, and whether the pipeline variable named \`PLAYWRIGHT_SERVICE_URL\` points at the new workspace rather than the preview endpoint.

## Reporting And Artifacts

Playwright Workspaces can publish results into the service and the portal. Microsoft also documents a Workspaces reporter that uploads HTML reports to Azure Storage, with portal integration for debugging. The reporter path has prerequisites: reporting must be enabled for the workspace, a storage account must be linked, users need storage RBAC, CORS must allow the Playwright trace viewer when traces are opened, Playwright must be recent enough for the reporting feature, and Entra ID authentication is required.

\`\`\`ts
import { defineConfig } from '@playwright/test';
import { createAzurePlaywrightConfig, ServiceOS } from '@azure/playwright';
import { DefaultAzureCredential } from '@azure/identity';
import baseConfig from './playwright.config';

export default defineConfig(
  baseConfig,
  createAzurePlaywrightConfig(baseConfig, {
    credential: new DefaultAzureCredential(),
    os: ServiceOS.LINUX,
  }),
  {
    reporter: [
      ['html', { open: 'never' }],
      ['@azure/playwright/reporter'],
    ],
    use: {
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
  },
);
\`\`\`

The HTML reporter should remain first when you use the Azure reporter pattern shown by Microsoft's package docs. Keep your pipeline artifact upload too, at least during migration. Portal reports are excellent for centralized triage, but a local CI artifact gives you a fallback when RBAC, storage, or CORS is misconfigured.

| Symptom | Likely cause | Diagnosis |
|---|---|---|
| Run appears in CI but no portal report | Reporter not configured or reporting disabled | Check \`@azure/playwright/reporter\` and workspace Storage configuration |
| Trace opens to a CORS error | Storage CORS missing trace viewer origin | Configure Blob service CORS for \`https://trace.playwright.dev\` |
| Access denied when viewing artifacts | Viewer lacks storage role | Assign appropriate Azure Storage RBAC |
| Reporter works locally but not in CI | Token auth or missing Entra login | Verify Entra ID auth and pipeline identity |
| HTML artifact exists but Azure upload fails | Linked storage issue | Confirm storage account exists and is publicly reachable for upload |

What people get wrong: they treat reporting as a cosmetic add-on. In a migration, reporting is your debugging plane. Without traces, screenshots, and run metadata, every transient failure becomes an argument about infrastructure. Enable enough diagnostics to understand failures, then tune artifact retention and storage cost after the suite is stable.

## Cost And Quota Controls

Azure App Testing pricing defines Playwright Workspaces billing in test minutes. Microsoft describes test minutes as the total time Playwright tests run in service cloud browsers, billed by the second. The pricing page lists a 30-day free trial covering the first 100 test minutes, with usage beyond that billed pay-as-you-go.

That pricing model rewards two behaviors: push local and cheap checks earlier, and reserve cloud workers for coverage that actually needs hosted browsers. You do not need to run every pull request on 100 workers just because the workspace quota allows it.

\`\`\`json
{
  "scripts": {
    "test:e2e:local": "playwright test --workers=4",
    "test:e2e:cloud:smoke": "playwright test tests/e2e/smoke --config=playwright.service.config.ts --workers=8",
    "test:e2e:cloud:release": "playwright test --config=playwright.service.config.ts --workers=40"
  }
}
\`\`\`

Use tags to separate run intent:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('@smoke checkout completes for a paid order', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByText('Payment complete')).toBeVisible();
});
\`\`\`

Then run smoke in PR and the larger matrix after merge:

\`\`\`bash
npx playwright test --grep "@smoke" --config=playwright.service.config.ts --workers=8
\`\`\`

Cost control is also a flake-control mechanism. A suite that fans out too aggressively can overload your own staging environment, create artificial timeouts, and produce misleading browser failures. If you see many failures around login, checkout, email polling, or shared test users after raising workers, lower workers before rewriting assertions.

## Failure Mode: New Workspace, Old Endpoint

A realistic migration failure looks like this: developers update packages and config, CI still exports the old \`PLAYWRIGHT_SERVICE_URL\`, and the run fails with connection or authentication errors before any test reaches \`beforeEach\`. Local runs pass because the developer copied the new endpoint into \`.env\`, but CI still points at the retired or preview workspace.

Diagnosis:

1. Print a sanitized endpoint shape in CI, never the whole secret.
2. Confirm the hostname matches the selected Azure region.
3. Confirm the path contains the new workspace identifier from the Azure portal.
4. Confirm the CI identity has access to that workspace.
5. Run one file, not the full suite.

\`\`\`ts
function describeServiceUrl(raw: string | undefined): string {
  if (!raw) return 'missing';
  const url = new URL(raw);
  const parts = url.pathname.split('/').filter(Boolean);
  const workspacePart = parts.find((part) => part.length >= 8) || 'unknown';
  return url.hostname + ' workspace=' + workspacePart.slice(0, 8) + '...';
}

console.log('Playwright service target:', describeServiceUrl(process.env.PLAYWRIGHT_SERVICE_URL));
\`\`\`

Do not log access tokens. Do not log full WebSocket URLs if they include sensitive query strings. The goal is to prove that CI is targeting the intended workspace, not to create a new secret leak.

## Migration Runbook For QA Leads

Here is the runbook I would use for a medium-sized QA automation team with existing Playwright CI and a few AI coding agents contributing tests.

| Phase | Owner | Exit criteria |
|---|---|---|
| Audit | QA lead | All old package, helper, token, endpoint, and reporter references found |
| Workspace setup | Platform engineer | New workspace created, region selected, RBAC assigned |
| Config PR | Automation engineer | \`playwright.service.config.ts\` uses \`createAzurePlaywrightConfig\` and Entra credential |
| Smoke CI | CI owner | One tagged smoke suite passes from GitHub Actions or Azure Pipelines |
| Reporting | QA lead | Portal and CI artifacts are both usable for a failed test |
| Scale test | Automation engineer | Worker count chosen from measured runtime and staging capacity |
| Cutover | Release owner | Preview package and old secrets removed from active jobs |

This is also where ready-made QA skills can help. If your team uses AI coding agents, qaskills.sh has installable QA skills through the qaskills CLI that can encode migration checks, Playwright review rules, and CI triage prompts, so every agent session follows the same checklist.

## What To Ask AI Coding Agents To Change

When using Claude Code, Cursor, or Copilot, give the agent a narrow migration contract. Do not ask it to migrate the whole test stack in one pass. Ask for specific verified edits and require it to run the smallest meaningful command.

\`\`\`text
Update this Playwright project from Microsoft Playwright Testing preview to Azure App Testing Playwright Workspaces.

Constraints:
- Replace @azure/microsoft-playwright-testing with @azure/playwright.
- Replace getServiceConfig with createAzurePlaywrightConfig.
- Use DefaultAzureCredential from @azure/identity.
- Keep local playwright.config.ts behavior unchanged.
- Add or update playwright.service.config.ts only.
- Do not change test assertions unless required by compile errors.
- Run one smoke spec with --config=playwright.service.config.ts.
\`\`\`

The strongest agent prompt is boring and specific. It prevents a model from "improving" the suite while you are trying to isolate infrastructure risk.

## Cutover Checklist

Before you delete the old setup, require evidence:

| Check | Pass condition |
|---|---|
| Package lock | No \`@azure/microsoft-playwright-testing\` entry remains |
| Config helper | \`createAzurePlaywrightConfig\` is the only service config helper |
| Secret store | \`PLAYWRIGHT_SERVICE_URL\` points at the new workspace |
| Authentication | CI uses Entra ID unless a documented token exception exists |
| Reports | Failed smoke run produces trace or screenshot evidence |
| Worker cap | Worker count is below workspace quota and staging capacity |
| Cost guard | PR job uses smoke scope, release job uses broader scope |
| Rollback | Previous local-only Playwright command still runs |

After that, remove old secrets, old package references, and old runbook pages. Migration debt is usually not the code you changed. It is the stale wiki page someone follows during an incident six months later.

## Frequently Asked Questions

### Is Azure Playwright Workspaces a drop-in replacement for Microsoft Playwright Testing?

For the common Playwright Test Runner setup, it is close to a drop-in test-code migration, but not a drop-in operations migration. You still need a new Playwright Workspace resource, a new region endpoint in \`PLAYWRIGHT_SERVICE_URL\`, updated packages, the \`createAzurePlaywrightConfig\` helper, and refreshed CI authentication. Manual \`browser.connect()\` setups and .NET NUnit projects need more careful endpoint and package changes.

### Should CI use Microsoft Entra ID or access tokens?

Use Microsoft Entra ID for durable CI whenever possible. Microsoft documents Entra ID as the default and recommended authentication method, and the Workspaces reporting feature requires Entra ID. Access tokens are useful as a temporary bridge when legacy jobs cannot be moved immediately, but they must be explicitly enabled and protected like passwords. If you use them, set an expiration, store them only in CI secrets, and create a follow-up task to remove them.

### How many Playwright workers should I use after migration?

Start lower than the workspace quota. Playwright Workspaces documents 100 parallel workers per workspace as a default quota, but your staging app, test data, auth provider, and third-party dependencies may tolerate far less. A good first migration run is a single smoke file or smoke tag at 8 to 20 workers. Increase after you measure failure rate, runtime, and test-minute consumption.

### Why does reporting fail when the tests themselves pass?

Reporting has its own prerequisites. The workspace must have reporting enabled, a storage account must be linked, the runner identity needs storage permissions, CORS may need to allow the Playwright trace viewer, and the Azure reporter uses Microsoft Entra ID rather than access-token authentication. Keep the normal Playwright HTML artifact upload during migration so you still have debugging evidence while portal reporting is being fixed.
`,
};
