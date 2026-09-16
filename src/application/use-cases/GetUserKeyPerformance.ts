import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import type { IKeyPerformanceRepository } from '../../domain/repositories/IKeyPerformanceRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import type { KeyPerformanceDTO } from '../../domain/entities/KeyPerformance.js';
import type { GetUserKeyPerformanceResponseDTO } from '../dtos/KeyPerformanceDTOs.js';

export class GetUserKeyPerformance {
  constructor(
    private readonly profileRepository: IUserProfileRepository,
    private readonly keyPerformanceRepository: IKeyPerformanceRepository
  ) {}

  async execute(userId: string): Promise<GetUserKeyPerformanceResponseDTO> {
    const targetUserId = SessionId.create(userId);
    const profile = await this.profileRepository.findByUserId(targetUserId);
    const layout = profile?.activeLayout ?? Layout.create('ABNT2');

    const performances = await this.keyPerformanceRepository.findByUserIdAndLayout(
      targetUserId,
      layout
    );

    return performances
      .map((performance) => performance.toDTO())
      .sort((a: KeyPerformanceDTO, b: KeyPerformanceDTO) => {
        const aScore = a.weakKeyScore + (1 - a.keyAccuracy);
        const bScore = b.weakKeyScore + (1 - b.keyAccuracy);
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        return a.logicalKey.localeCompare(b.logicalKey);
      });
  }
}