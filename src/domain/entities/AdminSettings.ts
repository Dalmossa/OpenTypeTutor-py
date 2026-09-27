import { adaptiveParams } from "../config/adaptiveParams.js";

export interface AdminSettingsProps {
  macroBreakEnabled?: boolean;
  macroLessonsThreshold?: number;
  macroBreakDurationMs?: number;
  microBlockDurationMs?: number;
  microBreakDurationMs?: number;
}

export interface AdminSettingsDTO {
  macroBreakEnabled: boolean;
  macroLessonsThreshold: number;
  macroBreakDurationMs: number;
  microBlockDurationMs: number;
  microBreakDurationMs: number;
}

// Configurações administrativas que sobrescrevem adaptiveParams defaults
// Persistidas no BD, carregadas no startup e cacheadas
export class AdminSettings {
  readonly macroBreakEnabled: boolean;
  readonly macroLessonsThreshold: number;
  readonly macroBreakDurationMs: number;
  readonly microBlockDurationMs: number;
  readonly microBreakDurationMs: number;

  private constructor(props: Required<AdminSettingsProps>) {
    this.macroBreakEnabled = props.macroBreakEnabled;
    this.macroLessonsThreshold = props.macroLessonsThreshold;
    this.macroBreakDurationMs = props.macroBreakDurationMs;
    this.microBlockDurationMs = props.microBlockDurationMs;
    this.microBreakDurationMs = props.microBreakDurationMs;
  }

  static create(props: AdminSettingsProps = {}): AdminSettings {
    return new AdminSettings({
      macroBreakEnabled:
        props.macroBreakEnabled ?? adaptiveParams.MACRO_BREAK_ENABLED,
      macroLessonsThreshold:
        props.macroLessonsThreshold ?? adaptiveParams.MACRO_LESSONS_THRESHOLD,
      macroBreakDurationMs:
        props.macroBreakDurationMs ?? adaptiveParams.MACRO_BREAK_DURATION_MS,
      microBlockDurationMs:
        props.microBlockDurationMs ?? adaptiveParams.PRACTICE_BLOCK_DURATION_MS,
      microBreakDurationMs:
        props.microBreakDurationMs ?? adaptiveParams.MIN_BREAK_DURATION_MS,
    });
  }

  static fromDTO(dto: AdminSettingsDTO): AdminSettings {
    return new AdminSettings({
      macroBreakEnabled: dto.macroBreakEnabled,
      macroLessonsThreshold: dto.macroLessonsThreshold,
      macroBreakDurationMs: dto.macroBreakDurationMs,
      microBlockDurationMs: dto.microBlockDurationMs,
      microBreakDurationMs: dto.microBreakDurationMs,
    });
  }

  toDTO(): AdminSettingsDTO {
    return {
      macroBreakEnabled: this.macroBreakEnabled,
      macroLessonsThreshold: this.macroLessonsThreshold,
      macroBreakDurationMs: this.macroBreakDurationMs,
      microBlockDurationMs: this.microBlockDurationMs,
      microBreakDurationMs: this.microBreakDurationMs,
    };
  }

  // Retorna parâmetros efetivos (admin settings > adaptiveParams defaults)
  getEffectiveParams() {
    return {
      MACRO_BREAK_ENABLED: this.macroBreakEnabled,
      MACRO_LESSONS_THRESHOLD: this.macroLessonsThreshold,
      MACRO_BREAK_DURATION_MS: this.macroBreakDurationMs,
      PRACTICE_BLOCK_DURATION_MS: this.microBlockDurationMs,
      MIN_BREAK_DURATION_MS: this.microBreakDurationMs,
    };
  }

  update(props: {
    macroBreakEnabled?: boolean | undefined;
    macroLessonsThreshold?: number | undefined;
    macroBreakDurationMs?: number | undefined;
    microBlockDurationMs?: number | undefined;
    microBreakDurationMs?: number | undefined;
  }): AdminSettings {
    return AdminSettings.create({
      macroBreakEnabled: props.macroBreakEnabled ?? this.macroBreakEnabled,
      macroLessonsThreshold:
        props.macroLessonsThreshold ?? this.macroLessonsThreshold,
      macroBreakDurationMs:
        props.macroBreakDurationMs ?? this.macroBreakDurationMs,
      microBlockDurationMs:
        props.microBlockDurationMs ?? this.microBlockDurationMs,
      microBreakDurationMs:
        props.microBreakDurationMs ?? this.microBreakDurationMs,
    });
  }
}
