import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPracticePacingRepository } from "./InMemoryPracticePacingRepository.js";
import { PracticePacingState } from "../../domain/entities/PracticePacingState.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function makePacing(
  userId?: SessionId,
  accumulatedMs = 0,
): PracticePacingState {
  return PracticePacingState.create({
    userId: userId ?? SessionId.create(USER_ID),
    accumulatedActiveMs: accumulatedMs,
  });
}

describe("RN33 - InMemoryPracticePacingRepository (pacing de prática 15:3)", () => {
  let repository: InMemoryPracticePacingRepository;

  beforeEach(() => {
    repository = new InMemoryPracticePacingRepository();
  });

  it("retorna null quando não existe pacing para o usuário", async () => {
    const pacing = await repository.findByUserId(
      SessionId.create("550e8400-e29b-41d4-a716-446655440099"),
    );
    expect(pacing).toBeNull();
  });

  it("salva e recupera pacing por userId", async () => {
    const pacing = makePacing();
    await repository.save(pacing);

    const found = await repository.findByUserId(pacing.userId);
    expect(found).not.toBeNull();
    expect(found?.userId.equals(pacing.userId)).toBe(true);
    expect(found?.accumulatedActiveMs).toBe(pacing.accumulatedActiveMs);
    expect(found?.lastSessionEndedAt).toBeNull();
  });

  it("um usuário só tem um pacing (sobrescreve ao salvar novamente)", async () => {
    const userId = SessionId.create(USER_ID);
    const pacing1 = makePacing(userId, 0);
    await repository.save(pacing1);

    const pacing2 = makePacing(userId, 900000); // 15 min
    await repository.save(pacing2);

    const found = await repository.findByUserId(userId);
    expect(found).not.toBeNull();
    expect(found?.accumulatedActiveMs).toBe(900000);
  });

  it("isola pacing por usuário", async () => {
    await repository.save(makePacing(SessionId.create(USER_ID), 100000));
    await repository.save(makePacing(SessionId.create(OTHER_USER_ID), 200000));

    const user1 = await repository.findByUserId(SessionId.create(USER_ID));
    const user2 = await repository.findByUserId(
      SessionId.create(OTHER_USER_ID),
    );

    expect(user1?.accumulatedActiveMs).toBe(100000);
    expect(user2?.accumulatedActiveMs).toBe(200000);
  });

  it("clear remove todos os pacings", async () => {
    await repository.save(makePacing());
    await repository.save(makePacing(SessionId.create(OTHER_USER_ID)));

    repository.clear();

    expect(await repository.findByUserId(SessionId.create(USER_ID))).toBeNull();
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todos os pacings salvos", async () => {
    await repository.save(makePacing());
    await repository.save(makePacing(SessionId.create(OTHER_USER_ID)));

    const all = repository.getAll();
    expect(all).toHaveLength(2);
  });
});
