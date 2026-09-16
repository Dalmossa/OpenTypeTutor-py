export interface IPasswordValidator {
  validate(password: string): { valid: boolean; error?: string };
}