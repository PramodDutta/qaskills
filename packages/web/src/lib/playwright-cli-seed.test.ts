import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSkillMd, skillFrontmatterSchema } from '@qaskills/shared';
import { describe, expect, it } from 'vitest';

const skillPath = fileURLToPath(
  new URL('../../../../seed-skills/playwright-cli/SKILL.md', import.meta.url),
);
const referencesPath = fileURLToPath(
  new URL('../../../../seed-skills/playwright-cli/references/', import.meta.url),
);
const parsed = parseSkillMd(readFileSync(skillPath, 'utf8'));

describe('playwright-cli seed skill', () => {
  it('uses valid curated QASkills metadata', () => {
    expect(skillFrontmatterSchema.safeParse(parsed.frontmatter).success).toBe(true);
    expect(parsed.frontmatter).toMatchObject({
      name: 'Playwright CLI Browser Automation',
      version: '1.0.0',
      author: 'Pramod',
      license: 'ISC',
      testingTypes: ['e2e', 'visual', 'accessibility'],
      frameworks: ['playwright'],
      languages: ['javascript', 'typescript'],
      domains: ['web'],
    });
    expect(parsed.frontmatter.agents).toEqual(
      expect.arrayContaining(['claude-code', 'cursor', 'codex', 'opencode', 'gemini-cli', 'amp']),
    );
  });

  it('preserves the core browser, session, and debugging commands', () => {
    for (const command of [
      'playwright-cli open',
      'playwright-cli snapshot',
      'playwright-cli tab-list',
      'playwright-cli state-save',
      'playwright-cli route-list',
      'playwright-cli tracing-start',
      'playwright-cli video-start',
    ]) {
      expect(parsed.content).toContain(command);
    }
  });

  it('ships the complete imported reference bundle', () => {
    expect(readdirSync(referencesPath).sort()).toEqual([
      'request-mocking.md',
      'running-code.md',
      'session-management.md',
      'storage-state.md',
      'test-generation.md',
      'tracing.md',
      'video-recording.md',
    ]);
  });
});
