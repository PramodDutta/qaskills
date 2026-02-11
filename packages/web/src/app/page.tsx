import Link from 'next/link';
import { ArrowRight, Terminal, Search, Download, Zap, Shield, Eye, Gauge, Smartphone, Code2, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FRAMEWORKS, TESTING_TYPES } from '@qaskills/shared';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              20+ QA Skills Available
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              The QA Skills Directory
              <br />
              <span className="text-primary">for AI Agents</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Install curated QA testing skills into Claude Code, Cursor, Copilot, Windsurf, and 27+ AI coding
              agents. One command. Instant expertise.
            </p>

            {/* Install command */}
            <div className="mx-auto mt-8 max-w-lg">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm shadow-sm">
                <Terminal className="h-4 w-4 text-primary shrink-0" />
                <code className="flex-1 text-left">npx qaskills add playwright-e2e</code>
                <Badge variant="secondary" className="shrink-0">
                  try it
                </Badge>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/skills">
                  Browse Skills <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: 'QA Skills', value: '20+' },
              { label: 'Testing Types', value: '15' },
              { label: 'Frameworks', value: '15' },
              { label: 'Agents Supported', value: '27+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-4 text-muted-foreground">Three steps to supercharge your AI agent with QA skills</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: '1. Search',
                description: 'Find the perfect QA skill for your testing needs. Filter by framework, testing type, and language.',
              },
              {
                icon: Download,
                title: '2. Install',
                description: 'One command installs the skill to your AI agent. Auto-detects Claude Code, Cursor, Copilot, and more.',
              },
              {
                icon: TestTube,
                title: '3. Test',
                description: 'Your AI agent now has expert QA knowledge. Write better tests with best practices baked in.',
              },
            ].map((step) => (
              <Card key={step.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testing Categories */}
      <section className="border-t border-border py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Skills for every testing need</h2>
            <p className="mt-4 text-muted-foreground">
              From E2E to performance, security to accessibility — we've got you covered
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { icon: Code2, name: 'E2E Testing', color: 'text-blue-500' },
              { icon: Zap, name: 'API Testing', color: 'text-green-500' },
              { icon: Gauge, name: 'Performance', color: 'text-red-500' },
              { icon: Shield, name: 'Security', color: 'text-orange-500' },
              { icon: Eye, name: 'Visual Regression', color: 'text-purple-500' },
              { icon: Smartphone, name: 'Mobile Testing', color: 'text-pink-500' },
              { icon: TestTube, name: 'Unit Testing', color: 'text-indigo-500' },
              { icon: Code2, name: 'Integration', color: 'text-yellow-500' },
              { icon: Shield, name: 'Accessibility', color: 'text-teal-500' },
              { icon: Code2, name: 'Contract Testing', color: 'text-cyan-500' },
            ].map((cat) => (
              <Card key={cat.name} className="text-center hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="py-4 px-3">
                  <cat.icon className={`h-6 w-6 mx-auto mb-2 ${cat.color}`} />
                  <p className="text-xs font-medium">{cat.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Frameworks */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Works with your tools</h2>
            <p className="mt-4 text-muted-foreground">Skills for all major testing frameworks</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {FRAMEWORKS.map((fw) => (
              <Badge key={fw.id} variant="outline" className="px-4 py-2 text-sm">
                {fw.name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary/5 py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">Ready to level up your QA?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join the community of QA engineers using AI agent skills to write better tests, faster.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm shadow-sm">
              <code>npx qaskills search</code>
            </div>
            <Button size="lg" asChild>
              <Link href="/skills">
                Browse All Skills <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
