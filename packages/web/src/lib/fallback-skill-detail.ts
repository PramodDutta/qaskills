import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SkillRow } from '@/db/schema/skills';
import { FALLBACK_SKILLS } from './fallback-skills';
import { PLAYWRIGHT_CLI_SKILL } from './playwright-cli-skill';

const PLAYWRIGHT_CLI_AUTHOR = PLAYWRIGHT_CLI_SKILL.authorName;
const PLAYWRIGHT_CLI_SLUG = PLAYWRIGHT_CLI_SKILL.slug;

function findSeedSkillPath(): string | null {
  const relativePath = ['seed-skills', PLAYWRIGHT_CLI_SLUG, 'SKILL.md'];
  const candidates = [
    resolve(process.cwd(), '..', '..', ...relativePath),
    resolve(process.cwd(), ...relativePath),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function readFallbackPlaywrightCliMarkdown(): string | null {
  const filePath = findSeedSkillPath();
  return filePath ? readFileSync(filePath, 'utf8') : null;
}

function extractMarkdownBody(markdown: string): string {
  const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return (match?.[1] ?? markdown).trim();
}

export function getFallbackSkillDetail(author: string, slug: string): SkillRow | null {
  if (author !== PLAYWRIGHT_CLI_AUTHOR || slug !== PLAYWRIGHT_CLI_SLUG) return null;

  const summary = FALLBACK_SKILLS.find((skill) => skill.slug === PLAYWRIGHT_CLI_SLUG);
  const markdown = readFallbackPlaywrightCliMarkdown();
  if (!summary || !markdown) return null;

  const launchDate = PLAYWRIGHT_CLI_SKILL.createdAt;

  return {
    id: '00000000-0000-4000-8000-000000000003',
    name: summary.name,
    slug: summary.slug,
    description: summary.description,
    fullDescription: extractMarkdownBody(markdown),
    version: PLAYWRIGHT_CLI_SKILL.version,
    license: PLAYWRIGHT_CLI_SKILL.license,
    githubUrl: PLAYWRIGHT_CLI_SKILL.githubUrl,
    authorId: null,
    authorName: summary.author,
    tags: [...PLAYWRIGHT_CLI_SKILL.tags],
    testingTypes: summary.testingTypes,
    frameworks: summary.frameworks,
    languages: [...PLAYWRIGHT_CLI_SKILL.languages],
    domains: [...PLAYWRIGHT_CLI_SKILL.domains],
    agents: [...PLAYWRIGHT_CLI_SKILL.agents],
    qualityScore: summary.qualityScore,
    installCount: summary.installCount,
    weeklyInstalls: summary.installCount,
    featured: summary.featured,
    verified: summary.verified,
    createdAt: launchDate,
    updatedAt: launchDate,
  };
}
