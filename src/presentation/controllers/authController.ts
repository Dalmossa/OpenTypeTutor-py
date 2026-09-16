import type { Request, Response } from 'express';
import type {
  LoginPort,
  RefreshTokenPort,
  RegisterUserPort,
} from '../ports/useCasePorts.js';
import { loginSchema, refreshSchema, registerSchema } from '../validators/authValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserPort,
    private readonly loginUseCase: LoginPort,
    private readonly refreshToken: RefreshTokenPort
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const body = parseSchema(registerSchema, req.body);
    const result = await this.registerUser.execute(body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = parseSchema(loginSchema, req.body);
    const result = await this.loginUseCase.execute(body);
    res.json(result);
  }

  refresh(req: Request, res: Response): void {
    const body = parseSchema(refreshSchema, req.body);
    const result = this.refreshToken.execute(body);
    res.json(result);
  }
}