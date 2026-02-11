'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Search, Terminal } from 'lucide-react';

let ClerkComponents: {
  SignInButton: React.ComponentType<{ mode: string; children: React.ReactNode }>;
  SignedIn: React.ComponentType<{ children: React.ReactNode }>;
  SignedOut: React.ComponentType<{ children: React.ReactNode }>;
  UserButton: React.ComponentType<{ afterSignOutUrl: string }>;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clerk = require('@clerk/nextjs');
  ClerkComponents = {
    SignInButton: clerk.SignInButton,
    SignedIn: clerk.SignedIn,
    SignedOut: clerk.SignedOut,
    UserButton: clerk.UserButton,
  };
} catch {
  // Clerk not available
}

const navLinks = [
  { href: '/skills', label: 'Skills' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/packs', label: 'Packs' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasClerk = !!ClerkComponents && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Terminal className="h-6 w-6 text-primary" />
          <span>
            QA<span className="text-primary">Skills</span>
            <span className="text-muted-foreground text-sm">.sh</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/skills"
            className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search skills...</span>
            <kbd className="pointer-events-none ml-4 hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              /
            </kbd>
          </Link>

          {hasClerk && ClerkComponents ? (
            <>
              <ClerkComponents.SignedOut>
                <ClerkComponents.SignInButton mode="modal">
                  <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Sign In
                  </button>
                </ClerkComponents.SignInButton>
              </ClerkComponents.SignedOut>
              <ClerkComponents.SignedIn>
                <Link
                  href="/dashboard"
                  className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <ClerkComponents.UserButton afterSignOutUrl="/" />
              </ClerkComponents.SignedIn>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-background p-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
