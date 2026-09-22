import { describe, it, expect, beforeEach } from "vitest";
import { GetUserKeyPerformance } from "./GetUserKeyPerformance.js";
import { InMemoryUserProfileRepository } from "../../infrastructure/repositories/InMemoryUserProfileRepository.js";
import { InMemoryKeyPerformanceRepository } from "../../infrastructure/repositories/InMemoryKeyPerformanceRepository.js";
import { KeyPerformance } from "../../domain/entities/KeyPerformance.js";
import { UserProfile } from "../../domain/entities/UserProfile.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("RN25 - GetUserKeyPerformance (agregados por tecla do layout ativo)", () => {
  let profileRepository: InMemoryUserProfileRepository;
  let keyPerformanceRepository: InMemoryKeyPerformanceRepository;
  let getUserKeyPerformance: GetUserKeyPerformance;

  beforeEach(async () => {
    profileRepository = new InMemoryUserProfileRepository();
    keyPerformanceRepository = new InMemoryKeyPerformanceRepository();
    getUserKeyPerformance = new GetUserKeyPerformance(
      profileRepository,
      keyPerformanceRepository,
    );

    await profileRepository.save(
      UserProfile.create({
        userId: SessionId.create(USER_ID),
        activeLayout: Layout.create("ABNT2"),
        currentLevel: 1,
      }),
    );

    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: SessionId.create(USER_ID),
        logicalKey: "a",
        layout: Layout.create("ABNT2"),
        attempts: 10,
        errors: 6,
        lastPracticedAt: new Date(),
        masteryState: "WEAK",
      }),
    );
    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: SessionId.create(USER_ID),
        logicalKey: "s",
        layout: Layout.create("ABNT2"),
        attempts: 40,
        errors: 1,
        lastPracticedAt: new Date(),
        masteryState: "MASTERED",
      }),
    );
  });

  it("deve retornar as teclas do layout ativo com scores (WeakKeyScore) calculados", async () => {
    const result = await getUserKeyPerformance.execute(USER_ID);

    expect(result).toHaveLength(2);
    const weak = result.find((k) => k.logicalKey === "a");
    expect(weak).toBeDefined();
    expect(weak?.masteryState).toBe("WEAK");
    expect(weak?.weakKeyScore).toBeGreaterThan(0);
    const mastered = result.find((k) => k.logicalKey === "s");
    expect(mastered?.masteryState).toBe("MASTERED");
    expect(mastered?.weakKeyScore).toBeLessThan(weak?.weakKeyScore ?? 1);
  });

  it("deve ordenar por menor precisão (tecla mais fraca primeiro)", async () => {
    const result = await getUserKeyPerformance.execute(USER_ID);

    expect(result[0]?.logicalKey).toBe("a");
  });

  it("deve ignorar teclas de outro layout", async () => {
    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: SessionId.create(USER_ID),
        logicalKey: "z",
        layout: Layout.create("US-INTERNATIONAL"),
        attempts: 10,
        errors: 5,
        masteryState: "WEAK",
      }),
    );

    const result = await getUserKeyPerformance.execute(USER_ID);

    expect(result).toHaveLength(2);
    expect(result.find((k) => k.logicalKey === "z")).toBeUndefined();
  });

  it("deve usar o layout padrão ABNT2 quando o usuário não tem perfil (fallback)", async () => {
    const profilelessUserId = SessionId.create().value;
    await keyPerformanceRepository.save(
      KeyPerformance.create({
        userId: SessionId.create(profilelessUserId),
        logicalKey: "q",
        layout: Layout.create("ABNT2"),
        attempts: 8,
        errors: 4,
        masteryState: "WEAK",
      }),
    );

    const emptyRepo = new InMemoryUserProfileRepository();
    const useCase = new GetUserKeyPerformance(
      emptyRepo,
      keyPerformanceRepository,
    );

    const result = await useCase.execute(profilelessUserId);

    expect(result).toHaveLength(1);
    expect(result[0]?.logicalKey).toBe("q");
  });
});
