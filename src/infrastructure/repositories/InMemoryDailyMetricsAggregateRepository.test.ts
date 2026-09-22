import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDailyMetricsAggregateRepository } from "./InMemoryDailyMetricsAggregateRepository.js";
import { DailyMetricsAggregate } from "../../domain/entities/DailyMetricsAggregate.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LAYOUT_ABNT2 = Layout.create("ABNT2");
const LAYOUT_US = Layout.create("US-INTERNATIONAL");
const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function makeAggregate(
  userId: string = USER_ID,
  layout: Layout = LAYOUT_ABNT2,
  date: string = "2026-01-15",
  overrides: Partial<{
    sessionsCompleted: number;
    totalActiveMs: number;
    totalGrossChars: number;
    totalCorrectChars: number;
    totalErrors: number;
    totalLatencyMs: number;
    totalLatencySamples: number;
    keysPracticed: string[];
    keyCounts: Record<string, number>;
  }> = {},
): DailyMetricsAggregate {
  return DailyMetricsAggregate.create({
    userId: SessionId.create(userId),
    layout,
    date,
    sessionsCompleted: overrides.sessionsCompleted ?? 1,
    totalActiveMs: overrides.totalActiveMs ?? 30000,
    totalGrossChars: overrides.totalGrossChars ?? 100,
    totalCorrectChars: overrides.totalCorrectChars ?? 95,
    totalErrors: overrides.totalErrors ?? 5,
    totalLatencyMs: overrides.totalLatencyMs ?? 20000,
    totalLatencySamples: overrides.totalLatencySamples ?? 100,
    keysPracticed: overrides.keysPracticed ?? ["a", "s", "d"],
    keyCounts: overrides.keyCounts ?? { a: 40, s: 30, d: 25 },
  });
}

describe("RN35 - InMemoryDailyMetricsAggregateRepository (agregado diário por userId|layout|date)", () => {
  let repository: InMemoryDailyMetricsAggregateRepository;

  beforeEach(() => {
    repository = new InMemoryDailyMetricsAggregateRepository();
  });

  it("retorna null quando não existe agregado", async () => {
    const agg = await repository.findByKey(
      SessionId.create("550e8400-e29b-41d4-a716-446655440099"),
      LAYOUT_ABNT2,
      "2026-01-15",
    );
    expect(agg).toBeNull();
  });

  it("salva e recupera agregado por chave composta", async () => {
    const agg = makeAggregate();
    await repository.save(agg);

    const found = await repository.findByKey(agg.userId, agg.layout, agg.date);
    expect(found).not.toBeNull();
    expect(found?.userId.equals(agg.userId)).toBe(true);
    expect(found?.layout.equals(agg.layout)).toBe(true);
    expect(found?.date).toBe(agg.date);
    expect(found?.sessionsCompleted).toBe(agg.sessionsCompleted);
  });

  it("findByUserBetween retorna agregados do usuário no intervalo de datas", async () => {
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-10"));
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15"));
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-20"));
    await repository.save(makeAggregate(USER_ID, LAYOUT_US, "2026-01-15"));
    await repository.save(
      makeAggregate(OTHER_USER_ID, LAYOUT_ABNT2, "2026-01-15"),
    );

    const userAbnt2 = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
      "2026-01-12",
      "2026-01-18",
    );
    expect(userAbnt2).toHaveLength(1);
    const agg1 = userAbnt2[0] as DailyMetricsAggregate;
    expect(agg1.date).toBe("2026-01-15");
    expect(agg1.layout.equals(LAYOUT_ABNT2)).toBe(true);

    const userAllDates = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
      "2026-01-01",
      "2026-01-31",
    );
    expect(userAllDates).toHaveLength(3);
  });

  it("findByUserBetween ordena resultados por data ascendente", async () => {
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-20"));
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-10"));
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15"));

    const results = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
      "2026-01-01",
      "2026-01-31",
    );
    expect(results).toHaveLength(3);
    const r0 = results[0] as DailyMetricsAggregate;
    const r1 = results[1] as DailyMetricsAggregate;
    const r2 = results[2] as DailyMetricsAggregate;
    expect(r0.date).toBe("2026-01-10");
    expect(r1.date).toBe("2026-01-15");
    expect(r2.date).toBe("2026-01-20");
  });

  it("findByUserBetween retorna array vazio para usuário sem dados", async () => {
    const nonExistentUserId = SessionId.create();
    const results = await repository.findByUserBetween(
      nonExistentUserId,
      LAYOUT_ABNT2,
      "2026-01-01",
      "2026-01-31",
    );
    expect(results).toHaveLength(0);
  });

  it("findByUserBetween retorna array vazio para layout sem dados", async () => {
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15"));

    const results = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      LAYOUT_US,
      "2026-01-01",
      "2026-01-31",
    );
    expect(results).toHaveLength(0);
  });

  it("deleteByUserId apaga agregados do usuário e preserva os de outros", async () => {
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-10"));
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15"));
    await repository.save(
      makeAggregate(OTHER_USER_ID, LAYOUT_ABNT2, "2026-01-15"),
    );

    await repository.deleteByUserId(SessionId.create(USER_ID));

    const user1 = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
      "2026-01-01",
      "2026-01-31",
    );
    const user2 = await repository.findByUserBetween(
      SessionId.create(OTHER_USER_ID),
      LAYOUT_ABNT2,
      "2026-01-01",
      "2026-01-31",
    );

    expect(user1).toHaveLength(0);
    expect(user2).toHaveLength(1);
  });

  it("clear remove todos os agregados", async () => {
    await repository.save(makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15"));
    await repository.save(makeAggregate(USER_ID, LAYOUT_US, "2026-01-15"));

    repository.clear();

    expect(
      await repository.findByUserBetween(
        SessionId.create(USER_ID),
        LAYOUT_ABNT2,
        "2026-01-01",
        "2026-01-31",
      ),
    ).toHaveLength(0);
  });

  it("chave composta isola por userId, layout e date", async () => {
    await repository.save(
      makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15", {
        sessionsCompleted: 1,
      }),
    );
    await repository.save(
      makeAggregate(USER_ID, LAYOUT_US, "2026-01-15", { sessionsCompleted: 2 }),
    );
    await repository.save(
      makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-16", {
        sessionsCompleted: 3,
      }),
    );
    await repository.save(
      makeAggregate(OTHER_USER_ID, LAYOUT_ABNT2, "2026-01-15", {
        sessionsCompleted: 4,
      }),
    );

    const a1 = await repository.findByKey(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
      "2026-01-15",
    );
    const a2 = await repository.findByKey(
      SessionId.create(USER_ID),
      LAYOUT_US,
      "2026-01-15",
    );
    const a3 = await repository.findByKey(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
      "2026-01-16",
    );
    const a4 = await repository.findByKey(
      SessionId.create(OTHER_USER_ID),
      LAYOUT_ABNT2,
      "2026-01-15",
    );

    expect(a1?.sessionsCompleted).toBe(1);
    expect(a2?.sessionsCompleted).toBe(2);
    expect(a3?.sessionsCompleted).toBe(3);
    expect(a4?.sessionsCompleted).toBe(4);
  });

  it("sobrescreve agregado existente com mesma chave composta", async () => {
    const agg1 = makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15", {
      sessionsCompleted: 1,
    });
    await repository.save(agg1);

    const agg2 = makeAggregate(USER_ID, LAYOUT_ABNT2, "2026-01-15", {
      sessionsCompleted: 5,
    });
    await repository.save(agg2);

    const found = await repository.findByKey(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
      "2026-01-15",
    );
    expect(found).not.toBeNull();
    expect(found?.sessionsCompleted).toBe(5);
  });
});
