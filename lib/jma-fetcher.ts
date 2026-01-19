import { XMLParser } from 'fast-xml-parser';
import { getSupabaseClient } from './supabase';

const JMA_FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';

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
 * Fetches JMA earthquake data and caches it in Supabase
 * @returns Object with success status and metadata
 */
export async function fetchAndCacheJMA(): Promise<{
  ok: boolean;
  fetchedAtJst: string;
  latestFeedId?: string;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  const fetchedAt = new Date();

  try {
    // Step 1: Fetch Atom feed
    const feedResponse = await fetch(JMA_FEED_URL, {
      headers: {
        'User-Agent': 'Japan-Earthquake-Status/1.0',
      },
    });

    if (!feedResponse.ok) {
      throw new Error(`Failed to fetch JMA feed: ${feedResponse.status}`);
    }

    const feedXml = await feedResponse.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const feedData: AtomFeed = parser.parse(feedXml);

    // Step 2: Extract latest entry
    const entries = Array.isArray(feedData.feed?.entry)
      ? feedData.feed.entry
      : feedData.feed?.entry
      ? [feedData.feed.entry]
      : [];

    if (entries.length === 0) {
      throw new Error('No entries found in JMA feed');
    }

    // Get the first (latest) entry
    const latestEntry = entries[0];
    const entryId = latestEntry.id;
    const entryUpdated = latestEntry.updated;
    const links = Array.isArray(latestEntry.link)
      ? latestEntry.link
      : latestEntry.link
      ? [latestEntry.link]
      : [];

    // Find the XML link (usually rel="alternate" or no rel)
    const xmlLink = links.find(
      (link) => !link['@_rel'] || link['@_rel'] === 'alternate'
    );

    if (!xmlLink?.['@_href']) {
      throw new Error('No XML link found in entry');
    }

    const xmlUrl = xmlLink['@_href'];

    // Step 3: Fetch detailed XML
    const xmlResponse = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'Japan-Earthquake-Status/1.0',
      },
    });

    if (!xmlResponse.ok) {
      throw new Error(`Failed to fetch JMA XML: ${xmlResponse.status}`);
    }

    const detailedXml = await xmlResponse.text();

    // Step 4: Parse entry updated time
    let feedUpdated: Date | null = null;
    if (entryUpdated) {
      feedUpdated = new Date(entryUpdated);
    }

    // Step 5: Upsert to Supabase
    const { error: upsertError } = await supabase
      .from('jma_cache')
      .upsert(
        {
          id: 'eqvol',
          latest_feed_id: entryId,
          latest_feed_updated: feedUpdated?.toISOString() || null,
          latest_xml_url: xmlUrl,
          latest_xml: detailedXml,
          fetched_at: fetchedAt.toISOString(),
          ok: true,
          error: null,
        },
        {
          onConflict: 'id',
        }
      );

    if (upsertError) {
      throw new Error(`Failed to save to Supabase: ${upsertError.message}`);
    }

    // Format fetchedAt as JST ISO string
    const jstOffset = 9 * 60; // JST is UTC+9
    const utc = fetchedAt.getTime() + (fetchedAt.getTimezoneOffset() * 60000);
    const jstTime = new Date(utc + (jstOffset * 60000));
    const year = jstTime.getFullYear();
    const month = String(jstTime.getMonth() + 1).padStart(2, '0');
    const day = String(jstTime.getDate()).padStart(2, '0');
    const hours = String(jstTime.getHours()).padStart(2, '0');
    const minutes = String(jstTime.getMinutes()).padStart(2, '0');
    const seconds = String(jstTime.getSeconds()).padStart(2, '0');
    const fetchedAtJst = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;

    return {
      ok: true,
      fetchedAtJst,
      latestFeedId: entryId,
    };
  } catch (error) {
    // On error, update cache with error status but keep previous XML
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      await supabase
        .from('jma_cache')
        .update({
          fetched_at: fetchedAt.toISOString(),
          ok: false,
          error: errorMessage,
        })
        .eq('id', 'eqvol');
    } catch (updateError) {
      // If update fails, log but don't throw
      console.error('Failed to update error status:', updateError);
    }

    // Format fetchedAt as JST ISO string even on error
    const jstOffset = 9 * 60;
    const utc = fetchedAt.getTime() + (fetchedAt.getTimezoneOffset() * 60000);
    const jstTime = new Date(utc + (jstOffset * 60000));
    const year = jstTime.getFullYear();
    const month = String(jstTime.getMonth() + 1).padStart(2, '0');
    const day = String(jstTime.getDate()).padStart(2, '0');
    const hours = String(jstTime.getHours()).padStart(2, '0');
    const minutes = String(jstTime.getMinutes()).padStart(2, '0');
    const seconds = String(jstTime.getSeconds()).padStart(2, '0');
    const fetchedAtJst = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;

    return {
      ok: false,
      fetchedAtJst,
      error: errorMessage,
    };
  }
}
