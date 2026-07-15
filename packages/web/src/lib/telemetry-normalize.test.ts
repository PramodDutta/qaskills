import { describe, it, expect } from 'vitest';
import { isUuid, normalizeInstallEvent } from './telemetry-normalize';

describe('isUuid', () => {
  it('accepts a canonical uuid', () => {
    expect(isUuid('1fe332e7-d794-48c2-9b02-c607bec4d572')).toBe(true);
  });
  it('rejects slugs and names', () => {
    expect(isUuid('playwright-e2e')).toBe(false);
    expect(isUuid('Playwright E2E Testing')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

describe('normalizeInstallEvent', () => {
  it('handles the current CLI payload (display name + action + agents)', () => {
    const ev = normalizeInstallEvent({
      skillId: 'playwright-e2e',
      action: 'install',
      agents: ['claude-code', 'cursor'],
      cliVersion: '0.3.0',
    });
    expect(ev).toEqual({
      ref: 'playwright-e2e',
      refIsUuid: false,
      installType: 'add',
      agentType: 'claude-code',
    });
  });

  it('handles the legacy web payload (uuid + agentType + installType)', () => {
    const ev = normalizeInstallEvent({
      skillId: '1fe332e7-d794-48c2-9b02-c607bec4d572',
      agentType: 'cursor',
      installType: 'add',
    });
    expect(ev).toEqual({
      ref: '1fe332e7-d794-48c2-9b02-c607bec4d572',
      refIsUuid: true,
      installType: 'add',
      agentType: 'cursor',
    });
  });

  it('prefers skillSlug over skillId when both are present', () => {
    const ev = normalizeInstallEvent({
      skillId: '1fe332e7-d794-48c2-9b02-c607bec4d572',
      skillSlug: 'playwright-e2e',
    });
    expect(ev?.ref).toBe('playwright-e2e');
    expect(ev?.refIsUuid).toBe(false);
  });

  it('maps remove and update actions without counting them as adds', () => {
    expect(normalizeInstallEvent({ skillId: 'x', action: 'remove' })?.installType).toBe('remove');
    expect(normalizeInstallEvent({ skillId: 'x', action: 'update' })?.installType).toBe('update');
    expect(normalizeInstallEvent({ skillId: 'x', installType: 'remove' })?.installType).toBe('remove');
  });

  it('rejects payloads with no usable reference', () => {
    expect(normalizeInstallEvent({})).toBeNull();
    expect(normalizeInstallEvent({ skillId: '   ' })).toBeNull();
    expect(normalizeInstallEvent(null)).toBeNull();
    expect(normalizeInstallEvent('nope')).toBeNull();
  });

  it('defaults agentType to unknown', () => {
    expect(normalizeInstallEvent({ skillId: 'x' })?.agentType).toBe('unknown');
  });
});
