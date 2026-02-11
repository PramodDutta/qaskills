export * from './testing-types';
export * from './frameworks';
export * from './languages';
export * from './domains';
export * from './agents';

export const SKILL_MD_FILENAME = 'SKILL.md';
export const MAX_SKILL_LINES = 500;
export const MAX_SKILL_TOKENS = 5000;
export const QUALITY_SCORE_MAX = 100;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qaskills.sh';
export const CLI_VERSION = '0.1.0';
