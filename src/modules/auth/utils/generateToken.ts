import crypto from 'crypto';

export function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}
