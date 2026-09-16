import type { IPasswordValidator } from '../../application/ports/IPasswordValidator.js';
import { validatePassword, PasswordValidationError } from './passwordValidator.js';

export class AuthPasswordValidator implements IPasswordValidator {
  validate(password: string): { valid: boolean; error?: string } {
    const result = validatePassword(password);
    if (!result.valid && result.error === PasswordValidationError.TOO_SHORT) {
      return { valid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
    }
    return result;
  }
}