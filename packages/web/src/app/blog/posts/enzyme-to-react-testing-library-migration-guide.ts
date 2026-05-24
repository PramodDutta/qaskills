import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Enzyme to React Testing Library Migration Guide for 2026',
  description:
    'Migrate React Enzyme tests to React Testing Library in 2026. Shallow to mount, find() to screen queries, fireEvent to userEvent, snapshots, and checklist.',
  date: '2026-05-10',
  category: 'Migration',
  content: `
# Enzyme to React Testing Library Migration Guide for 2026

Airbnb open-sourced Enzyme in 2015, and for the next five years it was the default React testing library. Its shallow-rendering API made it trivial to inspect component internals: \`wrapper.find('Button').props()\` told you exactly what was being passed where. That same affordance turned out to be the problem. Tests that asserted on implementation details broke during refactors that did not actually change behavior, and developers came to see Enzyme as a tax on iteration speed.

React Testing Library (RTL) was published in 2018 by Kent C. Dodds and quickly became the recommended approach. It deliberately avoids exposing implementation details and instead tests components the way a user would interact with them. By 2026 Enzyme is effectively unmaintained: its last release supported React 17, and React 18 (concurrent rendering) broke many internal APIs. Teams on Enzyme are either frozen on React 17 or running with patches.

This guide is the migration playbook for teams maintaining real Enzyme suites who want to move to RTL. We cover the API mapping, mental model shift, shallow vs mount handling, fireEvent to userEvent, snapshot strategy, async patterns, and the gotchas that bite teams in week one.

For broader testing references, browse [the blog index](/blog). For testing skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from Enzyme to RTL

Three reasons. First, Enzyme does not support React 18. The maintainers have not updated the adapter beyond React 17, and the unofficial \`@cfaester/enzyme-adapter-react-18\` is community-maintained and lags behind React releases. If you want to use concurrent rendering, server components, or any post-React-17 feature, you cannot stay on Enzyme.

Second, Enzyme encourages testing implementation details. \`wrapper.state()\`, \`wrapper.instance()\`, and \`wrapper.find(Component).props()\` are direct windows into how a component is built. The result is a test suite that obstructs refactoring. RTL's API is centered on observable behavior: what the user sees, hears, and can interact with.

Third, the ecosystem has moved. The Testing Library project has companion libraries for Vue, Angular, Svelte, Solid, and Cypress. Knowing the Testing Library API once transfers across frameworks. Enzyme knowledge does not.

## Conceptual model: from internals to behavior

The mental model shift is the entire migration in one sentence. Enzyme tests answer the question, "What does this component render?" RTL tests answer the question, "What does the user see and do?"

In practice this means: stop checking \`wrapper.find('Button').props().disabled\` and start checking \`expect(screen.getByRole('button')).toBeDisabled()\`. Stop calling \`wrapper.setState({...})\` and start interacting with the component the way a user does: \`await user.click(submitButton)\` and then assert on the resulting DOM.

## API mapping table

| Enzyme | React Testing Library | Notes |
|---|---|---|
| \`shallow(<Comp />)\` | \`render(<Comp />)\` | RTL does not have shallow; render fully |
| \`mount(<Comp />)\` | \`render(<Comp />)\` | Same |
| \`wrapper.find('.x')\` | \`container.querySelector('.x')\` | Prefer \`screen.getBy*\` |
| \`wrapper.find('Button')\` | \`screen.getByRole('button')\` | Or test-id |
| \`wrapper.find('input').prop('value')\` | \`screen.getByLabelText('Email').value\` | Or \`getByDisplayValue\` |
| \`wrapper.simulate('click')\` | \`await user.click(element)\` | userEvent v14+ |
| \`wrapper.simulate('change', { target: { value: 'x' } })\` | \`await user.type(input, 'x')\` | Realistic typing |
| \`wrapper.setState({...})\` | Interact with the component | No equivalent |
| \`wrapper.instance().method()\` | Test through the UI | No equivalent |
| \`wrapper.props()\` | Pass props in \`render\` | Test through behavior |
| \`wrapper.text()\` | \`container.textContent\` | Or assertions on \`screen\` |
| \`wrapper.html()\` | \`container.innerHTML\` | Or snapshot |
| \`wrapper.update()\` | Not needed | RTL re-renders automatically |
| \`wrapper.unmount()\` | \`unmount()\` from render result | Same idea |

## Step-by-step migration plan

1. **Day 1** - Install \`@testing-library/react\`, \`@testing-library/jest-dom\`, \`@testing-library/user-event\`. Update Jest setup.
2. **Day 2** - Pick a single component. Port both its Enzyme test and its component to RTL.
3. **Days 3 to 5** - Bulk port shallow render tests. Most translate cleanly to RTL render + \`screen.getBy*\`.
4. **Days 6 to 9** - Port mount tests. These are usually closer to RTL semantically.
5. **Day 10** - Port snapshot tests. Decide which to keep, which to delete.
6. **Day 11** - Update CI; delete Enzyme dependencies.

## Before and after: a real test

**Enzyme (before)**

\`\`\`tsx
import { shallow } from 'enzyme';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('disables submit when invalid', () => {
    const wrapper = shallow(<LoginForm />);
    expect(wrapper.find('button[type="submit"]').prop('disabled')).toBe(true);
    wrapper.find('input[name=email]').simulate('change', { target: { value: 'a@b.com' } });
    wrapper.find('input[name=password]').simulate('change', { target: { value: 'secret' } });
    expect(wrapper.find('button[type="submit"]').prop('disabled')).toBe(false);
  });

  it('calls onSubmit with form values', () => {
    const onSubmit = jest.fn();
    const wrapper = shallow(<LoginForm onSubmit={onSubmit} />);
    wrapper.find('input[name=email]').simulate('change', { target: { value: 'a@b.com' } });
    wrapper.find('input[name=password]').simulate('change', { target: { value: 'secret' } });
    wrapper.find('form').simulate('submit', { preventDefault: () => {} });
    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
  });
});
\`\`\`

**RTL (after)**

\`\`\`tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('disables submit when invalid', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('calls onSubmit with form values', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
  });
});
\`\`\`

## Query priority

RTL's query API is intentionally opinionated about which queries to prefer. The order:

1. \`getByRole\` (accessible to all users including screen readers)
2. \`getByLabelText\` (good for form inputs)
3. \`getByPlaceholderText\` (acceptable when label is missing)
4. \`getByText\` (for non-interactive elements)
5. \`getByDisplayValue\` (for form values)
6. \`getByAltText\` (for images)
7. \`getByTitle\` (for tooltip text)
8. \`getByTestId\` (last resort, when nothing else works)

If you are reaching for \`getByTestId\` often, your components probably need accessibility fixes that will help both tests and real users.

## userEvent vs fireEvent

\`fireEvent\` dispatches DOM events directly. \`userEvent\` simulates real user interactions: keyboard, mouse, focus, accessibility events. Always prefer \`userEvent\`.

\`\`\`typescript
// fireEvent (lower-level, sometimes still needed)
import { fireEvent } from '@testing-library/react';
fireEvent.click(button);

// userEvent (preferred)
import userEvent from '@testing-library/user-event';
const user = userEvent.setup();
await user.click(button);
\`\`\`

\`userEvent\` is async; \`fireEvent\` is sync. \`userEvent\` v14 introduced \`setup()\` which returns a configured instance; call it in each test or in a setup file.

## Snapshot testing

Enzyme teams often use \`enzyme-to-json\` to snapshot a wrapper. The equivalent in RTL is to snapshot the container HTML.

\`\`\`typescript
const { container } = render(<Comp />);
expect(container).toMatchSnapshot();
\`\`\`

Or, better, prefer specific behavioral assertions over snapshots. Snapshots tend to drift and produce churn in code review.

## Async testing

RTL has built-in async helpers for components that perform asynchronous updates.

\`\`\`typescript
import { render, screen, waitFor } from '@testing-library/react';

it('shows the loaded users', async () => {
  render(<UserList />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});

// Or use findBy* which combines getBy* with waitFor:
it('shows the loaded users', async () => {
  render(<UserList />);
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
\`\`\`

## Mocking and dependency injection

Module mocking works identically with Jest. Component mocking via \`jest.mock\` is the same pattern.

\`\`\`typescript
jest.mock('./api', () => ({
  fetchUsers: jest.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
}));
\`\`\`

## Configuration

In your Jest setup file:

\`\`\`typescript
// jest.setup.ts
import '@testing-library/jest-dom';

// Optional: increase userEvent's default delay for slow CI
// (Not usually needed in practice.)
\`\`\`

## Gotchas and breaking changes

1. **Shallow rendering is gone.** RTL does not support it; render the full tree.
2. **Implementation details cannot be inspected.** No \`state()\`, \`instance()\`, \`props()\`.
3. **\`simulate\` is gone.** Use \`userEvent\` (preferred) or \`fireEvent\`.
4. **\`screen\` is the recommended query API.** \`container.querySelector\` works but is discouraged.
5. **\`userEvent\` is async.** Await every call.
6. **Roles are case-insensitive in matchers.** \`getByRole('button', { name: /sign in/i })\` works for "Sign in" or "Sign In".
7. **\`act\` warnings appear if you forget to await.** Use \`async/await\` consistently.
8. **Snapshots should be smaller.** Snapshot specific elements (\`expect(button).toMatchSnapshot()\`), not entire trees.
9. **Component tests still need a DOM.** Configure \`jsdom\` or \`happy-dom\` as the test environment.
10. **Mock router and contexts.** RTL does not provide a router; wrap with \`MemoryRouter\` or your context provider.

## Migration checklist

- [ ] Install \`@testing-library/react\`, \`@testing-library/jest-dom\`, \`@testing-library/user-event\`.
- [ ] Update Jest setup to import \`@testing-library/jest-dom\`.
- [ ] Pick one component, port both component test and component (if needed).
- [ ] Port shallow tests to RTL render + \`screen.getBy*\`.
- [ ] Port mount tests similarly.
- [ ] Translate \`simulate\` to \`userEvent\` actions.
- [ ] Decide on snapshot strategy: keep, replace, or delete.
- [ ] Update CI.
- [ ] Remove Enzyme and adapter dependencies.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your component suite is small, your React version is frozen at 17 forever, and the team is productive, you can stay on Enzyme. But know that you are running unmaintained software and the migration cost will only grow.

## Conclusion and next steps

The Enzyme-to-RTL migration is one of the better-leveraged refactors a React team can do in 2026. The result is a test suite that supports React 18+, refactors gracefully, and uses an API shared across the broader Testing Library ecosystem. The migration is a one- to two-week effort for a 100-component suite, mostly mechanical.

Start with the simplest, most-used component. Establish the patterns. Bulk port from there. Train the team on RTL's query priority last; once internalized, the migration sells itself.

Next read: explore the [QA Skills directory](/skills) for React testing skills, and the [blog index](/blog) for component testing patterns and CI guides.
`,
};
