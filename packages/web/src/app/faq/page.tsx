import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about QASkills.sh — how it works, supported agents, publishing skills, and more.',
};

const faqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is QASkills.sh?',
        a: 'QASkills.sh is an open source directory of curated QA testing skills designed for AI coding agents. You can install these skills into Claude Code, Cursor, Copilot, and 27+ other AI agents to give them expert QA knowledge.',
      },
      {
        q: 'Is QASkills.sh free?',
        a: 'Yes. The core platform is completely free and open source. You can browse skills, install them via the CLI, and publish your own skills at no cost.',
      },
      {
        q: 'What is a "skill"?',
        a: 'A skill is a SKILL.md file containing YAML frontmatter (metadata) and markdown instructions that teach an AI agent how to perform specific QA tasks. For example, the Playwright E2E skill teaches agents to write tests using Page Object Model, proper locators, and fixtures.',
      },
    ],
  },
  {
    category: 'Installation',
    questions: [
      {
        q: 'How do I install a skill?',
        a: 'Run `npx @qaskills/cli add <skill-name>` in your terminal. The CLI automatically detects your AI agent (Claude Code, Cursor, Copilot, etc.) and installs the skill to the correct config directory.',
      },
      {
        q: 'What AI agents are supported?',
        a: 'We support 27+ agents including Claude Code, Cursor, GitHub Copilot, Windsurf, Codex CLI, Aider, Continue, Cline, Zed, Bolt.new, Lovable, v0, Devin, Sourcegraph Cody, JetBrains AI, and more.',
      },
      {
        q: 'Do I need Node.js?',
        a: 'Yes, you need Node.js 18+ and npx to use the CLI. Most developers already have these installed.',
      },
      {
        q: 'Can I install multiple skills?',
        a: 'Yes. You can install as many skills as you want. You can also use Skill Packs to install bundles of related skills in one command.',
      },
      {
        q: 'How do I uninstall a skill?',
        a: 'Run `npx @qaskills/cli remove <skill-name>` to remove a skill from your AI agent.',
      },
    ],
  },
  {
    category: 'Publishing',
    questions: [
      {
        q: 'How do I publish a skill?',
        a: 'Create a SKILL.md file in a GitHub repository, validate it with `npx @qaskills/skill-validator validate ./SKILL.md`, then publish with `npx @qaskills/cli publish ./SKILL.md`. See our How to Publish guide for full details.',
      },
      {
        q: 'What is the quality score?',
        a: 'Each skill receives a quality score from 0-100 based on content completeness, metadata accuracy, description quality, and token count. Higher scores rank better in search and the leaderboard.',
      },
      {
        q: 'Can I update a published skill?',
        a: 'Yes. Update the version in your SKILL.md frontmatter and run `npx @qaskills/cli publish` again. Users who have the skill installed will see the update.',
      },
    ],
  },
  {
    category: 'Technical',
    questions: [
      {
        q: 'Where are skills stored on my machine?',
        a: 'Skills are installed to your AI agent\'s config directory. For Claude Code, that\'s `~/.claude/commands`. For Cursor, it\'s `.cursor/rules`. The CLI auto-detects the correct location.',
      },
      {
        q: 'Does the CLI collect any data?',
        a: 'The CLI collects anonymous usage telemetry (install/remove events, agent type) to improve the service. No personal data is collected. You can disable it with `export QASKILLS_TELEMETRY=0`.',
      },
      {
        q: 'Is the source code open?',
        a: 'Yes. QASkills.sh is fully open source under the MIT license. The CLI, SDK, web app, and all seed skills are available on GitHub.',
      },
    ],
  },
];

export default function FAQPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.flatMap((section) =>
      section.questions.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    ),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything you need to know about QASkills.sh
        </p>
      </div>

      {/* FAQ sections */}
      <div className="space-y-12">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-xl font-bold mb-6 pb-2 border-b border-border">
              {section.category}
            </h2>
            <div className="space-y-6">
              {section.questions.map((faq) => (
                <div key={faq.q}>
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Still have questions */}
      <div className="mt-16 rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-bold">Still have questions?</h2>
        <p className="mt-2 text-muted-foreground">
          We&apos;re happy to help. Reach out via email or open a GitHub discussion.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild>
            <Link href="/contact">
              Contact Us <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://github.com/PramodDutta/qaskills/discussions"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Discussions
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
