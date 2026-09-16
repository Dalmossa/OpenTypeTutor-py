import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { User } from '../../domain/entities/User.js';
import { Email } from '../../domain/value-objects/Email.js';
import { UserAlreadyExistsError } from '../../domain/errors/DomainError.js';
import type { IPasswordHasher } from '../ports/IPasswordHasher.js';
import type { IPasswordValidator } from '../ports/IPasswordValidator.js';
import type { RegisterUserDTO, RegisterUserResponseDTO } from '../dtos/RegisterUserDTO.js';

export class RegisterUser {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly passwordValidator: IPasswordValidator
  ) {}

  async execute(dto: RegisterUserDTO): Promise<RegisterUserResponseDTO> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Nome é obrigatório');
    }

    const passwordValidation = this.passwordValidator.validate(dto.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error ?? 'Senha inválida');
    }

    const email = Email.create(dto.email);

    const existingUser = await this.userRepository.existsByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsError('Usuário com este email já existe');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const user = User.create({
      name: dto.name,
      email,
      passwordHash,
    });

    await this.userRepository.save(user);

    return { userId: user.id.value };
  }
}