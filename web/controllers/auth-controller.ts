import type {
  LoginDTO,
  LoginResponseDTO,
  RefreshTokenDTO,
  RefreshTokenResponseDTO,
  RegisterUserDTO,
  RegisterUserResponseDTO,
} from '@/models/auth';
import type { ApiClient } from '@/services/api-client';

export class AuthController {
  constructor(private readonly api: ApiClient) {}

  async login(data: LoginDTO): Promise<LoginResponseDTO> {
    return this.api.login(data);
  }

  async register(data: RegisterUserDTO): Promise<RegisterUserResponseDTO> {
    return this.api.register(data);
  }

  async refresh(data: RefreshTokenDTO): Promise<RefreshTokenResponseDTO> {
    return this.api.refresh(data);
  }
}