import type { Metadata } from 'next';
import Link from 'next/link';
import { generateBreadcrumbJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = {
  title: 'QASkills vs SkillsMP: Best QA Skills Directory',
  description:
    'Compare QASkills.sh and SkillsMP for QA testing skills. See which AI agent skills directory is better for test automation, Playwright, Cypress, and more.',
  alternates: { canonical: 'https://qaskills.sh/compare/qaskills-vs-skillsmp' },
  openGraph: {
    title: 'QASkills vs SkillsMP: Best QA Skills Directory for AI Agents',
    description:
      'Compare QASkills.sh and SkillsMP for QA testing skills. See which AI agent skills directory is better for test automation.',
    url: 'https://qaskills.sh/compare/qaskills-vs-skillsmp',
    type: 'website',
  },
};

export default function QASkillsVsSkillsMP() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'QASkills.sh vs SkillsMP: Which Is Better for QA Testing?',
            description:
              'Compare QASkills.sh and SkillsMP for QA testing skills. See which AI agent skills directory is better for test automation, Playwright, Cypress, and more.',
            url: 'https://qaskills.sh/compare/qaskills-vs-skillsmp',
            datePublished: '2026-02-14',
            image:
              'https://qaskills.sh/api/og?title=QASkills+vs+SkillsMP&description=Best+QA+Skills+Directory',
            author: {
              '@type': 'Person',
              name: 'Pramod Dutta',
              url: 'https://youtube.com/@TheTestingAcademy',
            },
            publisher: {
              '@type': 'Organization',
              name: 'QASkills.sh',
              url: 'https://qaskills.sh',
              logo: {
                '@type': 'ImageObject',
                url: 'https://qaskills.sh/logo.svg',
                width: 512,
                height: 512,
              },
            },
            mainEntityOfPage: 'https://qaskills.sh/compare/qaskills-vs-skillsmp',
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: 'Home', url: 'https://qaskills.sh' },
              { name: 'Compare', url: 'https://qaskills.sh/compare' },
              {
                name: 'QASkills vs SkillsMP',
                url: 'https://qaskills.sh/compare/qaskills-vs-skillsmp',
              },
            ])
          ),
        }}
      />

      <article>
        {/* Header */}
        <div className="mb-12">
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Compare</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">QASkills vs SkillsMP</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            QASkills.sh vs SkillsMP: Which Is Better for QA Testing?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
            Both QASkills.sh and SkillsMP help you discover and install skills for AI coding agents.
            But they take fundamentally different approaches. This comparison breaks down the key
            differences so you can choose the right platform for your QA testing needs.
          </p>
        </div>

        {/* Key Takeaways */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 mb-10">
          <h2 className="text-xl font-bold mb-4">Key Takeaways</h2>
          <ul className="space-y-3 text-sm leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                QASkills.sh is QA-focused with 48+ curated testing skills; SkillsMP is
                general-purpose with 66K+ skills across all SDLC phases
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                QASkills.sh is 100% free and open source; SkillsMP operates on a freemium model
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                QASkills.sh includes algorithmic quality scoring (0-100) for every skill; SkillsMP
                relies on community ratings and download counts
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">--</span>
              <span>
                Both platforms support Claude Code, Cursor, Copilot, and 30+ agents using the
                SKILL.md standard
              </span>
            </li>
          </ul>
        </div>

        {/* Quick Comparison Table */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Quick Comparison</h2>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left font-semibold">Feature</th>
                  <th className="px-4 py-3 text-left font-semibold">QASkills.sh</th>
                  <th className="px-4 py-3 text-left font-semibold">SkillsMP</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Focus',
                    qaskills: 'QA & testing only',
                    skillsmp: 'General-purpose (all SDLC)',
                  },
                  {
                    feature: 'Skills Count',
                    qaskills: '48+ curated QA skills',
                    skillsmp: '66,000+ skills across categories',
                  },
                  {
                    feature: 'Pricing',
                    qaskills: 'Free & open source',
                    skillsmp: 'Freemium (free tier + paid plans)',
                  },
                  {
                    feature: 'Quality Scoring',
                    qaskills: 'Algorithmic 0-100 score',
                    skillsmp: 'Community ratings & downloads',
                  },
                  {
                    feature: 'QA Specialization',
                    qaskills: 'Deep (E2E, API, mobile, perf, security, a11y)',
                    skillsmp: 'Broad but shallow QA coverage',
                  },
                  {
                    feature: 'Agent Support',
                    qaskills: '30+ agents (Claude Code, Cursor, Copilot, etc.)',
                    skillsmp: '30+ agents (similar ecosystem)',
                  },
                  {
                    feature: 'Open Source',
                    qaskills: 'Yes (MIT license)',
                    skillsmp: 'No',
                  },
                  {
                    feature: 'CLI Tool',
                    qaskills: 'npx @qaskills/cli',
                    skillsmp: 'npx skillsmp',
                  },
                  {
                    feature: 'Skill Packs',
                    qaskills: 'Yes (curated bundles)',
                    skillsmp: 'Collections (user-curated)',
                  },
                  {
                    feature: 'Built By',
                    qaskills: 'The Testing Academy (189K+ QA community)',
                    skillsmp: 'Independent developer community',
                  },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.qaskills}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.skillsmp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* QA Testing Focus */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">QA Testing Focus</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              The most significant difference between QASkills.sh and SkillsMP is specialization.
              QASkills.sh was built from the ground up as a QA-first platform. Every skill in its
              directory targets a specific testing discipline: end-to-end testing with Playwright and
              Cypress, API testing with Postman and REST Assured, performance testing with k6 and
              JMeter, security testing with OWASP ZAP, accessibility testing with axe-core, and
              mobile testing with Appium.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              SkillsMP takes a broader approach. With over 66,000 skills spanning the entire software
              development lifecycle, it covers everything from frontend development and DevOps to
              data science and documentation. QA testing skills exist on the platform, but they
              represent a small fraction of the total catalog. If you search for &quot;Playwright&quot;
              on SkillsMP, you may find results, but they sit alongside thousands of unrelated skills
              — and there is no specialized curation to ensure those testing skills follow industry
              best practices like Page Object Model, proper test isolation, or data-driven patterns.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              QASkills.sh, backed by The Testing Academy (189K+ subscribers), ensures every published
              skill adheres to real-world QA standards. Skills are reviewed for content completeness,
              correct use of testing patterns, proper framework configurations, and practical examples
              that engineers can use immediately.
            </p>
          </div>
        </section>

        {/* Quality vs Quantity */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Quality vs Quantity</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              QASkills.sh takes a curated approach: 48+ skills, each with an algorithmic quality
              score from 0 to 100. The scoring system evaluates content completeness, metadata
              accuracy, description depth, and token count. High-scoring skills appear prominently
              in search results and on the leaderboard, creating a natural incentive for authors to
              produce excellent content. Every skill is validated against a Zod schema before
              publication, ensuring structural consistency.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              SkillsMP prioritizes breadth, listing 66,000+ skills submitted by its community. While
              the sheer volume means you can find skills for almost any topic, the quality varies
              significantly. Some skills are thorough and well-maintained; others are minimal
              placeholders. SkillsMP uses community ratings and download counts as quality signals,
              which can be helpful but are lagging indicators — a new skill from an expert may have
              zero downloads while an outdated one still ranks high from historical popularity.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              For QA engineers who need reliable, production-ready testing patterns, the curated
              approach typically saves time. You spend less effort evaluating whether a skill is
              trustworthy and more time actually writing tests.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Pricing</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              QASkills.sh is completely free and open source under the MIT license. You can browse
              skills on the web, install them via the CLI, publish your own skills, and even
              self-host the entire platform. The CLI, SDK, web application, and all seed skills are
              available on GitHub with no usage limits or paywalls.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              SkillsMP offers a free tier that provides access to browse and install public skills.
              Advanced features — such as premium skills from verified authors, enhanced analytics,
              and priority support — are available through paid subscription plans. This freemium
              model works well for teams that need commercial support, but individual QA engineers
              and small teams may find the free tier sufficient for most use cases.
            </p>
          </div>
        </section>

        {/* Agent Compatibility */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Agent Compatibility</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              Both platforms support the same broad ecosystem of AI coding agents. Skills on
              QASkills.sh and SkillsMP both use the SKILL.md format — a markdown file with YAML
              frontmatter that any compatible agent can read. This means skills from either platform
              work with Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, Aider, Continue,
              Codex CLI, JetBrains AI, Zed, and many more.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              QASkills.sh explicitly tests compatibility with 30+ agents and labels each skill with
              its supported agents. The CLI automatically detects which agent you are using and
              installs skills to the correct configuration directory. SkillsMP also supports
              multi-agent installation but may require manual configuration for some lesser-known
              agents.
            </p>
          </div>
        </section>

        {/* CLI and Developer Experience */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">CLI and Developer Experience</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              QASkills provides a purpose-built CLI (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">npx @qaskills/cli</code>)
              with commands for adding, removing, searching, listing, and publishing skills. The CLI
              detects your agent automatically, validates skills before installation, and provides
              clear feedback at each step. For QA engineers who primarily work in the terminal, this
              is a streamlined experience.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              SkillsMP also offers a CLI tool with similar capabilities. The web interface is the
              primary discovery mechanism for both platforms, but QASkills.sh&apos;s web experience
              is tailored to QA workflows — you can filter by testing type (E2E, API, unit,
              integration, performance, security, accessibility), framework (Playwright, Cypress,
              Jest, Pytest, Selenium, k6), and language.
            </p>
          </div>
        </section>

        {/* When to Choose QASkills.sh */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">When to Choose QASkills.sh</h2>
          <ul className="space-y-3">
            {[
              'You are a QA engineer, SDET, or test automation lead',
              'You need production-ready testing patterns for Playwright, Cypress, Selenium, or similar frameworks',
              'You value curated quality over volume — you want skills vetted by QA professionals',
              'You want a completely free and open-source solution with no paywalls',
              'You need specialized skills for API testing, performance testing, security testing, or accessibility testing',
              'You want quality scores to quickly identify the best skills',
              'You prefer a platform backed by a dedicated QA community (The Testing Academy, 189K+)',
            ].map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-green-500 shrink-0 mt-0.5">+</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* When to Choose SkillsMP */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">When to Choose SkillsMP</h2>
          <ul className="space-y-3">
            {[
              'You need skills across the entire SDLC, not just QA testing',
              'You want access to 66,000+ skills and prefer discovering through breadth',
              'Your team uses AI agents for coding, documentation, DevOps, and testing — and wants one platform for all',
              'You value community-driven curation and want to see download counts and ratings',
              'You are willing to pay for premium skills and enhanced features',
              'You need commercial support or enterprise features',
            ].map((reason) => (
              <li key={reason} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-blue-500 shrink-0 mt-0.5">+</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Community and Ecosystem */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Community and Ecosystem</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              QASkills.sh is built by The Testing Academy, one of the largest QA education
              communities on YouTube with over 189,000 subscribers. This means the platform benefits
              from deep domain expertise in test automation. The seed skills were crafted by
              professional QA engineers who understand real-world testing challenges — flaky tests,
              proper test isolation, meaningful assertions, and scalable test architecture.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              SkillsMP has a broader developer community contributing skills across all disciplines.
              This diversity is a strength for general-purpose use, but it means QA skills are
              authored by contributors with varying levels of testing expertise. The platform&apos;s
              community rating system helps surface quality content over time, but new or niche
              testing skills may take longer to gain visibility.
            </p>
          </div>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Conclusion</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              QASkills.sh and SkillsMP serve different needs. If you are a QA professional looking
              for high-quality, curated testing skills with transparent quality scoring and zero
              cost, QASkills.sh is the clear choice. Its QA specialization, open-source model, and
              backing by The Testing Academy make it the go-to directory for test automation skills.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              If you need a broader catalog that covers the entire development lifecycle and are
              comfortable evaluating quality yourself, SkillsMP&apos;s massive library offers
              something for almost every use case. Many teams use both platforms — QASkills.sh for
              their testing workflow and SkillsMP for general development skills.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              The best part: both platforms support the same SKILL.md standard and the same AI
              agents, so you are never locked in. Try QASkills.sh for your QA needs and see the
              difference curated quality makes.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-bold">Ready to upgrade your QA testing?</h2>
          <p className="mt-2 text-muted-foreground">
            Browse 48+ curated QA skills and install your first one in under 30 seconds.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/skills"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Browse QA Skills
            </Link>
            <Link
              href="/getting-started"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
