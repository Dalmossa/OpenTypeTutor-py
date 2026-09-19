import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import type { IKeyPerformanceRepository } from '../../domain/repositories/IKeyPerformanceRepository.js';
import type { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { MasteryProximityIndex } from '../../domain/services/MasteryProximityIndex.js';
import type {
  DashboardProximityKey,
  GetDashboardProximityResponseDTO,
} from '../dtos/DashboardDTOs.js';

function byDistance(a: DashboardProximityKey, b: DashboardProximityKey): number {
  if (a.mpi !== b.mpi) return a.mpi - b.mpi;
  return a.logicalKey.localeCompare(b.logicalKey);
}

// RN36 - lista de teclas do layout ativo ordenada pela distância ao mastery (MPI asc);
// banda pt-BR junto do índice (cor nunca sozinha). Isolado por userId+layout (RN17, RN11).
export class GetDashboardProximity {
  constructor(
    private readonly profileRepository: IUserProfileRepository,
    private readonly keyPerformanceRepository: IKeyPerformanceRepository
  ) {}

  async execute(userId: string): Promise<GetDashboardProximityResponseDTO> {
    const targetUserId = SessionId.create(userId);
    const profile = await this.profileRepository.findByUserId(targetUserId);
    const layout = profile?.activeLayout ?? Layout.create('ABNT2');

    const performances = await this.keyPerformanceRepository.findByUserIdAndLayout(
      targetUserId,
      layout
    );

    return {
      keys: performances.map((performance) => this.toKey(performance)).sort(byDistance),
    };
  }

  private toKey(performance: KeyPerformance): DashboardProximityKey {
    const mpi = Math.round(MasteryProximityIndex.compute(performance) * 100) / 100;
    return {
      logicalKey: performance.logicalKey,
      mpi,
      band: MasteryProximityIndex.band(mpi),
    };
  }
}