import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryProgressRepository } from "./InMemoryProgressRepository.js";
import { Progress } from "../../domain/entities/Progress.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LESSON_ID = "550e8400-e29b-41d4-a716-446655440001";
const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function makeProgress(
  userId?: SessionId,
  lessonId?: SessionId,
  level = 1,
  completed = 0,
): Progress {
  return Progress.create({
    userId: userId ?? SessionId.create(USER_ID),
    currentLessonId: lessonId ?? SessionId.create(LESSON_ID),
    currentLevel: level,
    completedLessons: completed,
    lastCompletedAt: null,
  });
}

describe("InMemoryProgressRepository", () => {
  let repository: InMemoryProgressRepository;

  beforeEach(() => {
    repository = new InMemoryProgressRepository();
  });

  it("retorna null quando não existe progresso", async () => {
    const progress = await repository.findById(
      SessionId.create("550e8400-e29b-41d4-a716-446655440099"),
    );
    expect(progress).toBeNull();
  });

  it("salva e recupera progresso por id", async () => {
    const progress = makeProgress();
    await repository.save(progress);

    const found = await repository.findById(progress.id);
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(progress.id.value);
    expect(found?.userId.equals(progress.userId)).toBe(true);
    expect(found?.currentLevel).toBe(progress.currentLevel);
    expect(found?.completedLessons).toBe(progress.completedLessons);
  });

  it("findByUserId retorna progresso do usuário", async () => {
    const userId = SessionId.create(USER_ID);
    const progress = makeProgress(userId);
    await repository.save(progress);

    const found = await repository.findByUserId(userId);
    expect(found).not.toBeNull();
    expect(found?.userId.equals(userId)).toBe(true);
    expect(found?.currentLevel).toBe(1);
  });

  it("findByUserId retorna null para usuário inexistente", async () => {
    const found = await repository.findByUserId(
      SessionId.create(OTHER_USER_ID),
    );
    expect(found).toBeNull();
  });

  it("um usuário só tem um progresso (sobrescreve ao salvar novamente)", async () => {
    const userId = SessionId.create(USER_ID);
    const progress1 = makeProgress(userId, undefined, 1, 0);
    await repository.save(progress1);

    const progress2 = makeProgress(userId, undefined, 2, 5);
    await repository.save(progress2);

    const found = await repository.findByUserId(userId);
    expect(found).not.toBeNull();
    expect(found?.currentLevel).toBe(2);
    expect(found?.completedLessons).toBe(5);
    // Should be the same entity (same id)
    expect(found?.id.value).toBe(progress2.id.value);
  });

  it("deleteByUserId apaga progresso do usuário e preserva os de outros", async () => {
    await repository.save(makeProgress(SessionId.create(USER_ID)));
    await repository.save(makeProgress(SessionId.create(OTHER_USER_ID)));

    await repository.deleteByUserId(SessionId.create(USER_ID));

    expect(await repository.findByUserId(SessionId.create(USER_ID))).toBeNull();
    expect(
      await repository.findByUserId(SessionId.create(OTHER_USER_ID)),
    ).not.toBeNull();
  });

  it("clear remove todos os progressos", async () => {
    await repository.save(makeProgress());
    await repository.save(makeProgress(SessionId.create(OTHER_USER_ID)));

    repository.clear();

    expect(await repository.findByUserId(SessionId.create(USER_ID))).toBeNull();
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todos os progressos salvos", async () => {
    await repository.save(makeProgress());
    await repository.save(makeProgress(SessionId.create(OTHER_USER_ID)));

    const all = repository.getAll();
    expect(all).toHaveLength(2);
  });

  it("isola progressos por usuário", async () => {
    await repository.save(
      makeProgress(SessionId.create(USER_ID), undefined, 1, 0),
    );
    await repository.save(
      makeProgress(SessionId.create(OTHER_USER_ID), undefined, 2, 5),
    );

    const user1 = await repository.findByUserId(SessionId.create(USER_ID));
    const user2 = await repository.findByUserId(
      SessionId.create(OTHER_USER_ID),
    );

    expect(user1?.currentLevel).toBe(1);
    expect(user2?.currentLevel).toBe(2);
  });
});
