import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProgressCardRepository } from './InMemoryProgressCardRepository.js';
import { ProgressCard } from '../../domain/entities/ProgressCard.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { PedagogicalPhase } from '../../domain/value-objects/PedagogicalPhase.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('RN27 - InMemoryProgressCardRepository (Cartão persistido entre sessões)', () => {
  let repository: InMemoryProgressCardRepository;

  beforeEach(() => {
    repository = new InMemoryProgressCardRepository();
  });

  it('retorna null quando não existe cartão para o usuário', async () => {
    const card = await repository.findLatestByUserId(SessionId.create(USER_ID));
    expect(card).toBeNull();
  });

  it('salva e recupera o cartão mais recente do usuário', async () => {
    const first = ProgressCard.createInitial(SessionId.create(USER_ID));
    await repository.save(first);

    const second = ProgressCard.create({
      userId: SessionId.create(USER_ID),
      date: new Date(new Date().getTime() + 1000),
      phase: PedagogicalPhase.create('HOME_ROW'),
      lessonNumber: 1,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'Avanço confirmado',
      previousBackspaceCount: first.currentBackspaceCount,
      currentBackspaceCount: 0,
    });
    await repository.save(second);

    const latest = await repository.findLatestByUserId(SessionId.create(USER_ID));
    expect(latest).not.toBeNull();
    expect(latest?.phase.value).toBe('HOME_ROW');
  });

  it('isola cartões por usuário', async () => {
    const other = SessionId.create('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
    await repository.save(ProgressCard.createInitial(SessionId.create(USER_ID)));

    expect(await repository.findLatestByUserId(other)).toBeNull();
    expect(await repository.findLatestByUserId(SessionId.create(USER_ID))).not.toBeNull();
  });
});