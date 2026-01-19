import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { normalizeMaxIntToKey } from '@/lib/shindoGuidance';

const JMA_FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
const FETCH_TIMEOUT_MS = 8000; // 8 seconds

/**
 * English prefecture name to Japanese name mapping (partial, for MVP)
 * Note: This is a simplified mapping. Full mapping may be needed for production.
 */
const PREFECTURE_NAME_MAP: Record<string, string> = {
  'Tokyo': '東京都',
  'Hokkaido': '北海道',
  'Aomori': '青森県',
  'Iwate': '岩手県',
  'Miyagi': '宮城県',
  'Akita': '秋田県',
  'Yamagata': '山形県',
  'Fukushima': '福島県',
  'Ibaraki': '茨城県',
  'Tochigi': '栃木県',
  'Gunma': '群馬県',
  'Saitama': '埼玉県',
  'Chiba': '千葉県',
  'Kanagawa': '神奈川県',
  'Niigata': '新潟県',
  'Toyama': '富山県',
  'Ishikawa': '石川県',
  'Fukui': '福井県',
  'Yamanashi': '山梨県',
  'Nagano': '長野県',
  'Gifu': '岐阜県',
  'Shizuoka': '静岡県',
  'Aichi': '愛知県',
  'Mie': '三重県',
  'Shiga': '滋賀県',
  'Kyoto': '京都府',
  'Osaka': '大阪府',
  'Hyogo': '兵庫県',
  'Nara': '奈良県',
  'Wakayama': '和歌山県',
  'Tottori': '鳥取県',
  'Shimane': '島根県',
  'Okayama': '岡山県',
  'Hiroshima': '広島県',
  'Yamaguchi': '山口県',
  'Tokushima': '徳島県',
  'Kagawa': '香川県',
  'Ehime': '愛媛県',
  'Kochi': '高知県',
  'Fukuoka': '福岡県',
  'Saga': '佐賀県',
  'Nagasaki': '長崎県',
  'Kumamoto': '熊本県',
  'Oita': '大分県',
  'Miyazaki': '宮崎県',
  'Kagoshima': '鹿児島県',
  'Okinawa': '沖縄県',
};

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
 * Extract maxInt for a specific prefecture from JMA XML
 * Returns maxInt as string (e.g., "4", "5-", "5+", "6-", "6+", "7") or null
 */
async function extractMaxIntForPrefecture(
  prefectureJapanese: string,
  xmlUrl: string
): Promise<string | null> {
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

    // Extract intensity information from JMA XML structure
    // Structure: Report.Body.Intensity.Observation.MaxInt or similar
    const maxInt = xmlData.Report?.Body?.Intensity?.Observation?.MaxInt;
    if (maxInt) {
      // If MaxInt is a string, return it directly
      if (typeof maxInt === 'string') {
        return maxInt.trim();
      }
      // If MaxInt is an object, try to extract value
      if (typeof maxInt === 'object' && maxInt['@_jmx_eb:MaxInt']) {
        return String(maxInt['@_jmx_eb:MaxInt']).trim();
      }
    }

    // Alternative: Check for prefecture-specific intensity data
    // This is a simplified extraction - actual JMA XML structure may vary
    const intensityStations = xmlData.Report?.Body?.Intensity?.Observation?.Pref;
    if (intensityStations) {
      const prefs = Array.isArray(intensityStations) ? intensityStations : [intensityStations];
      for (const pref of prefs) {
        const prefName = pref['@_jmx_eb:Name'] || pref['@_Name'] || pref.Name;
        if (prefName && prefName.includes(prefectureJapanese)) {
          const maxIntValue = pref.MaxInt;
          if (maxIntValue) {
            if (typeof maxIntValue === 'string') {
              return maxIntValue.trim();
            }
            if (typeof maxIntValue === 'object' && maxIntValue['@_jmx_eb:MaxInt']) {
              return String(maxIntValue['@_jmx_eb:MaxInt']).trim();
            }
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/status?prefecture=<string>
 * 
 * Returns earthquake status for the specified prefecture.
 * Checks JMA connection status via /api/jma/raw endpoint.
 * 
 * @param request - Next.js request object
 * @returns JSON response with status information
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const prefecture = searchParams.get('prefecture');

  // Validate prefecture parameter
  if (!prefecture) {
    return NextResponse.json(
      { error: 'prefecture parameter is required' },
      { status: 400 }
    );
  }

  // Check for mock parameter (development only)
  const mock = searchParams.get('mock');
  const isMockMode = process.env.NODE_ENV !== 'production' && mock === '1';

  // Get current time in JST (Asia/Tokyo) and format as ISO string
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jstTime = new Date(utc + (jstOffset * 60000));
  
  // Format as ISO string with JST timezone offset (+09:00)
  const year = jstTime.getFullYear();
  const month = String(jstTime.getMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getDate()).padStart(2, '0');
  const hours = String(jstTime.getHours()).padStart(2, '0');
  const minutes = String(jstTime.getMinutes()).padStart(2, '0');
  const seconds = String(jstTime.getSeconds()).padStart(2, '0');
  const serverCheckedAtJst = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;

  // Check JMA connection status via /api/jma/raw
  let connected = false;
  let officialUpdatedAtJst: string | null = null;
  let maxInt: string | null = null;

  try {
    // Build absolute URL for /api/jma/raw
    const origin = new URL(request.url).origin;
    const jmaRawUrl = `${origin}/api/jma/raw`;

    const jmaResponse = await fetch(jmaRawUrl, {
      cache: 'no-store',
    });

    if (jmaResponse.ok) {
      const jmaData = await jmaResponse.json();
      // Only check the 'ok' field, do not parse or interpret any data
      connected = jmaData.ok === true;
      // Get officialUpdatedAtJst from JMA raw response (entry.updated only, not fetchedAtJst)
      officialUpdatedAtJst = jmaData.officialUpdatedAtJst || null;

      // If connected, try to extract maxInt for the selected prefecture
      if (connected && jmaData.source && jmaData.source.includes('.xml')) {
        const prefectureJapanese = PREFECTURE_NAME_MAP[prefecture];
        if (prefectureJapanese) {
          maxInt = await extractMaxIntForPrefecture(prefectureJapanese, jmaData.source);
        }
      }
    } else {
      // If /api/jma/raw fails, connected remains false
      connected = false;
    }
  } catch (error) {
    // If fetch fails, connected remains false
    console.error('Failed to fetch JMA raw data:', error);
    connected = false;
  }

  // Mock mode: override maxInt if enabled (development only)
  if (isMockMode) {
    const forcedMaxInt = searchParams.get('maxInt') ?? '4';
    const normalizedKey = normalizeMaxIntToKey(forcedMaxInt);
    // If normalization fails, fallback to "4"
    maxInt = normalizedKey || '4';
  }

  // Return status response
  return NextResponse.json({
    prefecture: prefecture,
    source: 'JMA',
    connected: connected,
    message: 'Status will appear when official data is available.',
    serverCheckedAtJst: serverCheckedAtJst,
    officialUpdatedAtJst: officialUpdatedAtJst,
    statusLevel: 'PENDING', // Phase 1: always PENDING
    maxInt: maxInt || null, // Max intensity for selected prefecture, or null if not available
  });
}
