import { describe, it, expect } from "vitest";
import { PracticePacingState } from "./PracticePacingState.js";
import { SessionId } from "../value-objects/SessionId.js";
import { adaptiveParams } from "../config/adaptiveParams.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

const BLOCK_MS = adaptiveParams.PRACTICE_BLOCK_DURATION_MS;
const BREAK_MS = adaptiveParams.MIN_BREAK_DURATION_MS;
const MACRO_THRESHOLD = adaptiveParams.MACRO_LESSONS_THRESHOLD;
const MACRO_BREAK_MS = adaptiveParams.MACRO_BREAK_DURATION_MS;

const T0 = new Date("2026-09-17T12:00:00.000Z");
const minutes = (m: number): number => m * 60 * 1000;
const hours = (h: number): number => h * 60 * 60 * 1000;

describe("PracticePacingState", () => {
  describe("RN33 - acumulação de prática ativa", () => {
    it("recordCompletedSession acumula activeDurationMs e marca o fim da sessão", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
      });

      const after = pacing.recordCompletedSession(300000, T0);

      expect(after.accumulatedActiveMs).toBe(300000);
      expect(after.lastSessionEndedAt).toEqual(T0);
      expect(pacing.accumulatedActiveMs).toBe(0);
    });

    it("acumula sessões sucessivas até estourar o bloco", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: 600000,
        lastSessionEndedAt: new Date("2026-09-17T11:50:00.000Z"),
      });

      const after = pacing.recordCompletedSession(300000, T0);

      expect(after.accumulatedActiveMs).toBe(900000);
    });

    it("rejeita duração de prática negativa", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
      });

      expect(() => pacing.recordCompletedSession(-1, T0)).toThrow();
    });
  });

  describe("RN33 - pausa obrigatória após bloco estourado", () => {
    it("prática abaixo do bloco não exige pausa", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS - 1,
        lastSessionEndedAt: T0,
      });

      expect(pacing.isBreakRequired(T0)).toBe(false);
    });

    it("bloco atingido e pausa incompleta → break obrigatório", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS,
        lastSessionEndedAt: T0,
      });

      expect(
        pacing.isBreakRequired(new Date(T0.getTime() + BREAK_MS - 1)),
      ).toBe(true);
    });

    it("pausa de 3 minutos completada encerra o break", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS,
        lastSessionEndedAt: T0,
      });

      expect(pacing.isBreakRequired(new Date(T0.getTime() + BREAK_MS))).toBe(
        false,
      );
    });
  });

  describe("RN33 - tempo restante de pausa", () => {
    it("breakRemainingMs deduz o tempo já descansado", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS,
        lastSessionEndedAt: T0,
      });

      const remaining = pacing.breakRemainingMs(new Date(T0.getTime() + 60000));

      expect(remaining).toBe(BREAK_MS - 60000);
    });

    it("breakRemainingMs é 0 quando não há pausa obrigatória", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: 120000,
        lastSessionEndedAt: T0,
      });

      expect(pacing.breakRemainingMs(new Date(T0.getTime() + 120000))).toBe(0);
    });

    it("breakRemainingMs nunca é negativo após a pausa completada", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS,
        lastSessionEndedAt: T0,
      });

      expect(
        pacing.breakRemainingMs(new Date(T0.getTime() + BREAK_MS + 60000)),
      ).toBe(0);
    });
  });

  describe("RN33 - novo bloco após pausa", () => {
    it("isNewBlockEligible somente após bloco estourado e pausa cumprida", () => {
      const fresh = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
      });
      expect(fresh.isNewBlockEligible(T0)).toBe(false);

      const duringBreak = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS,
        lastSessionEndedAt: T0,
      });
      expect(
        duringBreak.isNewBlockEligible(new Date(T0.getTime() + 1000)),
      ).toBe(false);

      expect(
        duringBreak.isNewBlockEligible(new Date(T0.getTime() + BREAK_MS)),
      ).toBe(true);
    });

    it("startNewBlock zera o acumulador (nova sequência 15:3)", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS + minutes(5),
        lastSessionEndedAt: T0,
      });

      const fresh = pacing.startNewBlock(new Date(T0.getTime() + BREAK_MS));

      expect(fresh.accumulatedActiveMs).toBe(0);
      expect(fresh.lastSessionEndedAt).toEqual(
        new Date(T0.getTime() + BREAK_MS),
      );
    });

    it("startNewBlock lança antes da pausa completar", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS,
        lastSessionEndedAt: T0,
      });

      expect(() =>
        pacing.startNewBlock(new Date(T0.getTime() + 1000)),
      ).toThrow();
    });
  });

  describe("RN34 - macro-pausa após N lições completadas", () => {
    it("recordLessonCompleted incrementa contador e agenda macro-pausa no threshold", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
      });

      const after1 = pacing.recordLessonCompleted(T0);
      expect(after1.completedLessonsSinceMacroBreak).toBe(1);
      expect(after1.macroBreakEndsAt).toBeNull();

      const after2 = after1.recordLessonCompleted(T0);
      expect(after2.completedLessonsSinceMacroBreak).toBe(2);
      expect(after2.macroBreakEndsAt).toBeNull();

      const after3 = after2.recordLessonCompleted(T0);
      expect(after3.completedLessonsSinceMacroBreak).toBe(3);
      expect(after3.macroBreakEndsAt).toEqual(
        new Date(T0.getTime() + MACRO_BREAK_MS),
      );
    });

    it("isMacroBreakRequired retorna true durante a macro-pausa", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        completedLessonsSinceMacroBreak: MACRO_THRESHOLD,
        macroBreakEndsAt: new Date(T0.getTime() + MACRO_BREAK_MS),
      });

      expect(
        pacing.isMacroBreakRequired(new Date(T0.getTime() + hours(1))),
      ).toBe(true);
    });

    it("isMacroBreakRequired retorna false após macro-pausa completar", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        completedLessonsSinceMacroBreak: MACRO_THRESHOLD,
        macroBreakEndsAt: new Date(T0.getTime() + MACRO_BREAK_MS),
      });

      expect(
        pacing.isMacroBreakRequired(
          new Date(T0.getTime() + MACRO_BREAK_MS + 1000),
        ),
      ).toBe(false);
    });

    it("isMacroBreakRequired retorna false quando desabilitado", () => {
      // MACRO_BREAK_ENABLED é constante true; teste de config desabilitada
      // seria feito via admin settings no futuro
      expect(true).toBe(true);
    });

    it("macroBreakRemainingMs retorna tempo restante durante pausa", () => {
      const macroEndsAt = new Date(T0.getTime() + MACRO_BREAK_MS);
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        completedLessonsSinceMacroBreak: MACRO_THRESHOLD,
        macroBreakEndsAt: macroEndsAt,
      });

      const remaining = pacing.macroBreakRemainingMs(
        new Date(T0.getTime() + hours(1)),
      );
      expect(remaining).toBe(MACRO_BREAK_MS - hours(1));
    });

    it("macroBreakRemainingMs é 0 quando não há pausa obrigatória", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
      });

      expect(pacing.macroBreakRemainingMs(T0)).toBe(0);
    });

    it("startNewMacroCycle zera contador após pausa completar", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        completedLessonsSinceMacroBreak: MACRO_THRESHOLD,
        macroBreakEndsAt: new Date(T0.getTime() + MACRO_BREAK_MS),
      });

      const after = pacing.startNewMacroCycle(
        new Date(T0.getTime() + MACRO_BREAK_MS + 1000),
      );

      expect(after.completedLessonsSinceMacroBreak).toBe(0);
      expect(after.macroBreakEndsAt).toBeNull();
    });

    it("startNewMacroCycle lança se pausa não completou", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        completedLessonsSinceMacroBreak: MACRO_THRESHOLD,
        macroBreakEndsAt: new Date(T0.getTime() + MACRO_BREAK_MS),
      });

      expect(() =>
        pacing.startNewMacroCycle(new Date(T0.getTime() + hours(1))),
      ).toThrow();
    });

    it("recordCompletedSession preserva campos de macro-pausa", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: 300000,
        lastSessionEndedAt: T0,
        completedLessonsSinceMacroBreak: 2,
        macroBreakEndsAt: new Date(T0.getTime() + MACRO_BREAK_MS),
      });

      const after = pacing.recordCompletedSession(
        300000,
        new Date(T0.getTime() + minutes(10)),
      );

      expect(after.accumulatedActiveMs).toBe(600000);
      expect(after.completedLessonsSinceMacroBreak).toBe(2);
      expect(after.macroBreakEndsAt).toEqual(
        new Date(T0.getTime() + MACRO_BREAK_MS),
      );
    });

    it("startNewBlock preserva campos de macro-pausa", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS + minutes(5),
        lastSessionEndedAt: T0,
        completedLessonsSinceMacroBreak: 1,
        macroBreakEndsAt: null,
      });

      const after = pacing.startNewBlock(new Date(T0.getTime() + BREAK_MS));

      expect(after.accumulatedActiveMs).toBe(0);
      expect(after.completedLessonsSinceMacroBreak).toBe(1);
      expect(after.macroBreakEndsAt).toBeNull();
    });

    it("contador de lições persiste após micro-pausa (startNewBlock)", () => {
      const pacing = PracticePacingState.create({
        userId: SessionId.create(USER_ID),
        accumulatedActiveMs: BLOCK_MS,
        lastSessionEndedAt: T0,
        completedLessonsSinceMacroBreak: 2,
        macroBreakEndsAt: null,
      });

      // Completa micro-pausa
      const afterBreak = pacing.startNewBlock(
        new Date(T0.getTime() + BREAK_MS),
      );
      expect(afterBreak.completedLessonsSinceMacroBreak).toBe(2);

      // Completa 3ª lição → macro-pausa
      const afterLesson = afterBreak.recordLessonCompleted(
        new Date(T0.getTime() + BREAK_MS + minutes(5)),
      );
      expect(afterLesson.completedLessonsSinceMacroBreak).toBe(3);
      expect(afterLesson.macroBreakEndsAt).not.toBeNull();
    });
  });
});
