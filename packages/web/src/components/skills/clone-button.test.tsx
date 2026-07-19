import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('React', React);

const clerkMocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => {
    throw new Error('Clerk hooks must not run without a publishable key');
  }),
}));

vi.mock('@clerk/nextjs', () => ({
  SignInButton: () => null,
  useAuth: clerkMocks.useAuth,
}));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/button', () => ({ Button: () => null }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { CloneButton } from './clone-button';

describe('CloneButton without Clerk', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clerkMocks.useAuth.mockClear();
  });

  it('renders an auth-disabled clone link without calling Clerk hooks', () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', '');

    const button = CloneButton({ author: 'Pramod', slug: 'playwright-cli' });
    const link = button.props.children;

    expect(clerkMocks.useAuth).not.toHaveBeenCalled();
    expect(button.props.asChild).toBe(true);
    expect(link.props.href).toBe('/dashboard/create?clone=Pramod%2Fplaywright-cli');
  });
});
