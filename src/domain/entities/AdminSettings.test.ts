import { describe, it, expect } from "vitest";
import { AdminSettings } from "./AdminSettings.js";
import { adaptiveParams } from "../config/adaptiveParams.js";

describe("AdminSettings", () => {
  it("create usa defaults de adaptiveParams quando não informado", () => {
    const settings = AdminSettings.create({});

    expect(settings.macroBreakEnabled).toBe(adaptiveParams.MACRO_BREAK_ENABLED);
    expect(settings.macroLessonsThreshold).toBe(
      adaptiveParams.MACRO_LESSONS_THRESHOLD,
    );
    expect(settings.macroBreakDurationMs).toBe(
      adaptiveParams.MACRO_BREAK_DURATION_MS,
    );
    expect(settings.microBlockDurationMs).toBe(
      adaptiveParams.PRACTICE_BLOCK_DURATION_MS,
    );
    expect(settings.microBreakDurationMs).toBe(
      adaptiveParams.MIN_BREAK_DURATION_MS,
    );
  });

  it("create aceita valores customizados", () => {
    const settings = AdminSettings.create({
      macroBreakEnabled: false,
      macroLessonsThreshold: 5,
      macroBreakDurationMs: 7200000,
      microBlockDurationMs: 1200000,
      microBreakDurationMs: 300000,
    });

    expect(settings.macroBreakEnabled).toBe(false);
    expect(settings.macroLessonsThreshold).toBe(5);
    expect(settings.macroBreakDurationMs).toBe(7200000);
    expect(settings.microBlockDurationMs).toBe(1200000);
    expect(settings.microBreakDurationMs).toBe(300000);
  });

  it("toDTO serializa corretamente", () => {
    const settings = AdminSettings.create({
      macroBreakEnabled: false,
      macroLessonsThreshold: 5,
    });

    const dto = settings.toDTO();

    expect(dto.macroBreakEnabled).toBe(false);
    expect(dto.macroLessonsThreshold).toBe(5);
    expect(dto.macroBreakDurationMs).toBe(
      adaptiveParams.MACRO_BREAK_DURATION_MS,
    );
  });

  it("fromDTO recria settings corretamente", () => {
    const dto = {
      macroBreakEnabled: true,
      macroLessonsThreshold: 4,
      macroBreakDurationMs: 5400000,
      microBlockDurationMs: 600000,
      microBreakDurationMs: 180000,
    };

    const settings = AdminSettings.fromDTO(dto);

    expect(settings.macroBreakEnabled).toBe(true);
    expect(settings.macroLessonsThreshold).toBe(4);
    expect(settings.macroBreakDurationMs).toBe(5400000);
  });

  it("update retorna nova instância com campos alterados", () => {
    const original = AdminSettings.create({
      macroBreakEnabled: true,
      macroLessonsThreshold: 3,
    });
    const updated = original.update({ macroBreakEnabled: false });

    expect(original.macroBreakEnabled).toBe(true); // imutável
    expect(updated.macroBreakEnabled).toBe(false);
    expect(updated.macroLessonsThreshold).toBe(3); // preservado
  });

  it("getEffectiveParams retorna parâmetros efetivos para uso no domínio", () => {
    const settings = AdminSettings.create({
      macroBreakEnabled: false,
      macroLessonsThreshold: 5,
    });

    const params = settings.getEffectiveParams();

    expect(params.MACRO_BREAK_ENABLED).toBe(false);
    expect(params.MACRO_LESSONS_THRESHOLD).toBe(5);
    expect(params.MACRO_BREAK_DURATION_MS).toBe(
      adaptiveParams.MACRO_BREAK_DURATION_MS,
    );
  });
});
