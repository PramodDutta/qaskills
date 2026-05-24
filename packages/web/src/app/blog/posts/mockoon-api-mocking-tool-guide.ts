import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mockoon API Mocking Tool Complete Guide 2026',
  description:
    'Create API mocks visually with Mockoon. Free GUI mock server, routes, templating, OpenAPI import/export, Docker deployment, and CI integration patterns.',
  date: '2026-05-21',
  category: 'API Testing',
  content: `
# Mockoon API Mocking Tool Complete Guide 2026

Mockoon is the easiest way to mock HTTP APIs - a free, open source desktop application that lets you create realistic mock servers in seconds. Unlike code-based tools that require Java or Node setup, Mockoon ships as a polished cross-platform GUI where you build routes, define responses, configure templating, and start a local server with a few clicks. For QA engineers, frontend developers, and anyone who needs a quick mock without writing code, Mockoon is unbeatable. It also includes a CLI for headless CI/CD usage, Docker images for deployment, and OpenAPI import/export for contract-driven workflows.

This complete guide covers Mockoon in 2026: installation, the GUI workflow, route definition, response templating, OpenAPI import, the CLI for CI integration, Docker deployment, and real-world patterns for using it across dev/QA/CI environments. Code examples show how to drive Mockoon from test runners and how to keep mocks in sync with your real API. By the end you'll be ready to replace ad-hoc mocking with a polished Mockoon-based workflow.

## Key Takeaways

- Mockoon is a free GUI mock server, no code required
- Cross-platform: macOS, Windows, Linux
- Built-in templating with Faker.js for realistic data
- OpenAPI import/export for spec-driven mocking
- CLI and Docker for headless CI integration
- Cloud sync (paid) for team collaboration
- Best for quick prototyping and non-engineer mocking

---

## Installation

Download from mockoon.com or:

\`\`\`bash
# Mac
brew install --cask mockoon

# Linux/Windows
# Download installer from mockoon.com
\`\`\`

## CLI

\`\`\`bash
npm install -g @mockoon/cli
mockoon-cli start --data ./mock-data.json --port 3000
\`\`\`

## Docker

\`\`\`bash
docker run -p 3000:3000 -v $(pwd)/data.json:/data/data.json mockoon/cli:latest --data /data/data.json
\`\`\`

## Creating Your First Mock

In the GUI:
1. Click "Create new environment"
2. Set port (default 3000) and host (localhost)
3. Click "Add route"
4. Set method (GET), path (/users)
5. Set status code (200) and body
6. Click "Start server"

Now \`curl http://localhost:3000/users\` returns your response.

## Routes

| Field | Purpose |
|-------|---------|
| Method | GET, POST, PUT, DELETE, etc. |
| Path | Can include path params like /users/:id |
| Status | HTTP response code |
| Body | Response body (JSON, XML, text, file) |
| Headers | Custom response headers |
| Latency | Simulate slow responses |

## Response Templating

Mockoon supports Handlebars templating with Faker.js:

\`\`\`json
{
  "id": "{{faker 'string.uuid'}}",
  "name": "{{faker 'person.fullName'}}",
  "email": "{{faker 'internet.email'}}",
  "created_at": "{{now 'iso'}}"
}
\`\`\`

Every request to this route returns a different user.

## Path Parameters

Path: \`/users/:id\`

Response:

\`\`\`json
{
  "id": "{{urlParam 'id'}}",
  "name": "User {{urlParam 'id'}}"
}
\`\`\`

GET /users/42 returns \`{"id": "42", "name": "User 42"}\`.

## Query Parameters

\`\`\`json
{
  "query": "{{queryParam 'q'}}",
  "limit": "{{queryParam 'limit'}}",
  "results": []
}
\`\`\`

GET /search?q=foo&limit=10 returns \`{"query": "foo", "limit": "10", "results": []}\`.

## Body Templating

For POST endpoints, echo back the request body:

\`\`\`json
{
  "id": "{{faker 'string.uuid'}}",
  "received": {{body}}
}
\`\`\`

## Multiple Responses Per Route

Add multiple responses to a single route and configure rules. For example:

- If query param 'sad'=true: return 500
- If header 'X-Test-User'='admin': return special response
- Otherwise: return default

## Random Data Generation

Built-in Faker.js generates realistic mock data:

| Helper | Example |
|--------|---------|
| {{faker 'person.fullName'}} | Alice Johnson |
| {{faker 'internet.email'}} | alice@example.com |
| {{faker 'lorem.paragraph'}} | Lorem ipsum... |
| {{faker 'number.int' min=1 max=100}} | 42 |
| {{faker 'date.past'}} | 2024-03-15 |
| {{faker 'image.url'}} | URL string |
| {{repeat 5}}...{{/repeat}} | Repeat block 5 times |

## OpenAPI Import

Mockoon can import OpenAPI 3 specs to auto-generate routes:

1. File → Import OpenAPI
2. Select your openapi.yaml
3. Mockoon creates one route per endpoint with example responses

Conversely, you can export your Mockoon environment back to OpenAPI.

## Proxy Mode

Configure Mockoon to forward unmatched requests to a real upstream:

1. Settings → Proxy mode → ON
2. Set proxy URL: https://real-api.example.com
3. Now requests to defined routes return mocks, others proxy through

## Latency Simulation

Per route, set latency in ms. Useful for testing loading states and timeouts:

\`\`\`
Route /users
Latency: 2000ms
\`\`\`

\`curl http://localhost:3000/users\` takes 2 seconds.

## File Responses

For binary data, point a route's body to a file:

\`\`\`
Body type: File
File path: /path/to/avatar.png
\`\`\`

## CORS

Mockoon enables CORS by default. To customize:

- Settings → CORS → allow specific origins

## Headers

Add custom response headers per route:

- Cache-Control: no-cache
- X-RateLimit-Remaining: 100
- Set-Cookie: session=abc123

## Data Bucket

Mockoon supports "data buckets" - shared response data referenced across routes:

\`\`\`json
// Bucket: users
[
  {"id": 1, "name": "Alice"},
  {"id": 2, "name": "Bob"}
]
\`\`\`

Then a route's body:

\`\`\`
{{data 'users'}}
\`\`\`

## CLI Workflows

\`\`\`bash
# Start headless
mockoon-cli start --data ./environment.json --port 3000

# Multiple environments
mockoon-cli start --data ./users.json --data ./orders.json --port 3000,3001

# List running
mockoon-cli list

# Stop
mockoon-cli stop my-env
\`\`\`

## Docker Deployment

\`\`\`yaml
# docker-compose.yml
services:
  mockoon:
    image: mockoon/cli:latest
    command: --data /data/api.json --port 3000
    ports: ['3000:3000']
    volumes:
      - ./api.json:/data/api.json
\`\`\`

## CI Integration

\`\`\`yaml
name: Integration Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mockoon:
        image: mockoon/cli:latest
        ports: ['3000:3000']
        volumes:
          - $GITHUB_WORKSPACE/mocks/api.json:/data/api.json
        options: --health-cmd "wget -qO- http://localhost:3000/__health || exit 1"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
        env:
          MOCK_API_URL: http://localhost:3000
\`\`\`

## Real Workflow Example

A frontend team building a React app:

1. Backend team publishes openapi.yaml in the contract repo
2. Frontend imports it into Mockoon
3. Frontend customizes example responses with realistic Faker data
4. Frontend exports the .json environment to the repo
5. Frontend tests run against mockoon-cli pointed at the .json
6. Integration tests in CI use the same .json via Docker

This decouples frontend from backend availability without compromising contract fidelity.

## Comparison To Alternatives

| Tool | GUI | OpenAPI | CLI | Free |
|------|-----|---------|-----|------|
| Mockoon | Yes | Import/Export | Yes | Yes |
| WireMock | No | Limited | Yes | Yes |
| Postman Mocks | Cloud only | Yes | No | Limited free |
| Prism | No | Yes (CLI-driven) | Yes | Yes |
| MSW | No | No | N/A | Yes |

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Mocks that drift from real API | Regenerate from OpenAPI |
| Hardcoded test data | Use Faker for variety |
| Forgetting to commit data.json | Treat as source of truth |
| Running GUI in CI | Use mockoon-cli or Docker |
| One huge environment | Split by domain |

## Limitations

Mockoon does not include:

- Contract testing (use Pact)
- Stateful scenarios (limited compared to WireMock)
- Recording real traffic (have to manually build mocks)
- High-throughput simulation (single-process Node)

For these scenarios, combine Mockoon with other tools or use a more specialized solution.

## Real Test Suite Using Mockoon

\`\`\`javascript
// jest test against mockoon-cli on port 3000
const axios = require('axios');

const API_URL = process.env.MOCK_API_URL || 'http://localhost:3000';

describe('User API integration', () => {
  it('GET /users returns array', async () => {
    const res = await axios.get(\`\${API_URL}/users\`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('GET /users/42 returns user with id', async () => {
    const res = await axios.get(\`\${API_URL}/users/42\`);
    expect(res.status).toBe(200);
    expect(res.data.id).toBe('42');
  });

  it('POST /users echoes body', async () => {
    const res = await axios.post(\`\${API_URL}/users\`, {
      name: 'Test',
    });
    expect(res.status).toBe(201);
    expect(res.data.received.name).toBe('Test');
  });

  it('GET /slow takes 2+ seconds', async () => {
    const start = Date.now();
    await axios.get(\`\${API_URL}/slow\`);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThan(1900);
  });
});
\`\`\`

## CLI Helpful Commands

\`\`\`bash
# Start
mockoon-cli start -d data.json -p 3000

# Logs
mockoon-cli logs -i 0 --tail

# Migration of older versions
mockoon-cli migrate -d old.json -o new.json

# Validate
mockoon-cli dry-run -d data.json
\`\`\`

## Team Workflow

For a 10-person team building a microservices product:

| Step | Tool |
|------|------|
| Define API | OpenAPI 3 spec in shared repo |
| Generate mock | Mockoon import OpenAPI |
| Customize examples | Mockoon GUI + Faker |
| Commit to repo | Mockoon export environment.json |
| Local dev | Run Mockoon desktop pointing at environment.json |
| CI tests | mockoon-cli via Docker |
| Deploy mock | Mockoon Cloud or self-host |

## Conclusion

Mockoon hits a sweet spot in the API mocking space: powerful enough for serious use, simple enough that anyone can pick it up in 15 minutes. The combination of GUI, CLI, and Docker means it works for solo devs, full QA teams, and CI pipelines alike. While not as feature-rich as WireMock for complex scenarios, it covers 90% of mocking needs with far less friction.

Start by mocking one endpoint your frontend depends on. Replace the real API URL with localhost:3000 during development. Once you're comfortable, expand to a full environment and add the CLI to your CI pipeline. Visit our [skills directory](/skills) or the [WireMock guide](/blog/wiremock-api-mocking-complete-guide) for related tools.
`,
};
