export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 prose dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: February 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you provide (account details, published skills) and usage data (page views, install telemetry). CLI telemetry is anonymous and can be disabled via the QASKILLS_TELEMETRY=0 environment variable.</p>

      <h2>2. How We Use Information</h2>
      <p>We use your information to provide the service, improve the platform, generate aggregate statistics (leaderboard, install counts), and communicate with you about your account.</p>

      <h2>3. Data Sharing</h2>
      <p>We do not sell your personal data. We may share aggregate, anonymized statistics. Published skills are publicly accessible by design.</p>

      <h2>4. Authentication</h2>
      <p>We use Clerk for authentication. Your authentication data is handled according to Clerk&apos;s privacy policy.</p>

      <h2>5. Analytics</h2>
      <p>We use PostHog and Plausible for analytics. Plausible is privacy-focused and does not use cookies. PostHog is used for product analytics.</p>

      <h2>6. CLI Telemetry</h2>
      <p>The QA Skills CLI collects anonymous usage data (install/remove events, agent type) to improve the service. No personal data is collected. Disable with: <code>export QASKILLS_TELEMETRY=0</code></p>

      <h2>7. Data Retention</h2>
      <p>Account data is retained while your account is active. You may request deletion by contacting us.</p>

      <h2>8. Contact</h2>
      <p>For privacy questions, contact us at hello@thetestingacademy.com.</p>
    </div>
  );
}
