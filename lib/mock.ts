/**
 * Mock utilities for development environment only
 * These functions are only used when NODE_ENV !== "production"
 */

/**
 * Valid maxInt values for random selection
 */
export const MOCK_MAXINT_CANDIDATES = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5-',
  '5+',
  '6-',
  '6+',
  '7',
] as const;

/**
 * Pick a random maxInt value from candidates
 * Only use in development environment
 */
export function pickRandomMaxInt(): string {
  const index = Math.floor(Math.random() * MOCK_MAXINT_CANDIDATES.length);
  return MOCK_MAXINT_CANDIDATES[index];
}
