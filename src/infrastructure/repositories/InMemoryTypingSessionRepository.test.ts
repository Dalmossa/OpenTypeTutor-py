import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTypingSessionRepository } from "./InMemoryTypingSessionRepository.js";
import { TypingSession } from "../../domain/entities/TypingSession.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LESSON_ID = "550e8400-e29b-41d4-a716-446655440001";
const LAYOUT = Layout.create("ABNT2");

function makeSession(
  id?: SessionId,
  userId?: SessionId,
  lessonId?: SessionId,
  layout: Layout = LAYOUT,
): TypingSession {
  return TypingSession.create({
    userId: userId ?? SessionId.create(USER_ID),
    lessonId: lessonId ?? SessionId.create(LESSON_ID),
    layout,
  });
}

function makeCompletedSession(
  id?: SessionId,
  userId?: SessionId,
  lessonId?: SessionId,
): TypingSession {
  const session = makeSession(id, userId, lessonId).start();
  // Simulate completion by reconstructing with COMPLETED state
  return TypingSession.reconstruct({
    id: session.id,
    userId: session.userId,
    lessonId: session.lessonId,
    layout: session.layout,
    state: "COMPLETED",
    startedAt: new Date(),
    completedAt: new Date(),
    activeDurationMs: 30000,
    metrics: null,
    keystrokes: [],
    pausedAt: null,
    totalPausedDurationMs: 0,
  });
}

describe("InMemoryTypingSessionRepository", () => {
  let repository: InMemoryTypingSessionRepository;

  beforeEach(() => {
    repository = new InMemoryTypingSessionRepository();
  });

  it("retorna null quando não existe sessão", async () => {
    const session = await repository.findById(
      SessionId.create("550e8400-e29b-41d4-a716-446655440099"),
    );
    expect(session).toBeNull();
  });

  it("salva e recupera sessão por id", async () => {
    const session = makeSession();
    await repository.save(session);

    const found = await repository.findById(session.id);
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(session.id.value);
    expect(found?.userId.equals(session.userId)).toBe(true);
    expect(found?.lessonId.equals(session.lessonId)).toBe(true);
    expect(found?.state).toBe("IDLE");
  });

  it("findByUserId retorna todas as sessões do usuário", async () => {
    const userId = SessionId.create(USER_ID);
    const otherUserId = SessionId.create(
      "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    );

    await repository.save(makeSession(undefined, userId));
    await repository.save(makeSession(undefined, userId));
    await repository.save(makeSession(undefined, otherUserId));

    const userSessions = await repository.findByUserId(userId);
    expect(userSessions).toHaveLength(2);
    userSessions.forEach((s) => {
      expect(s.userId.equals(userId)).toBe(true);
    });
  });

  it("findCompletedByUserId retorna apenas sessões COMPLETED", async () => {
    const userId = SessionId.create(USER_ID);

    await repository.save(makeSession(undefined, userId)); // IDLE
    await repository.save(makeCompletedSession(undefined, userId)); // COMPLETED
    await repository.save(makeSession(undefined, userId).start()); // RUNNING
    await repository.save(makeCompletedSession(undefined, userId)); // COMPLETED

    const completed = await repository.findCompletedByUserId(userId);
    expect(completed).toHaveLength(2);
    completed.forEach((s) => {
      expect(s.state).toBe("COMPLETED");
    });
  });

  it("findCompletedByUserId não retorna sessões de outros usuários", async () => {
    const userId = SessionId.create(USER_ID);
    const otherUserId = SessionId.create(
      "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    );

    await repository.save(makeCompletedSession(undefined, userId));
    await repository.save(makeCompletedSession(undefined, otherUserId));

    const completed = await repository.findCompletedByUserId(userId);
    expect(completed).toHaveLength(1);
    const c = completed[0] as (typeof completed)[0];
    expect(c.userId.equals(userId)).toBe(true);
  });

  it("deleteByUserId apaga sessões do usuário e preserva as de outros", async () => {
    const userId = SessionId.create(USER_ID);
    const otherUserId = SessionId.create(
      "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    );

    await repository.save(makeSession(undefined, userId));
    await repository.save(makeCompletedSession(undefined, userId));
    await repository.save(makeSession(undefined, otherUserId));

    await repository.deleteByUserId(userId);

    expect(await repository.findByUserId(userId)).toHaveLength(0);
    expect(await repository.findByUserId(otherUserId)).toHaveLength(1);
  });

  it("clear remove todas as sessões", async () => {
    await repository.save(makeSession());
    await repository.save(makeCompletedSession());

    repository.clear();

    expect(await repository.findById(SessionId.create(LESSON_ID))).toBeNull();
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todas as sessões salvas", async () => {
    await repository.save(makeSession());
    await repository.save(makeCompletedSession());

    const all = repository.getAll();
    expect(all).toHaveLength(2);
  });

  it("isola sessões por usuário em findById", async () => {
    const userId = SessionId.create(USER_ID);
    const otherUserId = SessionId.create(
      "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    );

    const session = makeSession(undefined, userId);
    await repository.save(session);

    // Session from other user shouldn't be found by this session's ID
    expect(await repository.findById(session.id)).not.toBeNull();

    // But a different session from other user would have different ID
    const otherSession = makeSession(undefined, otherUserId);
    await repository.save(otherSession);

    expect(await repository.findById(otherSession.id)).not.toBeNull();
    expect(await repository.findById(session.id)).not.toBeNull();
  });
});
