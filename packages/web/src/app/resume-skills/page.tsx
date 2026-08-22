import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateBreadcrumbJsonLd, generateCollectionPageJsonLd } from '@/lib/json-ld';
import { resumeSkillGroups, resumeSkillCount } from './resume-skills-data';

const canonicalUrl = 'https://qaskills.sh/resume-skills';
const description =
  'Free resume skills for QA engineers, SDETs, and DevOps: install ATS optimization, interview prep, and portfolio skills into Claude Code, Cursor, or any AI coding agent.';

export const metadata: Metadata = {
  title: 'Resume Skills for QA Engineers & SDETs',
  description,
  keywords: [
    'QA resume',
    'SDET resume',
    'automation tester resume',
    'QA interview prep',
    'ATS resume optimization',
    'QA portfolio',
  ],
  alternates: { canonical: canonicalUrl },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
    title: 'Resume Skills for QA Engineers & SDETs',
    description,
    images: [
      {
        url: '/api/og?title=Resume+Skills+for+QA+Engineers&description=ATS+optimization%2C+interview+prep%2C+and+portfolio+skills+for+your+AI+agent',
        width: 1200,
        height: 630,
        alt: 'QASkills resume skills for QA engineers and SDETs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resume Skills for QA Engineers & SDETs',
    description,
  },
};

export default function ResumeSkillsPage() {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://qaskills.sh' },
    { name: 'Resume Skills', url: canonicalUrl },
  ]);
  const collectionJsonLd = generateCollectionPageJsonLd({
    name: 'Resume Skills for QA Engineers and SDETs',
    description,
    url: canonicalUrl,
    items: resumeSkillGroups.flatMap((group) =>
      group.skills.map((skill) => ({
        name: skill.name,
        url: `https://qaskills.sh/skills/thetestingacademy/${skill.slug}`,
      })),
    ),
  });

  return (
    <div className="overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="relative border-b border-border bg-gradient-to-b from-primary/[0.08] via-background to-background">
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <FileText className="mr-1 h-3 w-3" /> {resumeSkillCount} free skills
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Resume skills for QA engineers and SDETs
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Teach your AI coding agent to fix your resume the way it fixes your tests. ATS
              optimization, bullet rewriting, interview prep, portfolios, and salary negotiation,
              tuned for testers, automation engineers, and DevOps. Install into Claude Code,
              Cursor, Copilot, or any of 30+ agents.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <code className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 font-mono text-sm">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                npx qaskills add qa-tester-resume-optimizer
              </code>
              <Link
                href="/skills?testingType=career"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Browse in the catalog <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {resumeSkillGroups.map((group) => (
        <section key={group.id} className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">{group.title}</h2>
            <p className="mt-1 text-muted-foreground">{group.description}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.skills.map((skill) => (
                <Link
                  key={skill.slug}
                  href={`/skills/thetestingacademy/${skill.slug}`}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
                >
                  <h3 className="font-semibold leading-snug group-hover:text-primary">
                    {skill.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{skill.blurb}</p>
                  <p className="mt-3 font-mono text-xs text-muted-foreground">
                    npx qaskills add {skill.slug}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="text-xl font-bold">How it works</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Each skill is a SKILL.md file your AI agent loads as expert context. Install one, then
            ask your agent to review your resume, prep an interview, or draft a cover letter; it
            applies the frameworks from the skill instead of generic advice. All resume skills are
            free, like the rest of the catalog. Adapted for QA professionals from the MIT-licensed{' '}
            <a
              href="https://github.com/Paramchoudhary/ResumeSkills"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Resume Skills
            </a>{' '}
            project, with six QA-specific skills written by The Testing Academy.
          </p>
        </div>
      </section>
    </div>
  );
}
