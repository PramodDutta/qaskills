// Split a markdown post at an H2 heading near the midpoint so an inline ad can
// render between two content halves without breaking the markdown. Fenced code
// blocks are respected (a `## ` inside ``` is ignored). Returns [content, '']
// when the post is too short to warrant a mid-content insertion (< 3 sections).

export function splitAtMidHeading(content: string): [string, string] {
  const lines = content.split('\n');
  const headingIdxs: number[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) inFence = !inFence;
    if (!inFence && /^##\s/.test(lines[i])) headingIdxs.push(i);
  }

  // Need enough sections; short posts get only the end-of-article ad.
  if (headingIdxs.length < 3) return [content, ''];

  const mid = lines.length / 2;
  let best = -1;
  let bestDist = Infinity;

  // Skip the first H2 so we never split before the article really begins.
  for (const idx of headingIdxs.slice(1)) {
    const d = Math.abs(idx - mid);
    if (d < bestDist) {
      bestDist = d;
      best = idx;
    }
  }

  if (best < 0) return [content, ''];
  return [lines.slice(0, best).join('\n'), lines.slice(best).join('\n')];
}
