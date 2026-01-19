import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

const JMA_FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const FETCH_TIMEOUT_MS = 8000; // 8 seconds

interface CacheEntry {
  ok: true;
  fetchedAtJst: string;
  source: string;
  contentType: string;
  sizeBytes: number;
  preview: string;
  officialUpdatedAtJst: string | null;
  cachedAt: number; // epoch ms
}

// In-memory cache (module-scoped, shared across requests)
let cache: CacheEntry | null = null;

interface AtomEntry {
  id?: string;
  updated?: string;
  link?: {
    '@_href'?: string;
    '@_rel'?: string;
  } | Array<{
    '@_href'?: string;
    '@_rel'?: string;
  }>;
}

interface AtomFeed {
  feed?: {
    entry?: AtomEntry | AtomEntry[];
  };
}

/**
 * Format current time as JST ISO string
 */
function getJSTISOString(): string {
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jstTime = new Date(utc + (jstOffset * 60000));
  
  const year = jstTime.getFullYear();
  const month = String(jstTime.getMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getDate()).padStart(2, '0');
  const hours = String(jstTime.getHours()).padStart(2, '0');
  const minutes = String(jstTime.getMinutes()).padStart(2, '0');
  const seconds = String(jstTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

/**
 * Convert ISO 8601 date string to JST ISO string
 */
function convertToJSTISO(isoString: string): string | null {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Convert to JST (UTC+9)
    const jstOffset = 9 * 60; // JST is UTC+9
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const jstTime = new Date(utc + (jstOffset * 60000));
    
    const year = jstTime.getFullYear();
    const month = String(jstTime.getMonth() + 1).padStart(2, '0');
    const day = String(jstTime.getDate()).padStart(2, '0');
    const hours = String(jstTime.getHours()).padStart(2, '0');
    const minutes = String(jstTime.getMinutes()).padStart(2, '0');
    const seconds = String(jstTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
  } catch {
    return null;
  }
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Check if cache is valid (within TTL)
 */
function isCacheValid(): boolean {
  if (!cache) {
    return false;
  }
  const now = Date.now();
  const age = now - cache.cachedAt;
  return age < CACHE_TTL_MS;
}

/**
 * Get cache age in seconds
 */
function getCacheAgeSeconds(): number {
  if (!cache) {
    return 0;
  }
  const now = Date.now();
  const age = now - cache.cachedAt;
  return Math.floor(age / 1000);
}

/**
 * GET /api/jma/raw
 * 
 * PoC endpoint for observing JMA public data.
 * Returns raw data preview without interpretation or transformation.
 */
export async function GET(request: NextRequest) {
  // Check cache first
  if (isCacheValid()) {
    const ageSeconds = getCacheAgeSeconds();
    return NextResponse.json({
      ...cache,
      cache: {
        hit: true,
        ageSeconds,
      },
    });
  }

  const fetchedAtJst = getJSTISOString();

  try {
    // Step 1: Fetch Atom feed with timeout
    const feedResponse = await fetchWithTimeout(JMA_FEED_URL, {
      headers: {
        'User-Agent': 'Japan-Earthquake-Status/1.0',
      },
    });

    if (!feedResponse.ok) {
      // Fallback to cache if available
      if (cache) {
        const ageSeconds = getCacheAgeSeconds();
        return NextResponse.json({
          ...cache,
          cache: {
            hit: true,
            ageSeconds,
          },
        });
      }
      
      return NextResponse.json({
        ok: false,
        fetchedAtJst,
        source: JMA_FEED_URL,
        error: `Failed to fetch JMA feed: ${feedResponse.status}`,
        cache: {
          hit: false,
          ageSeconds: 0,
        },
      });
    }

    const feedXml = await feedResponse.text();
    const feedContentType = feedResponse.headers.get('content-type') || 'unknown';
    const feedSizeBytes = new Blob([feedXml]).size;

    // Step 2: Parse feed to get latest entry
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const feedData: AtomFeed = parser.parse(feedXml);
    const entries = Array.isArray(feedData.feed?.entry)
      ? feedData.feed.entry
      : feedData.feed?.entry
      ? [feedData.feed.entry]
      : [];

    if (entries.length === 0) {
      const result = {
        ok: true as const,
        fetchedAtJst,
        source: JMA_FEED_URL,
        contentType: feedContentType,
        sizeBytes: feedSizeBytes,
        preview: feedXml.substring(0, 1000),
        officialUpdatedAtJst: null,
        cache: {
          hit: false,
          ageSeconds: 0,
        },
      };
      
      // Save to cache
      cache = {
        ok: true,
        fetchedAtJst,
        source: JMA_FEED_URL,
        contentType: feedContentType,
        sizeBytes: feedSizeBytes,
        preview: feedXml.substring(0, 1000),
        officialUpdatedAtJst: null,
        cachedAt: Date.now(),
      };
      
      return NextResponse.json(result);
    }

    // Step 3: Get latest entry's updated time and XML link
    const latestEntry = entries[0];
    const entryUpdated = latestEntry.updated;
    const officialUpdatedAtJst = entryUpdated ? convertToJSTISO(entryUpdated) : null;
    
    const links = Array.isArray(latestEntry.link)
      ? latestEntry.link
      : latestEntry.link
      ? [latestEntry.link]
      : [];

    const xmlLink = links.find(
      (link) => !link['@_rel'] || link['@_rel'] === 'alternate'
    );

    if (!xmlLink?.['@_href']) {
      // If no XML link, return feed preview
      const result = {
        ok: true as const,
        fetchedAtJst,
        source: JMA_FEED_URL,
        contentType: feedContentType,
        sizeBytes: feedSizeBytes,
        preview: feedXml.substring(0, 1000),
        officialUpdatedAtJst,
        cache: {
          hit: false,
          ageSeconds: 0,
        },
      };
      
      // Save to cache
      cache = {
        ok: true,
        fetchedAtJst,
        source: JMA_FEED_URL,
        contentType: feedContentType,
        sizeBytes: feedSizeBytes,
        preview: feedXml.substring(0, 1000),
        officialUpdatedAtJst,
        cachedAt: Date.now(),
      };
      
      return NextResponse.json(result);
    }

    const xmlUrl = xmlLink['@_href'];

    // Step 4: Fetch detailed XML with timeout
    let xmlResponse: Response;
    try {
      xmlResponse = await fetchWithTimeout(xmlUrl, {
        headers: {
          'User-Agent': 'Japan-Earthquake-Status/1.0',
        },
      });
    } catch (error) {
      // Fallback to cache if available
      if (cache) {
        const ageSeconds = getCacheAgeSeconds();
        return NextResponse.json({
          ...cache,
          cache: {
            hit: true,
            ageSeconds,
          },
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({
        ok: false,
        fetchedAtJst,
        source: xmlUrl,
        error: errorMessage,
        cache: {
          hit: false,
          ageSeconds: 0,
        },
      });
    }

    if (!xmlResponse.ok) {
      // Fallback to cache if available
      if (cache) {
        const ageSeconds = getCacheAgeSeconds();
        return NextResponse.json({
          ...cache,
          cache: {
            hit: true,
            ageSeconds,
          },
        });
      }
      
      return NextResponse.json({
        ok: false,
        fetchedAtJst,
        source: xmlUrl,
        error: `Failed to fetch detailed XML: ${xmlResponse.status}`,
        cache: {
          hit: false,
          ageSeconds: 0,
        },
      });
    }

    const detailedXml = await xmlResponse.text();
    const xmlContentType = xmlResponse.headers.get('content-type') || 'unknown';
    const xmlSizeBytes = new Blob([detailedXml]).size;

    // Step 5: Generate preview (first 1000 characters)
    let preview: string;
    try {
      // Try to parse as JSON first
      const jsonData = JSON.parse(detailedXml);
      preview = JSON.stringify(jsonData, null, 2).substring(0, 1000);
    } catch {
      // If not JSON, use raw text
      preview = detailedXml.substring(0, 1000);
    }

    // Save to cache
    cache = {
      ok: true,
      fetchedAtJst,
      source: xmlUrl,
      contentType: xmlContentType,
      sizeBytes: xmlSizeBytes,
      preview,
      officialUpdatedAtJst,
      cachedAt: Date.now(),
    };

    return NextResponse.json({
      ok: true,
      fetchedAtJst,
      source: xmlUrl,
      contentType: xmlContentType,
      sizeBytes: xmlSizeBytes,
      preview,
      officialUpdatedAtJst,
      cache: {
        hit: false,
        ageSeconds: 0,
      },
    });
  } catch (error) {
    // Fallback to cache if available
    if (cache) {
      const ageSeconds = getCacheAgeSeconds();
      return NextResponse.json({
        ...cache,
        cache: {
          hit: true,
          ageSeconds,
        },
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      ok: false,
      fetchedAtJst,
      source: JMA_FEED_URL,
      error: errorMessage,
      cache: {
        hit: false,
        ageSeconds: 0,
      },
    });
  }
}
