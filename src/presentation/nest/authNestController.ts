import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import type {
  LoginPort,
  RefreshTokenPort,
  RegisterUserPort,
} from '../ports/useCasePorts.js';
import { loginSchema, refreshSchema, registerSchema } from '../validators/authValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import { TOKENS } from './nestTokens.js';

@Controller('/auth')
export class AuthNestController {
  constructor(
    @Inject(TOKENS.REGISTER_USER) private readonly registerUser: RegisterUserPort,
    @Inject(TOKENS.LOGIN) private readonly loginUseCase: LoginPort,
    @Inject(TOKENS.REFRESH_TOKEN) private readonly refreshToken: RefreshTokenPort
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: unknown): Promise<{ userId: string }> {
    const parsed = parseSchema(registerSchema, body);
    return this.registerUser.execute(parsed);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown): Promise<{ accessToken: string; refreshToken: string }> {
    const parsed = parseSchema(loginSchema, body);
    return this.loginUseCase.execute(parsed);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: unknown): { accessToken: string; refreshToken: string } {
    const parsed = parseSchema(refreshSchema, body);
    return this.refreshToken.execute(parsed);
  }
}