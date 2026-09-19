import { describe, expect, it } from 'vitest';
import { KeyMasteryTransition } from './KeyMasteryTransition.js';
import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';

const USER_ID = SessionId.create();
const ABNT2 = Layout.create('ABNT2');

describe('KeyMasteryTransition', () => {
  it('cria transição com from/to diferentes, tecla e layout', () => {
    const transition = KeyMasteryTransition.create({
      userId: USER_ID,
      logicalKey: 'a',
      layout: ABNT2,
      date: '2026-01-01',
      from: 'LEARNING',
      to: 'CONSOLIDATING',
    });

    expect(transition.userId.equals(USER_ID)).toBe(true);
    expect(transition.logicalKey).toBe('a');
    expect(transition.layout.equals(ABNT2)).toBe(true);
    expect(transition.date).toBe('2026-01-01');
    expect(transition.from).toBe('LEARNING');
    expect(transition.to).toBe('CONSOLIDATING');
  });

  it('rejeita transição onde o estado não muda (from === to)', () => {
    expect(() =>
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'a',
        layout: ABNT2,
        date: '2026-01-01',
        from: 'MASTERED',
        to: 'MASTERED',
      })
    ).toThrow();
  });

  it('valida userId, layout e data local (RN37)', () => {
    expect(() =>
      KeyMasteryTransition.create({
        userId: 'invalid' as unknown as SessionId,
        logicalKey: 'a',
        layout: ABNT2,
        date: '2026-01-01',
        from: 'LEARNING',
        to: 'WEAK',
      })
    ).toThrow();

    expect(() =>
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'a',
        layout: 'ABNT2' as unknown as Layout,
        date: '2026-01-01',
        from: 'LEARNING',
        to: 'WEAK',
      })
    ).toThrow();

    expect(() =>
      KeyMasteryTransition.create({
        userId: USER_ID,
        logicalKey: 'a',
        layout: ABNT2,
        date: '01/01/2026',
        from: 'LEARNING',
        to: 'WEAK',
      })
    ).toThrow();
  });
});