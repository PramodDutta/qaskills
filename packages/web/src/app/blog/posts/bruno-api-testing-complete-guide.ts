import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bruno API Testing Complete Guide 2026',
  description:
    'Git-friendly API testing with Bruno. Collections in plain text, no cloud lock-in, CLI for CI, environments, scripts, assertions, and team workflows.',
  date: '2026-05-08',
  category: 'API Testing',
  content: `
# Bruno API Testing Complete Guide 2026

Bruno is the newest serious entrant in the API client space, and its core differentiator is radically simple: collections are stored as plain text files in your filesystem, not in a cloud database. This means your API tests live in the same Git repository as your code, get reviewed in PRs, follow your existing version control workflow, and never get held hostage by a vendor's subscription model. For teams burned by Postman's pricing changes or cloud lock-in, Bruno is the natural escape hatch.

This complete guide covers Bruno in 2026: installation, the Bru file format for collections and environments, building REST and GraphQL requests, writing scripts and assertions, using the CLI for CI/CD integration, team collaboration via Git, and migrating from Postman. Real code examples cover a full regression suite for a SaaS API. By the end you'll be ready to evaluate Bruno and roll it out across your team.

## Key Takeaways

- Bruno stores collections as plain text files (.bru format)
- Designed for Git-first workflows
- Free and open source - no subscription
- Built-in CLI for CI integration
- Supports REST, GraphQL, OAuth 2.0
- Scripts in JavaScript with Bru API
- Strong Postman import support

---

## Installation

\`\`\`bash
# Mac
brew install bruno

# Windows
# Download from usebruno.com

# Linux: AppImage or snap from usebruno.com
\`\`\`

## CLI

\`\`\`bash
npm install -g @usebruno/cli
\`\`\`

## Collection Structure

Bruno collections are directories with .bru files:

\`\`\`
my-api/
  bruno.json
  environments/
    staging.bru
    production.bru
  collection.bru
  Auth/
    login.bru
    refresh.bru
  Users/
    get-profile.bru
    update-profile.bru
\`\`\`

## Bru File Format

\`\`\`
meta {
  name: Get User
  type: http
  seq: 1
}

get {
  url: {{base_url}}/users/{{user_id}}
  body: none
  auth: none
}

headers {
  Accept: application/json
  Authorization: Bearer {{token}}
}

tests {
  test("Status 200", function() {
    expect(res.status).to.equal(200);
  });

  test("Response has id", function() {
    expect(res.body).to.have.property('id');
  });
}
\`\`\`

The format is intentionally human-readable and Git-friendly.

## Variables

Set globally per environment file:

\`\`\`
# environments/staging.bru
vars {
  base_url: https://api.staging.example.com
  test_user_email: test@example.com
}

vars:secret {
  api_token: <secret>
  test_password: <secret>
}
\`\`\`

Variables marked as :secret aren't checked into git.

## Authentication

Bearer Token:

\`\`\`
auth:bearer {
  token: {{token}}
}
\`\`\`

OAuth 2.0:

\`\`\`
auth:oauth2 {
  grant_type: client_credentials
  access_token_url: {{base_url}}/oauth/token
  client_id: {{client_id}}
  client_secret: {{client_secret}}
  scope: read write
}
\`\`\`

## POST Request

\`\`\`
meta {
  name: Create User
  type: http
  seq: 2
}

post {
  url: {{base_url}}/users
  body: json
}

headers {
  Content-Type: application/json
}

body:json {
  {
    "name": "Alice",
    "email": "alice@example.com"
  }
}

tests {
  test("Status 201", () => {
    expect(res.status).to.equal(201);
  });

  test("Returns user ID", () => {
    expect(res.body.id).to.be.a('number');
    bru.setEnvVar("created_user_id", res.body.id);
  });
}
\`\`\`

## Scripts

Pre-request:

\`\`\`
script:pre-request {
  const now = new Date().toISOString();
  bru.setVar("request_time", now);
}
\`\`\`

Post-response:

\`\`\`
script:post-response {
  console.log("Response time:", res.responseTime);
}
\`\`\`

## GraphQL

\`\`\`
post {
  url: {{base_url}}/graphql
  body: graphql
}

body:graphql {
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
}

body:graphql:vars {
  {
    "id": "42"
  }
}
\`\`\`

## Asserts

Bruno supports declarative asserts alongside JS tests:

\`\`\`
asserts {
  res.status: eq 200
  res.body.id: isNumber
  res.body.email: matches .+@.+
  res.responseTime: lt 500
}
\`\`\`

## CLI Usage

\`\`\`bash
# Run a single request
bru run Users/get-profile.bru --env staging

# Run a folder
bru run Users --env staging

# Run the whole collection
bru run --env staging

# With reporting
bru run --env staging --reporter-junit results.xml
bru run --env staging --reporter-html report.html
\`\`\`

## CI Integration

\`\`\`yaml
name: API Tests with Bruno
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g @usebruno/cli
      - run: bru run --env staging --reporter-junit results.xml
        env:
          API_TOKEN: \${{ secrets.API_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: bruno-results
          path: results.xml
\`\`\`

## Git Workflow

Bruno's killer feature is Git integration:

1. Engineer A adds a new request, commits the .bru file
2. PR opens with the new test
3. Reviewer reads the .bru file (it's plain text!) and comments
4. CI runs Bruno CLI to verify the test passes
5. Merge, and the test is now part of the suite

No more "I forgot to share my Postman collection" or "let me grant you cloud access."

## Postman Migration

Bruno can import Postman v2.1 collections:

1. Open Bruno
2. Import → Postman Collection → upload JSON
3. Bruno generates .bru files

Most features migrate cleanly. Some Postman-specific features (e.g., complex pre-request loops, libraries) need rewriting.

## Comparison

| Tool | Storage | Lock-in | CLI | Open Source |
|------|---------|---------|-----|------------|
| Bruno | Local files (git) | None | Yes | Yes |
| Postman | Cloud | High | Newman | No |
| Insomnia | Local + cloud | Medium | Inso | Core only |
| Hoppscotch | Local + cloud | Low | Yes | Yes |

## Performance Patterns

| Pattern | Benefit |
|---------|---------|
| Folder-level CI runs | Selective testing |
| Environment files in git | Reviewable changes |
| Secrets vault outside git | Security |
| Bru file linting in CI | Catch syntax errors |

## Real Suite Example

\`\`\`
api-tests/
  bruno.json
  environments/
    staging.bru
    production.bru
  collection.bru
  Auth/
    login.bru
    refresh.bru
    logout.bru
  Users/
    list-users.bru
    get-user.bru
    create-user.bru
    update-user.bru
    delete-user.bru
  Orders/
    list-orders.bru
    create-order.bru
    cancel-order.bru
\`\`\`

login.bru:

\`\`\`
meta {
  name: Login
  type: http
  seq: 1
}

post {
  url: {{base_url}}/auth/login
  body: json
}

body:json {
  {
    "email": "{{test_email}}",
    "password": "{{test_password}}"
  }
}

tests {
  test("Status 200", () => expect(res.status).to.equal(200));

  test("Save token", () => {
    expect(res.body.access_token).to.be.a('string');
    bru.setEnvVar("token", res.body.access_token);
  });
}
\`\`\`

get-user.bru:

\`\`\`
meta {
  name: Get User
  type: http
  seq: 2
}

get {
  url: {{base_url}}/users/{{user_id}}
}

headers {
  Authorization: Bearer {{token}}
}

asserts {
  res.status: eq 200
  res.body.id: isNumber
  res.body.email: matches .+@.+
  res.responseTime: lt 500
}
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Committing secrets | Use :secret variables |
| One mega collection.bru | Split into folders |
| No CI integration | Run CLI in CI |
| Skipping Postman migration | Import then refactor |
| Hardcoded URLs in requests | Use environment vars |

## Authentication Methods

| Method | Support |
|--------|---------|
| Basic | Yes |
| Bearer | Yes |
| OAuth 2.0 | Yes (most flows) |
| API Key | Yes (header or query) |
| AWS Sigv4 | Limited |
| Digest | Yes |
| Custom | Scripts |

## Team Workflow

A 30-person backend team:

1. All API tests live in api-tests/ in the main repo
2. Each developer runs Bruno locally
3. Environment files for dev, staging, prod (without secrets)
4. CI runs Bruno CLI on every PR
5. Secrets injected via CI secrets
6. PR reviews include .bru file changes

## Anti-Postman Sentiment

Bruno was created in part as a reaction to Postman's 2023 pricing changes and increasing cloud focus. The community has embraced this:
- 20k+ GitHub stars
- Active Discord/Slack communities
- Plugin ecosystem growing
- Multiple paid platforms now offer "import from Bruno"

For teams seeking sovereignty over their API tests, Bruno is the strongest open source choice.

## Tips

- Use folder-level scripts for shared logic
- Lint .bru files before commit
- Use vars:secret for any sensitive value
- Folder ordering reflects logical test flow
- CLI exit codes integrate with any CI

## Conclusion

Bruno represents a different philosophy of API tooling: your tests are part of your codebase, not a separate cloud service. By committing to plain text files and Git-native workflows, Bruno eliminates entire categories of problems - lost collections, expired cloud licenses, sync conflicts, vendor lock-in - while still providing a polished UI for day-to-day work. For teams that value sovereignty over their tooling, it's the clear choice.

Start by importing a single Postman collection. Convert one workflow to Bruno. Run the CLI in CI. Within a sprint you'll know whether the Git-first model fits your team. Visit our [skills directory](/skills) or the [Postman API testing guide](/blog/postman-api-testing-guide) for comparison.
`,
};
