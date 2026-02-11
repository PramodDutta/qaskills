import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ClerkWrapper } from '@/components/clerk-wrapper';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'QA Skills — Agent Skills Directory for QA Testing',
    template: '%s | QA Skills',
  },
  description:
    'The curated QA skills directory for AI coding agents. Install testing skills for Claude Code, Cursor, Copilot, Windsurf, and 27+ agents.',
  keywords: [
    'QA testing',
    'AI agent skills',
    'Playwright',
    'Cypress',
    'test automation',
    'Claude Code',
    'Cursor',
    'Copilot',
  ],
  authors: [{ name: 'The Testing Academy' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://qaskills.sh',
    siteName: 'QA Skills',
    title: 'QA Skills — Agent Skills Directory for QA Testing',
    description:
      'The curated QA skills directory for AI coding agents. Install testing skills for 27+ agents.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QA Skills',
    description: 'Agent Skills Directory for QA Testing',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkWrapper>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkWrapper>
  );
}
