import Link from 'next/link';
import { Terminal, Users, Youtube, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'About',
  description:
    'QASkills.sh is built by The Testing Academy (189K+ YouTube subscribers). Learn how we are bridging QA expertise and AI coding agents.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold">About QA Skills</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Building the bridge between QA expertise and AI coding agents
        </p>
      </div>

      <div className="prose prose-lg dark:prose-invert mx-auto max-w-none">
        <h2>The Problem</h2>
        <p>
          AI coding agents like Claude Code, Cursor, and Copilot are transforming how developers write code.
          But among 49,000+ skills indexed on existing platforms, only a handful are dedicated to QA testing.
          QA engineers have been left behind in the AI agent revolution.
        </p>

        <h2>Our Solution</h2>
        <p>
          QA Skills is the first curated directory of QA-specific agent skills. We provide expertly crafted
          testing patterns for Playwright, Cypress, Selenium, k6, Jest, Pytest, and more — installable
          into any AI coding agent with a single command.
        </p>

        <h2>The Testing Academy</h2>
        <p>
          QA Skills is built by The Testing Academy, a community of 189K+ QA engineers on YouTube.
          We&apos;ve trained thousands of testers worldwide and now we&apos;re bringing that expertise to AI agents.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Youtube className="h-8 w-8 mx-auto text-red-500 mb-3" />
            <div className="text-2xl font-bold">189K+</div>
            <div className="text-sm text-muted-foreground">YouTube Subscribers</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Terminal className="h-8 w-8 mx-auto text-primary mb-3" />
            <div className="text-2xl font-bold">20+</div>
            <div className="text-sm text-muted-foreground">QA Skills</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Users className="h-8 w-8 mx-auto text-green-500 mb-3" />
            <div className="text-2xl font-bold">27+</div>
            <div className="text-sm text-muted-foreground">Agents Supported</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <Button size="lg" asChild>
          <Link href="/skills">
            Browse Skills <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
