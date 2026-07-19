const FENCED_CODE_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`\n]+`/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\([^)]+\)/g;

export function extractArticleProse(content: string): string {
  return content
    .replace(FENCED_CODE_PATTERN, ' ')
    .replace(INLINE_CODE_PATTERN, (value) => value.slice(1, -1))
    .replace(MARKDOWN_LINK_PATTERN, '$1')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countProseWords(content: string): number {
  const prose = extractArticleProse(content);
  return prose ? prose.split(/\s+/).length : 0;
}

export function countMarkdownHeadings(content: string, level: number): number {
  const withoutCode = content.replace(FENCED_CODE_PATTERN, ' ');
  const hashes = '#'.repeat(level);
  return (withoutCode.match(new RegExp(`^${hashes}(?!#)\\s+`, 'gm')) || []).length;
}

export function hasGfmTable(content: string): boolean {
  const withoutCode = content.replace(FENCED_CODE_PATTERN, ' ');
  return /^\s*\|.+\|\s*\n\s*\|\s*:?-{3,}/m.test(withoutCode);
}

export function hasOrderedProcedure(content: string): boolean {
  const withoutCode = content.replace(FENCED_CODE_PATTERN, ' ');
  return /(?:^\d+\.\s+.+\n){2}^\d+\.\s+.+/m.test(withoutCode);
}

export function extractInternalLinks(content: string): string[] {
  return Array.from(content.matchAll(/\[[^\]]+\]\((\/[a-z0-9][^)#?]*)[^)]*\)/gi), (match) =>
    match[1].replace(/\/$/, ''),
  );
}

export function extractExternalLinks(content: string): string[] {
  return Array.from(content.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/gi), (match) => match[1]);
}

export function getKeywordDensity(content: string, keyword: string): number {
  const normalizedProse = extractArticleProse(content)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const normalizedKeyword = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalizedProse || !normalizedKeyword) return 0;

  const phrase = new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, '\\s+')}\\b`, 'g');
  const occurrences = normalizedProse.match(phrase)?.length ?? 0;
  const keywordWords = normalizedKeyword.split(' ').length;
  const proseWords = normalizedProse.split(' ').length;
  return (occurrences * keywordWords * 100) / proseWords;
}

export function getFirstWords(content: string, limit = 100): string {
  return extractArticleProse(content).split(/\s+/).slice(0, limit).join(' ');
}

export function getAverageSentenceWords(content: string): number {
  const prose = extractArticleProse(content);
  const sentences = prose
    .split(/[.!?]+(?:\s|$)/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length > 2);
  if (sentences.length === 0) return 0;

  return prose.split(/\s+/).length / sentences.length;
}

export function normalizeArticleText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractReadableParagraphs(content: string): string[] {
  return content
    .replace(FENCED_CODE_PATTERN, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !/^(?:#{1,6}\s|\||\d+\.\s|-\s)/.test(paragraph))
    .filter((paragraph) => !paragraph.includes('\n|'))
    .filter((paragraph) => countProseWords(paragraph) >= 15);
}

export function countReadableSentences(value: string): number {
  return extractArticleProse(value)
    .split(/[.!?]+(?:["')\]]+)?(?:\s+|$)/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length > 2).length;
}

function countSyllables(rawWord: string): number {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;

  const normalized = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '').replace(/^y/, '');
  return Math.max(1, normalized.match(/[aeiouy]{1,2}/g)?.length ?? 1);
}

export function getFleschReadingEase(content: string): number {
  const prose = extractReadableParagraphs(content).map(extractArticleProse).join(' ');
  const words = prose.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  if (words.length === 0) return 0;

  const sentences = Math.max(1, countReadableSentences(prose));
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  return 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
}

export function getInternalLinksPerThousandWords(content: string): number {
  const words = countProseWords(content);
  return words === 0 ? 0 : (extractInternalLinks(content).length * 1_000) / words;
}
