#!/usr/bin/env node
/**
 * CLI end-to-end publish gate.
 *
 * Runs the REAL built CLI (dist/index.js) against the LIVE registry and a
 * throwaway install directory. This suite MUST pass before any cli-v* tag
 * is published; cli-publish.yml runs it between build and npm publish.
 *
 * Covers:
 *   1. Every fast command exits 0 (--version, --help, search, info, list)
 *   2. init regression pack (non-TTY scaffold, flag overrides, bad-value exit)
 *   3. Random catalog sample: install 5-10 registry skills into a temp dir,
 *      verify each delivers a real SKILL.md (frontmatter + body), then remove
 *   4. Registry contract the CLI depends on: /content and /artifact respond,
 *      artifact checksum header matches the body
 *
 * Telemetry is disabled (QASKILLS_TELEMETRY=0) so gate runs never inflate
 * install counts.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '../dist/index.js');
const API = process.env.QASKILLS_API_URL || 'https://qaskills.sh';
const SAMPLE_MIN = 5;
const SAMPLE_MAX = 10;

const env = {
  ...process.env,
  QASKILLS_TELEMETRY: '0', // never pollute real install counts from the gate
  CI: '1',
};

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, detail = '') {
  passed++;
  console.log(`  PASS  ${name}${detail ? `  (${detail})` : ''}`);
}

function fail(name, detail) {
  failed++;
  failures.push({ name, detail });
  console.error(`  FAIL  ${name}: ${detail}`);
}

function run(args, opts = {}) {
  return execFileSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
    env,
    ...opts,
  });
}

function runExpectFail(args, opts = {}) {
  try {
    execFileSync('node', [CLI, ...args], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
      env,
      ...opts,
    });
    return null; // unexpectedly succeeded
  } catch (err) {
    return err;
  }
}

function tmpdir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---------------------------------------------------------------- 1. fast commands
console.log('\n== 1. Fast commands ==');
if (!fs.existsSync(CLI)) {
  console.error(`Built CLI not found at ${CLI}. Run the build first.`);
  process.exit(1);
}

try {
  const v = run(['--version']).trim();
  /^\d+\.\d+\.\d+/.test(v) ? ok('--version', v) : fail('--version', `not semver: ${v}`);
} catch (e) {
  fail('--version', e.message);
}

for (const args of [['--help'], ['search', 'playwright'], ['info', 'playwright-e2e'], ['list', '--agents']]) {
  try {
    const out = run(args);
    out.length > 0 ? ok(args.join(' ')) : fail(args.join(' '), 'empty output');
  } catch (e) {
    fail(args.join(' '), e.message.slice(0, 200));
  }
}

// ---------------------------------------------------------------- 2. init regression pack
console.log('\n== 2. init regression pack (0.4.1 non-TTY crash) ==');
{
  // non-TTY scaffold: stdio is piped above, so this IS the non-TTY path
  const d = tmpdir('qaskills-e2e-init-');
  try {
    run(['init', 'playwright'], { cwd: d });
    const md = path.join(d, 'SKILL.md');
    if (!fs.existsSync(md)) fail('init playwright (non-TTY)', 'no SKILL.md written');
    else {
      const text = fs.readFileSync(md, 'utf-8');
      text.startsWith('---') && text.includes('playwright')
        ? ok('init playwright (non-TTY)')
        : fail('init playwright (non-TTY)', 'scaffold missing frontmatter/template');
    }
  } catch (e) {
    fail('init playwright (non-TTY)', e.message.slice(0, 200));
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}
{
  const d = tmpdir('qaskills-e2e-init-flags-');
  try {
    run(
      ['init', '--name', 'gate-skill', '--framework', 'cypress', '--testing-type', 'e2e', '--language', 'typescript', '--author', 'gate'],
      { cwd: d },
    );
    const text = fs.readFileSync(path.join(d, 'SKILL.md'), 'utf-8');
    text.includes('gate-skill') && text.includes('cypress')
      ? ok('init with field flags')
      : fail('init with field flags', 'flag values not reflected in scaffold');
  } catch (e) {
    fail('init with field flags', e.message.slice(0, 200));
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}
{
  const d = tmpdir('qaskills-e2e-init-bad-');
  const err = runExpectFail(['init', '--framework', 'not-a-real-framework'], { cwd: d });
  const wroteFile = fs.existsSync(path.join(d, 'SKILL.md'));
  err && !wroteFile
    ? ok('init rejects invalid framework', 'exit!=0, no file')
    : fail('init rejects invalid framework', err ? 'file was still written' : 'exited 0 on bad input');
  fs.rmSync(d, { recursive: true, force: true });
}

// ---------------------------------------------------------------- 3. random catalog install sample
console.log('\n== 3. Random registry install sample ==');
let sample = [];
try {
  const res = await fetch(`${API}/api/skills?limit=100`);
  const data = await res.json();
  const skills = (data.skills || data.data || []).map((s) => s.slug).filter(Boolean);
  if (skills.length < SAMPLE_MIN) throw new Error(`registry returned only ${skills.length} skills`);
  const count = Math.min(SAMPLE_MAX, Math.max(SAMPLE_MIN, 7));
  sample = skills.sort(() => Math.random() - 0.5).slice(0, count);
  console.log(`  sampled ${sample.length} skills: ${sample.join(', ')}`);
} catch (e) {
  fail('fetch registry sample', e.message);
}

for (const slug of sample) {
  const d = tmpdir('qaskills-e2e-add-');
  try {
    run(['add', slug, '--agent', 'claude-code', '--dir', d, '--yes']);
    const md = path.join(d, slug, 'SKILL.md');
    if (!fs.existsSync(md)) {
      fail(`add ${slug}`, 'SKILL.md not installed');
    } else {
      const text = fs.readFileSync(md, 'utf-8');
      const hasFrontmatter = text.startsWith('---') && text.indexOf('---', 3) > 0;
      const body = hasFrontmatter ? text.slice(text.indexOf('---', 3) + 3).trim() : '';
      if (!hasFrontmatter) fail(`add ${slug}`, 'installed SKILL.md has no frontmatter');
      else if (body.length < 100) fail(`add ${slug}`, `body too thin (${body.length} chars): broken product`);
      else ok(`add ${slug}`, `${body.length} chars`);
    }
  } catch (e) {
    fail(`add ${slug}`, e.message.slice(0, 200));
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- 4. registry contract (content + artifact)
console.log('\n== 4. Registry contract ==');
for (const slug of sample.slice(0, 2)) {
  try {
    const res = await fetch(`${API}/api/skills/${slug}/content`);
    const text = await res.text();
    res.ok && text.startsWith('---')
      ? ok(`content contract ${slug}`)
      : fail(`content contract ${slug}`, `status=${res.status}`);
  } catch (e) {
    fail(`content contract ${slug}`, e.message);
  }
  try {
    const res = await fetch(`${API}/api/skills/${slug}/artifact`);
    const headerSha = res.headers.get('x-artifact-sha256');
    const buf = Buffer.from(await res.arrayBuffer());
    const bodySha = createHash('sha256').update(buf).digest('hex');
    res.ok && headerSha === bodySha
      ? ok(`artifact checksum ${slug}`)
      : fail(`artifact checksum ${slug}`, `status=${res.status} header=${headerSha} body=${bodySha}`);
  } catch (e) {
    fail(`artifact checksum ${slug}`, e.message);
  }
}

// ---------------------------------------------------------------- summary
console.log(`\n== E2E summary: ${passed} passed, ${failed} failed ==`);
if (failed > 0) {
  console.error('\nGate FAILED. Do not publish. Failures:');
  for (const f of failures) console.error(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log('Gate PASSED. Safe to publish.');
