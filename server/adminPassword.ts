import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function createAdminPassword(password: string) {
  const salt = randomBytes(24).toString('hex');
  const derived = await scryptAsync(password, salt, KEY_LENGTH) as Buffer;
  return { hash: derived.toString('hex'), salt };
}

export async function verifyAdminPassword(password: string, storedHash: string, salt: string) {
  const expected = Buffer.from(storedHash, 'hex');
  if (expected.length !== KEY_LENGTH) return false;
  const supplied = await scryptAsync(password, salt, KEY_LENGTH) as Buffer;
  return timingSafeEqual(expected, supplied);
}
