import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressCard } from './ProgressCard.js';
import { SessionId } from '../value-objects/SessionId.js';
import { PedagogicalPhase } from '../value-objects/PedagogicalPhase.js';

describe('ProgressCard', () => {
  const validUserId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');

  describe('RN27 - Criação inicial', () => {
    it('RN27 - deve criar ProgressCard inicial com ERGONOMICS_SETUP', () => {
      const card = ProgressCard.createInitial(validUserId);

      expect(card.userId).toBe(validUserId);
      expect(card.phase.value).toBe('ERGONOMICS_SETUP');
      expect(card.lessonNumber).toBe(1);
      expect(card.insecureKeys).toEqual([]);
      expect(card.discomfortReported).toBe(false);
      expect(card.previousBackspaceCount).toBe(0);
      expect(card.currentBackspaceCount).toBe(0);
      expect(card.nextSessionNote).toContain('check-in ergonômico');
    });

    it('RN27 - deve gerar ID automaticamente', () => {
      const card = ProgressCard.createInitial(validUserId);
      expect(card.id).toBeDefined();
    });
  });

  describe('RN27 - Criação com props customizadas', () => {
    it('RN27 - deve criar ProgressCard com props válidas', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date('2024-01-15T10:00:00Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 3,
        insecureKeys: ['f', 'j'],
        discomfortReported: false,
        nextSessionNote: 'Repetir exercício da tecla J',
        previousBackspaceCount: 5,
        currentBackspaceCount: 3,
      });

      expect(card.phase.value).toBe('HOME_ROW');
      expect(card.lessonNumber).toBe(3);
      expect(card.insecureKeys).toEqual(['f', 'j']);
      expect(card.previousBackspaceCount).toBe(5);
      expect(card.currentBackspaceCount).toBe(3);
    });

    it('RN27 - deve lançar erro para userId inválido', () => {
      expect(() =>
        ProgressCard.create({
          userId: 'invalid' as unknown as SessionId,
          date: new Date(),
          phase: PedagogicalPhase.create('HOME_ROW'),
          lessonNumber: 1,
          insecureKeys: [],
          discomfortReported: false,
          nextSessionNote: 'teste',
          previousBackspaceCount: 0,
          currentBackspaceCount: 0,
        })
      ).toThrow('userId inválido');
    });

    it('RN27 - deve lançar erro para fase inválida', () => {
      expect(() =>
        ProgressCard.create({
          userId: validUserId,
          date: new Date(),
          phase: 'invalid' as unknown as PedagogicalPhase,
          lessonNumber: 1,
          insecureKeys: [],
          discomfortReported: false,
          nextSessionNote: 'teste',
          previousBackspaceCount: 0,
          currentBackspaceCount: 0,
        })
      ).toThrow('Fase pedagógica inválida');
    });

    it('RN27 - deve lançar erro para lessonNumber < 1', () => {
      expect(() =>
        ProgressCard.create({
          userId: validUserId,
          date: new Date(),
          phase: PedagogicalPhase.create('HOME_ROW'),
          lessonNumber: 0,
          insecureKeys: [],
          discomfortReported: false,
          nextSessionNote: 'teste',
          previousBackspaceCount: 0,
          currentBackspaceCount: 0,
        })
      ).toThrow('Número da lição deve ser maior ou igual a 1');
    });

    it('RN27 - deve lançar erro para backspaceCount negativo', () => {
      expect(() =>
        ProgressCard.create({
          userId: validUserId,
          date: new Date(),
          phase: PedagogicalPhase.create('HOME_ROW'),
          lessonNumber: 1,
          insecureKeys: [],
          discomfortReported: false,
          nextSessionNote: 'teste',
          previousBackspaceCount: -1,
          currentBackspaceCount: 0,
        })
      ).toThrow('Contagem anterior de backspaces não pode ser negativa');
    });
  });

  describe('RN26/RN29 - Avanço e repetição de lição', () => {
    let baseCard: ProgressCard;

    beforeEach(() => {
      baseCard = ProgressCard.create({
        userId: validUserId,
        date: new Date('2024-01-15T10:00:00Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: ['f'],
        discomfortReported: false,
        nextSessionNote: 'Repetir tecla f',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });
    });

    it('RN26 - advanceLesson deve criar novo card com lição avançada', () => {
      const nextPhase = PedagogicalPhase.create('HOME_ROW');
      const newCard = baseCard.advanceLesson(2, nextPhase, 3, ['j'], 'Praticar tecla j');

      expect(newCard.lessonNumber).toBe(2);
      expect(newCard.phase.value).toBe('HOME_ROW');
      expect(newCard.previousBackspaceCount).toBe(5);
      expect(newCard.currentBackspaceCount).toBe(3);
      expect(newCard.insecureKeys).toEqual(['j']);
      expect(newCard.nextSessionNote).toBe('Praticar tecla j');
      expect(newCard.id.equals(baseCard.id)).toBe(false);
    });

    it('RN29 - repeatLesson deve criar novo card repetindo mesma lição', () => {
      const newCard = baseCard.repeatLesson(7, ['f', 'j'], false, undefined, 'Variar exercício da tecla f');

      expect(newCard.lessonNumber).toBe(1);
      expect(newCard.previousBackspaceCount).toBe(5);
      expect(newCard.currentBackspaceCount).toBe(7);
      expect(newCard.insecureKeys).toEqual(['f', 'j']);
      expect(newCard.nextSessionNote).toBe('Variar exercício da tecla f');
    });

    it('RN29 - repeatLesson deve registrar desconforto', () => {
      const newCard = baseCard.repeatLesson(5, ['f'], true, 'Dor no pulso direito', 'Pausar e alongar');

      expect(newCard.discomfortReported).toBe(true);
      expect(newCard.discomfortDetail).toBe('Dor no pulso direito');
    });
  });

  describe('RN26 - Critério de avanço (canAdvance)', () => {
    it('RN26 - deve retornar true quando todas as 3 condições são atendidas', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Avançar',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      expect(card.canAdvance(true)).toBe(true);
    });

    it('RN26 - deve retornar false quando backspaces atuais > anteriores (condição A falha)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Repetir',
        previousBackspaceCount: 5,
        currentBackspaceCount: 10,
      });

      expect(card.canAdvance(true)).toBe(false);
    });

    it('RN26 - deve retornar false quando há desconforto relatado (condição B falha)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: true,
        discomfortDetail: 'Dor no punho',
        nextSessionNote: 'Pausar',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      expect(card.canAdvance(true)).toBe(false);
    });

    it('RN26 - deve retornar false quando aluno confirma olhar teclado (condição C falha)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Repetir',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      expect(card.canAdvance(false)).toBe(false);
    });

    it('RN26 - deve retornar true quando backspaces iguais (condição A: ≤)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Avançar',
        previousBackspaceCount: 5,
        currentBackspaceCount: 5,
      });

      expect(card.canAdvance(true)).toBe(true);
    });
  });

  describe('RN29 - Variação de exercício (shouldVaryExercise)', () => {
    it('RN29 - deve retornar false quando pode avançar (todas condições ok)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Avançar',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      // Todas condições ok: backspaces diminuíram (5 <= 10) e não olha teclado
      expect(card.shouldVaryExercise(true)).toBe(false);
    });

    it('RN29 - deve retornar true quando backspaces aumentaram (condição A falha)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Variar',
        previousBackspaceCount: 5,
        currentBackspaceCount: 10,
      });

      // Condição A falha: backspaces aumentaram, mesmo não olhando teclado
      expect(card.shouldVaryExercise(true)).toBe(true);
    });

    it('RN29 - deve retornar true quando aluno olha teclado (condição C falha)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Variar',
        previousBackspaceCount: 10,
        currentBackspaceCount: 5,
      });

      // Condição A passa, mas C falha (olha teclado)
      expect(card.shouldVaryExercise(false)).toBe(true);
    });

    it('RN29 - desconforto não afeta shouldVaryExercise (é tratado pela engine como pause)', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: true,
        discomfortDetail: 'Dor',
        nextSessionNote: 'Pausar',
        previousBackspaceCount: 5,
        currentBackspaceCount: 10,
      });

      // shouldVaryExercise não considera desconforto (engine trata separadamente)
      // Aqui condição A falha (10 > 5), então deve variar
      expect(card.shouldVaryExercise(true)).toBe(true);
    });
  });

  describe('RN27 - Formato Cartão de Progresso (toProgressCardString)', () => {
    it('RN27 - deve gerar string no formato correto sem teclas inseguras', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date('2024-01-15T10:00:00Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 3,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'Avançar para próxima fase',
        previousBackspaceCount: 5,
        currentBackspaceCount: 3,
      });

      const str = card.toProgressCardString();
      expect(str).toContain('CARTÃO DE PROGRESSO — 15/01/2024');
      expect(str).toContain('Fase: HOME_ROW | Lição: 3');
      expect(str).toContain('Teclas ainda inseguras: nenhuma');
      expect(str).toContain('Desconforto relatado nesta sessão: não');
      expect(str).toContain('Observação para a próxima sessão: Avançar para próxima fase');
    });

    it('RN27 - deve gerar string com teclas inseguras e desconforto', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date('2024-01-15T10:00:00Z'),
        phase: PedagogicalPhase.create('ACCENTUATION'),
        lessonNumber: 5,
        insecureKeys: ['á', 'ç'],
        discomfortReported: true,
        discomfortDetail: 'Formigamento no dedo mínimo',
        nextSessionNote: 'Alongar antes de continuar',
        previousBackspaceCount: 8,
        currentBackspaceCount: 6,
      });

      const str = card.toProgressCardString();
      expect(str).toContain('Teclas ainda inseguras: á, ç');
      expect(str).toContain('Desconforto relatado nesta sessão: sim — Formigamento no dedo mínimo');
    });
  });

  describe('RN27 - Serialização', () => {
    it('RN27 - toDTO deve retornar dados corretos', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date('2024-01-15T10:00:00Z'),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 2,
        insecureKeys: ['f'],
        discomfortReported: false,
        nextSessionNote: 'Praticar f',
        previousBackspaceCount: 5,
        currentBackspaceCount: 3,
      });

      const dto = card.toDTO();

      expect(dto.userId).toBe(validUserId.value);
      expect(dto.phase).toBe('HOME_ROW');
      expect(dto.lessonNumber).toBe(2);
      expect(dto.insecureKeys).toEqual(['f']);
      expect(dto.discomfortReported).toBe(false);
      expect(dto.discomfortDetail).toBeNull();
      expect(dto.previousBackspaceCount).toBe(5);
      expect(dto.currentBackspaceCount).toBe(3);
    });

    it('RN27 - toJSON deve delegar para toDTO', () => {
      const card = ProgressCard.create({
        userId: validUserId,
        date: new Date(),
        phase: PedagogicalPhase.create('HOME_ROW'),
        lessonNumber: 1,
        insecureKeys: [],
        discomfortReported: false,
        nextSessionNote: 'teste',
        previousBackspaceCount: 0,
        currentBackspaceCount: 0,
      });

      const json = card.toJSON();
      expect(json.phase).toBe('HOME_ROW');
    });
  });
});