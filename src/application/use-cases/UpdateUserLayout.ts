import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { UserProfile } from '../../domain/entities/UserProfile.js';
import { ProfileNotOwnedError } from '../../domain/errors/DomainError.js';
import type { UpdateUserLayoutDTO, UpdateUserLayoutResponseDTO } from '../dtos/UserDTOs.js';

export class UpdateUserLayout {
  constructor(private readonly profileRepository: IUserProfileRepository) {}

  async execute(authUserId: string, dto: UpdateUserLayoutDTO): Promise<UpdateUserLayoutResponseDTO> {
    if (!SessionId.create(authUserId).equals(SessionId.create(dto.userId))) {
      throw new ProfileNotOwnedError('Perfil não pertence ao usuário autenticado');
    }

    const userId = SessionId.create(dto.userId);
    const newLayout = Layout.create(dto.layout);

    const existing = await this.profileRepository.findByUserId(userId);
    const updated = existing
      ? existing.changeLayout(newLayout)
      : UserProfile.create({ userId, activeLayout: newLayout });

    await this.profileRepository.save(updated);

    return updated.toDTO();
  }
}