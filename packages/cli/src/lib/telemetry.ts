import { CLI_VERSION } from '@qaskills/shared';
import { trackInstall } from './api-client.js';

/**
 * Anonymous, non-blocking telemetry.
 *
 * Respects:
 *   - QASKILLS_TELEMETRY=0   (project-specific opt-out)
 *   - DO_NOT_TRACK=1          (cross-tool standard)
 *
 * Failures are silently swallowed -- telemetry must never interfere with the
 * user experience.
 */

function isTelemetryEnabled(): boolean {
  if (process.env.QASKILLS_TELEMETRY === '0') return false;
  if (process.env.DO_NOT_TRACK === '1') return false;
  return true;
}

export function sendTelemetry(event: {
  skillId: string;
  action: 'install' | 'remove' | 'update';
  agents: string[];
}): void {
  if (!isTelemetryEnabled()) return;

  // Fire-and-forget -- intentionally not awaited
  trackInstall({
    ...event,
    cliVersion: CLI_VERSION,
  }).catch(() => {
    // Silently swallow all telemetry errors
  });
}
