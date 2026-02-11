import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ClerkWrapper } from '@/components/clerk-wrapper';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL('https://qaskills.sh'),
  title: {
    default: 'QASkills.sh — The QA Skills Directory for AI Agents',
    template: '%s | QASkills.sh',
  },
  description:
    'Install curated QA testing skills into Claude Code, Cursor, Copilot, Windsurf, and 27+ AI coding agents. By The Testing Academy.',
  keywords: [
    'QA',
    'testing',
    'AI agents',
    'Claude Code',
    'Cursor',
    'Copilot',
    'Playwright',
    'Cypress',
    'test automation',
    'skills',
    'The Testing Academy',
  ],
  authors: [{ name: 'Pramod Dutta', url: 'https://youtube.com/@TheTestingAcademy' }],
  creator: 'The Testing Academy',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://qaskills.sh',
    siteName: 'QASkills.sh',
    title: 'QASkills.sh — The QA Skills Directory for AI Agents',
    description:
      'Install curated QA testing skills into 27+ AI coding agents. One command. Instant expertise.',
    images: [
      {
        url: '/api/og?title=QASkills.sh&description=The+QA+Skills+Directory+for+AI+Agents',
        width: 1200,
        height: 630,
        alt: 'QASkills.sh',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QASkills.sh — The QA Skills Directory for AI Agents',
    description: 'Install curated QA testing skills into 27+ AI coding agents.',
    images: ['/api/og?title=QASkills.sh&description=The+QA+Skills+Directory+for+AI+Agents'],
    creator: '@tabordasolutions',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkWrapper>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
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
