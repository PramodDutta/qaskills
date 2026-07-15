/**
 * Normalizes install-telemetry payloads across every CLI generation.
 *
 * Payload shapes seen in the wild:
 *   - current CLI (<= 0.x): { skillId: <display name>, action: 'install'|'remove'|'update', agents: string[] }
 *   - legacy web callers:   { skillId: <uuid>, agentType, installType }
 *   - upcoming CLI:         { skillId?: <uuid>, skillSlug: <slug>, action, agents }
 *
 * The DB column installs.skill_id is a NOT NULL uuid FK, so the route must
 * resolve whatever reference it gets to a real skills.id before inserting.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export interface NormalizedInstallEvent {
  /** uuid, slug, or display name; resolved against the skills table by the route */
  ref: string;
  refIsUuid: boolean;
  /** only 'add' bumps install counts; 'update' records the event without inflating counts */
  installType: 'add' | 'remove' | 'update';
  agentType: string;
}

export function normalizeInstallEvent(body: unknown): NormalizedInstallEvent | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const ref =
    (typeof b.skillSlug === 'string' && b.skillSlug.trim()) ||
    (typeof b.skillId === 'string' && b.skillId.trim()) ||
    '';
  if (!ref) return null;

  let installType: 'add' | 'remove' | 'update' = 'add';
  const action = typeof b.action === 'string' ? b.action : '';
  const legacyType = typeof b.installType === 'string' ? b.installType : '';
  if (action === 'remove' || legacyType === 'remove') installType = 'remove';
  else if (action === 'update' || legacyType === 'update') installType = 'update';

  const agents = Array.isArray(b.agents) ? b.agents.filter((a) => typeof a === 'string') : [];
  const agentType =
    (typeof b.agentType === 'string' && b.agentType) || (agents.length > 0 ? String(agents[0]) : 'unknown');

  return { ref, refIsUuid: isUuid(ref), installType, agentType };
}
