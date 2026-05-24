import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Hoppscotch API Testing Complete Guide 2026',
  description:
    'Master Hoppscotch (Postman alternative) for API testing. REST, GraphQL, WebSocket, MQTT, collections, environments, CLI, team sync, and CI integration.',
  date: '2026-05-06',
  category: 'API Testing',
  content: `
# Hoppscotch API Testing Complete Guide 2026

Hoppscotch is a free, open source API development and testing platform that has emerged as a serious alternative to Postman. Launched in 2019 and originally called Postwoman, it has grown into a polished, browser-based tool with desktop apps for Mac, Windows, and Linux. Unlike Postman's increasingly cloud-locked workflow, Hoppscotch keeps your data local by default while offering optional sync via Hoppscotch Cloud or self-hosted instances. For teams that want a powerful API client without subscription fees or cloud lock-in, Hoppscotch is hard to beat.

This complete guide covers Hoppscotch in 2026: installation as web app, desktop app, or self-hosted; building REST, GraphQL, WebSocket, and MQTT requests; organizing requests into collections; managing environments with secrets; running tests inside requests; using the Hoppscotch CLI for CI; and team collaboration. Real examples show how to migrate from Postman, build a regression suite, and integrate with GitHub Actions. By the end you'll be ready to evaluate Hoppscotch for your team and migrate if it fits.

## Key Takeaways

- Hoppscotch is free, open source, and self-hostable
- Browser, desktop, and CLI versions
- Supports REST, GraphQL, WebSocket, MQTT, Server-Sent Events
- Collections and environments organize complex APIs
- Inline tests with JavaScript assertions
- Team sync via Hoppscotch Cloud or self-host
- Postman collection import for easy migration

---

## Getting Started

Web app at hoppscotch.io. No signup required for local use.

Desktop apps:

\`\`\`bash
# Mac
brew install --cask hoppscotch

# Windows/Linux
# Download from hoppscotch.io/downloads
\`\`\`

## Basic Request

1. Set method (GET, POST, etc.)
2. Enter URL
3. Add headers, query params, body as needed
4. Click Send

\`\`\`
GET https://api.example.com/users/42
Headers:
  Accept: application/json
\`\`\`

## Collections

Group requests by feature or service:

\`\`\`
Collections:
  Auth/
    Login
    Logout
    Refresh Token
  Users/
    Get All
    Get One
    Create
    Update
    Delete
  Orders/
    ...
\`\`\`

## Environments

Define variables per environment (dev, staging, prod):

\`\`\`json
{
  "base_url": "https://api.staging.example.com",
  "api_token": "<<TOKEN>>",
  "timeout": 30
}
\`\`\`

Use in requests with {{base_url}}/users syntax.

## Secrets

Mark sensitive values as secret (locked icon). They never leave your device or sync to cloud.

## REST Tests

Add tests in the Tests tab:

\`\`\`javascript
pw.test("Status is 200", () => {
  pw.expect(pw.response.status).toBe(200);
});

pw.test("Response has user ID", () => {
  pw.expect(pw.response.body.id).toBeType("number");
});

pw.test("Email is valid", () => {
  pw.expect(pw.response.body.email).toInclude("@");
});
\`\`\`

## Pre-Request Scripts

\`\`\`javascript
// Set dynamic Authorization header
pw.env.set("auth_token", "Bearer " + new Date().getTime());

// Read from previous response
pw.env.set("user_id", pw.response.body.id);
\`\`\`

## Chaining Requests

In a collection runner, requests run sequentially. Use pw.env.set to pass data between them:

\`\`\`javascript
// In Create User response Tests:
pw.test("Save user ID", () => {
  pw.env.set("new_user_id", pw.response.body.id);
});

// In Get User URL:
// {{base_url}}/users/{{new_user_id}}
\`\`\`

## GraphQL

Hoppscotch has a dedicated GraphQL tab with schema introspection:

\`\`\`graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}
\`\`\`

Variables:

\`\`\`json
{ "id": "42" }
\`\`\`

## WebSocket

\`\`\`
URL: wss://echo.websocket.org
\`\`\`

Click Connect. Send and receive messages in the chat-like UI.

## MQTT

Hoppscotch includes an MQTT client for IoT testing:

\`\`\`
Broker: tcp://broker.hivemq.com:1883
Topic: hoppscotch/test
\`\`\`

## Hoppscotch CLI

\`\`\`bash
npm install -g @hoppscotch/cli
hopp test collection.json --env environment.json
\`\`\`

Export your collection from the web UI, then run via CLI in CI:

\`\`\`yaml
name: API Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g @hoppscotch/cli
      - run: hopp test collections/regression.json --env envs/staging.json
        env:
          API_TOKEN: \${{ secrets.API_TOKEN }}
\`\`\`

## Self-Hosting

\`\`\`yaml
# docker-compose.yml
services:
  hoppscotch:
    image: hoppscotch/hoppscotch:latest
    ports: ['3000:3000']
    environment:
      - DATABASE_URL=postgresql://hopp:hopp@db/hopp
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: hopp
      POSTGRES_PASSWORD: hopp
      POSTGRES_DB: hopp
\`\`\`

Self-hosted gives full control over data and team collaboration.

## Postman Migration

Hoppscotch can import Postman collections:

1. Postman: Export collection as v2.1 JSON
2. Hoppscotch: Import → Postman Collection → upload JSON

Tests, environments, and request structure transfer cleanly. Some Postman-specific features (e.g., Postman libraries) may need manual conversion.

## Hoppscotch Cloud

The official hosted service offers:
- Team workspaces
- Real-time sync
- Shared environments
- Access controls
- Embedded request widgets

Pricing tiers from free to enterprise.

## Comparison To Alternatives

| Tool | Cost | Self-host | Open source | CLI |
|------|------|-----------|-------------|-----|
| Hoppscotch | Free + paid SaaS | Yes | Yes | Yes |
| Postman | Free tier + paid | No | No | Newman |
| Insomnia | Free + paid | Limited | Yes (Core) | Inso |
| Bruno | Free | Local files | Yes | Yes |
| HTTPie | Free | N/A | Yes | Native |

## Real Test Suite

Collection: Users API

\`\`\`json
{
  "name": "Users API",
  "folders": [
    {
      "name": "Auth",
      "requests": [
        {
          "name": "Login",
          "method": "POST",
          "url": "{{base_url}}/auth/login",
          "body": {
            "contentType": "application/json",
            "body": "{\\"email\\": \\"{{test_email}}\\", \\"password\\": \\"{{test_password}}\\"}"
          },
          "tests": "pw.test('Status 200', () => pw.expect(pw.response.status).toBe(200));\\npw.env.set('token', pw.response.body.access_token);"
        }
      ]
    },
    {
      "name": "Users",
      "requests": [
        {
          "name": "Get Profile",
          "method": "GET",
          "url": "{{base_url}}/me",
          "headers": [{"key": "Authorization", "value": "Bearer {{token}}"}],
          "tests": "pw.test('Status 200', () => pw.expect(pw.response.status).toBe(200));\\npw.test('Has email', () => pw.expect(pw.response.body.email).toBeType('string'));"
        }
      ]
    }
  ]
}
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Hardcoded URLs | Use environment vars |
| Secrets in collections | Use environment secrets |
| One mega collection | Split by domain |
| No tests | Add basic status/schema checks |
| Skipping CLI | Run in CI on every PR |

## Tips

- Use the Generate Code feature to copy requests as curl, Python, Node
- The interceptor extension lets you bypass CORS in the browser app
- Tabs allow multiple parallel requests in one window
- History records every recent request

## Embed In Documentation

Hoppscotch lets you generate embeddable request widgets for your API docs:

\`\`\`html
<iframe src="https://hoppscotch.io/embed/req/abc123"></iframe>
\`\`\`

Readers can edit and run the request directly from the docs page.

## CI Integration Details

\`\`\`yaml
name: Hoppscotch Tests
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'

jobs:
  smoke:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g @hoppscotch/cli
      - run: hopp test collections/smoke.json --env envs/staging.json

  full:
    if: github.event_name == 'push' || github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g @hoppscotch/cli
      - run: hopp test collections/regression.json --env envs/staging.json
        env:
          API_TOKEN: \${{ secrets.API_TOKEN }}
\`\`\`

## Team Workflow

A 15-person engineering team:

1. Each developer runs Hoppscotch locally
2. Collections committed to a shared repo
3. Environments per-engineer (with personal API keys)
4. Shared base environment file for URLs and shared secrets
5. CI runs the CLI against staging on every PR
6. Self-hosted Hoppscotch instance for cross-team collaboration

## Conclusion

Hoppscotch hits a sweet spot in the API tooling landscape: full-featured enough to replace Postman, free and open source, and self-hostable for teams that need data sovereignty. The CLI makes it CI-friendly, the collection format is portable, and the active development cadence ensures new features keep arriving. For teams looking to escape Postman's pricing or cloud lock-in, Hoppscotch is the obvious migration target.

Start by importing one of your existing Postman collections. Run a few requests, add some tests, and try the CLI. If it works for your workflow, expand to your full API surface. Visit our [skills directory](/skills) or the [Postman guide](/blog/postman-api-testing-guide) for comparison.
`,
};
