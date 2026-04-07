const NEW_SKILL_WINDOW_DAYS = 30;
const NEW_SKILL_WINDOW_MS = NEW_SKILL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isRecentlyAdded(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false;

  const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(createdAtDate.getTime())) return false;

  return Date.now() - createdAtDate.getTime() <= NEW_SKILL_WINDOW_MS;
}

export { NEW_SKILL_WINDOW_DAYS };
