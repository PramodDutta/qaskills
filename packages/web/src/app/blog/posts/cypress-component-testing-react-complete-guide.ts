import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Component Testing for React: Complete Guide 2026',
  description:
    'Complete guide to Cypress Component Testing for React in 2026. Mount, fixtures, intercepts, custom commands, CI patterns, debugging, and best practices.',
  date: '2026-05-16',
  category: 'Reference',
  content: `
# Cypress Component Testing for React: Complete Guide 2026

Cypress Component Testing reached GA in late 2022 and has matured substantially since. By 2026 it is a credible alternative to Jest plus React Testing Library for React component testing, with one major advantage: components render in a real browser, with real CSS, real fonts, real animations, and real DOM APIs. Where Jest plus jsdom is fast but lacks fidelity, Cypress Component Testing is somewhat slower but produces test environments indistinguishable from production browsers.

This guide is the complete 2026 reference for React teams running, or evaluating, Cypress Component Testing. We cover the mental model, \`cy.mount\` patterns, fixtures, network interception, custom commands tuned for components, MSW integration, theming and providers, CSS isolation, debugging with the Cypress UI, CI configuration including parallelization, and best practices distilled from running real component suites.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## When to use Cypress Component Testing for React

Three scenarios where Cypress Component Testing shines:

1. **Layout-sensitive components.** Anything that depends on real CSS, fonts, or pixel positions (carousels, tooltips, modals, charts) is much easier to test in a real browser.
2. **Animation and transitions.** Real CSS animations execute. You can assert on intermediate states.
3. **Visual regression.** Combined with \`cypress-image-snapshot\` or Percy, component tests produce stable visual baselines.

When Jest plus RTL is a better fit:

1. **Pure logic components.** Tests run in tens of milliseconds.
2. **Large suites.** Jest parallelizes more aggressively.
3. **Snapshot-heavy workflows.** Jest snapshots are a first-class workflow.

Many teams use both: Cypress for layout-sensitive components, Jest plus RTL for the rest.

## Setup

\`\`\`bash
npm install --save-dev cypress @cypress/react @cypress/webpack-dev-server
# or with Vite
npm install --save-dev cypress @cypress/react @cypress/vite-dev-server
\`\`\`

\`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite', // or 'webpack'
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
  },
});
\`\`\`

Run with \`npx cypress open --component\` for the UI or \`npx cypress run --component\` for CI.

## Your first component test

\`\`\`tsx
import { Button } from './Button';

describe('<Button />', () => {
  it('renders the label and fires onClick', () => {
    const onClick = cy.stub();
    cy.mount(<Button onClick={onClick}>Click me</Button>);
    cy.contains('Click me').click().then(() => {
      expect(onClick).to.have.been.calledOnce;
    });
  });
});
\`\`\`

Three things to notice. First, the spec file lives next to the component (\`Button.cy.tsx\` next to \`Button.tsx\`). Second, \`cy.mount\` accepts JSX and renders it in a Cypress harness. Third, \`cy.stub\` creates a Sinon stub you can assert on.

## Mount with providers

Most real components depend on context: a router, a theme provider, a query client. Wrap \`cy.mount\` with the providers your component needs.

\`\`\`tsx
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../theme';

export const mountWithProviders = (
  ui: React.ReactElement,
  { route = '/', queryClient = new QueryClient() } = {}
) => {
  return cy.mount(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
\`\`\`

Then in tests:

\`\`\`tsx
it('routes to user page on click', () => {
  mountWithProviders(<UserCard userId={1} />, { route: '/users' });
  cy.contains('View profile').click();
  cy.location('pathname').should('eq', '/users/1');
});
\`\`\`

Better: add it as a custom command.

\`\`\`typescript
// cypress/support/component.ts
Cypress.Commands.add('mount', (ui, options) => {
  return mountWithProviders(ui, options);
});
\`\`\`

## Network interception

Cypress Component Testing uses \`cy.intercept\` exactly as E2E does. This is one of the strongest reasons to choose Cypress Component Testing over Jest plus RTL: real network interception, not module-level mocking.

\`\`\`tsx
it('loads users from the API', () => {
  cy.intercept('GET', '/api/users', {
    fixture: 'users.json',
  }).as('getUsers');
  cy.mount(<UserList />);
  cy.wait('@getUsers');
  cy.get('[data-testid=user-row]').should('have.length', 3);
});
\`\`\`

The component issues a real \`fetch\` call; Cypress intercepts the request at the network layer and returns the fixture.

## Fixtures

Fixtures live in \`cypress/fixtures/\` as JSON files.

\`\`\`json
// cypress/fixtures/users.json
[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob", "email": "bob@example.com" },
  { "id": 3, "name": "Carol", "email": "carol@example.com" }
]
\`\`\`

Reference with \`cy.fixture\` or as a string in \`cy.intercept\`.

## MSW integration

For teams using Mock Service Worker in unit tests and wanting to share handlers with Cypress Component Tests, MSW supports Cypress via the browser worker.

\`\`\`typescript
// cypress/support/msw.ts
import { setupWorker } from 'msw/browser';
import { handlers } from '../../src/mocks/handlers';

before(() => {
  const worker = setupWorker(...handlers);
  worker.start({ onUnhandledRequest: 'bypass' });
});
\`\`\`

The same handlers used in jsdom-based tests now intercept requests in Cypress Component Tests. This is a major DX win for teams that already use MSW.

## Custom commands tuned for components

Custom commands extend \`cy.*\` with your own DSL. Useful for component testing:

\`\`\`typescript
// cypress/support/commands.ts
Cypress.Commands.add('byTestId', (id: string) => {
  return cy.get(\`[data-testid="\${id}"]\`);
});

Cypress.Commands.add('shouldBeAccessible', () => {
  cy.injectAxe();
  cy.checkA11y();
});

declare global {
  namespace Cypress {
    interface Chainable {
      byTestId(id: string): Chainable<JQuery<HTMLElement>>;
      shouldBeAccessible(): Chainable<void>;
    }
  }
}
\`\`\`

Now any test can use \`cy.byTestId('email')\` and \`cy.shouldBeAccessible()\`.

## CSS isolation

By default, Cypress Component Testing mounts each test in its own iframe. CSS leaks are isolated. If your global stylesheets need to be available, import them in \`cypress/support/component.ts\`:

\`\`\`typescript
import '../../src/styles/globals.css';
import '../../src/styles/theme.css';
\`\`\`

## Viewport and theming

Set the viewport per test or globally in config.

\`\`\`typescript
// per test
beforeEach(() => {
  cy.viewport(375, 667); // mobile
});

// globally
export default defineConfig({
  component: {
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});
\`\`\`

For dark mode tests, toggle the theme provider in the mount wrapper.

## Debugging with the Cypress UI

Run \`npx cypress open --component\` for the interactive UI. Each test run shows:

- The mounted component in real time
- The Cypress command log
- Time-travel through every command
- DOM snapshots before and after each command
- A "selector playground" to find selectors interactively

For component testing this debugging experience is materially better than Jest plus RTL.

## Snapshot testing

Cypress does not ship a snapshot matcher. For visual snapshots, install \`cypress-image-snapshot\` or use Percy. For HTML snapshots, you can build a custom command:

\`\`\`typescript
Cypress.Commands.add('matchHtmlSnapshot', (name: string) => {
  cy.get('body').then(($body) => {
    cy.task('saveSnapshot', { name, html: $body[0].outerHTML });
  });
});
\`\`\`

Most teams choose visual snapshots over HTML snapshots; the signal-to-noise is better.

## CI configuration

\`\`\`yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm ci
- uses: cypress-io/github-action@v6
  with:
    component: true
    record: true
    parallel: true
    group: 'component-tests'
\`\`\`

\`cypress-io/github-action\` is the official wrapper. For parallel runs, you need Cypress Cloud or self-managed splitting.

## Best practices

1. **Co-locate specs.** \`Button.cy.tsx\` lives next to \`Button.tsx\`.
2. **Use \`data-testid\` sparingly.** Prefer text and roles.
3. **Share provider wrappers.** Avoid duplicating provider hierarchy across tests.
4. **Intercept network calls.** Do not allow real network requests.
5. **One assertion per behavior.** Multi-assertion tests obscure failure points.
6. **Use \`cy.stub\` for callback props.** Sinon-style assertions on \`called\`, \`calledWith\`.
7. **Avoid testing implementation details.** Test what the user sees and does.
8. **Snapshot images, not HTML.** Visual diffs scale better than text diffs.
9. **Run Component Tests in CI on every PR.** Parallelize for speed.
10. **Keep mount wrappers small.** Each provider is a future test-only dependency.

## Gotchas

1. **Cypress Component Tests run in iframes.** Some libraries (Portals, fixed positioning) need adjustment.
2. **Hot reload changes the DOM.** Restart the test if you edit code mid-run.
3. **Asset imports require the bundler.** Use Vite or Webpack as configured in \`devServer\`.
4. **\`document.body\` differs from E2E.** Portal targets may need explicit configuration.
5. **\`cy.intercept\` does not work for in-process calls.** Only HTTP requests are intercepted.
6. **Coverage requires \`@cypress/code-coverage\`.** Instrument with Babel or SWC.
7. **TypeScript types for \`cy.mount\` come from \`@cypress/react\`.** Configure \`tsconfig\` paths.
8. **Custom commands need \`declare global\`.** Otherwise TypeScript complains.

## Comparison: Cypress Component Testing vs Jest + RTL

| Dimension | Cypress Component | Jest + RTL |
|---|---|---|
| Speed (per test) | ~1 second | ~10 milliseconds |
| Fidelity | Real browser | jsdom |
| Network mocking | \`cy.intercept\` (real) | Module mocks |
| Visual debugging | Excellent | None |
| CSS support | Full | Partial |
| Animation support | Real | Stubbed |
| Snapshot testing | Visual via plugin | Built-in HTML |
| Parallelism | Cloud or DIY | Built-in workers |
| Learning curve | Moderate | Low |

## Conclusion and next steps

Cypress Component Testing for React is the right choice for layout-sensitive, visually-rich, and animation-heavy components in 2026. The cost is slower test execution; the benefit is fidelity and debugging that Jest plus RTL cannot match. Use it alongside Jest plus RTL, not as a replacement for everything.

Start with a single component. Build the provider wrapper. Add a fixture and an intercept. Iterate from there. Move visually complex components to Cypress; keep pure logic in Jest.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for visual testing and CI guides.
`,
};
