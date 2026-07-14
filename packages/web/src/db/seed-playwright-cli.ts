import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { skills } from './schema';
import { PLAYWRIGHT_CLI_SKILL } from '../lib/playwright-cli-skill';

const skillPath = resolve(__dirname, '../../../../seed-skills/playwright-cli/SKILL.md');

function readSkillBody(): string {
  const markdown = readFileSync(skillPath, 'utf8');
  const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return (match?.[1] ?? markdown).trim();
}

export function getPlaywrightCliLaunchValues() {
  return {
    ...PLAYWRIGHT_CLI_SKILL,
    tags: [...PLAYWRIGHT_CLI_SKILL.tags],
    testingTypes: [...PLAYWRIGHT_CLI_SKILL.testingTypes],
    frameworks: [...PLAYWRIGHT_CLI_SKILL.frameworks],
    languages: [...PLAYWRIGHT_CLI_SKILL.languages],
    domains: [...PLAYWRIGHT_CLI_SKILL.domains],
    agents: [...PLAYWRIGHT_CLI_SKILL.agents],
    fullDescription: readSkillBody(),
  };
}

export async function seedPlaywrightCli() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed playwright-cli');
  }

  const database = drizzle(neon(process.env.DATABASE_URL));
  const values = getPlaywrightCliLaunchValues();

  await database.insert(skills).values(values).onConflictDoUpdate({
    target: skills.slug,
    set: values,
  });

  console.log('Seeded playwright-cli without modifying any other skill rows');
}

if (require.main === module) {
  seedPlaywrightCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
