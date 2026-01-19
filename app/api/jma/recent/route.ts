import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

const JMA_FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const FETCH_TIMEOUT_MS = 8000; // 8 seconds
const MAX_ITEMS = 5;
const MAX_ENTRIES_TO_CHECK = 20; // Check up to 20 entries to find 5 unique EventIDs

// Allowed bulletin type prefixes (earthquake-related)
const ALLOW_PREFIXES = ['VXSE'];

interface RecentItem {
  eventId: string;
  updatedAtJst: string | null;
  hypocenterAreaName: string | null;
  magnitude: string | null;
  link: string | null;
}

interface CacheEntry {
  ok: true;
  fetchedAtJst: string;
  source: string;
  items: RecentItem[];
  cachedAt: number; // epoch ms
}

// In-memory cache (module-scoped, shared across requests)
let cache: CacheEntry | null = null;

interface AtomEntry {
  id?: string;
  title?: string;
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
 * Extract file prefix from URL
 * Example: "https://.../VXSE51_....xml" -> "VXSE"
 */
function extractFilePrefix(url: string | null): string | null {
  if (!url) {
    return null;
  }
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || '';
    
    // Extract prefix (e.g., "VXSE" from "VXSE51_....xml")
    const match = filename.match(/^([A-Z]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if entry matches allowed prefixes
 */
function isAllowedEntry(entry: AtomEntry): boolean {
  const links = Array.isArray(entry.link)
    ? entry.link
    : entry.link
    ? [entry.link]
    : [];
  
  const xmlLink = links.find(
    (link) => !link['@_rel'] || link['@_rel'] === 'alternate'
  );
  
  const link = xmlLink?.['@_href'] || null;
  const prefix = extractFilePrefix(link);
  
  if (!prefix) {
    return false; // No link or prefix, exclude
  }
  
  return ALLOW_PREFIXES.some((allowed) => prefix.startsWith(allowed));
}

/**
 * Extract earthquake data from XML (no interpretation, extraction only)
 * updatedAtJst is provided by caller (from Atom entry.updated) to avoid mixing time sources
 */
async function extractEarthquakeData(
  xmlUrl: string,
  updatedAtJst: string | null
): Promise<{
  eventId: string | null;
  hypocenterAreaName: string | null;
  magnitude: string | null;
} | null> {
  try {
    const xmlResponse = await fetchWithTimeout(xmlUrl, {
      headers: {
        'User-Agent': 'Japan-Earthquake-Status/1.0',
      },
    });

    if (!xmlResponse.ok) {
      return null;
    }

    const xmlText = await xmlResponse.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const xmlData = parser.parse(xmlText);

    // Extract EventID
    const eventId = xmlData.Report?.Head?.EventID || null;

    if (!eventId) {
      return null; // EventID is required
    }

    // Extract Hypocenter/Area Name
    const hypocenterAreaName = xmlData.Report?.Body?.Earthquake?.Hypocenter?.Area?.Name || null;

    // Extract Magnitude
    let magnitude: string | null = null;
    const magnitudeObj = xmlData.Report?.Body?.Earthquake?.Magnitude;
    if (magnitudeObj) {
      // Try to get numeric value first
      if (magnitudeObj['@_jmx_eb:Magnitude']) {
        magnitude = `M${magnitudeObj['@_jmx_eb:Magnitude']}`;
      } else if (magnitudeObj['@_description']) {
        // Fallback to description if available
        magnitude = magnitudeObj['@_description'];
      } else if (typeof magnitudeObj === 'string') {
        magnitude = magnitudeObj;
      }
    }

    return {
      eventId,
      hypocenterAreaName,
      magnitude,
    };
  } catch {
    return null;
  }
}

/**
 * Generate mock recent activity data (development only)
 */
function generateMockRecentItems(): RecentItem[] {
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jstTime = new Date(utc + (jstOffset * 60000));
  
  const formatJSTISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
  };
  
  const mockData: RecentItem[] = [
    {
      eventId: 'mock-001',
      updatedAtJst: formatJSTISO(new Date(jstTime.getTime() - 2 * 60 * 1000)), // 2 minutes ago
      hypocenterAreaName: 'Off the coast of Ibaraki',
      magnitude: 'M5.2',
      link: 'https://www.jma.go.jp/jma/index.html',
    },
    {
      eventId: 'mock-002',
      updatedAtJst: formatJSTISO(new Date(jstTime.getTime() - 5 * 60 * 1000)), // 5 minutes ago
      hypocenterAreaName: 'Near the coast of Chiba',
      magnitude: 'M4.1',
      link: 'https://www.jma.go.jp/jma/index.html',
    },
    {
      eventId: 'mock-003',
      updatedAtJst: formatJSTISO(new Date(jstTime.getTime() - 12 * 60 * 1000)), // 12 minutes ago
      hypocenterAreaName: 'Off the coast of Fukushima',
      magnitude: 'M3.8',
      link: 'https://www.jma.go.jp/jma/index.html',
    },
    {
      eventId: 'mock-004',
      updatedAtJst: formatJSTISO(new Date(jstTime.getTime() - 18 * 60 * 1000)), // 18 minutes ago
      hypocenterAreaName: 'Near the coast of Miyagi',
      magnitude: 'M4.5',
      link: 'https://www.jma.go.jp/jma/index.html',
    },
    {
      eventId: 'mock-005',
      updatedAtJst: formatJSTISO(new Date(jstTime.getTime() - 25 * 60 * 1000)), // 25 minutes ago
      hypocenterAreaName: 'Off the coast of Iwate',
      magnitude: 'M3.2',
      link: 'https://www.jma.go.jp/jma/index.html',
    },
    {
      eventId: 'mock-006',
      updatedAtJst: formatJSTISO(new Date(jstTime.getTime() - 30 * 60 * 1000)), // 30 minutes ago
      hypocenterAreaName: 'Near the coast of Higashimokoto, Abashiri District, Hokkaido',
      magnitude: 'M4.8',
      link: 'https://www.jma.go.jp/jma/index.html',
    },
  ];
  
  return mockData;
}

/**
 * GET /api/jma/recent
 * 
 * Returns recent JMA feed entries (metadata only, no interpretation).
 */
export async function GET(request: NextRequest) {
  // Mock mode (development only)
  if (process.env.NODE_ENV !== 'production') {
    const url = new URL(request.url);
    const mock = url.searchParams.get('mock');
    if (mock === '1') {
      const fetchedAtJst = getJSTISOString();
      const mockItems = generateMockRecentItems();
      return NextResponse.json({
        ok: true,
        fetchedAtJst,
        source: 'MOCK',
        items: mockItems,
        cache: {
          hit: false,
          ageSeconds: 0,
        },
      });
    }
  }
  
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
        items: [],
      });
    }

    const feedXml = await feedResponse.text();

    // Step 2: Parse feed to get entries
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

    // Step 3: Filter entries by bulletin type prefix (earthquake-related only)
    const filteredEntries = entries.filter(isAllowedEntry);

    // Diagnostic: Log prefix distribution (development only)
    if (process.env.NODE_ENV !== 'production') {
      const prefixCounts: Record<string, number> = {};
      entries.slice(0, 20).forEach((entry) => {
        const links = Array.isArray(entry.link)
          ? entry.link
          : entry.link
          ? [entry.link]
          : [];
        const xmlLink = links.find(
          (link) => !link['@_rel'] || link['@_rel'] === 'alternate'
        );
        const link = xmlLink?.['@_href'] || null;
        const prefix = extractFilePrefix(link);
        if (prefix) {
          prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        }
      });
      console.log('[JMA Recent] Prefix distribution (top 20 entries):', prefixCounts);
    }

    // Step 4: Extract earthquake data from XML and group by EventID
    const eventMap = new Map<string, RecentItem & { updatedTimestamp: number }>();
    
    // Process entries up to MAX_ENTRIES_TO_CHECK or until we have MAX_ITEMS unique EventIDs
    for (const entry of filteredEntries.slice(0, MAX_ENTRIES_TO_CHECK)) {
      if (eventMap.size >= MAX_ITEMS) {
        break; // We have enough unique events
      }

      // Extract link (prefer alternate link)
      const links = Array.isArray(entry.link)
        ? entry.link
        : entry.link
        ? [entry.link]
        : [];
      
      const xmlLink = links.find(
        (link) => !link['@_rel'] || link['@_rel'] === 'alternate'
      );
      
      const link = xmlLink?.['@_href'] || null;
      if (!link) {
        continue;
      }

      // Calculate updatedAtJst from Atom entry.updated (single source of truth)
      const updatedAtJst = entry.updated ? convertToJSTISO(entry.updated) : null;
      const updatedTimestamp = entry.updated ? new Date(entry.updated).getTime() : 0;

      // Fetch and parse XML
      const earthquakeData = await extractEarthquakeData(link, updatedAtJst);
      if (!earthquakeData || !earthquakeData.eventId) {
        continue;
      }

      const eventId = earthquakeData.eventId;

      // If EventID already exists, keep the one with newer updated time
      const existing = eventMap.get(eventId);
      if (!existing || updatedTimestamp > existing.updatedTimestamp) {
        eventMap.set(eventId, {
          eventId,
          updatedAtJst, // Use Atom entry.updated as single source
          hypocenterAreaName: earthquakeData.hypocenterAreaName,
          magnitude: earthquakeData.magnitude,
          link,
          updatedTimestamp,
        });
      }
    }

    // Convert to array and sort by updatedAtJst descending, then take top MAX_ITEMS
    const items: RecentItem[] = Array.from(eventMap.values())
      .sort((a, b) => {
        const timeA = a.updatedTimestamp;
        const timeB = b.updatedTimestamp;
        return timeB - timeA; // Descending order
      })
      .slice(0, MAX_ITEMS)
      .map(({ updatedTimestamp, ...item }) => item); // Remove updatedTimestamp from final result

    // Save to cache
    cache = {
      ok: true,
      fetchedAtJst,
      source: JMA_FEED_URL,
      items,
      cachedAt: Date.now(),
    };

    return NextResponse.json({
      ok: true,
      fetchedAtJst,
      source: JMA_FEED_URL,
      items,
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
      items: [],
    });
  }
}
