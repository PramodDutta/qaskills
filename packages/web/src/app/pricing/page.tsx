import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Pricing',
  description: 'QA Skills pricing plans for individuals and teams',
};

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individual QA engineers getting started',
    features: [
      'Access to all public skills',
      'Install up to 10 skills',
      'Community support',
      'Basic skill search',
      'CLI tool access',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For professional QA engineers and solo testers',
    features: [
      'Everything in Free',
      'Unlimited skill installs',
      'Publish unlimited skills',
      'Priority search & filters',
      'Skill analytics dashboard',
      'Private skills (up to 5)',
      'Email support',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month for 5 users',
    description: 'For QA teams building shared test libraries',
    features: [
      'Everything in Pro',
      '5 team members included',
      'Private team registry',
      'Shared skill collections',
      'Team analytics',
      'Role-based access',
      'Priority support',
    ],
    cta: 'Start Team Trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with custom requirements',
    features: [
      'Everything in Team',
      'Unlimited team members',
      'SSO / SAML integration',
      'On-premise deployment',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? 'border-primary shadow-lg relative' : ''}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>Most Popular</Badge>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <CardDescription className="mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
              >
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl mt-24">
        <h2 className="text-2xl font-bold text-center mb-8">FAQ</h2>
        <div className="space-y-6">
          {[
            {
              q: 'Can I use QA Skills for free?',
              a: 'Yes! The free plan gives you access to all public skills and the CLI tool. You can install up to 10 skills at no cost.',
            },
            {
              q: 'What are private skills?',
              a: 'Private skills are only visible to you or your team. They\'re perfect for proprietary testing patterns and internal QA standards.',
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes, you can cancel your subscription at any time. You\'ll retain access until the end of your billing period.',
            },
            {
              q: 'Do you offer discounts for open-source projects?',
              a: 'Yes! Open-source projects get free Pro access. Contact us with your project details.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border pb-6">
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
