import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryKeyMasteryTransitionRepository } from "./InMemoryKeyMasteryTransitionRepository.js";
import { KeyMasteryTransition } from "../../domain/entities/KeyMasteryTransition.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LAYOUT = Layout.create("ABNT2");
const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function makeTransition(
  userId: string = USER_ID,
  date: string = "2026-01-15",
  from: KeyMasteryTransition["from"] = "LEARNING",
  to: KeyMasteryTransition["to"] = "CONSOLIDATING",
): KeyMasteryTransition {
  return KeyMasteryTransition.create({
    userId: SessionId.create(userId),
    logicalKey: "a",
    layout: LAYOUT,
    date,
    from,
    to,
  });
}

describe("RN09/RN10 - InMemoryKeyMasteryTransitionRepository (timeline de transições de maestria)", () => {
  let repository: InMemoryKeyMasteryTransitionRepository;

  beforeEach(() => {
    repository = new InMemoryKeyMasteryTransitionRepository();
  });

  it("retorna array vazio quando não existem transições", async () => {
    const transitions = await repository.findByUserBetween(
      SessionId.create("550e8400-e29b-41d4-a716-446655440099"),
      "2026-01-01",
      "2026-01-31",
    );
    expect(transitions).toHaveLength(0);
  });

  it("salva e recupera transições por usuário e intervalo de datas", async () => {
    await repository.save(
      makeTransition(USER_ID, "2026-01-10", "LEARNING", "CONSOLIDATING"),
    );
    await repository.save(
      makeTransition(USER_ID, "2026-01-15", "CONSOLIDATING", "MASTERED"),
    );
    await repository.save(
      makeTransition(USER_ID, "2026-01-20", "MASTERED", "LEARNING"),
    ); // regressão
    await repository.save(
      makeTransition(OTHER_USER_ID, "2026-01-15", "LEARNING", "CONSOLIDATING"),
    );

    const userTransitions = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-01-31",
    );
    expect(userTransitions).toHaveLength(3);
    userTransitions.forEach((t) => {
      expect(t.userId.value).toBe(USER_ID);
    });
  });

  it("findByUserBetween ordena transições por data ascendente", async () => {
    await repository.save(
      makeTransition(USER_ID, "2026-01-20", "CONSOLIDATING", "MASTERED"),
    );
    await repository.save(
      makeTransition(USER_ID, "2026-01-10", "LEARNING", "CONSOLIDATING"),
    );
    await repository.save(
      makeTransition(USER_ID, "2026-01-15", "UNKNOWN", "LEARNING"),
    );

    const results = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-01-31",
    );
    expect(results).toHaveLength(3);
    const r0 = results[0] as KeyMasteryTransition;
    const r1 = results[1] as KeyMasteryTransition;
    const r2 = results[2] as KeyMasteryTransition;
    expect(r0.date).toBe("2026-01-10");
    expect(r0.from).toBe("LEARNING");
    expect(r0.to).toBe("CONSOLIDATING");
    expect(r1.date).toBe("2026-01-15");
    expect(r2.date).toBe("2026-01-20");
  });

  it("findByUserBetween filtra por intervalo de datas", async () => {
    await repository.save(makeTransition(USER_ID, "2026-01-05"));
    await repository.save(makeTransition(USER_ID, "2026-01-15"));
    await repository.save(makeTransition(USER_ID, "2026-01-25"));

    const firstHalf = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-01-15",
    );
    expect(firstHalf).toHaveLength(2);
    const fh0 = firstHalf[0] as KeyMasteryTransition;
    const fh1 = firstHalf[1] as KeyMasteryTransition;
    expect(fh0.date).toBe("2026-01-05");
    expect(fh1.date).toBe("2026-01-15");

    const secondHalf = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-16",
      "2026-01-31",
    );
    expect(secondHalf).toHaveLength(1);
    const sh0 = secondHalf[0] as KeyMasteryTransition;
    expect(sh0.date).toBe("2026-01-25");
  });

  it("findByUserBetween isola transições por usuário", async () => {
    await repository.save(makeTransition(USER_ID, "2026-01-15"));
    await repository.save(makeTransition(OTHER_USER_ID, "2026-01-15"));

    const user1 = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-01-31",
    );
    const user2 = await repository.findByUserBetween(
      SessionId.create(OTHER_USER_ID),
      "2026-01-01",
      "2026-01-31",
    );

    expect(user1).toHaveLength(1);
    expect(user2).toHaveLength(1);
    const u1 = user1[0] as KeyMasteryTransition;
    const u2 = user2[0] as KeyMasteryTransition;
    expect(u1.userId.value).toBe(USER_ID);
    expect(u2.userId.value).toBe(OTHER_USER_ID);
  });

  it("deleteByUserId apaga transições do usuário e preserva as de outros", async () => {
    await repository.save(makeTransition(USER_ID, "2026-01-10"));
    await repository.save(makeTransition(USER_ID, "2026-01-15"));
    await repository.save(makeTransition(OTHER_USER_ID, "2026-01-15"));

    await repository.deleteByUserId(SessionId.create(USER_ID));

    const user1 = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-01-31",
    );
    const user2 = await repository.findByUserBetween(
      SessionId.create(OTHER_USER_ID),
      "2026-01-01",
      "2026-01-31",
    );

    expect(user1).toHaveLength(0);
    expect(user2).toHaveLength(1);
  });

  it("clear remove todas as transições", async () => {
    await repository.save(makeTransition(USER_ID, "2026-01-15"));
    await repository.save(makeTransition(OTHER_USER_ID, "2026-01-15"));

    repository.clear();

    const user1 = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-01-31",
    );
    expect(user1).toHaveLength(0);
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todas as transições salvas", async () => {
    await repository.save(makeTransition(USER_ID, "2026-01-10"));
    await repository.save(makeTransition(USER_ID, "2026-01-15"));
    await repository.save(makeTransition(OTHER_USER_ID, "2026-01-15"));

    const all = repository.getAll();
    expect(all).toHaveLength(3);
  });

  it("suporta transições de regressão (MASTERED -> LEARNING)", async () => {
    await repository.save(
      makeTransition(USER_ID, "2026-01-10", "LEARNING", "CONSOLIDATING"),
    );
    await repository.save(
      makeTransition(USER_ID, "2026-01-15", "CONSOLIDATING", "MASTERED"),
    );
    await repository.save(
      makeTransition(USER_ID, "2026-01-20", "MASTERED", "LEARNING"),
    );
    await repository.save(
      makeTransition(USER_ID, "2026-01-25", "LEARNING", "WEAK"),
    );

    const results = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-01",
      "2026-01-31",
    );
    expect(results).toHaveLength(4);
    // Check regression transition
    const regression = results.find(
      (t) => t.from === "MASTERED" && t.to === "LEARNING",
    );
    expect(regression).toBeDefined();
    expect(regression?.date).toBe("2026-01-20");
  });

  it("suporta todas as transições válidas de masteryState", async () => {
    const states: Array<KeyMasteryTransition["from"]> = [
      "UNKNOWN",
      "LEARNING",
      "CONSOLIDATING",
      "MASTERED",
      "WEAK",
    ];

    for (let i = 0; i < states.length - 1; i++) {
      await repository.save(
        makeTransition(
          USER_ID,
          `2026-01-${String(i + 10).padStart(2, "0")}`,
          states[i],
          states[i + 1],
        ),
      );
    }

    const results = await repository.findByUserBetween(
      SessionId.create(USER_ID),
      "2026-01-10",
      "2026-01-20",
    );
    expect(results).toHaveLength(4);
  });
});
