import { NextRequest, NextResponse } from 'next/server';
import { fetchAndCacheJMA } from '@/lib/jma-fetcher';

/**
 * GET /api/cron/jma?token=<CRON_TOKEN>
 * 
 * Cron endpoint for fetching JMA data and caching it in Supabase.
 * This endpoint should only be called by Vercel Cron or similar scheduled jobs.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const expectedToken = process.env.CRON_TOKEN;

  // Validate token
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'CRON_TOKEN not configured' },
      { status: 500 }
    );
  }

  if (token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Fetch and cache JMA data
  const result = await fetchAndCacheJMA();

  return NextResponse.json({
    ok: result.ok,
    fetchedAtJst: result.fetchedAtJst,
    latestFeedId: result.latestFeedId,
    error: result.error,
  });
}
