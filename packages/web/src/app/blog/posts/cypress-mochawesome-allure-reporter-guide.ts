import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Mochawesome and Allure Reporter Guide for 2026',
  description:
    'Generate rich test reports for Cypress with Mochawesome and Allure in 2026. Setup, merging, screenshots, history, CI integration, and reporter comparison.',
  date: '2026-05-21',
  category: 'Guide',
  content: `
# Cypress Mochawesome and Allure Reporter Guide for 2026

The default Cypress reporter (\`spec\`) is fine for local development but inadequate for CI. When a test fails in CI, you want to know: which spec, which test, the error, the relevant logs, the screenshot, the network requests, and ideally the trend over time. Two reporters dominate the Cypress ecosystem in 2026: Mochawesome (an HTML report generated from Mocha JSON output) and Allure (a richer, multi-framework reporting system with historical trends).

This guide is the complete 2026 reference for both. We cover installation, configuration, screenshot embedding, parallel-run merging, CI integration, the historical-trend features unique to Allure, and a side-by-side comparison to help you choose.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## When to use each

| Use case | Mochawesome | Allure |
|---|---|---|
| Local development | Adequate | Overkill |
| PR-based CI reports | Excellent | Excellent |
| Multi-framework reports | No | Yes (Cypress + Playwright + Jest) |
| Historical trends | No | Yes |
| Test categorization | Limited | Rich |
| Attachments | Screenshots, videos | Screenshots, videos, logs, files |
| Setup complexity | Low | Moderate |
| Hosting | Static HTML | Static HTML or Allure TestOps |

Mochawesome is the right choice for most teams. Allure is worth the additional setup if you need historical trends, multi-framework reports, or richer categorization.

## Mochawesome setup

\`\`\`bash
npm install --save-dev mochawesome mochawesome-merge mochawesome-report-generator
\`\`\`

In \`cypress.config.ts\`:

\`\`\`typescript
export default defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: false,    // we will merge later
    json: true,
    timestamp: 'mmddyyyy_HHMMss',
  },
});
\`\`\`

\`overwrite: false\` ensures multiple specs do not overwrite each other's reports.

## Merging parallel reports

When Cypress runs specs in parallel, each spec produces its own JSON. Merge them:

\`\`\`json
{
  "scripts": {
    "test": "cypress run",
    "report:merge": "mochawesome-merge cypress/reports/*.json > cypress/reports/merged.json",
    "report:generate": "marge cypress/reports/merged.json -o cypress/reports/html",
    "report": "npm run test; npm run report:merge && npm run report:generate"
  }
}
\`\`\`

\`marge\` is the binary from \`mochawesome-report-generator\`. The merged HTML is in \`cypress/reports/html/\`.

## Screenshots in Mochawesome

By default, Cypress captures a screenshot on failure. Embed them in the report by configuring \`reporterOptions\`:

\`\`\`typescript
reporterOptions: {
  reportDir: 'cypress/reports',
  charts: true,
  embeddedScreenshots: true,
  inlineAssets: true,
}
\`\`\`

\`inlineAssets: true\` produces a self-contained HTML file you can email or upload.

## Custom context in Mochawesome

Attach metadata to a test using \`addContext\`:

\`\`\`typescript
import addContext from 'mochawesome/addContext';

it('logs in', function () {
  addContext(this, 'User: admin@example.com');
  // ...
});
\`\`\`

This appears as context in the report alongside the test name.

## Allure setup

\`\`\`bash
npm install --save-dev @shelex/cypress-allure-plugin allure-commandline
\`\`\`

In \`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';
import allurePlugin from '@shelex/cypress-allure-plugin/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      allurePlugin(on, config);
      return config;
    },
    env: {
      allure: true,
      allureResultsPath: 'allure-results',
    },
  },
});
\`\`\`

In \`cypress/support/e2e.ts\`:

\`\`\`typescript
import '@shelex/cypress-allure-plugin';
\`\`\`

## Generating the Allure report

After Cypress runs:

\`\`\`bash
allure generate allure-results --clean -o allure-report
allure open allure-report
\`\`\`

\`allure open\` starts a local server with the HTML report.

## Allure categories

Categorize tests for triage:

\`\`\`typescript
// In a spec
it('something', () => {
  cy.allure().feature('Login').story('Happy path').severity('critical');
  // ...
});
\`\`\`

Or via a \`categories.json\` file in \`allure-results\`:

\`\`\`json
[
  { "name": "Flaky tests", "matchedStatuses": ["broken"] },
  { "name": "Product defects", "matchedStatuses": ["failed"] }
]
\`\`\`

## Allure historical trends

The killer feature. Allure tracks pass/fail rate over time.

To enable, copy the \`history/\` directory from the previous run before generating the next report:

\`\`\`bash
# Before allure generate
cp -r previous-report/history allure-results/
allure generate allure-results --clean -o allure-report
\`\`\`

In CI, store \`history/\` as an artifact and restore it on the next run.

## Allure attachments

Attach screenshots, logs, or files:

\`\`\`typescript
import { Status } from '@shelex/cypress-allure-plugin/reporter/allure-types';

it('attaches a log', () => {
  cy.allure().attachment('debug.log', 'plain text', 'text/plain');
});
\`\`\`

Cypress screenshots and videos are auto-attached when the plugin sees them.

## CI integration (GitHub Actions)

### Mochawesome

\`\`\`yaml
- run: npm run test
  continue-on-error: true
- run: npm run report:merge
  if: always()
- run: npm run report:generate
  if: always()
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: mochawesome-report
    path: cypress/reports/html
\`\`\`

### Allure

\`\`\`yaml
- run: npm run test
  continue-on-error: true
- name: Restore history
  uses: actions/cache@v4
  with:
    path: allure-history
    key: allure-history-\${{ github.run_id }}
    restore-keys: allure-history-
- run: |
    if [ -d allure-history ]; then cp -r allure-history allure-results/history; fi
    npx allure generate allure-results --clean -o allure-report
    mkdir -p allure-history
    cp -r allure-report/history/* allure-history/ || true
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: allure-report
    path: allure-report
\`\`\`

## Allure TestOps

For teams needing a hosted dashboard, Allure TestOps (the paid product) provides cross-build trends, test case management, and team collaboration. The open-source Allure reports are sufficient for most teams.

## Comparison

| Dimension | Mochawesome | Allure |
|---|---|---|
| Setup time | 10 minutes | 30 minutes |
| Report depth | Good | Excellent |
| Historical trends | No | Yes |
| Multi-framework | No | Yes |
| Attachments | Screenshots, videos | Anything |
| Categorization | Limited | Rich |
| Customization | Limited | Extensive |
| Cost | Free | Free (TestOps is paid) |

## Best practices

1. **Always merge parallel JSONs.** Otherwise you get fragmented reports.
2. **Use \`inlineAssets\`.** Self-contained HTML is easier to share.
3. **Embed screenshots in failures.** Critical for triage.
4. **Categorize tests.** Severity tags scale with suite size.
5. **Allure: store history.** Trends are the whole point.
6. **Upload artifacts in CI.** Even on green runs.
7. **Use descriptive test names.** Reports are only as good as the input.
8. **Allure: use steps.** \`cy.allure().step('Login as admin')\` produces readable timelines.
9. **Mochawesome: use \`addContext\`.** Test metadata in the report.
10. **Review reports as a team.** Weekly triage of flakes and failures.

## Gotchas

### Mochawesome

1. **\`overwrite: false\` is required.** Otherwise specs overwrite each other.
2. **\`reporterOptions\` keys are case-sensitive.** Typos silently fail.
3. **Merged JSON can grow large.** Split if needed.
4. **Cypress' \`--reporter\` flag wins.** \`reporter\` in config can be overridden.

### Allure

1. **Plugin maintenance.** \`@shelex/cypress-allure-plugin\` is community-maintained.
2. **History directory placement.** Must be in \`allure-results/history\`.
3. **\`allure generate --clean\`.** Cleans the output before regenerating.
4. **Allure CLI version.** Match plugin and CLI versions to avoid drift.
5. **Attachments require explicit calls.** Auto-attach is limited.
6. **TypeScript types may need declaration.** Plugin types may not be complete.

## Conclusion and next steps

Reports turn a "tests passed" or "tests failed" signal into actionable information. Mochawesome is the right starting point for most teams: 10 minutes of setup, a clean HTML report, screenshot embedding. Allure is worth the extra setup if you need historical trends, multi-framework reports, or rich categorization.

Start with Mochawesome. Wire it into CI with parallel merging. Upload as an artifact. If your team outgrows it, move to Allure for the trend tracking.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for CI, sessions, and fixtures guides.
`,
};
