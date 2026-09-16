import type { IPasswordHasher } from '../../application/ports/IPasswordHasher.js';
import { hashPassword, comparePassword } from './bcrypt.js';

export class BcryptPasswordHasher implements IPasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return comparePassword(password, hash);
  }
}