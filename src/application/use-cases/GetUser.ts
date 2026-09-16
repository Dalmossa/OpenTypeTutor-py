import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { ProfileNotOwnedError, UserNotFoundError } from '../../domain/errors/DomainError.js';
import type { GetUserResponseDTO } from '../dtos/UserDTOs.js';

export class GetUser {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly profileRepository: IUserProfileRepository
  ) {}

  async execute(authUserId: string, userId: string): Promise<GetUserResponseDTO> {
    if (!SessionId.create(authUserId).equals(SessionId.create(userId))) {
      throw new ProfileNotOwnedError('Perfil não pertence ao usuário autenticado');
    }

    const targetId = SessionId.create(userId);
    const user = await this.userRepository.findById(targetId);
    if (!user) {
      throw new UserNotFoundError('Usuário não encontrado');
    }

    const profile = await this.profileRepository.findByUserId(targetId);

    return {
      id: user.id.value,
      name: user.name,
      email: user.email.value,
      createdAt: user.createdAt.toISOString(),
      activeLayout: profile?.activeLayout.value ?? 'ABNT2',
      currentLevel: profile?.currentLevel ?? 1,
    };
  }
}