import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { PlanKey } from '@/lib/plans';

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getPriceId(plan: PlanKey): string {
  if (plan === 'day') return mustGetEnv('STRIPE_PRICE_DAY');
  return mustGetEnv('STRIPE_PRICE_WEEK');
}

export async function POST(req: NextRequest) {
  try {
    const { plan, email } = await req.json().catch(() => ({}));

    if (plan !== 'day' && plan !== 'week') {
      return NextResponse.json({ ok: false, reason: 'invalid_plan' }, { status: 400 });
    }

    const stripe = new Stripe(mustGetEnv('STRIPE_SECRET_KEY'));

    const siteUrl = mustGetEnv('PUBLIC_SITE_URL').replace(/\/$/, '');

    // Checkout完了は webhook で確定する（ここではtoken生成しない）
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      // emailは任意。未入力でもStripe側で収集できるようにする
      customer_email: typeof email === 'string' && email.includes('@') ? email : undefined,
      // 重要：planをwebhookに渡す
      metadata: { plan },
      // LPに戻すだけ（提供はメールのリンクで行う）
      success_url: `${siteUrl}/lp?paid=1`,
      cancel_url: `${siteUrl}/lp?canceled=1`,
    });

    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch (e) {
    console.error('[stripe/checkout] error', e);
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 500 });
  }
}
