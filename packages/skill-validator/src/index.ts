import fs from 'fs/promises';
import path from 'path';
import {
  parseSkillMd,
  skillFrontmatterSchema,
  calculateQualityScore,
  MAX_SKILL_LINES,
  MAX_SKILL_TOKENS,
} from '@qaskills/shared';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  qualityScore: number;
  qualityBreakdown: {
    schema: number;
    documentation: number;
    completeness: number;
    freshness: number;
    total: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /curl\s+.*\|\s*sh/,
  /eval\s*\(/,
  /exec\s*\(/,
  /child_process/,
  /process\.env\.\w+/,
  /require\(['"]fs['"]\)/,
  /sudo\s+/,
  /chmod\s+777/,
];

export async function validateSkillFile(filePath: string): Promise<ValidationResult> {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, 'utf-8');
  return validateSkillContent(raw);
}

export function validateSkillContent(raw: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Parse SKILL.md
  let parsed;
  try {
    parsed = parseSkillMd(raw);
  } catch (e) {
    return {
      valid: false,
      errors: [{ field: 'frontmatter', message: 'Failed to parse SKILL.md frontmatter' }],
      warnings: [],
      qualityScore: 0,
      qualityBreakdown: { schema: 0, documentation: 0, completeness: 0, freshness: 0, total: 0 },
    };
  }

  // Schema validation
  const schemaResult = skillFrontmatterSchema.safeParse(parsed.frontmatter);
  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      errors.push({
        field: issue.path.join('.'),
        message: issue.message,
      });
    }
  }

  // Line count check
  const lineCount = raw.split('\n').length;
  if (lineCount > MAX_SKILL_LINES) {
    warnings.push({
      field: 'content',
      message: `Skill has ${lineCount} lines (recommended max: ${MAX_SKILL_LINES})`,
    });
  }

  // Token estimation (rough: 1 token per 4 chars)
  const estimatedTokens = Math.ceil(raw.length / 4);
  if (estimatedTokens > MAX_SKILL_TOKENS) {
    warnings.push({
      field: 'content',
      message: `Estimated ${estimatedTokens} tokens (recommended max: ${MAX_SKILL_TOKENS})`,
    });
  }

  // Content checks
  if (parsed.content.length < 100) {
    warnings.push({
      field: 'content',
      message: 'Skill content is very short (< 100 characters). Consider adding more instructions.',
    });
  }

  // Safety checks
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(parsed.content)) {
      warnings.push({
        field: 'safety',
        message: `Potentially dangerous pattern found: ${pattern.source}`,
      });
    }
  }

  // Quality score
  const qualityBreakdown = calculateQualityScore(parsed);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    qualityScore: qualityBreakdown.total,
    qualityBreakdown,
  };
}
