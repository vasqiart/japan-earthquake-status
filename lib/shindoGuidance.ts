/**
 * Shindo (Seismic Intensity) Guidance
 * Based on JMA seismic intensity scale, providing informational guidance only.
 * No safety instructions, commands, or guarantees are given.
 */

export type ShindoKey = '0' | '1' | '2' | '3' | '4' | '5-' | '5+' | '6-' | '6+' | '7';

export type ShindoGuidance = {
  label: string;
  tone: 'green' | 'yellow' | 'red' | 'gray';
  text: string; // main guidance (1-2 sentences)
  extra?: string; // optional extra line
};

export const SHINDO_GUIDANCE: Record<ShindoKey, ShindoGuidance> = {
  '0': {
    label: 'Shindo 0',
    tone: 'green',
    text: 'Shaking is not felt, but it may be recorded by instruments.',
  },
  '1': {
    label: 'Shindo 1',
    tone: 'green',
    text: 'Slight shaking may be felt by some people indoors.',
  },
  '2': {
    label: 'Shindo 2',
    tone: 'green',
    text: 'Shaking may be felt by many people indoors, and hanging objects may move slightly.',
  },
  '3': {
    label: 'Shindo 3',
    tone: 'yellow',
    text: 'Shaking may be felt by most people indoors, and items on shelves may make noise.',
  },
  '4': {
    label: 'Shindo 4',
    tone: 'yellow',
    text: 'Hanging objects may swing noticeably, and unstable items may fall. Some transportation services may temporarily slow or stop for safety checks.',
  },
  '5-': {
    label: 'Shindo 5-',
    tone: 'red',
    text: 'Some furniture may move, and books or tableware may fall from shelves. Minor damage such as broken window glass may occur in some cases.',
  },
  '5+': {
    label: 'Shindo 5+',
    tone: 'red',
    text: 'Many objects may fall, and it may be difficult to walk without holding onto something. Lifeline disruptions such as power or water outages may occur in some areas.',
  },
  '6-': {
    label: 'Shindo 6-',
    tone: 'red',
    text: 'It may be difficult to remain standing, and unsecured furniture may move widely or fall. Transportation and building services may be disrupted.',
  },
  '6+': {
    label: 'Shindo 6+',
    tone: 'red',
    text: 'It may be very difficult to move, and severe damage may occur depending on local conditions. Wide-area disruptions to utilities may occur.',
  },
  '7': {
    label: 'Shindo 7',
    tone: 'red',
    text: 'Severe shaking may cause extensive damage, and many unsecured objects may be thrown or fall. Major disruptions may occur over a wide area.',
  },
};

/**
 * Normalize maxInt value to ShindoKey
 */
export function normalizeMaxIntToKey(maxInt: unknown): ShindoKey | null {
  if (maxInt == null) return null;
  const s = String(maxInt).trim();
  
  // Direct match for string keys
  const direct = ['0', '1', '2', '3', '4', '5-', '5+', '6-', '6+', '7'] as const;
  if ((direct as readonly string[]).includes(s)) return s as ShindoKey;

  // If numeric value (e.g., 5.0, 5.5), normalize to key
  const n = Number(s);
  if (!Number.isNaN(n)) {
    if (n <= 0) return '0';
    if (n < 1.5) return '1';
    if (n < 2.5) return '2';
    if (n < 3.5) return '3';
    if (n < 4.5) return '4';
    // 5/6の強弱は判定不能なので "5-" / "6-" に寄せる（MVP）
    if (n < 5.5) return '5-';
    if (n < 6.5) return '6-';
    return '7';
  }

  return null;
}

/**
 * Get dot tone color based on maxInt key
 * Returns 'gray' for Pending state (null), otherwise uses guidance tone
 */
export function getDotTone(maxIntKey: ShindoKey | null): 'gray' | 'green' | 'yellow' | 'red' {
  if (maxIntKey == null) return 'gray';
  const guidance = SHINDO_GUIDANCE[maxIntKey];
  return guidance ? guidance.tone : 'gray';
}
