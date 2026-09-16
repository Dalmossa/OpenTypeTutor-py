import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { Email } from '../../domain/value-objects/Email.js';
import { InvalidCredentialsError } from '../../domain/errors/DomainError.js';
import type { IPasswordHasher } from '../ports/IPasswordHasher.js';
import type { ITokenService } from '../ports/ITokenService.js';
import type { LoginDTO, LoginResponseDTO } from '../dtos/LoginDTO.js';

export class Login {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResponseDTO> {
    const email = Email.create(dto.email);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError('Credenciais inválidas');
    }

    const passwordMatch = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new InvalidCredentialsError('Credenciais inválidas');
    }

    const accessToken = this.tokenService.signAccessToken(user.id.value);
    const refreshToken = this.tokenService.signRefreshToken(user.id.value);

    return { accessToken, refreshToken };
  }
}