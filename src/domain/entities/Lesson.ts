import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import { PedagogicalPhase } from '../value-objects/PedagogicalPhase.js';

export type LessonType = 'INTRODUCTION' | 'PRACTICE' | 'REINFORCEMENT' | 'ASSESSMENT';
export type LessonDifficulty = 'GUIDED' | 'REINFORCEMENT' | 'FREE';

export interface LessonProps {
  id?: SessionId;
  level: number;
  title: string;
  content: string;
  targetKeys: string[];
  difficulty: LessonDifficulty;
  type: LessonType;
  layout: Layout;
  pedagogicalPhase?: PedagogicalPhase;
  lessonInPhase?: number;
}

export interface LessonDTO {
  id: string;
  level: number;
  title: string;
  content: string;
  targetKeys: string[];
  difficulty: LessonDifficulty;
  type: LessonType;
  layout: string;
  pedagogicalPhase: string | null;
  lessonInPhase: number | null;
}

const VALID_TYPES: LessonType[] = ['INTRODUCTION', 'PRACTICE', 'REINFORCEMENT', 'ASSESSMENT'];
const VALID_DIFFICULTIES: LessonDifficulty[] = ['GUIDED', 'REINFORCEMENT', 'FREE'];

export class Lesson {
  readonly id: SessionId;
  readonly level: number;
  readonly title: string;
  readonly content: string;
  readonly targetKeys: string[];
  readonly difficulty: LessonDifficulty;
  readonly type: LessonType;
  readonly layout: Layout;
  readonly pedagogicalPhase: PedagogicalPhase | null;
  readonly lessonInPhase: number | null;

  private constructor(props: LessonProps) {
    this.id = props.id ?? SessionId.create();
    this.level = props.level;
    this.title = props.title.trim();
    this.content = props.content;
    this.targetKeys = [...props.targetKeys];
    this.difficulty = props.difficulty;
    this.type = props.type;
    this.layout = props.layout;
    this.pedagogicalPhase = props.pedagogicalPhase ?? null;
    this.lessonInPhase = props.lessonInPhase ?? null;
  }

  static create(props: LessonProps): Lesson {
    if (!props.title || !props.title.trim()) {
      throw new Error('Título é obrigatório');
    }

    if (!props.content) {
      throw new Error('Conteúdo é obrigatório');
    }

    if (props.targetKeys.length === 0) {
      throw new Error('Target keys não pode ser vazio');
    }

    if (props.level < 1) {
      throw new Error('Nível deve ser maior ou igual a 1');
    }

    if (!VALID_TYPES.includes(props.type)) {
      throw new Error('Tipo de lição inválido');
    }

    if (!VALID_DIFFICULTIES.includes(props.difficulty)) {
      throw new Error('Dificuldade inválida');
    }

    if (!(props.layout instanceof Layout)) {
      throw new Error('Layout inválido');
    }

    if (props.pedagogicalPhase && !(props.pedagogicalPhase instanceof PedagogicalPhase)) {
      throw new Error('Fase pedagógica inválida');
    }

    if (props.lessonInPhase !== undefined && props.lessonInPhase < 1) {
      throw new Error('Número da lição na fase deve ser maior ou igual a 1');
    }

    return new Lesson(props);
  }

  equals(other: Lesson): boolean {
    return this.id.equals(other.id);
  }

  toDTO(): LessonDTO {
    return {
      id: this.id.value,
      level: this.level,
      title: this.title,
      content: this.content,
      targetKeys: [...this.targetKeys],
      difficulty: this.difficulty,
      type: this.type,
      layout: this.layout.value,
      pedagogicalPhase: this.pedagogicalPhase?.value ?? null,
      lessonInPhase: this.lessonInPhase,
    };
  }

  toJSON(): LessonDTO {
    return this.toDTO();
  }
}