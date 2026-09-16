import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DataSource } from 'typeorm';
import { TypeOrmTypingSessionRepository } from './TypeOrmTypingSessionRepository.js';
import { createTestDataSource } from '../database/testing.js';
import { TypingSession } from '../../domain/entities/TypingSession.js';
import { SessionMetrics } from '../../domain/entities/SessionMetrics.js';
import { KeystrokeEvent } from '../../domain/entities/KeystrokeEvent.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';

const USER_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440040');
const LESSON_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440041');
const SESSION_ID = SessionId.create('550e8400-e29b-41d4-a716-446655440042');
const OTHER_USER = SessionId.create('550e8400-e29b-41d4-a716-446655440099');

const metrics = () =>
  SessionMetrics.create({
    charactersTyped: 8,
    correctCharacters: 8,
    incorrectCharacters: 0,
    correctedErrors: 0,
    finalUncorrectedErrors: 0,
    accuracy: 1,
    grossWpm: 40,
    netWpm: 40,
    activeDurationMs: 12000,
    averageLatencyMs: 200,
  });

const keystroke = (expectedKey: string, timestampMs: number) =>
  KeystrokeEvent.create({
    expectedKey,
    typedKey: expectedKey,
    physicalKey: 'Key' + expectedKey.toUpperCase(),
    logicalKey: expectedKey,
    eventType: 'CORRECT',
    timestampMs,
    latencyMs: 150,
    composedCharacter: null,
  });

const buildSession = (id: string, userId: SessionId, state: 'RUNNING' | 'COMPLETED') => {
  let session = TypingSession.reconstruct({
    id: SessionId.create(id),
    userId,
    lessonId: LESSON_ID,
    layout: Layout.create('ABNT2'),
    state: 'IDLE',
    startedAt: null,
    completedAt: null,
    activeDurationMs: 0,
    metrics: null,
    keystrokes: [],
    pausedAt: null,
    totalPausedDurationMs: 0,
  });
  session = session.start();
  session = session.recordKeystrokes([
    keystroke('a', 1000),
    keystroke('a', 1100),
    keystroke('b', 1200),
    keystroke('b', 1300),
  ]);
  if (state === 'COMPLETED') {
    session = session.complete(metrics());
  }
  return session;
};

describe('TypeOrmTypingSessionRepository', () => {
  let dataSource: DataSource;
  let repository: TypeOrmTypingSessionRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmTypingSessionRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('round-trip preserva estado, eventos e métricas', async () => {
    const session = buildSession('550e8400-e29b-41d4-a716-446655440042', USER_ID, 'COMPLETED');
    await repository.save(session);

    const found = await repository.findById(SESSION_ID);
    expect(found).not.toBeNull();
    expect(found?.id.equals(session.id)).toBe(true);
    expect(found?.state).toBe('COMPLETED');
    expect(found?.keystrokes).toHaveLength(4);
    expect(found?.keystrokes[0]?.expectedKey).toBe('a');
    expect(found?.metrics?.toJSON()).toEqual(session.metrics?.toJSON());
    expect(found?.completedAt).not.toBeNull();
    expect(found?.toJSON()).toEqual(session.toJSON());
  });

  it('persistência de sessão RUNNING sem métricas preserva metrics nulo', async () => {
    const session = buildSession('550e8400-e29b-41d4-a716-446655440043', USER_ID, 'RUNNING');
    await repository.save(session);

    const found = await repository.findById(session.id);
    expect(found?.state).toBe('RUNNING');
    expect(found?.metrics).toBeNull();
    expect(found?.keystrokes).toHaveLength(4);
  });

  it('findByUserId retorna apenas sessões do usuário', async () => {
    const foreign = buildSession('550e8400-e29b-41d4-a716-446655440044', OTHER_USER, 'COMPLETED');
    await repository.save(foreign);

    const sessions = await repository.findByUserId(USER_ID);
    expect(sessions).toHaveLength(2);
    for (const session of sessions) {
      expect(session.userId.equals(USER_ID)).toBe(true);
    }
  });

  it('findCompletedByUserId retorna apenas sessões COMPLETED', async () => {
    const completed = await repository.findCompletedByUserId(USER_ID);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.id.value).toBe('550e8400-e29b-41d4-a716-446655440042');
  });

  it('findById retorna null para sessão inexistente', async () => {
    const missing = await repository.findById(SessionId.create('550e8400-e29b-41d4-a716-446655440098'));
    expect(missing).toBeNull();
  });
});