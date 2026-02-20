---
name: Changelog Test Mapper
description: Map changelog entries and release notes to affected test cases, ensuring every user-facing change has corresponding test coverage verification.
version: 1.0.0
author: Pramod
license: MIT
tags: [changelog, release-notes, test-mapping, traceability, impact-analysis, coverage]
testingTypes: [code-quality]
frameworks: []
languages: [typescript, javascript]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Changelog Test Mapper

Every user-facing change in a software release should have corresponding test coverage that verifies the change works as intended. In practice, this mapping between changelog entries and test cases is rarely maintained, leading to releases where features ship without adequate verification and bug fixes lack regression tests. The Changelog Test Mapper bridges this gap by programmatically analyzing changelog entries, release notes, and commit histories, then mapping them to existing test cases and identifying coverage gaps. This skill covers the full pipeline: parsing changelogs in various formats, extracting change metadata, building a bidirectional mapping between changes and tests, scoring coverage completeness, and integrating the analysis into release workflows to prevent untested changes from reaching production.

## Core Principles

### 1. Every Shipped Change Deserves a Test

The fundamental premise of changelog-test mapping is that if a change is important enough to appear in the changelog, it is important enough to have a test. Bug fixes need regression tests. New features need functional tests. Performance improvements need benchmark tests. Changes without tests are unverified promises.

### 2. Bidirectional Traceability

The mapping must work in both directions. Given a changelog entry, you should be able to find all related tests. Given a test, you should be able to find which changelog entries it covers. This bidirectional traceability enables both forward analysis ("is this release well-tested?") and backward analysis ("what does this test protect?").

### 3. Automation Over Manual Tracking

Manually maintaining a spreadsheet of change-to-test mappings does not scale. The mapping should be derived automatically from commit messages, PR descriptions, issue tracker links, and file-level change analysis. Manual annotations should supplement, not replace, automated discovery.

### 4. Coverage Scoring Is Contextual

Not all changelog entries need the same level of test coverage. A breaking API change requires more comprehensive testing than a documentation fix. The coverage scoring model must account for change severity, affected surface area, and historical defect rates.

### 5. Integrate at Release Time

The mapping analysis should run as part of the release process, not as an afterthought. A release checklist that includes "all changelog entries have mapped tests" prevents untested changes from shipping.

## Project Structure

```
changelog-test-mapper/
  src/
    parsers/
      changelog-parser.ts
      conventional-commits-parser.ts
      github-releases-parser.ts
      keep-a-changelog-parser.ts
    analyzers/
      change-classifier.ts
      test-finder.ts
      coverage-mapper.ts
      gap-detector.ts
    mappers/
      file-change-mapper.ts
      semantic-mapper.ts
      annotation-mapper.ts
    reporters/
      coverage-reporter.ts
      gap-reporter.ts
      release-readiness-reporter.ts
    config/
      mapper-config.ts
    index.ts
  scripts/
    map-release.ts
    check-coverage.ts
    generate-report.ts
  tests/
    parsers/
    analyzers/
    mappers/
  package.json
  tsconfig.json
```

## Changelog Parsing

### Multi-Format Changelog Parser

Changelogs come in many formats. The parser supports Keep a Changelog, conventional commits, and GitHub release formats:

```typescript
// src/parsers/changelog-parser.ts

export interface ChangelogEntry {
  id: string;
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security' | 'performance';
  description: string;
  version: string;
  date: string;
  scope?: string;
  breakingChange: boolean;
  issueRefs: string[];
  prRefs: string[];
  commitShas: string[];
  affectedFiles: string[];
  severity: 'critical' | 'major' | 'minor' | 'patch';
}

export interface ParsedChangelog {
  versions: Array<{
    version: string;
    date: string;
    entries: ChangelogEntry[];
  }>;
}

export function parseKeepAChangelog(content: string): ParsedChangelog {
  const versions: ParsedChangelog['versions'] = [];
  const versionRegex = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?/gm;
  const typeRegex = /^### (Added|Changed|Deprecated|Removed|Fixed|Security)/gm;
  const entryRegex = /^- (.+)$/gm;

  const sections = content.split(/^## /gm).filter(Boolean);

  for (const section of sections) {
    const versionMatch = section.match(/^\[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?/);
    if (!versionMatch) continue;

    const version = versionMatch[1];
    const date = versionMatch[2] || '';
    const entries: ChangelogEntry[] = [];

    const typeSections = section.split(/^### /gm).filter(Boolean);

    for (const typeSection of typeSections.slice(1)) {
      const typeMatch = typeSection.match(/^(Added|Changed|Deprecated|Removed|Fixed|Security)/);
      if (!typeMatch) continue;

      const type = typeMatch[1].toLowerCase() as ChangelogEntry['type'];
      const lines = typeSection.split('\n').filter((l) => l.startsWith('- '));

      for (const line of lines) {
        const description = line.replace(/^- /, '').trim();
        const issueRefs = extractIssueRefs(description);
        const prRefs = extractPRRefs(description);
        const breakingChange = /breaking|BREAKING/.test(description);

        entries.push({
          id: generateEntryId(version, type, description),
          type,
          description,
          version,
          date,
          breakingChange,
          issueRefs,
          prRefs,
          commitShas: [],
          affectedFiles: [],
          severity: classifySeverity(type, breakingChange),
        });
      }
    }

    versions.push({ version, date, entries });
  }

  return { versions };
}

function extractIssueRefs(text: string): string[] {
  const matches = text.match(/#(\d+)/g) || [];
  return matches.map((m) => m.replace('#', ''));
}

function extractPRRefs(text: string): string[] {
  const matches = text.match(/\bPR[: ]?#?(\d+)/gi) || [];
  return matches.map((m) => m.replace(/\bPR[: ]?#?/i, ''));
}

function generateEntryId(version: string, type: string, description: string): string {
  const hash = description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  return `${version}-${type}-${hash}`;
}

function classifySeverity(
  type: ChangelogEntry['type'],
  breakingChange: boolean
): ChangelogEntry['severity'] {
  if (breakingChange) return 'critical';
  if (type === 'security') return 'critical';
  if (type === 'fixed') return 'major';
  if (type === 'removed' || type === 'deprecated') return 'major';
  if (type === 'changed') return 'minor';
  return 'patch';
}
```

### Conventional Commits Parser

```typescript
// src/parsers/conventional-commits-parser.ts

import type { ChangelogEntry } from './changelog-parser';

interface ConventionalCommit {
  sha: string;
  type: string;
  scope?: string;
  description: string;
  body?: string;
  breaking: boolean;
  issueRefs: string[];
  files: string[];
}

export function parseConventionalCommits(
  commits: ConventionalCommit[],
  version: string
): ChangelogEntry[] {
  const typeMapping: Record<string, ChangelogEntry['type']> = {
    feat: 'added',
    fix: 'fixed',
    perf: 'performance',
    security: 'security',
    refactor: 'changed',
    deprecate: 'deprecated',
  };

  return commits
    .filter((commit) => typeMapping[commit.type])
    .map((commit) => ({
      id: `${version}-${commit.sha.substring(0, 8)}`,
      type: typeMapping[commit.type] || 'changed',
      description: commit.description,
      version,
      date: new Date().toISOString().split('T')[0],
      scope: commit.scope,
      breakingChange: commit.breaking,
      issueRefs: commit.issueRefs,
      prRefs: [],
      commitShas: [commit.sha],
      affectedFiles: commit.files,
      severity: classifyCommitSeverity(commit),
    }));
}

function classifyCommitSeverity(commit: ConventionalCommit): ChangelogEntry['severity'] {
  if (commit.breaking) return 'critical';
  if (commit.type === 'security') return 'critical';
  if (commit.type === 'fix') return 'major';
  if (commit.type === 'feat') return 'minor';
  return 'patch';
}
```

## Test Discovery and Mapping

### File-Based Change-to-Test Mapper

The file-based mapper connects changelog entries to tests by analyzing which source files changed and finding tests that import or reference those files:

```typescript
// src/mappers/file-change-mapper.ts

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';

interface TestMapping {
  changeEntryId: string;
  changeDescription: string;
  mappedTests: Array<{
    testFile: string;
    testName: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  unmappedFiles: string[];
  coverageScore: number;
}

export function mapChangesToTests(
  affectedFiles: string[],
  testFiles: string[],
  changeEntryId: string,
  changeDescription: string
): TestMapping {
  const mappedTests: TestMapping['mappedTests'] = [];
  const mappedSourceFiles = new Set<string>();
  const unmappedFiles: string[] = [];

  for (const sourceFile of affectedFiles) {
    // Skip test files themselves
    if (isTestFile(sourceFile)) continue;

    let hasMapping = false;

    // Strategy 1: Co-located test files
    const colocatedTest = findColocatedTest(sourceFile, testFiles);
    if (colocatedTest) {
      mappedTests.push({
        testFile: colocatedTest,
        testName: `Tests for ${basename(sourceFile)}`,
        confidence: 'high',
        reason: 'Co-located test file',
      });
      mappedSourceFiles.add(sourceFile);
      hasMapping = true;
    }

    // Strategy 2: Convention-based test discovery
    const conventionTests = findConventionBasedTests(sourceFile, testFiles);
    for (const testFile of conventionTests) {
      if (!mappedTests.some((m) => m.testFile === testFile)) {
        mappedTests.push({
          testFile,
          testName: `Tests for ${basename(sourceFile)}`,
          confidence: 'medium',
          reason: 'Naming convention match',
        });
        mappedSourceFiles.add(sourceFile);
        hasMapping = true;
      }
    }

    // Strategy 3: Import analysis
    const importTests = findTestsByImport(sourceFile, testFiles);
    for (const testFile of importTests) {
      if (!mappedTests.some((m) => m.testFile === testFile)) {
        mappedTests.push({
          testFile,
          testName: `Imports ${basename(sourceFile)}`,
          confidence: 'medium',
          reason: 'Import dependency',
        });
        mappedSourceFiles.add(sourceFile);
        hasMapping = true;
      }
    }

    if (!hasMapping) {
      unmappedFiles.push(sourceFile);
    }
  }

  const totalSourceFiles = affectedFiles.filter((f) => !isTestFile(f)).length;
  const coverageScore =
    totalSourceFiles > 0 ? mappedSourceFiles.size / totalSourceFiles : 1;

  return {
    changeEntryId,
    changeDescription,
    mappedTests,
    unmappedFiles,
    coverageScore,
  };
}

function isTestFile(filePath: string): boolean {
  const name = basename(filePath);
  return (
    name.includes('.test.') ||
    name.includes('.spec.') ||
    name.includes('__tests__') ||
    filePath.includes('__tests__/')
  );
}

function findColocatedTest(sourceFile: string, testFiles: string[]): string | null {
  const dir = dirname(sourceFile);
  const name = basename(sourceFile).replace(/\.(ts|tsx|js|jsx)$/, '');

  const patterns = [
    join(dir, `${name}.test.ts`),
    join(dir, `${name}.test.tsx`),
    join(dir, `${name}.spec.ts`),
    join(dir, `${name}.spec.tsx`),
    join(dir, '__tests__', `${name}.test.ts`),
    join(dir, '__tests__', `${name}.test.tsx`),
  ];

  for (const pattern of patterns) {
    if (testFiles.includes(pattern)) {
      return pattern;
    }
  }

  return null;
}

function findConventionBasedTests(sourceFile: string, testFiles: string[]): string[] {
  const name = basename(sourceFile).replace(/\.(ts|tsx|js|jsx)$/, '');
  const matches: string[] = [];

  for (const testFile of testFiles) {
    const testName = basename(testFile).replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '');
    if (testName === name) {
      matches.push(testFile);
    }
  }

  return matches;
}

function findTestsByImport(sourceFile: string, testFiles: string[]): string[] {
  const matches: string[] = [];
  const sourceBaseName = basename(sourceFile).replace(/\.(ts|tsx|js|jsx)$/, '');

  for (const testFile of testFiles) {
    if (!existsSync(testFile)) continue;

    try {
      const content = readFileSync(testFile, 'utf-8');
      if (
        content.includes(`from './${sourceBaseName}'`) ||
        content.includes(`from '../${sourceBaseName}'`) ||
        content.includes(`require('./${sourceBaseName}')`) ||
        content.includes(`/${sourceBaseName}'`)
      ) {
        matches.push(testFile);
      }
    } catch {
      // Skip files that cannot be read
    }
  }

  return matches;
}
```

### Semantic Mapper

The semantic mapper uses keyword and pattern analysis to connect changelog descriptions to test names:

```typescript
// src/mappers/semantic-mapper.ts

interface SemanticMatch {
  testFile: string;
  testName: string;
  confidence: number;
  matchedTerms: string[];
}

export function findSemanticMatches(
  changeDescription: string,
  testIndex: Array<{ file: string; name: string; description: string }>
): SemanticMatch[] {
  const changeTerms = extractKeyTerms(changeDescription);
  const matches: SemanticMatch[] = [];

  for (const test of testIndex) {
    const testTerms = extractKeyTerms(`${test.name} ${test.description}`);
    const matchedTerms = changeTerms.filter((term) =>
      testTerms.some(
        (testTerm) =>
          testTerm.includes(term) || term.includes(testTerm) || levenshteinSimilarity(term, testTerm) > 0.8
      )
    );

    if (matchedTerms.length > 0) {
      const confidence = matchedTerms.length / Math.max(changeTerms.length, 1);
      matches.push({
        testFile: test.file,
        testName: test.name,
        confidence: Math.min(1, confidence),
        matchedTerms,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

function extractKeyTerms(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'not', 'no', 'nor', 'so', 'yet', 'both', 'each', 'all', 'any',
    'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
    'very', 'just', 'about', 'when', 'where', 'how', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its',
    'add', 'update', 'fix', 'remove', 'change', 'new', 'now',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const matrix: number[][] = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return 1 - matrix[a.length][b.length] / maxLen;
}
```

## Gap Detection and Release Readiness

### Gap Detector

```typescript
// src/analyzers/gap-detector.ts

import type { ChangelogEntry } from '../parsers/changelog-parser';

interface CoverageGap {
  entry: ChangelogEntry;
  gapType: 'no-tests' | 'low-confidence' | 'partial-coverage' | 'missing-regression';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

interface ReleaseReadiness {
  version: string;
  totalEntries: number;
  coveredEntries: number;
  coveragePercentage: number;
  gaps: CoverageGap[];
  readyForRelease: boolean;
  riskScore: number;
  blockers: string[];
  warnings: string[];
}

export function analyzeReleaseReadiness(
  entries: ChangelogEntry[],
  mappings: Map<string, { coverageScore: number; mappedTests: unknown[] }>,
  thresholds: { minCoverage: number; criticalRequireTests: boolean }
): ReleaseReadiness {
  const gaps: CoverageGap[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  let coveredEntries = 0;

  for (const entry of entries) {
    const mapping = mappings.get(entry.id);
    const coverageScore = mapping?.coverageScore || 0;
    const hasTests = mapping && mapping.mappedTests.length > 0;

    if (coverageScore >= 0.8) {
      coveredEntries++;
      continue;
    }

    let gapType: CoverageGap['gapType'];
    let recommendation: string;

    if (!hasTests) {
      gapType = 'no-tests';
      recommendation = `Add test coverage for: ${entry.description}`;
    } else if (coverageScore < 0.3) {
      gapType = 'low-confidence';
      recommendation = `Improve test mapping confidence for: ${entry.description}. Current tests may not adequately cover this change.`;
    } else if (entry.type === 'fixed' && coverageScore < 0.8) {
      gapType = 'missing-regression';
      recommendation = `Add specific regression test for bug fix: ${entry.description}`;
    } else {
      gapType = 'partial-coverage';
      recommendation = `Increase test coverage for: ${entry.description}. Currently at ${(coverageScore * 100).toFixed(0)}%.`;
    }

    const riskLevel = assessRisk(entry, coverageScore);

    gaps.push({ entry, gapType, riskLevel, recommendation });

    if (riskLevel === 'critical') {
      blockers.push(`${entry.type.toUpperCase()}: ${entry.description} - no adequate test coverage`);
    } else if (riskLevel === 'high') {
      warnings.push(`${entry.type.toUpperCase()}: ${entry.description} - insufficient test coverage`);
    }
  }

  const coveragePercentage =
    entries.length > 0 ? (coveredEntries / entries.length) * 100 : 100;

  const criticalUntested = gaps.some(
    (g) => g.riskLevel === 'critical' && thresholds.criticalRequireTests
  );

  const readyForRelease =
    coveragePercentage >= thresholds.minCoverage && !criticalUntested;

  const riskScore = calculateRiskScore(gaps, entries.length);

  return {
    version: entries[0]?.version || 'unknown',
    totalEntries: entries.length,
    coveredEntries,
    coveragePercentage: Math.round(coveragePercentage * 10) / 10,
    gaps,
    readyForRelease,
    riskScore,
    blockers,
    warnings,
  };
}

function assessRisk(
  entry: ChangelogEntry,
  coverageScore: number
): CoverageGap['riskLevel'] {
  if (entry.severity === 'critical' && coverageScore < 0.5) return 'critical';
  if (entry.breakingChange && coverageScore < 0.8) return 'critical';
  if (entry.type === 'security' && coverageScore < 0.8) return 'critical';
  if (entry.type === 'fixed' && coverageScore < 0.3) return 'high';
  if (entry.severity === 'major' && coverageScore < 0.5) return 'high';
  if (coverageScore < 0.3) return 'medium';
  return 'low';
}

function calculateRiskScore(gaps: CoverageGap[], totalEntries: number): number {
  if (totalEntries === 0) return 0;

  const riskWeights = { critical: 4, high: 2, medium: 1, low: 0.5 };
  const totalRisk = gaps.reduce((sum, gap) => sum + riskWeights[gap.riskLevel], 0);
  const maxRisk = totalEntries * riskWeights.critical;

  return Math.min(1, totalRisk / maxRisk);
}
```

## Release Report Generator

```typescript
// src/reporters/release-readiness-reporter.ts

import type { ReleaseReadiness } from '../analyzers/gap-detector';

export function generateReleaseReport(readiness: ReleaseReadiness): string {
  const lines: string[] = [];
  const status = readiness.readyForRelease ? 'READY' : 'NOT READY';

  lines.push(`# Release Readiness Report: v${readiness.version}`);
  lines.push('');
  lines.push(`**Status:** ${status}`);
  lines.push(`**Coverage:** ${readiness.coveragePercentage}% of changelog entries have mapped tests`);
  lines.push(`**Risk Score:** ${(readiness.riskScore * 100).toFixed(1)}%`);
  lines.push(`**Entries:** ${readiness.coveredEntries}/${readiness.totalEntries} covered`);
  lines.push('');

  if (readiness.blockers.length > 0) {
    lines.push('## Blockers');
    lines.push('');
    for (const blocker of readiness.blockers) {
      lines.push(`- ${blocker}`);
    }
    lines.push('');
  }

  if (readiness.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const warning of readiness.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  if (readiness.gaps.length > 0) {
    lines.push('## Coverage Gaps');
    lines.push('');
    lines.push('| Change | Type | Risk | Gap Type | Recommendation |');
    lines.push('|--------|------|------|----------|----------------|');

    for (const gap of readiness.gaps) {
      const desc =
        gap.entry.description.length > 50
          ? gap.entry.description.substring(0, 50) + '...'
          : gap.entry.description;
      lines.push(
        `| ${desc} | ${gap.entry.type} | ${gap.riskLevel} | ${gap.gapType} | ${gap.recommendation.substring(0, 60)}... |`
      );
    }
  }

  return lines.join('\n');
}
```

## CI Integration

### GitHub Actions Release Gate

```yaml
name: Release Readiness Check

on:
  pull_request:
    branches: [main]
    paths:
      - 'CHANGELOG.md'

jobs:
  check-readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run changelog test mapping
        run: tsx scripts/map-release.ts
        env:
          MIN_COVERAGE: '80'
          REQUIRE_CRITICAL_TESTS: 'true'

      - name: Comment PR with readiness report
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('release-readiness-report.md')) {
              const report = fs.readFileSync('release-readiness-report.md', 'utf-8');
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: report,
              });
            }
```

### Release Mapping Script

```typescript
// scripts/map-release.ts

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { parseKeepAChangelog } from '../src/parsers/changelog-parser';
import { mapChangesToTests } from '../src/mappers/file-change-mapper';
import { findSemanticMatches } from '../src/mappers/semantic-mapper';
import { analyzeReleaseReadiness } from '../src/analyzers/gap-detector';
import { generateReleaseReport } from '../src/reporters/release-readiness-reporter';
import { join } from 'path';

async function main(): Promise<void> {
  const changelogContent = readFileSync('CHANGELOG.md', 'utf-8');
  const changelog = parseKeepAChangelog(changelogContent);

  if (changelog.versions.length === 0) {
    console.log('No versions found in changelog');
    process.exit(0);
  }

  const latestVersion = changelog.versions[0];
  console.log(
    `Analyzing release v${latestVersion.version} (${latestVersion.entries.length} entries)`
  );

  // Discover all test files in the project
  const testFilesOutput = execSync(
    'find . -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" -o -name "*.spec.tsx" | grep -v node_modules',
    { encoding: 'utf-8' }
  );
  const testFiles = testFilesOutput.trim().split('\n').filter(Boolean);

  // Map each changelog entry to tests
  const mappings = new Map<string, { coverageScore: number; mappedTests: unknown[] }>();

  for (const entry of latestVersion.entries) {
    // Get affected files from git if commit SHAs are available
    let affectedFiles = entry.affectedFiles;
    if (affectedFiles.length === 0 && entry.commitShas.length > 0) {
      for (const sha of entry.commitShas) {
        try {
          const files = execSync(`git diff-tree --no-commit-id --name-only -r ${sha}`, {
            encoding: 'utf-8',
          });
          affectedFiles.push(...files.trim().split('\n').filter(Boolean));
        } catch {
          // Commit may not exist in current history
        }
      }
    }

    const fileMapping = mapChangesToTests(
      affectedFiles,
      testFiles,
      entry.id,
      entry.description
    );

    mappings.set(entry.id, {
      coverageScore: fileMapping.coverageScore,
      mappedTests: fileMapping.mappedTests,
    });
  }

  const minCoverage = parseInt(process.env.MIN_COVERAGE || '80', 10);
  const requireCriticalTests = process.env.REQUIRE_CRITICAL_TESTS === 'true';

  const readiness = analyzeReleaseReadiness(latestVersion.entries, mappings, {
    minCoverage,
    criticalRequireTests: requireCriticalTests,
  });

  const report = generateReleaseReport(readiness);
  writeFileSync('release-readiness-report.md', report, 'utf-8');

  console.log(`Coverage: ${readiness.coveragePercentage}%`);
  console.log(`Gaps: ${readiness.gaps.length}`);
  console.log(`Blockers: ${readiness.blockers.length}`);
  console.log(`Ready: ${readiness.readyForRelease}`);

  if (!readiness.readyForRelease) {
    console.error('Release is not ready. See report for details.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Release mapping failed:', error);
  process.exit(1);
});
```

## Test Annotation System

Enable developers to explicitly link tests to changelog entries and issues:

```typescript
// src/mappers/annotation-mapper.ts

interface TestAnnotation {
  testFile: string;
  testName: string;
  covers: string[];    // Issue IDs: ["PROJ-123", "PROJ-456"]
  verifies: string[];  // Changelog entry descriptions or IDs
  regression: string;  // Bug ID this test prevents regression for
}

export function parseTestAnnotations(testFileContent: string): TestAnnotation[] {
  const annotations: TestAnnotation[] = [];

  // Match @covers, @verifies, @regression JSDoc-style annotations
  const testBlockRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const coversRegex = /@covers\s+(.+)/g;
  const verifiesRegex = /@verifies\s+(.+)/g;
  const regressionRegex = /@regression\s+(.+)/g;

  let match;
  while ((match = testBlockRegex.exec(testFileContent)) !== null) {
    const testName = match[1];
    const precedingBlock = testFileContent.substring(
      Math.max(0, match.index - 500),
      match.index
    );

    const covers: string[] = [];
    const verifies: string[] = [];
    let regression = '';

    let annotationMatch;
    while ((annotationMatch = coversRegex.exec(precedingBlock)) !== null) {
      covers.push(...annotationMatch[1].split(',').map((s) => s.trim()));
    }
    while ((annotationMatch = verifiesRegex.exec(precedingBlock)) !== null) {
      verifies.push(...annotationMatch[1].split(',').map((s) => s.trim()));
    }
    if ((annotationMatch = regressionRegex.exec(precedingBlock)) !== null) {
      regression = annotationMatch[1].trim();
    }

    if (covers.length > 0 || verifies.length > 0 || regression) {
      annotations.push({
        testFile: '',
        testName,
        covers,
        verifies,
        regression,
      });
    }
  }

  return annotations;
}
```

Usage in test files:

```typescript
/**
 * @covers PROJ-123
 * @verifies User can reset password via email link
 * @regression BUG-456
 */
test('password reset flow sends email and allows reset', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect(page.getByText('Reset link sent')).toBeVisible();
});
```

## Best Practices

1. **Parse changelogs automatically on every PR that modifies CHANGELOG.md.** This ensures the mapping analysis runs before release decisions are made, not after.

2. **Use conventional commits to generate structured changelog data.** Conventional commits provide machine-parseable change metadata (type, scope, breaking changes) that dramatically improves mapping accuracy.

3. **Require explicit test annotations for breaking changes.** Breaking changes have the highest risk of user impact. Require developers to annotate at least one test with `@verifies` for every breaking change entry.

4. **Combine multiple mapping strategies.** No single mapping strategy catches everything. Use file-based mapping, import analysis, and semantic matching together, then merge results with confidence scores.

5. **Set release gates based on coverage thresholds.** Block releases when changelog-to-test coverage falls below a configurable threshold. Start at 50% and increase as the team matures.

6. **Track coverage trends across releases.** Compare mapping coverage between releases to identify whether the team is improving or declining in test discipline.

7. **Generate reports as PR comments.** Posting the readiness report directly on the PR makes coverage gaps visible during code review, when they can still be addressed.

8. **Maintain a test index for semantic matching.** Periodically build an index of all test names and descriptions to enable efficient semantic matching against changelog entries.

9. **Differentiate between types of coverage.** A bug fix needs a specific regression test. A new feature needs functional tests. A performance improvement needs a benchmark. The mapping should verify the right type of test exists.

10. **Use issue tracker references as primary mapping keys.** When both changelog entries and tests reference the same Jira ticket or GitHub issue, the mapping confidence is highest. Encourage developers to include issue references in both places.

11. **Audit the mapping regularly.** Periodically review false positives and false negatives in the mapping to improve parser accuracy and mapping strategies.

## Anti-Patterns to Avoid

**Treating changelog-test mapping as optional documentation.** If the mapping is not enforced in CI, it will be ignored. Treat it as a release gate, not a nice-to-have report.

**Relying solely on file-based mapping.** File-based mapping misses behavioral connections. A change to a shared utility function may affect many features, but only tests that directly import the utility will appear in file-based mapping.

**Mapping quantity over quality.** Having 10 low-confidence test mappings for a changelog entry is not the same as having 1 high-confidence mapping. Weight confidence scores when calculating coverage.

**Ignoring security changelog entries.** Security changes are the highest-risk entries in any changelog. Never skip test mapping for security fixes and vulnerability patches.

**Running the analysis only at release time.** By the time the release is ready, it is too late to write missing tests without delaying the release. Run the analysis continuously on PRs.

**Hard-coding changelog formats.** Support multiple changelog formats from the start. Teams migrate between formats, and the tool should adapt without requiring rewriting.

## Debugging Tips

**Parser finds no entries in the changelog.** Check the exact format of your CHANGELOG.md. The Keep a Changelog parser expects specific heading formats: `## [version] - date` for versions and `### Added` for types. Verify that your file matches the expected format exactly.

**File-based mapping produces zero matches.** Check that your test files follow naming conventions that the mapper recognizes. If tests are in a `__tests__` directory with different names than source files, the convention-based strategy will miss them. Consider adding import analysis or explicit annotations.

**Semantic matching produces too many false positives.** Tighten the confidence threshold. If the default threshold of 0.3 produces noise, increase it to 0.5 or 0.6. Also review and expand the stop words list to filter common words that create spurious matches.

**Coverage score seems artificially high.** The score may be inflated if many changelog entries have no affected files listed. Ensure that commit SHAs or file paths are populated for each entry so the mapper has data to work with.

**The release gate blocks a valid release.** If the mapping legitimately cannot find tests for a low-risk change (e.g., documentation update), add an exclusion mechanism. Allow entries to be marked as `@no-test-needed` with a justification.
