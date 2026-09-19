import type { IPracticePacingRepository } from '../../domain/repositories/IPracticePacingRepository.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { PracticePacingState } from '../../domain/entities/PracticePacingState.js';
import { adaptiveParams } from '../../domain/config/adaptiveParams.js';
import type { PracticeStatusDTO } from '../dtos/PracticePacingDTOs.js';

// RN33 - consulta de pacing para a UI: acumulado, limites e pausa restante.
export class GetPracticeStatus {
  constructor(private readonly pacingRepository: IPracticePacingRepository) {}

  async execute(userId: string): Promise<PracticeStatusDTO> {
    const pacing =
      (await this.pacingRepository.findByUserId(SessionId.create(userId))) ??
      PracticePacingState.create({ userId: SessionId.create(userId) });

    const now = new Date();

    return {
      accumulatedActiveMs: pacing.accumulatedActiveMs,
      practiceBlockMs: adaptiveParams.PRACTICE_BLOCK_DURATION_MS,
      minBreakMs: adaptiveParams.MIN_BREAK_DURATION_MS,
      breakRequired: pacing.isBreakRequired(now),
      breakRemainingMs: pacing.breakRemainingMs(now),
    };
  }
}