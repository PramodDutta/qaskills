import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Newman Postman CI Automation Guide: Run Collections (2026)",
  description: "Run Postman collections in CI with Newman: install the CLI, use environments and data files, set up reporters, and gate pipelines on API tests in 2026.",
  date: "2026-06-15",
  category: "API Testing",
  content: `# Newman Postman CI Automation Guide: Run Collections (2026)

Newman is the command-line collection runner for Postman. It executes a Postman collection exactly as the Postman app's Collection Runner would — sending every request, running every pre-request and test script, and reporting pass/fail — but headlessly, so you can run your API tests in CI. You export a collection (and optionally an environment) to JSON, point Newman at it, and it returns a non-zero exit code if any test fails, which fails the pipeline. That single behavior is what turns a manually-clicked Postman test suite into an automated quality gate.

This guide covers installing Newman, running collections with environments and data files, reporters for CI, integrating with GitHub Actions and GitLab CI, and the errors you will hit in practice.

## What Newman actually does

A Postman collection is a JSON file containing folders, requests, and JavaScript (pre-request scripts and test scripts that use \`pm.test(...)\` assertions). Newman loads that JSON and runs it through the same execution engine the Postman app uses. Anything that works in the app's Collection Runner works in Newman: variable chaining, \`pm.environment.set()\`, \`pm.collectionVariables\`, \`pm.sendRequest()\`, the built-in \`pm.expect\` assertions backed by Chai. The key difference is that Newman is scriptable, takes file inputs, emits machine-readable reports, and sets its exit code based on results.

If you are choosing between Newman and a code-first API testing approach, see our [API testing tool comparisons](/compare) — Newman wins when your team already lives in Postman and wants to reuse those collections in CI rather than rewrite them.

## Installing Newman

Newman is an npm package. Install it globally for local use, or as a dev dependency to pin the version in CI:

\`\`\`bash
# Global (handy locally)
npm install -g newman

# Project dev dependency (recommended for CI reproducibility)
npm install --save-dev newman
\`\`\`

Verify:

\`\`\`bash
newman --version
\`\`\`

A Docker image (\`postman/newman\`) is published if you prefer not to install Node in CI:

\`\`\`bash
docker run --rm -v "$PWD":/etc/newman postman/newman \\
  run collection.json
\`\`\`

## Exporting your collection and environment

In the Postman app, right-click a collection → Export → choose **Collection v2.1** (the current schema Newman expects). Save the JSON into your repo, e.g. \`tests/collection.json\`. Do the same for environments via the Environments tab → the three-dot menu → Export. You now have version-controlled test assets.

Alternatively, fetch them at runtime from the Postman API or a collection's public URL — useful when the source of truth is the Postman cloud rather than the repo:

\`\`\`bash
newman run "https://api.getpostman.com/collections/{{uid}}?apikey=$POSTMAN_API_KEY"
\`\`\`

For CI, committing the exported JSON is usually simpler and avoids a network dependency on every build.

## Running a collection

The core command is \`newman run\`:

\`\`\`bash
newman run tests/collection.json
\`\`\`

With an environment file:

\`\`\`bash
newman run tests/collection.json \\
  --environment tests/staging.postman_environment.json
\`\`\`

You will see a live run report and a summary table:

\`\`\`
┌─────────────────────────┬───────────────────┬───────────────────┐
│                         │          executed │            failed │
├─────────────────────────┼───────────────────┼───────────────────┤
│              iterations │                 1 │                 0 │
├─────────────────────────┼───────────────────┼───────────────────┤
│                requests │                12 │                 0 │
├─────────────────────────┼───────────────────┼───────────────────┤
│            test-scripts │                12 │                 0 │
├─────────────────────────┼───────────────────┼───────────────────┤
│              assertions │                34 │                 1 │
└─────────────────────────┴───────────────────┴───────────────────┘
\`\`\`

If \`assertions failed\` is greater than zero, Newman exits non-zero — that is your CI gate.

## Overriding variables on the command line

You rarely want secrets baked into a committed environment file. Override variables at runtime with \`--env-var\`:

\`\`\`bash
newman run tests/collection.json \\
  --environment tests/staging.postman_environment.json \\
  --env-var "baseUrl=https://staging.api.example.com" \\
  --env-var "apiKey=$STAGING_API_KEY"
\`\`\`

\`--env-var\` takes precedence over values in the environment file, so you keep secrets in CI variables and inject them per-run. Use \`--global-var\` for global-scope variables.

## Data-driven runs with iteration files

Newman can run a collection once per row of a data file (CSV or JSON), substituting \`{{column}}\` variables from each row. This is how you parameterize the same requests across many inputs:

\`\`\`json
// tests/users.json
[
  { "email": "alice@example.com", "expectedStatus": 200 },
  { "email": "ghost@example.com", "expectedStatus": 404 }
]
\`\`\`

\`\`\`bash
newman run tests/collection.json \\
  --iteration-data tests/users.json
\`\`\`

Inside the collection's test scripts you reference the data with \`pm.iterationData.get('expectedStatus')\`:

\`\`\`javascript
// Test script in a request
pm.test("status matches data row", function () {
  const expected = pm.iterationData.get("expectedStatus");
  pm.response.to.have.status(expected);
});
\`\`\`

You can also force a fixed number of iterations with \`-n 5\` (runs the whole collection five times), which pairs with \`--iteration-data\` for repeat coverage.

## Reporters: turning runs into CI artifacts

Newman's reporters control output. The built-in ones are \`cli\` (default), \`json\`, \`junit\`, and \`progress\`. The JUnit reporter is the workhorse for CI because nearly every CI system can ingest JUnit XML to display pass/fail trees:

\`\`\`bash
newman run tests/collection.json \\
  --reporters cli,junit \\
  --reporter-junit-export results/newman-report.xml
\`\`\`

For a human-friendly HTML report, install the popular community reporter:

\`\`\`bash
npm install --save-dev newman-reporter-htmlextra

newman run tests/collection.json \\
  --reporters cli,htmlextra \\
  --reporter-htmlextra-export results/report.html
\`\`\`

You can combine reporters — \`--reporters cli,junit,htmlextra\` — to get console output, a JUnit file for the CI test tab, and a rich HTML artifact to download.

## Useful run flags

A few flags matter constantly in CI:

| Flag | Purpose |
|---|---|
| \`--bail\` | Stop the run on the first failure (fail fast) |
| \`--bail folder\` | Stop only the current folder on failure |
| \`--timeout-request 10000\` | Per-request timeout in ms |
| \`--delay-request 200\` | Delay between requests (rate-limited APIs) |
| \`--insecure\` / \`-k\` | Skip TLS verification (self-signed dev certs only) |
| \`--folder "Smoke"\` | Run only one folder of the collection |
| \`--color off\` | Disable ANSI color (cleaner CI logs) |
| \`--verbose\` | Full request/response detail for debugging |

\`--folder\` is especially handy for splitting a large collection into smoke vs full runs without maintaining two files.

## GitHub Actions integration

Here is a complete workflow that installs Newman, runs the collection against staging, and publishes the JUnit results:

\`\`\`yaml
# .github/workflows/api-tests.yml
name: API Tests
on:
  pull_request:
  push:
    branches: [main]
jobs:
  newman:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run Postman collection
        run: |
          npx newman run tests/collection.json \\
            --environment tests/staging.postman_environment.json \\
            --env-var "apiKey=\${{ secrets.STAGING_API_KEY }}" \\
            --reporters cli,junit \\
            --reporter-junit-export results/newman-report.xml
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: newman-report
          path: results/
\`\`\`

The \`if: always()\` on the upload step ensures you keep the report even when tests fail — which is exactly when you need it. Secrets come from the repository's Actions secrets, never from a committed file.

## GitLab CI integration

The GitLab job is just as compact and surfaces results in the merge-request test report via the JUnit artifact:

\`\`\`yaml
# .gitlab-ci.yml
api-tests:
  image: postman/newman:alpine
  script:
    - newman run tests/collection.json
      --environment tests/staging.postman_environment.json
      --env-var "apiKey=$STAGING_API_KEY"
      --reporters cli,junit
      --reporter-junit-export newman-report.xml
  artifacts:
    when: always
    reports:
      junit: newman-report.xml
\`\`\`

Using the official \`postman/newman\` image skips the Node setup entirely. For a side-by-side look at how different CI platforms handle test reporting, see our [CI/CD comparisons](/compare) and the broader collection of guides on the [QASkills blog](/blog).

## Scheduling: monitors vs Newman in cron

A common question is whether to use Postman Monitors (cloud-scheduled runs) or Newman on a CI cron. Newman in CI gives you full control over environment, secrets, network egress (run against internal staging), and artifact retention — and it is free of per-run cloud limits. Monitors are convenient for external uptime checks. Many teams use both: Newman in the deploy pipeline as a gate, and a lightweight monitor for production smoke checks.

A nightly Newman run on GitHub Actions is one line of schedule config:

\`\`\`yaml
on:
  schedule:
    - cron: '0 6 * * *' # 06:00 UTC daily
\`\`\`

## Programmatic use

Newman is also a library, so you can drive it from Node when you need custom orchestration — running collections in a loop, aggregating results, or integrating with a bespoke reporter:

\`\`\`javascript
const newman = require('newman');

newman.run(
  {
    collection: require('./tests/collection.json'),
    environment: require('./tests/staging.postman_environment.json'),
    reporters: ['cli', 'junit'],
    reporter: { junit: { export: './results/report.xml' } },
  },
  function (err, summary) {
    if (err) throw err;
    const failures = summary.run.failures.length;
    console.log(\`Run complete. Failures: \${failures}\`);
    process.exitCode = failures > 0 ? 1 : 0;
  }
);
\`\`\`

The \`summary\` object exposes everything — run stats, per-assertion failures, timings — so you can build any reporting you need.

## Common errors and troubleshooting

**Exit code 0 even though a request errored.** Newman only fails on failed *assertions* (\`pm.test\`) and certain run errors. A request that returns 500 but has no test asserting the status will pass. Add \`pm.response.to.have.status(200)\` tests so failures are actually caught.

**\`unable to verify the first certificate\` / TLS errors.** Self-signed or internal CA certs trip Newman's verification. For genuine internal CAs, provide the cert with \`--ssl-extra-ca-certs ca.pem\`. Use \`-k\`/\`--insecure\` only in throwaway dev environments, never against anything that matters.

**Variables not resolving (\`{{baseUrl}}\` sent literally).** The environment was not loaded, or the variable name is misspelled or scoped wrong (collection vs environment vs global). Pass \`--environment\` and double-check the variable exists; use \`--verbose\` to see the resolved URL.

**Collection schema mismatch.** Newman expects Collection v2.1. If you exported v1 from an old tool, convert it (the Postman app re-exports as v2.1). An "unsupported collection format" error means a wrong or corrupt schema.

**Timeouts in CI but not locally.** CI runners may have stricter egress or slower networks. Raise \`--timeout-request\`, add \`--delay-request\` for rate-limited APIs, and confirm the CI runner can actually reach your target host (internal staging often needs a self-hosted runner or VPN).

**Data file rows not iterating.** Confirm the file is valid CSV/JSON and that you passed \`--iteration-data\`. Newman runs one iteration per row; if you see only one iteration, the file likely failed to parse silently — check headers match your \`{{variable}}\` names.

## Recommended setup

For a robust Newman pipeline: commit the v2.1 collection and a non-secret environment file, inject secrets via \`--env-var\` from CI secrets, run with \`--reporters cli,junit\` plus \`htmlextra\`, upload artifacts with \`if: always()\`, and add explicit status/schema assertions to every request so failures actually fail. Browse related API and CI tooling in our [skills directory](/skills).

## Frequently Asked Questions

### What is the difference between Newman and the Postman Collection Runner?

They use the same execution engine, so behavior is identical — same scripts, same \`pm.*\` API, same variable handling. The difference is interface and intent: the Collection Runner is a GUI inside the Postman app for manual runs, while Newman is a command-line tool designed for automation. Newman takes file inputs, emits machine-readable reports, and sets its exit code from results, which is what makes it suitable for CI pipelines.

### How does Newman make my CI pipeline fail when a test fails?

Newman exits with a non-zero status code when any assertion (\`pm.test\`) fails or a fatal run error occurs. CI systems treat a non-zero exit from a step as a failed job, so the pipeline stops or is marked red automatically. The catch is that Newman only fails on *assertions* — a request returning an error status with no test checking it will still pass, so add explicit status assertions.

### How do I keep API keys and secrets out of my committed Postman files?

Do not put secrets in the exported environment JSON. Instead, store them as CI secrets (GitHub Actions secrets, GitLab CI/CD variables) and inject them at runtime with Newman's \`--env-var "apiKey=$SECRET"\` flag, which overrides any value in the environment file. The committed environment file should contain only non-sensitive defaults like base URLs.

### Can Newman run the same collection against multiple data sets?

Yes, using a data file. Pass \`--iteration-data data.csv\` (or \`.json\`) and Newman runs the entire collection once per row, substituting \`{{column}}\` variables from each row, accessible in scripts via \`pm.iterationData.get()\`. This is how you parameterize the same requests across many inputs — for example, testing valid and invalid emails with their expected status codes in a single run.

### Which Newman reporter should I use for CI?

Use the built-in \`junit\` reporter for the CI test report — almost every CI platform ingests JUnit XML to show a pass/fail tree, and GitLab and GitHub surface it natively. Add the community \`newman-reporter-htmlextra\` for a rich, downloadable HTML artifact when you want detailed request/response inspection. You can run several reporters at once with \`--reporters cli,junit,htmlextra\`.

### Should I use Postman Monitors or Newman in CI for scheduled API tests?

Use Newman in CI when you need control over environment, secrets, internal network access, and artifact retention, or when the tests gate a deploy — it has no per-run cloud limits and runs wherever your runners run. Use Postman Monitors for lightweight, cloud-scheduled external uptime checks. Many teams run both: Newman as the deploy gate and a Monitor for production smoke checks.
`,
};
