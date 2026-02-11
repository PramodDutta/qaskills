import Link from 'next/link';
import { Check, Terminal, ArrowRight, Zap, Building2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'QASkills.sh is free and open source. Browse skills, install via CLI, and publish your own — all at no cost.',
};

const plans = [
  {
    name: 'Free',
    icon: Heart,
    price: '$0',
    period: 'forever',
    description: 'Everything you need to supercharge your AI agent with QA skills.',
    features: [
      'Browse & search all skills',
      'Install unlimited skills via CLI',
      'Auto-detect 27+ AI agents',
      'Filter by framework, type & language',
      'Community support via GitHub',
    ],
    cta: 'Get Started',
    ctaHref: '/getting-started',
    highlighted: true,
  },
  {
    name: 'Publisher',
    icon: Terminal,
    price: '$0',
    period: 'forever',
    description: 'Publish your own QA skills and share expertise with the community.',
    features: [
      'Everything in Free',
      'Publish unlimited skills',
      'Skill analytics dashboard',
      'Quality score & verification',
      'Leaderboard ranking',
    ],
    cta: 'Start Publishing',
    ctaHref: '/how-to-publish',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    icon: Building2,
    price: 'Contact Us',
    period: '',
    description: 'Custom skills, private registries, and dedicated support for your team.',
    features: [
      'Everything in Publisher',
      'Private skill registry',
      'Custom skill development',
      'Priority support',
      'Team management & SSO',
    ],
    cta: 'Contact Sales',
    ctaHref: '/contact',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="mb-4">
          Open Source
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Free for everyone
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          QASkills.sh is free and open source. Install skills, publish your own, and contribute to
          the QA community — no credit card required.
        </p>
      </div>

      {/* Plans */}
      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={
              plan.highlighted
                ? 'border-primary shadow-lg relative'
                : ''
            }
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <plan.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground">/{plan.period}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.highlighted ? 'default' : 'outline'}
                asChild
              >
                <Link href={plan.ctaHref}>
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* CLI install */}
      <div className="mt-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Start using skills in seconds</h2>
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm shadow-sm">
          <Zap className="inline h-4 w-4 text-primary mr-2" />
          <code>npx @qaskills/cli add playwright-e2e</code>
        </div>
      </div>

      {/* FAQ link */}
      <div className="mt-16 text-center">
        <p className="text-muted-foreground">
          Have questions?{' '}
          <Link href="/faq" className="text-primary hover:underline">
            Check our FAQ
          </Link>{' '}
          or{' '}
          <Link href="/contact" className="text-primary hover:underline">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
