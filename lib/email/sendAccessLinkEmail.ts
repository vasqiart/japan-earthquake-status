import 'server-only';
import { Resend } from 'resend';
import type { PlanKey } from '@/lib/plans';

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function sendAccessLinkEmail(params: {
  to: string;
  token: string;
  plan: PlanKey;
}) {
  const resend = new Resend(mustGetEnv('RESEND_API_KEY'));
  const from = mustGetEnv('RESEND_FROM');
  const siteUrl = mustGetEnv('PUBLIC_SITE_URL').replace(/\/$/, '');
  const link = `${siteUrl}/?t=${encodeURIComponent(params.token)}`;

  const planLabel = params.plan === 'day' ? 'Day Pass (24 hours)' : 'Week Pass (7 days)';

  // "判断しない"方針：命令/安全断定はしない。公式参照は既存UIに任せる。
  const subject = `Your pass link — ${planLabel}`;

  const text = [
    `Thanks for your purchase.`,
    ``,
    `Your pass link:`,
    link,
    ``,
    `Activation: The pass starts when you open the link for the first time.`,
    `Activation deadline: 30 days after purchase.`,
    ``,
    `If your access is expired, you will see an "Access expired" screen.`,
  ].join('\n');

  await resend.emails.send({
    from,
    to: params.to,
    subject,
    text,
  });
}
