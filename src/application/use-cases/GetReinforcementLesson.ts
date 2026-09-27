import type { IUserProfileRepository } from "../../domain/repositories/IUserProfileRepository.js";
import type { IKeyPerformanceRepository } from "../../domain/repositories/IKeyPerformanceRepository.js";
import type { INGramRepository } from "../../domain/repositories/INGramRepository.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";
import { AdaptiveLessonEngine } from "../../domain/services/AdaptiveLessonEngine.js";
import type { GetReinforcementLessonResponseDTO } from "../dtos/ReinforcementLessonDTO.js";

const FALLBACK_HOME_ROW_KEYS: Record<string, string[]> = {
  ABNT2: ["f", "j", "d", "k", "s", "a", "l", ";"],
  "US-INTERNATIONAL": ["f", "j", "d", "k", "s", "a", "l", ";"],
  US: ["f", "j", "d", "k", "s", "a", "l", ";"],
};

export class GetReinforcementLesson {
  constructor(
    private readonly profileRepository: IUserProfileRepository,
    private readonly keyPerformanceRepository: IKeyPerformanceRepository,
    private readonly nGramRepository: INGramRepository,
  ) {}

  async execute(userId: string): Promise<GetReinforcementLessonResponseDTO> {
    const targetUserId = SessionId.create(userId);
    const profile = await this.profileRepository.findByUserId(targetUserId);
    const layout = profile?.activeLayout ?? Layout.create("ABNT2");
    const level = profile?.currentLevel ?? 1;

    const keyPerformances =
      await this.keyPerformanceRepository.findByUserIdAndLayout(
        targetUserId,
        layout,
      );

    const engine = new AdaptiveLessonEngine(this.nGramRepository);

    let lesson;
    if (keyPerformances.length === 0) {
      // RN23 Fallback - usuário sem dados: usa teclas da linha guia (home row)
      const fallbackKeys =
        FALLBACK_HOME_ROW_KEYS[layout.value] ?? FALLBACK_HOME_ROW_KEYS.ABNT2;
      lesson = await engine.generateReinforcementLesson(
        [],
        layout,
        level,
        fallbackKeys,
      );
    } else {
      lesson = await engine.generateReinforcementLesson(
        keyPerformances,
        layout,
        level,
      );
    }

    return lesson.toDTO();
  }
}
