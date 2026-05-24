import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Custom Commands: Best Practices Guide 2026',
  description:
    'Best practices for Cypress custom commands in 2026. Add, overwrite, chaining, TypeScript types, parent/child commands, when to use, and patterns to avoid.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
# Cypress Custom Commands: Best Practices Guide 2026

Custom commands are one of Cypress's most powerful features and one of the most commonly misused. Done well, they raise the abstraction level of your tests, eliminate boilerplate, and provide a domain-specific testing language that reads like prose. Done poorly, they hide important context, make debugging harder, and create a tangle of internal abstractions only one team member understands.

This guide is the 2026 best-practices reference for Cypress custom commands. We cover when to use them, when not to, the three command types (parent, child, dual), \`add\` vs \`overwrite\`, chaining and return values, TypeScript types, naming conventions, common patterns, and the anti-patterns that bite teams in week three.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## When to use a custom command

Use a custom command when:

1. **The same pattern appears in three or more tests.** Two is coincidence; three is a pattern.
2. **The pattern represents a domain concept.** \`cy.login()\`, \`cy.createUser()\`, \`cy.acceptCookies()\`.
3. **The command takes meaningful arguments.** Configurable behavior.
4. **The command is a stable abstraction.** It will not change shape every sprint.

Do NOT use a custom command when:

1. **The pattern is a single-use convenience.** Inline it.
2. **You are wrapping a single Cypress command without adding value.** \`cy.click2 = () => cy.click()\` is noise.
3. **The pattern is implementation-specific.** Page objects are usually a better fit.
4. **The pattern hides important context.** \`cy.doEverything()\` is an anti-pattern.

## Adding a parent command

The most common pattern is a parent command: a command that starts a new chain.

\`\`\`typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.request('POST', '/api/auth/login', { email, password }).then((res) => {
      window.localStorage.setItem('token', res.body.token);
    });
  });
});

// Usage:
cy.login('admin@example.com', 'secret');
cy.visit('/dashboard');
\`\`\`

## Child commands

A child command operates on the subject of the previous command. Use it for chained DSL.

\`\`\`typescript
Cypress.Commands.add('shouldBeVisibleAndEnabled', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).should('be.visible').should('not.be.disabled');
});

// Usage:
cy.get('button').shouldBeVisibleAndEnabled();
\`\`\`

## Dual commands

Dual commands can run as either parent or child.

\`\`\`typescript
Cypress.Commands.add('byTestId', { prevSubject: 'optional' }, (subject, id) => {
  const selector = \`[data-testid="\${id}"]\`;
  if (subject) {
    return cy.wrap(subject).find(selector);
  }
  return cy.get(selector);
});

// Usage:
cy.byTestId('email');                          // parent
cy.get('form').byTestId('email');              // child
\`\`\`

## Overwriting commands

\`Cypress.Commands.overwrite\` replaces a built-in command. Use sparingly; overwrites are a common source of confusion for new team members.

\`\`\`typescript
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  return originalFn(url, {
    ...options,
    onBeforeLoad(win) {
      win.localStorage.setItem('feature-flag-foo', 'true');
      options?.onBeforeLoad?.(win);
    },
  });
});
\`\`\`

This sets a feature flag on every \`cy.visit\`. Document the overwrite so new engineers know it exists.

## TypeScript types

Custom commands need TypeScript declarations to get autocomplete and type checking.

\`\`\`typescript
// cypress/support/commands.d.ts (or include in commands.ts)
declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      login(email: string, password: string): Chainable<void>;
      byTestId(id: string): Chainable<JQuery<HTMLElement>>;
      shouldBeVisibleAndEnabled(): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
\`\`\`

Make sure your \`tsconfig.json\` includes the support directory.

## Return values and chaining

Custom commands should return a chainable subject so callers can compose them.

\`\`\`typescript
Cypress.Commands.add('createUser', (name: string, email: string) => {
  return cy.request('POST', '/api/users', { name, email }).then((res) => res.body);
});

// Usage:
cy.createUser('Alice', 'alice@example.com').then((user) => {
  expect(user.id).to.be.greaterThan(0);
});
\`\`\`

When a command does not produce a meaningful subject, return \`void\` (typed as \`Chainable<void>\`).

## Naming conventions

1. **Use verb-noun pairs.** \`cy.login()\`, \`cy.createUser()\`, \`cy.acceptCookies()\`.
2. **Prefix utility commands with \`as\`.** \`cy.asAdmin()\`, \`cy.asViewer()\`.
3. **Prefix assertions with \`should\`.** \`cy.shouldBeOnDashboard()\`.
4. **Avoid \`do\` and \`run\` prefixes.** They are too generic.
5. **Avoid suffixes like \`V2\`.** Replace the command instead.

## Common patterns

### Login

\`\`\`typescript
Cypress.Commands.add('login', (email = 'admin@example.com', password = 'secret') => {
  cy.session([email, password], () => {
    cy.request('POST', '/api/auth/login', { email, password });
  });
});
\`\`\`

### Drag and drop

\`\`\`typescript
Cypress.Commands.add('dragTo', { prevSubject: 'element' }, (subject, target) => {
  cy.wrap(subject).trigger('mousedown', { which: 1 });
  cy.get(target).trigger('mousemove').trigger('mouseup', { force: true });
});
\`\`\`

### Wait for stable

\`\`\`typescript
Cypress.Commands.add('waitForStable', (selector: string, ms = 500) => {
  let lastHtml = '';
  cy.get(selector).then(($el) => { lastHtml = $el.html(); });
  cy.wait(ms);
  cy.get(selector).then(($el) => {
    expect($el.html()).to.equal(lastHtml);
  });
});
\`\`\`

### Test-id query

\`\`\`typescript
Cypress.Commands.add('byTestId', (id: string) => cy.get(\`[data-testid="\${id}"]\`));
\`\`\`

### Get and assert

\`\`\`typescript
Cypress.Commands.add('assertText', { prevSubject: 'element' }, (subject, text: string) => {
  cy.wrap(subject).should('contain.text', text);
});
\`\`\`

### Stub API and wait

\`\`\`typescript
Cypress.Commands.add('stubAndWait', (method: string, url: string, fixture: string) => {
  const alias = url.replace(/[/:?=&]/g, '_');
  cy.intercept(method, url, { fixture }).as(alias);
  cy.wait(\`@\${alias}\`);
});
\`\`\`

## Anti-patterns

### The god command

\`\`\`typescript
// BAD: Does too much, hides important context
Cypress.Commands.add('setupTest', () => {
  cy.login();
  cy.createUser();
  cy.acceptCookies();
  cy.visit('/dashboard');
  cy.intercept('GET', '/api/users', { fixture: 'users' });
});
\`\`\`

Tests using \`cy.setupTest()\` are unreadable when debugging. Compose smaller commands instead.

### The thin wrapper

\`\`\`typescript
// BAD: Adds no value
Cypress.Commands.add('clickElement', (selector: string) => {
  cy.get(selector).click();
});
\`\`\`

Just use \`cy.get(selector).click()\` inline.

### The hidden assertion

\`\`\`typescript
// BAD: Mixes action and assertion
Cypress.Commands.add('saveAndVerify', (data) => {
  cy.get('[data-testid=save]').click();
  cy.contains('Saved').should('be.visible');
});
\`\`\`

Better to keep action and assertion separate; the test reads more clearly.

### The implicit dependency

\`\`\`typescript
// BAD: Depends on test order
Cypress.Commands.add('continueFromLastStep', () => {
  cy.get('@step3').click();
});
\`\`\`

If \`@step3\` was aliased in a previous test, it does not exist here. Each test should be independent.

## Organization

Group custom commands by domain. Use a barrel file pattern:

\`\`\`text
cypress/
  support/
    commands/
      auth.ts
      users.ts
      ui.ts
      api.ts
    index.ts        // imports all command files
\`\`\`

\`\`\`typescript
// cypress/support/commands/index.ts
import './auth';
import './users';
import './ui';
import './api';
\`\`\`

## Testing custom commands

Custom commands should be exercised by the tests that depend on them. If a command is complex, write a dedicated spec.

\`\`\`typescript
describe('cy.createUser', () => {
  it('creates and returns the new user', () => {
    cy.createUser('Alice', 'alice@example.com').then((user) => {
      expect(user.id).to.be.greaterThan(0);
      expect(user.name).to.equal('Alice');
    });
  });
});
\`\`\`

## Best practices summary

1. **Three uses then extract.** Two is coincidence.
2. **Domain language.** \`cy.acceptCookies()\` not \`cy.clickConsent()\`.
3. **Return chainable subjects.** Or \`void\`.
4. **TypeScript types.** Declare them.
5. **Document overwrites.** Surprise is the enemy.
6. **Compose, do not god.** Small commands compose; god commands do not.
7. **Action and assertion separate.** Tests read more clearly.
8. **No implicit dependencies.** Each command stands alone.
9. **Group by domain.** \`auth\`, \`users\`, \`ui\`, \`api\`.
10. **Review commands quarterly.** Delete unused ones; consolidate redundant ones.

## Conclusion and next steps

Custom commands are the lever that turns a Cypress suite from a collection of scripts into a domain-specific testing DSL. The discipline is restraint: extract when the pattern is real, leave inline when it is not. The reward is a test suite that reads like English and onboards new engineers in days, not weeks.

Start by extracting a single \`cy.login\` command. Add it to your support file with proper types. Use it from one test, then five, then everywhere. Move on to the next high-value pattern only when login is rock-solid.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for fixtures, sessions, and CI guides.
`,
};
