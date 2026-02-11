export const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', slug: 'typescript', icon: '🔷', color: '#3178C6' },
  { id: 'javascript', name: 'JavaScript', slug: 'javascript', icon: '🟨', color: '#F7DF1E' },
  { id: 'python', name: 'Python', slug: 'python', icon: '🐍', color: '#3776AB' },
  { id: 'java', name: 'Java', slug: 'java', icon: '☕', color: '#ED8B00' },
  { id: 'csharp', name: 'C#', slug: 'csharp', icon: '🟣', color: '#512BD4' },
  { id: 'go', name: 'Go', slug: 'go', icon: '🔵', color: '#00ADD8' },
  { id: 'ruby', name: 'Ruby', slug: 'ruby', icon: '💎', color: '#CC342D' },
] as const;

export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id);
export type LanguageId = (typeof LANGUAGES)[number]['id'];
