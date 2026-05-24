import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SuperTest Node.js API Testing Complete Guide 2026',
  description:
    'Complete guide to SuperTest for Node.js API testing. Setup with Jest, Express, Fastify, authentication, JSON validation, mocking, and CI integration patterns.',
  date: '2026-05-18',
  category: 'API Testing',
  content: `
# SuperTest Node.js API Testing Complete Guide 2026

SuperTest is the de facto standard library for HTTP integration testing in the Node.js ecosystem. Built on top of superagent, it lets you write fluent, expressive tests against any Node.js HTTP server - Express, Fastify, NestJS, Koa, or a plain http.createServer instance. Rather than spinning up the server on a network port and making external HTTP calls, SuperTest can drive your app directly in the same process, eliminating network flakiness and making tests blazingly fast. Combined with Jest or Mocha and a JSON Schema validator, SuperTest forms the backbone of robust API test suites for thousands of Node.js teams.

This complete guide covers every aspect of SuperTest in 2026: installation alongside Jest, Express and Fastify integration, request and response patterns, authentication (basic, bearer, OAuth, cookies), JSON validation, file uploads, contract testing with OpenAPI, mocking external services, parallel execution, and CI integration. Real code examples cover a full SaaS API test suite. By the end you'll be ready to write production-grade API tests for your Node.js services.

## Key Takeaways

- SuperTest drives Node HTTP servers in-process - no network calls
- Works with Express, Fastify, NestJS, Koa, plain http
- Pairs naturally with Jest, Mocha, Vitest
- Fluent .post(), .get(), .send(), .expect() chains
- Handles cookies, redirects, and auth automatically
- Built-in assertion shortcuts for status, headers, body
- Faster than tests that hit a real network port

---

## Installation

\`\`\`bash
npm install --save-dev supertest @types/supertest jest
\`\`\`

## Basic Test With Express

\`\`\`javascript
// app.js
const express = require('express');
const app = express();
app.use(express.json());

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
});

module.exports = app;
\`\`\`

\`\`\`javascript
// app.test.js
const request = require('supertest');
const app = require('./app');

describe('GET /users/:id', () => {
  it('returns user data', async () => {
    const response = await request(app).get('/users/42');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '42', name: 'Alice' });
  });
});
\`\`\`

Notice we pass app directly to request() - no need to listen on a port.

## Fluent Chains

\`\`\`javascript
it('chained assertions', async () => {
  await request(app)
    .post('/users')
    .send({ name: 'Bob', email: 'bob@example.com' })
    .set('Content-Type', 'application/json')
    .expect(201)
    .expect('Content-Type', /json/)
    .expect((res) => {
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Bob');
    });
});
\`\`\`

## HTTP Methods

\`\`\`javascript
await request(app).get('/users');
await request(app).post('/users').send({ name: 'Alice' });
await request(app).put('/users/1').send({ name: 'Alice Updated' });
await request(app).patch('/users/1').send({ name: 'A' });
await request(app).delete('/users/1');
\`\`\`

## Query Parameters

\`\`\`javascript
await request(app)
  .get('/users')
  .query({ limit: 10, sort: 'name' })
  .expect(200);
\`\`\`

## Headers

\`\`\`javascript
await request(app)
  .get('/me')
  .set('Authorization', 'Bearer ' + token)
  .set('X-API-Key', 'secret')
  .expect(200);
\`\`\`

## Authentication

### Basic Auth

\`\`\`javascript
await request(app)
  .get('/admin')
  .auth('user', 'pass')
  .expect(200);
\`\`\`

### Bearer Token

\`\`\`javascript
async function loginAndGetToken() {
  const response = await request(app)
    .post('/auth/login')
    .send({ email: 'test@example.com', password: 'secret' });
  return response.body.access_token;
}

it('uses bearer token', async () => {
  const token = await loginAndGetToken();
  await request(app)
    .get('/me')
    .set('Authorization', \`Bearer \${token}\`)
    .expect(200);
});
\`\`\`

### Cookies

\`\`\`javascript
const agent = request.agent(app);

await agent
  .post('/login')
  .send({ email: 'test@example.com', password: 'secret' })
  .expect(200);

await agent
  .get('/dashboard')
  .expect(200);
\`\`\`

The agent persists cookies across requests.

## File Upload

\`\`\`javascript
await request(app)
  .post('/uploads')
  .attach('file', '/tmp/test.csv')
  .field('description', 'test data')
  .expect(201);
\`\`\`

## JSON Schema Validation

\`\`\`bash
npm install --save-dev ajv ajv-formats
\`\`\`

\`\`\`javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv();
addFormats(ajv);

const userSchema = {
  type: 'object',
  required: ['id', 'name', 'email'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
  },
};

it('response matches schema', async () => {
  const response = await request(app).get('/users/1').expect(200);
  const validate = ajv.compile(userSchema);
  expect(validate(response.body)).toBe(true);
});
\`\`\`

## Setup And Teardown

\`\`\`javascript
const request = require('supertest');
const app = require('./app');
const { sequelize } = require('./db');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await sequelize.truncate({ cascade: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Users API', () => {
  it('creates user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@example.com' });
    expect(res.status).toBe(201);
  });
});
\`\`\`

## Mocking External Services

Combined with nock:

\`\`\`bash
npm install --save-dev nock
\`\`\`

\`\`\`javascript
const nock = require('nock');

beforeEach(() => {
  nock('https://payment.example.com')
    .post('/charge')
    .reply(200, { status: 'paid' });
});

afterEach(() => nock.cleanAll());

it('charges card via external service', async () => {
  const res = await request(app)
    .post('/orders/1/pay')
    .send({ card: '4242' });
  expect(res.status).toBe(200);
});
\`\`\`

## Fastify

\`\`\`javascript
// fastify-app.js
const fastify = require('fastify')();

fastify.get('/users/:id', async (req) => {
  return { id: req.params.id, name: 'Alice' };
});

module.exports = fastify;
\`\`\`

\`\`\`javascript
// test.js
const request = require('supertest');
const fastify = require('./fastify-app');

beforeAll(async () => fastify.ready());
afterAll(async () => fastify.close());

it('gets user', async () => {
  const res = await request(fastify.server).get('/users/1');
  expect(res.status).toBe(200);
});
\`\`\`

## NestJS

\`\`\`typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /users', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200);
  });
});
\`\`\`

## Contract Testing With OpenAPI

\`\`\`bash
npm install --save-dev jest-openapi
\`\`\`

\`\`\`javascript
const jestOpenAPI = require('jest-openapi').default;
const path = require('path');

jestOpenAPI(path.resolve(__dirname, './openapi.yaml'));

it('response satisfies OpenAPI spec', async () => {
  const res = await request(app).get('/users/1');
  expect(res).toSatisfyApiSpec();
});
\`\`\`

This checks the response against the documented OpenAPI schema.

## Performance Patterns

| Pattern | Benefit |
|---------|---------|
| Pass app directly (no .listen) | No port allocation |
| One beforeAll per file | Avoid repeated init |
| Use agent for cookie flows | Implicit auth |
| Mock external services | Deterministic + fast |
| Parallel test files | Jest runs in workers |

## Parallel Execution

Jest runs test files in parallel by default. To control:

\`\`\`json
{
  "jest": {
    "maxWorkers": "50%"
  }
}
\`\`\`

For tests that share state, use --runInBand:

\`\`\`bash
jest --runInBand
\`\`\`

## Real Suite Example

\`\`\`javascript
const request = require('supertest');
const app = require('../app');
const { sequelize, User } = require('../db');

describe('Users API', () => {
  let token;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await User.create({
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
    });
    const res = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'secret',
    });
    token = res.body.access_token;
  });

  afterAll(async () => sequelize.close());

  describe('GET /users', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/users');
      expect(res.status).toBe(401);
    });

    it('returns user list with auth', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', \`Bearer \${token}\`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /users', () => {
    it('creates user with valid data', async () => {
      const res = await request(app)
        .post('/users')
        .set('Authorization', \`Bearer \${token}\`)
        .send({ name: 'Alice', email: 'alice@example.com' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });

    it('returns 400 on invalid email', async () => {
      const res = await request(app)
        .post('/users')
        .set('Authorization', \`Bearer \${token}\`)
        .send({ name: 'Alice', email: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('returns 409 on duplicate email', async () => {
      const res = await request(app)
        .post('/users')
        .set('Authorization', \`Bearer \${token}\`)
        .send({ name: 'Test', email: 'test@example.com' });
      expect(res.status).toBe(409);
    });
  });
});
\`\`\`

## CI Integration

\`\`\`yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Spinning up real server | Pass app directly |
| Hitting external APIs | Mock with nock |
| Shared test data | Per-test fixtures |
| No cleanup | beforeEach truncate |
| Hardcoded base URL | Pass app, no URL needed |

## Comparison

| Tool | Speed | Setup | Best For |
|------|-------|-------|----------|
| SuperTest | Fastest | Easy | Express/Fastify in-process |
| Axios + Jest | Medium | Easy | External API tests |
| Postman/Newman | Slow | Manual | Smoke + manual reuse |
| RestAssured (Java) | Medium | More setup | Java backends |

## Debugging

When a test fails:

\`\`\`javascript
it('debugging example', async () => {
  const res = await request(app).get('/users/42');
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  console.log('Headers:', res.headers);
  expect(res.status).toBe(200);
});
\`\`\`

Or use Jest --verbose mode.

## Conclusion

SuperTest is the right default for Node.js API testing. Its in-process model eliminates network flakiness, the fluent chain syntax is concise, and the ecosystem support is excellent across Express, Fastify, NestJS, and Koa. Combined with Jest, a JSON Schema validator, and nock for mocking, you have a complete API testing toolkit in a few npm packages.

Start by adding a single SuperTest file to your project. Test one endpoint with multiple scenarios - happy path, error cases, edge cases. Layer in shared setup, schema validation, and mocks. Within a sprint you'll have a fast, reliable API test suite. Explore our [skills directory](/skills) or the [API testing complete guide](/blog/api-testing-complete-guide) for broader patterns.
`,
};
