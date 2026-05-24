import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Component Testing for Angular: Complete Guide 2026',
  description:
    'Complete guide to Cypress Component Testing for Angular in 2026. Mount, modules, services, signals, standalone components, CI patterns, and best practices.',
  date: '2026-05-16',
  category: 'Reference',
  content: `
# Cypress Component Testing for Angular: Complete Guide 2026

Cypress Component Testing added Angular support in 2022 and has matured into a credible alternative to TestBed plus Karma (or TestBed plus Jest) for Angular component testing. The key value proposition: components render in a real browser with real CSS, real fonts, real animations, and a Cypress UI for interactive debugging. Where TestBed-based tests run fast but lack visual fidelity, Cypress Component Tests are slower per test but produce environments indistinguishable from production.

This guide is the complete 2026 reference for Angular teams running, or evaluating, Cypress Component Testing. We cover the mental model, \`cy.mount\` for Angular, NgModule and standalone component patterns, service injection, signals integration, fixtures, network interception, MSW integration, theming, CSS isolation, debugging, CI configuration, and best practices from running real Angular suites.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## When to use Cypress Component Testing for Angular

Cypress Component Testing for Angular is the right tool when:

1. **Real CSS matters.** Components depending on CDK overlays, virtual scroll, drag-drop.
2. **Animations matter.** Angular animations actually execute.
3. **Layout fidelity.** Materials Design components, complex flex/grid layouts.
4. **Visual regression.** Combined with \`cypress-image-snapshot\` or Percy.

Where TestBed + Jest is a better fit:

1. **Pure pipes and services.** Tens of milliseconds per test.
2. **Large suites.** Jest parallelizes more aggressively.
3. **Heavy DI testing.** TestBed's DI system is purpose-built.

Most teams use both.

## Setup

\`\`\`bash
npm install --save-dev cypress @cypress/angular
\`\`\`

For an Angular CLI project, Cypress can auto-detect the schematic:

\`\`\`bash
ng add @cypress/schematic
\`\`\`

\`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: '**/*.cy.ts',
  },
});
\`\`\`

Add a \`cypress/support/component.ts\`:

\`\`\`typescript
import { mount } from 'cypress/angular';
import '../../src/styles.scss';

Cypress.Commands.add('mount', mount);

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}
\`\`\`

## Your first component test

For a standalone component:

\`\`\`typescript
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  it('renders the label and fires click', () => {
    const onClick = cy.stub();
    cy.mount(ButtonComponent, {
      componentProperties: { label: 'Click me', click: { emit: onClick } as any },
    });
    cy.contains('Click me').click().then(() => {
      expect(onClick).to.have.been.calledOnce;
    });
  });
});
\`\`\`

For an NgModule-declared component, pass \`imports\`:

\`\`\`typescript
import { CommonModule } from '@angular/common';

cy.mount(MyComponent, {
  imports: [CommonModule, MaterialModule],
  componentProperties: { /* @Input properties */ },
});
\`\`\`

## Standalone components

Standalone components (the Angular 14+ default) are the cleanest case. They declare their own imports, so \`cy.mount\` needs only the providers and any global imports.

\`\`\`typescript
import { UserCardComponent } from './user-card.component';
import { provideHttpClient } from '@angular/common/http';

it('renders user details', () => {
  cy.mount(UserCardComponent, {
    componentProperties: {
      user: { id: 1, name: 'Alice', email: 'alice@example.com' },
    },
    providers: [provideHttpClient()],
  });
  cy.contains('Alice').should('be.visible');
  cy.contains('alice@example.com').should('be.visible');
});
\`\`\`

## NgModule components

For components declared in NgModules, pass the module via \`imports\`.

\`\`\`typescript
import { MaterialModule } from './material.module';

cy.mount('<app-data-table [rows]="rows"></app-data-table>', {
  imports: [MaterialModule],
  declarations: [DataTableComponent],
  componentProperties: { rows: [{ id: 1 }, { id: 2 }] },
});
\`\`\`

Note: the first argument can be either a component class or a template string. Template strings are useful when the component needs specific bindings.

## Service injection

For components that depend on services, provide a mock implementation via \`providers\`.

\`\`\`typescript
import { UserService } from './user.service';

it('shows users from the service', () => {
  const mockService = {
    getUsers: cy.stub().returns(of([{ id: 1, name: 'Alice' }])),
  };
  cy.mount(UserListComponent, {
    providers: [{ provide: UserService, useValue: mockService }],
  });
  cy.contains('Alice').should('be.visible');
});
\`\`\`

## Signals integration

Angular signals (16+) work seamlessly. Set the signal value before mount or use a wrapper component.

\`\`\`typescript
import { signal } from '@angular/core';

it('reacts to signal changes', () => {
  const count = signal(0);
  cy.mount(CounterComponent, {
    componentProperties: { count },
  });
  cy.contains('0').should('be.visible');
  // Update the signal externally
  cy.then(() => count.set(5));
  cy.contains('5').should('be.visible');
});
\`\`\`

## Router

Use \`provideRouter\` with an in-memory location strategy.

\`\`\`typescript
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';

cy.mount(MyComponent, {
  providers: [
    provideRouter([
      { path: 'users', component: UsersComponent },
    ]),
    provideLocationMocks(),
  ],
});
\`\`\`

## HttpClient mocking

For services that use \`HttpClient\`, intercept at the network layer with \`cy.intercept\`.

\`\`\`typescript
it('loads users from the API', () => {
  cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers');
  cy.mount(UserListComponent, {
    providers: [provideHttpClient()],
  });
  cy.wait('@getUsers');
  cy.get('[data-testid=user-row]').should('have.length', 3);
});
\`\`\`

This is more realistic than \`HttpTestingController\`; the component issues a real HTTP request and Cypress intercepts at the browser level.

## Animations

Angular animations execute in Cypress Component Tests because the browser is real. Disable for tests that do not care:

\`\`\`typescript
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

cy.mount(MyComponent, {
  imports: [NoopAnimationsModule],
});
\`\`\`

Or enable for animation-specific tests:

\`\`\`typescript
import { provideAnimations } from '@angular/platform-browser/animations';

cy.mount(MyComponent, {
  providers: [provideAnimations()],
});
\`\`\`

## CSS isolation

Cypress mounts each component in its own iframe. Global styles must be imported in \`component.ts\`:

\`\`\`typescript
import '../../src/styles.scss';
import '../../src/themes/light.css';
\`\`\`

Material themes load this way too.

## Debugging with the Cypress UI

\`npx cypress open --component\` opens the interactive UI. Each command in the log is replayable, the DOM snapshot shows the component before and after each step, and the network panel shows intercepted requests. For Angular components with complex change-detection cycles, the time-travel ability is particularly valuable.

## Comparison: Cypress Component vs TestBed + Jest

| Dimension | Cypress Component | TestBed + Jest |
|---|---|---|
| Speed (per test) | ~1 second | ~50 milliseconds |
| Fidelity | Real browser | jsdom |
| Network mocking | \`cy.intercept\` | HttpTestingController |
| Visual debugging | Excellent | Limited |
| CSS support | Full | Partial |
| Animation support | Real | Stubbed (or no-op) |
| Change detection | Real cycles | Manual \`detectChanges\` |
| DI testing | Full | Full |

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

## Best practices

1. **Use standalone components.** They mount more cleanly.
2. **Mock services via providers.** Do not use the real backend.
3. **Intercept HTTP at the network layer.** \`cy.intercept\`.
4. **Provide \`NoopAnimationsModule\` when animations are not under test.** Speeds tests.
5. **One assertion per behavior.** Multi-assertion tests obscure failure points.
6. **Stub callback inputs with \`cy.stub\`.** Sinon-style assertions.
7. **Test what the user sees.** Not the component's internal state.
8. **Co-locate fixtures.** Or share via \`cypress/fixtures/\`.
9. **Run Component Tests on every PR.** Parallelize with Cypress Cloud if needed.
10. **Keep tests under one second each.** Slower tests are warning signs.

## Gotchas

1. **\`componentProperties\` typing is loose.** TypeScript may not catch shape mismatches.
2. **Change detection runs in Angular zones.** Use \`fakeAsync\`/\`tick\` for time-based behaviors.
3. **Standalone components mount differently from NgModule components.** Different mount signatures.
4. **\`@Input\` setters must be wired via \`componentProperties\`.** \`@Output\` events expose \`.emit\` as the assertable hook.
5. **Material Design themes must be imported globally.** In \`component.ts\`.
6. **Router testing requires \`provideLocationMocks\`.** Or it tries to navigate the real URL.
7. **TypeScript autocompletion requires the \`declare global\` block.** In \`component.ts\`.
8. **Hot reload can cause stale tests.** Restart on code edits.

## Conclusion and next steps

Cypress Component Testing for Angular is the right choice for layout-sensitive, animation-heavy, and visually-rich components in 2026. The cost is slower execution; the benefit is fidelity and debugging that TestBed plus jsdom cannot match. Use it alongside TestBed plus Jest, not as a replacement.

Start with one standalone component. Build the mount wrapper with common providers. Add intercepts and fixtures. Migrate visually complex components first.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for Angular testing and CI guides.
`,
};
