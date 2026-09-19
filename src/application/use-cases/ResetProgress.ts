import type { ITypingSessionRepository } from "../../domain/repositories/ITypingSessionRepository.js";
import type { IKeyPerformanceRepository } from "../../domain/repositories/IKeyPerformanceRepository.js";
import type { IProgressCardRepository } from "../../domain/repositories/IProgressCardRepository.js";
import type { IProgressRepository } from "../../domain/repositories/IProgressRepository.js";
import type { IUserProfileRepository } from "../../domain/repositories/IUserProfileRepository.js";
import type { IDailyMetricsAggregateRepository } from "../../domain/repositories/IDailyMetricsAggregateRepository.js";
import type { IKeyMasteryTransitionRepository } from "../../domain/repositories/IKeyMasteryTransitionRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import type { ResetProgressResponseDTO } from "../dtos/ProgressDTOs.js";

// RN31 - limpa o progresso do usuário para recomeçar o curso do zero,
// mantendo a conta (credenciais) e o activeLayout; nível volta a 1.
export class ResetProgress {
  constructor(
    private readonly typingSessionRepository: ITypingSessionRepository,
    private readonly keyPerformanceRepository: IKeyPerformanceRepository,
    private readonly progressCardRepository: IProgressCardRepository,
    private readonly progressRepository: IProgressRepository,
    private readonly userProfileRepository: IUserProfileRepository,
    // RN34/RN35 - dashboard (Fase 9, ADR-020): reset também limpa agregados e timeline
    private readonly dailyAggregateRepository: IDailyMetricsAggregateRepository,
    private readonly masteryTransitionRepository: IKeyMasteryTransitionRepository,
  ) {}

  async execute(userId: string): Promise<ResetProgressResponseDTO> {
    const targetUserId = SessionId.create(userId);

    // RN17 - isolamento por userId: apaga apenas os dados do dono do token
    await this.typingSessionRepository.deleteByUserId(targetUserId);
    await this.keyPerformanceRepository.deleteByUserId(targetUserId);
    await this.progressCardRepository.deleteByUserId(targetUserId);
    await this.progressRepository.deleteByUserId(targetUserId);
    await this.dailyAggregateRepository.deleteByUserId(targetUserId);
    await this.masteryTransitionRepository.deleteByUserId(targetUserId);

    // Mantém a conta e o layout; zera o nível curricular para 1
    const profile = await this.userProfileRepository.findByUserId(targetUserId);
    if (profile !== null && profile.currentLevel !== 1) {
      await this.userProfileRepository.save(profile.setLevel(1));
    }

    return { reset: true };
  }
}
