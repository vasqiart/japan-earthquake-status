import crypto from 'crypto';

export function generateAccessToken(): string {
  // URLに載っても問題ない強度を想定して長め
  return crypto.randomBytes(24).toString('hex'); // 48 chars
}
