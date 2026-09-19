import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { DataSource } from "typeorm";
import { TypeOrmDailyMetricsAggregateRepository } from "./TypeOrmDailyMetricsAggregateRepository.js";
import { createTestDataSource } from "../database/testing.js";
import { DailyMetricsAggregate } from "../../domain/entities/DailyMetricsAggregate.js";
import { SessionMetrics } from "../../domain/entities/SessionMetrics.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const USER_ID = SessionId.create("550e8400-e29b-41d4-a716-446655440021");

function metrics(): SessionMetrics {
  return SessionMetrics.create({
    charactersTyped: 100,
    correctCharacters: 95,
    incorrectCharacters: 5,
    correctedErrors: 0,
    finalUncorrectedErrors: 5,
    accuracy: 0.95,
    grossWpm: 40,
    netWpm: 38,
    activeDurationMs: 60000,
    averageLatencyMs: 400,
  });
}

describe("TypeOrmDailyMetricsAggregateRepository", () => {
  let dataSource: DataSource;
  let repository: TypeOrmDailyMetricsAggregateRepository;
  const layout = Layout.create("ABNT2");

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmDailyMetricsAggregateRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("salva e recupera agregado por (userId, layout, date)", async () => {
    const day = DailyMetricsAggregate.create({
      userId: USER_ID,
      layout,
      date: "2026-01-01",
    }).merge(metrics(), ["a", "b"]);

    await repository.save(day);

    const found = await repository.findByKey(USER_ID, layout, "2026-01-01");
    expect(found).not.toBeNull();
    expect(found?.sessionsCompleted).toBe(1);
    expect(found?.totalGrossChars).toBe(100);
    expect(found?.keysPracticed).toEqual(["a", "b"]);
  });

  it("upsert idempotente: salvar no mesmo dia soma quando o valor vem mergeado (RN14)", async () => {
    const existing = await repository.findByKey(USER_ID, layout, "2026-01-01");
    if (existing === null) throw new Error("agregado esperado na pré-condição");
    await repository.save(existing.merge(metrics(), ["b"]));

    const merged = await repository.findByKey(USER_ID, layout, "2026-01-01");
    expect(merged?.sessionsCompleted).toBe(2);
    expect(merged?.averageLatencyMs()).toBeCloseTo(400, 10);
    expect(merged?.keysPracticed.sort()).toEqual(["a", "b"]);
  });

  it("consulta por janela de datas (7/30/90 dias, RN35)", async () => {
    await repository.save(
      DailyMetricsAggregate.create({
        userId: USER_ID,
        layout,
        date: "2026-01-02",
      }).merge(metrics(), ["a"]),
    );
    await repository.save(
      DailyMetricsAggregate.create({
        userId: USER_ID,
        layout,
        date: "2026-02-01",
      }).merge(metrics(), ["a"]),
    );

    const window = await repository.findByUserBetween(
      USER_ID,
      layout,
      "2026-01-01",
      "2026-01-31",
    );
    expect(window.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-02"]);
    expect(window.reduce((acc, d) => acc + d.sessionsCompleted, 0)).toBe(3);
  });

  it('isola por usuário (RN17)", isola por layout (RN11)', async () => {
    const otherUser = SessionId.create("550e8400-e29b-41d4-a716-446655440022");
    const otherLayout = Layout.create("US-INTERNATIONAL");

    await repository.save(
      DailyMetricsAggregate.create({
        userId: otherUser,
        layout,
        date: "2026-01-01",
      }).merge(metrics(), ["x"]),
    );
    await repository.save(
      DailyMetricsAggregate.create({
        userId: USER_ID,
        layout: otherLayout,
        date: "2026-01-01",
      }).merge(metrics(), ["y"]),
    );

    expect(
      (
        await repository.findByUserBetween(
          USER_ID,
          layout,
          "2026-01-01",
          "2026-01-31",
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      await repository.findByKey(otherUser, layout, "2026-01-01"),
    ).not.toBeNull();

    const usDay = await repository.findByKey(
      USER_ID,
      otherLayout,
      "2026-01-01",
    );
    expect(usDay?.keysPracticed).toEqual(["y"]);

    const abnt2Day = await repository.findByKey(USER_ID, layout, "2026-01-01");
    expect(abnt2Day?.keysPracticed).not.toContain("y");
  });

  it("RN31 - deleteByUserId apaga só o usuário alvo (RN17)", async () => {
    const otherUser = SessionId.create("550e8400-e29b-41d4-a716-446655440023");
    await repository.save(
      DailyMetricsAggregate.create({
        userId: otherUser,
        layout,
        date: "2026-01-01",
      }).merge(metrics(), ["z"]),
    );

    await repository.deleteByUserId(USER_ID);

    const remaining = await repository.findByUserBetween(
      USER_ID,
      layout,
      "2026-01-01",
      "2026-01-31",
    );
    expect(remaining).toHaveLength(0);
    expect(
      await repository.findByKey(otherUser, layout, "2026-01-01"),
    ).not.toBeNull();
  });
});
