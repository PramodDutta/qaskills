import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Component Testing with React Router 2026 Guide',
  description:
    'Cypress component testing with React Router: mount with MemoryRouter, assert cy.location pathname, test route params, and build a reusable wrapper in TS.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# Cypress Component Testing with React Router 2026 Guide

React Router is the routing backbone of most React applications, but it is also one of the most common sources of confusion when teams adopt Cypress component testing. The moment you try to mount a component that calls \`useNavigate\`, \`useParams\`, or renders a \`<Link>\`, Cypress throws an error: the component is not inside a router context. Unlike end-to-end tests, where the full application boots inside a real browser with a real router, component tests mount a single component in isolation. That isolation is exactly what makes them fast and focused, but it also means you have to provide the router context yourself.

This guide is a complete, runnable reference for testing React Router components with Cypress in 2026. We use React Router v6/v7 APIs, TypeScript throughout, and the \`MemoryRouter\` to drive routing entirely in memory so your tests never touch \`window.history\` or the address bar. You will learn how to mount a component inside a router, assert the current pathname with \`cy.location\`, pass and read route params, test navigation triggered by \`useNavigate\`, and build a reusable \`mountWithRouter\` wrapper so you never repeat the same boilerplate twice. By the end you will be able to test any routed component confidently, whether it is a deeply nested detail page, a protected route guard, or a breadcrumb that depends on the URL.

If you are coming from end-to-end testing, the mental model shift is the most important takeaway: component tests own the router, you decide the initial URL, and assertions about navigation are assertions about in-memory router state rather than about the browser. Let us build that model from the ground up.

## Why React Router Breaks Component Tests by Default

When Cypress mounts a component with \`cy.mount(<UserBadge />)\`, it renders that component and nothing else. React Router hooks like \`useNavigate\` and \`useParams\` read from a React context that is provided by a router component near the top of the real application tree — typically \`<BrowserRouter>\` in \`main.tsx\`. In a component test that provider does not exist, so the hook call fails.

The error usually looks like this:

\`\`\`text
useNavigate() may be used only in the context of a <Router> component.
\`\`\`

The fix is conceptually simple: wrap the component under test in a router before mounting. For component tests you almost never want \`BrowserRouter\` because it manipulates the real \`window.history\` and ties your test to the actual URL bar. Instead you want \`MemoryRouter\`, which keeps the entire history stack in memory. That makes each test hermetic — it starts from a known URL, mutates an in-memory stack, and leaves no global state behind for the next test.

Here is the component we will test throughout most of this guide. It is a small, realistic detail page that reads a route param, renders a back button that navigates programmatically, and shows a link to a sibling route.

\`\`\`tsx
// src/components/ProductDetail.tsx
import { useNavigate, useParams, Link } from 'react-router-dom';

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  return (
    <section data-cy="product-detail">
      <h1 data-cy="product-title">Product {productId}</h1>
      <button data-cy="back-button" onClick={() => navigate('/products')}>
        Back to products
      </button>
      <Link data-cy="reviews-link" to={\`/products/\${productId}/reviews\`}>
        Read reviews
      </Link>
    </section>
  );
}
\`\`\`

This single component exercises every tricky part of router testing: reading params, programmatic navigation, and declarative links. Get this one right and the rest follow.

## Setting Up Cypress Component Testing for React

Before writing tests, confirm component testing is configured. Cypress 14 (current in 2026) ships first-class component testing for React via Vite. Your \`cypress.config.ts\` should declare the component testing block:

\`\`\`ts
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
  },
});
\`\`\`

Cypress generates a support file at \`cypress/support/component.ts\` that imports the \`mount\` command. Make sure it is registered so \`cy.mount\` is available globally:

\`\`\`ts
// cypress/support/component.ts
import { mount } from 'cypress/react';
import './commands';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);
\`\`\`

Run the runner with \`npx cypress open --component\` to launch the interactive browser, or \`npx cypress run --component\` for headless CI execution. With this in place, \`cy.mount\` works for any plain component. The router wiring is what we add next.

## Mounting a Component Inside MemoryRouter

The most direct way to give a component its router context is to wrap it in \`MemoryRouter\` at mount time. The \`initialEntries\` prop seeds the in-memory history stack, and the last entry becomes the current location. The component must also be rendered through a matching \`<Routes>\`/\`<Route>\` tree so that \`useParams\` can extract the dynamic segment.

\`\`\`tsx
// src/components/ProductDetail.cy.tsx
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProductDetail } from './ProductDetail';

describe('ProductDetail (MemoryRouter)', () => {
  it('renders the product id from the URL', () => {
    cy.mount(
      <MemoryRouter initialEntries={['/products/42']}>
        <Routes>
          <Route path="/products/:productId" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    cy.get('[data-cy="product-title"]').should('have.text', 'Product 42');
  });
});
\`\`\`

There are three moving parts here, and every routed component test uses all three:

1. **\`MemoryRouter\`** provides the router context and an in-memory history. \`initialEntries\` is an array of URLs; the runner starts at the last one.
2. **\`Routes\` and \`Route\`** define the route pattern. The \`path\` must contain the same dynamic segments (\`:productId\`) that the component reads with \`useParams\`, otherwise the param is \`undefined\`.
3. **The component** is passed as the \`element\` of the matching route, not rendered directly, so React Router treats it as a routed component.

A frequent mistake is mounting \`<ProductDetail />\` directly inside \`MemoryRouter\` without a \`Route\`. The router context exists, so \`useNavigate\` stops throwing, but \`useParams\` returns an empty object because nothing parsed the URL against a pattern. Always route the component through \`<Routes>\` when it reads params.

## Asserting the Current URL with cy.location

\`cy.location\` reads the browser's location object, and with \`MemoryRouter\` Cypress reflects the in-memory location into the test iframe so you can assert on it. The most common assertion is on \`pathname\`, which holds the path portion of the URL without the origin or query string.

\`\`\`tsx
it('navigates back to the list when the back button is clicked', () => {
  cy.mount(
    <MemoryRouter initialEntries={['/products/42']}>
      <Routes>
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/products" element={<div data-cy="list">Product list</div>} />
      </Routes>
    </MemoryRouter>
  );

  cy.location('pathname').should('eq', '/products/42');
  cy.get('[data-cy="back-button"]').click();
  cy.location('pathname').should('eq', '/products');
  cy.get('[data-cy="list"]').should('be.visible');
});
\`\`\`

Notice the pattern: you provide a destination \`Route\` (here \`/products\`) so the navigation has somewhere to land and you can assert both the new pathname and the rendered destination. \`cy.location('pathname')\` retries automatically until the assertion passes or the command times out, which means you do not need an explicit wait after the click — Cypress polls the location until React Router finishes the transition.

The table below summarizes the \`cy.location\` keys you will reach for most often when testing routed components.

| cy.location key | Returns | Example value | When to use |
|---|---|---|---|
| \`pathname\` | Path without query/hash | \`/products/42\` | Asserting the active route after navigation |
| \`search\` | Query string with leading ? | \`?sort=price\` | Verifying query params set by filters or pagination |
| \`hash\` | Fragment with leading # | \`#reviews\` | Testing in-page anchor navigation |
| \`href\` | Full URL string | \`http://localhost/products/42\` | Rare; prefer pathname for stable assertions |

Prefer asserting on \`pathname\` and \`search\` separately rather than on the whole \`href\`. The full \`href\` includes the origin, which is an implementation detail of the test iframe and makes assertions brittle.

## Reading and Testing Route Params

Route params are the values React Router extracts from dynamic segments such as \`:productId\`. Because component tests let you choose the initial URL, testing params is just a matter of seeding \`initialEntries\` with different values and asserting the rendered output. This is far easier than in end-to-end tests, where you would have to navigate the whole app to reach the URL.

A clean way to cover multiple param values is a data-driven loop. Cypress runs each iteration as a separate mount, keeping the cases isolated.

\`\`\`tsx
describe('ProductDetail params', () => {
  const cases = [
    { url: '/products/1', expected: 'Product 1' },
    { url: '/products/abc-xyz', expected: 'Product abc-xyz' },
    { url: '/products/0', expected: 'Product 0' },
  ];

  cases.forEach(({ url, expected }) => {
    it(\`renders title for \${url}\`, () => {
      cy.mount(
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/products/:productId" element={<ProductDetail />} />
          </Routes>
        </MemoryRouter>
      );
      cy.get('[data-cy="product-title"]').should('have.text', expected);
    });
  });
});
\`\`\`

Multiple params work the same way — add more segments to both the URL and the \`path\`. For a nested resource such as \`/orgs/:orgId/users/:userId\`, the component receives both keys from \`useParams\`:

\`\`\`tsx
cy.mount(
  <MemoryRouter initialEntries={['/orgs/acme/users/7']}>
    <Routes>
      <Route path="/orgs/:orgId/users/:userId" element={<UserProfile />} />
    </Routes>
  </MemoryRouter>
);
// useParams() === { orgId: 'acme', userId: '7' }
\`\`\`

Remember that route params are always strings. If \`productId\` is later parsed with \`Number(productId)\`, write a test that passes a non-numeric value and asserts the component handles \`NaN\` gracefully. Param edge cases — empty strings, encoded characters like \`%20\`, very long ids — are cheap to cover with component tests and catch real production bugs that integration tests miss.

## Testing the Link Component and Declarative Navigation

The \`<Link>\` component renders an anchor that navigates without a full page reload. In component tests you assert two things: that the anchor has the correct \`href\`, and that clicking it changes the location. Checking the \`href\` attribute alone is a cheap smoke test; clicking it verifies the actual navigation behavior end to end within the mounted tree.

\`\`\`tsx
it('links to the reviews route with the correct href', () => {
  cy.mount(
    <MemoryRouter initialEntries={['/products/42']}>
      <Routes>
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route
          path="/products/:productId/reviews"
          element={<div data-cy="reviews">Reviews</div>}
        />
      </Routes>
    </MemoryRouter>
  );

  // Cheap assertion: the anchor points at the right URL
  cy.get('[data-cy="reviews-link"]').should('have.attr', 'href', '/products/42/reviews');

  // Behavioral assertion: clicking actually navigates
  cy.get('[data-cy="reviews-link"]').click();
  cy.location('pathname').should('eq', '/products/42/reviews');
  cy.get('[data-cy="reviews"]').should('be.visible');
});
\`\`\`

For \`<NavLink>\`, which adds an active class when its route matches, you can assert the class directly. This is useful for testing navigation bars and tab strips where the active item must reflect the current URL.

\`\`\`tsx
it('marks the active nav link', () => {
  cy.mount(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SettingsNav />} />
      </Routes>
    </MemoryRouter>
  );
  cy.get('[data-cy="nav-settings"]').should('have.class', 'active');
  cy.get('[data-cy="nav-profile"]').should('not.have.class', 'active');
});
\`\`\`

## Building a Reusable mountWithRouter Wrapper in TypeScript

By now the boilerplate is obvious: every test wraps a component in \`MemoryRouter\`, declares a \`<Routes>\` tree, and seeds \`initialEntries\`. Repeating this in dozens of specs is error-prone. The fix is a custom \`mountWithRouter\` command that encapsulates the wrapper. This is the single most valuable abstraction in router testing, and adding it early pays off across the whole suite.

Define the command in the support file with full TypeScript typing:

\`\`\`ts
// cypress/support/component.ts (additions)
import { mount } from 'cypress/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';

interface MountRouterOptions {
  /** Initial URL stack; defaults to ['/'] */
  initialEntries?: string[];
  /** Route pattern the element should match, e.g. '/products/:productId' */
  path?: string;
}

function mountWithRouter(element: ReactNode, options: MountRouterOptions = {}) {
  const { initialEntries = ['/'], path = '*' } = options;
  return mount(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
      mountWithRouter: typeof mountWithRouter;
    }
  }
}

Cypress.Commands.add('mount', mount);
Cypress.Commands.add('mountWithRouter', mountWithRouter);
\`\`\`

Now the tests read like specifications instead of plumbing:

\`\`\`tsx
// src/components/ProductDetail.cy.tsx (refactored)
import { ProductDetail } from './ProductDetail';

describe('ProductDetail', () => {
  it('renders the product id', () => {
    cy.mountWithRouter(<ProductDetail />, {
      initialEntries: ['/products/42'],
      path: '/products/:productId',
    });
    cy.get('[data-cy="product-title"]').should('have.text', 'Product 42');
  });
});
\`\`\`

If a test needs extra destination routes (to land on after navigation), pass the whole router tree instead. A second overload that accepts ready-made children keeps the wrapper flexible:

\`\`\`tsx
function mountRoutes(children: ReactNode, initialEntries: string[] = ['/']) {
  return mount(<MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>);
}
\`\`\`

The decision of which helper to use comes down to one rule: use \`mountWithRouter\` when you only assert on the component under test, and the full-tree variant when navigation needs a real destination route to render. The table below makes the tradeoff explicit.

| Approach | Boilerplate | Best for | Limitation |
|---|---|---|---|
| Inline \`MemoryRouter\` | High | One-off, complex multi-route trees | Repeated in every spec |
| \`mountWithRouter\` helper | Low | Single-component param/render tests | One route only |
| \`mountRoutes\` (children) | Medium | Navigation across multiple routes | Slightly more verbose |

## Testing Protected Routes and Redirects

Real applications gate routes behind authentication. A protected-route component typically reads auth state and either renders its children or returns a \`<Navigate>\` redirect. Because \`<Navigate>\` performs an imperative navigation on render, you assert the resulting \`pathname\` exactly as you would for a button click.

\`\`\`tsx
// src/components/RequireAuth.tsx
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

export function RequireAuth({ isAuthed, children }: { isAuthed: boolean; children: ReactNode }) {
  const location = useLocation();
  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
\`\`\`

\`\`\`tsx
it('redirects unauthenticated users to /login', () => {
  cy.mount(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RequireAuth isAuthed={false}>
              <div data-cy="dashboard">Secret</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div data-cy="login">Login</div>} />
      </Routes>
    </MemoryRouter>
  );

  cy.location('pathname').should('eq', '/login');
  cy.get('[data-cy="login"]').should('be.visible');
  cy.get('[data-cy="dashboard"]').should('not.exist');
});

it('renders children when authenticated', () => {
  cy.mount(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RequireAuth isAuthed={true}>
              <div data-cy="dashboard">Secret</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
  cy.get('[data-cy="dashboard"]').should('be.visible');
});
\`\`\`

The \`replace\` prop on \`<Navigate>\` matters for correctness: it replaces the current history entry instead of pushing a new one, so the user cannot click Back into the protected page. While component tests cannot easily inspect the full history stack, you can verify behavior by mounting with a longer \`initialEntries\` and checking that the back navigation does not return to the guarded route.

## Common Gotchas and How to Avoid Them

A handful of mistakes account for the majority of failing router component tests. Internalize these and you will debug far faster.

**BrowserRouter in component tests.** \`BrowserRouter\` reads and writes \`window.history\`, which leaks state between tests and ties assertions to the real URL bar. Always use \`MemoryRouter\` in component tests; reserve \`BrowserRouter\` for the real application entry point.

**Missing the Route wrapper.** Mounting a component directly inside \`MemoryRouter\` without a \`<Route>\` gives it router context but leaves \`useParams\` empty because nothing matched a pattern. If params come back \`undefined\`, you forgot the \`<Routes>\`/\`<Route>\` tree.

**Asserting before navigation settles.** React Router transitions are synchronous in memory but Cypress assertions still benefit from retry-ability. Use \`cy.location('pathname').should('eq', ...)\` rather than reading the location once into a variable — the \`.should\` retries until the route changes.

**Hardcoding the origin.** Asserting on \`cy.location('href')\` with a full URL breaks when the dev server port changes. Assert on \`pathname\` and \`search\` instead.

**Data Router APIs.** If your app uses \`createBrowserRouter\` and \`<RouterProvider>\` (the data router), use \`createMemoryRouter\` in tests instead of \`MemoryRouter\`. The pattern is the same — seed \`initialEntries\` and wrap in \`<RouterProvider router={...} />\`.

\`\`\`tsx
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

const router = createMemoryRouter(
  [{ path: '/products/:productId', element: <ProductDetail /> }],
  { initialEntries: ['/products/42'] }
);
cy.mount(<RouterProvider router={router} />);
\`\`\`

## Frequently Asked Questions

### Why does useNavigate throw in Cypress component tests?

\`useNavigate\` reads from React Router context that only exists when a router component is an ancestor. In the real app that is \`BrowserRouter\` in your entry file, but component tests mount a component in isolation with no router. Wrap the component in \`MemoryRouter\` (with a matching \`Routes\`/\`Route\` tree) before calling \`cy.mount\` and the hook resolves correctly.

### Should I use MemoryRouter or BrowserRouter for component tests?

Use \`MemoryRouter\`. It keeps the entire history stack in memory, so each test starts from a known URL via \`initialEntries\` and leaves no global \`window.history\` state behind. \`BrowserRouter\` manipulates the real address bar, leaks state between tests, and ties assertions to the dev server origin, all of which make component tests brittle and order-dependent.

### How do I assert the current route after a navigation?

Use \`cy.location('pathname').should('eq', '/expected/path')\`. Cypress reflects the in-memory router location into the test iframe and the \`.should\` assertion retries automatically until the route transition completes. Avoid reading the location once into a variable, because that does not retry and can assert before navigation settles.

### How do I pass route params to a component under test?

Seed the URL through \`initialEntries\` and declare the matching dynamic segment in the \`Route\` path. For \`/products/42\`, mount with \`initialEntries={['/products/42']}\` and \`<Route path="/products/:productId" ... />\`. The component then reads \`{ productId: '42' }\` from \`useParams\`. Remember params are always strings, so test non-numeric and encoded values.

### Can I test components that use the new data router (createBrowserRouter)?

Yes. Replace \`createBrowserRouter\` with \`createMemoryRouter\` in the test, pass your route objects and an \`initialEntries\` option, then mount \`<RouterProvider router={router} />\`. This exercises loaders and actions the same way the data router does in production while keeping navigation entirely in memory.

### How do I avoid repeating MemoryRouter boilerplate in every test?

Add a custom \`mountWithRouter\` Cypress command in \`cypress/support/component.ts\` that wraps the element in \`MemoryRouter\`, \`Routes\`, and a single \`Route\`, accepting \`initialEntries\` and \`path\` options. Register it with \`Cypress.Commands.add\` and declare it on the \`Cypress.Chainable\` interface for full TypeScript support, then call \`cy.mountWithRouter(<Component />, { initialEntries, path })\`.

### Do Link href assertions replace clicking the link?

No, they are complementary. Asserting \`should('have.attr', 'href', '/path')\` is a cheap check that the anchor points at the right URL, but it does not prove navigation works. Clicking the link and asserting \`cy.location('pathname')\` plus the rendered destination verifies the full behavior. Use the href check as a fast smoke test and the click as the behavioral test.

### Why are my route params coming back as undefined?

The most common cause is mounting the component directly inside \`MemoryRouter\` without wrapping it in a \`<Routes>\`/\`<Route>\` tree. Router context exists so hooks stop throwing, but no route pattern was matched against the URL, so \`useParams\` returns an empty object. Add \`<Route path="/products/:productId" element={<Component />} />\` so the dynamic segment is parsed.

## Conclusion

Cypress component testing turns React Router from a testing obstacle into a precise tool. By owning the router with \`MemoryRouter\`, seeding the URL through \`initialEntries\`, and asserting transitions with \`cy.location('pathname')\`, you can test routed components in isolation, fast, and without flaky dependence on the browser address bar. The reusable \`mountWithRouter\` command removes the repetitive wrapper, and the same patterns scale from a single param render test to protected-route redirects and data-router loaders.

Start by adding the support-file command, convert one routed component to \`mountWithRouter\`, and expand from there. Explore more ready-to-install testing skills for your AI coding agent in the [QASkills.sh skills directory](/skills), and read the rest of our testing deep-dives on the [QASkills.sh blog](/blog) to keep leveling up your Cypress and React testing workflow.
`,
};
