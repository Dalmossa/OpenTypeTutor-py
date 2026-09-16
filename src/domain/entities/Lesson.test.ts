import { describe, it, expect } from 'vitest';
import { Lesson } from './Lesson.js';
import { Layout } from '../value-objects/Layout.js';
import { SessionId } from '../value-objects/SessionId.js';

describe('Lesson', () => {
  const validId = SessionId.create('550e8400-e29b-41d4-a716-446655440000');
  const validLayout = Layout.create('ABNT2');

  describe('PRD §8 - Lesson entity', () => {
    it('deve criar Lesson com todos os campos', () => {
      const lesson = Lesson.create({
        id: validId,
        level: 1,
        title: 'Introdução às teclas centrais',
        content: 'asdf jkl;',
        targetKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'],
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: validLayout,
      });

      expect(lesson.id).toBe(validId);
      expect(lesson.level).toBe(1);
      expect(lesson.title).toBe('Introdução às teclas centrais');
      expect(lesson.content).toBe('asdf jkl;');
      expect(lesson.targetKeys).toEqual(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);
      expect(lesson.difficulty).toBe('GUIDED');
      expect(lesson.type).toBe('INTRODUCTION');
      expect(lesson.layout).toBe(validLayout);
    });

    it('deve gerar ID automaticamente se não fornecido', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Teste',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout: validLayout,
      });

      expect(lesson.id).toBeDefined();
      expect(lesson.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Tipos de lição (PRD §8)', () => {
    it('deve aceitar INTRODUCTION', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Intro',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: validLayout,
      });
      expect(lesson.type).toBe('INTRODUCTION');
    });

    it('deve aceitar PRACTICE', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Prática',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout: validLayout,
      });
      expect(lesson.type).toBe('PRACTICE');
    });

    it('deve aceitar REINFORCEMENT', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Reforço',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'REINFORCEMENT',
        type: 'REINFORCEMENT',
        layout: validLayout,
      });
      expect(lesson.type).toBe('REINFORCEMENT');
    });

    it('deve aceitar ASSESSMENT', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Avaliação',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'FREE',
        type: 'ASSESSMENT',
        layout: validLayout,
      });
      expect(lesson.type).toBe('ASSESSMENT');
    });
  });

  describe('Dificuldades', () => {
    it('deve aceitar GUIDED', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Teste',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: validLayout,
      });
      expect(lesson.difficulty).toBe('GUIDED');
    });

    it('deve aceitar REINFORCEMENT', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Teste',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'REINFORCEMENT',
        type: 'REINFORCEMENT',
        layout: validLayout,
      });
      expect(lesson.difficulty).toBe('REINFORCEMENT');
    });

    it('deve aceitar FREE', () => {
      const lesson = Lesson.create({
        level: 1,
        title: 'Teste',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'FREE',
        type: 'ASSESSMENT',
        layout: validLayout,
      });
      expect(lesson.difficulty).toBe('FREE');
    });
  });

  describe('Validação', () => {
    it('deve lançar erro para título vazio', () => {
      expect(() =>
        Lesson.create({
          level: 1,
          title: '',
          content: 'abc',
          targetKeys: ['a', 'b', 'c'],
          difficulty: 'GUIDED',
          type: 'INTRODUCTION',
          layout: validLayout,
        })
      ).toThrow('Título é obrigatório');
    });

    it('deve lançar erro para conteúdo vazio', () => {
      expect(() =>
        Lesson.create({
          level: 1,
          title: 'Teste',
          content: '',
          targetKeys: ['a', 'b', 'c'],
          difficulty: 'GUIDED',
          type: 'INTRODUCTION',
          layout: validLayout,
        })
      ).toThrow('Conteúdo é obrigatório');
    });

    it('deve lançar erro para targetKeys vazio', () => {
      expect(() =>
        Lesson.create({
          level: 1,
          title: 'Teste',
          content: 'abc',
          targetKeys: [],
          difficulty: 'GUIDED',
          type: 'INTRODUCTION',
          layout: validLayout,
        })
      ).toThrow('Target keys não pode ser vazio');
    });

    it('deve lançar erro para nível menor que 1', () => {
      expect(() =>
        Lesson.create({
          level: 0,
          title: 'Teste',
          content: 'abc',
          targetKeys: ['a', 'b', 'c'],
          difficulty: 'GUIDED',
          type: 'INTRODUCTION',
          layout: validLayout,
        })
      ).toThrow('Nível deve ser maior ou igual a 1');
    });

    it('deve lançar erro para tipo inválido', () => {
      expect(() =>
        Lesson.create({
          level: 1,
          title: 'Teste',
          content: 'abc',
          targetKeys: ['a', 'b', 'c'],
          difficulty: 'GUIDED',
          type: 'INVALID' as Lesson['type'],
          layout: validLayout,
        })
      ).toThrow('Tipo de lição inválido');
    });

    it('deve lançar erro para dificuldade inválida', () => {
      expect(() =>
        Lesson.create({
          level: 1,
          title: 'Teste',
          content: 'abc',
          targetKeys: ['a', 'b', 'c'],
          difficulty: 'INVALID' as Lesson['difficulty'],
          type: 'INTRODUCTION',
          layout: validLayout,
        })
      ).toThrow('Dificuldade inválida');
    });
  });

  describe('Igualdade', () => {
    it('Lessons com mesmo ID devem ser iguais', () => {
      const lesson1 = Lesson.create({
        id: validId,
        level: 1,
        title: 'Teste',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: validLayout,
      });
      const lesson2 = Lesson.create({
        id: validId,
        level: 2,
        title: 'Outro',
        content: 'def',
        targetKeys: ['d', 'e', 'f'],
        difficulty: 'FREE',
        type: 'ASSESSMENT',
        layout: Layout.create('US-INTERNATIONAL'),
      });

      expect(lesson1.equals(lesson2)).toBe(true);
    });

    it('Lessons com IDs diferentes não devem ser iguais', () => {
      const lesson1 = Lesson.create({
        level: 1,
        title: 'Teste',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: validLayout,
      });
      const lesson2 = Lesson.create({
        level: 1,
        title: 'Teste',
        content: 'abc',
        targetKeys: ['a', 'b', 'c'],
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: validLayout,
      });

      expect(lesson1.equals(lesson2)).toBe(false);
    });
  });

  describe('Serialização', () => {
    it('toDTO deve retornar dados corretos', () => {
      const lesson = Lesson.create({
        id: validId,
        level: 2,
        title: 'Prática intermediária',
        content: 'qwer tyui',
        targetKeys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'],
        difficulty: 'GUIDED',
        type: 'PRACTICE',
        layout: validLayout,
      });

      const dto = lesson.toDTO();

      expect(dto.id).toBe(validId.value);
      expect(dto.level).toBe(2);
      expect(dto.title).toBe('Prática intermediária');
      expect(dto.content).toBe('qwer tyui');
      expect(dto.targetKeys).toEqual(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i']);
      expect(dto.difficulty).toBe('GUIDED');
      expect(dto.type).toBe('PRACTICE');
      expect(dto.layout).toBe('ABNT2');
    });
  });

  describe('PRD §8 - Validação e serialização (complementar)', () => {
    it('deve rejeitar layout inválido', () => {
      expect(() =>
        Lesson.create({
          id: validId,
          level: 1,
          title: 'Título',
          content: 'asdf',
          targetKeys: ['a'],
          difficulty: 'GUIDED',
          type: 'INTRODUCTION',
          layout: 'invalid' as unknown as Layout,
        })
      ).toThrow('Layout inválido');
    });

    it('toJSON deve delegar para toDTO', () => {
      const lesson = Lesson.create({
        id: validId,
        level: 1,
        title: 'Título',
        content: 'asdf',
        targetKeys: ['a'],
        difficulty: 'GUIDED',
        type: 'INTRODUCTION',
        layout: validLayout,
      });

      const json = lesson.toJSON();

      expect(json.id).toBe(validId.value);
      expect(json.type).toBe('INTRODUCTION');
    });
  });
});