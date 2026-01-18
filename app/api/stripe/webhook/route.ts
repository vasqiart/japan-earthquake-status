import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 最小土台：Stripeから届いたら必ず200を返すだけ
  // 署名検証・イベント判定・DB・メール送信は次ステップで追加する
  try {
    // raw body を読む（次ステップの署名検証で必要になるため）
    await req.text();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // 念のため：失敗してもStripeには200を返す（再送ループ回避）
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
