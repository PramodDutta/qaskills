/**
 * Extract FAQ Q&A pairs from a markdown blog post body.
 *
 * Detects sections like:
 *   ## Frequently Asked Questions
 *   ### Question 1?
 *   Answer paragraph.
 *
 *   ### Question 2?
 *   Answer paragraph.
 *
 * Also detects:
 *   ## FAQ
 *   ### Question?
 *   Answer.
 *
 * Also detects bold Q: / A: variants:
 *   ## FAQ
 *   **Q: question?**
 *   A: answer.
 *
 * Returns up to `maxItems` FAQ entries. Returns empty array if no FAQ section found.
 *
 * Why: Google killed FAQ rich-result stars for non-gov/health sites in Aug 2023,
 * but AI Overviews, ChatGPT search, Perplexity, Claude search STILL parse FAQPage
 * schema for direct citation. Adding FAQPage to 500+ blog posts is a cheap
 * universal AI-citation boost.
 */

export interface FAQItem {
  q: string;
  a: string;
}

// Matches H2 like:
//   ## FAQ
//   ## FAQs
//   ## Frequently Asked Questions
//   ## 18. Frequently Asked Questions
//   ## 7. FAQ
//   ## Common Questions
//   ## Q & A
const FAQ_SECTION_REGEX =
  /^##\s+(?:\d+\.\s+)?(?:frequently\s+asked\s+questions|faqs?|q\s*&\s*a|common\s+questions|questions?\s*&\s*answers?|questions?)\b/im;

/**
 * Find FAQ section in markdown body. Returns the text after the heading up to
 * the next H2 (or end of content), or null if no FAQ section detected.
 */
function findFAQSection(content: string): string | null {
  const match = content.match(FAQ_SECTION_REGEX);
  if (!match || match.index === undefined) return null;

  // Start of FAQ section content (after the heading line)
  const lineEnd = content.indexOf('\n', match.index);
  if (lineEnd === -1) return null;
  const start = lineEnd + 1;

  // Find next H2 heading (## not ###) or end of content
  const after = content.slice(start);
  const nextH2 = after.search(/^##\s+(?!#)/m);
  const sectionBody = nextH2 === -1 ? after : after.slice(0, nextH2);

  return sectionBody;
}

/**
 * Parse H3-style FAQs:
 *   ### Question text?
 *   Answer paragraph (possibly multiple lines).
 *   Continuation.
 *
 *   ### Next question?
 *   ...
 */
function parseH3FAQs(section: string): FAQItem[] {
  const items: FAQItem[] = [];
  // Split on H3 boundaries
  const blocks = section.split(/^###\s+/m).slice(1); // skip prelude

  for (const block of blocks) {
    const lineEnd = block.indexOf('\n');
    if (lineEnd === -1) continue;
    const q = block.slice(0, lineEnd).trim().replace(/[.?:]*$/, '?');
    if (!q || q.length < 8) continue;

    const rest = block.slice(lineEnd + 1).trim();
    // Take until next blank line + heading OR ~600 chars
    const a = rest
      .split(/\n\n+/)
      .filter((p) => !p.startsWith('#') && !p.startsWith('```'))
      .slice(0, 2)
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/`/g, '')
      .trim();

    if (a && a.length >= 20) items.push({ q, a: a.slice(0, 800) });
  }

  return items;
}

/**
 * Parse Q:/A: bold pattern FAQs:
 *   **Q: Question?**
 *   A: Answer.
 */
function parseBoldQAFAQs(section: string): FAQItem[] {
  const items: FAQItem[] = [];
  const qaRegex =
    /\*\*Q:\s*([^*]+?)\*\*\s*\n+A:\s*([\s\S]+?)(?=\n\s*\*\*Q:|\n##|$)/gi;

  let m: RegExpExecArray | null;
  while ((m = qaRegex.exec(section)) !== null) {
    const q = m[1].trim().replace(/[.?:]*$/, '?');
    const a = m[2]
      .replace(/\s+/g, ' ')
      .replace(/`/g, '')
      .trim()
      .slice(0, 800);
    if (q && a && a.length >= 20) items.push({ q, a });
  }

  return items;
}

/**
 * Parse "Q: ... A: ..." paragraph pattern (no bold).
 */
function parsePlainQAFAQs(section: string): FAQItem[] {
  const items: FAQItem[] = [];
  const qaRegex =
    /^\s*Q:\s*([^\n]+?)\s*\n+A:\s*([\s\S]+?)(?=\n\s*Q:|\n##|$)/gim;

  let m: RegExpExecArray | null;
  while ((m = qaRegex.exec(section)) !== null) {
    const q = m[1].trim().replace(/[.?:]*$/, '?');
    const a = m[2]
      .replace(/\s+/g, ' ')
      .replace(/`/g, '')
      .trim()
      .slice(0, 800);
    if (q && a && a.length >= 20) items.push({ q, a });
  }

  return items;
}

/**
 * Extract FAQs from a blog post markdown content body.
 * Returns at most `maxItems` (default 10) FAQ items, ordered by document position.
 */
export function extractFAQs(content: string, maxItems: number = 10): FAQItem[] {
  if (!content) return [];

  const section = findFAQSection(content);
  if (!section) return [];

  // Try parsers in order of specificity
  let items = parseH3FAQs(section);
  if (items.length === 0) items = parseBoldQAFAQs(section);
  if (items.length === 0) items = parsePlainQAFAQs(section);

  // Dedupe by question (case-insensitive)
  const seen = new Set<string>();
  const unique: FAQItem[] = [];
  for (const it of items) {
    const key = it.q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(it);
    if (unique.length >= maxItems) break;
  }

  return unique;
}
