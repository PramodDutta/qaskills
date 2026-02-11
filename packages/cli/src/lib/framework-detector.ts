import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectedFramework {
  id: string;
  name: string;
  /** The file or directory that triggered the detection. */
  evidence: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readFileSafe(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

function readJsonSafe(p: string): Record<string, unknown> | null {
  const raw = readFileSafe(p);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasDep(pkg: Record<string, unknown>, name: string): boolean {
  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;
  return !!(deps?.[name] || devDeps?.[name]);
}

// ---------------------------------------------------------------------------
// Individual detectors
// ---------------------------------------------------------------------------

function detectPlaywright(cwd: string): DetectedFramework | null {
  const configs = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'];
  for (const cfg of configs) {
    const p = path.join(cwd, cfg);
    if (fileExists(p)) {
      return { id: 'playwright', name: 'Playwright', evidence: cfg };
    }
  }
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  if (pkg && (hasDep(pkg, '@playwright/test') || hasDep(pkg, 'playwright'))) {
    return { id: 'playwright', name: 'Playwright', evidence: 'package.json' };
  }
  return null;
}

function detectCypress(cwd: string): DetectedFramework | null {
  const configs = ['cypress.config.ts', 'cypress.config.js', 'cypress.config.mjs'];
  for (const cfg of configs) {
    if (fileExists(path.join(cwd, cfg))) {
      return { id: 'cypress', name: 'Cypress', evidence: cfg };
    }
  }
  if (fileExists(path.join(cwd, 'cypress'))) {
    return { id: 'cypress', name: 'Cypress', evidence: 'cypress/' };
  }
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  if (pkg && hasDep(pkg, 'cypress')) {
    return { id: 'cypress', name: 'Cypress', evidence: 'package.json' };
  }
  return null;
}

function detectJest(cwd: string): DetectedFramework | null {
  const configs = ['jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.json'];
  for (const cfg of configs) {
    if (fileExists(path.join(cwd, cfg))) {
      return { id: 'jest', name: 'Jest', evidence: cfg };
    }
  }
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  if (pkg) {
    if ((pkg as Record<string, unknown>).jest) {
      return { id: 'jest', name: 'Jest', evidence: 'package.json (jest config)' };
    }
    if (hasDep(pkg, 'jest')) {
      return { id: 'jest', name: 'Jest', evidence: 'package.json' };
    }
  }
  return null;
}

function detectPytest(cwd: string): DetectedFramework | null {
  if (fileExists(path.join(cwd, 'pytest.ini'))) {
    return { id: 'pytest', name: 'Pytest', evidence: 'pytest.ini' };
  }
  if (fileExists(path.join(cwd, 'conftest.py'))) {
    return { id: 'pytest', name: 'Pytest', evidence: 'conftest.py' };
  }
  // Check pyproject.toml for [tool.pytest] section
  const pyproject = readFileSafe(path.join(cwd, 'pyproject.toml'));
  if (pyproject && (pyproject.includes('[tool.pytest') || pyproject.includes('[pytest]'))) {
    return { id: 'pytest', name: 'Pytest', evidence: 'pyproject.toml' };
  }
  // Check setup.cfg
  const setupCfg = readFileSafe(path.join(cwd, 'setup.cfg'));
  if (setupCfg && setupCfg.includes('[tool:pytest]')) {
    return { id: 'pytest', name: 'Pytest', evidence: 'setup.cfg' };
  }
  return null;
}

function detectSelenium(cwd: string): DetectedFramework | null {
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  if (pkg && (hasDep(pkg, 'selenium-webdriver') || hasDep(pkg, 'webdriverio'))) {
    return { id: 'selenium', name: 'Selenium', evidence: 'package.json' };
  }
  // Check pom.xml for Selenium Java
  const pom = readFileSafe(path.join(cwd, 'pom.xml'));
  if (pom && pom.includes('selenium')) {
    return { id: 'selenium', name: 'Selenium', evidence: 'pom.xml' };
  }
  // Check requirements.txt for Python Selenium
  const reqs = readFileSafe(path.join(cwd, 'requirements.txt'));
  if (reqs && reqs.includes('selenium')) {
    return { id: 'selenium', name: 'Selenium', evidence: 'requirements.txt' };
  }
  return null;
}

function detectK6(cwd: string): DetectedFramework | null {
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  if (pkg && hasDep(pkg, 'k6')) {
    return { id: 'k6', name: 'k6', evidence: 'package.json' };
  }
  // Look for k6 script files
  const k6Scripts = ['k6.config.js', 'k6.config.ts', 'load-test.js', 'load-test.ts'];
  for (const script of k6Scripts) {
    if (fileExists(path.join(cwd, script))) {
      return { id: 'k6', name: 'k6', evidence: script };
    }
  }
  // Check for k6/ directory
  if (fileExists(path.join(cwd, 'k6'))) {
    return { id: 'k6', name: 'k6', evidence: 'k6/' };
  }
  return null;
}

function detectVitest(cwd: string): DetectedFramework | null {
  const configs = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'];
  for (const cfg of configs) {
    if (fileExists(path.join(cwd, cfg))) {
      return { id: 'vitest', name: 'Vitest', evidence: cfg };
    }
  }
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  if (pkg && hasDep(pkg, 'vitest')) {
    return { id: 'vitest', name: 'Vitest', evidence: 'package.json' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect testing frameworks in the given project directory.
 *
 * @param projectDir The root of the current project (defaults to cwd).
 * @returns Array of detected frameworks with evidence of their detection.
 */
export function detectFrameworks(projectDir?: string): DetectedFramework[] {
  const cwd = projectDir ?? process.cwd();
  const detectors = [
    detectPlaywright,
    detectCypress,
    detectJest,
    detectPytest,
    detectSelenium,
    detectK6,
    detectVitest,
  ];

  const results: DetectedFramework[] = [];
  for (const detect of detectors) {
    const result = detect(cwd);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
