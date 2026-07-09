import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { landingSignups } from '@/db/schema';
import { resend } from '@/lib/email/client';

const signupSchema = z.object({
  email: z.string().email().max(320),
  source: z.string().max(120).optional(),
  note: z.string().max(2000).optional(),
});

// Public email capture — allow cross-origin POSTs from static landing pages
// (e.g. app.thetestingacademy.com hosting the QA Buddy page). No credentials.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Per-product branding for the confirmation email, keyed by signup source.
const PRODUCTS: Record<string, { from: string; name: string; ask: string }> = {
  'evaldog-landing': {
    from: 'EvalDog <noreply@qaskills.sh>',
    name: 'EvalDog',
    ask: 'reply with the last time a model update or prompt change silently broke something for you',
  },
  'qabuddy-landing': {
    from: 'QA Buddy <noreply@qaskills.sh>',
    name: 'QA Buddy',
    ask: 'reply with the #1 thing you want an AI QA copilot to answer from your test cases, code, or Jira',
  },
};

const DEFAULT_PRODUCT = PRODUCTS['evaldog-landing'];

// Lead-magnet source: capture the email AND hand back download links so the
// popup shows them instantly, even if email delivery or DB storage fails.
const LEAD_MAGNET_SOURCE = 'claude-qa-lead-magnet';
const SITE = 'https://qaskills.sh';
const LEAD_MAGNET_DOWNLOADS = {
  ebook: `${SITE}/lead-magnet/claude-code-qa-playbook.pdf`,
  skillsZip: `${SITE}/lead-magnet/claude-code-qa-skills.zip`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400, headers: CORS });
    }

    const { email, source, note } = parsed.data;
    const isLeadMagnet = source === LEAD_MAGNET_SOURCE;

    // Store the lead. Idempotent per (email, source): re-submitting is a no-op.
    // Never let a storage problem block delivery of a lead magnet the user
    // already earned — capture failures are logged, not surfaced.
    try {
      await db
        .insert(landingSignups)
        .values({ email, source: source ?? '', note: note ?? '' })
        .onConflictDoNothing({ target: [landingSignups.email, landingSignups.source] });
    } catch (dbErr) {
      console.error('signup storage failed (delivery continues):', dbErr);
      if (!isLeadMagnet) throw dbErr;
    }

    // Fire-and-forget confirmation — never block the response on email failure.
    if (isLeadMagnet) {
      void sendLeadMagnet(email);
      return NextResponse.json({ ok: true, downloads: LEAD_MAGNET_DOWNLOADS }, { headers: CORS });
    }

    void sendConfirmation(email, source ?? '');
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (error) {
    console.error('signup error:', error);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500, headers: CORS });
  }
}

async function sendLeadMagnet(email: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping lead-magnet email (links still returned in response)');
    return;
  }
  try {
    await resend.emails.send({
      from: 'Pramod at QASkills.sh <noreply@qaskills.sh>',
      to: email,
      subject: 'Your Claude Code QA Playbook + 5-skill starter pack',
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;">
          <h2 style="margin:0 0 12px;">Here is your download. 🎯</h2>
          <p style="margin:0 0 16px;line-height:1.6;">
            Thanks for grabbing the <strong>Claude Code QA Playbook</strong>. Two things for you:
          </p>
          <p style="margin:0 0 10px;">
            <a href="${LEAD_MAGNET_DOWNLOADS.ebook}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Download the Playbook (PDF)</a>
          </p>
          <p style="margin:0 0 16px;">
            <a href="${LEAD_MAGNET_DOWNLOADS.skillsZip}" style="display:inline-block;background:#0f172a;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Download 5 QA skills (ZIP)</a>
          </p>
          <p style="margin:0 0 12px;line-height:1.6;">
            The ZIP has 5 ready-to-install SKILL.md files for Claude Code: Playwright E2E, DeepEval, unit test generation, PR coverage review, and Jira workflows. Drop them into <code>.claude/skills/</code> or run <code>npx qaskills add &lt;skill&gt;</code>.
          </p>
          <p style="margin:0 0 12px;line-height:1.6;">
            Explore all 400+ QA skills at <a href="${SITE}">qaskills.sh</a>.
          </p>
          <p style="margin:16px 0 0;line-height:1.6;color:#475569;font-size:14px;">
            — Pramod, The Testing Academy / QASkills.sh
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('lead-magnet email failed (links still returned in response):', err);
  }
}

async function sendConfirmation(email: string, source: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping signup confirmation email');
    return;
  }
  const product = PRODUCTS[source] ?? DEFAULT_PRODUCT;
  try {
    await resend.emails.send({
      from: product.from,
      to: email,
      subject: `You're on the ${product.name} list`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0f172a;">
          <h2 style="margin:0 0 12px;">You're in. 🎯</h2>
          <p style="margin:0 0 12px;line-height:1.6;">
            Thanks for joining the <strong>${product.name}</strong> early list.
          </p>
          <p style="margin:0 0 12px;line-height:1.6;">
            One quick ask that genuinely shapes what we build:
            <strong>just ${product.ask}</strong>. Your answer = our roadmap.
          </p>
          <p style="margin:16px 0 0;line-height:1.6;color:#475569;font-size:14px;">
            — Pramod, The Testing Academy / QASkills.sh
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('signup confirmation email failed:', err);
  }
}
