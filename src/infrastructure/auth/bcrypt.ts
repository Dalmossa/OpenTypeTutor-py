import bcrypt from 'bcrypt';
import { authParams } from './authParams.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, authParams.BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
