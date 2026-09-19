import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import type { IKeyPerformanceRepository } from '../../domain/repositories/IKeyPerformanceRepository.js';
import type { IKeyMasteryTransitionRepository } from '../../domain/repositories/IKeyMasteryTransitionRepository.js';
import type { MasteryState } from '../../domain/entities/KeyPerformance.js';
import type { KeyPerformance } from '../../domain/entities/KeyPerformance.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import { Timezone } from '../../domain/value-objects/Timezone.js';
import { adaptiveParams } from '../../domain/config/adaptiveParams.js';
import type {
  DashboardCountsByState,
  GetDashboardMasteryResponseDTO,
} from '../dtos/DashboardDTOs.js';
import { shiftLocalDate } from './dashboardWindows.js';

type Clock = () => Date;

const MASTERY_STATES: readonly MasteryState[] = [
  'UNKNOWN',
  'LEARNING',
  'CONSOLIDATING',
  'MASTERED',
  'WEAK',
];

// RN09/RN10/RN36/RN37 - timeline de mudanças de mastery e distribuição atual por estado
// (janela 90d). Isolado por userId (RN17) e layout ativo (RN11).
export class GetDashboardMastery {
  constructor(
    private readonly profileRepository: IUserProfileRepository,
    private readonly keyPerformanceRepository: IKeyPerformanceRepository,
    private readonly transitionRepository: IKeyMasteryTransitionRepository,
    private readonly now: Clock = () => new Date()
  ) {}

  async execute(userId: string): Promise<GetDashboardMasteryResponseDTO> {
    const targetUserId = SessionId.create(userId);
    const profile = await this.profileRepository.findByUserId(targetUserId);
    const layout = profile?.activeLayout ?? Layout.create('ABNT2');
    const timezone =
      profile !== null ? Timezone.create({ value: profile.timezone }) : Timezone.createDefault();

    const localToday = timezone.toLocalDateKey(this.now());
    const trendDays = adaptiveParams.DASHBOARD_TREND_WINDOWS_DAYS.at(-1) ?? 90;
    const fromTrend = shiftLocalDate(localToday, -(trendDays - 1));

    const transitions = await this.transitionRepository.findByUserBetween(
      targetUserId,
      fromTrend,
      localToday
    );
    const performances = await this.keyPerformanceRepository.findByUserIdAndLayout(
      targetUserId,
      layout
    );

    return {
      transitions: transitions.map((transition) => ({
        logicalKey: transition.logicalKey,
        date: transition.date,
        from: transition.from,
        to: transition.to,
      })),
      countsByState: this.countsByState(performances),
    };
  }

  private countsByState(performances: KeyPerformance[]): DashboardCountsByState {
    const counts: DashboardCountsByState = {
      UNKNOWN: 0,
      LEARNING: 0,
      CONSOLIDATING: 0,
      MASTERED: 0,
      WEAK: 0,
    };
    for (const performance of performances) {
      if (MASTERY_STATES.includes(performance.masteryState)) {
        counts[performance.masteryState] += 1;
      }
    }
    return counts;
  }
}