import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bruno API Testing With Git: The Complete 2026 Guide',
  description:
    'Master Bruno API testing with Git-friendly .bru files and JavaScript test scripts. Version-control collections, write assertions, chain requests, and run in CI.',
  date: '2026-06-30',
  category: 'Guide',
  content: `
# Bruno API Testing With Git: The Complete 2026 Guide

For more than a decade API testing meant one thing for most teams: a Postman collection synced to a cloud workspace. It worked, but it also created a quiet set of problems. Your API tests lived in someone else's database. Reviewing a change to a request meant clicking through a UI rather than reading a diff. Merging two engineers' edits was a manual reconciliation, not a \`git merge\`. And as workspaces grew, the cloud sync became another account, another seat, another thing that could leak credentials.

Bruno is the answer to that discomfort. It is an open-source, offline-first API client that stores every request as a plain text file on your filesystem. Each request is a \`.bru\` file written in a small, readable markup language. A collection is just a folder of those files. Because everything is text on disk, your API tests live in the same Git repository as the code they test. You review request changes in pull requests. You branch, diff, and merge them like any other source file. There is no cloud account in the loop and no proprietary binary blob to wrangle.

This guide is a complete, hands-on walkthrough of Bruno with a Git-first mindset. You will install Bruno, understand the \`.bru\` file format down to its syntax, write JavaScript test scripts and assertions, chain requests by passing data between them, manage environments and secrets safely, and run your collection headlessly in CI with the \`bru\` command-line runner. Every code block is real and runnable. If your team is evaluating clients, our comparison of [Postman vs Playwright for API testing](/blog/postman-vs-playwright-api-testing) provides useful context on where a dedicated API client fits versus a full browser automation framework.

## Why Git-Native Matters for API Tests

The core design decision in Bruno is that the collection is the filesystem. That single choice cascades into every advantage teams care about. Here is how the Git-native model compares to a cloud-synced model:

| Concern | Cloud-synced client | Bruno (Git-native) |
|---|---|---|
| Source of truth | Vendor's cloud database | Your Git repository |
| Reviewing changes | Click through UI | Read a unified diff in a PR |
| Merging edits | Manual, error-prone | Standard \`git merge\` |
| Offline work | Limited or blocked | Fully offline |
| Secrets handling | Often synced to cloud | Stay local, gitignored |
| Onboarding | Invite to workspace | \`git clone\` the repo |
| Cost at scale | Per-seat licensing | Free, open source |
| CI integration | Cloud token or export | Native \`bru\` CLI |

The practical effect is that API tests stop being a separate artifact maintained in a separate place and become ordinary code. When a developer changes an endpoint, they update the \`.bru\` file in the same commit, and a reviewer sees both changes side by side. That tight coupling is what keeps API tests honest over time.

## Installing Bruno

Bruno ships as a desktop application for macOS, Windows, and Linux, and as a command-line runner for automation. The desktop app is where you author and explore; the CLI is where CI runs your collection. Install the desktop app from the official site or via a package manager. On macOS with Homebrew:

\`\`\`bash
brew install bruno
\`\`\`

The CLI runner is a separate npm package. Install it in your project so the version is pinned in \`package.json\`:

\`\`\`bash
npm install --save-dev @usebruno/cli

# verify
npx bru --version
\`\`\`

You can also install it globally if you prefer, but a project-local install keeps the version consistent across the team and in CI, which matters when assertion behavior changes between releases.

## Anatomy of a .bru File

The heart of Bruno is the \`.bru\` file. It is a small, block-structured text format that is deliberately easy to read and diff. Create a collection folder, and inside it create \`get-user.bru\`:

\`\`\`text
meta {
  name: Get User
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/users/{{userId}}
  body: none
  auth: bearer
}

auth:bearer {
  token: {{authToken}}
}

headers {
  Accept: application/json
}

query {
  include: profile
}
\`\`\`

Every \`.bru\` file is a sequence of named blocks. The \`meta\` block names the request and sets its order. The \`get\` block (or \`post\`, \`put\`, \`patch\`, \`delete\`) defines the method, URL, and body type. Double-brace tokens like \`{{baseUrl}}\` are variables resolved from the active environment or from earlier requests. Because this is plain text, a reviewer reading a diff can instantly see that a header changed or a URL path moved, with no proprietary tooling required.

A request with a JSON body looks like this. Create \`create-user.bru\`:

\`\`\`text
meta {
  name: Create User
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/users
  body: json
  auth: bearer
}

auth:bearer {
  token: {{authToken}}
}

body:json {
  {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "role": "engineer"
  }
}
\`\`\`

The \`body:json\` block contains literal JSON. Bruno sends it as the request body and sets the content type automatically. Notice how natural this is to diff: changing the role from \`engineer\` to \`admin\` is a one-line change a reviewer cannot miss.

## Writing Test Scripts and Assertions

A request that you cannot assert on is just a request. Bruno gives you two complementary mechanisms: a declarative \`assert\` block for simple property checks, and a full JavaScript \`tests\` block for anything more complex. Start with the declarative form:

\`\`\`text
assert {
  res.status: eq 200
  res.body.role: eq engineer
  res.responseTime: lt 1000
}
\`\`\`

Each line is an expression, an operator, and an expected value. The operators include \`eq\`, \`neq\`, \`gt\`, \`gte\`, \`lt\`, \`lte\`, \`contains\`, and \`matches\`. This block reads cleanly and covers the majority of straightforward checks without any JavaScript.

For richer logic you write a \`tests\` block. Inside it you have access to a \`test()\` function and an \`expect()\` assertion library, plus a \`res\` object representing the response. Add this to \`create-user.bru\`:

\`\`\`text
script:post-response {
  const body = res.getBody();

  test("status is 201 Created", function () {
    expect(res.getStatus()).to.equal(201);
  });

  test("response has an id", function () {
    expect(body).to.have.property("id");
    expect(body.id).to.be.a("string");
  });

  test("email matches what we sent", function () {
    expect(body.email).to.equal("ada@example.com");
  });

  test("created within one second", function () {
    expect(res.getResponseTime()).to.be.below(1000);
  });
}
\`\`\`

The \`script:post-response\` block runs JavaScript after the response arrives. The \`test()\` function names a check and reports pass or fail individually, so the runner output reads like a proper test report. The \`expect()\` API is the familiar Chai-style fluent assertion syntax, so anyone who has written JavaScript tests will be immediately productive. If you want a refresher on assertion patterns and test design that apply here too, our [complete API testing guide](/blog/api-testing-complete-guide) is a good companion.

## Pre-Request Scripts and Setup Logic

Sometimes you need to compute a value before a request fires: a timestamp, a signature, a derived header. The \`script:pre-request\` block runs before the request is sent and can read and write variables.

\`\`\`text
script:pre-request {
  // Compute a request timestamp and stash it for assertions later.
  const now = Date.now();
  bru.setVar("requestSentAt", now);

  // Set a dynamic header value.
  req.setHeader("X-Request-Time", String(now));
}
\`\`\`

The \`bru\` object is Bruno's scripting API. \`bru.setVar()\` writes a runtime variable that later requests and assertions can read with \`bru.getVar()\`. The \`req\` object lets you mutate the outgoing request, here adding a header computed at send time. This is how you handle request signing, nonces, and any value that must be fresh on every run.

## Chaining Requests: Passing Data Between Calls

Real workflows are sequences. You log in to get a token, create a resource to get its id, then fetch or delete that resource. Bruno chains requests by capturing values from one response into variables that later requests consume. First, a login request \`login.bru\` that captures the token:

\`\`\`text
meta {
  name: Login
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/auth/login
  body: json
}

body:json {
  {
    "email": "{{userEmail}}",
    "password": "{{userPassword}}"
  }
}

script:post-response {
  const body = res.getBody();
  test("login succeeds", function () {
    expect(res.getStatus()).to.equal(200);
    expect(body).to.have.property("token");
  });
  // Save the token for every later request in the run.
  bru.setVar("authToken", body.token);
}
\`\`\`

Now any subsequent request can reference \`{{authToken}}\` in its \`auth:bearer\` block, and it will be filled with the captured value. The same pattern works for ids. After a create request you capture \`bru.setVar("newUserId", res.getBody().id)\`, and a follow-up GET uses \`url: {{baseUrl}}/users/{{newUserId}}\`. Because variables flow through the run in sequence order, the collection becomes an executable workflow, not just a bag of independent calls. This sequencing-and-assertion discipline is the same mindset behind end-to-end flows in our [Playwright end-to-end testing guide](/blog/playwright-e2e-complete-guide), applied to the API layer.

## Managing Environments and Secrets

You never want \`https://staging.api\` hard-coded across forty requests, and you never want a password committed to Git. Bruno solves both with environment files and secret variables. Environments are \`.bru\` files in an \`environments\` folder inside the collection. Create \`environments/staging.bru\`:

\`\`\`text
vars {
  baseUrl: https://staging.api.example.com
  userEmail: qa@example.com
}

vars:secret [
  userPassword,
  authToken
]
\`\`\`

The \`vars\` block holds ordinary, committable values like the base URL. The \`vars:secret\` block declares variable names whose values are sensitive. Bruno stores secret values outside the committed file (in a local, gitignored store), so the names are tracked in Git but the actual passwords and tokens never are. You select the active environment in the desktop UI, or pass it to the CLI. Add the secret store to \`.gitignore\`:

\`\`\`text
# .gitignore
.env
*.bru.local
environments/.secrets
\`\`\`

This split is the crux of safe Git-native testing: structure and non-secret config are versioned for the whole team, while credentials stay on each machine. New teammates clone the repo, get every request and assertion, and supply only their own secrets locally.

## Running Collections in the CI Pipeline

The desktop app is for authoring; the \`bru\` CLI is for automation. To run an entire collection headlessly against the staging environment:

\`\`\`bash
npx bru run --env staging
\`\`\`

The runner executes every request in sequence, runs all assertions and test scripts, and exits non-zero if any assertion fails, which is exactly what a CI gate needs. You can target a single folder, produce machine-readable reports, and fail the build on the first error:

\`\`\`bash
# Run one folder, emit a JUnit report, and bail on first failure.
npx bru run ./collection/users \\
  --env staging \\
  --reporter-junit results.xml \\
  --bail
\`\`\`

Wiring that into GitHub Actions is a few lines. The workflow checks out the repo, installs dependencies, and runs the collection, injecting secrets from the CI secret store as environment variables that the runner can read:

\`\`\`yaml
name: api-tests
on: [push, pull_request]

jobs:
  bruno:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Bruno CLI
        run: npm install --save-dev @usebruno/cli

      - name: Run API collection
        env:
          USER_PASSWORD: \${{ secrets.QA_USER_PASSWORD }}
        run: |
          npx bru run \\
            --env staging \\
            --env-var userPassword=$USER_PASSWORD \\
            --reporter-junit results.xml

      - name: Publish report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bruno-results
          path: results.xml
\`\`\`

The \`--env-var\` flag injects a secret at runtime so it never lives in any file. For broader guidance on structuring these pipelines, see our [CI/CD testing pipeline with GitHub Actions guide](/blog/cicd-testing-pipeline-github-actions). Because the whole run is just a CLI invocation, you can drop it into any CI system, a pre-commit hook, or a local script with no vendor lock-in.

## CLI Flags Worth Knowing

The runner has a focused set of flags that cover most automation needs. This reference table collects the ones you will reach for most:

| Flag | Purpose |
|---|---|
| \`--env <name>\` | Select the environment file to use |
| \`--env-var key=value\` | Override or inject a single variable at runtime |
| \`--reporter-junit <file>\` | Emit a JUnit XML report for CI ingestion |
| \`--reporter-json <file>\` | Emit a JSON report for custom processing |
| \`--bail\` | Stop on the first failing assertion |
| \`-r\` | Recurse into subfolders of the target |
| \`--insecure\` | Skip TLS verification (test environments only) |
| \`--tests-only\` | Run only requests that contain tests |

A common production setup uses \`--reporter-junit\` for the CI test dashboard, \`--bail\` on pull-request runs for fast feedback, and \`-r\` to sweep an entire nested collection. Keep \`--insecure\` strictly for self-signed staging certs and never for anything that touches production.

## Bruno Versus Postman and Insomnia

Bruno is not the only API client, and choosing one is partly about your team's priorities. The deciding question is usually how much you value Git-native, offline-first workflows versus a large ecosystem of cloud features. If your team already runs disciplined code review and wants tests in the repo, Bruno's model is a strong fit. If you depend heavily on cloud collaboration features, mock servers, and monitors, a traditional client may serve better. Many teams also run Bruno alongside a property-based fuzzer for broader coverage; our [Schemathesis property-based API testing guide](/blog/schemathesis-property-based-api-testing-guide-2026) explains how the two layers complement each other, with Bruno handling scripted workflow assertions and Schemathesis handling generated edge cases.

## Common Mistakes and How to Avoid Them

A handful of issues recur with new Bruno users. The most common is committing secrets: always declare credentials in \`vars:secret\` and confirm the secret store is gitignored before your first push. The second is relying on request order without setting \`seq\` values, which makes chained runs nondeterministic; always number requests that depend on each other. The third is overusing JavaScript \`tests\` blocks for checks that the declarative \`assert\` block handles more readably; reach for scripts only when you need real logic. The fourth is forgetting that \`bru.setVar()\` values live only for the duration of a run, so do not expect them to persist between separate \`bru run\` invocations. Each of these is easy to avoid once you know it, and steering clear of them keeps your collection clean enough to review like any other code.

A subtler mistake is treating the collection as throwaway scratch space rather than reviewed source. Because \`.bru\` files are so easy to create in the desktop app, it is tempting to accumulate dozens of exploratory requests that never get assertions, never get organized into folders, and never get deleted. Over time that clutter erodes the very advantage that drew you to Bruno, namely a clean, diffable, reviewable test suite. The discipline that pays off is to treat a new request the way you treat new code: give it a meaningful name, add at least one assertion, place it in the right folder, and let it go through review. A small, well-curated collection that every teammate trusts is worth far more than a sprawling one that nobody dares to run in CI.

## Organizing Larger Collections

As a collection grows past a handful of requests, folder structure becomes the thing that keeps it navigable. Bruno mirrors your filesystem, so a folder is simply a directory of \`.bru\` files, and you can nest folders to mirror your API's resource hierarchy. A common layout groups requests by resource: a \`users\` folder, an \`orders\` folder, an \`auth\` folder, each containing the create, read, update, and delete requests for that resource plus their assertions. Folder-level settings let you apply shared headers or auth to every request inside, so you define the bearer token configuration once at the folder level instead of repeating it in every file. When you run \`bru run ./collection/users -r\` the runner sweeps just that resource's requests, which keeps feedback fast when you are iterating on a single area. This filesystem-as-structure model is what makes Bruno collections scale gracefully in a monorepo without turning into an unreadable wall of requests.

## Frequently Asked Questions

### What is Bruno and how is it different from Postman?

Bruno is an open-source, offline-first API client that stores every request as a plain text \`.bru\` file on your filesystem. Unlike Postman, which syncs collections to a vendor cloud, Bruno keeps everything in your Git repository. This means you review request changes in pull requests, merge them with standard Git tooling, and work fully offline with no account required.

### What is a .bru file?

A \`.bru\` file is Bruno's plain-text format for a single API request. It uses readable named blocks such as \`meta\`, \`get\` or \`post\`, \`headers\`, \`body:json\`, \`assert\`, and \`script\`. Because it is text, it diffs and merges cleanly in Git, so changes to an endpoint or assertion show up as ordinary reviewable lines in a pull request.

### How do I write assertions in Bruno?

Bruno offers two ways. The declarative \`assert\` block uses simple expressions like \`res.status: eq 200\` for common checks. For richer logic, a \`script:post-response\` block lets you write JavaScript with \`test()\` and Chai-style \`expect()\` assertions, accessing the response through a \`res\` object. Use the declarative block for simple checks and scripts only when you need real logic.

### How do I pass data between requests in Bruno?

In a post-response script, capture a value with \`bru.setVar("name", value)\`, for example saving an auth token or a created resource id. Later requests reference it as \`{{name}}\` in URLs, headers, or bodies, and Bruno substitutes the captured value. Because variables flow in sequence order, this turns a collection into an executable login-create-fetch-delete workflow.

### How do I keep secrets out of Git with Bruno?

Declare sensitive variable names in a \`vars:secret\` block inside your environment file. Bruno stores the actual values in a local store that you add to \`.gitignore\`, so the variable names are versioned for the whole team but the real passwords and tokens never get committed. In CI you inject the values with the \`--env-var\` flag from the secret store.

### Can Bruno run in a CI pipeline?

Yes. The \`@usebruno/cli\` package provides a \`bru run\` command that executes a collection headlessly, runs all assertions, and exits non-zero on failure. It supports JUnit and JSON reporters, a \`--bail\` flag, environment selection, and runtime variable injection, making it straightforward to gate pull requests in GitHub Actions or any other CI system.

### Is Bruno free to use?

Yes. Bruno is open source and free to use, including both the desktop application and the command-line runner. There are no per-seat fees because there is no cloud workspace to license. Some optional paid add-ons exist for advanced team features, but the core API testing workflow described in this guide is completely free.

### Does Bruno support GraphQL and other request types?

Yes. In addition to standard REST methods, Bruno supports GraphQL requests, where you write the query and variables directly in the \`.bru\` file. It also handles form data, file uploads, and different auth schemes such as bearer tokens, basic auth, and API keys, all expressed as readable blocks in the same plain-text format.

## Conclusion and Next Steps

Bruno reframes API testing as ordinary software engineering. By storing requests as plain-text \`.bru\` files in your Git repository, it lets you review API changes in pull requests, merge them with standard tooling, keep secrets off the network, and run everything offline. The authoring experience in the desktop app is familiar, the \`.bru\` format is simple enough to read at a glance, and the JavaScript scripting layer gives you full control over assertions and request chaining. The \`bru\` CLI then turns that same collection into a CI gate with a single command.

The adoption path is gentle. Start by importing or authoring a handful of requests, add declarative \`assert\` blocks, layer in a couple of \`tests\` scripts and a chained login flow, split your environments and secrets correctly, and finally wire \`bru run\` into your pipeline. Once your API tests live next to your code, they stay current, because updating them is part of the same commit that changes the API.

To round out your testing toolkit with ready-made skills for AI coding agents, including API client workflows, contract testing, and property-based fuzzing, explore the full catalog at [qaskills.sh/skills](/skills) and pull the ones your team needs straight into your agent setup.
`,
};
