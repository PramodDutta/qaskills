import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'Refund policy for QASkills.sh. Our core platform is free and open source. Learn about refunds for premium services.',
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 prose dark:prose-invert">
      <h1>Refund Policy</h1>
      <p className="text-muted-foreground">Last updated: February 2026</p>

      <h2>1. Free Services</h2>
      <p>
        QASkills.sh core platform is <strong>free and open source</strong>. This includes browsing
        skills, installing skills via the CLI, publishing skills, and accessing the leaderboard,
        packs, and all community features. No payment is required and therefore no refund applies.
      </p>

      <h2>2. Donations &amp; Sponsorships</h2>
      <p>
        Voluntary donations made through Buy Me a Coffee or similar platforms are considered
        gifts to support the project. Donations are <strong>non-refundable</strong> as they are
        voluntary contributions, not purchases of goods or services.
      </p>

      <h2>3. Enterprise Services</h2>
      <p>
        For paid enterprise services (custom skill development, private registries, dedicated support),
        refund terms are outlined in individual service agreements. General guidelines:
      </p>
      <ul>
        <li>
          <strong>Before work begins:</strong> Full refund within 14 days of purchase if no
          deliverables have been provided.
        </li>
        <li>
          <strong>Partial delivery:</strong> Pro-rated refund based on the portion of work not yet
          completed, at our discretion.
        </li>
        <li>
          <strong>After delivery:</strong> No refund once all deliverables have been provided and
          accepted.
        </li>
      </ul>

      <h2>4. How to Request a Refund</h2>
      <p>To request a refund for enterprise services:</p>
      <ol>
        <li>
          Email us at{' '}
          <a href="mailto:hello@thetestingacademy.com">hello@thetestingacademy.com</a> with
          &quot;Refund Request&quot; in the subject line.
        </li>
        <li>Include your order details, the reason for the refund, and any relevant documentation.</li>
        <li>We will review your request and respond within 5 business days.</li>
      </ol>

      <h2>5. Chargebacks</h2>
      <p>
        We encourage you to contact us directly before initiating a chargeback with your payment
        provider. We are committed to resolving any issues promptly and fairly.
      </p>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this refund policy from time to time. Changes will be posted on this page
        with an updated revision date.
      </p>

      <h2>7. Contact</h2>
      <p>
        For refund questions, email us at{' '}
        <a href="mailto:hello@thetestingacademy.com">hello@thetestingacademy.com</a>.
      </p>
    </div>
  );
}
