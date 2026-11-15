const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

// Run after building the CLI, with a directory containing a valid SKILL.md.
const [, , cli, fixture] = process.argv;
assert(cli && fixture, 'Usage: node check-publish.cjs CLI_PATH FIXTURE_DIRECTORY');
const result = spawnSync(process.execPath, [resolve(cli), 'publish'], {
  cwd: resolve(fixture),
  input: '',
  encoding: 'utf8',
  timeout: 5000,
  env: { ...process.env, QASKILLS_TELEMETRY: '0', NO_COLOR: '1' },
});
const output = (result.stdout || '') + (result.stderr || '');
assert.equal(result.status, 1, result.error?.message || output);
assert.match(output, /SKILL.md is valid/);
assert.match(output, /has not been uploaded/);
assert.match(output, /https:\/\/qaskills\.sh\/dashboard\/publish/);
assert.doesNotMatch(output, /Published successfully!/);
console.log('PASS: validation stays distinct from upload receipt.');
