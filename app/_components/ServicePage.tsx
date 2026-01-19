'use client';

import { useState, useEffect, useCallback } from 'react';
import { PREFECTURES } from '@/lib/prefectures';
import { SHINDO_GUIDANCE, normalizeMaxIntToKey, getDotTone, type ShindoKey } from '@/lib/shindoGuidance';
import { pickRandomMaxInt } from '@/lib/mock';

type StatusLevel = 'PENDING' | 'GREEN' | 'YELLOW' | 'RED';

interface StatusResponse {
  prefecture: string;
  source: string;
  connected: boolean;
  message: string;
  serverCheckedAtJst: string;
  officialUpdatedAtJst: string | null;
  statusLevel: 'PENDING' | 'GREEN' | 'YELLOW' | 'RED';
  maxInt: string | null;
}

function formatJSTTime(isoString: string): string {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

function formatJSTDateTime(isoString: string): string {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  return `${year}-${month}-${day} ${hour}:${minute} JST`;
}

function extractPrefecture(areaName: string): string {
  if (!areaName) return '';
  const withoutPrefecture = areaName.replace(/ Prefecture\b/g, '');
  if (areaName.includes(' Prefecture')) {
    const match = areaName.match(/^(.+?)\s+Prefecture$/);
    if (match) return match[1];
  }
  const parts = withoutPrefecture.split(',').map(p => p.trim());
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    const prefectureNames = [
      'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima',
      'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa',
      'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu',
      'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara',
      'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi',
      'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki',
      'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'
    ];
    if (prefectureNames.some(p => lastPart.includes(p))) {
      return lastPart;
    }
    if (/^[A-Z][a-z]+$/.test(lastPart)) {
      return lastPart;
    }
  }
  const prefectureMatch = withoutPrefecture.match(/\b(Hokkaido|Tokyo|Osaka|Kyoto|Aomori|Iwate|Miyagi|Akita|Yamagata|Fukushima|Ibaraki|Tochigi|Gunma|Saitama|Chiba|Kanagawa|Niigata|Toyama|Ishikawa|Fukui|Yamanashi|Nagano|Gifu|Shizuoka|Aichi|Mie|Shiga|Hyogo|Nara|Wakayama|Tottori|Shimane|Okayama|Hiroshima|Yamaguchi|Tokushima|Kagawa|Ehime|Kochi|Fukuoka|Saga|Nagasaki|Kumamoto|Oita|Miyazaki|Kagoshima|Okinawa)\b/);
  if (prefectureMatch) {
    return prefectureMatch[1];
  }
  return withoutPrefecture;
}

export default function ServicePage() {
  const [prefecture, setPrefecture] = useState<string>('Tokyo');
  const [lastCheckedJstText, setLastCheckedJstText] = useState<string>('--');
  const [officialUpdatedJstText, setOfficialUpdatedJstText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [justNow, setJustNow] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [recentItems, setRecentItems] = useState<Array<{
    eventId: string;
    updatedAtJst: string | null;
    hypocenterAreaName: string | null;
    magnitude: string | null;
    link: string | null;
  }>>([]);
  const [recentError, setRecentError] = useState<boolean>(false);
  const [maxInt, setMaxInt] = useState<string | null>(null);
  const [mockMaxInt, setMockMaxInt] = useState<string | null>(null);

  const fetchStatus = useCallback(async (isManualRefresh = false, overrideMaxInt?: string) => {
    setIsChecking(true);
    setLoading(true);
    setError(null);
    setConnected(null);

    try {
      const params = new URLSearchParams();
      params.set('prefecture', prefecture);

      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        const sp = new URLSearchParams(window.location.search);
        const mock = sp.get('mock');
        const urlMaxInt = sp.get('maxInt');

        if (mock === '1') {
          params.set('mock', '1');
          
          let effectiveMaxInt: string | null = null;
          
          if (urlMaxInt) {
            effectiveMaxInt = urlMaxInt;
          } else if (overrideMaxInt) {
            effectiveMaxInt = overrideMaxInt;
            setMockMaxInt(overrideMaxInt);
          } else if (mockMaxInt) {
            effectiveMaxInt = mockMaxInt;
          } else {
            effectiveMaxInt = pickRandomMaxInt();
            setMockMaxInt(effectiveMaxInt);
          }
          
          if (effectiveMaxInt) {
            params.set('maxInt', effectiveMaxInt);
          }
        }
      }

      const response = await fetch(`/api/status?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data: StatusResponse = await response.json();
      
      const formattedTime = formatJSTTime(data.serverCheckedAtJst);
      setLastCheckedJstText(formattedTime);
      setConnected(data.connected);
      
      if (data.officialUpdatedAtJst) {
        const formattedOfficialTime = formatJSTDateTime(data.officialUpdatedAtJst);
        setOfficialUpdatedJstText(formattedOfficialTime);
      } else {
        setOfficialUpdatedJstText(null);
      }
      
      setMaxInt(data.maxInt || null);
      setError(null);

      if (isManualRefresh) {
        setJustNow(true);
        setTimeout(() => {
          setJustNow(false);
        }, 2000);
      }
    } catch (err) {
      setError('Latest information is temporarily unavailable. Showing the most recent confirmed update.');
      setConnected(false);
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  }, [prefecture, mockMaxInt]);

  const fetchRecentActivity = useCallback(async () => {
    try {
      let url = '/api/jma/recent';
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        const sp = new URLSearchParams(window.location.search);
        const mock = sp.get('mock');
        if (mock === '1') {
          url = '/api/jma/recent?mock=1';
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        setRecentError(true);
        setRecentItems([]);
        return;
      }

      const data = await response.json();
      if (data.ok && data.items) {
        setRecentItems(data.items);
        setRecentError(false);
      } else {
        setRecentError(true);
        setRecentItems([]);
      }
    } catch (err) {
      setRecentError(true);
      setRecentItems([]);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchRecentActivity();

    const interval = setInterval(() => {
      fetchStatus();
      fetchRecentActivity();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchRecentActivity]);

  const handlePrefectureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPrefecture = e.target.value;
    setPrefecture(newPrefecture);
    
    let overrideMaxInt: string | undefined = undefined;
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      const sp = new URLSearchParams(window.location.search);
      const mock = sp.get('mock');
      const urlMaxInt = sp.get('maxInt');
      
      if (mock === '1' && !urlMaxInt) {
        overrideMaxInt = pickRandomMaxInt();
        setMockMaxInt(overrideMaxInt);
      }
    }
    
    fetchStatus(false, overrideMaxInt);
  };

  const handleRefresh = async () => {
    let overrideMaxInt: string | undefined = undefined;
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      const sp = new URLSearchParams(window.location.search);
      const mock = sp.get('mock');
      const urlMaxInt = sp.get('maxInt');
      
      if (mock === '1' && !urlMaxInt) {
        overrideMaxInt = pickRandomMaxInt();
        setMockMaxInt(overrideMaxInt);
      }
    }
    
    await fetchStatus(true, overrideMaxInt);
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-4xl flex flex-col gap-4">
          <header className="text-center mb-6">
            <div className="flex items-center justify-end mb-2">
              <a
                href="/lp"
                className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2 transition-colors"
              >
                Open Landing Page →
              </a>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Japan Earthquake Status
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              This page is checked automatically every minute to reflect the latest available earthquake information.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="min-h-0">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-sm font-medium text-black/80 mb-1">Location</h2>
                <p className="text-xs text-black/45 leading-snug mt-0.5">
                  Official earthquake information related to your selected location.
                </p>

                <div className="mt-3">
                  <select
                    className={`w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-300 ${
                      prefecture ? 'text-neutral-900' : 'text-neutral-500'
                    }`}
                    value={prefecture}
                    onChange={handlePrefectureChange}
                  >
                    {PREFECTURES.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </select>
                </div>

                <hr className="my-8 border-neutral-200" />

                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-medium text-black/80">Status</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={isChecking}
                      className="text-xs cursor-pointer rounded-md px-2 py-1 border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:hover:bg-gray-50 disabled:hover:border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none transition-colors"
                      type="button"
                    >
                      Refresh
                    </button>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span aria-hidden>🕒</span>
                      <span>
                        Last checked: {lastCheckedJstText} JST
                        {justNow && (
                          <span className="ml-1 text-neutral-400">(Checked just now.)</span>
                        )}
                        {isChecking && (
                          <span className="ml-1 text-black/45"> · Checking…</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {officialUpdatedJstText !== null && (
                  <div className="mt-2 text-right">
                    <span className="text-xs text-black/45">
                      Last updated (official): {officialUpdatedJstText}
                    </span>
                  </div>
                )}

                {(() => {
                  const hasMaxInt = typeof maxInt === 'string' && maxInt.length > 0;
                  const shindoKey = hasMaxInt ? normalizeMaxIntToKey(maxInt) : null;
                  const dotTone = getDotTone(shindoKey);
                  const guidance = shindoKey ? SHINDO_GUIDANCE[shindoKey] : null;
                  
                  const toneColors = {
                    green: 'bg-emerald-500/60',
                    yellow: 'bg-amber-500/60',
                    red: 'bg-red-500/60',
                    gray: 'bg-black/20',
                  };
                  
                  return (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full ${toneColors[dotTone]} shrink-0 mt-1.5`} />
                        <div className="flex-1 min-w-0 space-y-2">
                          {hasMaxInt && guidance ? (
                            <>
                              <p className="text-sm text-neutral-700">
                                Max intensity (selected location): {maxInt}
                              </p>
                              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                                {guidance.text}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-neutral-700">No official update yet</p>
                              {loading ? (
                                <p className="text-sm text-neutral-700 leading-relaxed">
                                  Information is being updated. Please check again shortly.
                                </p>
                              ) : error ? (
                                <p className="text-sm text-neutral-700 leading-relaxed">
                                  Latest information is temporarily unavailable. Showing the most recent confirmed update.
                                </p>
                              ) : (
                                <p className="text-sm text-neutral-700 leading-relaxed">
                                  Official earthquake information for the selected location has not been issued yet.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-black/50 text-center mt-4">
                        Official source: Japan Meteorological Agency
                      </p>
                    </div>
                  );
                })()}
              </section>
            </div>

            <div className="min-h-0 h-full">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-black/80 mb-1">Recent Activity</h2>
                    <p className="text-xs text-black/45 leading-snug mt-0.5">
                      Recent updates from official earthquake reports across Japan.
                    </p>
                  </div>
                  <a
                    href="https://www.jma.go.jp/bosai/map.html#7/42.229/145.525/&elem=int&contents=earthquake_map"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-neutral-500 opacity-60 hover:opacity-100 underline shrink-0"
                  >
                    Source
                  </a>
                </div>

                {recentError ? (
                  <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
                    <div className="text-sm text-neutral-600">
                      No recent entries to display.
                    </div>
                    <div className="mt-2 text-xs text-black/45">
                      Source unavailable.
                    </div>
                  </div>
                ) : recentItems.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
                    <div className="text-sm text-neutral-600">
                      No recent entries to display.
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      Recent activity will appear when official data is available.
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-2">
                    {recentItems.map((item) => {
                      const timeText = item.updatedAtJst
                        ? formatJSTDateTime(item.updatedAtJst).replace(' JST', '')
                        : '';
                      const fullAreaName = item.hypocenterAreaName || '';
                      const prefectureName = extractPrefecture(fullAreaName);
                      const magnitude = item.magnitude || '';
                      
                      return (
                        <div key={item.eventId} className="px-2 py-1">
                          <div className="flex items-center gap-2">
                            {timeText && (
                              <span className="text-xs text-neutral-500 shrink-0 w-[140px] whitespace-nowrap">
                                {timeText}
                              </span>
                            )}
                            <span className="text-sm text-neutral-900 truncate flex-1 min-w-0 whitespace-nowrap">
                              {prefectureName}
                            </span>
                            {magnitude && (
                              <span className="text-xs text-neutral-700 shrink-0 w-[44px] text-right whitespace-nowrap">
                                {magnitude}
                              </span>
                            )}
                            {fullAreaName && fullAreaName !== prefectureName && (
                              <div className="relative shrink-0 group/info">
                                <button
                                  type="button"
                                  aria-label="Details"
                                  className="text-neutral-400 hover:text-neutral-600 focus:text-neutral-600 focus:outline-none transition-colors"
                                >
                                  <span className="text-sm">ⓘ</span>
                                </button>
                                <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-neutral-800 text-white text-sm leading-tight rounded shadow-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap max-w-[420px] overflow-hidden text-ellipsis">
                                  {fullAreaName}
                                  <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className="min-h-0">
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-7">
              <h2 className="text-sm font-medium text-black/80 mb-1">Official Information</h2>

              <div className="space-y-3">
                <a
                  className="inline-flex items-center gap-2 text-sm font-medium text-amber-900 underline underline-offset-4"
                  href="https://www.jma.go.jp/jma/indexe.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Japan Meteorological Agency (JMA) <span aria-hidden>↗</span>
                </a>
                <div>
                  <a
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-900 underline underline-offset-4"
                    href="https://www3.nhk.or.jp/nhkworld/en/news/weather-disaster/earthquake/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    NHK World — Earthquake <span aria-hidden>↗</span>
                  </a>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-amber-900/90">
                For official information and guidance, please refer to the sources above.
              </p>
            </section>
          </div>

          <div className="min-h-0">
            <section className="text-center max-w-2xl mx-auto">
              <div className="text-sm text-neutral-600">
                <p className="leading-relaxed">
                  This information is provided for reference only.
                  <br />
                  No safety instructions are given.
                </p>
                <div className="my-3 border-t border-neutral-300/40" />
                <p className="text-neutral-600/70 leading-snug">
                  Based on official earthquake reports released by the Japan Meteorological Agency,
                  <br />
                  there may be a delay of several minutes immediately after an earthquake
                  <br />
                  before official information becomes available.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
