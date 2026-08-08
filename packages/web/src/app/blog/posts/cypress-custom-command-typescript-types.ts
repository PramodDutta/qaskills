import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Custom Command TypeScript Types That Actually Work',
  description: 'Fix Cypress custom command TypeScript types with global augmentation, subject inference, explicit registration, and CI checks that prevent runtime drift.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Cypress Custom Command TypeScript Types That Actually Work

Cypress custom command TypeScript types are created by augmenting Cypress's global \`Chainable\` interface with the same command signature that you register through \`Cypress.Commands.add()\`. Put the declaration in a TypeScript file included by the Cypress TypeScript configuration, load the implementation from the support file, and return a Cypress chain from commands that should remain chainable. That three-part contract gives editors autocomplete, catches bad arguments before a browser opens, and preserves the subject type for the next command.

The difficult part is not writing one interface member. It is keeping the public declaration, runtime registration, command kind, and yielded subject aligned as a suite evolves. This guide develops that alignment with concrete commands for selectors, authentication, API-created data, child commands, and dual commands. If you are deciding where Cypress fits among runners, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides the broader context. The selector examples also follow the stability principles in [Playwright locator best practices](/blog/playwright-best-practices-locators-2026), even though the APIs differ.

## Treat a custom command as a typed public API

A custom command has two consumers: Cypress at runtime and the TypeScript compiler during authoring. Runtime registration tells Cypress what to execute. Declaration merging tells TypeScript which calls are valid and what each call yields. Neither side automatically proves the other is correct.

| Contract layer | Where it lives | Failure when missing | Verification |
|---|---|---|---|
| Public signature | A file included by Cypress TypeScript config | Red underline or missing autocomplete | Run \`tsc --noEmit\` with the Cypress config |
| Implementation | Support module or imported command module | \`cy.myCommand is not a function\` | Run one smoke spec that calls the command |
| Registration load | E2E or component support entry | Types exist, runtime command does not | Inspect support imports and execute a spec |
| Yielded subject | Return value and \`Chainable<Subject>\` | Next command sees the wrong type or loses retryability | Chain an assertion that depends on the subject |
| Command kind | Parent, child, or dual configuration | Subject is absent, rejected, or incorrectly assumed | Test both allowed invocation forms |

Think of the declaration as a header file and the \`Commands.add\` callback as the implementation. Copying a declaration from a blog without matching the actual callback is equivalent to publishing an API contract that the application does not implement.

Use commands for operations that carry domain meaning or remove a repeated, carefully designed interaction. A two-line wrapper around \`cy.get()\` can be useful if it centralizes a selector convention. A twenty-step checkout command may be harmful if it hides the point at which the test should make assertions. Type safety improves a good abstraction, but it cannot rescue an abstraction with unclear responsibility.

## Establish one declaration and one registration path

A small project can keep declarations beside implementations in \`cypress/support/commands.ts\`. A top-level export makes the file a module while \`declare global\` augments Cypress's global namespace. Wrapping registration in a function also works when the package declares \`sideEffects: false\`, because the support entry explicitly calls code from the imported module.

\`\`\`ts
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      byTestId(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export function registerCommands(): void {
  Cypress.Commands.add('byTestId', (value: string) => {
    return cy.get(\`[data-testid="\${value}"]\`);
  });
}
\`\`\`

The E2E support entry must load that file. Import the module and call \`registerCommands()\`. A bare side-effect import would not register anything, because the \`Cypress.Commands.add\` calls live inside that function rather than at module top level.

\`\`\`ts
// cypress/support/e2e.ts
import { registerCommands } from './commands';

registerCommands();
\`\`\`

The matching test now receives autocomplete for the argument and a jQuery element subject after the command.

\`\`\`ts
// cypress/e2e/profile.cy.ts
describe('profile', () => {
  it('shows the saved display name', () => {
    cy.visit('/profile');
    cy.byTestId('display-name')
      .should('be.visible')
      .and('contain.text', 'Ada');
  });
});
\`\`\`

This placement works when the same Cypress configuration includes the support directory. Larger repositories often prefer \`cypress/support/index.d.ts\` for declarations and \`commands.ts\` for implementation. That separation is also valid, but it creates two files whose signatures can drift. Pick one layout, document it, and make compiler checks mandatory.

A focused Cypress TypeScript configuration should include specs and support declarations. Cypress documents TypeScript setup at https://docs.cypress.io/app/tooling/typescript-support. The exact inheritance path depends on the repository, but a standalone configuration can be shaped like this:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "types": ["cypress", "node"],
    "noEmit": true,
    "strict": true
  },
  "include": [
    "cypress/**/*.ts"
  ]
}
\`\`\`

Run \`npx tsc --project cypress/tsconfig.json --noEmit\` if that is the configuration path in the repository. Do not add \`skipLibCheck\` merely to silence a conflict without understanding it. Conflicting global test types often mean the Cypress project is also loading Jest or another runner's globals. Narrowing \`types\` and \`include\` is more diagnostic than hiding every declaration error.

## Preserve the yielded type in parent commands

A parent command starts a new chain and does not consume a previous subject. Its declaration should describe the arguments and the value delivered to the next link. For a selector helper, returning \`Chainable<JQuery<HTMLElement>>\` allows Cypress element assertions and actions to remain available.

For a command that creates data through the API, define the response shape and yield the created entity. The declaration and implementation can share the interface.

\`\`\`ts
// cypress/support/project-commands.ts
export interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
}

declare global {
  namespace Cypress {
    interface Chainable {
      createProject(name: string): Chainable<Project>;
    }
  }
}

Cypress.Commands.add('createProject', (name: string) => {
  return cy
    .request<Project>({
      method: 'POST',
      url: '/api/test/projects',
      body: { name },
    })
    .its('body');
});

export {};
\`\`\`

The callback returns the Cypress chain rather than extracting a value into a local variable. The consumer therefore receives the project only after the request finishes:

\`\`\`ts
// cypress/e2e/project.cy.ts
it('opens a project created through the test API', () => {
  cy.createProject('Typed command example').then((project) => {
    expect(project.status).to.equal('active');
    cy.visit(\`/projects/\${project.id}\`);
  });

  cy.contains('h1', 'Typed command example').should('be.visible');
});
\`\`\`

An easy mistake is declaring \`Chainable<Project>\` but returning the full \`cy.request()\` response. Runtime then yields a response object with \`body\`, while TypeScript tells the next callback it receives a project. The code may compile because the registration callback is not always checked as the inverse of the augmented interface. A consumer contract test that reads \`project.status\` exposes the mismatch immediately.

| Intended next subject | Implementation return | Declaration return |
|---|---|---|
| Located DOM elements | \`return cy.get(selector)\` | \`Chainable<JQuery<HTMLElement>>\` |
| Response body | \`return cy.request<T>(...).its('body')\` | \`Chainable<T>\` |
| URL string | \`return cy.url()\` | \`Chainable<string>\` |
| No meaningful data, only completed work | Return the final Cypress command | Usually \`Chainable<void>\`, if the chain truly yields no value |
| Existing subject | \`return cy.wrap(subject)\` or a chain derived from it | Match the validated subject |

Avoid \`Chainable<any>\`. It makes every downstream property appear legal and defeats the purpose of the declaration. If the payload is genuinely uncertain, yield \`unknown\` and validate it before use, or define the response contract used by the test environment.

## Type child commands around their previous subject

A child command requires a subject from the preceding command. Cypress's \`prevSubject\` option declares this runtime relationship. The public signature reads naturally as a method on \`Chainable<Subject>\`, while the implementation callback receives the subject first.

The following command reads a required data attribute from a DOM element and yields its string value. It validates at runtime because TypeScript cannot prove that an arbitrary selected element contains the attribute.

\`\`\`ts
// cypress/support/attribute-command.ts
declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      requiredAttribute(name: string): Chainable<string>;
    }
  }
}

Cypress.Commands.add(
  'requiredAttribute',
  { prevSubject: 'element' },
  (subject: JQuery<HTMLElement>, name: string) => {
    const value = subject.attr(name);

    if (value === undefined) {
      throw new Error(\`Expected element to have attribute "\${name}"\`);
    }

    return cy.wrap(value, { log: false });
  },
);

export {};
\`\`\`

Use it only after an element-producing command:

\`\`\`ts
// cypress/e2e/download.cy.ts
it('points the invoice link at a PDF resource', () => {
  cy.visit('/invoices/INV-42');
  cy.contains('a', 'Download invoice')
    .requiredAttribute('href')
    .should('match', /\\.pdf$/);
});
\`\`\`

The regular expression \`/\\.pdf$/\` matches a literal dot before \`pdf\`. The command's runtime subject validation comes from \`prevSubject: 'element'\`. The explicit \`JQuery<HTMLElement>\` annotation documents what the callback expects and gives attribute methods a useful type.

What people get wrong is assuming the generic parameter on \`interface Chainable<Subject>\` automatically restricts every custom command to the right prior subject. A method declaration that ignores \`Subject\` can still appear on chains where it makes no semantic sense. Runtime \`prevSubject\` validation remains essential, and a narrow command name helps reviewers recognize the required context.

## Use dual commands only when both entry paths are coherent

A dual command can begin a chain or consume an existing subject. Cypress represents this with \`prevSubject: 'optional'\`. Dual behavior is appropriate only when both forms have a clear meaning. Otherwise separate parent and child commands are easier to type and understand.

Here is a dual command that writes an accessibility-oriented log message for either the whole page or a selected region. It returns the previous element when one exists, preserving the chain, and returns \`cy.document()\` when invoked from \`cy\`.

\`\`\`ts
// cypress/support/mark-region-command.ts
declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      markRegion(label: string): Chainable<Subject>;
    }
  }
}

Cypress.Commands.add(
  'markRegion',
  { prevSubject: 'optional' },
  (subject: JQuery<HTMLElement> | undefined, label: string) => {
    Cypress.log({ name: 'markRegion', message: label });

    if (subject) {
      return cy.wrap(subject, { log: false });
    }

    return cy.document({ log: false });
  },
);

export {};
\`\`\`

This example exposes an important typing tension: a parent invocation yields a document, but \`Chainable<Subject>\` reflects the prior subject and the parent call has no useful concrete \`Subject\`. If consumers need to rely on different return types, provide explicit overloads or, more simply, split the behavior into two commands. Dual commands are best when callers care about the side effect and an existing subject merely continues.

| Command style | Runtime option | Callback first parameter | Appropriate use |
|---|---|---|---|
| Parent | Omit \`prevSubject\` | First declared command argument | Login, API setup, selector entry point |
| Child | \`prevSubject: 'element'\` or another supported requirement | Required subject | Element-specific extraction or action |
| Dual | \`prevSubject: 'optional'\` | Subject or \`undefined\` | Behavior coherent with or without a subject |
| Overwrite | \`Cypress.Commands.overwrite()\` | Original function, then original arguments | Cross-cutting change to a built-in or existing command |

Do not choose a dual command merely to avoid writing \`cy.get()\`. Optional subjects create wider types and more branches. Every branch deserves a runtime test.

## Make authentication commands explicit about inputs and state

Login commands often become untyped bags of optional values. A named options interface prevents reversed positional arguments and makes environment-dependent behavior visible. Sensitive fields should not be printed in the command log.

\`\`\`ts
// cypress/support/auth-commands.ts
interface LoginOptions {
  email: string;
  password: string;
  remember?: boolean;
}

declare global {
  namespace Cypress {
    interface Chainable {
      loginByUi(options: LoginOptions): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginByUi', ({ email, password, remember = false }) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password, { log: false });

  if (remember) {
    cy.get('input[name="remember"]').check();
  }

  cy.contains('button', 'Sign in').click();
  cy.location('pathname').should('eq', '/dashboard');
});

export {};
\`\`\`

The final callback expression is not explicitly returned here, so Cypress's custom-command queue still runs the enqueued commands, but the declared \`Chainable<void>\` communicates that consumers should not depend on a yielded domain value. Teams that prefer an explicit return can return the final \`cy.location(...).should(...)\` chain and declare its actual yielded subject. What matters is that declaration and intended usage agree.

Do not hide all authentication assertions in the command. A reusable login helper may verify the minimum postcondition needed to guarantee completion, such as the dashboard route. A dedicated authentication spec should separately cover error messages, lockout behavior, redirects, and accessibility. Commands reduce repeated mechanics; they should not erase behavioral coverage.

## Diagnose the typed-but-missing runtime failure

A particularly confusing failure reads \`cy.byTestId is not a function\` even though the editor autocompletes \`byTestId\` and TypeScript reports no errors. The mismatch proves that declaration merging succeeded but runtime registration did not.

Use this diagnosis sequence:

1. Confirm the implementation contains \`Cypress.Commands.add('byTestId', ...)\` with the same spelling and case.
2. Confirm the correct support entry imports the implementation. E2E and component testing can use different support files.
3. Confirm the active \`cypress.config.ts\` points at the expected support file, if the project customizes it.
4. Add a temporary top-level log in the command module, run one spec, and check whether the module evaluated. Remove the log after diagnosis.
5. Check for a circular import that prevents registration from completing.

| Observation | Likely cause | Corrective action |
|---|---|---|
| Editor rejects command, browser also rejects it | Neither declaration nor registration is loaded | Add declaration and import implementation |
| Editor accepts command, browser rejects it | Declaration included, command module not evaluated | Fix the support import path |
| Editor rejects command, browser executes it | Registration loaded, declaration excluded | Fix TypeScript \`include\` or declaration placement |
| Command exists but next subject is wrong | Return value differs from declared yield | Align implementation and \`Chainable<T>\` |
| E2E passes, component test fails | Only E2E support loads registration | Import shared commands from both support entries |

This is a better debugging model than repeatedly restarting the editor. The language service and the Cypress browser load different artifacts. Determine which side is missing before changing configuration.

## Prevent declaration drift with compile-time contract examples

Normal passing tests establish accepted usage, but a type contract also needs rejected examples. TypeScript's \`@ts-expect-error\` directive is useful because compilation fails if the following line unexpectedly becomes valid. Keep these cases in a file included by the Cypress typecheck but not matched as an executable spec.

\`\`\`ts
// cypress/type-contracts/custom-commands.types.ts
export {};

cy.byTestId('save-button');
cy.createProject('Release verification');
cy.loginByUi({
  email: 'qa@example.test',
  password: 'not-a-real-secret',
});

// @ts-expect-error byTestId requires a string
cy.byTestId(42);

// @ts-expect-error password is required
cy.loginByUi({ email: 'qa@example.test' });

// @ts-expect-error status is yielded later, not on Chainable itself
cy.createProject('Example').status;
\`\`\`

The values are illustrative and do not contact an application because \`tsc --noEmit\` type-checks without running the file. Keep runtime smoke coverage elsewhere. Together, the type contract and runtime spec catch both halves of the API.

For teams using AI coding agents, place the command declaration, implementation, and at least one consumer in the agent's context. Ask it to update all three when changing a signature. A review prompt such as “compare every custom \`Chainable\` member with its \`Commands.add\` registration and returned subject” is far more precise than “fix Cypress types.” Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when you want reusable checks rather than a one-off prompt.

## Review commands for retryability and readable failures

Cypress queries and assertions retry according to Cypress behavior. A custom command that immediately reads from the DOM with jQuery and returns a primitive may snapshot state once instead of expressing a retryable assertion. Decide whether the command is an action, query-like locator, or value extractor, and keep timing expectations explicit.

For most teams, a selector command that returns \`cy.get()\` is safer than a helper that directly calls \`document.querySelector()\`. The Cypress chain retains command logging, automatic waiting, screenshots on failure, and familiar error messages. A helper that hides several unrelated assertions produces a single opaque command in the log and makes failures harder to localize.

Use this review checklist before merging a command:

- Does the name express domain intent or a stable selector convention?
- Is every argument represented in the augmented interface with a narrow type?
- Does the declared yielded type match the actual returned chain?
- Does \`prevSubject\` reflect parent, child, or dual usage?
- Is the registration module imported by every testing mode that needs it?
- Are secrets excluded from logs?
- Does a runtime smoke spec call the command and use its next subject?
- Does \`tsc --noEmit\` cover declarations, implementations, and type contracts?
- Would ordinary functions be clearer for pure data transformation?

Pure helpers that format dates, build payloads, or calculate expected values usually belong in ordinary TypeScript functions. They can be called synchronously, unit-tested without Cypress, and imported with explicit module boundaries. Reserve custom commands for work that participates in the Cypress command chain or benefits from Cypress logging and subject semantics.

## Resolve global type conflicts without weakening the command contract

Monorepositories frequently expose Cypress specs to a root TypeScript configuration that also loads another test runner's globals. The resulting errors mention duplicate declarations for functions such as \`describe\`, \`it\`, or \`expect\`. This is not evidence that custom command augmentation is wrong. It means one compiler program has been asked to combine global APIs that were not intended to share a scope.

Give Cypress a focused TypeScript project whose \`types\` list and \`include\` patterns cover Cypress support code, specs, and command type contracts. Give unit tests their own project. If application source is shared, both test configurations can include or reference that source through the repository's established TypeScript layout. The important boundary is the runner globals, not the production modules.

Do not solve the conflict by changing every custom command to \`any\`, deleting the Cypress type entry, or enabling broad error suppression. Those changes remove useful checks while leaving the mixed-program design intact. Likewise, triple-slash references copied into individual spec files can make editor behavior depend on which file is open. A project-level configuration is easier to reproduce in CI.

Editor success is not enough. Run the exact Cypress typecheck command in a clean CI job, because an editor may infer a nearby configuration or retain a cached declaration. If a command is recognized only after opening its implementation file, inspect the configuration rather than relying on that incidental language-service state.

When commands are packaged in an internal shared library, make registration an explicit function or documented side-effect import and ship the matching declarations with the package. A consuming repository still needs to call or import the runtime registration from its support entry. Installing a package can make its types visible through TypeScript while doing nothing to execute its command registration in the browser, reproducing the typed-but-missing failure at a larger scale.

Finally, compile both E2E and component support trees if both are used. A declaration that compiles under one mode can conceal a missing import in the other. One small consumer spec per mode gives concrete proof that the global type, registration path, and yielded subject travel together.

## Frequently Asked Questions

### Where should Cypress custom command TypeScript declarations live?

They can live beside the implementation in a module that uses \`declare global\`, or in a dedicated declaration file such as \`cypress/support/index.d.ts\`. The decisive requirement is that the active Cypress TypeScript configuration includes the file. Keeping declarations beside implementations reduces navigation, while separating them can make the public surface easier to scan. Whichever layout you choose, ensure the support entry imports the runtime registration and add a compiler command that checks the same files CI will use.

### Why does TypeScript recognize my custom command when Cypress does not?

TypeScript and the Cypress browser load different parts of the command. The declaration file can be included successfully even when the implementation module is never imported at runtime. Check the E2E or component support entry, confirm it imports the module containing \`Cypress.Commands.add()\`, and verify the active Cypress configuration uses that support entry. Matching autocomplete plus \`is not a function\` is strong evidence of a registration-loading problem, not a declaration-merging problem.

### Should a custom command return a Cypress chain or a plain value?

Return a Cypress chain when the command performs Cypress work or when its result should feed the next command. For example, return \`cy.get()\` for an element command and \`cy.request<T>(...).its('body')\` for a command that yields a response body. A plain synchronous value can be wrapped with \`cy.wrap()\`, but pure calculations are usually clearer as ordinary imported functions. The declaration's \`Chainable<T>\` type must describe what the next callback actually receives.

### How do I stop custom command types from drifting from implementations?

Use three checks. First, run TypeScript with \`--noEmit\` over support files and specs. Second, keep compile-only examples with valid calls and intentional \`@ts-expect-error\` cases. Third, execute a small runtime spec that calls every important command and uses its yielded subject. Code review should compare the augmented \`Chainable\` member, the \`Commands.add\` callback parameters, \`prevSubject\`, and the returned chain as one contract. No single check proves all four pieces agree.
`,
};
