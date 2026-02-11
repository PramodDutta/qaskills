import Link from 'next/link';
import { Terminal } from 'lucide-react';

const footerLinks = {
  Product: [
    { href: '/skills', label: 'Browse Skills' },
    { href: '/packs', label: 'Skill Packs' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ],
  Resources: [
    { href: '/getting-started', label: 'Getting Started' },
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: 'https://github.com/PramodDutta/qaskills', label: 'GitHub' },
    { href: 'https://youtube.com/@TheTestingAcademy', label: 'YouTube' },
  ],
  Legal: [
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Terminal className="h-5 w-5 text-primary" />
              <span>
                QA<span className="text-primary">Skills</span>
                <span className="text-muted-foreground text-xs">.sh</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              The QA skills directory for AI coding agents. By The Testing Academy.
            </p>
            <div className="mt-4">
              <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                npx qaskills add playwright-e2e
              </code>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href as '/skills' | '/packs' | '/leaderboard' | '/about' | '/blog' | '/terms' | '/privacy'}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} The Testing Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
