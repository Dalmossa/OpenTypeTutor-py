import { authParams } from './authParams.js';

export enum PasswordValidationError {
  TOO_SHORT = 'PASSWORD_TOO_SHORT',
}

export interface PasswordValidationResult {
  valid: boolean;
  error?: PasswordValidationError;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || password.length < authParams.MIN_PASSWORD_LENGTH) {
    return { valid: false, error: PasswordValidationError.TOO_SHORT };
  }
  return { valid: true };
}
