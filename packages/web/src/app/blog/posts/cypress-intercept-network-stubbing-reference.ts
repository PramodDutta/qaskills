import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress cy.intercept Network Stubbing: Complete Reference 2026',
  description:
    'Complete reference for Cypress cy.intercept in 2026. Stubbing, spying, fixtures, dynamic responses, request modification, waiting, and best practices.',
  date: '2026-05-17',
  category: 'Reference',
  content: `
# Cypress cy.intercept Network Stubbing: Complete Reference 2026

\`cy.intercept\` is Cypress's network interception API. It replaced the older \`cy.server\` and \`cy.route\` in Cypress 6 and has continued to gain capabilities through 2026. Used well, it is one of the strongest tools in the Cypress toolkit: you can spy on requests, stub responses, modify request bodies, mock entire APIs, simulate latency, force errors, and test edge cases that would be impossible to reach with a real backend.

This reference is the complete 2026 guide to \`cy.intercept\`. We cover the API surface, stubbing vs spying, fixture loading, dynamic responses, request modification, response modification, waiting and aliasing, request matchers, edge cases, common patterns, and best practices distilled from running real Cypress suites.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Mental model

\`cy.intercept\` is a proxy that sits between the browser and the network. Every outbound request from the application under test passes through Cypress, which checks for matching intercept registrations. If a match is found, Cypress can stub the response (return a canned body), modify the request, modify the response, or simply pass through.

The API has two forms:

\`\`\`typescript
// Stubbing: provide a response directly
cy.intercept('GET', '/api/users', { users: [] });

// Spying: provide a handler function that decides what to do
cy.intercept('GET', '/api/users', (req) => {
  req.continue((res) => {
    res.body.users = res.body.users.filter(u => u.active);
  });
});
\`\`\`

## Basic patterns

### Spy on a request

\`\`\`typescript
cy.intercept('GET', '/api/users').as('getUsers');
cy.visit('/users');
cy.wait('@getUsers').its('response.statusCode').should('eq', 200);
\`\`\`

### Stub with an inline body

\`\`\`typescript
cy.intercept('GET', '/api/users', { users: [{ id: 1, name: 'Alice' }] });
cy.visit('/users');
cy.contains('Alice').should('be.visible');
\`\`\`

### Stub with a fixture

\`\`\`typescript
cy.intercept('GET', '/api/users', { fixture: 'users.json' });
cy.visit('/users');
\`\`\`

\`fixture: 'users.json'\` loads the file from \`cypress/fixtures/users.json\` and uses it as the response body.

### Stub with status code

\`\`\`typescript
cy.intercept('GET', '/api/users', { statusCode: 500, body: { error: 'Server error' } });
\`\`\`

### Stub with delay and throttle

\`\`\`typescript
cy.intercept('GET', '/api/users', {
  body: { users: [] },
  delay: 1000,        // 1 second delay before response
  throttleKbps: 56,   // simulate slow connection
});
\`\`\`

## Request matchers

The second argument can be a URL string, a regex, or a route matcher object.

| Matcher | Example | Notes |
|---|---|---|
| String URL | \`'/api/users'\` | Glob patterns supported |
| Regex | \`/\\/api\\/users\\?.*/\` | Full regex matching |
| Method + URL | \`'GET', '/api/users'\` | Two-arg form |
| Route matcher | \`{ method: 'POST', url: '/api/users', query: { active: 'true' } }\` | Object form |

The object form supports: \`method\`, \`url\`, \`hostname\`, \`pathname\`, \`query\`, \`headers\`, \`auth\`, \`https\`, \`port\`, \`middleware\`, \`times\`.

\`\`\`typescript
cy.intercept({
  method: 'POST',
  url: '/api/users',
  headers: { 'content-type': 'application/json' },
  times: 1, // match only the first request
}, { id: 1, name: 'New User' });
\`\`\`

## Dynamic responses

Use a handler function to inspect the request and return a dynamic response.

\`\`\`typescript
cy.intercept('GET', '/api/users*', (req) => {
  const url = new URL(req.url);
  const active = url.searchParams.get('active') === 'true';
  req.reply({
    users: active
      ? [{ id: 1, name: 'Alice', active: true }]
      : [{ id: 2, name: 'Bob', active: false }],
  });
});
\`\`\`

The handler receives a \`req\` object with \`method\`, \`url\`, \`headers\`, \`body\`, \`query\`, and several methods: \`reply\`, \`continue\`, \`destroy\`, \`redirect\`.

## Request modification

To modify a request before forwarding it to the real server:

\`\`\`typescript
cy.intercept('POST', '/api/users', (req) => {
  req.body = { ...req.body, source: 'cypress' };
  req.continue();
});
\`\`\`

Or to add a header:

\`\`\`typescript
cy.intercept('GET', '/api/**', (req) => {
  req.headers['x-trace-id'] = 'test-' + Date.now();
});
\`\`\`

## Response modification

To intercept the real response and modify it:

\`\`\`typescript
cy.intercept('GET', '/api/users', (req) => {
  req.continue((res) => {
    res.body.users = res.body.users.filter((u) => u.active);
  });
});
\`\`\`

\`req.continue\` forwards the request and gives you a chance to modify the response before it reaches the browser.

## Aliasing and waiting

\`.as('alias')\` names a request for later assertion or waiting.

\`\`\`typescript
cy.intercept('GET', '/api/users').as('getUsers');
cy.visit('/users');
cy.wait('@getUsers');
cy.get('@getUsers').its('response.body.users').should('have.length.gt', 0);
\`\`\`

To wait for multiple requests:

\`\`\`typescript
cy.wait(['@getUsers', '@getPermissions']);
\`\`\`

To wait for the n-th request to the same alias:

\`\`\`typescript
cy.wait('@getUsers'); // first
cy.wait('@getUsers'); // second
\`\`\`

To wait for a request count without blocking:

\`\`\`typescript
cy.get('@getUsers.all').should('have.length', 3);
\`\`\`

## Stubbing GraphQL

GraphQL queries are typically all POSTs to one endpoint. Match by operation name in the body.

\`\`\`typescript
cy.intercept('POST', '/graphql', (req) => {
  if (req.body.operationName === 'GetUsers') {
    req.reply({ data: { users: [{ id: 1, name: 'Alice' }] } });
  } else if (req.body.operationName === 'GetPosts') {
    req.reply({ data: { posts: [] } });
  } else {
    req.continue();
  }
}).as('graphql');
\`\`\`

## Error simulation

Force a 500 to test error states:

\`\`\`typescript
cy.intercept('GET', '/api/users', { forceNetworkError: true });
cy.visit('/users');
cy.contains(/something went wrong/i).should('be.visible');
\`\`\`

Force timeout:

\`\`\`typescript
cy.intercept('GET', '/api/users', { delay: 30000 }); // longer than the app timeout
\`\`\`

## Conditional intercepts (times)

The \`times\` option matches only the first N requests.

\`\`\`typescript
// First request fails, subsequent succeed
cy.intercept('GET', '/api/users', { statusCode: 500, times: 1 });
cy.intercept('GET', '/api/users', { fixture: 'users.json' });

cy.visit('/users'); // sees 500
cy.contains('Retry').click(); // sees fixture
\`\`\`

## Middleware mode

The \`middleware: true\` option lets multiple intercepts run in sequence.

\`\`\`typescript
// Logger middleware
cy.intercept({ method: 'POST', middleware: true }, (req) => {
  console.log('POST request', req.url);
});

// Actual stub
cy.intercept('POST', '/api/users', { id: 1 });
\`\`\`

## Request body assertions

After waiting on an alias, you can assert on the request:

\`\`\`typescript
cy.intercept('POST', '/api/users').as('createUser');
cy.contains('Submit').click();
cy.wait('@createUser').then((interception) => {
  expect(interception.request.body).to.deep.equal({
    name: 'Alice',
    email: 'alice@example.com',
  });
});
\`\`\`

## Common patterns

### Loading state test

\`\`\`typescript
cy.intercept('GET', '/api/users', { fixture: 'users.json', delay: 2000 });
cy.visit('/users');
cy.contains(/loading/i).should('be.visible');
cy.contains('Alice').should('be.visible');
\`\`\`

### Pagination

\`\`\`typescript
cy.intercept('GET', '/api/users?page=1', { fixture: 'users-page-1.json' });
cy.intercept('GET', '/api/users?page=2', { fixture: 'users-page-2.json' });
cy.visit('/users');
cy.contains('Next').click();
\`\`\`

### Authentication header validation

\`\`\`typescript
cy.intercept('GET', '/api/protected', (req) => {
  if (!req.headers.authorization) {
    req.reply({ statusCode: 401, body: { error: 'Unauthorized' } });
  } else {
    req.continue();
  }
});
\`\`\`

### Streaming and large payloads

\`\`\`typescript
const largeData = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: \`User \${i}\` }));
cy.intercept('GET', '/api/users', { body: largeData });
\`\`\`

## Best practices

1. **Stub at the right level.** Stub external services; let internal ones flow through.
2. **Match precisely.** Use route matchers, not just URL strings, for predictability.
3. **Alias every intercept you wait on.** Names make the test readable.
4. **Use fixtures for stable canned data.** JSON files in \`cypress/fixtures/\`.
5. **Use handlers for dynamic logic.** When the response depends on request shape.
6. **Test loading and error states.** \`delay\` and \`statusCode: 500\` make this trivial.
7. **Wait on the network, not on time.** \`cy.wait('@alias')\` not \`cy.wait(2000)\`.
8. **Register intercepts before navigation.** Intercept first, then \`cy.visit\`.
9. **Avoid global interceptors.** Scope to the test or describe block.
10. **Clean up with \`times\`.** Prevent stale intercepts leaking between tests.

## Gotchas

1. **Intercept registration must happen before the request.** Registering after the network call fires has no effect.
2. **\`req.body\` may be undefined for non-JSON bodies.** Check \`req.headers['content-type']\` first.
3. **Glob patterns differ from regex.** \`/api/*\` does not equal \`/\\/api\\/.*/\`.
4. **\`cy.wait\` times out if no matching request arrives.** Default 5 seconds.
5. **Multiple intercepts on the same URL stack in registration order.** Later ones run first.
6. **Aliases are scoped to a test.** Cleared between tests.
7. **\`req.reply\` short-circuits further handlers.** \`req.continue\` lets them run.
8. **CORS preflight (OPTIONS) requests need separate intercepts.** Or match with regex.
9. **\`fixture\` paths are relative to \`cypress/fixtures/\`.** Not the spec file.
10. **Cypress 12+ added \`req.continue\` callback for response modification.** Earlier versions used \`res.send\`.

## API quick reference table

| Use case | Snippet |
|---|---|
| Spy on a request | \`cy.intercept('GET', '/api/x').as('x')\` |
| Stub with body | \`cy.intercept('GET', '/api/x', { id: 1 })\` |
| Stub with fixture | \`cy.intercept('GET', '/api/x', { fixture: 'x.json' })\` |
| Stub with status | \`cy.intercept('GET', '/api/x', { statusCode: 500 })\` |
| Delay response | \`cy.intercept('GET', '/api/x', { body: {}, delay: 1000 })\` |
| Match query | \`cy.intercept({ url: '/api/x', query: { page: '1' } })\` |
| Dynamic response | \`cy.intercept('GET', '/api/x', (req) => req.reply({...}))\` |
| Modify request | \`req.body = ...; req.continue()\` |
| Modify response | \`req.continue((res) => res.body.x = ...)\` |
| Wait on alias | \`cy.wait('@x')\` |
| Assert on body | \`cy.wait('@x').its('request.body')\` |
| Count requests | \`cy.get('@x.all').should('have.length', 2)\` |
| Match N times | \`cy.intercept(..., { times: 1 })\` |

## Conclusion and next steps

\`cy.intercept\` is the most powerful tool in the Cypress toolkit for E2E and component tests alike. Mastering it unlocks loading state tests, error state tests, contract tests against mocked APIs, and dramatic speedups by avoiding real backend calls. Stub external services, spy on internal ones, alias everything you wait on, and prefer route matchers over loose URL strings.

Start with the simplest pattern: alias a request, wait on it, assert on the response. Build up to dynamic handlers and request modification once the basics feel automatic.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for fixtures, custom commands, and CI guides.
`,
};
