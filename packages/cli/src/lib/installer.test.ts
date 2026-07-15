import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { extractSkillPackage } from './installer';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qaskills-installer-test-'));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
});

async function write(rel: string, content: string) {
  const p = path.join(dir, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, 'utf-8');
}

describe('extractSkillPackage', () => {
  it('returns false and leaves the tree untouched when no SKILL.md exists', async () => {
    await write('src/index.ts', 'export {}');
    expect(await extractSkillPackage(dir)).toBe(false);
    expect(await fs.readFile(path.join(dir, 'src/index.ts'), 'utf-8')).toBe('export {}');
  });

  it('keeps only SKILL.md when there are no companion directories', async () => {
    await write('SKILL.md', '# skill');
    await write('README.md', 'readme');
    await write('lib/junk.js', 'junk');
    expect(await extractSkillPackage(dir)).toBe(true);
    const entries = (await fs.readdir(dir)).sort();
    expect(entries).toEqual(['SKILL.md']);
  });

  it('keeps references/, scripts/, and assets/ sitting next to SKILL.md', async () => {
    await write('SKILL.md', '# skill');
    await write('references/commands.md', 'ref');
    await write('scripts/run.sh', 'echo hi');
    await write('assets/logo.svg', '<svg/>');
    await write('node_modules/x/index.js', 'x');
    await write('README.md', 'readme');
    expect(await extractSkillPackage(dir)).toBe(true);
    const entries = (await fs.readdir(dir)).sort();
    expect(entries).toEqual(['SKILL.md', 'assets', 'references', 'scripts']);
    expect(await fs.readFile(path.join(dir, 'references/commands.md'), 'utf-8')).toBe('ref');
    expect(await fs.readFile(path.join(dir, 'scripts/run.sh'), 'utf-8')).toBe('echo hi');
  });

  it('uses the shallowest SKILL.md and its siblings when nested', async () => {
    await write('skills/my-skill/SKILL.md', '# nested');
    await write('skills/my-skill/references/notes.md', 'notes');
    await write('skills/my-skill/unrelated.txt', 'nope');
    await write('docs/guide.md', 'guide');
    expect(await extractSkillPackage(dir)).toBe(true);
    const entries = (await fs.readdir(dir)).sort();
    expect(entries).toEqual(['SKILL.md', 'references']);
    expect(await fs.readFile(path.join(dir, 'SKILL.md'), 'utf-8')).toBe('# nested');
    expect(await fs.readFile(path.join(dir, 'references/notes.md'), 'utf-8')).toBe('notes');
  });

  it('prefers the root SKILL.md over deeper ones', async () => {
    await write('SKILL.md', '# root');
    await write('examples/other/SKILL.md', '# deep');
    await write('references/root-ref.md', 'root ref');
    expect(await extractSkillPackage(dir)).toBe(true);
    expect(await fs.readFile(path.join(dir, 'SKILL.md'), 'utf-8')).toBe('# root');
    expect(await fs.readFile(path.join(dir, 'references/root-ref.md'), 'utf-8')).toBe('root ref');
  });
});
