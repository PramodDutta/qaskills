import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Hurl HTTP Testing CLI: The Complete .hurl File Guide (2026)',
  description:
    'Master the Hurl HTTP testing CLI: write plain-text .hurl files with GET/POST requests, captures, asserts, JSONPath queries, and run them in CI pipelines.',
  date: '2026-06-30',
  category: 'Guide',
  content: `
# Hurl HTTP Testing CLI: The Complete .hurl File Guide (2026)

Hurl is a command-line tool that runs HTTP requests defined in a simple, plain-text format and chains them together into runnable, version-controlled tests. If you have ever wanted the request-chaining power of Postman without the GUI, the JSON sprawl, or the proprietary export format, the Hurl HTTP testing CLI is the answer. A \`.hurl\` file reads almost like the raw HTTP traffic it describes: you write the method and URL, optional headers and body, then a block of captures and assertions. Hurl sends the request, validates the response, and exits with a non-zero status code if anything fails — which is exactly what your CI pipeline wants.

Built on libcurl and written in Rust, Hurl is fast, dependency-free (a single static binary), and equally happy testing a REST API, scraping HTML with XPath, or running a full load test with \`--repeat\`. Because \`.hurl\` files are just text, they diff cleanly in pull requests, live next to your application code, and never suffer the merge conflicts that plague exported Postman collections. In this guide you will learn the full \`.hurl\` file syntax — GET and POST requests, query parameters, form data, JSON bodies, captures that feed later requests, JSONPath and header assertions, variables, and the CLI flags that matter in continuous integration. Every example is real and runnable. If you are weighing tools, compare this with [Postman vs Playwright for API testing](/blog/postman-vs-playwright-api-testing) and browse the [QA skills directory](/skills) for related automation recipes.

## Installing Hurl

Hurl ships as a single binary for macOS, Linux, and Windows. Pick the channel that matches your environment and you are testing within a minute.

\`\`\`bash
# macOS (Homebrew)
brew install hurl

# Linux (Debian/Ubuntu .deb)
curl -LO https://github.com/Orange-OpenSource/hurl/releases/download/6.0.0/hurl_6.0.0_amd64.deb
sudo apt install ./hurl_6.0.0_amd64.deb

# Windows (winget)
winget install hurl

# Verify the install
hurl --version
\`\`\`

Once installed you have two binaries: \`hurl\` runs files and prints the last response body, and \`hurlfmt\` formats and lints \`.hurl\` files. There is nothing to configure, no runtime to install, and no Node or Python dependency to manage.

## Your First .hurl File: A Simple GET

A \`.hurl\` file is a sequence of entries. Each entry is one request and its optional response checks. The simplest possible test is a single GET with an implicit status assertion.

\`\`\`hurl
# basic-get.hurl
GET https://api.example.com/health

HTTP 200
\`\`\`

Run it:

\`\`\`bash
hurl --test basic-get.hurl
\`\`\`

The \`HTTP 200\` line tells Hurl to assert the response status is 200. The \`--test\` flag switches Hurl into test mode: instead of dumping the response body, it prints a pass/fail summary and sets the exit code. Without \`--test\`, Hurl behaves like curl and prints the body — useful for quick debugging.

## GET Requests with Query Parameters and Headers

Real requests carry headers and query strings. Hurl gives both first-class sections so you never hand-encode a URL.

\`\`\`hurl
# search.hurl
GET https://api.example.com/v1/products
Accept: application/json
Authorization: Bearer {{token}}
[QueryParams]
category: books
limit: 10
sort: price_asc

HTTP 200
[Asserts]
header "Content-Type" contains "application/json"
jsonpath "$.products" count >= 1
jsonpath "$.products[0].category" == "books"
jsonpath "$.meta.limit" == 10
duration < 1000
\`\`\`

The \`[QueryParams]\` section URL-encodes each pair and appends it to the URL. The \`{{token}}\` placeholder is a variable — pass it on the command line with \`--variable token=abc123\` or load it from a file with \`--variables-file vars.env\`. The \`[Asserts]\` block runs after the response arrives; \`duration < 1000\` even lets you assert the request completed in under a second.

## POST Requests with a JSON Body

POSTing JSON is where Hurl shines. Use a triple-backtick fenced block tagged \`json\` for the request body and Hurl sets the \`Content-Type\` header for you.

\`\`\`hurl
# create-user.hurl
POST https://api.example.com/v1/users
Authorization: Bearer {{token}}
\\\`\\\`\\\`json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "role": "engineer"
}
\\\`\\\`\\\`

HTTP 201
[Asserts]
jsonpath "$.id" exists
jsonpath "$.name" == "Ada Lovelace"
jsonpath "$.email" matches /.+@.+\\..+/
header "Location" exists
\`\`\`

Note the fenced body block uses three backticks with a \`json\` tag. Hurl reads everything between the fences verbatim, so your JSON stays exactly as written. The \`matches\` assertion runs a regular expression against the captured value — here verifying the returned email looks like a valid address.

## Capturing Values to Chain Requests

The real superpower of the Hurl HTTP testing CLI is capturing a value from one response and reusing it in the next. This is how you build login-then-act workflows entirely in text.

\`\`\`hurl
# login-then-fetch.hurl

# Step 1: authenticate and capture the token + user id
POST https://api.example.com/v1/auth/login
\\\`\\\`\\\`json
{ "username": "ada", "password": "secret" }
\\\`\\\`\\\`

HTTP 200
[Captures]
auth_token: jsonpath "$.access_token"
user_id: jsonpath "$.user.id"

# Step 2: use the captured token on a protected route
GET https://api.example.com/v1/users/{{user_id}}/profile
Authorization: Bearer {{auth_token}}

HTTP 200
[Asserts]
jsonpath "$.id" == {{user_id}}
jsonpath "$.profile.active" == true
\`\`\`

The \`[Captures]\` section stores values from the first response into variables. Those variables are then available in every subsequent entry in the file. Captures are not limited to JSONPath — you can capture from headers, cookies, regex matches, XPath on HTML, or the raw response body.

## The Capture and Assert Query Reference

Hurl exposes a consistent set of query types that work in both \`[Captures]\` and \`[Asserts]\`. The table below is the cheat sheet you will return to most often.

| Query | Targets | Example |
|---|---|---|
| \`status\` | HTTP status code | \`status == 200\` |
| \`header "Name"\` | A response header | \`header "ETag" exists\` |
| \`jsonpath "$.x"\` | JSON body via JSONPath | \`jsonpath "$.total" == 42\` |
| \`xpath "//h1"\` | HTML/XML via XPath | \`xpath "string(//title)" contains "Home"\` |
| \`cookie "name"\` | A response cookie | \`cookie "session" exists\` |
| \`regex "id=(\\\\d+)"\` | Regex capture group | \`regex "v(\\\\d+)" capture\` |
| \`body\` | Raw response body | \`body contains "OK"\` |
| \`bytes\` | Raw bytes (sha256) | \`bytes count > 0\` |
| \`duration\` | Response time (ms) | \`duration < 500\` |

Each query pairs with a predicate. The most common predicates are listed next.

| Predicate | Meaning |
|---|---|
| \`==\` / \`!=\` | Equality / inequality |
| \`>\` \`>=\` \`<\` \`<=\` | Numeric comparison |
| \`contains\` | Substring or array membership |
| \`startsWith\` / \`endsWith\` | String prefix / suffix |
| \`matches\` | Regular expression match |
| \`exists\` / \`not exists\` | Presence check |
| \`isInteger\` / \`isString\` / \`isBoolean\` | Type assertions |
| \`count\` | Length of an array or string |

## Form Data, Multipart, and File Uploads

Not every API speaks JSON. Hurl supports URL-encoded forms, multipart uploads, and raw file bodies with dedicated sections.

\`\`\`hurl
# url-encoded login form
POST https://api.example.com/login
[FormParams]
username: ada
password: secret

HTTP 302

# multipart upload with a file
POST https://api.example.com/v1/avatars
[MultipartFormData]
user_id: 42
avatar: file,profile.png; image/png

HTTP 201
[Asserts]
jsonpath "$.url" contains "avatars"
\`\`\`

The \`file,profile.png; image/png\` syntax tells Hurl to read \`profile.png\` from disk relative to the \`.hurl\` file and send it with the given content type. There is no boundary string to manage — Hurl handles the multipart encoding.

## Options, Retries, and Conditional Steps

Each entry can carry an \`[Options]\` section that tunes behavior for that request only. This is essential for polling an asynchronous job until it completes.

\`\`\`hurl
# poll a job until it reports done, retrying up to 10 times
GET https://api.example.com/v1/jobs/{{job_id}}
[Options]
retry: 10
retry-interval: 2000

HTTP 200
[Asserts]
jsonpath "$.status" == "completed"
\`\`\`

With \`retry: 10\`, Hurl re-runs the entire entry — including its assertions — up to ten times, waiting two seconds between attempts, until the assertions pass or the retry budget is exhausted. This replaces the fragile sleep-then-hope pattern that makes other test suites flaky. For background on eliminating timing flakiness across tools, see the guide on [fixing flaky tests](/blog/fix-flaky-tests-guide).

## Running .hurl Files: The CLI Flags That Matter

The \`hurl\` binary has a focused set of flags. These are the ones you will reach for in day-to-day testing and CI.

\`\`\`bash
# Run a whole directory in test mode, glob all .hurl files
hurl --test tests/**/*.hurl

# Inject variables and a base URL
hurl --test \\
  --variable token=abc123 \\
  --variable host=https://staging.example.com \\
  tests/api/*.hurl

# Load variables from a dotenv-style file
hurl --test --variables-file ci.env tests/api/*.hurl

# Emit a JUnit XML report and an HTML report for CI dashboards
hurl --test \\
  --report-junit results/junit.xml \\
  --report-html results/html \\
  tests/api/*.hurl

# Verbose output to debug a failing request
hurl --very-verbose tests/api/create-user.hurl
\`\`\`

The \`--report-junit\` flag is the bridge to CI: GitHub Actions, GitLab, and Jenkins all parse JUnit XML to display per-test pass/fail. The \`--report-html\` flag produces a clickable report with the full request and response of every entry, which is invaluable when a test fails in a pipeline you cannot reproduce locally.

## Running Hurl in GitHub Actions

Because Hurl is a single binary with a meaningful exit code, wiring it into CI takes only a few lines.

\`\`\`yaml
# .github/workflows/api-tests.yml
name: API Tests
on: [push, pull_request]

jobs:
  hurl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Hurl
        run: |
          curl -LO https://github.com/Orange-OpenSource/hurl/releases/download/6.0.0/hurl_6.0.0_amd64.deb
          sudo apt install ./hurl_6.0.0_amd64.deb
      - name: Run API tests
        run: |
          hurl --test \\
            --variable token=\${{ secrets.API_TOKEN }} \\
            --report-junit results/junit.xml \\
            tests/api/*.hurl
      - name: Publish results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: hurl-results
          path: results/
\`\`\`

The \`\${{ secrets.API_TOKEN }}\` reference pulls a secret from the repository and feeds it to Hurl as a variable, so no credential is hardcoded in the \`.hurl\` files. Because Hurl exits non-zero on the first failed assertion, the job fails automatically and blocks the merge.

## Hurl vs Other API Testing Tools

Hurl occupies a specific niche: text-first, CLI-native HTTP testing. The table contrasts it with the tools teams most often compare it against.

| Tool | Format | Best for | Trade-off |
|---|---|---|---|
| Hurl | Plain-text \`.hurl\` | Fast CI API checks, request chaining | No assertions on browser/UI |
| Postman / Newman | JSON collections | Manual exploration, teams in a GUI | Bulky exports, merge conflicts |
| Playwright \`request\` | TypeScript | Mixed API + browser E2E | Needs a Node project |
| curl + jq scripts | Shell | One-off probes | No structured assertions |
| Pact | Code + broker | Consumer-driven contracts | Heavier setup |

If your needs grow toward consumer-driven contracts, pair Hurl with a tool like Pact — see [contract testing with Pact in Python](/blog/contract-testing-pact-python-guide). For mixed browser-and-API suites, [Postman vs Playwright](/blog/postman-vs-playwright-api-testing) covers the trade-offs in depth.

## Best Practices for Maintainable .hurl Suites

A few conventions keep a growing Hurl suite readable and reliable. First, parameterize every environment-specific value — base URLs, tokens, and IDs — through variables rather than hardcoding, so the same file runs against local, staging, and production. Second, keep one logical workflow per file (login then act, create then read then delete) so captures flow naturally and failures are easy to localize. Third, run \`hurlfmt --check\` in CI to enforce consistent formatting and catch syntax errors before they reach a test run. Fourth, lean on \`[Options] retry\` for anything asynchronous instead of fixed sleeps. Finally, commit the \`.hurl\` files alongside the code they test so the request contract evolves in the same pull request as the implementation.

## Variables, Environments, and Secrets

A maintainable Hurl suite never hardcodes a host or credential. Hurl resolves variables from three sources, in increasing priority: a \`--variables-file\`, repeated \`--variable name=value\` flags, and inline \`[Options] variable\` entries within a single entry. This layering lets you keep a checked-in defaults file while overriding the host and token per environment at run time.

\`\`\`bash
# defaults checked into the repo
cat tests/defaults.env
# host=https://api.example.com
# limit=10

# run against staging, overriding host and injecting a secret token
hurl --test \\
  --variables-file tests/defaults.env \\
  --variable host=https://staging.example.com \\
  --variable token=\$STAGING_TOKEN \\
  tests/api/*.hurl
\`\`\`

Inside a file you reference \`{{host}}\` everywhere a base URL appears, so the same \`.hurl\` file runs unchanged across local, staging, and production. You can also compute values mid-file. Hurl supports filters on captured values, letting you transform a captured string before reusing it.

\`\`\`hurl
GET {{host}}/v1/config

HTTP 200
[Captures]
# capture and lowercase a region code for use in the next URL
region: jsonpath "$.region" toLowerCase
# capture the count and use it as a number later
total: jsonpath "$.items" count

GET {{host}}/v1/regions/{{region}}/summary

HTTP 200
[Asserts]
jsonpath "$.itemCount" == {{total}}
\`\`\`

Filters such as \`toLowerCase\`, \`toInt\`, \`split\`, \`replace\`, and \`format\` run during capture, so the variable is already in the shape the next request needs. This keeps the workflow declarative — there is no glue script massaging values between requests.

## Asserting on Errors and Negative Paths

Testing only the happy path leaves your most dangerous bugs uncovered. Hurl makes negative testing first-class: you assert the exact failure status and error shape the API should return for bad input, missing auth, or not-found resources.

\`\`\`hurl
# Expect 401 when the Authorization header is absent
GET {{host}}/v1/account

HTTP 401
[Asserts]
jsonpath "$.error" == "unauthorized"

# Expect 422 for an invalid payload
POST {{host}}/v1/users
Authorization: Bearer {{token}}
\\\`\\\`\\\`json
{ "email": "not-an-email" }
\\\`\\\`\\\`

HTTP 422
[Asserts]
jsonpath "$.errors" count >= 1
jsonpath "$.errors[0].field" == "email"

# Expect 404 for a missing resource
GET {{host}}/v1/users/does-not-exist
Authorization: Bearer {{token}}

HTTP 404
\`\`\`

By codifying these expectations, a regression that accidentally returns a 500 instead of a clean 422, or leaks data on an unauthenticated route, fails the build immediately. This is the same contract-first mindset behind [contract testing with Pact](/blog/contract-testing-pact-python-guide), applied at the raw HTTP layer.

## Filters, JSONPath Tricks, and Complex Assertions

JSONPath in Hurl is more expressive than a simple dotted path, and combining it with filters covers the assertions most APIs demand. You can index into arrays, filter by predicate, select nested fields, and assert across collections. The examples below cover the patterns you will reach for repeatedly when validating list endpoints and aggregate responses.

\`\`\`hurl
GET {{host}}/v1/orders?status=open
Authorization: Bearer {{token}}

HTTP 200
[Asserts]
# every order in the array has status "open"
jsonpath "$.orders[*].status" includes "open"
# the array has between 1 and 50 entries
jsonpath "$.orders" count >= 1
jsonpath "$.orders" count <= 50
# the first order total is a positive number
jsonpath "$.orders[0].total" > 0
jsonpath "$.orders[0].total" isFloat
# a deeply nested field exists
jsonpath "$.pagination.next" exists
# a string field matches a UUID pattern
jsonpath "$.orders[0].id" matches /^[0-9a-f-]{36}$/
\`\`\`

The \`includes\` predicate checks array membership, \`isFloat\` and \`isInteger\` assert numeric types, and \`matches\` runs a regular expression. Because these run inside the \`[Asserts]\` block, a single entry can verify both the shape and the contents of a response in one pass — no external assertion library required.

## Debugging Failures and Reading Hurl Output

When an assertion fails, Hurl prints the file, line number, the expected value, and the actual value, so you usually know the cause immediately. For deeper inspection, escalate through the verbosity flags.

\`\`\`bash
# show request/response headers for every entry
hurl --verbose tests/api/create-user.hurl

# show full request and response bodies plus timing
hurl --very-verbose tests/api/create-user.hurl

# run a single failing file and stop on first error with full context
hurl --very-verbose --error-format long tests/api/create-user.hurl
\`\`\`

The \`--error-format long\` flag expands an assertion failure into the full surrounding context, which is the fastest way to diagnose why a JSONPath did not match. In CI, the HTML report generated with \`--report-html\` captures all of this for every run, so you can inspect a failed pipeline without re-running anything locally. Treat a failing Hurl assertion the way you would a failing unit test: the expected-versus-actual diff is your starting point, not a reason to add a blind retry.

## Frequently Asked Questions

### What is the Hurl HTTP testing CLI used for?

Hurl runs HTTP requests defined in plain-text \`.hurl\` files and validates the responses with built-in assertions. Teams use it for fast API integration tests in CI, smoke-testing endpoints after deploy, chaining authenticated request workflows, and lightweight load testing. Because it is a single binary built on libcurl, it needs no runtime and exits non-zero on failure, making it ideal for pipelines.

### How do I capture a token in Hurl and reuse it?

Add a \`[Captures]\` section after the login response and store the value with a query such as \`auth_token: jsonpath "$.access_token"\`. The captured variable is then available in every later entry in the same file. Reference it as \`{{auth_token}}\` in headers or URLs of subsequent requests to chain an authenticated workflow without manual copying.

### Can Hurl assert on JSON response bodies?

Yes. The \`[Asserts]\` section supports JSONPath queries combined with predicates like \`==\`, \`contains\`, \`count\`, \`exists\`, and \`matches\`. For example, \`jsonpath "$.products" count >= 1\` checks the array length and \`jsonpath "$.user.email" matches /.+@.+/\` validates a field with a regular expression. You can also assert on status, headers, cookies, duration, and raw bytes.

### How is Hurl different from Postman?

Postman stores tests as JSON collections edited in a GUI, while Hurl uses plain-text \`.hurl\` files edited in any code editor. Hurl files diff cleanly in pull requests and avoid the merge conflicts of exported collections. Postman is stronger for manual, exploratory work; Hurl is stronger for version-controlled, CLI-driven CI testing. Newman is Postman's CLI equivalent but carries the JSON format with it.

### How do I run Hurl tests in CI?

Install the Hurl binary, then run \`hurl --test --report-junit results/junit.xml tests/*.hurl\`. The \`--test\` flag sets a proper exit code and prints a summary, while \`--report-junit\` produces XML that GitHub Actions, GitLab, and Jenkins display as per-test results. Pass secrets with \`--variable token=\$TOKEN\` so credentials stay out of the files.

### Does Hurl support retries for asynchronous APIs?

Yes. Add an \`[Options]\` section to an entry with \`retry\` and \`retry-interval\` values. Hurl re-runs the entire entry, including its assertions, until they pass or the retry count is exhausted. This polls an asynchronous job to completion without fragile fixed sleeps, which is a common source of flaky API tests.

### Can Hurl test HTML pages, not just JSON APIs?

Yes. Hurl supports XPath queries in both captures and assertions, so you can scrape and validate HTML or XML responses. For example, \`xpath "string(//title)" contains "Dashboard"\` asserts on a page title. This makes Hurl useful for lightweight HTML smoke tests in addition to JSON REST API testing.

### Is Hurl free and open source?

Yes. Hurl is open source under the Apache 2.0 license, maintained by Orange and a community of contributors. It is distributed as prebuilt binaries for macOS, Linux, and Windows, plus Docker images, with no paid tier or account required.

## Conclusion

The Hurl HTTP testing CLI gives you a text-first, dependency-free way to test HTTP APIs that fits naturally into version control and continuous integration. With GET and POST requests, captures that chain workflows, a rich set of JSONPath and header assertions, and retries for asynchronous endpoints, a handful of \`.hurl\` files can replace a sprawling Postman collection while staying readable in every pull request. Start with a single \`hurl --test\` against your health endpoint, layer in authentication and assertions, then wire it into GitHub Actions so every push verifies your API contract automatically.

Ready to go deeper on API and integration testing? Explore the [QA skills directory](/skills) for ready-to-use automation recipes, and compare approaches in [Postman vs Playwright for API testing](/blog/postman-vs-playwright-api-testing) and [contract testing with Pact](/blog/contract-testing-pact-python-guide).
`,
};
