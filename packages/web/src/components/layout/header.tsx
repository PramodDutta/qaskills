'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Search, Terminal } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const navLinks = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/skills', label: 'Skills' },
  { href: '/blog', label: 'Blog' },
  { href: '/agents', label: 'Agents' },
  { href: '/packs', label: 'Packs' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clerkLoaded, setClerkLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ClerkUI, setClerkUI] = useState<Record<string, React.ComponentType<any>> | null>(null);

  useEffect(() => {
    // Only load Clerk components on the client after mount
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      import('@clerk/nextjs').then((clerk) => {
        setClerkUI({
          SignInButton: clerk.SignInButton,
          SignedIn: clerk.SignedIn,
          SignedOut: clerk.SignedOut,
          UserButton: clerk.UserButton,
        });
        setClerkLoaded(true);
      }).catch(() => {
        // Clerk not available
      });
    }
  }, []);

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

          <ThemeToggle />

          {clerkLoaded && ClerkUI ? (
            <>
              <ClerkUI.SignedOut>
                <ClerkUI.SignInButton mode="modal">
                  <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Sign In
                  </button>
                </ClerkUI.SignInButton>
              </ClerkUI.SignedOut>
              <ClerkUI.SignedIn>
                <Link
                  href="/dashboard"
                  className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <ClerkUI.UserButton afterSignOutUrl="/" />
              </ClerkUI.SignedIn>
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
          <div className="pt-3 mt-3 border-t border-border">
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
