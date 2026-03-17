---
name: shadcn/ui Component Testing
description: Testing skill for shadcn/ui and Radix UI component libraries covering accessible component testing, dialog and popover testing, form validation testing, data table testing, command palette testing, and theme switching verification.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [shadcn, radix-ui, component-testing, accessibility, dialog, form, data-table, tailwind]
testingTypes: [unit, integration, e2e, accessibility]
frameworks: [vitest, playwright, react-testing-library]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# shadcn/ui Component Testing Skill

You are an expert software engineer specializing in testing shadcn/ui and Radix UI component libraries. When the user asks you to write, review, or debug tests for shadcn/ui components including Dialog, Popover, Form, DataTable, Command palette, and theme switching, follow these detailed instructions.

## Core Principles

1. **Test user interactions, not Radix internals** -- Radix primitives are well-tested; focus on your composition and customization.
2. **Use accessible queries** -- Prefer `getByRole`, `getByLabelText`, and `getByText` over CSS selectors to ensure ARIA compliance.
3. **Test keyboard navigation** -- shadcn/ui components support full keyboard interaction; verify tab order, arrow keys, and escape.
4. **Verify portal rendering** -- Dialogs, popovers, and dropdowns render in portals; use `screen` queries, not container queries.
5. **Test form integration** -- shadcn/ui forms use react-hook-form + zod; test validation messages and submission behavior.
6. **Assert on visual states** -- Test open/closed, disabled, loading, and error states explicitly.
7. **Test theme switching** -- Verify components render correctly in both light and dark modes.

## Project Structure

```
project/
  src/
    components/
      ui/
        button.tsx
        dialog.tsx
        popover.tsx
        select.tsx
        form.tsx
        data-table.tsx
        command.tsx
        sheet.tsx
        accordion.tsx
        toast.tsx
      __tests__/
        button.test.tsx
        dialog.test.tsx
        popover.test.tsx
        select.test.tsx
        form.test.tsx
        data-table.test.tsx
        command.test.tsx
        sheet.test.tsx
        accordion.test.tsx
        toast.test.tsx
        theme-switching.test.tsx
        keyboard-navigation.test.tsx
      test-utils/
        render-with-providers.tsx
        mock-data.ts
        accessibility-helpers.ts
  vitest.config.ts
  playwright.config.ts
```

## Test Utilities Setup

```typescript
// src/components/test-utils/render-with-providers.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';

interface TestProviderOptions {
  theme?: 'light' | 'dark' | 'system';
}

function TestProviders({
  children,
  theme = 'light',
}: {
  children: React.ReactNode;
  theme?: string;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & TestProviderOptions
) {
  const { theme, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders theme={theme}>{children}</TestProviders>
    ),
    ...renderOptions,
  });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

```typescript
// src/components/test-utils/accessibility-helpers.ts
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

export function expectFocusVisible(element: HTMLElement) {
  expect(element).toHaveFocus();
  expect(document.activeElement).toBe(element);
}

export function expectAriaExpanded(element: HTMLElement, expanded: boolean) {
  expect(element).toHaveAttribute('aria-expanded', String(expanded));
}

export function expectAriaSelected(element: HTMLElement, selected: boolean) {
  expect(element).toHaveAttribute('aria-selected', String(selected));
}
```

## Dialog Testing

```typescript
// src/components/__tests__/dialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { expectNoA11yViolations } from '../test-utils/accessibility-helpers';

function ConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Delete Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the item.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog onConfirm={vi.fn()} />);

    // Dialog content should not be visible initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click trigger to open
    await user.click(screen.getByRole('button', { name: /delete item/i }));

    // Dialog should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('should close when escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /delete item/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /delete item/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click the overlay (outside dialog content)
    const overlay = document.querySelector('[data-state="open"][data-overlay]');
    if (overlay) {
      await user.click(overlay as HTMLElement);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    }
  });

  it('should call onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: /delete item/i }));
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should close when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /delete item/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should trap focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /delete item/i }));

    // Tab through dialog elements
    await user.tab();
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    const deleteBtn = screen.getByRole('button', { name: /^delete$/i });

    // Focus should cycle within dialog
    const focusableElements = [cancelBtn, deleteBtn];
    for (const el of focusableElements) {
      expect(document.activeElement === el || focusableElements.includes(document.activeElement as HTMLElement)).toBe(true);
      await user.tab();
    }
  });

  it('should have correct ARIA attributes', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /delete item/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');

    const titleId = dialog.getAttribute('aria-labelledby');
    const title = document.getElementById(titleId!);
    expect(title).toHaveTextContent('Are you sure?');
  });

  it('should pass accessibility audit', async () => {
    const user = userEvent.setup();
    const { container } = render(<ConfirmDialog onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /delete item/i }));

    await expectNoA11yViolations(container);
  });
});
```

## Popover and Dropdown Testing

```typescript
// src/components/__tests__/popover.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

function UserMenu({ onLogout }: { onLogout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">Profile</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('should open on click and show menu items', async () => {
    const user = userEvent.setup();
    render(<UserMenu onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /profile/i }));

    expect(screen.getByText('My Account')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /billing/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
  });

  it('should navigate items with arrow keys', async () => {
    const user = userEvent.setup();
    render(<UserMenu onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /profile/i }));

    // Arrow down to navigate
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /settings/i })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /billing/i })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /log out/i })).toHaveFocus();
  });

  it('should call onLogout when Log out is clicked', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<UserMenu onLogout={onLogout} />);

    await user.click(screen.getByRole('button', { name: /profile/i }));
    await user.click(screen.getByRole('menuitem', { name: /log out/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('should close on escape', async () => {
    const user = userEvent.setup();
    render(<UserMenu onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /profile/i }));
    expect(screen.getByText('My Account')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('My Account')).not.toBeInTheDocument();
    });
  });

  it('should select item with Enter key', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<UserMenu onLogout={onLogout} />);

    await user.click(screen.getByRole('button', { name: /profile/i }));
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
```

## Select Component Testing

```typescript
// src/components/__tests__/select.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';

function PrioritySelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Priority">
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Priority</SelectLabel>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical" disabled>
            Critical
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe('Select', () => {
  it('should show placeholder when no value selected', () => {
    render(<PrioritySelect onChange={vi.fn()} />);

    expect(screen.getByText('Select priority')).toBeInTheDocument();
  });

  it('should open options on click', async () => {
    const user = userEvent.setup();
    render(<PrioritySelect onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox', { name: /priority/i }));

    expect(screen.getByRole('option', { name: /low/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /high/i })).toBeInTheDocument();
  });

  it('should call onChange when option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrioritySelect onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: /priority/i }));
    await user.click(screen.getByRole('option', { name: /high/i }));

    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('should not allow selecting disabled options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrioritySelect onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: /priority/i }));
    const criticalOption = screen.getByRole('option', { name: /critical/i });

    expect(criticalOption).toHaveAttribute('aria-disabled', 'true');
  });

  it('should display selected value', () => {
    render(<PrioritySelect value="medium" onChange={vi.fn()} />);

    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrioritySelect onChange={onChange} />);

    // Open with Enter
    const trigger = screen.getByRole('combobox', { name: /priority/i });
    trigger.focus();
    await user.keyboard('{Enter}');

    // Navigate with arrows and select with Enter
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalled();
  });
});
```

## Form Testing with react-hook-form + zod

```typescript
// src/components/__tests__/form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  bio: z.string().max(160, 'Bio must be at most 160 characters').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfileForm({ onSubmit }: { onSubmit: (data: ProfileFormValues) => void }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: '', email: '', bio: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} data-testid="profile-form">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Input placeholder="Tell us about yourself" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}

describe('ProfileForm', () => {
  it('should render all form fields', () => {
    render(<ProfileForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short username', async () => {
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/username/i), 'ab');
    await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid username characters', async () => {
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/username/i), 'user name!');
    await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/only contain letters, numbers/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/username/i), 'validuser');
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should submit valid form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/username/i), 'johndoe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/bio/i), 'Hello world');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { username: 'johndoe', email: 'john@example.com', bio: 'Hello world' },
        expect.anything()
      );
    });
  });

  it('should clear errors when valid input is provided', async () => {
    const user = userEvent.setup();
    render(<ProfileForm onSubmit={vi.fn()} />);

    // Trigger validation errors
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });

    // Fix the error
    await user.type(screen.getByLabelText(/username/i), 'validuser');
    await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
    });
  });
});
```

## DataTable Testing

```typescript
// src/components/__tests__/data-table.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';

// Assume a DataTable component built with @tanstack/react-table + shadcn/ui
import { DataTable, columns } from '@/components/data-table';

const mockData = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user', status: 'active' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', role: 'user', status: 'inactive' },
  { id: '4', name: 'Diana', email: 'diana@example.com', role: 'admin', status: 'active' },
  { id: '5', name: 'Eve', email: 'eve@example.com', role: 'user', status: 'active' },
];

describe('DataTable', () => {
  it('should render all rows', () => {
    render(<DataTable columns={columns} data={mockData} />);

    const rows = screen.getAllByRole('row');
    // Header row + 5 data rows
    expect(rows).toHaveLength(6);
  });

  it('should render column headers', () => {
    render(<DataTable columns={columns} data={mockData} />);

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
  });

  it('should sort by column when header is clicked', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={mockData} />);

    // Click name column header to sort ascending
    await user.click(screen.getByRole('columnheader', { name: /name/i }));

    const rows = screen.getAllByRole('row').slice(1); // Skip header
    const names = rows.map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);

    // Click again for descending
    await user.click(screen.getByRole('columnheader', { name: /name/i }));

    const rowsDesc = screen.getAllByRole('row').slice(1);
    const namesDesc = rowsDesc.map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(namesDesc).toEqual(['Eve', 'Diana', 'Charlie', 'Bob', 'Alice']);
  });

  it('should filter rows by search input', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={mockData} searchColumn="name" />);

    const searchInput = screen.getByPlaceholderText(/filter/i);
    await user.type(searchInput, 'alice');

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Alice')).toBeInTheDocument();
  });

  it('should show empty state when no data matches', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={mockData} searchColumn="name" />);

    const searchInput = screen.getByPlaceholderText(/filter/i);
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('should handle row selection with checkboxes', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        enableSelection
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", rest are row checkboxes
    expect(checkboxes).toHaveLength(6);

    // Select first row
    await user.click(checkboxes[1]);
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ '1': true })
    );
  });

  it('should handle pagination', async () => {
    const user = userEvent.setup();
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: 'user',
      status: 'active',
    }));

    render(<DataTable columns={columns} data={largeData} pageSize={10} />);

    // First page should show 10 rows
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);

    // Navigate to next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Second page should also show 10 rows
    const page2Rows = screen.getAllByRole('row').slice(1);
    expect(page2Rows).toHaveLength(10);
  });
});
```

## Command Palette (cmdk) Testing

```typescript
// src/components/__tests__/command.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';

function AppCommandPalette({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
}) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => onSelect('/dashboard')}>Dashboard</CommandItem>
          <CommandItem onSelect={() => onSelect('/settings')}>Settings</CommandItem>
          <CommandItem onSelect={() => onSelect('/profile')}>Profile</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => onSelect('new-project')}>New Project</CommandItem>
          <CommandItem onSelect={() => onSelect('new-team')}>New Team</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

describe('Command Palette', () => {
  it('should render when open', () => {
    render(
      <AppCommandPalette open={true} onOpenChange={vi.fn()} onSelect={vi.fn()} />
    );

    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should filter items by search input', async () => {
    const user = userEvent.setup();
    render(
      <AppCommandPalette open={true} onOpenChange={vi.fn()} onSelect={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText(/type a command/i), 'dash');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('should show empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(
      <AppCommandPalette open={true} onOpenChange={vi.fn()} onSelect={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText(/type a command/i), 'zzzzz');

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('should call onSelect when item is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AppCommandPalette open={true} onOpenChange={vi.fn()} onSelect={onSelect} />
    );

    await user.click(screen.getByText('Dashboard'));

    expect(onSelect).toHaveBeenCalledWith('/dashboard');
  });

  it('should navigate with arrow keys and select with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AppCommandPalette open={true} onOpenChange={vi.fn()} onSelect={onSelect} />
    );

    const input = screen.getByPlaceholderText(/type a command/i);
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalled();
  });
});
```

## Theme Switching Testing

```typescript
// src/components/__tests__/theme-switching.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    </Button>
  );
}

describe('Theme Switching', () => {
  it('should render with light theme by default', () => {
    render(<ThemeToggle />, { theme: 'light' });

    expect(screen.getByRole('button', { name: /switch to dark/i })).toBeInTheDocument();
  });

  it('should render with dark theme when configured', () => {
    render(<ThemeToggle />, { theme: 'dark' });

    expect(screen.getByRole('button', { name: /switch to light/i })).toBeInTheDocument();
  });

  it('should toggle theme on button click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />, { theme: 'light' });

    await user.click(screen.getByRole('button', { name: /switch to dark/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch to light/i })).toBeInTheDocument();
    });
  });

  it('should apply correct CSS class to document', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />, { theme: 'light' });

    await user.click(screen.getByRole('button', { name: /switch to dark/i }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
```

## Accordion Testing

```typescript
// src/components/__tests__/accordion.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

function FAQ() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is shadcn/ui?</AccordionTrigger>
        <AccordionContent>
          A collection of reusable components built with Radix UI and Tailwind CSS.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes, it follows WAI-ARIA design patterns.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe('Accordion', () => {
  it('should render all triggers', () => {
    render(<FAQ />);

    expect(screen.getByRole('button', { name: /what is shadcn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /is it accessible/i })).toBeInTheDocument();
  });

  it('should expand content when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    await user.click(screen.getByRole('button', { name: /what is shadcn/i }));

    expect(screen.getByText(/reusable components/i)).toBeVisible();
  });

  it('should collapse when clicking the same trigger again', async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const trigger = screen.getByRole('button', { name: /what is shadcn/i });
    await user.click(trigger);
    expect(screen.getByText(/reusable components/i)).toBeVisible();

    await user.click(trigger);
    // Content should be hidden (aria-hidden or removed)
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should close previous item when opening another (single mode)', async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    await user.click(screen.getByRole('button', { name: /what is shadcn/i }));
    expect(screen.getByText(/reusable components/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /is it accessible/i }));
    expect(screen.getByText(/WAI-ARIA/i)).toBeVisible();

    // First item should be collapsed
    const firstTrigger = screen.getByRole('button', { name: /what is shadcn/i });
    expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const firstTrigger = screen.getByRole('button', { name: /what is shadcn/i });
    firstTrigger.focus();

    // Space should toggle
    await user.keyboard(' ');
    expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');

    // Enter should also toggle
    await user.keyboard('{Enter}');
    expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});
```

## E2E Tests with Playwright

```typescript
// e2e/components.spec.ts
import { test, expect } from '@playwright/test';

test.describe('shadcn/ui Components E2E', () => {
  test('dialog should open and close with keyboard', async ({ page }) => {
    await page.goto('/components/dialog-demo');

    await page.getByRole('button', { name: /open dialog/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('command palette should open with Cmd+K', async ({ page }) => {
    await page.goto('/dashboard');

    // Open command palette with keyboard shortcut
    await page.keyboard.press('Meta+k');
    await expect(page.getByPlaceholder(/type a command/i)).toBeVisible();

    // Search and select
    await page.getByPlaceholder(/type a command/i).fill('settings');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('data table should sort and filter', async ({ page }) => {
    await page.goto('/dashboard/users');

    // Sort by name
    await page.getByRole('columnheader', { name: /name/i }).click();
    const firstRow = page.getByRole('row').nth(1);
    await expect(firstRow.getByRole('cell').first()).toHaveText(/^A/);

    // Filter
    await page.getByPlaceholder(/filter/i).fill('admin');
    const rows = page.getByRole('row');
    await expect(rows).toHaveCount(3); // Header + 2 admin rows
  });

  test('form should show validation errors and submit', async ({ page }) => {
    await page.goto('/profile/edit');

    // Submit empty form
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/at least 3 characters/i)).toBeVisible();

    // Fill valid data
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/saved successfully/i)).toBeVisible();
  });
});
```

## Best Practices

1. **Use `getByRole` over `getByTestId`** -- Role queries test accessibility for free; test IDs skip it.
2. **Always use `userEvent` over `fireEvent`** -- `userEvent` simulates real browser interactions including focus.
3. **Wrap state changes in `waitFor`** -- Radix components use animations; state changes may be async.
4. **Test portal-rendered content with `screen`** -- Dialogs and popovers render outside the component tree.
5. **Run axe audits on interactive states** -- Test accessibility of both closed and open states.
6. **Mock `next-themes` for predictable theme testing** -- Avoid relying on browser/OS theme preferences.
7. **Test disabled states explicitly** -- Verify that disabled buttons, inputs, and menu items are not interactive.
8. **Use `within()` for scoped queries** -- When testing tables or lists, scope queries to a specific row or item.
9. **Test the complete form lifecycle** -- Empty submit, validation errors, correction, successful submit.
10. **Keep component tests focused** -- Test one component behavior per test; compose for integration tests.

## Anti-Patterns to Avoid

1. **Testing Radix internal state** -- Do not assert on `data-state` attributes; test visible behavior instead.
2. **Using CSS selectors for queries** -- `querySelector('.shadcn-button')` is fragile; use ARIA roles.
3. **Forgetting to wait for animations** -- Radix uses enter/exit animations; wrap assertions in `waitFor`.
4. **Testing styled-component class names** -- Tailwind classes are implementation details; test visual output.
5. **Skipping keyboard interaction tests** -- Many users rely on keyboard navigation; it must work.
6. **Mocking Radix primitives** -- Never mock the component library; test the real components.
7. **Testing only the open state** -- Verify that closed/collapsed states also render correctly.
8. **Ignoring focus management** -- After a dialog closes, focus should return to the trigger element.
9. **Not testing with screen readers** -- Run automated ARIA checks and manual VoiceOver/NVDA testing.
10. **Hardcoding animation durations in tests** -- Use `waitFor` instead of `setTimeout` for animation timing.

## Running Tests

```bash
# Run all component tests
npx vitest run src/components/__tests__/

# Run a specific component test
npx vitest run src/components/__tests__/dialog.test.tsx

# Run with coverage
npx vitest run src/components/__tests__/ --coverage

# Watch mode for development
npx vitest watch src/components/__tests__/

# Run E2E tests
npx playwright test e2e/components.spec.ts

# Run E2E with UI mode
npx playwright test --ui

# Run accessibility audit
npx vitest run src/components/__tests__/ --reporter=verbose

# Debug a failing test
npx vitest run src/components/__tests__/form.test.tsx --reporter=verbose
```
