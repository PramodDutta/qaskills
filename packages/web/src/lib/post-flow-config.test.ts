import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const webRoot = resolve(__dirname, '..', '..');
const repositoryRoot = resolve(webRoot, '..', '..');

describe('post-flow configuration', () => {
  it('builds dependency packages with auth disabled before browser tests', () => {
    const rootPackage = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
    const script = rootPackage.scripts['test:post-flow'] as string;

    expect(script).toContain('QASKILLS_DISABLE_AUTH=1 corepack pnpm build');
    expect(script).toContain('--filter @qaskills/web test:unit');
    expect(script).toContain('--filter @qaskills/web test:e2e');
  });

  it('starts a fresh production server without fake Clerk credentials', () => {
    const webPackage = JSON.parse(readFileSync(resolve(webRoot, 'package.json'), 'utf8'));
    const startScript = webPackage.scripts['start:test'] as string;
    const playwrightConfig = readFileSync(resolve(webRoot, 'playwright.config.ts'), 'utf8');

    expect(startScript).toContain('QASKILLS_DISABLE_AUTH=1 next start');
    expect(startScript).not.toContain('CLERK_');
    expect(playwrightConfig).toContain('reuseExistingServer: false');
  });
});
