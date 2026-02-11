import { Mail, Github, Youtube, MessageCircle, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the QASkills.sh team. Reach out for support, enterprise inquiries, partnerships, or feedback.',
};

const channels = [
  {
    icon: Mail,
    title: 'Email',
    description: 'For general inquiries, support, and enterprise partnerships.',
    value: 'hello@thetestingacademy.com',
    href: 'mailto:hello@thetestingacademy.com',
    color: 'text-blue-500',
  },
  {
    icon: Github,
    title: 'GitHub Issues',
    description: 'Report bugs, request features, or contribute to the project.',
    value: 'github.com/PramodDutta/qaskills',
    href: 'https://github.com/PramodDutta/qaskills/issues',
    color: 'text-foreground',
  },
  {
    icon: Youtube,
    title: 'YouTube',
    description: 'Tutorials, demos, and QA testing tips from The Testing Academy.',
    value: '@TheTestingAcademy',
    href: 'https://youtube.com/@TheTestingAcademy',
    color: 'text-red-500',
  },
  {
    icon: MessageCircle,
    title: 'Community',
    description: 'Join the discussion with other QA engineers and skill publishers.',
    value: 'GitHub Discussions',
    href: 'https://github.com/PramodDutta/qaskills/discussions',
    color: 'text-green-500',
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Contact Us</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a question, found a bug, or want to partner with us? We&apos;d love to hear from you.
        </p>
      </div>

      {/* Contact channels */}
      <div className="grid gap-6 sm:grid-cols-2">
        {channels.map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            target={channel.href.startsWith('http') ? '_blank' : undefined}
            rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="group"
          >
            <Card className="h-full hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${channel.color}`}>
                    <channel.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {channel.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{channel.description}</p>
                <p className="text-sm font-medium text-primary">{channel.value}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Additional info */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Location</p>
            <p className="text-sm text-muted-foreground">
              The Testing Academy operates globally with a distributed team.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Response Time</p>
            <p className="text-sm text-muted-foreground">
              We typically respond to emails within 24-48 hours on business days.
            </p>
          </div>
        </div>
      </div>

      {/* Enterprise */}
      <div className="mt-16 rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-bold">Enterprise Inquiries</h2>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          Need custom skills, a private registry, or dedicated support for your QA team?
          Reach out for enterprise solutions.
        </p>
        <a
          href="mailto:hello@thetestingacademy.com?subject=Enterprise%20Inquiry%20-%20QASkills.sh"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Mail className="h-4 w-4" />
          hello@thetestingacademy.com
        </a>
      </div>
    </div>
  );
}
