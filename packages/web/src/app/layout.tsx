import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PromoBanner } from '@/components/layout/promo-banner';
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
    'Install curated QA testing skills into Claude Code, Cursor, Copilot, and 30+ AI agents. One command, instant expertise.',
  keywords: [
    'QA',
    'testing',
    'AI agents',
    'Claude Code',
    'Cursor',
    'Copilot',
    'Playwright',
    'Cypress',
    'Selenium',
    'test automation',
    'skills',
    'vibe testing',
    'AI test automation',
    'QA skills directory',
    'testing frameworks',
    'SDET',
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
      'Install curated QA testing skills into 30+ AI coding agents. One command. Instant expertise.',
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
    description: 'Install curated QA testing skills into 30+ AI coding agents.',
    images: ['/api/og?title=QASkills.sh&description=The+QA+Skills+Directory+for+AI+Agents'],
    creator: '@TheTestingAcad',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: 'tmHLtsk1O04uNVqBHiC1E4ZVZWY0Qe8ObW2AMFHs5f4',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkWrapper>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Google Tag Manager (gtag.js) */}
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-DBRNT5VNQ3" />
          <script
            id="gtag-init"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-DBRNT5VNQ3', {
                  page_title: document.title,
                  send_page_view: true
                });
              `,
            }}
          />
        </head>
        <body className={`${inter.variable} font-sans antialiased`}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
          >
            Skip to main content
          </a>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="qaskills-theme">
            <div className="flex min-h-screen flex-col">
              <PromoBanner />
              <Header />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkWrapper>
  );
}
