export const PLAYWRIGHT_CLI_LAUNCH_DATE = '2026-07-14T00:00:00.000Z';

export function getSkillLaunchDate(slug: string): Date | undefined {
  return slug === 'playwright-cli' ? new Date(PLAYWRIGHT_CLI_LAUNCH_DATE) : undefined;
}
