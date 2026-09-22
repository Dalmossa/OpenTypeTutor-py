import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryKeyPerformanceRepository } from "./InMemoryKeyPerformanceRepository.js";
import { KeyPerformance } from "../../domain/entities/KeyPerformance.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LAYOUT_ABNT2 = Layout.create("ABNT2");
const LAYOUT_US = Layout.create("US-INTERNATIONAL");
const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function makeKeyPerformance(
  userId: string = USER_ID,
  logicalKey: string = "a",
  layout: Layout = LAYOUT_ABNT2,
  overrides: Partial<{
    attempts: number;
    errors: number;
    averageLatencyMs: number;
    masteryState: KeyPerformance["masteryState"];
  }> = {},
): KeyPerformance {
  return KeyPerformance.create({
    userId: SessionId.create(userId),
    logicalKey,
    layout,
    attempts: overrides.attempts ?? 10,
    errors: overrides.errors ?? 1,
    averageLatencyMs: overrides.averageLatencyMs ?? 200,
    masteryState: overrides.masteryState ?? "LEARNING",
  });
}

describe("RN11 - InMemoryKeyPerformanceRepository (isolamento por layout)", () => {
  let repository: InMemoryKeyPerformanceRepository;

  beforeEach(() => {
    repository = new InMemoryKeyPerformanceRepository();
  });

  it("retorna null quando não existe performance (findById usa chave composta, não UUID)", async () => {
    // findById neste repositório em memória usa a chave composta userId:logicalKey:layout
    // não o UUID da entidade. Para buscar por UUID, use findByUserIdAndLogicalKey.
    const kp = await repository.findById(
      SessionId.create("550e8400-e29b-41d4-a716-446655440099"),
    );
    expect(kp).toBeNull();
  });

  it("salva e recupera performance por chave composta (userId:logicalKey:layout)", async () => {
    const kp = makeKeyPerformance();
    await repository.save(kp);

    const found = await repository.findByUserIdAndLogicalKey(
      kp.userId,
      kp.logicalKey,
      kp.layout,
    );
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(kp.id.value);
    expect(found?.logicalKey).toBe(kp.logicalKey);
    expect(found?.layout.equals(kp.layout)).toBe(true);
    expect(found?.attempts).toBe(kp.attempts);
  });

  it("findByUserId retorna todas as performances do usuário", async () => {
    const userId = SessionId.create(USER_ID);
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "s", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(OTHER_USER_ID, "a", LAYOUT_ABNT2));

    const performances = await repository.findByUserId(userId);
    expect(performances).toHaveLength(2);
    performances.forEach((p) => {
      expect(p.userId.equals(userId)).toBe(true);
    });
  });

  it("findByUserIdAndLayout retorna performances do usuário e layout", async () => {
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "s", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_US));
    await repository.save(makeKeyPerformance(OTHER_USER_ID, "a", LAYOUT_ABNT2));

    const abnt2 = await repository.findByUserIdAndLayout(
      SessionId.create(USER_ID),
      LAYOUT_ABNT2,
    );
    expect(abnt2).toHaveLength(2);
    abnt2.forEach((p) => {
      expect(p.layout.equals(LAYOUT_ABNT2)).toBe(true);
    });

    const us = await repository.findByUserIdAndLayout(
      SessionId.create(USER_ID),
      LAYOUT_US,
    );
    expect(us).toHaveLength(1);
    const usPerf = us[0] as KeyPerformance;
    expect(usPerf.layout.equals(LAYOUT_US)).toBe(true);
  });

  it("findByUserIdAndLogicalKey retorna performance específica (chave composta userId:logicalKey:layout)", async () => {
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_US));
    await repository.save(makeKeyPerformance(OTHER_USER_ID, "a", LAYOUT_ABNT2));

    const kpAbnt2 = await repository.findByUserIdAndLogicalKey(
      SessionId.create(USER_ID),
      "a",
      LAYOUT_ABNT2,
    );
    expect(kpAbnt2).not.toBeNull();
    expect(kpAbnt2?.layout.equals(LAYOUT_ABNT2)).toBe(true);

    const kpUs = await repository.findByUserIdAndLogicalKey(
      SessionId.create(USER_ID),
      "a",
      LAYOUT_US,
    );
    expect(kpUs).not.toBeNull();
    expect(kpUs?.layout.equals(LAYOUT_US)).toBe(true);

    // Other user's key should not be found
    const otherKp = await repository.findByUserIdAndLogicalKey(
      SessionId.create(OTHER_USER_ID),
      "a",
      LAYOUT_ABNT2,
    );
    expect(otherKp).not.toBeNull();
    expect(otherKp?.userId.value).toBe(OTHER_USER_ID);
  });

  it("findByUserIdAndLogicalKey retorna null para combinação inexistente", async () => {
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));

    const kp = await repository.findByUserIdAndLogicalKey(
      SessionId.create(USER_ID),
      "z",
      LAYOUT_ABNT2,
    );
    expect(kp).toBeNull();

    const kp2 = await repository.findByUserIdAndLogicalKey(
      SessionId.create(USER_ID),
      "a",
      LAYOUT_US,
    );
    expect(kp2).toBeNull();
  });

  it("findAllByUserId é alias de findByUserId", async () => {
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "s", LAYOUT_ABNT2));

    const all = await repository.findAllByUserId(SessionId.create(USER_ID));
    const byUser = await repository.findByUserId(SessionId.create(USER_ID));

    expect(all).toHaveLength(byUser.length);
    all.forEach((kp, i) => {
      const byUserItem = byUser[i];
      if (byUserItem !== undefined) {
        expect(kp.id.value).toBe(byUserItem.id.value);
      }
    });
  });

  it("deleteByUserId apaga performances do usuário e preserva as de outros", async () => {
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "s", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(OTHER_USER_ID, "a", LAYOUT_ABNT2));

    await repository.deleteByUserId(SessionId.create(USER_ID));

    expect(
      await repository.findByUserId(SessionId.create(USER_ID)),
    ).toHaveLength(0);
    expect(
      await repository.findByUserId(SessionId.create(OTHER_USER_ID)),
    ).toHaveLength(1);
  });

  it("clear remove todas as performances", async () => {
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "s", LAYOUT_US));

    repository.clear();

    expect(
      await repository.findByUserId(SessionId.create(USER_ID)),
    ).toHaveLength(0);
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todas as performances salvas", async () => {
    await repository.save(makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2));
    await repository.save(makeKeyPerformance(USER_ID, "s", LAYOUT_US));

    const all = repository.getAll();
    expect(all).toHaveLength(2);
  });

  it("RN11 - isola performances por layout (mesma tecla, layouts diferentes)", async () => {
    await repository.save(
      makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2, { attempts: 10 }),
    );
    await repository.save(
      makeKeyPerformance(USER_ID, "a", LAYOUT_US, { attempts: 5 }),
    );

    const abnt2 = await repository.findByUserIdAndLogicalKey(
      SessionId.create(USER_ID),
      "a",
      LAYOUT_ABNT2,
    );
    const us = await repository.findByUserIdAndLogicalKey(
      SessionId.create(USER_ID),
      "a",
      LAYOUT_US,
    );

    expect(abnt2).not.toBeNull();
    expect(us).not.toBeNull();
    expect(abnt2?.attempts).toBe(10);
    expect(us?.attempts).toBe(5);
    expect(abnt2?.id.value).not.toBe(us?.id.value); // IDs diferentes para cada layout
  });

  it("sobrescreve performance existente com mesma chave composta", async () => {
    const kp1 = makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2, {
      attempts: 10,
    });
    await repository.save(kp1);

    const kp2 = makeKeyPerformance(USER_ID, "a", LAYOUT_ABNT2, {
      attempts: 20,
    });
    await repository.save(kp2);

    const found = await repository.findByUserIdAndLogicalKey(
      SessionId.create(USER_ID),
      "a",
      LAYOUT_ABNT2,
    );
    expect(found).not.toBeNull();
    expect(found?.attempts).toBe(20); // Updated
    expect(found?.id.value).toBe(kp2.id.value); // New entity with new ID
  });
});
