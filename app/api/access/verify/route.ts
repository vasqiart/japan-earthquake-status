import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_DURATION_MS } from '@/lib/plans';
import type { PlanKey } from '@/lib/plans';

/**
 * GET /api/access/verify?token=xxxx or ?t=xxxx
 * 
 * Verifies if the provided token is valid and not expired.
 * On first access, activates the token (sets activated_at and expires_at).
 * Returns minimal information for security.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token') || searchParams.get('t');

  // No token provided
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: 'missing' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const nowISO = now.toISOString();

    // Query the access_tokens table with all needed fields
    const { data, error } = await supabase
      .from('access_tokens')
      .select('email, expires_at, activated_at, activation_deadline_at, plan')
      .eq('token', token)
      .maybeSingle();

    // Priority 1: If there's a Supabase error, return error response
    if (error) {
      return NextResponse.json(
        { ok: false, reason: 'error' },
        { status: 500 }
      );
    }

    // Priority 2: If data is null, token not found
    if (!data) {
      return NextResponse.json(
        { ok: false, reason: 'not_found' },
        { status: 200 } // Return 200 to avoid exposing token existence
      );
    }

    // Priority 3: Handle unactivated token (activated_at is null)
    if (!data.activated_at) {
      // Check if activation deadline has passed
      if (data.activation_deadline_at && new Date(data.activation_deadline_at) < now) {
        return NextResponse.json(
          { ok: false, reason: 'expired' },
          { status: 200 }
        );
      }

      // Activate the token now (first access)
      const plan = (data.plan as PlanKey) || 'day';
      const durationMs = PLAN_DURATION_MS[plan] || PLAN_DURATION_MS.day;
      const expiresAt = new Date(now.getTime() + durationMs);

      // Update with race condition protection: only update if activated_at is still null
      const { error: updateError } = await supabase
        .from('access_tokens')
        .update({
          activated_at: nowISO,
          expires_at: expiresAt.toISOString(),
        })
        .eq('token', token)
        .is('activated_at', null);

      if (updateError) {
        console.error('[access/verify] activation update error', updateError);
        return NextResponse.json(
          { ok: false, reason: 'error' },
          { status: 500 }
        );
      }

      // Return success with the newly set expiration
      return NextResponse.json(
        {
          ok: true,
          expiresAt: expiresAt.toISOString(),
          email: data.email,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Priority 4: Token is already activated - check if expired
    if (data.expires_at && new Date(data.expires_at) < now) {
      return NextResponse.json(
        { ok: false, reason: 'expired' },
        { status: 200 }
      );
    }

    // Priority 5: Token is valid and activated
    return NextResponse.json(
      {
        ok: true,
        expiresAt: data.expires_at,
        email: data.email,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    // Suppress error details for security
    console.error('Token verification error:', error);
    return NextResponse.json(
      { ok: false, reason: 'error' },
      { status: 500 }
    );
  }
}
